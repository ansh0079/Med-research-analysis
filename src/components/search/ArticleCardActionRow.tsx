import React, { useState } from 'react';
import { Button } from '@components/ui/Button';
import api from '@services/api';
import type { Article, ArticleSynopsisFields, ArticleSynopsisResult, ConsortResult } from '@types';
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
  const [claimSupport, setClaimSupport] = useState<ArticleSynopsisResult['claimSupport'] | null>(null);
  // Recommendations attributed to the organisation that issued this document,
  // shown when its full text could not be retrieved.
  const [issuingBodyRecommendations, setIssuingBodyRecommendations] = useState<NonNullable<ArticleSynopsisResult['issuingBodyRecommendations']>>([]);
  // Guidance from other documents on the same topic, shown only when this
  // document's own text could not be retrieved. Never merged into `synopsis`.
  const [relatedRecommendations, setRelatedRecommendations] = useState<NonNullable<ArticleSynopsisResult['relatedRecommendations']>>([]);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [synopsisAudit, setSynopsisAudit] = useState<EvidenceAuditSnapshot | null>(null);
  const [consortState, setConsortState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [consort, setConsort] = useState<ConsortResult | null>(null);
  const [consortExpanded, setConsortExpanded] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
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
            issuingBodyRecommendations={issuingBodyRecommendations}
            relatedRecommendations={relatedRecommendations}
            claimSupport={claimSupport}
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
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-500"
        >
          <i className="fas fa-arrow-up-right-from-square text-[10px]" aria-hidden />
          Open paper
        </a>
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
              setIssuingBodyRecommendations(result.issuingBodyRecommendations || []);
              setRelatedRecommendations(result.relatedRecommendations || []);
              setClaimSupport(result.claimSupport || null);
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

        {onSave && (
          <Button variant={isSaved ? 'primary' : 'secondary'} size="sm" onClick={() => {
            if (searchId) {
              api.search.logSearchInteraction(searchId, article.uid, 'save', undefined, undefined, article._decisionId ?? undefined);
            }
            onSave(article);
          }}
            aria-label={isSaved ? 'Saved — remove from saved' : 'Save this paper'}
            title={isSaved ? 'Saved — remove from saved' : 'Save this paper'}>
            <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-[11px]`} />
          </Button>
        )}

        {userFeedback === 'not_helpful' && (
          <select
            value={feedbackReason}
            onChange={async (event) => {
              const reason = event.target.value;
              setFeedbackReason(reason);
              if (!reason) return;
              setFeedbackPending(true);
              try {
                await api.search.recordSearchFeedback(article.uid, 'not_helpful', reason, searchId, article._decisionId ?? undefined);
              } finally {
                setFeedbackPending(false);
              }
            }}
            className="h-8 rounded-lg border border-red-100 bg-red-50 px-2 text-[11px] font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            aria-label="Reason this result was not helpful"
          >
            <option value="">Reason</option>
            <option value="wrong_paper">Wrong paper</option>
            <option value="off_topic">Off-topic</option>
            <option value="missing_guideline">Missing guideline</option>
            <option value="outdated">Outdated</option>
            <option value="unsafe_overclaim">Unsafe overclaim</option>
            <option value="too_basic">Too basic</option>
            <option value="too_complex">Too complex</option>
            <option value="bad_citation">Bad citation</option>
            <option value="poor_explanation">Poor explanation</option>
          </select>
        )}

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
            <div role="menu" className="absolute right-0 bottom-full mb-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700 py-1 z-20 animate-fade-in">
              {onAnalyze && (
                <button type="button" role="menuitem" onClick={() => { onAnalyze(article); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60">
                  <i className="fas fa-robot w-3.5 text-violet-400" /> AI analysis
                </button>
              )}
              {onGenerateCase && (
                <button type="button" role="menuitem" onClick={() => { onGenerateCase(article); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60">
                  <i className="fas fa-stethoscope w-3.5 text-emerald-400" /> Use for a case
                </button>
              )}
              {onQuizPaper && !article._isPreprint && !article._retraction?.isRetracted && (
                <button type="button" role="menuitem" onClick={() => { onQuizPaper(article); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60">
                  <i className="fas fa-brain w-3.5 text-indigo-400" /> Quiz this paper
                </button>
              )}
              {onViewDetails && (
                <button type="button" role="menuitem" onClick={() => { onViewDetails(article); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60">
                  <i className="fas fa-layer-group w-3.5 text-slate-400" /> Paper details
                </button>
              )}
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
              <button
                type="button"
                role="menuitem"
                disabled={feedbackPending}
                onClick={async () => {
                  const previousFeedback = userFeedback;
                  setUserFeedback('helpful');
                  setShowMoreMenu(false);
                  onFeedback?.(article, 'helpful');
                  setFeedbackPending(true);
                  try {
                    await api.search.recordSearchFeedback(article.uid, 'helpful', undefined, searchId, article._decisionId ?? undefined);
                  } catch { setUserFeedback(previousFeedback); }
                  finally { setFeedbackPending(false); }
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                <i className="far fa-thumbs-up w-3.5 text-emerald-400" /> Helpful result
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={feedbackPending}
                onClick={async () => {
                  const previousFeedback = userFeedback;
                  setUserFeedback('not_helpful');
                  setShowMoreMenu(false);
                  onFeedback?.(article, 'not_helpful');
                  setFeedbackPending(true);
                  try {
                    await api.search.recordSearchFeedback(article.uid, 'not_helpful', feedbackReason || undefined, searchId, article._decisionId ?? undefined);
                  } catch { setUserFeedback(previousFeedback); }
                  finally { setFeedbackPending(false); }
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                <i className="far fa-thumbs-down w-3.5 text-rose-400" /> Not relevant
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
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
            </div>
          )}
        </div>
      </div>
    </>
  );
};
