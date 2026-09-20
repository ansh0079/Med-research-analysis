'use strict';

/**
 * Frozen-candidate ranking eval gate for bandit promotion.
 *
 * Live provider metrics (clicks, dwell, SNIPS/IPS replay) decide *which* arm
 * looks best; the frozen-candidate jest suite decides whether ranking itself
 * is still sound. Promotion/regression changes what every user sees, so it
 * must not happen while the frozen eval is red — the same discipline that
 * stopped the invalid live-hit-rate reverts.
 *
 * Runs the same suites as `npm run eval:search-ranking`
 * (searchAbbreviationRanking | searchRankingTune | guidelineTopicFallback |
 * queryAnchorRelevance | guidelineEmbeddingRefiling) in a child process.
 * Fail-closed: if the suite cannot run at all, the gate fails — an unchecked
 * promotion is the dangerous outcome, not a blocked one.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RANKING_TEST_PATTERN = 'searchAbbreviationRanking|searchRankingTune|guidelineTopicFallback|queryAnchorRelevance|guidelineEmbeddingRefiling';

/**
 * @param {object} [deps]
 * @param {function} [deps.spawnImpl] - test injection (defaults to child_process.spawnSync)
 * @param {number} [deps.timeoutMs]
 * @returns {Promise<{checked: boolean, passed: boolean, detail: string}>}
 */
async function runFrozenRankingEvalGate({ spawnImpl, timeoutMs } = {}) {
    const spawn = typeof spawnImpl === 'function' ? spawnImpl : spawnSync;
    const result = await spawn(
        process.execPath,
        [
            require.resolve('jest/bin/jest'),
            `--testPathPatterns=${RANKING_TEST_PATTERN}`,
            '--no-coverage',
        ],
        {
            cwd: REPO_ROOT,
            env: { ...process.env, NODE_ENV: 'test' },
            timeout: timeoutMs || 5 * 60 * 1000,
            encoding: 'utf8',
        }
    );
    if (!result) {
        return { checked: true, passed: false, detail: 'spawn returned no result' };
    }
    if (result.error) {
        return { checked: true, passed: false, detail: `eval could not run: ${result.error.message}` };
    }
    if (result.status == null) {
        return { checked: true, passed: false, detail: 'eval terminated without an exit code' };
    }
    if (result.status !== 0) {
        const tail = String(result.stdout || '').split('\n').slice(-15).join('\n').trim();
        return { checked: true, passed: false, detail: `eval exited ${result.status}: ${tail}` };
    }
    return { checked: true, passed: true, detail: 'frozen ranking eval passed' };
}

/**
 * Fold the gate result into a promotion recommendation. Pure; exported for tests.
 * Only promotion and regression are gated — a 'hold' stays 'hold' unchecked.
 *
 * @param {{recommendation: string, reason?: string}} rec
 * @param {{checked: boolean, passed: boolean, detail?: string}} gate
 */
function applyFrozenRankingGate(rec, gate) {
    if (!rec || rec.recommendation !== 'promote' && rec.recommendation !== 'regress') {
        return { recommendation: rec?.recommendation || 'hold', reason: rec?.reason, gated: false };
    }
    if (!gate || !gate.checked || !gate.passed) {
        return {
            recommendation: 'hold',
            reason: `frozen_ranking_eval_failed: ${(gate && gate.detail) || 'gate unavailable'}`,
            gated: true,
        };
    }
    return { recommendation: rec.recommendation, reason: rec.reason, gated: true };
}

module.exports = {
    runFrozenRankingEvalGate,
    applyFrozenRankingGate,
    RANKING_TEST_PATTERN,
};
