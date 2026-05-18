const { selectTopEvidence } = require('../../server/utils/selectTopEvidence');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

describe('selectTopEvidence (server)', () => {
    it('ranks ebm score, then quality grade, deprioritises preprints, drops retracted', () => {
        const articles = [
            { title: 'low', _ebmScore: 1, _quality: { grade: 'C' }, _isPreprint: true },
            { title: 'mid retracted', _ebmScore: 5, _quality: { grade: 'B' }, _retraction: { isRetracted: true } },
            { title: 'best preprint', _ebmScore: 10, _quality: { grade: 'B' }, _isPreprint: true },
            { title: 'winner', _ebmScore: 10, _quality: { grade: 'A' }, _isPreprint: false },
            { title: 'second', _ebmScore: 10, _quality: { grade: 'A' }, _isPreprint: true },
        ];
        const top = selectTopEvidence(articles, 3).map((a) => a.title);
        expect(top).toEqual(['winner', 'second', 'best preprint']);
    });
});

describe('expandNormalizedTopicKeys', () => {
    it('links ARDS abbreviation to long-form normalized keys', () => {
        const keys = expandNormalizedTopicKeys(norm('ARDS'), norm);
        expect(keys).toContain('ards');
        expect(keys).toContain(norm('acute respiratory distress syndrome'));
    });

    it('expands when any token matches a synonym', () => {
        const keys = expandNormalizedTopicKeys(norm('severe ARDS management'), norm);
        expect(keys).toContain('ards');
        expect(keys.some((k) => k.includes('acute respiratory'))).toBe(true);
    });
});

describe('resolveCanonicalNormalized', () => {
    it('picks longest normalized phrase in synonym cluster', () => {
        const canon = resolveCanonicalNormalized('ARDS', norm);
        expect(canon.length).toBeGreaterThan('ards'.length);
        expect(canon).toContain('respiratory');
    });
});
