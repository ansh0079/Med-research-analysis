'use strict';

const { safeJsonParse } = require('../../database/lib/helpers');

function safeRate(numerator, denominator) {
    const n = Number(numerator || 0);
    const d = Number(denominator || 0);
    return d > 0 ? n / d : null;
}

function mean(values) {
    const nums = values.map(Number).filter((value) => Number.isFinite(value));
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function percentile(values, p) {
    const nums = values.map(Number).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!nums.length) return null;
    const index = Math.min(nums.length - 1, Math.max(0, Math.ceil((p / 100) * nums.length) - 1));
    return nums[index];
}

function bucketCounts(values) {
    return values.reduce((acc, value) => {
        const key = String(value || 'unknown');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function summarizeSourceCache(events) {
    const bySource = {};
    for (const event of events) {
        const sourceCache = safeJsonParse(event.metadata, {})?.sourceCache || {};
        for (const [source, stats] of Object.entries(sourceCache)) {
            const row = bySource[source] || { hits: 0, misses: 0, shared: 0 };
            row.hits += Number(stats?.hits || 0);
            row.misses += Number(stats?.misses || 0);
            row.shared += Number(stats?.shared || 0);
            bySource[source] = row;
        }
    }
    return Object.fromEntries(Object.entries(bySource).map(([source, stats]) => [
        source,
        {
            ...stats,
            hitRate: safeRate(stats.hits, stats.hits + stats.misses),
        },
    ]));
}

function summarizeShadowRanker(events) {
    const rows = events
        .map((event) => safeJsonParse(event.metadata, {})?.shadowRanker)
        .filter(Boolean);
    const applied = rows.filter((row) => row.applied).length;
    const deltas = rows.map((row) => row.agreement?.meanAbsoluteRankDelta).filter((value) => value != null);
    const top1Changed = rows.filter((row) => row.agreement?.top1Changed).length;
    return {
        sampleSize: rows.length,
        applied,
        modeCounts: bucketCounts(rows.map((row) => row.mode || 'shadow')),
        meanAbsoluteRankDelta: mean(deltas),
        top1ChangeRate: safeRate(top1Changed, rows.length),
    };
}

function summarizeIntentMix(searchRows = [], eventRows = []) {
    const intents = [];
    for (const row of searchRows) {
        const filters = safeJsonParse(row.filters, {});
        intents.push(filters?.queryIntent || filters?.queryIntentProfile?.primaryIntent || null);
    }
    if (intents.filter(Boolean).length === 0) {
        for (const event of eventRows) {
            const meta = safeJsonParse(event.metadata, {});
            if (meta.queryIntent) intents.push(meta.queryIntent);
        }
    }
    return bucketCounts(intents.filter(Boolean));
}

async function collectSearchQualityDashboard(db, { days = 7, limit = 20 } = {}) {
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 90);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();

    const [
        searchRows,
        eventRows,
        impressionRows,
        noClick,
        feedback,
        lowRecall,
    ] = await Promise.all([
        db.all(
            `SELECT id, query, normalized_topic, filters, sources, results_count, execution_time_ms, created_at
             FROM searches
             WHERE created_at >= ?
             ORDER BY created_at DESC
             LIMIT 5000`,
            [since]
        ).catch(() => []),
        db.all(
            `SELECT metadata, created_at
             FROM analytics
             WHERE event_type = 'search'
               AND created_at >= ?
             ORDER BY created_at DESC
             LIMIT 5000`,
            [since]
        ).catch(() => []),
        db.all(
            `SELECT position, was_clicked, was_saved, dwell_time_ms
             FROM search_result_impressions
             WHERE created_at >= ?`,
            [since]
        ).catch(() => []),
        typeof db.getSearchNoClickStats === 'function'
            ? db.getSearchNoClickStats(safeDays).catch(() => null)
            : Promise.resolve(null),
        typeof db.getSearchFeedbackStats === 'function'
            ? db.getSearchFeedbackStats(safeDays).catch(() => null)
            : Promise.resolve(null),
        typeof db.getLowRecallSearchStatsWindow === 'function'
            ? db.getLowRecallSearchStatsWindow(safeDays, safeLimit).catch(() => [])
            : Promise.resolve([]),
    ]);

    const searches = searchRows.length;
    const zeroResultSearches = searchRows.filter((row) => Number(row.results_count || 0) === 0).length;
    const latencies = searchRows.map((row) => Number(row.execution_time_ms)).filter(Number.isFinite);
    const clicked = impressionRows.filter((row) => Number(row.was_clicked || 0) === 1).length;
    const saved = impressionRows.filter((row) => Number(row.was_saved || 0) === 1).length;
    const meaningfulDwell = impressionRows.filter((row) => Number(row.dwell_time_ms || 0) >= 30000).length;
    const cacheHits = eventRows.filter((event) => safeJsonParse(event.metadata, {})?.resultSetCacheHit).length;

    const topQueries = Object.entries(bucketCounts(searchRows.map((row) => row.normalized_topic || row.query)))
        .sort((a, b) => b[1] - a[1])
        .slice(0, safeLimit)
        .map(([query, count]) => ({ query, count }));

    return {
        generatedAt: new Date().toISOString(),
        windowDays: safeDays,
        summary: {
            searches,
            zeroResultRate: safeRate(zeroResultSearches, searches),
            resultSetCacheHitRate: safeRate(cacheHits, eventRows.length),
            p50LatencyMs: percentile(latencies, 50),
            p95LatencyMs: percentile(latencies, 95),
            clickThroughRate: safeRate(clicked, impressionRows.length),
            saveRate: safeRate(saved, impressionRows.length),
            meaningfulDwellRate: safeRate(meaningfulDwell, impressionRows.length),
            noClickRate: noClick?.noClickRate ?? null,
            feedbackNotHelpfulRate: feedback?.notHelpfulRate ?? null,
        },
        intentMix: summarizeIntentMix(searchRows, eventRows),
        sourceCache: summarizeSourceCache(eventRows),
        shadowRanker: summarizeShadowRanker(eventRows),
        topQueries,
        lowRecallQueries: Array.isArray(lowRecall) ? lowRecall.slice(0, safeLimit).map((row) => ({
            query: row.display_query,
            normalizedTopic: row.normalized_topic,
            resultCount: Number(row.result_count || 0),
            attemptCount: Number(row.attempt_count || 0),
            lastSeenAt: row.last_seen_at,
        })) : [],
    };
}

module.exports = { collectSearchQualityDashboard };
