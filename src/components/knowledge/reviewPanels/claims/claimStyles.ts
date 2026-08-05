export function claimStatusStyle(status: string) {
  if (status === 'human_reviewed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'guideline_supported') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  if (status === 'full_text_available') return 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300';
  if (status === 'guideline_uncertain') return 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  if (status === 'guideline_conflict') return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'stale_needs_refresh') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (status === 'agent_draft') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (status === 'synthesis_inferred') return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

export const FLAG_REASONS = [
  { value: 'guideline_uncertain', label: 'Guideline overlap uncertain' },
  { value: 'guideline_conflict', label: 'Conflicts with guideline' },
  { value: 'stale_needs_refresh', label: 'Stale — needs refresh' },
  { value: 'unverified', label: 'Unverified / unsupported' },
  { value: 'agent_draft', label: 'Revert to draft' },
];
