import React from 'react';
import { SectionLabel } from './SectionLabel';
import { CitationWarning } from './CitationWarning';

interface Props {
  consensus: string;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
}

export const SynthesisConsensus: React.FC<Props> = ({ consensus, citationIssuePaths, citationIssueErrors }) => (
  <div>
    <SectionLabel>Consensus Summary</SectionLabel>
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{consensus}</p>
    {citationIssuePaths.has('consensus') && (
      <CitationWarning field="Consensus Summary" errors={citationIssueErrors.get('consensus') ?? []} />
    )}
  </div>
);
