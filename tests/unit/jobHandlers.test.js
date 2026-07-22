'use strict';

const handlers = new Map();

jest.mock('../../server/services/jobQueue', () => ({
    registerJobHandler: jest.fn((queueName, jobType, fn) => {
        handlers.set(`${queueName}:${jobType}`, fn);
    }),
    pdfQueue: {},
    embeddingQueue: {},
    digestQueue: {},
    aiGenerationQueue: {},
    searchQueue: {},
}));

jest.mock('../../server/services/pdfService', () => ({
    createPdfService: jest.fn(),
}));

jest.mock('../../server/services/pdfPreindexRunner', () => ({
    runPdfPreindex: jest.fn(),
}));

jest.mock('../../server/embeddings', () => ({
    generateEmbedding: jest.fn(),
    articleToEmbedText: jest.fn(),
}));

jest.mock('../../server/services/digestService', () => ({
    runAlertDigests: jest.fn(),
}));

jest.mock('../../server/services/aiGenerationJobProcessor', () => ({
    processAiGenerationJobByKey: jest.fn(),
}));

jest.mock('../../server/services/agentSideEffectService', () => ({
    registerAgentSideEffectHandler: jest.fn(),
}));

jest.mock('../../server/services/searchObservedService', () => ({
    registerSearchObservedHandler: jest.fn(),
}));

const { registerAllJobHandlers } = require('../../server/services/jobHandlers');
const { createPdfService } = require('../../server/services/pdfService');
const { runPdfPreindex } = require('../../server/services/pdfPreindexRunner');
const { generateEmbedding, articleToEmbedText } = require('../../server/embeddings');
const { runAlertDigests } = require('../../server/services/digestService');
const { processAiGenerationJobByKey } = require('../../server/services/aiGenerationJobProcessor');
const { registerAgentSideEffectHandler } = require('../../server/services/agentSideEffectService');
const { registerSearchObservedHandler } = require('../../server/services/searchObservedService');

