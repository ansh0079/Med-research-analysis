import { EVIDENCE_GRADE_CONFIG } from '@components/ui/evidenceGrade';

export const GRADE_CONFIG = EVIDENCE_GRADE_CONFIG;

export const STRENGTH_DOT: Record<string, string> = {
  strong: 'bg-emerald-500',
  moderate: 'bg-blue-500',
  weak: 'bg-amber-500',
};

export const PRACTICE_IMPACT_LABEL: Record<string, string> = {
  confirms_existing_practice: 'Confirms usual practice',
  weakly_modifies_practice: 'Weakly modifies practice',
  practice_changing: 'Practice-changing',
  hypothesis_generating_only: 'Hypothesis-generating only',
  not_clinically_actionable_yet: 'Not clinically actionable yet',
};

export const PRACTICE_IMPACT_CARD: Record<string, { border: string; chip: string }> = {
  practice_changing: {
    border: 'border-rose-300 dark:border-rose-700/50',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  },
  weakly_modifies_practice: {
    border: 'border-amber-300 dark:border-amber-700/50',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  confirms_existing_practice: {
    border: 'border-slate-200 dark:border-slate-600/60',
    chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  hypothesis_generating_only: {
    border: 'border-violet-300 dark:border-violet-700/50',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  },
  not_clinically_actionable_yet: {
    border: 'border-slate-300 dark:border-slate-600/60',
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
};
