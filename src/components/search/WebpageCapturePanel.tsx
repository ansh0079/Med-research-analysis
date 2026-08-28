import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@components/ui/Button';
import { useToast } from '@components/ui/Toast';
import { api } from '@services/api';
import type { WebpageInferenceResult } from '@services/api/ai';
import {
  buildSearchQueryFromWebpage,
  normalizeWebpageExtractionPayload,
  summarizeWebpageText,
  type WebpageExtractionPayload,
} from '@utils/webpageExtraction';

const REQUEST_TYPE = 'SIGNAL_MD_EXTRACT_PAGE';
const RESPONSE_TYPES = new Set(['SIGNAL_MD_WEBPAGE_EXTRACTED', 'signal-md:webpage-extracted']);

type ChromeTabsApi = {
  query?: (queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: Array<{ id?: number }>) => void) => void;
  sendMessage?: (tabId: number, message: unknown, callback: (response?: unknown) => void) => void;
};

type ChromeRuntimeApi = {
  lastError?: { message?: string };
};

type ChromeExtensionApi = {
  runtime?: ChromeRuntimeApi;
  tabs?: ChromeTabsApi;
};

type WindowWithChrome = Window & {
  chrome?: ChromeExtensionApi;
};

interface WebpageCapturePanelProps {
  onSearch: (query: string) => void;
  onUseAsCaseContext: (context: string) => void;
}

