import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import api from '@services/api';
import { Button } from '@components/ui/Button';
import type { Article, CitationRelation } from '@types';

interface CitationExplorerProps {
  article: Article;
  onClose: () => void;
}

type Tab = 'graph' | 'citations' | 'references';

interface GraphNode {
  id: string;
  article: Article;
  kind: 'target' | 'citation' | 'reference';
  x: number;
  y: number;
}

const landmarkThreshold = 500;

const citationSize = (count = 0, kind: GraphNode['kind']) => {
  if (kind === 'target') return 22;
  return Math.max(8, Math.min(20, 8 + Math.log10(count + 1) * 5));
};

const yearColor = (year?: number) => {
  if (!year) return '#94a3b8';
  if (year >= 2022) return '#10b981';
  if (year >= 2017) return '#3b82f6';
  if (year >= 2010) return '#8b5cf6';
  return '#64748b';
};

const paperUrl = (article: Article) =>
  article.doi
    ? `https://doi.org/${article.doi}`
    : article.fullTextUrl || `https://www.semanticscholar.org/paper/${article.uid}`;

const LazyCitationD3Graph = lazy(() =>
  import('./CitationD3Graph').then((mod) => ({ default: mod.CitationD3Graph }))
);

export const CitationExplorer: React.FC<CitationExplorerProps> = ({ article, onClose }) => {
  const [tab, setTab] = useState<Tab>('graph');
  const [citations, setCitations] = useState<Article[]>([]);
  const [references, setReferences] = useState<Article[]>([]);
  const [relations, setRelations] = useState<CitationRelation[]>([]);
  const [selectedId, setSelectedId] = useState(article.uid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const semanticId = article._source === 'semantic'
    ? article.uid
    : article.doi
      ? `DOI:${article.doi}`
      : null;

  useEffect(() => {
    if (!semanticId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getCitations(semanticId, { limit: 250 });
        if (!cancelled) {
          setCitations(data.citations);
          setReferences(data.references);
          setRelations(data.relations ?? []);
        }
      } catch {
        if (!cancelled) setError('Could not load citation data. This article may not be indexed by Semantic Scholar.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [semanticId]);

  const graph = useMemo(() => {
    const width = 720;
    const height = 420;
    const useLargeGraph = citations.length + references.length + 1 > 200;
    const center: GraphNode = {
      id: article.uid,
      article,
      kind: 'target',
      x: width / 2,
      y: height / 2,
    };

    const graphReferences = useLargeGraph ? references : references.slice(0, 18);
    const graphCitations = useLargeGraph ? citations : citations.slice(0, 18);

    const refs = graphReferences.map((ref, index, arr): GraphNode => ({
      id: ref.uid,
      article: ref,
      kind: 'reference',
      x: 110,
      y: 50 + (index * (height - 100)) / Math.max(1, arr.length - 1),
    }));

    const cits = graphCitations.map((citation, index, arr): GraphNode => ({
      id: citation.uid,
      article: citation,
      kind: 'citation',
      x: width - 110,
      y: 50 + (index * (height - 100)) / Math.max(1, arr.length - 1),
    }));

    return { width, height, nodes: [center, ...refs, ...cits] };
  }, [article, citations, references]);

  const selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];
  const selectedRelations = relations.filter((relation) => relation.source === selectedId || relation.target === selectedId);
  const landmarkPapers = [...citations, ...references].filter((paper) => (paper.citationCount ?? 0) >= landmarkThreshold);
  const list = tab === 'citations' ? citations : references;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-slate-700 gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Citation Graph</h3>
          <p className="text-xs text-gray-400 truncate mt-0.5" title={article.title}>
            {article.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close citation explorer"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 shrink-0"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="flex border-b border-gray-100 dark:border-slate-700">
        {([
          { key: 'graph', label: 'Graph', icon: 'fa-project-diagram' },
          { key: 'citations', label: `Cited By (${citations.length})`, icon: 'fa-arrow-up' },
          { key: 'references', label: `References (${references.length})`, icon: 'fa-arrow-down' },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === key
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <i className={`fas ${icon} mr-1.5`} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!semanticId ? (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-unlink text-2xl mb-2 block" />
            <p className="text-sm">
              Citation data requires a DOI or Semantic Scholar source. Try searching this article via Semantic Scholar.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <i className="fas fa-exclamation-circle text-2xl text-amber-400 mb-2 block" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => {
              if (!semanticId) return;
              let cancelled = false;
              (async () => {
                try {
                  setLoading(true);
                  setError('');
                  const data = await api.getCitations(semanticId, { limit: 250 });
                  if (!cancelled) {
                    setCitations(data.citations);
                    setReferences(data.references);
                    setRelations(data.relations ?? []);
                  }
                } catch {
                  if (!cancelled) setError('Could not load citation data. This article may not be indexed by Semantic Scholar.');
                } finally {
                  if (!cancelled) setLoading(false);
                }
              })();
              return () => { cancelled = true; };
            }} className="mt-3">
              Retry
            </Button>
          </div>
        ) : tab === 'graph' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="References" value={references.length} />
              <Metric label="Citing papers" value={citations.length} />
              <Metric label="Landmarks" value={landmarkPapers.length} tone={landmarkPapers.length ? 'text-amber-500' : undefined} />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 overflow-hidden">
              {graph.nodes.length > 200 ? (
                <Suspense fallback={<div className="flex h-[360px] items-center justify-center text-sm text-slate-400">Loading large graph...</div>}>
                  <LazyCitationD3Graph
                    article={article}
                    citations={citations}
                    references={references}
                    relations={relations}
                    onSelect={setSelectedId}
                  />
                </Suspense>
              ) : (
              <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="h-[360px] w-full bg-white dark:bg-slate-900" role="img" aria-label="Citation network graph">
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L7,3 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {graph.nodes.filter((node) => node.kind === 'reference').map((node) => (
                  <line key={`ref-${node.id}`} x1={node.x} y1={node.y} x2={graph.width / 2 - 24} y2={graph.height / 2}
                    stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
                ))}
                {graph.nodes.filter((node) => node.kind === 'citation').map((node) => (
                  <line key={`cit-${node.id}`} x1={node.x} y1={node.y} x2={graph.width / 2 + 24} y2={graph.height / 2}
                    stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
                ))}

                <text x="86" y="26" textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">References</text>
                <text x={graph.width - 86} y="26" textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">Cited by</text>

                {graph.nodes.map((node) => {
                  const radius = citationSize(node.article.citationCount, node.kind);
                  const isSelected = selectedId === node.id;
                  const isLandmark = (node.article.citationCount ?? 0) >= landmarkThreshold;
                  return (
                    <g key={node.id} role="button" tabIndex={0}
                      onClick={() => setSelectedId(node.id)}
                      onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(node.id); }}
                      className="cursor-pointer">
                      {isLandmark && (
                        <circle cx={node.x} cy={node.y} r={radius + 6} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={node.kind === 'target' ? '#4f46e5' : yearColor(node.article.year)}
                        stroke={isSelected ? '#111827' : '#ffffff'}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                      <text x={node.x} y={node.y + radius + 13} textAnchor="middle" className="fill-slate-500 text-[10px]">
                        {node.article.year || ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
              )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {selectedNode.kind === 'target' ? 'Selected paper' : selectedNode.kind}
                  </p>
                  <a href={paperUrl(selectedNode.article)} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-sm font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                    {selectedNode.article.title}
                  </a>
                </div>
                {(selectedNode.article.citationCount ?? 0) >= landmarkThreshold && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    Landmark
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                {selectedNode.article.year && <span>{selectedNode.article.year}</span>}
                {selectedNode.article.citationCount !== undefined && <span>{selectedNode.article.citationCount.toLocaleString()} citations</span>}
                {selectedNode.article.isFree && <span className="text-emerald-500">Open access</span>}
              </div>
              {selectedRelations.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Citation context</p>
                  {selectedRelations.slice(0, 3).map((relation, idx) => (
                    <div key={`${relation.source}-${relation.target}-${idx}`} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <div className="mb-1 flex flex-wrap gap-1">
                        {relation.isInfluential && <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">Influential citation</span>}
                        {relation.intents.map((intent) => (
                          <span key={intent} className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-500 dark:bg-slate-800">{intent}</span>
                        ))}
                      </div>
                      {relation.contexts.length > 0 ? (
                        <p className="leading-relaxed">"{relation.contexts[0]}"</p>
                      ) : (
                        <p className="leading-relaxed text-slate-400">No sentence-level citation context returned for this edge.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-8">
            No {tab} found for this article.
          </p>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <a
                key={a.uid}
                href={paperUrl(a)}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                    {a.title}
                  </p>
                  {(a.citationCount ?? 0) >= landmarkThreshold && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      Landmark
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                  {a.authors?.[0] && <span>{a.authors[0].name}{(a.authors.length ?? 0) > 1 ? ' et al.' : ''}</span>}
                  {a.year && <span>{a.year}</span>}
                  {a.citationCount !== undefined && <span><i className="fas fa-quote-right mr-1" />{a.citationCount.toLocaleString()}</span>}
                  {a.isFree && <span className="text-emerald-500"><i className="fas fa-unlock mr-1" />Open</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function Metric({ label, value, tone = 'text-slate-900 dark:text-white' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
      <p className={`font-mono text-lg font-black ${tone}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
