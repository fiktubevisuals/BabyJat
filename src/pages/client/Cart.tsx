import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Checkout Form State
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  
  const shipping = total > 100 ? 0 : 15;
  const finalTotal = total + shipping;

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
              <div className="flex items-center gap-2 mb-stack-md">
                <button type="button" onClick={() => setIsCheckingOut(false)} className="text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 className="font-headline-md text-headline-md text-on-surface">Secure Checkout</h3>
              </div>

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
            </form>
          ) : (
            <>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Order Summary</h3>
              {/* Promo Code */}
              <div className="mb-stack-md relative">
                <input type="text" id="promo" className="w-full bg-transparent border-0 border-b-[1px] border-on-surface focus:ring-0 focus:border-primary px-0 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-colors peer" placeholder=" " />
                <label htmlFor="promo" className="absolute left-0 -top-4 font-label-caps text-label-caps text-on-surface-variant transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-2 peer-focus:-top-4 peer-focus:text-label-caps peer-focus:text-primary pointer-events-none">Promo Code</label>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 font-label-caps text-label-caps text-on-surface hover:text-primary transition-colors">APPLY</button>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-4 font-body-md text-body-md text-on-surface">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span>UGX {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-primary font-medium">Free</span>
                  ) : (
                    <span>UGX {shipping.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div className="h-[0.5px] w-full bg-on-surface/20 my-6"></div>
              
              <div className="flex justify-between items-baseline mb-stack-lg">
                <span className="font-headline-md text-headline-md text-on-surface text-[20px]">Total</span>
                <span className="font-headline-md text-headline-md text-on-surface text-[28px]">UGX {finalTotal.toFixed(2)}</span>
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
