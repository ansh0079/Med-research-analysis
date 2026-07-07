import React from 'react';
import type { CaseLearningMode } from '@types';
import { MODES } from './caseModeConfig';

interface CaseModeModeSelectorProps {
  mode: CaseLearningMode;
  onChange: (mode: CaseLearningMode) => void;
}

export const CaseModeModeSelector: React.FC<CaseModeModeSelectorProps> = ({ mode, onChange }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Learner Level</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {MODES.map((m) => (
        <button key={m.id} type="button" onClick={() => onChange(m.id)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
            mode === m.id
              ? m.activeColor + ' shadow-sm'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          }`}>
          <i className={`fas ${m.icon} text-base`} />
          <span className="text-[11px] font-bold leading-tight">{m.label}</span>
          <span className="text-[9px] opacity-70 leading-tight hidden sm:block">{m.desc}</span>
        </button>
      ))}
    </div>
  </div>
);
