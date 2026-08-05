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

module.exports = {
    SLO_DEFINITIONS,
    getSloStatus,
    recordExternalApiCall,
    recordSearchQuality,
    recordSloEvent,
    recordSynopsisGeneration,
    registerObservabilityMetrics,
    updateQueueMetrics,
    updateRecurringFailureMetrics,
};
