'use strict';

const crypto = require('crypto');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { createQuizGenerationService } = require('../../services/quizGenerationService');

function sendServiceResponse(res, result) {
    return res.status(result.status || 200).json(result.body);
}

function registerQuizRoutes(app, {
    db,
    serverConfig,
    ai,
    mcqValidator,
    logger,
    requireJson,
    requireAiAuth,
    requireAuthJwt,
    rateLimit,
    aiUserLimit,
    validateBody,
    schemas,
    helpers,
}) {
    const quizGenerationService = createQuizGenerationService({
        db,
        serverConfig,
        ai,
        mcqValidator,
        logger,
        helpers,
    });

    app.post('/api/quiz/generate', requireJson, requireAiAuth, aiUserLimit(10, 60), validateBody(schemas.quiz), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
            const result = await quizGenerationService.generateQuiz({
                body: req.body,
                user: req.user,
                log: req.log,
            });
            return sendServiceResponse(res, result);
        });
    });

    app.post('/api/quiz/from-evidence', requireJson, requireAiAuth, rateLimit(10, 60), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
            const result = await quizGenerationService.generateFromEvidence({
                body: req.body,
                user: req.user,
                log: req.log,
            });
            return sendServiceResponse(res, result);
        });
    });

    // Practice Pool: serve pre-seeded MCQs across all topics.
    app.get('/api/quiz/pool', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const count = Math.min(Math.max(parseInt(String(req.query.count || '10'), 10) || 10, 1), 30);
            const difficulty = req.query.difficulty || 'all';
            const questionType = req.query.type || 'all';

            const rows = await db.all(
                `SELECT topic, object_type, object_payload FROM teaching_objects
                 WHERE object_type IN ('cold_start_mcq', 'guideline_mcq')
                 ORDER BY RANDOM()`
            );

            const allMcqs = [];
            for (const row of rows) {
                let payload;
                try { payload = JSON.parse(row.object_payload || '{}'); } catch { continue; }
                const mcqs = payload.mcqs || [];
                for (const q of mcqs) {
                    if (!q.question || !q.options || !q.correctAnswer) continue;
                    if (difficulty !== 'all' && q.difficulty !== difficulty) continue;
                    if (questionType !== 'all' && q.questionType !== questionType) continue;
                    const stableHash = crypto
                        .createHash('sha1')
                        .update(`${row.topic}|${row.object_type}|${q.question}|${q.correctAnswer}`)
                        .digest('hex')
                        .slice(0, 16);
                    allMcqs.push({
                        id: `pool_${stableHash}`,
                        topic: row.topic,
                        source: row.object_type === 'guideline_mcq' ? 'guideline' : 'evidence',
                        type: q.type || 'multiple_choice',
                        questionType: q.questionType || 'recall',
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation || null,
                        guidelineRef: q.guidelineRef || null,
                        difficulty: q.difficulty || 'medium',
                        outlineNodeId: q.outlineNodeId || `pool:${stableHash}`,
                        outlineLabel: q.outlineLabel || q.question.slice(0, 120),
                        claimKey: q.claimKey || q.claim_key || null,
                        sourceArticleUid: q.sourceArticleUid || q.articleUid || null,
                        sourceArticleTitle: q.sourceArticleTitle || q.sourceArticle || null,
                    });
                }
            }

            for (let i = allMcqs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allMcqs[i], allMcqs[j]] = [allMcqs[j], allMcqs[i]];
            }

            res.json({ questions: allMcqs.slice(0, count), total: allMcqs.length });
        } catch (err) {
            req.log.error({ err }, 'Practice pool error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerQuizRoutes };
