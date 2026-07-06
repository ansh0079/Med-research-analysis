'use strict';

const {
  classifyCalibrationAttempt,
  computeCalibrationCurve,
  computeBrierScore,
  describeCalibrationVerdict,
  summarizeCalibration,
} = require('../../server/services/confidenceCalibrationService');

describe('classifyCalibrationAttempt', () => {
  test('flags dangerous misconception', () => {
    const r = classifyCalibrationAttempt({ isCorrect: false, confidence: 5 });
    expect(r.bucket).toBe('dangerous_misconception');
  });

  test('flags needs consolidation', () => {
    const r = classifyCalibrationAttempt({ isCorrect: true, confidence: 2 });
    expect(r.bucket).toBe('needs_consolidation');
  });
});

function attempt(isCorrect, confidence) {
  return { isCorrect, confidence };
}

describe('computeCalibrationCurve', () => {
  test('returns one bucket per confidence level 1-5, even with no data', () => {
    const curve = computeCalibrationCurve([]);
    expect(curve).toHaveLength(5);
    expect(curve.every((b) => b.count === 0 && b.observedAccuracy === null)).toBe(true);
  });

  test('computes observed accuracy per bucket', () => {
    const attempts = [attempt(true, 4), attempt(true, 4), attempt(false, 4), attempt(false, 4)];
    const curve = computeCalibrationCurve(attempts);
    const bucket4 = curve.find((b) => b.confidenceLevel === 4);
    expect(bucket4.count).toBe(4);
    expect(bucket4.observedAccuracy).toBe(0.5);
  });

  test('a well-calibrated bucket has a small gap', () => {
    // Confidence 4 predicts 0.8; 4/5 correct = 0.8 observed => gap ≈ 0.
    const attempts = [attempt(true, 4), attempt(true, 4), attempt(true, 4), attempt(true, 4), attempt(false, 4)];
    const curve = computeCalibrationCurve(attempts);
    const bucket4 = curve.find((b) => b.confidenceLevel === 4);
    expect(Math.abs(bucket4.gap)).toBeLessThan(0.05);
  });

  test('an overconfident bucket has a large negative gap', () => {
    // Confidence 5 predicts 0.95; only 2/5 correct = 0.4 observed => gap very negative.
    const attempts = [attempt(true, 5), attempt(false, 5), attempt(false, 5), attempt(false, 5), attempt(true, 5)];
    const curve = computeCalibrationCurve(attempts);
    const bucket5 = curve.find((b) => b.confidenceLevel === 5);
    expect(bucket5.gap).toBeLessThan(-0.4);
  });

  test('ignores attempts with confidence outside 1-5', () => {
    const curve = computeCalibrationCurve([attempt(true, 0), attempt(true, 6), attempt(true, null)]);
    expect(curve.every((b) => b.count === 0)).toBe(true);
  });
});

describe('computeBrierScore', () => {
  test('is null with no rated attempts', () => {
    expect(computeBrierScore([])).toBeNull();
  });

  test('is low for well-calibrated predictions', () => {
    // Confidence 5 (predicts 0.95) mostly correct -> small squared errors.
    const attempts = Array(10).fill(attempt(true, 5));
    const score = computeBrierScore(attempts);
    expect(score).toBeLessThan(0.05);
  });

  test('is high for badly miscalibrated predictions', () => {
    // Confidence 5 (predicts 0.95) but always wrong -> large squared errors.
    const attempts = Array(10).fill(attempt(false, 5));
    const score = computeBrierScore(attempts);
    expect(score).toBeGreaterThan(0.8);
  });
});

describe('describeCalibrationVerdict', () => {
  test('reports insufficient_data when no bucket has enough samples', () => {
    const curve = computeCalibrationCurve([attempt(true, 5), attempt(false, 5)]);
    const result = describeCalibrationVerdict(curve);
    expect(result.verdict).toBe('insufficient_data');
  });

  test('flags overconfidence at the highest trustworthy confidence level', () => {
    const attempts = [
      ...Array(3).fill(attempt(true, 5)),
      ...Array(4).fill(attempt(false, 5)),
    ];
    const curve = computeCalibrationCurve(attempts);
    const result = describeCalibrationVerdict(curve);
    expect(result.verdict).toBe('overconfident');
    expect(result.message).toContain('5/5');
  });

  test('flags underconfidence at the lowest trustworthy confidence level', () => {
    const attempts = [
      ...Array(6).fill(attempt(true, 1)),
      ...Array(1).fill(attempt(false, 1)),
    ];
    const curve = computeCalibrationCurve(attempts);
    const result = describeCalibrationVerdict(curve);
    expect(result.verdict).toBe('underconfident');
  });

  test('reports well_calibrated when gaps are small', () => {
    const attempts = [
      ...Array(4).fill(attempt(true, 4)), attempt(false, 4),
      ...Array(3).fill(attempt(true, 2)), ...Array(2).fill(attempt(false, 2)),
    ];
    const curve = computeCalibrationCurve(attempts);
    const result = describeCalibrationVerdict(curve);
    expect(result.verdict).toBe('well_calibrated');
  });
});

describe('summarizeCalibration', () => {
  test('combines curve, brier score, verdict, and bucket counts', () => {
    const attempts = [
      attempt(false, 5), attempt(false, 5), attempt(false, 5), attempt(false, 5), attempt(false, 5), // dangerous_misconception x5
      attempt(true, 1), attempt(true, 1), // needs_consolidation x2
      { isCorrect: true, confidence: null }, // unrated, excluded from sampleSize
    ];
    const summary = summarizeCalibration(attempts);
    expect(summary.sampleSize).toBe(7);
    expect(summary.curve).toHaveLength(5);
    expect(summary.brierScore).toBeGreaterThan(0);
    expect(summary.verdict).toBe('overconfident');
    expect(summary.bucketCounts.dangerous_misconception).toBe(5);
    expect(summary.bucketCounts.needs_consolidation).toBe(2);
  });
});
