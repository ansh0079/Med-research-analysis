'use strict';

const { getSharedAiService } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { buildTopicKnowledgePrompt, buildGuidelineQuizPrompt } = require('../prompts');
const { generateAndStoreMCQs } = require('./mcqGeneratorService');
const { guidelineMcqKey } = require('../utils/teachingObjectKeys');
const { searchGuidelines } = require('./guidelineService');
const { validateAiOutput } = require('./aiOutputValidation');
const { parseJsonBlock, parseJsonArrayBlock } = require('../utils/parseJson');
const logger = require('../config/logger');

/**
 * Auto-seed topic knowledge from search results.
 * Extracted from the search route so it can run as a durable queue job.
 */
async function processTopicSeedJob({ topic, articles = [], serverConfig, fetchImpl, db, cache }) {
    const seedQuery = String(topic || '').trim();
    if (!seedQuery || !articles.length) {
        return { status: 'skipped', reason: 'missing_topic_or_articles' };
    }

    // Double-check no concurrent seed already landed.
    const alreadySeeded = await db.getTopicKnowledge(seedQuery).catch((err) => {
        logger.warn({ err, topic: seedQuery }, 'getTopicKnowledge failed during topic seed');
        return null;
    });
    if (alreadySeeded) {
        return { status: 'skipped', reason: 'already_seeded' };
    }

    const seedArticles = articles.slice(0, 8);
    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const { provider: seedProvider, model: seedModel } = resolveProvider({}, serverConfig);
    if (!seedProvider) {
        return { status: 'skipped', reason: 'no_ai_provider' };
    }

    const prompt = buildTopicKnowledgePrompt(seedQuery, seedArticles);
    const raw = await ai.callText(prompt, seedProvider, seedModel, { temperature: 0.15 });

    const knowledgeRaw = parseJsonBlock(raw);
    const validated = validateAiOutput('topic_knowledge', knowledgeRaw, { allowDegrade: false });
    if (!validated.ok) {
        return { status: 'failed', reason: 'validation_failed', details: validated.error };
    }
    const knowledge = validated.data;
    if (!knowledge?.mentorMessage) {
        return { status: 'failed', reason: 'missing_mentor_message' };
    }

    const sourceArticles = seedArticles.map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid || null,
        title: a.title || 'Unknown',
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.journal || a.source || null,
        pubdate: a.pubdate || null,
    }));

    await db.upsertTopicKnowledge(seedQuery, knowledge, sourceArticles, 'ai_generated', 0.65);
    logger.info({ topic: seedQuery, papers: seedArticles.length }, 'Auto-seeded new topic from durable job');

    let mcqCount = 0;
    try {
        const mcqResult = await generateAndStoreMCQs(db, ai, seedQuery, knowledge, { provider: seedProvider, model: seedModel });
        mcqCount = mcqResult?.count || mcqResult?.mcqs?.length || 0;
        logger.info({ topic: seedQuery, mcqCount }, 'Auto-generated cold-start MCQs from durable job');
    } catch (mcqErr) {
        logger.warn({ err: mcqErr, topic: seedQuery }, 'Auto MCQ generation failed in durable job');
    }

    let guidelineCount = 0;
    let guidelineMcqCount = 0;
    try {
        const ncbiKey = serverConfig?.keys?.ncbi;
        const ncbiEmail = serverConfig?.keys?.ncbiEmail;
        const guidelines = await searchGuidelines(seedQuery, ncbiKey, ncbiEmail);
        guidelineCount = guidelines.length;
        if (guidelines.length > 0) {
            for (const gl of guidelines) {
                await db.createGuideline({
                    topic: seedQuery,
                    sourceBody: gl.source || 'PubMed Guideline',
                    sourceYear: gl.pubdate ? parseInt(String(gl.pubdate).slice(0, 4), 10) : null,
                    recommendationText: gl.title,
                    sourceUrl: gl.uid ? `https://pubmed.ncbi.nlm.nih.gov/${gl.uid}/` : null,
                }).catch(() => {});
            }

            if (serverConfig?.keys?.anthropic) {
                const guidelineKey = guidelineMcqKey(db, seedQuery);
                const existingGl = await db.getTeachingObjectByKey(guidelineKey).catch(() => null);
                if (!existingGl) {
                    const glPrompt = buildGuidelineQuizPrompt(seedQuery, guidelines);
                    try {
                        const glRaw = await ai.callText(glPrompt, seedProvider, seedModel, { temperature: 0.3, maxOutputTokens: 2500 });
                        const glMcqsRaw = parseJsonArrayBlock(glRaw);
                        const validatedGl = validateAiOutput('quiz_generation', glMcqsRaw, { allowDegrade: false });
                        const glMcqs = validatedGl.ok
                            ? (Array.isArray(validatedGl.data?.questions) ? validatedGl.data.questions : glMcqsRaw)
                            : null;
                        if (Array.isArray(glMcqs) && glMcqs.length > 0) {
                            await db.upsertTeachingObject({
                                objectKey: guidelineKey,
                                objectType: 'guideline_mcq',
                                topic: db.normalizeTopic(seedQuery),
                                title: `Guideline MCQs: ${seedQuery}`,
                                payload: { mcqs: glMcqs.slice(0, 5), guidelineCount: guidelines.length, generatedAt: new Date().toISOString() },
                                provider: seedProvider,
                                model: seedModel,
                                confidence: 0.85,
                            });
                            guidelineMcqCount = glMcqs.length;
                            logger.info({ topic: seedQuery, count: glMcqs.length, guidelines: guidelines.length }, 'Auto-generated guideline MCQs from durable job');
                        }
                    } catch (glMcqErr) {
                        logger.warn({ err: glMcqErr, topic: seedQuery }, 'Auto guideline MCQ generation failed in durable job');
                    }
                }
            }
            logger.info({ topic: seedQuery, guidelines: guidelines.length }, 'Auto-stored guidelines for new topic from durable job');
        }
    } catch (glErr) {
        logger.warn({ err: glErr, topic: seedQuery }, 'Auto guideline search failed in durable job');
    }

    return {
        status: 'completed',
        topic: seedQuery,
        papers: seedArticles.length,
        mcqCount,
        guidelineCount,
        guidelineMcqCount,
    };
}

module.exports = { processTopicSeedJob };
