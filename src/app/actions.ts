
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

type ProcessFormState = {
  message: string;
  error: boolean;
  receipt?: Omit<Receipt, 'id' | 'date'>;
};

export async function processReceiptAction(
  prevState: ProcessFormState,
  formData: FormData
): Promise<ProcessFormState> {
  const photo = formData.get('photo') as File;
  if (!photo || photo.size === 0) {
    return {message: 'Please select an image file.', error: true};
  }

  if (!photo.type.startsWith('image/')) {
    return {message: 'Please select a valid image file.', error: true};
  }

  try {
    const buffer = Buffer.from(await photo.arrayBuffer());
    const photoDataUri = `data:${photo.type};base64,${buffer.toString(
      'base64'
    )}`;
    const extractedData = await extractReceiptData({photoDataUri});

    const newReceiptData = {
      ...extractedData,
      image: photoDataUri, // Temporary, will be replaced by URL after upload
    };

    return {
      message: 'Receipt processed successfully!',
      error: false,
      receipt: newReceiptData,
    };
  } catch (e) {
    console.error(e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to process receipt: ${errorMessage}`,
      error: true,
    };
  }
}

type SaveReceiptState = {
  message: string;
  error: boolean;
  permissionError?: boolean;
};

export async function saveReceiptAction(receiptData: Omit<Receipt, 'id'>): Promise<SaveReceiptState> {
  if (!db || !storage) {
    const message = "Firestore or Storage is not initialized. Please check your Firebase Admin credentials.";
    console.error(message);
    return { message, error: true };
  }

  try {
    // 1. Upload image to Firebase Storage
    const { image: imageDataUri, ...receiptToSave } = receiptData;
    const buffer = Buffer.from(imageDataUri.split(',')[1], 'base64');
    const mimeType = imageDataUri.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const fileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const file = storage.bucket().file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });
    
    // Get public URL
    const [publicUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2500' // Far future expiration date
    });

    // 2. Save receipt data with image URL to Firestore
    const newReceipt: Omit<Receipt, 'id'> = {
      ...receiptToSave,
      image: publicUrl, // Store the public URL
    };
    
    await db.collection('receipts').add(newReceipt);
    revalidatePath('/');
    return {
      message: 'Receipt saved successfully to Firestore!',
      error: false,
    };

  } catch (e: any) {
    console.error("Error saving to Firestore/Storage:", e);
    
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
      message: `Failed to save receipt: ${errorMessage}`,
      error: true,
    };
  }
}


export async function getReceiptsAction(): Promise<Receipt[]> {
    if (!db) {
        const message = "Firestore is not initialized. Cannot fetch receipts.";
        console.error(message);
        throw new Error(message);
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
        
        if (e.code === 5) {
            throw new Error("Firestore database not found. Please create a Firestore database in your Firebase project console.");
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
