import React from 'react';
import type { SynthesisResult } from '@types';
import type { Article } from '@types';
import { ArticleLink } from './ArticleLink';
import { CitationWarning } from './CitationWarning';
import { SectionLabel } from './SectionLabel';
import { STRENGTH_DOT } from './synthesisPanelConfig';

interface Props {
  findings: NonNullable<SynthesisResult['synthesis']['keyFindings']>;
  articles: Article[];
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
  onOpenProvenance: (findingText: string, studyIndices?: number[]) => void;
}

export const SynthesisKeyFindings: React.FC<Props> = ({
  findings,
  articles,
  citationIssuePaths,
  citationIssueErrors,
  onOpenProvenance,
}) => (
  <div>
    <SectionLabel>{findings.length} Key Findings</SectionLabel>
    <div className="space-y-2">
      {findings.map((f, i) => (
        <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
          <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${STRENGTH_DOT[f.strength] ?? 'bg-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{f.finding}</p>
            {f.studyIndices?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap items-center">
                {f.studyIndices.map(idx => (
                  <ArticleLink key={idx} idx={idx} articles={articles} />
                ))}
                <button
                  type="button"
                  onClick={() => onOpenProvenance(f.finding, f.studyIndices)}
                  className="ml-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Show me why
                </button>
              </div>
            )}
            {(!f.studyIndices || f.studyIndices.length === 0) && (
              <button
                type="button"
                onClick={() => onOpenProvenance(f.finding, [])}
                className="mt-2 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Show me why
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
