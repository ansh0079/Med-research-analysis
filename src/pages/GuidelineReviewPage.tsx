import React from 'react';
import { api } from '@services/api';
import { useNavigatePage } from '@contexts/SearchContext';
import type { GuidelineEntry } from '@types';

type StatusFilter = '' | 'ai_extracted' | 'human_reviewed' | 'stale' | 'superseded';

function statusLabel(status: string) {
  const map: Record<string, { label: string; bg: string }> = {
    ai_extracted: { label: 'AI Extracted', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
    human_reviewed: { label: 'Human Reviewed', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    stale: { label: 'Stale', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    superseded: { label: 'Superseded', bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };
  return map[status] || { label: status, bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
}

export const GuidelineReviewPage: React.FC = () => {
  const setCurrentPage = useNavigatePage();
  const [guidelines, setGuidelines] = React.useState<GuidelineEntry[]>([]);
  const [selected, setSelected] = React.useState<GuidelineEntry | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('');
  const [sourceFilter, setSourceFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  // Editor state
  const [recommendationText, setRecommendationText] = React.useState('');
  const [sourceBody, setSourceBody] = React.useState('');
  const [sourceRegion, setSourceRegion] = React.useState('');
  const [sourceYear, setSourceYear] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [recommendationStrength, setRecommendationStrength] = React.useState('');
  const [recommendationCertainty, setRecommendationCertainty] = React.useState('');
  const [population, setPopulation] = React.useState('');
  const [intervention, setIntervention] = React.useState('');
  const [cautions, setCautions] = React.useState('');

  const [prevSelected, setPrevSelected] = React.useState<GuidelineEntry | null>(null);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    if (selected) {
      setRecommendationText(selected.recommendationText || '');
      setSourceBody(selected.sourceBody || '');
      setSourceRegion(selected.sourceRegion || '');
      setSourceYear(selected.sourceYear ? String(selected.sourceYear) : '');
      setSourceUrl(selected.sourceUrl || '');
      setRecommendationStrength(selected.recommendationStrength || '');
      setRecommendationCertainty(selected.recommendationCertainty || '');
      setPopulation(selected.population || '');
      setIntervention(selected.intervention || '');
      setCautions(selected.cautions || '');
      setNotice('');
      setError('');
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.collaboration.listGuidelines({ query, status: statusFilter, sourceBody: sourceFilter, limit: 100 });
        if (cancelled) return;
        setGuidelines(data.guidelines);
        setSelected((current) => {
          if (!current) return data.guidelines[0] ?? null;
          return data.guidelines.find((g) => g.id === current.id) ?? data.guidelines[0] ?? null;
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load guidelines');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query, statusFilter, sourceFilter]);

  const reloadGuidelines = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.collaboration.listGuidelines({ query, status: statusFilter, sourceBody: sourceFilter, limit: 100 });
      setGuidelines(data.guidelines);
      setSelected((current) => {
        if (!current) return data.guidelines[0] ?? null;
        return data.guidelines.find((g) => g.id === current.id) ?? data.guidelines[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guidelines');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await api.collaboration.updateGuideline(selected.id, {
        recommendationText: recommendationText.trim(),
        sourceBody: sourceBody.trim(),
        sourceRegion: sourceRegion.trim() || undefined,
        sourceYear: sourceYear ? parseInt(sourceYear, 10) : undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        recommendationStrength: recommendationStrength.trim() || undefined,
        recommendationCertainty: recommendationCertainty.trim() || undefined,
        population: population.trim() || undefined,
        intervention: intervention.trim() || undefined,
        cautions: cautions.trim() || undefined,
      });
      setNotice('Guideline saved');
      await reloadGuidelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.collaboration.reviewGuideline(selected.id);
      setNotice('Marked as reviewed');
      await reloadGuidelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  const markStale = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.collaboration.staleGuideline(selected.id);
      setNotice('Marked as stale');
      await reloadGuidelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mark stale failed');
    } finally {
      setSaving(false);
    }
  };

  const reviewedCount = guidelines.filter((g) => g.status === 'human_reviewed').length;
  const staleCount = guidelines.filter((g) => g.status === 'stale').length;

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <div className="border-b border-slate-100 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
        <header className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-400/20">
                <i className="fas fa-book-medical text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Guideline Curator</h1>
                <p className="text-sm text-slate-400">Review, edit, and approve clinical guideline extractions.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{guidelines.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Guidelines</p>
              </div>
              <div className="neo-card px-4 py-2 text-center">
                <p className="font-mono text-lg font-black text-emerald-600">{reviewedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviewed</p>
              </div>
              {staleCount > 0 && (
                <div className="neo-card px-4 py-2 text-center">
                  <p className="font-mono text-lg font-black text-amber-500">{staleCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stale</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentPage('knowledge')}
                className="neo-card px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <i className="fas fa-arrow-left mr-1" /> Knowledge
              </button>
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto grid gap-4 px-4 py-6 lg:grid-cols-[20rem_1fr]">
        {/* Sidebar */}
        <aside className="neo-card overflow-hidden self-start">
          <div className="border-b border-slate-100 p-3 dark:border-slate-800 space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guidelines…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="ai_extracted">AI Extracted</option>
              <option value="human_reviewed">Human Reviewed</option>
              <option value="stale">Stale</option>
              <option value="superseded">Superseded</option>
            </select>
            <select
              aria-label="Filter by source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">All sources</option>
              <option value="NICE">NICE</option>
              <option value="WHO">WHO</option>
              <option value="ESC">ESC</option>
              <option value="ERS">ERS</option>
              <option value="BTS">BTS</option>
              <option value="ESICM">ESICM</option>
              <option value="EULAR">EULAR</option>
              <option value="ESMO">ESMO</option>
              <option value="IDSA">IDSA</option>
              <option value="ADA">ADA</option>
              <option value="AHA/ACC">AHA/ACC</option>
              <option value="GOLD">GOLD</option>
              <option value="GINA">GINA</option>
            </select>
          </div>
          <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
            {loading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
            {!loading && guidelines.length === 0 && (
              <p className="p-4 text-sm text-slate-400">No guidelines found.</p>
            )}
            {guidelines.map((g) => {
              const s = statusLabel(g.status);
              const isActive = selected?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(g)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className={`truncate text-sm font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {g.topic}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.bg}`}>
                      {s.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{g.sourceBody}</span>
                    {g.sourceYear && <span className="text-[10px] text-slate-400">{g.sourceYear}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Detail Panel */}
        <section className="neo-card overflow-hidden flex flex-col min-h-[60vh]">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              <p className="text-sm">Select a guideline from the sidebar to review or edit.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{selected.topic}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusLabel(selected.status).bg}`}>
                        {statusLabel(selected.status).label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selected.sourceBody} {selected.sourceRegion && `(${selected.sourceRegion})`} {selected.sourceYear}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={markReviewed}
                      disabled={saving}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      <i className="fas fa-check mr-1" /> Review
                    </button>
                    <button
                      type="button"
                      onClick={markStale}
                      disabled={saving}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                      <i className="fas fa-clock mr-1" /> Stale
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                {notice && (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <i className="fas fa-check-circle mr-1" /> {notice}
                  </div>
                )}
                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    <i className="fas fa-exclamation-circle mr-1" /> {error}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Recommendation</label>
                  <textarea
                    value={recommendationText}
                    onChange={(e) => setRecommendationText(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Source Body</label>
                    <input
                      value={sourceBody}
                      onChange={(e) => setSourceBody(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Source URL</label>
                    <input
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Region</label>
                    <input
                      value={sourceRegion}
                      onChange={(e) => setSourceRegion(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Year</label>
                    <input
                      value={sourceYear}
                      onChange={(e) => setSourceYear(e.target.value)}
                      type="number"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Strength</label>
                    <input
                      value={recommendationStrength}
                      onChange={(e) => setRecommendationStrength(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Certainty</label>
                    <input
                      value={recommendationCertainty}
                      onChange={(e) => setRecommendationCertainty(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Population</label>
                  <input
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Intervention</label>
                  <input
                    value={intervention}
                    onChange={(e) => setIntervention(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Cautions</label>
                  <textarea
                    value={cautions}
                    onChange={(e) => setCautions(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>

                {selected.reviewedAt && (
                  <p className="text-[10px] text-slate-400">
                    Reviewed {new Date(selected.reviewedAt).toLocaleDateString()}
                    {selected.reviewedBy && ` by ${selected.reviewedBy}`}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  Last checked: {new Date(selected.lastCheckedAt).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
