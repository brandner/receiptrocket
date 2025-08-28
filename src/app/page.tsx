
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
import { AlertCircle, LogIn, ReceiptText, FileDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import AuthButton from '@/components/auth-button';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const fetchReceipts = useCallback(async () => {
    if (!user) {
      setReceipts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const fetchedReceipts = await getReceiptsAction(idToken);
      setReceipts(fetchedReceipts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      toast({
          variant: 'destructive',
          title: 'Error Loading Receipts',
          description: errorMessage,
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    // Fetch receipts only when user object is available (not loading)
    if (!authLoading) {
      fetchReceipts();
    }
  }, [fetchReceipts, authLoading]);

  const handleDeleteReceipt = useCallback(async (id: string) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to delete a receipt.',
        });
        return;
    }

    const originalReceipts = [...receipts];
    setReceipts(prev => prev.filter(receipt => receipt.id !== id));
    
    try {
        const idToken = await user.getIdToken();
        const result = await deleteReceiptAction(id, idToken);
        
        if (result.success) {
        toast({
            title: 'Receipt Deleted',
            description: 'The receipt has been removed from your database.',
        });
        } else {
        toast({
            variant: 'destructive',
            title: 'Error Deleting',
            description: result.message,
        });
        setReceipts(originalReceipts); // Revert on failure
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast({
            variant: 'destructive',
            title: 'Error Deleting',
            description: errorMessage,
        });
        setReceipts(originalReceipts);
    }
  }, [receipts, toast, user]);
  
  const showLoginPrompt = !user && !authLoading;

  return (
    <div className="flex flex-col items-center min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col items-center text-center mb-8 w-full max-w-5xl">
        <div className="flex justify-between items-center w-full">
           <div className="flex-1"></div>
          <div className="flex-1 flex flex-col items-center">
            <Logo />
            <h1 className="text-4xl sm:text-5xl font-bold text-primary mt-2 font-headline">
              ReceiptRocket
            </h1>
          </div>
          <div className="flex-1 flex justify-end">
            <AuthButton />
          </div>
        </div>
        <p className="text-lg text-muted-foreground mt-2 max-w-prose">
          Upload your receipts and let our AI instantly extract the details.
        </p>
      </header>

      <main className="w-full max-w-5xl space-y-12">
        {showLoginPrompt ? (
           <Card className="text-center shadow-lg">
             <CardContent className="p-10">
               <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
                 <LogIn className="h-8 w-8 text-primary" />
               </div>
               <h2 className="text-2xl font-bold">Welcome!</h2>
               <p className="text-muted-foreground mt-2">
                 Please sign in to upload and manage your receipts.
               </p>
             </CardContent>
           </Card>
        ) : (
          <>
            <Card className="overflow-hidden shadow-lg">
              <CardContent className="p-6">
                <ReceiptUpload onUploadSuccess={fetchReceipts} />
              </CardContent>
            </Card>
            
            {error && !isLoading && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Receipts</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading || authLoading ? (
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
          </>
        )}
      </main>
      
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Built with Next.js and Genkit. A Firebase Studio Project.</p>
      </footer>
    </div>
  );
}
