import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ReceiptModal, ReceiptData } from '../../components/receipts/ReceiptModal';

interface CartItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'product';
  quantity: number;
}

export default function POS() {
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>('walk-in');
  const [selectedStylist, setSelectedStylist] = useState<string>('Elena Rostova');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Pesapal / Mobile Money' | 'Visa / Card'>('Cash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch clients
      const clientsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')));
      const clientsData = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);

      // Fetch staff
      const staffSnap = await getDocs(collection(db, 'staff'));
      const staffData: any[] = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (staffData.length > 0) {
        setStaff(staffData);
        setSelectedStylist(staffData[0].name || 'Elena Rostova');
      }

      // Listen to services
      const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('category')), (snap) => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listen to products
      const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('category')), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listen to recent POS orders
      const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
        setRecentOrders(snap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() })));
      });

      setLoading(false);
      return () => { unsubServices(); unsubProducts(); unsubOrders(); };
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

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const total = Math.max(0, subtotal - discountAmount);

  const selectedClientObj = useMemo(() => {
    if (selectedClient === 'walk-in') {
      return { displayName: 'Walk-in Client', phone: '+256700000000', email: 'walkin@babyjat.com' };
    }
    return clients.find(c => c.id === selectedClient) || { displayName: 'Valued Client' };
  }, [selectedClient, clients]);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    
    try {
      const orderId = `BJ-POS-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderDoc = {
        orderId,
        clientId: selectedClient,
        clientName: selectedClientObj.displayName,
        clientPhone: selectedClientObj.phone,
        clientEmail: selectedClientObj.email,
        stylistName: selectedStylist,
        items: cart,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        status: 'paid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'orders', orderId), orderDoc);

      const receiptPayload: ReceiptData = {
        receiptNumber: orderId,
        orderId,
        clientName: selectedClientObj.displayName,
        clientPhone: selectedClientObj.phone,
        clientEmail: selectedClientObj.email,
        stylistName: selectedStylist,
        items: [...cart],
        subtotal,
        discount: discountAmount > 0 ? discountAmount : undefined,
        total,
        paymentMethod,
        paymentReference: `POS_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        createdAt: new Date()
      };

      setActiveReceipt(receiptPayload);
      setCart([]);
      setDiscountAmount(0);
      setSelectedClient('walk-in');
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    }
  };

  const handleReprintOrder = (order: any) => {
    const receiptPayload: ReceiptData = {
      receiptNumber: order.id || order.orderId || 'REC-HIST',
      orderId: order.id,
      clientName: order.clientName || 'Valued Client',
      clientPhone: order.clientPhone,
      clientEmail: order.clientEmail,
      stylistName: order.stylistName || 'Master Stylist',
      items: order.items || [],
      subtotal: order.subtotal || order.total || 0,
      discount: order.discount,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'Cash',
      paymentReference: order.id,
      createdAt: order.createdAt?.toDate ? order.createdAt.toDate() : new Date()
    };
    setActiveReceipt(receiptPayload);
  };

  if (loading) return <div className="p-8 text-secondary">Loading POS Engine...</div>;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-100px)]">
      
      {/* Menu / Selection Area */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-headline-md text-2xl text-on-surface">Salon POS &amp; Billing Terminal</h2>
              <p className="text-xs text-secondary">Instantly charge services, boutique items, and print 80mm thermal receipts.</p>
            </div>
          </div>
          
          <h3 className="font-label-caps text-xs text-secondary font-bold uppercase tracking-wider mb-2">Salon Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {services.map(s => (
              <button 
                key={s.id} 
                onClick={() => addToCart(s, 'service')}
                className="bg-surface-container-low hover:bg-surface-container border border-outline/10 p-3.5 rounded-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-24 shadow-sm"
              >
                <span className="font-body-md text-xs font-semibold line-clamp-2 text-on-surface">{s.name}</span>
                <span className="font-mono text-xs font-bold text-primary">UGX {s.price.toLocaleString()}</span>
              </button>
            ))}
            {services.length === 0 && <p className="text-xs text-secondary col-span-3">No services configured yet.</p>}
          </div>

          <h3 className="font-label-caps text-xs text-secondary font-bold uppercase tracking-wider mb-2">Retail Products</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[30vh] pb-4">
            {products.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p, 'product')}
                className="bg-surface-container-low hover:bg-surface-container border border-outline/10 p-3.5 rounded-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-24 shadow-sm"
              >
                <span className="font-body-md text-xs font-semibold line-clamp-2 text-on-surface">{p.name}</span>
                <div className="flex justify-between items-end">
                  <span className="font-mono text-xs font-bold text-primary">UGX {p.price.toLocaleString()}</span>
                  <span className="text-[10px] text-secondary font-mono">Stock: {p.stock}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Recent Orders Bar for Quick Reprint */}
          {recentOrders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline/10">
              <h4 className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider mb-2">
                Recent Orders (Click to Re-Print Receipt)
              </h4>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {recentOrders.slice(0, 5).map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleReprintOrder(o)}
                    className="shrink-0 bg-surface-container-low hover:bg-surface-container border border-outline/15 px-3 py-1.5 rounded-xl text-left text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">receipt</span>
                    <div>
                      <p className="font-bold text-[11px] leading-tight text-on-surface truncate max-w-[100px]">{o.clientName || 'Walk-in'}</p>
                      <p className="text-[10px] text-primary font-mono font-bold">UGX {o.total?.toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Terminal */}
      <div className="w-full md:w-96 bg-surface-container-lowest border border-outline/10 rounded-3xl p-5 flex flex-col h-full shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-headline-md text-lg text-on-surface">Current Order</h3>
          <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
            {cart.reduce((s, i) => s + i.quantity, 0)} Items
          </span>
        </div>
        
        {/* Client & Stylist Selectors */}
        <div className="space-y-2.5 mb-3">
          <div>
            <label className="block font-label-caps text-[10px] text-secondary font-bold uppercase mb-1">Client</label>
            <select 
              value={selectedClient} 
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full p-2 rounded-xl bg-surface-container-low border border-outline/20 text-xs text-on-surface"
            >
              <option value="walk-in">Walk-in Client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.displayName || c.name} ({c.email || c.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-label-caps text-[10px] text-secondary font-bold uppercase mb-1">Primary Stylist</label>
            <select 
              value={selectedStylist} 
              onChange={(e) => setSelectedStylist(e.target.value)}
              className="w-full p-2 rounded-xl bg-surface-container-low border border-outline/20 text-xs text-on-surface"
            >
              {staff.length > 0 ? (
                staff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.role || 'Stylist'})</option>)
              ) : (
                <>
                  <option value="Elena Rostova">Elena Rostova (Master Colorist)</option>
                  <option value="Marcus Vance">Marcus Vance (Senior Sculptor)</option>
                  <option value="Sofia Al-Jamil">Sofia Al-Jamil (Balayage Specialist)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block font-label-caps text-[10px] text-secondary font-bold uppercase mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Cash', 'Pesapal / Mobile Money', 'Visa / Card'] as const).map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center transition-all border ${
                    paymentMethod === pm
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container-low text-secondary border-outline/10 hover:border-outline/30'
                  }`}
                >
                  {pm === 'Pesapal / Mobile Money' ? 'Mobile Money' : pm}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Itemized List */}
        <div className="flex-1 overflow-y-auto space-y-2 border-t border-outline/10 py-3 max-h-[28vh]">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <span className="material-symbols-outlined text-3xl opacity-40">point_of_sale</span>
              <p className="text-xs mt-1">Cart is empty. Tap items to add.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex justify-between items-center bg-surface-container-low p-2.5 rounded-xl border border-outline/5">
                <div className="flex-1 pr-2">
                  <p className="font-body-md text-xs font-semibold text-on-surface leading-tight">{item.name}</p>
                  <p className="text-[10px] text-secondary capitalize">{item.type} x{item.quantity}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs font-bold text-on-surface">UGX {(item.price * item.quantity).toLocaleString()}</p>
                  <button onClick={() => removeFromCart(item.id, item.type)} className="text-error text-[10px] hover:underline mt-0.5 block">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount & Totals */}
        <div className="border-t border-outline/10 pt-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary">Subtotal</span>
            <span className="font-mono font-bold text-on-surface">UGX {subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary">Discount (UGX)</span>
            <input
              type="number"
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0"
              className="w-24 bg-surface-container-low border border-outline/20 rounded-lg px-2 py-0.5 text-right text-xs font-mono"
            />
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-outline/10">
            <span className="font-headline-md text-sm font-bold text-on-surface">Total Due</span>
            <span className="font-headline-md text-xl font-extrabold text-primary font-mono">
              UGX {total.toLocaleString()}
            </span>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-label-caps text-xs font-bold tracking-wider disabled:opacity-50 hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">receipt</span>
            <span>CHARGE &amp; PRINT RECEIPT</span>
          </button>
        </div>
      </div>

      {/* Official 80mm / A4 Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          data={activeReceipt}
        />
      )}
    </div>
  );
}
