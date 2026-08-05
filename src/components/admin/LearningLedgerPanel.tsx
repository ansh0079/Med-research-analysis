import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';
import type { LearningLedgerEntry, LearningLedgerResponse } from '@services/api/knowledgeAdmin';

function fmtReward(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toFixed(3);
}

function confidenceTone(c: number | null | undefined): string {
  if (c == null) return 'text-slate-400';
  if (c >= 0.8) return 'text-emerald-600 dark:text-emerald-400';
  if (c >= 0.45) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function LearningLedgerPanel() {
  const [ledger, setLedger] = useState<LearningLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policyType, setPolicyType] = useState('');
  const [days, setDays] = useState(7);
  const [onlyWithReward, setOnlyWithReward] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.knowledge.getLearningLedger({
        policyType: policyType || undefined,
        days,
        limit: 40,
        onlyWithReward,
      });
      setLedger(res.ledger);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load learning ledger');
    } finally {
      setLoading(false);
    }
  }, [policyType, days, onlyWithReward]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Learning event ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Decision · arm · context · immediate/delayed reward · source · attribution confidence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
          >
            <option value="">All policies</option>
            <option value="search_ranking">search_ranking</option>
            <option value="synopsis_style">synopsis_style</option>
            <option value="case_scenario_outcome">case_scenario_outcome</option>
            <option value="agent_teaching_strategy">agent_teaching_strategy</option>
            <option value="recommendation_strategy">recommendation_strategy</option>
            <option value="quiz_claim_selection">quiz_claim_selection</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
          >
            <option value={3}>3d</option>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyWithReward}
              onChange={(e) => setOnlyWithReward(e.target.checked)}
            />
            Rewarded only
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-slate-800 text-white px-3 py-1.5 font-semibold hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Loading ledger…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {!loading && ledger && (
        <>
          <p className="text-[11px] text-slate-400">
            {ledger.total} events · showing {ledger.entries.length}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-2 font-semibold">When</th>
                  <th className="py-2 pr-2 font-semibold">Policy / arm</th>
                  <th className="py-2 pr-2 font-semibold">Source</th>
                  <th className="py-2 pr-2 font-semibold">Imm</th>
                  <th className="py-2 pr-2 font-semibold">Delay</th>
                  <th className="py-2 pr-2 font-semibold">Total</th>
                  <th className="py-2 pr-2 font-semibold">Conf</th>
                  <th className="py-2 font-semibold">Topic</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((row: LearningLedgerEntry) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="py-2 pr-2 whitespace-nowrap text-slate-500">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{row.policyType}</div>
                        <div className="text-slate-500">{row.armId}</div>
                      </td>
                      <td className="py-2 pr-2 text-slate-600 dark:text-slate-300">
                        {row.sourceEvent || row.selectionSource || '—'}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{fmtReward(row.immediateReward)}</td>
                      <td className="py-2 pr-2 tabular-nums">{fmtReward(row.delayedReward)}</td>
                      <td className="py-2 pr-2 tabular-nums font-semibold">{fmtReward(row.totalReward)}</td>
                      <td className={`py-2 pr-2 tabular-nums font-bold ${confidenceTone(row.attributionConfidence)}`}>
                        {row.attributionConfidence != null ? row.attributionConfidence.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-300 max-w-[10rem] truncate">
                        {row.topic || row.articleUid || '—'}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/50">
                        <td colSpan={8} className="p-3">
                          <div className="grid gap-2 md:grid-cols-2 text-[11px]">
                            <div>
                              <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Context</p>
                              <pre className="whitespace-pre-wrap break-all rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 max-h-40 overflow-auto">
                                {JSON.stringify(row.context || {}, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Counterfactuals {row.counterfactuals?.length ? `(${row.counterfactuals.length})` : ''}
                              </p>
                              {row.counterfactuals?.length ? (
                                <ul className="space-y-1 max-h-40 overflow-auto">
                                  {row.counterfactuals.map((cf) => (
                                    <li
                                      key={`${cf.shadowArmId}-${cf.createdAt}`}
                                      className="rounded-lg border border-slate-100 dark:border-slate-800 px-2 py-1.5"
                                    >
                                      <span className="font-semibold">{cf.shadowArmId}</span>
                                      <span className="text-slate-400"> ← shadow of {cf.servedArmId}</span>
                                      <div className="text-slate-500 truncate">
                                        top: {(cf.shadowUids || []).slice(0, 4).join(', ') || '—'}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-400">No shadow rankings logged for this search.</p>
                              )}
                              <p className="mt-2 text-slate-400">
                                scope {row.scopeHint || '—'} · propensity{' '}
                                {row.propensity != null ? row.propensity.toFixed(3) : '—'} · user {row.userId || 'anon'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {ledger.entries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No learning events in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
