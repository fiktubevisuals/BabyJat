import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { compressImageToBase64 } from '../../utils/imageUtils';
import { defaultSEOSettings, SEOSettings, SEOMetaConfig } from '../../components/SEOHead';

const defaultHomepageData = {
  heroMain: {
    title: "The Glossy\nBlowout",
    subtitle: "Signature Style",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwu7vmNcvbbGwf71WM58T0wuiDK2g9Gc7BBJEF96AVLtfM_Tn1JM_7w-9Y2qFSW_Ixs5BGsMXBMmCCQyBe6x3zZlK91arhgLirfhLggndtKbXy9du-Tx_ZqswIVPb5Mpn5TcrZF59uFrEF3IZXYtcX1NaFuJeGF6pOHwubNbPYFp-gZtrGG_EY0SCqevMTM7-52mz9rpzXd-n0z5c5fF5K0zp9Ufw7BbX2FWat-czikkslfd7oM1r_Cw"
  },
  heroSecondary1: {
    title: "Summer Glow\nPackage",
    subtitle: "Complete color & treatment"
  },
  heroSecondary2: {
    title: "Shop New Arrivals",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-R9mnzNsY5u6p6O6IulVwyohOeqhYyQG4jfACo_P3oPihh7f_u_W4M3gO8CmEQhygkt2_PUFMsiuJVObcI1MnRQnz209dk2tQ9xZS5uHDLSxRd7SBr1TzQvm88QwV7FZ1YQsMmf2U5pGO97Nl5OQuMKd__pZmvRwRQZvrFSaGKvPc8H7mn76sHn0kAdcXCwsCxgDGVUtGfLH-okNl8d1p-eghL-dzkOgSa_DpvmzZSxJjjHHCxT0Q6w"
  }
};

interface ItemOption {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState<'homepage' | 'seo'>('seo');
  
