'use strict';

const {
    mapAiJobStatusToEnrichment,
    combineEnrichmentStatuses,
    isEnrichmentTerminal,
} = require('../../shared/enrichmentStatus');

describe('enrichment status machine', () => {
    test('maps durable job statuses onto the client contract', () => {
        expect(mapAiJobStatusToEnrichment('queued')).toBe('pending');
        expect(mapAiJobStatusToEnrichment('running')).toBe('running');
        expect(mapAiJobStatusToEnrichment('completed')).toBe('ready');
        expect(mapAiJobStatusToEnrichment('failed')).toBe('failed');
        expect(mapAiJobStatusToEnrichment('timed_out')).toBe('timed_out');
    });

    test('combine honors running and surfaces timeout as a real failure', () => {
        expect(combineEnrichmentStatuses(['queued', 'running'])).toBe('running');
        expect(combineEnrichmentStatuses(['completed', 'failed'])).toBe('ready');
        expect(combineEnrichmentStatuses(['timed_out', 'timed_out'])).toBe('timed_out');
        expect(combineEnrichmentStatuses(['failed', 'failed'])).toBe('failed');
        expect(combineEnrichmentStatuses(['timed_out', 'queued'])).toBe('pending');
    });

    test('terminal states include timed_out', () => {
        expect(isEnrichmentTerminal('ready')).toBe(true);
        expect(isEnrichmentTerminal('failed')).toBe(true);
        expect(isEnrichmentTerminal('timed_out')).toBe(true);
        expect(isEnrichmentTerminal('running')).toBe(false);
        expect(isEnrichmentTerminal('pending')).toBe(false);
    });
});