describe('registerAllJobHandlers', () => {
    const deps = {
        db: {
            isVectorSearchAvailable: jest.fn().mockReturnValue(true),
            upsertArticleCacheVector: jest.fn(),
        },
        cache: {},
        serverConfig: { keys: { semantic: 'key' } },
        fetchImpl: jest.fn(),
        embeddingKeys: { openai: 'openai-key' },
        logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };

    beforeEach(() => {
        handlers.clear();
        jest.clearAllMocks();
    });

    test('registers all expected handlers', () => {
        registerAllJobHandlers(deps);

        expect(handlers.has('pdf:extract')).toBe(true);
        expect(handlers.has('pdf:preindex')).toBe(true);
        expect(handlers.has('embedding:article')).toBe(true);
        expect(handlers.has('digest:run')).toBe(true);
        expect(handlers.has('ai-generation:process')).toBe(true);
        expect(registerAgentSideEffectHandler).toHaveBeenCalledWith(deps);
        expect(registerSearchObservedHandler).toHaveBeenCalledWith(deps);
    });

    describe('pdf:extract handler', () => {
        test('creates pdfService and extracts text', async () => {
            const extractPdfText = jest.fn().mockResolvedValue({ text: 'pdf text', numpages: 1 });
            createPdfService.mockReturnValue({ extractPdfText });

            registerAllJobHandlers(deps);
            const result = await handlers.get('pdf:extract')({ url: 'https://example.com/paper.pdf' }, {});

            expect(createPdfService).toHaveBeenCalledWith({
                serverConfig: deps.serverConfig,
                fetch: deps.fetchImpl,
            });
            expect(extractPdfText).toHaveBeenCalledWith('https://example.com/paper.pdf');
            expect(result).toEqual({ text: 'pdf text', numpages: 1 });
        });
    });

    describe('pdf:preindex handler', () => {
        test('delegates to runPdfPreindex with article and deps', async () => {
            runPdfPreindex.mockResolvedValue({ ok: true });
            const article = { doi: '10.1234/example', title: 'Example' };

            registerAllJobHandlers(deps);
            await handlers.get('pdf:preindex')({ articleId: '123', article }, {});

            expect(runPdfPreindex).toHaveBeenCalledWith(article, deps);
        });
    });

    describe('embedding:article handler', () => {
        test('generates embedding and upserts vector cache', async () => {
            const embedding = [0.1, 0.2, 0.3];
            articleToEmbedText.mockReturnValue('this is a long enough article text for embedding');
            generateEmbedding.mockResolvedValue(embedding);
            const article = { doi: '10.1234/example', uid: 'uid-1', title: 'Title', _source: 'pubmed' };

            registerAllJobHandlers(deps);
            await handlers.get('embedding:article')({ article }, {});

            expect(articleToEmbedText).toHaveBeenCalledWith(article);
            expect(generateEmbedding).toHaveBeenCalledWith('this is a long enough article text for embedding', deps.embeddingKeys);
            expect(deps.db.upsertArticleCacheVector).toHaveBeenCalledWith(
                '10.1234/example',
                'pubmed',
                article,
                embedding,
                '10.1234/example'
            );
        });

        test('skips when vector search is unavailable', async () => {
            const localDeps = {
                ...deps,
                db: { isVectorSearchAvailable: jest.fn().mockReturnValue(false) },
            };

            registerAllJobHandlers(localDeps);
            await handlers.get('embedding:article')({ article: { title: 'x' } }, {});

            expect(articleToEmbedText).not.toHaveBeenCalled();
            expect(generateEmbedding).not.toHaveBeenCalled();
        });

        test('skips when article text is too short', async () => {
            articleToEmbedText.mockReturnValue('hi');

            registerAllJobHandlers(deps);
            await handlers.get('embedding:article')({ article: { title: 'x' } }, {});

            expect(generateEmbedding).not.toHaveBeenCalled();
            expect(deps.db.upsertArticleCacheVector).not.toHaveBeenCalled();
        });

        test('falls back to uid then title for vector id', async () => {
            articleToEmbedText.mockReturnValue('long enough article text here');
            generateEmbedding.mockResolvedValue([0.1]);
            const article = { uid: 'uid-2', title: 'Fallback Title', source: 'saved' };

            registerAllJobHandlers(deps);
            await handlers.get('embedding:article')({ article }, {});

            expect(deps.db.upsertArticleCacheVector).toHaveBeenCalledWith(
                'uid-2',
                'saved',
                article,
                expect.any(Array),
                null
            );
        });
    });

    describe('digest:run handler', () => {
        test('runs alert digests with app URL from env', async () => {
            process.env.APP_URL = 'https://app.example.com';
            runAlertDigests.mockResolvedValue({ sent: 3 });

            registerAllJobHandlers(deps);
            await handlers.get('digest:run')({}, {});

            expect(runAlertDigests).toHaveBeenCalledWith(
                deps.db,
                'https://app.example.com',
                deps.serverConfig,
                deps.fetchImpl
            );
            delete process.env.APP_URL;
        });

        test('falls back to localhost app URL when APP_URL is not set', async () => {
            delete process.env.APP_URL;
            process.env.PORT = '3005';
            runAlertDigests.mockResolvedValue({ sent: 0 });

            registerAllJobHandlers(deps);
            await handlers.get('digest:run')({}, {});

            expect(runAlertDigests).toHaveBeenCalledWith(
                deps.db,
                'http://localhost:3005',
                deps.serverConfig,
                deps.fetchImpl
            );
        });
    });

    describe('ai-generation:process handler', () => {
        test('delegates to processor with jobKey and deps', async () => {
            processAiGenerationJobByKey.mockResolvedValue({ ok: true });

            registerAllJobHandlers(deps);
            await handlers.get('ai-generation:process')({ jobKey: 'job-123' }, {});

            expect(processAiGenerationJobByKey).toHaveBeenCalledWith('job-123', deps);
        });
    });
});