function isExtractionResponse(value: unknown): value is { ok?: boolean; payload?: Partial<WebpageExtractionPayload> } {
  return Boolean(value && typeof value === 'object' && 'payload' in value);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function compactCaseContext(payload: WebpageExtractionPayload): string {
  return [
    `Webpage: ${payload.title}`,
    payload.url ? `URL: ${payload.url}` : '',
    payload.description ? `Description: ${payload.description}` : '',
    payload.selectionText ? `Selected text: ${payload.selectionText}` : '',
    `Extracted text: ${payload.text.slice(0, 2500)}`,
  ].filter(Boolean).join('\n');
}

export const WebpageCapturePanel: React.FC<WebpageCapturePanelProps> = ({ onSearch, onUseAsCaseContext }) => {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<WebpageExtractionPayload | null>(null);
  const [inference, setInference] = useState<WebpageInferenceResult | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'capturing' | 'ready' | 'error'>('idle');
  const [inferStatus, setInferStatus] = useState<'idle' | 'inferring' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inferError, setInferError] = useState<string | null>(null);

  const extensionAvailable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const chrome = (window as WindowWithChrome).chrome;
    return Boolean(chrome?.tabs?.query && chrome.tabs.sendMessage);
  }, []);

  const ingestPayload = useCallback((data: Partial<WebpageExtractionPayload>, source: 'extension' | 'paste') => {
    const normalized = normalizeWebpageExtractionPayload(data);
    if (!normalized.text || normalized.wordCount < 8) {
      setStatus('error');
      setError('No readable page text was found.');
      return;
    }
    setPayload(normalized);
    setInference(null);
    setInferStatus('idle');
    setInferError(null);
    setStatus('ready');
    setError(null);
    showToast(source === 'extension' ? 'Webpage captured' : 'Webpage text analyzed', 'success', 2500);
  }, [showToast]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { type?: string; payload?: Partial<WebpageExtractionPayload> } | null;
      if (!data?.type || !RESPONSE_TYPES.has(data.type) || !data.payload) return;
      ingestPayload(data.payload, 'extension');
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ingestPayload]);

  const captureActiveTab = useCallback(async () => {
    const chrome = (window as WindowWithChrome).chrome;
    if (!chrome?.tabs?.query || !chrome.tabs.sendMessage) {
      setStatus('error');
      setError('Active tab capture is available inside the browser extension.');
      return;
    }
    setStatus('capturing');
    setError(null);
    const response = await new Promise<unknown>((resolve, reject) => {
      chrome.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          reject(new Error('No active tab was found.'));
          return;
        }
        chrome.tabs?.sendMessage?.(tabId, { type: REQUEST_TYPE }, (reply) => {
          const runtimeError = chrome.runtime?.lastError?.message;
          if (runtimeError) {
            reject(new Error(runtimeError));
            return;
          }
          resolve(reply);
        });
      });
    });
    if (isExtractionResponse(response) && response.payload) {
      ingestPayload(response.payload, 'extension');
      return;
    }
    setStatus('error');
    setError('The active tab did not return readable content.');
  }, [ingestPayload]);

  const analyzePastedText = useCallback(() => {
    ingestPayload({
      url: pasteUrl,
      title: safeHostname(pasteUrl) || 'Captured webpage',
      text: pasteText,
      headings: [],
      safetySignals: {
        hasForms: false,
        hasPasswordField: false,
        hasPaymentField: false,
        externalLinkCount: 0,
      },
    }, 'paste');
  }, [ingestPayload, pasteText, pasteUrl]);

  const runEvidenceSearch = useCallback(() => {
    if (!payload) return;
    const query = inference?.searchQuery || buildSearchQueryFromWebpage(payload);
    onSearch(query || payload.title);
  }, [inference, onSearch, payload]);

  const inferPage = useCallback(async () => {
    if (!payload) return;
    setInferStatus('inferring');
    setInferError(null);
    try {
      const result = await api.ai.inferWebpageContent(payload);
      setInference(result.inference);
      setInferStatus('ready');
      showToast('LLM inference complete', 'success', 2500);
    } catch (err) {
      setInferStatus('error');
      const message = err instanceof Error ? err.message : 'Page inference failed';
      setInferError(message);
      showToast(message, 'error', 5000);
    }
  }, [payload, showToast]);

  const sendToCaseContext = useCallback(() => {
    if (!payload) return;
    const inferredContext = inference
      ? [
          compactCaseContext(payload),
          '',
          `LLM inference: ${inference.plainLanguageSummary}`,
          inference.clinicalTopic ? `Clinical topic: ${inference.clinicalTopic}` : '',
          inference.caseScenarioSeed ? `Case seed: ${inference.caseScenarioSeed}` : '',
        ].filter(Boolean).join('\n')
      : compactCaseContext(payload);
    onUseAsCaseContext(inferredContext);
    showToast('Page context added to case workflow', 'success', 2500);
  }, [inference, onUseAsCaseContext, payload, showToast]);

  const copyContext = useCallback(async () => {
    if (!payload) return;
    await navigator.clipboard?.writeText(compactCaseContext(payload));
    showToast('Extracted page context copied', 'success', 2500);
  }, [payload, showToast]);

  const summary = payload ? summarizeWebpageText(payload.selectionText || payload.text, 2) : '';
  const safetyFlags = payload
    ? [
        payload.safetySignals.hasPasswordField ? 'login field' : null,
        payload.safetySignals.hasPaymentField ? 'payment field' : null,
        payload.safetySignals.hasForms ? 'forms present' : null,
      ].filter(Boolean)
    : [];

  const riskTone = inference?.safetyAssessment.riskLevel === 'high'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
    : inference?.safetyAssessment.riskLevel === 'medium'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';

  const evidenceTone = inference?.evidenceLevel === 'high'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
    : inference?.evidenceLevel === 'moderate'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
      : inference?.evidenceLevel === 'low'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live webpage capture</p>
          <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">Extract current page evidence</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Capture readable text, clinical signals, and safety markers from a browser tab, then turn it into evidence search or case context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={captureActiveTab}
            isLoading={status === 'capturing'}
            disabled={!extensionAvailable}
            leftIcon={<i className="fas fa-bolt text-[10px]" />}
            title={extensionAvailable ? 'Capture active tab' : 'Available when running as a browser extension'}
          >
            Capture tab
          </Button>
          {payload && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={inferPage}
                isLoading={inferStatus === 'inferring'}
                leftIcon={<i className="fas fa-brain text-[10px]" />}
              >
                Infer page
              </Button>
              <Button type="button" variant="gradient" size="sm" onClick={runEvidenceSearch} leftIcon={<i className="fas fa-search text-[10px]" />}>
                Search evidence
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={sendToCaseContext} leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>
                Case context
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-2">
          <input
            value={pasteUrl}
            onChange={(event) => setPasteUrl(event.target.value)}
            placeholder="https://example.org/article"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Paste webpage text or selected passage"
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={analyzePastedText}
              disabled={pasteText.trim().length < 20}
              leftIcon={<i className="fas fa-wand-magic-sparkles text-[10px]" />}
            >
              Analyze text
            </Button>
            {payload && (
              <Button type="button" variant="ghost" size="sm" onClick={copyContext} leftIcon={<i className="fas fa-copy text-[10px]" />}>
                Copy context
              </Button>
            )}
            {error && <span className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</span>}
            {inferError && <span className="text-xs font-semibold text-red-600 dark:text-red-300">{inferError}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          {payload ? (
            <div className="space-y-3">
              <div>
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">{payload.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{payload.url || payload.siteName || 'Local capture'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                  {payload.wordCount} words
                </span>
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                  {payload.readingTimeMinutes} min read
                </span>
                {safetyFlags.length > 0 && (
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 shadow-sm dark:bg-amber-950/40 dark:text-amber-200">
                    {safetyFlags.join(', ')}
                  </span>
                )}
              </div>
              {payload.medicalSignals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {payload.medicalSignals.map((signal) => (
                    <span key={signal} className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                      {signal}
                    </span>
                  ))}
                </div>
              )}
              {payload.keywords.length > 0 && (
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Keywords:</span> {payload.keywords.slice(0, 10).join(', ')}
                </p>
              )}
              {summary && <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{summary}</p>}
              {inference && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
                      {inference.pageType.replace(/_/g, ' ')}
                    </span>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${evidenceTone}`}>
                      evidence {inference.evidenceLevel}
                    </span>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${riskTone}`}>
                      risk {inference.safetyAssessment.riskLevel}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {Math.round(inference.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{inference.plainLanguageSummary}</p>
                  {(inference.pico.population || inference.pico.intervention || inference.pico.comparison || inference.pico.outcomes.length > 0) && (
                    <div className="grid gap-2 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                      <p><span className="font-bold">P:</span> {inference.pico.population || 'not clear'}</p>
                      <p><span className="font-bold">I:</span> {inference.pico.intervention || 'not clear'}</p>
                      <p><span className="font-bold">C:</span> {inference.pico.comparison || 'not clear'}</p>
                      <p><span className="font-bold">O:</span> {inference.pico.outcomes.join(', ') || 'not clear'}</p>
                    </div>
                  )}
                  {inference.keyClaims.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visible claims</p>
                      <ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {inference.keyClaims.slice(0, 3).map((claim) => <li key={claim}>- {claim}</li>)}
                      </ul>
                    </div>
                  )}
                  {(inference.redFlags.length > 0 || inference.safetyAssessment.concerns.length > 0 || inference.safetyAssessment.privacyWarning) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      {[...inference.redFlags, ...inference.safetyAssessment.concerns, inference.safetyAssessment.privacyWarning]
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(' ')}
                    </div>
                  )}
                  {inference.mcqFocus.length > 0 && (
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-600 dark:text-slate-300">MCQ focus:</span> {inference.mcqFocus.slice(0, 5).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center text-center">
              <div>
                <i className="fas fa-file-lines text-2xl text-slate-300 dark:text-slate-700" />
                <p className="mt-2 text-xs font-semibold text-slate-400">No page captured yet</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
