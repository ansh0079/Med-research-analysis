'use strict';

const logger = require('../config/logger');

const VALID_INTENTS = new Set(['quiz', 'case', 'guideline', 'appraisal', 'synopsis', 'agent_chat']);

const MAX_OUTPUT_TOKENS_BY_INTENT = {
    quiz: 2500,
    case: 2500,
    guideline: 2500,
    appraisal: 2500,
    synopsis: 4000,
    agent_chat: 1800,
};

function inferDemandIntentRegex(message) {
    const text = String(message || '').toLowerCase();
    if (/quiz|mcq|test me|question/.test(text)) return 'quiz';
    if (/case|vignette|scenario/.test(text)) return 'case';
    if (/guideline|nice|aha|esc|who|recommendation/.test(text)) return 'guideline';
    if (/limit|bias|overclaim|critique|method|validity/.test(text)) return 'appraisal';
    if (/summary|summarise|synopsis|bottom line/.test(text)) return 'synopsis';
    return 'agent_chat';
}

function isLlmIntentClassifierEnabled() {
    return String(process.env.AGENT_LLM_INTENT_CLASSIFIER || '').toLowerCase() === 'true';
}

async function inferDemandIntent(message, ai, provider, model) {
    const regexResult = inferDemandIntentRegex(message);
    if (!ai || !isLlmIntentClassifierEnabled()) return regexResult;
    try {
        const raw = await ai.callText(
            `Classify this medical learner message into exactly one category.\nCategories: quiz, case, guideline, appraisal, synopsis, agent_chat\n\nRules:\n- quiz: user wants MCQs, test questions, "quiz me", "test my knowledge"\n- case: user wants a clinical case, vignette, or scenario\n- guideline: user asks about clinical guidelines, recommendations from bodies (NICE, AHA, ESC, WHO)\n- appraisal: user wants to critique methodology, discuss bias, limitations, validity, study design\n- synopsis: user wants a summary, bottom line, or overview\n- agent_chat: general discussion, explanation request, anything else\n\nMessage: "${String(message || '').slice(0, 300)}"\n\nRespond with ONLY the category name, nothing else.`,
            provider,
            model,
            { temperature: 0.0, maxOutputTokens: 20, timeoutMs: 4000 }
        );
        const intent = String(raw || '').trim().toLowerCase().replace(/[^a-z_]/g, '');
        return VALID_INTENTS.has(intent) ? intent : regexResult;
    } catch (err) {
        logger.debug({ err }, 'LLM intent classification failed, using regex fallback');
        return regexResult;
    }
}

module.exports = {
    VALID_INTENTS,
    MAX_OUTPUT_TOKENS_BY_INTENT,
    inferDemandIntentRegex,
    inferDemandIntent,
    isLlmIntentClassifierEnabled,
};
