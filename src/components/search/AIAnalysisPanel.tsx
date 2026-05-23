import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@services/api';
import { getArticleLinkInfo } from '@services/articleLinks';
import { useCollaboration } from '@hooks/useCollaboration';
import type { Article, AnalysisResult, AnalysisType, PicoExtraction } from '@types';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';

interface Props {
  article: Article | null;
  onClose: () => void;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; icon: string }[] = [
  { value: 'quick', label: 'Synopsis', icon: 'fa-bolt' },
  { value: 'layperson', label: 'Plain English', icon: 'fa-user' },
  { value: 'comprehensive', label: 'Full Analysis', icon: 'fa-microscope' },
  { value: 'critical', label: 'Critical Appraisal', icon: 'fa-balance-scale' },
];

function AnalysisErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  if (error === 'AUTH_REQUIRED') {
    return (
      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-6 text-center space-y-3">
        <i className="fas fa-lock text-2xl text-indigo-400 block" />
        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Sign in to use AI analysis</p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">Create a free account to get AI-synthesised summaries, critical appraisals, and more.</p>
        <a href="/auth" className="inline-block text-xs font-bold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Sign in / Register →
        </a>
      </div>
    );
  }
  if (error.startsWith('RATE_LIMITED:')) {
    const secs = error.split(':')[1];
    return (
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center space-y-2">
        <i className="fas fa-clock text-2xl text-amber-500 block" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Too many requests</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">You've hit the analysis limit. Try again in {secs}s.</p>
      </div>
    );
  }
  if (error.startsWith('UPGRADE_REQUIRED:')) {
    return (
      <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-6 text-center space-y-3">
        <i className="fas fa-star text-2xl text-violet-400 block" />
        <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Pro feature</p>
        <p className="text-xs text-violet-600 dark:text-violet-400">Upgrade to unlock unlimited AI analysis.</p>
        <a href="/billing" className="inline-block text-xs font-bold px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          View plans →
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center">
      <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-2 block" />
      <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
      <button type="button" onClick={onRetry}
        className="text-xs font-bold px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
        Retry
      </button>
    </div>
  );
}

