import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  createdAt?: any;
}

export default function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'services'), orderBy('category'), orderBy('name')), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openModal = (service?: Service) => {
    if (service) {
      setEditingId(service.id);
      setFormData(service);
    } else {
      setEditingId(null);
      setFormData({ category: 'Hair', durationMinutes: 60, price: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category || formData.price === undefined || !formData.durationMinutes) {
      alert('Please fill out all fields');
      return;
    }

    const id = editingId || Math.random().toString(36).substring(2, 15);
    const docRef = doc(db, 'services', id);
    
    const payload: any = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      durationMinutes: Number(formData.durationMinutes),
      updatedAt: serverTimestamp()
    };

    if (!editingId) {
      payload.createdAt = serverTimestamp();
    } else {
      const existing = services.find(s => s.id === id);
      payload.createdAt = existing?.createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload);
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this service?')) {
      await deleteDoc(doc(db, 'services', id));
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-md text-headline-md">Service Menu</h2>
          <p className="text-secondary text-sm">Manage salon services and pricing</p>
        </div>
        <button onClick={() => openModal()} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-xs">
          + Add Service
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low border-b border-outline/10 text-xs font-label-caps text-secondary">
            <tr>
              <th className="p-4 font-normal">Service Name</th>
              <th className="p-4 font-normal">Category</th>
              <th className="p-4 font-normal">Duration</th>
              <th className="p-4 font-normal text-right">Price</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/5 text-sm">
            {services.map(s => (
              <tr key={s.id} className="hover:bg-surface-container-lowest/50">
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4"><span className="bg-surface-variant px-2 py-1 rounded text-xs">{s.category}</span></td>
                <td className="p-4 text-secondary">{s.durationMinutes} mins</td>
                <td className="p-4 text-right">UGX {s.price.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button onClick={() => openModal(s)} className="p-2 text-primary hover:bg-surface-variant rounded-full"><span className="material-symbols-outlined text-sm">edit</span></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-error hover:bg-error-container/20 rounded-full ml-1"><span className="material-symbols-outlined text-sm">delete</span></button>
                </td>
              </tr>
            ))}
            {services.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-secondary">No services added yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-headline-md mb-4">{editingId ? 'Edit Service' : 'New Service'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Name</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Category</label>
                <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Hair, Color, Nails" className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Price (UGX)</label>
                  <input type="number" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Duration (mins)</label>
                  <input type="number" step="15" value={formData.durationMinutes || ''} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
              <button onClick={closeModal} className="px-4 py-2 text-secondary text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-on-primary rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
