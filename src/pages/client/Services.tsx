import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { BookingModal } from '../../components/modals/BookingModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BeforeAfterCarousel } from '../../components/BeforeAfterCarousel';
import { SEOHead } from '../../components/SEOHead';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export default function Services() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{name: string, price: number, durationMinutes?: number} | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'services'), orderBy('category'), orderBy('name')), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
      setLoading(false);
    }, (err) => {
      console.warn("Services snapshot ended:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleBookClick = (name: string, price: number, durationMinutes?: number) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/services' } } });
      return;
    }
    setSelectedService({ name, price, durationMinutes });
    setModalOpen(true);
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-stack-md md:pb-stack-lg">
      <SEOHead pageKey="services" />
      <div className="mb-stack-lg text-center">
        <h1 className="font-display-lg text-display-lg text-on-background mb-stack-sm">Our Services</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">Experience high-end salon treatments tailored to your unique style. We specialize in precision, color, and absolute luxury.</p>
      </div>

      {/* AI Try-On Interactive Banner */}
      <div className="mb-stack-lg bg-gradient-to-r from-primary/10 via-surface-container-high to-primary/5 p-6 md:p-8 rounded-3xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold font-label-caps rounded-full uppercase tracking-wider">
            New AI Studio Feature
          </span>
          <h2 className="font-headline-md text-2xl md:text-3xl text-on-surface">Not Sure Which Color Suits You?</h2>
          <p className="text-secondary text-xs md:text-sm max-w-xl">
            Upload a selfie or test our base hair models with our <strong>AI Hairstyle & Hair Color Try-On Studio</strong>. Preview 7 signature shade formulations with real-time intensity and shine adjustments before booking!
          </p>
        </div>
        <button
          onClick={() => {
            const btn = document.querySelector('header button span[aria-hidden="true"]') || document.querySelector('button:has(span:contains("AI Try-On"))');
            // Dispatch custom event or click layout button
            window.dispatchEvent(new CustomEvent('open-ai-try-on'));
          }}
          className="shrink-0 px-6 py-3.5 bg-primary text-on-primary font-label-caps text-xs rounded-full shadow-lg hover:opacity-90 transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">auto_fix_high</span>
          LAUNCH AI TRY-ON
        </button>
      </div>

      <section className="mb-stack-lg md:mb-stack-xl">
        <div className="mb-6 text-center">
          <h2 className="font-headline-lg text-headline-lg text-on-background">Signature Transformations</h2>
          <p className="font-body-md text-on-surface-variant mt-2">Swipe to see real results from our recent clients.</p>
        </div>
        <BeforeAfterCarousel />
      </section>

      {loading ? (
        <div className="py-20 text-center text-secondary font-label-caps">Loading services...</div>
      ) : Object.keys(groupedServices).length === 0 ? (
        <div className="py-20 text-center text-secondary font-label-caps">No services available at the moment.</div>
      ) : (
        (Object.entries(groupedServices) as [string, Service[]][]).map(([category, categoryServices]) => (
          <section key={category} className="mb-stack-lg">
            <div className="mb-stack-md py-4 border-b-2 border-on-background/10">
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">{category}</h2>
            </div>
            
            <div className="flex flex-col gap-8">
              {categoryServices.map((service) => {
                const images = service.imageUrls || (service.imageUrl ? [service.imageUrl] : []);
                return (
                  <div key={service.id} className="flex flex-col md:flex-row gap-6 p-4 md:p-6 rounded-2xl bg-surface-container-lowest border border-outline/10 hover:shadow-md transition-shadow">
                    
                    {/* Service Info */}
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-headline-md text-headline-md text-on-background">{service.name}</h3>
                        <span className="font-body-lg text-body-lg text-on-background font-bold whitespace-nowrap bg-primary/10 px-3 py-1 rounded-full text-primary">UGX {service.price.toLocaleString()}</span>
                      </div>
                      
                      {service.description && (
                        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{service.description}</p>
                      )}
                      
                      <div className="mt-auto pt-6 flex items-center justify-between">
                        <span className="font-label-caps text-label-caps text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span> {service.durationMinutes} mins
                        </span>
                        <button 
                          onClick={() => handleBookClick(service.name, service.price, service.durationMinutes)} 
                          className="bg-primary text-on-primary px-8 py-2.5 rounded-full font-label-caps text-label-caps hover:bg-surface-tint transition-colors active:scale-95 shadow-sm"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>

                    {/* Service Images Gallery */}
                    {images.length > 0 && (
                      <div className="w-full md:w-1/3 xl:w-2/5 shrink-0">
                        <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory hide-scrollbar">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative w-40 sm:w-48 shrink-0 aspect-[4/5] rounded-xl overflow-hidden snap-center border border-outline/10 bg-black/5 dark:bg-black/20">
                              <img src={img} alt={`${service.name} preview ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {selectedService && (
        <BookingModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          serviceName={selectedService.name} 
          price={selectedService.price} 
          durationMinutes={selectedService.durationMinutes}
        />
      )}
    </main>
  );
}
