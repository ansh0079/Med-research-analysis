import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Article } from '@types';

// useAnalytics reads import.meta.env, which Jest cannot parse.
jest.mock('@hooks/useAnalytics', () => ({
    useAnalytics: () => ({ trackSearch: jest.fn(), trackEvent: jest.fn() }),
}));

import { SearchHero } from './SearchHero';

/**
 * The hero measured 3,292px on production and stayed that tall after a search,
 * so <main> -- and therefore every paper, guideline and conflict -- started
 * below y=3,250. Three screens of branding before any evidence.
 *
 * These guard the collapse itself rather than the styling: the search box has
 * to survive it (you must be able to search again), and the pre-search
 * affordances have to actually go away, or nothing is saved.
 */

const paper = (i: number): Article => ({
    uid: `u${i}`, title: `Paper ${i}`, _source: 'pubmed',
} as Article);

const baseProps = {
    showVerifyBanner: false,
    onSearch: jest.fn(),
    searchQuery: '',
    onSearchQueryChange: jest.fn(),
    recentSearches: [],
    loading: false,
    filters: { sources: ['pubmed'], specificity: 'moderate' },
    setFilters: jest.fn(),
    vectorSearchEnabled: false,
    searchHistory: [],
    shiftPresentation: '',
    setShiftPresentation: jest.fn(),
    scenarioExtract: null,
    shiftLaneLoading: false,
    runShiftFastLane: jest.fn(),
    currentQuery: '',
    topicGuideStatus: 'idle',
    topicGuideRefreshState: 'idle',
    topicGuideRefreshError: null,
    runTopicGuideRefresh: jest.fn(),
    isAuthenticated: false,
    error: null,
    results: [],
    inPlaceQuizExpanded: false,
    setInPlaceQuizExpanded: jest.fn(),
    trackFeatureUsage: jest.fn(),
    openGuidelineFromWorkflow: jest.fn(),
    openCaseFromWorkflow: jest.fn(),
} as unknown as React.ComponentProps<typeof SearchHero>;

const renderHero = (results: Article[]) => render(<SearchHero {...baseProps} results={results} />);

describe('SearchHero before a search', () => {
    it('shows the full hero', () => {
        renderHero([]);
        expect(screen.getByText(/Synthesised by AI/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/I saw this patient today/i)).toBeInTheDocument();
    });
});

describe('SearchHero once results exist', () => {
    it('drops the branding that pushed the evidence off-screen', () => {
        renderHero([paper(1)]);
        expect(screen.queryByText(/Synthesised by AI/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/PubMed · Semantic Scholar/i)).not.toBeInTheDocument();
    });

    it('keeps the search box, so the next question can still be asked', () => {
        renderHero([paper(1)]);
        expect(screen.getByPlaceholderText(/SGLT2 inhibitors/i)).toBeInTheDocument();
    });

    it('collapses the patient-presentation box instead of deleting the feature', () => {
        renderHero([paper(1)]);
        expect(screen.queryByLabelText(/I saw this patient today/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /I saw this patient today/i }));
        expect(screen.getByLabelText(/I saw this patient today/i)).toBeInTheDocument();
    });

    it('keeps the workflow actions reachable', () => {
        renderHero([paper(1)]);
        expect(screen.getByRole('button', { name: /Guideline check/i })).toBeInTheDocument();
    });

    it('collapses on the first result, not only on a full page of them', () => {
        for (const n of [1, 5, 20]) {
            cleanup();
            renderHero(Array.from({ length: n }, (_, i) => paper(i)));
            expect(screen.queryByText(/Synthesised by AI/i)).not.toBeInTheDocument();
        }
    });
});
