import React, { Suspense, lazy } from 'react';
import { PortfolioTab } from '@components/learning/PortfolioTab';
import { TopicProgressGrid } from '@components/learning/TopicProgressGrid';
import {
  CurriculaOverviewCard,
  DashboardStatsRow,
  FsrsDueBanner,
  InsightCard,
  LearningDashboardEmptyState,
  LearningDashboardErrorState,
  LearningDashboardHeader,
  LearningDashboardLoadingState,
  LearningDashboardOverviewTab,
  LearningDashboardTabBar,
  ProfileSettings,
  SpacedRepDueButton,
  StartTopicReviewCard,
} from '@components/learning/dashboard';
import { useLearningDashboardPage } from '@hooks/useLearningDashboardPage';

const LearningDashboardCpdTab = lazy(() =>
  import('./LearningDashboardCpdTab').then((m) => ({ default: m.LearningDashboardCpdTab })),
);

export const LearningDashboardPage: React.FC = () => {
  const {
    navigate,
    setDetectedTopic,
    dashboard,
    insights,
    calibration,
    profile,
    topicMemories,
    practiceAlerts,
    judgement,
    loading,
    error,
    activeTab,
    setActiveTab,
    startTopic,
    setStartTopic,
    pendingStartTopic,
    drillTopic,
    caseOnTopic,
    handleInsightAction,
    startReview,
    handleSaveProfile,
    goToCpdTab,
    setCurrentPage,
    stats,
    hasData,
    activeRuns,
    highInsights,
  } = useLearningDashboardPage();

  if (loading) return <LearningDashboardLoadingState />;
  if (error) return <LearningDashboardErrorState error={error} />;

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-4xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-16">
        <LearningDashboardHeader profile={profile} onSearchClick={() => setCurrentPage('search')} />

        <FsrsDueBanner
          dueCardCount={dashboard?.dueCardCount ?? 0}
          onReviewClick={goToCpdTab}
        />

        {highInsights.length > 0 && (
          <div className="mb-5 space-y-2">
            {highInsights.map((ins, i) => (
              <InsightCard key={i} insight={ins} onAction={handleInsightAction} />
            ))}
          </div>
        )}

        <StartTopicReviewCard
          startTopic={startTopic}
          pendingStartTopic={pendingStartTopic}
          activeRuns={activeRuns}
          onStartTopicChange={setStartTopic}
          onStartReview={startReview}
          onRunClick={(runId) => navigate(`/learning/${runId}`)}
        />

        {dashboard?.curriculaOverview && (
          <CurriculaOverviewCard
            curricula={dashboard.curriculaOverview}
            onOpenPaths={() => navigate('/study-paths')}
          />
        )}

        {stats && <DashboardStatsRow stats={stats} />}

        <SpacedRepDueButton
          dueCardCount={dashboard?.dueCardCount ?? 0}
          onClick={goToCpdTab}
        />

        <LearningDashboardTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {!hasData && activeTab !== 'settings' && activeTab !== 'portfolio' && (
          <LearningDashboardEmptyState onStartReview={() => setActiveTab('overview')} />
        )}

        {activeTab === 'overview' && hasData && dashboard && (
          <LearningDashboardOverviewTab
            dashboard={dashboard}
            insights={insights}
            calibration={calibration}
            practiceAlerts={practiceAlerts}
            topicMemories={topicMemories}
            judgement={judgement}
            navigate={navigate}
            onInsightAction={handleInsightAction}
            drillTopic={drillTopic}
            caseOnTopic={caseOnTopic}
            setDetectedTopic={setDetectedTopic}
          />
        )}

        {activeTab === 'topics' && (
          <TopicProgressGrid onQuiz={drillTopic} onCase={caseOnTopic} />
        )}

        {activeTab === 'cpd' && (
          <Suspense fallback={
            <div className="neo-card p-8 flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }>
            <LearningDashboardCpdTab />
          </Suspense>
        )}

        {activeTab === 'portfolio' && (
          <div className="neo-card p-5">
            <PortfolioTab />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="neo-card p-5 max-w-lg">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <i className="fas fa-user-graduate text-indigo-500" /> Learner profile
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              These preferences are shared with the Mentor agent so it can adapt explanations, MCQ difficulty, and case complexity to you.
            </p>
            <ProfileSettings profile={profile} onSave={handleSaveProfile} />
          </div>
        )}
      </div>
    </div>
  );
};
