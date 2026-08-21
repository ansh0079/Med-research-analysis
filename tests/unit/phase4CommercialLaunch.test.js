'use strict';

const express = require('express');
const request = require('supertest');
const client = require('prom-client');

describe('metrics scrape access', () => {
    const prevToken = process.env.METRICS_SCRAPE_TOKEN;

    afterEach(() => {
        if (prevToken == null) delete process.env.METRICS_SCRAPE_TOKEN;
        else process.env.METRICS_SCRAPE_TOKEN = prevToken;
        jest.resetModules();
    });

    test('allows scrape token via X-Metrics-Token without admin JWT', async () => {
        process.env.METRICS_SCRAPE_TOKEN = 'scrape-secret-token';
        jest.resetModules();
        const { registerHealthRoutes } = require('../../server/routes/health');
        const registry = new client.Registry();
        const app = express();
        app.use((req, _res, next) => {
            req.log = { error: jest.fn() };
            next();
        });
        registerHealthRoutes(app, {
            serverConfig: { features: {}, keys: {} },
            clientConfig: { apiEndpoints: {}, features: {} },
            cache: { getStats: () => ({ keys: 0, hitRate: 0 }) },
            db: {
                all: jest.fn().mockResolvedValue([]),
                get: jest.fn().mockResolvedValue({ health_check: 1 }),
                isVectorSearchAvailable: () => false,
            },
            metricsRegistry: registry,
        });

        const denied = await request(app).get('/metrics');
        expect(denied.status).toBe(401);

        const allowed = await request(app)
            .get('/metrics')
            .set('X-Metrics-Token', 'scrape-secret-token');
        expect(allowed.status).toBe(200);
        expect(allowed.headers['content-type']).toMatch(/text\/plain/);
    });
});

describe('cron heartbeat metrics', () => {
    test('exports cron gauges from heartbeat rows', async () => {
        jest.resetModules();
        const {
            registerObservabilityMetrics,
            refreshCronHeartbeatMetrics,
        } = require('../../server/services/observabilityMetrics');
        const registry = new client.Registry();
        registerObservabilityMetrics(registry, client);
        await refreshCronHeartbeatMetrics({
            all: async () => [{
                task: 'offline-eval-nightly',
                last_run_at: new Date().toISOString(),
                last_status: 'ok',
                consecutive_failures: 0,
            }],
        });
        const output = await registry.metrics();
        expect(output).toContain('medsearch_cron_last_success_unixtime');
        expect(output).toContain('medsearch_cron_consecutive_failures');
        expect(output).toContain('medsearch_cron_stale');
        expect(output).toContain('offline-eval-nightly');
    });
});

describe('launch cohort config', () => {
    test('defines 10 learner-wedge topics present in flagship catalog', () => {
        const cohort = require('../../server/config/flagshipLaunchCohort.json');
        const catalog = require('../../server/config/flagshipTopics.json');
        const names = new Set((catalog.topics || []).map((t) => t.topic));
        expect(cohort.topics).toHaveLength(10);
        expect(cohort.wedge).toBe('resident_learner_pro');
        for (const row of cohort.topics) {
            expect(names.has(row.topic)).toBe(true);
        }
    });
});
