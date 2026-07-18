import type { QuizQuestion } from '@types';
import type { QuizArticle } from '@services/quizService';
import { lookupArticleAttribution } from '@utils/searchAttribution';

export function buildQuizAttempts({
  answers,
  confidenceByQuestion,
  fallbackConfidence,
  questions,
  resolveSourceArticle,
}: {
  answers: Record<string, string>;
  confidenceByQuestion: Record<string, number>;
  fallbackConfidence: number;
  questions: QuizQuestion[];
  resolveSourceArticle: (question: QuizQuestion) => QuizArticle | null;
}) {
  return questions.map((q) => {
    const resolvedSrc = resolveSourceArticle(q);
    const uid = resolvedSrc?.uid || q.sourceArticle || undefined;
    const attribution = uid ? lookupArticleAttribution(uid) : null;
    return {
      questionId: q.id,
      questionType: q.questionType || 'recall',
      questionText: q.question,
      userAnswer: answers[q.id] || '',
      correctAnswer: q.correctAnswer,
      isCorrect: (answers[q.id] || '').toLowerCase() === q.correctAnswer.toLowerCase(),
      sourceArticleUid: uid,
      sourceArticleTitle: resolvedSrc?.title || q.sourceArticle || undefined,
      decisionId: attribution?.decisionId,
      claimDecisionId: q.claimDecisionId ?? undefined,
      banditArmId: attribution?.banditArmId || q.banditArmId || undefined,
      searchId: attribution?.searchId,
      outlineNodeId: q.outlineNodeId || (q.sourceIndices?.[0] ? `src-${q.sourceIndices[0]}` : null),
      outlineLabel: q.outlineLabel ?? undefined,
      claimKey: q.claimKey ?? undefined,
      promptVariant: q.promptVariant ?? undefined,
      confidence: confidenceByQuestion[q.id] ?? fallbackConfidence,
    };
  });
}
