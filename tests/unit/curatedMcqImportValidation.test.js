'use strict';

const { validateCuratedTopicBlock, transformCuratedQuestionToStored } = require('../../server/services/curatedMcqImportValidation');

describe('curatedMcqImportValidation', () => {
  test('validates a correct topic block', () => {
    const block = {
      topicKey: 'ards-management',
      topicDisplayName: 'ARDS management',
      mcqs: [{
        id: 'q1',
        question: 'What is the target tidal volume in ARDS?',
        options: { A: '4–6 ml/kg', B: '8–10 ml/kg', C: '10–12 ml/kg', D: '12–14 ml/kg', E: 'No target' },
        correctAnswer: 'A',
        explanation: 'Low tidal volume ventilation improves outcomes.',
        difficulty: 'easy',
        outdatedSources: true,
        sourceRefs: [{ sourceBody: 'NICE', sourceUrl: 'https://example.com', excerpt: 'Use 4–6 ml/kg.' }],
      }],
    };
    const { ok, errors } = validateCuratedTopicBlock(block);
    expect(ok).toBe(true);
    expect(errors).toHaveLength(0);
    const stored = transformCuratedQuestionToStored(block.mcqs[0]);
    expect(stored.options).toEqual(expect.arrayContaining(['A: 4–6 ml/kg', 'B: 8–10 ml/kg']));
    expect(stored.correctAnswer).toBe('A');
    expect(stored.sourceRefs?.[0]?.excerpt).toContain('4–6 ml/kg');
    expect(stored.outdatedSources).toBe(true);
  });

  test('flags missing fields', () => {
    const bad = {
      topicKey: '',
      topicDisplayName: '',
      mcqs: [{
        id: '',
        question: '',
        options: { A: '', B: '', C: '', D: '', E: '' },
        correctAnswer: 'Z',
        explanation: '',
        difficulty: 'invalid',
        sourceRefs: [],
      }],
    };
    const { ok, errors } = validateCuratedTopicBlock(bad);
    expect(ok).toBe(false);
    expect(errors.join(' ')).toMatch(/topicKey/);
    expect(errors.join(' ')).toMatch(/topicDisplayName/);
    expect(errors.join(' ')).toMatch(/correctAnswer/);
    expect(errors.join(' ')).toMatch(/at least one sourceRef/);
  });

  test('accepts a 4-option question and stores only the provided options', () => {
    const block = {
      topicKey: 'four-option-topic',
      topicDisplayName: 'Four option topic',
      mcqs: [{
        id: 'q4', question: 'Pick one?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'D',
        explanation: 'Because.', difficulty: 'medium', sourceRefs: [{ sourceBody: 'NICE', excerpt: 'x' }],
      }],
    };
    expect(validateCuratedTopicBlock(block).ok).toBe(true);
    expect(transformCuratedQuestionToStored(block.mcqs[0]).options).toEqual(['A: a', 'B: b', 'C: c', 'D: d']);
  });

  test('rejects a 4-option question whose answer is E', () => {
    const block = {
      topicKey: 't', topicDisplayName: 'T',
      mcqs: [{ id: 'q', question: 'Q?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'E',
        explanation: 'x', difficulty: 'medium', sourceRefs: [{ sourceBody: 'NICE', excerpt: 'x' }] }],
    };
    const { ok, errors } = validateCuratedTopicBlock(block);
    expect(ok).toBe(false);
    expect(errors.join(' ')).toMatch(/correctAnswer must match/);
  });
});
