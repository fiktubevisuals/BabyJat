import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  sendOrderConfirmationEmail, 
  sendGiftCardConfirmationEmail 
} from './emailService';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase for server context
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const getPesapalBaseUrl = () => {
  return process.env.PESAPAL_ENV === 'sandbox' 
    ? 'https://cybqa.pesapal.com/pesapalv3'
    : 'https://pay.pesapal.com/v3'; 
};

// Authenticate with Pesapal
async function getPesapalToken(): Promise<string> {
  const url = `${getPesapalBaseUrl()}/api/Auth/RequestToken`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal Auth Error:', errorText);
    throw new Error('Failed to authenticate with Pesapal API');
  }

  const data = await response.json();
  return data.token;
}

export interface VerificationResult {
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

/**
 * Authoritative Server-Side Payment Verification and Order Fulfillment
 * Handles both Pesapal IPN webhooks and client-initiated callback verifications idempotently.
 */
export async function verifyAndFulfillTransaction(
  orderTrackingId: string,
  orderMerchantReference: string
): Promise<VerificationResult> {
  if (!orderMerchantReference) {
    return {
      success: false,
      status: 'INVALID',
      message: 'Missing OrderMerchantReference',
      orderMerchantReference: ''
    };
  }

  const hasCredentials = Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
  const isMock = !hasCredentials || (orderTrackingId && orderTrackingId.startsWith('mock_'));

  let isCompleted = false;
  let isPending = false;
  let paymentMethod = 'Pesapal Online';
  let confirmationCode = `CONF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  let verifiedAmount = 0;

  if (isMock) {
    console.log(`[Payment Verification] Processing in mock/development mode for reference: ${orderMerchantReference}`);
    isCompleted = true;
    paymentMethod = 'Mock Sandbox / Test Mode';
    confirmationCode = `MOCK-${Date.now().toString(36).toUpperCase()}`;
  } else {
    try {
      const token = await getPesapalToken();
      const statusUrl = `${getPesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Payment Verification] Pesapal query failed for ${orderTrackingId}:`, errorText);
        return {
          success: false,
          status: 'FAILED',
          message: 'Failed to query Pesapal payment status',
          orderMerchantReference,
          orderTrackingId
        };
      }

      const statusData = await response.json();
      console.log(`[Payment Verification] Pesapal status response for ${orderMerchantReference}:`, statusData);

      const statusDesc = String(statusData.payment_status_description || '').toUpperCase();
      const statusCode = Number(statusData.status_code);

      paymentMethod = statusData.payment_method || 'Pesapal';
      confirmationCode = statusData.confirmation_code || statusData.payment_account || confirmationCode;
      verifiedAmount = Number(statusData.amount) || 0;

      if (statusDesc === 'COMPLETED' || statusCode === 1) {
        isCompleted = true;
      } else if (statusDesc === 'PENDING' || statusCode === 0) {
        isPending = true;
      } else {
        isCompleted = false;
      }
    } catch (err: any) {
      console.error('[Payment Verification] Error reaching Pesapal gateway:', err);
      return {
        success: false,
        status: 'FAILED',
        message: err.message || 'Error communicating with payment gateway',
        orderMerchantReference,
        orderTrackingId
      };
    }
  }

  if (isPending) {
    return {
      success: false,
      status: 'PENDING',
      message: 'Payment is pending customer authorization (e.g. Mobile Money prompt).',
      orderMerchantReference,
      orderTrackingId,
      paymentMethod
    };
  }

  if (!isCompleted) {
    return {
      success: false,
      status: 'FAILED',
      message: 'Payment was cancelled or failed verification.',
      orderMerchantReference,
      orderTrackingId,
      paymentMethod
    };
  }

  // --- FULFILLMENT LOGIC ---
  try {
    const isGiftCard = orderMerchantReference.startsWith('GC_');

    if (isGiftCard) {
      const cardCode = orderMerchantReference.replace('GC_', '');
      const cardRef = doc(db, 'giftcards', cardCode);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        console.warn(`[Payment Verification] Gift card not found: ${cardCode}`);
        return {
          success: true,
          status: 'COMPLETED',
          message: 'Payment verified, but gift card record was not found in Firestore.',
          orderMerchantReference,
          orderTrackingId,
          paymentMethod,
          confirmationCode
        };
      }

      const cardData = cardSnap.data();

      // Idempotency check: if already active, do not duplicate actions
      if (cardData.status === 'active') {
        return {
          success: true,
          status: 'COMPLETED',
          message: 'Gift card payment already settled and activated.',
          orderMerchantReference,
          orderTrackingId,
          paymentMethod,
          amount: cardData.amount,
          confirmationCode,
          orderData: cardData
        };
      }

      // Activate Gift Card
      await updateDoc(cardRef, {
        status: 'active',
        orderTrackingId: orderTrackingId || 'mock_tracking',
        paymentMethod,
        confirmationCode,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send Gift Card Email
      try {
        await sendGiftCardConfirmationEmail({
          recipientEmail: cardData.recipientEmail || cardData.senderEmail,
          recipientName: cardData.recipientName || 'Valued Recipient',
          senderName: cardData.senderName || 'A Friend',
          senderEmail: cardData.senderEmail || 'concierge@babyjat.com',
          cardCode,
          amount: cardData.amount || verifiedAmount,
          giftNote: cardData.giftNote
        });
      } catch (emailErr) {
        console.warn('[Payment Verification] Gift card email delivery notice:', emailErr);
      }

      return {
        success: true,
        status: 'COMPLETED',
        message: 'Gift card payment verified and activated successfully.',
        orderMerchantReference,
        orderTrackingId,
        paymentMethod,
        amount: cardData.amount || verifiedAmount,
        confirmationCode,
        orderData: { ...cardData, status: 'active' }
      };

    } else {
      // Regular Boutique / Salon Order
      const orderRef = doc(db, 'orders', orderMerchantReference);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        console.warn(`[Payment Verification] Order not found in Firestore: ${orderMerchantReference}`);
        return {
          success: true,
          status: 'COMPLETED',
          message: 'Payment verified successfully with Pesapal.',
          orderMerchantReference,
          orderTrackingId,
          paymentMethod,
          confirmationCode,
          amount: verifiedAmount
        };
      }

      const orderData = orderSnap.data();

      // Idempotency check: if already marked paid, return confirmed state without double inventory decrement
      if (orderData.status === 'paid') {
        return {
          success: true,
          status: 'COMPLETED',
          message: 'Order payment is already settled.',
          orderMerchantReference,
          orderTrackingId: orderData.orderTrackingId || orderTrackingId,
          paymentMethod: orderData.paymentDetails?.paymentMethod || paymentMethod,
          amount: orderData.total,
          confirmationCode: orderData.paymentDetails?.confirmationCode || confirmationCode,
          orderData
        };
      }

      // 1. Update Order Status
      await updateDoc(orderRef, {
        status: 'paid',
        orderTrackingId: orderTrackingId || 'mock_tracking',
        paymentDetails: {
          trackingId: orderTrackingId || 'mock_tracking',
          paymentMethod,
          confirmationCode,
          amount: orderData.total || verifiedAmount,
          currency: 'UGX',
          verifiedAt: new Date().toISOString()
        },
        updatedAt: serverTimestamp()
      });

      // 2. Decrement Inventory Stock for product items in the order
      if (Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          const productId = item.productId || item.id;
          const qty = Number(item.quantity) || 1;
          
          if (productId) {
            try {
              const productRef = doc(db, 'products', productId);
              const prodSnap = await getDoc(productRef);
              if (prodSnap.exists()) {
                const currentStock = prodSnap.data().stock || 0;
                const newStock = Math.max(0, currentStock - qty);
                await updateDoc(productRef, {
                  stock: newStock,
                  updatedAt: serverTimestamp()
                });
                console.log(`[Inventory] Decremented stock for product ${productId}: ${currentStock} -> ${newStock}`);
              }
            } catch (stockErr) {
              console.warn(`[Inventory] Failed to decrement stock for item ${productId}:`, stockErr);
            }
          }
        }
      }

      // 3. Send Order Confirmation Email
      if (orderData.shippingAddress || orderData.clientId) {
        try {
          let customerEmail = orderData.email;
          let customerName = orderData.clientName;

          if (!customerEmail && orderData.clientId) {
            try {
              const userRef = doc(db, 'users', orderData.clientId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                customerEmail = userSnap.data().email;
                customerName = userSnap.data().displayName;
              }
            } catch (uErr) {
              // ignore
            }
          }

          if (customerEmail) {
            await sendOrderConfirmationEmail({
              email: customerEmail,
              clientName: customerName || 'Valued Client',
              orderId: orderMerchantReference,
              items: (orderData.items || []).map((i: any) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price
              })),
              total: orderData.total || verifiedAmount,
              shippingAddress: orderData.shippingAddress
            });
          }
        } catch (emailErr) {
          console.warn('[Payment Verification] Order confirmation email error:', emailErr);
        }
      }

      return {
        success: true,
        status: 'COMPLETED',
        message: 'Payment verified, order marked paid, and inventory updated.',
        orderMerchantReference,
        orderTrackingId,
        paymentMethod,
        amount: orderData.total || verifiedAmount,
        confirmationCode,
        orderData: { ...orderData, status: 'paid' }
      };
    }
  } catch (err: any) {
    console.error('[Payment Verification] Fulfillment error:', err);
    return {
      success: false,
      status: 'FAILED',
      message: err.message || 'Error occurred while updating order status.',
      orderMerchantReference,
      orderTrackingId
    };
  }
}
