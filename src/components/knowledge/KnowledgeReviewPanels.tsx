import React from 'react';
import type { AgentGuidance, LearningHealthResponse, TeachingClaimReviewItem, TopicKnowledge } from '@types';
import { ClaimTrustLadder, trustLadderFromVerificationStatus } from '@components/learning/ClaimTrustLadder';

export interface SeminalPaper {
  sourceIndex: number;
  title: string;
  clinicalPrinciple: string;
  year?: string;
  doi?: string;
}

export interface TeachingPointDraft {
  claim: string;
  sourceIndices: number[];
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
}

export type ActiveTab = 'edit' | 'preview' | 'sources' | 'claims' | 'health';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toSeminalPapers(raw: unknown): SeminalPaper[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => ({
    sourceIndex: p?.sourceIndex ?? i + 1,
    title: String(p?.title || ''),
    clinicalPrinciple: String(p?.clinicalPrinciple || ''),
    year: p?.year ? String(p.year) : '',
    doi: p?.doi ? String(p.doi) : '',
  }));
}

export function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    typeof item === 'string' ? item : String(item?.point || item?.text || JSON.stringify(item))
  );
}

export function toTeachingPoints(raw: unknown): TeachingPointDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { claim: item, sourceIndices: [], confidence: 'LOW' };
    }
    const sourceIndices = Array.isArray(item?.sourceIndices)
      ? item.sourceIndices.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    const confidence = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'].includes(String(item?.confidence))
      ? String(item.confidence) as TeachingPointDraft['confidence']
      : 'LOW';
    return {
      claim: String(item?.claim || item?.point || item?.text || ''),
      sourceIndices,
      confidence,
    };
  });
}

