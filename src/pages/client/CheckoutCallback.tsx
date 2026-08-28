import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ReceiptModal, ReceiptData } from '../../components/receipts/ReceiptModal';

interface VerificationData {
  success: boolean;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'INVALID';
  message: string;
  orderMerchantReference: string;
  orderTrackingId?: string;
  paymentMethod?: string;
  amount?: number;
  confirmationCode?: string;
  orderData?: any;
}

export default function CheckoutCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [data, setData] = useState<VerificationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [rechecking, setRechecking] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const orderTrackingId = searchParams.get('OrderTrackingId') || searchParams.get('order_tracking_id');
  const orderMerchantReference = searchParams.get('OrderMerchantReference') || searchParams.get('OrderReference') || searchParams.get('orderId');

  const verifyPayment = useCallback(async (isManualRetry = false) => {
    if (!orderMerchantReference) {
      setStatus('error');
      setErrorMessage('Missing order reference parameters in callback URL.');
      return;
    }

    if (isManualRetry) setRechecking(true);
    else setStatus('loading');

    try {
      const response = await fetch('/api/pesapal/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderTrackingId: orderTrackingId || '',
          orderMerchantReference
        })
      });

      const result: VerificationData = await response.json();

      if (response.ok && result.success && result.status === 'COMPLETED') {
        setData(result);
        setStatus('success');
      } else if (result.status === 'PENDING') {
        setData(result);
        setStatus('pending');
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Payment verification did not complete successfully.');
      }
    } catch (err: any) {
      console.error('Payment Verification Network Error:', err);
      setStatus('error');
      setErrorMessage('Could not connect to payment verification server. Please try again.');
    } finally {
      setRechecking(false);
    }
  }, [orderMerchantReference, orderTrackingId]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  const isGiftCard = orderMerchantReference?.startsWith('GC_');

  // Build receipt payload if data exists
  const receiptData: ReceiptData | null = data ? {
    receiptNumber: orderMerchantReference || 'REC-ONLINE',
    orderId: orderMerchantReference || undefined,
    clientName: data.orderData?.customerName || data.orderData?.recipientName || 'Valued Client',
    clientEmail: data.orderData?.customerEmail || data.orderData?.recipientEmail,
    items: data.orderData?.items || [
      {
        name: isGiftCard ? 'Luxury Digital Gift Voucher' : 'Salon Boutique Order',
        quantity: 1,
        price: data.amount || 0,
        type: isGiftCard ? 'service' : 'product'
      }
    ],
    subtotal: data.amount || 0,
    total: data.amount || 0,
    paymentMethod: data.paymentMethod || 'Pesapal / Mobile Money',
    paymentReference: data.confirmationCode || orderTrackingId || undefined,
    createdAt: new Date()
  } : null;

  return (
    <main className="max-w-xl mx-auto px-4 py-12 md:py-20 text-center">
      <div className="bg-surface p-6 md:p-8 rounded-3xl border border-outline/10 shadow-xl">
        
        {/* 1. Loading State */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-8">
            <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-5" />
            <h2 className="font-headline-md text-headline-md text-on-surface">Verifying Payment Securely</h2>
            <p className="font-body-md text-secondary text-sm mt-2 max-w-xs">
              Confirming transaction with Pesapal & authenticating order fulfillment...
            </p>
          </div>
        )}

        {/* 2. Success State */}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/10">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            
            <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
              {isGiftCard ? "Gift Card Activated!" : "Payment Confirmed!"}
            </h2>
            <p className="font-body-md text-secondary text-sm mb-6">
              {isGiftCard 
                ? "Your digital luxury gift voucher is funded and ready for use."
                : `Thank you for choosing BabyJat. Your order #${orderMerchantReference?.slice(0, 8)} is confirmed.`}
            </p>

            <div className="w-full bg-surface-container-low rounded-xl p-4 text-left border border-outline/10 mb-6 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-outline/5">
                <span className="text-secondary">Reference:</span>
                <span className="font-mono font-bold text-on-surface">{orderMerchantReference}</span>
              </div>
              {data?.confirmationCode && (
                <div className="flex justify-between py-1 border-b border-outline/5">
                  <span className="text-secondary">Confirmation Code:</span>
                  <span className="font-mono font-bold text-primary">{data.confirmationCode}</span>
                </div>
              )}
              {data?.paymentMethod && (
                <div className="flex justify-between py-1 border-b border-outline/5">
                  <span className="text-secondary">Payment Method:</span>
                  <span className="text-on-surface font-medium">{data.paymentMethod}</span>
                </div>
              )}
              {data?.amount && (
                <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                  <span className="text-on-surface">Amount Paid:</span>
                  <span className="text-primary font-mono">UGX {data.amount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Links */}
            <div className="w-full space-y-2.5">
              {receiptData && (
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-caps text-xs font-bold transition-all flex items-center justify-center gap-2 border border-outline/15 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                  <span>View &amp; Print Official Receipt (80mm / A4)</span>
                </button>
              )}

              <Link
                to={isGiftCard ? "/gift-cards" : "/profile"}
                className="w-full block bg-primary text-on-primary font-label-caps text-label-caps py-3.5 rounded-xl hover:bg-primary-container transition-all shadow-md"
              >
                {isGiftCard ? "View Digital Gift Cards" : "View Order History"}
              </Link>
              <Link
                to="/shop"
                className="w-full block bg-surface-container-low text-secondary font-label-caps text-xs py-3 rounded-xl border border-outline/10 hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                Continue Boutique Shopping
              </Link>
            </div>
          </div>
        )}

        {/* 3. Pending State */}
        {status === 'pending' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <span className="material-symbols-outlined text-[36px]">hourglass_top</span>
            </div>
            
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              Awaiting Authorization
            </h2>
            <p className="font-body-md text-secondary text-sm mb-6">
              If you paid via Mobile Money, please enter your PIN on your phone to complete the transaction.
            </p>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => verifyPayment(true)}
                disabled={rechecking}
                className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {rechecking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
                    <span>Re-checking with Pesapal...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>I have Approved with PIN - Confirm Now</span>
                  </>
                )}
              </button>
              
              <Link
                to="/cart"
                className="w-full block bg-surface-container-low text-secondary font-label-caps text-xs py-3 rounded-xl border border-outline/10 hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                Return to Cart
              </Link>
            </div>
          </div>
        )}

        {/* 4. Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-error/20 text-error rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[36px]">error</span>
            </div>
            
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              Payment Verification Incomplete
            </h2>
            <p className="font-body-md text-secondary text-sm mb-6 max-w-sm">
              {errorMessage || 'We could not confirm the settlement for this transaction.'}
            </p>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => verifyPayment(true)}
                className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Try Verifying Again
              </button>
              <Link
                to="/cart"
                className="w-full block bg-surface-container-low text-secondary font-label-caps text-xs py-3 rounded-xl border border-outline/10 hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                Return to Cart
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Official Receipt Dialog */}
      {showReceipt && receiptData && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          data={receiptData}
        />
      )}
    </main>
  );
}
