import type { CaseLearningMode, QuestionType } from '@types';

export const REVIEW_PREFILL_KEY = 'med_review_prefill';
export const CASE_PREFILL_KEY = 'med_case_prefill';
export const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
export const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';
export const MAX_CHARS = 5000;

export type ReflectionKind = 'CBD' | 'mini-CEX' | 'DOPS';

export const EXAMPLE_CASE =
  '68-year-old male with moderate ARDS (P/F ratio 140) on mechanical ventilation for 48 hours. ' +
  'No contraindications to prone positioning. Has not received systemic corticosteroids. ' +
  'Current PEEP 10 cmH₂O, FiO₂ 0.6. Background: T2DM, hypertension. What evidence-based interventions should be considered?';

export const EVIDENCE_STRENGTH_STYLES: Record<string, string> = {
  HIGH: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  MODERATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  LOW: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  VERY_LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const MODES: Array<{ id: CaseLearningMode; label: string; icon: string; desc: string; activeColor: string }> = [
  { id: 'student', label: 'Medical Student', icon: 'fa-graduation-cap', desc: 'Core concepts, mechanisms', activeColor: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
  { id: 'resident', label: 'Resident', icon: 'fa-user-md', desc: 'Clinical decisions, management', activeColor: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' },
  { id: 'specialist', label: 'Specialist', icon: 'fa-microscope', desc: 'Nuance, evidence gaps', activeColor: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' },
  { id: 'exam', label: 'Exam Revision', icon: 'fa-clipboard-check', desc: 'USMLE / MRCP / AMC style', activeColor: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
];

export const QTYPE_LABEL: Partial<Record<QuestionType, string>> = {
  recall: 'Recall', clinical_application: 'Clinical Application',
  trial_interpretation: 'Trial Interpretation', guideline: 'Guideline', pitfall: 'Pitfall',
};

export const QTYPE_COLOR: Partial<Record<QuestionType, string>> = {
  recall: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  clinical_application: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  trial_interpretation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  guideline: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pitfall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
