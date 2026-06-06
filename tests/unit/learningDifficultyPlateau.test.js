const { detectPlateauAndSuggestLevelUp } = require('../../server/services/learningDifficultyService');

describe('detectPlateauAndSuggestLevelUp', () => {
    test('returns no plateau for insufficient sessions', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 2,
            recentAccuracy: 55,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('insufficient_sessions');
    });

    test('returns no plateau if already at max level', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 60,
            currentLearningMode: 'specialist',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('already_at_max_level');
    });

    test('returns no plateau if difficulty recently changed', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 60,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: true,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('difficulty_recently_adjusted');
    });

    test('detects plateau for student with 60% accuracy', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 4,
            recentAccuracy: 60,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(true);
        expect(result.suggestedMode).toBe('resident');
        expect(result.reason).toContain('plateau_detected');
    });

    test('detects plateau for resident with 55% accuracy', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 55,
            currentLearningMode: 'resident',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(true);
        expect(result.suggestedMode).toBe('specialist');
    });

    test('does not detect plateau for high accuracy', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 85,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('accuracy_outside_plateau_range');
    });

    test('does not detect plateau for very low accuracy', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 30,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('accuracy_outside_plateau_range');
    });

    test('handles boundary accuracy of 50%', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 50,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(true);
    });

    test('handles boundary accuracy of 70%', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 70,
            currentLearningMode: 'student',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(true);
    });

    test('handles invalid currentLearningMode', () => {
        const result = detectPlateauAndSuggestLevelUp({
            sessionCount: 5,
            recentAccuracy: 60,
            currentLearningMode: 'nonsense',
            difficultyRecentlyChanged: false,
        });
        expect(result.plateauDetected).toBe(false);
        expect(result.reason).toBe('already_at_max_level');
    });
});
