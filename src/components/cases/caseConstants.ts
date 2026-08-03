export const STEP_TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  presentation: { icon: 'fa-user-injured', label: 'Presentation', color: 'text-blue-500' },
  investigation: { icon: 'fa-microscope', label: 'Investigations', color: 'text-violet-500' },
  management: { icon: 'fa-prescription', label: 'Management', color: 'text-emerald-500' },
  complication: { icon: 'fa-bolt', label: 'Complication', color: 'text-amber-500' },
  resolution: { icon: 'fa-check-circle', label: 'Resolution', color: 'text-teal-500' },
};

export const STEP_SEQUENCE_META: Array<{ type: string }> = [
  { type: 'presentation' }, { type: 'investigation' }, { type: 'management' },
  { type: 'complication' }, { type: 'resolution' },
];

export const QUESTION_TYPE_STYLES: Record<string, string> = {
  recall: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  clinical_application: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  trial_interpretation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  guideline: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pitfall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Foundation', desc: 'Classic presentations' },
  { value: 'medium', label: 'Standard', desc: 'Realistic with distractors' },
  { value: 'hard', label: 'Advanced', desc: 'Atypical, multi-system' },
];
