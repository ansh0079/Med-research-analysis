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
 * Runs the same suites as `npm run eval:search-ranking` (see
 * frozenRankingEvalSuites.js for the single shared list) in a child process.
 * Fail-closed: if the suite cannot run at all, the gate fails — an unchecked
 * promotion is the dangerous outcome, not a blocked one.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { RANKING_TEST_PATTERN } = require('./frozenRankingEvalSuites');

/**
 * @param {object} [deps]
 * @param {function} [deps.spawnImpl] - test injection (defaults to child_process.spawnSync)
 * @param {number} [deps.timeoutMs]
 * @returns {Promise<{checked: boolean, passed: boolean, detail: string}>}
 */
async function runFrozenRankingEvalGate({ spawnImpl, timeoutMs, heldoutImpl } = {}) {
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
    return { checked: true, passed: true, detail: 'frozen ranking eval passed', heldout: summarizeHeldout(heldoutImpl) };
}

/**
 * The frozen suite is a regression harness: it says ranking did not get worse against cases the
 * ranker was tuned on. It says nothing about quality. The held-out evaluation does, and its
 * status rides along with the gate so a promotion can require it.
 */
function summarizeHeldout(heldoutImpl) {
    try {
        const evaluate = typeof heldoutImpl === 'function' ? heldoutImpl : require('./heldoutEval').evaluateHeldout;
        const report = evaluate();
        return { status: report.status, labelledCases: report.labelledCases ?? 0, problems: (report.problems || report.failures || []).slice(0, 5) };
    } catch (err) {
        // An evaluation that cannot run is not a pass.
        return { status: 'error', labelledCases: 0, problems: [String(err?.message || err).slice(0, 200)] };
    }
}

/**
 * Fold the gate result into a promotion recommendation. Pure; exported for tests.
 * Only promotion and regression are gated — a 'hold' stays 'hold' unchecked.
 *
 * @param {{recommendation: string, reason?: string}} rec
 * @param {{checked: boolean, passed: boolean, detail?: string}} gate
 */
function heldoutGateMode(env = process.env) {
    return String(env.HELDOUT_GATE_MODE || 'enforce').toLowerCase() === 'advisory' ? 'advisory' : 'enforce';
}

function applyFrozenRankingGate(rec, gate, { env = process.env } = {}) {
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
    // A promotion changes what every learner sees, so it needs independent evidence of quality, not
    // just the absence of regression. Missing labels are not a pass. A regression back to a safer
    // arm is not held up waiting for labels.
    if (rec.recommendation === 'promote' && heldoutGateMode(env) === 'enforce' && gate.heldout?.status !== 'passed') {
        return {
            recommendation: 'hold',
            reason: `heldout_evaluation_${gate.heldout?.status || 'unavailable'}`,
            gated: true,
        };
    }
    return { recommendation: rec.recommendation, reason: rec.reason, gated: true };
}

module.exports = {
    runFrozenRankingEvalGate,
    applyFrozenRankingGate,
    heldoutGateMode,
    RANKING_TEST_PATTERN,
};
