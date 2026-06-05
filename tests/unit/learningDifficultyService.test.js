const {
    calibrateEffectiveDifficulty,
    sessionScorePct,
    blendScore,
} = require('../../server/services/learningDifficultyService');

describe('learningDifficultyService', () => {
    test('sessionScorePct handles empty sessions', () => {
        expect(sessionScorePct(0, 0)).toBeNull();
        expect(sessionScorePct(3, 5)).toBe(60);
    });

    test('blendScore weights session and mastery', () => {
        expect(blendScore(80, 40, 0.5)).toBe(60);
    });

    test('promotes difficulty after strong blended performance', () => {
        const result = calibrateEffectiveDifficulty({
            currentEffective: 'mixed',
            masteryOverall: 78,
            sessionCorrect: 9,
            sessionTotal: 10,
        });
        expect(result.nextEffective).toBe('hard');
        expect(result.changed).toBe(true);
    });

    test('demotes difficulty after poor session batch', () => {
        const result = calibrateEffectiveDifficulty({
            currentEffective: 'hard',
            masteryOverall: 72,
            sessionCorrect: 1,
            sessionTotal: 5,
        });
        expect(['mixed', 'medium', 'easy']).toContain(result.nextEffective);
        expect(result.changed).toBe(true);
        expect(result.reason).toBe('session_underperformance');
    });

    test('leaves difficulty unchanged when performance is stable', () => {
        const result = calibrateEffectiveDifficulty({
            currentEffective: 'medium',
            masteryOverall: 62,
            sessionCorrect: 3,
            sessionTotal: 5,
        });
        expect(result.nextEffective).toBe('medium');
        expect(result.changed).toBe(false);
    });
});
