'use strict';

const { getPromptVersion, clearPromptVersionCache } = require('../../server/prompts/promptVersions');

describe('promptVersions', () => {
    afterEach(() => clearPromptVersionCache());

    test('returns stable 12-char hash for synopsis template', () => {
        const v1 = getPromptVersion('synopsis');
        const v2 = getPromptVersion('synopsis');
        expect(v1).toHaveLength(12);
        expect(v1).toBe(v2);
    });

    test('different prompt keys produce different hashes', () => {
        const synopsis = getPromptVersion('synopsis');
        const synthesis = getPromptVersion('synthesis');
        expect(synopsis).not.toBe(synthesis);
    });
});
