const { assessGuidelineQuality, isTrustedSource } = require('../../server/services/guidelineQualityService');

describe('guidelineQualityService', () => {
    const now = new Date('2026-06-06T00:00:00.000Z');

    test('recognizes trusted guideline sources', () => {
        expect(isTrustedSource('NICE')).toBe(true);
        expect(isTrustedSource('World Health Organization')).toBe(true);
        expect(isTrustedSource('EASL')).toBe(true);
        expect(isTrustedSource('European Association for the Study of the Liver')).toBe(true);
        expect(isTrustedSource('KDIGO')).toBe(true);
        expect(isTrustedSource('ACC/AHA')).toBe(true);
        expect(isTrustedSource('ASAM')).toBe(true);
        expect(isTrustedSource('AST IDCOP')).toBe(true);
        expect(isTrustedSource('EHRA')).toBe(true);
        expect(isTrustedSource('NCCN')).toBe(true);
        expect(isTrustedSource('ASCO')).toBe(true);
        expect(isTrustedSource('European Stroke Organisation')).toBe(true);
        expect(isTrustedSource('ASGE')).toBe(true);
        expect(isTrustedSource('European LeukemiaNet')).toBe(true);
        expect(isTrustedSource('ESID')).toBe(true);
        expect(isTrustedSource('American Thyroid Association')).toBe(true);
        expect(isTrustedSource('World Federation of Hemophilia')).toBe(true);
        expect(isTrustedSource('SHEA/IDSA')).toBe(true);
        expect(isTrustedSource('KDOQI')).toBe(true);
        expect(isTrustedSource('CDC')).toBe(true);
        expect(isTrustedSource('CANMAT')).toBe(true);
        expect(isTrustedSource('NAMS')).toBe(true);
        expect(isTrustedSource('Unknown Blog')).toBe(false);
    });

    test('scores reviewed current guidelines highly', () => {
        const assessment = assessGuidelineQuality({
            sourceBody: 'NICE',
            sourceYear: 2025,
            sourceUrl: 'https://www.nice.org.uk/guidance/test',
            recommendationStrength: 'Strong',
            recommendationCertainty: 'High',
            status: 'human_reviewed',
            lastCheckedAt: '2026-05-01T00:00:00.000Z',
        }, { now });

        expect(assessment.level).toBe('high');
        expect(assessment.score).toBeGreaterThanOrEqual(80);
        expect(assessment.flags).toEqual([]);
    });

    test('flags stale unreviewed incomplete guidelines', () => {
        const assessment = assessGuidelineQuality({
            sourceBody: 'Unknown',
            status: 'ai_extracted',
            lastCheckedAt: '2024-01-01T00:00:00.000Z',
        }, { now });

        expect(assessment.level).toBe('low');
        expect(assessment.flags).toEqual(expect.arrayContaining([
            'source_not_in_trusted_registry',
            'not_human_reviewed',
            'stale_check_required',
        ]));
    });
});
