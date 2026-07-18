'use strict';

const {
    loadFlagshipTopicsConfig,
    flagshipTopicNames,
    landmarkPmidsFromFlagshipConfig,
    collectFlagshipArticlesForPdfBackfill,
    measureFlagshipPdfCoverage,
    pdfPayloadIsIndexed,
} = require('../../server/services/pdfCoverageService');
const { createAiRouteHelpers } = require('../../server/routes/ai/shared');
const { applyQuizClaimSelectionBandit } = require('../../server/services/personalizationBanditService');
const { getOrEnqueuePdfIndex, pdfIndexJobKey } = require('../../server/services/enrichmentJobService');

describe('P3 flagship PDF coverage helpers', () => {
    test('loads flagship topics and landmark PMIDs from config', () => {
        const config = loadFlagshipTopicsConfig();
        expect(config.topics.length).toBeGreaterThan(5);
        const names = flagshipTopicNames({ priority: 'high' });
        expect(names).toEqual(expect.arrayContaining(['ARDS']));
        const landmarks = landmarkPmidsFromFlagshipConfig();
        expect(landmarks.some((a) => a.pmid === '10793162')).toBe(true);
    });

    test('collectFlagshipArticlesForPdfBackfill merges seminal + landmark PMIDs', async () => {
        const db = {
            getTopicKnowledge: jest.fn(async (topic) => ({
                knowledge: {
                    seminalPapers: [{
                        uid: 'pubmed-999',
                        pmid: '999',
                        title: `${topic} seminal`,
                        pmcid: 'PMC1',
                        isFree: true,
                    }],
                },
            })),
        };
        const articles = await collectFlagshipArticlesForPdfBackfill(db, {
            topics: ['ARDS'],
            limitPerTopic: 5,
            includeLandmarks: true,
        });
        expect(articles.some((a) => a.pmid === '999')).toBe(true);
        expect(articles.some((a) => a.pmid === '10793162')).toBe(true);
    });

    test('measureFlagshipPdfCoverage reports landmark index ratio', async () => {
        const indexed = new Set(['10793162', '23688302']);
        const db = {
            getPdfSections: jest.fn(async (id) => {
                const pmid = String(id).replace(/^pubmed-/, '');
                if (indexed.has(pmid)) return { wordCount: 1200 };
                return null;
            }),
        };
        const report = await measureFlagshipPdfCoverage(db, { topics: ['ARDS'] });
        const ards = report.topics.find((t) => t.topic === 'ARDS');
        expect(ards.landmarkTotal).toBe(3);
        expect(ards.landmarkIndexed).toBe(2);
        expect(ards.fullTextCoverageRatio).toBeCloseTo(2 / 3);
        expect(pdfPayloadIsIndexed({ wordCount: 500 })).toBe(true);
        expect(pdfPayloadIsIndexed({ wordCount: 100 })).toBe(false);
    });
});

describe('P3 human-reviewed quiz seed preference', () => {
    test('selectAdaptiveClaimAnchors fills human_reviewed seeds before unverified weak claims', () => {
        const helpers = createAiRouteHelpers({
            db: {},
            ai: {},
            serverConfig: {},
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        });
        const selected = helpers.selectAdaptiveClaimAnchors({
            count: 2,
            claimMastery: [
                {
                    claimKey: 'weak-unverified',
                    claimText: 'Unverified weak claim about fluids',
                    masteryState: 'weak',
                    verificationStatus: 'unverified',
                    conceptKey: 'general',
                },
            ],
            groundedClaims: [
                {
                    claimKey: 'human-1',
                    claimText: 'Human reviewed claim about norepinephrine first-line',
                    verificationStatus: 'human_reviewed',
                    reviewState: 'human_reviewed',
                    conceptKey: 'general',
                },
                {
                    claimKey: 'human-2',
                    claimText: 'Second human reviewed claim about lactate clearance',
                    verificationStatus: 'source_verified',
                    reviewState: 'human_reviewed',
                    conceptKey: 'general',
                },
            ],
        });
        expect(selected).toHaveLength(2);
        expect(selected.map((c) => c.claimKey)).toEqual(['human-1', 'human-2']);
    });

    test('applyQuizClaimSelectionBandit prefers human_reviewed over equal sample unverified', async () => {
        const db = {
            listPersonalizationArmStates: jest.fn().mockResolvedValue([]),
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            insertPersonalizationDecision: jest.fn(async () => ({ id: 1 })),
        };
        const out = await applyQuizClaimSelectionBandit(db, null, [
            { claimKey: 'u1', claimText: 'Unverified', priority: 0, verificationStatus: 'unverified' },
            { claimKey: 'h1', claimText: 'Human', priority: 0, verificationStatus: 'human_reviewed' },
        ], { count: 1, topic: 'Sepsis' });
        expect(out.anchors[0].claimKey).toBe('h1');
    });
});

describe('P3 PDF index retry semantics', () => {
    test('getOrEnqueuePdfIndex requeues failed jobs', async () => {
        const jobKey = pdfIndexJobKey({ pmid: '10793162' });
        const db = {
            getAiGenerationJobByKey: jest.fn(async () => ({
                jobKey,
                status: 'failed',
                errorMessage: 'pdf_index:no_open_access_pdf',
                attempts: 1,
            })),
            failAiGenerationJob: jest.fn(),
            resetAiGenerationJobForRetry: jest.fn(async () => ({ jobKey, status: 'queued' })),
            createAiGenerationJob: jest.fn(),
            markAiGenerationJobRunning: jest.fn(),
            completeAiGenerationJob: jest.fn(),
        };
        // Avoid real BullMQ: stub enqueue via create path not used on retry.
        const result = await getOrEnqueuePdfIndex({
            db,
            article: { pmid: '10793162', uid: 'pubmed-10793162' },
            cache: { setAsync: jest.fn() },
            logger: { warn: jest.fn(), debug: jest.fn() },
            priority: 3,
        });
        expect(result.status).toBe('queued');
        expect(result.retried).toBe(true);
        expect(db.resetAiGenerationJobForRetry).toHaveBeenCalledWith(jobKey);
    });
});
