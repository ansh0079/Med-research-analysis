import React from 'react';
import { Link } from 'react-router-dom';

export const SearchPageFooter: React.FC = () => (
  <footer className="py-8 border-t border-gray-200/60 dark:border-slate-700/70 text-center space-y-2">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
      Signal MD · Multi-Source Medical Evidence Search
    </p>
    <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
      <Link to="/legal/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Terms of Use</Link>
      <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
      <Link to="/legal/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Privacy</Link>
    </nav>
  </footer>
);
