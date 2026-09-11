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
        expect(isTrustedSource('AASLD')).toBe(true);
        expect(isTrustedSource('VA/DoD')).toBe(true);
        expect(isTrustedSource('Fleischner Society')).toBe(true);
        expect(isTrustedSource('ISTH')).toBe(true);
        expect(isTrustedSource('WSES')).toBe(true);
        expect(isTrustedSource('AGA')).toBe(true);
        expect(isTrustedSource('AAP')).toBe(true);
        expect(isTrustedSource('AAOS')).toBe(true);
        expect(isTrustedSource('EAACI')).toBe(true);
        expect(isTrustedSource('Baveno VII')).toBe(true);
        expect(isTrustedSource('Difficult Airway Society')).toBe(true);
        expect(isTrustedSource('DAS')).toBe(true);
        expect(isTrustedSource('Resuscitation Council UK')).toBe(true);
        expect(isTrustedSource('ACOG')).toBe(true);
        expect(isTrustedSource('Royal College of Psychiatrists')).toBe(true);
        expect(isTrustedSource('ACE guidelines')).toBe(true);
        expect(isTrustedSource('AAO-HNSF')).toBe(true);
        expect(isTrustedSource('American Geriatrics Society')).toBe(true);
        expect(isTrustedSource('British Geriatrics Society')).toBe(true);
        expect(isTrustedSource('United European Gastroenterology')).toBe(true);
        expect(isTrustedSource('ASH')).toBe(true);
        expect(isTrustedSource('American Society of Hematology')).toBe(true);
        expect(isTrustedSource('AABB')).toBe(true);
        expect(isTrustedSource('ACP')).toBe(true);
        expect(isTrustedSource('ESPEN')).toBe(true);
        expect(isTrustedSource('British Medical Association')).toBe(true);
        expect(isTrustedSource('BMA Ethics')).toBe(true);
        expect(isTrustedSource('USPSTF')).toBe(true);
        expect(isTrustedSource('US Preventive Services Task Force')).toBe(true);
        expect(isTrustedSource('National Osteoporosis Foundation')).toBe(true);
        expect(isTrustedSource('AAP and AAO guidelines')).toBe(true);
        expect(isTrustedSource('International consensus guidance for management of myasthenia gravis')).toBe(true);
        expect(isTrustedSource('ACE inhibitor')).toBe(false);
        expect(isTrustedSource('automated external defibrillator (AED)')).toBe(false);
        expect(isTrustedSource('European Academy of Dermatology and Venereology')).toBe(true);
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
