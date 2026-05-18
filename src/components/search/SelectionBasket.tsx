import React, { useState } from 'react';
import type { Article, SynthesisResult } from '@types';
import api from '../../services/api';

interface SelectionBasketProps {
  selectedArticles: Article[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-800',
  MODERATE: 'bg-blue-100 text-blue-800',
  LOW: 'bg-amber-100 text-amber-800',
  VERY_LOW: 'bg-red-100 text-red-800',
};

export const SelectionBasket: React.FC<SelectionBasketProps> = ({
  selectedArticles,
  onRemove,
  onClear,
}) => {
  const [topic, setTopic] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesize = async () => {
    if (selectedArticles.length === 0) return;
    setIsSynthesizing(true);
    setResult(null);
    setError(null);

    try {
      const data = await api.synthesizeEvidence(topic || 'General Clinical Review', selectedArticles);
      setResult(data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Synthesis error:', err);
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (selectedArticles.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 rounded-2xl shadow-2xl border border-indigo-200/60 dark:border-indigo-900/60 flex flex-col max-h-[85vh] z-50 animate-slide-up ring-1 ring-black/5 overflow-hidden neo-card">
      <div className="p-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">Research Basket</span>
          <span className="bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {selectedArticles.length}
          </span>
        </div>
        <button onClick={onClear} className="text-xs text-indigo-100 hover:text-white uppercase tracking-wider font-semibold">
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selectedArticles.map((article) => (
          <div key={article.uid} className="group relative flex items-start p-3 bg-gray-50 rounded-lg border border-transparent hover:border-indigo-200 transition-all">
            <p className="text-xs font-medium text-gray-700 line-clamp-2 flex-1 pr-6">{article.title}</p>
            <button
              onClick={() => onRemove(article.uid)}
              title="Remove article from basket"
              aria-label="Remove article from basket"
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-gray-50/80 dark:bg-slate-900/40 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Synthesis Goal</label>
          <input
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="e.g. Compare efficacy in geriatric patients"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing}
          className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-fuchsia-300/30 disabled:bg-gray-400 transition-all flex justify-center items-center"
        >
          {isSynthesizing ? <span className="flex items-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Synthesizing...</span> : 'Generate GRADE Report'}
        </button>
      </div>

      {error && (
        <div className="p-4 border-t bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {result && (
        <div className="p-4 border-t bg-white overflow-y-auto max-h-[50vh] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 text-sm">GRADE Report</span>
            {result.synthesis?.evidenceGrade && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[result.synthesis.evidenceGrade] ?? 'bg-gray-100 text-gray-700'}`}>
                {result.synthesis.evidenceGrade}
              </span>
            )}
          </div>

          {result.synthesis?.clinicalBottomLine && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs font-bold text-indigo-700 mb-1">Clinical Bottom Line</p>
              <p className="text-sm text-indigo-900">{result.synthesis.clinicalBottomLine}</p>
            </div>
          )}

          {result.synthesis?.consensus && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Consensus</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.synthesis.consensus}</p>
            </div>
          )}

          {result.synthesis?.keyFindings && result.synthesis.keyFindings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Key Findings</p>
              <ul className="space-y-1">
                {result.synthesis.keyFindings.slice(0, 3).map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{f.finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.synthesis?.limitations && (
            <p className="text-xs text-gray-500 italic">{result.synthesis.limitations}</p>
          )}
        </div>
      )}
    </div>
  );
};