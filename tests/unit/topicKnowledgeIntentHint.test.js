const { intentHintFromDistribution } = require('../../server/services/topic/topicKnowledgeExtraction');
const { buildTopicKnowledgePrompt } = require('../../server/prompts/knowledge');

describe('intentHintFromDistribution', () => {
    // This helper was imported from ../aiService, which never exported it. Every
    // call to extractAndUpsertTopicKnowledge threw "intentHintFromDistribution is
    // not a function" before reaching the AI -- on both the cron and route paths.
    // The suite stayed green because topicRefreshScheduler.test.js mocks the whole
    // extraction function, so nothing ever loaded the real one.
    test('is actually exported as a function', () => {
        expect(typeof intentHintFromDistribution).toBe('function');
    });

    test('returns the intent with the highest count', () => {
        expect(intentHintFromDistribution([
            { intent: 'diagnosis', count: 3 },
            { intent: 'management', count: 11 },
            { intent: 'prognosis', count: 7 },
        ])).toBe('management');
    });

    test('does not assume the distribution is pre-sorted', () => {
        expect(intentHintFromDistribution([
            { intent: 'first', count: 1 },
            { intent: 'second', count: 99 },
        ])).toBe('second');
    });

    test('returns null for empty, missing, or malformed input', () => {
        expect(intentHintFromDistribution([])).toBeNull();
        expect(intentHintFromDistribution(undefined)).toBeNull();
        expect(intentHintFromDistribution(null)).toBeNull();
        expect(intentHintFromDistribution('management')).toBeNull();
    });

    test('ignores entries with no intent or a non-positive count', () => {
        expect(intentHintFromDistribution([
            { intent: '', count: 100 },
            { intent: '   ', count: 50 },
            { intent: 'zero', count: 0 },
            { intent: 'negative', count: -5 },
            { intent: 'real', count: 1 },
        ])).toBe('real');
    });

    test('returns null when every entry is unusable rather than picking one', () => {
        expect(intentHintFromDistribution([
            { intent: 'zero', count: 0 },
            { count: 9 },
        ])).toBeNull();
    });
});

describe('buildTopicKnowledgePrompt intent weighting', () => {
    const articles = [{ uid: 'u1', title: 'A paper', abstract: 'Abstract text' }];

    test('includes the intent line when a hint is supplied', () => {
        const prompt = buildTopicKnowledgePrompt('sepsis', articles, {}, null, { intentHint: 'management' });
        expect(prompt).toContain('DOMINANT LEARNER INTENT');
        expect(prompt).toContain('"management"');
    });

    test('omits the intent line entirely when there is no usage signal', () => {
        for (const options of [{}, { intentHint: null }, { intentHint: '   ' }]) {
            expect(buildTopicKnowledgePrompt('sepsis', articles, {}, null, options))
                .not.toContain('DOMINANT LEARNER INTENT');
        }
    });

    test('still asks for the same JSON output shape with the hint present', () => {
        const withHint = buildTopicKnowledgePrompt('sepsis', articles, {}, null, { intentHint: 'diagnosis' });
        expect(withHint).toContain('"mentorMessage"');
        expect(withHint).toContain('"seminalPapers"');
    });
});

describe('topic knowledge provider fallback', () => {
    // Prod had a funded Gemini key and an out-of-credit Anthropic key. Because
    // this path resolved a single provider up front, every topic refresh died on
    // "Your credit balance is too low" instead of falling through to Gemini.
    const { getProviderCandidates } = require('../../server/utils/aiProvider');

    test('offers Gemini as a fallback when both keys are present', () => {
        const candidates = getProviderCandidates({}, { keys: { anthropic: 'a', gemini: 'g' } });
        expect(candidates.map((c) => c.provider)).toEqual(['claude', 'gemini']);
    });

    test('still returns Gemini alone when Anthropic is unconfigured', () => {
        const candidates = getProviderCandidates({}, { keys: { gemini: 'g' } });
        expect(candidates.map((c) => c.provider)).toEqual(['gemini']);
    });

    test('extraction requests the candidate list, not a single provider', () => {
        const src = require('fs').readFileSync(
            require.resolve('../../server/services/topic/topicKnowledgeExtraction'), 'utf8');
        expect(src).toContain('getProviderCandidates');
        expect(src).not.toContain('resolveProvider(');
    });
});

describe('stripCodeFence', () => {
    // Gemini's reply was truncated because no output-token budget was passed.
    // The old regex needed a closing fence, so a cut-off response fell through
    // to JSON.parse on the raw text and surfaced as "Unexpected token '`'" --
    // which reads like bad formatting rather than the truncation it was.
    const { stripCodeFence } = require('../../server/services/topic/topicKnowledgeExtraction');

    test('unwraps a properly closed json fence', () => {
        expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
    });

    test('unwraps a closed fence with no language tag', () => {
        expect(stripCodeFence('```\n{"a":1}\n```')).toBe('{"a":1}');
    });

    test('unwraps a fence that was cut off before closing', () => {
        expect(stripCodeFence('```json\n{"a":1,"b":"unterminated')).toBe('{"a":1,"b":"unterminated');
    });

    test('returns bare JSON untouched', () => {
        expect(stripCodeFence('{"a":1}')).toBe('{"a":1}');
    });

    test('handles null and empty input without throwing', () => {
        expect(stripCodeFence(null)).toBe('');
        expect(stripCodeFence('')).toBe('');
    });
});
