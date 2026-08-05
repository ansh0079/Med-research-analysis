import type { SeminalPaper, TeachingPointDraft } from './types';

export function toSeminalPapers(raw: unknown): SeminalPaper[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => ({
    sourceIndex: p?.sourceIndex ?? i + 1,
    title: String(p?.title || ''),
    clinicalPrinciple: String(p?.clinicalPrinciple || ''),
    year: p?.year ? String(p.year) : '',
    doi: p?.doi ? String(p.doi) : '',
  }));
}

export function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    typeof item === 'string' ? item : String(item?.point || item?.text || JSON.stringify(item))
  );
}

export function toTeachingPoints(raw: unknown): TeachingPointDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { claim: item, sourceIndices: [], confidence: 'LOW' };
    }
    const sourceIndices = Array.isArray(item?.sourceIndices)
      ? item.sourceIndices.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    const confidence = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'].includes(String(item?.confidence))
      ? String(item.confidence) as TeachingPointDraft['confidence']
      : 'LOW';
    return {
      claim: String(item?.claim || item?.point || item?.text || ''),
      sourceIndices,
      confidence,
    };
  });
}
