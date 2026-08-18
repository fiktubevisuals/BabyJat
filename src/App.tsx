import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ClientLayout } from './layouts/ClientLayout';
import { AdminLayout } from './layouts/AdminLayout';

import Home from './pages/client/Home';
import Services from './pages/client/Services';
import Shop from './pages/client/Shop';
import Profile from './pages/client/Profile';
import Lookbook from './pages/client/Lookbook';
import CopperMuse from './pages/client/CopperMuse';
import LuminaSerum from './pages/client/LuminaSerum';
import Cart from './pages/client/Cart';
import CheckoutCallback from './pages/client/CheckoutCallback';
import Login from './pages/client/Login';

import AdminOverview from './pages/admin/Overview';
import AdminAppointments from './pages/admin/Appointments';
import AdminInventory from './pages/admin/Inventory';
import AdminCustomers from './pages/admin/Customers';
import AdminReports from './pages/admin/Reports';
import PlatformFeatures from './pages/admin/PlatformFeatures';
import POS from './pages/admin/POS';
import ServicesManager from './pages/admin/ServicesManager';
import StaffManager from './pages/admin/StaffManager';

export default function App() {
  return (
    <AuthProvider>
      <FeatureProvider>
        <CartProvider>
          <ToastProvider>
            <PWAInstallBanner />
            <BrowserRouter>
              <Routes>
            {/* Client Routes */}
            <Route path="/" element={<ClientLayout><Home /></ClientLayout>} />
            <Route path="/services" element={<ClientLayout><Services /></ClientLayout>} />
            <Route path="/shop" element={<ClientLayout><Shop /></ClientLayout>} />
            <Route path="/profile" element={<ProtectedRoute><ClientLayout><Profile /></ClientLayout></ProtectedRoute>} />
            <Route path="/lookbook" element={<ClientLayout><Lookbook /></ClientLayout>} />
            <Route path="/lookbook/copper-muse" element={<ClientLayout><CopperMuse /></ClientLayout>} />
            <Route path="/shop/lumina-serum" element={<ClientLayout><LuminaSerum /></ClientLayout>} />
            <Route path="/cart" element={<ClientLayout><Cart /></ClientLayout>} />
            <Route path="/checkout/callback" element={<ClientLayout><CheckoutCallback /></ClientLayout>} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout><AdminOverview /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/pos" element={<ProtectedRoute requireAdmin><AdminLayout><POS /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/services-manager" element={<ProtectedRoute requireAdmin><AdminLayout><ServicesManager /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/staff" element={<ProtectedRoute requireAdmin><AdminLayout><StaffManager /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute requireAdmin><AdminLayout><AdminAppointments /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminLayout><AdminInventory /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute requireAdmin><AdminLayout><AdminCustomers /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/features" element={<ProtectedRoute requireAdmin><AdminLayout><PlatformFeatures /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </CartProvider>
      </FeatureProvider>
    </AuthProvider>
  );
}
