import React, { useState } from 'react';
import { api } from '@services/api';
import type { GRADETable, GRADEOutcome } from '@types';

interface Props {
  reviewId: string;
  includedCount: number;
  cached?: GRADETable | null;
  onResult?: (table: GRADETable) => void;
}

const CERTAINTY_STYLE: Record<string, { bg: string; text: string; bar: string }> = {
  HIGH:     { bg: 'bg-emerald-50 dark:bg-emerald-950/20',  text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  MODERATE: { bg: 'bg-blue-50 dark:bg-blue-950/20',        text: 'text-blue-700 dark:text-blue-300',       bar: 'bg-blue-500' },
  LOW:      { bg: 'bg-amber-50 dark:bg-amber-950/20',      text: 'text-amber-700 dark:text-amber-300',     bar: 'bg-amber-400' },
  'VERY LOW': { bg: 'bg-red-50 dark:bg-red-950/20',        text: 'text-red-700 dark:text-red-300',         bar: 'bg-red-500' },
};

const SERIOUSNESS_DOT: Record<string, string> = {
  'not serious': 'bg-emerald-400',
  serious:       'bg-amber-400',
  'very serious':'bg-red-500',
};

const DOMAIN_LABEL_MAP: Record<string, string> = {
  riskOfBias:     'Risk of Bias',
  inconsistency:  'Inconsistency',
  indirectness:   'Indirectness',
  imprecision:    'Imprecision',
};

function certaintyWidth(level: string) {
  return { HIGH: '100%', MODERATE: '75%', LOW: '50%', 'VERY LOW': '25%' }[level] ?? '0%';
}

function OutcomeRow({ outcome }: { outcome: GRADEOutcome }) {
  const [open, setOpen] = useState(false);
  const c = CERTAINTY_STYLE[outcome.certainty] ?? CERTAINTY_STYLE.LOW;
  const domains: Array<{ key: keyof GRADEOutcome; label: string }> = [
    { key: 'riskOfBias', label: 'Risk of Bias' },
    { key: 'inconsistency', label: 'Inconsistency' },
    { key: 'indirectness', label: 'Indirectness' },
    { key: 'imprecision', label: 'Imprecision' },
  ];

  return (
    <div className={`rounded-xl border ${open ? 'border-indigo-200 dark:border-indigo-700/50' : 'border-slate-100 dark:border-slate-700/50'} overflow-hidden transition-colors`}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-white">{outcome.outcome}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-slate-400">{outcome.studiesN} stud{outcome.studiesN === 1 ? 'y' : 'ies'} · {outcome.participantsN?.toLocaleString()} participants</span>
            <span className="text-[10px] text-slate-400">{outcome.studyDesign}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 ${c.text} ${c.bg}`}>
            {outcome.certainty}
          </span>
          <div className="mt-1 w-20 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full ${c.bar}`} style={{ width: certaintyWidth(outcome.certainty) }} />
          </div>
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px] text-slate-400 shrink-0 ml-1`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
          {outcome.effect && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Effect estimate</p>
              <p className="text-xs text-slate-700 dark:text-slate-200">{outcome.effect}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {domains.map(({ key, label }) => {
              const val = outcome[key] as string | undefined;
              if (!val) return null;
              const dot = SERIOUSNESS_DOT[val] ?? SERIOUSNESS_DOT.serious;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">{val}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {outcome.footnote && (
            <p className="text-[10px] text-slate-400 italic">{outcome.footnote}</p>
          )}
        </div>
      )}
    </div>
  );
}

export const GradePanel: React.FC<Props> = ({ reviewId, includedCount, cached, onResult }) => {
  const [table, setTable] = useState<GRADETable | null>(cached ?? null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(cached ? 'done' : 'idle');
  const [error, setError] = useState('');

  const generate = async () => {
    setState('loading');
    setError('');
    try {
      const result = await api.review.generateGradeTable(reviewId);
      setTable(result.gradeTable);
      setState('done');
      onResult?.(result.gradeTable);
    } catch {
      setError('GRADE generation failed. Make sure at least 2 articles are included.');
      setState('error');
    }
  };

  const overall = table ? (CERTAINTY_STYLE[table.overallCertainty] ?? CERTAINTY_STYLE.LOW) : null;

  return (
    <div className="space-y-3">
      {state === 'idle' && (
        <div className="text-center py-6">
          {includedCount < 2 ? (
            <p className="text-xs text-slate-400 mb-3">Include at least 2 articles before generating a GRADE table.</p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {includedCount} article{includedCount !== 1 ? 's' : ''} included. Generate a GRADE Summary of Findings table?
            </p>
          )}
          <button type="button" onClick={generate} disabled={includedCount < 2}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <i className="fas fa-table-list text-[10px]" /> Generate GRADE Table
          </button>
        </div>
      )}

      {state === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <div className="w-7 h-7 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm">Synthesising GRADE evidence…</p>
          <p className="text-xs text-slate-300">Analysing {includedCount} included studies</p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button type="button" onClick={generate}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Retry
          </button>
        </div>
      )}

      {state === 'done' && table && (
        <>
          {/* Overall certainty banner */}
          <div className={`rounded-xl p-4 border ${overall?.bg} ${overall?.bg.replace('bg-', 'border-').replace('50', '200').replace('950/20', '800/30')}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Overall Certainty of Evidence</p>
                <p className={`text-lg font-black ${overall?.text}`}>{table.overallCertainty}</p>
              </div>
              <div className="w-24 h-2 rounded-full bg-white/60 dark:bg-black/20 overflow-hidden">
                <div className={`h-full rounded-full ${overall?.bar}`} style={{ width: certaintyWidth(table.overallCertainty) }} />
              </div>
            </div>
            {table.interpretation && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{table.interpretation}</p>
            )}
          </div>

          {/* Outcomes */}
          <div className="space-y-2">
            {table.outcomes.map((outcome, i) => (
              <OutcomeRow key={i} outcome={outcome} />
            ))}
          </div>

          {/* Limitations */}
          {table.limitations && table.limitations.length > 0 && (
            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-800/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Limitations</p>
              <ul className="space-y-1">
                {table.limitations.map((l, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-2">
                    <span className="text-amber-400 shrink-0">·</span> {l}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={generate}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
              <i className="fas fa-rotate-right text-[9px]" /> Regenerate
            </button>
          </div>
          <p className="text-[9px] text-slate-300 dark:text-slate-600">GRADE Working Group · evidence certainty ratings based on abstract-level data</p>
        </>
      )}
    </div>
  );
};
