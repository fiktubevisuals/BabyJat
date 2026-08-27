import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface HairstyleOption {
  id: string;
  name: string;
  category: 'Braids & Locs' | 'Short & Bob' | 'Long & Waves' | 'Curly & Afro';
  description: string;
  estimatedTime: string;
  servicePrice: string;
  iconSymbol: string;
  overlayStyle: 'bob' | 'afro' | 'braids' | 'waves' | 'pixie' | 'straight' | 'locs';
}

export interface ColorShade {
  id: string;
  name: string;
  tagline: string;
  hex: string;
  accentHex: string;
  blendMode: 'color' | 'overlay' | 'multiply' | 'soft-light';
  priceTag: string;
  description: string;
}

export const HAIRSTYLE_CATALOG: HairstyleOption[] = [
  {
    id: 'knotless_braids',
    name: 'Knotless Goddess Braids',
    category: 'Braids & Locs',
    description: 'Lightweight bohemian braids with soft flowing curly ends.',
    estimatedTime: '3.5 Hours',
    servicePrice: 'UGX 250,000',
    iconSymbol: 'grid_view',
    overlayStyle: 'braids'
  },
  {
    id: 'sleek_bob',
    name: 'Sleek French Bob Cut',
    category: 'Short & Bob',
    description: 'Precision chin-length sharp bob with mirror gloss shine.',
    estimatedTime: '1.5 Hours',
    servicePrice: 'UGX 160,000',
    iconSymbol: 'content_cut',
    overlayStyle: 'bob'
  },
  {
    id: 'bouncy_afro',
    name: 'Voluminous Afro Curls (4C)',
    category: 'Curly & Afro',
    description: 'Full-bodied defined natural afro coils with radiant shine.',
    estimatedTime: '2.0 Hours',
    servicePrice: 'UGX 140,000',
    iconSymbol: 'blur_on',
    overlayStyle: 'afro'
  },
  {
    id: 'fulani_braids',
    name: 'Fulani Braids with Beads',
    category: 'Braids & Locs',
    description: 'Forward cornrows with metallic gold beads.',
    estimatedTime: '3.0 Hours',
    servicePrice: 'UGX 220,000',
    iconSymbol: 'view_headline',
    overlayStyle: 'braids'
  },
  {
    id: 'silk_press',
    name: 'Layered Silk Press & Bangs',
    category: 'Long & Waves',
    description: 'Silky smooth straightened natural hair with curtain layers.',
    estimatedTime: '2.0 Hours',
    servicePrice: 'UGX 180,000',
    iconSymbol: 'waves',
    overlayStyle: 'straight'
  },
  {
    id: 'hollywood_waves',
    name: 'Glamorous Hollywood Waves',
    category: 'Long & Waves',
    description: 'Classic vintage S-shaped glossy luxury waves.',
    estimatedTime: '2.5 Hours',
    servicePrice: 'UGX 210,000',
    iconSymbol: 'water_drop',
    overlayStyle: 'waves'
  },
  {
    id: 'chic_pixie',
    name: 'Chic Tapered Pixie Cut',
    category: 'Short & Bob',
    description: 'Edgy tapered short sides with soft textured crown.',
    estimatedTime: '1.5 Hours',
    servicePrice: 'UGX 130,000',
    iconSymbol: 'auto_awesome',
    overlayStyle: 'pixie'
  },
  {
    id: 'locs_updo',
    name: 'High Crown Locs Updo',
    category: 'Braids & Locs',
    description: 'Sculpted retwisted locs gathered into a regal high bun.',
    estimatedTime: '2.5 Hours',
    servicePrice: 'UGX 190,000',
    iconSymbol: 'cyclone',
    overlayStyle: 'locs'
  }
];

export const COLOR_SHADES: ColorShade[] = [
  {
    id: 'copper_muse',
    name: 'The Copper Muse',
    tagline: 'Warm Amber & Burnished Copper',
    hex: '#C85A28',
    accentHex: '#E28B52',
    blendMode: 'overlay',
    priceTag: 'UGX 180,000',
    description: 'Signature rich terracotta with amber reflections.'
  },
  {
    id: 'honey_balayage',
    name: 'Honey Nectar Balayage',
    tagline: 'Golden Caramel & Warm Honey',
    hex: '#DCA24E',
    accentHex: '#F3CF8B',
    blendMode: 'color',
    priceTag: 'UGX 220,000',
    description: 'Multi-tonal golden caramel melted into roots.'
  },
  {
    id: 'platinum_glass',
    name: 'Platinum Glass Gloss',
    tagline: 'Icy Silver & Diamond Shine',
    hex: '#D0D8E0',
    accentHex: '#FFFFFF',
    blendMode: 'soft-light',
    priceTag: 'UGX 250,000',
    description: 'Ultra-reflective icy platinum with mirror finish.'
  },
  {
    id: 'velvet_espresso',
    name: 'Velvet Espresso',
    tagline: 'Deep Rich Mahogany & Chocolate',
    hex: '#3B231B',
    accentHex: '#603B2E',
    blendMode: 'multiply',
    priceTag: 'UGX 150,000',
    description: 'Deep mocha velvet with subtle chestnut undertones.'
  },
  {
    id: 'rose_gold',
    name: 'Rose Gold Nectar',
    tagline: 'Dusty Rose & Pearlescent Gold',
    hex: '#D27D8B',
    accentHex: '#F0B3BC',
    blendMode: 'color',
    priceTag: 'UGX 200,000',
    description: 'Romantic metallic dusty rose infused with champagne gold.'
  }
];

