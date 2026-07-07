import React from 'react';

interface SearchResultsStatsProps {
  totalCount: number;
  openAccessCount: number;
  highQualityCount: number;
  retractedCount: number;
}

export const SearchResultsStats: React.FC<SearchResultsStatsProps> = ({
  totalCount,
  openAccessCount,
  highQualityCount,
  retractedCount,
}) => (
  <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
    {[
      { label: 'Evidence found', value: totalCount, icon: 'fa-layer-group', tone: 'text-indigo-500' },
      { label: 'Open access', value: openAccessCount, icon: 'fa-unlock', tone: 'text-emerald-500' },
      { label: 'A/B quality', value: highQualityCount, icon: 'fa-shield-alt', tone: 'text-blue-500' },
      {
        label: 'Retracted flags',
        value: retractedCount,
        icon: 'fa-triangle-exclamation',
        tone: retractedCount ? 'text-red-500' : 'text-slate-400',
      },
    ].map((item) => (
      <div key={item.label} className="neo-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <div className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${item.tone}`}>
          <i className={`fas ${item.icon} text-xs`} />
        </div>
        <div>
          <p className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
        </div>
      </div>
    ))}
  </div>
);
