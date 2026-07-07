import React from 'react';
import { type ReflectionKind } from './caseModeConfig';

interface CaseReflectionExportPanelProps {
  reflectionKind: ReflectionKind;
  reflectionSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onKindChange: (kind: ReflectionKind) => void;
  onExportDoc: () => void;
  onExportTxt: () => void;
  onSaveDraft: () => void;
}

export const CaseReflectionExportPanel: React.FC<CaseReflectionExportPanelProps> = ({
  reflectionKind,
  reflectionSaveStatus,
  onKindChange,
  onExportDoc,
  onExportTxt,
  onSaveDraft,
}) => (
  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Portfolio reflection</p>
        <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-100/75">
          Export a de-identified WBA draft for CBD, mini-CEX, or DOPS evidence.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={reflectionKind}
          onChange={(event) => onKindChange(event.target.value as ReflectionKind)}
          className="h-9 rounded-lg border border-emerald-200 bg-white px-2 text-xs font-bold text-emerald-800 outline-none dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100"
          aria-label="Portfolio reflection type"
        >
          <option value="CBD">CBD</option>
          <option value="mini-CEX">mini-CEX</option>
          <option value="DOPS">DOPS</option>
        </select>
        <button
          type="button"
          onClick={onExportDoc}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500"
        >
          <i className="fas fa-file-word text-[10px]" />
          Save .doc
        </button>
        <button
          type="button"
          onClick={() => void onSaveDraft()}
          disabled={reflectionSaveStatus === 'saving'}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <i className={`fas ${reflectionSaveStatus === 'saving' ? 'fa-circle-notch fa-spin' : reflectionSaveStatus === 'saved' ? 'fa-check' : 'fa-save'} text-[10px]`} />
          {reflectionSaveStatus === 'saved' ? 'Saved' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={onExportTxt}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
        >
          <i className="fas fa-file-lines text-[10px]" />
          Text
        </button>
      </div>
      {reflectionSaveStatus === 'error' && (
        <p className="text-xs font-semibold text-red-600 dark:text-red-300">Could not save draft. Sign in and try again.</p>
      )}
    </div>
  </div>
);
