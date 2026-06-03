import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@services/api';

interface ReviewCard {
  outlineNodeId: string;
  outlineLabel: string | null;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
}

interface ReviewGroup {
  topic: string;
  normalizedTopic: string;
  cards: ReviewCard[];
}

interface QueueData {
  total: number;
  groups: ReviewGroup[];
}

interface HabitStatus {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  dueCount: number;
  streakAtRisk: boolean;
  nextMilestone: number;
  daysToMilestone: number;
  dailyGoalMet: boolean;
}

function StreakBanner({ habit }: { habit: HabitStatus }) {
  const pct = habit.nextMilestone > 0
    ? Math.min(100, Math.round((habit.currentStreak / habit.nextMilestone) * 100))
    : 0;

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
      habit.streakAtRisk
        ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20'
        : 'border-orange-200 dark:border-orange-800/40 bg-orange-50/80 dark:bg-orange-950/15'
    }`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white shrink-0">
          <i className="fas fa-fire" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {habit.currentStreak}-day streak
            {habit.longestStreak > habit.currentStreak && (
              <span className="text-xs font-semibold text-slate-400 ml-2">Best: {habit.longestStreak}</span>
            )}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {habit.studiedToday
              ? 'Daily goal met — great consistency.'
              : habit.streakAtRisk
                ? 'Reviews due today — complete one to keep your streak alive.'
                : `${habit.daysToMilestone} day${habit.daysToMilestone === 1 ? '' : 's'} to ${habit.nextMilestone}-day milestone`}
          </p>
        </div>
      </div>
      <div className="sm:w-32">
        <div className="h-1.5 rounded-full bg-orange-200/60 dark:bg-orange-900/40 overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-orange-700 dark:text-orange-300 mt-1 text-right">{habit.currentStreak}/{habit.nextMilestone}</p>
      </div>
    </div>
  );
}

function intervalLabel(days: number): string {
  if (days <= 1) return 'New';
  if (days <= 7) return `${days}d interval`;
  if (days <= 30) return `${Math.round(days / 7)}w interval`;
  return `${Math.round(days / 30)}mo interval`;
}

export function DailyReviewQueue() {
  const navigate = useNavigate();
  const [data, setData] = useState<QueueData | null>(null);
  const [habit, setHabit] = useState<HabitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, habitStatus] = await Promise.all([
        api.getDueReviews(),
        api.getHabitStatus().catch(() => null),
      ]);
      setData(result);
      setHabit(habitStatus);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startReview = (group: ReviewGroup) => {
    const nodeIds = group.cards.map((c) => c.outlineNodeId).join(',');
    navigate(`/quiz?topic=${encodeURIComponent(group.topic)}&targetNodes=${encodeURIComponent(nodeIds)}&mode=spaced_rep`);
  };

  const startAll = () => {
    if (!data || data.groups.length === 0) return;
    // Start the topic with most due cards first
    startReview(data.groups[0]);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="space-y-3">
        {habit && habit.currentStreak > 0 && <StreakBanner habit={habit} />}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 flex items-start gap-3">
          <i className="fas fa-circle-check text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">All caught up!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              {habit?.studiedToday
                ? 'No reviews due — your streak is safe for today.'
                : 'No reviews due. Complete a quiz to start or extend your streak.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habit && <StreakBanner habit={habit} />}
      <div className="rounded-xl border border-violet-200 dark:border-violet-700/40 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-800/40">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-[11px] font-black">
            {data.total}
          </span>
          <div>
            <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Reviews due today</p>
            <p className="text-[11px] text-violet-600 dark:text-violet-400">
              {data.groups.length} topic{data.groups.length === 1 ? '' : 's'} · spaced repetition
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startAll}
            className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 transition-colors"
          >
            Start <i className="fas fa-play ml-1 text-[10px]" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            aria-label="Toggle details"
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[11px]`} />
          </button>
        </div>
      </div>

      {/* Topic groups */}
      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.groups.map((group) => (
            <div key={group.normalizedTopic} className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.topic}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {group.cards.length} concept{group.cards.length === 1 ? '' : 's'} due
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startReview(group)}
                  className="rounded-lg border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 text-xs font-semibold px-2.5 py-1 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
                >
                  Review
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.cards.slice(0, 6).map((card) => (
                  <span
                    key={card.outlineNodeId}
                    title={card.outlineLabel || card.outlineNodeId}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.repetitions === 0 ? 'bg-amber-400' : card.intervalDays <= 3 ? 'bg-orange-400' : 'bg-violet-400'}`} />
                    {card.outlineLabel || card.outlineNodeId}
                    <span className="text-slate-400 dark:text-slate-500 ml-0.5 shrink-0">· {intervalLabel(card.intervalDays)}</span>
                  </span>
                ))}
                {group.cards.length > 6 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                    +{group.cards.length - 6} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

/** Compact badge for embedding in nav/tabs — just shows the count. */
export function DueReviewBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.getDueReviewCount()
      .then((r) => setCount(r.count))
      .catch(() => setCount(null));
  }, []);

  if (!count) return null;

  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-violet-500 text-white text-[10px] font-black px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}
