'use strict';

const SLO_DEFINITIONS = {
    search_latency_p95: {
        description: 'Search request P95 latency below 3 seconds',
        target: 0.95,
        thresholdSeconds: 3,
    },
    synopsis_success_rate: {
        description: 'Synopsis generation success rate above 95%',
        target: 0.95,
    },
    search_off_topic_rate_at_10: {
        description: 'Search off-topic rate@10 below 10%',
        target: 0.9,
        threshold: 0.1,
    },
};

const ROLLING_LIMIT = 500;
const state = new Map();
let metrics = null;

function bucket(slo) {
    if (!state.has(slo)) state.set(slo, []);
    return state.get(slo);
}

function rollingStats(slo) {
    const rows = bucket(slo);
    const total = rows.length;
    const violations = rows.filter((row) => !row.ok).length;
    return {
        slo,
        total,
        violations,
        successRate: total ? (total - violations) / total : null,
        burnRate: total ? violations / total : 0,
        ok: total === 0 ? true : violations / total <= (1 - (SLO_DEFINITIONS[slo]?.target || 0.95)),
    };
}

function recordSloEvent(slo, ok, value = null) {
    const rows = bucket(slo);
    rows.push({ ok: Boolean(ok), value, at: Date.now() });
    while (rows.length > ROLLING_LIMIT) rows.shift();
    if (!metrics) return;
    metrics.sloEvents.inc({ slo, outcome: ok ? 'ok' : 'violation' });
    if (!ok) metrics.sloViolations.inc({ slo });
    const stats = rollingStats(slo);
    metrics.sloBurnRate.set({ slo }, stats.burnRate);
    metrics.sloOk.set({ slo }, stats.ok ? 1 : 0);
}

function recordExternalApiCall(source, ok) {
    if (!metrics) return;
    metrics.externalApiCalls.inc({ source: source || 'unknown', outcome: ok ? 'ok' : 'error' });
}

function recordSynopsisGeneration({ ok, provider = 'unknown', model = 'unknown' } = {}) {
    if (metrics) {
        metrics.synopsisGeneration.inc({
            provider: provider || 'unknown',
            model: model || 'unknown',
            outcome: ok ? 'success' : 'failure',
        });
    }
    recordSloEvent('synopsis_success_rate', ok);
}

function recordSearchQuality({ offTopicRateAt10 = null } = {}) {
    if (offTopicRateAt10 == null || !Number.isFinite(Number(offTopicRateAt10))) return;
    const rate = Number(offTopicRateAt10);
    if (metrics) metrics.searchOffTopicRate.set(rate);
    recordSloEvent('search_off_topic_rate_at_10', rate <= SLO_DEFINITIONS.search_off_topic_rate_at_10.threshold, rate);
}

/**
 * Search latency, whole request and per stage.
 *
 * search_latency_p95 was defined as an SLO from the beginning and nothing ever recorded it, so the
 * alert on it could not fire and "search latency p95: unknown" stayed true through several reviews.
 * The pipeline already measures each stage; this is where those numbers stop being per-request
 * debug detail and become something a dashboard and an alert can read.
 *
 * Stage names come from the pipeline's own timings object, so a new stage appears here the moment it
 * is measured, without a second list to keep in step.
 */
function recordSearchLatency(timings = {}) {
    const totalMs = Number(timings.totalMs);
    if (!Number.isFinite(totalMs) || totalMs < 0) return;

    if (metrics) {
        metrics.searchLatency.observe(totalMs / 1000);
        for (const [key, value] of Object.entries(timings)) {
            if (key === 'totalMs' || !key.endsWith('Ms')) continue;
            const ms = Number(value);
            if (!Number.isFinite(ms) || ms < 0) continue;
            metrics.searchStageLatency.observe({ stage: key.slice(0, -2) }, ms / 1000);
        }
    }
    recordSloEvent('search_latency_p95', totalMs / 1000 <= SLO_DEFINITIONS.search_latency_p95.thresholdSeconds, totalMs);
}

