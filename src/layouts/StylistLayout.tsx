import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function StylistLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const userAvatar = user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
  const userName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Stylist';
  const userEmail = user?.email || profile?.email || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen font-body-md text-on-surface bg-background overflow-hidden">
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline/5 p-6 space-y-6 z-40">
        <Link to="/" className="flex items-center space-x-3 mb-8 hover:opacity-90 transition-opacity">
          <div>
            <h1 className="font-headline-md text-2xl italic tracking-tight text-primary">BabyJat</h1>
            <p className="font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase">Stylist Portal</p>
          </div>
        </Link>
        <div className="flex-1 space-y-2">
          <Link to="/stylist" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/stylist' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/stylist' ? "'FILL' 1" : "" }}>dashboard</span>
            <span className="font-label-caps text-label-caps">My Dashboard</span>
          </Link>
          <Link to="/stylist/schedule" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/stylist/schedule' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/stylist/schedule' ? "'FILL' 1" : "" }}>calendar_month</span>
            <span className="font-label-caps text-label-caps">Schedule</span>
          </Link>
          <Link to="/stylist/clients" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/stylist/clients' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/stylist/clients' ? "'FILL' 1" : "" }}>group</span>
            <span className="font-label-caps text-label-caps">My Clients</span>
          </Link>
        </div>
        
        <div className="pt-6 border-t border-outline/10 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <img src={userAvatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-outline/20" />
            <div className="truncate">
              <p className="font-label-caps text-xs font-bold text-on-surface truncate">{userName}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{userEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-secondary hover:text-error transition-colors p-2" title="Sign Out">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 relative min-h-screen pb-20 md:pb-0 h-screen overflow-y-auto">
        <header className="md:hidden flex items-center justify-between p-margin-mobile border-b border-outline/10 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
          <Link to="/" className="flex flex-col">
            <span className="font-headline-md text-xl italic text-primary leading-none">BabyJat</span>
            <span className="text-[8px] font-label-caps text-on-surface-variant uppercase tracking-widest mt-0.5">Stylist Portal</span>
          </Link>
          <div className="flex items-center gap-4">
            <img src={userAvatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-outline/20" />
            <button onClick={handleLogout} className="text-secondary">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <div className="p-margin-mobile md:p-margin-desktop w-full mx-auto max-w-7xl animate-fade-in">
          {children}
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-md border-t border-outline/10 px-6 py-3 flex justify-between items-center pb-safe">
        <Link to="/stylist" className={`flex flex-col items-center ${location.pathname === '/stylist' ? 'text-primary' : 'text-on-surface-variant'}`}>
          <span className={`material-symbols-outlined text-2xl ${location.pathname === '/stylist' ? 'fill-1' : ''}`}>dashboard</span>
          <span className="text-[10px] font-label-caps mt-1">Dash</span>
        </Link>
        <Link to="/stylist/schedule" className={`flex flex-col items-center ${location.pathname === '/stylist/schedule' ? 'text-primary' : 'text-on-surface-variant'}`}>
          <span className={`material-symbols-outlined text-2xl ${location.pathname === '/stylist/schedule' ? 'fill-1' : ''}`}>calendar_month</span>
          <span className="text-[10px] font-label-caps mt-1">Schedule</span>
        </Link>
        <Link to="/stylist/clients" className={`flex flex-col items-center ${location.pathname === '/stylist/clients' ? 'text-primary' : 'text-on-surface-variant'}`}>
          <span className={`material-symbols-outlined text-2xl ${location.pathname === '/stylist/clients' ? 'fill-1' : ''}`}>group</span>
          <span className="text-[10px] font-label-caps mt-1">Clients</span>
        </Link>
      </nav>
    </div>
  );
}
