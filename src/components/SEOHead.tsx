import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SEOMetaConfig {
  title: string;
  description: string;
  keywords: string;
}

export interface SEOSettings {
  home?: SEOMetaConfig;
  services?: SEOMetaConfig;
  shop?: SEOMetaConfig;
  lookbook?: SEOMetaConfig;
  serviceOverrides?: Record<string, SEOMetaConfig>;
  shopOverrides?: Record<string, SEOMetaConfig>;
}

export const defaultSEOSettings: SEOSettings = {
  home: {
    title: 'BabyJat - Luxury Salon & Beauty Spa',
    description: 'Experience premier hair styling, full balayage, glazes, blowouts, and luxury beauty products at BabyJat.',
    keywords: 'salon, hair styling, balayage, blowout, luxury spa, beauty products, hair care, Kampala salon'
  },
  services: {
    title: 'Services & Transformations | BabyJat Salon',
    description: 'Explore our signature transformations, hair coloring, precision cuts, glaze treatments, and luxury blowouts.',
    keywords: 'hair services, balayage, precision cut, glaze treatment, luxury blowout, salon menu, hair appointment'
  },
  shop: {
    title: 'Curated Shop & Accessories | BabyJat',
    description: 'Shop premium hair serums, silk headbands, luxury clips, and professional hair care accessories.',
    keywords: 'hair products, lumina serum, hair accessories, luxury styling tools, silk headband, hair oil'
  },
  lookbook: {
    title: 'Style Lookbook & Inspiration | BabyJat',
    description: 'Browse signature hair transformations, copper balayage, textured bobs, and glass hair styles.',
    keywords: 'lookbook, hair styles, copper muse, hair color inspiration, salon gallery, trending hair looks'
  },
  serviceOverrides: {},
  shopOverrides: {}
};

interface SEOHeadProps {
  pageKey?: 'home' | 'services' | 'shop' | 'lookbook';
  serviceId?: string;
  serviceName?: string;
  productId?: string;
  productName?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackKeywords?: string;
}

export function SEOHead({
  pageKey = 'home',
  serviceId,
  serviceName,
  productId,
  productName,
  fallbackTitle,
  fallbackDescription,
  fallbackKeywords
}: SEOHeadProps) {
  const [seoData, setSeoData] = useState<SEOSettings>(defaultSEOSettings);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'seo'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SEOSettings;
        setSeoData({
          ...defaultSEOSettings,
          ...data,
          serviceOverrides: { ...defaultSEOSettings.serviceOverrides, ...(data.serviceOverrides || {}) },
          shopOverrides: { ...defaultSEOSettings.shopOverrides, ...(data.shopOverrides || {}) }
        });
      }
    }, (err) => {
      console.warn("SEO snapshot listener notice:", err);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let title = fallbackTitle || '';
    let description = fallbackDescription || '';
    let keywords = fallbackKeywords || '';

    // Check specific service override
    if (serviceId && seoData.serviceOverrides?.[serviceId]) {
      const sOverride = seoData.serviceOverrides[serviceId];
      if (sOverride.title) title = sOverride.title;
      if (sOverride.description) description = sOverride.description;
      if (sOverride.keywords) keywords = sOverride.keywords;
    } 
    // Check specific shop item override
    else if (productId && seoData.shopOverrides?.[productId]) {
      const pOverride = seoData.shopOverrides[productId];
      if (pOverride.title) title = pOverride.title;
      if (pOverride.description) description = pOverride.description;
      if (pOverride.keywords) keywords = pOverride.keywords;
    } 
    // Check page key meta settings
    else if (pageKey && seoData[pageKey]) {
      const pData = seoData[pageKey]!;
      title = pData.title || title;
      description = pData.description || description;
      keywords = pData.keywords || keywords;
    }

    // Dynamic title construction if not explicit
    if (!title) {
      if (serviceName) {
        title = `${serviceName} | BabyJat Salon`;
      } else if (productName) {
        title = `${productName} | BabyJat Shop`;
      } else {
        title = defaultSEOSettings[pageKey]?.title || 'BabyJat - Salon & Luxury Spa';
      }
    }

    if (!description) {
      description = defaultSEOSettings[pageKey]?.description || 'BabyJat Luxury Hair Styling, Spa Services, and Product Shop.';
    }

    if (!keywords) {
      keywords = defaultSEOSettings[pageKey]?.keywords || 'salon, hair styling, beauty, accessories';
    }

    // Update document title
    document.title = title;

    // Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  }, [pageKey, serviceId, serviceName, productId, productName, fallbackTitle, fallbackDescription, fallbackKeywords, seoData]);

  return null;
}
