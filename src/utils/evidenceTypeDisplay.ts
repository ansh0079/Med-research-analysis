import type { Article } from '@types';

export interface EvidenceTypeDisplay {
  label: string;
  short: string;
  verified: boolean;
}

/** Keep the card label consistent with the evidence lane chosen by the server. */
export function getEvidenceTypeDisplay(article: Article): EvidenceTypeDisplay {
  const pubtypes = (article.pubtype || []).join(' ').toLowerCase();
  if (article._evidenceLane === 'guidelines' || /guideline|consensus|statement/.test(pubtypes)) {
    return { label: 'Guideline or consensus document', short: 'Guideline', verified: true };
  }
  if (article._ebmScore === undefined || article._ebmScore < 0 || !article._ebmLabel) {
    return { label: 'Study type unverified', short: 'Type unverified', verified: false };
  }
  return { ...article._ebmLabel, verified: true };
}
