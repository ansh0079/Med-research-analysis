import type { ConsortResult } from '@types';

const CONSORT_DOMAIN_LABELS: Record<string, string> = {
  title_abstract: 'Title & Abstract',
  eligibility_criteria: 'Eligibility Criteria',
  interventions: 'Interventions',
  outcomes: 'Outcomes',
  sample_size: 'Sample Size',
  randomisation: 'Randomisation',
  blinding: 'Blinding',
  statistical_methods: 'Statistical Methods',
  harms: 'Harms Reporting',
  trial_registration: 'Trial Registration',
};

const CONSORT_ADHERENCE_STYLE: Record<string, { dot: string; chip: string }> = {
  adequate: { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  partial: { dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  not_reported: { dot: 'bg-red-400', chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const CONSORT_OVERALL: Record<string, { label: string; bar: string; text: string }> = {
  high: { label: 'High adherence', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  moderate: { label: 'Moderate adherence', bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
  low: { label: 'Low adherence', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
};

export function ArticleCardConsortPanel({ consort, onClose }: { consort: ConsortResult; onClose: () => void }) {
  const overall = CONSORT_OVERALL[consort.overallAdherence] ?? CONSORT_OVERALL.low;
  const pct = Math.round((consort.adequateCount / consort.totalDomains) * 100);

  return (
    <div className="mx-0 mt-3 mb-2 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center gap-2">
          <i className="fas fa-clipboard-check text-blue-500 text-[11px]" />
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">CONSORT 2010 Checklist</span>
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${overall.text} bg-white/60 dark:bg-slate-900/40`}>
            {consort.adequateCount}/{consort.totalDomains} adequate
          </span>
          {!consort.isRct && (
            <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Non-RCT - applies partially
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} title="Close CONSORT assessment" aria-label="Close CONSORT assessment" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5">
          <i className="fas fa-times text-xs" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        {consort.overallSummary && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{consort.overallSummary}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`impact-bar-fill ${overall.bar} h-full rounded-full transition-all duration-500`} data-pct={String(Math.round(pct / 10) * 10)} />
          </div>
          <span className={`text-xs font-bold ${overall.text}`}>{overall.label} ({pct}%)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {Object.entries(consort.domains).map(([key, domain]) => {
            const style = CONSORT_ADHERENCE_STYLE[domain.adherence] ?? CONSORT_ADHERENCE_STYLE.not_reported;
            return (
              <div key={key} className="flex items-start gap-2 rounded-lg bg-white/60 dark:bg-slate-900/30 px-2.5 py-2 border border-slate-100 dark:border-slate-700/50" title={domain.rationale}>
                <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${style.dot}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{CONSORT_DOMAIN_LABELS[key] ?? key}</p>
                  <span className={`inline-block text-[9px] font-bold rounded-full px-1.5 py-0.5 mt-0.5 ${style.chip}`}>
                    {domain.adherence.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
          Assessment based on abstract text only. Full CONSORT adherence requires access to the complete manuscript.
        </p>
      </div>
    </div>
  );
}
