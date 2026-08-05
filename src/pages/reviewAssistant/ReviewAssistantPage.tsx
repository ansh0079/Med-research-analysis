import React from 'react';
import { Button } from '@components/ui/Button';
import { PrismaFlow } from '@components/review/PrismaFlow';
import { ReviewListModal } from '@components/review/ReviewListModal';
import { useReviewAssistantPage } from './useReviewAssistantPage';
import { ReviewPrefillBanner } from './ReviewPrefillBanner';
import { ReviewSetupCard } from './ReviewSetupCard';
import { ReviewWorkspaceTabs } from './ReviewWorkspaceTabs';
import { ReviewScreeningTab } from './ReviewScreeningTab';
import { ReviewDataTab } from './ReviewDataTab';
import { ReviewRobTab } from './ReviewRobTab';
import { ReviewGradeTab } from './ReviewGradeTab';
import { ReviewExportTab } from './ReviewExportTab';

export const ReviewAssistantPage: React.FC = () => {
  const {
    user,
    question,
    setQuestion,
    inclusionText,
    setInclusionText,
    exclusionText,
    setExclusionText,
    bulkImportText,
    setBulkImportText,
    review,
    prefillBanner,
    rows,
    prisma,
    picoById,
    robById,
    gradeTable,
    setGradeTable,
    loading,
    error,
    liveNote,
    tab,
    setTab,
    showResumeModal,
    setShowResumeModal,
    activeUsers,
    criteria,
    loadReview,
    createReview,
    extractPico,
    onDecision,
    handleBulkImport,
    resetReview,
    dismissPrefillBanner,
    setRobById,
    exportCsv,
    exportMetaAnalysisCsv,
    exportPrismaSvg,
    exportAnki,
    exportSynthesisReport,
  } = useReviewAssistantPage();

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-7xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Systematic Review Assistant</h1>
          {user && (
            <Button variant="secondary" size="sm" onClick={() => setShowResumeModal(true)}
              leftIcon={<i className="fas fa-folder-open text-[10px]" />}>
              Resume Review
            </Button>
          )}
        </div>

        {prefillBanner && <ReviewPrefillBanner onDismiss={dismissPrefillBanner} />}

        <ReviewSetupCard
          review={review}
          question={question}
          inclusionText={inclusionText}
          exclusionText={exclusionText}
          loading={loading}
          error={error}
          liveNote={liveNote}
          onQuestionChange={setQuestion}
          onInclusionChange={setInclusionText}
          onExclusionChange={setExclusionText}
          onCreateReview={createReview}
          onResetReview={resetReview}
        />

        {review && <PrismaFlow counts={prisma} />}

        {review && (
          <>
            <ReviewWorkspaceTabs
              tab={tab}
              prisma={prisma}
              robById={robById}
              gradeTable={gradeTable}
              onTabChange={setTab}
            />

            {tab === 'screening' && (
              <ReviewScreeningTab
                rows={rows}
                criteria={criteria}
                activeUsers={activeUsers}
                prisma={prisma}
                picoById={picoById}
                robById={robById}
                gradeTable={gradeTable}
                bulkImportText={bulkImportText}
                loading={loading}
                onBulkImportTextChange={setBulkImportText}
                onBulkImport={handleBulkImport}
                onExtractPico={extractPico}
                onDecision={onDecision}
              />
            )}

            {tab === 'data' && (
              <ReviewDataTab rows={rows} picoById={picoById} />
            )}

            {tab === 'rob' && (
              <ReviewRobTab
                reviewId={review.id}
                rows={rows}
                robById={robById}
                onResult={(articleId, rob) => setRobById((prev) => ({ ...prev, [articleId]: rob }))}
              />
            )}

            {tab === 'grade' && (
              <ReviewGradeTab
                reviewId={review.id}
                includedCount={prisma.included}
                gradeTable={gradeTable}
                onResult={setGradeTable}
              />
            )}

            {tab === 'export' && (
              <ReviewExportTab
                rows={rows}
                exportSynthesisReport={exportSynthesisReport}
                exportPrismaSvg={exportPrismaSvg}
                exportCsv={exportCsv}
                exportMetaAnalysisCsv={exportMetaAnalysisCsv}
                exportAnki={exportAnki}
              />
            )}
          </>
        )}
      </div>

      {showResumeModal && (
        <ReviewListModal
          onSelect={(r) => { setShowResumeModal(false); loadReview(r); }}
          onClose={() => setShowResumeModal(false)}
        />
      )}
    </div>
  );
};
