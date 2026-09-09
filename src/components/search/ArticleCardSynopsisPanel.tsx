import type { ArticleSynopsisFields } from '@types';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { SynopsisTrustBanner, type SynopsisSourceMode } from './SynopsisTrustBanner';

export type { SynopsisSourceMode };

export interface RelatedRecommendation {
  sourceBody: string | null;
  sourceYear: number | null;
  sourceUrl: string | null;
  isIssuingBody: boolean;
  recommendationText: string;
  recommendationStrength: string | null;
}

interface SynopsisRow {
  label: string;
  value: string | null | undefined;
}

/**
 * Recommendations render identically whether they are this document's or
 * another body's -- the section around them carries the distinction, and every
 * item stays attributed either way.
 */
function RecommendationList({ items }: { items: RelatedRecommendation[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((rec, i) => (
        <li key={`${rec.sourceBody ?? 'unknown'}-${i}`} className="text-xs leading-snug text-slate-700 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {rec.sourceBody || 'Unattributed'}{rec.sourceYear ? ` ${rec.sourceYear}` : ''}
          </span>
          {rec.recommendationStrength && (
            <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {rec.recommendationStrength}
            </span>
          )}
          <span className="ml-1">— {rec.recommendationText}</span>
          {rec.sourceUrl && (
            <a href={rec.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="ml-1 text-indigo-600 underline dark:text-indigo-400">source</a>
          )}
        </li>
      ))}
    </ul>
  );
}

const TRUST_BADGE: Record<string, { label: string; cls: string }> = {
  HIGH: { label: 'HIGH', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  MODERATE: { label: 'MODERATE', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  LOW: { label: 'LOW', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  VERY_LOW: { label: 'VERY LOW', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function SynopsisField({ label, value }: SynopsisRow) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{value}</span>
    </div>
  );
}

function SynopsisList({ label, items }: { label: string; items?: string[] }) {
  const safeItems = (items || []).filter(Boolean);
  if (!safeItems.length) return null;
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
      <ul className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
        {safeItems.slice(0, 5).map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

export function ArticleCardSynopsisPanel({
  synopsis,
  sourceMode,
  reviewState,
  citationOk,
  abstractOnly,
  fullTextCoverageRatio,
  ownRecommendations,
  relatedRecommendations,
  onClose,
}: {
  synopsis: ArticleSynopsisFields;
  sourceMode?: SynopsisSourceMode;
  reviewState?: string | null;
  citationOk?: boolean | null;
  abstractOnly?: boolean | null;
  fullTextCoverageRatio?: number | null;
  /**
   * Recommendations attributed to THIS document's own issuing body, supplied
   * when its full text could not be retrieved. These are the document's
   * positions, so the synopsis fields above are built from them.
   */
  ownRecommendations?: RelatedRecommendation[];
  /**
   * Recommendations indexed for this topic from OTHER guideline bodies, supplied
   * only when this document's own text could not be retrieved. Rendered as a
   * clearly separate, individually attributed block -- never merged into the
   * synopsis fields, which assert what this document says.
   */
  relatedRecommendations?: RelatedRecommendation[];
  onClose: () => void;
}) {
  const trust = TRUST_BADGE[synopsis.trustRating] ?? TRUST_BADGE.MODERATE;
  const sourceLabel = sourceMode === 'full_text_used' ? 'Full Text Used' : 'Abstract Only';
  const coveragePct = typeof fullTextCoverageRatio === 'number'
    ? Math.round(Math.max(0, Math.min(1, fullTextCoverageRatio)) * 100)
    : null;

  return (
    <div className="mx-0 mt-3 mb-2 rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/60 dark:bg-violet-950/20 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-violet-100 dark:border-violet-800/30">
        <div className="flex items-center gap-2">
          <i className="fas fa-microscope text-violet-500 text-[11px]" />
          <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Critical Appraisal</span>
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${trust.cls}`}>
            Trust: {trust.label}
          </span>
          {sourceMode && (
            <span className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 ${sourceMode === 'full_text_used' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
              {sourceLabel}
            </span>
          )}
          {coveragePct != null && (
            <span className={`text-[10px] font-black uppercase tracking-wider rounded-md border px-2 py-0.5 ${
              coveragePct >= 50
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
            }`}>
              {coveragePct}% full text
            </span>
          )}
          {reviewState && (
            <span className={`text-[10px] font-black uppercase tracking-wider rounded-md border px-2 py-0.5 ${
              reviewState === 'human_reviewed'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}>
              {reviewState === 'human_reviewed' ? 'Human reviewed' : String(reviewState).replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close critical appraisal" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5">
          <i className="fas fa-times text-xs" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <SynopsisTrustBanner
          sourceMode={sourceMode}
          reviewState={reviewState}
          citationOk={citationOk ?? synopsis.citationCheckPassed ?? null}
          abstractOnly={abstractOnly ?? sourceMode === 'abstract_only'}
          fullTextCoverageRatio={fullTextCoverageRatio}
        />

        {(ownRecommendations?.length ?? 0) > 0 && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              What this document recommends
            </p>
            <p className="mt-1 text-[11px] leading-snug text-emerald-900/80 dark:text-emerald-100/70">
              Extracted from this guideline rather than its full text, so it may be incomplete. Check the source before acting.
            </p>
            <RecommendationList items={ownRecommendations!} />
          </section>
        )}

        {(relatedRecommendations?.length ?? 0) > 0 && (
          <section className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 dark:border-amber-800/60 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Guidance on this topic — from other documents
            </p>
            <p className="mt-1 text-[11px] leading-snug text-amber-900/80 dark:text-amber-100/70">
              {(ownRecommendations?.length ?? 0) > 0
                ? 'Issued by other organisations on the same topic. They are not this document’s positions.'
                : 'This document’s own text could not be retrieved, so it is not summarised above. These recommendations are indexed for the same topic and each is attributed to the body that issued it.'}
            </p>
            <RecommendationList items={relatedRecommendations!} />
          </section>
        )}

        {synopsis.takeaway && (
          <div className="rounded-lg bg-violet-100/70 dark:bg-violet-900/20 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">Key Takeaway</span>
            <p className="mt-0.5 text-xs font-semibold text-violet-800 dark:text-violet-200 leading-snug">{synopsis.takeaway}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SynopsisField label="Clinical Question" value={synopsis.clinicalQuestion} />
          <SynopsisField label="Study Design" value={synopsis.studyDesign} />
          <SynopsisField label="Setting" value={synopsis.setting} />
          <SynopsisField label="Population" value={synopsis.population} />
          <SynopsisField label="Intervention" value={synopsis.intervention} />
          <SynopsisField label="Comparator" value={synopsis.comparator} />
        </div>

        <SynopsisField label="Background" value={synopsis.background} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SynopsisList label="Inclusion" items={synopsis.inclusionCriteria} />
          <SynopsisList label="Exclusion" items={synopsis.exclusionCriteria} />
        </div>
        <SynopsisField label="Primary Outcome" value={synopsis.primaryOutcome || synopsis.outcomes} />
        <SynopsisList label="Secondary Outcomes" items={synopsis.secondaryOutcomes} />
        <SynopsisList label="Safety Outcomes" items={synopsis.safetyOutcomes} />
        <SynopsisField label="Main Findings" value={synopsis.mainFindings} />
        <SynopsisField label="Authors' Conclusion" value={synopsis.authorsConclusion} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SynopsisList label="Strengths" items={synopsis.strengths} />
          <SynopsisList label="Weaknesses" items={synopsis.weaknesses} />
        </div>
        <SynopsisField label="Clinical Meaning" value={synopsis.clinicalMeaning} />
        <SynopsisField label="Limitations" value={synopsis.limitations} />
        <SynopsisField label="Practice Implication" value={synopsis.practiceImplication} />

        {synopsis.bottomLine && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Bottom Line</span>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200 leading-snug">{synopsis.bottomLine}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SynopsisList label="Do Not Overclaim" items={synopsis.whatNotToOverclaim} />
          <SynopsisList label="Quiz Focus" items={synopsis.quizFocusPoints} />
        </div>

        {synopsis.trustRationale && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trust Rationale</span>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{synopsis.trustRationale}</p>
          </div>
        )}

        <ClinicalSafetyNotice
          status={sourceMode === 'full_text_used' ? 'source_verified' : 'abstract_only'}
        />
      </div>
    </div>
  );
}
