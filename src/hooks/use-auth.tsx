
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
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
import type { UserProfile } from '@/types';
import { getOrCreateUserProfile } from '@/app/actions';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store the original fetch function
const originalFetch = globalThis.fetch;

async function configureAuthenticatedFetch(user: User | null) {
  if (!user) {
    // If user is logged out, restore the original fetch
    if (globalThis.fetch !== originalFetch) {
      globalThis.fetch = originalFetch;
    }
    return;
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
    // Call the original fetch, not the monkey-patched one
    return originalFetch(input, newInit);
  };
  
  // Monkey-patch the global fetch
  globalThis.fetch = customFetch;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleAuthChange = useCallback(async (firebaseUser: User | null) => {
      setLoading(true);
      await configureAuthenticatedFetch(firebaseUser);
      setUser(firebaseUser);

      if (firebaseUser) {
          const profile = await getOrCreateUserProfile();
          setUserProfile(profile);
      } else {
          setUserProfile(null);
      }
      setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);

    return () => {
      unsubscribe();
      // Restore original fetch on cleanup
      if (globalThis.fetch !== originalFetch) {
        globalThis.fetch = originalFetch;
      }
    }
  }, [handleAuthChange]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle the user state update.
      toast({
        title: "Signed In",
        description: `Welcome, ${result.user.displayName}!`,
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
      // The onAuthStateChanged listener will handle clearing user state.
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
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signOut }}>
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
