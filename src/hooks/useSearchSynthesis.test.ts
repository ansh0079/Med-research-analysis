import { act, renderHook } from '@testing-library/react';
import { api } from '@services/api';
import { useSearchSynthesis } from './useSearchSynthesis';
import type { Article, SynthesisResult } from '@types';

describe('useSearchSynthesis', () => {
  test('ignores a completed stream after synthesis is reset', async () => {
    const streams: Array<{
      onResult?: (result: SynthesisResult) => void;
      onDone?: () => void;
    }> = [];
    const cancel = jest.fn();
    (api.ai.synthesizeEvidenceStream as jest.Mock).mockImplementation((_topic, _articles, callbacks) => {
      streams.push(callbacks);
      return cancel;
    });

    const article = { uid: 'p1', title: 'Paper' } as Article;
    const { result } = renderHook(() => useSearchSynthesis({
      results: [article],
      topArticles: [article],
      currentQuery: 'ARDS',
      isAuthenticated: true,
      betaOpenAccess: false,
    }));

    let request: Promise<SynthesisResult | null>;
    act(() => {
      request = result.current.handleSynthesize();
    });
    act(() => {
      result.current.resetSynthesis();
      streams[0].onResult?.({ topic: 'ARDS', synthesis: { clinicalBottomLine: 'Stale result' } } as unknown as SynthesisResult);
      streams[0].onDone?.();
    });
    await act(async () => { await request!; });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.current.synthesis).toBeNull();
    expect(result.current.synthesisLoading).toBe(false);
  });
});
