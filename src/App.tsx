import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer, useToast } from '@components/ui';
import { USAGE_HEADER_EVENT, type UsageHeaderDetail } from '@services/api/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/router/ProtectedRoute';
import { GuestRoute } from './components/router/GuestRoute';
import { RoleRoute } from './components/router/RoleRoute';
import { RouteErrorBoundary } from './components/router/RouteErrorBoundary';
import { PhiDataNotice } from './components/compliance/PhiDataNotice';
import { CookieConsentBanner } from './components/compliance/CookieConsentBanner';
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
const SettingsPage        = lazyDefault(() => import('./pages/SettingsPage'), 'SettingsPage');
const ResetPasswordPage   = lazyDefault(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage');
const VerifyEmailPage     = lazyDefault(() => import('./pages/VerifyEmailPage'), 'VerifyEmailPage');
const DashboardPage = lazyDefault(() => import('./pages/DashboardPage'), 'DashboardPage');
const LearningDashboardPage = lazyDefault(() => import('./pages/LearningDashboardPage'), 'LearningDashboardPage');
const StudyRunPage        = lazyDefault(() => import('./pages/StudyRunPage'), 'StudyRunPage');
const GuidelineBrowserPage = lazyDefault(() => import('./pages/GuidelineBrowserPage'), 'GuidelineBrowserPage');

const StudyPathsPage      = lazyDefault(() => import('./pages/StudyPathsPage'), 'StudyPathsPage');
const TopicPage           = lazyDefault(() => import('./pages/TopicPage'), 'TopicPage');
const LegalTermsPage      = lazyDefault(() => import('./pages/LegalTermsPage'), 'LegalTermsPage');
const LegalPrivacyPage    = lazyDefault(() => import('./pages/LegalPrivacyPage'), 'LegalPrivacyPage');
const CompliancePage      = lazyDefault(() => import('./pages/CompliancePage'), 'CompliancePage');
const NotFoundPage        = lazyDefault(() => import('./pages/NotFoundPage'), 'NotFoundPage');
const AdminObservabilityPage = lazyDefault(() => import('./pages/AdminObservabilityPage'), 'AdminObservabilityPage');
const ClinicalQualityQueuePage = lazyDefault(() => import('./pages/ClinicalQualityQueuePage'), 'ClinicalQualityQueuePage');
const PracticePoolPage = lazyDefault(() => import('./pages/PracticePoolPage'), 'PracticePoolPage');
const AdaptiveCasePage = lazyDefault(() => import('./pages/AdaptiveCasePage'), 'AdaptiveCasePage');

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
  // While auth hydrates, render LandingPage in place — it's a stable layout
  // and avoids the blank-spinner-then-snap flicker on every hard refresh.
  if (isLoading) return <LandingPage />;
  return isAuthenticated ? <SearchPage /> : <LandingPage />;
};

// Routes where the global TopNav should NOT appear (they have their own nav)
// '/' is excluded only for guests — authenticated users see SearchPage which needs the nav
const NO_TOP_NAV_ROUTES = ['/', '/auth', '/legal/terms', '/legal/privacy', '/legal/compliance'];