function PicoCard({ pico }: { pico: PicoExtraction }) {
  const confidence = Math.round((pico.confidence ?? 0) * 100);
  const rows: Array<{ label: string; value: string | string[] | number }> = [
    { label: 'Population', value: pico.population || '—' },
    { label: 'Intervention', value: pico.intervention || '—' },
    { label: 'Comparison', value: pico.comparison || 'None / not reported' },
    { label: 'Outcomes', value: pico.outcomes?.length ? pico.outcomes : ['—'] },
    { label: 'Study Design', value: pico.studyDesign || '—' },
    { label: 'Sample Size', value: pico.sampleSize ? pico.sampleSize.toLocaleString() : 'Not reported' },
    { label: 'Follow-up', value: pico.followUp || 'Not reported' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PICO Extraction</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidence >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : confidence >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          {confidence}% confidence
        </span>
      </div>
      {rows.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
          {Array.isArray(value) ? (
            <ul className="space-y-0.5">
              {value.map((v, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">·</span>{v}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{String(value)}</p>
          )}
        </div>
      ))}
      {pico.missingFields && pico.missingFields.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Insufficient data in abstract for:</p>
          <p className="text-xs text-amber-700 dark:text-amber-300">{pico.missingFields.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract', introduction: 'Introduction', methods: 'Methods',
  results: 'Results', discussion: 'Discussion', conclusion: 'Conclusion', limitations: 'Limitations',
};

export const AIAnalysisPanel: React.FC<Props> = ({ article, onClose }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'collab'>('analysis');
  const [type, setType] = useState<AnalysisType>('quick');
  const [isPicoMode, setIsPicoMode] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [picoResult, setPicoResult] = useState<PicoExtraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFullText, setUsingFullText] = useState(false);
  const [usingSection, setUsingSection] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [pdfStatus, setPdfStatus] = useState<{
    indexed: boolean; sections?: string[]; wordCount?: number; numpages?: number; source?: string;
  } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);
  const [tables, setTables] = useState<Array<{ heading: string; rows: string[][]; rawText: string }>>([]);

  const { annotations, addAnnotation, needsAuth } = useCollaboration(article?.uid || null);
  const requestIdRef = useRef(0);
  

  // Check pre-index status whenever article changes
  useEffect(() => {
    if (!article) return;
    api.getPdfStatus({ uid: article.uid, doi: article.doi, pmcid: article.pmcid }).then(setPdfStatus).catch(() => {});
  }, [article]);

  const analyze = useCallback(
    async (analysisType: AnalysisType) => {
      if (!article) return;
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setResult(null);
      setStreamedText('');
      setUsingFullText(false);
      setUsingSection(null);

      try {
        let textToAnalyze = [article.title, article.abstract].filter(Boolean).join('\n\n');

        // 1. Try pre-indexed section if user picked one
        if (selectedSection) {
          try {
            const secData = await api.getPdfSection(
              { uid: article.uid, doi: article.doi, pmcid: article.pmcid },
              selectedSection
            );
            if (secData.text) {
              textToAnalyze = `## ${selectedSection.toUpperCase()}\n${secData.text}`;
              setUsingFullText(true);
              setUsingSection(selectedSection);
            }
          } catch { /* fall through to full text */ }
        }

        // 2. For deep modes: try pre-indexed full text, then live cascade
        if (!selectedSection && (analysisType === 'comprehensive' || analysisType === 'critical')) {
          try {
            // Try pre-indexed first (instant)
            const cached = await api.getPdfStatus({ uid: article.uid, doi: article.doi, pmcid: article.pmcid });
            if (cached.indexed && cached.wordCount && cached.wordCount > 500) {
              // Fetch the highest-value sections (methods + results + discussion)
              const keyOrder = ['methods', 'results', 'discussion', 'conclusion', 'introduction'];
              const available = (cached.sections || []).filter((s) => keyOrder.includes(s));
              if (available.length > 0) {
                const parts = await Promise.all(
                  available.slice(0, 3).map((s) =>
                    api.getPdfSection({ uid: article.uid, doi: article.doi, pmcid: article.pmcid }, s)
                      .catch(() => null)
                  )
                );
                const combined = parts.filter(Boolean).map((p) => `## ${p!.section.toUpperCase()}\n${p!.text}`).join('\n\n');
                if (combined.length > textToAnalyze.length) {
                  textToAnalyze = combined;
                  setUsingFullText(true);
                }
              }
            } else {
              // Live PDF cascade
              const { url, isFree } = await api.findFullText(article.doi || '', { pmcid: article.pmcid });
              if (url && isFree) {
                const { text } = await api.extractPdfText(url);
                if (text && text.length > textToAnalyze.length) {
                  textToAnalyze = text;
                  setUsingFullText(true);
                }
              }
            }
          } catch (pdfErr) {
            if (import.meta.env.DEV) console.warn('PDF extraction failed, falling back to abstract:', pdfErr);
          }
        }

        let liveText = '';
        let finalResult: AnalysisResult | null = null;
        await new Promise<void>((resolve, reject) => {
          api.analyzeWithAIStream(textToAnalyze, { type: analysisType }, {
            onChunk: (chunk) => {
              liveText += chunk;
              if (reqId === requestIdRef.current) setStreamedText(liveText);
            },
            onResult: (streamResult) => {
              finalResult = streamResult;
            },
            onError: reject,
            onDone: resolve,
          });
        });
        if (reqId === requestIdRef.current) {
          setResult(finalResult || { result: liveText, timestamp: new Date().toISOString() });
        }
      } catch (err) {
        if (reqId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Analysis failed');
        }
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [article, selectedSection]
  );

  const extractPico = useCallback(async () => {
    if (!article) return;
    setLoading(true);
    setError(null);
    setPicoResult(null);
    try {
      const res = await api.extractSinglePico(article);
      setPicoResult(res.extraction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PICO extraction failed');
    } finally {
      setLoading(false);
    }
  }, [article]);

  // Auto-analyze on mount (parent keys this component by article uid)
  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await analyze('quick');
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = (t: AnalysisType) => {
    setIsPicoMode(false);
    setType(t);
    analyze(t);
  };

  const handlePicoMode = () => {
    setIsPicoMode(true);
    if (!picoResult) extractPico();
  };

  const handleLoadTables = async () => {
    if (!article) return;
    setShowTables(true);
    if (tables.length > 0) return;
    try {
      const data = await api.getPdfTables({ uid: article.uid, doi: article.doi, pmcid: article.pmcid });
      setTables(data.tables || []);
    } catch { /* no tables */ }
  };

  if (!article) return null;

  const { primaryUrl, primaryLabel } = getArticleLinkInfo(article);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <i className="fas fa-robot text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-gray-900 dark:text-white line-clamp-2">
              {article.title}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {article.source || article.journal} · {article.pubdate?.split(' ')[0] || article.year}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close analysis panel"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <ClinicalSafetyNotice
          className="px-6 pb-3 shrink-0 border-b border-gray-100 dark:border-slate-700"
          status={pdfStatus?.indexed ? 'source_verified' : 'abstract_only'}
        />

        <div className="flex border-b border-gray-100 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'analysis'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            AI analysis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collab')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'collab'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Team notes
          </button>
        </div>

        {activeTab === 'analysis' ? (
          <>
            <div className="flex gap-1 px-4 py-3 border-b border-gray-100 dark:border-slate-700 shrink-0 overflow-x-auto">
              {ANALYSIS_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    !isPicoMode && type === t.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <i className={`fas ${t.icon}`} />
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePicoMode}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isPicoMode
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                title="Extract PICO framework from this paper"
              >
                <i className="fas fa-table" />
                PICO
              </button>
            </div>

            {/* Section picker — shown when pre-indexed PDF is available */}
            {pdfStatus?.indexed && pdfStatus.sections && pdfStatus.sections.length > 0 && !isPicoMode && (
              <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 bg-emerald-50/60 dark:bg-emerald-950/20 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                    <i className="fas fa-file-pdf" /> Full Text
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedSection(null); analyze(type); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                      !selectedSection ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    }`}
                  >All</button>
                  {pdfStatus.sections.filter((s) => s in SECTION_LABELS).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSelectedSection(s); analyze(type); }}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                        selectedSection === s ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      }`}
                    >{SECTION_LABELS[s]}</button>
                  ))}
                  {pdfStatus.sections.some(() => true) && (
                    <button
                      type="button"
                      onClick={handleLoadTables}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-auto"
                    >
                      <i className="fas fa-table mr-1" />Tables
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-emerald-500 dark:text-emerald-600 mt-0.5">
                  {pdfStatus.wordCount?.toLocaleString()} words · {pdfStatus.numpages} pages · via {pdfStatus.source}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              {/* Tables view */}
              {showTables && !loading && (
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Extracted Tables</p>
                    <button type="button" onClick={() => setShowTables(false)} className="text-xs text-slate-400 hover:text-slate-600">✕ close</button>
                  </div>
                  {tables.length === 0 ? (
                    <p className="text-xs text-slate-400">No structured tables detected in this PDF.</p>
                  ) : tables.map((t, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                      {t.heading && <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">{t.heading}</p>}
                      <div className="overflow-x-auto p-2">
                        <table className="text-[10px] w-full">
                          <tbody>
                            {t.rows.map((row, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-2 py-1 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Streaming analysis...</p>
                </div>
              )}

              {streamedText && !isPicoMode && (
                <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-slate-300">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500">Live AI response</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{streamedText}</p>
                </div>
              )}

              {error && !loading && <AnalysisErrorState error={error} onRetry={() => analyze(type)} />}

              {isPicoMode && picoResult && !loading && (
                <div className="space-y-4">
                  <PicoCard pico={picoResult} />
                  <p className="text-[10px] text-gray-300 dark:text-gray-600">
                    PICO extracted by AI from abstract only. Verify against full text.
                  </p>
                </div>
              )}

              {!isPicoMode && result && !loading && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-indigo-500">Source grounding</p>
                    <p className="mt-1 leading-relaxed">
                      This answer is grounded in the selected article{usingFullText ? "'s full text" : "'s title and abstract"}. Verify claims against the primary source before using them in clinical or policy decisions.
                    </p>
                  </div>
                  {usingFullText && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit">
                      <i className="fas fa-file-pdf" />
                      {usingSection ? `Analyzed: ${SECTION_LABELS[usingSection] ?? usingSection}` : 'Analyzed Full Text'}
                    </div>
                  )}
                  {result.cached && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <i className="fas fa-bolt text-amber-400" />
                      Cached result
                    </div>
                  )}

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                      {result.result || result.summary}
                    </p>
                  </div>

                  {result.studyType && (
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">
                        <i className="fas fa-flask mr-1" />
                        {result.studyType}
                      </span>
                      {result.evidenceLevel && (
                        <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold">
                          <i className="fas fa-chart-bar mr-1" />
                          Level {result.evidenceLevel}
                        </span>
                      )}
                    </div>
                  )}

                  {result.clinicalImplications && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        Clinical Implications
                      </p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        {result.clinicalImplications}
                      </p>
                    </div>
                  )}

                  {result.disclaimer && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 p-3">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        <i className="fas fa-exclamation-triangle mr-1" />
                        {result.disclaimer}
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-300 dark:text-gray-600 text-right">
                    {result.provider} · {result.model}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 flex gap-3">
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-bold transition-colors"
              >
                <i className="fas fa-external-link-alt" />
                {primaryLabel}
              </a>
              {(article.isFree || article.pmcid) && (
                <a
                  href={
                    article.pmcid
                      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`
                      : article.fullTextUrl!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                >
                  <i className="fas fa-unlock" />
                  Read Free
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-900/50 min-h-0">
            {needsAuth && (
              <div className="shrink-0 mx-4 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                Team notes require a signed-in account. Use Register or Log in, then return here.
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {annotations.length === 0 && !needsAuth ? (
                <div className="text-center py-10">
                  <i className="fas fa-comments text-gray-300 text-3xl mb-2" />
                  <p className="text-sm text-gray-400">No team notes yet. Be the first to annotate!</p>
                </div>
              ) : annotations.length > 0 ? (
                annotations.map((ann, i) => (
                  <div
                    key={ann.id ?? i}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-600">{ann.user_name || 'Researcher'}</span>
                      <span className="text-[10px] text-gray-400">
                        {ann.created_at
                          ? new Date(ann.created_at).toLocaleTimeString()
                          : '—'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{ann.text}</p>
                  </div>
                ))
              ) : null}
            </div>
            {!needsAuth && (
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a clinical note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addAnnotation(newNote);
                      setNewNote('');
                    }
                  }}
                  className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  aria-label="Send note"
                  onClick={() => {
                    addAnnotation(newNote);
                    setNewNote('');
                  }}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center"
                >
                  <i className="fas fa-paper-plane" />
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