/**
 * A provenance cap that WOULD have applied, had enforcement been on.
 *
 * The lineage, manifest and legacy ceilings all default to shadow, which means they change nothing
 * and report nothing - so "what happens if we enforce" has been unanswerable except by enforcing and
 * finding out on real readers. Counting the near-misses turns that into a number you can look at
 * first: if this is zero for a week, enforcement is free; if it is thousands, it is a product
 * decision about what the corpus can honestly claim.
 */
function recordProvenanceShadowCap(kind, from) {
    if (!metrics) return;
    metrics.provenanceShadowCaps.inc({ kind: kind || 'unknown', from: from || 'unknown' });
}

function registerObservabilityMetrics(registry, client) {
    if (metrics || !registry || !client) return metrics;
    metrics = {
        sloEvents: new client.Counter({
            name: 'medsearch_slo_events_total',
            help: 'Rolling SLO events by outcome',
            labelNames: ['slo', 'outcome'],
            registers: [registry],
        }),
        sloViolations: new client.Counter({
            name: 'medsearch_slo_violations_total',
            help: 'SLO violation counter',
            labelNames: ['slo'],
            registers: [registry],
        }),
        sloBurnRate: new client.Gauge({
            name: 'medsearch_slo_error_budget_burn_rate',
            help: 'Rolling error-budget burn rate for in-process SLO events',
            labelNames: ['slo'],
            registers: [registry],
        }),
        sloOk: new client.Gauge({
            name: 'medsearch_slo_ok',
            help: '1 when the rolling SLO window is inside budget, else 0',
            labelNames: ['slo'],
            registers: [registry],
        }),
        synopsisGeneration: new client.Counter({
            name: 'medsearch_synopsis_generation_total',
            help: 'Synopsis generation attempts by provider/model/outcome',
            labelNames: ['provider', 'model', 'outcome'],
            registers: [registry],
        }),
        provenanceShadowCaps: new client.Counter({
            name: 'medsearch_provenance_shadow_caps_total',
            help: 'Labels that would have been capped if provenance enforcement were on',
            labelNames: ['kind', 'from'],
            registers: [registry],
        }),
        searchLatency: new client.Histogram({
            name: 'medsearch_search_latency_seconds',
            help: 'End-to-end search request latency',
            // Buckets span the range that matters here: a fast cached answer to well past the 3s SLO.
            buckets: [0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13],
            registers: [registry],
        }),
        searchStageLatency: new client.Histogram({
            name: 'medsearch_search_stage_latency_seconds',
            help: 'Search latency broken down by pipeline stage',
            labelNames: ['stage'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5],
            registers: [registry],
        }),
        searchOffTopicRate: new client.Gauge({
            name: 'medsearch_search_off_topic_rate_at_10',
            help: 'Latest evaluated off-topic rate at 10',
            registers: [registry],
        }),
        queueJobs: new client.Gauge({
            name: 'medsearch_job_queue_jobs',
            help: 'Job queue counts by queue and state',
            labelNames: ['queue', 'state', 'backend'],
            registers: [registry],
        }),
        queueRecurringFailures: new client.Gauge({
            name: 'medsearch_job_queue_recurring_failures',
            help: 'Recurring failed BullMQ jobs grouped by queue and job name',
            labelNames: ['queue', 'job_name'],
            registers: [registry],
        }),
        queueWorkerRunning: new client.Gauge({
            name: 'medsearch_job_queue_worker_running',
            help: '1 when this process reports a worker for the queue, else 0',
            labelNames: ['queue', 'backend'],
            registers: [registry],
        }),
        externalApiCalls: new client.Counter({
            name: 'medsearch_external_api_calls_total',
            help: 'External API call count by source and outcome (ok/error)',
            labelNames: ['source', 'outcome'],
            registers: [registry],
        }),
        cronLastSuccessUnixtime: new client.Gauge({
            name: 'medsearch_cron_last_success_unixtime',
            help: 'Unix timestamp of last successful cron heartbeat for the task',
            labelNames: ['task'],
            registers: [registry],
        }),
        cronConsecutiveFailures: new client.Gauge({
            name: 'medsearch_cron_consecutive_failures',
            help: 'Consecutive failure count from cron_heartbeats',
            labelNames: ['task'],
            registers: [registry],
        }),
        cronStale: new client.Gauge({
            name: 'medsearch_cron_stale',
            help: '1 when the cron has not succeeded within the expected window',
            labelNames: ['task'],
            registers: [registry],
        }),
    };
    for (const slo of Object.keys(SLO_DEFINITIONS)) {
        metrics.sloBurnRate.set({ slo }, 0);
        metrics.sloOk.set({ slo }, 1);
    }
    return metrics;
}

