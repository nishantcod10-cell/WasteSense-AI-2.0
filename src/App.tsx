import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingLayout from './layouts/LandingLayout';
import AppLayout from './layouts/AppLayout';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { initializeStorageIfNeeded } from './services/storage';
import { Loader2 } from 'lucide-react';

// ─── Lazy-loaded pages ──────────────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'));
const ActionsPage = lazy(() => import('./pages/ActionsPage'));
const DonationsPage = lazy(() => import('./pages/DonationsPage'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const ImpactPage = lazy(() => import('./pages/ImpactPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'));
const VisionPage = lazy(() => import('./pages/VisionPage'));
const RescueClockPage = lazy(() => import('./pages/RescueClockPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const StoresPage = lazy(() => import('./pages/StoresPage'));
const DemoTourPage = lazy(() => import('./pages/DemoTourPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#235A43' }} />
        <p className="text-sm" style={{ color: '#63716A' }}>Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initializeStorageIfNeeded();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingLayout />}>
                <Route index element={<LandingPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected app routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="actions" element={<ActionsPage />} />
                <Route path="donations" element={<DonationsPage />} />
                <Route path="simulator" element={<SimulatorPage />} />
                <Route path="impact" element={<ImpactPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="digital-twin" element={<DigitalTwinPage />} />
                <Route path="vision" element={<VisionPage />} />
                <Route path="rescue-clock" element={<RescueClockPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="stores" element={<StoresPage />} />
              </Route>

              {/* Dedicated Hackathon Evaluation Tour */}
              <Route path="/demo" element={<DemoTourPage />} />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
