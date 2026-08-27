import { useState, useEffect } from 'react';
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

const ITEMS_PER_PAGE = 8;

export default function Shop() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('All');

  const fetchProducts = async (isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      let q = query(
        collection(db, 'products'),
        where('category', '==', 'retail'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );
      
      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, 'products'),
          where('category', '==', 'retail'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(ITEMS_PER_PAGE)
        );
      }
      
      const snapshot = await getDocs(q);
      const fetched: Product[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Product);
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

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const displayedProducts = filter === 'All' ? products : products.filter(p => p.category === filter);

  return (
    <main className="pt-8 md:pt-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEOHead pageKey="shop" />
      {/* Header Section */}
      <section className="mb-stack-md md:mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg mb-2">Curated Accessories</h1>
          <p className="text-secondary max-w-md">Elevate your everyday look with our premium selection of hair accessories and care essentials.</p>
        </div>
        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-2 rounded-full font-label-caps text-label-caps transition-all active:scale-95 ${
                filter === cat 
                  ? 'bg-tertiary-container text-on-tertiary-container' 
                  : 'border border-on-background/10 text-secondary hover:border-primary/30 hover:text-primary'
              }`}
            >
              {cat === 'retail' && (filter as string) !== 'retail' ? 'General' : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      {products.length === 0 && !loading ? (
        <div className="py-20 text-center text-secondary font-label-caps">No products available at the moment.</div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-stack-lg">
            {displayedProducts.map(product => (
              <article key={product.id} className="group flex flex-col gap-3">
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
