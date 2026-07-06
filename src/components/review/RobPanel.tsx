import React, { useState } from 'react';
import { api } from '@services/api';
import type { ROBResult, ROBJudgement, ReviewArticle } from '@types';

interface Props {
  reviewId: string;
  row: ReviewArticle;
  cachedRob?: ROBResult | null;
  onResult?: (articleId: string, rob: ROBResult) => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  randomisation_process: 'Randomisation',
  deviations_from_intervention: 'Deviations from Intervention',
  missing_outcome_data: 'Missing Outcome Data',
  measurement_of_outcomes: 'Measurement of Outcomes',
  selection_of_reported_result: 'Selection of Reported Result',
};

const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);

const JUDGEMENT_STYLE: Record<ROBJudgement, { chip: string; dot: string; label: string }> = {
  LOW:            { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Low' },
  SOME_CONCERNS:  { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',   dot: 'bg-amber-400',   label: 'Some concerns' },
  HIGH:           { chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           dot: 'bg-red-500',     label: 'High' },
  NOT_APPLICABLE: { chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',      dot: 'bg-slate-300',   label: 'N/A' },
};

const OVERALL_STYLE: Record<ROBJudgement, string> = {
  LOW:            'bg-emerald-500',
  SOME_CONCERNS:  'bg-amber-400',
  HIGH:           'bg-red-500',
  NOT_APPLICABLE: 'bg-slate-300',
};

function normaliseJudgement(raw: string): ROBJudgement {
  const up = String(raw || '').toUpperCase().replace(/\s+/g, '_');
  if (up === 'LOW') return 'LOW';
  if (up.includes('CONCERN')) return 'SOME_CONCERNS';
  if (up === 'HIGH') return 'HIGH';
  return 'NOT_APPLICABLE';
}

export const RobPanel: React.FC<Props> = ({ reviewId, row, cachedRob, onResult }) => {
  const [rob, setRob] = useState<ROBResult | null>(cachedRob ?? null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(cachedRob ? 'done' : 'idle');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = async () => {
    setState('loading');
    setError('');
    try {
      const result = await api.review.assessRiskOfBias(reviewId, row.article_id);
      const raw = result.rob as unknown as Record<string, { judgement: string; rationale: string; signals?: string[] }>;
      // Normalise judgement casing from backend
      const normalized: ROBResult = {
        randomisation_process: { ...raw.randomisation_process, judgement: normaliseJudgement(raw.randomisation_process?.judgement) },
        deviations_from_intervention: { ...raw.deviations_from_intervention, judgement: normaliseJudgement(raw.deviations_from_intervention?.judgement) },
        missing_outcome_data: { ...raw.missing_outcome_data, judgement: normaliseJudgement(raw.missing_outcome_data?.judgement) },
        measurement_of_outcomes: { ...raw.measurement_of_outcomes, judgement: normaliseJudgement(raw.measurement_of_outcomes?.judgement) },
        selection_of_reported_result: { ...raw.selection_of_reported_result, judgement: normaliseJudgement(raw.selection_of_reported_result?.judgement) },
        overall: normaliseJudgement((raw as unknown as { overall?: string }).overall ?? 'NOT_APPLICABLE'),
        overallRationale: (raw as unknown as { overallRationale?: string }).overallRationale,
      };
      setRob(normalized);
      setState('done');
      onResult?.(row.article_id, normalized);
    } catch {
      setError('Assessment failed. Ensure the article has an abstract.');
      setState('error');
    }
  };

  const title = row.article_data?.title || row.article_id;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {row.article_data?.source || row.article_data?.journal}
            {row.article_data?.year || row.article_data?.pubdate?.slice(0, 4) ? ` · ${row.article_data?.year || row.article_data?.pubdate?.slice(0, 4)}` : ''}
          </p>
        </div>
        {rob && (
          <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${JUDGEMENT_STYLE[rob.overall].chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${OVERALL_STYLE[rob.overall]}`} />
            {JUDGEMENT_STYLE[rob.overall].label} overall risk
          </span>
        )}
      </div>

      {state === 'idle' && (
        <button type="button" onClick={run}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
          <i className="fas fa-shield-alt text-[10px]" /> Assess Risk of Bias (Cochrane RoB 2)
        </button>
      )}
      {state === 'loading' && (
        <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          Assessing RoB domains…
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-red-500">{error}</p>
          <button type="button" onClick={run} className="text-xs text-indigo-500 hover:underline">Retry</button>
        </div>
      )}

      {state === 'done' && rob && (
        <div className="space-y-1.5">
          {/* Heatmap row */}
          <div className="flex gap-1 mb-3">
            {DOMAIN_ORDER.map((key) => {
              const domain = rob[key as keyof ROBResult];
              if (!domain || typeof domain === 'string') return null;
              const j = normaliseJudgement((domain as { judgement: string }).judgement);
              const s = JUDGEMENT_STYLE[j];
              return (
                <div key={key} title={DOMAIN_LABELS[key]} onClick={() => setExpanded(expanded === key ? null : key)}
                  className={`flex-1 h-6 rounded cursor-pointer transition-opacity hover:opacity-80 ${OVERALL_STYLE[j]}`} />
              );
            })}
          </div>

          {DOMAIN_ORDER.map((key) => {
            const domain = rob[key as keyof ROBResult];
            if (!domain || typeof domain === 'string') return null;
            const domainObj = domain as { judgement: ROBJudgement; rationale: string; signals?: string[] };
            const j = normaliseJudgement(domainObj.judgement);
            const s = JUDGEMENT_STYLE[j];
            const isOpen = expanded === key;
            return (
              <div key={key} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 overflow-hidden border border-slate-100 dark:border-slate-700/50">
                <button type="button" onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{DOMAIN_LABELS[key]}</span>
                  <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${s.chip}`}>{s.label}</span>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[9px] text-slate-400`} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{domainObj.rationale}</p>
                    {domainObj.signals && domainObj.signals.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {domainObj.signals.map((s, i) => (
                          <li key={i} className="text-[10px] text-slate-400 flex gap-1.5">
                            <span className="opacity-50">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {rob.overallRationale && (
            <p className="text-[10px] text-slate-400 italic mt-2 px-1">{rob.overallRationale}</p>
          )}
          <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-1">Cochrane RoB 2 · Assessment from abstract text only</p>
        </div>
      )}
    </div>
  );
};
