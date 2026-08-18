import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminNotifier } from '../components/AdminNotifier';
import { useAuth } from '../contexts/AuthContext';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const userAvatar = profile?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
  const userName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Admin';
  const userEmail = user?.email || profile?.email || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen font-body-md text-on-surface bg-background overflow-hidden">
      <AdminNotifier />
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline/5 p-6 space-y-6 z-40">
        <Link to="/" className="flex items-center space-x-3 mb-8 hover:opacity-90 transition-opacity">
          <div>
            <h1 className="font-headline-md text-2xl italic tracking-tight text-primary">BabyJat</h1>
            <p className="font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase">Salon Management</p>
          </div>
        </Link>
        <div className="flex-1 space-y-2">
          <Link to="/admin" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin' ? "'FILL' 1" : "" }}>dashboard</span>
            <span className="font-label-caps text-label-caps">Overview</span>
          </Link>
          <Link to="/admin/appointments" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/appointments' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/appointments' ? "'FILL' 1" : "" }}>calendar_month</span>
            <span className="font-label-caps text-label-caps">Appointments</span>
          </Link>
          <Link to="/admin/pos" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/pos' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/pos' ? "'FILL' 1" : "" }}>point_of_sale</span>
            <span className="font-label-caps text-label-caps">POS Checkout</span>
          </Link>
          <Link to="/admin/inventory" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/inventory' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/inventory' ? "'FILL' 1" : "" }}>inventory_2</span>
            <span className="font-label-caps text-label-caps">Inventory</span>
          </Link>
          <Link to="/admin/services-manager" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/services-manager' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/services-manager' ? "'FILL' 1" : "" }}>spa</span>
            <span className="font-label-caps text-label-caps">Services Menu</span>
          </Link>
          <Link to="/admin/staff" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/staff' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/staff' ? "'FILL' 1" : "" }}>badge</span>
            <span className="font-label-caps text-label-caps">Staff & Scheduling</span>
          </Link>
          <Link to="/admin/customers" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/customers' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/customers' ? "'FILL' 1" : "" }}>group</span>
            <span className="font-label-caps text-label-caps">Users & Roles</span>
          </Link>
          <Link to="/admin/features" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/features' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/features' ? "'FILL' 1" : "" }}>settings</span>
            <span className="font-label-caps text-label-caps">Platform Features</span>
          </Link>
          <Link to="/admin/reports" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${location.pathname === '/admin/reports' ? 'bg-primary text-on-primary font-bold shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] scale-[0.98]' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:bg-primary-container/10'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/admin/reports' ? "'FILL' 1" : "" }}>bar_chart</span>
            <span className="font-label-caps text-label-caps">Reports</span>
          </Link>
        </div>
        <div className="space-y-3">
          <button className="w-full py-3 bg-primary text-on-primary font-label-caps text-label-caps rounded-xl shadow-[0_8px_15px_-5px_rgba(182,0,85,0.3)] hover:opacity-90 transition-opacity">
              New Appointment
          </button>
          <Link to="/" className="flex items-center justify-center space-x-2 w-full py-3 bg-surface-container border border-outline/10 text-on-surface-variant font-label-caps text-label-caps rounded-xl hover:bg-surface-variant/50 transition-colors">
            <span className="material-symbols-outlined text-sm">storefront</span>
            <span>View Storefront</span>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 w-full min-h-screen">
        {/* TopNavBar */}
        <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 bg-surface/80 backdrop-blur-xl border-b border-outline/10 docked full-width top-0 sticky z-50 shadow-[0_4px_20px_-10px_rgba(182,0,85,0.05)]">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-headline-md text-headline-md-mobile italic tracking-tight text-primary md:hidden lg:block">
              BabyJat <span className="font-sans not-italic text-xs text-secondary font-normal ml-1">Admin</span>
            </Link>
            <button className="md:hidden text-primary ml-2">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 text-body-md font-body-md outline-none" placeholder="Search..." type="text" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/" className="md:hidden text-secondary hover:text-primary transition-colors duration-200">
              <span className="material-symbols-outlined">storefront</span>
            </Link>

            {/* Authenticated Admin Profile Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-outline/10">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/20 shadow-sm flex-shrink-0 bg-surface-variant">
                <img alt={userName} className="w-full h-full object-cover" src={userAvatar} />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-label-caps text-xs text-on-surface font-bold leading-tight">{userName}</span>
                <span className="font-body-md text-[11px] text-secondary truncate max-w-[150px]">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-colors ml-1"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
