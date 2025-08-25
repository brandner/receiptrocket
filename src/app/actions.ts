
'use server';

import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {Receipt} from '@/types';

type ProcessFormState = {
  message: string;
  error: boolean;
  receipt?: Omit<Receipt, 'id' | 'date'>; // Return the extracted data
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
