import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { Article, SynthesisResult, StudyRun } from '@types';
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { StudyEncounterPanel } from '@components/search/StudyEncounterPanel';
import { VerificationBadge } from '@components/ui/VerificationBadge';

// ─── Evidence grade chip ──────────────────────────────────────────────────────

const GRADE_STYLE: Record<string, string> = {
  HIGH:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MODERATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOW:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  VERY_LOW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ─── Study plan widget ────────────────────────────────────────────────────────

function StudyPlanWidget({ topic, activeRun, onStartRun }: {
  topic: string;
  activeRun: StudyRun | null;
  onStartRun: () => void;
}) {
  const navigate = useNavigate();
  if (activeRun) {
    const pct = activeRun.progress?.totalNodes
      ? Math.round(((activeRun.progress.coveredNodes ?? 0) / activeRun.progress.totalNodes) * 100)
      : null;
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-calendar-check text-emerald-500 text-sm" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Active study plan</span>
        </div>
        {pct !== null && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              <span>{activeRun.progress.coveredNodes ?? 0} / {activeRun.progress.totalNodes} nodes covered</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" data-pct={pct}
                ref={(el) => { if (el) el.style.width = `${pct}%`; }} />
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/learning/${activeRun.id}`)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 transition-colors">
            <i className="fas fa-arrow-right mr-1.5" /> Continue plan
          </button>
          <button type="button" onClick={() => navigate('/learning')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Dashboard
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
        <i className="fas fa-graduation-cap text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No active study plan for this topic</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Start a plan to track your progress and schedule spaced reviews.</p>
      </div>
      <button type="button" onClick={onStartRun}
        className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition-colors">
        Start plan
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TopicPage() {
  const { topic: rawTopic = '' } = useParams<{ topic: string }>();
  const topic = decodeURIComponent(rawTopic);
  const navigate = useNavigate();

  // Overview data
  const [activeRun, setActiveRun] = useState<StudyRun | null>(null);
  const [practiceAlerts, setPracticeAlerts] = useState<Array<{
    objectKey: string; title: string; classification: string; topic?: string | null; rationale?: string | null;
  }>>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<{
    evidence_grade: string; key_finding_count: number; consensus_text: string; generated_at: string;
  } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Evidence + synthesis
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState('');

  // UI state
  const [startingRun, setStartingRun] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);

  // Load overview
  useEffect(() => {
    if (!topic) return;
    setOverviewLoading(true);
    api.getTopicOverview(topic)
      .then((d) => {
        setActiveRun(d.activeRun);
        setPracticeAlerts(d.practiceAlerts);
        setLatestSnapshot(d.latestSnapshot);
      })
      .catch(() => undefined)
      .finally(() => setOverviewLoading(false));
  }, [topic]);

  // Load evidence on mount
  useEffect(() => {
    if (!topic) return;
    setArticlesLoading(true);
    api.search(topic, {}, { vector: true })
      .then((r) => setArticles(r.articles.slice(0, 15)))
      .catch(() => undefined)
      .finally(() => setArticlesLoading(false));
  }, [topic]);

  const handleSynthesize = useCallback(async () => {
    if (articles.length === 0) return;
    setSynthesisLoading(true);
    setSynthesisError('');
    setShowSynthesis(true);
    try {
      const result = await api.synthesizeEvidence(topic, articles.slice(0, 10));
      setSynthesis(result);
    } catch (err) {
      setSynthesisError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setSynthesisLoading(false);
    }
  }, [topic, articles]);

  const handleStartRun = useCallback(async () => {
    setStartingRun(true);
    try {
      const { run } = await api.createStudyRun(topic);
      navigate(`/learning/${run.id}`);
    } catch {
      setStartingRun(false);
    }
  }, [topic, navigate]);

  if (!topic) return null;

  return (
    <div className="min-h-screen aurora-bg pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => navigate(-1)} title="Go back"
            aria-label="Go back"
            className="mt-1 shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <i className="fas fa-arrow-left text-xs" aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight capitalize">{topic}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {articlesLoading
                ? <span><i className="fas fa-spinner fa-spin mr-1" />Loading evidence…</span>
                : <span><i className="fas fa-file-alt mr-1" />{articles.length} articles</span>}
              {latestSnapshot && (
                <>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GRADE_STYLE[latestSnapshot.evidence_grade] ?? GRADE_STYLE.MODERATE}`}>
                    {latestSnapshot.evidence_grade.replace('_', ' ')} evidence
                  </span>
                  <span>{latestSnapshot.key_finding_count} stored finding{latestSnapshot.key_finding_count !== 1 ? 's' : ''}</span>
                  <span>Last synthesised {new Date(latestSnapshot.generated_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Study plan */}
        {!overviewLoading && (
          <StudyPlanWidget
            topic={topic}
            activeRun={activeRun}
            onStartRun={() => { void handleStartRun(); }}
          />
        )}

        {/* Practice-changing alerts */}
        {practiceAlerts.length > 0 && (
          <div className="neo-card p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <i className="fas fa-bell text-rose-500" /> Practice-changing evidence
            </p>
            <div className="space-y-2">
              {practiceAlerts.map((a) => (
                <div key={a.objectKey} className="flex items-start gap-3 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2.5">
                  <i className="fas fa-stethoscope text-rose-400 text-xs mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{a.title}</p>
                    {a.rationale && <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{a.rationale}</p>}
                  </div>
                  <VerificationBadge status="source_verified" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last synthesis snapshot summary */}
        {latestSnapshot && !showSynthesis && (
          <div className="neo-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <i className="fas fa-flask text-indigo-500" /> Last synthesis
              </p>
              <button type="button" onClick={() => void handleSynthesize()}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Refresh →
              </button>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
              {latestSnapshot.consensus_text}
            </p>
            <button type="button" onClick={() => void handleSynthesize()}
              disabled={articlesLoading || synthesisLoading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors">
              {synthesisLoading
                ? <><i className="fas fa-spinner fa-spin mr-1" />Synthesising…</>
                : <><i className="fas fa-flask mr-1.5" />Generate fresh synthesis</>}
            </button>
          </div>
        )}

        {/* First-time: no snapshot */}
        {!latestSnapshot && !overviewLoading && !showSynthesis && articles.length > 0 && (
          <div className="neo-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <i className="fas fa-flask text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No synthesis yet for this topic</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Synthesise the evidence to get a graded summary and practice-changing claims.</p>
            </div>
            <button type="button" onClick={() => void handleSynthesize()} disabled={synthesisLoading}
              className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 transition-colors">
              Synthesise
            </button>
          </div>
        )}

        {/* Live synthesis panel */}
        {showSynthesis && (
          <>
            {synthesisError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                {synthesisError}
              </div>
            )}
            {synthesisLoading && !synthesis && (
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 p-6 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Synthesising evidence…</p>
              </div>
            )}
            {synthesis && (
              <SynthesisPanel
                result={synthesis}
                articles={articles}
                onClose={() => { setSynthesis(null); setShowSynthesis(false); }}
              />
            )}
          </>
        )}

        {/* Inline study encounter */}
        {articles.length > 0 && (
          <StudyEncounterPanel
            topic={topic}
            articles={articles}
            jobClaims={[]}
          />
        )}

        {/* Top articles */}
        {articles.length > 0 && (
          <div className="neo-card p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <i className="fas fa-file-alt mr-1 text-slate-400" /> Top evidence ({articles.length} articles)
            </p>
            <div className="space-y-2">
              {articles.slice(0, 8).map((a) => {
                const year = (a.pubdate || '').slice(0, 4);
                const href = a.doi
                  ? `https://doi.org/${a.doi}`
                  : a.pmid
                    ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
                    : null;
                return (
                  <div key={a.uid} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      {href
                        ? <a href={href} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline leading-snug line-clamp-2">
                            {a.title}
                          </a>
                        : <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">{a.title}</p>}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {a.journal || a.source || ''}{year ? ` · ${year}` : ''}
                        {a.pmcid ? <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">· Full text</span> : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
