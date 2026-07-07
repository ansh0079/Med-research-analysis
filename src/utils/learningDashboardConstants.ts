import type { LearningProfile, UserTopicMastery } from '@types';

export const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
export const CASE_PREFILL_KEY = 'med_case_prefill';

export const SPECIALTY_OPTIONS = [
  'Medical Student', 'Foundation Doctor', 'General Practitioner',
  'Emergency Medicine', 'Internal Medicine', 'Cardiology', 'Respiratory Medicine',
  'Gastroenterology', 'Neurology', 'Oncology', 'Intensive Care', 'Surgery',
  'Anaesthetics', 'Psychiatry', 'Paediatrics', 'Obstetrics & Gynaecology',
  'Radiology', 'Pathology', 'Researcher',
];

export const DIFFICULTY_OPTIONS: Array<{ value: LearningProfile['preferredDifficulty']; label: string; desc: string }> = [
  { value: 'easy', label: 'Foundational', desc: 'Core concepts, first principles' },
  { value: 'medium', label: 'Intermediate', desc: 'Clinical decisions, evidence trade-offs' },
  { value: 'hard', label: 'Advanced', desc: 'Nuance, evidence critique, edge cases' },
  { value: 'mixed', label: 'Mixed', desc: 'Adapts to your performance automatically' },
];

export const STARTER_TOPIC_SETS = [
  { label: 'Clerkship cardio', topics: ['Acute coronary syndrome', 'Atrial fibrillation', 'Heart failure'] },
  { label: 'Acute take', topics: ['Sepsis', 'Pulmonary embolism', 'Diabetic ketoacidosis'] },
  { label: 'Respiratory ward', topics: ['Asthma exacerbation', 'COPD exacerbation', 'Pneumonia'] },
  { label: 'Exam core', topics: ['Anaemia', 'Acute kidney injury', 'Meningitis'] },
] as const;

export const QTYPE_BARS: Array<{ key: keyof UserTopicMastery; label: string; color: string }> = [
  { key: 'recallScore', label: 'Recall', color: 'bg-slate-500' },
  { key: 'clinicalApplicationScore', label: 'Clinical App', color: 'bg-indigo-500' },
  { key: 'trialInterpretationScore', label: 'Trial Interp', color: 'bg-violet-500' },
  { key: 'guidelineScore', label: 'Guideline', color: 'bg-blue-500' },
  { key: 'pitfallScore', label: 'Pitfall', color: 'bg-red-500' },
];

export const INSIGHT_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800/50', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800/50', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800/50', icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
};

export const REC_TYPE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  review: { bg: 'bg-rose-50/60 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/40', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  strengthen: { bg: 'bg-amber-50/60 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/40', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  explore: { bg: 'bg-blue-50/60 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800/40', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  calibrate: { bg: 'bg-orange-50/60 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800/40', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  discover: { bg: 'bg-violet-50/60 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800/40', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  refresh: { bg: 'bg-slate-50/60 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  case: { bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/40', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  start: { bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', border: 'border-indigo-200 dark:border-indigo-800/40', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
};

export const REC_TYPE_LABELS: Record<string, string> = {
  review: 'Due for review',
  strengthen: 'Weak area',
  explore: 'Searched — not tested',
  calibrate: 'Calibration gap',
  discover: 'Related topic',
  refresh: 'Getting stale',
  case: 'Try a case',
  start: 'Get started',
};

export const CALIBRATION_VERDICT_STYLE: Record<string, { icon: string; color: string }> = {
  overconfident: { icon: 'fa-triangle-exclamation', color: 'text-rose-500' },
  underconfident: { icon: 'fa-circle-question', color: 'text-amber-500' },
  well_calibrated: { icon: 'fa-bullseye', color: 'text-emerald-500' },
  insufficient_data: { icon: 'fa-hourglass-half', color: 'text-slate-400' },
};

export type LearningDashboardTab = 'overview' | 'topics' | 'cpd' | 'portfolio' | 'settings';
