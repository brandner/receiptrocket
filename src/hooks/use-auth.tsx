
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getAuthenticatedAppForUser(user: User | null) {
  if (!user) {
    return null;
  }
  const idToken = await user.getIdToken();

  // Create a custom fetch that includes the auth token
  const customFetch = (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    const newInit: RequestInit = { ...init, headers };
    return fetch(input, newInit);
  };
  
  // Monkey-patch the global fetch
  // This is a temporary solution for this context
  (globalThis as any)._originalFetch = globalThis.fetch;
  (globalThis as any).fetch = customFetch;

  return { user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      await getAuthenticatedAppForUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Restore original fetch on cleanup
      if ((globalThis as any)._originalFetch) {
        globalThis.fetch = (globalThis as any)._originalFetch;
      }
    }
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Signed In",
        description: "You've successfully signed in.",
      })
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: error.message || 'An unknown error occurred.',
      })
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
       toast({
        title: "Signed Out",
        description: "You've successfully signed out.",
      })
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Sign-out Failed',
        description: error.message || 'An unknown error occurred.',
      })
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