  // Homepage State
  const [formData, setFormData] = useState<any>(defaultHomepageData);
  const [loadingContent, setLoadingContent] = useState(true);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadKey, setCurrentUploadKey] = useState<string | null>(null);

  // SEO State
  const [seoData, setSeoData] = useState<SEOSettings>(defaultSEOSettings);
  const [loadingSeo, setLoadingSeo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seoSubTab, setSeoSubTab] = useState<'pages' | 'services' | 'shop'>('pages');

  // Services & Products catalog for SEO overrides
  const [servicesList, setServicesList] = useState<ItemOption[]>([]);
  const [productsList, setProductsList] = useState<ItemOption[]>([]);
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Fetch Homepage & SEO data & Collections
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Homepage doc
        const homeSnap = await getDoc(doc(db, 'content', 'homepage'));
        if (homeSnap.exists()) {
          setFormData({ ...defaultHomepageData, ...homeSnap.data() });
        }

        // Fetch SEO doc
        const seoSnap = await getDoc(doc(db, 'content', 'seo'));
        if (seoSnap.exists()) {
          const loadedSeo = seoSnap.data() as SEOSettings;
          setSeoData({
            ...defaultSEOSettings,
            ...loadedSeo,
            serviceOverrides: { ...defaultSEOSettings.serviceOverrides, ...(loadedSeo.serviceOverrides || {}) },
            shopOverrides: { ...defaultSEOSettings.shopOverrides, ...(loadedSeo.shopOverrides || {}) }
          });
        }

        // Fetch Services catalog for dropdown
        const sSnap = await getDocs(collection(db, 'services'));
        const sList: ItemOption[] = [
          { id: 'copper-muse', name: 'The Copper Muse (Signature Look)', category: 'Lookbook / Color', description: 'Vibrant cascade of rich copper and amber tones.' }
        ];
        sSnap.forEach(d => {
          const data = d.data();
          sList.push({ id: d.id, name: data.name, category: data.category, description: data.description });
        });
        setServicesList(sList);
        if (sList.length > 0) setSelectedServiceId(sList[0].id);

        // Fetch Products catalog for dropdown
        const pSnap = await getDocs(collection(db, 'products'));
        const pList: ItemOption[] = [
          { id: 'lumina-serum', name: 'Lumina Silk Hair Serum (Featured)', category: 'Serum', description: 'Transform dull locks into liquid glass.' }
        ];
        pSnap.forEach(d => {
          const data = d.data();
          if (data.category === 'retail' || !data.category) {
            pList.push({ id: d.id, name: data.name, category: data.category, description: data.description });
          }
        });
        setProductsList(pList);
        if (pList.length > 0) setSelectedProductId(pList[0].id);

      } catch (error) {
        console.error("Error fetching content manager data:", error);
      } finally {
        setLoadingContent(false);
        setLoadingSeo(false);
      }
    };

    fetchData();
  }, []);

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

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save Homepage
      await setDoc(doc(db, 'content', 'homepage'), {
        ...formData,
        updatedAt: serverTimestamp()
      });

      // Save SEO
      await setDoc(doc(db, 'content', 'seo'), {
        ...seoData,
        updatedAt: serverTimestamp()
      });

      alert('All content and SEO meta tags saved successfully!');
    } catch (error) {
      console.error("Error saving content and SEO:", error);
      alert('Failed to save content and SEO settings.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for updating Page level SEO
  const updatePageSeo = (pageKey: 'home' | 'services' | 'shop' | 'lookbook', field: keyof SEOMetaConfig, value: string) => {
    setSeoData(prev => ({
      ...prev,
      [pageKey]: {
        ...defaultSEOSettings[pageKey],
        ...(prev[pageKey] || {}),
        [field]: value
      }
    }));
  };

  // Helper for updating Service override SEO
  const updateServiceSeo = (serviceId: string, field: keyof SEOMetaConfig, value: string) => {
    if (!serviceId) return;
    const selectedSrv = servicesList.find(s => s.id === serviceId);
    const existing = seoData.serviceOverrides?.[serviceId] || {
      title: `${selectedSrv?.name || 'Service'} | BabyJat Salon`,
      description: selectedSrv?.description || `Book ${selectedSrv?.name || 'hair styling'} at BabyJat luxury salon.`,
      keywords: `${selectedSrv?.name || 'hair service'}, salon, Kampala hair styling`
    };

    setSeoData(prev => ({
      ...prev,
      serviceOverrides: {
        ...(prev.serviceOverrides || {}),
        [serviceId]: {
          ...existing,
          [field]: value
        }
      }
    }));
  };

  // Helper for updating Product override SEO
  const updateProductSeo = (productId: string, field: keyof SEOMetaConfig, value: string) => {
    if (!productId) return;
    const selectedProd = productsList.find(p => p.id === productId);
    const existing = seoData.shopOverrides?.[productId] || {
      title: `${selectedProd?.name || 'Product'} | BabyJat Shop`,
      description: selectedProd?.description || `Order ${selectedProd?.name || 'hair care'} online at BabyJat.`,
      keywords: `${selectedProd?.name || 'hair product'}, buy hair care online, beauty accessories`
    };

    setSeoData(prev => ({
      ...prev,
      shopOverrides: {
        ...(prev.shopOverrides || {}),
        [productId]: {
          ...existing,
          [field]: value
        }
      }
    }));
  };

  if (loadingContent || loadingSeo) return <div className="p-8 font-label-caps text-secondary">Loading Content &amp; SEO Manager...</div>;

  // Selected Service SEO state
  const currentServiceItem = servicesList.find(s => s.id === selectedServiceId);
  const currentServiceSeo = seoData.serviceOverrides?.[selectedServiceId] || {
    title: currentServiceItem ? `${currentServiceItem.name} | BabyJat Salon` : '',
    description: currentServiceItem?.description ? `${currentServiceItem.description} Book at BabyJat luxury salon.` : '',
    keywords: currentServiceItem ? `${currentServiceItem.name}, salon services, hair styling` : ''
  };

  // Selected Product SEO state
  const currentProductItem = productsList.find(p => p.id === selectedProductId);
  const currentProductSeo = seoData.shopOverrides?.[selectedProductId] || {
    title: currentProductItem ? `${currentProductItem.name} | BabyJat Shop` : '',
    description: currentProductItem?.description ? `${currentProductItem.description} Order online at BabyJat.` : '',
    keywords: currentProductItem ? `${currentProductItem.name}, hair care, buy online` : ''
  };

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-5xl mx-auto pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md">Content &amp; SEO Manager</h2>
          <p className="text-secondary text-sm">Manage storefront imagery, copywriting, and search engine optimization (SEO) meta tags</p>
        </div>
        <button 
          onClick={handleSaveAll} 
          disabled={saving}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-xs shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-outline/10 mb-8 gap-8">
        <button
          onClick={() => setActiveTab('seo')}
          className={`pb-3 font-label-caps text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'seo'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">search_check</span>
          SEO &amp; Meta Tags Manager
        </button>
        <button
          onClick={() => setActiveTab('homepage')}
          className={`pb-3 font-label-caps text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'homepage'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">web</span>
          Homepage Banners &amp; Copy
        </button>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImageUpload}
      />

      {/* TAB 1: SEO META TAGS MANAGER */}
      {activeTab === 'seo' && (
        <div className="space-y-8">
          
          {/* Sub-Tabs for SEO Categories */}
          <div className="bg-surface-container-low p-3 rounded-xl border border-outline/10 flex flex-wrap gap-2">
            <button
              onClick={() => setSeoSubTab('pages')}
              className={`px-4 py-2 rounded-lg font-label-caps text-xs transition-colors flex items-center gap-1.5 ${
                seoSubTab === 'pages'
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'bg-surface hover:bg-surface-variant text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_quilt</span>
              Main Storefront Pages
            </button>
            <button
              onClick={() => setSeoSubTab('services')}
              className={`px-4 py-2 rounded-lg font-label-caps text-xs transition-colors flex items-center gap-1.5 ${
                seoSubTab === 'services'
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'bg-surface hover:bg-surface-variant text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">spa</span>
              Service Pages &amp; Treatments ({servicesList.length})
            </button>
            <button
              onClick={() => setSeoSubTab('shop')}
              className={`px-4 py-2 rounded-lg font-label-caps text-xs transition-colors flex items-center gap-1.5 ${
                seoSubTab === 'shop'
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'bg-surface hover:bg-surface-variant text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shopping_bag</span>
              Shop Products ({productsList.length})
            </button>
          </div>

          {/* SUB-TAB A: MAIN PAGES SEO */}
          {seoSubTab === 'pages' && (
            <div className="space-y-8">
              {(['home', 'services', 'shop', 'lookbook'] as const).map((pageKey) => {
                const config = seoData[pageKey] || defaultSEOSettings[pageKey]!;
                const pageLabels = {
                  home: { name: 'Home Page', url: 'https://babyjat.com/' },
                  services: { name: 'Services Main Page', url: 'https://babyjat.com/services' },
                  shop: { name: 'Shop Catalog Page', url: 'https://babyjat.com/shop' },
                  lookbook: { name: 'Style Lookbook Page', url: 'https://babyjat.com/lookbook' }
                };
                const labelInfo = pageLabels[pageKey];

                return (
                  <div key={pageKey} className="bg-surface-container-lowest rounded-xl border border-outline/10 p-6 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                      <div>
                        <h3 className="font-headline-sm text-base text-primary font-semibold">{labelInfo.name} SEO</h3>
                        <p className="text-xs text-secondary mt-0.5">Route: <code className="bg-surface-variant px-1.5 py-0.5 rounded text-[11px]">{labelInfo.url}</code></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* SEO Fields */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-label-caps text-secondary">Meta Title</label>
                            <span className={`text-[10px] font-mono ${config.title.length > 60 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                              {config.title.length}/60 chars
                            </span>
                          </div>
                          <input 
                            type="text" 
                            value={config.title}
                            onChange={(e) => updatePageSeo(pageKey, 'title', e.target.value)}
                            className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                            placeholder="Page title for search results..."
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-label-caps text-secondary">Meta Description</label>
                            <span className={`text-[10px] font-mono ${config.description.length > 160 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                              {config.description.length}/160 chars
                            </span>
                          </div>
                          <textarea 
                            rows={3}
                            value={config.description}
                            onChange={(e) => updatePageSeo(pageKey, 'description', e.target.value)}
                            className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                            placeholder="Brief search snippet description..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-label-caps text-secondary mb-1">Target Keywords (Comma-Separated)</label>
                          <input 
                            type="text" 
                            value={config.keywords}
                            onChange={(e) => updatePageSeo(pageKey, 'keywords', e.target.value)}
                            className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                            placeholder="e.g. salon, hair styling, balayage"
                          />
                        </div>
                      </div>

                      {/* Google Live Search Preview */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-label-caps text-secondary uppercase tracking-wider block mb-3 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">preview</span> Google Search Snippet Preview
                          </span>
                          
                          <div className="space-y-1 bg-surface p-4 rounded-lg border border-outline/10 font-sans">
                            <div className="text-[12px] text-gray-700 truncate font-normal">
                              {labelInfo.url}
                            </div>
                            <div className="text-base text-blue-800 hover:underline cursor-pointer font-medium leading-tight">
                              {config.title || labelInfo.name}
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-snug">
                              {config.description || 'No description specified yet.'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-outline/10 flex justify-between text-[11px] text-secondary">
                          <span>Status: <strong className="text-emerald-700">Active SEO Rules</strong></span>
                          <span>Indexed: Dynamic</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SUB-TAB B: INDIVIDUAL SERVICE PAGES SEO */}
          {seoSubTab === 'services' && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline/10 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline/10 pb-4 gap-4">
                <div>
                  <h3 className="font-headline-sm text-base text-primary font-semibold">Individual Service &amp; Treatment Meta Tags</h3>
                  <p className="text-xs text-secondary mt-0.5">Customize search engine titles and descriptions for specific salon treatments</p>
                </div>
                
                {/* Service Selector Dropdown */}
                <div className="min-w-[280px]">
                  <label className="block text-[11px] font-label-caps text-secondary mb-1">Select Service to Edit</label>
                  <select 
                    value={selectedServiceId} 
                    onChange={e => setSelectedServiceId(e.target.value)}
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50 font-medium"
                  >
                    {servicesList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedServiceId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-label-caps text-secondary">Service Meta Title</label>
                        <span className={`text-[10px] font-mono ${currentServiceSeo.title.length > 60 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                          {currentServiceSeo.title.length}/60 chars
                        </span>
                      </div>
                      <input 
                        type="text" 
                        value={currentServiceSeo.title}
                        onChange={(e) => updateServiceSeo(selectedServiceId, 'title', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. Full Balayage & Styling | BabyJat Luxury Salon"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-label-caps text-secondary">Service Meta Description</label>
                        <span className={`text-[10px] font-mono ${currentServiceSeo.description.length > 160 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                          {currentServiceSeo.description.length}/160 chars
                        </span>
                      </div>
                      <textarea 
                        rows={3}
                        value={currentServiceSeo.description}
                        onChange={(e) => updateServiceSeo(selectedServiceId, 'description', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. Book custom full balayage and glazed hair styling with master colorists at BabyJat."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-label-caps text-secondary mb-1">Service Keywords</label>
                      <input 
                        type="text" 
                        value={currentServiceSeo.keywords}
                        onChange={(e) => updateServiceSeo(selectedServiceId, 'keywords', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. balayage, hair color, glaze treatment, salon appointment"
                      />
                    </div>
                  </div>

                  {/* Google Live Search Preview for Service */}
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-label-caps text-secondary uppercase tracking-wider block mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">preview</span> Google Search Snippet Preview
                      </span>
                      
                      <div className="space-y-1 bg-surface p-4 rounded-lg border border-outline/10 font-sans">
                        <div className="text-[12px] text-gray-700 truncate font-normal">
                          https://babyjat.com/services#{selectedServiceId}
                        </div>
                        <div className="text-base text-blue-800 hover:underline cursor-pointer font-medium leading-tight">
                          {currentServiceSeo.title || currentServiceItem?.name}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-snug">
                          {currentServiceSeo.description || 'No custom meta description assigned.'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline/10 text-xs text-secondary flex justify-between">
                      <span>Service: <strong>{currentServiceItem?.name}</strong></span>
                      <span className="text-primary font-label-caps">Custom SEO Enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB C: INDIVIDUAL SHOP PRODUCT PAGES SEO */}
          {seoSubTab === 'shop' && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline/10 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline/10 pb-4 gap-4">
                <div>
                  <h3 className="font-headline-sm text-base text-primary font-semibold">Individual Shop Product Meta Tags</h3>
                  <p className="text-xs text-secondary mt-0.5">Optimize search rankings for individual hair accessories and care products</p>
                </div>
                
                {/* Product Selector Dropdown */}
                <div className="min-w-[280px]">
                  <label className="block text-[11px] font-label-caps text-secondary mb-1">Select Product to Edit</label>
                  <select 
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50 font-medium"
                  >
                    {productsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProductId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-label-caps text-secondary">Product Meta Title</label>
                        <span className={`text-[10px] font-mono ${currentProductSeo.title.length > 60 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                          {currentProductSeo.title.length}/60 chars
                        </span>
                      </div>
                      <input 
                        type="text" 
                        value={currentProductSeo.title}
                        onChange={(e) => updateProductSeo(selectedProductId, 'title', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. Lumina Silk Hair Serum | Buy Online at BabyJat"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-label-caps text-secondary">Product Meta Description</label>
                        <span className={`text-[10px] font-mono ${currentProductSeo.description.length > 160 ? 'text-amber-600 font-bold' : 'text-secondary'}`}>
                          {currentProductSeo.description.length}/160 chars
                        </span>
                      </div>
                      <textarea 
                        rows={3}
                        value={currentProductSeo.description}
                        onChange={(e) => updateProductSeo(selectedProductId, 'description', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. Nourishing botanical serum for mirror-shine finish. Free shipping available."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-label-caps text-secondary mb-1">Product Keywords</label>
                      <input 
                        type="text" 
                        value={currentProductSeo.keywords}
                        onChange={(e) => updateProductSeo(selectedProductId, 'keywords', e.target.value)}
                        className="w-full p-2.5 border border-outline/20 rounded-lg bg-surface text-sm focus:ring-1 focus:ring-primary/50"
                        placeholder="e.g. hair serum, botanical oil, buy hair accessories"
                      />
                    </div>
                  </div>

                  {/* Google Live Search Preview for Product */}
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-label-caps text-secondary uppercase tracking-wider block mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">preview</span> Google Search Snippet Preview
                      </span>
                      
                      <div className="space-y-1 bg-surface p-4 rounded-lg border border-outline/10 font-sans">
                        <div className="text-[12px] text-gray-700 truncate font-normal">
                          https://babyjat.com/shop/{selectedProductId}
                        </div>
                        <div className="text-base text-blue-800 hover:underline cursor-pointer font-medium leading-tight">
                          {currentProductSeo.title || currentProductItem?.name}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-snug">
                          {currentProductSeo.description || 'No custom product meta description assigned.'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline/10 text-xs text-secondary flex justify-between">
                      <span>Product: <strong>{currentProductItem?.name}</strong></span>
                      <span className="text-primary font-label-caps">Custom SEO Enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: HOMEPAGE BANNERS & COPY */}
      {activeTab === 'homepage' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline/10 p-6 space-y-12 shadow-sm">
          
          {/* Home Page Hero Section */}
          <section className="space-y-6">
            <h3 className="font-headline-sm text-lg text-primary border-b border-outline/10 pb-2 font-semibold">Home Page - Hero Main</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Title</label>
                <textarea 
                  rows={2}
                  value={formData.heroMain?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroMain: {...formData.heroMain, title: e.target.value}})}
                  className="w-full p-3 border border-outline/20 rounded-lg bg-surface text-sm focus:outline-primary focus:ring-1 focus:ring-primary/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Subtitle</label>
                <input 
                  type="text"
                  value={formData.heroMain?.subtitle || ''} 
                  onChange={(e) => setFormData({...formData, heroMain: {...formData.heroMain, subtitle: e.target.value}})}
                  className="w-full p-3 border border-outline/20 rounded-lg bg-surface text-sm focus:outline-primary focus:ring-1 focus:ring-primary/50" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-label-caps text-secondary mb-2">Hero Image</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-xl bg-surface-variant overflow-hidden shrink-0 border border-outline/10">
                    {uploadingImage === 'heroMain.imageUrl' ? (
                       <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                    ) : (
                       <img src={formData.heroMain?.imageUrl} className="w-full h-full object-cover" alt="Hero" />
                    )}
                  </div>
                  <button onClick={() => triggerUpload('heroMain.imageUrl')} className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-lg text-sm font-label-caps hover:bg-surface-variant transition-colors flex items-center gap-2 border border-outline/10">
                    <span className="material-symbols-outlined text-sm">cloud_upload</span> Change Image
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Promo Card Section */}
          <section className="space-y-6">
            <h3 className="font-headline-sm text-lg text-primary border-b border-outline/10 pb-2 font-semibold">Home Page - Promo Box</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Title</label>
                <textarea 
                  rows={2}
                  value={formData.heroSecondary1?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary1: {...formData.heroSecondary1, title: e.target.value}})}
                  className="w-full p-3 border border-outline/20 rounded-lg bg-surface text-sm focus:outline-primary focus:ring-1 focus:ring-primary/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Subtitle</label>
                <input 
                  type="text"
                  value={formData.heroSecondary1?.subtitle || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary1: {...formData.heroSecondary1, subtitle: e.target.value}})}
                  className="w-full p-3 border border-outline/20 rounded-lg bg-surface text-sm focus:outline-primary focus:ring-1 focus:ring-primary/50" 
                />
              </div>
            </div>
          </section>

          {/* Accessory Highlight */}
          <section className="space-y-6">
            <h3 className="font-headline-sm text-lg text-primary border-b border-outline/10 pb-2 font-semibold">Home Page - Secondary Image Box</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-1">Title</label>
                <input 
                  type="text"
                  value={formData.heroSecondary2?.title || ''} 
                  onChange={(e) => setFormData({...formData, heroSecondary2: {...formData.heroSecondary2, title: e.target.value}})}
                  className="w-full p-3 border border-outline/20 rounded-lg bg-surface text-sm focus:outline-primary focus:ring-1 focus:ring-primary/50" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-label-caps text-secondary mb-2">Image</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-xl bg-surface-variant overflow-hidden shrink-0 border border-outline/10">
                    {uploadingImage === 'heroSecondary2.imageUrl' ? (
                       <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                    ) : (
                       <img src={formData.heroSecondary2?.imageUrl} className="w-full h-full object-cover" alt="Secondary" />
                    )}
                  </div>
                  <button onClick={() => triggerUpload('heroSecondary2.imageUrl')} className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-lg text-sm font-label-caps hover:bg-surface-variant transition-colors flex items-center gap-2 border border-outline/10">
                    <span className="material-symbols-outlined text-sm">cloud_upload</span> Change Image
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}

    </div>
  );
}
