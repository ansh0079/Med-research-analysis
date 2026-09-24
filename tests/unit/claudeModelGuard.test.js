'use strict';

/**
 * Haiku only, at the one place every runtime Claude call passes through.
 *
 * The pricing table already carries Sonnet (20x Haiku's input cost) and Opus (33x), so a single
 * caller passing a model string was all it would take to spend at that rate unnoticed. Operator
 * scripts under server/scripts/ still reach for bigger models deliberately; the running app must not
 * be able to drift into it.
 */

const { claudeModelOrDefault, CLAUDE_DEFAULT_MODEL } = require('../../server/services/externalApiProxy');

const quiet = { warn() {} };

describe('runtime Claude model guard', () => {
    test('the permitted Haiku models pass through untouched', () => {
        expect(claudeModelOrDefault('claude-haiku-4-5-20251001', quiet)).toBe('claude-haiku-4-5-20251001');
        expect(claudeModelOrDefault('claude-haiku-4-5', quiet)).toBe('claude-haiku-4-5');
    });

    test('a more expensive model is coerced back to Haiku', () => {
        expect(claudeModelOrDefault('claude-sonnet-4-6', quiet)).toBe(CLAUDE_DEFAULT_MODEL);
        expect(claudeModelOrDefault('claude-opus-4-8', quiet)).toBe(CLAUDE_DEFAULT_MODEL);
        expect(claudeModelOrDefault('claude-fable-5', quiet)).toBe(CLAUDE_DEFAULT_MODEL);
    });

    test('it warns rather than failing silently, so the attempt is visible', () => {
        const warn = jest.fn();
        claudeModelOrDefault('claude-opus-4-8', { warn });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('claude-opus-4-8'));
    });

    test('missing or empty input falls back to the default', () => {
        expect(claudeModelOrDefault(undefined, quiet)).toBe(CLAUDE_DEFAULT_MODEL);
        expect(claudeModelOrDefault('', quiet)).toBe(CLAUDE_DEFAULT_MODEL);
        expect(claudeModelOrDefault('   ', quiet)).toBe(CLAUDE_DEFAULT_MODEL);
    });

    test('it coerces rather than throwing: a cost guard must not take a clinical feature down', () => {
        expect(() => claudeModelOrDefault('claude-opus-4-8', quiet)).not.toThrow();
    });
});
