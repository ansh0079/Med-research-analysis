'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    EvalSplitViolation,
    loadReleaseGateCases,
    describeDatasets,
    tuningFixtureFiles,
} = require('../../server/services/evalDatasetPolicy');

const PROVENANCE = {
    labelledBy: 'reviewer-1',
    labelledAt: '2026-09-20',
    source: 'clinician review of PubMed abstracts',
    intendedSense: 'pulmonary embolism',
};

function tempFixtures({ tuning = [], heldout = [], heldoutSplit = 'heldout' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-policy-'));
    const heldoutDir = path.join(root, 'heldout');
    fs.mkdirSync(heldoutDir);
    fs.writeFileSync(path.join(root, 'tuning.json'), JSON.stringify({ version: 1, split: 'tuning', queries: tuning }));
    fs.writeFileSync(path.join(heldoutDir, 'held.json'), JSON.stringify({ version: 1, split: heldoutSplit, queries: heldout }));
    return { fixtureDir: root, heldoutDir };
}

describe('eval dataset policy', () => {
    test('the repo fixtures are all declared tuning and none are loadable by the release gate', () => {
        const files = tuningFixtureFiles().map((f) => path.basename(f));
        expect(files).toEqual(expect.arrayContaining([
            'search-quality-gold.json',
            'search-quality-gold-expansion.json',
            'search-quality-gold-nl-clinical.json',
        ]));
        expect(loadReleaseGateCases().cases.every((c) => c.split === 'heldout')).toBe(true);
    });

    test('accepts a fully attributed held-out case that is not in any tuning fixture', () => {
        const dirs = tempFixtures({
            tuning: [{ query: 'sglt2 heart failure' }],
            heldout: [{ query: 'PE diagnosis in pregnancy', relevantUids: ['1'], provenance: PROVENANCE }],
        });
        const { cases } = loadReleaseGateCases(dirs);
        expect(cases).toHaveLength(1);
        expect(cases[0].split).toBe('heldout');
    });

    test('rejects a fixture in the held-out directory that is declared tuning', () => {
        const dirs = tempFixtures({ heldout: [], heldoutSplit: 'tuning' });
        expect(() => loadReleaseGateCases(dirs)).toThrow(EvalSplitViolation);
    });

    test('rejects a held-out case missing any provenance field', () => {
        for (const field of Object.keys(PROVENANCE)) {
            const provenance = { ...PROVENANCE, [field]: '' };
            const dirs = tempFixtures({ heldout: [{ query: 'aki staging', provenance }] });
            expect(() => loadReleaseGateCases(dirs)).toThrow(new RegExp(field));
        }
        const noProvenance = tempFixtures({ heldout: [{ query: 'aki staging' }] });
        expect(() => loadReleaseGateCases(noProvenance)).toThrow(EvalSplitViolation);
    });

    test('rejects held-out leakage: a query that also appears in a tuning fixture, however punctuated', () => {
        const dirs = tempFixtures({
            tuning: [{ query: 'SGLT2 inhibitors, heart failure' }],
            heldout: [{ query: 'sglt2 inhibitors heart failure', provenance: PROVENANCE }],
        });
        expect(() => loadReleaseGateCases(dirs)).toThrow(/tuning fixture/);
    });

    test('describeDatasets reports an empty held-out set without throwing, and surfaces invalid ones', () => {
        expect(describeDatasets(tempFixtures()).heldout).toMatchObject({ cases: 0, error: null });
        const bad = tempFixtures({ heldout: [{ query: 'x' }] });
        expect(describeDatasets(bad).heldout.error).toMatch(/provenance/);
    });
});
