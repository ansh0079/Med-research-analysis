import React from 'react';
import type { TopicIntelligence } from '@types';
import type { BouquetSection } from './topicBriefUtils';
import { isGuideline, isLandmark, whySelected } from './topicBriefUtils';

import type { Article } from '@types';

interface Props {
  sections: BouquetSection[];
  expanded: boolean;
  topicIntelligence?: TopicIntelligence | null;
  onArticleClick?: (article: Article) => void;
}

export const TopicBriefBouquetSections: React.FC<Props> = ({ sections, expanded, topicIntelligence, onArticleClick }) => {
  if (!expanded) return null;
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="flex items-center gap-2 px-5 py-2 bg-slate-50/60 dark:bg-slate-900/40">
            <i className={`fas ${section.icon} text-[11px] ${section.color}`} />
            <p className={`text-[11px] font-black uppercase tracking-widest ${section.color}`}>
              {section.label}
            </p>
          </div>

          {section.articles.map((article, i) => {
            const citations = article.pmcrefcount ?? article.citationCount;
            const isFree = article.isFree || !!article.pmcid;
            const year = (article.pubdate ?? article.year?.toString() ?? '').slice(0, 4);
            const landmark = isLandmark(article);
            const guideline = isGuideline(article);
            const rankingInfo = topicIntelligence?.evidenceBouquet?.ranking?.find((r) => r.uid === article.uid);
            const archetype = rankingInfo?.archetype ?? '';
            const reason = rankingInfo?.reasons?.join(' · ') ?? whySelected(article, i);
            const grade = article._quality?.grade;
            return (
              <div
                key={article.uid}
                role={onArticleClick ? 'button' : undefined}
                tabIndex={onArticleClick ? 0 : undefined}
                onClick={onArticleClick ? () => onArticleClick(article) : undefined}
                onKeyDown={onArticleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onArticleClick(article); } : undefined}
                className={`px-5 py-3 transition-colors ${onArticleClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black ${section.color}`}>
                    <span>{i + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug line-clamp-2 ${onArticleClick ? 'text-indigo-700 dark:text-indigo-300 group-hover:underline' : 'text-slate-800 dark:text-slate-100'}`}>
                      {landmark && <i className="fas fa-star text-amber-400 mr-1.5 text-[10px]" title="Landmark study" />}
                      {guideline && <i className="fas fa-book-medical text-blue-400 mr-1.5 text-[10px]" title="Clinical guideline" />}
                      {article.title}
                      {onArticleClick && <i className="fas fa-arrow-up-right-from-square ml-1.5 text-[9px] text-indigo-400 opacity-70" />}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {archetype && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          {archetype.replace(/_/g, ' ')}
                        </span>
                      )}
                      {article._ebmLabel?.short && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {article._ebmLabel.short}
                        </span>
                      )}
                      {grade && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          grade === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          Grade {grade}
                        </span>
                      )}
                      {citations !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <i className="fas fa-quote-right text-[9px]" />
                          {citations.toLocaleString()} cit.
                        </span>
                      )}
                      {year && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{year}</span>
                      )}
                      {isFree && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                          <i className="fas fa-unlock text-[9px]" /> Open access
                        </span>
                      )}
                      {article._isPreprint && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <i className="fas fa-hourglass-half text-[9px]" /> Preprint
                        </span>
                      )}
                    </div>

                    {article.journal && (
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">{article.journal}</p>
                    )}

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1">
                      <i className="fas fa-circle-info text-[9px] text-indigo-400" />
                      {reason}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
