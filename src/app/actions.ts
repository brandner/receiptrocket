
'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';
import admin, { type App, type ServiceAccount } from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// --- Firebase Admin Initialization ---
let db: Firestore;

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    db = getFirestore(admin.app());
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
    });
    db = getFirestore(app);
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
      image: photoDataUri,
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
  if (!db) {
    const message = "Firestore is not initialized. Please check your Firebase Admin credentials.";
    console.error(message);
    return { message, error: true };
  }

  try {
    const newReceipt: Omit<Receipt, 'id'> = {
      ...receiptData,
    };
    
    await db.collection('receipts').add(newReceipt);
    revalidatePath('/');
    return {
      message: 'Receipt saved successfully to Firestore!',
      error: false,
    };

  } catch (e: any) {
    console.error("Error saving to Firestore:", e);
    const errorMessage = e.message || String(e);
    
    const isPermissionError = errorMessage.includes('permission-denied') || errorMessage.includes('7 PERMISSION_DENIED');

    if (isPermissionError) {
       return {
        message: `Firestore permission denied. Please grant the 'Cloud Datastore User' role to your service account.`,
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
        const errorMessage = e.message || String(e);
        throw new Error(`Failed to retrieve receipts: ${errorMessage}`);
    }
}

export async function deleteReceiptAction(id: string): Promise<{ success: boolean, message: string }> {
    if (!db) {
        const message = "Firestore is not initialized. Cannot delete receipt.";
        console.error(message);
        return { success: false, message };
    }
    try {
        await db.collection('receipts').doc(id).delete();
        revalidatePath('/');
        return { success: true, message: 'Receipt deleted successfully.' };
    } catch (e: any) {
        console.error("Error deleting from Firestore:", e);
        const errorMessage = e.message || String(e);
        return { success: false, message: `Failed to delete receipt: ${errorMessage}` };
    }
}
