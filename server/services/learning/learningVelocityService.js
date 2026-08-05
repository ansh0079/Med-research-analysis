'use strict';

function computeVelocityFromSnapshots(snapshots = [], windowDays = 7) {
    const rows = (Array.isArray(snapshots) ? snapshots : [])
        .filter((row) => row && row.createdAt)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (rows.length < 2) {
        return null;
    }

    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const inWindow = rows.filter((row) => new Date(row.createdAt).getTime() >= cutoff);
    const series = inWindow.length >= 2 ? inWindow : rows.slice(-2);

    const oldest = series[0];
    const newest = series[series.length - 1];
    const daysSpanned = Math.max(
        (new Date(newest.createdAt).getTime() - new Date(oldest.createdAt).getTime()) / (24 * 60 * 60 * 1000),
        0.25
    );
    const fromScore = Number(oldest.overallScore ?? oldest.overall_score ?? 0);
    const toScore = Number(newest.overallScore ?? newest.overall_score ?? 0);
    const deltaPoints = toScore - fromScore;
    const pointsPerDay = Math.round((deltaPoints / daysSpanned) * 10) / 10;

    return {
        pointsPerDay,
        deltaPoints,
        windowDays,
        daysSpanned: Math.round(daysSpanned * 10) / 10,
        fromScore,
        toScore,
        snapshotCount: rows.length,
        trend: pointsPerDay > 0.5 ? 'improving' : pointsPerDay < -0.5 ? 'declining' : 'stable',
    };
}

async function recordMasterySnapshot(db, userId, topic, {
    overallScore,
    sessionScore = null,
    reason = 'quiz_session',
} = {}) {
    if (!db || !userId || !topic || typeof db.recordTopicMasterySnapshot !== 'function') {
        return null;
    }
    return db.recordTopicMasterySnapshot(userId, {
        topic,
        overallScore: Number(overallScore) || 0,
        sessionScore: sessionScore == null ? null : Number(sessionScore),
        snapshotReason: reason,
    });
}

async function getLearningVelocity(db, userId, topic, { days = 7, limit = 30 } = {}) {
    if (!db || !userId || !topic || typeof db.listTopicMasterySnapshots !== 'function') {
        return null;
    }
    const snapshots = await db.listTopicMasterySnapshots(userId, topic, { limit, days: Math.max(days, 7) });
    return computeVelocityFromSnapshots(snapshots, days);
}

function formatLearningVelocity(velocity) {
    if (!velocity) return '';
    const sign = velocity.pointsPerDay > 0 ? '+' : '';
    return `LEARNING VELOCITY: ${sign}${velocity.pointsPerDay} mastery points/day over ${velocity.daysSpanned}d (${velocity.fromScore}% → ${velocity.toScore}%, trend: ${velocity.trend}).`;
}

/**
 * Before/after mastery report for a topic, optionally noting recent agent tutoring.
 * Uses mastery snapshots (same source as learning velocity) plus learning_events.
 */
async function getQuizLiftReport(db, userId, topic, {
    days = 7,
    agentLookbackHours = 72,
} = {}) {
    if (!db || !userId || !topic) return null;
    const velocity = await getLearningVelocity(db, userId, topic, { days }).catch(() => null);
    if (!velocity) return null;

    let agentTutoredAt = null;
    const agentTypes = new Set(['agent_turn_completed', 'agent_message', 'agent_session_reflection']);
    const cutoffMs = Date.now() - Math.max(1, agentLookbackHours) * 60 * 60 * 1000;
    if (typeof db.listLearningEvents === 'function') {
        const events = await db.listLearningEvents({
            userId,
            topic,
            limit: 40,
        }).catch(() => []);
        const agentEvent = (Array.isArray(events) ? events : []).find((e) => {
            const type = String(e?.eventType || e?.event_type || '');
            if (!agentTypes.has(type)) return false;
            const ts = new Date(e?.occurredAt || e?.createdAt || e?.created_at || 0).getTime();
            return !ts || ts >= cutoffMs;
        });
        agentTutoredAt = agentEvent
            ? (agentEvent.occurredAt || agentEvent.createdAt || agentEvent.created_at || null)
            : null;
    }

    return {
        topic,
        beforeMastery: velocity.fromScore,
        afterMastery: velocity.toScore,
        deltaPoints: velocity.deltaPoints,
        pointsPerDay: velocity.pointsPerDay,
        trend: velocity.trend,
        daysSpanned: velocity.daysSpanned,
        snapshotCount: velocity.snapshotCount,
        afterAgentTutoring: Boolean(agentTutoredAt),
        agentTutoredAt,
        summary: velocity.deltaPoints > 0
            ? `Mastery ${velocity.fromScore}% → ${velocity.toScore}% (+${velocity.deltaPoints})`
            : velocity.deltaPoints < 0
                ? `Mastery ${velocity.fromScore}% → ${velocity.toScore}% (${velocity.deltaPoints})`
                : `Mastery steady at ${velocity.toScore}%`,
    };
}

module.exports = {
    computeVelocityFromSnapshots,
    recordMasterySnapshot,
    getLearningVelocity,
    getQuizLiftReport,
    formatLearningVelocity,
};
