import type { Article, SynthesisResult } from '@types';
import { resolveSynthesisArticles } from './synthesisSources';

describe('resolveSynthesisArticles', () => {
  test('uses the server study order so displayed citations map to the generated synopsis', () => {
    const available = [
      { uid: 'weaker', title: 'Weaker paper' },
      { uid: 'strongest', title: 'Strongest paper', _ebmScore: 10 },
    ] as Article[];
    const result = {
      articleCount: 2,
      sources: [
        { studyIndex: 2, uid: 'weaker', title: 'Weaker paper' },
        { studyIndex: 1, uid: 'strongest', title: 'Strongest paper' },
      ],
    } as SynthesisResult;

    expect(resolveSynthesisArticles(result, available).map((article) => article.uid))
      .toEqual(['strongest', 'weaker']);
  });

  test('keeps a source visible when it is absent from the current client result list', () => {
    const result = {
      articleCount: 1,
      sources: [{
        studyIndex: 1,
        uid: 'cached-source',
        title: 'Cached source',
        pmid: '123',
        source: 'BMJ',
        pubdate: '2025',
      }],
    } as SynthesisResult;

    expect(resolveSynthesisArticles(result, [])).toEqual([
      expect.objectContaining({ uid: 'cached-source', title: 'Cached source', pmid: '123', source: 'BMJ' }),
    ]);
  });
});
