import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import type { Article, ArticleComparison } from '@types';

interface ComparisonViewProps {
  articles: [Article, Article];
  topic?: string;
  onClose: () => void;
}

type Tab = 'fulltext' | 'ai';

const WINNER_LABEL: Record<string, string> = { A: 'Study A', B: 'Study B', tie: 'Tie', both_equally: 'Both equally', neither: 'Neither' };
const ROB_COLOR: Record<string, string> = {
  LOW: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  MODERATE: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  HIGH: 'text-red-600 bg-red-50 dark:bg-red-900/20',
};
const COMPAT_COLOR: Record<string, string> = {
  comparable: 'text-emerald-600',
  partially_comparable: 'text-amber-600',
  incomparable: 'text-red-600',
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ articles, topic, onClose }) => {
  const [tab, setTab] = useState<Tab>('ai');
  const [texts, setTexts] = useState<[string, string]>(['', '']);
  const [loading, setLoading] = useState<[boolean, boolean]>([false, false]);
  const [errors, setErrors] = useState<[string | null, string | null]>([null, null]);

  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [comparison, setComparison] = useState<ArticleComparison | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchFullText = useCallback(async (article: Article, index: number) => {
    if (!article.doi) {
      setErrors(prev => { const n = [...prev] as [string | null, string | null]; n[index] = 'No DOI available.'; return n; });
      setLoading(prev => { const n = [...prev] as [boolean, boolean]; n[index] = false; return n; });
      return;
    }
    setLoading(prev => { const n = [...prev] as [boolean, boolean]; n[index] = true; return n; });
    try {
      const { url, isFree } = await api.documents.findFullText(article.doi);
      if (!url || !isFree) throw new Error('Open-access full text not found.');
      const { text } = await api.documents.extractPdfText(url);
      setTexts(prev => { const n = [...prev] as [string, string]; n[index] = text; return n; });
    } catch (err) {
      setErrors(prev => { const n = [...prev] as [string | null, string | null]; n[index] = err instanceof Error ? err.message : 'Failed to extract text.'; return n; });
    } finally {
      setLoading(prev => { const n = [...prev] as [boolean, boolean]; n[index] = false; return n; });
    }
  }, []);

  const runAiComparison = useCallback(async () => {
    setAiState('loading');
    setAiError(null);
    try {
      const result = await api.review.compareArticles(articles[0], articles[1], topic);
      setComparison(result.comparison);
      setAiState('done');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Comparison failed.');
      setAiState('error');
    }
  }, [articles, topic]);

  useEffect(() => {
    if (tab === 'fulltext' && !texts[0] && !texts[1] && !loading[0] && !loading[1]) {
      fetchFullText(articles[0], 0);
      fetchFullText(articles[1], 1);
    }
    if (tab === 'ai' && aiState === 'idle') {
      runAiComparison();
    }
  }, [tab, texts, loading, articles, fetchFullText, aiState, runAiComparison]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[60] flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-indigo-600">Head-to-Head Comparison</h2>
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setTab('ai')}
              className={`px-3 py-1.5 transition-colors ${tab === 'ai' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              AI Analysis
            </button>
            <button
              onClick={() => setTab('fulltext')}
              className={`px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-slate-600 ${tab === 'fulltext' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              Full Text
            </button>
          </div>
        </div>
        <Button variant="secondary" onClick={onClose} size="sm">
          <i className="fas fa-times mr-2" />Close
        </Button>
      </div>

      {/* Column headers (always visible) */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        {articles.map((a, i) => (
          <div key={a.uid} className="flex-1 px-5 py-3 border-r last:border-r-0 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mr-2">Study {i === 0 ? 'A' : 'B'}</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{a.title}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{a.source || a.journal} · {a.year || a.pubdate?.slice(0, 4)}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI Analysis Tab */}
        {tab === 'ai' && (
          <div className="p-6 max-w-5xl mx-auto">
            {aiState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm">Generating AI comparison...</p>
              </div>
            )}
            {aiState === 'error' && (
              <div className="text-center py-12">
                <p className="text-red-500 text-sm mb-3">{aiError}</p>
                <Button size="sm" onClick={runAiComparison}>Retry</Button>
              </div>
            )}
            {aiState === 'done' && comparison && (
              <div className="space-y-5">
                {/* Verdict */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Overall Verdict</p>
                  <p className="text-gray-900 dark:text-white font-medium text-sm leading-relaxed">{comparison.overallVerdict}</p>
                </div>

                {/* Which to trust */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Which to Weight More Heavily</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-indigo-600 text-sm">{WINNER_LABEL[comparison.whichToTrust.recommendation] ?? comparison.whichToTrust.recommendation}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{comparison.whichToTrust.rationale}</p>
                </div>

                {/* Structured grid */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 w-28">Dimension</th>
                        <th className="text-left px-4 py-2 font-semibold text-indigo-500">Study A</th>
                        <th className="text-left px-4 py-2 font-semibold text-purple-500">Study B</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 w-24">Edge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Design</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.studyDesign.A}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.studyDesign.B}</td>
                        <td className="px-4 py-3 font-semibold text-indigo-600">{WINNER_LABEL[comparison.studyDesign.winner] ?? comparison.studyDesign.winner}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Population</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.population.A}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.population.B}</td>
                        <td className={`px-4 py-3 font-semibold ${COMPAT_COLOR[comparison.population.comparability] ?? ''}`}>
                          {comparison.population.comparability.replace(/_/g, ' ')}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Intervention</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.intervention.A}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.intervention.B}</td>
                        <td className="px-4 py-3 text-gray-500">{comparison.intervention.equivalence}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Primary Outcome</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.primaryOutcome.A}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.primaryOutcome.B}</td>
                        <td className="px-4 py-3 text-gray-500">{comparison.primaryOutcome.outcomeCompatibility}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Sample size</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.sampleSize.A}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{comparison.sampleSize.B}</td>
                        <td className="px-4 py-3 text-gray-400 italic">{comparison.sampleSize.powerNote}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-500">Risk of Bias</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROB_COLOR[comparison.riskOfBias.A] ?? ''}`}>{comparison.riskOfBias.A}</span>
                          {comparison.riskOfBias.A_concerns.length > 0 && (
                            <p className="text-gray-500 mt-1">{comparison.riskOfBias.A_concerns.join('; ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROB_COLOR[comparison.riskOfBias.B] ?? ''}`}>{comparison.riskOfBias.B}</span>
                          {comparison.riskOfBias.B_concerns.length > 0 && (
                            <p className="text-gray-500 mt-1">{comparison.riskOfBias.B_concerns.join('; ')}</p>
                          )}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Design rationale */}
                {comparison.studyDesign.rationale && (
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Design note: </span>{comparison.studyDesign.rationale}
                  </div>
                )}

                {/* Agreements / Conflicts */}
                <div className="grid grid-cols-2 gap-4">
                  {comparison.keyAgreements.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Points of Agreement</p>
                      <ul className="space-y-1.5">
                        {comparison.keyAgreements.map((a, i) => (
                          <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-2">
                            <i className="fas fa-check text-emerald-500 mt-0.5 flex-shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {comparison.keyConflicts.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Points of Conflict</p>
                      <ul className="space-y-1.5">
                        {comparison.keyConflicts.map((c, i) => (
                          <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-2">
                            <i className="fas fa-exclamation text-amber-500 mt-0.5 flex-shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Clinical bottom line */}
                <div className="bg-slate-900 dark:bg-white/5 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Clinical Bottom Line</p>
                  <p className="text-white dark:text-gray-100 text-sm leading-relaxed">{comparison.clinicalBottomLine}</p>
                </div>

                {/* Population note */}
                {comparison.population.note && (
                  <p className="text-xs text-gray-500 italic px-1">{comparison.population.note}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Full Text Tab */}
        {tab === 'fulltext' && (
          <div className="flex h-full">
            {articles.map((article, idx) => (
              <div key={article.uid} className="flex-1 overflow-y-auto p-6 border-r last:border-r-0 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 custom-scrollbar">
                {loading[idx] ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                    <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm">Extracting full text...</p>
                  </div>
                ) : errors[idx] ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                      <i className="fas fa-exclamation-triangle" />
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors[idx]}</p>
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-left w-full">
                      <h4 className="text-xs font-bold uppercase mb-2">Abstract:</h4>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{article.abstract}</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-serif">{texts[idx]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
