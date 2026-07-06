const { computeConceptHash } = require('../../server/utils/conceptHash');

describe('computeConceptHash', () => {
    test('is deterministic for the same topic/type/text', () => {
        const input = { normalizedTopic: 'ards', questionType: 'recall', questionText: 'What is the tidal volume target?' };
        expect(computeConceptHash(input)).toBe(computeConceptHash(input));
    });

    test('claimKey-backed questions hash on (topic, claim), ignoring question text', () => {
        const a = computeConceptHash({ normalizedTopic: 'ards', claimKey: 'claim-1', questionText: 'Phrased one way' });
        const b = computeConceptHash({ normalizedTopic: 'ards', claimKey: 'claim-1', questionText: 'Phrased a completely different way' });
        expect(a).toBe(b);
    });

    test('different topics produce different hashes for the same text', () => {
        const a = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'same text' });
        const b = computeConceptHash({ normalizedTopic: 'sepsis', questionType: 'recall', questionText: 'same text' });
        expect(a).not.toBe(b);
    });

    test('only the first 100 characters of question text matter when there is no claimKey', () => {
        const base = 'x'.repeat(100);
        const a = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: base + 'tail-one' });
        const b = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: base + 'tail-two' });
        expect(a).toBe(b);
    });

    test('returns a 32-character hex string', () => {
        const hash = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'x' });
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });
});
