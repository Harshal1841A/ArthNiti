import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DemoModeBanner from './components/DemoModeBanner';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ApplicantsList from './pages/ApplicantsList';
import NewApplication from './pages/NewApplication';
import FinancialHealthCardPage from './pages/FinancialHealthCardPage';
import AdapterStatus from './pages/AdapterStatus';
import ReviewQueuePage from './pages/ReviewQueuePage';

export default function App() {
  const location = useLocation();
  const isDemo = new URLSearchParams(location.search).has('demo');
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
                {isDemo && <DemoModeBanner />}
                <main className="flex-1 bg-[var(--bg-page)] text-[var(--text-primary)] p-6 overflow-auto transition-colors duration-300">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/applicants" element={<ApplicantsList />} />
                    <Route path="/applicants/new" element={<NewApplication />} />
                    <Route path="/applicants/:id" element={<FinancialHealthCardPage />} />
                    <Route path="/reviews" element={<ReviewQueuePage />} />
                    <Route path="/adapters" element={<AdapterStatus />} />
                  </Routes>
                </main>
              </div>
            </div>
          )}
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
