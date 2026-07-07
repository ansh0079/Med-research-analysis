import React from 'react';
import { GRADE_CONFIG } from './synthesisPanelConfig';

interface Props {
  grade: typeof GRADE_CONFIG[keyof typeof GRADE_CONFIG];
  gradeRationale?: string | null;
}

export const SynthesisGradeCertainty: React.FC<Props> = ({ grade, gradeRationale }) => (
  <div className={`rounded-2xl p-5 border ${grade.bg} ${grade.border}`}>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">GRADE Certainty</p>
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-2.5 h-2.5 rounded-full ${grade.dot}`} />
      <span className={`font-black text-xl ${grade.color}`}>{grade.label}</span>
    </div>
    <div className="h-1.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-full mb-3">
      <div className={`h-full ${grade.bar} ${grade.dot} rounded-full transition-all duration-700`} />
    </div>
    {gradeRationale && (
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">{gradeRationale}</p>
    )}
  </div>
);
