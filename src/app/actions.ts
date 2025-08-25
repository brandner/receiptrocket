
'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';
import admin, { type App } from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

// --- Firebase Admin Initialization ---
// This is the definitive, robust way to initialize the Firebase Admin SDK in a Next.js server environment.
// It ensures the SDK is initialized only once, using credentials from environment variables.
let app: App;
let db: Firestore;

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    app = admin.app();
    db = admin.firestore(app);
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const credentials = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: privateKey,
  };

  app = admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
  db = admin.firestore(app);
};

// Call the initialization function right away.
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
};

export async function saveReceiptAction(receiptData: Omit<Receipt, 'id'>): Promise<SaveReceiptState> {
  try {
    const newReceipt: Omit<Receipt, 'id'> = {
      ...receiptData,
    };

    await db.collection('receipts').add(newReceipt);

    return {
      message: 'Receipt saved successfully!',
      error: false,
    };

  } catch (e) {
    console.error("Error saving to Firestore:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      message: `Failed to save receipt: ${errorMessage}`,
      error: true,
    };
  }
}
