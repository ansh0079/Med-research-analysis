'use strict';

const LETTERS = ['A', 'B', 'C', 'D'];

function normalizeOptionLetter(option, index) {
    const raw = String(option || '').trim();
    const match = raw.match(/^([A-Da-d])\s*[:\.)]\s*(.*)$/);
    if (match) return `${match[1].toUpperCase()}: ${match[2].trim()}`;
    const letter = LETTERS[index] || 'A';
    return `${letter}: ${raw}`;
}

function normalizeCorrectLetter(value, options = []) {
    const raw = String(value || '').trim();
    if (/^[A-Da-d]$/.test(raw)) return raw.toUpperCase();
    const upper = raw.toUpperCase();
    for (let i = 0; i < options.length; i++) {
        const opt = String(options[i] || '').trim();
        if (opt === raw || opt.toUpperCase() === upper) return LETTERS[i] || 'A';
        const stripped = opt.replace(/^[A-D]\s*[:\.)]\s*/i, '').trim();
        if (stripped === raw || stripped.toUpperCase() === upper) return LETTERS[i] || 'A';
    }
    return 'A';
}

/**
 * Normalize case-embedded MCQs for CaseModePage (stable ids, A-D options, letter answers).
 */
function normalizeCaseMcqList(mcqs = [], { prefix = 'case', difficulty = 'medium' } = {}) {
    return (Array.isArray(mcqs) ? mcqs : []).slice(0, 5).map((q, i) => {
        const options = Array.isArray(q.options)
            ? q.options.map((opt, idx) => normalizeOptionLetter(opt, idx))
            : [];
        const correctAnswer = normalizeCorrectLetter(q.correctAnswer, q.options || options);
        return {
            id: String(q.id || `${prefix}-${i + 1}`),
            type: q.type || 'multiple_choice',
            questionType: ['clinical_application', 'recall', 'trial_interpretation', 'guideline', 'pitfall'].includes(q.questionType)
                ? q.questionType
                : 'clinical_application',
            question: String(q.question || ''),
            options,
            correctAnswer,
            explanation: String(q.explanation || ''),
            whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : undefined,
            difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : difficulty,
            sourceReference: q.sourceReference ? String(q.sourceReference) : undefined,
        };
    }).filter((q) => q.question && q.options.length >= 2);
}

module.exports = { normalizeCaseMcqList, normalizeOptionLetter, normalizeCorrectLetter };
