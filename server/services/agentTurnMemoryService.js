/**
 * Persists rolling conversation summary and learner snapshot after each agent turn.
 */

const logger = require('../config/logger');
const { formatLearnerSnapshot } = require('./learnerStateService');
const { recordClaimGapsFromMisconceptions } = require('./claimRemediationService');

function isAgentMemoryEnabled() {
    return String(process.env.AGENT_TURN_MEMORY_ENABLED || 'true').toLowerCase() !== 'false';
}

function isTrivialAgentTurn(userMessage, assistantReply, {
    minUserChars = 24,
    minAssistantChars = 120,
} = {}) {
    const user = String(userMessage || '').trim();
    const assistant = String(assistantReply || '').trim();
    if (user.length < minUserChars) return true;
    if (assistant.length < minAssistantChars) return true;
    if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no)$/i.test(user)) return true;
    return false;
}

function safeJsonParse(raw, fallback = {}) {
    try {
        return JSON.parse(raw || JSON.stringify(fallback));
    } catch {
        return fallback;
    }
}

function normalizeBreakthroughMoment(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
        const moment = entry.trim();
        return moment ? { moment, at: new Date().toISOString() } : null;
    }
    if (typeof entry === 'object') {
        const moment = String(entry.moment || entry.text || '').trim();
        if (!moment) return null;
        return {
            moment: moment.slice(0, 240),
            at: entry.at || new Date().toISOString(),
        };
    }
    return null;
}

function mergeBreakthroughMoments(existing = [], incoming = []) {
    const merged = [];
    const seen = new Set();
    for (const raw of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
        const normalized = normalizeBreakthroughMoment(raw);
        if (!normalized) continue;
        const key = normalized.moment.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(normalized);
        if (merged.length >= 8) break;
    }
    return merged;
}

function normalizeEvidenceAnchor(anchor) {
    if (!anchor || typeof anchor !== 'object') return null;
    const type = String(anchor.type || '').trim();
    const title = String(anchor.title || anchor.claimText || anchor.recommendationText || '').replace(/\s+/g, ' ').trim();
    if (!type || !title) return null;
    return {
        type: type.slice(0, 40),
        title: title.slice(0, 220),
        uid: anchor.uid ? String(anchor.uid).slice(0, 120) : null,
        source: anchor.source ? String(anchor.source).slice(0, 120) : null,
        confidence: Number.isFinite(Number(anchor.confidence)) ? Number(anchor.confidence) : null,
        verificationStatus: anchor.verificationStatus ? String(anchor.verificationStatus).slice(0, 80) : null,
    };
}

