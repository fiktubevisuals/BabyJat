import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { AdminNotifier } from './components/AdminNotifier';
import { LuxuryPageLoader } from './components/LuxuryPageLoader';
import { ClientLayout } from './layouts/ClientLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { StylistLayout } from './layouts/StylistLayout';

// Client Pages - Lazy Loaded
const Home = lazy(() => import('./pages/client/Home'));
const Services = lazy(() => import('./pages/client/Services'));
const Shop = lazy(() => import('./pages/client/Shop'));
const Profile = lazy(() => import('./pages/client/Profile'));
const Lookbook = lazy(() => import('./pages/client/Lookbook'));
const CopperMuse = lazy(() => import('./pages/client/CopperMuse'));
const LuminaSerum = lazy(() => import('./pages/client/LuminaSerum'));
const Cart = lazy(() => import('./pages/client/Cart'));
const GiftCards = lazy(() => import('./pages/client/GiftCards'));
const CheckoutCallback = lazy(() => import('./pages/client/CheckoutCallback'));
const Login = lazy(() => import('./pages/client/Login'));

// Admin Pages - Lazy Loaded
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminAppointments = lazy(() => import('./pages/admin/Appointments'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const PlatformFeatures = lazy(() => import('./pages/admin/PlatformFeatures'));
const POS = lazy(() => import('./pages/admin/POS'));
const ServicesManager = lazy(() => import('./pages/admin/ServicesManager'));
const StaffManager = lazy(() => import('./pages/admin/StaffManager'));
const ContentManager = lazy(() => import('./pages/admin/ContentManager'));

// Stylist Pages - Lazy Loaded
const StylistDashboard = lazy(() => import('./pages/stylist/Dashboard'));

export default function App() {
  return (
    <AuthProvider>
      <FeatureProvider>
        <CartProvider>
          <ToastProvider>
            <PWAInstallBanner />
            <AdminNotifier />
            <PushNotificationPrompt />
            <BrowserRouter>
              <Suspense fallback={<LuxuryPageLoader />}>
                <Routes>
                  {/* Client Routes */}
                  <Route path="/" element={<ClientLayout><Home /></ClientLayout>} />
                  <Route path="/services" element={<ClientLayout><Services /></ClientLayout>} />
                  <Route path="/shop" element={<ClientLayout><Shop /></ClientLayout>} />
                  <Route path="/profile" element={<ProtectedRoute><ClientLayout><Profile /></ClientLayout></ProtectedRoute>} />
                  <Route path="/lookbook" element={<ClientLayout><Lookbook /></ClientLayout>} />
                  <Route path="/lookbook/copper-muse" element={<ClientLayout><CopperMuse /></ClientLayout>} />
                  <Route path="/shop/lumina-serum" element={<ClientLayout><LuminaSerum /></ClientLayout>} />
                  <Route path="/gift-cards" element={<ClientLayout><GiftCards /></ClientLayout>} />
                  <Route path="/cart" element={<ClientLayout><Cart /></ClientLayout>} />
                  <Route path="/checkout/callback" element={<ClientLayout><CheckoutCallback /></ClientLayout>} />
                  <Route path="/login" element={<Login />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout><AdminOverview /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/pos" element={<ProtectedRoute requireAdmin><AdminLayout><POS /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/services-manager" element={<ProtectedRoute requireAdmin><AdminLayout><ServicesManager /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/content" element={<ProtectedRoute requireAdmin><AdminLayout><ContentManager /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/staff" element={<ProtectedRoute requireAdmin><AdminLayout><StaffManager /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/appointments" element={<ProtectedRoute requireAdmin><AdminLayout><AdminAppointments /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminLayout><AdminInventory /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/customers" element={<ProtectedRoute requireAdmin><AdminLayout><AdminCustomers /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/features" element={<ProtectedRoute requireAdmin><AdminLayout><PlatformFeatures /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
                  
                  {/* Stylist Routes */}
                  <Route path="/stylist" element={<ProtectedRoute requireRole="stylist"><StylistLayout><StylistDashboard /></StylistLayout></ProtectedRoute>} />
                  <Route path="/stylist/*" element={<ProtectedRoute requireRole="stylist"><StylistLayout><StylistDashboard /></StylistLayout></ProtectedRoute>} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </CartProvider>
      </FeatureProvider>
    </AuthProvider>
  );
}
