import type { Article } from '@types';

/** Same ranking as synthesis / Topic actions: EBM → quality → preprint, cap at n. */
/** Server mirror: `server/utils/selectTopEvidence.js` (keep in sync). */
export function selectTopEvidence(articles: Article[], n = 5): Article[] {
  return [...articles]
    .filter((a) => !a._retraction?.isRetracted)
    .sort((a, b) => {
      const ebmA = a._ebmScore ?? 0;
      const ebmB = b._ebmScore ?? 0;
      if (ebmB !== ebmA) return ebmB - ebmA;
      const gradeOrder: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
      const gA = gradeOrder[(a._quality?.grade as string) ?? ''] ?? 0;
      const gB = gradeOrder[(b._quality?.grade as string) ?? ''] ?? 0;
      if (gB !== gA) return gB - gA;
      if (a._isPreprint !== b._isPreprint) return a._isPreprint ? 1 : -1;
      return 0;
    })
    .slice(0, n);
}
