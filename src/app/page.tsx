
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Receipt } from '@/types';
import ReceiptUpload from '@/components/receipt-upload';
import ReceiptList from '@/components/receipt-list';
import Logo from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getReceiptsAction, deleteReceiptAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ReceiptText } from 'lucide-react';

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReceipts = await getReceiptsAction();
      setReceipts(fetchedReceipts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDeleteReceipt = useCallback(async (id: string) => {
    const originalReceipts = [...receipts];
    setReceipts(prev => prev.filter(receipt => receipt.id !== id));
    
    const result = await deleteReceiptAction(id);
    
    if (result.success) {
      toast({
        title: 'Receipt Deleted',
        description: 'The receipt has been removed from the database.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error Deleting',
        description: result.message,
      });
      setReceipts(originalReceipts); // Revert on failure
    }
  }, [receipts, toast]);
  
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
            <ReceiptUpload onUploadSuccess={fetchReceipts} />
          </CardContent>
        </Card>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Receipts</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ReceiptList 
            receipts={receipts} 
            onDeleteReceipt={handleDeleteReceipt}
          />
        )}
      </main>
      
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Built with Next.js and Genkit. A Firebase Studio Project.</p>
      </footer>
    </div>
  );
}
