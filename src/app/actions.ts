'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt, ReceiptData} from '@/types';
import admin from 'firebase-admin';
import {getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

// --- Centralized, Memoized Firebase Admin Initialization ---

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

function initializeAdmin() {
  if (getApps().length > 0) {
    const app = admin.app();
    db = getFirestore(app);
    auth = getAuth(app);
    return;
  }

  // Initialize with applicationDefault() credentials which should be
  // automatically discovered in a Google Cloud environment.
  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'receiptrocket-h9b5k',
  });
  db = getFirestore(app);
  auth = getAuth(app);
}

// --- End Initialization ---


type ProcessFormState = {
  message: string;
  data: (ReceiptData & {image: string}) | null;
  error: boolean;
};

type ActionResponse<T> = {
  data: T | null;
  error: string | null;
};

async function getUserIdFromToken(idToken: string | null) {
  if (!auth) initializeAdmin();
  if (!idToken) {
    return {uid: null, error: 'No ID token provided.'};
  }
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {uid: decodedToken.uid, error: null};
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during token verification.';
    console.error('Error verifying ID token:', errorMessage);
    return {
      uid: null,
      error: `Token verification failed. Please sign in again. (Details: ${errorMessage})`,
    };
  }
}

export async function processReceiptAction(
  prevState: ProcessFormState,
  formData: FormData
): Promise<ProcessFormState> {
  const idToken = formData.get('idToken') as string | null;
  const {uid, error} = await getUserIdFromToken(idToken);

  if (error || !uid) {
    return {message: error || 'Authentication failed.', data: null, error: true};
  }

  const photo = formData.get('photo') as File;
  if (!photo || photo.size === 0) {
    return {message: 'Please select an image file.', data: null, error: true};
  }

  if (!photo.type.startsWith('image/')) {
    return {message: 'Please select a valid image file.', data: null, error: true};
  }

  try {
    const buffer = Buffer.from(await photo.arrayBuffer());
    const photoDataUri = `data:${photo.type};base64,${buffer.toString(
      'base64'
    )}`;
    const extractedData = await extractReceiptData({photoDataUri});

    return {
      message: 'Receipt processed successfully!',
      data: {...extractedData, image: photoDataUri},
      error: false,
    };
  } catch (e) {
    console.error(e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to process receipt: ${errorMessage}`,
      data: null,
      error: true,
    };
  }
}

export async function saveReceiptAction(
  receiptData: ReceiptData & {image: string},
  idToken: string | null
): Promise<ActionResponse<Receipt>> {
  if (!db) initializeAdmin();
  const {uid, error} = await getUserIdFromToken(idToken);
  if (error || !uid) {
    return {data: null, error: error || 'Authentication failed.'};
  }

  try {
    const newReceiptRef = db.collection('users').doc(uid).collection('receipts').doc();

    const newReceipt: Omit<Receipt, 'id'> = {
      ...receiptData,
      date: new Date().toISOString(),
      userId: uid,
    };

    await newReceiptRef.set(newReceipt);

    return {data: {...newReceipt, id: newReceiptRef.id}, error: null};
  } catch (e) {
    console.error('Failed to save receipt:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return {data: null, error: `Failed to save receipt: ${errorMessage}`};
  }
}

export async function getReceiptsAction(
  idToken: string | null
): Promise<ActionResponse<Receipt[]>> {
  if (!db) initializeAdmin();
  const {uid, error} = await getUserIdFromToken(idToken);
  if (error || !uid) {
    return {data: null, error: error || 'Authentication failed.'};
  }

  try {
    const receiptsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('receipts')
      .orderBy('date', 'desc')
      .get();
    const receipts = receiptsSnapshot.docs.map(
      doc => ({id: doc.id, ...doc.data()} as Receipt)
    );
    return {data: receipts, error: null};
  } catch (e) {
    console.error('Failed to get receipts:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return {data: null, error: `Failed to retrieve receipts: ${errorMessage}`};
  }
}

export async function deleteReceiptAction(
  receiptId: string,
  idToken: string | null
): Promise<ActionResponse<boolean>> {
  if (!db) initializeAdmin();
  const {uid, error} = await getUserIdFromToken(idToken);
  if (error || !uid) {
    return {data: null, error: error || 'Authentication failed.'};
  }

  try {
    await db.collection('users').doc(uid).collection('receipts').doc(receiptId).delete();
    return {data: true, error: null};
  } catch (e) {
    console.error('Failed to delete receipt:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return {data: null, error: `Failed to delete receipt: ${errorMessage}`};
  }
}
