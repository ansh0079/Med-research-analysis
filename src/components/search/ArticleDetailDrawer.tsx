import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { getArticleLinkInfo } from '@services/articleLinks';
import type { Article, ArticleSynopsisFields, ArticleSynopsisResult, ConsortResult, GuidelineEntry } from '@types';
import { QualityBadge } from './QualityBadge';
import { RetractionBadge } from './RetractionBadge';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';

interface Props {
  article: Article | null;
  onClose: () => void;
  onOpenInWorkspace?: (url: string) => void;
}

type Tab = 'overview' | 'synopsis' | 'consort' | 'guidelines';

const TRUST_BADGE: Record<string, { label: string; cls: string }> = {
  HIGH:     { label: 'HIGH',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  MODERATE: { label: 'MODERATE', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  LOW:      { label: 'LOW',      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  VERY_LOW: { label: 'VERY LOW', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const CONSORT_LABELS: Record<string, string> = {
  title_abstract: 'Title & Abstract', eligibility_criteria: 'Eligibility Criteria',
  interventions: 'Interventions', outcomes: 'Outcomes', sample_size: 'Sample Size',
  randomisation: 'Randomisation', blinding: 'Blinding', statistical_methods: 'Statistical Methods',
  harms: 'Harms Reporting', trial_registration: 'Trial Registration',
};
const CONSORT_STYLE: Record<string, { dot: string; chip: string }> = {
  adequate:     { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  partial:      { dot: 'bg-amber-400',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  not_reported: { dot: 'bg-red-400',     chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};
const STRENGTH_COLOR: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  weak: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  conditional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{value}</p>
    </div>
  );
}

function FieldList({ label, items }: { label: string; items?: string[] }) {
  const safe = (items ?? []).filter(Boolean);
  if (!safe.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <ul className="space-y-0.5">
        {safe.slice(0, 6).map((s, i) => <li key={i} className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{s}</li>)}
      </ul>
    </div>
  );
}

export const ArticleDetailDrawer: React.FC<Props> = ({ article, onClose, onOpenInWorkspace }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [synopsis, setSynopsis] = useState<ArticleSynopsisFields | null>(null);
  const [synopsisResult, setSynopsisResult] = useState<ArticleSynopsisResult | null>(null);
  const [synopsisState, setSynopsisState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [synopsisFeedback, setSynopsisFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [synopsisFeedbackPending, setSynopsisFeedbackPending] = useState(false);
  const [consort, setConsort] = useState<ConsortResult | null>(null);
  const [consortState, setConsortState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [guidelines, setGuidelines] = useState<GuidelineEntry[]>([]);
  const [guidelineState, setGuidelineState] = useState<'idle' | 'loading' | 'done' | 'empty'>('idle');

  // Reset state when article changes
  useEffect(() => {
    setSynopsis(null);
    setSynopsisResult(null);
    setSynopsisState('idle');
    setSynopsisFeedback(null);
    setSynopsisFeedbackPending(false);
    setConsort(null);
    setConsortState('idle');
    setGuidelines([]);
    setGuidelineState('idle');
    setTab('overview');
  }, [article?.uid]);

  const loadSynopsis = useCallback(async () => {
    if (!article || synopsis || synopsisState === 'loading') return;
    setSynopsisState('loading');
    try {
      const result = await api.getSynopsis(article, { async: true });
      if (!result.synopsis) throw new Error('unavailable');
      setSynopsis(result.synopsis);
      setSynopsisResult(result);
      setSynopsisState('done');
    } catch {
      setSynopsisState('error');
    }
  }, [article, synopsis, synopsisState]);

  const loadConsort = useCallback(async () => {
    if (!article || consort || consortState === 'loading') return;
    setConsortState('loading');
    try {
      const result = await api.assessConsort(article);
      setConsort(result.consort);
      setConsortState('done');
    } catch {
      setConsortState('error');
    }
  }, [article, consort, consortState]);

  const loadGuidelines = useCallback(async () => {
    if (!article || guidelineState !== 'idle') return;
    setGuidelineState('loading');
    try {
      // Infer topic from first 4 content words of the title (drop common words)
      const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'and', 'or', 'for', 'with', 'on', 'at', 'to', 'vs', 'versus']);
      const topicWords = article.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 4);
      const topic = topicWords.join(' ');
      if (!topic) { setGuidelineState('empty'); return; }
      const result = await fetch(`/api/guidelines?topic=${encodeURIComponent(topic)}&limit=4`);
      if (!result.ok) throw new Error('failed');
      const data = await result.json() as { guidelines: GuidelineEntry[] };
      setGuidelines(data.guidelines ?? []);
      setGuidelineState(data.guidelines?.length ? 'done' : 'empty');
    } catch {
      setGuidelineState('empty');
    }
  }, [article, guidelineState]);

  useEffect(() => {
    if (tab === 'synopsis' && synopsisState === 'idle') loadSynopsis();
    if (tab === 'consort' && consortState === 'idle') loadConsort();
    if (tab === 'guidelines' && guidelineState === 'idle') loadGuidelines();
  }, [tab, synopsisState, consortState, guidelineState, loadSynopsis, loadConsort, loadGuidelines]);

  const handleSynopsisFeedback = useCallback(async (feedbackType: 'helpful' | 'not_helpful') => {
    if (!article || synopsisFeedback === feedbackType || synopsisFeedbackPending) return;
    setSynopsisFeedbackPending(true);
    try {
      await api.recordSynopsisFeedback({
        article,
        articleUid: synopsisResult?.articleId || article.uid,
        provider: synopsisResult?.provider ?? null,
        model: synopsisResult?.model ?? null,
        cached: Boolean(synopsisResult?.cached),
        feedbackType,
      });
      setSynopsisFeedback(feedbackType);
      if (feedbackType === 'not_helpful') {
        setSynopsis(null);
        setSynopsisResult(null);
        setSynopsisState('idle');
      }
    } finally {
      setSynopsisFeedbackPending(false);
    }
  }, [article, synopsisFeedback, synopsisFeedbackPending, synopsisResult]);

  if (!article) return null;

  const { primaryUrl } = getArticleLinkInfo(article);
  const isFree = article.isFree || !!article.pmcid;
  const freeUrl = article.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/` : article.fullTextUrl || null;
  const isRct = article._impact?.evidenceType === 'rct' || (article.pubtype ?? []).some((t) => /randomized|randomised|rct/i.test(t));
  const year = article.pubdate?.slice(0, 4) || article.year;
  const authors = article.authors?.slice(0, 4).map((a) => a.name).join(', ');
  const hasMoreAuthors = (article.authors?.length ?? 0) > 4;

  const TABS: { key: Tab; label: string; icon: string; disabled?: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: 'fa-circle-info' },
    { key: 'synopsis', label: 'Appraisal', icon: 'fa-microscope' },
    { key: 'consort', label: 'CONSORT', icon: 'fa-clipboard-check', disabled: !isRct },
    { key: 'guidelines', label: 'Guidelines', icon: 'fa-book-medical' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-[70] flex flex-col w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-slate-700 animate-slide-in-right">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 leading-snug line-clamp-2 transition-colors">
              {article.title}
            </a>
            {authors && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {authors}{hasMoreAuthors ? ' et al.' : ''}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {article.source || article.journal} · {year}
              {(article.pmcrefcount ?? article.citationCount) !== undefined && ` · ${(article.pmcrefcount ?? article.citationCount)!.toLocaleString()} cit.`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {article._quality && <QualityBadge quality={article._quality} />}
            <button type="button" onClick={onClose} title="Close"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Quick access row */}
        <div className="flex gap-2 flex-wrap mb-3">
          {isFree && freeUrl && (
            <a href={freeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
              <i className="fas fa-unlock text-[10px]" /> Free Full Text
            </a>
          )}
          {onOpenInWorkspace && freeUrl && (freeUrl.endsWith('.pdf') || /pmc\//.test(freeUrl)) && (
            <button type="button" onClick={() => onOpenInWorkspace(freeUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
              <i className="fas fa-columns text-[10px]" /> Split Workspace
            </button>
          )}
          {!isFree && (
            <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <i className="fas fa-lock text-[10px] opacity-60" /> View on Publisher
            </a>
          )}
        </div>

        {/* Retraction/preprint warnings */}
        {article._retraction?.isRetracted && (
          <RetractionBadge retraction={article._retraction} variant="banner" />
        )}

        {/* Tabs */}
        <div className="flex gap-0.5">
          {TABS.filter((t) => !t.disabled).map((t) => (
            <button key={t.key} type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <i className={`fas ${t.icon} text-[10px]`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="p-5 space-y-4">
            {article.keywords && article.keywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {article.keywords.slice(0, 10).map((k) => (
                    <span key={k} className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {article.abstract && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Abstract</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{article.abstract}</p>
              </div>
            )}

            {article._impact && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Evidence Signals</p>
                <div className="flex flex-wrap gap-1.5">
                  {article._impact.evidenceType && (
                    <span className="badge badge-source">{article._impact.evidenceType.toUpperCase()}</span>
                  )}
                  {article._impact.level && (
                    <span className={`badge ${article._impact.level === 'high' ? 'badge-impact-high' : 'badge-source'}`}>
                      {article._impact.level} impact
                    </span>
                  )}
                  {article._ebmLabel && (
                    <span className="badge badge-source font-semibold">{article._ebmLabel.label}</span>
                  )}
                  {article.isFree && <span className="badge badge-free">Open Access</span>}
                  {article._isPreprint && <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}>Preprint</span>}
                </div>
                {article._impact.factors && article._impact.factors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {article._impact.factors.slice(0, 5).map((f) => (
                      <span key={f} className="rounded-full bg-white dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {article._quality && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Quality Assessment</p>
                <div className="flex items-center gap-3">
                  <QualityBadge quality={article._quality} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Grade {article._quality.grade} · {article._quality.score}/100</p>
                    {article._quality.signals && article._quality.signals.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{article._quality.signals.slice(0, 2).join(' · ')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700/50 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Identifiers</p>
              {article.doi && <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">DOI: {article.doi}</p>}
              {article.pmid && <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">PMID: {article.pmid}</p>}
              {article.pmcid && <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">PMCID: {article.pmcid}</p>}
              {article.pubtype && article.pubtype.length > 0 && (
                <p className="text-[11px] text-slate-400">Type: {article.pubtype.join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* SYNOPSIS TAB */}
        {tab === 'synopsis' && (
          <div className="p-5 space-y-4">
            {synopsisState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-7 h-7 border-[3px] border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                <p className="text-sm">Generating critical appraisal…</p>
              </div>
            )}
            {synopsisState === 'error' && (
              <div className="text-center py-12">
                <p className="text-red-500 text-sm mb-3">Appraisal unavailable.</p>
                <button type="button" onClick={loadSynopsis}
                  className="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                  Retry
                </button>
              </div>
            )}
            {synopsisState === 'done' && synopsis && (
              <>
                <div className="flex items-center gap-2">
                  {synopsis.trustRating && (() => {
                    const trust = TRUST_BADGE[synopsis.trustRating] ?? TRUST_BADGE.MODERATE;
                    return <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${trust.cls}`}>Trust: {trust.label}</span>;
                  })()}
                  {synopsis.studyDesign && (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{synopsis.studyDesign}</span>
                  )}
                </div>

                {synopsis.takeaway && (
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Key Takeaway</p>
                    <p className="text-xs font-semibold text-violet-800 dark:text-violet-200 leading-snug">{synopsis.takeaway}</p>
                  </div>
                )}

                {synopsis.practiceImplication && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Practice Implication</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">{synopsis.practiceImplication}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Clinical Question" value={synopsis.clinicalQuestion} />
                  <Field label="Setting" value={synopsis.setting} />
                  <Field label="Population" value={synopsis.population} />
                  <Field label="Intervention" value={synopsis.intervention} />
                  <Field label="Comparator" value={synopsis.comparator} />
                </div>
                <Field label="Background" value={synopsis.background} />
                <div className="grid grid-cols-2 gap-3">
                  <FieldList label="Inclusion" items={synopsis.inclusionCriteria} />
                  <FieldList label="Exclusion" items={synopsis.exclusionCriteria} />
                </div>
                <Field label="Primary Outcome" value={synopsis.primaryOutcome || synopsis.outcomes} />
                <FieldList label="Secondary Outcomes" items={synopsis.secondaryOutcomes} />
                <FieldList label="Safety Outcomes" items={synopsis.safetyOutcomes} />
                <Field label="Main Findings" value={synopsis.mainFindings} />
                <Field label="Authors' Conclusion" value={synopsis.authorsConclusion} />
                <div className="grid grid-cols-2 gap-3">
                  <FieldList label="Strengths" items={synopsis.strengths} />
                  <FieldList label="Weaknesses" items={synopsis.weaknesses} />
                </div>
                <Field label="Clinical Meaning" value={synopsis.clinicalMeaning} />
                <Field label="Limitations" value={synopsis.limitations} />

                {synopsis.bottomLine && (
                  <div className="rounded-xl bg-slate-900 dark:bg-white/5 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Bottom Line</p>
                    <p className="text-xs text-white dark:text-slate-100 leading-relaxed">{synopsis.bottomLine}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FieldList label="Do Not Overclaim" items={synopsis.whatNotToOverclaim} />
                  <FieldList label="Quiz Focus" items={synopsis.quizFocusPoints} />
                </div>

                {synopsis.trustRationale && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trust Rationale</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{synopsis.trustRationale}</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Appraisal helpful?</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={synopsisFeedbackPending}
                      onClick={() => handleSynopsisFeedback('helpful')}
                      aria-label="Mark this appraisal as helpful"
                      title="Helpful"
                      className={`h-7 w-7 rounded-md text-xs transition-colors ${
                        synopsisFeedback === 'helpful'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                      }`}>
                      <i className={`${synopsisFeedback === 'helpful' ? 'fas' : 'far'} fa-thumbs-up`} />
                    </button>
                    <button type="button" disabled={synopsisFeedbackPending}
                      onClick={() => handleSynopsisFeedback('not_helpful')}
                      aria-label="Mark this appraisal as not helpful"
                      title="Not helpful"
                      className={`h-7 w-7 rounded-md text-xs transition-colors ${
                        synopsisFeedback === 'not_helpful'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                      }`}>
                      <i className={`${synopsisFeedback === 'not_helpful' ? 'fas' : 'far'} fa-thumbs-down`} />
                    </button>
                  </div>
                </div>

                <ClinicalSafetyNotice status="abstract_only" />
              </>
            )}
          </div>
        )}

        {/* CONSORT TAB */}
        {tab === 'consort' && (
          <div className="p-5 space-y-4">
            {consortState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-7 h-7 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm">Assessing CONSORT reporting…</p>
              </div>
            )}
            {consortState === 'error' && (
              <div className="text-center py-12">
                <p className="text-red-500 text-sm mb-3">Assessment unavailable.</p>
                <button type="button" onClick={loadConsort}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Retry
                </button>
              </div>
            )}
            {consortState === 'done' && consort && (() => {
              const pct = Math.round((consort.adequateCount / consort.totalDomains) * 100);
              const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500';
              const textColor = pct >= 70 ? 'text-emerald-700 dark:text-emerald-300' : pct >= 40 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300';
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`impact-bar-fill ${barColor} h-full rounded-full`} data-pct={String(Math.round(pct / 10) * 10)} />
                    </div>
                    <span className={`text-sm font-bold ${textColor}`}>{pct}%</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{consort.overallSummary}</p>
                  <p className={`text-xs font-semibold ${textColor}`}>
                    {consort.overallAdherence.charAt(0).toUpperCase() + consort.overallAdherence.slice(1)} adherence · {consort.adequateCount}/{consort.totalDomains} domains adequate
                  </p>
                  {!consort.isRct && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">Note: study not identified as RCT — CONSORT applies partially.</p>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(consort.domains).map(([key, domain]) => {
                      const s = CONSORT_STYLE[domain.adherence] ?? CONSORT_STYLE.not_reported;
                      return (
                        <div key={key} className="flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 border border-slate-100 dark:border-slate-700/50">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${s.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{CONSORT_LABELS[key] ?? key}</p>
                              <span className={`shrink-0 text-[9px] font-bold rounded-full px-2 py-0.5 ${s.chip}`}>
                                {domain.adherence.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{domain.rationale}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Assessment based on abstract text only.</p>
                </>
              );
            })()}
          </div>
        )}

        {/* GUIDELINES TAB */}
        {tab === 'guidelines' && (
          <div className="p-5 space-y-4">
            {guidelineState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-7 h-7 border-[3px] border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-sm">Finding related guidelines…</p>
              </div>
            )}
            {guidelineState === 'empty' && (
              <div className="text-center py-12 text-slate-400">
                <i className="fas fa-book-open text-3xl mb-3 block" />
                <p className="text-sm">No stored guidelines matched this article's topic.</p>
                <p className="text-xs mt-1 text-slate-300">Guidelines are indexed from major bodies (NICE, AHA, ESC, etc.) and added over time.</p>
              </div>
            )}
            {guidelineState === 'done' && guidelines.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {guidelines.length} guideline snippet{guidelines.length !== 1 ? 's' : ''} matched
                </p>
                <div className="space-y-3">
                  {guidelines.map((g) => {
                    const strengthKey = (g.recommendationStrength ?? '').toLowerCase();
                    const strengthCls = Object.entries(STRENGTH_COLOR).find(([k]) => strengthKey.includes(k))?.[1] ?? STRENGTH_COLOR.moderate;
                    return (
                      <div key={g.id} className="rounded-xl border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            {g.sourceBody}{g.sourceYear ? ` (${g.sourceYear})` : ''}
                          </p>
                          {g.recommendationStrength && (
                            <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${strengthCls}`}>
                              {g.recommendationStrength}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{g.recommendationText}</p>
                        {g.recommendationCertainty && (
                          <p className="text-[10px] text-slate-400">Certainty: {g.recommendationCertainty}</p>
                        )}
                        {g.population && (
                          <p className="text-[10px] text-slate-400">Population: {g.population}</p>
                        )}
                        {g.sourceUrl && (
                          <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors">
                            <i className="fas fa-external-link-alt text-[9px]" /> View source
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Snippet matching uses keywords from the article title. Always verify the full guideline context before applying to patient care.
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
