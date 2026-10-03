import type { Article } from '@types';

import {
  articlesCoveredBySnapshot,
  clearCurrentEvidenceSnapshot,
  evidenceSnapshotIdFor,
  setCurrentEvidenceSnapshot,
} from './evidenceSnapshotStore';

/**
 * The "top papers" list can hold papers from the topic's stored evidence that the search never returned.
 * The server refuses a generation that cites a paper its snapshot cannot vouch for, which broke the
 * evidence quiz outright. A generation now sends only the papers the search saw.
 */

const paper = (uid: string): Article => ({ uid, title: uid } as Article);

describe('articlesCoveredBySnapshot', () => {
  afterEach(() => clearCurrentEvidenceSnapshot());

  test('drops papers the search did not return, keeping the rest in order', () => {
    setCurrentEvidenceSnapshot({ id: 'snap-1', status: 'persisted' } as never, [paper('a'), paper('b'), paper('c')]);
    const sent = articlesCoveredBySnapshot([paper('x'), paper('b'), paper('y'), paper('a')]);
    expect(sent.map((a) => a.uid)).toEqual(['b', 'a']);
    expect(evidenceSnapshotIdFor(sent)).toBe('snap-1');
  });

  test('leaves a list unchanged when none of it was in the search, so an unrelated quiz keeps working', () => {
    setCurrentEvidenceSnapshot({ id: 'snap-1', status: 'persisted' } as never, [paper('a')]);
    const unrelated = [paper('x'), paper('y')];
    expect(articlesCoveredBySnapshot(unrelated)).toEqual(unrelated);
    expect(evidenceSnapshotIdFor(unrelated)).toBeUndefined();
  });

  test('leaves a list unchanged when there is no current search', () => {
    const list = [paper('a'), paper('b')];
    expect(articlesCoveredBySnapshot(list)).toEqual(list);
  });
});
