import type { Article, EvidenceGrade } from '@types';

export type BriefDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface SavedTopic {
  query: string;
  savedAt: string;
  resultCount: number;
}

export interface SavedBrief {
  id: string;
  topic: string;
  savedAt: string;
  summary?: string;
  paperCount: number;
}

export interface BouquetSection {
  label: string;
  icon: string;
  color: string;
  articles: Article[];
}

export const CURRENT_YEAR = new Date().getFullYear();

export const SAVED_TOPICS_KEY = 'med_saved_topics';
export const RECENT_TOPICS_KEY = 'med_recent_topics';
export const SAVED_BRIEFS_KEY = 'med_saved_learning_briefs';

export const GUIDELINE_JOURNALS = [
  'nice', 'aha', 'esc', 'acc', 'sign', 'who', 'nhs', 'bmj best practice',
  'uptodate', 'cochrane', 'acp', 'idsa', 'bts', 'gina', 'gold report',
];

export const GUIDELINE_TITLE_WORDS = [
  'guideline', 'guidelines', 'guidance', 'recommendation', 'recommendations',
  'consensus', 'position statement', 'clinical practice', 'executive summary',
];

export const EVIDENCE_STRENGTH_CLASS: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MODERATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  LOW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  VERY_LOW: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const EVIDENCE_GRADE_META: Record<EvidenceGrade, { label: string; icon: string; classes: string }> = {
  GUIDELINE_BACKED:          { label: 'Guideline-backed',             icon: 'fa-book-medical',   classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  RCT_SUPPORTED:             { label: 'RCT / meta-analysis supported',icon: 'fa-flask',           classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  PRACTICE_CHANGING_RECENT:  { label: 'Practice-changing — recent',   icon: 'fa-bolt',            classes: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  CONFLICTING:               { label: 'Conflicting evidence',          icon: 'fa-scale-unbalanced',classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  OBSERVATIONAL_ONLY:        { label: 'Observational only',            icon: 'fa-binoculars',      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
  LOW_CERTAINTY:             { label: 'Low-certainty / expert opinion',icon: 'fa-circle-question', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  EXPERT_OPINION:            { label: 'Expert opinion',                icon: 'fa-comments',        classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function isGuideline(a: Article): boolean {
  const title = (a.title ?? '').toLowerCase();
  const journal = (a.journal ?? '').toLowerCase();
  const pubtypes = (a.pubtype ?? []).map((p) => p.toLowerCase());
  return (
    GUIDELINE_TITLE_WORDS.some((w) => title.includes(w)) ||
    GUIDELINE_JOURNALS.some((j) => journal.includes(j)) ||
    pubtypes.some((p) => p.includes('guideline') || p.includes('consensus'))
  );
}

export function isLandmark(a: Article): boolean {
  const cites = a.pmcrefcount ?? a.citationCount ?? 0;
  const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
  return cites >= 500 && year > 0 && year <= CURRENT_YEAR - 5;
}

export function whySelected(a: Article, rank: number): string {
  const ebm = a._ebmScore ?? 0;
  if (isGuideline(a)) return 'Clinical guideline or consensus statement';
  if (isLandmark(a)) return 'Landmark study — highly cited';
  if (ebm >= 7) return 'Systematic review or meta-analysis — highest evidence tier';
  if (ebm >= 6) return 'Randomised controlled trial';
  if (ebm >= 5) return 'Controlled clinical trial';
  const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
  if (year >= CURRENT_YEAR - 2) return 'Most recent high-quality evidence';
  if (a.isFree || a.pmcid) return 'Open access — full text freely available';
  return `Ranked #${rank + 1} by multi-source evidence quality score`;
}

export function buildBouquet(articles: Article[]): BouquetSection[] {
  const nonRetracted = articles.filter((a) => !a._retraction?.isRetracted);
  const seen = new Set<string>();
  const take = (a: Article) => { seen.add(a.uid); return a; };

  const metaReviews = nonRetracted
    .filter((a) => (a._ebmScore ?? 0) >= 7)
    .slice(0, 2).map(take);

  const guidelines = nonRetracted
    .filter((a) => !seen.has(a.uid) && isGuideline(a))
    .slice(0, 2).map(take);

  const landmarks = nonRetracted
    .filter((a) => !seen.has(a.uid) && isLandmark(a))
    .slice(0, 2).map(take);

  const trials = nonRetracted
    .filter((a) => !seen.has(a.uid) && (a._ebmScore ?? 0) >= 5 && (a._ebmScore ?? 0) < 7)
    .slice(0, 2).map(take);

  const recent = nonRetracted
    .filter((a) => {
      if (seen.has(a.uid)) return false;
      const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
      return year >= CURRENT_YEAR - 2;
    })
    .slice(0, 2).map(take);

  const openAccess = nonRetracted
    .filter((a) => !seen.has(a.uid) && (a.isFree || !!a.pmcid))
    .slice(0, 1).map(take);

  const sections: BouquetSection[] = [
    { label: 'Systematic Reviews & Meta-analyses', icon: 'fa-layer-group', color: 'text-emerald-600 dark:text-emerald-400', articles: metaReviews },
    { label: 'Clinical Guidelines', icon: 'fa-book-medical', color: 'text-blue-600 dark:text-blue-400', articles: guidelines },
    { label: 'Landmark Studies', icon: 'fa-star', color: 'text-amber-600 dark:text-amber-400', articles: landmarks },
    { label: 'Randomised Trials', icon: 'fa-flask', color: 'text-indigo-600 dark:text-indigo-400', articles: trials },
    { label: 'Recent High-Quality Evidence', icon: 'fa-calendar-check', color: 'text-purple-600 dark:text-purple-400', articles: recent },
    { label: 'Open Access', icon: 'fa-unlock', color: 'text-teal-600 dark:text-teal-400', articles: openAccess },
  ].filter((s) => s.articles.length > 0);

  const shown = sections.reduce((n, s) => n + s.articles.length, 0);
  if (shown < 3 && nonRetracted.length > 0) {
    const backfill = nonRetracted.filter((a) => !seen.has(a.uid)).slice(0, 4 - shown).map(take);
    if (backfill.length) {
      sections.push({ label: 'Top Evidence', icon: 'fa-shield-alt', color: 'text-slate-500 dark:text-slate-400', articles: backfill });
    }
  }

  return sections;
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the workflow still works in-memory.
  }
}

export function normalizeTopicMatchKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}
