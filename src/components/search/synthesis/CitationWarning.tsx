import React from 'react';

interface CitationWarningProps {
  field: string;
  errors: string[];
}

export const CitationWarning: React.FC<CitationWarningProps> = ({ field, errors }) => (
  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
    <i className="fas fa-triangle-exclamation text-amber-500 text-[11px] shrink-0 mt-0.5" />
    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
      <strong>Citation unverified</strong> — {field} lacks inline source references. Treat this claim with caution and verify against the numbered papers above.
      {errors.length > 0 && <span className="block opacity-70">{errors[0]}</span>}
    </p>
  </div>
);
