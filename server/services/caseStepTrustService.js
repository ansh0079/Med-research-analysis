'use strict';

/**
 * Commercial Phase 1 — case step trust helpers.
 * Never invent keyed answers without evidence. Prefer retry / recoverable error.
 */

function validateCaseStep(step) {
    if (!step || typeof step !== 'object') {
        return { ok: false, reason: 'missing_step' };
    }
    const options = Array.isArray(step.options) ? step.options.filter(Boolean) : [];
    if (options.length < 2) {
        return { ok: false, reason: 'insufficient_options' };
    }
    const correct = String(step.correctAnswer || '').trim();
    if (!correct) {
        return { ok: false, reason: 'missing_correct_answer' };
    }
    const optionMatched = options.some((opt) => {
        const text = String(opt);
        return text === correct
            || text.startsWith(`${correct}:`)
            || text.startsWith(`${correct} `)
            || text.startsWith(correct);
    });
    if (!optionMatched) {
        return { ok: false, reason: 'correct_answer_not_in_options' };
    }
    const unique = new Set(options.map((o) => String(o).trim().toLowerCase()));
    if (unique.size < options.length) {
        return { ok: false, reason: 'duplicate_options' };
    }
    return { ok: true };
}

/**
 * Generate a case step with one retry. Never returns an invented ungrounded fallback.
 * @returns {Promise<{ step: object|null, parsed: object|null, error: string|null, attempts: number }>}
 */
async function generateCaseStepWithRetry({
    callProvider,
    parseJsonBlock,
    buildPrompt,
    maxAttempts = 2,
    logWarn = null,
} = {}) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const prompt = typeof buildPrompt === 'function' ? buildPrompt(attempt) : buildPrompt;
            const { text } = await callProvider(prompt, 'auto');
            const parsed = parseJsonBlock(text);
            const step = parsed?.step || null;
            const check = validateCaseStep(step);
            if (check.ok) {
                return { step, parsed, error: null, attempts: attempt };
            }
            lastError = check.reason;
            logWarn?.({ attempt, reason: check.reason }, 'case step failed validation');
        } catch (err) {
            lastError = err?.message || 'generation_failed';
            logWarn?.({ err, attempt }, 'case step generation attempt failed');
        }
    }
    return {
        step: null,
        parsed: null,
        error: lastError || 'step_generation_failed',
        attempts: maxAttempts,
    };
}

module.exports = {
    validateCaseStep,
    generateCaseStepWithRetry,
};
