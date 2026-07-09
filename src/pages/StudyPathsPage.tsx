import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { CurriculumDetail, CurriculumListItem, TopicCurriculumProgress } from '@types';

function statusBadge(status?: string) {
  if (status === 'confident') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

export const StudyPathsPage: React.FC = () => {
  const navigate = useNavigate();
  const [curricula, setCurricula] = useState<CurriculumListItem[]>([]);
  const [slug, setSlug] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [curriculum, setCurriculum] = useState<CurriculumDetail | null>(null);
  const [progress, setProgress] = useState<Record<number, TopicCurriculumProgress>>({});
  const [examSummary, setExamSummary] = useState<{ totalTopics: number; topicsStarted: number; confident: number; pctTopicsTouched: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError('');
      try {
        const { curricula: raw } = await api.learning.listCurricula();
        if (cancelled) return;
        const sorted = [...raw].sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
        setCurricula(sorted);
        setSlug((prev) => {
          if (prev && sorted.some((c) => c.slug === prev)) return prev;
          return sorted[0]?.slug ?? '';
        });
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : 'Failed to load curricula');
          setCurricula([]);
          setSlug('');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!slug) {
      setCurriculum(null);
      setProgress({});
      setExamSummary(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.learning.getCurriculum(slug);
      setCurriculum(data.curriculum);
      setProgress(data.progress || {});
      setExamSummary(data.examSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load study path');
      setCurriculum(null);
      setExamSummary(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {

    void load();
  }, [load]);

  const startTopic = async (suggestedQuery: string, curriculumTopicId: number) => {
    setStartingId(curriculumTopicId);
    try {
      const { run } = await api.learning.createStudyRun(suggestedQuery, curriculumTopicId);
      const params = new URLSearchParams({
        topic: suggestedQuery,
        studyRunId: String(run.id),
        curriculumTopicId: String(curriculumTopicId),
      });
      navigate(`/quiz?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start run');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-bg)] pt-[calc(var(--nav-h)+1.5rem)] pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => navigate('/search')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-medium mb-6">
          <i className="fas fa-arrow-left" /> Back to search
        </button>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <i className="fas fa-route text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Study paths</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Structured topics by exam stage—pick a block, open a pre-filled study run, then quiz with training-level prompts.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-6">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Curriculum</label>
          {listLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <i className="fas fa-spinner fa-spin" />
              Loading curricula…
            </div>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
          ) : curricula.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No study-path curricula are configured yet. Seed or add curricula in the database to use this page.
            </p>
          ) : (
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              {curricula.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.examStageLabel ? ` — ${c.examStageLabel}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && slug && (
          <div className="text-center py-12 text-slate-500">
            <i className="fas fa-spinner fa-spin text-2xl mb-2 block" />
            Loading study path…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && slug && curriculum && examSummary && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/30 p-5 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Exam goal progress</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {examSummary.pctTopicsTouched}% of topics started
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-2">
                ({examSummary.topicsStarted}/{examSummary.totalTopics} · {examSummary.confident} confident)
              </span>
            </p>
            <div className="mt-3 h-2 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${Math.min(100, examSummary.pctTopicsTouched)}%` }}
              />
            </div>
            {curriculum.examStageLabel && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{curriculum.examStageLabel}</p>
            )}
          </div>
        )}

        {!loading && slug && curriculum && (
          <div className="space-y-8">
            {curriculum.blocks.map((block) => (
              <section key={block.id}>
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-layer-group text-indigo-500 text-xs" />
                  {block.name}
                </h2>
                <ul className="space-y-2">
                  {block.topics.map((t) => {
                    const p = progress[t.id];
                    const prereqIds = t.prerequisites ?? [];
                    const unmetPrereqs = prereqIds.filter((pid) => progress[pid]?.status !== 'confident');
                    const isLocked = unmetPrereqs.length > 0;
                    const unmetNames = unmetPrereqs.map((pid) => {
                      for (const b of curriculum.blocks) {
                        const found = b.topics.find((x) => x.id === pid);
                        if (found) return found.displayName;
                      }
                      return `Topic ${pid}`;
                    });
                    return (
                      <li key={t.id} className={`rounded-xl border bg-white dark:bg-slate-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${isLocked ? 'border-slate-200 dark:border-slate-700 opacity-75' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isLocked && <i className="fas fa-lock text-slate-400 text-xs shrink-0" title={`Complete first: ${unmetNames.join(', ')}`} />}
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.displayName}</p>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5" title={t.suggestedQuery}>
                            Search: {t.suggestedQuery}
                          </p>
                          {isLocked && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                              <i className="fas fa-exclamation-triangle mr-1" />
                              Complete first: {unmetNames.join(', ')}
                            </p>
                          )}
                          {p && (
                            <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(p.status)}`}>
                              {p.status.replace('_', ' ')}
                              {p.quizAttempts > 0 ? ` · ${p.correctCount}/${p.quizAttempts} correct` : ''}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={startingId !== null || isLocked}
                          onClick={() => startTopic(t.suggestedQuery, t.id)}
                          className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${isLocked ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'}`}
                          title={isLocked ? `Complete prerequisites first: ${unmetNames.join(', ')}` : undefined}
                        >
                          {startingId === t.id ? <i className="fas fa-spinner fa-spin" /> : isLocked ? (
                            <><i className="fas fa-lock mr-2" /> Locked</>
                          ) : (
                            <><i className="fas fa-play mr-2" /> Study &amp; quiz</>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
