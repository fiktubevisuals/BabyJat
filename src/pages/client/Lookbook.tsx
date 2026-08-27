import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { GalleryEditorModal } from './GalleryEditorModal';
import { SEOHead } from '../../components/SEOHead';

export interface GalleryItem {
  id: string;
  title: string;
  stylist: string;
  tag: string;
  imageUrl: string;
  size: 'normal' | 'tall' | 'wide';
  createdAt?: any;
}

export default function Lookbook() {
  const { profile } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: GalleryItem[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as GalleryItem);
      });
      setItems(fetched);
    }, (err) => console.warn("Lookbook snapshot error:", err));
    return () => unsub();
  }, []);

  const openEditor = (item?: GalleryItem) => {
    setEditingItem(item || null);
    setIsEditing(true);
  };

  const handleSave = async (data: any) => {
    try {
      const id = editingItem ? editingItem.id : Math.random().toString(36).substring(2, 15);
      const docRef = doc(db, 'gallery', id);
      
      const payload = {
        ...data,
        createdAt: editingItem?.createdAt || serverTimestamp()
      };
      
      await setDoc(docRef, payload);
      setIsEditing(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to save gallery item", error);
      alert("Failed to save. Make sure you are an Admin.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this look?")) {
      await deleteDoc(doc(db, 'gallery', id));
    }
  };

  return (
    <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full pt-8 md:pt-12 relative">
      <SEOHead pageKey="lookbook" />
      {profile?.role === 'admin' && (
        <button 
          onClick={() => openEditor()}
          className="fixed bottom-24 right-4 md:right-8 z-40 bg-primary text-on-primary px-4 py-3 rounded-full shadow-xl font-label-caps flex items-center gap-2 hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Look
        </button>
      )}

      {isEditing && (
        <GalleryEditorModal 
          data={editingItem} 
          onSave={handleSave} 
          onClose={() => {
            setIsEditing(false);
            setEditingItem(null);
          }} 
        />
      )}

      {/* Filter Chips */}
      <div className="flex overflow-x-auto no-scrollbar gap-stack-sm mb-stack-lg pb-2 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        <button className="shrink-0 bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-widest hover:bg-surface-tint transition-colors">All Styles</button>
        <button className="shrink-0 bg-surface-container-highest text-on-background font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-widest hover:bg-secondary-container transition-colors">Color & Balayage</button>
        <button className="shrink-0 bg-surface-container-highest text-on-background font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-widest hover:bg-secondary-container transition-colors">Signature Cuts</button>
        <button className="shrink-0 bg-surface-container-highest text-on-background font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-widest hover:bg-secondary-container transition-colors">Bridal & Events</button>
        <button className="shrink-0 bg-surface-container-highest text-on-background font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-widest hover:bg-secondary-container transition-colors">Extensions</button>
      </div>

      {/* Lookbook Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-secondary">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">imagesmode</span>
          <p>No looks have been added yet.</p>
          {profile?.role === 'admin' && <p className="text-sm mt-2">Click "Add New Look" to start building your gallery.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {items.map(item => {
            const aspectClass = item.size === 'tall' ? 'aspect-[3/4]' : item.size === 'wide' ? 'aspect-[21/9]' : 'aspect-square';
            const spanClass = item.size === 'tall' ? 'row-span-2' : item.size === 'wide' ? 'lg:col-span-2' : '';
            
            return (
              <div key={item.id} className={`group relative overflow-hidden rounded-lg bg-surface-container-low cursor-pointer block ${spanClass}`}>
                <div className={`${aspectClass} w-full overflow-hidden`}>
                  <img className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" src={item.imageUrl} alt={item.title} />
                </div>
                
                <div className="absolute inset-0 bg-background/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-stack-md border-[0.5px] border-on-primary/20">
                  <div className="bg-surface/90 backdrop-blur-md p-stack-sm rounded-md translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {item.tag && <span className="inline-block bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-2 py-1 rounded mb-2 uppercase">{item.tag}</span>}
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{item.title}</h3>
                    <p className="font-body-md text-body-md text-secondary mb-4">{item.stylist}</p>
                    <Link to="/services" className="w-full inline-block text-center bg-primary text-on-primary font-label-caps text-label-caps py-3 px-4 uppercase tracking-widest hover:bg-surface-tint transition-colors">Book This Look</Link>
                  </div>
                </div>

                {profile?.role === 'admin' && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditor(item); }}
                      className="w-10 h-10 rounded-full bg-surface shadow flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="w-10 h-10 rounded-full bg-surface shadow flex items-center justify-center text-error hover:bg-error hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
