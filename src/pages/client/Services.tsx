import { Link } from 'react-router-dom';
import { useState } from 'react';
import { BookingModal } from '../../components/modals/BookingModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BeforeAfterCarousel } from '../../components/BeforeAfterCarousel';

export default function Services() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{name: string, price: number} | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookClick = (name: string, price: number) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/services' } } });
      return;
    }
    setSelectedService({ name, price });
    setModalOpen(true);
  };

  return (
    <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-md md:py-stack-lg">
      <div className="mb-stack-lg text-center">
        <h1 className="font-display-lg text-display-lg text-on-background mb-stack-sm">Our Services</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">Experience high-end salon treatments tailored to your unique style. We specialize in precision, color, and absolute luxury.</p>
      </div>

      <section className="mb-stack-lg md:mb-stack-xl">
        <div className="mb-6 text-center">
          <h2 className="font-headline-lg text-headline-lg text-on-background">Signature Transformations</h2>
          <p className="font-body-md text-on-surface-variant mt-2">Swipe to see real results from our recent clients.</p>
        </div>
        <BeforeAfterCarousel />
      </section>

      {/* Service Category: Haircuts */}
      <section className="mb-stack-lg">
        <div className="relative h-48 md:h-64 w-full mb-stack-md overflow-hidden rounded-xl bg-surface-variant">
          <img className="object-cover w-full h-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBnHJWb4JTI5eDA6geasjxTu_LUIQvZYq3QMW0ihyTvoNYiHjnyCVULkXCg2kExTvAwMunVsgNI3QcAMh4Uc4cnqrIZRkLc6HNDBttgIRS8fF6768tlRLa0OK-1-c1EPXV3fN7oXYp4NoBbZaTQH4LIF1S_TWwXFBcNWhPpoE61Z8EdAwlQMg1ylQlyCoLFJvnHmH88fEMScsE4A2yiWEKgdPAeayyAxvletEJX3mTZaUtNnxT4kfGjg" alt="Haircuts & Styling" />
          <div className="absolute inset-0 bg-black/20 flex items-end p-6">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white">Haircuts & Styling</h2>
          </div>
        </div>
        <div className="flex flex-col">
          {/* Service Item */}
          <div className="flex items-center justify-between py-4 border-b-[0.5px] border-on-background/20 group hover:bg-surface-container-low transition-colors px-2">
            <div className="flex flex-col max-w-[60%]">
              <h3 className="font-headline-md text-headline-md text-on-background">Signature Precision Cut</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Includes consultation, wash, customized cut, and blowout.</p>
              <span className="font-label-caps text-label-caps text-secondary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 60 mins</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body-lg text-body-lg text-on-background">UGX 120</span>
              <button onClick={() => handleBookClick('Signature Precision Cut', 120)} className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-tint transition-colors active:scale-95 hidden md:block">Book</button>
            </div>
          </div>
          {/* Service Item */}
          <div className="flex items-center justify-between py-4 border-b-[0.5px] border-on-background/20 group hover:bg-surface-container-low transition-colors px-2">
            <div className="flex flex-col max-w-[60%]">
              <h3 className="font-headline-md text-headline-md text-on-background">Luxury Blowout</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Wash, scalp massage, and lasting voluminous styling.</p>
              <span className="font-label-caps text-label-caps text-secondary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 45 mins</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body-lg text-body-lg text-on-background">UGX 65</span>
              <button onClick={() => handleBookClick('Luxury Blowout', 65)} className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-tint transition-colors active:scale-95 hidden md:block">Book</button>
            </div>
          </div>
        </div>
      </section>

      {/* Service Category: Coloring */}
      <section className="mb-stack-lg">
        <div className="relative h-48 md:h-64 w-full mb-stack-md overflow-hidden rounded-xl bg-surface-variant">
          <img className="object-cover w-full h-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZoyR4s5SFIzROCccyfOeRhcsdwYXiDolHvJXqxS6wRZQmBsdEnm3w0l6o5icQEmoZcGlgGOwulD5GWXXIWiT39dH7QcdXX5p4prUmQF_p63h5BgJkTWhETRgpabMEOy2y0RNQ6UVxjxHcouaZDlDOXfyVjICBKuSQN0qW2HMvFu6152Su66FGXq9Sfrb3S0zPWf0wWPTZrxy35szuTk3EgUVKHeihlxmhWu-CxGnaQmzl6d3IuOUBOQ" alt="Color & Highlights" />
          <div className="absolute inset-0 bg-black/20 flex items-end p-6">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white">Color & Highlights</h2>
          </div>
        </div>
        <div className="flex flex-col">
          {/* Service Item */}
          <div className="flex items-center justify-between py-4 border-b-[0.5px] border-on-background/20 group hover:bg-surface-container-low transition-colors px-2">
            <div className="flex flex-col max-w-[60%]">
              <h3 className="font-headline-md text-headline-md text-on-background">Full Balayage</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Hand-painted, natural-looking sunkissed highlights.</p>
              <span className="font-label-caps text-label-caps text-secondary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 180 mins</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body-lg text-body-lg text-on-background">UGX 250</span>
              <button onClick={() => handleBookClick('Full Balayage', 250)} className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-tint transition-colors active:scale-95 hidden md:block">Book</button>
            </div>
          </div>
          {/* Service Item */}
          <div className="flex items-center justify-between py-4 border-b-[0.5px] border-on-background/20 group hover:bg-surface-container-low transition-colors px-2">
            <div className="flex flex-col max-w-[60%]">
              <h3 className="font-headline-md text-headline-md text-on-background">Single Process Color</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">All-over color application for rich, consistent tone.</p>
              <span className="font-label-caps text-label-caps text-secondary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 90 mins</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body-lg text-body-lg text-on-background">UGX 140</span>
              <button onClick={() => handleBookClick('Single Process Color', 140)} className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-tint transition-colors active:scale-95 hidden md:block">Book</button>
            </div>
          </div>
        </div>
      </section>

      {selectedService && (
        <BookingModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          serviceName={selectedService.name} 
          price={selectedService.price} 
        />
      )}
    </main>
  );
}
