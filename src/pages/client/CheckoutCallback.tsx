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
    <main className="flex-grow flex items-center justify-center min-h-[60vh] px-margin-mobile py-8">
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-6">
        
        {/* Top Back Navigation Option */}
        <div className="flex items-center justify-between border-b border-outline/10 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-full border border-outline/10"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Previous Page</span>
          </button>
          <Link
            to="/cart"
            className="text-xs font-bold text-primary hover:underline"
          >
            Return to Cart
          </Link>
        </div>

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
            <div className="w-full space-y-2">
              <Link to="/profile" className="w-full block bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-xl hover:bg-primary-container transition-colors">
                View Order History
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full block bg-surface-container-low text-secondary font-label-caps text-xs py-2.5 rounded-xl border border-outline/10 hover:text-on-surface transition-colors"
              >
                ← Back to Previous Page
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-error/20 text-error rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">error</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Payment Verification Failed</h2>
            <p className="font-body-md text-secondary mb-6">There was an issue verifying your payment. If you were charged, please contact support.</p>
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full block bg-primary text-on-primary font-label-caps text-xs py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Previous Page
              </button>
              <Link to="/cart" className="w-full block bg-surface-container-low text-on-surface font-label-caps text-xs py-3 rounded-xl border border-outline/10 hover:bg-surface-container-high transition-colors">
                Return to Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
