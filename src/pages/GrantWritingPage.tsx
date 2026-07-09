import React, { useState, useCallback } from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import { useToast } from '@components/ui';
import type { GrantResult } from '@types';

const CITATION_STYLES = ['APA', 'Vancouver', 'Harvard', 'MLA', 'Nature'] as const;

export const GrantWritingPage: React.FC = () => {
  const { setCurrentPage, results, selectedArticles } = useSearchContext();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [researchQuestion, setResearchQuestion] = useState('');
  const [citationStyle, setCitationStyle] = useState<string>('APA');
  const [result, setResult] = useState<GrantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'gaps' | 'refs'>('review');

  const sourceArticles = selectedArticles.length > 0 ? selectedArticles : results.slice(0, 20);

  const handleGenerate = useCallback(async () => {
    if (!researchQuestion.trim() || sourceArticles.length === 0) return;
    setLoading(true);
    setResult(null); // Clear previous results on new generation
    setError(null);
    try {
      const data = await api.ai.generateGrantSection(researchQuestion.trim(), sourceArticles, citationStyle);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate section';
      showToast(message, 'error');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [researchQuestion, sourceArticles, citationStyle, showToast]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Sign in to use Grant Writing Mode</p>
          <Button variant="primary" onClick={() => setCurrentPage('auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              <i className="fas fa-file-signature mr-3 text-indigo-500" />Grant Writing Mode
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate structured literature reviews, formatted citations, and evidence gaps for your proposal
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage('search')} leftIcon={<i className="fas fa-arrow-left" />}>
            Back to Search
          </Button>
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Research Question / Protocol Topic
              </label>
              <textarea
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                placeholder="e.g., Does metformin reduce cardiovascular mortality in non-diabetic patients with heart failure?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Citation Style</label>
                <select
                  value={citationStyle}
                  onChange={(e) => setCitationStyle(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {CITATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {sourceArticles.length} article{sourceArticles.length !== 1 ? 's' : ''} available
                  {selectedArticles.length > 0 ? ' (from selection)' : ' (from search results)'}
                </p>
              </div>
              <Button
                variant="gradient"
                onClick={handleGenerate}
                isLoading={loading}
                disabled={!researchQuestion.trim() || sourceArticles.length === 0}
                leftIcon={<i className="fas fa-magic" />}
              >
                {loading ? 'Generating...' : 'Generate Review'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm">
            <i className="fas fa-exclamation-circle mr-2" />{error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* Result header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Generated Literature Review</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {(result.wordCount ?? null)?.toLocaleString() ?? '~'} words • {result.citationStyle} • {result.articleCount} articles
                </p>
              </div>
              <div className="flex gap-2">
                {(['review', 'gaps', 'refs'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      activeTab === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {t === 'review' ? 'Literature Review' : t === 'gaps' ? 'Evidence Gaps' : 'Key References'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'review' && (
                <div className="space-y-6">
                  {result.structuredReview?.background && (
                    <div>
                      <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">Background</h3>
                      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {result.structuredReview.background}
                      </div>
                    </div>
                  )}
                  {result.structuredReview?.rationale && (
                    <div>
                      <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">Rationale</h3>
                      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {result.structuredReview.rationale}
                      </div>
                    </div>
                  )}
                  {result.structuredReview?.currentEvidence && (
                    <div>
                      <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">Current Evidence</h3>
                      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {result.structuredReview.currentEvidence}
                      </div>
                    </div>
                  )}
                  {result.structuredReview?.limitationsOfCurrentEvidence?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">Limitations of Current Evidence</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {result.structuredReview.limitationsOfCurrentEvidence.map((lim, i) => (
                          <li key={i}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.proposedStudyDesignRationale && (
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40">
                      <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">
                        <i className="fas fa-flask mr-1" />Proposed Study Design Rationale
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.proposedStudyDesignRationale}</p>
                    </div>
                  )}
                  {result.feasibilityNotes && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                      <h3 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-2">
                        <i className="fas fa-check-circle mr-1" />Feasibility Notes
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.feasibilityNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'gaps' && (
                <div className="space-y-3">
                  {result.evidenceGaps?.length > 0 ? (
                    result.evidenceGaps.map((gap, i) => (
                      <div key={i} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 bg-amber-200 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{gap.gap}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1"><strong>Why it matters:</strong> {gap.whyItMatters}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400"><strong>How your study addresses it:</strong> {gap.howThisStudyAddressesIt}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No evidence gaps identified.</p>
                  )}
                </div>
              )}

              {activeTab === 'refs' && (
                <div className="space-y-3">
                  {result.keyReferences?.length > 0 ? (
                    result.keyReferences.map((ref, i) => (
                      <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mb-2">{ref.citation}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">{ref.relevance}</p>
                        <div className="flex gap-3 text-xs">
                          {ref.pmid && (
                            <a href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                              PubMed {ref.pmid}
                            </a>
                          )}
                          {ref.doi && (
                            <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                              DOI
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No references generated.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
