const logger = require('../config/logger');

async function getPersonalisedRecommendations(db, userId, { limit = 8 } = {}) {
    const recommendations = [];
    const now = new Date();

    const [mastery, dueCards, recentSearches, recentQuizzes] = await Promise.all([
        db.all(
            `SELECT topic, normalized_topic, overall_score, recall_score,
                    clinical_application_score, guideline_score, pitfall_score,
                    attempts_count, last_attempt_at, next_review_at
             FROM user_topic_mastery WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`,
            [userId]
        ),
        db.all(
            `SELECT topic, normalized_topic, due_at, outline_label
             FROM spaced_rep_cards WHERE user_id = ? AND due_at <= ?
             ORDER BY due_at ASC LIMIT 20`,
            [userId, now.toISOString()]
        ),
        db.all(
            `SELECT query, created_at FROM searches
             WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)
             ORDER BY created_at DESC LIMIT 15`,
            [userId]
        ),
        db.all(
            `SELECT topic, normalized_topic, is_correct, created_at
             FROM quiz_attempts WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        ),
    ]);

    const masteryMap = new Map(mastery.map(m => [m.normalized_topic, m]));
    const touchedTopics = new Set(mastery.map(m => m.normalized_topic));

    // ── 1. Due reviews (highest priority) ────────────────────────────────────
    const dueByTopic = new Map();
    for (const card of dueCards) {
        if (!dueByTopic.has(card.normalized_topic)) {
            dueByTopic.set(card.normalized_topic, { topic: card.topic, count: 0, oldestDue: card.due_at });
        }
        dueByTopic.get(card.normalized_topic).count++;
    }
    for (const [normalizedTopic, info] of dueByTopic) {
        const daysOverdue = Math.max(0, Math.floor((now - new Date(info.oldestDue)) / 86400000));
        recommendations.push({
            type: 'review',
            topic: info.topic,
            normalizedTopic,
            reason: `${info.count} card${info.count > 1 ? 's' : ''} due for review${daysOverdue > 0 ? ` (${daysOverdue}d overdue)` : ''}`,
            action: 'quiz',
            priority: 95 + Math.min(daysOverdue, 10),
            icon: 'fa-redo',
        });
    }

    // ── 2. Weak topics (score < 60%) ─────────────────────────────────────────
    const weakTopics = mastery
        .filter(m => m.overall_score < 60 && m.attempts_count >= 3)
        .sort((a, b) => a.overall_score - b.overall_score);

    for (const w of weakTopics.slice(0, 3)) {
        const weakestType = getWeakestType(w);
        recommendations.push({
            type: 'strengthen',
            topic: w.topic,
            normalizedTopic: w.normalized_topic,
            reason: `Score ${w.overall_score}%${weakestType ? ` — weakest in ${weakestType}` : ''}. Targeted practice will help.`,
            action: 'quiz',
            priority: 85,
            icon: 'fa-bullseye',
        });
    }

    // ── 3. Searched but never quizzed ────────────────────────────────────────
    const searchedTopics = new Set();
    for (const s of recentSearches) {
        const normalized = (s.query || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
        if (normalized.length > 2 && !touchedTopics.has(normalized)) {
            searchedTopics.add(normalized);
        }
    }

    if (searchedTopics.size > 0) {
        const placeholders = [...searchedTopics].map(() => '?').join(',');
        const topicRows = await db.all(
            `SELECT topic, normalized_topic FROM topic_knowledge
             WHERE normalized_topic IN (${placeholders}) LIMIT 3`,
            [...searchedTopics]
        );
        for (const row of topicRows) {
            if (touchedTopics.has(row.normalized_topic)) continue;
            recommendations.push({
                type: 'explore',
                topic: row.topic,
                normalizedTopic: row.normalized_topic,
                reason: 'You searched this topic recently but haven\'t tested your knowledge yet.',
                action: 'topic',
                priority: 70,
                icon: 'fa-compass',
            });
        }
    }

    // ── 4. Cross-linked topics (adjacent to strong areas) ────────────────────
    const strongTopics = mastery.filter(m => m.overall_score >= 70).slice(0, 5);
    const crosslinkSuggestions = [];

    for (const strong of strongTopics) {
        try {
            const links = await db.getTopicCrosslinks(strong.normalized_topic, { limit: 5 });
            for (const link of links) {
                if (touchedTopics.has(link.normalizedTopic)) continue;
                if (crosslinkSuggestions.some(c => c.normalizedTopic === link.normalizedTopic)) continue;
                crosslinkSuggestions.push({
                    type: 'discover',
                    topic: link.topic,
                    normalizedTopic: link.normalizedTopic,
                    reason: `Related to ${strong.topic} (${Math.round(link.strength * 100)}% link strength). ${link.aiRationale ? link.aiRationale.split('.')[0] + '.' : ''}`,
                    action: 'topic',
                    priority: 60 + Math.round(link.strength * 20),
                    icon: 'fa-project-diagram',
                    sourceTopic: strong.topic,
                });
            }
        } catch (err) {
            logger.warn({ err, topic: strong.topic }, 'Cross-link lookup failed');
        }
    }
    recommendations.push(...crosslinkSuggestions.slice(0, 3));

    // ── 5. Stale topics (studied but not reviewed in 14+ days) ───────────────
    for (const m of mastery) {
        if (dueByTopic.has(m.normalized_topic)) continue;
        if (!m.last_attempt_at) continue;
        const daysSince = Math.floor((now - new Date(m.last_attempt_at)) / 86400000);
        if (daysSince >= 14) {
            recommendations.push({
                type: 'refresh',
                topic: m.topic,
                normalizedTopic: m.normalized_topic,
                reason: `Last studied ${daysSince} days ago. A quick review will prevent decay.`,
                action: 'quiz',
                priority: 50 + Math.min(daysSince, 30),
                icon: 'fa-clock',
            });
        }
    }

    // ── 6. Try a case scenario (for topics with decent mastery) ──────────────
    const caseCandidate = mastery.find(m => m.overall_score >= 50 && m.attempts_count >= 5);
    if (caseCandidate) {
        const hasDoneCase = await db.get(
            `SELECT id FROM case_attempts WHERE user_id = ? AND normalized_topic = ? LIMIT 1`,
            [userId, caseCandidate.normalized_topic]
        );
        if (!hasDoneCase) {
            recommendations.push({
                type: 'case',
                topic: caseCandidate.topic,
                normalizedTopic: caseCandidate.normalized_topic,
                reason: `You've built a foundation in ${caseCandidate.topic} — try a clinical case to apply your knowledge.`,
                action: 'case',
                priority: 55,
                icon: 'fa-stethoscope',
            });
        }
    }

    // ── 7. Cold start — no mastery data yet ──────────────────────────────────
    if (mastery.length === 0) {
        const popularTopics = await db.all(
            `SELECT topic, normalized_topic FROM topic_knowledge ORDER BY RANDOM() LIMIT 3`
        );
        for (const t of popularTopics) {
            recommendations.push({
                type: 'start',
                topic: t.topic,
                normalizedTopic: t.normalized_topic,
                reason: 'Get started with this clinical topic — read the synopsis and test yourself.',
                action: 'topic',
                priority: 40,
                icon: 'fa-play-circle',
            });
        }
    }

    // Sort by priority descending, take top N
    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations.slice(0, limit);
}

function getWeakestType(mastery) {
    const types = [
        { name: 'recall', score: mastery.recall_score },
        { name: 'clinical application', score: mastery.clinical_application_score },
        { name: 'guidelines', score: mastery.guideline_score },
        { name: 'pitfalls', score: mastery.pitfall_score },
    ].filter(t => t.score != null && t.score > 0);

    if (types.length === 0) return null;
    types.sort((a, b) => a.score - b.score);
    return types[0].score < 50 ? types[0].name : null;
}

module.exports = { getPersonalisedRecommendations };