export function statusLabel(status: string) {
  if (status === 'human_reviewed') return { label: 'Clinician Reviewed', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  if (status === 'human_edited') return { label: 'Clinician Edited', bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' };
  return { label: 'AI Generated', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function StringListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const update = (i: number, val: string) => onChange(items.map((item, idx) => (idx === i ? val : item)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-slate-400 italic">None yet — click + Add</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-2 text-[10px] font-mono text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}</span>
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-1.5 text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
              aria-label="Remove"
            >
              <i className="fas fa-times text-[10px]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeminalPapersEditor({
  papers,
  onChange,
}: {
  papers: SeminalPaper[];
  onChange: (papers: SeminalPaper[]) => void;
}) {
  const update = (i: number, field: keyof SeminalPaper, val: string) =>
    onChange(papers.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  const remove = (i: number) => onChange(papers.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...papers, { sourceIndex: papers.length + 1, title: '', clinicalPrinciple: '', year: '', doi: '' }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Seminal Papers</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add Paper
        </button>
      </div>
      <div className="space-y-3">
        {papers.length === 0 && <p className="text-xs text-slate-400 italic">No seminal papers stored yet.</p>}
        {papers.map((paper, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-400">[{paper.sourceIndex}]</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
                aria-label="Remove paper"
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </div>
            <input
              value={paper.title}
              onChange={(e) => update(i, 'title', e.target.value)}
              placeholder="Paper title"
              className="mb-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <textarea
              value={paper.clinicalPrinciple}
              onChange={(e) => update(i, 'clinicalPrinciple', e.target.value)}
              placeholder="Clinical principle or key finding..."
              rows={2}
              className="mb-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            />
            <div className="flex gap-2">
              <input
                value={paper.year || ''}
                onChange={(e) => update(i, 'year', e.target.value)}
                placeholder="Year"
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <input
                value={paper.doi || ''}
                onChange={(e) => update(i, 'doi', e.target.value)}
                placeholder="DOI (optional)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeachingPointsEditor({
  points,
  onChange,
}: {
  points: TeachingPointDraft[];
  onChange: (points: TeachingPointDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<TeachingPointDraft>) =>
    onChange(points.map((point, idx) => (idx === i ? { ...point, ...patch } : point)));
  const remove = (i: number) => onChange(points.filter((_, idx) => idx !== i));
  const add = () => onChange([...points, { claim: '', sourceIndices: [], confidence: 'LOW' }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Core Teaching Points</span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {points.length === 0 && <p className="text-xs text-slate-400 italic">No teaching points stored yet.</p>}
        {points.map((point, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">{i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-red-400 dark:text-slate-600 transition-colors"
                aria-label="Remove teaching point"
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </div>
            <textarea
              value={point.claim}
              onChange={(e) => update(i, { claim: e.target.value })}
              placeholder="Evidence-grounded teaching point..."
              rows={2}
              className="mb-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
              <input
                value={point.sourceIndices.join(', ')}
                onChange={(e) => update(i, {
                  sourceIndices: e.target.value
                    .split(',')
                    .map((part) => Number(part.trim()))
                    .filter((n) => Number.isInteger(n) && n > 0),
                })}
                placeholder="Source indices, e.g. 1, 3"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <select
                value={point.confidence}
                onChange={(e) => update(i, { confidence: e.target.value as TeachingPointDraft['confidence'] })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="HIGH">HIGH</option>
                <option value="MODERATE">MODERATE</option>
                <option value="LOW">LOW</option>
                <option value="VERY_LOW">VERY_LOW</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewPanel({ guidance }: { guidance: Partial<AgentGuidance> & { topic: string } }) {
  return (
    <div className="rounded-2xl border border-emerald-100 overflow-hidden dark:border-emerald-900/40">
      <div className="bg-emerald-600 px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
          <i className="fas fa-user-graduate text-white text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Mentor Message</p>
          <p className="text-sm font-black text-white">{guidance.topic}</p>
        </div>
      </div>
      <div className="p-5 space-y-4 bg-white dark:bg-slate-900">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {guidance.mentorMessage || <span className="text-slate-400 italic">No mentor message set</span>}
        </p>
        {(guidance.seminalPapers?.length ?? 0) > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {guidance.seminalPapers!.slice(0, 4).map((paper) => (
              <div key={paper.sourceIndex} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  [{paper.sourceIndex}] {paper.title}
                </p>
                {paper.clinicalPrinciple && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {paper.clinicalPrinciple}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-indigo-500 px-3 py-1.5 text-[10px] font-bold text-white">Generate Case</span>
          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600">Generate MCQs</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">Review Evidence</span>
        </div>
      </div>
    </div>
  );
}

export function SourcesPanel({ sourceArticles }: { sourceArticles: TopicKnowledge['sourceArticles'] }) {
  if (!sourceArticles?.length) {
    return <p className="text-sm text-slate-400 italic">No source articles recorded for this topic.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        {sourceArticles.length} article{sourceArticles.length === 1 ? '' : 's'} used to build this knowledge
      </p>
      {sourceArticles.map((a, i) => (
        <div key={a.uid || i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              [{a.sourceIndex}] {a.title || 'Untitled'}
            </p>
            {a.doi && (
              <a
                href={`https://doi.org/${a.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[10px] text-indigo-500 hover:text-indigo-700 font-mono"
              >
                DOI ↗
              </a>
            )}
          </div>
          <div className="mt-1 flex gap-3 text-[10px] text-slate-400">
            {a.source && <span>{a.source}</span>}
            {a.pubdate && <span>{a.pubdate}</span>}
            {a.pmid && <span>PMID {a.pmid}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LearningHealthPanel({ health, loading, error, onRefresh }: {
  health: LearningHealthResponse['health'] | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading learning health...</p>;
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">
        {error}
      </div>
    );
  }
  if (!health) return <p className="text-sm text-slate-400">No learning health data yet.</p>;

  const vectorPct = Math.round((health.vectorUsage.usageRate || 0) * 100);
  const latestRun = health.schedulerRuns[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Learning System</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generated {new Date(health.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <i className="fas fa-sync-alt mr-1" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vector Usage</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{vectorPct}%</p>
          <p className="text-[11px] text-slate-400">{health.vectorUsage.used}/{health.vectorUsage.total} searches</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Refresh Queue</p>
          <p className="mt-1 text-2xl font-black text-amber-600">{health.refreshCandidates.length}</p>
          <p className="text-[11px] text-slate-400">decay-prioritized topics</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Low Recall</p>
          <p className="mt-1 text-2xl font-black text-rose-600">{health.lowRecall.items.length}</p>
          <p className="text-[11px] text-slate-400">last {health.lowRecall.days} days</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alias Seeded</p>
          <p className="mt-1 text-2xl font-black text-indigo-600">{health.aliasSeededTopics.length}</p>
          <p className="text-[11px] text-slate-400">placeholder topics</p>
        </div>
      </div>

      {(health.teachingObjects || health.freshness) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {health.teachingObjects && (
            <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Teaching Objects</p>
                  <p className="text-2xl font-black text-emerald-600">{health.teachingObjects.total}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {health.teachingObjects.byType.map((item) => (
                    <p key={item.objectType}>{item.objectType}: {item.count}</p>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {health.teachingObjects.recent.slice(0, 3).map((item) => (
                  <div key={item.objectKey} className="text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title || item.objectKey}</p>
                    <p className="text-slate-400">{item.objectType} / {item.topic || 'no topic'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {health.freshness && (
            <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Freshness Alerts</p>
              <div className="mt-3 space-y-2">
                {health.freshness.staleTopics.slice(0, 3).map((item) => (
                  <div key={item.normalizedTopic} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</span>
                    <span className="text-amber-600">{Math.round((item.confidenceDecay || 0) * 100)}% decay</span>
                  </div>
                ))}
                {health.freshness.strongMemoryRefresh.slice(0, 3).map((item) => (
                  <div key={item.normalizedTopic} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</span>
                    <span className="text-blue-600">engaged {Math.round(item.communityEngagementScore || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {latestRun && (
        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Latest scheduler run</p>
              <p className="text-[11px] text-slate-400">{new Date(latestRun.startedAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {latestRun.status}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
            <span>{latestRun.candidatesCount} candidates</span>
            <span>{latestRun.refreshedCount} refreshed</span>
            <span>{latestRun.skippedCount} skipped</span>
            <span>{latestRun.errorCount} errors</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Top Bouquet Signals</p>
          <div className="space-y-2">
            {health.topBouquetTopics.slice(0, 6).map((item) => (
              <div key={item.normalizedTopic} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</p>
                <p className="text-[11px] text-slate-400">{item.totalSignals} signals · {item.distinctArticles} papers</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Refresh Candidates</p>
          <div className="space-y-2">
            {health.refreshCandidates.slice(0, 6).map((item) => (
              <div key={item.normalizedTopic} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</p>
                  <span className="text-[10px] font-bold text-amber-600">{item.priorityScore.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {item.volatility} · decay {Math.round((item.confidenceDecay || 0) * 100)}% · effective {Math.round((item.effectiveConfidence || 0) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Low-Recall Queries</p>
        <div className="space-y-2">
          {health.lowRecall.items.slice(0, 6).map((item) => (
            <div key={`${item.normalizedTopic}-${item.displayQuery}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayQuery}</p>
              <p className="text-[11px] text-slate-400">
                {item.attemptCount} attempts · {item.resultCount} results · aliases: {item.expandedAliases.slice(0, 4).join(', ') || 'none'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function claimStatusStyle(status: string) {
  if (status === 'human_reviewed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'guideline_supported') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  if (status === 'full_text_available') return 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300';
  if (status === 'guideline_uncertain') return 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  if (status === 'guideline_conflict') return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'stale_needs_refresh') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (status === 'agent_draft') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (status === 'synthesis_inferred') return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

const FLAG_REASONS = [
  { value: 'guideline_uncertain', label: 'Guideline overlap uncertain' },
  { value: 'guideline_conflict', label: 'Conflicts with guideline' },
  { value: 'stale_needs_refresh', label: 'Stale — needs refresh' },
  { value: 'unverified', label: 'Unverified / unsupported' },
  { value: 'agent_draft', label: 'Revert to draft' },
];

function ClaimCard({
  claim,
  onUpdate,
  onGuidelineCheck,
  onCuratorMeta,
}: {
  claim: TeachingClaimReviewItem;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
  onCuratorMeta?: (claim: TeachingClaimReviewItem, patch: Record<string, boolean | string>) => void;
}) {
  const [mode, setMode] = React.useState<'idle' | 'flag' | 'edit' | 'expert'>('idle');
  const [editText, setEditText] = React.useState(claim.claimText);
  const [flagReason, setFlagReason] = React.useState(FLAG_REASONS[0].value);
  const [busy, setBusy] = React.useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try { await onUpdate(claim, 'human_reviewed'); } finally { setBusy(false); setMode('idle'); }
  };

  const handleFlag = async () => {
    setBusy(true);
    try { await onUpdate(claim, flagReason, { verificationReason: `Curator flagged: ${FLAG_REASONS.find((r) => r.value === flagReason)?.label ?? flagReason}` }); }
    finally { setBusy(false); setMode('idle'); }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === claim.claimText) { setMode('idle'); return; }
    setBusy(true);
    try { await onUpdate(claim, 'human_reviewed', { claimText: editText.trim(), verificationReason: 'Curator edited claim text.' }); }
    finally { setBusy(false); setMode('idle'); }
  };

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${claimStatusStyle(claim.verificationStatus)}`}>
          {claim.verificationStatus.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] text-slate-400">{claim.objectType || 'claim'} · {claim.topic || claim.normalizedTopic || 'no topic'}</span>
        {claim.quizAttempts ? <span className="text-[10px] text-slate-400">{claim.quizCorrect || 0}/{claim.quizAttempts} quiz correct</span> : null}
      </div>
      <ClaimTrustLadder steps={trustLadderFromVerificationStatus(claim.verificationStatus)} compact />

      {/* Claim text — editable or read-only */}
      {mode === 'edit' ? (
        <div className="space-y-2">
          <textarea
            aria-label="Edit claim text"
            className="w-full rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void handleSaveEdit()}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
              <i className="fas fa-save mr-1" /> Save &amp; approve
            </button>
            <button type="button" onClick={() => { setEditText(claim.claimText); setMode('idle'); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{claim.claimText}</p>
      )}

      {/* Evidence quote */}
      {claim.evidenceQuote && mode !== 'edit' && (
        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 italic">&ldquo;{claim.evidenceQuote}&rdquo;</p>
      )}

      {/* Source line */}
      {mode !== 'edit' && (
        <p className="text-[10px] text-slate-400">
          {claim.sourcePath || 'no source path'}{claim.articleUid ? ` · ${claim.articleUid}` : ''}
          {claim.verificationReason ? ` · ${claim.verificationReason}` : ''}
        </p>
      )}

      {/* Flag reason picker */}
      {mode === 'flag' && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Flag reason"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-xs px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {FLAG_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={() => void handleFlag()}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-flag mr-1" /> Confirm flag
          </button>
          <button type="button" onClick={() => setMode('idle')}
            className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Action bar */}
      {mode === 'idle' && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button type="button" disabled={busy} onClick={() => void handleApprove()}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-check mr-1" /> Approve
          </button>
          <button type="button" onClick={() => setMode('flag')}
            className="rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold px-3 py-1.5 transition-colors">
            <i className="fas fa-flag mr-1" /> Flag
          </button>
          <button type="button" onClick={() => { setEditText(claim.claimText); setMode('edit'); }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <i className="fas fa-pencil-alt mr-1" /> Edit
          </button>
          <button type="button" onClick={() => onGuidelineCheck(claim)}
            className="rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
            <i className="fas fa-balance-scale mr-1" /> Guideline check
          </button>
          {onCuratorMeta && (
            <button type="button" onClick={() => setMode('expert')}
              className="rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-[11px] font-bold px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors">
              <i className="fas fa-user-md mr-1" /> Expert
            </button>
          )}
        </div>
      )}

      {mode === 'expert' && onCuratorMeta && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { examRelevant: true }); setMode('idle'); }}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold px-2.5 py-1.5">Exam-relevant</button>
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { practiceChanging: true }); setMode('idle'); }}
            className="rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 text-[11px] font-bold px-2.5 py-1.5">Practice-changing</button>
          <button type="button" disabled={busy} onClick={() => { void onCuratorMeta(claim, { overclaimed: true }); setMode('idle'); }}
            className="rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1.5">Mark overclaimed</button>
          <button type="button" onClick={() => setMode('idle')}
            className="rounded-lg border border-slate-200 text-[11px] font-bold px-2.5 py-1.5">Cancel</button>
        </div>
      )}
    </div>
  );
}

export function ClaimsReviewPanel({
  claims,
  loading,
  error,
  onRefresh,
  onUpdate,
  onGuidelineCheck,
  onCuratorMeta,
}: {
  claims: TeachingClaimReviewItem[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
  onCuratorMeta: (claim: TeachingClaimReviewItem, patch: Record<string, boolean | string>) => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading claim review queue...</p>;
  if (error) return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Claim Review Queue</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Approve, flag, or edit teaching claims before they enter the quiz pool.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <i className="fas fa-sync-alt mr-1" /> Refresh
        </button>
      </div>

      {claims.length === 0 && (
        <div className="rounded-xl border border-slate-100 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
          No claims need review for this topic.
        </div>
      )}

      <div className="space-y-3">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.claimKey}
            claim={claim}
            onUpdate={onUpdate}
            onGuidelineCheck={onGuidelineCheck}
            onCuratorMeta={onCuratorMeta}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
