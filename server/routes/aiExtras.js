const { createAiService } = require('../services/aiService');
const { checkGuidelineAlignment } = require('../services/guidelineService');
const { generateGrantSection } = require('../services/grantService');

function registerAiExtraRoutes(app, { serverConfig, db, rateLimit, requireJson, requireAuthJwt, fetch: fetchImpl }) {
    const f = fetchImpl || fetch;

    app.post(
        '/api/guidelines/align',
        requireJson,
        requireAuthJwt,
        rateLimit(5, 60),
        async (req, res) => {
            try {
                const { topic, synthesisConsensus, articles } = req.body;
                if (!topic || !synthesisConsensus || !Array.isArray(articles)) {
                    return res.status(400).json({ error: 'topic, synthesisConsensus, and articles[] are required' });
                }

                const ai = createAiService({ serverConfig, fetchImpl: f });
                const alignment = await checkGuidelineAlignment(
                    topic,
                    synthesisConsensus,
                    articles,
                    {
                        ncbiKey: serverConfig.keys.ncbi,
                        ncbiEmail: serverConfig.keys.ncbiEmail,
                        gemini: serverConfig.keys.gemini,
                        mistral: serverConfig.keys.mistral,
                    },
                    ai
                );
                res.json(alignment);
            } catch (error) {
                req.log.error({ err: error }, 'Guideline alignment error');
                res.status(500).json({ error: error.message });
            }
        }
    );

    app.post('/api/ai/grant', requireJson, requireAuthJwt, rateLimit(3, 60), async (req, res) => {
        try {
            const { researchQuestion, articles, citationStyle = 'APA' } = req.body;
            if (!researchQuestion || !Array.isArray(articles) || articles.length === 0) {
                return res.status(400).json({ error: 'researchQuestion and articles[] are required' });
            }

            const ai = createAiService({ serverConfig, fetchImpl: f });
            const result = await generateGrantSection(
                researchQuestion,
                articles,
                citationStyle,
                ai,
                { gemini: serverConfig.keys.gemini, mistral: serverConfig.keys.mistral }
            );

            await db.logEvent('grant', req.sessionId, {
                researchQuestion: researchQuestion.slice(0, 100),
                articleCount: articles.length,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Grant writing error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerAiExtraRoutes };
