import React from 'react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">{children}</p>
);
