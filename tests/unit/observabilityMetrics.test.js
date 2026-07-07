const client = require('prom-client');
const {
  getSloStatus,
  recordSloEvent,
  registerObservabilityMetrics,
  updateQueueMetrics,
  updateRecurringFailureMetrics,
} = require('../../server/services/observabilityMetrics');
const { formatQueueFailureDigest } = require('../../server/services/queueFailureDigestService');

describe('observability metrics', () => {
  test('records SLO burn and queue gauges', async () => {
    const registry = new client.Registry();
    registerObservabilityMetrics(registry, client);

    recordSloEvent('search_latency_p95', false, 4.2);
    updateQueueMetrics({
      'ai-generation': {
        backend: 'bullmq',
        workerRunning: false,
        bullmq: { waiting: 2, active: 1, completed: 10, failed: 3 },
      },
    });
    updateRecurringFailureMetrics([{ queue: 'ai-generation', jobName: 'process', count: 2 }]);

    const output = await registry.metrics();
    expect(output).toContain('medsearch_slo_error_budget_burn_rate');
    expect(output).toContain('medsearch_job_queue_jobs');
    expect(output).toContain('medsearch_job_queue_worker_running');
    expect(output).toContain('medsearch_job_queue_recurring_failures');
    expect(getSloStatus().rolling.some((row) => row.slo === 'search_latency_p95')).toBe(true);
  });

  test('formats queue failure digest text', () => {
    expect(formatQueueFailureDigest([])).toMatch(/No recurring/);
    expect(formatQueueFailureDigest([{
      queue: 'pdf',
      jobName: 'preindex',
      count: 3,
      latestFailedAt: '2026-06-06T00:00:00.000Z',
      failedReason: 'timeout',
      sampleJobIds: ['1', '2'],
    }])).toContain('pdf/preindex: 3 failures');
  });
});
