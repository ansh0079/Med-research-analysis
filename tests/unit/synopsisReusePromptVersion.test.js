'use strict';

/**
 * The durable teaching_objects store is read through before any generation work
 * and keeps a synopsis for SYNOPSIS_REUSE_MAX_AGE_DAYS. It was keyed on article
 * id alone, so a prompt edit reached only articles nobody had opened yet.
 *
 * That is how the guideline synopsis reframing shipped and changed nothing: the
 * EASL/AGA guidelines a reader had already viewed kept returning the old
 * abstract summary, while the new prompt "worked" on anything freshly opened.
 * Prod held 3,765 stored synopses and not one recorded which prompt wrote it.
 *
 * Reuse now requires the recorded version to equal the current one. Rows with no
 * recorded version regenerate once -- deliberately, since their provenance is
 * unknown and this product's failure mode is serving stale evidence confidently.
 */

jest.mock('../../server/prompts/promptVersions', () => {
    const actual = jest.requireActual('../../server/prompts/promptVersions');
    return { ...actual, getPromptVersion: jest.fn(() => 'pv-current') };
});

const { getPromptVersion } = require('../../server/prompts/promptVersions');
const { findReusableStoredSynopsis } = require('../../server/services/ai/paperSynopsisCore');
const { buildPaperTeachingObject } = require('../../server/services/ai/teachingObjectService');

const storeReturning = (payload) => ({
    getTeachingObjectForArticle: jest.fn(async () => (payload ? { payload } : null)),
});

const storedRow = (overrides = {}) => ({
    kind: 'paper_teaching_object',
    generatedAt: new Date().toISOString(),
    promptVersion: 'pv-current',
    synopsis: { bottomLine: 'Terlipressin with albumin improves reversal of HRS-AKI.' },
    ...overrides,
});

describe('stored synopsis reuse is scoped to the prompt that wrote it', () => {
    beforeEach(() => getPromptVersion.mockReturnValue('pv-current'));

    test('reuses a synopsis written by the current prompt', async () => {
        const db = storeReturning(storedRow());
        await expect(findReusableStoredSynopsis(db, 'pmid:1')).resolves.toMatchObject({
            synopsis: { bottomLine: expect.stringContaining('Terlipressin') },
        });
    });

    test('does not reuse one written by a prompt that has since been edited', async () => {
        const db = storeReturning(storedRow({ promptVersion: 'pv-before-guideline-reframing' }));
        await expect(findReusableStoredSynopsis(db, 'pmid:1')).resolves.toBeNull();
    });

    test('does not reuse a row from before the version was recorded', async () => {
        // The 3,765 rows already in production. Unknown provenance, so regenerate.
        const { promptVersion: _omitted, ...noVersion } = storedRow();
        await expect(findReusableStoredSynopsis(storeReturning(noVersion), 'pmid:1')).resolves.toBeNull();
    });

    test('an edit to the prompt file invalidates what the previous one wrote', async () => {
        const db = storeReturning(storedRow({ promptVersion: 'pv-current' }));
        await expect(findReusableStoredSynopsis(db, 'pmid:1')).resolves.not.toBeNull();
        getPromptVersion.mockReturnValue('pv-after-an-edit');
        await expect(findReusableStoredSynopsis(db, 'pmid:1')).resolves.toBeNull();
    });

    test('the age gate still applies to a version-matched row', async () => {
        const old = storedRow({ generatedAt: new Date(Date.now() - 400 * 86400000).toISOString() });
        await expect(findReusableStoredSynopsis(storeReturning(old), 'pmid:1')).resolves.toBeNull();
    });

    test('a row with a synopsis but no usable timestamp is still rejected', async () => {
        const noStamp = storedRow({ generatedAt: null });
        await expect(findReusableStoredSynopsis(storeReturning(noStamp), 'pmid:1')).resolves.toBeNull();
    });
});

describe('what gets written carries its own provenance', () => {
    beforeEach(() => getPromptVersion.mockReturnValue('pv-current'));

    const built = (audit) => buildPaperTeachingObject({
        article: { uid: 'pmid:34274300', title: 'EASL guidelines on ascites', pmid: '34274300' },
        synopsisResult: {
            synopsis: { bottomLine: 'Recommendations for ascites management.', trustRating: 'HIGH' },
            timestamp: new Date().toISOString(),
            audit,
        },
        topic: 'ascites',
    });

    test('records the prompt version the synopsis was generated under', () => {
        expect(built({ promptVersion: 'pv-current' }).payload.promptVersion).toBe('pv-current');
    });

    test('records null rather than guessing when the generator did not report one', () => {
        // Guessing the current version here would forge provenance and make the
        // row look reusable when nothing knows what wrote it.
        expect(built({}).payload.promptVersion).toBeNull();
    });

    test('a freshly built object is reusable by the reader that will read it', async () => {
        // The round trip is the thing that actually matters: writer and reader
        // must agree on where the version lives in the payload.
        const { payload } = built({ promptVersion: 'pv-current' });
        await expect(findReusableStoredSynopsis(storeReturning(payload), 'pmid:34274300'))
            .resolves.not.toBeNull();
    });
});
