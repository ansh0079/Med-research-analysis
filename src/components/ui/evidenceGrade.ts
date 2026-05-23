/**
 * Evidence grade display constants — single source of truth for all components.
 * Import from here instead of defining local GRADE_STYLE / GRADE_CONFIG objects.
 */

/** Chip colour classes for evidence grade badges (e.g. on synthesis snapshots). */
export const EVIDENCE_GRADE_CHIP: Record<string, string> = {
  HIGH:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MODERATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOW:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  VERY_LOW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

/** Rich grade config used by SynthesisPanel grade bar / dot. */
export const EVIDENCE_GRADE_CONFIG: Record<string, {
  label: string; bar: string; color: string; bg: string; border: string; dot: string;
}> = {
  HIGH:     { label: 'High',     bar: 'w-full', color: 'text-emerald-500', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  MODERATE: { label: 'Moderate', bar: 'w-3/4',  color: 'text-blue-500',    bg: 'bg-blue-500/10 dark:bg-blue-500/15',       border: 'border-blue-500/20',    dot: 'bg-blue-500' },
  LOW:      { label: 'Low',      bar: 'w-1/2',  color: 'text-amber-500',   bg: 'bg-amber-500/10 dark:bg-amber-500/15',     border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  VERY_LOW: { label: 'Very Low', bar: 'w-1/4',  color: 'text-red-500',     bg: 'bg-red-500/10 dark:bg-red-500/15',         border: 'border-red-500/20',     dot: 'bg-red-500' },
};
