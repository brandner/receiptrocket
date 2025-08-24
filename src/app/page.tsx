'use client';

import { useState } from 'react';
import type { Receipt } from '@/types';
import ReceiptUpload from '@/components/receipt-upload';
import ReceiptList from '@/components/receipt-list';
import Logo from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [key, setKey] = useState(Date.now());

  const handleReceiptProcessed = (newReceipt: Receipt) => {
    setReceipts(prev => [newReceipt, ...prev]);
    // Reset the upload form by changing its key
    setKey(Date.now());
  };

  const handleDeleteReceipt = (id: string) => {
    // In a real app, you'd also make an API call to delete from the backend
    setReceipts(prev => prev.filter(receipt => receipt.id !== id));
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col items-center text-center mb-8 w-full">
        <div className="flex justify-center items-center w-full max-w-5xl">
          <div className="flex flex-col items-center">
            <Logo />
            <h1 className="text-4xl sm:text-5xl font-bold text-primary mt-2 font-headline">
              ReceiptRocket
            </h1>
          </div>
        </div>
        <p className="text-lg text-muted-foreground mt-2 max-w-prose">
          Upload your receipts and let our AI instantly extract the details.
        </p>
      </header>

      <main className="w-full max-w-5xl space-y-12">
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-6">
            <ReceiptUpload key={key} onReceiptProcessed={handleReceiptProcessed} />
          </CardContent>
        </Card>
        
        <ReceiptList receipts={receipts} onDeleteReceipt={handleDeleteReceipt} />
      </main>
      
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Built with Next.js and Genkit. A Firebase Studio Project.</p>
      </footer>
    </div>
  );
}
