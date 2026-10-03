'use strict';

const { validateCuratedTopicBlock } = require('../../server/services/curatedMcqImportValidation');

describe('curated aliases validation', () => {
  test('accepts non-empty aliases array', () => {
    const block = {
      topicKey: 'atrial-fibrillation-anticoagulation',
      topicDisplayName: 'Atrial fibrillation: anticoagulation',
      aliases: ['af', 'atrial fibrillation anticoagulation'],
      mcqs: [{
        id: 'q1',
        question: 'CHA2DS2-VASc threshold?',
        options: { A: '0', B: '1', C: '2', D: '3', E: '4' },
        correctAnswer: 'C',
        explanation: 'Begin at 2 for men.',
        difficulty: 'medium',
        sourceRefs: [{ sourceBody: 'NICE', sourceUrl: 'https://example.com', excerpt: 'Threshold guidance' }],
      }],
    };
    const { ok, errors } = validateCuratedTopicBlock(block);
    expect(ok).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test('rejects invalid aliases', () => {
    const bad = {
      topicKey: 'tb',
      topicDisplayName: 'Tuberculosis',
      aliases: [null, ''],
      mcqs: [{
        id: 'q1',
        question: 'Q',
        options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
        correctAnswer: 'A',
        explanation: 'E',
        difficulty: 'easy',
        sourceRefs: [{ sourceBody: 'WHO', sourceUrl: 'https://example.com', excerpt: 'x' }],
      }],
    };
    const { ok, errors } = validateCuratedTopicBlock(bad);
    expect(ok).toBe(false);
    expect(errors.join(' ')).toMatch(/aliases/);
  });
});

