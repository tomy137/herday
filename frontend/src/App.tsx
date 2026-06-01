import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { api } from './api/client';
import AppShell from './components/layout/AppShell';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Echoes from './pages/Echoes';
import Journal from './pages/Journal';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Info from './pages/Info';
import Login from './pages/Login';
import Verify from './pages/Verify';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-warm-50 flex items-center justify-center"><span className="text-warm-400">...</span></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Sends first-run users through onboarding before the app. */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasCycles, setHasCycles] = useState<boolean | null>(null);
  useEffect(() => {
    api.cycles.list()
      .then((cycles) => setHasCycles(cycles.length > 0))
      .catch(() => setHasCycles(true)); // never trap the user on a transient error
  }, []);
  if (hasCycles === null) return <div className="min-h-screen bg-warm-50" />;
  // First run only: the pact isn't engaged AND there's no cycle yet. Once the
  // pact is set (onboarding step 2) the user is no longer "not_yet", so
  // finishing onboarding — even without a period date — never loops back here.
  if (user?.transparency_status === 'not_yet' && !hasCycles) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function DeepLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handle = CapApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.pathname === '/verify') {
          navigate(`/verify${parsed.search}`, { replace: true });
        }
      } catch {
        // ignore malformed URLs
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [navigate]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <DeepLinkHandler />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><OnboardingGate><AppShell /></OnboardingGate></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/echoes" element={<Echoes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/info" element={<Info />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
