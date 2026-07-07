'use strict';

const logger = require('../../config/logger');
const { CLAIM_VERIFICATION, stableClaimKey } = require('../../services/teachingObjectService');

// ── Retrieval context formatters ─────────────────────────────────────────────

function compactTeachingObject(object) {
    const payload = object?.payload || {};
    const synopsis = payload.synopsis || {};
    const seed = payload.quizSeed || {};
    return [
        `- ${object.title || object.objectKey}`,
        object.objectType ? `type: ${object.objectType}` : '',
        object.confidence != null ? `confidence: ${Number(object.confidence).toFixed(2)}` : '',
        payload.clinicalBottomLine ? `bottom line: ${String(payload.clinicalBottomLine).slice(0, 260)}` : '',
        synopsis.mainFindings ? `findings: ${String(synopsis.mainFindings).slice(0, 260)}` : '',
        Array.isArray(seed.focusPoints) && seed.focusPoints.length ? `quiz focus: ${seed.focusPoints.slice(0, 3).join('; ')}` : '',
    ].filter(Boolean).join(' | ');
}

function compactGroundedClaim(claim) {
    return [
        `[CLAIM-${claim.claimKey}] ${String(claim.claimText || '').slice(0, 360)}`,
        claim.sourcePath ? `source path: ${claim.sourcePath}` : '',
        claim.evidenceQuote ? `quote/snippet: ${String(claim.evidenceQuote).slice(0, 300)}` : '',
        claim.confidence != null ? `confidence: ${Number(claim.confidence).toFixed(2)}` : '',
        claim.verificationStatus ? `verification: ${claim.verificationStatus}` : '',
    ].filter(Boolean).join('\n  ');
}

function buildRetrievalContext(retrieval = {}) {
    const teachingObjects = Array.isArray(retrieval.teachingObjects) ? retrieval.teachingObjects.slice(0, 3) : [];
    const groundedClaims = Array.isArray(retrieval.groundedClaims) ? retrieval.groundedClaims.slice(0, 5) : [];
    const claimMastery = Array.isArray(retrieval.claimMastery) ? retrieval.claimMastery : [];
    const weakClaims = claimMastery.filter((claim) => claim.masteryState === 'weak').slice(0, 3);
    const untestedClaims = claimMastery.filter((claim) => claim.masteryState === 'untested').slice(0, 3);
    const freshness = retrieval.freshness;

    const parts = [];
    if (teachingObjects.length) {
        parts.push(`### Top reusable teaching objects
${teachingObjects.map(compactTeachingObject).join('\n')}`);
    }
    if (groundedClaims.length) {
        parts.push(`### Top grounded claims
${groundedClaims.map(compactGroundedClaim).join('\n\n')}`);
    }
    if (weakClaims.length || untestedClaims.length) {
        parts.push(`### User claim mastery gaps
${weakClaims.length ? `Previously weak claims:\n${weakClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)} (${c.accuracy ?? 0}% accuracy)`).join('\n')}` : ''}
${untestedClaims.length ? `Untested claims:\n${untestedClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)}`).join('\n')}` : ''}`);
    }
    const personalHooks = Array.isArray(retrieval.personalGraphHooks) ? retrieval.personalGraphHooks : [];
    if (personalHooks.length) {
        parts.push(`### Personal knowledge graph — prior mistakes to reference
${personalHooks.map((h) => `- ${h.prompt}`).join('\n')}
When a new paper tests the same boundary, explicitly connect it to the learner's prior mistake.`);
    }
    if (freshness) {
        parts.push(`### Freshness and volatility
- Volatility: ${freshness.volatility}
- Confidence decay: ${Math.round((freshness.confidenceDecay || 0) * 100)}%
- Effective confidence: ${Math.round((freshness.effectiveConfidence || 0) * 100)}%
- Refresh priority: ${freshness.priorityScore}
- Reason: ${freshness.reason}
${freshness.confidenceDecay > 0.25 ? '- Knowledge gap: this topic memory is stale enough to warn the learner and suggest refresh/re-quiz.' : ''}`);
    }
    return parts.join('\n\n') || 'No reusable teaching objects or grounded claim mastery available yet.';
}

function buildAgentEvidenceAnchors({ currentArticles = [], guidelines = [], groundedClaims = [] } = {}) {
    return [
        ...(Array.isArray(currentArticles) ? currentArticles.slice(0, 5).map((article) => ({
            type: 'paper',
            uid: article.uid || article.pmid || article.doi || null,
            title: article.title,
            source: article.source || article.journal || null,
            confidence: article._quality?.score != null ? Number(article._quality.score) / 100 : null,
        })) : []),
        ...(Array.isArray(guidelines) ? guidelines.slice(0, 3).map((guideline) => ({
            type: 'guideline',
            uid: guideline.id || guideline.guidelineId || null,
            title: guideline.recommendationText || guideline.title,
            source: [guideline.sourceBody, guideline.sourceYear].filter(Boolean).join(' '),
            confidence: guideline.confidence || null,
            verificationStatus: guideline.reviewStatus || null,
        })) : []),
        ...(Array.isArray(groundedClaims) ? groundedClaims.slice(0, 6).map((claim) => ({
            type: 'grounded_claim',
            uid: claim.claimKey || null,
            title: claim.claimText,
            source: claim.sourcePath || null,
            confidence: claim.confidence || null,
            verificationStatus: claim.verificationStatus || null,
        })) : []),
    ];
}

