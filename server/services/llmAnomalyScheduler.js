'use strict';

// Daily check of the LLM usage log for the two failure shapes that went
// unnoticed for weeks: one topic-level job regenerating the same topic over and
// over (AKI/PE topic knowledge ran ~46x a day each while logging "refreshed"),
// and spend jumping far above its recent baseline. Findings go to Sentry and
// the log; nothing is blocked.

const cron = require('node-cron');
const Sentry = require('@sentry/node');
const { withCronHeartbeat } = require('./cronHeartbeat');

// Operations that should run about once per topic per day at most. Per-paper
// operations (synopsis, article tools) legitimately repeat within a topic.
const TOPIC_LEVEL_OPERATIONS = [
    'topic_knowledge_extraction',
    'seminal_knowledge_extraction',
    'community_seminal_refinement',
    'topic_evolution',
    'synthesis',
    'consensus_synopsis',
    'live_clinical_answer',
    'conflict_extraction',
    'guideline_synthesis',
    'flagship_knowledge_script',
];

let task = null;

function utcDay(date) {
    return date.toISOString().slice(0, 10);
}

/**
 * Examines one complete UTC day (default: yesterday). Days are compared on the
 * YYYY-MM-DD prefix because created_at has been written in more than one format.
 */
async function detectLlmAnomalies(db, {
    now = new Date(),
    repeatThreshold = Number(process.env.LLM_ANOMALY_REPEAT_THRESHOLD || 5),
    spendMultiplier = Number(process.env.LLM_ANOMALY_SPEND_MULTIPLIER || 2),
    minSpendUsd = Number(process.env.LLM_ANOMALY_MIN_SPEND_USD || 1),
} = {}) {
    const day = utcDay(new Date(now.getTime() - 86400000));
    const baselineStart = utcDay(new Date(now.getTime() - 8 * 86400000));
    const baselineEnd = utcDay(new Date(now.getTime() - 2 * 86400000));
    const ops = TOPIC_LEVEL_OPERATIONS;

    const repeats = await db.all(
        `SELECT operation, normalized_topic AS topic, COUNT(*) AS calls
         FROM llm_usage_log
         WHERE substr(created_at, 1, 10) = ?
           AND normalized_topic IS NOT NULL
           AND operation IN (${ops.map(() => '?').join(',')})
         GROUP BY operation, normalized_topic
         HAVING COUNT(*) > ?
         ORDER BY calls DESC
         LIMIT 20`,
        [day, ...ops, repeatThreshold]
    );

    const daily = await db.all(
        `SELECT substr(created_at, 1, 10) AS day, SUM(estimated_cost_usd) AS usd
         FROM llm_usage_log
         WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?
         GROUP BY substr(created_at, 1, 10)`,
        [baselineStart, day]
    );
    const usdOn = (d) => Number(daily.find((r) => r.day === d)?.usd || 0);
    const baselineDays = daily.filter((r) => r.day >= baselineStart && r.day <= baselineEnd);
    const baselineAvg = baselineDays.length
        ? baselineDays.reduce((sum, r) => sum + Number(r.usd || 0), 0) / 7
        : 0;
    const daySpend = usdOn(day);
    const spendSpike = daySpend >= minSpendUsd && daySpend > spendMultiplier * baselineAvg
        ? { day, usd: Number(daySpend.toFixed(2)), baselineAvgUsd: Number(baselineAvg.toFixed(2)) }
        : null;

    return {
        day,
        repeats: repeats.map((r) => ({ operation: r.operation, topic: r.topic, calls: Number(r.calls) })),
        spendSpike,
    };
}

function reportLlmAnomalies(findings, logger = console) {
    const { repeats, spendSpike } = findings;
    if (!repeats.length && !spendSpike) return false;
    const parts = [];
    if (repeats.length) {
        const top = repeats.slice(0, 3).map((r) => `${r.operation} "${r.topic}" x${r.calls}`).join('; ');
        parts.push(`${repeats.length} topic-level job(s) repeated: ${top}`);
    }
    if (spendSpike) {
        parts.push(`LLM spend $${spendSpike.usd} vs 7-day avg $${spendSpike.baselineAvgUsd}`);
    }
    const message = `LLM usage anomaly on ${findings.day}: ${parts.join(' | ')}`;
    logger.warn?.({ findings }, message);
    try {
        Sentry.captureMessage(message, { level: 'warning', tags: { cron_task: 'llm-anomaly' }, extra: findings });
    } catch { /* Sentry not initialised; the log line still records it */ }
    return true;
}

function scheduleLlmAnomalyCheck(db, logger = console) {
    if (task) return task;
    if (process.env.LLM_ANOMALY_CRON_DISABLED === 'true') {
        logger.info?.('LLM anomaly check disabled');
        return null;
    }
    const expression = process.env.LLM_ANOMALY_CRON || '20 6 * * *';
    task = cron.schedule(expression, withCronHeartbeat('llm-anomaly', async () => {
        reportLlmAnomalies(await detectLlmAnomalies(db), logger);
    }, { db, logger }), { timezone: 'UTC' });
    logger.info?.({ expression }, 'LLM anomaly check scheduled');
    return task;
}

function stopLlmAnomalyCheck() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = {
    TOPIC_LEVEL_OPERATIONS,
    detectLlmAnomalies,
    reportLlmAnomalies,
    scheduleLlmAnomalyCheck,
    stopLlmAnomalyCheck,
};
