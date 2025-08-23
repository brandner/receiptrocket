'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from receipt images.
 *
 * It includes:
 * - `extractReceiptData`: A function to initiate the receipt data extraction flow.
 * - `ExtractReceiptDataInput`: The input type for the `extractReceiptData` function.
 * - `ExtractReceiptDataOutput`: The output type for the `extractReceiptData` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of the receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' /* TODO: Add format validation */
    ),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

const ExtractReceiptDataOutputSchema = z.object({
  companyName: z.string().describe('The name of the company on the receipt.'),
  description: z.string().describe('A short, one or two word description of what the receipt is for, e.g. "Groceries", "Dinner", "Gas".'),
  gst: z.string().nullable().describe('The GST amount on the receipt, if available.'),
  pst: z.string().nullable().describe('The PST amount on the receipt, if available.'),
  totalAmount: z.string().describe('The total amount on the receipt.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  return extractReceiptDataFlow(input);
}

const extractReceiptDataPrompt = ai.definePrompt({
  name: 'extractReceiptDataPrompt',
  input: {schema: ExtractReceiptDataInputSchema},
  output: {schema: ExtractReceiptDataOutputSchema},
  prompt: `You are an AI assistant that extracts information from a receipt image.

  Analyze the receipt image provided and extract the following information:
  - Company Name
  - A short description of what the receipt is for (e.g. "Groceries", "Dinner", "Gas")
  - GST (if available)
  - PST (if available)
  - Total Amount

  Here is the receipt image: {{media url=photoDataUri}}

  Provide the extracted information in the specified JSON format.
`,
});

const extractReceiptDataFlow = ai.defineFlow(
  {
    name: 'extractReceiptDataFlow',
    inputSchema: ExtractReceiptDataInputSchema,
    outputSchema: ExtractReceiptDataOutputSchema,
  },
  async input => {
    const {output} = await extractReceiptDataPrompt(input);
    return output!;
  }
);
