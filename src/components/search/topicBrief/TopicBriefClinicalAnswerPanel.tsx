import React from 'react';
import type { ClinicalAnswer, ProactiveAlert } from '@types';
import { TopicBriefEvidenceGradeBadge } from './TopicBriefEvidenceGradeBadge';

interface Props {
  ca: ClinicalAnswer;
  proactiveAlert?: ProactiveAlert | null;
  onQuizUpdate?: () => void;
}

export const TopicBriefClinicalAnswerPanel: React.FC<Props> = ({ ca, proactiveAlert, onQuizUpdate }) => {
  const rows: Array<{ icon: string; label: string; value: string | null | undefined; highlight?: boolean }> = [
    { icon: 'fa-circle-check',    label: 'Bottom line',               value: ca.bottomLine,              highlight: true },
    { icon: 'fa-arrows-rotate',   label: 'What changes management',   value: ca.whatChangesManagement },
    { icon: 'fa-users',           label: 'Who it applies to',         value: ca.whoItAppliesTo },
    { icon: 'fa-circle-question', label: 'What is uncertain',         value: ca.whatIsUncertain },
    { icon: 'fa-ban',             label: 'Key contraindications',     value: ca.keyContraindications },
    { icon: 'fa-book-medical',    label: 'Guideline position',        value: ca.guidelinePosition },
    { icon: 'fa-bolt',            label: 'Recent practice change',    value: ca.recentPracticeChanging },
  ].filter((r) => r.value);

  const effectiveAlert = proactiveAlert ?? (ca.whatIsNew ? { summary: ca.whatIsNew, changedPrinciples: [], newPapers: [], daysSinceUpdate: 0 } : null);
  const isLandmark = effectiveAlert?.isLandmarkGreeting ?? false;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/40 dark:to-slate-950/10 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          <i className="fas fa-stethoscope text-[10px]" />
          Clinical Evidence Answer
        </span>
        <TopicBriefEvidenceGradeBadge grade={ca.evidenceGrade} />
      </div>
      {effectiveAlert && (
        <div className={`mb-3 rounded-lg border px-3 py-2.5 ${
          isLandmark
            ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/20'
            : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
        }`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
            isLandmark ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            <i className={`fas ${isLandmark ? 'fa-bookmark' : 'fa-bell'} mr-1`} />
            {isLandmark ? 'Landmark trial — strong memory topic' : 'Evidence updated since your last visit'}
          </p>
          <p className={`text-xs leading-relaxed ${
            isLandmark ? 'text-teal-800 dark:text-teal-200' : 'text-amber-800 dark:text-amber-200'
          }`}>{effectiveAlert.summary}</p>
          {!isLandmark && effectiveAlert.changedPrinciples.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {effectiveAlert.changedPrinciples.map((p, i) => (
                <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300 flex gap-1.5">
                  <i className="fas fa-arrow-right text-[9px] mt-0.5 shrink-0" />{p}
                </li>
              ))}
            </ul>
          )}
          {effectiveAlert.newPapers.length > 0 && (
            <p className={`mt-1.5 text-[10px] font-semibold ${
              isLandmark ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isLandmark ? 'Landmark: ' : 'New papers: '}{effectiveAlert.newPapers.slice(0, 2).join('; ')}
            </p>
          )}
          {!isLandmark && onQuizUpdate && (
            <button
              type="button"
              onClick={onQuizUpdate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-black text-white hover:bg-amber-700 transition-colors"
            >
              <i className="fas fa-brain text-[10px]" />
              Re-quiz this update
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        {rows.map(({ icon, label, value, highlight }) => (
          <div key={label} className={`flex gap-3 rounded-lg px-3 py-2 ${highlight ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-white/60 dark:bg-slate-900/30'}`}>
            <i className={`fas ${icon} mt-0.5 shrink-0 text-[11px] ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className={`text-xs leading-relaxed ${highlight ? 'font-semibold text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
