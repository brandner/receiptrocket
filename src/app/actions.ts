'use server';

import { extractReceiptData } from '@/ai/flows/extract-receipt-data';
import type { ReceiptData } from '@/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

type FormState = {
  message: string;
  data: (ReceiptData & { image: string }) | null;
  error: boolean;
};

async function getUserIdFromToken(idToken: string | null) {
  if (!idToken) {
    return { uid: null, error: 'No ID token provided.' };
  }
  try {
    const decodedToken = await getFirebaseAdmin().auth().verifyIdToken(idToken);
    return { uid: decodedToken.uid, error: null };
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return { uid: null, error: 'Token verification failed. Please sign in again.' };
  }
}

export async function processReceiptAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const idToken = formData.get('idToken') as string | null;

  const { uid, error } = await getUserIdFromToken(idToken);

  if (error || !uid) {
    return { message: error || 'Authentication failed.', data: null, error: true };
  }

  const photo = formData.get('photo') as File;
  if (!photo || photo.size === 0) {
    return { message: 'Please select an image file.', data: null, error: true };
  }

  if (!photo.type.startsWith('image/')) {
    return { message: 'Please select a valid image file.', data: null, error: true };
  }

  try {
    const buffer = Buffer.from(await photo.arrayBuffer());
    const photoDataUri = `data:${photo.type};base64,${buffer.toString('base64')}`;

    const extractedData = await extractReceiptData({ photoDataUri });

    return {
      message: 'Receipt processed successfully!',
      data: { ...extractedData, image: photoDataUri },
      error: false,
    };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { message: `Failed to process receipt: ${errorMessage}`, data: null, error: true };
  }
}
