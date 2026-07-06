'use strict';

const { getSharedAiService, AI_DISCLAIMER } = require('../../services/aiService');
const { buildJournalClubPrompt } = require('../../prompts');
const { teachingObjectsToQuizContext } = require('../../services/teachingObjectService');
const { resolveProvider } = require('../../utils/aiProvider');

/**
 * Registers /api/ai/journal-club.
 */
function registerJournalClubRoutes(app, {
    db,
    serverConfig,
    fetchImpl,
    limitBodySize,
    requireJson,
    requireAuthJwt,
    requireVerifiedEmail,
    requirePaidFeature,
    aiUserLimit,
    validateBody,
    schemas,
}) {
    app.post('/api/ai/journal-club',
        limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt,
        requireVerifiedEmail, requirePaidFeature('journalClub'), aiUserLimit(8, 60),
        validateBody(schemas.journalClub),
        async (req, res) => {
            const { articles, topic, provider = 'auto' } = req.body;
            const topArticles = [...articles]
                .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
                .slice(0, 8);

            try {
                const ai = getSharedAiService({ serverConfig, fetchImpl });
                const normalizedTopic = String(topic || '').trim();
                const [teachingObjects, groundedClaims] = await Promise.all([
                    db.listTeachingObjectsForTopic(normalizedTopic, { limit: 3 }).catch(() => []),
                    db.listTeachingObjectClaimsForTopic(normalizedTopic, { limit: 8 }).catch(() => []),
                ]);

                const memoryParts = [];
                const teachingContext = teachingObjectsToQuizContext(teachingObjects, { maxObjects: 3, maxClaims: 6 });
                if (teachingContext) memoryParts.push(teachingContext);
                if (groundedClaims.length) {
                    memoryParts.push([
                        'HIGH-VALUE CLAIMS TO TEST OR DISCUSS:',
                        ...groundedClaims.slice(0, 8).map((claim, index) => (
                            `CLAIM-${index + 1} (${claim.verificationStatus || 'unverified'}): ${claim.claimText}`
                        )),
                    ].join('\n'));
                }

                const prompt = buildJournalClubPrompt(topArticles, normalizedTopic, memoryParts.join('\n\n'));
                const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
                if (!selectedProvider) {
                    return res.status(503).json({ error: 'No AI provider configured' });
                }

                const rawText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: 0.25 });
                let pack;
                try {
                    const jsonMatch = String(rawText || '').match(/\{[\s\S]*\}/);
                    pack = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
                } catch {
                    return res.status(502).json({ error: 'AI returned malformed journal club JSON' });
                }

                res.json({
                    topic: normalizedTopic,
                    provider: selectedProvider,
                    pack,
                    memoryContext: {
                        teachingObjects: teachingObjects.length,
                        groundedClaims: groundedClaims.length,
                    },
                    disclaimer: AI_DISCLAIMER,
                });
            } catch (error) {
                req.log.error({ err: error }, 'Journal club generation error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
}

module.exports = { registerJournalClubRoutes };
