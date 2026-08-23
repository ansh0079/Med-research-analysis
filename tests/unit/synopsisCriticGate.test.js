'use strict';

const { buildClaimGrounding, runSynopsisCritic } = require('../../server/services/synopsisGroundingService');

const ARTICLE = {
    uid: 'pubmed-1',
    title: 'Prone positioning in severe ARDS',
    abstract: 'Among 466 patients with severe ARDS, 28-day mortality was 16.0% in the prone group '
        + 'and 32.8% in the supine group. The difference was statistically significant.',
};

// Mirrors the gate now applied in paperSynopsisCore: error-severity ungrounded_number
// findings reject the synopsis rather than being surfaced as a soft warning.
function gate(synopsis, article = ARTICLE, abstractOnly = false) {
    const claimGrounding = buildClaimGrounding(synopsis, article);
    const critic = runSynopsisCritic(synopsis, { claimGrounding, abstractOnly });
    const ungrounded = (critic.findings || [])
        .filter((f) => f.severity === 'error' && f.code === 'ungrounded_number');
    return { critic, rejected: ungrounded.length > 0 };
}

describe('synopsis grounding gate', () => {
    test('passes a synopsis whose numbers come from the source', () => {
        const { rejected } = gate({
            bottomLine: 'Prone positioning reduced 28-day mortality from 32.8% to 16.0% [1].',
            mainFindings: 'Mortality was 16.0% with proning [1].',
            clinicalMeaning: 'Consider proning in severe ARDS [1].',
        });
        expect(rejected).toBe(false);
    });

    test('rejects a synopsis stating a number absent from the source', () => {
        const { rejected, critic } = gate({
            bottomLine: 'Prone positioning cut 28-day mortality from 44.1% to 7.3% [1].',
            mainFindings: 'Mortality was 7.3% with proning [1].',
            clinicalMeaning: 'Consider proning [1].',
        });
        expect(rejected).toBe(true);
        expect(critic.status).toBe('needs_revision');
        expect(critic.errorCount).toBeGreaterThan(0);
    });

    test('flags overclaiming language as a warning, not a rejection', () => {
        const { rejected, critic } = gate({
            bottomLine: 'This proves proning should always be standard of care [1].',
            mainFindings: 'Mortality was 16.0% with proning [1].',
            clinicalMeaning: 'Use proning [1].',
        });
        expect(rejected).toBe(false);
        expect(critic.findings.some((f) => f.code === 'possible_overclaim')).toBe(true);
    });

    test('marks abstract-only generation as info', () => {
        const { critic } = gate({
            bottomLine: 'Proning reduced mortality to 16.0% [1].',
            mainFindings: 'Mortality 16.0% [1].',
            clinicalMeaning: 'Consider proning [1].',
        }, ARTICLE, true);
        expect(critic.findings.some((f) => f.code === 'abstract_only')).toBe(true);
    });

    test('does not crash when the article carries no usable source text', () => {
        expect(() => gate({ bottomLine: 'Something [1].' }, { uid: 'x' })).not.toThrow();
    });
});
