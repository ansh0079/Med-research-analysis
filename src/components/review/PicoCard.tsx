import React from 'react';
import type { PicoExtraction } from '@types';

interface Props {
  articleId: string;
  extraction?: PicoExtraction | null;
}

export const PicoCard: React.FC<Props> = ({ articleId, extraction }) => {
  if (!extraction) {
    return (
      <div className="neo-card rounded-2xl p-4">
        <h4 className="font-bold text-gray-900 dark:text-white">PICO ({articleId})</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No extraction yet.</p>
      </div>
    );
  }

  return (
    <div className="neo-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-gray-900 dark:text-white">PICO ({articleId})</h4>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          Confidence {(extraction.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 text-sm space-y-1 text-gray-700 dark:text-gray-300">
        <p><strong>Population:</strong> {extraction.population || '—'}</p>
        <p><strong>Intervention:</strong> {extraction.intervention || '—'}</p>
        <p><strong>Comparison:</strong> {extraction.comparison || '—'}</p>
        <p><strong>Outcomes:</strong> {extraction.outcomes.length ? extraction.outcomes.join('; ') : '—'}</p>
        <p><strong>Study Design:</strong> {extraction.studyDesign || '—'}</p>
      </div>
    </div>
  );
};
