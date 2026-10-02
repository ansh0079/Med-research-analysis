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

    const articles = [
      { uid: 'p1', title: 'Paper one' },
      { uid: 'p2', title: 'Paper two' },
    ] as Article[];
    const { result } = renderHook(() => useSearchSynthesis({
      results: articles,
      currentQuery: 'ARDS',
      isAuthenticated: true,
      betaOpenAccess: false,
    }));

    let request: Promise<SynthesisResult | null>;
    act(() => {
      request = result.current.handleSynthesize();
    });
    expect(api.ai.synthesizeEvidenceStream).toHaveBeenCalledWith(
      'ARDS',
      articles,
      expect.any(Object),
    );
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
