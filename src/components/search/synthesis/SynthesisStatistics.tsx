import React from 'react';
import type { SynthesisResult } from '@types';
import type { Article } from '@types';
import { SectionLabel } from './SectionLabel';
import { ArticleLink } from './ArticleLink';

interface Props {
  statistics: NonNullable<SynthesisResult['synthesis']['statistics']>;
  articles: Article[];
}

export const SynthesisStatistics: React.FC<Props> = ({ statistics, articles }) => (
  <div>
    <SectionLabel>Key Statistics</SectionLabel>
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Metric</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Value</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Meaning</th>
            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Ref</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
          {statistics.map((st, i) => (
            <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-2.5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{st.metric}</td>
              <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{st.value}</td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{st.context}</td>
              <td className="px-4 py-2.5">
                <ArticleLink idx={st.studyIndex} articles={articles} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
