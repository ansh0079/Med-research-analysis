'use strict';

const { validateShape, verifyExactAnchors } = require('../../server/services/evidenceLockedMcqDraftService');

const quote = 'The committee recommends treatment after confirmation because the expected clinical benefit outweighs foreseeable harm.';
const replacement = {
    question: 'Which management approach is recommended?',
    options: ['A: Treat after confirmation', 'B: Never treat', 'C: Delay indefinitely', 'D: Use an unrelated treatment'],
    correctAnswer: 'A', explanation: 'Treatment is recommended after confirmation.',
    answerEvidenceAnchor: { documentId: 7, exactQuote: quote },
    explanationEvidenceAnchors: [{ documentId: 7, exactQuote: quote }],
};

describe('evidenceLockedMcqDraftService', () => {
    test('requires separate answer and explanation anchors', () => {
        expect(validateShape({ ...replacement, explanationEvidenceAnchors: [] }))
            .toContain('explanationEvidenceAnchors must contain at least one anchor');
    });

    test('accepts only a quotation present in stored full text', async () => {
        const db = { get: jest.fn().mockResolvedValue({
            id: 7, full_text_source: 'pdf_text', full_text: `${'Context '.repeat(80)} ${quote}`,
        }) };
        await expect(verifyExactAnchors(db, replacement)).resolves.toMatchObject({ ok: true, errors: [] });
        await expect(verifyExactAnchors(db, {
            ...replacement, answerEvidenceAnchor: { documentId: 7, exactQuote: `${quote} absent` },
        })).resolves.toMatchObject({ ok: false });
    });
});
