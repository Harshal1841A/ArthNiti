import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Landing from './pages/Landing';

// Route-based code splitting: each page below pulls in its own heavy deps
// (Recharts on Dashboard, the multi-step form on NewApplication, etc.).
// Previously all of this shipped in a single 880KB initial bundle regardless
// of which page loaded first — splitting per-route means Landing (the page
// a judge actually hits on a cold container) loads a much smaller chunk.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ApplicantsList = lazy(() => import('./pages/ApplicantsList'));
const NewApplication = lazy(() => import('./pages/NewApplication'));
const FinancialHealthCardPage = lazy(() => import('./pages/FinancialHealthCardPage'));
const AdapterStatus = lazy(() => import('./pages/AdapterStatus'));
const ReviewQueuePage = lazy(() => import('./pages/ReviewQueuePage'));
const DemoModePage = lazy(() => import('./pages/DemoModePage'));

function RouteFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
        aria-label="Loading"
      />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  const isLanding = location.pathname === '/';

  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300">
          {isLanding ? (
            <Landing />
          ) : (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex flex-1 flex-col pl-[260px]">
                <Navbar />

                <main className="flex-1 bg-[var(--bg-page)] text-[var(--text-primary)] p-6 overflow-auto transition-colors duration-300">
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/applicants" element={<ApplicantsList />} />
                      <Route path="/applicants/new" element={<NewApplication />} />
                      <Route path="/applicants/:id" element={<FinancialHealthCardPage />} />
                      <Route path="/reviews" element={<ReviewQueuePage />} />
                      <Route path="/adapters" element={<AdapterStatus />} />
                      <Route path="/demo" element={<DemoModePage />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </div>
          )}
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
