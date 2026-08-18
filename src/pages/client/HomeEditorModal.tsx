import { useState, useRef } from 'react';
import { compressImageToBase64 } from '../../utils/imageUtils';

export function HomeEditorModal({ data, onSave, onClose }: any) {
  const [formData, setFormData] = useState(data);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadKey, setCurrentUploadKey] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadKey) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setUploadingImage(currentUploadKey);
    try {
      const base64Str = await compressImageToBase64(file, 800, 800, 0.7);
      
      setFormData((prev: any) => {
        const newData = { ...prev };
        const keys = currentUploadKey.split('.');
        if (keys.length === 2) {
           newData[keys[0]][keys[1]] = base64Str;
        }
        return newData;
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to process image.");
    } finally {
      setUploadingImage(null);
      setCurrentUploadKey(null);
    }
  };

  const triggerUpload = (key: string) => {
    setCurrentUploadKey(key);
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-outline/10 flex justify-between items-center sticky top-0 bg-surface z-10">
          <h3 className="font-headline-md text-lg">Edit Homepage Content</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          {/* Hero Main */}
          <section className="space-y-4">
            <h4 className="font-bold text-primary border-b border-outline/10 pb-2">Hero Main</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.heroMain?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroMain: {...formData.heroMain, title: e.target.value}})}
                  className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
                />
              </div>
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Subtitle</label>
                <input 
                  type="text" 
                  value={formData.heroMain?.subtitle || ''} 
                  onChange={(e) => setFormData({...formData, heroMain: {...formData.heroMain, subtitle: e.target.value}})}
                  className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-label-caps text-xs text-secondary mb-1">Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded bg-surface-variant overflow-hidden shrink-0">
                    {uploadingImage === 'heroMain.imageUrl' ? (
                       <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined animate-spin">sync</span></div>
                    ) : (
                       <img src={formData.heroMain?.imageUrl} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button onClick={() => triggerUpload('heroMain.imageUrl')} className="px-3 py-1 bg-surface-container border border-outline/20 rounded text-sm hover:bg-surface-variant transition-colors">
                    Change Image
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Hero Secondary 1 */}
          <section className="space-y-4">
            <h4 className="font-bold text-primary border-b border-outline/10 pb-2">Promo Card (Left)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.heroSecondary1?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary1: {...formData.heroSecondary1, title: e.target.value}})}
                  className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
                />
              </div>
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Subtitle</label>
                <input 
                  type="text" 
                  value={formData.heroSecondary1?.subtitle || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary1: {...formData.heroSecondary1, subtitle: e.target.value}})}
                  className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
                />
              </div>
            </div>
          </section>

          {/* Hero Secondary 2 */}
          <section className="space-y-4">
            <h4 className="font-bold text-primary border-b border-outline/10 pb-2">Accessory Highlight (Right)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-xs text-secondary mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.heroSecondary2?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary2: {...formData.heroSecondary2, title: e.target.value}})}
                  className="w-full px-3 py-2 border border-outline/20 rounded-lg text-sm bg-surface-container-lowest" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-label-caps text-xs text-secondary mb-1">Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded bg-surface-variant overflow-hidden shrink-0">
                    {uploadingImage === 'heroSecondary2.imageUrl' ? (
                       <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined animate-spin">sync</span></div>
                    ) : (
                       <img src={formData.heroSecondary2?.imageUrl} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button onClick={() => triggerUpload('heroSecondary2.imageUrl')} className="px-3 py-1 bg-surface-container border border-outline/20 rounded text-sm hover:bg-surface-variant transition-colors">
                    Change Image
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        <div className="p-6 border-t border-outline/10 flex justify-end gap-3 sticky bottom-0 bg-surface z-10">
          <button onClick={onClose} className="px-4 py-2 font-label-caps text-xs text-secondary hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded-lg hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
