import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { HairTryOnModal } from '../components/HairTryOnModal';
import { BookingModal } from '../components/modals/BookingModal';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, profile } = useAuth();

  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    serviceName: string;
    price: number;
    initialShade: string;
  } | null>(null);

  useEffect(() => {
    const handleOpenTryOn = () => setIsTryOnOpen(true);
    window.addEventListener('open-ai-try-on', handleOpenTryOn);
    return () => window.removeEventListener('open-ai-try-on', handleOpenTryOn);
  }, []);

  return (
    <div className="min-h-screen pb-24 md:pb-0 pt-16">
      {/* TopAppBar (Web) */}
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md shadow-[0_4px_20px_rgba(182,0,85,0.05)] border-b-[0.5px] border-on-background/10">
        <div className="flex items-center justify-between px-margin-mobile h-16 w-full max-w-container-max mx-auto">
          <button aria-label="Menu" className="text-primary dark:text-inverse-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md-mobile italic tracking-tight text-primary dark:text-inverse-primary">
            BabyJat
          </Link>
          <nav className="hidden md:flex gap-6 items-center font-label-caps text-label-caps">
            <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-primary dark:text-inverse-primary' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Home</Link>
            <Link to="/services" className={`transition-colors ${location.pathname === '/services' ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Services</Link>
            <Link to="/shop" className={`transition-colors ${location.pathname === '/shop' ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Shop</Link>
            <Link to="/gift-cards" className={`transition-colors ${location.pathname === '/gift-cards' ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Gift Cards</Link>
            
            {/* AI Try-On Launch Button */}
            <button
              onClick={() => setIsTryOnOpen(true)}
              className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-full flex items-center gap-1 transition-all active:scale-95 border border-primary/20 font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>AI Try-On</span>
            </button>

            {user ? (
              <Link to="/profile" className={`transition-colors ${location.pathname === '/profile' ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Profile</Link>
            ) : (
              <Link to="/login" className={`transition-colors ${location.pathname === '/login' ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>Sign In</Link>
            )}
            {profile?.role === 'admin' && (
              <Link to="/admin" className={`transition-colors flex items-center gap-1 ${location.pathname.startsWith('/admin') ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Admin
              </Link>
            )}
            {profile?.role === 'stylist' && (
              <Link to="/stylist" className={`transition-colors flex items-center gap-1 ${location.pathname.startsWith('/stylist') ? 'text-primary dark:text-inverse-primary border-b-2 border-primary pb-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary'}`}>
                <span className="material-symbols-outlined text-[18px]">content_cut</span>
                Stylist
              </Link>
            )}
          </nav>
          <Link to="/cart" aria-label="Shopping Bag" className="relative text-primary dark:text-inverse-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform">
            <span className="material-symbols-outlined">shopping_bag</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* TopAppBar (Mobile) */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md shadow-[0_4px_20px_rgba(182,0,85,0.05)] border-b-[0.5px] border-on-background/10">
        <div className="flex items-center justify-between px-margin-mobile h-16 w-full">
          <button aria-label="Menu" className="text-primary dark:text-inverse-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md-mobile italic tracking-tight text-primary dark:text-inverse-primary">
            BabyJat
          </Link>
          <Link to="/cart" aria-label="Shopping Bag" className="relative text-primary dark:text-inverse-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform">
            <span className="material-symbols-outlined">shopping_bag</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {children}

      {/* Global Modals for AI Try-On & Shade Booking */}
      <HairTryOnModal
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        onBookShade={(styleName, shadeName, priceStr) => {
          setIsTryOnOpen(false);
          // Extract numeric price from format like "UGX 250,000" or default to 200000
          const numericPrice = priceStr ? parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 200000 : 200000;
          setBookingDetails({
            serviceName: `${styleName} (${shadeName})`,
            price: numericPrice,
            initialShade: shadeName
          });
        }}
      />

      {bookingDetails && (
        <BookingModal
          isOpen={Boolean(bookingDetails)}
          onClose={() => setBookingDetails(null)}
          serviceName={bookingDetails.serviceName}
          price={bookingDetails.price}
          initialShade={bookingDetails.initialShade}
        />
      )}

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-full bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md shadow-[0_-4px_20px_rgba(182,0,85,0.05)] border-t-[0.5px] border-on-background/10">
        <div className="flex justify-around items-center h-20 px-4 pb-2">
          <Link to="/" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname === '/' ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
            <span className={`material-symbols-outlined ${location.pathname === '/' ? 'fill-1' : ''}`}>home</span>
            <span className="font-label-caps text-label-caps mt-1">Home</span>
          </Link>
          <Link to="/services" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname === '/services' ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
            <span className={`material-symbols-outlined ${location.pathname === '/services' ? 'fill-1' : ''}`}>content_cut</span>
            <span className="font-label-caps text-label-caps mt-1">Services</span>
          </Link>
          <Link to="/shop" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname === '/shop' ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
            <span className={`material-symbols-outlined ${location.pathname === '/shop' ? 'fill-1' : ''}`}>local_mall</span>
            <span className="font-label-caps text-label-caps mt-1">Shop</span>
          </Link>
          {user ? (
            <Link to="/profile" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname === '/profile' ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
              <span className={`material-symbols-outlined ${location.pathname === '/profile' ? 'fill-1' : ''}`}>person</span>
              <span className="font-label-caps text-label-caps mt-1">Profile</span>
            </Link>
          ) : (
            <Link to="/login" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname === '/login' ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
              <span className={`material-symbols-outlined ${location.pathname === '/login' ? 'fill-1' : ''}`}>login</span>
              <span className="font-label-caps text-label-caps mt-1">Sign In</span>
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link to="/admin" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname.startsWith('/admin') ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
              <span className={`material-symbols-outlined ${location.pathname.startsWith('/admin') ? 'fill-1' : ''}`}>admin_panel_settings</span>
              <span className="font-label-caps text-label-caps mt-1">Admin</span>
            </Link>
          )}
          {profile?.role === 'stylist' && (
            <Link to="/stylist" className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 ${location.pathname.startsWith('/stylist') ? 'text-primary dark:text-inverse-primary bg-primary-fixed/20 rounded-full px-4 py-1' : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
              <span className={`material-symbols-outlined ${location.pathname.startsWith('/stylist') ? 'fill-1' : ''}`}>content_cut</span>
              <span className="font-label-caps text-label-caps mt-1">Stylist</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
