/** Classical test theory minimum for reliable item p-value / discrimination estimates. */
export const MIN_RELIABLE_ATTEMPTS = 30;

export function itemAttemptCount(item: { sampleSize?: number | null; totalAttempts?: number | null }): number {
  const n = item.sampleSize ?? item.totalAttempts ?? 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function isPsychometricReliable(item: {
  reliable?: boolean | null;
  sampleSize?: number | null;
  totalAttempts?: number | null;
}): boolean {
  if (item.reliable === false) return false;
  return itemAttemptCount(item) >= MIN_RELIABLE_ATTEMPTS;
}
