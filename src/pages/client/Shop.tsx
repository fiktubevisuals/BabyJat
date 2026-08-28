import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SEOHead } from '../../components/SEOHead';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

const ITEMS_PER_PAGE = 20;

function ProductCarousel({ title, products, handleAddToCart }: { key?: string | number, title: string, products: Product[], handleAddToCart: (id: string, name: string, price: number, image: string) => void }) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="font-headline-md text-headline-md mb-4">{title}</h2>
      <div className="relative group/carousel">
        <button 
          onClick={scrollLeft} 
          className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-surface/90 backdrop-blur shadow-xl rounded-full hidden md:flex items-center justify-center text-primary opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        <section ref={carouselRef} className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 no-scrollbar scroll-smooth">
          {products.map(product => (
            <article key={product.id} className="group flex flex-col gap-3 shrink-0 w-[70vw] sm:w-[45vw] md:w-[28vw] lg:w-[22vw] snap-start">
              <div className="relative bg-surface-container-low aspect-[4/5] overflow-hidden rounded-sm ambient-glow transition-shadow duration-300">
                {product.imageUrl ? (
                  <img loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={product.imageUrl} alt={product.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-variant">
                    <span className="material-symbols-outlined text-4xl text-secondary/50">local_mall</span>
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-surface/80 to-transparent backdrop-blur-[2px]">
                  {product.stock > 0 ? (
                    <button onClick={(e) => { e.preventDefault(); handleAddToCart(product.id, product.name, product.price, product.imageUrl || ''); }} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors shadow-lg flex justify-center items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      Quick Add
                    </button>
                  ) : (
                    <div className="w-full bg-surface-variant text-secondary py-3 font-label-caps text-label-caps text-center cursor-not-allowed">
                      Out of Stock
                    </div>
                  )}
                </div>
                
                {product.stock < 5 && product.stock > 0 && (
                  <div className="absolute top-3 left-3 bg-error-container text-error px-2 py-1 font-label-caps text-[10px] tracking-wider rounded-sm">ONLY {product.stock} LEFT</div>
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="font-body-lg text-body-lg font-semibold truncate">{product.name}</h3>
                <p className="text-secondary mt-1">UGX {product.price.toLocaleString()}</p>
              </div>
            </article>
          ))}
        </section>
        
        <button 
          onClick={scrollRight} 
          className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-surface/90 backdrop-blur shadow-xl rounded-full hidden md:flex items-center justify-center text-primary opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

export default function Shop() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = async (isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      // Fetch all products that are NOT backbar. 
      // We'll fetch all and filter locally to support any category string without needing a composite index.
      let q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );
      
      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(ITEMS_PER_PAGE)
        );
      }
      
      const snapshot = await getDocs(q);
      const fetched: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Product;
        if (data.category !== 'backbar') {
          fetched.push({ id: doc.id, ...data });
        }
      });
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...fetched]);
      } else {
        setProducts(fetched);
      }
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (fetched.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Shop fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddToCart = (id: string, name: string, price: number, image: string) => {
    addToCart({ id, name, price, quantity: 1, image });
  };

  // Group products by category
  const categorizedProducts = products.reduce<Record<string, Product[]>>((acc, product) => {
    const cat = product.category === 'retail' ? 'General Retail' : product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  // Auto-playing hero carousel
  const [currentHero, setCurrentHero] = useState(0);
  const heroSlides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&q=80',
      title: 'Summer Collection',
      subtitle: 'Lightweight silk accessories for the season.'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80',
      title: 'Luxury Extensions',
      subtitle: 'Premium quality 100% human hair.'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80',
      title: 'Healthy Hair Essentials',
      subtitle: 'Nourish and protect with our signature line.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <main className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEOHead pageKey="shop" />
      
      {/* Hero Carousel */}
      <div className="relative w-full aspect-[2/1] md:aspect-[4/1] bg-surface-container-low rounded-2xl overflow-hidden mb-stack-lg group">
        {heroSlides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentHero ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-background/90 via-background/40 to-transparent flex flex-col justify-end md:justify-center px-6 md:px-16 pb-10 md:pb-0">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-background max-w-lg mb-2 leading-tight">
                {slide.title}
              </h2>
              <p className="font-body-lg text-secondary max-w-md mb-6">{slide.subtitle}</p>
              <button className="bg-primary text-on-primary w-fit px-6 py-3 rounded-full font-label-caps text-label-caps hover:opacity-90 transition-opacity uppercase tracking-widest shadow-lg">
                Shop Now
              </button>
            </div>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrentHero(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${idx === currentHero ? 'bg-primary w-4' : 'bg-on-background/30 hover:bg-on-background/50'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Header Section */}
      <section className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg mb-2">Curated Accessories</h1>
          <p className="text-secondary max-w-md">Elevate your everyday look with our premium selection of hair accessories and care essentials.</p>
        </div>
      </section>

      {/* Product Rows */}
      {products.length === 0 && !loading ? (
        <div className="py-20 text-center text-secondary font-label-caps">No products available at the moment.</div>
      ) : (
        <>
          {Object.entries(categorizedProducts).map(([category, prods]) => (
            <ProductCarousel key={category} title={category} products={prods as Product[]} handleAddToCart={handleAddToCart} />
          ))}
          
          {hasMore && (
            <div className="text-center mt-12 mb-8">
              <button 
                onClick={() => fetchProducts(true)}
                disabled={loading}
                className="px-8 py-3 rounded-full border border-primary text-primary font-bold hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Products'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