function updateQueueMetrics(queueStatus = {}) {
    if (!metrics) return;
    for (const [queue, status] of Object.entries(queueStatus || {})) {
        const backend = status.backend || status.bullmq ? 'bullmq' : 'memory';
        const counts = status.bullmq || {
            waiting: status.pending || 0,
            active: status.running || 0,
            completed: status.stats?.processed || 0,
            failed: status.stats?.failed || 0,
        };
        for (const [stateName, count] of Object.entries(counts)) {
            metrics.queueJobs.set({ queue, state: stateName, backend }, Number(count || 0));
        }
        metrics.queueWorkerRunning.set({ queue, backend }, status.workerRunning === false ? 0 : 1);
    }
}

function updateRecurringFailureMetrics(items = []) {
    if (!metrics) return;
    metrics.queueRecurringFailures.reset();
    for (const item of items || []) {
        metrics.queueRecurringFailures.set(
            { queue: item.queue || 'unknown', job_name: item.jobName || 'unknown' },
            Number(item.count || 0)
        );
    }
}

function getSloStatus() {
    return {
        generatedAt: new Date().toISOString(),
        definitions: SLO_DEFINITIONS,
        rolling: Object.keys(SLO_DEFINITIONS).map(rollingStats),
    };
}

const CRON_STALE_MS = {
    'offline-eval-nightly': 36 * 60 * 60 * 1000,
    'delayed-reward-backfill': 36 * 60 * 60 * 1000,
    'learning-quality-eval': 36 * 60 * 60 * 1000,
    'learner-profile-rollup': 36 * 60 * 60 * 1000,
    'topic-evolution': 48 * 60 * 60 * 1000,
    'knowledge-drift': 48 * 60 * 60 * 1000,
    'queue-failure-digest': 8 * 24 * 60 * 60 * 1000,
};

/**
 * Export cron_heartbeats rows as Prometheus gauges for external alerting.
 */
async function refreshCronHeartbeatMetrics(db) {
    if (!metrics || typeof db?.all !== 'function') return;
    let rows = [];
    try {
        rows = await db.all('SELECT task, last_run_at, last_status, consecutive_failures FROM cron_heartbeats');
    } catch {
        return;
    }
    const now = Date.now();
    for (const row of rows || []) {
        const task = row.task || 'unknown';
        const lastRunMs = row.last_run_at ? Date.parse(row.last_run_at) : NaN;
        const successUnix = row.last_status === 'ok' && Number.isFinite(lastRunMs)
            ? Math.floor(lastRunMs / 1000)
            : 0;
        metrics.cronLastSuccessUnixtime.set({ task }, successUnix);
        metrics.cronConsecutiveFailures.set({ task }, Number(row.consecutive_failures || 0));
        const staleWindow = CRON_STALE_MS[task] || (36 * 60 * 60 * 1000);
        const stale = !Number.isFinite(lastRunMs)
            || row.last_status === 'error'
            || (now - lastRunMs) > staleWindow;
        metrics.cronStale.set({ task }, stale ? 1 : 0);
    }
}

module.exports = {
    SLO_DEFINITIONS,
    CRON_STALE_MS,
    getSloStatus,
    recordExternalApiCall,
    recordSearchQuality,
    recordSearchLatency,
    recordProvenanceShadowCap,
    recordSloEvent,
    recordSynopsisGeneration,
    registerObservabilityMetrics,
    refreshCronHeartbeatMetrics,
    updateQueueMetrics,
    updateRecurringFailureMetrics,
};
