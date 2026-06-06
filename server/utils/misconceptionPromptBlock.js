'use strict';

function describeMisconceptionLine(m) {
    const desc = m.description || m.wrongOptionText || m.claimText || String(m.claimKey || m.tag || '');
    const count = m.count ? ` (missed ${m.count} times)` : '';
    const category = m.misconceptionCategory ? ` [${m.misconceptionCategory}]` : '';
    return `- ${desc}${category}${count}`;
}

/**
 * Shared misconception injection block for synthesis, case, and agent prompts.
 */
function formatMisconceptionPromptBlock({
    personalMisconceptions = [],
    inferredMisconceptions = [],
    style = 'general',
} = {}) {
    const personal = Array.isArray(personalMisconceptions) ? personalMisconceptions : [];
    const inferred = Array.isArray(inferredMisconceptions) ? inferredMisconceptions : [];
    const combined = [...personal.slice(0, 5), ...inferred.slice(0, 3)];
    if (combined.length === 0) return '';

    const lines = combined.map(describeMisconceptionLine).join('\n');
    const instructionByStyle = {
        synthesis: 'When writing clinical bottom line, key findings, and uncertainties, explicitly address these learner gaps. Do not assume mastery of the above concepts.',
        case: 'When generating MCQs and teaching points, explicitly address these gaps. Do not assume mastery of the above concepts.',
        agent: 'When teaching or quizzing, proactively remediate these gaps with concise contrasts between common wrong answers and correct reasoning.',
        general: 'Explicitly address these learner gaps; do not assume mastery.',
    };
    const instruction = instructionByStyle[style] || instructionByStyle.general;

    return `\nPERSONAL LEARNING CONTEXT — inferred misconceptions from past quiz performance:\n${lines}\n${instruction}\n`;
}

module.exports = { formatMisconceptionPromptBlock, describeMisconceptionLine };
