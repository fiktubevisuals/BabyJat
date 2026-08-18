import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'product';
  quantity: number;
}

export default function POS() {
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>('walk-in');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch clients
      const clientsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')));
      const clientsData = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);

      // Listen to services
      const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('category')), (snap) => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listen to products
      const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('category')), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      setLoading(false);
      return () => { unsubServices(); unsubProducts(); };
    };
    
    fetchData();
  }, []);

  const addToCart = (item: any, type: 'service' | 'product') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, type, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, type: 'service' | 'product') => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    
    try {
      const orderId = Math.random().toString(36).substring(2, 15);
      await setDoc(doc(db, 'orders', orderId), {
        clientId: selectedClient,
        items: cart,
        total,
        status: 'paid', // POS assumed paid
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert('Checkout successful! Order ID: ' + orderId);
      setCart([]);
      setSelectedClient('walk-in');
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    }
  };

  if (loading) return <div className="p-8">Loading POS...</div>;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
      
      {/* Menu / Selection Area */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div>
          <h2 className="font-headline-md text-headline-md mb-4">Point of Sale</h2>
          
          <h3 className="font-label-caps text-secondary mb-2">Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {services.map(s => (
              <button 
                key={s.id} 
                onClick={() => addToCart(s, 'service')}
                className="bg-surface-container-low hover:bg-surface-container border border-outline/10 p-4 rounded-xl text-left transition-colors flex flex-col justify-between h-24"
              >
                <span className="font-body-md line-clamp-2">{s.name}</span>
                <span className="font-label-caps text-primary">UGX {s.price.toLocaleString()}</span>
              </button>
            ))}
            {services.length === 0 && <p className="text-sm text-secondary col-span-3">No services configured yet.</p>}
          </div>

          <h3 className="font-label-caps text-secondary mb-2">Retail Products</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pb-20">
            {products.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p, 'product')}
                className="bg-surface-container-low hover:bg-surface-container border border-outline/10 p-4 rounded-xl text-left transition-colors flex flex-col justify-between h-24"
              >
                <span className="font-body-md line-clamp-2">{p.name}</span>
                <div className="flex justify-between items-end">
                  <span className="font-label-caps text-primary">UGX {p.price.toLocaleString()}</span>
                  <span className="text-[10px] text-secondary">Stock: {p.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="w-full md:w-96 bg-surface-container-lowest border border-outline/10 rounded-2xl p-6 flex flex-col h-full shadow-sm">
        <h3 className="font-headline-md mb-4">Current Order</h3>
        
        <div className="mb-4">
          <label className="block font-label-caps text-xs text-secondary mb-1">Client</label>
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full p-2 rounded-lg bg-surface-container-low border border-outline/20 text-sm"
          >
            <option value="walk-in">Walk-in Client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.displayName} ({c.email})</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 border-t border-outline/10 pt-4">
          {cart.length === 0 ? (
            <p className="text-secondary text-sm text-center mt-10">Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex justify-between items-center bg-surface-container-low p-3 rounded-lg">
                <div className="flex-1 pr-2">
                  <p className="font-body-md text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-secondary capitalize">{item.type} x{item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-body-md text-sm font-bold">UGX {(item.price * item.quantity).toLocaleString()}</p>
                  <button onClick={() => removeFromCart(item.id, item.type)} className="text-error text-xs hover:underline mt-1">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-outline/20 pt-4 mt-4">
          <div className="flex justify-between items-center mb-6">
            <span className="font-headline-md text-lg">Total</span>
            <span className="font-headline-md text-xl text-primary">UGX {total.toLocaleString()}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-caps tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            PROCESS PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
}
