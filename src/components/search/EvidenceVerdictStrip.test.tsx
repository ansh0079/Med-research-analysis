import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { Article, GuidelineWorkspaceSummary } from '@types';

import { EvidenceVerdictStrip, formatCitation } from './EvidenceVerdictStrip';

/**
 * The search page already carries everything a decision needs, but measured on
 * production a 22-result page is ~59,000px tall with the guidelines ~27,000px
 * down. This strip is the part a clinician actually reads, so what it claims
 * has to be true -- particularly when coverage is thin, where silence would
 * read as "this is everything".
 */

const paper = (over: Partial<Article> = {}): Article => ({
    uid: 'u1',
    title: 'Terlipressin plus albumin for hepatorenal syndrome',
    authors: [{ name: 'Wong F' }, { name: 'Pappas SC' }],
    journal: 'N Engl J Med',
    year: 2021,
    pmid: '33657294',
    pubtype: ['Randomized Controlled Trial'],
    _source: 'pubmed',
    ...over,
} as Article);

/**
 * A realistic mix rather than 22 identical RCTs -- with a uniform set every
 * stat renders the same number and the assertions cannot tell the counters
 * apart (or which one is broken).
 */
const manyPapers = (n: number) => Array.from({ length: n }, (_, i) => paper({
    uid: `u${i}`,
    pmid: `${1000 + i}`,
    pubtype: i % 4 === 0 ? ['Systematic Review'] : i % 2 === 0 ? ['Randomized Controlled Trial'] : ['Journal Article'],
}));

const workspace = (over: Partial<GuidelineWorkspaceSummary> = {}): GuidelineWorkspaceSummary => ({
    query: 'topic',
    guidelines: [],
    loading: false,
    error: null,
    discoveryStatus: 'complete',
    documentCount: 0,
    recommendationCount: 0,
    reviewedRecommendationCount: 0,
    aiExtractedRecommendationCount: 0,
    newestYear: null,
    bodies: [],
    lastCheckedAt: null,
    ...over,
});

const renderStrip = (props: Omit<React.ComponentProps<typeof EvidenceVerdictStrip>, 'guidelineWorkspace'> & {
    guidelineWorkspace?: GuidelineWorkspaceSummary;
}) => {
    const { guidelineWorkspace, ...rest } = props;
    return render(<EvidenceVerdictStrip guidelineWorkspace={guidelineWorkspace || workspace()} {...rest} />);
};

beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

