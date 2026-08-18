import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function CheckoutCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference');

  useEffect(() => {
    async function handleCallback() {
      if (!orderMerchantReference) {
        setStatus('error');
        return;
      }

      try {
        const orderRef = doc(db, 'orders', orderMerchantReference);
        await updateDoc(orderRef, {
          status: 'paid',
          orderTrackingId: orderTrackingId || 'mock_tracking',
          updatedAt: serverTimestamp()
        });
        
        setStatus('success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderMerchantReference}`);
        setStatus('error');
      }
    }

    handleCallback();
  }, [orderTrackingId, orderMerchantReference]);

  return (
    <main className="flex-grow flex items-center justify-center min-h-[60vh] px-margin-mobile">
      <div className="glass-panel p-8 rounded-xl max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <h2 className="font-headline-md text-headline-md text-on-surface">Confirming Payment...</h2>
            <p className="font-body-md text-secondary mt-2">Please wait while we verify your transaction.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Payment Successful!</h2>
            <p className="font-body-md text-secondary mb-6">Your order #{orderMerchantReference?.slice(0,6)} has been placed.</p>
            <Link to="/profile" className="w-full block bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-DEFAULT hover:bg-primary-container transition-colors">
              View Order History
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-error/20 text-error rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">error</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Payment Verification Failed</h2>
            <p className="font-body-md text-secondary mb-6">There was an issue verifying your payment. If you were charged, please contact support.</p>
            <Link to="/profile" className="w-full block bg-transparent border border-on-surface text-on-surface font-label-caps text-label-caps py-3 rounded-DEFAULT hover:bg-surface-variant transition-colors">
              Go to Profile
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
