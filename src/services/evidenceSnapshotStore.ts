import type { Article, EvidenceSnapshotRef } from '@types';

/**
 * The evidence snapshot of the most recent search, so synopsis / quiz generation can send its id
 * and keep lineage back to the evidence the learner actually saw. Deliberately not React state:
 * generation is triggered from many components that have no route to the search hook.
 *
 * The id is attached only to requests whose articles overlap that search's results. A quiz on an
 * unrelated topic must not claim a lineage it does not have; the server records anything the
 * search did not show as an addition rather than pretending it did.
 */

interface CurrentSnapshot {
  id: string;
  uids: Set<string>;
}

let current: CurrentSnapshot | null = null;

function uidOf(article: Partial<Article>): string {
  return String(article.uid || article.pmid || '').trim();
}

export function setCurrentEvidenceSnapshot(
  snapshot: EvidenceSnapshotRef | null | undefined,
  articles: Article[],
): void {
  if (!snapshot || snapshot.status !== 'persisted' || !snapshot.id) {
    current = null;
    return;
  }
  current = { id: snapshot.id, uids: new Set(articles.map(uidOf).filter(Boolean)) };
}

export function clearCurrentEvidenceSnapshot(): void {
  current = null;
}

/** The snapshot id to send with a generation request for these articles, or undefined. */
export function evidenceSnapshotIdFor(articles: Partial<Article>[]): string | undefined {
  if (!current) return undefined;
  return articles.some((article) => current!.uids.has(uidOf(article))) ? current.id : undefined;
}
