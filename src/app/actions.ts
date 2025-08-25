
'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';
import admin, { type App, type ServiceAccount } from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { revalidatePath } from 'next/cache';

// --- Firebase Admin Initialization ---
let db: Firestore;
let storage: Storage;

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    const app = admin.app();
    db = getFirestore(app);
    storage = getStorage(app);
    return;
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin credentials not set. Skipping initialization.");
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const credentials: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: privateKey,
  };

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    });
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
};

initializeFirebaseAdmin();
// --- End Firebase Admin Initialization ---

type ProcessAndSaveState = {
  message: string;
  error: boolean;
  permissionError?: boolean;
};


export async function processAndSaveReceiptAction(
  prevState: ProcessAndSaveState,
  formData: FormData
): Promise<ProcessAndSaveState> {
    const photo = formData.get('photo') as File;
    if (!photo || photo.size === 0) {
        return {message: 'Please select an image file.', error: true};
    }

    if (!photo.type.startsWith('image/')) {
        return {message: 'Please select a valid image file.', error: true};
    }
    
    if (!db || !storage) {
        const message = "Firestore or Storage is not initialized. Please check your Firebase Admin credentials.";
        console.error(message);
        return { message, error: true };
    }

    try {
        // 1. Extract data from image using Genkit
        const buffer = Buffer.from(await photo.arrayBuffer());
        const photoDataUri = `data:${photo.type};base64,${buffer.toString('base64')}`;
        const extractedData = await extractReceiptData({photoDataUri});

        // 2. Upload image to Firebase Storage
        const mimeType = photo.type || 'image/jpeg';
        const fileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const file = storage.bucket().file(fileName);

        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
            },
        });
        
        // 3. Get public URL for the uploaded file
        const [publicUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '01-01-2500' // Far future expiration date
        });

        // 4. Save receipt data with image URL to Firestore
        const newReceipt: Omit<Receipt, 'id'> = {
            ...extractedData,
            image: publicUrl,
            date: new Date().toISOString(),
            userId: 'anonymous',
        };
        
        await db.collection('receipts').add(newReceipt);
        
        revalidatePath('/');
        return {
            message: 'Receipt processed and saved successfully!',
            error: false,
        };

    } catch (e: any) {
        console.error("Error processing or saving receipt:", e);

        if (e.code === 5) {
          return {
            message: "Firestore database not found. Please go to the Firebase Console to create a Firestore database.",
            error: true,
          };
        }
        
        const errorMessage = e.message || String(e);
        const isPermissionError = errorMessage.includes('permission-denied') || errorMessage.includes('7 PERMISSION_DENIED');
        
        if (isPermissionError) {
           return {
            message: `Firestore/Storage permission denied. Please grant the 'Cloud Datastore User' and 'Storage Admin' roles to your service account.`,
            error: true,
            permissionError: true,
          };
        }

        return {
            message: `Failed to process or save receipt: ${errorMessage}`,
            error: true,
        };
    }
}


export async function getReceiptsAction(): Promise<Receipt[]> {
    if (!db) {
        const message = "Firestore is not initialized. Cannot fetch receipts.";
        console.error(message);
        // During development, this might run before initialization is complete.
        // Return empty array and let the UI handle it. A hard error can be disruptive.
        return [];
    }
    try {
        const receiptsSnapshot = await db.collection('receipts')
            .where('userId', '==', 'anonymous')
            .orderBy('date', 'desc')
            .get();

        if (receiptsSnapshot.empty) {
            return [];
        }

        const receipts: Receipt[] = receiptsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyName: data.companyName,
                description: data.description,
                totalAmount: data.totalAmount,
                gst: data.gst || null,
                pst: data.pst || null,
                date: data.date,
                image: data.image,
                userId: data.userId,
            };
        });
        return receipts;
    } catch (e: any) {
        console.error("Firestore Error in getReceiptsAction:", e);
        
        if (e.code === 5) { // NOT_FOUND
            throw new Error("Firestore database not found. Please create a Firestore database in your Firebase project console.");
        }
        
        // This can happen if a composite index is required. Firestore provides a link in the error.
        if (e.code === 9) { // FAILED_PRECONDITION
             throw new Error(`Firestore query failed. This usually means a composite index is required. Please check the server logs for a link to create the index. Error: ${e.message}`);
        }

        const errorMessage = e.message || String(e);
        throw new Error(`Failed to retrieve receipts: ${errorMessage}`);
    }
}

export async function deleteReceiptAction(id: string): Promise<{ success: boolean, message: string }> {
    if (!db || !storage) {
        const message = "Firestore or Storage is not initialized. Cannot delete receipt.";
        console.error(message);
        return { success: false, message };
    }
    try {
        const receiptRef = db.collection('receipts').doc(id);
        const receiptDoc = await receiptRef.get();

        if (!receiptDoc.exists) {
            return { success: false, message: 'Receipt not found.' };
        }

        // Delete image from Storage
        const receiptData = receiptDoc.data() as Receipt;
        if (receiptData.image) {
            try {
                const url = new URL(receiptData.image);
                const pathName = decodeURIComponent(url.pathname);
                // The actual file path in the bucket is usually after the bucket name and '/o/'
                const filePath = pathName.substring(pathName.indexOf('/o/') + 3);
                if (filePath) {
                    await storage.bucket().file(filePath).delete();
                }
            } catch (storageError) {
                console.error("Error deleting file from Storage, continuing to delete Firestore doc:", storageError);
                // Don't block Firestore deletion if storage deletion fails
            }
        }

        // Delete document from Firestore
        await receiptRef.delete();

        revalidatePath('/');
        return { success: true, message: 'Receipt deleted successfully.' };
    } catch (e: any) {
        console.error("Error deleting from Firestore:", e);
        const errorMessage = e.message || String(e);
        return { success: false, message: `Failed to delete receipt: ${errorMessage}` };
    }
}
