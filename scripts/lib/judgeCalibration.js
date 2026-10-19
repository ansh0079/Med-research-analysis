'use strict';

/**
 * Shared helpers for the claim-support judge calibration flow.
 *
 * Chain: worksheet (built by scripts/build-claim-calibration-worksheet.js)
 *   → judge labels filled by scripts/run-claim-support-judge.js
 *   → human labels filled by the clinician
 *   → calibration file written by scripts/ingest-claim-calibration.js
 *     (read by server/services/synopsisClaimSupport.js::loadJudgeCalibration).
 */

const HUMAN_LABELS = ['supported', 'partially_supported', 'unsupported', 'passage_unusable'];
const MIN_LABELLED_ITEMS = 30;
const DEFAULT_MIN_KAPPA = 0.6;

function usablePairs(rows = []) {
    return (Array.isArray(rows) ? rows : [])
        .map((r) => ({ judge: r?.judge?.verdict || null, human: normalizeHumanLabel(r?.human) }))
        .filter((p) => p.judge && p.human);
}

function normalizeHumanLabel(value) {
    const v = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return HUMAN_LABELS.includes(v) ? v : null;
}

/** Confusion matrix + per-label precision/recall for the report. */
function judgeVsHumanStats(pairs) {
    const labels = [...new Set(pairs.flatMap((p) => [p.judge, p.human]))];
    const matrix = {};
    for (const j of labels) {
        matrix[j] = {};
        for (const h of labels) matrix[j][h] = pairs.filter((p) => p.judge === j && p.human === h).length;
    }
    const perLabel = {};
    for (const label of labels) {
        const tp = matrix[label]?.[label] || 0;
        const judgeTotal = labels.reduce((s, j) => s + (matrix[j]?.[label] || 0), 0);
        const humanTotal = labels.reduce((s, h) => s + (matrix[label]?.[h] || 0), 0);
        perLabel[label] = {
            precision: judgeTotal ? +(tp / judgeTotal).toFixed(3) : null,
            recall: humanTotal ? +(tp / humanTotal).toFixed(3) : null,
        };
    }
    return { matrix, perLabel };
}

/**
 * Build the calibration record in the shape isJudgeCalibrated() consumes.
 * kappa comes from evidenceSupportJudge.cohensKappa (injected to keep this
 * module provider- and model-agnostic).
 */
function buildCalibration({ rows = [], labelledBy = null, cohensKappaFn, minKappa = DEFAULT_MIN_KAPPA } = {}) {
    const pairs = usablePairs(rows);
    const agreement = typeof cohensKappaFn === 'function' ? cohensKappaFn(pairs) : null;
    const stats = judgeVsHumanStats(pairs);
    return {
        kappa: agreement && Number.isFinite(agreement.kappa) ? agreement.kappa : null,
        observedAgreement: agreement ? agreement.observedAgreement : null,
        labelledItems: pairs.length,
        labelledBy: String(labelledBy || '').trim() || null,
        calibratedAt: new Date().toISOString(),
        minKappa: Number(minKappa) || DEFAULT_MIN_KAPPA,
        minItems: MIN_LABELLED_ITEMS,
        perLabel: stats.perLabel,
        confusionMatrix: stats.matrix,
    };
}

function calibrationGateStatus(calibration) {
    if (!calibration) return 'no_calibration_file';
    if (!Number.isFinite(calibration.kappa)) return 'kappa_not_computable';
    if (calibration.kappa < (Number.isFinite(calibration.minKappa) ? calibration.minKappa : DEFAULT_MIN_KAPPA)) {
        return 'kappa_below_threshold';
    }
    if ((Number(calibration.labelledItems) || 0) < MIN_LABELLED_ITEMS) return 'too_few_labelled_items';
    if (!String(calibration.labelledBy || '').trim()) return 'labelled_by_missing';
    return 'calibrated';
}

module.exports = {
    HUMAN_LABELS,
    MIN_LABELLED_ITEMS,
    DEFAULT_MIN_KAPPA,
    normalizeHumanLabel,
    usablePairs,
    judgeVsHumanStats,
    buildCalibration,
    calibrationGateStatus,
};
