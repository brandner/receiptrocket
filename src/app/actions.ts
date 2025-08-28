
'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';
import admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getAuth } from 'firebase-admin/auth';

// --- Firebase Admin Initialization ---
let db: Firestore;
let storage: Storage;
let initialized = false;

function initializeFirebaseAdmin() {
    if (!initialized && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_STORAGE_BUCKET) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
        try {
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: privateKey,
                    }),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                });
            }
            initialized = true;
        } catch (error: any) {
            console.error("Firebase Admin SDK initialization error:", error.message);
        }
    }

    if (initialized) {
        if (!db || !storage) {
            const app = admin.app();
            db = getFirestore(app);
            storage = getStorage(app);
        }
    } else {
        console.warn("Firebase Admin credentials or Storage Bucket not set. Server actions requiring auth or storage will fail.");
    }
}

// Call initialization once at the module level.
initializeFirebaseAdmin();
// --- End Firebase Admin Initialization ---

// Helper to get current user's UID and verify token
async function getVerifiedUserId(token: string | undefined): Promise<string | null> {
  // Ensure Firebase is initialized for every verification
  initializeFirebaseAdmin();
  if (!token) {
    return null;
  }
  if (!initialized) {
    console.error('Firebase Admin not initialized. Cannot verify user token.');
    return null;
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

type ProcessAndSaveState = {
  message: string;
  error: boolean;
  permissionError?: boolean;
};


export async function processAndSaveReceiptAction(
  prevState: ProcessAndSaveState,
  formData: FormData
): Promise<ProcessAndSaveState> {
    const idToken = formData.get('idToken') as string | undefined;
    const userId = await getVerifiedUserId(idToken);
    if (!userId) {
        return { message: 'You must be logged in to upload receipts.', error: true };
    }

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
        const imagePath = `receipts/${randomUUID()}.jpg`;
        const file = storage.bucket().file(imagePath);

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

        // 4. Save receipt data with image URL and path to Firestore
        const newReceipt: Omit<Receipt, 'id'> = {
            ...extractedData,
            image: publicUrl,
            imagePath: imagePath, // Store the direct file path
            date: new Date().toISOString(),
            userId,
        };
        
        await db.collection('receipts').add(newReceipt);
        
        revalidatePath('/');
        return {
            message: 'Receipt processed and saved successfully!',
            error: false,
        };

    } catch (e: any) {
        console.error("Error processing or saving receipt:", e);

        if (e.message?.includes('does not exist')) {
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
             return {
                message: `Failed to process or save receipt: The specified bucket '${bucketName}' does not exist. Please check your Firebase Storage setup and environment configuration.`,
                error: true,
             }
        }

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


export async function getReceiptsAction(idToken: string | undefined): Promise<Receipt[]> {
    const userId = await getVerifiedUserId(idToken);
    if (!userId) {
        // Instead of returning empty, which can be ambiguous, throw an error.
        // The client can decide how to handle "not logged in".
        throw new Error("You must be logged in to view receipts.");
    }

    if (!db) {
        console.error("Firestore is not initialized. Cannot fetch receipts.");
        throw new Error("The server is not configured correctly. Please check Firebase credentials.");
    }
    try {
        const receiptsSnapshot = await db.collection('receipts')
            .where('userId', '==', userId)
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
                imagePath: data.imagePath || null,
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

export async function deleteReceiptAction(id: string, idToken: string | undefined): Promise<{ success: boolean, message: string }> {
    const userId = await getVerifiedUserId(idToken);
    if (!userId) {
        return { success: false, message: 'You must be logged in to delete receipts.' };
    }

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
        const receiptData = receiptDoc.data() as Receipt;

        // Security check: ensure the user owns the receipt
        if (receiptData.userId !== userId) {
            return { success: false, message: 'You do not have permission to delete this receipt.' };
        }

        // Delete image from Storage using the robust imagePath
        if (receiptData.imagePath) {
            try {
                await storage.bucket().file(receiptData.imagePath).delete();
            } catch (storageError: any) {
                 // Log a warning, but don't block Firestore deletion if file doesn't exist
                if (storageError.code === 404) {
                     console.warn(`File not found in Storage, but proceeding with Firestore deletion: ${receiptData.imagePath}`);
                } else {
                    console.error("Error deleting file from Storage, but proceeding with Firestore deletion:", storageError);
                }
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
