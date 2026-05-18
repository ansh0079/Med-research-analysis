import React from 'react';
import type { PrismaCounts } from '@types';

interface Props {
  counts: PrismaCounts;
}

export const PrismaFlow: React.FC<Props> = ({ counts }) => {
  const items = [
    { label: 'Identified', value: counts.total },
    { label: 'Pending', value: counts.pending },
    { label: 'Included', value: counts.included },
    { label: 'Excluded', value: counts.excluded },
    { label: 'Maybe', value: counts.maybe },
  ];

  return (
    <div className="neo-card rounded-2xl p-4">
      <h3 className="text-lg font-black text-gray-900 dark:text-white">PRISMA Snapshot</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-indigo-100 dark:border-slate-700 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
