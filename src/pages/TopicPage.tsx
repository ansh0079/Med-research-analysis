import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { Article, SynthesisResult, StudyRun } from '@types';
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { StudyEncounterPanel } from '@components/search/StudyEncounterPanel';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { TopicEvidenceMemoryBanner } from '@components/learning/TopicEvidenceMemoryBanner';
import type { EvidenceMemoryMessage } from '@components/learning/TopicEvidenceMemoryBanner';
import { TopicCrosslinks } from '@components/topic/TopicCrosslinks';
import { PracticeAlertCard, EVIDENCE_GRADE_CHIP } from '@components/ui';

function readableSynthesisSnapshot(text = '') {
  const raw = String(text || '').trim();
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return String(parsed.clinicalBottomLine || parsed.overallAnswer || parsed.consensus || cleaned);
  } catch {
    return cleaned;
  }
}

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
  const [evidenceDelta, setEvidenceDelta] = useState<{
    summary: string | null;
    significantChange: boolean;
    claimsChanged: number;
    pendingRegeneration: Array<{ claimText: string | null; triggerReason: string }>;
  } | null>(null);
  const [lifecycleAttention, setLifecycleAttention] = useState(0);
  const [weakClaims, setWeakClaims] = useState<Array<{ claimKey: string; claimText: string; reasoningHint: string }>>([]);
  const [guidelineWatch, setGuidelineWatch] = useState<Array<{ message: string; severity: string }>>([]);
  const [roundLoading, setRoundLoading] = useState(false);
  const [evidenceMemoryMessages, setEvidenceMemoryMessages] = useState<EvidenceMemoryMessage[]>([]);

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

  useEffect(() => {
    if (!topic) return;
    api.getEvidenceDeltaBrief(topic)
      .then((r) => {
        setEvidenceDelta({
          summary: r.brief.summary,
          significantChange: r.brief.significantChange,
          claimsChanged: r.brief.claimsChanged,
          pendingRegeneration: r.brief.pendingRegeneration || [],
        });
      })
      .catch(() => setEvidenceDelta(null));
    api.getTopicEvidenceMemory(topic)
      .then((r) => setEvidenceMemoryMessages(r.memory?.messages || []))
      .catch(() => setEvidenceMemoryMessages([]));
    api.getClaimLifecycle(topic)
      .then((r) => setLifecycleAttention(r.summary?.needsAttention ?? 0))
      .catch(() => setLifecycleAttention(0));
    api.getPersonalKnowledgeGraph(topic)
      .then((r) => setWeakClaims(r.graph?.weakClaims || []))
      .catch(() => setWeakClaims([]));
    api.getGuidelineWatchEvents(topic)
      .then((r) => setGuidelineWatch(r.events || []))
      .catch(() => setGuidelineWatch([]));
    return () => {
      api.recordTopicReview(topic).catch(() => undefined);
    };
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
            <ClinicalSafetyNotice className="mt-2" status="synthesis_inferred" />
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {articlesLoading
                ? <span><i className="fas fa-spinner fa-spin mr-1" />Loading evidence…</span>
                : <span><i className="fas fa-file-alt mr-1" />{articles.length} articles</span>}
              {latestSnapshot && (
                <>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${EVIDENCE_GRADE_CHIP[latestSnapshot.evidence_grade] ?? EVIDENCE_GRADE_CHIP.MODERATE}`}>
                    {latestSnapshot.evidence_grade.replace('_', ' ')} evidence
                  </span>
                  <span>{latestSnapshot.key_finding_count} stored finding{latestSnapshot.key_finding_count !== 1 ? 's' : ''}</span>
                  <span>Last synthesised {new Date(latestSnapshot.generated_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {evidenceMemoryMessages.length > 0 && (
          <TopicEvidenceMemoryBanner messages={evidenceMemoryMessages} />
        )}

        {evidenceDelta?.significantChange && evidenceDelta.summary && (
          <div className="neo-card p-4 border-l-4 border-indigo-500 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <i className="fas fa-wave-square" /> Evidence delta since last review
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{evidenceDelta.summary}</p>
            {evidenceDelta.pendingRegeneration.length > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {evidenceDelta.pendingRegeneration.length} claim{evidenceDelta.pendingRegeneration.length === 1 ? '' : 's'} queued for automatic synopsis regeneration.
              </p>
            )}
          </div>
        )}

        {lifecycleAttention > 0 && !evidenceDelta?.significantChange && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
            <i className="fas fa-route mr-1.5" />
            {lifecycleAttention} teaching claim{lifecycleAttention === 1 ? '' : 's'} need lifecycle attention (abstract-only, full text ready, or stale).
          </div>
        )}

        {(weakClaims.length > 0 || guidelineWatch.length > 0) && (
          <div className="neo-card p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Personal knowledge graph</p>
            {weakClaims.slice(0, 3).map((w) => (
              <p key={w.claimKey} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <i className="fas fa-link text-indigo-400 mr-1.5" />
                {w.reasoningHint}
              </p>
            ))}
            {guidelineWatch.slice(0, 2).map((e, i) => (
              <p key={i} className={`text-xs leading-relaxed ${e.severity === 'high' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'}`}>
                <i className="fas fa-tower-broadcast mr-1.5" /> {e.message}
              </p>
            ))}
            <button
              type="button"
              disabled={roundLoading}
              onClick={() => {
                setRoundLoading(true);
                api.createLearningRound(topic)
                  .then((r) => { if (r.round?.id) navigate(`/quiz?topic=${encodeURIComponent(topic)}&roundId=${r.round.id}`); })
                  .catch(() => undefined)
                  .finally(() => setRoundLoading(false));
              }}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors"
            >
              {roundLoading ? 'Building round…' : 'Start structured learning round'}
            </button>
          </div>
        )}

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
                <PracticeAlertCard
                  key={a.objectKey}
                  objectKey={a.objectKey}
                  title={a.title}
                  rationale={a.rationale}
                />
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
              {readableSynthesisSnapshot(latestSnapshot.consensus_text)}
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

        {/* Cross-topic links */}
        <TopicCrosslinks topic={topic} />

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
        {articles.length > 0 && !showSynthesis && (
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
