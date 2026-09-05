'use strict';

/**
 * Process-wide daily ceiling on LLM spend.
 *
 * The per-request budgets in llmRequestBudget.js cap what a *single* request can
 * spend. Nothing capped the total, so any endpoint reachable without an account
 * was an open tap:
 *
 *   - /api/search is public by design and calls the LLM to reformulate queries
 *     (30 req/min/IP).
 *   - With BETA_MODE=true, requireAuthOrBeta admits anonymous sessions to
 *     /api/ai/synopsis, /api/ai/analyze and /api/ai/synthesize (20 req/min/IP).
 *
 * Rate limits key on `${req.ip}:${req.path}`, so one address could drive tens of
 * thousands of paid calls a day and a handful of addresses could drive as many
 * as they liked. This is the backstop: a hard daily cost ceiling across every
 * provider and every caller, plus a manual kill switch.
 *
 * Counting is best-effort by design. It uses Redis so all containers share one
 * budget, and falls back to a per-process counter when Redis is unavailable --
 * with N containers that allows at most N x the cap, which is still bounded.
 * Never let an accounting failure block a request that would otherwise succeed;
 * the point is to stop runaway spend, not to be a billing ledger.
 */

const logger = require('../../config/logger');
const { estimateTokensFromChars, estimateCostUsd } = require('../llmUsageService');

const DEFAULT_DAILY_CAP_USD = 25;

/** In-process fallback, used only when Redis is unreachable. */
const localSpend = { day: null, usd: 0 };

class LlmDailyCapExceededError extends Error {
    constructor(snapshot) {
        super(
            `Daily LLM spend cap reached ($${snapshot.capUsd.toFixed(2)}). `
            + 'Further AI generation is paused until the cap resets or is raised.',
        );
        this.name = 'LlmDailyCapExceededError';
        this.status = 429;
        this.snapshot = snapshot;
    }
}

function dailyCapUsd() {
    const raw = Number(process.env.LLM_DAILY_COST_CAP_USD);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_CAP_USD;
}

/** Operator panic button: set LLM_SPEND_KILL_SWITCH=true to stop all LLM calls. */
function killSwitchEngaged() {
    return String(process.env.LLM_SPEND_KILL_SWITCH || '').toLowerCase() === 'true';
}

/** UTC day, so every container rolls over at the same instant. */
function currentDayKey(now = new Date()) {
    return now.toISOString().slice(0, 10);
}

function seconds_until_utc_midnight(now = new Date()) {
    const next = new Date(now);
    next.setUTCHours(24, 0, 0, 0);
    return Math.max(60, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

/**
 * Cost of a call we have not made yet. Output length is unknown, so assume the
 * caller's requested ceiling when given one -- guessing low here would let a
 * burst of large generations overshoot the cap before any of them is recorded.
 */
function projectedCostUsd({ prompt, model, maxOutputTokens }) {
    const inputTokens = estimateTokensFromChars(String(prompt || '').length);
    const outputTokens = Number.isFinite(maxOutputTokens) && maxOutputTokens > 0
        ? Number(maxOutputTokens)
        : estimateTokensFromChars(Math.min(4096, String(prompt || '').length * 0.25));
    return estimateCostUsd(model, inputTokens, outputTokens);
}

function getCache() {
    // Required lazily: cache/index.js pulls in the Redis client, and importing it
    // at module load would drag a connection into every unit test that touches
    // the AI service.
    try {
        return require('../../../cache');
    } catch (err) {
        logger.debug({ err }, 'globalLlmSpendGuard: cache unavailable');
        return null;
    }
}

async function readSpendUsd() {
    const day = currentDayKey();
    const cache = getCache();

    if (cache?.redis) {
        try {
            const key = `${cache.redisPrefix || ''}llmspend:${day}`;
            const raw = await cache.redis.get(key);
            return { day, usd: Number(raw) || 0, shared: true };
        } catch (err) {
            logger.warn({ err }, 'globalLlmSpendGuard: Redis read failed; using in-process total');
        }
    }

    if (localSpend.day !== day) {
        localSpend.day = day;
        localSpend.usd = 0;
    }
    return { day, usd: localSpend.usd, shared: false };
}

async function addSpendUsd(amountUsd) {
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    const day = currentDayKey();
    const cache = getCache();

    if (cache?.redis) {
        try {
            const key = `${cache.redisPrefix || ''}llmspend:${day}`;
            const total = await cache.redis.incrbyfloat(key, amountUsd);
            // First write of the day: expire shortly after rollover so the key
            // cannot outlive its day if the process restarts.
            if (Number(total) <= amountUsd + 1e-9) {
                await cache.redis.expire(key, seconds_until_utc_midnight() + 3600);
            }
            return;
        } catch (err) {
            logger.warn({ err }, 'globalLlmSpendGuard: Redis write failed; counting in-process');
        }
    }

    if (localSpend.day !== day) {
        localSpend.day = day;
        localSpend.usd = 0;
    }
    localSpend.usd += amountUsd;
}

/**
 * Throw if this call would push the day past its ceiling.
 * @throws {LlmDailyCapExceededError}
 */
async function assertUnderDailyCap({ prompt, model, maxOutputTokens } = {}) {
    const capUsd = dailyCapUsd();

    if (killSwitchEngaged()) {
        throw new LlmDailyCapExceededError({ capUsd, spentUsd: 0, killSwitch: true });
    }

    const { usd: spentUsd, shared } = await readSpendUsd();
    const projected = spentUsd + projectedCostUsd({ prompt, model, maxOutputTokens });

    if (projected > capUsd) {
        logger.error(
            { spentUsd, capUsd, model, shared },
            'Daily LLM spend cap reached; refusing further generation',
        );
        throw new LlmDailyCapExceededError({ capUsd, spentUsd, killSwitch: false, shared });
    }
}

/** Record what a completed call actually cost. Never throws. */
async function recordSpend({ prompt, response, model }) {
    try {
        const inputTokens = estimateTokensFromChars(String(prompt || '').length);
        const outputTokens = estimateTokensFromChars(String(response || '').length);
        await addSpendUsd(estimateCostUsd(model, inputTokens, outputTokens));
    } catch (err) {
        logger.warn({ err }, 'globalLlmSpendGuard: failed to record spend');
    }
}

/** Operational visibility for the admin observability route. */
async function getSpendSnapshot() {
    const { day, usd, shared } = await readSpendUsd();
    const capUsd = dailyCapUsd();
    return {
        day,
        spentUsd: Number(usd.toFixed(4)),
        capUsd,
        remainingUsd: Number(Math.max(0, capUsd - usd).toFixed(4)),
        pctUsed: capUsd > 0 ? Number(((usd / capUsd) * 100).toFixed(1)) : 0,
        killSwitch: killSwitchEngaged(),
        shared,
    };
}

/** Test seam. */
function __resetLocalSpendForTests() {
    localSpend.day = null;
    localSpend.usd = 0;
}

module.exports = {
    LlmDailyCapExceededError,
    assertUnderDailyCap,
    recordSpend,
    getSpendSnapshot,
    projectedCostUsd,
    dailyCapUsd,
    killSwitchEngaged,
    currentDayKey,
    DEFAULT_DAILY_CAP_USD,
    __resetLocalSpendForTests,
};
