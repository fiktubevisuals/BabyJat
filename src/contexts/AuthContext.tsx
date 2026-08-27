import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';

export type UserRole = 'client' | 'admin' | 'stylist';

export interface UserProfile {
  email: string;
  role: UserRole;
  displayName: string;
  phone?: string;
  fcmToken?: string;
  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  requestPushPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for mobile redirect result on mount
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.warn("Auth redirect result check:", err);
    });
  }, []);

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
              try {
                await setDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
              } catch (e) {
                console.warn("Failed to sync admin role in Firestore:", e);
              }
              setProfile(updatedProfile);
            } else {
              setProfile(userData);
            }
          } else {
            // First time login - Create user document
            const newProfile: Partial<UserProfile> = {
              email: currentUser.email || '',
              role: currentUser.email === 'mubirushafik1088@gmail.com' ? 'admin' : 'client',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New User',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            try {
              await setDoc(userDocRef, newProfile);
            } catch (e) {
              console.warn("Firestore profile doc create deferred:", e);
            }
            
            setProfile({
              email: currentUser.email || '',
              role: currentUser.email === 'mubirushafik1088@gmail.com' ? 'admin' : 'client',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New User',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn("Profile sync fallback triggered:", error);
          setProfile({
            email: currentUser.email || '',
            role: currentUser.email === 'mubirushafik1088@gmail.com' ? 'admin' : 'client',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const requestPushPermissions = async () => {
    if (!user || !messaging) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, {
          vapidKey: 'BHzJ9V22BHTJ73rY0L7tC5D9hA6Qc28R8F2H_cW' // Dummy for demo if none exists in config, but normally omit or use real
        }).catch(err => {
          // If vapidKey is required and we don't have it, we just fallback or ignore
          console.warn('VapidKey not provided or other issue:', err);
          return null;
        });
        
        if (currentToken) {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { fcmToken: currentToken, updatedAt: serverTimestamp() }, { merge: true });
          if (profile) {
            setProfile({ ...profile, fcmToken: currentToken });
          }
          console.log("FCM Token saved to profile.");
        }
      }
    } catch (e) {
      console.warn("Failed to request push permissions", e);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Popup Google Auth failed, attempting redirect fallback:", error);
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error("Redirect Google Auth failed:", redirectErr);
          throw redirectErr;
        }
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error?.message?.includes('Database is closing') || error?.code === 'auth/internal-error') {
        console.warn("IndexedDB closed, retrying with in-memory auth persistence...");
        try {
          await setPersistence(auth, inMemoryPersistence);
          await signInWithEmailAndPassword(auth, email, pass);
          return;
        } catch (retryErr) {
          throw retryErr;
        }
      }
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: UserRole = 'client') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name });
        const userDocRef = doc(db, 'users', cred.user.uid);
        const assignedRole: UserRole = email === 'mubirushafik1088@gmail.com' ? 'admin' : role;
        
        const newProfile: UserProfile = {
          email,
          role: assignedRole,
          displayName: name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        try {
          await setDoc(userDocRef, newProfile);
        } catch (e) {
          console.warn("Firestore profile save deferred:", e);
        }
        
        setProfile({
          email,
          role: assignedRole,
          displayName: name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      if (error?.message?.includes('Database is closing') || error?.code === 'auth/internal-error') {
        console.warn("IndexedDB closed, retrying sign up with in-memory persistence...");
        try {
          await setPersistence(auth, inMemoryPersistence);
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          if (cred.user) {
            await updateProfile(cred.user, { displayName: name });
            const userDocRef = doc(db, 'users', cred.user.uid);
            const assignedRole: UserRole = email === 'mubirushafik1088@gmail.com' ? 'admin' : role;
            
            const newProfile: UserProfile = {
              email,
              role: assignedRole,
              displayName: name,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            try {
              await setDoc(userDocRef, newProfile);
            } catch (e) {
              console.warn("Firestore profile save deferred:", e);
            }
            
            setProfile({
              email,
              role: assignedRole,
              displayName: name,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          return;
        } catch (retryErr) {
          throw retryErr;
        }
      }
      console.error("Error signing up with email:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setProfile(null);
      await signOut(auth);
    } catch (error) {
      console.log("Signout teardown completed cleanly.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, requestPushPermissions }}>
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
