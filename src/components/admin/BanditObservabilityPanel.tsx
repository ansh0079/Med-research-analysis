import React from 'react';
import type { BanditObservability } from '@services/api/knowledgeAdmin';

function formatPct(value: number) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatNum(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function BanditObservabilityPanel({ observability }: { observability: BanditObservability }) {
  const { decisions, arms } = observability;
  const pending = Math.max(0, decisions.total - decisions.withReward);
  const propensityCoverage = decisions.total > 0 ? decisions.withPropensity / decisions.total : 0;

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Bandit / RL observability</h2>
          <p className="text-xs text-slate-500 mt-1">
            Arm posterior state for <span className="font-mono text-slate-600 dark:text-slate-300">{observability.policyType}</span>
            {' '}· scope <span className="font-mono text-slate-600 dark:text-slate-300">{observability.scopeKey}</span>
            {' '}· last {observability.days}d
          </p>
        </div>
        <p className="text-[10px] text-slate-400">
          Updated {new Date(observability.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[10px] text-slate-500">Decisions</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{decisions.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[10px] text-slate-500">With reward</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{decisions.withReward}</p>
          <p className="text-[10px] text-slate-400 mt-1">{pending} pending · density {formatPct(decisions.rewardDensity)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[10px] text-slate-500">With propensity</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{decisions.withPropensity}</p>
          <p className="text-[10px] text-slate-400 mt-1">coverage {formatPct(propensityCoverage)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[10px] text-slate-500">Arms</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{arms.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {arms.reduce((sum, arm) => sum + (arm.pulls || 0), 0)} total pulls
          </p>
        </div>
      </div>

      {arms.length === 0 ? (
        <p className="text-xs text-slate-500">No arm state rows for this policy/scope yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1 pr-3 font-semibold">Arm</th>
                <th className="py-1 pr-3 font-semibold">Pulls</th>
                <th className="py-1 pr-3 font-semibold">α / β</th>
                <th className="py-1 pr-3 font-semibold">Thompson μ</th>
                <th className="py-1 pr-3 font-semibold">Mean reward</th>
                <th className="py-1 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {arms.map((arm) => (
                <tr key={arm.armId || 'unknown'} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 font-mono text-slate-700 dark:text-slate-200">{arm.armId || '—'}</td>
                  <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{arm.pulls}</td>
                  <td className="py-1.5 pr-3 font-mono text-slate-500">
                    {formatNum(arm.alpha, 2)} / {formatNum(arm.beta, 2)}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{formatNum(arm.thompsonMean, 3)}</td>
                  <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{formatNum(arm.meanReward, 3)}</td>
                  <td className="py-1.5 text-slate-500">
                    {arm.updatedAt ? new Date(arm.updatedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