function mergeEvidenceAnchors(existing = [], incoming = []) {
    const merged = [];
    const seen = new Set();
    for (const raw of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
        const anchor = normalizeEvidenceAnchor(raw);
        if (!anchor) continue;
        const key = `${anchor.type}:${anchor.uid || anchor.title}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(anchor);
        if (merged.length >= 12) break;
    }
    return merged;
}

function uniqStrings(arr, extra = [], max = 6) {
    return [...new Set([...(Array.isArray(arr) ? arr : []), ...(Array.isArray(extra) ? extra : [])])]
        .filter(Boolean)
        .slice(0, max);
}

function mergeSnapshots(existing, incoming) {
    const base = existing && typeof existing === 'object' ? existing : {};
    const add = incoming && typeof incoming === 'object' ? incoming : {};
    return {
        focusAreas: uniqStrings(base.focusAreas, add.focusAreas),
        misconceptions: uniqStrings(base.misconceptions, add.misconceptions),
        masteredThisSession: uniqStrings(base.masteredThisSession, add.masteredThisSession),
        breakthroughMoments: mergeBreakthroughMoments(base.breakthroughMoments, add.breakthroughMoments),
        evidenceAnchors: mergeEvidenceAnchors(base.evidenceAnchors, add.evidenceAnchors),
        learningPatterns: uniqStrings(base.learningPatterns, add.learningPatterns, 8),
        sessionReflection: add.sessionReflection || base.sessionReflection || null,
        openQuestion: add.openQuestion || base.openQuestion || null,
        updatedAt: new Date().toISOString(),
    };
}

function isSessionEndingTurn(userMessage, { sessionEnd = false, sessionFeedback = null } = {}) {
    if (sessionEnd || sessionFeedback) return true;
    const msg = String(userMessage || '').trim().toLowerCase();
    if (!msg) return false;
    if (/^(thanks|thank you|that's all|that is all|done for now|goodbye|bye|i'm done|im done|stop here|end session)\b/.test(msg)) {
        return true;
    }
    return /\b(done studying|finished for today|no more questions|wrap up|end of session)\b/.test(msg);
}

function formatConversationForReflection(conversationHistory = [], maxTurns = 8) {
    if (!Array.isArray(conversationHistory)) return '';
    return conversationHistory
        .slice(-maxTurns)
        .map((msg) => `${String(msg.role || 'user').slice(0, 12)}: ${String(msg.content || '').slice(0, 400)}`)
        .join('\n');
}

/**
 * Incrementally update rolling summary (cheap model).
 */
async function mergeConversationSummary(ai, existingSummary, userMessage, assistantReply, topic) {
    const user = String(userMessage || '').slice(0, 600);
    const assistant = String(assistantReply || '').slice(0, 900);
    const prior = String(existingSummary || '').trim();

    if (!ai) {
        const line = `User asked about ${topic}: ${user.slice(0, 120)}. Mentor highlighted: ${assistant.slice(0, 160)}.`;
        return prior ? `${prior}\n${line}` : line;
    }

    const prompt = prior
        ? `You maintain a medical learner's conversation memory for topic "${topic}".

Existing summary:
${prior.slice(0, 2000)}

Latest exchange:
User: ${user}
Assistant: ${assistant}

Update the summary to 4-6 bullet points covering: topics discussed, conclusions, open questions, and areas the learner still struggles with. Return bullets only.`
        : `Summarise this medical education exchange on "${topic}" into 4-6 bullet points (topics, conclusions, open questions, learner struggles).

User: ${user}
Assistant: ${assistant}

Return bullets only.`;

    try {
        const raw = await ai.callGemini(prompt, 'gemini-2.5-flash-lite' /* intentional: cheap model fine for conversational memory */, {
            temperature: 0.0,
            maxOutputTokens: 320,
            timeoutMs: 8000,
        });
        const text = String(raw || '').trim();
        return text || prior || null;
    } catch (err) {
        logger.debug({ err }, 'mergeConversationSummary failed');
        return prior || null;
    }
}

/**
 * Extract structured learner snapshot from the latest turn.
 */
async function extractTurnLearnerSnapshot(ai, userMessage, assistantReply, topic) {
    const fallback = {
        focusAreas: [],
        misconceptions: [],
        masteredThisSession: [],
        breakthroughMoments: [],
        openQuestion: null,
    };
    if (!ai) return fallback;

    const prompt = `From this medical tutoring exchange on "${topic}", extract JSON only:
{
  "focusAreas": ["short phrases of topics to reinforce"],
  "misconceptions": ["likely misunderstandings if any"],
  "masteredThisSession": ["points the learner seems to have grasped"],
  "breakthroughMoments": ["genuine aha moments, corrected misconceptions, or conceptual clicks — only if clearly present"],
  "openQuestion": "one open question or null"
}

User: ${String(userMessage || '').slice(0, 500)}
Assistant: ${String(assistantReply || '').slice(0, 700)}`;

    try {
        const raw = await ai.callGemini(prompt, 'gemini-2.5-flash-lite' /* intentional: cheap model fine for conversational memory */, {
            temperature: 0.0,
            maxOutputTokens: 280,
            timeoutMs: 6000,
        });
        const { parseJsonBlock } = require('../utils/parseJson');
        const parsed = parseJsonBlock(String(raw || ''));
        if (!parsed || typeof parsed !== 'object') return fallback;
        return {
            focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas.map(String).filter(Boolean).slice(0, 5) : [],
            misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions.map(String).filter(Boolean).slice(0, 5) : [],
            masteredThisSession: Array.isArray(parsed.masteredThisSession) ? parsed.masteredThisSession.map(String).filter(Boolean).slice(0, 5) : [],
            breakthroughMoments: mergeBreakthroughMoments([], parsed.breakthroughMoments || []),
            openQuestion: parsed.openQuestion ? String(parsed.openQuestion).slice(0, 240) : null,
        };
    } catch (err) {
        logger.debug({ err }, 'extractTurnLearnerSnapshot failed');
        return fallback;
    }
}

/**
 * @param {object} params
 */
async function persistAgentTurnMemory({
    db,
    ai,
    conversationId,
    userId,
    topic,
    userMessage,
    assistantReply,
    existingSummary = null,
    existingSnapshot = null,
    evidenceAnchors = [],
    metrics = null,
    minUserChars = Number(process.env.AGENT_TURN_MEMORY_MIN_USER_CHARS || 24),
    minAssistantChars = Number(process.env.AGENT_TURN_MEMORY_MIN_ASSISTANT_CHARS || 120),
}) {
    if (!db || !conversationId || typeof db.updateAgentConversationMemory !== 'function') {
        return null;
    }
    if (!isAgentMemoryEnabled()) {
        metrics?.increment?.('agent_memory.skipped', 1, { reason: 'disabled' });
        return { skipped: true, reason: 'disabled' };
    }
    if (isTrivialAgentTurn(userMessage, assistantReply, { minUserChars, minAssistantChars })) {
        metrics?.increment?.('agent_memory.skipped', 1, { reason: 'trivial_turn' });
        return { skipped: true, reason: 'trivial_turn' };
    }

    const started = Date.now();
    let summary;
    let turnSnapshot;
    try {
        [summary, turnSnapshot] = await Promise.all([
            mergeConversationSummary(ai, existingSummary, userMessage, assistantReply, topic),
            extractTurnLearnerSnapshot(ai, userMessage, assistantReply, topic),
        ]);
        metrics?.timing?.('agent_memory.persist_ms', Date.now() - started);
    } catch (err) {
        metrics?.increment?.('agent_memory.failed', 1);
        throw err;
    }

    const learnerSnapshot = mergeSnapshots(
        typeof existingSnapshot === 'object' ? existingSnapshot : safeJsonParse(existingSnapshot, {}),
        { ...turnSnapshot, evidenceAnchors }
    );

    await db.updateAgentConversationMemory(conversationId, {
        conversationSummary: summary,
        learnerSnapshot,
    });

    if (userId && typeof db.recordLearningEvent === 'function') {
        await db.recordLearningEvent({
            userId,
            eventType: 'agent_turn_memory',
            topic,
            sourceType: 'agent_conversation',
            sourceId: String(conversationId),
            payload: {
                focusAreas: learnerSnapshot.focusAreas,
                misconceptions: learnerSnapshot.misconceptions,
                breakthroughMoments: (learnerSnapshot.breakthroughMoments || []).map((b) => b.moment).slice(0, 4),
                evidenceAnchors: (learnerSnapshot.evidenceAnchors || []).slice(0, 8),
                openQuestion: learnerSnapshot.openQuestion,
                summaryChars: summary ? summary.length : 0,
            },
        }).catch((err) => logger.warn({ err }, 'agent_turn_memory event failed'));

        for (const breakthrough of (turnSnapshot.breakthroughMoments || []).slice(0, 3)) {
            await db.recordLearningEvent({
                userId,
                eventType: 'breakthrough_moment',
                topic,
                sourceType: 'agent_conversation',
                sourceId: String(conversationId),
                payload: {
                    moment: breakthrough.moment,
                    at: breakthrough.at,
                },
            }).catch((err) => logger.warn({ err }, 'breakthrough_moment event failed'));
        }

        await recordClaimGapsFromMisconceptions({
            db,
            userId,
            topic,
            misconceptions: turnSnapshot.misconceptions || learnerSnapshot.misconceptions,
            sourceType: 'agent_conversation',
            sourceId: String(conversationId),
        }).catch((err) => logger.warn({ err }, 'claim gap recording failed'));
    }

    return { conversationSummary: summary, learnerSnapshot, ms: Date.now() - started };
}

/**
 * Post-session reflection: extract durable learning patterns from the full thread.
 */
async function reflectOnAgentSession({
    db,
    ai,
    userId,
    topic,
    conversationId,
    conversationSummary = null,
    learnerSnapshot = null,
    conversationHistory = [],
    sessionFeedback = null,
}) {
    if (!db || !conversationId || !userId) return null;
    if (typeof db.updateAgentConversationMemory !== 'function') return null;

    const historyText = formatConversationForReflection(conversationHistory, 10);
    const summary = String(conversationSummary || '').slice(0, 2200);
    const fallback = {
        reflectionSummary: summary
            ? `Session on ${topic}: ${summary.split('\n').slice(0, 2).join(' ').slice(0, 240)}`
            : `Session on ${topic} ended.`,
        learningPatterns: [],
        reinforcedTopics: [],
        persistentGaps: [],
        nextStudyFocus: null,
    };

    let reflection = fallback;
    if (ai) {
        const feedbackBlock = sessionFeedback
            ? `Quiz feedback: ${sessionFeedback.score}/${sessionFeedback.totalQuestions}, weak areas: ${(sessionFeedback.weakAreas || []).join(', ')}`
            : 'No quiz feedback attached.';
        const prompt = `Reflect on this medical learner's tutoring session on "${topic}".
Extract durable learning patterns — not trivia, but how this learner reasons and what to reinforce next.

Conversation summary:
${summary || 'No stored summary.'}

Recent turns:
${historyText || 'No recent turns.'}

${feedbackBlock}

Return ONLY valid JSON:
{
  "reflectionSummary": "2-3 sentences",
  "learningPatterns": ["recurring reasoning habits or study patterns"],
  "reinforcedTopics": ["concepts grasped this session"],
  "persistentGaps": ["gaps that still need work"],
  "nextStudyFocus": "one concrete next step or null"
}`;

        try {
            const raw = await ai.callGemini(prompt, 'gemini-2.5-flash-lite' /* intentional: cheap model fine for conversational memory */, {
                temperature: 0.1,
                maxOutputTokens: 420,
                timeoutMs: 9000,
            });
            const { parseJsonBlock } = require('../utils/parseJson');
            const parsed = parseJsonBlock(String(raw || ''));
            if (parsed && typeof parsed === 'object') {
                reflection = {
                    reflectionSummary: String(parsed.reflectionSummary || fallback.reflectionSummary).slice(0, 500),
                    learningPatterns: Array.isArray(parsed.learningPatterns)
                        ? parsed.learningPatterns.map(String).filter(Boolean).slice(0, 6)
                        : [],
                    reinforcedTopics: Array.isArray(parsed.reinforcedTopics)
                        ? parsed.reinforcedTopics.map(String).filter(Boolean).slice(0, 6)
                        : [],
                    persistentGaps: Array.isArray(parsed.persistentGaps)
                        ? parsed.persistentGaps.map(String).filter(Boolean).slice(0, 6)
                        : [],
                    nextStudyFocus: parsed.nextStudyFocus ? String(parsed.nextStudyFocus).slice(0, 240) : null,
                };
            }
        } catch (err) {
            logger.debug({ err }, 'reflectOnAgentSession LLM failed');
        }
    }

    const baseSnapshot = typeof learnerSnapshot === 'object'
        ? learnerSnapshot
        : safeJsonParse(learnerSnapshot, {});
    const mergedSnapshot = mergeSnapshots(baseSnapshot, {
        learningPatterns: reflection.learningPatterns,
        reinforcedTopics: reflection.reinforcedTopics,
        persistentGaps: reflection.persistentGaps,
        sessionReflection: {
            summary: reflection.reflectionSummary,
            nextStudyFocus: reflection.nextStudyFocus,
            reflectedAt: new Date().toISOString(),
            hadQuizFeedback: Boolean(sessionFeedback),
        },
        focusAreas: reflection.persistentGaps,
        masteredThisSession: reflection.reinforcedTopics,
    });

    await db.updateAgentConversationMemory(conversationId, {
        conversationSummary: summary || null,
        learnerSnapshot: mergedSnapshot,
    });

    if (typeof db.recordLearningEvent === 'function') {
        await db.recordLearningEvent({
            userId,
            eventType: 'agent_session_reflection',
            topic,
            sourceType: 'agent_conversation',
            sourceId: String(conversationId),
            payload: {
                reflectionSummary: reflection.reflectionSummary,
                learningPatterns: reflection.learningPatterns,
                reinforcedTopics: reflection.reinforcedTopics,
                persistentGaps: reflection.persistentGaps,
                nextStudyFocus: reflection.nextStudyFocus,
                hadQuizFeedback: Boolean(sessionFeedback),
            },
        }).catch((err) => logger.warn({ err }, 'agent_session_reflection event failed'));
    }

    return { reflection, learnerSnapshot: mergedSnapshot };
}

module.exports = {
    mergeConversationSummary,
    extractTurnLearnerSnapshot,
    persistAgentTurnMemory,
    reflectOnAgentSession,
    isSessionEndingTurn,
    formatConversationForReflection,
    isAgentMemoryEnabled,
    isTrivialAgentTurn,
    mergeSnapshots,
    mergeBreakthroughMoments,
    mergeEvidenceAnchors,
    normalizeBreakthroughMoment,
    safeJsonParse,
};
