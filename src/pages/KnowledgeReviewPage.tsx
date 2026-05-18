import React from 'react';
import { useNavigatePage } from '@contexts/SearchContext';
import { api } from '@services/api';
import type { AgentGuidance, LearningHealthResponse, TeachingClaimReviewItem, TopicKnowledge } from '@types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeminalPaper {
  sourceIndex: number;
  title: string;
  clinicalPrinciple: string;
  year?: string;
  doi?: string;
}

interface TeachingPointDraft {
  claim: string;
  sourceIndices: number[];
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
}

type ActiveTab = 'edit' | 'preview' | 'sources' | 'claims' | 'health';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSeminalPapers(raw: unknown): SeminalPaper[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => ({
    sourceIndex: p?.sourceIndex ?? i + 1,
    title: String(p?.title || ''),
    clinicalPrinciple: String(p?.clinicalPrinciple || ''),
    year: p?.year ? String(p.year) : '',
    doi: p?.doi ? String(p.doi) : '',
  }));
}

function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    typeof item === 'string' ? item : String(item?.point || item?.text || JSON.stringify(item))
  );
}

function toTeachingPoints(raw: unknown): TeachingPointDraft[] {
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

function statusLabel(status: string) {
  if (status === 'human_reviewed') return { label: 'Clinician Reviewed', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  if (status === 'human_edited') return { label: 'Clinician Edited', bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' };
  return { label: 'AI Generated', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StringListEditor({
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

function SeminalPapersEditor({
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

function TeachingPointsEditor({
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

function PreviewPanel({ guidance }: { guidance: Partial<AgentGuidance> & { topic: string } }) {
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

function SourcesPanel({ sourceArticles }: { sourceArticles: TopicKnowledge['sourceArticles'] }) {
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

function LearningHealthPanel({ health, loading, error, onRefresh }: {
  health: LearningHealthResponse['health'] | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading learning health...</p>;
  if (error) return (
    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">
      {error}
    </div>
  );
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
  if (status === 'guideline_conflict') return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'stale_needs_refresh') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (status === 'agent_draft') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (status === 'synthesis_inferred') return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

const FLAG_REASONS = [
  { value: 'guideline_conflict', label: 'Conflicts with guideline' },
  { value: 'stale_needs_refresh', label: 'Stale — needs refresh' },
  { value: 'unverified', label: 'Unverified / unsupported' },
  { value: 'agent_draft', label: 'Revert to draft' },
];

function ClaimCard({
  claim,
  onUpdate,
  onGuidelineCheck,
}: {
  claim: TeachingClaimReviewItem;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
}) {
  const [mode, setMode] = React.useState<'idle' | 'flag' | 'edit'>('idle');
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
        </div>
      )}
    </div>
  );
}

function ClaimsReviewPanel({
  claims,
  loading,
  error,
  onRefresh,
  onUpdate,
  onGuidelineCheck,
}: {
  claims: TeachingClaimReviewItem[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onUpdate: (claim: TeachingClaimReviewItem, verificationStatus: string, opts?: { claimText?: string; verificationReason?: string }) => void;
  onGuidelineCheck: (claim: TeachingClaimReviewItem) => void;
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
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const KnowledgeReviewPage: React.FC = () => {
  const setCurrentPage = useNavigatePage();

  const [topics, setTopics] = React.useState<TopicKnowledge[]>([]);
  const [selected, setSelected] = React.useState<TopicKnowledge | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('edit');
  const [proposals, setProposals] = React.useState<import('../types').TopicKnowledgeProposal[]>([]);
  const [learningHealth, setLearningHealth] = React.useState<LearningHealthResponse['health'] | null>(null);
  const [healthLoading, setHealthLoading] = React.useState(false);
  const [healthError, setHealthError] = React.useState('');
  const [claimQueue, setClaimQueue] = React.useState<TeachingClaimReviewItem[]>([]);
  const [claimsLoading, setClaimsLoading] = React.useState(false);
  const [claimsError, setClaimsError] = React.useState('');

  // Editor state
  const [mentorMessage, setMentorMessage] = React.useState('');
  const [seminalPapers, setSeminalPapers] = React.useState<SeminalPaper[]>([]);
  const [teachingPoints, setTeachingPoints] = React.useState<TeachingPointDraft[]>([]);
  const [caseHooks, setCaseHooks] = React.useState<string[]>([]);
  const [mcqAngles, setMcqAngles] = React.useState<string[]>([]);
  const [keywords, setKeywords] = React.useState<string[]>([]);

  const loadTopics = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listTopicKnowledge({ query, status: statusFilter, limit: 100 });
      setTopics(data.topics);
      setSelected((current) => {
        if (!current) return data.topics[0] ?? null;
        return data.topics.find((t) => t.id === current.id) ?? data.topics[0] ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'AUTH_REQUIRED'
          ? 'Sign in to review topic knowledge.'
          : 'Failed to load topic knowledge.'
      );
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  const [prevSelected, setPrevSelected] = React.useState<TopicKnowledge | null>(null);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    if (selected) {
      const k = selected.knowledge || {};
      setMentorMessage(String(k.mentorMessage || ''));
      setSeminalPapers(toSeminalPapers(k.seminalPapers));
      setTeachingPoints(toTeachingPoints(k.teachingPoints || k.coreTeachingPoints));
      setCaseHooks(toStringList(k.caseGenerationHooks));
      setMcqAngles(toStringList(k.mcqAngles));
      setKeywords(toStringList(k.keywords));
      setNotice('');
      setError('');
      setActiveTab('edit');
      // Fetch pending proposals for this topic
      api.getTopicProposals(selected.topic)
        .then((data) => setProposals(data.proposals))
        .catch(() => setProposals([]));
      setClaimQueue([]);
      setClaimsError('');
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadTopics();
    })();
    return () => { cancelled = true; };
  }, [loadTopics]);

  const loadLearningHealth = React.useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const data = await api.getLearningHealth({ limit: 10, days: 7 });
      setLearningHealth(data.health);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to load learning health.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!learningHealth && !healthLoading) {
      void loadLearningHealth();
    }
  }, [healthLoading, learningHealth, loadLearningHealth]);

  const loadClaimQueue = React.useCallback(async () => {
    setClaimsLoading(true);
    setClaimsError('');
    try {
      const data = await api.getTeachingClaimReviewQueue({
        topic: selected?.topic,
        limit: 40,
      });
      setClaimQueue(data.claims);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to load claim review queue.');
    } finally {
      setClaimsLoading(false);
    }
  }, [selected?.topic]);

  React.useEffect(() => {
    if (activeTab === 'claims' && selected) {
      void loadClaimQueue();
    }
  }, [activeTab, loadClaimQueue, selected]);

  const updateClaimVerification = async (
    claim: TeachingClaimReviewItem,
    verificationStatus: string,
    opts?: { claimText?: string; verificationReason?: string },
  ) => {
    const verificationReason = opts?.verificationReason
      ?? (verificationStatus === 'human_reviewed'
        ? 'Curator reviewed from claim queue.'
        : `Curator marked as ${verificationStatus.replace(/_/g, ' ')}.`);
    try {
      const result = await api.updateTeachingClaimVerification(claim.claimKey, {
        verificationStatus,
        verificationReason,
        claimText: opts?.claimText,
      });
      setClaimQueue((prev) => prev.map((item) => (item.claimKey === claim.claimKey ? { ...item, ...result.claim } : item)));
      setNotice(`Claim marked ${verificationStatus.replace(/_/g, ' ')}.`);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to update claim.');
    }
  };

  const checkClaimGuideline = async (claim: TeachingClaimReviewItem) => {
    try {
      const result = await api.checkTeachingClaimGuidelineAlignment(claim.claimKey);
      setClaimQueue((prev) => prev.map((item) => (item.claimKey === claim.claimKey ? { ...item, ...result.claim } : item)));
      setNotice(`Guideline check: ${result.alignment.alignmentStatus.replace(/_/g, ' ')}.`);
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : 'Failed to check guideline alignment.');
    }
  };

  const buildKnowledge = (): TopicKnowledge['knowledge'] => ({
    ...selected!.knowledge,
    mentorMessage: mentorMessage.trim(),
    seminalPapers: seminalPapers.filter((p) => p.title.trim()),
    teachingPoints: teachingPoints
      .filter((point) => point.claim.trim())
      .map((point) => ({
        claim: point.claim.trim(),
        sourceIndices: point.sourceIndices,
        confidence: point.confidence,
      })),
    caseGenerationHooks: caseHooks.filter(Boolean),
    mcqAngles: mcqAngles.filter(Boolean),
    keywords: keywords.filter(Boolean),
  });

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await api.updateTopicKnowledge(selected.topic, {
        knowledge: buildKnowledge(),
        sourceArticles: selected.sourceArticles,
        status: 'human_edited',
        confidence: Math.max(selected.confidence || 0, 0.9),
      });
      const tk = updated.topicKnowledge;
      setSelected(tk);
      setTopics((prev) => prev.map((t) => (t.id === tk.id ? tk : t)));
      setNotice('Saved and marked as clinician-edited.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!selected) return;
    setReviewing(true);
    setError('');
    setNotice('');
    try {
      const result = await api.reviewTopicKnowledge(selected.topic);
      if (result.agentGuidance) {
        await loadTopics();
        setNotice('Marked as clinician reviewed — this knowledge is now trusted.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reviewed.');
    } finally {
      setReviewing(false);
    }
  };

  const previewGuidance: Partial<AgentGuidance> & { topic: string } = {
    topic: selected?.topic || '',
    mentorMessage,
    seminalPapers: seminalPapers.map((p) => ({
      sourceIndex: p.sourceIndex,
      title: p.title,
      clinicalPrinciple: p.clinicalPrinciple,
    })),
  };

  const reviewedCount = topics.filter(
    (t) => t.status === 'human_reviewed' || t.status === 'human_edited'
  ).length;
  const pendingCount = topics.length - reviewedCount;
  const healthAttention = React.useMemo(() => {
    if (!learningHealth) {
      return {
        count: 0,
        failedRuns: 0,
        lowRecall: 0,
        refreshQueued: 0,
        label: healthError ? 'Learning health unavailable' : 'Learning health loading',
      };
    }
    const failedRuns = learningHealth.schedulerRuns.filter((run) => (
      run.errorCount > 0 || ['failed', 'completed_with_errors'].includes(String(run.status || '').toLowerCase())
    )).length;
    const lowRecall = learningHealth.lowRecall.items.length;
    const refreshQueued = learningHealth.refreshCandidates.length;
    const count = failedRuns + lowRecall + refreshQueued;
    const parts = [
      failedRuns ? `${failedRuns} failed runs` : '',
      lowRecall ? `${lowRecall} low-recall queries` : '',
      refreshQueued ? `${refreshQueued} refresh candidates` : '',
    ].filter(Boolean);
    return {
      count,
      failedRuns,
      lowRecall,
      refreshQueued,
      label: parts.length ? parts.join(', ') : 'Learning system clear',
    };
  }, [healthError, learningHealth]);

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'edit', label: 'Edit', icon: 'fa-pen' },
    { id: 'preview', label: 'Preview', icon: 'fa-eye' },
    { id: 'sources', label: `Sources (${selected?.sourceArticles?.length ?? 0})`, icon: 'fa-file-alt' },
    { id: 'claims', label: `Claims${claimQueue.length ? ` (${claimQueue.length})` : ''}`, icon: 'fa-shield-alt' },
    { id: 'health', label: 'Learning Health', icon: 'fa-chart-line' },
  ];

  return (
    <div className="min-h-screen aurora-bg pb-20">
      <div className="aurora-content">
        {/* Header */}
        <header className="max-w-7xl mx-auto px-4 pt-10 pb-8">
          <button
            type="button"
            onClick={() => setCurrentPage('search')}
            className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-indigo-600"
          >
            <i className="fas fa-arrow-left" /> Back to Search
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-400/20">
                <i className="fas fa-book-medical text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Knowledge Curator</h1>
                <p className="text-sm text-slate-400">Review, edit, and approve the agent's clinical topic memory.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{topics.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Topics</p>
              </div>
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-emerald-600">{reviewedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviewed</p>
              </div>
              {pendingCount > 0 && (
                <div className="neo-card px-4 py-2 text-center">
                  <p className="font-mono text-lg font-black text-amber-500">{pendingCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentPage('guidelines')}
                className="neo-card px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <i className="fas fa-book-medical mr-1" /> Guidelines
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto grid gap-4 px-4 lg:grid-cols-[20rem_1fr]">
          {/* Sidebar */}
          <aside className="neo-card overflow-hidden self-start">
            <div className="border-b border-slate-100 p-3 dark:border-slate-800 space-y-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">All statuses</option>
                <option value="ai_generated">AI Generated</option>
                <option value="human_reviewed">Clinician Reviewed</option>
                <option value="human_edited">Clinician Edited</option>
              </select>
            </div>
            <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
              {!loading && topics.length === 0 && (
                <p className="p-4 text-sm text-slate-400">
                  No topics stored yet. Search for a medical topic to start building the knowledge base.
                </p>
              )}
              {topics.map((item) => {
                const s = statusLabel(item.status);
                const isActive = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className={`truncate text-sm font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.topic}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.bg}`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {Math.round((item.confidence || 0) * 100)}%
                      </span>
                      <span className="ml-auto text-[9px] text-slate-300 dark:text-slate-600">
                        {item.knowledge?.seminalPapers?.length ?? 0} papers
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detail panel */}
          <section className="neo-card overflow-hidden">
            {!selected ? (
              <div className="flex min-h-[40rem] flex-col items-center justify-center gap-3 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <i className="fas fa-book-open text-slate-300 dark:text-slate-600 text-2xl" />
                </div>
                <p className="text-sm text-slate-400">Select a topic from the list to review its knowledge.</p>
              </div>
            ) : (
              <>
                {/* Topic header */}
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Topic</p>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">{selected.topic}</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Last updated {new Date(selected.updatedAt).toLocaleString()}
                        {selected.lastRefreshedAt && ` · refreshed ${new Date(selected.lastRefreshedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusLabel(selected.status).bg}`}>
                        {statusLabel(selected.status).label}
                      </span>
                      <span className="text-xs text-slate-400">{Math.round((selected.confidence || 0) * 100)}% confidence</span>
                      {selected.status !== 'human_reviewed' && (
                        <button
                          type="button"
                          onClick={() => void markReviewed()}
                          disabled={reviewing}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {reviewing
                            ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
                            : <><i className="fas fa-check-circle" /> Mark Reviewed</>
                          }
                        </button>
                      )}
                      {selected.status === 'human_reviewed' && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                          <i className="fas fa-check-circle" /> Clinician approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-4 flex gap-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.id === 'health' ? healthAttention.label : undefined}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <i className={`fas ${tab.icon} text-[10px]`} />
                        {tab.label}
                        {tab.id === 'health' && healthAttention.count > 0 && (
                          <span
                            aria-label={healthAttention.label}
                            className={`ml-1 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white ${
                              healthAttention.failedRuns > 0 ? 'bg-red-600' : 'bg-amber-500'
                            }`}
                          >
                            {healthAttention.count > 99 ? '99+' : healthAttention.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adaptive memory proposal banner */}
                {proposals.length > 0 && (
                  <div className="mx-6 mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-lightbulb text-violet-500 mt-0.5 text-sm" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
                          Your repeated study of "{selected.topic}" triggered an AI knowledge proposal.
                        </p>
                        <p className="text-[11px] text-violet-600 dark:text-violet-300 mt-0.5">
                          Adaptive memory draft from your searches and tracked papers — curator review required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {error && (
                  <div className="mx-6 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">
                    {error}
                  </div>
                )}
                {notice && (
                  <div className="mx-6 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                    <i className="fas fa-check-circle" /> {notice}
                  </div>
                )}

                {/* Tab content */}
                <div className="p-6">
                  {activeTab === 'edit' && (
                    <div className="space-y-6">
                      {/* Mentor message */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
                          Mentor Message
                        </label>
                        <textarea
                          value={mentorMessage}
                          onChange={(e) => setMentorMessage(e.target.value)}
                          rows={4}
                          placeholder="What should the agent tell learners about this topic when they first search it?"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <SeminalPapersEditor papers={seminalPapers} onChange={setSeminalPapers} />

                      <TeachingPointsEditor points={teachingPoints} onChange={setTeachingPoints} />

                      <div className="grid gap-6 md:grid-cols-2">
                        <StringListEditor
                          label="Case Generation Hooks"
                          items={caseHooks}
                          placeholder="A patient scenario to generate a case from…"
                          onChange={setCaseHooks}
                        />
                        <StringListEditor
                          label="MCQ Angles"
                          items={mcqAngles}
                          placeholder="A clinical reasoning angle for an MCQ…"
                          onChange={setMcqAngles}
                        />
                      </div>

                      <StringListEditor
                        label="Keywords"
                        items={keywords}
                        placeholder="keyword"
                        onChange={setKeywords}
                      />

                      {/* Save bar */}
                      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => void loadTopics()}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                          Discard Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {saving
                            ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
                            : <><i className="fas fa-save" /> Save Edits</>
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'preview' && (
                    <div>
                      <p className="mb-4 text-xs text-slate-400">
                        This is how the knowledge panel appears to learners on the search results page.
                      </p>
                      <PreviewPanel guidance={previewGuidance} />
                    </div>
                  )}

                  {activeTab === 'sources' && (
                    <SourcesPanel sourceArticles={selected.sourceArticles} />
                  )}

                  {activeTab === 'claims' && (
                    <ClaimsReviewPanel
                      claims={claimQueue}
                      loading={claimsLoading}
                      error={claimsError}
                      onRefresh={() => void loadClaimQueue()}
                      onUpdate={(claim, verificationStatus, opts) => void updateClaimVerification(claim, verificationStatus, opts)}
                      onGuidelineCheck={(claim) => void checkClaimGuideline(claim)}
                    />
                  )}

                  {activeTab === 'health' && (
                    <LearningHealthPanel
                      health={learningHealth}
                      loading={healthLoading}
                      error={healthError}
                      onRefresh={() => void loadLearningHealth()}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default KnowledgeReviewPage;
