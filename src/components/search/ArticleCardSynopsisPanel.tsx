import type { ArticleSynopsisFields } from '@types';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';

interface SynopsisRow {
  label: string;
  value: string | null | undefined;
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

export type SynopsisSourceMode = 'full_text_used' | 'abstract_only';

export function ArticleCardSynopsisPanel({
  synopsis,
  sourceMode,
  onClose,
}: {
  synopsis: ArticleSynopsisFields;
  sourceMode?: SynopsisSourceMode;
  onClose: () => void;
}) {
  const trust = TRUST_BADGE[synopsis.trustRating] ?? TRUST_BADGE.MODERATE;
  const sourceLabel = sourceMode === 'full_text_used' ? 'Full Text Used' : 'Abstract Only';

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
        </div>
        <button type="button" onClick={onClose} aria-label="Close critical appraisal" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5">
          <i className="fas fa-times text-xs" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
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
