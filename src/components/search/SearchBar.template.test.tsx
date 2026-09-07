import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { DataSource } from '@types';

// useAnalytics reads import.meta.env, which Jest cannot parse. Mock it before
// importing SearchBar so the module graph stays loadable under the test runner.
jest.mock('@hooks/useAnalytics', () => ({
    useAnalytics: () => ({ trackSearch: jest.fn(), trackEvent: jest.fn() }),
}));

import { SearchBar } from './SearchBar';

/**
 * Every query template's studyTypes are PubMed publication-type syntax
 * ('"Practice Guideline"[Publication Type]'), which no other source
 * understands. A user applied the Guidelines template with only OpenAlex
 * selected: it set specificity to strict and a filter nothing could honour, so
 * the search returned zero results and looked broken. Choosing a template is an
 * implicit request for the source that can apply it.
 */
function renderBar(sources: DataSource[]) {
    const onSourcesChange = jest.fn();
    const onSearch = jest.fn();
    const onStudyTypesChange = jest.fn();
    const onSpecificityChange = jest.fn();
    render(
        <SearchBar
            onSearch={onSearch}
            value="hepatorenal syndrome"
            onChange={() => {}}
            sources={sources}
            onSourcesChange={onSourcesChange}
            onStudyTypesChange={onStudyTypesChange}
            onSpecificityChange={onSpecificityChange}
        />,
    );
    return { onSourcesChange, onSearch, onStudyTypesChange, onSpecificityChange };
}

describe('query templates and source selection', () => {
    it('adds PubMed when a template is applied without it', () => {
        const { onSourcesChange } = renderBar(['openalex']);
        fireEvent.click(screen.getByRole('button', { name: /Guidelines/i }));
        expect(onSourcesChange).toHaveBeenCalledWith(['openalex', 'pubmed']);
    });

    it('keeps the sources the user already chose', () => {
        // Adding PubMed must not silently drop their selection.
        const { onSourcesChange } = renderBar(['openalex', 'crossref']);
        fireEvent.click(screen.getByRole('button', { name: /Guidelines/i }));
        expect(onSourcesChange).toHaveBeenCalledWith(['openalex', 'crossref', 'pubmed']);
    });

    it('does not touch sources when PubMed is already selected', () => {
        const { onSourcesChange } = renderBar(['pubmed', 'openalex']);
        fireEvent.click(screen.getByRole('button', { name: /Guidelines/i }));
        expect(onSourcesChange).not.toHaveBeenCalled();
    });

    it('still applies the template filters it always did', () => {
        const { onStudyTypesChange, onSpecificityChange, onSearch } = renderBar(['openalex']);
        fireEvent.click(screen.getByRole('button', { name: /Guidelines/i }));
        expect(onStudyTypesChange).toHaveBeenCalledWith(['"Practice Guideline"[Publication Type]']);
        expect(onSpecificityChange).toHaveBeenCalledWith('strict');
        expect(onSearch).toHaveBeenCalled();
    });

    it('applies to every template, not just Guidelines', () => {
        // All four carry PubMed publication-type syntax.
        for (const label of [/Therapy evidence/i, /Harms/i, /Reviews/i]) {
            // Unmount between iterations; RTL only auto-cleans between tests, so
            // otherwise each render stacks another copy of every template button.
            cleanup();
            const { onSourcesChange } = renderBar(['openalex']);
            fireEvent.click(screen.getByRole('button', { name: label }));
            expect(onSourcesChange).toHaveBeenCalledWith(['openalex', 'pubmed']);
        }
    });
});
