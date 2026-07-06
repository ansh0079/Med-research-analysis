import React from 'react';
import { QuizPageHeader, QuizSpacedRepBanner, QuizGeneratingPanel, QuizErrorPanel } from '@components/learning/QuizPageStatusPanels';
import { QuizCompletePanel } from '@components/learning/QuizCompletePanel';
import { QuizActiveQuestionPanel } from '@components/learning/QuizActiveQuestionPanel';
import { useQuizSession } from '@hooks/useQuizSession';

export const QuizPage: React.FC = () => {
  const session = useQuizSession();

  return (
    <div className="min-h-screen aurora-bg">
      <QuizPageHeader
        activeTopic={session.activeTopic}
        lockedArticleCount={session.lockedArticles.length}
        singlePaperMode={session.quizPrefill?.singlePaperMode as boolean | undefined}
        fromDataset={session.fromDataset}
        trainingStage={session.trainingStage}
        isAuthenticated={session.isAuthenticated}
        topicMemory={session.topicMemory}
        effectiveExplanationDepth={session.effectiveExplanationDepth}
        curriculumTopicId={session.curriculumTopicIdParam}
        workflowContext={session.workflowContext}
        onBack={() => session.setCurrentPage('search')}
        onExplainDepthChange={session.handleExplainDepthChange}
      />

      <main className="max-w-3xl mx-auto px-4 -mt-8 pb-24">
        {session.urlMode === 'spaced_rep' && session.urlTargetNodeIds && session.urlTargetNodeIds.length > 0 && (
          <QuizSpacedRepBanner targetNodeCount={session.urlTargetNodeIds.length} />
        )}

        {session.generating && <QuizGeneratingPanel />}

        {session.genError && (
          <QuizErrorPanel
            genError={session.genError}
            genErrorCode={session.genErrorCode}
            activeTopic={session.activeTopic}
            manualTopic={session.manualTopic}
            hasEvidenceSnippets={session.evidenceSnippets.length > 0}
            urlClaimJobKey={session.urlClaimJobKey}
            onManualTopicChange={session.setManualTopic}
            onStartManualQuiz={session.startManualQuiz}
            onRetry={session.loadQuiz}
            onQuizFromEvidence={session.loadQuiz}
          />
        )}

        {!session.generating && !session.genError && session.quiz.complete && (
          <QuizCompletePanel
            quiz={session.quiz}
            scorePercent={session.scorePercent}
            activeStudyRunId={session.activeStudyRunId}
            studyRun={session.studyRun}
            studyOutline={session.studyOutline}
            studyRunLoadFailed={session.studyRunLoadFailed}
            isAuthenticated={session.isAuthenticated}
            saveStatus={session.saveStatus}
            reflectionKind={session.reflectionKind}
            reflectionSaveStatus={session.reflectionSaveStatus}
            resolveSourceArticle={session.resolveSourceArticle}
            onNewQuestions={session.loadQuiz}
            onBackToRun={() => session.navigate(`/learning/${session.activeStudyRunId}`)}
            onBackToSearch={() => session.setCurrentPage('search')}
            onContinueGapReview={() => {
              if (session.studyRun) {
                session.navigate(`/quiz?topic=${encodeURIComponent(session.studyRun.topic)}&difficulty=mixed&studyRunId=${session.studyRun.id}`);
              }
            }}
            onSignIn={() => session.setCurrentPage('auth')}
            onViewRunPage={() => session.navigate(`/learning/${session.activeStudyRunId}`)}
            onReflectionKindChange={session.setReflectionKind}
            onSaveReflectionDraft={session.saveQuizReflectionDraft}
            onExportReflection={session.exportReflection}
          />
        )}

        {!session.generating && !session.genError && !session.quiz.complete && session.currentQ && (
          <QuizActiveQuestionPanel
            quiz={session.quiz}
            currentQ={session.currentQ}
            isAnswered={session.isAnswered}
            isCorrect={session.isCorrect}
            selected={session.selected}
            answerConfidence={session.answerConfidence}
            effectiveExplanationDepth={session.effectiveExplanationDepth}
            adaptiveNotice={session.adaptiveNotice}
            isAuthenticated={session.isAuthenticated}
            feedbackSentIds={session.feedbackSentIds}
            quizEvidenceAudit={session.quizEvidenceAudit}
            disclaimer={session.disclaimer}
            resolveSourceArticle={session.resolveSourceArticle}
            onAnswerConfidenceChange={session.setAnswerConfidence}
            onAnswer={session.handleAnswer}
            onExplanationFeedback={session.handleExplanationFeedback}
            onNext={session.handleNext}
          />
        )}
      </main>
    </div>
  );
};
