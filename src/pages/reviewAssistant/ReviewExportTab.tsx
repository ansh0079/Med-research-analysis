import type { ReviewArticle } from '@types';

export function ReviewExportTab({
  rows,
  exportSynthesisReport,
  exportPrismaSvg,
  exportCsv,
  exportMetaAnalysisCsv,
  exportAnki,
}: {
  rows: ReviewArticle[];
  exportSynthesisReport: () => void;
  exportPrismaSvg: () => void;
  exportCsv: () => void;
  exportMetaAnalysisCsv: () => void;
  exportAnki: () => void;
}) {
  const includedCount = rows.filter((r) => r.screening_status === 'included').length;

  const options = [
    { label: 'Synthesis Report (HTML)', desc: 'Full report: included studies, ROB heatmap, GRADE table, exclusions', action: exportSynthesisReport, icon: 'fa-file-medical', primary: true },
    { label: 'PRISMA Flow (SVG)', desc: 'PRISMA 2020 flow diagram for your manuscript', action: exportPrismaSvg, icon: 'fa-diagram-project', primary: false },
    { label: 'Extraction CSV', desc: 'All articles with screening decisions from the server', action: exportCsv, icon: 'fa-file-csv', primary: false },
    { label: 'Meta-analysis CSV', desc: 'PICO + quality columns for statistical software', action: exportMetaAnalysisCsv, icon: 'fa-table', primary: false },
    { label: 'Anki Flashcards', desc: 'Spaced-repetition cards for included articles', action: exportAnki, icon: 'fa-brain', primary: false, disabled: includedCount === 0 },
  ];

  return (
    <div className="neo-card rounded-2xl p-5 space-y-5">
      <h3 className="text-sm font-black text-gray-900 dark:text-white">Export Options</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button key={opt.label} type="button" onClick={opt.action} disabled={opt.disabled}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
              opt.disabled ? 'opacity-40 cursor-not-allowed border-slate-100 dark:border-slate-800' :
              opt.primary
                ? 'border-indigo-200 dark:border-indigo-700/50 bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/30'
                : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}>
            <i className={`fas ${opt.icon} text-base mt-0.5 shrink-0 ${opt.primary ? 'text-indigo-500' : 'text-slate-400'}`} aria-hidden="true" />
            <div>
              <p className={`text-sm font-bold ${opt.primary ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{opt.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-slate-400">
          <i className="fas fa-info-circle mr-1" aria-hidden="true" />
          The synthesis report bundles PRISMA counts, included studies table, ROB heatmap, and GRADE findings into a single printable HTML file.
          Run ROB assessments and generate the GRADE table first for a complete report.
        </p>
      </div>
    </div>
  );
}
