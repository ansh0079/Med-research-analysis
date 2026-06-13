import React from 'react';
import { api } from '@services/api';
import type { GuidelineAlignment, GuidelineEntry, Article } from '@types';
import { GuidelineContradictionPanel } from './GuidelineContradictionPanel';

interface Props {
  query: string;
  articles: Article[];
  autoRunAlignment?: boolean;
}

function sourceBadge(source: string) {
  const colors: Record<string, string> = {
    NICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    WHO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    ESC: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    ERS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    BTS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    ESICM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    EULAR: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    ESMO: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    IDSA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    ADA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'AHA/ACC': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    GOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    GINA: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  };
  return colors[source] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ai_extracted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    human_reviewed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    stale: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    superseded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return map[status] || map.ai_extracted;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ai_extracted: 'AI extracted - verify locally',
    human_reviewed: 'Human reviewed',
    stale: 'Stale - recheck source',
    superseded: 'Superseded',
  };
  return labels[status] || 'AI extracted - verify locally';
}

function qualityBadge(level?: string) {
  const map: Record<string, string> = {
    high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return map[level || ''] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export const GuidelineSnapshot: React.FC<Props> = ({ query, articles, autoRunAlignment = false }) => {
  const [guidelines, setGuidelines] = React.useState<GuidelineEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [error, setError] = React.useState('');
  const [alignment, setAlignment] = React.useState<GuidelineAlignment | null>(null);
  const [alignmentLoading, setAlignmentLoading] = React.useState(false);
  const [alignmentError, setAlignmentError] = React.useState('');

  const hasGuidelineArticles = React.useMemo(
    () => articles.some((a) => a.pubtype?.some((p) => /guideline|consensus|statement/i.test(p))),
    [articles]
  );
  const evidenceForAlignment = React.useMemo(() => articles.slice(0, 8), [articles]);

  React.useEffect(() => {
    if (!query || query.length < 3) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.getGuidelinesForTopic(query);
        if (!cancelled) setGuidelines(res.guidelines);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load guidelines');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  const runAlignment = React.useCallback(async () => {
    if (!query || evidenceForAlignment.length === 0) return;
    setAlignmentLoading(true);
    setAlignmentError('');
    setAlignment(null);
    try {
      const consensus = [
        `Clinical question/topic: ${query}`,
        'Top evidence from the current search:',
        ...evidenceForAlignment.slice(0, 5).map((article, index) => {
          const study = [article.title, article.abstract].filter(Boolean).join(' - ');
          return `${index + 1}. ${study.slice(0, 900)}`;
        }),
      ].join('\n');
      const data = await api.checkGuidelineAlignment(query, consensus, evidenceForAlignment);
      setAlignment(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Guideline comparison failed';
      setAlignmentError(msg === 'AUTH_REQUIRED' ? 'Sign in to compare top evidence with guidelines.' : msg);
    } finally {
      setAlignmentLoading(false);
    }
  }, [evidenceForAlignment, query]);

  React.useEffect(() => {
    if (autoRunAlignment && evidenceForAlignment.length > 0 && !alignment && !alignmentLoading) {
      // One-time auto-run triggered by external prop; gated by dependency checks above.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runAlignment();
    }
  }, [alignment, alignmentLoading, autoRunAlignment, evidenceForAlignment.length, runAlignment]);

  if (!query || query.length < 3) return null;
  if (!loading && articles.length === 0 && guidelines.length === 0 && !hasGuidelineArticles && !error) return null;

  const visible = expanded ? guidelines : guidelines.slice(0, 2);
  const hasMore = guidelines.length > 2;

  return (
    <div id="workflow-guideline" className="neo-card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <i className="fas fa-book-medical text-white text-xs" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Guideline Snapshot</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {guidelines.length > 0
                ? `${guidelines.length} guideline${guidelines.length > 1 ? 's' : ''} found`
                : hasGuidelineArticles
                  ? 'Guideline-derived results in search'
                  : 'No stored guidelines for this topic'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {guidelines.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              Guideline-derived
            </span>
          )}
          {articles.length > 0 && (
            <button
              type="button"
              onClick={() => void runAlignment()}
              disabled={alignmentLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {alignmentLoading ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <i className="fas fa-scale-balanced text-[10px]" />}
              Compare top evidence
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-3 space-y-3">
        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Human reviewed — clinician verified
          </span>
          <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> AI extracted — verify before use
          </span>
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Stale — last checked &gt; 12 months ago
          </span>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <div className="w-3.5 h-3.5 border-2 border-slate-200 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
            Loading guidelines…
          </div>
        )}

        {error && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-triangle mr-1.5" /> {error}
          </div>
        )}

        {alignmentError && (
          <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
            <i className="fas fa-circle-exclamation mr-1.5" /> {alignmentError}
          </div>
        )}

        {alignment && (
          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">Guideline comparison</span>
              <span className="ml-auto text-xs font-black text-slate-800 dark:text-slate-100">{alignment.alignmentScore}% aligned</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{alignment.guidelinesFound} guideline{alignment.guidelinesFound === 1 ? '' : 's'}</span>
            </div>
            {alignment.summary && (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{alignment.summary}</p>
            )}
            {alignment.contradictions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                  {alignment.contradictions.length} contradiction{alignment.contradictions.length === 1 ? '' : 's'}
                </p>
                {alignment.contradictions.slice(0, 3).map((item, index) => (
                  <div key={`${item.guideline}-${index}`} className={`p-3 rounded-xl border text-xs ${
                    item.severity === 'major'
                      ? 'bg-red-500/[0.07] border-red-500/20 text-red-700 dark:text-red-400'
                      : item.severity === 'nuanced'
                        ? 'bg-blue-500/[0.07] border-blue-500/20 text-blue-700 dark:text-blue-400'
                        : 'bg-amber-500/[0.07] border-amber-500/20 text-amber-700 dark:text-amber-400'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <i className={`fas ${
                        item.severity === 'major' ? 'fa-exclamation-circle text-red-500'
                          : item.severity === 'nuanced' ? 'fa-info-circle text-blue-500'
                            : 'fa-exclamation-triangle text-amber-500'
                      } text-[10px]`} />
                      <span className="font-bold">
                        {item.severity === 'major' ? 'Major conflict' : item.severity === 'nuanced' ? 'Nuanced' : 'Minor divergence'} with {item.guideline}
                      </span>
                    </div>
                    <p className="leading-relaxed">{item.explanation}</p>
                  </div>
                ))}
              </div>
            )}
            {alignment.gaps.length > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                <span className="font-bold">Gap:</span> {alignment.gaps[0]}
              </p>
            )}
          </div>
        )}

        <GuidelineContradictionPanel query={query} />

        {visible.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40 p-3.5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceBadge(g.sourceBody)}`}>
                  {g.sourceBody}
                </span>
                {g.sourceRegion && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {g.sourceRegion}
                  </span>
                )}
                {g.sourceYear && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {g.sourceYear}
                  </span>
                )}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge(g.status)}`}>
                  {statusLabel(g.status)}
                </span>
                {g.qualityAssessment && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${qualityBadge(g.qualityAssessment.level)}`}
                    title={g.qualityAssessment.summary}
                  >
                    Trust {g.qualityAssessment.score}
                  </span>
                )}
              </div>
              {g.sourceUrl && (
                <a
                  href={g.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline shrink-0"
                  title="Open guideline source"
                >
                  <i className="fas fa-external-link-alt mr-0.5" /> Source
                </a>
              )}
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
              {g.recommendationText}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
              {g.recommendationStrength && (
                <span>
                  <span className="font-semibold">Strength:</span> {g.recommendationStrength}
                </span>
              )}
              {g.recommendationCertainty && (
                <span>
                  <span className="font-semibold">Certainty:</span> {g.recommendationCertainty}
                </span>
              )}
              {g.population && (
                <span>
                  <span className="font-semibold">Population:</span> {g.population}
                </span>
              )}
              {g.intervention && (
                <span>
                  <span className="font-semibold">Intervention:</span> {g.intervention}
                </span>
              )}
            </div>

            {g.cautions && (
              <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                <i className="fas fa-exclamation-circle mr-1" />
                {g.cautions}
              </div>
            )}

            {g.qualityAssessment?.flags.length ? (
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Trust checks:</span>{' '}
                {g.qualityAssessment.flags.slice(0, 3).map((flag) => flag.replace(/_/g, ' ')).join(', ')}
              </div>
            ) : null}

            <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
              Last checked: {new Date(g.lastCheckedAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {!loading && guidelines.length === 0 && !error && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            <p className="font-bold text-slate-800 dark:text-slate-100">No stored guideline found for this topic.</p>
            <p className="mt-1 leading-relaxed">
              Use the evidence comparison as a prompt, then verify local policy, national guidance, and formulary advice before applying it clinically.
            </p>
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            {expanded ? (
              <>
                <i className="fas fa-chevron-up mr-1" /> Show fewer
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down mr-1" /> Show {guidelines.length - 2} more
              </>
            )}
          </button>
        )}

        {/* Local policy disclaimer */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
          <i className="fas fa-info-circle mr-1 text-slate-400" />
          Guidelines reflect the source body's recommendations. Always verify against your local hospital policy and national formulary.
        </div>
      </div>
    </div>
  );
};
