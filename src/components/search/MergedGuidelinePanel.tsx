import React from 'react';
import { api } from '@services/api';
import type { MergedGuidelineView } from '@types';

/**
 * Everything the guidelines say about a topic, grouped by clinical decision.
 *
 * The flat list left a clinician to merge five organisations' positions in
 * their head. Here each theme is one decision, and the bodies that address it
 * sit together so agreement and disagreement read at a glance.
 *
 * Every recommendation keeps its own body, year and graded strength: the
 * grouping is a reading aid, never a merged claim that no organisation made.
 */

const STRENGTH_STYLE: Record<string, string> = {
  strong: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  conditional: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  weak: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function strengthClass(strength: string | null) {
  const key = String(strength || '').toLowerCase();
  const match = Object.keys(STRENGTH_STYLE).find((k) => key.includes(k));
  return match ? STRENGTH_STYLE[match] : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

const AGREEMENT_CHIP: Record<string, { label: string; cls: string }> = {
  conflict: {
    label: 'Bodies differ',
    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  agree: {
    label: 'Bodies agree',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  single: {
    label: 'One body',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

/**
 * Themes shown before the reader asks for the rest. Enough to answer the
 * common question, few enough that a topic with a dozen themes does not add
 * ~1,900px to a page that was deliberately cut to fit on a few screens.
 */
const THEMES_BEFORE_FOLD = 4;

export const MergedGuidelinePanel: React.FC<{ topic: string }> = ({ topic }) => {
  const [view, setView] = React.useState<MergedGuidelineView | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!topic || topic.length < 3) return;
    let cancelled = false;
    setExpanded(false);
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.collaboration.getMergedGuidelines(topic);
        if (!cancelled) setView(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load merged guidelines');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topic]);

  if (loading) {
    return (
      <div className="px-5 py-3 text-[11px] text-slate-400 dark:text-slate-500">
        <i className="fas fa-circle-notch fa-spin mr-1.5" />
        Grouping guideline recommendations&hellip;
      </div>
    );
  }
  if (error || !view?.available || view.themes.length === 0) return null;

  const hiddenThemes = view.themes.length - THEMES_BEFORE_FOLD;
  const visibleThemes = expanded ? view.themes : view.themes.slice(0, THEMES_BEFORE_FOLD);
  const hiddenRecommendations = view.themes
    .slice(THEMES_BEFORE_FOLD)
    .reduce((sum, t) => sum + t.recommendations.length, 0);

  return (
    <section className="border-t border-slate-100 dark:border-slate-700/60">
      <div className="px-5 pt-4 pb-2">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white">All recommendations, by clinical decision</h4>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {view.recommendationCount} recommendation{view.recommendationCount === 1 ? '' : 's'} from{' '}
          {view.bodyCount} issuing bod{view.bodyCount === 1 ? 'y' : 'ies'}
          {view.latestYear ? ` · latest ${view.latestYear}` : ''}
          {view.grouped === false ? ' · grouping unavailable, listed as found' : ''}
        </p>
      </div>

      <div className="px-5 pb-4 space-y-3">
        {visibleThemes.map((theme, i) => {
          const chip = AGREEMENT_CHIP[theme.agreement] ?? AGREEMENT_CHIP.single;
          return (
            <div
              key={`${theme.label}-${i}`}
              className={`rounded-lg border px-3 py-2.5 ${
                theme.agreement === 'conflict'
                  ? 'border-orange-200 bg-orange-50/60 dark:border-orange-800/60 dark:bg-orange-950/20'
                  : 'border-slate-200 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{theme.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${chip.cls}`}>
                  {chip.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {theme.bodies.join(' · ')}
                </span>
              </div>

              {theme.conflictNote && (
                <p className="mt-1 text-[11px] font-medium leading-snug text-orange-800 dark:text-orange-200">
                  {theme.conflictNote}
                </p>
              )}

              <ul className="mt-2 space-y-1.5">
                {theme.recommendations.map((rec, j) => (
                  <li key={`${rec.id ?? j}`} className="text-xs leading-snug text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {rec.sourceBody || 'Unattributed'}{rec.sourceYear ? ` ${rec.sourceYear}` : ''}
                    </span>
                    {rec.recommendationStrength && (
                      <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${strengthClass(rec.recommendationStrength)}`}>
                        {rec.recommendationStrength}
                      </span>
                    )}
                    <span className="ml-1">— {rec.recommendationText}</span>
                    {rec.sourceUrl && (
                      <a
                        href={rec.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-indigo-600 underline dark:text-indigo-400"
                      >
                        source
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {hiddenThemes > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            {expanded
              ? 'Show fewer'
              : `Show ${hiddenThemes} more decision${hiddenThemes === 1 ? '' : 's'} (${hiddenRecommendations} recommendation${hiddenRecommendations === 1 ? '' : 's'})`}
          </button>
        )}

        <p className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
          Recommendations are shown verbatim and individually attributed. Grouping is a reading aid — check each
          source before acting.
        </p>
      </div>
    </section>
  );
};
