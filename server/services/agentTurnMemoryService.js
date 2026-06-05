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

function mergeSnapshots(existing, incoming) {
    const base = existing && typeof existing === 'object' ? existing : {};
    const add = incoming && typeof incoming === 'object' ? incoming : {};
    const uniq = (arr, extra = []) => [...new Set([...(Array.isArray(arr) ? arr : []), ...(Array.isArray(extra) ? extra : [])])].filter(Boolean).slice(0, 6);
    return {
        focusAreas: uniq(base.focusAreas, add.focusAreas),
        misconceptions: uniq(base.misconceptions, add.misconceptions),
        masteredThisSession: uniq(base.masteredThisSession, add.masteredThisSession),
        breakthroughMoments: mergeBreakthroughMoments(base.breakthroughMoments, add.breakthroughMoments),
        openQuestion: add.openQuestion || base.openQuestion || null,
        updatedAt: new Date().toISOString(),
    };
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
        const raw = await ai.callGemini(prompt, 'gemini-2.5-flash-lite', {
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
        const raw = await ai.callGemini(prompt, 'gemini-2.5-flash-lite', {
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
        turnSnapshot
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

module.exports = {
    mergeConversationSummary,
    extractTurnLearnerSnapshot,
    persistAgentTurnMemory,
    isAgentMemoryEnabled,
    isTrivialAgentTurn,
    mergeSnapshots,
    mergeBreakthroughMoments,
    normalizeBreakthroughMoment,
    safeJsonParse,
};
