'use strict';

/**
 * Validate one curated MCQ object from the batch file.
 * Expected shape (per question):
 * - id: string (non-empty)
 * - question: string (non-empty)
 * - options: Record<A|B|C|D|E, string> (exactly 5 keys, non-empty)
 * - correctAnswer: string letter in A..E
 * - explanation: string (non-empty)
 * - difficulty: 'easy' | 'medium' | 'hard'
 * - sourceRefs: non-empty array of { sourceBody, sourceUrl or guidelineId, excerpt }
 */
function validateCuratedQuestion(q, index, errors) {
  const path = `mcqs[${index}]`;
  const addErr = (msg) => errors.push(`${path}: ${msg}`);
  if (!q || typeof q !== 'object') { addErr('must be an object'); return false; }
  if (!q.id || typeof q.id !== 'string' || !q.id.trim()) addErr('id is required');
  if (!q.question || typeof q.question !== 'string' || !q.question.trim()) addErr('question is required');
  if (!q.options || typeof q.options !== 'object') addErr('options object is required');
  else {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const keys = Object.keys(q.options);
    if (keys.length !== 5 || !letters.every((k) => typeof q.options[k] === 'string' && q.options[k].trim())) {
      addErr('options must include exactly A–E with non-empty strings');
    }
  }
  if (!q.correctAnswer || !/^[A-E]$/.test(String(q.correctAnswer))) addErr('correctAnswer must be one of A–E');
  if (!q.explanation || typeof q.explanation !== 'string' || !q.explanation.trim()) addErr('explanation is required');
  if (!q.difficulty || !['easy', 'medium', 'hard'].includes(String(q.difficulty))) addErr('difficulty must be easy|medium|hard');
  // Optional: outdatedSources flag
  if (q.outdatedSources != null && typeof q.outdatedSources !== 'boolean') addErr('outdatedSources must be a boolean when present');
  if (!Array.isArray(q.sourceRefs) || q.sourceRefs.length === 0) addErr('at least one sourceRef is required');
  else {
    q.sourceRefs.forEach((s, i) => {
      const sp = `${path}.sourceRefs[${i}]`;
      if (!s || typeof s !== 'object') errors.push(`${sp}: must be an object`);
      else {
        if (!s.sourceBody || typeof s.sourceBody !== 'string' || !s.sourceBody.trim()) errors.push(`${sp}: sourceBody is required`);
        if (!s.excerpt || typeof s.excerpt !== 'string' || !s.excerpt.trim()) errors.push(`${sp}: excerpt is required`);
        if (!s.sourceUrl && !s.guidelineId) errors.push(`${sp}: one of sourceUrl or guidelineId is required`);
      }
    });
  }
  return errors.length === 0;
}

/**
 * Transform curated question to teaching_object.mcqs[] shape used across the app.
 * - options => array of "A: ..." etc (stable with letter prefix)
 * - keep correctAnswer letter
 * - carry over explanation, difficulty
 * - attach sourceRefs for client display (stored under question.sourceRefs)
 * - set questionType 'guideline' to render trust badge appropriately
 */
function transformCuratedQuestionToStored(q) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return {
    id: String(q.id),
    type: 'multiple_choice',
    questionType: 'guideline',
    question: String(q.question),
    options: letters.map((L) => `${L}: ${String(q.options?.[L] || '').trim()}`),
    correctAnswer: String(q.correctAnswer),
    explanation: String(q.explanation || ''),
    difficulty: (q.difficulty === 'easy' || q.difficulty === 'hard') ? q.difficulty : 'medium',
    outdatedSources: Boolean(q.outdatedSources),
    // Preserve cited stored sources for UI display
    sourceRefs: Array.isArray(q.sourceRefs) ? q.sourceRefs.map((s) => ({
      guidelineId: s.guidelineId || null,
      sourceBody: s.sourceBody || null,
      sourceYear: s.sourceYear ?? null,
      sourceUrl: s.sourceUrl || null,
      status: s.status || null,
      excerpt: s.excerpt || '',
    })) : [],
  };
}

/**
 * Validate one curated topic block from the batch file.
 */
function validateCuratedTopicBlock(block) {
  const errors = [];
  if (!block || typeof block !== 'object') { errors.push('topic block must be an object'); return { ok: false, errors }; }
  if (!block.topicKey || typeof block.topicKey !== 'string' || !block.topicKey.trim()) errors.push('topicKey is required');
  if (!block.topicDisplayName || typeof block.topicDisplayName !== 'string' || !block.topicDisplayName.trim()) errors.push('topicDisplayName is required');
  if (block.aliases != null) {
    if (!Array.isArray(block.aliases)) errors.push('aliases must be an array when present');
    else if (!block.aliases.every((a) => typeof a === 'string' && a.trim())) errors.push('aliases must contain non-empty strings');
  }
  if (!Array.isArray(block.mcqs) || block.mcqs.length === 0) errors.push('mcqs[] is required and must be non-empty');
  (block.mcqs || []).forEach((q, i) => validateCuratedQuestion(q, i, errors));
  return { ok: errors.length === 0, errors };
}

module.exports = {
  validateCuratedQuestion,
  validateCuratedTopicBlock,
  transformCuratedQuestionToStored,
};

