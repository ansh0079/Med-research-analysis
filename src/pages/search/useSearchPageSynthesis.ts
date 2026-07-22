import { useCallback, useState } from 'react';
import { api } from '@services/api';
import type { Article, SynthesisResult } from '@types';
import { logAsyncError } from '@utils/handleAsyncError';

interface UseSearchPageSynthesisOptions {
  currentQuery: string;
  top5Articles: Article[];
  results: Article[];
  isAuthenticated: boolean;
  betaOpenAccess: boolean;
}

/** Evidence synthesis uses the full bouquet (up to 12), not a hard top-5. */
export function useSearchPageSynthesis({
  currentQuery,
  top5Articles,
  results,
  isAuthenticated,
  betaOpenAccess,
}: UseSearchPageSynthesisOptions) {
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisLiveText, setSynthesisLiveText] = useState('');
  const [stalenessBanner, setStalenessBanner] = useState<{ changes: string[]; priorGrade: string; newGrade: string } | null>(null);

  const handleSynthesize = useCallback(async (): Promise<SynthesisResult | null> => {
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
        api.ai.synthesizeEvidenceStream(currentQuery, top5Articles, {
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
        // Check for evidence shift vs prior synthesis for this topic
        if (isAuthenticated && resolved.topic) {
          api.knowledge.getTopicStaleness(resolved.topic).then((s) => {
            if (s.significantChange && s.changes.length > 0) {
              setStalenessBanner({
                changes: s.changes,
                priorGrade: s.prior?.evidence_grade ?? '',
                newGrade: s.latest?.evidence_grade ?? '',
              });
            }
          }).catch((err) => logAsyncError(err, 'useSearchPageSynthesis/getTopicStaleness'));
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
  }, [results, top5Articles, currentQuery, isAuthenticated, betaOpenAccess]);

  return {
    synthesis,
    synthesisLoading,
    synthesisError,
    synthesisLiveText,
    stalenessBanner,
    setSynthesis,
    setSynthesisError,
    setSynthesisLiveText,
    setStalenessBanner,
    handleSynthesize,
  };
}
