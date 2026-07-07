import React from 'react';
import type { Article } from '@types';
import { SectionLabel } from './SectionLabel';

interface Props {
  articles: Article[];
}

export const SynthesisSourcePapers: React.FC<Props> = ({ articles }) => (
  <div>
    <SectionLabel>Papers Analysed</SectionLabel>
    <div className="space-y-1">
      {articles.slice(0, 15).map((a, i) => {
        const href = a.doi
          ? `https://doi.org/${a.doi}`
          : a.pmid
            ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
            : null;
        return (
          <div key={a.uid} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <div className="flex gap-2 items-baseline">
              <span className="font-mono font-bold text-indigo-500 shrink-0 w-5">{i + 1}.</span>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {a.title}
                </a>
              ) : (
                <span className="line-clamp-1">{a.title}</span>
              )}
              {a.pubdate && <span className="text-slate-400 shrink-0 font-mono">({a.pubdate.split(' ')[0]})</span>}
              {a._quality?.grade && (
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                  Quality {a._quality.grade}
                </span>
              )}
              {a._retraction?.isRetracted && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  Retracted
                </span>
              )}
            </div>
            {a.abstract && (
              <p className="mt-2 line-clamp-2 pl-7 leading-relaxed text-slate-500 dark:text-slate-500">
                {a.abstract}
              </p>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
