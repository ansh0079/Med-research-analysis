import React, { useState, useEffect } from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { useSearch } from '@hooks';
import { Button } from '@components/ui/Button';
import { useToast } from '@components/ui';
import api from '@services/api';
import type { SavedAlert, DataSource } from '@types';

type Tab = 'history' | 'saved-queries';

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

const safeJson = <T,>(val: string | null, fallback: T): T => {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
};

export const HistoryPage: React.FC = () => {
  const { setCurrentPage, filters } = useSearchContext();
  const { search } = useSearch();
  const [tab, setTab] = useState<Tab>('history');

  // History state
  interface HistoryItem {
    id?: number;
    query: string;
    results_count?: number;
    sources?: string;
    created_at?: string;
    timestamp?: string;
    filters?: string | null;
  }
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Saved queries state
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api.documents.getSearchHistory()
      .then((data) => setHistory(data.history))
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'History load failed', 'error');
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'saved-queries') return;
    let cancelled = false;
    (async () => {
      try {
        setAlertsLoading(true);
        setAlertsError('');
        const data = await api.review.getAlerts();
        if (!cancelled) setAlerts(data.alerts);
      } catch {
        if (!cancelled) setAlertsError('Failed to load saved queries.');
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const handleReRun = async (query: string, savedFilters: Record<string, unknown>) => {
    setCurrentPage('search');
    await search(query, { ...filters, ...savedFilters });
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    setCreating(true);
    try {
      const result = await api.review.createAlert(newQuery.trim(), filters.sources ?? ['pubmed'], newFrequency);
      setAlerts((prev) => [result.alert, ...prev]);
      setNewQuery('');
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : 'Failed to save query.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await api.review.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setAlertsError('Failed to delete query.');
    }
  };

  const handleRunAlert = async (alert: SavedAlert) => {
    let sources: string[];
    try { sources = JSON.parse(alert.sources); } catch { sources = ['pubmed']; }
    setCurrentPage('search');
    await search(alert.query, { ...filters, sources: sources as DataSource[] });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
      <header className="max-w-7xl mx-auto px-4 pt-10 pb-8">
        <button
          type="button"
          onClick={() => setCurrentPage('search')}
          className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-indigo-600 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-arrow-left" /> Back to Search
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fas fa-history text-white text-xl" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Search History</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1 w-fit gap-1">
          {([
            { key: 'history', label: 'History', icon: 'fa-history' },
            { key: 'saved-queries', label: 'Saved Queries', icon: 'fa-bell' },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                tab === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <i className={`fas ${icon}`} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4">
        {/* ── History tab ─────────────────────────────── */}
        {tab === 'history' && (
          historyLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : history.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Search history with queries, result counts, sources, dates, and actions</caption>
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Query</th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Results</th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Sources</th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <th scope="row" className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">{item.query}</th>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.results_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {safeJson<string[]>(item.sources ?? null, []).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] rounded font-bold uppercase">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(item.created_at || item.timestamp || '').toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReRun(item.query, safeJson<Record<string, unknown>>(item.filters ?? null, {}))}
                        >
                          Re-run
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setNewQuery(item.query);
                            setTab('saved-queries');
                          }}
                          leftIcon={<i className="fas fa-bell" />}
                          title="Save as alert"
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-gray-400">No searches recorded yet.</p>
            </div>
          )
        )}

        {/* ── Saved Queries tab ────────────────────────── */}
        {tab === 'saved-queries' && (
          <div className="space-y-6">
            {/* Create form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 dark:text-white mb-1">Save a Query</h2>
              <p className="text-sm text-gray-400 mb-4">
                Saved queries let you quickly re-run searches. Frequency labels are for future email alerts when that feature is enabled.
              </p>
              <form onSubmit={handleCreateAlert} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g. CRISPR gene therapy trials 2024"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  title="Alert frequency"
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as typeof newFrequency)}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
                <Button type="submit" variant="gradient" isLoading={creating}>
                  <i className="fas fa-bell mr-1.5" />Save Query
                </Button>
              </form>
              {alertsError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle" />{alertsError}
                </p>
              )}
            </div>

            {/* Alerts list */}
            {alertsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <i className="fas fa-bell text-3xl text-gray-200 dark:text-slate-600 mb-3 block" />
                <p className="text-gray-400">No saved queries yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Saved queries with frequency, saved date, and actions</caption>
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Query</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Frequency</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Saved</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase sr-only">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <th scope="row" className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">{alert.query}</th>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase rounded">
                            {alert.frequency}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunAlert(alert)}
                              leftIcon={<i className="fas fa-play" />}
                            >
                              Run
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="text-red-400 hover:text-red-600"
                              title="Delete saved query"
                            >
                              <i className="fas fa-trash-alt" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
