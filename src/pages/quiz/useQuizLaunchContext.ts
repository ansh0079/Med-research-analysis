import { useMemo, useState } from 'react';
import type { Article } from '@types';
import type { QuizArticle } from '@services/quizService';
import { selectTopEvidence } from '../../utils/selectTopEvidence';
import { getDifficultyFromParam, readWorkflowContext } from '@components/quiz/QuizPageUtils';

type QuizPrefill = {
  topic?: string;
  studyRunId?: number | string;
  difficulty?: string;
  articles?: Array<Record<string, unknown>>;
  workflow?: Record<string, unknown>;
  singlePaperMode?: boolean;
  teachingPoints?: unknown[];
  mcqAngles?: string[];
} | null;

export function useQuizLaunchContext({
  searchParams,
  detectedTopic,
  results,
}: {
  searchParams: URLSearchParams;
  detectedTopic: string;
  results: Article[];
}) {
  const urlTopic = searchParams.get('topic');
  const urlStudyRunId = Number(searchParams.get('studyRunId') || 0) || undefined;
  const curriculumTopicIdParam = Number(searchParams.get('curriculumTopicId') || 0) || undefined;
  const explainParam = searchParams.get('explain');
  const urlDifficulty = getDifficultyFromParam(searchParams.get('difficulty'));
  const urlMode = searchParams.get('mode') as 'spaced_rep' | 'standard' | null;
  const urlClaimJobKey = searchParams.get('claimJob')?.trim() || undefined;
  const urlRoundId = Number(searchParams.get('roundId') || 0) || undefined;
  const urlCount = Math.min(Math.max(Number(searchParams.get('count') || 5) || 5, 1), 10);

  const urlTargetNodeIds = useMemo(() => {
    const raw = searchParams.get('targetNodes');
    if (!raw) return undefined;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);

  const [quizPrefill] = useState<QuizPrefill>(() => {
    try {
      const raw = sessionStorage.getItem('med_quiz_prefill');
      if (!raw) return null;
      sessionStorage.removeItem('med_quiz_prefill');
      return JSON.parse(raw) as QuizPrefill;
    } catch {
      return null;
    }
  });

  const [workflowContext] = useState<Record<string, unknown>>(() => ({
    ...readWorkflowContext(),
    ...(quizPrefill?.workflow || {}),
  }));

  const activeTopic = urlTopic || quizPrefill?.topic || detectedTopic || '';
  const activeStudyRunId = urlStudyRunId || (Number(quizPrefill?.studyRunId || 0) || undefined);
  const prefillDifficulty =
    urlDifficulty
    || (quizPrefill?.difficulty === 'easy'
      || quizPrefill?.difficulty === 'medium'
      || quizPrefill?.difficulty === 'hard'
      || quizPrefill?.difficulty === 'mixed'
      ? quizPrefill.difficulty
      : 'mixed');
  const prefillTeachingPoints = Array.isArray(quizPrefill?.teachingPoints) ? quizPrefill.teachingPoints : undefined;
  const prefillMcqAngles = Array.isArray(quizPrefill?.mcqAngles)
    ? quizPrefill.mcqAngles.filter((angle): angle is string => typeof angle === 'string' && angle.trim().length > 0)
    : undefined;

  const lockedArticles = useMemo<QuizArticle[]>(() => {
    if (!quizPrefill?.articles?.length) return [];
    return quizPrefill.articles
      .map((a) => ({
        uid: String(a.uid || ''),
        title: String(a.title || '').trim(),
        abstract: a.abstract as string | undefined,
        doi: a.doi as string | null | undefined,
        pmid: a.pmid as string | null | undefined,
        pubdate: a.pubdate as string | null | undefined,
        source: (a.source ?? a.journal) as string | null | undefined,
        pmcrefcount: a.pmcrefcount as number | undefined,
        pubtype: a.pubtype as string[] | undefined,
      }))
      .filter((a) => a.title.length > 0);
  }, [quizPrefill]);

  const evidenceSnippets = useMemo<QuizArticle[]>(() => {
    if (lockedArticles.length > 0) return lockedArticles;
    return selectTopEvidence(results, 5).map((a) => ({
      uid: a.uid,
      title: a.title,
      abstract: a.abstract,
      doi: a.doi,
      pmid: a.pmid,
      pubdate: a.pubdate,
      source: a.source ?? a.journal,
      pmcrefcount: a.pmcrefcount,
      pubtype: a.pubtype,
    }));
  }, [lockedArticles, results]);

  return {
    activeStudyRunId,
    activeTopic,
    curriculumTopicIdParam,
    evidenceSnippets,
    explainParam,
    lockedArticles,
    prefillDifficulty,
    prefillMcqAngles,
    prefillTeachingPoints,
    quizPrefill,
    urlClaimJobKey,
    urlCount,
    urlMode,
    urlRoundId,
    urlTargetNodeIds,
    workflowContext,
  };
}
