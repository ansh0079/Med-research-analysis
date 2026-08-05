export function statusLabel(status: string) {
  if (status === 'human_reviewed') return { label: 'Clinician Reviewed', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  if (status === 'human_edited') return { label: 'Clinician Edited', bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' };
  return { label: 'AI Generated', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
}
