
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

  // This check is important! If the environment variables are not set, we should not proceed.
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin credentials not set. Skipping initialization.");
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const credentials = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: privateKey,
  };

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    db = admin.firestore(app);
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
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
    
    // Temporarily disabled to avoid permission errors.
    // await db.collection('receipts').add(newReceipt);
    console.log("Receipt data to be saved:", JSON.stringify(newReceipt, null, 2));


    return {
      message: 'Receipt would be saved here, but the operation is temporarily disabled.',
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
