import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoResultsState } from './NoResultsState';
import type { SearchFilters } from '@types';

/**
 * A user searched "Hepatorenal syndrome diagnosis and management" with OpenAlex
 * selected and the Guidelines template applied, and reported "nothing
 * happened". The search had run correctly and legitimately matched nothing --
 * but a zero-result search rendered SearchEmptyState, the cold-start panel of
 * example queries, so it was indistinguishable from the page resetting.
 */
const baseFilters: SearchFilters = {
    sources: ['openalex'],
    specificity: 'strict',
    studyTypes: ['"Practice Guideline"[Publication Type]'],
};

function renderState(over: Partial<SearchFilters> = {}, handlers = {}) {
    const onRelax = jest.fn();
    const onRetry = jest.fn();
    render(
        <NoResultsState
            query="Hepatorenal syndrome diagnosis and management"
            filters={{ ...baseFilters, ...over }}
            onRelax={onRelax}
            onRetry={onRetry}
            {...handlers}
        />,
    );
    return { onRelax, onRetry };
}

describe('NoResultsState', () => {
    it('says the search ran, rather than looking like nothing happened', () => {
        renderState();
        expect(screen.getByText(/No results for/i)).toBeInTheDocument();
        expect(screen.getByText(/Hepatorenal syndrome diagnosis and management/)).toBeInTheDocument();
        expect(screen.getByText(/ran successfully/i)).toBeInTheDocument();
    });

    it('names the filters that narrowed the search', () => {
        renderState();
        expect(screen.getByText('openalex')).toBeInTheDocument();
        expect(screen.getByText(/Strict matching/i)).toBeInTheDocument();
        // The raw PubMed syntax is unreadable; show the human label.
        expect(screen.getByText('Practice Guideline')).toBeInTheDocument();
    });

    it('explains that study-type filters need PubMed when it is not selected', () => {
        renderState();
        expect(screen.getByText(/only apply to PubMed/i)).toBeInTheDocument();
    });

    it('does not show the PubMed warning when PubMed is selected', () => {
        renderState({ sources: ['pubmed', 'openalex'] });
        expect(screen.queryByText(/only apply to PubMed/i)).not.toBeInTheDocument();
    });

    it('offers to add PubMed, and keeps the other sources', () => {
        const { onRelax } = renderState();
        fireEvent.click(screen.getByRole('button', { name: /Add PubMed/i }));
        expect(onRelax).toHaveBeenCalledWith(expect.objectContaining({
            sources: expect.arrayContaining(['openalex', 'pubmed']),
        }));
    });

    it('offers to broaden strict matching', () => {
        const { onRelax } = renderState();
        fireEvent.click(screen.getByRole('button', { name: /balanced matching/i }));
        expect(onRelax).toHaveBeenCalledWith(expect.objectContaining({ specificity: 'moderate' }));
    });

    it('offers to clear the study-type filter', () => {
        const { onRelax } = renderState();
        fireEvent.click(screen.getByRole('button', { name: /Clear study-type/i }));
        expect(onRelax).toHaveBeenCalledWith(expect.objectContaining({ studyTypes: [] }));
    });

    it('offers no relaxations when nothing is actually narrowing', () => {
        renderState({ specificity: 'moderate', studyTypes: [], sources: ['pubmed'] });
        expect(screen.queryByRole('button', { name: /Add PubMed/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /balanced matching/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Clear study-type/i })).not.toBeInTheDocument();
    });

    it('always offers a plain retry', () => {
        const { onRetry } = renderState();
        fireEvent.click(screen.getByRole('button', { name: /Search again/i }));
        expect(onRetry).toHaveBeenCalledWith('Hepatorenal syndrome diagnosis and management');
    });

    it('survives filters with nothing set', () => {
        render(<NoResultsState query="x" filters={{}} onRelax={jest.fn()} onRetry={jest.fn()} />);
        expect(screen.getByText(/No results for/i)).toBeInTheDocument();
    });
});
