import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer, useToast } from '@components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/router/ProtectedRoute';
import { GuestRoute } from './components/router/GuestRoute';
import { RoleRoute } from './components/router/RoleRoute';
import { RouteErrorBoundary } from './components/router/RouteErrorBoundary';
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

const ForYouPage          = lazyDefault(() => import('./pages/ForYouPage'), 'ForYouPage');
const StudyPathsPage      = lazyDefault(() => import('./pages/StudyPathsPage'), 'StudyPathsPage');
const TopicPage           = lazyDefault(() => import('./pages/TopicPage'), 'TopicPage');
const LegalTermsPage      = lazyDefault(() => import('./pages/LegalTermsPage'), 'LegalTermsPage');
const LegalPrivacyPage    = lazyDefault(() => import('./pages/LegalPrivacyPage'), 'LegalPrivacyPage');
const NotFoundPage        = lazyDefault(() => import('./pages/NotFoundPage'), 'NotFoundPage');
const AdminObservabilityPage = lazyDefault(() => import('./pages/AdminObservabilityPage'), 'AdminObservabilityPage');
const ClinicalQualityQueuePage = lazyDefault(() => import('./pages/ClinicalQualityQueuePage'), 'ClinicalQualityQueuePage');
const PracticePoolPage = lazyDefault(() => import('./pages/PracticePoolPage'), 'PracticePoolPage');

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

  const handleOnboardingDone = (query?: string, destination: 'search' | 'learning' | 'quiz' = 'search') => {
    setOnboardingDismissed(true);
    if (destination === 'learning') {
      if (query) sessionStorage.setItem('med_learning_start_topic', query);
      navigate('/learning');
    } else if (destination === 'quiz') {
      if (query) {
        sessionStorage.setItem('med_quiz_prefill', JSON.stringify({
          topic: query,
          difficulty: 'mixed',
          articles: [],
        }));
      }
      navigate('/quiz');
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
          <Route path="/"          element={<RouteErrorBoundary><RootRoute /></RouteErrorBoundary>} />
          <Route path="/search"    element={<RouteErrorBoundary><SearchPage /></RouteErrorBoundary>} />
          <Route path="/quiz"      element={<RouteErrorBoundary><ProtectedRoute><QuizPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/practice"  element={<RouteErrorBoundary><ProtectedRoute><PracticePoolPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/history"   element={<RouteErrorBoundary><ProtectedRoute><HistoryPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/saved"     element={<RouteErrorBoundary><ProtectedRoute><SavedArticlesPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/analytics" element={<RouteErrorBoundary><ProtectedRoute><AnalyticsPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/case"      element={<RouteErrorBoundary><ProtectedRoute><CaseModePage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/grant"     element={<RouteErrorBoundary><ProtectedRoute><GrantWritingPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/knowledge" element={<RouteErrorBoundary><ProtectedRoute><KnowledgeReviewPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/guideline-library" element={<RouteErrorBoundary><ProtectedRoute><GuidelineBrowserPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/guidelines" element={<RouteErrorBoundary><ProtectedRoute><GuidelineReviewPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/for-you"  element={<RouteErrorBoundary><ProtectedRoute><ForYouPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/learning" element={<RouteErrorBoundary><ProtectedRoute><LearningDashboardPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/learning/:id" element={<RouteErrorBoundary><ProtectedRoute><StudyRunPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/topic/:topic"  element={<RouteErrorBoundary><ProtectedRoute><TopicPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/study-paths" element={<RouteErrorBoundary><ProtectedRoute><StudyPathsPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/auth"      element={<RouteErrorBoundary><GuestRoute><AuthPage /></GuestRoute></RouteErrorBoundary>} />
          <Route path="/review"    element={<RouteErrorBoundary><ProtectedRoute><ReviewAssistantPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/team"      element={<RouteErrorBoundary><ProtectedRoute><TeamWorkspacePage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/billing"   element={<RouteErrorBoundary><ProtectedRoute><BillingPage /></ProtectedRoute></RouteErrorBoundary>} />
          <Route path="/admin/observability" element={<RouteErrorBoundary><RoleRoute allowedRoles={['admin', 'curator']}><AdminObservabilityPage /></RoleRoute></RouteErrorBoundary>} />
          <Route path="/admin/quality" element={<RouteErrorBoundary><RoleRoute allowedRoles={['admin', 'curator']}><ClinicalQualityQueuePage /></RoleRoute></RouteErrorBoundary>} />
          <Route path="/legal/terms"   element={<RouteErrorBoundary><LegalTermsPage /></RouteErrorBoundary>} />
          <Route path="/legal/privacy" element={<RouteErrorBoundary><LegalPrivacyPage /></RouteErrorBoundary>} />
          <Route path="*"          element={<RouteErrorBoundary><NotFoundPage /></RouteErrorBoundary>} />
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
