import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

import { compressImageToBase64 } from '../../utils/imageUtils';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    }, (err) => {
      console.warn("Products snapshot ended:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData(product);
    } else {
      setEditingId(null);
      setFormData({ category: 'retail', stock: 0, price: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setUploadingImage(true);
    try {
      // Compress and convert to base64
      const base64Str = await compressImageToBase64(file, 600, 600, 0.7);
      setFormData(prev => ({ ...prev, imageUrl: base64Str }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.sku || formData.price === undefined || formData.stock === undefined) {
      alert('Please fill out all required fields');
      return;
    }

    const id = editingId || Math.random().toString(36).substring(2, 15);
    const docRef = doc(db, 'products', id);
    
    const payload: any = {
      name: formData.name,
      category: formData.category || 'retail',
      price: Number(formData.price),
      stock: Number(formData.stock),
      sku: formData.sku,
      updatedAt: serverTimestamp()
    };
    
    if (formData.imageUrl) {
      payload.imageUrl = formData.imageUrl;
    }

    if (!editingId) {
      payload.createdAt = serverTimestamp();
    } else {
      const existing = products.find(p => p.id === id);
      if (existing && existing.createdAt) {
        payload.createdAt = existing.createdAt;
      } else {
        payload.createdAt = serverTimestamp();
      }
    }

    try {
      await setDoc(docRef, payload);
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'retail' | 'backbar' | 'low_stock'>('all');
  const [alertDispatching, setAlertDispatching] = useState(false);

  const handleQuickRestock = async (productId: string, currentStock: number, addAmount = 10) => {
    try {
      await setDoc(doc(db, 'products', productId), {
        stock: currentStock + addAmount,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('Failed to update product stock');
    }
  };

  const dispatchLowStockAlerts = async () => {
    const lowStockItems = products.filter(p => p.stock <= lowStockThreshold);
    if (lowStockItems.length === 0) {
      alert(`No products are currently at or below the threshold of ${lowStockThreshold} units.`);
      return;
    }

    setAlertDispatching(true);
    try {
      const reminderId = Math.random().toString(36).substring(2, 15);
      const itemNames = lowStockItems.map(i => `${i.name} (${i.stock} left)`).join(', ');
      
      await setDoc(doc(db, 'reminders', reminderId), {
        clientName: 'Boutique Inventory Manager',
        clientContact: 'mubirushafik1088@gmail.com',
        serviceName: `Low-Stock Warning: ${lowStockItems.length} item(s)`,
        appointmentTime: itemNames,
        status: 'sent',
        type: 'low_stock_alert',
        timestamp: serverTimestamp()
      });

      alert(`Automated alert dispatched successfully! Sent low-stock summary for ${lowStockItems.length} item(s) to boutique manager email.`);
    } catch (err) {
      console.error(err);
      alert('Failed to send automated alert.');
    } finally {
      setAlertDispatching(false);
    }
  };

  const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStock = products.filter(p => p.stock <= lowStockThreshold).length;

  const filteredProducts = products.filter(p => {
    if (activeCategoryFilter === 'retail') return p.category !== 'backbar';
    if (activeCategoryFilter === 'backbar') return p.category === 'backbar';
    if (activeCategoryFilter === 'low_stock') return p.stock <= lowStockThreshold;
    return true;
  });

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Inventory Control & Alerts</h2>
          <p className="font-body-md text-sm text-secondary mt-1">Manage retail products, backbar supplies & automated low-stock alerts</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={dispatchLowStockAlerts}
            disabled={alertDispatching || lowStock === 0}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg font-label-caps text-xs shadow-md hover:bg-amber-700 whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">notifications_active</span>
            {alertDispatching ? 'Sending Alert...' : 'Dispatch Low-Stock Alert'}
          </button>
          <button onClick={() => openModal()} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-xs shadow-md hover:opacity-90 whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span> Add Item
          </button>
        </div>
      </div>

      {/* KPI Cards & Alert Config */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/5 shadow-sm">
          <p className="font-label-caps text-[10px] text-secondary mb-1">Total Items</p>
          <p className="font-headline-md text-xl">{products.length}</p>
        </div>
        <div 
          onClick={() => setActiveCategoryFilter('low_stock')}
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline/5 shadow-sm cursor-pointer hover:border-error/40 transition-colors"
        >
          <p className="font-label-caps text-[10px] text-secondary mb-1">Low Stock Alerts</p>
          <p className="font-headline-md text-xl text-error flex items-center gap-2">{lowStock} <span className="material-symbols-outlined text-sm">warning</span></p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/5 shadow-sm">
          <p className="font-label-caps text-[10px] text-secondary mb-1">Retail Value</p>
          <p className="font-headline-md text-xl">UGX {totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/5 shadow-sm flex flex-col justify-between">
          <p className="font-label-caps text-[10px] text-secondary mb-1">Low-Stock Alert Threshold</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value) || 5)}
              className="w-16 p-1 border border-outline/20 rounded text-xs text-center font-bold bg-surface"
            />
            <span className="text-xs text-secondary font-label-caps">units</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b border-outline/10 pb-2">
        <button
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
            activeCategoryFilter === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-secondary hover:text-on-surface'
          }`}
        >
          All Items ({products.length})
        </button>
        <button
          onClick={() => setActiveCategoryFilter('retail')}
          className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
            activeCategoryFilter === 'retail' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-secondary hover:text-on-surface'
          }`}
        >
          Retail ({products.filter(p => p.category !== 'backbar').length})
        </button>
        <button
          onClick={() => setActiveCategoryFilter('backbar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
            activeCategoryFilter === 'backbar' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-secondary hover:text-on-surface'
          }`}
        >
          Backbar ({products.filter(p => p.category === 'backbar').length})
        </button>
        <button
          onClick={() => setActiveCategoryFilter('low_stock')}
          className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors flex items-center gap-1 ${
            activeCategoryFilter === 'low_stock' ? 'bg-error text-on-error font-bold' : 'bg-error-container/20 text-error hover:bg-error-container/40'
          }`}
        >
          <span className="material-symbols-outlined text-xs">warning</span>
          Needs Restock ({lowStock})
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline/10">
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal">Product Name</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal">SKU</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal">Category</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-right">Price</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-center">Stock</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-center">Status</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-sm divide-y divide-outline/5">
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-secondary">Loading inventory...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-secondary">No products matching current filter.</td></tr>
              ) : filteredProducts.map(product => {
                const isLow = product.stock <= lowStockThreshold;
                return (
                  <tr key={product.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-variant overflow-hidden shrink-0 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-secondary text-sm">inventory_2</span>
                        )}
                      </div>
                      <span className="font-bold text-on-surface">{product.name}</span>
                    </td>
                    <td className="p-4 text-secondary font-mono text-xs">{product.sku}</td>
                    <td className="p-4"><span className="bg-surface-container-high px-2 py-1 rounded text-xs uppercase">{product.category}</span></td>
                    <td className="p-4 text-right">UGX {product.price.toLocaleString()}</td>
                    <td className={`p-4 text-center font-bold ${isLow ? 'text-error' : ''}`}>{product.stock}</td>
                    <td className="p-4 text-center">
                      {isLow ? (
                        <span className="inline-block px-2 py-1 bg-error-container/20 text-error rounded-full text-[10px] font-bold">Low Stock (&le; {lowStockThreshold})</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-tertiary-container/20 text-tertiary rounded-full text-[10px] font-bold">In Stock</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleQuickRestock(product.id, product.stock, 10)}
                        className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-label-caps mr-2"
                        title="Add 10 units"
                      >
                        +10 Restock
                      </button>
                      <button onClick={() => openModal(product)} className="p-1 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                      <button onClick={() => handleDelete(product.id)} className="p-1 text-error hover:text-error/80 transition-colors ml-2"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden my-8">
            <div className="p-6 border-b border-outline/10 flex justify-between items-center">
              <h3 className="font-headline-md text-lg">{editingId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={closeModal} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="w-24 h-24 rounded-xl bg-surface-variant border-2 border-dashed border-outline/30 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                  ) : formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-secondary">add_photo_alternate</span>
                      <span className="text-[10px] text-secondary mt-1 font-label-caps">Upload</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Name</label>
                <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-outline/20 rounded-lg focus:outline-primary bg-surface-container-lowest text-sm" />
              </div>
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">SKU</label>
                <input type="text" value={formData.sku || ''} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border border-outline/20 rounded-lg focus:outline-primary bg-surface-container-lowest text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-xs text-secondary mb-1">Category</label>
                  <select value={formData.category || 'retail'} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-outline/20 rounded-lg focus:outline-primary bg-surface-container-lowest text-sm">
                    <option value="retail">Retail (General)</option>
                    <option value="Hair Care">Hair Care</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Extensions">Extensions</option>
                    <option value="Styling Tools">Styling Tools</option>
                    <option value="backbar">Backbar (Salon Use)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-caps text-xs text-secondary mb-1">Stock</label>
                  <input type="number" value={formData.stock === undefined ? '' : formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline/20 rounded-lg focus:outline-primary bg-surface-container-lowest text-sm" />
                </div>
              </div>
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Price</label>
                <input type="number" value={formData.price === undefined ? '' : formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline/20 rounded-lg focus:outline-primary bg-surface-container-lowest text-sm" />
              </div>
            </div>
            <div className="p-6 border-t border-outline/10 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 font-label-caps text-xs text-secondary hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={uploadingImage} className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {editingId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
