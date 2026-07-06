const {
    fsrsRating,
    retrievability,
    initialStability,
    initialDifficulty,
    nextIntervalDays,
    computeNextFsrsState,
    RATING,
} = require('../../server/services/fsrsService');

describe('fsrsService', () => {
    describe('fsrsRating', () => {
        test('incorrect answers always map to Again regardless of speed', () => {
            expect(fsrsRating(false, 2000)).toBe(RATING.AGAIN);
            expect(fsrsRating(false, null)).toBe(RATING.AGAIN);
        });

        test('correct + fast (<8s) maps to Easy', () => {
            expect(fsrsRating(true, 5000)).toBe(RATING.EASY);
        });

        test('correct + medium (<20s) maps to Good', () => {
            expect(fsrsRating(true, 15000)).toBe(RATING.GOOD);
        });

        test('correct + slow maps to Hard', () => {
            expect(fsrsRating(true, 25000)).toBe(RATING.HARD);
        });

        test('correct with no timing data defaults to Hard (conservative)', () => {
            expect(fsrsRating(true, null)).toBe(RATING.HARD);
        });
    });

    describe('retrievability', () => {
        test('retrievability is 1.0 at zero elapsed time', () => {
            expect(retrievability(0, 10)).toBeCloseTo(1.0, 5);
        });

        test('retrievability equals ~0.9 when elapsed days equals stability (definition of stability)', () => {
            const r = retrievability(10, 10);
            expect(r).toBeCloseTo(0.9, 2);
        });

        test('retrievability decreases as elapsed time grows', () => {
            const r1 = retrievability(5, 10);
            const r2 = retrievability(20, 10);
            expect(r2).toBeLessThan(r1);
        });

        test('retrievability is 0 for non-positive stability', () => {
            expect(retrievability(5, 0)).toBe(0);
        });
    });

    describe('initialStability / initialDifficulty', () => {
        test('higher ratings produce higher initial stability', () => {
            const sAgain = initialStability(RATING.AGAIN);
            const sHard = initialStability(RATING.HARD);
            const sGood = initialStability(RATING.GOOD);
            const sEasy = initialStability(RATING.EASY);
            expect(sAgain).toBeLessThan(sHard);
            expect(sHard).toBeLessThan(sGood);
            expect(sGood).toBeLessThan(sEasy);
        });

        test('difficulty stays within [1, 10] for all ratings', () => {
            for (const r of [RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY]) {
                const d = initialDifficulty(r);
                expect(d).toBeGreaterThanOrEqual(1);
                expect(d).toBeLessThanOrEqual(10);
            }
        });

        test('Again produces higher difficulty than Easy (first impression matters)', () => {
            expect(initialDifficulty(RATING.AGAIN)).toBeGreaterThan(initialDifficulty(RATING.EASY));
        });
    });

    describe('nextIntervalDays', () => {
        test('at the default 90% requested retention, interval approximately equals stability', () => {
            // R(t,S) = (1+t/9S)^-1; solving R=0.9 for t gives t = S exactly.
            expect(nextIntervalDays(20, 0.9)).toBeCloseTo(20, 0);
        });

        test('higher requested retention produces a shorter interval', () => {
            const loose = nextIntervalDays(20, 0.8);
            const strict = nextIntervalDays(20, 0.95);
            expect(strict).toBeLessThan(loose);
        });

        test('interval is clamped to at least 1 day', () => {
            expect(nextIntervalDays(0.001, 0.9)).toBeGreaterThanOrEqual(1);
        });
    });

    describe('computeNextFsrsState', () => {
        const freshCard = { stability: 0, difficulty: 0, state: 'new', lapses: 0, last_reviewed_at: null };

        test('first review with Easy produces a longer interval than first review with Hard', () => {
            const easy = computeNextFsrsState(freshCard, RATING.EASY);
            const hard = computeNextFsrsState(freshCard, RATING.HARD);
            expect(easy.intervalDays).toBeGreaterThan(hard.intervalDays);
        });

        test('a lapse (Again) resets state to relearning and schedules a short interval', () => {
            const result = computeNextFsrsState(freshCard, RATING.AGAIN);
            expect(result.state).toBe('relearning');
            expect(result.lapses).toBe(1);
            expect(result.intervalDays).toBeLessThanOrEqual(1);
        });

        test('a successful review after a prior review sets state to review', () => {
            const reviewed = {
                stability: 10, difficulty: 5, state: 'review', lapses: 0,
                last_reviewed_at: new Date(Date.now() - 10 * 86400000).toISOString().replace('T', ' ').slice(0, 19),
            };
            const result = computeNextFsrsState(reviewed, RATING.GOOD);
            expect(result.state).toBe('review');
            expect(result.stability).toBeGreaterThan(0);
        });

        test('repeated Good reviews (spaced at the scheduled interval each time) grow stability', () => {
            let card = freshCard;
            let now = new Date('2026-01-01T00:00:00Z');
            const stabilities = [];
            for (let i = 0; i < 4; i++) {
                const result = computeNextFsrsState(card, RATING.GOOD, { now });
                stabilities.push(result.stability);
                card = {
                    stability: result.stability,
                    difficulty: result.difficulty,
                    state: result.state,
                    lapses: result.lapses,
                    // last_reviewed_at is THIS review's time — the point computeNextFsrsState
                    // measures elapsed-since on the *next* call.
                    last_reviewed_at: now.toISOString().replace('T', ' ').slice(0, 19),
                };
                now = new Date(now.getTime() + result.intervalDays * 86400000);
            }
            expect(stabilities[3]).toBeGreaterThan(stabilities[0]);
        });

        test('a lapse after prior success shrinks stability relative to what it was', () => {
            const strong = { stability: 30, difficulty: 5, state: 'review', lapses: 0, last_reviewed_at: new Date(Date.now() - 30 * 86400000).toISOString().replace('T', ' ').slice(0, 19) };
            const result = computeNextFsrsState(strong, RATING.AGAIN);
            expect(result.stability).toBeLessThan(strong.stability);
        });

        test('dueAt is always in the future relative to now', () => {
            const result = computeNextFsrsState(freshCard, RATING.GOOD, { now: new Date('2026-01-01T00:00:00Z') });
            expect(new Date(result.dueAt.replace(' ', 'T') + 'Z').getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());
        });
    });
});
