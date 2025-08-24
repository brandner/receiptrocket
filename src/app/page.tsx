'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import type { Receipt } from '@/types';
import ReceiptUpload from '@/components/receipt-upload';
import ReceiptList from '@/components/receipt-list';
import Logo from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { getReceiptsAction, deleteReceiptAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  const loadReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedReceipts = await getReceiptsAction();
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to load receipts',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);
  
  const handleReceiptProcessed = () => {
    // After a receipt is successfully processed and saved, reload the list
    loadReceipts();
  };

  const handleDeleteReceipt = useCallback((id: string) => {
    startDeleteTransition(async () => {
      const result = await deleteReceiptAction(id);
      if (result.success) {
        toast({
          title: 'Receipt Deleted',
          description: 'The receipt has been removed.',
        });
        // Optimistically update UI or reload
        setReceipts(prev => prev.filter(receipt => receipt.id !== id));
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  }, [toast]);
  
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
            <ReceiptUpload onReceiptProcessed={handleReceiptProcessed} />
          </CardContent>
        </Card>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ReceiptList 
            receipts={receipts} 
            onDeleteReceipt={handleDeleteReceipt}
            isDeleting={isDeleting}
          />
        )}
      </main>
      
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Built with Next.js and Genkit. A Firebase Studio Project.</p>
      </footer>
    </div>
  );
}
