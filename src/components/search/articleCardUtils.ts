import type { Article } from '@types';

export const GRADE_CLASS: Record<string, string> = {
  A: 'grade-A',
  B: 'grade-B',
  C: 'grade-C',
  D: 'grade-D',
};

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  meta: 'Meta-analysis',
  rct: 'Randomised trial',
  other: 'Other study',
};

export const CURRENT_YEAR = new Date().getFullYear();

const PREDATORY_JOURNAL_TERMS = [
  'omics international',
  'science publishing group',
  'iosr journal',
  'world academy of science',
  'global journals',
];

export function isLikelyPreprint(article: Article) {
  const text = `${article.source || ''} ${article.journal || ''} ${article.pubtype?.join(' ') || ''}`.toLowerCase();
  return Boolean(article._isPreprint || /medrxiv|biorxiv|preprint|research square|ssrn/.test(text));
}

export function isPotentialPredatoryJournal(article: Article) {
  const journal = `${article.journal || article.source || ''}`.toLowerCase();
  return PREDATORY_JOURNAL_TERMS.some((term) => journal.includes(term));
}

export function quickSignalClass(tone: 'good' | 'info' | 'warn' | 'danger' | 'neutral') {
  const map = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300',
    warn: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300',
    danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  };
  return map[tone];
}
