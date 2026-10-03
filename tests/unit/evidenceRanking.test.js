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

    it('does not feature a known population mismatch when enough direct evidence exists', () => {
        const articles = [
            { title: 'Adult meta-analysis for a paediatric query', _ebmScore: 10, _quality: { grade: 'A' }, _rerank: { overallScore: 0.9, exclusionFlags: ['population_mismatch'] } },
            { title: 'Direct trial', _ebmScore: 8, _quality: { grade: 'A' }, _rerank: { overallScore: 0.9, exclusionFlags: [] } },
            { title: 'Direct review', _ebmScore: 7, _quality: { grade: 'B' }, _rerank: { overallScore: 0.8, exclusionFlags: [] } },
            { title: 'Direct cohort', _ebmScore: 5, _quality: { grade: 'B' }, _rerank: { overallScore: 0.7, exclusionFlags: [] } },
        ];
        expect(selectTopEvidence(articles, 3).map((a) => a.title)).toEqual(['Direct trial', 'Direct review', 'Direct cohort']);
    });

    it('uses clinical match to break ties within the same evidence tier', () => {
        const articles = [
            { title: 'Less direct', _ebmScore: 8, _quality: { grade: 'A' }, _rerank: { overallScore: 0.55, exclusionFlags: [] } },
            { title: 'More direct', _ebmScore: 8, _quality: { grade: 'A' }, _rerank: { overallScore: 0.92, exclusionFlags: [] } },
        ];
        expect(selectTopEvidence(articles, 2).map((a) => a.title)).toEqual(['More direct', 'Less direct']);
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

    it('links RRT timing wording to renal replacement therapy and AKI', () => {
        const keys = expandNormalizedTopicKeys(norm('RRT timing in AKI'), norm);
        expect(keys).toContain('rrt');
        expect(keys).toContain(norm('renal replacement therapy timing in acute kidney injury'));
    });

    it('links TBI wording to traumatic brain injury variants', () => {
        const keys = expandNormalizedTopicKeys(norm('TBI'), norm);
        expect(keys).toContain(norm('traumatic brain injury'));
        expect(keys).toContain(norm('severe traumatic brain injury'));
        expect(keys).toContain(norm('severe brain injury'));
    });
});

describe('resolveCanonicalNormalized', () => {
    it('picks longest normalized phrase in synonym cluster', () => {
        const canon = resolveCanonicalNormalized('ARDS', norm);
        expect(canon.length).toBeGreaterThan('ards'.length);
        expect(canon).toContain('respiratory');
    });
});
