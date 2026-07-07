import React from 'react';
import type { SynthesisResult } from '@types';
import type { Article } from '@types';
import { SectionLabel } from './SectionLabel';
import { PRACTICE_IMPACT_CARD, PRACTICE_IMPACT_LABEL } from './synthesisPanelConfig';

interface Props {
  contributions: NonNullable<SynthesisResult['synthesis']['paperContributions']>;
  articles: Article[];
}

export const SynthesisPaperContributions: React.FC<Props> = ({ contributions, articles }) => (
  <div>
    <SectionLabel>Paper-by-Paper Contribution</SectionLabel>
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Paper</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-28">Practice</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Main contribution</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-24">Strength</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
          {contributions.map((pc, i) => {
            const art = articles[pc.studyIndex - 1];
            const href = art?.doi
              ? `https://doi.org/${art.doi}`
              : art?.pmid
                ? `https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`
                : null;
            const strengthCls = pc.strengthAdded === 'strong'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : pc.strengthAdded === 'moderate'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            const pic = pc.practiceImpactClass;
            const pChip = pic ? (PRACTICE_IMPACT_CARD[pic] ?? PRACTICE_IMPACT_CARD.not_clinically_actionable_yet) : null;
            return (
              <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{pc.studyIndex}</td>
                <td className="px-4 py-2.5 max-w-[16rem]">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 transition-colors">
                      {art?.title ?? `Study ${pc.studyIndex}`}
                    </a>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{art?.title ?? `Study ${pc.studyIndex}`}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                  {pic && pChip ? (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold leading-tight ${pChip.chip}`}>
                      {PRACTICE_IMPACT_LABEL[pic] ?? pic.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="block">{pc.mainContribution}</span>
                  {pc.practiceImpactNote ? (
                    <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-500 border-l-2 border-indigo-300/60 pl-2">{pc.practiceImpactNote}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${strengthCls}`}>
                    {pc.strengthAdded}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
