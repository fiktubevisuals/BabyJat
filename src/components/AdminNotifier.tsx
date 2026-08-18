import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export function AdminNotifier() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const initialApptLoad = useRef(true);
  const initialOrderLoad = useRef(true);

  useEffect(() => {
    // Only run this logic if the user is an admin
    if (profile?.role !== 'admin') return;

    // 1. Listen for new appointments
    const apptQuery = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(10));
    const unsubAppt = onSnapshot(apptQuery, (snapshot) => {
      if (initialApptLoad.current) {
        initialApptLoad.current = false;
        return; // Skip the initial burst of data on page load
      }
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.status === 'pending') {
            addToast(`New appointment requested for ${data.serviceName || 'a service'}`, 'info');
          }
        }
      });
    }, (error) => {
      console.error("AdminNotifier Appt Error:", error);
    });

    // 2. Listen for order updates (specifically paid/completed payments)
    const orderQuery = query(collection(db, 'orders'), orderBy('updatedAt', 'desc'), limit(10));
    const unsubOrder = onSnapshot(orderQuery, (snapshot) => {
      if (initialOrderLoad.current) {
        initialOrderLoad.current = false;
        return; // Skip initial load
      }
      
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        // Trigger toast if a new paid order comes in, or an existing order is updated to paid
        if ((change.type === 'added' || change.type === 'modified') && data.status === 'paid') {
          // Prevent showing a toast if it was modified but the status was already paid (e.g. tracking ID added)
          // To be perfectly accurate we would need to compare with previous state, but this is a simple approximation
          addToast(`Payment of UGX ${data.total?.toLocaleString() || '0'} processed successfully!`, 'success');
        }
      });
    }, (error) => {
      console.error("AdminNotifier Order Error:", error);
    });

    return () => {
      unsubAppt();
      unsubOrder();
    };
  }, [profile?.role, addToast]);

  return null; // This is a "logic-only" component, the actual UI is rendered by ToastProvider
}
