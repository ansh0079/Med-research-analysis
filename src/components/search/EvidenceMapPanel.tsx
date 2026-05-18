import React from 'react';
import type { TopicIntelligence } from '@types';

interface Props {
  evidenceMap?: TopicIntelligence['evidenceMap'] | null;
  onOpenTopic?: (topic: string) => void;
}

function pct(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

const CLAIM_BADGE: Record<string, string> = {
  human_reviewed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  source_verified: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200',
  guideline_supported: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  abstract_only: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  synthesis_inferred: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
  agent_draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  stale_needs_refresh: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
};

function claimBadgeLabel(status?: string | null) {
  return String(status || 'unverified').replace(/_/g, ' ');
}

export const EvidenceMapPanel: React.FC<Props> = ({ evidenceMap, onOpenTopic }) => {
  if (!evidenceMap) return null;
  const nodes = evidenceMap.nodes || {};
  const freshness = evidenceMap.freshness || {};
  const relatedTopics = nodes.relatedTopics || [];
  const teachingObjects = nodes.teachingObjects || [];
  const groundedClaims = nodes.groundedClaims || [];
  const liveEvidence = nodes.liveEvidence || [];
  const teachingPoints = nodes.teachingPoints || [];

  return (
    <section className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Evidence map</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Teaching objects, topic memory, related clusters, and freshness in one view
          </p>
        </div>
        <div className="flex gap-1.5 text-[10px] font-bold uppercase">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
            Confidence {pct(freshness.effectiveConfidence)}
          </span>
          <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-1 text-amber-700 dark:text-amber-300">
            Decay {pct(freshness.confidenceDecay)}
          </span>
          {freshness.volatility && (
            <span className="rounded-full bg-blue-100 dark:bg-blue-950/40 px-2 py-1 text-blue-700 dark:text-blue-300">
              {freshness.volatility}
            </span>
          )}
        </div>
      </div>

      {evidenceMap.alerts?.stale && evidenceMap.alerts.message && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200">
          {evidenceMap.alerts.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reusable objects</p>
          <div className="space-y-2">
            {teachingObjects.slice(0, 4).map((object) => (
              <div key={object.objectKey} className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{object.title || object.objectKey}</p>
                <p className="text-slate-400">{object.objectType} &middot; confidence {pct(object.confidence)}</p>
              </div>
            ))}
            {teachingObjects.length === 0 && <p className="text-xs text-slate-400">No stored paper teaching objects yet.</p>}
          </div>
        </div>

        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Grounded claims</p>
          <ul className="space-y-2">
            {groundedClaims.slice(0, 4).map((claim) => (
              <li key={claim.claimKey} className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{claim.claimText}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${CLAIM_BADGE[claim.verificationStatus || ''] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {claimBadgeLabel(claim.verificationStatus)}
                  </span>
                  <span className="text-slate-400">{claim.sourcePath || 'teaching object'} / confidence {pct(claim.confidence ?? undefined)}</span>
                </div>
              </li>
            ))}
            {groundedClaims.length === 0 && teachingPoints.slice(0, 4).map((point, index) => {
              const label = typeof point === 'string' ? point : (point as { claim?: string; point?: string; text?: string }).claim || (point as { point?: string }).point || (point as { text?: string }).text;
              return <li key={index} className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{label}</li>;
            })}
            {groundedClaims.length === 0 && teachingPoints.length === 0 && <li className="text-xs text-slate-400">No grounded claims yet.</li>}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Evidence anchors</p>
          <ul className="space-y-2">
            {liveEvidence.slice(0, 4).map((article) => (
              <li key={article.uid} className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{article.title}</p>
                <p className="text-slate-400">{article.year || 'year n/a'}{article.isFree ? ' / free full text' : ''}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Synapse topics</p>
          <div className="flex flex-wrap gap-1.5">
            {relatedTopics.slice(0, 8).map((topic) => (
              <button
                key={topic.normalizedTopic}
                type="button"
                onClick={() => onOpenTopic?.(topic.displayTopic)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
              >
                {topic.displayTopic}
              </button>
            ))}
            {relatedTopics.length === 0 && <p className="text-xs text-slate-400">No cross-topic links yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
