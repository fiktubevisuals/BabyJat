import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export type UserRole = 'client' | 'admin' | 'stylist';

export interface UserProfile {
  email: string;
  role: UserRole;
  displayName: string;
  phone?: string;
  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            
            // Auto-promote specific user to admin
            if (currentUser.email === 'mubirushafik1088@gmail.com' && userData.role !== 'admin') {
              const updatedProfile = { ...userData, role: 'admin' as UserRole };
              await setDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(userData);
            }
          } else {
            // First time login - Create user document
            const newProfile: Partial<UserProfile> = {
              email: currentUser.email || '',
              role: currentUser.email === 'mubirushafik1088@gmail.com' ? 'admin' : 'client',
              displayName: currentUser.displayName || 'New User',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Don't use handleFirestoreError here to prevent crashes on auth state changes, just log
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout }}>
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
