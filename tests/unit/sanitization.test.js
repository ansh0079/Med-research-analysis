const { sanitizeUserInput, sanitizeMarkdown } = require('../../server/utils/sanitization');
const { sanitizeInput } = require('../../server/utils/validation');

describe('sanitization utilities', () => {
    test('escapes markup and neutralizes script protocols in user input', () => {
        const result = sanitizeUserInput('<img src=x onerror=alert(1)> javascript:alert(1)', {
            maxLength: 200,
            escapeHtml: true,
        });

        expect(result).toContain('&lt;img');
        expect(result).not.toContain('<img');
        expect(result).toContain('blocked:alert(1)');
    });

    test('catches spaced protocol bypasses', () => {
        const result = sanitizeUserInput('j a v a s c r i p t:alert(1)', {
            maxLength: 200,
            escapeHtml: true,
        });

        expect(result).toBe('blocked:alert(1)');
    });

    test('supports existing options object call sites', () => {
        expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(sanitizeUserInput('abcdef', { maxLength: 3 })).toBe('abc');
    });

    test('escapes raw html while preserving markdown text', () => {
        const result = sanitizeMarkdown('**bold** <script>alert(1)</script> [x](javascript:alert(1))');

        expect(result).toContain('**bold**');
        expect(result).toContain('&lt;script&gt;');
        expect(result).toContain('[x](blocked:alert(1))');
    });
});
