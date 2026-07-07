import React, { useState, useEffect } from 'react';
import { api } from '@services/api';
import type { SynapseGraphPayload } from '@types';

interface Props {
  query: string;
  onOpenTopic: (topic: string) => void;
}

export const TopicBriefSynapseGraph: React.FC<Props> = ({ query, onOpenTopic }) => {
  const [open, setOpen] = useState(false);
  const [graph, setGraph] = useState<SynapseGraphPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setGraph(null);
    setErr(null);
    setOpen(false);
  }, [query]);

  const load = async () => {
    if (graph || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const g = await api.knowledge.getSynapseGraph(query);
      setGraph(g);
    } catch {
      setErr('Could not load graph.');
    } finally {
      setLoading(false);
    }
  };

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const center = graph?.nodes.find((n) => n.kind === 'center');
  const neighbors = graph?.nodes.filter((n) => n.kind !== 'center') ?? [];
  const twoPi = Math.PI * 2;
  const positions = neighbors.map((n, i) => {
    const angle = twoPi * (i / Math.max(neighbors.length, 1)) - Math.PI / 2;
    const r = 72;
    return { node: n, x: 100 + r * Math.cos(angle), y: 100 + r * Math.sin(angle) };
  });

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/40 dark:bg-slate-950/20">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 flex items-center gap-2">
          <i className="fas fa-circle-nodes text-[10px]" />
          Topic knowledge graph
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[10px] text-slate-400`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-[11px] text-slate-500">Loading shared-trial bridges…</p>}
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          {graph && !graph.topicKnowledgeFound && (
            <p className="text-[11px] text-slate-500">No stored topic memory yet — run a search with mentor extraction first.</p>
          )}
          {graph && graph.topicKnowledgeFound && neighbors.length === 0 && (
            <p className="text-[11px] text-slate-500">No cross-topic bridges detected from stored seminal papers yet.</p>
          )}
          {graph && graph.topicKnowledgeFound && neighbors.length > 0 && center && (
            <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-violet-100 dark:border-violet-900/30 p-3 overflow-x-auto">
              <p className="text-[10px] text-slate-500 mb-2">
                Nodes are clinical topics linked because the same landmark papers appear in multiple topic memory maps.
              </p>
              <svg viewBox="0 0 200 200" className="w-full max-w-md mx-auto h-48">
                {positions.map(({ node, x, y }) => (
                  <line key={`${node.id}-line`} x1={100} y1={100} x2={x} y2={y} stroke="currentColor" className="text-violet-200 dark:text-violet-800" strokeWidth={1} />
                ))}
                <circle cx={100} cy={100} r={10} className="fill-violet-600" />
                <text x={100} y={104} textAnchor="middle" className="fill-white text-[8px] font-bold">
                  {(center.label || '•').slice(0, 1)}
                </text>
                {positions.map(({ node, x, y }) => (
                  <g key={node.id}>
                    <circle cx={x} cy={y} r={9} className="fill-indigo-500/90 cursor-pointer" onClick={() => onOpenTopic(node.label)} />
                    <text x={x} y={y + 3} textAnchor="middle" className="fill-white text-[7px] font-semibold pointer-events-none">
                      {(node.label || '').slice(0, 2)}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {neighbors.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenTopic(n.label)}
                    className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-900/60"
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
