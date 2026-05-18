import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer, useToast } from '@components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/router/ProtectedRoute';
import { GuestRoute } from './components/router/GuestRoute';
import { PhiDataNotice } from './components/compliance/PhiDataNotice';
import { hasCompletedOnboarding } from './components/onboarding/onboardingState';
const OnboardingModal = React.lazy(() => import('./components/onboarding/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import './styles/main.css';

// SearchPage loads eagerly — it's the primary app screen
import { SearchPage } from './pages/SearchPage';
import { TopNav } from './components/layout/TopNav';

function lazyDefault<T extends Record<string, React.ComponentType<object>>>(
  factory: () => Promise<T>,
  exportName: keyof T
) {
  return React.lazy(() => factory().then(m => ({ default: m[exportName] })));
}

const LandingPage         = lazyDefault(() => import('./pages/LandingPage'), 'LandingPage');
const QuizPage            = lazyDefault(() => import('./pages/QuizPage'), 'QuizPage');
const HistoryPage         = lazyDefault(() => import('./pages/HistoryPage'), 'HistoryPage');
const SavedArticlesPage   = lazyDefault(() => import('./pages/SavedArticlesPage'), 'SavedArticlesPage');
const AuthPage            = lazyDefault(() => import('./pages/AuthPage'), 'AuthPage');
const AnalyticsPage       = lazyDefault(() => import('./pages/AnalyticsPage'), 'AnalyticsPage');
const ReviewAssistantPage = lazyDefault(() => import('./pages/ReviewAssistantPage'), 'ReviewAssistantPage');
const CaseModePage        = lazyDefault(() => import('./pages/CaseModePage'), 'CaseModePage');
const TeamWorkspacePage   = lazyDefault(() => import('./pages/TeamWorkspacePage'), 'TeamWorkspacePage');
const GrantWritingPage    = lazyDefault(() => import('./pages/GrantWritingPage'), 'GrantWritingPage');
const KnowledgeReviewPage = lazyDefault(() => import('./pages/KnowledgeReviewPage'), 'KnowledgeReviewPage');
const GuidelineReviewPage = lazyDefault(() => import('./pages/GuidelineReviewPage'), 'GuidelineReviewPage');
const BillingPage         = lazyDefault(() => import('./pages/BillingPage'), 'BillingPage');
const LearningDashboardPage = lazyDefault(() => import('./pages/LearningDashboardPage'), 'LearningDashboardPage');
const StudyRunPage        = lazyDefault(() => import('./pages/StudyRunPage'), 'StudyRunPage');
const GuidelineBrowserPage = lazyDefault(() => import('./pages/GuidelineBrowserPage'), 'GuidelineBrowserPage');

const StudyPathsPage      = lazyDefault(() => import('./pages/StudyPathsPage'), 'StudyPathsPage');
const LegalTermsPage      = lazyDefault(() => import('./pages/LegalTermsPage'), 'LegalTermsPage');
const LegalPrivacyPage    = lazyDefault(() => import('./pages/LegalPrivacyPage'), 'LegalPrivacyPage');
const NotFoundPage        = lazyDefault(() => import('./pages/NotFoundPage'), 'NotFoundPage');

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
}

// Root route: landing page for guests, search for authenticated users
const RootRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageFallback />;
  return isAuthenticated ? <SearchPage /> : <LandingPage />;
};

// Routes where the global TopNav should NOT appear (they have their own nav)
// '/' is excluded only for guests — authenticated users see SearchPage which needs the nav
const NO_TOP_NAV_ROUTES = ['/auth', '/legal/terms', '/legal/privacy'];

const AppContent: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Show onboarding modal to authenticated users who haven't seen it yet
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = !onboardingDismissed && !isLoading && isAuthenticated && !hasCompletedOnboarding();

  const handleOnboardingDone = (query?: string, destination: 'search' | 'learning' = 'search') => {
    setOnboardingDismissed(true);
    if (destination === 'learning') {
      if (query) sessionStorage.setItem('med_learning_start_topic', query);
      navigate('/learning');
    } else if (query) {
      sessionStorage.setItem('med_onboarding_query', query);
      navigate('/search');
    }
  };

  const showTopNav = (!NO_TOP_NAV_ROUTES.includes(pathname) && !pathname.startsWith('/legal'))
    || (pathname === '/' && isAuthenticated);

  return (
    <div className="min-h-screen bg-[var(--c-bg)] transition-colors duration-300">
      {showTopNav && <TopNav />}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/"          element={<RootRoute />} />
          <Route path="/search"    element={<SearchPage />} />
          <Route path="/quiz"      element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/saved"     element={<ProtectedRoute><SavedArticlesPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/case"      element={<CaseModePage />} />
          <Route path="/grant"     element={<GrantWritingPage />} />
          <Route path="/knowledge" element={<ProtectedRoute><KnowledgeReviewPage /></ProtectedRoute>} />
          <Route path="/guideline-library" element={<ProtectedRoute><GuidelineBrowserPage /></ProtectedRoute>} />
          <Route path="/guidelines" element={<ProtectedRoute><GuidelineReviewPage /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><LearningDashboardPage /></ProtectedRoute>} />
          <Route path="/learning/:id" element={<ProtectedRoute><StudyRunPage /></ProtectedRoute>} />
          <Route path="/study-paths" element={<ProtectedRoute><StudyPathsPage /></ProtectedRoute>} />
          <Route path="/auth"      element={<GuestRoute><AuthPage /></GuestRoute>} />
          <Route path="/review"    element={<ProtectedRoute><ReviewAssistantPage /></ProtectedRoute>} />
          <Route path="/team"      element={<ProtectedRoute><TeamWorkspacePage /></ProtectedRoute>} />
          <Route path="/billing"   element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
          <Route path="/legal/terms"   element={<LegalTermsPage />} />
          <Route path="/legal/privacy" element={<LegalPrivacyPage />} />
          <Route path="*"          element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {showOnboarding && <OnboardingModal onDone={handleOnboardingDone} />}

      <PhiDataNotice />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      if (import.meta.env.DEV) {
        console.error('App Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
      }
    }}
  >
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider>
          <AppContent />
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