describe('EvidenceVerdictStrip', () => {
    it('renders nothing when there are no results to summarise', () => {
        const { container } = renderStrip({ query: 'x', results: [] });
        expect(container).toBeEmptyDOMElement();
    });

    it('leads with how much evidence there is', async () => {
        renderStrip({ query: 'hepatorenal syndrome', results: manyPapers(22) });
        expect(screen.getByText('22')).toBeInTheDocument();
        expect(screen.getByText('papers')).toBeInTheDocument();
        expect(screen.getByText('RCTs')).toBeInTheDocument();
    });

    it('shows guideline count and how current it is', async () => {
        renderStrip({
            query: 'hepatorenal syndrome',
            results: manyPapers(22),
            guidelineWorkspace: workspace({
            guidelines: [
                { id: 1, sourceBody: 'EASL', sourceYear: 2023, isIssuingBody: true },
                { id: 2, sourceBody: 'AASLD', sourceYear: 2025, isIssuingBody: true },
            ] as never,
            recommendationCount: 2,
            newestYear: 2025,
            bodies: ['EASL', 'AASLD'],
            }),
        });
        await waitFor(() => expect(screen.getByText(/guideline recommendations \(latest 2025\)/)).toBeInTheDocument());
        expect(screen.getByText(/EASL, AASLD/)).toBeInTheDocument();
    });

    it('trusts the pool-wide summary over the capped page', async () => {
        // "diagnosis and management of alcoholic hepatitis" returned a page of
        // journal rows while three NICE recommendations sat outside the cap --
        // the strip said "0 guideline recommendations" directly above a panel
        // listing them. The server's guidelineSummary counts the full pool, so
        // it leads when present.
        renderStrip({
            query: 'diagnosis and management of alcoholic hepatitis',
            results: manyPapers(20),
            guidelineWorkspace: workspace({
            guidelines: [
                { id: 1, sourceBody: 'World journal of transplantation', sourceYear: 2025, isIssuingBody: false },
            ] as never,
            recommendationCount: 3,
            bodies: ['NICE'],
            }),
        });

        await waitFor(() => expect(screen.getByText('guideline recommendations')).toBeInTheDocument());
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/NICE/)).toBeInTheDocument();
        expect(screen.queryByText(/World journal of transplantation/)).not.toBeInTheDocument();
    });

    it('says so plainly when coverage is thin, rather than implying completeness', async () => {
        renderStrip({ query: 'rare disease', results: manyPapers(2) });
        await waitFor(() => expect(screen.getByText(/Thin coverage/i)).toBeInTheDocument());
        expect(screen.getByText(/not necessarily all that exists/i)).toBeInTheDocument();
    });

    it('does not cry thin on a well-covered topic', async () => {
        renderStrip({ query: 'sepsis', results: manyPapers(22), guidelineWorkspace: workspace({ recommendationCount: 1, bodies: ['EASL'] }) });
        await waitFor(() => expect(screen.getByText(/guideline recommendations/)).toBeInTheDocument());
        expect(screen.queryByText(/Thin coverage/i)).not.toBeInTheDocument();
    });

    it('names a guideline paper in the results separately from stored recommendations', async () => {
        // A catatonia search reported "0 guidelines" while the BAP consensus
        // guideline sat second in the result list. The two numbers measure
        // different things -- recommendations attributed to an issuing body
        // versus a paper PubMed types as a guideline -- and showing only the
        // first read as a flat contradiction of what was on screen.
        const results = [
            ...manyPapers(6),
            paper({ uid: 'g1', pmid: '99', pubtype: ['Practice Guideline'] }),
        ];
        renderStrip({ query: 'catatonia', results, guidelineWorkspace: workspace({ documentCount: 1 }) });

        await waitFor(() => expect(screen.getByText('guideline recommendations')).toBeInTheDocument());
        expect(screen.getByText('guideline document in results')).toBeInTheDocument();
    });

    it('does not count a journal as a guideline body', async () => {
        // Production returns "Dig Dis Sci" and "Vnitr Lek" as the guideline
        // bodies for hepatorenal syndrome -- both journals. Showing those at the
        // top of the page puts a journal where a clinician expects EASL, which
        // is worse than showing nothing.
        renderStrip({
            query: 'hepatorenal syndrome',
            results: manyPapers(22),
            guidelineWorkspace: workspace({
            guidelines: [
                { id: 1, sourceBody: 'Dig Dis Sci', sourceYear: 2019, isIssuingBody: false },
                { id: 2, sourceBody: 'Vnitr Lek', sourceYear: 2018, isIssuingBody: false },
            ] as never,
            }),
        });

        await waitFor(() => expect(screen.getByText('guideline recommendations')).toBeInTheDocument());
        expect(screen.queryByText(/Dig Dis Sci|Vnitr Lek/)).not.toBeInTheDocument();
        expect(screen.queryByText(/latest 2019/)).not.toBeInTheDocument();
    });

    it('counts only the real issuing bodies in a mixed set', async () => {
        renderStrip({
            query: 'hepatorenal syndrome',
            results: manyPapers(22),
            guidelineWorkspace: workspace({
            guidelines: [
                { id: 1, sourceBody: 'EASL', sourceYear: 2018, isIssuingBody: true },
                { id: 2, sourceBody: 'Dig Dis Sci', sourceYear: 2023, isIssuingBody: false },
            ] as never,
            recommendationCount: 1,
            newestYear: 2018,
            bodies: ['EASL'],
            }),
        });

        // 2018 from EASL, not 2023 from the journal.
        await waitFor(() => expect(screen.getByText(/guideline recommendations \(latest 2018\)/)).toBeInTheDocument());
        expect(screen.getByText(/EASL/)).toBeInTheDocument();
        expect(screen.queryByText(/Dig Dis Sci/)).not.toBeInTheDocument();
    });

    it('surfaces trial-vs-guideline conflicts when there are any', () => {
        renderStrip({ query: 'x', results: manyPapers(10), conflictCount: 2 });
        expect(screen.getByText('trial vs guideline conflicts')).toBeInTheDocument();
    });

    it('hides the conflict stat rather than showing a reassuring zero', () => {
        // "0 conflicts" reads as "checked and clear", which is not what a null
        // conflictCount means -- it means synthesis has not run.
        renderStrip({ query: 'x', results: manyPapers(10), conflictCount: null });
        expect(screen.queryByText(/conflicts/)).not.toBeInTheDocument();
    });

    it('copies citations that can be pasted straight into a note', async () => {
        renderStrip({ query: 'hepatorenal syndrome', results: manyPapers(3) });
        fireEvent.click(screen.getByRole('button', { name: /Copy citations/i }));
        await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
        const copied = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
        expect(copied).toContain('hepatorenal syndrome');
        expect(copied).toContain('PMID:');
        expect(copied).toMatch(/^1\. /m);
    });
});

describe('formatCitation', () => {
    it('produces a citation with authors, journal, year and identifier', () => {
        expect(formatCitation(paper())).toBe(
            'Wong F, Pappas SC. Terlipressin plus albumin for hepatorenal syndrome. N Engl J Med. 2021. PMID: 33657294',
        );
    });

    it('marks truncation with et al. rather than silently dropping authors', () => {
        const many = paper({ authors: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] });
        expect(formatCitation(many)).toContain('A, B, C, et al.');
    });

    it('falls back to DOI when there is no PMID', () => {
        expect(formatCitation(paper({ pmid: undefined, doi: '10.1056/NEJMoa2008290' })))
            .toContain('doi:10.1056/NEJMoa2008290');
    });

    it('still produces something usable from a sparse record', () => {
        const bare = { uid: 'x', title: 'Untitled study', _source: 'openalex' } as Article;
        expect(formatCitation(bare)).toBe('Untitled study.');
    });
});
