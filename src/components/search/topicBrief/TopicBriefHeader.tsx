import React from 'react';

interface Props {
  query: string;
  topCount: number;
  guidelineCount: number;
  totalCount: number;
  isFlagshipTopic: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export const TopicBriefHeader: React.FC<Props> = ({
  query,
  topCount,
  guidelineCount,
  totalCount,
  isFlagshipTopic,
  expanded,
  onToggle,
}) => {
  const shortQuery = query.length > 80 ? query.slice(0, 77) + '…' : query;
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <i className="fas fa-seedling text-white text-sm" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {isFlagshipTopic ? 'Flagship Topic · Evidence Mentor Ready' : 'Evidence Bouquet'}
          </p>
          <p className="text-sm font-black text-white truncate">{shortQuery}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isFlagshipTopic && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <i className="fas fa-award text-[9px]" />
            Flagship
          </span>
        )}
        <span className="text-[11px] text-white/60 font-mono hidden sm:block">
          {topCount} top papers · {guidelineCount} guidelines · {totalCount} total
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-white text-[10px]`} />
        </button>
      </div>
    </div>
  );
};
