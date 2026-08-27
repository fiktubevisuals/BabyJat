import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TransformationItem {
  id: string;
  client: string;
  service: string;
  before: string;
  after: string;
  createdAt?: any;
}

const defaultTransformations: TransformationItem[] = [
  {
    id: '1',
    client: "Sarah M.",
    service: "Full Balayage & Styling",
    before: "https://images.unsplash.com/photo-1512413346517-573523f2b489?w=800&q=80",
    after: "https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?w=800&q=80",
  },
  {
    id: '2',
    client: "Elena R.",
    service: "Luxury Blowout",
    before: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=80",
    after: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80",
  },
  {
    id: '3',
    client: "Jessica T.",
    service: "Signature Precision Cut",
    before: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=800&q=80",
    after: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  }
];

export function BeforeAfterCarousel() {
  const [transformations, setTransformations] = useState<TransformationItem[]>(defaultTransformations);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'transformations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransformationItem));
        setTransformations(fetched);
      } else {
        setTransformations(defaultTransformations);
      }
    }, (err) => {
      console.warn("Transformations snapshot error:", err);
    });

    return () => unsub();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % transformations.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + transformations.length) % transformations.length);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-surface-container-low shadow-sm border-[0.5px] border-on-background/10 group">
      <div 
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {transformations.map((item) => (
          <div key={item.id} className="min-w-full flex flex-col md:flex-row">
            {/* Before */}
            <div className="relative w-full md:w-1/2 h-64 md:h-[400px]">
              <img 
                src={item.before} 
                alt={`${item.client} Before`} 
                className="w-full h-full object-cover grayscale-[20%]" 
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full font-label-caps text-label-caps tracking-wider">
                Before
              </div>
            </div>
            
            {/* After */}
            <div className="relative w-full md:w-1/2 h-64 md:h-[400px]">
              <img 
                src={item.after} 
                alt={`${item.client} After`} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute top-4 right-4 bg-primary text-on-primary shadow-md px-3 py-1 rounded-full font-label-caps text-label-caps tracking-wider">
                After
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <h3 className="text-white font-headline-md">{item.client}</h3>
                <p className="text-white/80 font-body-sm mt-1">{item.service}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg transition-transform active:scale-95 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 md:block hidden"
        aria-label="Previous transformation"
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg transition-transform active:scale-95 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 md:block hidden"
        aria-label="Next transformation"
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </button>
      
      {/* Mobile Controls (Always visible on mobile) */}
      <button 
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 text-black p-2 rounded-full shadow-lg active:scale-95 z-10 md:hidden"
        aria-label="Previous transformation"
      >
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 text-black p-2 rounded-full shadow-lg active:scale-95 z-10 md:hidden"
        aria-label="Next transformation"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {transformations.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentIndex === idx ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
