import React from 'react';
import { useQuizPage } from '@hooks/useQuizPage';
import { QuizPageHeader } from '@components/quiz/QuizPageHeader';
import { QuizGeneratingState, QuizErrorState, SpacedRepBanner } from '@components/quiz/QuizLoadingStates';
import { QuizCompletePanel } from '@components/quiz/QuizCompletePanel';
import { QuizActiveQuestionPanel } from '@components/quiz/QuizActiveQuestionPanel';
import type { StudyRun } from '@types';

export const QuizPage: React.FC = () => {
  const {
    searchParams,
    setSearchParams,
    activeTopic,
    activeStudyRunId,
    curriculumTopicIdParam,
    urlMode,
    urlTargetNodeIds,
    urlClaimJobKey,
    quizPrefill,
    workflowContext,
    lockedArticles,
    evidenceSnippets,
    quiz,
    generating,
    genError,
    genErrorCode,
    selected,
    answerConfidence,
    saveStatus,
    isAuthenticated,
    fromDataset,
    disclaimer,
    quizEvidenceAudit,
    studyRun,
    studyOutline,
    feedbackSentIds,
    studyRunLoadFailed,
    manualTopic,
    topicMemory,
    reflectionKind,
    reflectionSaveStatus,
    adaptiveNotice,
    learningVelocity,
    effectiveExplanationDepth,
    trainingStage,
    currentQ,
    isAnswered,
    isCorrect,
    scorePercent,
    resolveSourceArticle,
    setManualTopic,
    setAnswerConfidence,
    setReflectionKind,
    loadQuiz,
    startManualQuiz,
    handleAnswer,
    handleExplanationFeedback,
    handleNext,
    exportQuizReflection,
    saveQuizReflectionDraft,
    setCurrentPage,
    navigate,
  } = useQuizPage();

  return (
    <div className="min-h-screen aurora-bg">
      <QuizPageHeader
        activeTopic={activeTopic}
        lockedArticlesCount={lockedArticles.length}
        singlePaperMode={quizPrefill?.singlePaperMode}
        fromDataset={fromDataset}
        trainingStage={trainingStage}
        isAuthenticated={isAuthenticated}
        topicMemory={topicMemory}
        effectiveExplanationDepth={effectiveExplanationDepth}
        searchParams={searchParams}
        onExplainChange={(value) => {
          const next = new URLSearchParams(searchParams);
          next.set('explain', value);
          setSearchParams(next, { replace: true });
        }}
        curriculumTopicId={curriculumTopicIdParam}
        workflowContext={workflowContext}
        onBack={() => setCurrentPage('search')}
      />

      <main className="max-w-3xl mx-auto px-4 -mt-8 pb-24">
        {urlMode === 'spaced_rep' && urlTargetNodeIds && urlTargetNodeIds.length > 0 && (
          <SpacedRepBanner targetNodeCount={urlTargetNodeIds.length} />
        )}

        {generating && <QuizGeneratingState />}

        {genError && (
          <QuizErrorState
            genError={genError}
            genErrorCode={genErrorCode}
            activeTopic={activeTopic}
            manualTopic={manualTopic}
            onManualTopicChange={setManualTopic}
            evidenceSnippetsCount={evidenceSnippets.length}
            urlClaimJobKey={urlClaimJobKey}
            onLoadQuiz={loadQuiz}
            onStartManualQuiz={startManualQuiz}
          />
        )}

        {!generating && !genError && quiz.complete && (
          <QuizCompletePanel
            quiz={quiz}
            activeTopic={activeTopic}
            scorePercent={scorePercent}
            activeStudyRunId={activeStudyRunId}
            studyRun={studyRun}
            studyOutline={studyOutline}
            studyRunLoadFailed={studyRunLoadFailed}
            isAuthenticated={isAuthenticated}
            saveStatus={saveStatus}
            reflectionKind={reflectionKind}
            reflectionSaveStatus={reflectionSaveStatus}
            learningVelocity={learningVelocity}
            onReflectionKindChange={setReflectionKind}
            onLoadQuiz={loadQuiz}
            onBackToSearch={() => setCurrentPage('search')}
            onBackToRun={(studyRunId) => navigate(`/learning/${studyRunId}`)}
            onContinueGapReport={(run: StudyRun) =>
              navigate(`/quiz?topic=${encodeURIComponent(run.topic)}&difficulty=mixed&studyRunId=${run.id}`)
            }
            onSignIn={() => setCurrentPage('auth')}
            onSaveReflectionDraft={saveQuizReflectionDraft}
            onExportReflection={exportQuizReflection}
            resolveSourceArticle={resolveSourceArticle}
          />
        )}

        {!generating && !genError && !quiz.complete && currentQ && (
          <QuizActiveQuestionPanel
            quiz={quiz}
            currentQ={currentQ}
            isAnswered={isAnswered}
            isCorrect={!!isCorrect}
            selected={selected}
            answerConfidence={answerConfidence}
            adaptiveNotice={adaptiveNotice}
            effectiveExplanationDepth={effectiveExplanationDepth}
            disclaimer={disclaimer}
            quizEvidenceAudit={quizEvidenceAudit}
            isAuthenticated={isAuthenticated}
            feedbackSentIds={feedbackSentIds}
            onAnswerConfidenceChange={setAnswerConfidence}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onExplanationFeedback={handleExplanationFeedback}
            resolveSourceArticle={resolveSourceArticle}
          />
        )}
      </main>
    </div>
  );
};
