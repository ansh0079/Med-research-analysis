import React from 'react';
import type { StudyRun, StudyRunOutline, StudyRunOutlineNode } from '@types';

interface NodeCoverage {
  seen: boolean;
  quizAttempts: number;
  correct: number;
  lastAttemptAt: string | null;
}

function nodeAccuracy(cov: NodeCoverage): number {
  if (!cov.seen || cov.quizAttempts === 0) return -1;
  return Math.round((cov.correct / cov.quizAttempts) * 100);
}

function NodeStatusDot({ cov }: { cov: NodeCoverage | undefined }) {
  if (!cov || !cov.seen) {
    return <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-600 shrink-0 mt-1" />;
  }
  const acc = nodeAccuracy(cov);
  if (acc >= 70) return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1" />;
  if (acc >= 40) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1" />;
  return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1" />;
}

const KIND_CONFIG: Record<StudyRunOutlineNode['kind'], { icon: string; label: string; color: string }> = {
  teaching_point: { icon: 'fa-graduation-cap', label: 'Teaching points', color: 'text-indigo-500' },
  mcq_angle:      { icon: 'fa-question-circle', label: 'Board-style angles', color: 'text-violet-500' },
  source_article: { icon: 'fa-file-alt', label: 'Source articles', color: 'text-teal-500' },
};

function NodeGroup({
  kind,
  nodes,
  coverage,
}: {
  kind: StudyRunOutlineNode['kind'];
  nodes: StudyRunOutlineNode[];
  coverage: StudyRun['nodeCoverage'];
}) {
  const cfg = KIND_CONFIG[kind];
  if (nodes.length === 0) return null;
  const seen = nodes.filter((n) => coverage[n.id]?.seen).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <i className={`fas ${cfg.icon} text-[10px] ${cfg.color}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cfg.label}</span>
        <span className="text-[10px] text-slate-400 ml-auto">{seen}/{nodes.length}</span>
      </div>
      <div className="space-y-1">
        {nodes.map((node) => {
          const cov = coverage[node.id];
          const acc = cov ? nodeAccuracy(cov) : -1;
          return (
            <div key={node.id} className="flex items-start gap-2 py-1">
              <NodeStatusDot cov={cov} />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug flex-1">{node.label}</span>
              {cov?.seen && acc >= 0 && (
                <span className={`text-[10px] font-bold shrink-0 ${acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {acc}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  run: StudyRun;
  outline: StudyRunOutline;
  /** Called when user clicks "Continue quiz" */
  onContinue?: () => void;
  /** If true, show compact gap-report mode (for quiz completion screen) */
  gapReportMode?: boolean;
}

export const StudyRunPanel: React.FC<Props> = ({ run, outline, onContinue, gapReportMode = false }) => {
  const nodes = outline.nodes ?? [];
  const coverage = run.nodeCoverage ?? {};

  const total = nodes.length;
  const covered = nodes.filter((n) => coverage[n.id]?.seen).length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

  // Nodes not yet seen, prioritised by teaching points first
  const uncoveredNodes = nodes.filter((n) => !coverage[n.id]?.seen);
  const uncoveredTp = uncoveredNodes.filter((n) => n.kind === 'teaching_point');
  const uncoveredSrc = uncoveredNodes.filter((n) => n.kind === 'source_article');

  const byKind = (kind: StudyRunOutlineNode['kind']) => nodes.filter((n) => n.kind === kind);

  if (gapReportMode) {
    return (
      <div className="space-y-4">
        {/* Coverage ring summary */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-700" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${pct * 0.942} 94.2`}
                className={pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-red-400'}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-700 dark:text-slate-200">{pct}%</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {covered}/{total} outline nodes covered
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {uncoveredNodes.length > 0
                ? `${uncoveredNodes.length} node${uncoveredNodes.length === 1 ? '' : 's'} left to cover`
                : 'Full coverage — excellent!'}
            </p>
          </div>
        </div>

        {/* Uncovered teaching points */}
        {uncoveredTp.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              <i className="fas fa-graduation-cap text-indigo-400 mr-1" />
              Teaching points not yet tested
            </p>
            <div className="space-y-1">
              {uncoveredTp.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 mt-1.5" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{n.label}</span>
                </div>
              ))}
              {uncoveredTp.length > 5 && (
                <p className="text-[10px] text-slate-400 pl-3.5">+{uncoveredTp.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* Recommended papers */}
        {uncoveredSrc.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              <i className="fas fa-file-alt text-teal-500 mr-1" />
              Read these next
            </p>
            <div className="space-y-1">
              {uncoveredSrc.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start gap-2">
                  <i className="fas fa-book-open text-teal-400 text-[10px] shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onContinue && uncoveredNodes.length > 0 && (
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            <i className="fas fa-play mr-2" />
            Continue — drill uncovered nodes
          </button>
        )}
      </div>
    );
  }

  // Full outline view (used in dashboard)
  return (
    <div className="space-y-5">
      {/* Progress summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">{covered}/{total} nodes</span>
      </div>

      <div className="space-y-4">
        <NodeGroup kind="teaching_point" nodes={byKind('teaching_point')} coverage={coverage} />
        <NodeGroup kind="mcq_angle" nodes={byKind('mcq_angle')} coverage={coverage} />
        <NodeGroup kind="source_article" nodes={byKind('source_article')} coverage={coverage} />
      </div>

      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
        >
          <i className="fas fa-play mr-2" />
          {covered === 0 ? 'Start quiz' : 'Continue quiz'}
        </button>
      )}
    </div>
  );
};
