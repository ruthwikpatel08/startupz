import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { RocketFlightOverlay } from './components/effects/RocketFlightOverlay';
import { InteractiveClickSparks } from './components/effects/InteractiveClickSparks';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ExploreStartupsPage } from './pages/Startups/ExploreStartupsPage';
import { StartupDetailPage } from './pages/Startups/StartupDetailPage';
import { CreateStartupPage } from './pages/Startups/CreateStartupPage';
import { FindCoFounderPage } from './pages/CoFounders/FindCoFounderPage';
import { OpportunitiesPage } from './pages/Opportunities/OpportunitiesPage';
import { InvestorsPage } from './pages/Investors/InvestorsPage';
import { MentorsPage } from './pages/Mentors/MentorsPage';
import { StartupFeedPage } from './pages/Feed/StartupFeedPage';
import { NetworkPage } from './pages/Network/NetworkPage';
import { MessagesPage } from './pages/Messages/MessagesPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { SavedItemsPage } from './pages/Saved/SavedItemsPage';
import { GlobalSearchPage } from './pages/Search/GlobalSearchPage';
import { AdminDashboardPage } from './pages/Admin/AdminDashboardPage';
import { FailedStartupsPage } from './pages/FailedStartups/FailedStartupsPage';
import { VideoMeetingRoomPage } from './pages/Meetings/VideoMeetingRoomPage';
import { ProblemsPage } from './pages/Problems/ProblemsPage';
import { ProblemDetailPage } from './pages/Problems/ProblemDetailPage';
import { ManageProblemsPage } from './pages/Admin/ManageProblemsPage';
import { ProblemFormPage } from './pages/Admin/ProblemFormPage';

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

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-brand-500 selection:text-white relative">
            <InteractiveClickSparks />
            <RocketFlightOverlay />
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public / Ecosystem Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
