/**
 * Builds compact learner-trajectory text for agent prompts from durable learning_events.
 */

const logger = require('../config/logger');

function formatEventLine(event) {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
    const when = event.occurredAt ? String(event.occurredAt).slice(0, 16).replace('T', ' ') : '';
    const role = payload.role ? ` (${payload.role})` : '';
    const intent = payload.intent ? ` intent=${payload.intent}` : '';
    const score = payload.score != null && payload.totalQuestions != null
        ? ` score=${payload.score}/${payload.totalQuestions}`
        : '';
    const weak = Array.isArray(payload.weakAreas) && payload.weakAreas.length
        ? ` weak=${payload.weakAreas.slice(0, 3).join(', ')}`
        : '';
    const areas = Array.isArray(payload.misconceptions) && payload.misconceptions.length
        ? ` gaps=${payload.misconceptions.slice(0, 2).join('; ')}`
        : '';
    const focus = Array.isArray(payload.focusAreas) && payload.focusAreas.length
        ? ` focus=${payload.focusAreas.slice(0, 2).join('; ')}`
        : '';
    const breakthrough = payload.moment
        ? ` breakthrough=${String(payload.moment).slice(0, 80)}`
        : (Array.isArray(payload.breakthroughMoments) && payload.breakthroughMoments.length
            ? ` breakthrough=${payload.breakthroughMoments.slice(0, 1).join('; ')}`
            : '');
    return `- [${when}] ${event.eventType}${role}${intent}${score}${weak}${areas}${focus}${breakthrough}`.trim();
}

/**
 * @param {object} db
 * @param {string} userId
 * @param {string} topic
 * @param {{ limit?: number, days?: number }} [opts]
 * @returns {Promise<string|null>}
 */
async function buildLearningTrajectorySection(db, userId, topic, { limit = 12, days = 90 } = {}) {
    if (!db || !userId || !topic || typeof db.listLearningEvents !== 'function') {
        return null;
    }
    try {
        const events = await db.listLearningEvents({
            userId,
            topic,
            limit: Math.min(Math.max(limit, 1), 30),
        });
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const recent = (Array.isArray(events) ? events : []).filter((e) => {
            const t = e.occurredAt ? new Date(e.occurredAt).getTime() : 0;
            return !t || t >= cutoff;
        });
        if (recent.length === 0) return null;

        const lines = recent.slice(0, limit).map(formatEventLine);
        return `Recent learning activity on this topic (newest first):\n${lines.join('\n')}\nUse this to avoid repeating explanations the learner already received and to remediate known gaps.`;
    } catch (err) {
        logger.warn({ err, userId, topic }, 'buildLearningTrajectorySection failed');
        return null;
    }
}

function formatLearnerSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return '';
    const parts = [];
    if (Array.isArray(snapshot.focusAreas) && snapshot.focusAreas.length) {
        parts.push(`Focus areas: ${snapshot.focusAreas.slice(0, 4).join('; ')}`);
    }
    if (Array.isArray(snapshot.misconceptions) && snapshot.misconceptions.length) {
        parts.push(`Likely misconceptions: ${snapshot.misconceptions.slice(0, 4).join('; ')}`);
    }
    if (Array.isArray(snapshot.masteredThisSession) && snapshot.masteredThisSession.length) {
        parts.push(`Recently grasped: ${snapshot.masteredThisSession.slice(0, 3).join('; ')}`);
    }
    if (Array.isArray(snapshot.breakthroughMoments) && snapshot.breakthroughMoments.length) {
        const moments = snapshot.breakthroughMoments
            .map((entry) => (typeof entry === 'string' ? entry : entry?.moment))
            .filter(Boolean)
            .slice(0, 4);
        if (moments.length) {
            parts.push(`Breakthrough moments to build on: ${moments.join('; ')}`);
        }
    }
    if (snapshot.openQuestion) {
        parts.push(`Open question: ${String(snapshot.openQuestion).slice(0, 240)}`);
    }
    if (parts.length === 0) return '';
    return parts.join('\n');
}

module.exports = {
    buildLearningTrajectorySection,
    formatLearnerSnapshot,
    formatEventLine,
};
