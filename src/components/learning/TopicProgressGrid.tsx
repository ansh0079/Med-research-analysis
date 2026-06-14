import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@services/api';
import type { TopicProgressBlock, TopicProgressTopic } from '@types';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  confident:   { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Confident' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400',    label: 'In progress' },
  not_started: { bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-400 dark:text-slate-500',     label: 'Not started' },
};

function scoreColor(score: number | null) {
  if (score == null) return 'text-slate-300 dark:text-slate-600';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function ProgressRing({ pct, size = 44, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#e2e8f0';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={stroke} className="text-slate-100 dark:text-slate-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="text-[10px] font-black fill-slate-700 dark:fill-slate-200">
        {pct}%
      </text>
    </svg>
  );
}

function MiniBar({ score, label }: { score: number | null; label: string }) {
  if (score == null) return null;
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-400 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-[9px] font-bold text-slate-500 w-5 text-right">{score}</span>
    </div>
  );
}

function TopicCard({
  topic,
  onQuiz,
  onCase,
}: {
  topic: TopicProgressTopic;
  onQuiz: (topic: string) => void;
  onCase: (topic: string) => void;
}) {
  const style = STATUS_STYLES[topic.status] || STATUS_STYLES.not_started;
  const isDue = topic.nextReviewAt && new Date(topic.nextReviewAt) <= new Date();

  return (
    <div className={`rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2 ${
      isDue ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''
    }`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {topic.displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            {isDue && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Due
              </span>
            )}
          </div>
        </div>
        {topic.overallScore != null && (
          <span className={`text-lg font-black ${scoreColor(topic.overallScore)} shrink-0`}>
            {topic.overallScore}
          </span>
        )}
      </div>

      {topic.quizAttempts > 0 && (
        <div className="space-y-0.5">
          <MiniBar score={topic.recallScore} label="R" />
          <MiniBar score={topic.clinicalApplicationScore} label="C" />
          <MiniBar score={topic.guidelineScore} label="G" />
        </div>
      )}

      {topic.quizAttempts > 0 && (
        <p className="text-[9px] text-slate-400">
          {topic.quizAttempts} question{topic.quizAttempts !== 1 ? 's' : ''} · {topic.correctCount} correct
        </p>
      )}

      <div className="flex gap-1.5 mt-auto">
        <button type="button" onClick={() => onQuiz(topic.displayName)}
          className="flex-1 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold transition-colors">
          <i className="fas fa-brain mr-1" />Quiz
        </button>
        <button type="button" onClick={() => onCase(topic.displayName)}
          className="flex-1 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition-colors">
          <i className="fas fa-stethoscope mr-1" />Case
        </button>
      </div>
    </div>
  );
}

function BlockSection({
  block,
  expanded,
  onToggle,
  filter,
  onQuiz,
  onCase,
}: {
  block: TopicProgressBlock;
  expanded: boolean;
  onToggle: () => void;
  filter: string;
  onQuiz: (topic: string) => void;
  onCase: (topic: string) => void;
}) {
  const pct = block.topicCount > 0 ? Math.round((block.started / block.topicCount) * 100) : 0;
  const filteredTopics = filter
    ? block.topics.filter((t) => t.displayName.toLowerCase().includes(filter.toLowerCase()))
    : block.topics;

  if (filter && filteredTopics.length === 0) return null;

  return (
    <div className="neo-card overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
        <ProgressRing pct={pct} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{block.name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {block.started}/{block.topicCount} started · {block.confident} confident
            {block.avgScore != null && <> · avg {block.avgScore}%</>}
          </p>
        </div>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-slate-300 text-xs shrink-0`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredTopics.map((t) => (
              <TopicCard key={t.id} topic={t} onQuiz={onQuiz} onCase={onCase} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopicProgressGrid({
  onQuiz,
  onCase,
}: {
  onQuiz: (topic: string) => void;
  onCase: (topic: string) => void;
}) {
  const [blocks, setBlocks] = useState<TopicProgressBlock[]>([]);
  const [examSummary, setExamSummary] = useState<{ totalTopics: number; topicsStarted: number; confident: number; pctTopicsTouched: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'confident' | 'due'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getTopicProgress();
        if (!cancelled) {
          setBlocks(data.blocks);
          setExamSummary(data.examSummary);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleBlock = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(blocks.map((b) => b.id)));
  }, [blocks]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  if (loading) {
    return (
      <div className="neo-card p-8 flex justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="neo-card p-6 text-center">
        <i className="fas fa-exclamation-circle text-red-400 text-2xl mb-2 block" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const totalTopics = blocks.reduce((s, b) => s + b.topicCount, 0);
  const totalStarted = blocks.reduce((s, b) => s + b.started, 0);
  const totalConfident = blocks.reduce((s, b) => s + b.confident, 0);
  const totalDue = blocks.reduce((s, b) => s + b.topics.filter((t) => t.nextReviewAt && new Date(t.nextReviewAt) <= new Date()).length, 0);
  const overallPct = totalTopics > 0 ? Math.round((totalStarted / totalTopics) * 100) : 0;

  const filteredBlocks = blocks.map((block) => {
    if (statusFilter === 'all') return block;
    const filtered = block.topics.filter((t) => {
      if (statusFilter === 'due') return t.nextReviewAt && new Date(t.nextReviewAt) <= new Date();
      return t.status === statusFilter;
    });
    return { ...block, topics: filtered, topicCount: block.topicCount };
  }).filter((b) => statusFilter === 'all' || b.topics.length > 0);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="neo-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <ProgressRing pct={overallPct} size={56} stroke={5} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Curriculum progress
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalStarted} of {totalTopics} topics started · {totalConfident} confident · {totalDue} due for review
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={expandAll}
              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
              Expand all
            </button>
            <button type="button" onClick={collapseAll}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Collapse
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search topics..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-1">
            {([
              { key: 'all', label: 'All', count: totalTopics },
              { key: 'not_started', label: 'Not started', count: totalTopics - totalStarted },
              { key: 'in_progress', label: 'In progress', count: totalStarted - totalConfident },
              { key: 'confident', label: 'Confident', count: totalConfident },
              { key: 'due', label: 'Due', count: totalDue },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                  statusFilter === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Specialty blocks */}
      {filteredBlocks.map((block) => (
        <BlockSection
          key={block.id}
          block={block}
          expanded={expanded.has(block.id) || filter.length > 0}
          onToggle={() => toggleBlock(block.id)}
          filter={filter}
          onQuiz={onQuiz}
          onCase={onCase}
        />
      ))}
    </div>
  );
}
