import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { Article, CitationRelation } from '@types';

interface CitationD3GraphProps {
  article: Article;
  citations: Article[];
  references: Article[];
  relations: CitationRelation[];
  onSelect: (id: string) => void;
}

type D3Node = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  kind: 'target' | 'citation' | 'reference';
  citationCount?: number;
};

type D3Link = d3.SimulationLinkDatum<D3Node> & {
  source: string | D3Node;
  target: string | D3Node;
};

const MAX_RENDERABLE_NODES = 200;

export const CitationD3Graph: React.FC<CitationD3GraphProps> = ({
  article,
  citations,
  references,
  relations,
  onSelect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const totalNodes = 1 + citations.length + references.length;
  if (totalNodes > MAX_RENDERABLE_NODES) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-[360px] text-slate-500 dark:text-slate-400 text-sm text-center px-8">
        <i className="fas fa-project-diagram text-2xl opacity-40" aria-hidden="true" />
        <p>
          This citation network has <strong>{totalNodes}</strong> nodes — too large to render interactively.
        </p>
        <p className="text-xs opacity-70">Showing networks up to {MAX_RENDERABLE_NODES} nodes. Filter by date or narrow your search to reduce the graph.</p>
      </div>
    );
  }
  const graph = useMemo(() => {
    const target: D3Node = {
      id: article.uid,
      label: article.title || 'Selected paper',
      kind: 'target',
      citationCount: article.citationCount,
    };
    const nodes: D3Node[] = [
      target,
      ...references.map((paper) => ({
        id: paper.uid,
        label: paper.title || 'Reference',
        kind: 'reference' as const,
        citationCount: paper.citationCount,
      })),
      ...citations.map((paper) => ({
        id: paper.uid,
        label: paper.title || 'Citation',
        kind: 'citation' as const,
        citationCount: paper.citationCount,
      })),
    ];
    const fallbackLinks: D3Link[] = [
      ...references.map((paper) => ({ source: article.uid, target: paper.uid })),
      ...citations.map((paper) => ({ source: paper.uid, target: article.uid })),
    ];
    const links = relations.length > 0
      ? relations.map((relation) => ({ source: relation.source, target: relation.target }))
      : fallbackLinks;
    return { nodes, links };
  }, [article, citations, references, relations]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 720;
    const height = 420;
    const color = d3.scaleOrdinal<string>()
      .domain(['target', 'citation', 'reference'])
      .range(['#4f46e5', '#10b981', '#8b5cf6']);
    const radius = (node: D3Node) => node.kind === 'target'
      ? 18
      : Math.max(5, Math.min(14, 5 + Math.log10((node.citationCount || 0) + 1) * 3));

    const links = graph.links.map((link) => ({ ...link }));
    const nodes = graph.nodes.map((node) => ({ ...node }));

    const link = svg.append('g')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1);

    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', radius)
      .attr('fill', (d) => color(d.kind))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `Select ${d.kind}: ${d.label}`)
      .on('click', (_event, d) => onSelect(d.id))
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(d.id);
      });

    node.append('title').text((d) => d.label);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id((d) => d.id).distance(52).strength(0.45))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3Node>().radius((d) => radius(d) + 2))
      .on('tick', () => {
        link
          .attr('x1', (d) => (d.source as D3Node).x || 0)
          .attr('y1', (d) => (d.source as D3Node).y || 0)
          .attr('x2', (d) => (d.target as D3Node).x || 0)
          .attr('y2', (d) => (d.target as D3Node).y || 0);
        node
          .attr('cx', (d) => Math.max(16, Math.min(width - 16, d.x || 0)))
          .attr('cy', (d) => Math.max(16, Math.min(height - 16, d.y || 0)));
      });

    return () => {
      simulation.stop();
    };
  }, [graph, onSelect]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 720 420"
      className="h-[360px] w-full bg-white dark:bg-slate-900"
      role="img"
      aria-label="Large citation network graph"
    />
  );
};
