/**
 * Select-all-that-apply answers travel as a canonical, comma-joined, sorted list of
 * option letters ("A,C"). Single-answer questions keep one letter, so these helpers
 * are a drop-in for the old `a.toLowerCase() === b.toLowerCase()` comparisons.
 * Mirrors server/utils/answerSet.js.
 */
export function normalizeAnswerSet(value: string | null | undefined): string {
  const parts = String(value ?? '')
    .split(/[\s,;&/|]+|\band\b/i)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(parts)].sort().join(',');
}

export function answersMatch(userAnswer: string | null | undefined, correctAnswer: string | null | undefined): boolean {
  const correct = normalizeAnswerSet(correctAnswer);
  return correct !== '' && normalizeAnswerSet(userAnswer) === correct;
}

export function answerLetters(value: string | null | undefined): string[] {
  const n = normalizeAnswerSet(value);
  return n ? n.split(',') : [];
}

export function isMultiAnswerQuestion(q: { multiAnswer?: boolean; correctAnswer?: string | null }): boolean {
  return q.multiAnswer === true || answerLetters(q.correctAnswer).length > 1;
}

/** Returns the canonical answer string after toggling one letter in a selection. */
export function toggleAnswerLetter(current: string, letter: string): string {
  const set = new Set(answerLetters(current));
  const key = letter.toLowerCase();
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set].sort().join(',');
}
