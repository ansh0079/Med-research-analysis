'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const mockKick = jest.fn(() => 'pending');
const mockCanRun = jest.fn(() => true);

jest.mock('../../server/services/guidelineService', () => ({
    kickGuidelineDiscoveryIfEmpty: (...args) => mockKick(...args),
    canRunGuidelineDiscovery: (...args) => mockCanRun(...args),
}));

const { runGuidelineDiscoveryWarmStart } = require('../../server/services/guidelineDiscoveryWarmStartScheduler');

function writeFlagshipConfig(topics) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagship-config-'));
    const configPath = path.join(dir, 'flagshipTopics.json');
    fs.writeFileSync(configPath, JSON.stringify({ version: 1, topics }));
    return configPath;
}

function makeDb(servedTopics = []) {
    const served = new Set(servedTopics);
    return {
        async getGuidelinesByTopic(topic) {
            return served.has(topic) ? [{ id: 1 }] : [];
        },
    };
}

const TOPICS = [
    { topic: 'Heart failure with reduced ejection fraction', guidelineQueries: ['ACC AHA heart failure guideline'] },
    { topic: 'Acute kidney injury', guidelineQueries: ['KDIGO AKI guideline'] },
    { topic: 'Multiple sclerosis', guidelineQueries: ['multiple sclerosis guideline'] },
    { topic: 'Rheumatoid arthritis', guidelineQueries: ['EULAR rheumatoid arthritis guideline'] },
];

describe('guideline discovery warm-start', () => {
    beforeEach(() => {
        mockKick.mockClear().mockReturnValue('pending');
        mockCanRun.mockClear().mockReturnValue(true);
    });

    it('skips the cycle when no db is available', async () => {
        const outcome = await runGuidelineDiscoveryWarmStart({ db: null, serverConfig: { keys: { ncbi: 'x' } } });
        expect(outcome).toMatchObject({ scanned: 0, served: 0, kicked: 0, skipped: 'no_db' });
        expect(mockKick).not.toHaveBeenCalled();
    });

    it('skips the cycle when no provider key is configured', async () => {
        mockCanRun.mockReturnValue(false);
        const outcome = await runGuidelineDiscoveryWarmStart({ db: makeDb(), serverConfig: { keys: {} } });
        expect(outcome.skipped).toBe('no_provider_keys');
        expect(mockKick).not.toHaveBeenCalled();
    });

    it('kicks discovery only for unserved topics, using the curated guideline query', async () => {
        const configPath = writeFlagshipConfig(TOPICS);
        const db = makeDb(['Acute kidney injury']);
        const log = { warn: jest.fn() };

        const outcome = await runGuidelineDiscoveryWarmStart({
            db,
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: configPath, maxKicksPerCycle: 10 },
            log,
        });

        expect(outcome.scanned).toBe(4);
        expect(outcome.served).toBe(1);
        expect(outcome.kicked).toBe(3);
        expect(mockKick).toHaveBeenCalledTimes(3);
        const kickedTopics = mockKick.mock.calls.map((call) => call[0]);
        expect(kickedTopics).toEqual(['Heart failure with reduced ejection fraction', 'Multiple sclerosis', 'Rheumatoid arthritis']);
        // The curated guidelineQueries[0] is passed as the search string, not the raw topic name.
        const hfCall = mockKick.mock.calls[0][1];
        expect(hfCall.searchQuery).toBe('ACC AHA heart failure guideline');
    });

    it('respects the per-cycle kick budget', async () => {
        const configPath = writeFlagshipConfig(TOPICS);
        const outcome = await runGuidelineDiscoveryWarmStart({
            db: makeDb(),
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: configPath, maxKicksPerCycle: 2 },
            log: { warn: jest.fn() },
        });
        expect(outcome.kicked).toBe(2);
        expect(mockKick).toHaveBeenCalledTimes(2);
    });

    it('does not count topics the kick gate refused (already attempted/in-flight)', async () => {
        mockKick.mockReturnValue('complete');
        const configPath = writeFlagshipConfig(TOPICS);
        const outcome = await runGuidelineDiscoveryWarmStart({
            db: makeDb(),
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: configPath },
            log: { warn: jest.fn() },
        });
        expect(outcome.kicked).toBe(0);
    });

    it('survives a per-topic check failure and keeps cycling', async () => {
        const configPath = writeFlagshipConfig(TOPICS);
        const log = { warn: jest.fn() };
        const db = {
            async getGuidelinesByTopic(topic) {
                if (topic === 'Multiple sclerosis') throw new Error('db read failed');
                return [];
            },
        };
        const outcome = await runGuidelineDiscoveryWarmStart({
            db,
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: configPath },
            log,
        });
        expect(outcome.kicked).toBe(3);
        expect(log.warn).toHaveBeenCalledWith(
            expect.objectContaining({ topic: 'Multiple sclerosis' }),
            expect.stringContaining('skipping'),
        );
    });

    describe('scope', () => {
        const MIXED = [
            ...TOPICS,
            { topic: 'Cutaneous melanoma adjuvant therapy', guidelineQueries: ['melanoma guideline'] },
            { topic: 'Gout urate lowering', guidelineQueries: ['gout guideline'] },
        ];
        const run = (options) => runGuidelineDiscoveryWarmStart({
            db: makeDb(),
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: writeFlagshipConfig(MIXED), maxKicksPerCycle: 50, ...options },
            log: { warn: jest.fn() },
        });

        it('warms only the registry cohort conditions by default', async () => {
            const outcome = await run({});
            expect(outcome).toMatchObject({ scope: 'cohort', scanned: 6, inScope: 4, kicked: 4 });
            const warmed = mockKick.mock.calls.map(([topic]) => topic);
            expect(warmed).not.toContain('Cutaneous melanoma adjuvant therapy');
            expect(warmed).not.toContain('Gout urate lowering');
        });

        it('widens to the whole flagship catalogue only when asked', async () => {
            const outcome = await run({ scope: 'flagship' });
            expect(outcome).toMatchObject({ scope: 'flagship', inScope: 6, kicked: 6 });
        });

        it('honours WARM_START_SCOPE from the environment', async () => {
            process.env.WARM_START_SCOPE = 'flagship';
            try {
                expect((await run({})).scope).toBe('flagship');
            } finally {
                delete process.env.WARM_START_SCOPE;
            }
        });

        it('orders topics by the cohort list, not catalogue order', async () => {
            await runGuidelineDiscoveryWarmStart({
                db: makeDb(),
                serverConfig: { keys: { ncbi: 'x' } },
                options: {
                    flagshipConfigPath: writeFlagshipConfig([
                        { topic: 'Rheumatoid arthritis', guidelineQueries: ['ra'] },
                        { topic: 'Heart failure with reduced ejection fraction', guidelineQueries: ['hf'] },
                    ]),
                    maxKicksPerCycle: 10,
                },
                log: { warn: jest.fn() },
            });
            expect(mockKick.mock.calls.map(([topic]) => topic)).toEqual([
                'Heart failure with reduced ejection fraction',
                'Rheumatoid arthritis',
            ]);
        });
    });

    it('reports a missing config instead of throwing', async () => {
        const outcome = await runGuidelineDiscoveryWarmStart({
            db: makeDb(),
            serverConfig: { keys: { ncbi: 'x' } },
            options: { flagshipConfigPath: path.join(os.tmpdir(), 'does-not-exist.json') },
            log: { warn: jest.fn() },
        });
        expect(outcome.skipped).toBe('config_unavailable');
        expect(mockKick).not.toHaveBeenCalled();
    });
});
