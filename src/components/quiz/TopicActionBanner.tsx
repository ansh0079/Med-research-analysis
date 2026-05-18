import React from 'react';
import { useSearchContext } from '@contexts/SearchContext';

interface Props {
  onTestYourself: () => void;
  onCaseScenario?: () => void;
  onReadDeeper: () => void;
}

export const TopicActionBanner: React.FC<Props> = ({ onTestYourself, onCaseScenario, onReadDeeper }) => {
  const { detectedTopic, results } = useSearchContext();

  if (!detectedTopic || results.length === 0) return null;

  const shortTopic =
    detectedTopic.length > 60 ? detectedTopic.slice(0, 57) + '…' : detectedTopic;

  return (
    <div className="my-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-px shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
      <div className="rounded-2xl bg-white dark:bg-slate-900 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">
            Deepen your understanding
          </p>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">
            <span className="text-indigo-600 dark:text-indigo-400">{shortTopic}</span>
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {results.length} papers found — test your knowledge or explore clinical scenarios
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onTestYourself}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-md shadow-indigo-300 dark:shadow-indigo-900/50"
            title="Generate MCQ questions from the top papers on this topic"
          >
            <i className="fas fa-brain" />
            MCQ Quiz
          </button>
          {onCaseScenario && (
            <button
              type="button"
              onClick={onCaseScenario}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors shadow-md shadow-purple-300 dark:shadow-purple-900/50"
              title="Generate an evidence-based clinical case scenario from the top papers on this topic"
            >
              <i className="fas fa-stethoscope" />
              Case Scenario
            </button>
          )}
          <button
            type="button"
            onClick={onReadDeeper}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm font-bold transition-colors"
          >
            <i className="fas fa-book-open" />
            PubMed
          </button>
        </div>
      </div>
    </div>
  );
};
