import React from 'react';
import type { Article } from '@types';

interface ArticleLinkProps {
  idx: number;
  articles: Article[];
}

export const ArticleLink: React.FC<ArticleLinkProps> = ({ idx, articles }) => {
  const a = articles[idx - 1];
  if (!a) return null;
  const href = a.doi
    ? `https://doi.org/${a.doi}`
    : a.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
      : null;
  const chip = (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/15">
      {idx}
    </span>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" title={a.title}>{chip}</a> : chip;
};
