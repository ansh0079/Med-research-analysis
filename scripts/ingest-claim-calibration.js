'use strict';

/**
 * Ingest a human-labelled calibration worksheet and write the judge
 * calibration file that synopsisClaimSupport.loadJudgeCalibration() reads.
 *
 * The judge is only allowed to promote claims to 'supported' once a clinician
 * has labelled enough items and agreement (Cohen's kappa) clears the bar —
 * isJudgeCalibrated() enforces that at serve time. This script computes the
 * agreement and writes the file; it refuses to write a below-bar file unless
 * --force is passed (the gate would ignore it anyway).
 *
 * Usage:
 *   node scripts/ingest-claim-calibration.js \
 *     --worksheet labeler-handoff/claim-support-calibration.json \
 *     --labelled-by "Dr A" \
 *     [--out server/config/judgeCalibration.json]   # dry-run without --write
 *   ... --write                                    # apply
 */

const fs = require('fs');
const path = require('path');
const { cohensKappa } = require('../server/services/evidenceSupportJudge');
const {
    buildCalibration,
    calibrationGateStatus,
    usablePairs,
} = require('./lib/judgeCalibration');

function parseArgs(argv) {
    const args = { write: false, force: false };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--write') args.write = true;
        else if (argv[i] === '--force') args.force = true;
        else if (argv[i] === '--worksheet') args.worksheet = argv[++i];
        else if (argv[i] === '--labelled-by') args.labelledBy = argv[++i];
        else if (argv[i] === '--out') args.out = argv[++i];
    }
    return args;
}

async function run({ worksheet, labelledBy, out, write = false, force = false } = {}) {
    if (!worksheet) throw new Error('--worksheet is required');
    if (!labelledBy || !String(labelledBy).trim()) throw new Error('--labelled-by is required (who produced the human labels)');
    const outPath = out || path.join('server', 'config', 'judgeCalibration.json');

    const sheet = JSON.parse(fs.readFileSync(worksheet, 'utf8'));
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const calibration = buildCalibration({ rows, labelledBy, cohensKappaFn: cohensKappa });
    const gate = calibrationGateStatus(calibration);

    if (write && gate !== 'calibrated' && !force) {
        return { written: false, gate, calibration, outPath, reason: 'gate not calibrated — pass --force to write anyway' };
    }
    if (write) {
        fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(calibration, null, 2));
    }
    return { written: Boolean(write), gate, calibration, outPath };
}

if (require.main === module) {
    run(parseArgs(process.argv.slice(2))).then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
    }).catch((err) => {
        console.error(err.message || err);
        process.exit(1);
    });
}

module.exports = { run, parseArgs };
