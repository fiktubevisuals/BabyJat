import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Features {
  enableAppointments: boolean;
  enableShop: boolean;
  maintenanceMode: boolean;
  requireEmailVerification: boolean;
  allowGuestCheckout: boolean;
}

const defaultFeatures: Features = {
  enableAppointments: true,
  enableShop: true,
  maintenanceMode: false,
  requireEmailVerification: true,
  allowGuestCheckout: true,
};

interface FeatureContextType {
  features: Features;
  updateFeatures: (newFeatures: Partial<Features>) => Promise<void>;
  loading: boolean;
}

const FeatureContext = createContext<FeatureContextType>({
  features: defaultFeatures,
  updateFeatures: async () => {},
  loading: true,
});

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Features>(defaultFeatures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'system', 'features');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setFeatures(snap.data() as Features);
      } else {
        // Initialize defaults if they don't exist
        setDoc(docRef, defaultFeatures).catch(console.error);
        setFeatures(defaultFeatures);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Features snapshot ended:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateFeatures = async (newFeatures: Partial<Features>) => {
    const docRef = doc(db, 'system', 'features');
    await setDoc(docRef, newFeatures, { merge: true });
  };

  return (
    <FeatureContext.Provider value={{ features, updateFeatures, loading }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeatures = () => useContext(FeatureContext);
