import React, { useState } from 'react';
import { CollectionsPanel } from '@components/collaboration/CollectionsPanel';
import { AnnotationPanel } from '@components/collaboration/AnnotationPanel';
import { CitationExplorer } from '@components/search/CitationExplorer';
import { getArticleLinkInfo } from '@services/articleLinks';
import api from '@services/api';
import type { Article } from '@types';
import { logAsyncError } from '@utils/handleAsyncError';
import { ArticleCardAccessPanel } from './ArticleCardAccessPanel';
import { ArticleCardBadgesRow } from './ArticleCardBadgesRow';
import { ArticleCardActionRow } from './ArticleCardActionRow';
import {
  CURRENT_YEAR,
  EVIDENCE_TYPE_LABEL,
  quickSignalClass,
  isLikelyPreprint,
  isPotentialPredatoryJournal,
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
  const [showAbstract, setShowAbstract] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [pdfLookup, setPdfLookup] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfIndexed, setPdfIndexed] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(false);
  const hoverTimerRef = React.useRef<number | null>(null);
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

  const impact = article._impact;
  const quality = article._quality;
  const isFree = article.isFree || !!article.pmcid;
  const freeUrl = article.pmcid
    ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`
    : article.fullTextUrl || null;
  const authors = article.authors?.slice(0, 3).map((a) => a.name).join(', ');
  const hasMoreAuthors = (article.authors?.length ?? 0) > 3;
  const { primaryUrl, sourceLabel } = getArticleLinkInfo(article);
  const impactPct = Math.min(100, Math.round((impact?.score ?? 0) * 100));
  const citations = article.pmcrefcount ?? article.citationCount;
  const qualitySignals = quality?.signals?.slice(0, 2) ?? [];
  const impactFactors = impact?.factors?.slice(0, 3) ?? [];
  const pubYear = parseInt((article.pubdate || '').slice(0, 4), 10);
  const isPreprint = isLikelyPreprint(article);
  const predatoryFlag = isPotentialPredatoryJournal(article);
  const isPracticeChanging = !isNaN(pubYear) && pubYear >= (CURRENT_YEAR - 3) && (citations ?? 0) >= 100;
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
    article._retraction?.isRetracted && { label: 'Retracted', icon: 'fa-ban', tone: 'danger' },
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
        <ArticleCardBadgesRow
          article={article}
          isFree={isFree}
          pdfIndexed={pdfIndexed}
          isSelected={isSelected}
          onSelect={onSelect}
          onOpenTopic={onOpenTopic}
        />

        {/* Retraction warning */}
        {article._retraction?.isRetracted && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 px-3 py-2 bg-red-600 text-white border border-red-700 rounded-xl text-xs shadow-lg shadow-red-500/20"
          >
            <span className="font-black uppercase tracking-wide">Retracted paper - verify the retraction notice before using this source</span>
            {article._retraction.retractionDate && ` · ${article._retraction.retractionDate}`}
            {article._retraction.reason && ` · ${article._retraction.reason}`}
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
          <span className="opacity-40">·</span>
          <span>{article.pubdate?.split(' ')[0] || article.year}</span>
          {citations !== undefined && (
            <>
              <span className="opacity-40">·</span>
              <span>{citations.toLocaleString()} cited</span>
            </>
          )}
          {article._source && article._source !== 'pubmed' && (
            <>
              <span className="opacity-40">·</span>
              <span className="uppercase text-[0.6rem]">{article._source}</span>
            </>
          )}
        </div>

        {/* Quick signal pills */}
        {quickSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {quickSignals.slice(0, 5).map((signal) => (
              <span
                key={signal.label}
                className={`inline-flex min-h-6 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${quickSignalClass(signal.tone)}`}
              >
                <i className={`fas ${signal.icon} text-[9px]`} />
                {signal.label}
              </span>
            ))}
          </div>
        )}

        {/* Hover abstract preview */}
        {hoverPreview && !showAbstract && article.abstract && (
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 animate-fade-in">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {article.abstract}
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

        <ArticleCardAccessPanel
          article={article}
          isFree={isFree}
          freeUrl={freeUrl}
          primaryUrl={primaryUrl}
          sourceLabel={sourceLabel}
          pdfLookup={pdfLookup}
          setPdfLookup={setPdfLookup}
          pdfUrl={pdfUrl}
          setPdfUrl={setPdfUrl}
          onOpenInWorkspace={onOpenInWorkspace}
        />

        <ArticleCardActionRow
          article={article}
          isSaved={isSaved}
          isRct={isRct}
          searchId={searchId}
          searchCompletedAt={searchCompletedAt}
          primaryUrl={primaryUrl}
          sourceLabel={sourceLabel}
          onAnalyze={onAnalyze}
          onGenerateCase={onGenerateCase}
          onQuizPaper={onQuizPaper}
          onSave={onSave}
          onViewDetails={onViewDetails}
          onFeedback={onFeedback}
          onToggleCollections={() => { closeAllPanels(); setShowCollections(true); }}
          onToggleAnnotations={() => { closeAllPanels(); setShowAnnotations(true); }}
          onToggleCitations={() => { closeAllPanels(); setShowCitations(true); }}
        />
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
