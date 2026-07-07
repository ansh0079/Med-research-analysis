'use strict';

const { PINNED_MODELS, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('../../services/aiService');
const { buildSeminalKnowledgeExtractionPrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { setupSSE, sendSSE } = require('../../utils/sse');
const { limitBodySize } = require('../../utils/validation');
const {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
} = require('../../services/synthesisGenerationCore');
const { getOrEnqueueFullSynthesis } = require('../../services/aiGenerationJobService');

function extractJsonObject(text) {
    const cleaned = String(text || '')
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        const err = new Error('AI response did not contain a JSON object');
        err.status = 502;
        throw err;
    }
    return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
}

function buildDeltaKnowledgeExtractionPrompt(topic, synthesis, newArticles, existingKnowledge, interactionStats) {
    const existingPoints = (existingKnowledge?.knowledge?.teachingPoints || [])
        .map((tp, i) => `${i + 1}. ${typeof tp === 'string' ? tp : tp.claim || tp.text}`)
        .join('\n');

    const newArticlesText = newArticles.map((a, i) =>
        `[NEW-${i + 1}] ${a.title} (${a.pubdate || a.year})`
    ).join('\n');

    return `You are updating medical knowledge about "${topic}" with NEW evidence.

EXISTING TEACHING POINTS:
${existingPoints || 'None yet'}

NEW ARTICLES (published after last update):
${newArticlesText}

SYNTHESIS OF NEW ARTICLES:
${JSON.stringify(synthesis, null, 2)}

TASK: Extract ONLY the DELTA — what do these new articles:
1. ADD (completely new insights not in existing teaching points)
2. CONTRADICT (findings that disagree with existing points)
3. STRENGTHEN (additional evidence supporting existing points)

Return JSON:
{
  "newInsights": ["Insight 1", "Insight 2"],
  "contradictions": [{"existingPoint": "Point X", "newFinding": "Contradictory finding", "evidence": "Article reference"}],
  "strengtheningEvidence": [{"existingPoint": "Point Y", "newEvidence": "Supporting finding"}],
  "updateRequired": true/false
}`;
}

function mergeKnowledgeDeltas(existingKnowledge, deltaKnowledge, newArticles) {
    const merged = { ...existingKnowledge };

    if (Array.isArray(deltaKnowledge.newInsights) && deltaKnowledge.newInsights.length > 0) {
        merged.teachingPoints = [
            ...(merged.teachingPoints || []),
            ...deltaKnowledge.newInsights.map(insight => ({
                claim: insight,
                addedFromDelta: true,
                sourceArticles: newArticles.map(a => a.uid).slice(0, 3)
            }))
        ].slice(0, 20);
    }

    if (Array.isArray(deltaKnowledge.contradictions) && deltaKnowledge.contradictions.length > 0) {
        merged.contradictions = [
            ...(merged.contradictions || []),
            ...deltaKnowledge.contradictions
        ];
    }

    if (Array.isArray(deltaKnowledge.strengtheningEvidence)) {
        for (const evidence of deltaKnowledge.strengtheningEvidence) {
            const matchIdx = (merged.teachingPoints || []).findIndex(tp =>
                String(tp.claim || tp.text || '').includes(evidence.existingPoint.slice(0, 50))
            );
            if (matchIdx >= 0 && merged.teachingPoints[matchIdx]) {
                merged.teachingPoints[matchIdx].confidence =
                    Math.min((merged.teachingPoints[matchIdx].confidence || 0.5) * 1.15, 0.95);
                merged.teachingPoints[matchIdx].strengtheningEvidence =
                    [...(merged.teachingPoints[matchIdx].strengtheningEvidence || []), evidence.newEvidence];
            }
        }
    }

    return merged;
}

async function maybeStoreTopicKnowledge({ db, ai, topic, synthesis, articles, provider, model, log }) {
    const cleanTopic = String(topic || '').trim();
    if (!cleanTopic || !Array.isArray(articles) || articles.length < 3) {
        return null;
    }
    try {
        const logger = require('../../config/logger');
        const existingKnowledge = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

        let articlesToAnalyze = articles.slice(0, 10);
        let updateMode = 'full';

        if (existingKnowledge && existingKnowledge.lastRefreshedAt) {
            const lastUpdate = new Date(existingKnowledge.lastRefreshedAt);
            const recentArticles = articles.filter(a => {
                const publishDate = new Date(a.pubdate || a.year);
                return publishDate > lastUpdate;
            });

            if (recentArticles.length > 0 && recentArticles.length < articles.length) {
                articlesToAnalyze = recentArticles.slice(0, 10);
                updateMode = 'incremental';
                log?.info?.({
                    topic: cleanTopic,
                    newArticles: recentArticles.length,
                    totalArticles: articles.length
                }, 'Performing incremental knowledge update');
            }
        }

        const storedCounts = existingKnowledge?.knowledge?.articleInteractionCounts || {};
        const interactionStats = {};
        for (const [uid, counts] of Object.entries(storedCounts)) {
            interactionStats[uid] = {
                saves: Number(counts.saves || 0),
                highDwellTime: Number(counts.highDwellCount || 0) > 0,
            };
        }

        const promptType = updateMode === 'incremental' ? 'delta' : 'full';
        const prompt = promptType === 'delta'
            ? buildDeltaKnowledgeExtractionPrompt(cleanTopic, synthesis, articlesToAnalyze, existingKnowledge, interactionStats)
            : buildSeminalKnowledgeExtractionPrompt(cleanTopic, synthesis, articlesToAnalyze, existingKnowledge, interactionStats);

        const raw = await ai.callText(prompt, provider, model || PINNED_MODELS[provider] || PINNED_MODELS.gemini, { temperature: 0.15 });
        const knowledge = extractJsonObject(raw);

        let finalKnowledge = knowledge;
        if (updateMode === 'incremental' && existingKnowledge?.knowledge) {
            finalKnowledge = mergeKnowledgeDeltas(existingKnowledge.knowledge, knowledge, articlesToAnalyze);
        }

        const sourceArticles = articles.slice(0, 10).map((article, index) => ({
            sourceIndex: index + 1,
            uid: article.uid,
            title: article.title,
            doi: article.doi || null,
            pmid: article.pmid || null,
            source: article.source || article._source || null,
            pubdate: article.pubdate || (article.year ? String(article.year) : null),
        }));

        return await db.upsertTopicKnowledge(cleanTopic, finalKnowledge, sourceArticles, 'ai_generated', 0.65);
    } catch (err) {
        log?.warn?.({ err, topic: cleanTopic }, 'Topic knowledge extraction skipped');
        return null;
    }
}

function registerSynthesisRoutes(app, deps) {
    const {
        db, cache, serverConfig, ai, fetchImpl,
        requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature, requireMonthlyLimit,
        aiUserLimit, synthesisLimit, validateBody, schemas,
    } = deps;

    app.post('/api/ai/synthesize', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), synthesisLimit(3, 3600), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto', async: asyncJob } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 15);

        if (asyncJob !== false) {
            try {
                const out = await getOrEnqueueFullSynthesis({
                    db,
                    topic: topic || '',
                    articles: topArticles,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                    userId: req.user?.id || null,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202 : 200;
                return res.status(code).json(out);
            } catch (error) {
                req.log.error({ err: error }, 'Synthesis async enqueue error');
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        try {
            const result = await runFullSynthesisGeneration({
                articles: topArticles,
                topic: topic || 'General Medical Inquiry',
                provider,
                db,
                cache,
                serverConfig,
                fetchImpl,
                userId: req.user?.id || null,
            });
            void maybeStoreTopicKnowledge({
                db,
                ai,
                topic,
                synthesis: result.synthesis,
                articles: topArticles,
                provider: result.audit?.provider,
                model: result.audit?.model,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/synthesize/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), aiUserLimit(5, 60), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = selectTopSynthesisArticles(articles);
        const cacheKey = getSynthesisCacheKey(topic, topArticles);
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            setupSSE(res);
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            sendSSE(res, 'result', { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey });
            sendSSE(res, 'done', {});
            return res.end();
        }

        try {
            const context = await prepareSynthesisContext({ articles: topArticles, topic, db, cache, userId: req.user?.id || null });

            setupSSE(res);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                sendSSE(res, 'error', { message: 'No AI provider configured. Add GEMINI_API_KEY to .env' });
                return res.end();
            }

            let rawText = '';
            for await (const chunk of ai.callTextStream(context.prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })) {
                rawText += chunk;
                sendSSE(res, 'chunk', { text: chunk });
            }

            const synthesis = parseSynthesisText(rawText);
            const citationValidation = validateSynthesisCitations(synthesis, {
                sourceCount: context.topArticles.length,
                guidelineCount: context.guidelines.length,
            });
            const result = buildSynthesisResult({
                synthesis,
                topic,
                topArticles: context.topArticles,
                sourceMap: context.sourceMap,
                citationValidation,
                retractedUids: context.retractedUids,
                retractionResults: context.retractionResults,
                prompt: context.prompt,
                provider: selectedProvider,
                model: selectedModel,
                fullTextIndexedCount: context.fullTextIndexedCount,
                fullTextCoverageRatio: context.fullTextCoverageRatio,
            });

            await persistSynthesisResult({
                db,
                cache,
                cacheKey: context.cacheKey,
                result,
                topic,
                synthesis,
                topArticles: context.topArticles,
                model: selectedModel,
                serverConfig,
                userId: req.user?.id || null,
                provider: selectedProvider,
            });
            void maybeStoreTopicKnowledge({
                db,
                ai,
                topic,
                synthesis,
                articles: context.topArticles,
                provider: selectedProvider,
                model: selectedModel,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });

            sendSSE(res, 'result', result);
            sendSSE(res, 'done', {});
            res.end();
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis stream error');
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            sendSSE(res, 'error', { message: error.message || 'Stream error' });
            res.end();
        }
    });
}

module.exports = { registerSynthesisRoutes, maybeStoreTopicKnowledge };
