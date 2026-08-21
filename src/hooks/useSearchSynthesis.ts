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

  const resetSynthesis = React.useCallback(() => {
    setSynthesis(null);
    setSynthesisError(null);
    setSynthesisLiveText('');
  }, []);

  const handleSynthesize = React.useCallback(async (): Promise<SynthesisResult | null> => {
    if (!results.length) return null;
    if (!isAuthenticated && !betaOpenAccess) {
      setSynthesisError('Sign in to use Evidence Synthesis');
      return null;
    }
    setSynthesisLoading(true);
    setSynthesisError(null);
    setSynthesisLiveText('');
    try {
      let liveText = '';
      let finalResult: SynthesisResult | null = null;
      await new Promise<void>((resolve, reject) => {
        api.ai.synthesizeEvidenceStream(currentQuery, topArticles, {
          onChunk: (chunk) => {
            liveText += chunk;
            setSynthesisLiveText(liveText);
          },
          onResult: (result) => {
            finalResult = result;
          },
          onError: reject,
          onDone: resolve,
        });
      });
      const resolved = finalResult as SynthesisResult | null;
      if (resolved) {
        setSynthesis(resolved);
        if (isAuthenticated && resolved.topic) {
          api.knowledge.getTopicStaleness(resolved.topic).then((s) => {
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
      const msg = err instanceof Error ? err.message : 'Synthesis failed';
      if (msg === 'AUTH_REQUIRED') {
        setSynthesisError('Sign in to use Evidence Synthesis');
      } else if (msg.startsWith('UPGRADE_REQUIRED:')) {
        setSynthesisError('UPGRADE_REQUIRED:aiSynthesis');
      } else {
        setSynthesisError(msg);
      }
    } finally {
      setSynthesisLoading(false);
    }
    return null;
  }, [results.length, currentQuery, topArticles, isAuthenticated, betaOpenAccess]);

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
