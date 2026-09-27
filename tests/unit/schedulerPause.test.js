'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { DEFAULT_PAUSED, pausedSchedulers } = require('../../server/services/ops/schedulerPause');

describe('which background jobs run', () => {
    test('unset pauses the off-loop content generators and nothing that serves or measures', () => {
        const paused = pausedSchedulers({});
        expect([...paused].sort()).toEqual([...DEFAULT_PAUSED].sort());
        for (const kept of ['digest-scheduler', 'topic-refresh', 'claim-regeneration', 'curriculum-seed',
            'source-invalidation', 'data-retention', 'offline-eval-nightly', 'learning-quality-eval']) {
            expect(paused.has(kept)).toBe(false);
        }
    });

    test('"none" runs everything', () => {
        expect(pausedSchedulers({ SCHEDULERS_PAUSED: 'none' }).size).toBe(0);
    });

    test('a list replaces the default rather than adding to it', () => {
        expect([...pausedSchedulers({ SCHEDULERS_PAUSED: 'topic-evolution, flagship-enrich' })])
            .toEqual(['topic-evolution', 'flagship-enrich']);
    });

    test('an empty value (what compose forwards when unset) means the default', () => {
        expect(pausedSchedulers({ SCHEDULERS_PAUSED: '' }).size).toBe(DEFAULT_PAUSED.length);
    });
});

describe('the registry honours pauses and stops the right job', () => {
    const { startAllSchedulers, stopAllSchedulers } = require('../../server/services/ops/schedulerRegistry');
    const entry = (task) => ({ task, start: jest.fn(), stop: jest.fn() });

    test('paused entries are not started', () => {
        const registry = [entry('topic-evolution'), entry('topic-refresh')];
        const result = startAllSchedulers(registry, { env: {} });
        expect(registry[0].start).not.toHaveBeenCalled();
        expect(registry[1].start).toHaveBeenCalled();
        expect(result.paused).toEqual(['topic-evolution']);
    });

    test('an entry without a stop function does not throw on shutdown', () => {
        expect(() => stopAllSchedulers([{ task: 'x', start: jest.fn() }, entry('y')])).not.toThrow();
    });
});

describe('policy switches actually reach the containers', () => {
    // Compose passes env explicitly, so a flag set in .env but not listed here never reaches the
    // app - which had silently been true of every one of these.
    const POLICY = ['SCHEDULERS_PAUSED', 'SEARCH_PICO_RERANK_ENABLED', 'SEARCH_PICO_RERANK_MODE',
        'SEARCH_RERANK_TIMEOUT_MS', 'LANE_RANKING', 'SEARCH_LANE_RETRIEVAL', 'RETENTION_ENABLED',
        'EVIDENCE_LINEAGE_ENFORCEMENT', 'SYNOPSIS_QUOTE_FIRST'];
    const compose = yaml.load(fs.readFileSync(path.join(__dirname, '../../docker-compose.hetzner.yml'), 'utf8'));

    test.each(['web', 'worker'])('%s forwards every policy switch', (service) => {
        const env = compose.services[service].environment;
        for (const name of POLICY) expect(Object.keys(env)).toContain(name);
    });
});
