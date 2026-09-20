'use strict';

/**
 * Frozen-candidate ranking eval gate for bandit promotion.
 *
 * Live metrics decide which arm looks best; the frozen suite decides whether
 * ranking itself is still sound. Promotion/regression must not happen while
 * the frozen eval is red, and an unrunnable gate must block (fail-closed) —
 * an unchecked promotion is the dangerous outcome.
 */

const {
    runFrozenRankingEvalGate,
    applyFrozenRankingGate,
    RANKING_TEST_PATTERN,
} = require('../../server/services/frozenRankingEvalGate');

describe('runFrozenRankingEvalGate', () => {
    it('passes when the eval exits zero', async () => {
        const spawnImpl = jest.fn(async () => ({ status: 0, stdout: 'PASS', stderr: '' }));
        const result = await runFrozenRankingEvalGate({ spawnImpl });
        expect(result).toEqual({ checked: true, passed: true, detail: 'frozen ranking eval passed' });
        const [cmd, args, opts] = spawnImpl.mock.calls[0];
        expect(cmd).toBe(process.execPath);
        expect(args.join(' ')).toContain('--testPathPatterns=');
        expect(args.join(' ')).toMatch(/searchAbbreviationRanking/);
        expect(opts.cwd).toBeTruthy();
        expect(opts.env.NODE_ENV).toBe('test');
    });

    it('fails when the eval exits non-zero, with the output tail', async () => {
        const spawnImpl = jest.fn(async () => ({ status: 1, stdout: 'line1\nline2\nExpected x', stderr: '' }));
        const result = await runFrozenRankingEvalGate({ spawnImpl });
        expect(result.checked).toBe(true);
        expect(result.passed).toBe(false);
        expect(result.detail).toContain('exited 1');
    });

    it('fails closed when the spawn itself errors', async () => {
        const spawnImpl = jest.fn(async () => ({ error: new Error('ENOENT'), status: null }));
        const result = await runFrozenRankingEvalGate({ spawnImpl });
        expect(result.passed).toBe(false);
        expect(result.detail).toContain('could not run');
    });

    it('fails closed when there is no exit code', async () => {
        const spawnImpl = jest.fn(async () => ({ status: null }));
        const result = await runFrozenRankingEvalGate({ spawnImpl });
        expect(result.passed).toBe(false);
        expect(result.detail).toContain('without an exit code');
    });

    it('fails closed when spawn returns nothing', async () => {
        const spawnImpl = jest.fn(async () => null);
        const result = await runFrozenRankingEvalGate({ spawnImpl });
        expect(result.passed).toBe(false);
    });
});

describe('applyFrozenRankingGate', () => {
    it('lets a promote through when the gate passed', () => {
        const out = applyFrozenRankingGate(
            { recommendation: 'promote', reason: 'lift=0.05' },
            { checked: true, passed: true },
        );
        expect(out).toEqual({ recommendation: 'promote', reason: 'lift=0.05', gated: true });
    });

    it('holds a promote when the gate failed', () => {
        const out = applyFrozenRankingGate(
            { recommendation: 'promote', reason: 'lift=0.05' },
            { checked: true, passed: false, detail: 'exited 1' },
        );
        expect(out.recommendation).toBe('hold');
        expect(out.reason).toContain('frozen_ranking_eval_failed');
        expect(out.gated).toBe(true);
    });

    it('holds a regress when the gate failed', () => {
        const out = applyFrozenRankingGate(
            { recommendation: 'regress' },
            { checked: true, passed: false, detail: 'gate error' },
        );
        expect(out.recommendation).toBe('hold');
    });

    it('holds when the gate is unavailable (fail-closed)', () => {
        const out = applyFrozenRankingGate({ recommendation: 'promote' }, null);
        expect(out.recommendation).toBe('hold');
        expect(out.reason).toContain('gate unavailable');
    });

    it('does not touch a hold recommendation', () => {
        const out = applyFrozenRankingGate({ recommendation: 'hold', reason: 'x' }, { checked: false });
        expect(out).toEqual({ recommendation: 'hold', reason: 'x', gated: false });
    });
});
