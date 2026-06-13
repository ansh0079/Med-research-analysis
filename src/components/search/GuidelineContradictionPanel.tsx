import React from 'react';
import { api } from '@services/api';
import type { GuidelineContradiction } from '@types';

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; icon: string; label: string }> = {
  major: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/[0.07]',
    text: 'text-red-700 dark:text-red-400',
    icon: 'fa-exclamation-circle text-red-500',
    label: 'Major conflict',
  },
  minor: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/[0.07]',
    text: 'text-amber-700 dark:text-amber-400',
    icon: 'fa-exclamation-triangle text-amber-500',
    label: 'Minor divergence',
  },
  nuanced: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/[0.07]',
    text: 'text-blue-700 dark:text-blue-400',
    icon: 'fa-info-circle text-blue-500',
    label: 'Nuanced difference',
  },
};

const SOURCE_COLORS: Record<string, string> = {
  NICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  WHO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  ESC: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  ERS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  EULAR: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ESMO: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  IDSA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ADA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'AHA/ACC': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ACR: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  GOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  AGA: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  NCCN: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  ESICM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function sourceBadge(source: string) {
  return SOURCE_COLORS[source] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

interface Props {
  query: string;
}

export const GuidelineContradictionPanel: React.FC<Props> = ({ query }) => {
  const [contradictions, setContradictions] = React.useState<GuidelineContradiction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!query || query.length < 3) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getGuidelineContradictions(query);
        if (!cancelled) setContradictions(res.contradictions);
      } catch {
        if (!cancelled) setContradictions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  if (loading || contradictions.length === 0) return null;

  const visible = expanded ? contradictions : contradictions.slice(0, 2);
  const hasMore = contradictions.length > 2;
  const majorCount = contradictions.filter(c => c.severity === 'major').length;
  const minorCount = contradictions.filter(c => c.severity === 'minor').length;
  const nuancedCount = contradictions.filter(c => c.severity === 'nuanced').length;

  return (
    <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <i className="fas fa-code-branch text-orange-500 text-xs" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-300">
            Guideline disagreements
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-[10px] font-bold uppercase tracking-wider">
          {majorCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
              {majorCount} major
            </span>
          )}
          {minorCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-200">
              {minorCount} minor
            </span>
          )}
          {nuancedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-200">
              {nuancedCount} nuanced
            </span>
          )}
        </div>
      </div>

      {visible.map((c) => {
        const style = SEVERITY_STYLES[c.severity] || SEVERITY_STYLES.nuanced;
        const yearA = c.guidelineA.sourceYear;
        const yearB = c.guidelineB.sourceYear;
        const moreRecent = yearA && yearB && yearA !== yearB
          ? (yearA > yearB ? 'A' : 'B')
          : null;

        return (
          <div key={c.id} className={`rounded-xl border-2 p-3.5 ${style.border} bg-white/60 dark:bg-slate-900/40`}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <i className={`fas ${style.icon} text-[10px]`} />
              <span className={`text-[11px] font-bold ${style.text}`}>{style.label}</span>
            </div>

            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
              {c.contradictionSummary}
            </p>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceBadge(c.guidelineA.sourceBody)}`}>
                    {c.guidelineA.sourceBody}
                  </span>
                  {yearA && <span className="text-[10px] text-slate-500">{yearA}</span>}
                  {c.guidelineA.recommendationStrength && (
                    <span className="text-[10px] text-slate-400">{c.guidelineA.recommendationStrength}</span>
                  )}
                  {moreRecent === 'A' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      More recent
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c.bodyAPosition}</p>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceBadge(c.guidelineB.sourceBody)}`}>
                    {c.guidelineB.sourceBody}
                  </span>
                  {yearB && <span className="text-[10px] text-slate-500">{yearB}</span>}
                  {c.guidelineB.recommendationStrength && (
                    <span className="text-[10px] text-slate-400">{c.guidelineB.recommendationStrength}</span>
                  )}
                  {moreRecent === 'B' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      More recent
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c.bodyBPosition}</p>
              </div>
            </div>

            {c.clinicalImplication && (
              <div className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg px-3 py-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Clinical implication:</span>{' '}
                {c.clinicalImplication}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full text-center text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
        >
          {expanded ? (
            <><i className="fas fa-chevron-up mr-1" /> Show fewer</>
          ) : (
            <><i className="fas fa-chevron-down mr-1" /> Show {contradictions.length - 2} more</>
          )}
        </button>
      )}

      <div className="text-[9px] text-slate-400 dark:text-slate-500 italic">
        <i className="fas fa-robot mr-1" />
        AI-detected disagreements — verify against original guideline documents before clinical application.
      </div>
    </div>
  );
};
