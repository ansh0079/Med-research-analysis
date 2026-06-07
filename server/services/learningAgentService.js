const logger = require('../config/logger');
const { applyRecommendationBandit } = require('./personalizationBanditService');

function safeJsonParse(raw, fallback = []) {
    try {
        return JSON.parse(raw || JSON.stringify(fallback));
    } catch {
        return fallback;
    }
}

function normalizeCandidate(db, value) {
    if (!value) return '';
    if (typeof db.normalizeTopic === 'function') return db.normalizeTopic(value);
    return String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function findTopicKnowledgeForCandidate(db, candidate) {
    const normalized = normalizeCandidate(db, candidate);
    if (!normalized || normalized.length < 2) return null;
    const like = `%${normalized}%`;
    return db.get(
        `SELECT topic, normalized_topic, confidence, updated_at, last_refreshed_at, knowledge
         FROM topic_knowledge
         WHERE normalized_topic = ?
            OR canonical_normalized = ?
            OR aliases_normalized LIKE ?
            OR LOWER(topic) = LOWER(?)
         ORDER BY
            CASE WHEN normalized_topic = ? THEN 0 ELSE 1 END,
            confidence DESC
         LIMIT 1`,
        [normalized, normalized, like, candidate, normalized]
    ).catch(() => null);
}

function daysSince(value, now = new Date()) {
    if (!value) return null;
    const t = new Date(value).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.max(0, Math.floor((now.getTime() - t) / 86400000));
}

function freshnessHint(topicRow, now = new Date()) {
    const ageDays = daysSince(topicRow?.last_refreshed_at || topicRow?.updated_at, now);
    if (ageDays == null) return null;
    if (ageDays >= 120) return { label: `Topic memory is ${ageDays} days old`, priorityBoost: 18 };
    if (ageDays >= 45) return { label: `Topic memory is ${ageDays} days old`, priorityBoost: 8 };
    return null;
}

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
            `SELECT topic, normalized_topic, question_type, is_correct, confidence, reasoning_tags, claim_key, created_at
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
    const searchedTopics = new Map();
    for (const s of recentSearches) {
        const normalized = normalizeCandidate(db, s.query);
        if (normalized.length > 2 && !touchedTopics.has(normalized)) {
            searchedTopics.set(normalized, s.query);
        }
    }

    if (searchedTopics.size > 0) {
        const topicRows = [];
        for (const [normalized, original] of searchedTopics) {
            const row = await findTopicKnowledgeForCandidate(db, original || normalized);
            if (row && !topicRows.some((t) => t.normalized_topic === row.normalized_topic)) {
                topicRows.push(row);
            }
            if (topicRows.length >= 3) break;
        }
        for (const row of topicRows) {
            if (touchedTopics.has(row.normalized_topic)) continue;
            const stale = freshnessHint(row, now);
            recommendations.push({
                type: 'explore',
                topic: row.topic,
                normalizedTopic: row.normalized_topic,
                reason: `You searched this topic recently but haven't tested your knowledge yet.${stale ? ` ${stale.label}; refresh as you learn.` : ''}`,
                action: 'topic',
                priority: 70 + (stale?.priorityBoost || 0),
                icon: 'fa-compass',
            });
        }
    }

    const quizGapByTopic = new Map();
    for (const attempt of recentQuizzes) {
        const normalizedTopic = attempt.normalized_topic || normalizeCandidate(db, attempt.topic);
        if (!normalizedTopic) continue;
        const tags = safeJsonParse(attempt.reasoning_tags || '[]', []);
        const highConfidenceWrong = Number(attempt.confidence || 0) >= 4 && Number(attempt.is_correct || 0) === 0;
        const isGap = highConfidenceWrong || tags.some((tag) => [
            'high_confidence_wrong',
            'knowledge_gap',
            'guideline_alignment_missed',
            'trial_design_weakness',
            'misses_applicability',
            'misses_outcome_hierarchy',
            'overclaims_evidence',
        ].includes(tag));
        if (!isGap) continue;
        const current = quizGapByTopic.get(normalizedTopic) || {
            topic: attempt.topic,
            normalizedTopic,
            highConfidenceWrong: 0,
            taggedGaps: 0,
            tags: new Set(),
        };
        if (highConfidenceWrong) current.highConfidenceWrong += 1;
        current.taggedGaps += tags.length ? 1 : 0;
        tags.forEach((tag) => current.tags.add(tag));
        quizGapByTopic.set(normalizedTopic, current);
    }
    for (const gap of [...quizGapByTopic.values()].slice(0, 4)) {
        const tagText = [...gap.tags].slice(0, 2).map((tag) => tag.replace(/_/g, ' ')).join(', ');
        recommendations.push({
            type: 'calibrate',
            topic: gap.topic,
            normalizedTopic: gap.normalizedTopic,
            reason: `${gap.highConfidenceWrong ? `${gap.highConfidenceWrong} high-confidence wrong answer${gap.highConfidenceWrong > 1 ? 's' : ''}` : 'Recent reasoning gap'}${tagText ? ` (${tagText})` : ''}. Re-test with explanation before moving on.`,
            action: 'quiz',
            priority: 82 + Math.min(gap.highConfidenceWrong * 4 + gap.taggedGaps, 14),
            icon: 'fa-balance-scale',
        });
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

    // ── Agent session reflection (tutor-identified gaps) ───────────────────
    if (typeof db.listLearningEvents === 'function') {
        const reflectionEvents = await db.listLearningEvents({
            userId,
            eventType: 'agent_session_reflection',
            limit: 3,
        }).catch((err) => {
            logger.warn({ err, userId }, 'listLearningEvents agent_session_reflection failed');
            return [];
        });
        for (const event of reflectionEvents.slice(0, 2)) {
            const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
            const focus = String(payload.nextStudyFocus || '').trim();
            const gaps = Array.isArray(payload.persistentGaps) ? payload.persistentGaps : [];
            const topicLabel = String(event.topic || focus || '').trim();
            const normalizedTopic = normalizeCandidate(db, topicLabel);
            if (focus && normalizedTopic) {
                recommendations.push({
                    type: 'strengthen',
                    topic: topicLabel.slice(0, 120) || focus.slice(0, 120),
                    normalizedTopic,
                    reason: `From your tutor session: ${focus.slice(0, 160)}`,
                    action: 'quiz',
                    priority: 92,
                    icon: 'fa-user-md',
                });
            }
            for (const gap of gaps.slice(0, 2)) {
                const gapText = String(gap || '').trim();
                if (gapText.length < 8) continue;
                recommendations.push({
                    type: 'strengthen',
                    topic: gapText.slice(0, 120),
                    normalizedTopic: normalizeCandidate(db, `${topicLabel} ${gapText}`) || normalizedTopic,
                    reason: `Persistent gap from tutor: ${gapText.slice(0, 140)}`,
                    action: 'quiz',
                    priority: 90,
                    icon: 'fa-lightbulb',
                });
            }
        }
    }

    // ── 7. Cold start — no mastery data yet ──────────────────────────────────
    if (mastery.length === 0) {
        const randomExpr = db.isPostgres ? 'random()' : 'RANDOM()';
        const popularTopics = await db.all(
            `SELECT topic, normalized_topic, confidence, updated_at, last_refreshed_at
             FROM topic_knowledge
             ORDER BY confidence DESC, ${randomExpr}
             LIMIT 6`
        );
        for (const t of popularTopics.slice(0, 3)) {
            const stale = freshnessHint(t, now);
            recommendations.push({
                type: 'start',
                topic: t.topic,
                normalizedTopic: t.normalized_topic,
                reason: `Get started with this clinical topic: read the synopsis and test yourself.${stale ? ` ${stale.label}; verify current evidence.` : ''}`,
                action: 'topic',
                priority: 40 + (stale ? 5 : 0),
                icon: 'fa-play-circle',
            });
        }
    }

    const banditRanked = await applyRecommendationBandit(db, userId, recommendations);
    return banditRanked.slice(0, limit);
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

module.exports = {
    getPersonalisedRecommendations,
    normalizeCandidate,
    freshnessHint,
};
