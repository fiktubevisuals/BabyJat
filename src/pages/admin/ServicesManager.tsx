import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { compressImageToBase64 } from '../../utils/imageUtils';
import { HAIRSTYLE_CATALOG, HairstyleOption } from '../../components/AITryOn';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt?: any;
}

interface TransformationItem {
  id: string;
  client: string;
  service: string;
  before: string;
  after: string;
  createdAt?: any;
}

export default function ServicesManager() {
  const [activeTab, setActiveTab] = useState<'services' | 'transformations' | 'hairstyles'>('services');

  // Services State
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transformations State
  const [transformations, setTransformations] = useState<TransformationItem[]>([]);
  const [loadingTransformations, setLoadingTransformations] = useState(true);
  const [editingTransformId, setEditingTransformId] = useState<string | null>(null);
  const [transformFormData, setTransformFormData] = useState<Partial<TransformationItem>>({});
  const [isTransformModalOpen, setIsTransformModalOpen] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  // AI Try-On Hairstyles State
  const [hairstyles, setHairstyles] = useState<HairstyleOption[]>([]);
  const [loadingHairstyles, setLoadingHairstyles] = useState(true);
  const [editingHairstyleId, setEditingHairstyleId] = useState<string | null>(null);
  const [hairstyleFormData, setHairstyleFormData] = useState<Partial<HairstyleOption>>({});
  const [isHairstyleModalOpen, setIsHairstyleModalOpen] = useState(false);

  // Subscribe to Services
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'services'), orderBy('category'), orderBy('name')), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
      setLoadingServices(false);
    }, (err) => {
      console.warn("Services snapshot ended:", err);
      setLoadingServices(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to Transformations
  useEffect(() => {
    const q = query(collection(db, 'transformations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransformations(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransformationItem)));
      setLoadingTransformations(false);
    }, (err) => {
      console.warn("Transformations snapshot ended:", err);
      setLoadingTransformations(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to Hairstyles
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hairstyles'), (snap) => {
      if (!snap.empty) {
        setHairstyles(snap.docs.map(d => ({ id: d.id, ...d.data() } as HairstyleOption)));
      } else {
        setHairstyles([]);
      }
      setLoadingHairstyles(false);
    }, (err) => {
      console.warn("Hairstyles snapshot ended:", err);
      setLoadingHairstyles(false);
    });
    return () => unsub();
  }, []);

  // Hairstyle Handlers
  const openHairstyleModal = (item?: HairstyleOption) => {
    if (item) {
      setEditingHairstyleId(item.id);
      setHairstyleFormData(item);
    } else {
      setEditingHairstyleId(null);
      setHairstyleFormData({
        name: '',
        category: 'Braids & Locs',
        description: '',
        estimatedTime: '2.5 Hours',
        servicePrice: 'UGX 200,000',
        iconSymbol: 'auto_awesome',
        overlayStyle: 'braids'
      });
    }
    setIsHairstyleModalOpen(true);
  };

  const closeHairstyleModal = () => {
    setIsHairstyleModalOpen(false);
    setEditingHairstyleId(null);
    setHairstyleFormData({});
  };

  const handleSaveHairstyle = async () => {
    if (!hairstyleFormData.name || !hairstyleFormData.category || !hairstyleFormData.servicePrice || !hairstyleFormData.estimatedTime) {
      alert('Please fill out the style name, category, price, and estimated duration.');
      return;
    }

    const id = editingHairstyleId || hairstyleFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36);
    const docRef = doc(db, 'hairstyles', id);

    const payload: any = {
      name: hairstyleFormData.name,
      category: hairstyleFormData.category,
      description: hairstyleFormData.description || '',
      estimatedTime: hairstyleFormData.estimatedTime,
      servicePrice: hairstyleFormData.servicePrice.startsWith('UGX') ? hairstyleFormData.servicePrice : `UGX ${hairstyleFormData.servicePrice}`,
      iconSymbol: hairstyleFormData.iconSymbol || 'auto_awesome',
      overlayStyle: hairstyleFormData.overlayStyle || 'braids',
      updatedAt: serverTimestamp()
    };

    if (!editingHairstyleId) {
      payload.createdAt = serverTimestamp();
    } else {
      const existing = hairstyles.find(h => h.id === id);
      payload.createdAt = existing?.createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload);
    closeHairstyleModal();
  };

  const handleDeleteHairstyle = async (id: string) => {
    if (window.confirm('Delete this hairstyle option from AI Try-On?')) {
      await deleteDoc(doc(db, 'hairstyles', id));
    }
  };

  const handleSeedDefaultHairstyles = async () => {
    if (!window.confirm("Seed default hairstyles into Firestore database? This will populate 8 signature hairstyles for AI Try-On.")) return;
    try {
      for (const style of HAIRSTYLE_CATALOG) {
        const docRef = doc(db, 'hairstyles', style.id);
        await setDoc(docRef, {
          ...style,
          createdAt: serverTimestamp()
        });
      }
      alert("Successfully seeded default hairstyles into database!");
    } catch (err) {
      console.error("Error seeding hairstyles:", err);
      alert("Failed to seed default hairstyles.");
    }
  };

  // Service Modal Handlers
  const openModal = (service?: Service) => {
    if (service) {
      setEditingId(service.id);
      setFormData(service);
    } else {
      setEditingId(null);
      setFormData({ category: 'Hair', durationMinutes: 60, price: 0, description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter large files
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < files.length) {
      alert("Some images were too large and skipped. Please select images under 10MB.");
    }
    if (validFiles.length === 0) return;

    setUploadingImage(true);
    try {
      const newImages = await Promise.all(
        validFiles.map(file => compressImageToBase64(file, 800, 600, 0.7))
      );
      setFormData(prev => {
        const existingImages = prev.imageUrls || (prev.imageUrl ? [prev.imageUrl] : []);
        return {
          ...prev,
          imageUrls: [...existingImages, ...newImages],
          imageUrl: existingImages.length > 0 ? existingImages[0] : newImages[0] // maintain backward compat
        };
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeServiceImage = (index: number) => {
    setFormData(prev => {
      const existing = prev.imageUrls || (prev.imageUrl ? [prev.imageUrl] : []);
      const updated = existing.filter((_, i) => i !== index);
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated.length > 0 ? updated[0] : ''
      };
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category || formData.price === undefined || !formData.durationMinutes) {
      alert('Please fill out all required fields');
      return;
    }

    const id = editingId || Math.random().toString(36).substring(2, 15);
    const docRef = doc(db, 'services', id);
    
    const payload: any = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      durationMinutes: Number(formData.durationMinutes),
      description: formData.description || '',
      imageUrl: formData.imageUrl || '',
      imageUrls: formData.imageUrls || (formData.imageUrl ? [formData.imageUrl] : []),
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

  // Transformation Modal Handlers
  const openTransformModal = (item?: TransformationItem) => {
    if (item) {
      setEditingTransformId(item.id);
      setTransformFormData(item);
    } else {
      setEditingTransformId(null);
      setTransformFormData({
        client: '',
        service: services[0]?.name || 'Signature Hair Transformation',
        before: '',
        after: ''
      });
    }
    setIsTransformModalOpen(true);
  };

  const closeTransformModal = () => {
    setIsTransformModalOpen(false);
    setEditingTransformId(null);
    setTransformFormData({});
  };

  const handleBeforeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setUploadingBefore(true);
    try {
      const base64Str = await compressImageToBase64(file, 800, 800, 0.75);
      setTransformFormData(prev => ({ ...prev, before: base64Str }));
    } catch (error) {
      console.error("Error uploading before image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingBefore(false);
    }
  };

  const handleAfterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setUploadingAfter(true);
    try {
      const base64Str = await compressImageToBase64(file, 800, 800, 0.75);
      setTransformFormData(prev => ({ ...prev, after: base64Str }));
    } catch (error) {
      console.error("Error uploading after image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingAfter(false);
    }
  };

  const handleSaveTransformation = async () => {
    if (!transformFormData.client || !transformFormData.service) {
      alert('Please fill out the client name and service description');
      return;
    }

    if (!transformFormData.before || !transformFormData.after) {
      alert('Please upload both Before and After images');
      return;
    }

    const id = editingTransformId || Math.random().toString(36).substring(2, 15);
    const docRef = doc(db, 'transformations', id);

    const payload: any = {
      client: transformFormData.client,
      service: transformFormData.service,
      before: transformFormData.before,
      after: transformFormData.after,
      updatedAt: serverTimestamp()
    };

    if (!editingTransformId) {
      payload.createdAt = serverTimestamp();
    } else {
      const existing = transformations.find(t => t.id === id);
      payload.createdAt = existing?.createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload);
    closeTransformModal();
  };

  const handleDeleteTransformation = async (id: string) => {
    if (window.confirm('Delete this Before & After transformation?')) {
      await deleteDoc(doc(db, 'transformations', id));
    }
  };

  if (loadingServices && loadingTransformations) return <div className="p-8 font-label-caps text-secondary">Loading Service Menu...</div>;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-5xl mx-auto pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md">Service Menu &amp; Showcase</h2>
          <p className="text-secondary text-sm">Manage salon services, pricing, AI Try-On hairstyles catalog, and Before &amp; After client transformations</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'services' && (
            <button onClick={() => openModal()} className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-caps text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90">
              <span className="material-symbols-outlined text-sm">add</span> Add Service
            </button>
          )}
          {activeTab === 'transformations' && (
            <button onClick={() => openTransformModal()} className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-caps text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90">
              <span className="material-symbols-outlined text-sm">add_photo_alternate</span> Add Transformation
            </button>
          )}
          {activeTab === 'hairstyles' && (
            <div className="flex items-center gap-2">
              {hairstyles.length === 0 && (
                <button onClick={handleSeedDefaultHairstyles} className="bg-surface-container-high text-on-surface border border-outline/20 px-3.5 py-2 rounded-lg font-label-caps text-xs flex items-center gap-1.5 hover:bg-surface-container">
                  <span className="material-symbols-outlined text-sm">download</span> Seed Default Catalog
                </button>
              )}
              <button onClick={() => openHairstyleModal()} className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-caps text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90">
                <span className="material-symbols-outlined text-sm">content_cut</span> Add Hairstyle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline/10 mb-8 gap-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 font-label-caps text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          Services Catalog ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('hairstyles')}
          className={`pb-3 font-label-caps text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'hairstyles'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">auto_fix_high</span>
          AI Try-On Hairstyles ({hairstyles.length > 0 ? hairstyles.length : 'Default 8'})
        </button>
        <button
          onClick={() => setActiveTab('transformations')}
          className={`pb-3 font-label-caps text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'transformations'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Before &amp; After Showcase ({transformations.length})
        </button>
      </div>

      {/* TAB 1: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline/10 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low border-b border-outline/10 text-xs font-label-caps text-secondary">
              <tr>
                <th className="p-4 font-normal">Service</th>
                <th className="p-4 font-normal">Category</th>
                <th className="p-4 font-normal">Duration</th>
                <th className="p-4 font-normal text-right">Price</th>
                <th className="p-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/5 text-sm">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-variant overflow-hidden shrink-0 flex items-center justify-center border border-outline/10">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-secondary text-sm">spa</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-[10px] text-secondary truncate max-w-[200px]">{s.description}</div>}
                    </div>
                  </td>
                  <td className="p-4"><span className="bg-surface-variant px-2.5 py-1 rounded-md text-xs font-label-caps">{s.category}</span></td>
                  <td className="p-4 text-secondary">{s.durationMinutes} mins</td>
                  <td className="p-4 text-right font-medium">UGX {s.price.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => openModal(s)} className="p-2 text-primary hover:bg-surface-variant rounded-full"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-error hover:bg-error-container/20 rounded-full ml-1"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-secondary">No services added yet. Click "Add Service" to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: BEFORE & AFTER TRANSFORMATIONS */}
      {activeTab === 'transformations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-xl border border-outline/10">
            <p className="text-xs text-secondary font-label-caps">
              Featured transformations appear directly in the interactive carousel on the client <strong>Services</strong> page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transformations.map((item) => (
              <div key={item.id} className="bg-surface-container-lowest rounded-xl border border-outline/10 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="grid grid-cols-2 h-44 border-b border-outline/10 relative">
                    <div className="relative border-r border-outline/10 overflow-hidden bg-surface-variant">
                      <img src={item.before} alt="Before" className="w-full h-full object-cover grayscale-[20%]" />
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-label-caps px-2 py-0.5 rounded-full">Before</span>
                    </div>
                    <div className="relative overflow-hidden bg-surface-variant">
                      <img src={item.after} alt="After" className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 bg-primary text-on-primary text-[10px] font-label-caps px-2 py-0.5 rounded-full">After</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-headline-md text-base font-semibold">{item.client}</h3>
                    <p className="text-xs text-secondary mt-0.5">{item.service}</p>
                  </div>
                </div>
                <div className="p-4 pt-0 flex justify-end gap-2 border-t border-outline/5 mt-2">
                  <button onClick={() => openTransformModal(item)} className="px-3 py-1.5 text-xs text-primary bg-surface-variant hover:bg-primary/10 rounded-lg flex items-center gap-1 font-label-caps">
                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                  </button>
                  <button onClick={() => handleDeleteTransformation(item.id)} className="px-3 py-1.5 text-xs text-error bg-error-container/10 hover:bg-error-container/20 rounded-lg flex items-center gap-1 font-label-caps">
                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                  </button>
                </div>
              </div>
            ))}

            {transformations.length === 0 && (
              <div className="col-span-full bg-surface-container-lowest p-12 text-center rounded-xl border border-outline/10 space-y-3">
                <span className="material-symbols-outlined text-4xl text-secondary">auto_awesome</span>
                <p className="text-sm text-secondary font-label-caps">No custom Before &amp; After transformations uploaded yet.</p>
                <button onClick={() => openTransformModal()} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-xs">
                  Add First Transformation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI TRY-ON HAIRSTYLES CATALOG */}
      {activeTab === 'hairstyles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container-low p-4 rounded-xl border border-outline/10 gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">auto_fix_high</span>
              <p className="text-xs text-secondary font-label-caps">
                Hairstyles configured here appear in real-time in the client <strong>AI Try-On Studio</strong> with actual prices &amp; estimated hours.
              </p>
            </div>
            {hairstyles.length === 0 && (
              <button
                onClick={handleSeedDefaultHairstyles}
                className="px-3.5 py-1.5 bg-primary text-on-primary text-xs font-label-caps rounded-lg shadow-sm hover:opacity-90 flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Seed Default 8 Hairstyles
              </button>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline/10 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline/10 text-xs font-label-caps text-secondary">
                <tr>
                  <th className="p-4 font-normal">Hairstyle</th>
                  <th className="p-4 font-normal">Category</th>
                  <th className="p-4 font-normal">Duration / Hours</th>
                  <th className="p-4 font-normal text-right">Actual Price</th>
                  <th className="p-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/5 text-sm">
                {(hairstyles.length > 0 ? hairstyles : HAIRSTYLE_CATALOG).map((h) => (
                  <tr key={h.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <span className="material-symbols-outlined text-lg">{h.iconSymbol || 'content_cut'}</span>
                      </div>
                      <div>
                        <div className="font-bold text-on-surface">{h.name}</div>
                        <div className="text-[11px] text-secondary line-clamp-1 max-w-[260px]">{h.description}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-surface-variant px-2.5 py-1 rounded-full text-xs font-label-caps text-on-surface">
                        {h.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-secondary">
                      <span className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-1 rounded-md text-xs">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {h.estimatedTime}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-primary font-mono text-xs">
                      {h.servicePrice}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openHairstyleModal(h)}
                        className="p-2 text-primary hover:bg-surface-variant rounded-full"
                        title="Edit Hairstyle"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteHairstyle(h.id)}
                        className="p-2 text-error hover:bg-error-container/20 rounded-full ml-1"
                        title="Delete Hairstyle"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-md text-lg">{editingId ? 'Edit Service' : 'New Service'}</h3>
              <button onClick={closeModal} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-4">
              {/* Image Upload Area */}
              <div className="flex flex-col">
                <label className="block text-xs font-label-caps text-secondary mb-2">Service Images</label>
                <div className="flex gap-2 overflow-x-auto pb-2 items-center">
                  {(formData.imageUrls || (formData.imageUrl ? [formData.imageUrl] : [])).map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl bg-surface-variant border border-outline/20 overflow-hidden group">
                      <img src={img} alt="Service Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeServiceImage(idx)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                  
                  <div 
                    className="w-24 h-24 shrink-0 rounded-xl bg-surface-variant border-2 border-dashed border-outline/30 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-secondary">add_photo_alternate</span>
                        <span className="text-[10px] text-secondary mt-1 font-label-caps text-center">Add<br/>Photo</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              </div>

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
                  <input type="number" value={formData.price === undefined ? '' : formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Duration (mins)</label>
                  <input type="number" step="15" value={formData.durationMinutes || ''} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Short Description</label>
                <textarea rows={2} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border border-outline/20 rounded bg-surface text-sm" placeholder="Brief details about the service" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
              <button onClick={closeModal} className="px-4 py-2 text-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={uploadingImage} className="px-4 py-2 bg-primary text-on-primary rounded text-sm disabled:opacity-50 font-label-caps text-xs">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFORMATION MODAL */}
      {isTransformModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex justify-between items-center mb-4 border-b border-outline/10 pb-3">
              <h3 className="font-headline-md text-lg">{editingTransformId ? 'Edit Transformation' : 'New Before & After Transformation'}</h3>
              <button onClick={closeTransformModal} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* BEFORE IMAGE UPLOAD */}
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1.5">1. Before Image</label>
                  <div 
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="h-40 rounded-xl bg-surface-variant border-2 border-dashed border-outline/30 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploadingBefore ? (
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    ) : transformFormData.before ? (
                      <img src={transformFormData.before} alt="Before preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <span className="material-symbols-outlined text-secondary text-2xl">cloud_upload</span>
                        <span className="block text-[11px] text-secondary mt-1 font-label-caps">Upload Before Photo</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={beforeFileInputRef}
                    onChange={handleBeforeUpload}
                  />
                </div>

                {/* AFTER IMAGE UPLOAD */}
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1.5">2. After Image</label>
                  <div 
                    onClick={() => afterFileInputRef.current?.click()}
                    className="h-40 rounded-xl bg-surface-variant border-2 border-dashed border-outline/30 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploadingAfter ? (
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    ) : transformFormData.after ? (
                      <img src={transformFormData.after} alt="After preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <span className="material-symbols-outlined text-secondary text-2xl">cloud_upload</span>
                        <span className="block text-[11px] text-secondary mt-1 font-label-caps">Upload After Photo</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={afterFileInputRef}
                    onChange={handleAfterUpload}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Client Name / Identifier</label>
                <input 
                  type="text" 
                  value={transformFormData.client || ''} 
                  onChange={e => setTransformFormData({...transformFormData, client: e.target.value})} 
                  placeholder="e.g. Sarah M." 
                  className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50" 
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Service &amp; Styling Details</label>
                <input 
                  type="text" 
                  value={transformFormData.service || ''} 
                  onChange={e => setTransformFormData({...transformFormData, service: e.target.value})} 
                  placeholder="e.g. Full Balayage & Styling" 
                  className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
              <button onClick={closeTransformModal} className="px-4 py-2 text-secondary text-sm">Cancel</button>
              <button 
                onClick={handleSaveTransformation} 
                disabled={uploadingBefore || uploadingAfter} 
                className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-label-caps disabled:opacity-50 shadow-md"
              >
                Save Transformation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HAIRSTYLE MODAL FOR AI TRY-ON */}
      {isHairstyleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8 border border-outline/10">
            <div className="flex justify-between items-center mb-4 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">auto_fix_high</span>
                <h3 className="font-headline-md text-lg">{editingHairstyleId ? 'Edit AI Hairstyle' : 'New AI Hairstyle Option'}</h3>
              </div>
              <button onClick={closeHairstyleModal} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Hairstyle Name *</label>
                <input
                  type="text"
                  value={hairstyleFormData.name || ''}
                  onChange={e => setHairstyleFormData({ ...hairstyleFormData, name: e.target.value })}
                  placeholder="e.g. Knotless Goddess Braids"
                  className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Category *</label>
                  <select
                    value={hairstyleFormData.category || 'Braids & Locs'}
                    onChange={e => setHairstyleFormData({ ...hairstyleFormData, category: e.target.value as any })}
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm"
                  >
                    <option value="Braids & Locs">Braids & Locs</option>
                    <option value="Short & Bob">Short & Bob</option>
                    <option value="Long & Waves">Long & Waves</option>
                    <option value="Curly & Afro">Curly & Afro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Overlay Visual Style</label>
                  <select
                    value={hairstyleFormData.overlayStyle || 'braids'}
                    onChange={e => setHairstyleFormData({ ...hairstyleFormData, overlayStyle: e.target.value as any })}
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm"
                  >
                    <option value="braids">Braids</option>
                    <option value="bob">Bob Cut</option>
                    <option value="afro">Afro Curls</option>
                    <option value="waves">Hollywood Waves</option>
                    <option value="pixie">Pixie Cut</option>
                    <option value="straight">Straight Press</option>
                    <option value="locs">Locs Updo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Actual Price (UGX) *</label>
                  <input
                    type="text"
                    value={hairstyleFormData.servicePrice || ''}
                    onChange={e => setHairstyleFormData({ ...hairstyleFormData, servicePrice: e.target.value })}
                    placeholder="e.g. UGX 250,000"
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Estimated Time / Hours *</label>
                  <input
                    type="text"
                    value={hairstyleFormData.estimatedTime || ''}
                    onChange={e => setHairstyleFormData({ ...hairstyleFormData, estimatedTime: e.target.value })}
                    placeholder="e.g. 3.5 Hours"
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Icon Symbol</label>
                  <select
                    value={hairstyleFormData.iconSymbol || 'auto_awesome'}
                    onChange={e => setHairstyleFormData({ ...hairstyleFormData, iconSymbol: e.target.value })}
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm"
                  >
                    <option value="grid_view">Grid (Braids)</option>
                    <option value="content_cut">Scissors (Bob/Cut)</option>
                    <option value="blur_on">Blur Curls (Afro)</option>
                    <option value="waves">Waves (Straight/Waves)</option>
                    <option value="water_drop">Glamour Drops</option>
                    <option value="auto_awesome">Stars / Pixie</option>
                    <option value="cyclone">Cyclone (Locs)</option>
                    <option value="view_headline">Cornrows</option>
                  </select>
                </div>
                <div className="flex items-center justify-center pt-5">
                  <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-xl text-xs text-secondary border border-outline/10">
                    <span className="material-symbols-outlined text-primary">{hairstyleFormData.iconSymbol || 'auto_awesome'}</span>
                    <span>Icon Preview</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={hairstyleFormData.description || ''}
                  onChange={e => setHairstyleFormData({ ...hairstyleFormData, description: e.target.value })}
                  placeholder="Brief description of the hairstyle look and technique..."
                  className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
              <button onClick={closeHairstyleModal} className="px-4 py-2 text-secondary text-sm font-label-caps">Cancel</button>
              <button
                onClick={handleSaveHairstyle}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-label-caps font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                Save Hairstyle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

