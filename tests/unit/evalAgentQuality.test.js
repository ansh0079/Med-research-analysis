'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/eval-agent-quality.js');
const FIXTURE = path.join(ROOT, 'tests/fixtures/agent-quality-synthetic.json');

describe('eval-agent-quality harness', () => {
    test('offline fixture mode produces n>=10 and status ok', () => {
        const result = spawnSync(process.execPath, [SCRIPT, '--fixture', '--fixture-path', FIXTURE], {
            cwd: ROOT,
            encoding: 'utf8',
        });
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/Data source: fixture/);
        expect(result.stdout).toMatch(/status: ok/);
        expect(result.stdout).toMatch(/Agent cohort:\s+n=12/);

        const outDir = path.join(ROOT, 'eval-results');
        const files = fs.readdirSync(outDir)
            .filter((name) => name.startsWith('agent-quality-') && name.endsWith('.json'))
            .sort();
        expect(files.length).toBeGreaterThan(0);
        const latest = JSON.parse(fs.readFileSync(path.join(outDir, files[files.length - 1]), 'utf8'));
        expect(latest.status).toBe('ok');
        expect(latest.dataSource).toBe('fixture');
        expect(latest.metrics.n).toBeGreaterThanOrEqual(10);
        expect(latest.cohort.length).toBe(latest.metrics.n);
    });

    test('synthetic fixture file has usable cohort density', () => {
        const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
        expect(fixture.agentCohort.length).toBeGreaterThanOrEqual(10);
        expect(fixture.controlCohort.length).toBeGreaterThanOrEqual(5);
        for (const row of fixture.agentCohort) {
            expect(typeof row.accuracyDelta).toBe('number');
            expect(row.preCount).toBeGreaterThan(0);
            expect(row.postCount).toBeGreaterThan(0);
        }
    });
});
