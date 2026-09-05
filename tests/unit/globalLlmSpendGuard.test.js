'use strict';

/**
 * The per-request budgets in llmRequestBudget cap a single request. Nothing
 * capped the day, so every publicly reachable LLM path was unbounded spend:
 * /api/search reformulates queries with no account at all, and BETA_MODE admits
 * anonymous sessions to /api/ai/synopsis, /analyze and /synthesize. Rate limits
 * key on IP, so the ceiling was "however many addresses you have".
 */

const guard = require('../../server/services/ai/globalLlmSpendGuard');
const {
    assertUnderDailyCap,
    recordSpend,
    getSpendSnapshot,
    projectedCostUsd,
    dailyCapUsd,
    killSwitchEngaged,
    currentDayKey,
    LlmDailyCapExceededError,
    DEFAULT_DAILY_CAP_USD,
    __resetLocalSpendForTests,
} = guard;

const ENV_KEYS = ['LLM_DAILY_COST_CAP_USD', 'LLM_SPEND_KILL_SWITCH'];

describe('globalLlmSpendGuard', () => {
    let saved;

    beforeEach(() => {
        saved = {};
        for (const k of ENV_KEYS) {
            saved[k] = process.env[k];
            delete process.env[k];
        }
        __resetLocalSpendForTests();
    });

    afterEach(() => {
        for (const k of ENV_KEYS) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
        __resetLocalSpendForTests();
    });

    describe('configuration', () => {
        test('falls back to the default cap when unset', () => {
            expect(dailyCapUsd()).toBe(DEFAULT_DAILY_CAP_USD);
        });

        test('honours an explicit cap', () => {
            process.env.LLM_DAILY_COST_CAP_USD = '3.5';
            expect(dailyCapUsd()).toBe(3.5);
        });

        test('ignores a nonsensical cap rather than disabling the guard', () => {
            // A typo must not silently mean "no ceiling".
            for (const bad of ['0', '-5', 'abc', '']) {
                process.env.LLM_DAILY_COST_CAP_USD = bad;
                expect(dailyCapUsd()).toBe(DEFAULT_DAILY_CAP_USD);
            }
        });

        test('kill switch reads only an explicit true', () => {
            expect(killSwitchEngaged()).toBe(false);
            process.env.LLM_SPEND_KILL_SWITCH = 'false';
            expect(killSwitchEngaged()).toBe(false);
            process.env.LLM_SPEND_KILL_SWITCH = 'TRUE';
            expect(killSwitchEngaged()).toBe(true);
        });
    });

    describe('cost projection', () => {
        test('a longer prompt projects a higher cost', () => {
            const small = projectedCostUsd({ prompt: 'x'.repeat(100), model: 'gemini-2.5-flash' });
            const large = projectedCostUsd({ prompt: 'x'.repeat(100000), model: 'gemini-2.5-flash' });
            expect(large).toBeGreaterThan(small);
        });

        test('uses the caller\'s requested output ceiling when given one', () => {
            // Guessing low would let a burst of large generations overshoot the
            // cap before any of them was recorded.
            const base = { prompt: 'short prompt', model: 'gemini-2.5-flash' };
            const guessed = projectedCostUsd(base);
            const declared = projectedCostUsd({ ...base, maxOutputTokens: 8192 });
            expect(declared).toBeGreaterThan(guessed);
        });
    });

    describe('enforcement', () => {
        test('allows calls while under the cap', async () => {
            process.env.LLM_DAILY_COST_CAP_USD = '10';
            await expect(assertUnderDailyCap({ prompt: 'hello', model: 'gemini-2.5-flash' }))
                .resolves.toBeUndefined();
        });

        test('blocks once recorded spend exceeds the cap', async () => {
            process.env.LLM_DAILY_COST_CAP_USD = '0.001';
            for (let i = 0; i < 40; i++) {
                await recordSpend({ prompt: 'x'.repeat(20000), response: 'y'.repeat(20000), model: 'claude-haiku-4-5-20251001' });
            }
            await expect(assertUnderDailyCap({ prompt: 'hello', model: 'gemini-2.5-flash' }))
                .rejects.toThrow(LlmDailyCapExceededError);
        });

        test('the thrown error is a 429, not a 500', async () => {
            process.env.LLM_SPEND_KILL_SWITCH = 'true';
            await expect(assertUnderDailyCap({ prompt: 'hi', model: 'gemini-2.5-flash' }))
                .rejects.toMatchObject({ status: 429 });
        });

        test('kill switch blocks immediately regardless of spend', async () => {
            process.env.LLM_DAILY_COST_CAP_USD = '1000';
            process.env.LLM_SPEND_KILL_SWITCH = 'true';
            await expect(assertUnderDailyCap({ prompt: 'hi', model: 'gemini-2.5-flash' }))
                .rejects.toThrow(/paused/i);
        });

        test('a huge single call is refused when it alone would breach the cap', async () => {
            process.env.LLM_DAILY_COST_CAP_USD = '0.0001';
            await expect(assertUnderDailyCap({
                prompt: 'x'.repeat(500000), model: 'claude-haiku-4-5-20251001', maxOutputTokens: 8192,
            })).rejects.toThrow(LlmDailyCapExceededError);
        });
    });

    describe('accounting', () => {
        test('recordSpend never throws on malformed input', async () => {
            // Accounting failures must not take down a request that succeeded.
            await expect(recordSpend({})).resolves.toBeUndefined();
            await expect(recordSpend({ prompt: null, response: undefined, model: null })).resolves.toBeUndefined();
        });

        test('snapshot reports spend, remaining and percentage', async () => {
            process.env.LLM_DAILY_COST_CAP_USD = '10';
            const before = await getSpendSnapshot();
            expect(before.capUsd).toBe(10);
            expect(before.spentUsd).toBe(0);
            expect(before.remainingUsd).toBe(10);

            await recordSpend({ prompt: 'x'.repeat(50000), response: 'y'.repeat(50000), model: 'claude-haiku-4-5-20251001' });

            const after = await getSpendSnapshot();
            expect(after.spentUsd).toBeGreaterThan(0);
            expect(after.remainingUsd).toBeLessThan(10);
            expect(after.pctUsed).toBeGreaterThan(0);
        });

        test('snapshot exposes the kill switch state to operators', async () => {
            process.env.LLM_SPEND_KILL_SWITCH = 'true';
            expect((await getSpendSnapshot()).killSwitch).toBe(true);
        });

        test('day key is UTC, so all containers roll over together', () => {
            expect(currentDayKey(new Date('2026-09-05T23:59:59Z'))).toBe('2026-09-05');
            expect(currentDayKey(new Date('2026-09-06T00:00:01Z'))).toBe('2026-09-06');
        });
    });
});
