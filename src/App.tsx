import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingLayout from './layouts/LandingLayout';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import PredictionsPage from './pages/PredictionsPage';
import ActionsPage from './pages/ActionsPage';
import DonationsPage from './pages/DonationsPage';
import SimulatorPage from './pages/SimulatorPage';
import ImpactPage from './pages/ImpactPage';
import SettingsPage from './pages/SettingsPage';
import { ToastProvider } from './context/ToastContext';
import { initializeStorageIfNeeded } from './services/storage';

export default function App() {
  useEffect(() => {
    // Populate demo data on first launch if storage is empty
    initializeStorageIfNeeded();
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingLayout />}>
            <Route index element={<LandingPage />} />
          </Route>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="actions" element={<ActionsPage />} />
            <Route path="donations" element={<DonationsPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="impact" element={<ImpactPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
