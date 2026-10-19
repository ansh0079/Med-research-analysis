'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    normalizeHumanLabel,
    usablePairs,
    judgeVsHumanStats,
    buildCalibration,
    calibrationGateStatus,
    MIN_LABELLED_ITEMS,
} = require('../../scripts/lib/judgeCalibration');
const { run: ingestRun } = require('../../scripts/ingest-claim-calibration');

function fakeKappa(pairs) {
    // Deterministic stand-in: perfect agreement above 10 pairs, weak below.
    return { n: pairs.length, observedAgreement: 0.8, expectedAgreement: 0.4, kappa: pairs.length > 10 ? 0.66 : 0.4 };
}

function makeRows(spec) {
    // spec: array of [judge, human] verdict strings or nulls
    return spec.map(([j, h]) => ({
        claimKey: 'k',
        judge: j ? { verdict: j } : null,
        human: h || '',
    }));
}

describe('judgeCalibration lib', () => {
    test('normalizeHumanLabel accepts the four labels with variants', () => {
        expect(normalizeHumanLabel('supported')).toBe('supported');
        expect(normalizeHumanLabel('Partially Supported')).toBe('partially_supported');
        expect(normalizeHumanLabel('passage-unusable')).toBe('passage_unusable');
        expect(normalizeHumanLabel('yes')).toBeNull();
        expect(normalizeHumanLabel('')).toBeNull();
    });

    test('usablePairs keeps only rows where both judge and human answered', () => {
        const rows = makeRows([
            ['supported', 'supported'],
            ['supported', ''],
            [null, 'unsupported'],
            ['unsupported', 'passage_unusable'],
        ]);
        expect(usablePairs(rows)).toHaveLength(2);
    });

    test('judgeVsHumanStats computes precision and recall', () => {
        const pairs = usablePairs(makeRows([
            ['supported', 'supported'],
            ['supported', 'supported'],
            ['supported', 'partially_supported'],
            ['unsupported', 'supported'],
        ]));
        const stats = judgeVsHumanStats(pairs);
        // judge said supported 3x, human agreed 2x → precision 2/3
        expect(stats.perLabel.supported.precision).toBeCloseTo(2 / 3, 3);
        // human said supported 3x, judge caught 2 → recall 2/3
        expect(stats.perLabel.supported.recall).toBeCloseTo(2 / 3, 3);
    });

    test('buildCalibration produces the isJudgeCalibrated shape', () => {
        const rows = makeRows(Array.from({ length: 40 }, () => ['supported', 'supported']));
        const cal = buildCalibration({ rows, labelledBy: 'Dr A', cohensKappaFn: fakeKappa });
        expect(cal.kappa).toBe(0.66);
        expect(cal.labelledItems).toBe(40);
        expect(cal.labelledBy).toBe('Dr A');
        expect(cal.minItems).toBe(MIN_LABELLED_ITEMS);
        expect(typeof cal.calibratedAt).toBe('string');
    });

    test('calibrationGateStatus reports each failure mode', () => {
        expect(calibrationGateStatus(null)).toBe('no_calibration_file');
        expect(calibrationGateStatus({ kappa: null, labelledItems: 100, labelledBy: 'A' })).toBe('kappa_not_computable');
        expect(calibrationGateStatus({ kappa: 0.3, labelledItems: 100, labelledBy: 'A' })).toBe('kappa_below_threshold');
        expect(calibrationGateStatus({ kappa: 0.9, labelledItems: 5, labelledBy: 'A' })).toBe('too_few_labelled_items');
        expect(calibrationGateStatus({ kappa: 0.9, labelledItems: 100, labelledBy: '' })).toBe('labelled_by_missing');
        expect(calibrationGateStatus({ kappa: 0.9, labelledItems: 100, labelledBy: 'A' })).toBe('calibrated');
    });
});

describe('ingest-claim-calibration', () => {
    function writeWorksheet(rows) {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-ingest-'));
        const p = path.join(dir, 'worksheet.json');
        fs.writeFileSync(p, JSON.stringify({ rows }));
        return p;
    }

    // 40 rows with real label variance (identical labels make kappa undefined).
    function calibratedRows() {
        return makeRows([
            ...Array.from({ length: 30 }, () => ['supported', 'supported']),
            ...Array.from({ length: 5 }, () => ['unsupported', 'unsupported']),
            ...Array.from({ length: 5 }, () => ['supported', 'partially_supported']),
        ]);
    }

    test('dry-run reports gate without writing', async () => {
        const ws = writeWorksheet(calibratedRows());
        const out = path.join(path.dirname(ws), 'out.json');
        const r = await ingestRun({ worksheet: ws, labelledBy: 'Dr A', out, write: false, force: false });
        expect(r.written).toBe(false);
        expect(r.gate).toBe('calibrated');
        expect(r.calibration.kappa).toBeGreaterThanOrEqual(0.6);
        expect(fs.existsSync(out)).toBe(false);
    });

    test('write produces the calibration file when gate passes', async () => {
        const ws = writeWorksheet(calibratedRows());
        const out = path.join(path.dirname(ws), 'out.json');
        const r = await ingestRun({ worksheet: ws, labelledBy: 'Dr A', out, write: true, force: false });
        expect(r.written).toBe(true);
        const written = JSON.parse(fs.readFileSync(out, 'utf8'));
        expect(written.labelledBy).toBe('Dr A');
        expect(written.labelledItems).toBe(40);
        expect(written.kappa).toBeGreaterThanOrEqual(0.6);
    });

    test('refuses to write a below-bar file without --force', async () => {
        const ws = writeWorksheet(makeRows(Array.from({ length: 40 }, () => ['supported', 'unsupported'])));
        const out = path.join(path.dirname(ws), 'out.json');
        const r = await ingestRun({ worksheet: ws, labelledBy: 'Dr A', out, write: true, force: false });
        expect(r.written).toBe(false);
        expect(r.gate).not.toBe('calibrated');
        expect(fs.existsSync(out)).toBe(false);
        const forced = await ingestRun({ worksheet: ws, labelledBy: 'Dr A', out, write: true, force: true });
        expect(forced.written).toBe(true);
    });

    test('requires --labelled-by', async () => {
        const ws = writeWorksheet(makeRows([['supported', 'supported']]));
        await expect(ingestRun({ worksheet: ws, out: path.join(os.tmpdir(), 'x.json'), write: false }))
            .rejects.toThrow(/labelled-by/);
    });
});
