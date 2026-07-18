import React, { useState } from 'react';
import { Button } from '@components/ui/Button';
import api from '@services/api';
import type { Article, ArticleSynopsisFields, ConsortResult } from '@types';
import { EvidenceAuditPanel, type EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import { ArticleCardConsortPanel } from './ArticleCardConsortPanel';
import { ArticleCardSynopsisPanel, type SynopsisSourceMode } from './ArticleCardSynopsisPanel';

interface ArticleCardActionRowProps {
  article: Article;
  isSaved: boolean;
  isRct: boolean;
  searchId?: number;
  searchCompletedAt?: number | null;
  primaryUrl: string;
  sourceLabel: string;
  onAnalyze?: (article: Article) => void;
  onGenerateCase?: (article: Article) => void;
  onQuizPaper?: (article: Article) => void;
  onSave?: (article: Article) => void;
  onViewDetails?: (article: Article) => void;
  onFeedback?: (article: Article, type: 'helpful' | 'not_helpful') => void;
  onToggleCollections: () => void;
  onToggleAnnotations: () => void;
  onToggleCitations: () => void;
}

export const ArticleCardActionRow: React.FC<ArticleCardActionRowProps> = ({
  article,
  isSaved,
  isRct,
  searchId,
  primaryUrl,
  sourceLabel,
  onAnalyze,
  onGenerateCase,
  onQuizPaper,
  onSave,
  onViewDetails,
  onFeedback,
  onToggleCollections,
  onToggleAnnotations,
  onToggleCitations,
}) => {
  const [synopsisState, setSynopsisState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [synopsis, setSynopsis] = useState<ArticleSynopsisFields | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [synopsisAudit, setSynopsisAudit] = useState<EvidenceAuditSnapshot | null>(null);
  const [consortState, setConsortState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [consort, setConsort] = useState<ConsortResult | null>(null);
  const [consortExpanded, setConsortExpanded] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const synopsisSourceMode: SynopsisSourceMode | undefined = typeof synopsisAudit?.fullTextCoverageRatio === 'number'
    ? synopsisAudit.fullTextCoverageRatio > 0 ? 'full_text_used' : 'abstract_only'
    : undefined;

  const closeMoreMenuOnFocusLeave = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowMoreMenu(false);
  };

  const hasCitations = article._source === 'semantic' || !!article.doi;

  return (
    <>
      {synopsisExpanded && synopsis && (
        <div className="mt-2 space-y-2">
          <ArticleCardSynopsisPanel
            synopsis={synopsis}
            sourceMode={synopsisSourceMode}
            reviewState={typeof synopsisAudit?.humanReviewStatus === 'string' ? synopsisAudit.humanReviewStatus : null}
            citationOk={synopsisAudit?.citationOk ?? null}
            abstractOnly={synopsisAudit?.fullTextCoverageRatio === 0}
            fullTextCoverageRatio={typeof synopsisAudit?.fullTextCoverageRatio === 'number' ? synopsisAudit.fullTextCoverageRatio : null}
            onClose={() => { setSynopsisExpanded(false); setSynopsisAudit(null); }}
          />
          {synopsisAudit && <EvidenceAuditPanel snapshot={synopsisAudit} />}
        </div>
      )}

      {consortExpanded && consort && (
        <div className="mt-2">
          <ArticleCardConsortPanel consort={consort} onClose={() => setConsortExpanded(false)} />
        </div>
      )}

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
                citationOk: typeof au?.citationCheckPassed === 'boolean'
                  ? au.citationCheckPassed as boolean
                  : (au?.citationValidation as { ok?: boolean } | undefined)?.ok ?? null,
                citationIssueCount: (au?.citationValidation as { issueCount?: number } | undefined)?.issueCount ?? null,
                retractionFlagged: Boolean(article._retraction?.isRetracted),
                retractionChecked: Boolean(au?.retractionChecked ?? article._retraction),
                humanReviewStatus: typeof au?.humanReviewStatus === 'string'
                  ? (au.humanReviewStatus as string)
                  : (typeof au?.reviewState === 'string' ? (au.reviewState as string) : 'unreviewed'),
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
          title="Critically appraise this paper — PICO, methodology, trust rating, bottom line"
          disabled={synopsisState === 'loading'}
        >
          {synopsisState === 'loading'
            ? <><div className="spinner w-3 h-3" /> Appraising…</>
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
              ? <><div className="spinner w-3 h-3" /> CONSORT…</>
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
                onClick={() => { onToggleCollections(); setShowMoreMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                <i className="fas fa-folder-plus w-3.5 text-indigo-400" /> Add to collection
              </button>
              <button type="button"
                role="menuitem"
                onClick={() => { onToggleAnnotations(); setShowMoreMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                <i className="fas fa-highlighter w-3.5 text-amber-400" /> Add note
              </button>
              {hasCitations && (
                <button type="button"
                  role="menuitem"
                  onClick={() => { onToggleCitations(); setShowMoreMenu(false); }}
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
    </>
  );
};
