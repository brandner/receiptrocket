
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

// Store the original fetch function to be used for unauthenticated requests
const originalFetch = globalThis.fetch;

async function configureAuthenticatedFetch(idToken: string) {
  // Create a custom fetch that includes the auth token
  const customFetch = (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    const newInit: RequestInit = { ...init, headers };
    // Call the original fetch, not the monkey-patched one, to avoid recursion
    return originalFetch(input, newInit);
  };
  
  // Monkey-patch the global fetch
  globalThis.fetch = customFetch;
}

function restoreOriginalFetch() {
    if (globalThis.fetch !== originalFetch) {
        globalThis.fetch = originalFetch;
    }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleAuthChange = useCallback(async (firebaseUser: User | null) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
          try {
              const idToken = await firebaseUser.getIdToken();
              // Pass the token directly to the action
              const profile = await getOrCreateUserProfile(idToken);
              setUserProfile(profile);
          } catch (error) {
              console.error("Error fetching user profile:", error);
              setUserProfile(null);
          }
      } else {
          setUserProfile(null);
      }
      setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    return () => unsubscribe();
  }, [handleAuthChange]);
  
  // This separate effect handles configuring the fetch wrapper for server actions
  useEffect(() => {
    const setupFetch = async () => {
        if (user) {
            const idToken = await user.getIdToken();
            await configureAuthenticatedFetch(idToken);
        } else {
            restoreOriginalFetch();
        }
    };
    setupFetch();

    // Re-run when user changes
  }, [user]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
        restoreOriginalFetch();
    }
  }, []);


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
