'use strict';

/**
 * Editing a prompt template invalidated the in-memory cache but not the durable
 * job store, so prompt edits appeared to work while silently doing nothing for
 * every article that had already been generated.
 *
 * Found via the guideline synopsis reframing: synopsis.js was rewritten to ask a
 * guideline for its recommendations instead of appraising it as a trial, the
 * change deployed, and the AGA ascites guideline still returned the old abstract
 * summary. getOrEnqueuePaperSynopsis checks db.getAiGenerationJobByKey first and
 * returns existing.resultPayload before any prompt-version-aware code runs, so
 * the stale row wins forever.
 *
 * The mechanism to prevent this already existed and was already correct --
 * getPromptVersion() hashes the prompt source file, and every *cache* key
 * includes it. The two kinds of key sat next to each other in one file:
 * buildSynthesisCacheKey included pv, buildFullSynthesisJobKey did not. The
 * failure is invisible because new articles do get the new prompt; only the
 * already-generated ones are frozen, which is exactly the set you don't re-test.
 *
 * Cost of the fix is a one-off regeneration of stored output whenever a prompt
 * file changes. That is the intended trade: stale evidence summaries are worse
 * than the regeneration spend.
 */

jest.mock('../../server/prompts/promptVersions', () => {
    const actual = jest.requireActual('../../server/prompts/promptVersions');
    return { ...actual, getPromptVersion: jest.fn(() => 'pv-original') };
});

const { getPromptVersion } = require('../../server/prompts/promptVersions');
const {
    consensusJobKey,
    liveClinicalAnswerJobKey,
    fullSynthesisJobKey,
    paperSynopsisJobKey,
    quizPrefetchJobKey,
} = require('../../server/services/ai/aiGenerationJobService');

const articles = [{ uid: 'pmid:1' }, { uid: 'pmid:2' }];
const guideline = { uid: 'pmid:34274300', title: 'EASL guidelines on ascites' };

/** Same arguments, different prompt file contents. */
const acrossPromptVersions = (buildKey) => {
    getPromptVersion.mockReturnValue('pv-original');
    const before = buildKey();
    getPromptVersion.mockReturnValue('pv-edited');
    const after = buildKey();
    return { before, after };
};

describe('durable job keys track the prompt that produced the result', () => {
    afterEach(() => getPromptVersion.mockReturnValue('pv-original'));

    test.each([
        ['paper synopsis', () => paperSynopsisJobKey(guideline, 'gemini-2.5-flash')],
        ['full synthesis', () => fullSynthesisJobKey('ascites', articles)],
        ['consensus synopsis', () => consensusJobKey('ascites', articles)],
        ['live clinical answer', () => liveClinicalAnswerJobKey('ascites', articles)],
        ['quiz prefetch', () => quizPrefetchJobKey('ascites')],
    ])('a %s generated under an old prompt is not reused under a new one', (_label, buildKey) => {
        const { before, after } = acrossPromptVersions(buildKey);
        expect(after).not.toBe(before);
    });

    test.each([
        ['paper synopsis', () => paperSynopsisJobKey(guideline, 'gemini-2.5-flash')],
        ['full synthesis', () => fullSynthesisJobKey('ascites', articles)],
        ['consensus synopsis', () => consensusJobKey('ascites', articles)],
        ['live clinical answer', () => liveClinicalAnswerJobKey('ascites', articles)],
        ['quiz prefetch', () => quizPrefetchJobKey('ascites')],
    ])('a %s is still reused when nothing changed', (_label, buildKey) => {
        // The point of the store is reuse; versioning must not defeat it.
        expect(buildKey()).toBe(buildKey());
    });

    test('the prompt version is legible in the key, not only folded into the hash', () => {
        // Worth the extra characters: it makes "which prompt produced this row?"
        // answerable with a LIKE against job_key, which is how the original bug
        // was eventually diagnosed.
        expect(paperSynopsisJobKey(guideline, 'gemini-2.5-flash')).toContain(':pv:pv-original');
    });

    test('keys still distinguish their inputs', () => {
        expect(paperSynopsisJobKey(guideline, 'gemini-2.5-flash'))
            .not.toBe(paperSynopsisJobKey({ uid: 'pmid:999' }, 'gemini-2.5-flash'));
        expect(fullSynthesisJobKey('ascites', articles))
            .not.toBe(fullSynthesisJobKey('hepatorenal syndrome', articles));
    });

    test('each job type stays in its own namespace', () => {
        const keys = [
            paperSynopsisJobKey(guideline, 'gemini-2.5-flash'),
            fullSynthesisJobKey('ascites', articles),
            consensusJobKey('ascites', articles),
            liveClinicalAnswerJobKey('ascites', articles),
            quizPrefetchJobKey('ascites'),
        ];
        expect(new Set(keys.map((k) => k.split(':')[0])).size).toBe(keys.length);
    });
});
