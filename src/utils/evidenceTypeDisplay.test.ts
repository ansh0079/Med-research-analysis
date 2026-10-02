import type { Article } from '@types';
import { getEvidenceTypeDisplay } from './evidenceTypeDisplay';

const article = (over: Partial<Article> = {}) => ({ uid: '1', title: 'Paper', _source: 'pubmed', ...over } as Article);

describe('getEvidenceTypeDisplay', () => {
  it('does not invent a cross-sectional design when metadata is missing', () => {
    expect(getEvidenceTypeDisplay(article({ _ebmScore: -1, _ebmLabel: { label: 'Study type unverified', short: 'Type unverified' } })))
      .toEqual({ label: 'Study type unverified', short: 'Type unverified', verified: false });
  });

  it('uses the server guideline lane as the authoritative card label', () => {
    expect(getEvidenceTypeDisplay(article({
      _evidenceLane: 'guidelines',
      _ebmScore: -1,
      _ebmLabel: { label: 'Study type unverified', short: 'Type unverified' },
    }))).toMatchObject({ short: 'Guideline', verified: true });
  });
});
