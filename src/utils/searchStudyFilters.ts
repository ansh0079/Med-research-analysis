/** PubMed publication-type clauses — must match server/services/searchPipeline.js */
export const STUDY_TYPE_FILTER_OPTIONS = [
  { id: 'rct', label: 'RCT', clause: '"Randomized Controlled Trial"[Publication Type]' },
  { id: 'systematic_review', label: 'Systematic review', clause: '"Systematic Review"[Publication Type]' },
  { id: 'meta_analysis', label: 'Meta-analysis', clause: '"Meta-Analysis"[Publication Type]' },
  { id: 'clinical_trial', label: 'Clinical trial', clause: '"Clinical Trial"[Publication Type]' },
  { id: 'guideline', label: 'Guideline', clause: '"Practice Guideline"[Publication Type]' },
] as const;

export function yearRangeToPubMedFilter(range: [number, number] | undefined): string[] {
  if (!range || range.length !== 2) return [];
  const [a, b] = range;
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1900 || end > 2100) return [];
  return [`${Math.round(start)}:${Math.round(end)}[PDAT]`];
}
