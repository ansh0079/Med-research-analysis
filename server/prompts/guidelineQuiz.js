'use strict';

/**
 * Prompt builder for the auto-generated guideline-anchored MCQ teaching
 * objects that the search route seeds when a topic has fresh guideline
 * recommendations but no existing guideline MCQs.
 *
 * Previously this prompt was inlined as a 14-line template literal inside
 * `server/routes/search.js`, duplicating the MCQ shape contract that
 * `prompts/quiz.js` and `mcqGeneratorService.js` already own. Moving it here
 * makes the JSON shape contract explicit and testable.
 */

/**
 * Build the guideline-anchored MCQ prompt.
 * @param {string} topic
 * @param {Array<{ source?: string; title?: string; recommendationText?: string }>} guidelines
 * @returns {string}
 */
function buildGuidelineQuizPrompt(topic, guidelines = []) {
    const safeTopic = String(topic || '').slice(0, 200);
    const block = guidelines.slice(0, 5).map((g, i) =>
        `[G${i + 1}] ${g.source || ''}: ${g.title || ''}`
    ).join('\n');

    return `Generate 5 guideline-anchored MCQs about "${safeTopic}" for final-year medical students.

GUIDELINES:
${block}

Rules:
- Each MCQ must reference a specific guideline recommendation
- Use clinical vignettes with age, sex, presenting complaint
- 4 options (A-D), exactly one correct
- Mix difficulty: 2 medium, 2 hard, 1 easy
- Mix types: guideline, clinical_application, pitfall

Start your response with [ and end with ]. No markdown.
[{"type":"multiple_choice","questionType":"guideline|clinical_application|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences citing the guideline","guidelineRef":"source — recommendation","difficulty":"easy|medium|hard"}]`;
}

module.exports = { buildGuidelineQuizPrompt };
