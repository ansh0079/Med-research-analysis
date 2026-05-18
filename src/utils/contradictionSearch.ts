/**
 * PubMed-style query bias toward disconfirming / limiting evidence for a claim.
 */
export function buildContradictionSearchQuery(topic: string, claimText: string): string {
  const t = String(topic || '')
    .trim()
    .slice(0, 140);
  const c = String(claimText || '')
    .trim()
    .replace(/\[[^\]]+\]/g, '')
    .slice(0, 220);
  const neg =
    '("no benefit" OR harm OR harmful OR "not associated" OR "failed to show" OR nonsignificant OR "neutral" OR futility OR subgroup OR "adverse events" OR contradiction OR "increased mortality")';
  return `${t} ${c} ${neg}`.replace(/\s+/g, ' ').trim();
}
