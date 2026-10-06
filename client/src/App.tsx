import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { MobileBottomBar } from './components/common/MobileBottomBar';
import { Footer } from './components/common/Footer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NewUserCategoryModal } from './components/auth/NewUserCategoryModal';


// Eager Core Pages (Auth & Landing)
import { LandingPage } from './pages/LandingPage';
import { PublicLandingPage } from './pages/PublicLandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { AuthCallbackPage } from './pages/Auth/AuthCallbackPage';

// Helper for clean lazy-loading named exports with deployment chunk fallback
const lazyPage = <T extends Record<string, any>, K extends keyof T>(
  importer: () => Promise<T>,
  name: K
) =>
  React.lazy(async () => {
    try {
      const mod = await importer();
      return { default: mod[name] };
    } catch (err: any) {
      console.warn(`Dynamic import failed for ${String(name)}:`, err);
      const msg = (err?.message || String(err)).toLowerCase();
      const isChunkLoadError =
        msg.includes('dynamically imported module') ||
        msg.includes('failed to fetch') ||
        msg.includes('importing a module script failed') ||
        msg.includes('loading chunk');

      if (isChunkLoadError) {
        const storageKey = `startupz_chunk_reload_${String(name)}`;
        const now = Date.now();
        const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);

        if (now - lastReload > 12000) {
          sessionStorage.setItem(storageKey, String(now));
          window.location.reload();
          // Return an unresolved promise to stay in Suspense PageLoader while browser reloads the latest deployment
          return new Promise<{ default: T[K] }>(() => {});
        }
      }
      throw err;
    }
  });

// Lazy-Loaded Tools & Pages (Code-split into async chunks for maximum performance)
const ForgotPasswordPage = lazyPage(() => import('./pages/Auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(() => import('./pages/Auth/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = lazyPage(() => import('./pages/Dashboard/DashboardPage'), 'DashboardPage');
const BusinessPage = lazyPage(() => import('./pages/Business/BusinessPage'), 'BusinessPage');
const ProjectsPage = lazyPage(() => import('./pages/Projects/ProjectsPage'), 'ProjectsPage');
const ExploreStartupsPage = lazyPage(() => import('./pages/Startups/ExploreStartupsPage'), 'ExploreStartupsPage');
const StartupDetailPage = lazyPage(() => import('./pages/Startups/StartupDetailPage'), 'StartupDetailPage');
const CreateStartupPage = lazyPage(() => import('./pages/Startups/CreateStartupPage'), 'CreateStartupPage');
const FindCoFounderPage = lazyPage(() => import('./pages/CoFounders/FindCoFounderPage'), 'FindCoFounderPage');
const OpportunitiesPage = lazyPage(() => import('./pages/Opportunities/OpportunitiesPage'), 'OpportunitiesPage');
const InvestorsPage = lazyPage(() => import('./pages/Investors/InvestorsPage'), 'InvestorsPage');
const MentorsPage = lazyPage(() => import('./pages/Mentors/MentorsPage'), 'MentorsPage');
const StartupFeedPage = lazyPage(() => import('./pages/Feed/StartupFeedPage'), 'StartupFeedPage');
const NetworkPage = lazyPage(() => import('./pages/Network/NetworkPage'), 'NetworkPage');
const MessagesPage = lazyPage(() => import('./pages/Messages/MessagesPage'), 'MessagesPage');
const ProfilePage = lazyPage(() => import('./pages/Profile/ProfilePage'), 'ProfilePage');
const SavedItemsPage = lazyPage(() => import('./pages/Saved/SavedItemsPage'), 'SavedItemsPage');
const GlobalSearchPage = lazyPage(() => import('./pages/Search/GlobalSearchPage'), 'GlobalSearchPage');
const AdminDashboardPage = lazyPage(() => import('./pages/Admin/AdminDashboardPage'), 'AdminDashboardPage');
const FailedStartupsPage = lazyPage(() => import('./pages/FailedStartups/FailedStartupsPage'), 'FailedStartupsPage');
const VideoMeetingRoomPage = lazyPage(() => import('./pages/Meetings/VideoMeetingRoomPage'), 'VideoMeetingRoomPage');
const ProblemsPage = lazyPage(() => import('./pages/Problems/ProblemsPage'), 'ProblemsPage');
const ProblemDetailPage = lazyPage(() => import('./pages/Problems/ProblemDetailPage'), 'ProblemDetailPage');
const ManageProblemsPage = lazyPage(() => import('./pages/Admin/ManageProblemsPage'), 'ManageProblemsPage');
const ProblemFormPage = lazyPage(() => import('./pages/Admin/ProblemFormPage'), 'ProblemFormPage');
const MembershipsPage = lazyPage(() => import('./pages/Memberships/MembershipsPage'), 'MembershipsPage');
const OnboardingPage = lazyPage(() => import('./pages/Onboarding/OnboardingPage'), 'OnboardingPage');

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isCategorySelected && !user.profile?.isCategorySelected) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  const isAuthOrMeetingPage =
    location.pathname === '/' ||
    location.pathname === '/onboarding' ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/meeting');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#0B0F17]">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] dark:bg-[#0B0F17] text-[#181A1F] dark:text-[#F8F9FB] transition-colors selection:bg-brand-600 selection:text-white relative w-full max-w-full overflow-x-hidden">
      <Navbar />
      <NewUserCategoryModal />
      <div className="flex-1 flex w-full pt-14">
        {user && <Sidebar />}
        <main
          className={`flex-1 min-w-0 flex flex-col justify-between overflow-x-hidden pb-16 lg:pb-0 ${
            !user || isAuthOrMeetingPage ? '' : 'lg:pl-60 xl:pl-64'
          }`}
        >
          <div className="flex-1 min-w-0">
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public landing for logged-out users; existing dashboard for logged-in users */}
                <Route path="/" element={user ? <LandingPage /> : <PublicLandingPage />} />
                {/* Onboarding for first-time users */}
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/business" element={<BusinessPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/startups" element={<ExploreStartupsPage />} />
                <Route path="/startups/:id" element={<StartupDetailPage />} />
                <Route path="/cofounders" element={<FindCoFounderPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/investors" element={<InvestorsPage />} />
                <Route path="/mentors" element={<MentorsPage />} />
                <Route path="/feed" element={<StartupFeedPage />} />
                <Route path="/failed-startups" element={<FailedStartupsPage />} />
                <Route path="/problems" element={<ProblemsPage />} />
                <Route path="/problems/:id" element={<ProblemDetailPage />} />
                <Route path="/profile/:id" element={<ProfilePage />} />
                <Route path="/search" element={<GlobalSearchPage />} />
                <Route path="/memberships" element={<MembershipsPage />} />

                {/* Video Meeting Room */}
                <Route
                  path="/meeting/:roomCode"
                  element={
                    <ProtectedRoute>
                      <VideoMeetingRoomPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/startups/create"
                  element={
                    <ProtectedRoute>
                      <CreateStartupPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/network"
                  element={
                    <ProtectedRoute>
                      <NetworkPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute>
                      <SavedItemsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Portal */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/problems"
                  element={
                    <ProtectedRoute adminOnly>
                      <ManageProblemsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/problems/create"
                  element={
                    <ProtectedRoute adminOnly>
                      <ProblemFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/problems/:id/edit"
                  element={
                    <ProtectedRoute adminOnly>
                      <ProblemFormPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </div>
          <Footer />
        </main>
      </div>
      <MobileBottomBar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
