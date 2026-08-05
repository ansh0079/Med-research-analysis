const logger = require('../../config/logger');

function formatRecentMessages(conversationHistory, count = 4) {
    if (!Array.isArray(conversationHistory)) return [];
    return conversationHistory.slice(-count).map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content || '').slice(0, 2000),
    }));
}

function normalizeConversationMessage(msg) {
    if (!msg || typeof msg !== 'object') return null;
    const content = String(msg.content || '').trim();
    if (!content) return null;
    return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: content.slice(0, 4000),
    };
}

function conversationMessageSignature(msg) {
    const normalized = normalizeConversationMessage(msg);
    if (!normalized) return null;
    return `${normalized.role}\u0000${normalized.content.replace(/\s+/g, ' ')}`;
}

function reconcileConversationHistory(clientHistory = [], persistedConversation = null, { maxMessages = 40 } = {}) {
    const merged = [];
    const seen = new Set();
    const persistedMessages = Array.isArray(persistedConversation?.messages)
        ? persistedConversation.messages.map(normalizeConversationMessage).filter(Boolean)
        : [];
    const clientMessages = Array.isArray(clientHistory)
        ? clientHistory.map(normalizeConversationMessage).filter(Boolean)
        : [];
    const addMessage = (msg) => {
        const normalized = normalizeConversationMessage(msg);
        if (!normalized) return;
        const signature = conversationMessageSignature(normalized);
        if (!signature || seen.has(signature)) return;
        seen.add(signature);
        merged.push(normalized);
    };

    persistedMessages.forEach(addMessage);

    if (persistedMessages.length === 0) {
        clientMessages.forEach(addMessage);
    } else {
        const persistedSignatures = persistedMessages.map(conversationMessageSignature).filter(Boolean);
        let lastOverlapIndex = -1;
        for (const signature of persistedSignatures) {
            const idx = clientMessages.findIndex((msg, i) => i > lastOverlapIndex && conversationMessageSignature(msg) === signature);
            if (idx >= 0) lastOverlapIndex = idx;
        }
        if (lastOverlapIndex >= 0) {
            clientMessages.slice(lastOverlapIndex + 1).forEach(addMessage);
        }
    }

    const safeMax = Math.max(1, Number(maxMessages) || 40);
    return merged.slice(-safeMax);
}

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

function buildSessionFeedbackContext(sessionFeedback) {
    if (!sessionFeedback) return '';
    const { topic, score, totalQuestions, weakAreas, lastExplanationTopic } = sessionFeedback;
    if (score == null || totalQuestions == null) return '';
    const pct = Math.round((score / totalQuestions) * 100);
    if (pct >= 60) return '';

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

function parseHistoryForProvider(conversationHistory, _provider) {
    return formatRecentMessages(conversationHistory, 12);
}

module.exports = {
    formatRecentMessages,
    normalizeConversationMessage,
    conversationMessageSignature,
    reconcileConversationHistory,
    summarizeOlderMessages,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
};
