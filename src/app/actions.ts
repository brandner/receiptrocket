'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const ANONYMOUS_USER_ID = 'anonymous';

// Helper to initialize the Admin SDK and get the Firestore instance.
// This is memoized to ensure it's only called once.
const getDb = (() => {
  let db: admin.firestore.Firestore | null = null;
  return () => {
    if (!db) {
        if (admin.apps.length === 0) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey,
                }),
            });
        }
        db = getFirestore();
    }
    return db;
  };
})();


type ProcessFormState = {
  message: string;
  error: boolean;
  receiptId?: string;
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

    const newReceipt: Omit<Receipt, 'id'> = {
      ...extractedData,
      image: photoDataUri,
      date: new Date().toISOString(),
      userId: ANONYMOUS_USER_ID,
    };
    
    const db = getDb();
    const docRef = await db.collection('receipts').add(newReceipt);

    return {
      message: 'Receipt processed successfully!',
      error: false,
      receiptId: docRef.id,
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

export async function getReceiptsAction(): Promise<Receipt[]> {
    try {
        const db = getDb();
        const snapshot = await db.collection('receipts')
                                 .where('userId', '==', ANONYMOUS_USER_ID)
                                 .orderBy('date', 'desc')
                                 .get();

        if (snapshot.empty) {
            console.log("No matching documents.");
            return [];
        }

        const receipts: Receipt[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Safer mapping to avoid issues with spread operator on complex proxy objects
            receipts.push({
                id: doc.id,
                companyName: data.companyName,
                description: data.description,
                gst: data.gst,
                pst: data.pst,
                totalAmount: data.totalAmount,
                image: data.image,
                date: data.date,
                userId: data.userId,
            });
        });
        return receipts;

    } catch (e) {
        console.error("Firestore Error in getReceiptsAction:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to retrieve receipts: ${errorMessage}`);
    }
}

export async function deleteReceiptAction(id: string): Promise<{ success: boolean; message: string }> {
    if (!id) {
        return { success: false, message: 'No receipt ID provided.' };
    }
    try {
        const db = getDb();
        // For security, you might also want to check if the receipt belongs to the user
        // before deleting, but for the anonymous case, this is sufficient.
        await db.collection('receipts').doc(id).delete();
        return { success: true, message: 'Receipt deleted successfully.' };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to delete receipt: ${errorMessage}` };
    }
}