import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Promo & Gift Card State
  const [promoInput, setPromoInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Checkout Form State
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  
  const shipping = total > 100000 ? 0 : 15000;
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const finalTotal = Math.max(0, total + shipping - discountAmount);

  const handleApplyPromo = async () => {
    setPromoError(null);
    if (!promoInput.trim()) return;

    const cleanCode = promoInput.trim().toUpperCase();

    // 1. Preset coupons
    if (cleanCode === 'BABYJAT20') {
      const amt = Math.round(total * 0.2);
      setAppliedDiscount({ code: cleanCode, amount: amt, description: '20% Special Promo Discount' });
      return;
    }
    if (cleanCode === 'LUXURY50') {
      setAppliedDiscount({ code: cleanCode, amount: 50000, description: 'UGX 50,000 Luxury Voucher' });
      return;
    }
    if (cleanCode === 'WELCOME10') {
      const amt = Math.round(total * 0.1);
      setAppliedDiscount({ code: cleanCode, amount: amt, description: '10% Welcome Discount' });
      return;
    }

    // 2. Gift Cards check
    try {
      const gcRef = doc(db, 'giftcards', cleanCode);
      const gcSnap = await getDoc(gcRef);

      if (gcSnap.exists()) {
        const gcData = gcSnap.data();
        if (gcData.status === 'redeemed' || (gcData.balance || 0) <= 0) {
          setPromoError('This gift card has already been redeemed.');
          return;
        }
        const cardBalance = gcData.balance || gcData.amount || 0;
        const discountToApply = Math.min(total + shipping, cardBalance);
        setAppliedDiscount({
          code: cleanCode,
          amount: discountToApply,
          description: `Gift Card Balance (UGX ${cardBalance.toLocaleString()})`
        });
        return;
      }
    } catch (err) {
      console.warn("Gift card verification check error:", err);
    }

    setPromoError('Invalid promo code or gift card number.');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/cart' } } });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        clientId: user.uid,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: finalTotal,
        status: 'pending',
        shippingAddress: `${address}, ${city}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Trigger Automated Order Confirmation Email
      try {
        await fetch('/api/email/send-order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            clientName: user.displayName || 'Valued Client',
            orderId: docRef.id,
            items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
            total: finalTotal,
            shippingAddress: `${address}, ${city}`
          })
        });
      } catch (emailErr) {
        console.warn("Automated order email trigger failed silently:", emailErr);
      }

      // Call backend to initialize Pesapal payment
      const nameParts = user.displayName ? user.displayName.split(' ') : ['Customer'];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const response = await fetch('/api/pesapal/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: docRef.id,
          amount: finalTotal,
          description: `Order from BabyJat`,
          email: user.email,
          firstName,
          lastName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const { redirect_url } = await response.json();

      // Clear cart
      clearCart();
      
      // Redirect to Pesapal iframe or URL
      window.location.href = redirect_url;
      
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
      setError('Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8 pb-stack-lg flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-secondary">shopping_bag</span>
        </div>
        <h2 className="font-headline-lg text-headline-lg mb-4 text-on-surface">Your Bag is Empty</h2>
        <p className="text-secondary font-body-md mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/shop" className="bg-primary text-on-primary px-8 py-3 rounded-full font-label-caps hover:bg-primary-container transition-colors">
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8 pb-stack-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      {/* Cart Items List */}
      <div className="lg:col-span-7 flex flex-col gap-stack-md">
        <div className="flex items-center justify-between mb-stack-sm md:hidden">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Your Bag</h2>
          <span className="font-label-caps text-label-caps text-on-surface-variant">{itemCount} ITEMS</span>
        </div>
        <h2 className="hidden md:block font-headline-lg text-headline-lg text-on-surface mb-stack-sm">Your Bag <span className="font-body-md text-on-surface-variant ml-2 font-normal">({itemCount} Items)</span></h2>
        
        {items.map(item => (
          <div key={item.id} className="glass-panel ambient-glow p-4 md:p-6 rounded-xl flex gap-4 md:gap-6 items-start relative group">
            <div className="w-24 h-32 md:w-32 md:h-40 shrink-0 bg-surface-container rounded-lg overflow-hidden relative">
              <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
            </div>
            <div className="flex-grow flex flex-col justify-between h-full min-h-[128px] md:min-h-[160px]">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface text-[18px] md:text-[24px] leading-tight mb-1">{item.name}</h3>
                  {item.options && <p className="font-body-md text-body-md text-on-surface-variant text-[14px]">{item.options}</p>}
                </div>
                <button onClick={() => removeFromCart(item.id)} aria-label="Remove item" className="text-on-surface-variant hover:text-error transition-colors p-1 -mt-1 -mr-1">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex justify-between items-end mt-auto pt-4">
                <div className="flex items-center border-[0.5px] border-outline-variant rounded-full overflow-hidden h-8 md:h-10">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 hover:bg-surface-container transition-colors text-on-surface flex items-center justify-center h-full">-</button>
                  <span className="font-label-caps text-label-caps text-on-surface px-2 min-w-[2rem] text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 hover:bg-surface-container transition-colors text-on-surface flex items-center justify-center h-full">+</button>
                </div>
                <span className="font-headline-md text-headline-md text-primary">UGX {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="mt-stack-sm flex items-center gap-2 text-on-surface-variant font-body-md text-[14px]">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Authenticity Guaranteed</span>
        </div>
      </div>

      {/* Order Summary & Checkout */}
      <div className="lg:col-span-5 mt-stack-md lg:mt-0">
        <div className="glass-panel ambient-glow p-6 md:p-8 rounded-xl sticky top-[100px]">
          {isCheckingOut ? (
            <form onSubmit={handleCheckoutSubmit}>
              <div className="flex items-center justify-between gap-2 mb-stack-md border-b border-outline/10 pb-3">
                <button 
                  type="button" 
                  onClick={() => setIsCheckingOut(false)} 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-full border border-outline/10"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to Bag</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate(-1)} 
                  className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  <span>Back to Previous Page</span>
                  <span className="material-symbols-outlined text-sm">undo</span>
                </button>
              </div>

              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Secure Checkout</h3>

              {error && <div className="mb-4 bg-error-container/20 text-error p-3 rounded-lg text-sm">{error}</div>}

              <div className="space-y-4 mb-stack-md">
                <div>
                  <label className="block font-label-caps text-xs text-secondary mb-1">Shipping Address</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                    placeholder="123 Main St, Apt 4B"
                    className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-xs text-secondary mb-1">City</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    required
                    placeholder="Nairobi"
                    className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg mt-6 border border-outline/10">
                  <h4 className="font-label-caps text-xs text-secondary mb-3">Payment Method</h4>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="pesapal" name="payment" defaultChecked className="accent-primary" />
                    <label htmlFor="pesapal" className="font-body-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">credit_card</span>
                      Pesapal (Card/Mobile Money)
                    </label>
                  </div>
                </div>
              </div>

              <div className="h-[0.5px] w-full bg-on-surface/20 my-6"></div>
              
              <div className="flex justify-between items-baseline mb-stack-lg">
                <span className="font-headline-md text-headline-md text-on-surface text-[20px]">Total</span>
                <span className="font-headline-md text-headline-md text-on-surface text-[28px]">UGX {finalTotal.toFixed(2)}</span>
              </div>
              
              <button disabled={loading} type="submit" className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-none hover:bg-primary/90 transition-colors active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50">
                {loading ? <span className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" /> : 'PAY WITH PESAPAL'}
                {!loading && <span className="material-symbols-outlined text-[18px]">lock</span>}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full mt-3 bg-surface-container-low text-secondary hover:text-on-surface font-label-caps text-xs py-3 rounded-xl border border-outline/10 hover:border-outline/30 transition-colors flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                BACK TO PREVIOUS PAGE
              </button>
            </form>
          ) : (
            <>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Order Summary</h3>
              
              {/* Promo Code / Gift Card Box */}
              <div className="mb-stack-md bg-surface-container-low p-3 rounded-xl border border-outline/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-caps text-xs text-on-surface-variant">Promo Code / Gift Card</span>
                  {appliedDiscount && (
                    <button
                      type="button"
                      onClick={() => { setAppliedDiscount(null); setPromoInput(''); }}
                      className="text-[11px] text-error hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedDiscount ? (
                  <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-primary block">{appliedDiscount.code}</span>
                      <span className="text-[10px] text-secondary">{appliedDiscount.description}</span>
                    </div>
                    <span className="font-mono font-bold text-primary">- UGX {appliedDiscount.amount.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="e.g. BABYJAT20 or GIFT-CARD-CODE"
                      className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded-lg hover:opacity-90 transition-opacity"
                    >
                      APPLY
                    </button>
                  </div>
                )}
                {promoError && <p className="text-[10px] text-error mt-1">{promoError}</p>}
              </div>
              
              {/* Breakdown */}
              <div className="space-y-3 font-body-md text-body-md text-on-surface text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span>UGX {total.toLocaleString()}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>- UGX {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Estimated Delivery</span>
                  {shipping === 0 ? (
                    <span className="text-primary font-medium">Free</span>
                  ) : (
                    <span>UGX {shipping.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              <div className="h-[0.5px] w-full bg-on-surface/20 my-6"></div>
              
              <div className="flex justify-between items-baseline mb-stack-lg">
                <span className="font-headline-md text-headline-md text-on-surface text-[20px]">Total</span>
                <span className="font-headline-md text-headline-md text-primary text-[28px]">UGX {finalTotal.toLocaleString()}</span>
              </div>
              
              {/* Checkout CTA */}
              <button onClick={() => setIsCheckingOut(true)} className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-none hover:bg-primary/90 transition-colors active:scale-[0.98] flex justify-center items-center gap-2">
                PROCEED TO CHECKOUT
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <p className="text-center mt-4 font-body-md text-[12px] text-on-surface-variant">Secure SSL Checkout</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