const AppContent: React.FC = () => {
  const { toasts, showToast, removeToast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Show onboarding modal to authenticated users who haven't seen it yet
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = !onboardingDismissed && !isLoading && isAuthenticated && !hasCompletedOnboarding();

  React.useEffect(() => {
    const seenBuckets = new Set<string>();
    const labels: Record<string, string> = {
      ai_analysis: 'AI analyses',
      ai_synthesis: 'evidence syntheses',
      aiAnalysesPerMonth: 'AI analyses',
      synthesisPerMonth: 'evidence syntheses',
      searchesPerDay: 'daily searches',
    };

    const bucketFor = (ratio: number) => {
      if (ratio >= 1) return '100';
      if (ratio >= 0.9) return '90';
      if (ratio >= 0.8) return '80';
      return null;
    };

    const onUsageHeaders = (event: Event) => {
      const detail = (event as CustomEvent<UsageHeaderDetail>).detail;
      if (!detail || detail.cap <= 0) return;
      const bucket = bucketFor(detail.used / detail.cap);
      if (!bucket) return;

      const key = `${detail.kind}:${detail.limitKey}:${bucket}`;
      if (seenBuckets.has(key)) return;
      seenBuckets.add(key);

      const label = labels[detail.feature] || labels[detail.limitKey] || detail.feature;
      const atLimit = detail.used >= detail.cap;
      const message = atLimit
        ? `You've reached ${detail.used}/${detail.cap} ${label}.`
        : `You're nearing your ${label} limit: ${detail.used}/${detail.cap} used.`;
      showToast(message, atLimit ? 'error' : 'warning', atLimit ? 8000 : 6000);
    };

    window.addEventListener(USAGE_HEADER_EVENT, onUsageHeaders);
    return () => window.removeEventListener(USAGE_HEADER_EVENT, onUsageHeaders);
  }, [showToast]);

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

  // Show TopNav as soon as we know we're not on a no-nav route.
  // Don't gate on isAuthenticated — that causes the nav to pop in after auth hydrates.
  // The nav itself handles authenticated vs guest state internally.
  const showTopNav = (!NO_TOP_NAV_ROUTES.includes(pathname) && !pathname.startsWith('/legal'))
    || (pathname === '/' && (isAuthenticated || isLoading));

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {showTopNav && <TopNav />}
      <div id="main-content" tabIndex={-1}>
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
            <Route path="/cases"    element={<RouteErrorBoundary><ProtectedRoute><AdaptiveCasePage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/grant"     element={<RouteErrorBoundary><ProtectedRoute><GrantWritingPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/knowledge" element={<RouteErrorBoundary><ProtectedRoute><KnowledgeReviewPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/guideline-library" element={<RouteErrorBoundary><ProtectedRoute><GuidelineBrowserPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/guidelines" element={<RouteErrorBoundary><ProtectedRoute><GuidelineReviewPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/dashboard" element={<RouteErrorBoundary><ProtectedRoute><DashboardPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/learning" element={<RouteErrorBoundary><ProtectedRoute><LearningDashboardPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/learning/:id" element={<RouteErrorBoundary><ProtectedRoute><StudyRunPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/topic/:topic"  element={<RouteErrorBoundary><ProtectedRoute><TopicPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/study-paths" element={<RouteErrorBoundary><ProtectedRoute><StudyPathsPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/auth"      element={<RouteErrorBoundary><GuestRoute><AuthPage /></GuestRoute></RouteErrorBoundary>} />
            <Route path="/reset-password" element={<RouteErrorBoundary><ResetPasswordPage /></RouteErrorBoundary>} />
            <Route path="/verify-email"   element={<RouteErrorBoundary><VerifyEmailPage /></RouteErrorBoundary>} />
            <Route path="/settings"   element={<RouteErrorBoundary><ProtectedRoute><SettingsPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/review"    element={<RouteErrorBoundary><ProtectedRoute><ReviewAssistantPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/team"      element={<RouteErrorBoundary><ProtectedRoute><TeamWorkspacePage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/billing"   element={<RouteErrorBoundary><ProtectedRoute><BillingPage /></ProtectedRoute></RouteErrorBoundary>} />
            <Route path="/admin/observability" element={<RouteErrorBoundary><RoleRoute allowedRoles={['admin', 'curator']}><AdminObservabilityPage /></RoleRoute></RouteErrorBoundary>} />
            <Route path="/admin/quality" element={<RouteErrorBoundary><RoleRoute allowedRoles={['admin', 'curator']}><ClinicalQualityQueuePage /></RoleRoute></RouteErrorBoundary>} />
            <Route path="/legal/terms"      element={<RouteErrorBoundary><LegalTermsPage /></RouteErrorBoundary>} />
            <Route path="/legal/privacy"    element={<RouteErrorBoundary><LegalPrivacyPage /></RouteErrorBoundary>} />
            <Route path="/legal/compliance" element={<RouteErrorBoundary><CompliancePage /></RouteErrorBoundary>} />
            <Route path="*"          element={<RouteErrorBoundary><NotFoundPage /></RouteErrorBoundary>} />
          </Routes>
        </Suspense>
      </div>

      {showOnboarding && <OnboardingModal onDone={handleOnboardingDone} />}

      <PhiDataNotice />
      <CookieConsentBanner />
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
