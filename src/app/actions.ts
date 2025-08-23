'use server';

import { extractReceiptData } from '@/ai/flows/extract-receipt-data';
import type { ReceiptData } from '@/types';

type FormState = {
  message: string;
  data: (ReceiptData & { image: string }) | null;
  error: boolean;
};

export async function processReceiptAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const photo = formData.get('photo') as File;
  if (!photo || photo.size === 0) {
    return { message: 'Please select an image file.', data: null, error: true };
  }

  // Validate file type
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
