'use strict';

const STATUS_RANK = {
    healthy: 0,
    insufficient_data: 1,
    watch: 2,
    degraded: 3,
};

const STATUS_SCORE = {
    healthy: 100,
    insufficient_data: 60,
    watch: 75,
    degraded: 35,
};

function clampDays(days) {
    return Math.min(90, Math.max(1, Number(days) || 7));
}

function sinceIso(days) {
    return new Date(Date.now() - clampDays(days) * 24 * 60 * 60 * 1000).toISOString();
}

function countValue(row, keys = ['count', 'cnt']) {
    if (!row) return 0;
    for (const key of keys) {
        if (row[key] != null) return Number(row[key] || 0);
    }
    return 0;
}

async function safeAll(db, sql, params = []) {
    if (!db?.all) return [];
    try {
        return await db.all(sql, params);
    } catch {
        return [];
    }
}

async function safeGet(db, sql, params = []) {
    if (!db?.get) return null;
    try {
        return await db.get(sql, params);
    } catch {
        return null;
    }
}

function worstStatus(statuses) {
    const nonEmpty = statuses.filter(Boolean);
    if (!nonEmpty.length) return 'insufficient_data';
    return nonEmpty.reduce((worst, status) =>
        STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst, nonEmpty[0]);
}

function pushCheck(checks, alerts, area, {
    status,
    label,
    value = null,
    threshold = null,
    message,
    action,
}) {
    const check = { status, label, value, threshold, message, action };
    checks.push(check);
    if (status === 'watch' || status === 'degraded') {
        alerts.push({
            severity: status === 'degraded' ? 'critical' : 'warning',
            area,
            message,
            action,
        });
    }
    return check;
}

function rate(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null;
}

function countByStatus(rows, status) {
    const row = (rows || []).find((item) => String(item.status) === status);
    return countValue(row);
}

module.exports = {
    STATUS_RANK,
    STATUS_SCORE,
    clampDays,
    sinceIso,
    countValue,
    safeAll,
    safeGet,
    worstStatus,
    pushCheck,
    rate,
    countByStatus,
};
