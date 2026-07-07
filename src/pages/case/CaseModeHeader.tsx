import React from 'react';

interface CaseModeHeaderProps {
  onBack: () => void;
}

export const CaseModeHeader: React.FC<CaseModeHeaderProps> = ({ onBack }) => (
  <div className="flex items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Case Scenario</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Evidence-backed case-based learning — research assistant only</p>
    </div>
    <button type="button" onClick={onBack}
      className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-1.5">
      <i className="fas fa-arrow-left" /> Back
    </button>
  </div>
);
