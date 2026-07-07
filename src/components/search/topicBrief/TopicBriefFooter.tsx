import React, { useState } from 'react';
import type { Article, CommunityInsight, TopicIntelligence } from '@types';
import { useAuth } from '@contexts/AuthContext';
import { CompetencyRecord } from '@components/learning/CompetencyRecord';
import { TopicBriefSynapseGraph } from './TopicBriefSynapseGraph';
import type { SavedTopic } from './topicBriefUtils';

interface Props {
  query: string;
  allResults: Article[];
  topicIntelligence?: TopicIntelligence | null;
  communityInsight?: CommunityInsight | null;
  onOpenTopic: (topic: string) => void;
  savedTopics: SavedTopic[];
  recentTopics: SavedTopic[];
}

export const TopicBriefFooter: React.FC<Props> = ({
  query,
  allResults,
  topicIntelligence,
  communityInsight,
  onOpenTopic,
  savedTopics,
  recentTopics,
}) => {
  const { isAuthenticated } = useAuth();
  const [showCompetency, setShowCompetency] = useState(false);

  // Related clinical concepts from _synapseTopics
  const normalQ = query.trim().toLowerCase();
  const synapseCounts = new Map<string, number>();
  for (const a of allResults) {
    for (const t of (a._synapseTopics || [])) {
      if (t.toLowerCase() !== normalQ) {
        synapseCounts.set(t, (synapseCounts.get(t) || 0) + 1);
      }
    }
  }
  const topSynapse = [...synapseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  return (
    <>
      {topicIntelligence?.evidenceBouquet?.archetypesCovered && topicIntelligence.evidenceBouquet.archetypesCovered.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-2 bg-slate-50/40 dark:bg-slate-900/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Evidence archetypes covered</p>
          <div className="flex flex-wrap gap-1.5">
            {topicIntelligence.evidenceBouquet.archetypesCovered.map((a) => (
              <span key={a} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <i className="fas fa-check-circle mr-1 text-[8px]" />
                {a.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {communityInsight && communityInsight.articleCount > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-sky-50/60 dark:bg-sky-950/10">
          <p className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400 mb-1.5 flex items-center gap-1.5">
            <i className="fas fa-users text-[10px]" />Community insight
          </p>
          <p className="text-xs text-sky-800 dark:text-sky-300">
            <span className="font-bold">{communityInsight.articleCount} paper{communityInsight.articleCount === 1 ? '' : 's'}</span>
            {' '}in these results {communityInsight.articleCount === 1 ? 'is' : 'are'} frequently cited by other clinicians exploring this topic.
          </p>
          {communityInsight.pivotTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 self-center">Also studied:</span>
              {communityInsight.pivotTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onOpenTopic(t)}
                  className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {topSynapse.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-indigo-50/40 dark:bg-indigo-950/10">
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
            <i className="fas fa-share-nodes text-[10px]" />
            Related clinical concepts
          </p>
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mb-2">
            Papers in these results are also cited in these topics — explore the clinical connections:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topSynapse.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onOpenTopic(t)}
                className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
              >
                ↔ {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <TopicBriefSynapseGraph query={query} onOpenTopic={onOpenTopic} />

      {isAuthenticated && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowCompetency((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <i className="fas fa-graduation-cap text-[10px] text-indigo-500" />
              My competency record
            </span>
            <i className={`fas fa-chevron-${showCompetency ? 'up' : 'down'} text-[10px] text-slate-400`} />
          </button>
          {showCompetency && (
            <div className="px-5 pb-5">
              <CompetencyRecord topic={query} />
            </div>
          )}
        </div>
      )}

      {(savedTopics.length > 0 || recentTopics.length > 1) && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-white/70 dark:bg-slate-950/20 flex flex-wrap gap-2 items-center">
          {savedTopics.slice(0, 4).map((topic) => (
            <button key={`saved-${topic.query}`} type="button" onClick={() => onOpenTopic(topic.query)}
              className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300">
              <i className="fas fa-bookmark text-[9px] mr-1" />{topic.query}
            </button>
          ))}
          {recentTopics.filter((topic) => topic.query.toLowerCase() !== query.toLowerCase()).slice(0, 4).map((topic) => (
            <button key={`recent-${topic.query}`} type="button" onClick={() => onOpenTopic(topic.query)}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300">
              <i className="fas fa-clock-rotate-left text-[9px] mr-1" />{topic.query}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
