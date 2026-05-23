import React, { useEffect, useState } from 'react';
import { api } from '@services/api';
import type { Article, GuidelineAlignment, TeachingClaimReviewItem } from '@types';
import { VERIFICATION_STATUS_STYLES } from '@components/ui';

export type AiJobClaimRow = {
  claimKey: string;
  claimText: string;
  sourceIds?: string[];
  evidenceQuote?: string | null;
  validationStatus?: string;
  confidence?: number | null;
};

interface RichClaim {
  claim: TeachingClaimReviewItem;
  synopsisSection: { path: string; label: string; content: string } | null;
  article: {
    uid: string | null;
    title: string | null;
    authors?: Array<{ name: string }>;
    doi?: string | null;
    pmid?: string | null;
    abstract?: string | null;
    journal?: string | null;
    pubdate?: string | null;
  };
}

interface ClaimProvenanceModalProps {
  open: boolean;
  onClose: () => void;
  topic: string;
  articles: Article[];
  claim: AiJobClaimRow | null;
}

function verificationColor(status: string): string {
  return VERIFICATION_STATUS_STYLES[status]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

type View = 'main' | 'contradictions';

export const ClaimProvenanceModal: React.FC<ClaimProvenanceModalProps> = ({
  open,
  onClose,
  topic,
  articles,
  claim,
}) => {
  const [richClaim, setRichClaim] = useState<RichClaim | null>(null);
  const [richLoading, setRichLoading] = useState(false);

  const [attempts, setAttempts] = useState<Array<{
    id: number;
    isCorrect: boolean;
    createdAt: string;
    questionText: string;
  }>>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const [guideline, setGuideline] = useState<GuidelineAlignment | null>(null);
  const [guidelineLoading, setGuidelineLoading] = useState(false);
  const [guidelineError, setGuidelineError] = useState<string | null>(null);

  const [view, setView] = useState<View>('main');
  const [contradictions, setContradictions] = useState<Article[]>([]);
  const [contradictionsLoading, setContradictionsLoading] = useState(false);
  const [contradictionsError, setContradictionsError] = useState<string | null>(null);

  const isInline = !claim?.claimKey || String(claim.claimKey).startsWith('inline-');

  useEffect(() => {
    if (!open || !claim?.claimKey || isInline) {
      setRichClaim(null);
      return;
    }
    setRichLoading(true);
    api.getTeachingClaim(claim.claimKey)
      .then(setRichClaim)
      .catch(() => setRichClaim(null))
      .finally(() => setRichLoading(false));
  }, [open, claim?.claimKey, isInline]);

  useEffect(() => {
    if (!open || !claim?.claimKey || isInline) {
      setAttempts([]);
      return;
    }
    setAttemptsLoading(true);
    api.getQuizAttemptsForClaim(claim.claimKey, 40)
      .then((r) => setAttempts(
        (r.attempts || []).map((a: { id: number; isCorrect: boolean; createdAt: string; questionText: string }) => ({
          id: a.id, isCorrect: a.isCorrect, createdAt: a.createdAt, questionText: a.questionText,
        }))
      ))
      .catch(() => setAttempts([]))
      .finally(() => setAttemptsLoading(false));
  }, [open, claim?.claimKey, isInline]);

  useEffect(() => {
    if (!open) {
      setGuideline(null);
      setGuidelineError(null);
      setView('main');
      setContradictions([]);
      setContradictionsError(null);
    }
  }, [open]);

  if (!open || !claim) return null;

  const uidSet = new Set((claim.sourceIds || []).map(String));
  const linkedArticles = articles.filter((a) => uidSet.has(String(a.uid)));
  const richArticle = richClaim?.article ?? null;

  const effectiveStatus = richClaim?.claim.verificationStatus ?? claim.validationStatus ?? 'unverified';
  const effectiveConfidence = richClaim?.claim.confidence ?? claim.confidence ?? null;
  const effectiveQuote = richClaim?.claim.evidenceQuote ?? claim.evidenceQuote ?? null;

  const runGuidelineCheck = () => {
    setGuidelineLoading(true);
    setGuidelineError(null);
    api.checkGuidelineAlignment(topic, claim.claimText, articles.slice(0, 12))
      .then(setGuideline)
      .catch((e: unknown) => setGuidelineError(e instanceof Error ? e.message : 'Guideline check failed'))
      .finally(() => setGuidelineLoading(false));
  };

  const runContradictionSearch = () => {
    setView('contradictions');
    setContradictionsLoading(true);
    setContradictionsError(null);
    api.findClaimContradictions(claim.claimKey, topic, claim.claimText)
      .then((r) => setContradictions(r.articles || []))
      .catch((e: unknown) => setContradictionsError(e instanceof Error ? e.message : 'Search failed'))
      .finally(() => setContradictionsLoading(false));
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="neo-card max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            {view === 'contradictions' && (
              <button
                type="button"
                onClick={() => setView('main')}
                className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left text-xs" />
              </button>
            )}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${view === 'contradictions' ? 'text-rose-500' : 'text-indigo-500'}`}>
                {view === 'contradictions' ? 'Contradiction search' : 'Claim provenance'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate max-w-[280px]">
                {view === 'contradictions' ? 'Evidence against this claim' : claim.claimKey}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
          {view === 'contradictions' ? (
            <ContradictionView
              loading={contradictionsLoading}
              error={contradictionsError}
              articles={contradictions}
              claimText={claim.claimText}
            />
          ) : (
            <MainView
              claim={claim}
              richClaim={richClaim}
              richLoading={richLoading}
              richArticle={richArticle}
              linkedArticles={linkedArticles}
              effectiveStatus={effectiveStatus}
              effectiveConfidence={effectiveConfidence}
              effectiveQuote={effectiveQuote}
              attempts={attempts}
              attemptsLoading={attemptsLoading}
              guideline={guideline}
              guidelineLoading={guidelineLoading}
              guidelineError={guidelineError}
              onRunGuidelineCheck={runGuidelineCheck}
            />
          )}
        </div>

        {/* ── Footer ── */}
        {view === 'main' && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className="text-xs font-bold rounded-full border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              onClick={runContradictionSearch}
            >
              <i className="fas fa-magnifying-glass mr-1.5" />
              Find evidence against this claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main view ─────────────────────────────────────────────────────────────────

interface MainViewProps {
  claim: AiJobClaimRow;
  richClaim: RichClaim | null;
  richLoading: boolean;
  richArticle: RichClaim['article'] | null;
  linkedArticles: Article[];
  effectiveStatus: string;
  effectiveConfidence: number | null;
  effectiveQuote: string | null;
  attempts: Array<{ id: number; isCorrect: boolean; createdAt: string; questionText: string }>;
  attemptsLoading: boolean;
  guideline: GuidelineAlignment | null;
  guidelineLoading: boolean;
  guidelineError: string | null;
  onRunGuidelineCheck: () => void;
}

const MainView: React.FC<MainViewProps> = ({
  claim,
  richClaim,
  richLoading,
  richArticle,
  linkedArticles,
  effectiveStatus,
  effectiveConfidence,
  effectiveQuote,
  attempts,
  attemptsLoading,
  guideline,
  guidelineLoading,
  guidelineError,
  onRunGuidelineCheck,
}) => (
  <>
    {/* Claim text */}
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Claim</p>
      <p className="text-slate-800 dark:text-slate-100 leading-relaxed">{claim.claimText}</p>
    </div>

    {/* Verification status */}
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Verification status</p>
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${verificationColor(effectiveStatus)}`}>
        {effectiveStatus.replace(/_/g, ' ')}
      </span>
      {effectiveConfidence != null && Number.isFinite(effectiveConfidence) && (
        <span className="ml-2 text-xs text-slate-500">confidence {Math.round(effectiveConfidence * 100)}%</span>
      )}
      {richClaim?.claim.verificationReason && (
        <p className="mt-1 text-xs text-slate-500 italic">{richClaim.claim.verificationReason}</p>
      )}
    </div>

    {/* Evidence quote */}
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Stored quote / tie-out</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
        {effectiveQuote || 'No stored quote — claim text is the model tie-out. Compare to primary sources below.'}
      </p>
    </div>

    {/* Synopsis section — from teaching object payload */}
    {richLoading && (
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Synopsis section</p>
        <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    )}
    {!richLoading && richClaim?.synopsisSection && (
      <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-900/10 p-3">
        <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1.5">
          <i className="fas fa-file-lines mr-1" />
          {richClaim.synopsisSection.label}
        </p>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {richClaim.synopsisSection.content}
        </p>
      </div>
    )}

    {/* Source paper */}
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Source paper</p>
      {richArticle?.title ? (
        <ArticleCard article={richArticle} />
      ) : linkedArticles.length > 0 ? (
        <ul className="space-y-2">
          {linkedArticles.map((a) => (
            <li key={a.uid}>
              <ArticleCard article={{
                uid: String(a.uid), title: a.title, doi: a.doi,
                pmid: String(a.pmid ?? ''), abstract: a.abstract,
                authors: a.authors, journal: a.journal, pubdate: a.pubdate,
              }} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No local synopsis — open numbered sources from the synthesis list, or re-run synthesis to refresh claim anchors.
        </p>
      )}
    </div>

    {/* Quiz history */}
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Quiz history</p>
      {attemptsLoading ? (
        <p className="text-xs text-slate-400">Loading attempts…</p>
      ) : attempts.length === 0 ? (
        <p className="text-xs text-slate-500">No quiz attempts recorded for this claim key yet. Generate a claim-anchored quiz from this synthesis job.</p>
      ) : (
        <>
          <div className="flex gap-4 text-xs mb-2">
            <span className="text-emerald-600">{attempts.filter((a) => a.isCorrect).length} correct</span>
            <span className="text-rose-600">{attempts.filter((a) => !a.isCorrect).length} incorrect</span>
          </div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {attempts.map((a) => (
              <li key={a.id} className="text-[11px] flex gap-2">
                <span className={a.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>{a.isCorrect ? '✓' : '✗'}</span>
                <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{a.questionText}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>

    {/* Guideline support */}
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-slate-400">Guideline support / tension</p>
      {!guideline && !guidelineLoading && !guidelineError && (
        <button
          type="button"
          onClick={onRunGuidelineCheck}
          className="text-xs font-semibold rounded-full bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-500"
        >
          Run guideline check for this claim
        </button>
      )}
      {guidelineLoading && <p className="text-xs text-slate-500">Checking NICE · AHA · WHO · SIGN…</p>}
      {guidelineError && <p className="text-xs text-red-500">{guidelineError}</p>}
      {guideline && (
        <div className="text-xs space-y-2">
          <p className="font-mono font-bold">{guideline.alignmentScore}% aligned</p>
          {guideline.summary && <p className="text-slate-600 dark:text-slate-400">{guideline.summary}</p>}
          {guideline.contradictions?.length ? (
            <ul className="text-rose-600 dark:text-rose-400 space-y-1">
              {guideline.contradictions.map((c, i) => (
                <li key={i}>{c.guideline} — {c.explanation}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-600 dark:text-emerald-400">No major automated contradictions flagged.</p>
          )}
        </div>
      )}
    </div>
  </>
);

// ─── Contradiction view ────────────────────────────────────────────────────────

interface ContradictionViewProps {
  loading: boolean;
  error: string | null;
  articles: Article[];
  claimText: string;
}

const ContradictionView: React.FC<ContradictionViewProps> = ({ loading, error, articles, claimText }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 italic line-clamp-2">
          Searching for evidence against: "{claimText}"
        </p>
        <p className="text-xs text-slate-400">Querying PubMed + Semantic Scholar with negation bias…</p>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <p className="text-xs text-red-500">{error}</p>;

  if (articles.length === 0) {
    return (
      <div className="text-center py-8">
        <i className="fas fa-check-circle text-2xl text-emerald-500 mb-2 block" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No strong contradictions found</p>
        <p className="text-xs text-slate-500 mt-1">
          The negation-biased search returned no results — this may indicate consistent evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {articles.length} paper{articles.length === 1 ? '' : 's'} retrieved with negation-biased query.
        Review each to assess whether it genuinely contradicts the claim.
      </p>
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.uid}>
            <ArticleCard article={{
              uid: String(a.uid), title: a.title, doi: a.doi,
              pmid: String(a.pmid ?? ''), abstract: a.abstract,
              authors: a.authors, journal: a.journal, pubdate: a.pubdate,
            }} />
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Article card ──────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: {
    uid?: string | null;
    title?: string | null;
    authors?: Array<{ name: string }> | null;
    doi?: string | null;
    pmid?: string | null;
    abstract?: string | null;
    journal?: string | null;
    pubdate?: string | null;
  };
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const href = article.doi
    ? `https://doi.org/${article.doi}`
    : article.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`
    : null;

  const authorLine =
    Array.isArray(article.authors) && article.authors.length > 0
      ? article.authors.slice(0, 3).map((a) => a.name).join(', ') +
        (article.authors.length > 3 ? ' et al.' : '')
      : null;

  return (
    <div className="text-xs border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 space-y-1">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-600 dark:text-indigo-400 line-clamp-2 hover:underline block"
        >
          {article.title || 'Untitled'}
        </a>
      ) : (
        <span className="font-semibold line-clamp-2 block">{article.title || 'Untitled'}</span>
      )}
      {(authorLine || article.journal || article.pubdate) && (
        <p className="text-[11px] text-slate-400 truncate">
          {[authorLine, article.journal, article.pubdate?.slice(0, 4)].filter(Boolean).join(' · ')}
        </p>
      )}
      {article.abstract && (
        <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{article.abstract}</p>
      )}
    </div>
  );
};
