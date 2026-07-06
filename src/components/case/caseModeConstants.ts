import type { CaseLearningMode } from '@types';

export const EVIDENCE_STRENGTH_STYLES: Record<string, string> = {
  HIGH:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  MODERATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  LOW:      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  VERY_LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const MODES: Array<{ id: CaseLearningMode; label: string; icon: string; desc: string; activeColor: string }> = [
  { id: 'student',    label: 'Medical Student', icon: 'fa-graduation-cap', desc: 'Core concepts, mechanisms',      activeColor: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
  { id: 'resident',   label: 'Resident',        icon: 'fa-user-md',        desc: 'Clinical decisions, management', activeColor: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' },
  { id: 'specialist', label: 'Specialist',      icon: 'fa-microscope',     desc: 'Nuance, evidence gaps',          activeColor: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' },
  { id: 'exam',       label: 'Exam Revision',   icon: 'fa-clipboard-check', desc: 'USMLE / MRCP / AMC style',     activeColor: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
];
