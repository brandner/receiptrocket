'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { Receipt } from '@/types';
import { getReceiptsAction, deleteReceiptAction } from '@/app/actions';
import ReceiptUpload from '@/components/receipt-upload';
import ReceiptList from '@/components/receipt-list';
import Logo from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [key, setKey] = useState(Date.now());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const { toast } = useToast();

  const loadReceipts = useCallback(async (idToken: string) => {
    setLoadingReceipts(true);
    const result = await getReceiptsAction(idToken);
    if (result.error) {
      console.error(result.error);
      toast({
        variant: 'destructive',
        title: 'Error loading receipts',
        description: result.error,
      });
    } else if (result.data) {
      setReceipts(result.data);
    }
    setLoadingReceipts(false);
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        await loadReceipts(idToken);
      } else {
        setReceipts([]); // Clear receipts on logout
      }
      setLoading(false);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loadReceipts]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'Could not sign in with Google. Please try again.',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: 'Could not sign out. Please try again.',
      });
    }
  };

  const handleReceiptProcessed = (newReceipt: Receipt) => {
    setReceipts(prev => [newReceipt, ...prev]);
    // Reset the upload form by changing its key
    setKey(Date.now());
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!user) return;
    const idToken = await user.getIdToken();
    const result = await deleteReceiptAction(id, idToken);
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Receipt deleted successfully.',
      });
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Logo className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col items-center text-center mb-8 w-full">
        <div className="flex justify-between items-center w-full max-w-5xl">
          <div></div> {/* Spacer */}
          <div className="flex flex-col items-center">
            <Logo />
            <h1 className="text-4xl sm:text-5xl font-bold text-primary mt-2 font-headline">
              ReceiptRocket
            </h1>
          </div>
          {user ? (
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          ) : (
            <Button onClick={handleSignIn}>
              <LogIn className="mr-2 h-4 w-4" /> Login with Google
            </Button>
          )}
        </div>
        <p className="text-lg text-muted-foreground mt-2 max-w-prose">
          {user 
            ? `Welcome, ${user.displayName}! Upload your receipts and let our AI instantly extract the details.`
            : 'Please log in to begin scanning your receipts.'
          }
        </p>
      </header>

      {user && (
        <main className="w-full max-w-5xl space-y-12">
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6">
              <ReceiptUpload key={key} onReceiptProcessed={handleReceiptProcessed} user={user} />
            </CardContent>
          </Card>
          
          {loadingReceipts ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading your receipts...</p>
            </div>
          ) : (
            <ReceiptList receipts={receipts} onDeleteReceipt={handleDeleteReceipt} />
          )}
        </main>
      )}
      
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p>Built with Next.js and Genkit. A Firebase Studio Project.</p>
      </footer>
    </div>
  );
}
