'use strict';

const logger = require('../config/logger');
const { sanitizeUserInput } = require('../utils/sanitization');

/**
 * Agent Self-Improvement Service
 * 
 * Tracks agent mistakes, user corrections, and conversation quality signals
 * to enable continuous learning and adaptation.
 */

/**
 * Analyzes a conversation thread for quality signals and learning opportunities
 */
async function analyzeConversationQuality(db, threadId) {
    const thread = await db.getAgentThread(threadId).catch(() => null);
    if (!thread || !Array.isArray(thread.messages)) {
        return null;
    }
    
    const messages = thread.messages;
    const userId = thread.userId;
    const topic = sanitizeUserInput(thread.metadata?.topic || 'general', 200);
    
    // Signal 1: Detect explicit user corrections
    const correctionSignals = [
        /actually/i,
        /incorrect/i,
        /wrong/i,
        /no that's not/i,
        /you misunderstood/i,
        /that's not right/i,
        /you're mistaken/i
    ];
    
    const corrections = messages.filter((m, idx) => 
        m.role === 'user' && 
        idx > 0 &&  // Must have previous agent message
        correctionSignals.some(pattern => pattern.test(m.content))
    );
    const mistakes = [];
    
    if (corrections.length > 0) {
        logger.info({ threadId, corrections: corrections.length }, 'User corrections detected in thread');
        
        // Extract what the agent got wrong
        for (let i = 0; i < corrections.length; i++) {
            const correctionIdx = messages.indexOf(corrections[i]);
            const agentMsg = messages.slice(0, correctionIdx).reverse().find(m => m.role === 'assistant');
            
            if (agentMsg) {
                mistakes.push({
                    agentClaim: sanitizeUserInput(agentMsg.content.slice(0, 500), 500),
                    userCorrection: sanitizeUserInput(corrections[i].content.slice(0, 500)),
                    topic,
                    timestamp: corrections[i].timestamp || new Date().toISOString()
                });
            }
        }
        
        // Store as agent mistakes for future avoidance
        for (const mistake of mistakes) {
            await recordAgentMistake(db, {
                userId,
                topic: mistake.topic,
                incorrectClaim: mistake.agentClaim,
                userCorrection: mistake.userCorrection,
                threadId,
                learnedAt: mistake.timestamp
            });
        }
    }
    
    // Signal 2: Detect helpfulness feedback
    const userFeedback = thread.metadata?.userFeedback;
    if (userFeedback) {
        if (userFeedback.rating === 'helpful') {
            await recordHelpfulPattern(db, {
                userId,
                topic,
                threadId,
                messageCount: messages.length,
                conversationSummary: summarizeConversation(messages),
                timestamp: new Date().toISOString()
            });
        } else if (userFeedback.rating === 'unhelpful') {
            const lastAgentMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];
            await recordUnhelpfulPattern(db, {
                userId,
                topic,
                threadId,
                promptContext: extractContext(messages.slice(-4, -1)),
                unhelpfulResponse: lastAgentMsg?.content.slice(0, 500),
                reason: userFeedback.reason || 'not_specified',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Signal 3: Detect confusion or clarification requests
    const clarificationSignals = [
        /what do you mean/i,
        /can you explain/i,
        /i don't understand/i,
        /confusing/i,
        /clarify/i
    ];
    
    const clarificationRequests = messages.filter(m => 
        m.role === 'user' && 
        clarificationSignals.some(pattern => pattern.test(m.content))
    );
    
    if (clarificationRequests.length > 1) {
        // Multiple clarification requests suggest explanation style issues
        await recordExplanationIssue(db, {
            userId,
            topic,
            threadId,
            clarificationCount: clarificationRequests.length,
            conversationSummary: summarizeConversation(messages),
            timestamp: new Date().toISOString()
        });
    }
    
    return {
        analyzed: true,
        corrections: corrections.length,
        helpfulnessRating: userFeedback?.rating,
        clarificationRequests: clarificationRequests.length,
        learnedMistakes: mistakes.length
    };
}

/**
 * Records an agent mistake that was corrected by the user
 */
async function recordAgentMistake(db, { userId, topic, incorrectClaim, userCorrection, threadId, learnedAt }) {
    try {
        await db.run(
            `INSERT INTO agent_mistakes (
                user_id, topic, normalized_topic, incorrect_claim, user_correction,
                thread_id, learned_at, occurrence_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(user_id, topic, incorrect_claim) DO UPDATE SET
                occurrence_count = occurrence_count + 1,
                last_occurred_at = excluded.learned_at,
                user_correction = excluded.user_correction`,
            [
                userId,
                topic,
                db.normalizeTopic(topic),
                incorrectClaim,
                userCorrection,
                threadId,
                learnedAt
            ]
        );
        
        logger.info({ userId, topic }, 'Agent mistake recorded for future avoidance');
    } catch (err) {
        logger.warn({ err, userId, topic }, 'Failed to record agent mistake');
    }
}

/**
 * Records a helpful conversation pattern
 */
async function recordHelpfulPattern(db, { userId, topic, threadId, messageCount, conversationSummary, timestamp }) {
    try {
        await db.run(
            `INSERT INTO agent_helpful_patterns (
                user_id, topic, normalized_topic, thread_id, message_count,
                conversation_summary, recorded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, topic, db.normalizeTopic(topic), threadId, messageCount, conversationSummary, timestamp]
        );
    } catch (err) {
        logger.warn({ err }, 'Failed to record helpful pattern');
    }
}

/**
 * Records an unhelpful conversation pattern
 */
async function recordUnhelpfulPattern(db, { userId, topic, threadId, promptContext, unhelpfulResponse, reason, timestamp }) {
    try {
        await db.run(
            `INSERT INTO agent_unhelpful_patterns (
                user_id, topic, normalized_topic, thread_id, prompt_context,
                unhelpful_response, reason, recorded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, topic, db.normalizeTopic(topic), threadId, promptContext, unhelpfulResponse, reason, timestamp]
        );
    } catch (err) {
        logger.warn({ err }, 'Failed to record unhelpful pattern');
    }
}

/**
 * Records an explanation issue (multiple clarification requests)
 */
async function recordExplanationIssue(db, { userId, topic, threadId, clarificationCount, conversationSummary, timestamp }) {
    try {
        await db.run(
            `INSERT INTO agent_explanation_issues (
                user_id, topic, normalized_topic, thread_id, clarification_count,
                conversation_summary, recorded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, topic, db.normalizeTopic(topic), threadId, clarificationCount, conversationSummary, timestamp]
        );
    } catch (err) {
        logger.warn({ err }, 'Failed to record explanation issue');
    }
}

/**
 * Retrieves agent mistakes for a user/topic to avoid in future conversations
 */
async function getAgentMistakesForContext(db, userId, topic) {
    try {
        const mistakes = await db.all(
            `SELECT incorrect_claim, user_correction, occurrence_count, learned_at
             FROM agent_mistakes
             WHERE user_id = ? AND normalized_topic = ?
             ORDER BY occurrence_count DESC, learned_at DESC
             LIMIT 5`,
            [userId, db.normalizeTopic(topic)]
        );
        
        return mistakes.map(m => ({
            avoidClaim: m.incorrect_claim,
            correctVersion: m.user_correction,
            timesRepeated: m.occurrence_count
        }));
    } catch (err) {
        logger.warn({ err, userId, topic }, 'Failed to retrieve agent mistakes');
        return [];
    }
}

/**
 * Gets explanation preferences based on past interactions
 */
async function getUserExplanationPreferences(db, userId) {
    try {
        // Analyze past helpful vs unhelpful patterns
        const helpful = await db.all(
            `SELECT conversation_summary FROM agent_helpful_patterns
             WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 10`,
            [userId]
        );
        
        const unhelpful = await db.all(
            `SELECT reason, prompt_context FROM agent_unhelpful_patterns
             WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 10`,
            [userId]
        );
        
        // Simple heuristics for preferences
        const preferences = {
            prefersAnalogies: false,
            needsMoreExamples: false,
            vocabulary: 'clinical',  // 'clinical' | 'layperson' | 'technical'
            preferredExplanationLength: 'moderate'  // 'brief' | 'moderate' | 'detailed'
        };
        
        // Check for clarification patterns
        const clarificationIssues = await db.get(
            `SELECT COUNT(*) as count FROM agent_explanation_issues WHERE user_id = ?`,
            [userId]
        );
        
        if (clarificationIssues && clarificationIssues.count > 3) {
            preferences.needsMoreExamples = true;
            preferences.preferredExplanationLength = 'detailed';
        }
        
        // Check for "too technical" feedback
        const tooTechnical = unhelpful.filter(u => 
            u.reason?.includes('technical') || 
            u.reason?.includes('jargon') ||
            u.reason?.includes('complicated')
        ).length;
        
        if (tooTechnical > 2) {
            preferences.vocabulary = 'layperson';
            preferences.prefersAnalogies = true;
        }
        
        return preferences;
    } catch (err) {
        logger.warn({ err, userId }, 'Failed to get explanation preferences');
        return null;
    }
}

function hasCustomExplanationPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') return false;
    return preferences.prefersAnalogies === true
        || preferences.needsMoreExamples === true
        || preferences.vocabulary === 'layperson'
        || preferences.preferredExplanationLength === 'brief'
        || preferences.preferredExplanationLength === 'detailed';
}

/**
 * Helper: Summarizes conversation for pattern recognition
 */
function summarizeConversation(messages) {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const agentMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);
    
    return JSON.stringify({
        userQuestions: userMessages.length,
        agentResponses: agentMessages.length,
        averageUserMsgLength: Math.round(userMessages.reduce((sum, m) => sum + m.length, 0) / userMessages.length || 0),
        averageAgentMsgLength: Math.round(agentMessages.reduce((sum, m) => sum + m.length, 0) / agentMessages.length || 0)
    });
}

/**
 * Helper: Extracts conversation context
 */
function extractContext(messages) {
    return messages.map(m => ({
        role: m.role,
        contentPreview: m.content.slice(0, 150)
    })).map(JSON.stringify).join('\n');
}

module.exports = {
    analyzeConversationQuality,
    recordAgentMistake,
    getAgentMistakesForContext,
    getUserExplanationPreferences,
    hasCustomExplanationPreferences,
    recordHelpfulPattern,
    recordUnhelpfulPattern,
    recordExplanationIssue
};
