export function statusLabel(status: string) {
  if (status === 'human_reviewed') {
    return { label: 'Approved', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  }
  if (status === 'human_edited') {
    return { label: 'Clinician Edited', bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' };
  }
  if (status === 'pending_review' || status === 'needs_review') {
    return { label: 'Needs Review', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' };
  }
  return { label: 'AI Generated', bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
}
