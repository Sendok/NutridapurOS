import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import MenuGeneratorPage from '@/pages/MenuGeneratorPage';
import ProcurementPage from '@/pages/ProcurementPage';
import QCPage from '@/pages/QCPage';
import DistributionPage from '@/pages/DistributionPage';
import FinancePage from '@/pages/FinancePage';
import FeedbackPage from '@/pages/FeedbackPage';
import ParentPortalPage from '@/pages/ParentPortalPage';

const Protected = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppShell>{children}</AppShell>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/parent-portal" element={<ParentPortalPage />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/menu-generator" element={<Protected roles={['admin', 'gizi']}><MenuGeneratorPage /></Protected>} />
          <Route path="/procurement" element={<Protected roles={['admin']}><ProcurementPage /></Protected>} />
          <Route path="/qc" element={<Protected roles={['admin', 'gizi', 'sekolah']}><QCPage /></Protected>} />
          <Route path="/distribution" element={<Protected roles={['admin', 'sekolah']}><DistributionPage /></Protected>} />
          <Route path="/finance" element={<Protected roles={['admin']}><FinancePage /></Protected>} />
          <Route path="/feedback" element={<Protected roles={['admin', 'gizi', 'sekolah']}><FeedbackPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
