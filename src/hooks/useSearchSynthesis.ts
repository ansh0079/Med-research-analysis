import React from 'react';
import { api } from '@services/api';
import { logAsyncError } from '@utils/handleAsyncError';
import type { Article, SynthesisResult } from '@types';

interface UseSearchSynthesisInput {
  results: Article[];
  topArticles: Article[];
  currentQuery: string;
  isAuthenticated: boolean;
  betaOpenAccess: boolean;
}

export function useSearchSynthesis({
  results,
  topArticles,
  currentQuery,
  isAuthenticated,
  betaOpenAccess,
}: UseSearchSynthesisInput) {
  const [synthesis, setSynthesis] = React.useState<SynthesisResult | null>(null);
  const [synthesisLoading, setSynthesisLoading] = React.useState(false);
  const [synthesisError, setSynthesisError] = React.useState<string | null>(null);
  const [synthesisLiveText, setSynthesisLiveText] = React.useState('');
  const [stalenessBanner, setStalenessBanner] = React.useState<{ changes: string[]; priorGrade: string; newGrade: string } | null>(null);
  const requestIdRef = React.useRef(0);
  const activeStreamRef = React.useRef<{ cancel: () => void; settle: () => void } | null>(null);

  const cancelActiveStream = React.useCallback(() => {
    requestIdRef.current += 1;
    const active = activeStreamRef.current;
    activeStreamRef.current = null;
    active?.cancel();
    active?.settle();
  }, []);

  const resetSynthesis = React.useCallback(() => {
    cancelActiveStream();
    setSynthesis(null);
    setSynthesisError(null);
    setSynthesisLiveText('');
    setSynthesisLoading(false);
    setStalenessBanner(null);
  }, [cancelActiveStream]);

  React.useEffect(() => () => cancelActiveStream(), [cancelActiveStream]);

  const handleSynthesize = React.useCallback(async (): Promise<SynthesisResult | null> => {
    if (!results.length) return null;
    if (!isAuthenticated && !betaOpenAccess) {
      setSynthesisError('Sign in to use Evidence Synthesis');
      return null;
    }
    cancelActiveStream();
    const requestId = ++requestIdRef.current;
    setSynthesisLoading(true);
    setSynthesisError(null);
    setSynthesisLiveText('');
    try {
      let liveText = '';
      let finalResult: SynthesisResult | null = null;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const cancel = api.ai.synthesizeEvidenceStream(currentQuery, topArticles, {
          onChunk: (chunk) => {
            if (requestId !== requestIdRef.current) return;
            liveText += chunk;
            setSynthesisLiveText(liveText);
          },
          onResult: (result) => {
            if (requestId !== requestIdRef.current) return;
            finalResult = result;
          },
          onError: (error) => {
            if (requestId === requestIdRef.current) reject(error);
            else settle();
          },
          onDone: settle,
        });
        activeStreamRef.current = { cancel, settle };
      });
      if (requestId !== requestIdRef.current) return null;
      activeStreamRef.current = null;
      const resolved = finalResult as SynthesisResult | null;
      if (resolved) {
        setSynthesis(resolved);
        if (isAuthenticated && resolved.topic) {
          api.knowledge.getTopicStaleness(resolved.topic).then((s) => {
            if (requestId !== requestIdRef.current) return;
            if (s.significantChange && s.changes.length > 0) {
              setStalenessBanner({
                changes: s.changes,
                priorGrade: s.prior?.evidence_grade ?? '',
                newGrade: s.latest?.evidence_grade ?? '',
              });
            }
          }).catch((err) => logAsyncError(err, 'useSearchSynthesis/getTopicStaleness'));
        }
        return resolved;
      }
      return null;
    } catch (err) {
      if (requestId !== requestIdRef.current) return null;
      const msg = err instanceof Error ? err.message : 'Synthesis failed';
      if (msg === 'AUTH_REQUIRED') {
        setSynthesisError('Sign in to use Evidence Synthesis');
      } else if (msg.startsWith('UPGRADE_REQUIRED:')) {
        setSynthesisError('UPGRADE_REQUIRED:aiSynthesis');
      } else {
        setSynthesisError(msg);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        activeStreamRef.current = null;
        setSynthesisLoading(false);
      }
    }
    return null;
  }, [results.length, currentQuery, topArticles, isAuthenticated, betaOpenAccess, cancelActiveStream]);

  return {
    synthesis,
    setSynthesis,
    synthesisLoading,
    synthesisError,
    synthesisLiveText,
    stalenessBanner,
    setStalenessBanner,
    resetSynthesis,
    handleSynthesize,
  };
}
