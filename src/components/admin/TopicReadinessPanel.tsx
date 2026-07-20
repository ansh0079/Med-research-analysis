import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';
import type {
  TopicReadinessRow,
  TopicReadinessTier,
} from '@services/api/knowledgeAdmin';

const readinessTierStyles: Record<TopicReadinessTier, string> = {
  needs_enrichment: 'bg-rose-100 text-rose-700 border-rose-200',
  search_ready: 'bg-blue-100 text-blue-700 border-blue-200',
  learner_ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  flagship: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const readinessTierLabels: Record<TopicReadinessTier, string> = {
  needs_enrichment: 'Needs enrichment',
  search_ready: 'Search ready',
  learner_ready: 'Learner ready',
  flagship: 'Flagship',
};

function missingLabel(signal: string) {
  const labels: Record<string, string> = {
    topic_knowledge: 'Knowledge',
    source_articles: 'Articles',
    guidelines: 'Guidelines',
    claims: 'Claims',
    teaching_objects: 'Teaching',
    mcqs: 'MCQs',
  };
  return labels[signal] || signal.replace(/_/g, ' ');
}

function priorityRank(priority: string) {
  return { high: 0, medium: 1, low: 2, unknown: 3 }[priority] ?? 3;
}

function weaknessScore(row: TopicReadinessRow) {
  return row.missing.length * 10
    + Math.max(0, 8 - row.counts.claims)
    + Math.max(0, 3 - row.counts.sourceArticles)
    + Math.max(0, 1 - row.counts.guidelines) * 4
    + Math.max(0, 1 - row.counts.mcqObjects) * 3;
}

export function TopicReadinessPanel() {
  const [rows, setRows] = useState<TopicReadinessRow[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.knowledge.getTopicReadiness>>['readiness']['summary'] | null>(null);
  const [tier, setTier] = useState<'all' | TopicReadinessTier>('all');
  const [block, setBlock] = useState('all');
  const [seedStatus, setSeedStatus] = useState('all');
  const [sort, setSort] = useState<'weakest' | 'priority' | 'highest'>('weakest');
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.knowledge.getTopicReadiness({ limit: 500 });
      setRows(res.readiness.topics);
      setSummary(res.readiness.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topic readiness');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blocks = Array.from(new Set(rows.map((row) => row.block))).sort();
  const statuses = Array.from(new Set(rows.map((row) => row.seedStatus))).sort();
  const filtered = rows
    .filter((row) => tier === 'all' || row.tier === tier)
    .filter((row) => block === 'all' || row.block === block)
    .filter((row) => seedStatus === 'all' || row.seedStatus === seedStatus)
    .sort((a, b) => {
      if (sort === 'highest') return weaknessScore(a) - weaknessScore(b);
      if (sort === 'priority') return priorityRank(a.priority) - priorityRank(b.priority) || weaknessScore(b) - weaknessScore(a);
      return weaknessScore(b) - weaknessScore(a) || priorityRank(a.priority) - priorityRank(b.priority);
    });

  const runAction = async (row: TopicReadinessRow, action: 'seed' | 'align' | 'watch') => {
    const key = `${row.normalizedTopic}:${action}`;
    setActionKey(key);
    setError(null);
    try {
      if (action === 'seed') {
        if (!row.curriculumTopicId) throw new Error('This topic is not linked to a curriculum seed row yet.');
        await api.knowledge.seedCurriculumTopic(row.curriculumTopicId, {
          searchLimit: 24,
          synthesisArticles: 8,
          synopsisArticles: 3,
          background: true,
        });
      } else if (action === 'align') {
        await api.knowledge.alignTopicGuidelines(row.displayName, { limit: 40, apply: true });
      } else {
        await api.knowledge.runGuidelineWatchScan(row.displayName);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topic action failed');
    } finally {
      setActionKey(null);
    }
  };

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Topic readiness</h2>
          <p className="text-xs text-slate-500 mt-1">
            Canonical corpus coverage across topic knowledge, guidelines, source articles, teaching claims, MCQs, and cases.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="neo-btn text-xs">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Canonical', summary.canonicalTopics],
            ['Enriched', summary.topicKnowledgeRows],
            ['Learner-ready', summary.byTier.learner_ready || 0],
            ['Flagship', summary.byTier.flagship || 0],
            ['Guidelines', summary.tableCounts.topicGuidelines || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All tiers</option>
          {Object.entries(readinessTierLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={block} onChange={(e) => setBlock(e.target.value)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All blocks</option>
          {blocks.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={seedStatus} onChange={(e) => setSeedStatus(e.target.value)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All seed states</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="weakest">Weakest first</option>
          <option value="priority">Highest priority</option>
          <option value="highest">Strongest first</option>
        </select>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="max-h-[34rem] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-widest text-slate-400 dark:bg-slate-900">
            <tr>
              <th className="py-2 pr-2">Topic</th>
              <th className="py-2 pr-2">Tier</th>
              <th className="py-2 pr-2">Counts</th>
              <th className="py-2 pr-2">Missing</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 120).map((row) => (
              <tr key={row.normalizedTopic} className="border-t border-slate-100 align-top dark:border-slate-800">
                <td className="py-2 pr-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{row.displayName}</p>
                  <p className="text-[10px] text-slate-500">{row.block} - {row.priority} - {row.seedStatus}</p>
                </td>
                <td className="py-2 pr-2">
                  <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold uppercase ${readinessTierStyles[row.tier]}`}>
                    {readinessTierLabels[row.tier]}
                  </span>
                </td>
                <td className="py-2 pr-2 text-slate-500">
                  <span title="Source articles">A {row.counts.sourceArticles}</span>
                  {' '}<span title="Guidelines">G {row.counts.guidelines}</span>
                  {' '}<span title="Claims">C {row.counts.claims}</span>
                  {' '}<span title="MCQs">Q {row.counts.mcqObjects}</span>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex max-w-sm flex-wrap gap-1">
                    {row.missing.length === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Complete</span>
                    ) : row.missing.map((signal) => (
                      <span key={signal} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        {missingLabel(signal)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" disabled={!row.curriculumTopicId || actionKey === `${row.normalizedTopic}:seed`}
                      onClick={() => void runAction(row, 'seed')}
                      className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Seed
                    </button>
                    <button type="button" disabled={actionKey === `${row.normalizedTopic}:align`}
                      onClick={() => void runAction(row, 'align')}
                      className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Align
                    </button>
                    <button type="button" disabled={actionKey === `${row.normalizedTopic}:watch`}
                      onClick={() => void runAction(row, 'watch')}
                      className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Refresh
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-500">No topics match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
