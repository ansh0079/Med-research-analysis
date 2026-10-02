import React from 'react';
import type { Article, SynthesisResult } from '@types';
import { getEvidenceTypeDisplay } from '@utils/evidenceTypeDisplay';

interface Props {
  article: Article;
  contribution?: NonNullable<SynthesisResult['synthesis']['paperContributions']>[number];
  includedCount: number;
  retrievedCount: number;
  onSourceOpen?: () => void;
}

export const SynthesisFeaturedEvidence: React.FC<Props> = ({
  article,
  contribution,
  includedCount,
  retrievedCount,
  onSourceOpen,
}) => {
  const evidenceType = getEvidenceTypeDisplay(article);
  const year = article.year || (article.pubdate ? String(article.pubdate).slice(0, 4) : null);
  const sourceHref = article.doi
    ? `https://doi.org/${article.doi}`
    : article.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`
      : article.fullTextUrl || article.openAccessUrl || null;
  return (
    <section aria-labelledby="featured-evidence-title" className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
          Highest-priority included evidence
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-indigo-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-indigo-900">
          Study 1
        </span>
      </div>
      <h3 id="featured-evidence-title" className="mt-2 text-sm font-black leading-snug text-slate-900 dark:text-white">
        {article.title}
      </h3>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {evidenceType.label}{year ? ` · ${year}` : ''}{article.journal || article.source ? ` · ${article.journal || article.source}` : ''}
      </p>
      {typeof article._rerank?.overallScore === 'number' && (
        <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          Clinical match {Math.round(article._rerank.overallScore * 100)}%
        </p>
      )}
      {contribution?.mainContribution && (
        <p className="mt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {contribution.mainContribution}
        </p>
      )}
      {sourceHref && (
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSourceOpen}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-500 dark:text-indigo-300"
        >
          Open source <i className="fas fa-arrow-up-right-from-square text-[9px]" aria-hidden />
        </a>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        Featured by evidence design, quality and search relevance. The synopsis weighs all {includedCount} included source{includedCount === 1 ? '' : 's'}
        {retrievedCount > includedCount ? ` selected from ${retrievedCount} retrieved papers` : ' from this search'}.
      </p>
    </section>
  );
};
