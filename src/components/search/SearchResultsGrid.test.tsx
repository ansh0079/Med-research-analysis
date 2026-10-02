import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Article } from '@types';
import { SearchResultsGrid, sectionsInServedOrder } from './SearchResultsGrid';

function paper(uid: string, title: string, lane: Article['_evidenceLane']): Article {
  return { uid, title, _evidenceLane: lane } as Article;
}

describe('sectionsInServedOrder', () => {
  it('keeps the search ranking when the best lane is not guidelines', () => {
    const articles = [
      paper('trial', 'STOPAH corticosteroids', 'landmark_trials'),
      paper('review', 'Severe alcoholic hepatitis review', 'reviews'),
      paper('guide', 'AASLD guidance', 'guidelines'),
    ];
    const sections = sectionsInServedOrder(articles);
    expect(sections.map((section) => section.lane)).toEqual(['landmark_trials', 'reviews', 'guidelines']);
    expect(sections[0].articles[0].title).toBe('STOPAH corticosteroids');
  });
});

describe('SearchResultsGrid', () => {
  it('renders the first ranked paper before a later guideline', () => {
    render(
      <MemoryRouter>
      <SearchResultsGrid
        layout="list"
        isPdfOpen={false}
        onToggleLayout={() => {}}
        onClosePdf={() => {}}
        activePdf={null}
        renderedResults={[
          paper('trial', 'STOPAH corticosteroids', 'landmark_trials'),
          paper('guide', 'AASLD guidance', 'guidelines'),
        ]}
        evidenceLane="all"
        activeResultIndex={-1}
        visibleCount={2}
        visibleResultsLength={2}
        onLoadMore={() => {}}
        isSaved={() => false}
        isSelected={() => false}
        onSave={() => {}}
        onSelect={() => {}}
        onAnalyze={() => {}}
        onGenerateCase={() => {}}
        onQuizPaper={() => {}}
        onOpenTopic={() => {}}
        onOpenInWorkspace={() => {}}
        onViewDetails={() => {}}
      />
      </MemoryRouter>,
    );
    const titles = screen.getAllByRole('link').map((link) => link.textContent);
    expect(titles[0]).toBe('STOPAH corticosteroids');
    expect(titles.indexOf('STOPAH corticosteroids')).toBeLessThan(titles.indexOf('AASLD guidance'));
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings[0]).toMatch(/Landmark trials/);
    expect(headings[1]).toMatch(/Guidelines/);
  });
});
