import { act, renderHook } from '@testing-library/react';
import type { Article } from '@types';
import { useResultsFilter } from './useResultsFilter';

const papers = [
  { uid: 'a', title: 'Relevant first', _source: 'pubmed', year: 2020, citationCount: 20, _quality: { grade: 'B' } },
  { uid: 'b', title: 'Newest', _source: 'pubmed', year: 2025, citationCount: 5, _quality: { grade: 'C' } },
  { uid: 'c', title: 'Most cited', _source: 'pubmed', year: 2022, citationCount: 500, _quality: { grade: 'A' } },
] as Article[];

describe('useResultsFilter sorting', () => {
  it('keeps relevance order by default and supports shareable commercial sort choices', () => {
    const { result } = renderHook(() => useResultsFilter(papers));
    expect(result.current.visibleResults.map((paper) => paper.uid)).toEqual(['a', 'b', 'c']);
    act(() => result.current.setResultSort('newest'));
    expect(result.current.visibleResults.map((paper) => paper.uid)).toEqual(['b', 'c', 'a']);
    act(() => result.current.setResultSort('citations'));
    expect(result.current.visibleResults.map((paper) => paper.uid)).toEqual(['c', 'a', 'b']);
    act(() => result.current.setResultSort('quality'));
    expect(result.current.visibleResults.map((paper) => paper.uid)).toEqual(['c', 'a', 'b']);
  });
});
