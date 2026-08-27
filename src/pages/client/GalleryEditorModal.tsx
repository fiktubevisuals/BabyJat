import React, { useState, useRef } from 'react';
import { compressImageToBase64 } from '../../utils/imageUtils';

export function GalleryEditorModal({ data, onSave, onClose }: any) {
  const [formData, setFormData] = useState(data || {
    title: '',
    stylist: '',
    tag: '',
    imageUrl: '',
    size: 'normal' // 'normal', 'tall' (row-span-2), 'wide' (col-span-2)
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const base64Str = await compressImageToBase64(file, 1000, 1000, 0.7);
      setFormData((prev: any) => ({ ...prev, imageUrl: base64Str }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = () => {
    if (!formData.imageUrl || !formData.title) {
      alert("Please provide an image and title.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-outline/10 flex justify-between items-center sticky top-0 bg-surface z-10">
          <h3 className="font-headline-md text-lg">{data ? 'Edit Look' : 'Add New Look'}</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex flex-col items-center justify-center">
            <div 
              className="w-full aspect-square md:aspect-[3/4] rounded-xl bg-surface-variant border-2 border-dashed border-outline/30 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? (
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
              ) : formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-secondary">add_photo_alternate</span>
                  <span className="text-sm text-secondary mt-1 font-label-caps">Upload Image</span>
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
            <label className="block font-label-caps text-xs text-secondary mb-1">Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
            />
          </div>
          <div>
            <label className="block font-label-caps text-xs text-secondary mb-1">Stylist / Colorist</label>
            <input 
              type="text" 
              value={formData.stylist} 
              onChange={(e) => setFormData({...formData, stylist: e.target.value})}
              className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
            />
          </div>
          <div>
            <label className="block font-label-caps text-xs text-secondary mb-1">Tag (e.g., Signature, Trending)</label>
            <input 
              type="text" 
              value={formData.tag} 
              onChange={(e) => setFormData({...formData, tag: e.target.value})}
              className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
            />
          </div>
          <div>
            <label className="block font-label-caps text-xs text-secondary mb-1">Display Size</label>
            <select 
              value={formData.size} 
              onChange={(e) => setFormData({...formData, size: e.target.value})}
              className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest"
            >
              <option value="normal">Normal (Square-ish)</option>
              <option value="tall">Tall (Vertical Featured)</option>
              <option value="wide">Wide (Horizontal Featured)</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-outline/10 flex justify-end gap-3 sticky bottom-0 bg-surface z-10">
          <button onClick={onClose} className="px-4 py-2 font-label-caps text-xs text-secondary hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded-lg hover:opacity-90 transition-opacity">
            Save Look
          </button>
        </div>
      </div>
    </div>
  );
}
