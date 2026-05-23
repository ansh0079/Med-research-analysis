'use strict';

const { classifyCalibrationAttempt } = require('../../server/services/confidenceCalibrationService');

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