// ── Intent classification ────────────────────────────────────────────────────

function inferDemandIntentRegex(message) {
    const text = String(message || '').toLowerCase();
    if (/quiz|mcq|test me|question/.test(text)) return 'quiz';
    if (/case|vignette|scenario/.test(text)) return 'case';
    if (/guideline|nice|aha|esc|who|recommendation/.test(text)) return 'guideline';
    if (/limit|bias|overclaim|critique|method|validity/.test(text)) return 'appraisal';
    if (/summary|summarise|synopsis|bottom line/.test(text)) return 'synopsis';
    return 'agent_chat';
}

const VALID_INTENTS = new Set(['quiz', 'case', 'guideline', 'appraisal', 'synopsis', 'agent_chat']);

function isLlmIntentClassifierEnabled() {
    return String(process.env.AGENT_LLM_INTENT_CLASSIFIER || '').toLowerCase() === 'true';
}

/**
 * Classify user intent for analytics and demand signals.
 * Regex handles the common cases; the LLM classifier is opt-in because this
 * runs after every agent turn and should not add default latency/cost.
 * Fire-and-forget: used for analytics and demand signals, not blocking.
 */
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

// ── Claim extraction ─────────────────────────────────────────────────────────

function extractGroundedClaimsFromReply(reply, { topic, objectKey }) {
    const claimRefPattern = /\[(?:CLAIM-[a-f0-9]{8,}|RES-\d+|MEM-\d+|G\d+)[^\]]*\]/i;
    return String(reply || '')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 40 && sentence.length <= 700 && claimRefPattern.test(sentence))
        .slice(0, 6)
        .map((sentence, ordinal) => ({
            claimKey: stableClaimKey(objectKey, sentence),
            ordinal,
            claimText: sentence,
            evidenceQuote: null,
            sourcePath: 'agent.answer',
            topic,
            conceptKey: 'agent_grounded_answer',
            confidence: 0.45,
            verificationStatus: CLAIM_VERIFICATION.AGENT_DRAFT,
            verificationReason: 'Claim was extracted from an agent chat answer and has not been source-verified.',
        }));
}

// ── Conversation context helpers ─────────────────────────────────────────────

/**
 * Keep last N messages verbatim for immediate context.
 */
function formatRecentMessages(conversationHistory, count = 4) {
    if (!Array.isArray(conversationHistory)) return [];
    return conversationHistory.slice(-count).map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content || '').slice(0, 2000),
    }));
}

/**
 * Summarise older messages into a concise context block using a cheap LLM call.
 * Falls back to simple truncation if no LLM is available or the call fails.
 */
async function summarizeOlderMessages(ai, conversationHistory, recentCount = 4, provider, model) {
    if (!Array.isArray(conversationHistory) || conversationHistory.length <= recentCount) {
        return null;
    }
    const olderMessages = conversationHistory.slice(0, -recentCount);
    if (olderMessages.length === 0) return null;

    const olderText = olderMessages
        .slice(-12)
        .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 500)}`)
        .join('\n');

    if (olderText.length < 100) return null;

    if (!ai) {
        return olderMessages.slice(-4)
            .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 200)}`)
            .join('\n');
    }

    try {
        const summary = await ai.callText(
            `Summarise this medical education conversation into 3-5 bullet points. Focus on: topics discussed, key conclusions reached, questions still open, and areas the learner struggled with.\n\n${olderText}`,
            provider,
            model,
            { temperature: 0.0, maxOutputTokens: 300, timeoutMs: 6000 }
        );
        return String(summary || '').trim() || null;
    } catch (err) {
        logger.debug({ err }, 'Conversation summarization failed, using truncation fallback');
        return olderMessages.slice(-4)
            .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 200)}`)
            .join('\n');
    }
}

/**
 * Build session feedback context from recent quiz performance.
 * Injected into the system prompt when the learner scored poorly after
 * the agent's previous explanation.
 */
function buildSessionFeedbackContext(sessionFeedback) {
    if (!sessionFeedback) return '';
    const { topic, score, totalQuestions, weakAreas, lastExplanationTopic } = sessionFeedback;
    if (score == null || totalQuestions == null) return '';
    const pct = Math.round((score / totalQuestions) * 100);
    if (pct >= 60) return ''; // Only inject feedback for poor scores

    const parts = [
        `\n## Session feedback — previous explanation did not land`,
        `The learner just scored ${score}/${totalQuestions} (${pct}%) on "${topic || lastExplanationTopic || 'this topic'}" immediately after your explanation.`,
        `Your previous teaching approach was insufficient. Adapt your strategy:`,
        `- Try a DIFFERENT angle: use analogies, clinical scenarios, or step-by-step reasoning instead of repeating the same points.`,
        `- Start from fundamentals before building to complexity.`,
        `- Ask the learner what confused them before launching into another explanation.`,
    ];
    if (Array.isArray(weakAreas) && weakAreas.length > 0) {
        parts.push(`- Specific weak areas: ${weakAreas.join(', ')}. Focus here.`);
    }
    return parts.join('\n');
}

// Keep backward-compatible export name
function parseHistoryForProvider(conversationHistory, _provider) {
    return formatRecentMessages(conversationHistory, 12);
}

module.exports = {
    compactTeachingObject,
    compactGroundedClaim,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    VALID_INTENTS,
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    inferDemandIntent,
    extractGroundedClaimsFromReply,
    formatRecentMessages,
    summarizeOlderMessages,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
};
