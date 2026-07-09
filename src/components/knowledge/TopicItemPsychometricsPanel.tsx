import React from 'react';
import type { CollectiveMemoryPsychometricItem, TopicCollectiveMemory } from '@types';
import {
  MIN_RELIABLE_ATTEMPTS,
  isPsychometricReliable,
  itemAttemptCount,
} from '@utils/psychometricsConstants';

function collectPsychometricItems(memory: TopicCollectiveMemory): CollectiveMemoryPsychometricItem[] {
  const buckets = [
    ...(memory.highDiscrimination || []),
    ...(memory.tooEasy || []),
    ...(memory.tooHard || []),
    ...(memory.flaggedForReview || []),
  ];
  const seen = new Set<string>();
  return buckets.filter((item) => {
    const key = item.conceptHash || item.questionText || '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bucketLabel(item: CollectiveMemoryPsychometricItem, memory: TopicCollectiveMemory): string {
  if (memory.flaggedForReview?.some((e) => e.conceptHash === item.conceptHash)) return 'Flagged';
  if (memory.tooHard?.some((e) => e.conceptHash === item.conceptHash)) return 'Too hard';
  if (memory.tooEasy?.some((e) => e.conceptHash === item.conceptHash)) return 'Too easy';
  if (memory.highDiscrimination?.some((e) => e.conceptHash === item.conceptHash)) return 'High discrimination';
  return 'Tracked';
}

export function TopicItemPsychometricsPanel({ memory }: { memory: TopicCollectiveMemory | null | undefined }) {
  if (!memory) return null;

  const items = collectPsychometricItems(memory);
  if (items.length === 0) return null;

  const unreliable = items.filter((item) => !isPsychometricReliable(item));
  const reliable = items.filter((item) => isPsychometricReliable(item));

  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Item psychometrics</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Population-level difficulty and discrimination from quiz attempts. Estimates need at least {MIN_RELIABLE_ATTEMPTS} attempts to be reliable.
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          <p>{memory.interactionCount ?? 0} topic attempts</p>
          <p>{memory.uniqueUsers ?? 0} unique learners</p>
        </div>
      </div>

      {unreliable.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <i className="fas fa-hourglass-half mr-2" />
          {unreliable.length} item{unreliable.length === 1 ? '' : 's'} have fewer than {MIN_RELIABLE_ATTEMPTS} attempts — statistics are preliminary, not definitive.
        </div>
      )}

      <div className="space-y-2">
        {[...unreliable, ...reliable].slice(0, 12).map((item) => {
          const attempts = itemAttemptCount(item);
          const reliable = isPsychometricReliable(item);
          return (
            <div
              key={item.conceptHash || item.questionText}
              className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {bucketLabel(item, memory)}
                </span>
                {!reliable && (
                  <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    Insufficient data
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">{attempts} attempts</span>
                {typeof item.correctRate === 'number' && (
                  <span className="text-[10px] text-slate-500">p={item.correctRate}%</span>
                )}
                {item.discrimination != null && (
                  <span className="text-[10px] text-slate-500">discr={item.discrimination}</span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{item.questionText}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