const PRESET_MODELS = [
  {
    id: 'preset1',
    name: 'Soft Waves',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'preset2',
    name: 'Kinky Curls',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'preset3',
    name: 'Sleek Straight',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'
  }
];

export interface AITryOnProps {
  onBookStyle?: (styleName: string, shadeName: string, price?: string, duration?: string) => void;
  initialStyleId?: string;
  className?: string;
  compact?: boolean;
}

export function AITryOn({ onBookStyle, initialStyleId, className = '', compact = false }: AITryOnProps) {
  const [catalogStyles, setCatalogStyles] = useState<HairstyleOption[]>(HAIRSTYLE_CATALOG);

  // Subscribe to live hairstyles from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hairstyles'), (snap) => {
      if (!snap.empty) {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HairstyleOption));
        setCatalogStyles(fetched);
      }
    }, (err) => {
      console.warn("Hairstyles Firestore listener ended:", err);
    });
    return () => unsub();
  }, []);

  const [selectedStyle, setSelectedStyle] = useState<HairstyleOption>(() => {
    return catalogStyles.find((s) => s.id === initialStyleId) || catalogStyles[0] || HAIRSTYLE_CATALOG[0];
  });

  // Keep selected style synced if catalog changes or loads from Firestore
  useEffect(() => {
    if (catalogStyles.length > 0) {
      const exists = catalogStyles.find(s => s.id === selectedStyle.id || s.name === selectedStyle.name);
      if (exists) {
        setSelectedStyle(exists);
      } else {
        setSelectedStyle(catalogStyles[0]);
      }
    }
  }, [catalogStyles]);
  const [selectedShade, setSelectedShade] = useState<ColorShade>(COLOR_SHADES[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Custom Color Picker & Gradient Balayage state
  const [colorMode, setColorMode] = useState<'preset' | 'custom' | 'gradient'>('preset');
  const [customHex, setCustomHex] = useState<string>('#D4AF37'); // Gold
  const [rootHex, setRootHex] = useState<string>('#2B1700'); // Espresso
  const [tipHex, setTipHex] = useState<string>('#E6C280'); // Honey Nectar
  const [balayageStyle, setBalayageStyle] = useState<'Balayage' | 'Ombre' | 'Highlights' | 'Split Tone'>('Balayage');
  const [blendRatio, setBlendRatio] = useState<number>(50);

  // 360° Multi-Angle Try-On state
  type TryOnAngle = 'front' | 'left_profile' | 'right_profile' | 'back';
  const [currentAngle, setCurrentAngle] = useState<TryOnAngle>('front');
  const [anglePhotos, setAnglePhotos] = useState<Record<TryOnAngle, string | null>>({
    front: null,
    left_profile: null,
    right_profile: null,
    back: null
  });

  const capturedImage = anglePhotos[currentAngle];
  const setCapturedImageForCurrentAngle = (imgUrl: string | null) => {
    setAnglePhotos(prev => ({ ...prev, [currentAngle]: imgUrl }));
  };
  
  // Image Capture Mode: 'camera' | 'photo'
  const [captureMode, setCaptureMode] = useState<'camera' | 'photo'>('camera');
  
  // Camera WebRTC state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Processing state with Gemini AI models
  const [selectedImageEngine, setSelectedImageEngine] = useState<'nano-banana-lite' | 'omni' | 'nano-banana-2'>('nano-banana-lite');
  const [isProcessingOmni, setIsProcessingOmni] = useState<boolean>(false);
  const [aiResultImages, setAiResultImages] = useState<Record<TryOnAngle, string | null>>({
    front: null,
    left_profile: null,
    right_profile: null,
    back: null
  });
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [regionNotice, setRegionNotice] = useState<string | null>(null);

  const aiResultImage = aiResultImages[currentAngle];
  const setAiResultImageForCurrentAngle = (imgUrl: string | null) => {
    setAiResultImages(prev => ({ ...prev, [currentAngle]: imgUrl }));
  };

  const clearAllAiResultImages = useCallback(() => {
    setAiResultImages({
      front: null,
      left_profile: null,
      right_profile: null,
      back: null
    });
  }, []);

  // 360° Carousel & Swipe Logic
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<number>(0);
  const minSwipeDistance = 50;

  const anglesSequence: TryOnAngle[] = ['front', 'left_profile', 'back', 'right_profile'];

  const goNextAngle = useCallback(() => {
    setDirection(1);
    setCurrentAngle(prev => anglesSequence[(anglesSequence.indexOf(prev) + 1) % anglesSequence.length]);
  }, []);
  
  const goPrevAngle = useCallback(() => {
    setDirection(-1);
    setCurrentAngle(prev => anglesSequence[(anglesSequence.indexOf(prev) - 1 + anglesSequence.length) % anglesSequence.length]);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      goNextAngle(); // Swipe left -> Next
    } else if (distance < -minSwipeDistance) {
      goPrevAngle(); // Swipe right -> Prev
    }
  };

  // 360° Auto-spin interval effect
  useEffect(() => {
    if (!isAutoSpinning) return;
    const interval = setInterval(goNextAngle, 1800);
    return () => clearInterval(interval);
  }, [isAutoSpinning, goNextAngle]);
  
  // Gemini AI Stylist Dossier
  const [aiDossier, setAiDossier] = useState<{
    transformationSummary?: string;
    faceShapeAnalysis?: string;
    stylingTechnique?: string;
    estimatedTime?: string;
    maintenanceTips?: string[];
    recommendedServices?: string[];
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        // Safe cleanup
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start WebRTC camera stream
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser camera API is not supported on this device/browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
              console.warn('Camera video play interrupted:', err);
            }
          });
        }
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera Access Error:', err);
      setCameraError(
        err?.message || 'Unable to access camera. Please allow camera permissions or upload a selfie file.'
      );
      setCaptureMode('photo');
    }
  }, [facingMode, stopCameraStream]);

  // Effect to manage camera stream lifecycle
  useEffect(() => {
    if (captureMode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [captureMode, capturedImage, startCamera, stopCameraStream]);

  // Render canvas simulator preview when photo is available
  const renderCanvasSimulator = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const activeSrc = capturedImage || PRESET_MODELS[0].url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeSrc;
    img.onload = () => {
      canvas.width = img.width || 600;
      canvas.height = img.height || 800;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Render procedural hair overlay
      ctx.save();
      const w = canvas.width;
      const h = canvas.height;

      // Determine fill style based on color mode
      if (colorMode === 'preset') {
        ctx.fillStyle = selectedShade.hex;
      } else if (colorMode === 'custom') {
        ctx.fillStyle = customHex;
      } else {
        // Gradient Balayage / Ombre
        let grad;
        if (balayageStyle === 'Ombre') {
          grad = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.85);
          grad.addColorStop(0, rootHex);
          grad.addColorStop(blendRatio / 100, rootHex);
          grad.addColorStop(1, tipHex);
        } else if (balayageStyle === 'Balayage') {
          grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, rootHex);
          grad.addColorStop(0.5, rootHex);
          grad.addColorStop(1, tipHex);
        } else if (balayageStyle === 'Split Tone') {
          grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, rootHex);
          grad.addColorStop(0.5, rootHex);
          grad.addColorStop(0.51, tipHex);
          grad.addColorStop(1, tipHex);
        } else {
          // Highlights
          grad = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.3, w * 0.5);
          grad.addColorStop(0, tipHex);
          grad.addColorStop(0.6, rootHex);
          grad.addColorStop(1, tipHex);
        }
        ctx.fillStyle = grad;
      }

      ctx.globalAlpha = 0.7;

      // Adjust geometry overlay based on angle
      if (currentAngle === 'left_profile' || currentAngle === 'right_profile') {
        const offsetLeft = currentAngle === 'left_profile' ? w * 0.2 : w * 0.05;
        ctx.beginPath();
        ctx.ellipse(w * 0.45 + offsetLeft, h * 0.35, w * 0.38, h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentAngle === 'back') {
        ctx.beginPath();
        ctx.rect(w * 0.15, h * 0.1, w * 0.7, h * 0.8);
        ctx.fill();
      } else {
        // Front View
        if (selectedStyle.overlayStyle === 'bob') {
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.35, w * 0.42, h * 0.32, 0, Math.PI, Math.PI * 2);
          ctx.fill();
        } else if (selectedStyle.overlayStyle === 'afro') {
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.32, w * 0.48, h * 0.38, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (selectedStyle.overlayStyle === 'braids') {
          ctx.beginPath();
          ctx.rect(w * 0.1, h * 0.15, w * 0.8, h * 0.75);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.38, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = colorMode === 'preset' ? (selectedShade.blendMode || 'overlay') : 'overlay';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(0, 0, w, h);

      // Gloss reflection
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.35;
      const glossGrad = ctx.createRadialGradient(w * 0.5, h * 0.28, 40, w * 0.5, h * 0.28, w * 0.55);
      glossGrad.addColorStop(0, colorMode === 'preset' ? selectedShade.accentHex : (colorMode === 'custom' ? customHex : tipHex));
      glossGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    };
  }, [capturedImage, selectedStyle, selectedShade, colorMode, customHex, rootHex, tipHex, balayageStyle, blendRatio, currentAngle]);

  useEffect(() => {
    if (capturedImage || captureMode === 'photo') {
      renderCanvasSimulator();
    }
  }, [capturedImage, captureMode, renderCanvasSimulator]);

  // Snap photo from video feed
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(tempCanvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
      setCapturedImageForCurrentAngle(dataUrl);
      stopCameraStream();
    }
  };

  // Upload file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImageForCurrentAngle(event.target.result as string);
          setAiResultImageForCurrentAngle(null);
          stopCameraStream();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to compress and downscale base64 image before sending over API
  const compressImage = async (dataUrl: string, maxDim = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Offscreen canvas simulation helper for a specific angle
  const generateCanvasSnapshotForAngle = (ang: TryOnAngle, baseImgUrl: string | null): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!baseImgUrl) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 640;
        tempCanvas.height = img.height || 800;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return resolve(baseImgUrl);

        const w = tempCanvas.width;
        const h = tempCanvas.height;
        ctx.drawImage(img, 0, 0, w, h);

        ctx.save();
        if (colorMode === 'preset') {
          ctx.fillStyle = selectedShade.hex;
        } else if (colorMode === 'custom') {
          ctx.fillStyle = customHex;
        } else {
          let grad;
          if (balayageStyle === 'Ombre') {
            grad = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.85);
            grad.addColorStop(0, rootHex);
            grad.addColorStop(blendRatio / 100, rootHex);
            grad.addColorStop(1, tipHex);
          } else if (balayageStyle === 'Balayage') {
            grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, rootHex);
            grad.addColorStop(0.5, rootHex);
            grad.addColorStop(1, tipHex);
          } else if (balayageStyle === 'Split Tone') {
            grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, rootHex);
            grad.addColorStop(0.5, rootHex);
            grad.addColorStop(0.51, tipHex);
            grad.addColorStop(1, tipHex);
          } else {
            grad = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.3, w * 0.5);
            grad.addColorStop(0, tipHex);
            grad.addColorStop(0.6, rootHex);
            grad.addColorStop(1, tipHex);
          }
          ctx.fillStyle = grad;
        }
        ctx.globalAlpha = 0.7;

        if (ang === 'left_profile') {
          ctx.beginPath();
          ctx.ellipse(w * 0.6, h * 0.35, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (ang === 'right_profile') {
          ctx.beginPath();
          ctx.ellipse(w * 0.35, h * 0.35, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (ang === 'back') {
          ctx.beginPath();
          ctx.rect(w * 0.12, h * 0.1, w * 0.76, h * 0.8);
          ctx.fill();
        } else {
          if (selectedStyle.overlayStyle === 'bob') {
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.35, w * 0.42, h * 0.32, 0, Math.PI, Math.PI * 2);
            ctx.fill();
          } else if (selectedStyle.overlayStyle === 'afro') {
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.32, w * 0.48, h * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (selectedStyle.overlayStyle === 'braids') {
            ctx.beginPath();
            ctx.rect(w * 0.1, h * 0.15, w * 0.8, h * 0.75);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.38, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalCompositeOperation = colorMode === 'preset' ? (selectedShade.blendMode || 'overlay') : 'overlay';
        ctx.globalAlpha = 0.75;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.35;
        const glossGrad = ctx.createRadialGradient(w * 0.5, h * 0.28, 40, w * 0.5, h * 0.28, w * 0.55);
        glossGrad.addColorStop(0, colorMode === 'preset' ? selectedShade.accentHex : (colorMode === 'custom' ? customHex : tipHex));
        glossGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glossGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
        resolve(tempCanvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(baseImgUrl);
      img.src = baseImgUrl;
    });
  };

  // Process all 360° multi-angle views at once with Gemini Nano Banana 2 Lite / Omni Flash
  const handleProcessOmniFlash = async () => {
    setIsProcessingOmni(true);
    setProcessingError(null);

    const primaryImage = capturedImage || anglePhotos.front || anglePhotos.left_profile || anglePhotos.right_profile || anglePhotos.back || canvasRef.current?.toDataURL('image/jpeg', 0.85);

    // Derived shade name display
    const shadeNameDisplay = colorMode === 'preset' ? selectedShade.name :
      colorMode === 'custom' ? `Custom Shade (${customHex})` :
      `Gradient ${balayageStyle} (${rootHex} to ${tipHex})`;

    const anglesToGenerate: TryOnAngle[] = ['front', 'left_profile', 'right_profile', 'back'];
    const newResults: Record<TryOnAngle, string | null> = { front: null, left_profile: null, right_profile: null, back: null };
    let capturedRegionNotice: string | null = null;

    try {
      // Execute 360° generation for ALL angles simultaneously
      await Promise.all(anglesToGenerate.map(async (ang) => {
        const rawForAngle = anglePhotos[ang] || primaryImage;
        const imageToSend = rawForAngle ? await compressImage(rawForAngle) : undefined;

        try {
          const res = await fetch('/api/ai/generate-tryon-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelName: selectedImageEngine,
              hairstyleName: selectedStyle.name,
              shadeName: shadeNameDisplay,
              colorMode,
              customHex,
              rootHex,
              tipHex,
              balayageStyle,
              angle: ang,
              userImageBase64: imageToSend
            })
          });

          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const textErr = await res.text();
            throw new Error(`Server returned non-JSON error response (${res.status}): ${textErr.slice(0, 120)}`);
          }

          const data = await res.json();

          if (data.isRegionRestricted || data.fallback) {
            capturedRegionNotice = data.message || 'AI direct image generation is geographically restricted in this server region. Smart Canvas Overlay Simulator active for 360° Studio.';
            const simSnap = await generateCanvasSnapshotForAngle(ang, rawForAngle);
            newResults[ang] = simSnap;
          } else if (data.imageUrl) {
            newResults[ang] = data.imageUrl;
          } else {
            const simSnap = await generateCanvasSnapshotForAngle(ang, rawForAngle);
            newResults[ang] = simSnap;
          }
        } catch (singleErr) {
          console.warn(`Angle ${ang} fallback simulation triggered:`, singleErr);
          const simSnap = await generateCanvasSnapshotForAngle(ang, rawForAngle);
          newResults[ang] = simSnap;
        }
      }));

      setAiResultImages(newResults);
      setRegionNotice(capturedRegionNotice);

      // Fetch Gemini Hair Architect Dossier Analysis (based on front/primary view)
      const primaryToSend = primaryImage ? await compressImage(primaryImage) : undefined;
      const dossierRes = await fetch('/api/ai/hairstyle-transformation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hairstyleName: selectedStyle.name,
          shadeName: shadeNameDisplay,
          userImageBase64: primaryToSend
        })
      });

      const dossierContentType = dossierRes.headers.get('content-type') || '';
      if (dossierContentType.includes('application/json')) {
        const dossierData = await dossierRes.json();
        setAiDossier(dossierData);
      }
    } catch (err: any) {
      console.error('360 Omni Flash Try-On Error:', err);
      setProcessingError(err?.message || 'Error executing Gemini 360° Multi-Angle overlay.');
    } finally {
      setIsProcessingOmni(false);
    }
  };

  const handleRetake = () => {
    setCapturedImageForCurrentAngle(null);
    setAiResultImageForCurrentAngle(null);
    setAiDossier(null);
    setProcessingError(null);
    setRegionNotice(null);
    if (captureMode === 'camera') {
      startCamera();
    }
  };

  const filteredStyles = catalogStyles.filter(
    (s) => categoryFilter === 'All' || s.category === categoryFilter
  );

  return (
    <div className={`bg-surface border border-outline/10 rounded-3xl p-4 md:p-6 shadow-xl ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5 border-b border-outline/10 pb-4">
        <div>
          <span className="font-label-caps text-xs text-primary font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">auto_awesome</span> AI Studio Generation Engine
          </span>
          <h2 className="font-headline-md text-xl md:text-2xl text-on-surface font-bold mt-0.5">
            AI Selfie Hair Try-On
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Engine Selector */}
          <div className="flex bg-surface-container-high/60 p-1 rounded-xl border border-outline/10">
            <button
              type="button"
              onClick={() => setSelectedImageEngine('nano-banana-lite')}
              className={`px-2.5 py-1 text-[11px] font-label-caps rounded-lg transition-all flex items-center gap-1 ${
                selectedImageEngine === 'nano-banana-lite'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
              title="Nano Banana 2 Lite (gemini-3.1-flash-lite-image)"
            >
              <span className="material-symbols-outlined text-xs">bolt</span>
              Nano Banana 2 Lite
            </button>
            <button
              type="button"
              onClick={() => setSelectedImageEngine('omni')}
              className={`px-2.5 py-1 text-[11px] font-label-caps rounded-lg transition-all flex items-center gap-1 ${
                selectedImageEngine === 'omni'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
              title="Gemini Omni Flash (gemini-omni-flash-preview)"
            >
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              Omni Flash
            </button>
            <button
              type="button"
              onClick={() => setSelectedImageEngine('nano-banana-2')}
              className={`px-2.5 py-1 text-[11px] font-label-caps rounded-lg transition-all flex items-center gap-1 ${
                selectedImageEngine === 'nano-banana-2'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
              title="Nano Banana 2 (gemini-3.1-flash-image)"
            >
              <span className="material-symbols-outlined text-xs">camera</span>
              Nano Banana 2
            </button>
          </div>

          {/* Capture Mode Switcher */}
          <div className="flex bg-surface-container p-1 rounded-xl border border-outline/10">
            <button
              type="button"
              onClick={() => {
                setCaptureMode('camera');
                setCapturedImageForCurrentAngle(null);
              }}
              className={`px-3 py-1.5 text-xs font-label-caps rounded-lg transition-all flex items-center gap-1.5 ${
                captureMode === 'camera' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">videocam</span>
              Live Camera
            </button>
            <button
              type="button"
              onClick={() => {
                setCaptureMode('photo');
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1.5 text-xs font-label-caps rounded-lg transition-all flex items-center gap-1.5 ${
                captureMode === 'photo' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Upload Selfie
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Viewfinder / Result Canvas (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          
          {/* 360° Multi-Angle Selector Tabs & Auto Spin Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-label-caps text-secondary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">360</span> 360° Studio Multi-Angle View
              </span>
              <div className="flex items-center gap-2">
                {(aiResultImages.front || aiResultImages.left_profile) && (
                  <button
                    type="button"
                    onClick={() => setIsAutoSpinning(!isAutoSpinning)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isAutoSpinning
                        ? 'bg-amber-400 text-black shadow-sm ring-1 ring-amber-300'
                        : 'bg-surface-container text-secondary hover:text-on-surface border border-outline/10'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xs ${isAutoSpinning ? 'animate-spin' : ''}`}>sync</span>
                    {isAutoSpinning ? 'Auto-Spinning' : 'Auto 360° Spin'}
                  </button>
                )}
                <span className="text-[10px] text-primary font-bold">
                  {currentAngle === 'front' ? 'Front (0°)' : currentAngle === 'left_profile' ? 'Left Profile (90°)' : currentAngle === 'back' ? 'Back View (180°)' : 'Right Profile (270°)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-surface-container p-1 rounded-xl border border-outline/10">
              {[
                { id: 'front' as TryOnAngle, label: 'Front', icon: 'face' },
                { id: 'left_profile' as TryOnAngle, label: 'Left Side', icon: 'person' },
                { id: 'back' as TryOnAngle, label: 'Back View', icon: 'waves' },
                { id: 'right_profile' as TryOnAngle, label: 'Right Side', icon: 'person_outline' }
              ].map(ang => {
                const isActive = currentAngle === ang.id;
                const hasPhoto = !!anglePhotos[ang.id];
                const hasAiRender = !!aiResultImages[ang.id];
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => {
                      const currentIdx = anglesSequence.indexOf(currentAngle);
                      const newIdx = anglesSequence.indexOf(ang.id);
                      setDirection(newIdx > currentIdx ? 1 : -1);
                      setCurrentAngle(ang.id);
                    }}
                    className={`relative py-1.5 px-1 rounded-lg text-[10px] font-label-caps transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isActive ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-secondary hover:text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">{ang.icon}</span>
                    <span>{ang.label}</span>
                    {hasAiRender ? (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 border border-black" title="AI Render Ready" />
                    ) : hasPhoto ? (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black" title="Photo Captured" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* 360° Angle Slider Bar if AI Results are generated */}
            {(aiResultImages.front || aiResultImages.left_profile || aiResultImages.back || aiResultImages.right_profile) && (
              <div className="mt-2.5 bg-surface-container-lowest p-2 rounded-xl border border-amber-400/20 shadow-sm">
                <div className="flex justify-between text-[9px] font-label-caps text-secondary font-bold mb-1">
                  <span className={currentAngle === 'front' ? 'text-primary font-extrabold' : ''}>Front 0°</span>
                  <span className={currentAngle === 'left_profile' ? 'text-primary font-extrabold' : ''}>Left 90°</span>
                  <span className={currentAngle === 'back' ? 'text-primary font-extrabold' : ''}>Back 180°</span>
                  <span className={currentAngle === 'right_profile' ? 'text-primary font-extrabold' : ''}>Right 270°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={currentAngle === 'front' ? 0 : currentAngle === 'left_profile' ? 1 : currentAngle === 'back' ? 2 : 3}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const currentIdx = anglesSequence.indexOf(currentAngle);
                    setDirection(idx > currentIdx ? 1 : -1);
                    setCurrentAngle(anglesSequence[idx]);
                  }}
                  className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            )}
          </div>

          <div 
            className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-black/95 border border-outline/20 shadow-2xl flex items-center justify-center group touch-pan-y select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Carousel Navigation Arrows */}
            {(aiResultImages.front || aiResultImages.left_profile || aiResultImages.back || aiResultImages.right_profile || anglePhotos.front) && (
              <>
                <div className="absolute inset-y-0 left-0 flex items-center z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={goPrevAngle} className="p-2 ml-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur shadow">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={goNextAngle} className="p-2 mr-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur shadow">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </>
            )}

            {/* 3. Live WebRTC Camera Stream (Kept outside AnimatePresence so it doesn't remount on swipe) */}
            {(!aiResultImage && !capturedImage && captureMode === 'camera' && isCameraActive) && (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Angle Specific Camera Framing Guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {currentAngle === 'front' && (
                    <div className="w-[62%] h-[68%] rounded-[50%] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  )}
                  {currentAngle === 'left_profile' && (
                    <div className="w-[55%] h-[72%] rounded-[40%] border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                      <span className="text-[11px] text-amber-300 font-bold bg-black/60 px-2 py-1 rounded">Left Profile</span>
                    </div>
                  )}
                  {currentAngle === 'right_profile' && (
                    <div className="w-[55%] h-[72%] rounded-[40%] border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                      <span className="text-[11px] text-amber-300 font-bold bg-black/60 px-2 py-1 rounded">Right Profile</span>
                    </div>
                  )}
                  {currentAngle === 'back' && (
                    <div className="w-[65%] h-[75%] rounded-[30%] border-2 border-dashed border-sky-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                      <span className="text-[11px] text-sky-300 font-bold bg-black/60 px-2 py-1 rounded">Back View</span>
                    </div>
                  )}
                </div>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md"
                  title="Flip Camera"
                >
                  <span className="material-symbols-outlined text-lg">flip_camera_ios</span>
                </button>

                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none px-2">
                  <span className="bg-black/80 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full border border-white/20">
                    {currentAngle === 'front' && 'Align face inside oval & snap front view'}
                    {currentAngle === 'left_profile' && 'Turn head 90° right to capture left side profile'}
                    {currentAngle === 'right_profile' && 'Turn head 90° left to capture right side profile'}
                    {currentAngle === 'back' && 'Turn back to camera to capture full back hairstyle'}
                  </span>
                </div>
              </div>
            )}

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              {/* Only render motion wrapper for static content to enable swipe crossfades */}
              {(aiResultImage || capturedImage || (!isCameraActive && captureMode !== 'camera')) && (
                <motion.div
                  key={currentAngle + (aiResultImage ? '-ai' : '-raw')}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 w-full h-full bg-black"
                >
                  {/* 1. Show AI Result Image if available */}
                  {aiResultImage ? (
                    <div className="relative w-full h-full">
                      <img src={aiResultImage} alt="AI Generation Result" className="w-full h-full object-cover" draggable={false} />
                      <div className="absolute top-3 left-3 bg-amber-500 text-black text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        {regionNotice
                          ? 'Smart Canvas AI Overlay'
                          : selectedImageEngine === 'nano-banana-lite'
                          ? 'Nano Banana 2 Lite Render'
                          : selectedImageEngine === 'nano-banana-2'
                          ? 'Nano Banana 2 Render'
                          : 'Gemini Omni Flash Render'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiResultImageForCurrentAngle(null)}
                        className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full hover:bg-black border border-white/20"
                      >
                        View Canvas Overlay
                      </button>
                    </div>
                  ) : capturedImage ? (
                    /* 2. Captured Photo / Canvas Overlay */
                    <div className="relative w-full h-full">
                      <canvas ref={canvasRef} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-primary text-on-primary text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        {currentAngle.replace('_', ' ').toUpperCase()} PHOTO CAPTURED
                      </div>
                    </div>
                  ) : (
                    /* 4. Fallback Preset Image Canvas */
                    <div className="relative w-full h-full">
                      <canvas ref={canvasRef} className="w-full h-full object-cover" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Overlay when processing AI image generation */}
            {isProcessingOmni && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center z-30">
                <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
                <h4 className="font-bold text-sm text-amber-300">
                  Synthesizing 360° Studio Look...
                </h4>
                <p className="text-xs text-amber-100 mt-1 max-w-xs leading-relaxed">
                  Generating <strong>Front</strong>, <strong>Left Profile</strong>, <strong>Right Profile</strong>, and <strong>Back View</strong> simultaneously!
                </p>
              </div>
            )}
          </div>

          {/* Controls Bar under Preview */}
          <div className="mt-3 flex gap-2">
            {captureMode === 'camera' && isCameraActive && !capturedImage && (
              <button
                type="button"
                onClick={handleSnapPhoto}
                className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs font-label-caps rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">photo_camera</span>
                Snap {currentAngle.replace('_', ' ')}
              </button>
            )}

            {capturedImage && (
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-label-caps rounded-xl border border-outline/10 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                Retake {currentAngle.replace('_', ' ')}
              </button>
            )}

            <button
              type="button"
              onClick={handleProcessOmniFlash}
              disabled={isProcessingOmni}
              className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs font-label-caps rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">360</span>
              Render All 360° Studio Angles
            </button>
          </div>

          {cameraError && (
            <p className="text-[11px] text-error mt-2 font-medium text-center">{cameraError}</p>
          )}

          {processingError && (
            <div className="mt-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-200">
              <span className="font-bold block">Notice:</span> {processingError}
            </div>
          )}
        </div>

        {/* Right Menu Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
              {['All', 'Braids & Locs', 'Short & Bob', 'Long & Waves', 'Curly & Afro'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-label-caps rounded-full whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container text-secondary hover:text-on-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Hairstyles Grid */}
            <h4 className="text-xs font-label-caps text-secondary font-bold mb-2">1. Select Hairstyle</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[180px] overflow-y-auto pr-1">
              {filteredStyles.map((style) => {
                const isSelected = selectedStyle.id === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setSelectedStyle(style);
                      clearAllAiResultImages();
                    }}
                    className={`text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                        : 'border-outline/10 hover:border-outline/30 bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">{style.iconSymbol}</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-on-surface line-clamp-1">{style.name}</h5>
                        <p className="text-[10px] text-secondary">{style.estimatedTime}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-primary shrink-0">{style.servicePrice}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color & Gradient Balayage Studio */}
            <div className="mb-4 bg-surface-container-lowest p-3.5 rounded-2xl border border-outline/10">
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-xs font-label-caps text-secondary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">palette</span>
                  2. Hair Color &amp; Balayage Studio
                </h4>

                {/* Color Mode Switcher */}
                <div className="flex bg-surface-container p-0.5 rounded-lg border border-outline/10">
                  <button
                    type="button"
                    onClick={() => { setColorMode('preset'); clearAllAiResultImages(); }}
                    className={`px-2.5 py-1 text-[10px] font-label-caps rounded transition-all ${
                      colorMode === 'preset' ? 'bg-primary text-on-primary font-bold' : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => { setColorMode('custom'); clearAllAiResultImages(); }}
                    className={`px-2.5 py-1 text-[10px] font-label-caps rounded transition-all ${
                      colorMode === 'custom' ? 'bg-primary text-on-primary font-bold' : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    Custom Hex
                  </button>
                  <button
                    type="button"
                    onClick={() => { setColorMode('gradient'); clearAllAiResultImages(); }}
                    className={`px-2.5 py-1 text-[10px] font-label-caps rounded transition-all ${
                      colorMode === 'gradient' ? 'bg-primary text-on-primary font-bold' : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    Multi-Tone Balayage
                  </button>
                </div>
              </div>

              {/* Mode A: Preset Shades */}
              {colorMode === 'preset' && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {COLOR_SHADES.map((shade) => {
                    const isSelected = selectedShade.id === shade.id;
                    return (
                      <button
                        key={shade.id}
                        type="button"
                        onClick={() => {
                          setSelectedShade(shade);
                          clearAllAiResultImages();
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                            : 'border-outline/10 bg-surface-container'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-sm shrink-0"
                          style={{ backgroundColor: shade.hex }}
                        />
                        <span className="text-xs font-bold text-on-surface block leading-tight">{shade.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mode B: Custom Solid Hex Color Picker */}
              {colorMode === 'custom' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-surface-container p-2 rounded-xl border border-outline/10 flex-1">
                      <input
                        type="color"
                        value={customHex}
                        onChange={(e) => { setCustomHex(e.target.value); clearAllAiResultImages(); }}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customHex}
                        onChange={(e) => { setCustomHex(e.target.value); clearAllAiResultImages(); }}
                        className="bg-transparent text-xs font-mono font-bold text-on-surface w-24 focus:outline-none uppercase"
                        placeholder="#HEX"
                      />
                    </div>

                    {/* Quick Swatches */}
                    <div className="flex items-center gap-1.5">
                      {['#E5C158', '#E63946', '#8A2BE2', '#00B4D8', '#2A9D8F', '#F4A261'].map(hex => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => { setCustomHex(hex); clearAllAiResultImages(); }}
                          className="w-6 h-6 rounded-full border border-white/40 shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode C: Multi-Tone Balayage & Ombre Gradient Picker */}
              {colorMode === 'gradient' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Root Color Picker */}
                    <div className="bg-surface-container p-2 rounded-xl border border-outline/10">
                      <label className="text-[10px] font-label-caps text-secondary block mb-1">Root / Base Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={rootHex}
                          onChange={(e) => { setRootHex(e.target.value); clearAllAiResultImages(); }}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={rootHex}
                          onChange={(e) => { setRootHex(e.target.value); clearAllAiResultImages(); }}
                          className="bg-transparent text-[11px] font-mono font-bold text-on-surface w-full uppercase focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Tip / Highlight Color Picker */}
                    <div className="bg-surface-container p-2 rounded-xl border border-outline/10">
                      <label className="text-[10px] font-label-caps text-secondary block mb-1">Tips / Highlights Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={tipHex}
                          onChange={(e) => { setTipHex(e.target.value); clearAllAiResultImages(); }}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={tipHex}
                          onChange={(e) => { setTipHex(e.target.value); clearAllAiResultImages(); }}
                          className="bg-transparent text-[11px] font-mono font-bold text-on-surface w-full uppercase focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technique Selector & Preview Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1">
                      {['Balayage', 'Ombre', 'Highlights', 'Split Tone'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => { setBalayageStyle(style as any); clearAllAiResultImages(); }}
                          className={`px-2.5 py-1 text-[10px] font-label-caps rounded-lg transition-all ${
                            balayageStyle === style
                              ? 'bg-amber-400 text-black font-bold shadow-sm'
                              : 'bg-surface-container text-secondary hover:text-on-surface'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    {/* Live Gradient Preview Bar */}
                    <div
                      className="h-6 w-28 rounded-lg border border-white/30 shadow-inner"
                      style={{
                        background: balayageStyle === 'Split Tone'
                          ? `linear-gradient(to right, ${rootHex} 50%, ${tipHex} 50%)`
                          : `linear-gradient(to right, ${rootHex}, ${tipHex})`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Gemini Hair Architect Dossier */}
            {aiDossier && (
              <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-primary/20 text-xs space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-primary flex items-center gap-1 font-label-caps">
                    <span className="material-symbols-outlined text-sm">psychology</span> Hair Architect Dossier
                  </span>
                  <span className="text-[10px] text-secondary">{aiDossier.estimatedTime}</span>
                </div>
                <p className="text-on-surface text-[11px] leading-relaxed">{aiDossier.faceShapeAnalysis}</p>
                {aiDossier.stylingTechnique && (
                  <p className="text-secondary text-[10px]">
                    <strong>Technique:</strong> {aiDossier.stylingTechnique}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Book Selected Hairstyle Action */}
          <div className="pt-3 border-t border-outline/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-label-caps text-secondary font-bold">Selected AI Look:</p>
              <p className="font-bold text-xs text-on-surface">
                {selectedStyle.name} • <span className="text-primary">
                  {colorMode === 'preset' ? selectedShade.name : colorMode === 'custom' ? `Custom Shade (${customHex})` : `Gradient ${balayageStyle}`}
                </span>
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-secondary">
                <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">schedule</span> {selectedStyle.estimatedTime}</span>
                <span>•</span>
                <span className="font-mono font-bold text-primary">{selectedStyle.servicePrice}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onBookStyle) {
                  const shadeLabel = colorMode === 'preset' ? selectedShade.name : colorMode === 'custom' ? `Custom ${customHex}` : `Gradient ${balayageStyle} (${rootHex} to ${tipHex})`;
                  onBookStyle(selectedStyle.name, shadeLabel, selectedStyle.servicePrice, selectedStyle.estimatedTime);
                }
              }}
              className="w-full sm:w-auto px-5 py-3 bg-primary text-on-primary text-xs font-label-caps rounded-xl shadow-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Book This Look ({selectedStyle.servicePrice} • {selectedStyle.estimatedTime})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AITryOn;
