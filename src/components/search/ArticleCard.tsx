import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import { CollectionsPanel } from '@components/collaboration/CollectionsPanel';
import { AnnotationPanel } from '@components/collaboration/AnnotationPanel';
import { CitationExplorer } from '@components/search/CitationExplorer';
import { getArticleLinkInfo, getArticleSourceBadgeInfo } from '@services/articleLinks';
import api from '@services/api';
import type { Article, ArticleSynopsisFields, ConsortResult } from '@types';
import { RankingTraceBadge } from '@components/search/RankingTraceBadge';
import { EvidenceAuditPanel, type EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import { logAsyncError } from '@utils/handleAsyncError';
import { ArticleCardConsortPanel } from './ArticleCardConsortPanel';
import { ArticleCardSynopsisPanel, type SynopsisSourceMode } from './ArticleCardSynopsisPanel';
import {
  CURRENT_YEAR,
  EVIDENCE_TYPE_LABEL,
  GRADE_CLASS,
  isLikelyPreprint,
  isPotentialPredatoryJournal,
  quickSignalClass,
} from './articleCardUtils';

interface ArticleCardProps {
  article: Article;
  isSaved?: boolean;
  isSelected?: boolean;
  onSave?: (article: Article) => void;
  onSelect?: (article: Article) => void;
  onAnalyze?: (article: Article) => void;
  onGenerateCase?: (article: Article) => void;
  onQuizPaper?: (article: Article) => void;
  onOpenTopic?: (topic: string) => void;
  onOpenInWorkspace?: (url: string) => void;
  onViewDetails?: (article: Article) => void;
  onFeedback?: (article: Article, type: 'helpful' | 'not_helpful') => void;
  searchId?: number;
  searchCompletedAt?: number | null;
}

const PREFETCHED_ARTICLES = new Set<string>();

const ArticleCardComponent: React.FC<ArticleCardProps> = ({
  article, isSaved = false, isSelected = false, onSave, onSelect, onAnalyze, onGenerateCase, onQuizPaper, onOpenTopic, onOpenInWorkspace, onViewDetails, onFeedback, searchId, searchCompletedAt,
}) => {
  const navigate = useNavigate();
  const [showAbstract, setShowAbstract] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pdfLookup, setPdfLookup] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfIndexed, setPdfIndexed] = useState(false);
  const [synopsisState, setSynopsisState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [synopsis, setSynopsis] = useState<ArticleSynopsisFields | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [synopsisAudit, setSynopsisAudit] = useState<EvidenceAuditSnapshot | null>(null);
  const [consortState, setConsortState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [consort, setConsort] = useState<ConsortResult | null>(null);
  const [consortExpanded, setConsortExpanded] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(false);
  const hoverTimerRef = React.useRef<number | null>(null);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const dwellTimerRef = React.useRef<number | null>(null);
  const dwellStartedAtRef = React.useRef<number | null>(null);
  const maxLoggedDwellMsRef = React.useRef(0);

  const isRct = article._impact?.evidenceType === 'rct' || (article.pubtype ?? []).some((t) => /randomized|randomised|rct/i.test(t));

  const showHoverPreview = React.useCallback(() => {
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setHoverPreview(true), 350);
  }, []);

  const hideHoverPreview = React.useCallback(() => {
    if (hoverTimerRef.current !== null) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setHoverPreview(false);
  }, []);

  const closeAllPanels = () => { setShowCollections(false); setShowAnnotations(false); setShowCitations(false); };
  const closeMoreMenuOnFocusLeave = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowMoreMenu(false);
  };

  const impact = article._impact;
  const quality = article._quality;
  const isFree = article.isFree || !!article.pmcid;
  const freeUrl = article.pmcid
    ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`
    : article.fullTextUrl || null;
  const authors = article.authors?.slice(0, 3).map((a) => a.name).join(', ');
  const hasMoreAuthors = (article.authors?.length ?? 0) > 3;
  const { primaryUrl, sourceLabel } = getArticleLinkInfo(article);
  const sourceBadge = getArticleSourceBadgeInfo(article);
  const impactPct = Math.min(100, Math.round((impact?.score ?? 0) * 100));
  const citations = article.pmcrefcount ?? article.citationCount;
  const qualitySignals = quality?.signals?.slice(0, 2) ?? [];
  const impactFactors = impact?.factors?.slice(0, 3) ?? [];
  const isPreprint = isLikelyPreprint(article);
  const predatoryFlag = isPotentialPredatoryJournal(article);
  const pubYear = parseInt((article.pubdate || '').slice(0, 4), 10);
  const isOutdated = !isNaN(pubYear) && pubYear < (CURRENT_YEAR - 9);
  const isPracticeChanging = !isNaN(pubYear) && pubYear >= (CURRENT_YEAR - 3) && (citations ?? 0) >= 100;
  const lastSynced = article._retraction?.source || article._source;
  const synopsisSourceMode: SynopsisSourceMode | undefined = typeof synopsisAudit?.fullTextCoverageRatio === 'number'
    ? synopsisAudit.fullTextCoverageRatio > 0
      ? 'full_text_used'
      : 'abstract_only'
    : undefined;
  const quickSignals = [
    impact?.evidenceType && {
      label: EVIDENCE_TYPE_LABEL[impact.evidenceType] ?? impact.evidenceType,
      icon: impact.evidenceType === 'rct' ? 'fa-flask' : impact.evidenceType === 'meta' ? 'fa-layer-group' : 'fa-file-lines',
      tone: impact.evidenceType === 'rct' || impact.evidenceType === 'meta' ? 'good' : 'neutral',
    },
    quality?.grade && {
      label: `Grade ${quality.grade}`,
      icon: 'fa-shield-halved',
      tone: quality.grade === 'A' || quality.grade === 'B' ? 'good' : 'warn',
    },
    isFree && { label: 'Open access', icon: 'fa-unlock', tone: 'good' },
    isPracticeChanging && { label: 'Practice-changing', icon: 'fa-bolt', tone: 'info' },
    isOutdated && { label: 'Older evidence', icon: 'fa-clock-rotate-left', tone: 'warn' },
    isPreprint && { label: 'Preprint', icon: 'fa-vial-circle-check', tone: 'warn' },
    article._retraction?.isRetracted && { label: 'Retracted', icon: 'fa-ban', tone: 'danger' },
    predatoryFlag && { label: 'Journal check', icon: 'fa-triangle-exclamation', tone: 'danger' },
  ].filter(Boolean) as Array<{ label: string; icon: string; tone: 'good' | 'info' | 'warn' | 'danger' | 'neutral' }>;

  const prefetchArticle = React.useCallback(() => {
    if (PREFETCHED_ARTICLES.has(article.uid)) return;
    PREFETCHED_ARTICLES.add(article.uid);
    if (article.doi) {
      void api.documents.findFullText(article.doi).catch((err) => logAsyncError(err, 'ArticleCard/findFullText'));
    }
    void api.ai.checkRetraction(article.uid, article.doi, article.pmid)
      .catch((err) => logAsyncError(err, 'ArticleCard/checkRetraction'));
    void api.documents.getPdfStatus({ uid: article.uid, doi: article.doi, pmcid: article.pmcid })
      .then((s) => { if (s.indexed) setPdfIndexed(true); })
      .catch((err) => logAsyncError(err, 'ArticleCard/getPdfStatus'));
  }, [article.doi, article.pmid, article.uid, article.pmcid]);

  const flushDwell = React.useCallback(() => {
    if (dwellTimerRef.current !== null) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    const startedAt = dwellStartedAtRef.current;
    dwellStartedAtRef.current = null;
    if (!startedAt) return;

    const dwellMs = Math.min(30 * 60 * 1000, Math.max(0, Date.now() - startedAt));
    if (dwellMs < 3000) return;
    if (dwellMs <= maxLoggedDwellMsRef.current + 1000) return;

    maxLoggedDwellMsRef.current = dwellMs;
    if (searchId) {
      void api.search.logSearchInteraction(searchId, article.uid, 'dwell', dwellMs, undefined, article._decisionId ?? undefined);
    }
    void api.documents.logEvent('article_dwell', { articleUid: article.uid, dwellMs, source: article._source });
  }, [article._decisionId, article._source, article.uid, searchId]);

  const startDwell = React.useCallback(() => {
    prefetchArticle();
    if (dwellStartedAtRef.current !== null) return;
    dwellStartedAtRef.current = Date.now();
    if (dwellTimerRef.current !== null) clearTimeout(dwellTimerRef.current);
    dwellTimerRef.current = window.setTimeout(() => {
      if (!dwellStartedAtRef.current) return;
      const dwellMs = Math.min(30 * 60 * 1000, Date.now() - dwellStartedAtRef.current);
      if (dwellMs >= 3000 && dwellMs > maxLoggedDwellMsRef.current + 1000) {
        maxLoggedDwellMsRef.current = dwellMs;
        if (searchId) {
          void api.search.logSearchInteraction(searchId, article.uid, 'dwell', dwellMs, undefined, article._decisionId ?? undefined);
        }
        void api.documents.logEvent('article_dwell', { articleUid: article.uid, dwellMs, source: article._source });
      }
    }, 3000);
  }, [article._decisionId, article._source, article.uid, prefetchArticle, searchId]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDwell();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushDwell();
    };
  }, [flushDwell]);

  const accentColor = article._retraction?.isRetracted
    ? 'bg-red-600'
    : isSelected
      ? 'bg-indigo-500'
      : isFree
        ? 'bg-emerald-400'
        : 'bg-amber-400';

  return (
    <article
      onMouseEnter={() => { startDwell(); showHoverPreview(); }}
      onMouseLeave={() => { flushDwell(); hideHoverPreview(); }}
      onFocus={startDwell}
      onBlur={() => { flushDwell(); hideHoverPreview(); }}
      className={`relative neo-card overflow-hidden animate-fade-up ${
        article._retraction?.isRetracted
          ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
          : ''
      } ${isSelected ? 'ring-1 ring-indigo-500/40' : ''}`}
    >

      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentColor} opacity-80`} />

      <div className="pl-5 pr-5 pt-5 pb-4">

        {/* Top row: badges + grade ring */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {isFree ? (
              <span className="badge badge-free">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Open
              </span>
            ) : (
              <span className="badge badge-paywall">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Paywall
              </span>
            )}

            {impact?.level && (
              <span className={`badge ${impact.level === 'high' ? 'badge-impact-high' : 'badge-source'}`}>
                {impact.level === 'high' ? 'â†‘ High Impact' : impact.level === 'medium' ? '~ Mid Impact' : 'Low Impact'}
              </span>
            )}

            {impact?.evidenceType && (
              <span className="badge badge-source">
                {EVIDENCE_TYPE_LABEL[impact.evidenceType] ?? impact.evidenceType}
              </span>
            )}

            <span className={`badge border ${sourceBadge.className}`} title={`Source: ${sourceBadge.label}`}>
              {sourceBadge.label}
            </span>

            {article._retraction?.isRetracted && (
              <span className="badge badge-retracted">Warning: Retracted</span>
            )}

            {article._isPreprint && (
              <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}
                title="Preprint â€” not yet peer reviewed">
                Warning: Preprint
              </span>
            )}

            {isPreprint && !article._isPreprint && (
              <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}
                title="Preprint - not yet peer reviewed">
                Preprint
              </span>
            )}

            {predatoryFlag && (
              <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.35)' }}
                title="Journal appears on a local predatory-journal watchlist. Verify before citing.">
                Journal watchlist
              </span>
            )}

            {article._ebmLabel && (
              <span
                className="badge badge-source font-semibold"
                title={`Evidence tier: ${article._ebmLabel.label}`}
                style={{
                  background: article._ebmScore !== undefined && article._ebmScore >= 6
                    ? 'rgba(16,185,129,0.12)'
                    : article._ebmScore !== undefined && article._ebmScore >= 4
                      ? 'rgba(99,102,241,0.12)'
                      : undefined,
                  color: article._ebmScore !== undefined && article._ebmScore >= 6
                    ? '#059669'
                    : article._ebmScore !== undefined && article._ebmScore >= 4
                      ? '#6366f1'
                      : undefined,
                }}
              >
                {article._ebmLabel.short}
              </span>
            )}

            {isPracticeChanging && (
              <span
                className="badge font-semibold"
                title="Recent high-citation paper â€” may represent practice-changing evidence"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.35)' }}
              >
                âš¡ Recent high-impact
              </span>
            )}

            {isOutdated && !isPracticeChanging && (
              <span
                className="badge font-semibold"
                title="Published 10+ years ago â€” verify against current guidelines before applying"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' }}
              >
                Warning: Verify recency
              </span>
            )}

            {pdfIndexed && (
              <span
                className="badge font-semibold"
                title="Full text has been pre-indexed â€” AI can analyze specific sections"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.35)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />
                Full Text âœ“
              </span>
            )}

            {article._rankingTrace && (
              <RankingTraceBadge
                trace={article._rankingTrace}
                movedByLearning={article._rankMovedByLearning}
                compactReasons={article._rankReasons}
              />
            )}

            {article._synapseTopics && article._synapseTopics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {article._synapseTopics.map((synTopic) => (
                  <span
                    key={synTopic}
                    className="badge font-semibold cursor-pointer hover:opacity-80"
                    title={`This paper is also cited in ${synTopic}`}
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.35)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenTopic) onOpenTopic(synTopic);
                      else navigate(`/search?q=${encodeURIComponent(synTopic)}`);
                    }}
                  >
                    â†” {synTopic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {quality && (
              <div
                className={`grade-ring ${GRADE_CLASS[quality.grade] ?? 'grade-D'}`}
                title={`Quality ${quality.grade} Â· ${quality.score}/100\n${quality.factors.slice(0, 3).join(' Â· ')}`}
              >
                {quality.grade}
              </div>
            )}
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(article)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                }`}
                title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
              >
                {isSelected && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Retraction warning */}
        {article._retraction?.isRetracted && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 px-3 py-2 bg-red-600 text-white border border-red-700 rounded-xl text-xs shadow-lg shadow-red-500/20"
          >
            <span className="font-black uppercase tracking-wide">Retracted paper - verify the retraction notice before using this source</span>
            {article._retraction.retractionDate && ` Â· ${article._retraction.retractionDate}`}
            {article._retraction.reason && ` Â· ${article._retraction.reason}`}
          </div>
        )}

        {(isPreprint || predatoryFlag) && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
            {isPreprint && <p><span className="font-bold">Preprint:</span> not peer reviewed.</p>}
            {predatoryFlag && <p><span className="font-bold">Journal watchlist:</span> verify journal quality and indexing before citing.</p>}
          </div>
        )}

        {/* Title */}
        <h3 className={`font-bold text-[0.95rem] leading-snug mb-2 line-clamp-2 ${
          article._retraction?.isRetracted
            ? 'line-through text-red-800/70 dark:text-red-400/70 decoration-red-400'
            : 'text-slate-900 dark:text-slate-100'
        }`}>
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            onClick={() => {
              if (searchId) {
                const elapsedMs = searchCompletedAt ? Math.max(0, Date.now() - searchCompletedAt) : undefined;
                api.search.logSearchInteraction(searchId, article.uid, 'click', undefined, elapsedMs, article._decisionId ?? undefined);
              }
              api.documents.logEvent('article_click', { articleUid: article.uid, source: article._source });
            }}
          >
            {article.title}
          </a>
        </h3>

        {/* Authors */}
        {authors && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
            {authors}{hasMoreAuthors && ' et al.'}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[0.7rem] text-slate-400 dark:text-slate-500 mb-3 flex-wrap font-mono">
          <span className="truncate max-w-[12rem]">{article.source || article.journal || 'Unknown Journal'}</span>
          <span className="opacity-40">Â·</span>
          <span>{article.pubdate?.split(' ')[0] || article.year}</span>
          {citations !== undefined && (
            <>
              <span className="opacity-40">Â·</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-bold">{citations.toLocaleString()} cit.</span>
            </>
          )}
        </div>

        <p className="-mt-2 mb-3 text-[10px] font-mono text-slate-400 dark:text-slate-500">
          Metadata synced via {lastSynced}
        </p>

        {quickSignals.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickSignals.slice(0, 5).map((signal) => (
              <span
                key={`${signal.icon}-${signal.label}`}
                className={`inline-flex min-h-6 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${quickSignalClass(signal.tone)}`}
              >
                <i className={`fas ${signal.icon} text-[9px]`} />
                {signal.label}
              </span>
            ))}
          </div>
        )}

        {/* Hover abstract preview â€” shown after 350ms of hover, hidden once synopsis is expanded */}
        {hoverPreview && !showAbstract && !synopsisExpanded && article.abstract && (
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 animate-fade-in">
            {synopsis?.takeaway && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Key takeaway</p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {synopsis?.takeaway ?? article.abstract}
            </p>
          </div>
        )}

        {/* Impact bar */}
        {impact && (
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Why this ranks here</span>
              <span className="font-mono text-[11px] font-bold text-indigo-500">{impactPct}/100</span>
            </div>
            <div className="impact-bar mb-2">
              <div className="impact-bar-fill" data-pct={String(Math.round(impactPct / 10) * 10)} />
            </div>
            {(impactFactors.length > 0 || qualitySignals.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {impactFactors.map((factor) => (
                  <span key={factor} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                    {factor}
                  </span>
                ))}
                {qualitySignals.map((signal) => (
                  <span key={signal} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Abstract toggle */}
        {article.abstract && (
          <button
            type="button"
            onClick={() => setShowAbstract(!showAbstract)}
            className="text-[0.72rem] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showAbstract ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
            {showAbstract ? 'Hide abstract' : 'Abstract'}
          </button>
        )}

        {showAbstract && article.abstract && (
          <div className="mb-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed animate-fade-in border border-slate-100 dark:border-slate-700/50">
            {article.abstract}
          </div>
        )}

        {/* Access CTA */}
        <div className="mb-3 space-y-2">
          {isFree && freeUrl ? (
            <div className="space-y-1.5">
              {onOpenInWorkspace && (freeUrl.toLowerCase().endsWith('.pdf') || /pmc\//.test(freeUrl)) && (
                <button
                  type="button"
                  onClick={() => onOpenInWorkspace(freeUrl)}
                  className="flex w-full items-center justify-center gap-2 py-2 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  <i className="fas fa-columns text-[10px]" /> Split workspace
                </button>
              )}
              <a
                href={freeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all hover:shadow-lg hover:shadow-emerald-500/25"
              >
                <i className="fas fa-unlock text-[10px]" /> Read Free Â· Full Text
              </a>
            </div>
          ) : (
            <>
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                <i className="fas fa-lock text-[10px] opacity-60" /> View on {sourceLabel}
              </a>
              {article.doi && pdfLookup === 'idle' && (
                <button
                  type="button"
                  onClick={async () => {
                    setPdfLookup('loading');
                    try {
                      const result = await api.documents.findFullText(article.doi!);
                      if (result.isFree && result.url) { setPdfUrl(result.url); setPdfLookup('found'); }
                      else setPdfLookup('not-found');
                    } catch { setPdfLookup('not-found'); }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-1.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[0.7rem] font-medium transition-colors"
                >
                  <i className="fas fa-search text-[10px]" /> Find free version via Unpaywall
                </button>
              )}
              {pdfLookup === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
                  <div className="spinner" /> Searching open-access repositoriesâ€¦
                </div>
              )}
              {pdfLookup === 'found' && pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                  <i className="fas fa-unlock text-[10px]" /> Free Version Found Â· Open PDF
                </a>
              )}
              {pdfLookup === 'not-found' && (
                <p className="text-center text-[0.7rem] text-slate-400 py-1">No free version found via Unpaywall.</p>
              )}
            </>
          )}
        </div>

        {/* Inline synopsis panel */}
        {synopsisExpanded && synopsis && (
          <div className="mt-2 space-y-2">
            <ArticleCardSynopsisPanel synopsis={synopsis} sourceMode={synopsisSourceMode} onClose={() => { setSynopsisExpanded(false); setSynopsisAudit(null); }} />
            {synopsisAudit && <EvidenceAuditPanel snapshot={synopsisAudit} />}
          </div>
        )}

        {/* Inline CONSORT panel */}
        {consortExpanded && consort && (
          <div className="mt-2">
            <ArticleCardConsortPanel consort={consort} onClose={() => setConsortExpanded(false)} />
          </div>
        )}

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={async () => {
              if (synopsis) { setSynopsisExpanded((v) => !v); return; }
              setSynopsisState('loading');
              setSynopsisAudit(null);
              try {
                const result = await api.ai.getSynopsis(article, { async: true });
                if (!result.synopsis) throw new Error('Synopsis unavailable');
                const au = result.audit as Record<string, unknown> | undefined;
                setSynopsisAudit({
                  jobKey: result.jobKey,
                  model: result.model ?? null,
                  provider: result.provider ?? null,
                  generatedAt: result.timestamp ?? null,
                  sourceCount: 1,
                  fullTextCoverageRatio: typeof au?.fullTextCoverageRatio === 'number' ? (au.fullTextCoverageRatio as number) : null,
                  citationOk: null,
                  retractionFlagged: Boolean(article._retraction?.isRetracted),
                  retractionChecked: Boolean(au?.retractionChecked ?? article._retraction),
                  humanReviewStatus: typeof au?.humanReviewStatus === 'string' ? (au.humanReviewStatus as string) : 'none',
                });
                setSynopsis(result.synopsis);
                setSynopsisState('done');
                setSynopsisExpanded(true);
              } catch {
                setSynopsisState('error');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              synopsisExpanded
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:hover:bg-violet-900/40'
            }`}
            title="Critically appraise this paper â€” PICO, methodology, trust rating, bottom line"
            disabled={synopsisState === 'loading'}
          >
            {synopsisState === 'loading'
              ? <><div className="spinner w-3 h-3" /> Appraisingâ€¦</>
              : synopsisState === 'error'
                ? <><i className="fas fa-exclamation-circle text-[10px]" /> Retry appraisal</>
                : synopsis
                  ? <><i className={`fas fa-chevron-${synopsisExpanded ? 'up' : 'down'} text-[9px]`} /> Appraisal</>
                  : <><i className="fas fa-microscope text-[10px]" /> Critically Appraise</>
            }
          </button>
          {isRct && (
            <button
              type="button"
              onClick={async () => {
                if (consort) { setConsortExpanded((v) => !v); return; }
                setConsortState('loading');
                try {
                  const result = await api.review.assessConsort(article);
                  setConsort(result.consort);
                  setConsortState('done');
                  setConsortExpanded(true);
                } catch {
                  setConsortState('error');
                }
              }}
              disabled={consortState === 'loading'}
              title="Assess CONSORT 2010 reporting checklist for this RCT"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                consortExpanded
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40'
              }`}
            >
              {consortState === 'loading'
                ? <><div className="spinner w-3 h-3" /> CONSORTâ€¦</>
                : consortState === 'error'
                  ? <><i className="fas fa-exclamation-circle text-[10px]" /> Retry</>
                  : consort
                    ? <><i className={`fas fa-chevron-${consortExpanded ? 'up' : 'down'} text-[9px]`} /> CONSORT</>
                    : <><i className="fas fa-clipboard-check text-[10px]" /> CONSORT</>
              }
            </button>
          )}
          {onAnalyze && (
            <Button variant="gradient" size="sm" onClick={() => onAnalyze(article)}
              leftIcon={<i className="fas fa-robot text-[10px]" />}>
              AI Analysis
            </Button>
          )}
          {onGenerateCase && (
            <Button variant="secondary" size="sm" onClick={() => onGenerateCase(article)}
              leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>
              Use for case
            </Button>
          )}
          {onQuizPaper && !article._isPreprint && !article._retraction?.isRetracted && (
            <Button variant="secondary" size="sm" onClick={() => onQuizPaper(article)}
              leftIcon={<i className="fas fa-brain text-[10px]" />}>
              Quiz this paper
            </Button>
          )}
          {onSave && (
            <Button variant={isSaved ? 'primary' : 'secondary'} size="sm" onClick={() => {
              if (searchId) {
                api.search.logSearchInteraction(searchId, article.uid, 'save', undefined, undefined, article._decisionId ?? undefined);
              }
              onSave(article);
            }}
              leftIcon={<i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-[10px]`} />}>
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          )}

          {onViewDetails && (
            <Button variant="secondary" size="sm" onClick={() => onViewDetails(article)}
              leftIcon={<i className="fas fa-layer-group text-[10px]" />}>
              Details
            </Button>
          )}

          {/* Feedback buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={feedbackPending}
              aria-label="Mark this result as helpful"
              onClick={async () => {
                if (userFeedback === 'helpful') return;
                const previousFeedback = userFeedback;
                setUserFeedback('helpful');
                onFeedback?.(article, 'helpful');
                setFeedbackPending(true);
                try {
                  await api.search.recordSearchFeedback(article.uid, 'helpful', undefined, searchId, article._decisionId ?? undefined);
                } catch {
                  setUserFeedback(previousFeedback);
                } finally {
                  setFeedbackPending(false);
                }
              }}
              className={`px-2 py-1.5 rounded-lg text-xs transition-colors ${
                userFeedback === 'helpful'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="This result was helpful"
            >
              <i className={`${userFeedback === 'helpful' ? 'fas' : 'far'} fa-thumbs-up`} />
            </button>
            <button
              type="button"
              disabled={feedbackPending}
              aria-label="Mark this result as not helpful"
              onClick={async () => {
                if (userFeedback === 'not_helpful') return;
                const previousFeedback = userFeedback;
                setUserFeedback('not_helpful');
                onFeedback?.(article, 'not_helpful');
                setFeedbackPending(true);
                try {
                  await api.search.recordSearchFeedback(article.uid, 'not_helpful', undefined, searchId, article._decisionId ?? undefined);
                } catch {
                  setUserFeedback(previousFeedback);
                } finally {
                  setFeedbackPending(false);
                }
              }}
              className={`px-2 py-1.5 rounded-lg text-xs transition-colors ${
                userFeedback === 'not_helpful'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="This result was not helpful"
            >
              <i className={`${userFeedback === 'not_helpful' ? 'fas' : 'far'} fa-thumbs-down`} />
            </button>
          </div>

          {/* More menu */}
          <div className="relative ml-auto" onBlur={closeMoreMenuOnFocusLeave}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-haspopup="menu"
              aria-expanded={showMoreMenu}
              aria-label="Open article actions menu"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="More actions"
            >
              <i className="fas fa-ellipsis-h" />
            </button>
            {showMoreMenu && (
              <div role="menu" className="absolute right-0 bottom-full mb-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700 py-1 z-20 animate-fade-in">
                <button type="button"
                  role="menuitem"
                  onClick={() => { closeAllPanels(); setShowCollections(true); setShowMoreMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                  <i className="fas fa-folder-plus w-3.5 text-indigo-400" /> Add to collection
                </button>
                <button type="button"
                  role="menuitem"
                  onClick={() => { closeAllPanels(); setShowAnnotations(true); setShowMoreMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                  <i className="fas fa-highlighter w-3.5 text-amber-400" /> Add note
                </button>
                {(article._source === 'semantic' || article.doi) && (
                  <button type="button"
                    role="menuitem"
                    onClick={() => { closeAllPanels(); setShowCitations(true); setShowMoreMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                    <i className="fas fa-project-diagram w-3.5 text-violet-400" /> Citation network
                  </button>
                )}
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                  <i className="fas fa-external-link-alt w-3.5 text-slate-400" /> Open on {sourceLabel}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline panels */}
      {showCollections && (
        <div className="border-t border-slate-100 dark:border-slate-700/60">
          <CollectionsPanel articleToAdd={article} onClose={() => setShowCollections(false)} />
        </div>
      )}
      {showAnnotations && (
        <div className="border-t border-amber-100 dark:border-amber-900/30">
          <AnnotationPanel articleId={article.uid} articleTitle={article.title} onClose={() => setShowAnnotations(false)} />
        </div>
      )}
      {showCitations && (
        <div className="border-t border-indigo-100 dark:border-indigo-900/30">
          <CitationExplorer article={article} onClose={() => setShowCitations(false)} />
        </div>
      )}
    </article>
  );
};
ArticleCardComponent.displayName = 'ArticleCard';
export const ArticleCard = React.memo(ArticleCardComponent);

