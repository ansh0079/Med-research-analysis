'use strict';

const ENRICHMENT_STATUSES = Object.freeze(['pending', 'running', 'ready', 'failed', 'timed_out']);
const TERMINAL_ENRICHMENT_STATUSES = Object.freeze(['ready', 'failed', 'timed_out']);

function mapAiJobStatusToEnrichment(dbStatus) {
    switch (String(dbStatus || '').trim()) {
        case 'completed':
        case 'ready':
            return 'ready';
        case 'running':
            return 'running';
        case 'failed':
            return 'failed';
        case 'timed_out':
        case 'timedOut':
            return 'timed_out';
        case 'queued':
        case 'pending':
        default:
            return 'pending';
    }
}

function combineEnrichmentStatuses(dbStatuses = []) {
    const mapped = (Array.isArray(dbStatuses) ? dbStatuses : [dbStatuses])
        .map((status) => mapAiJobStatusToEnrichment(status));
    if (!mapped.length) return 'pending';
    if (mapped.some((status) => status === 'ready')) return 'ready';
    if (mapped.some((status) => status === 'running')) return 'running';
    if (mapped.some((status) => status === 'pending')) return 'pending';
    if (mapped.every((status) => status === 'timed_out')) return 'timed_out';
    if (mapped.every((status) => status === 'failed' || status === 'timed_out')) {
        return mapped.some((status) => status === 'failed') ? 'failed' : 'timed_out';
    }
    return 'failed';
}

function isEnrichmentTerminal(status) {
    return TERMINAL_ENRICHMENT_STATUSES.includes(String(status || ''));
}

module.exports = {
    ENRICHMENT_STATUSES,
    TERMINAL_ENRICHMENT_STATUSES,
    mapAiJobStatusToEnrichment,
    combineEnrichmentStatuses,
    isEnrichmentTerminal,
};
