const logger = require('../../config/logger');
const { getQuizAttributionCoverage } = require('../../services/searchLearningOutcomeService');
function registerProfileRoutes(app, deps) {
    const { db, requireAuthJwt, requireAuthOrBeta, requireVerifiedEmail, rateLimit, serverConfig, fetch: fetchImpl } = deps;
    const { limitBodySize, requireJson, validateBody, schemas } = require('../../utils/validation');
    const requireQuizAuth = requireAuthOrBeta || requireAuthJwt;

    app.get('/api/learning/profile', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const profile = await db.getLearningProfile(req.user.id);
            if (!profile) return res.status(404).json({ error: 'Profile not found' });
            res.json({ profile });
        } catch (error) {
            req.log.error({ err: error }, 'Get learning profile error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/profile', limitBodySize(64 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.learningProfile), async (req, res) => {
        try {
            const profile = await db.upsertLearningProfile(req.user.id, req.body);
            res.json({ profile });
        } catch (error) {
            req.log.error({ err: error }, 'Upsert learning profile error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Curricula (study paths)
    // ==========================================

    app.get('/api/learning/curricula', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const list = await db.listCurricula();
            const curricula = [];
            for (const c of list) {
                const examSummary = await db.getCurriculumExamSummaryForUser(req.user.id, c.id);
                curricula.push({ ...c, examSummary });
            }
            res.json({ curricula });
        } catch (error) {
            req.log.error({ err: error }, 'List curricula error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/curricula/:slug', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const detail = await db.getCurriculumDetailBySlug(req.params.slug);
            if (!detail) return res.status(404).json({ error: 'Curriculum not found' });
            const [progress, examSummary] = await Promise.all([
                db.getUserCurriculumProgressMap(req.user.id, detail.id),
                db.getCurriculumExamSummaryForUser(req.user.id, detail.id),
            ]);
            res.json({ curriculum: detail, progress, examSummary });
        } catch (error) {
            req.log.error({ err: error }, 'Get curriculum error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/topic-progress', requireAuthJwt, rateLimit(20, 60), async (req, res) => {
        try {
            const slug = String(req.query.slug || 'specialty-clinical-topics').trim();
            const detail = await db.getCurriculumDetailBySlug(slug);
            if (!detail) return res.status(404).json({ error: 'Curriculum not found' });

            const [progressMap, examSummary, masteryList] = await Promise.all([
                db.getUserCurriculumProgressMap(req.user.id, detail.id),
                db.getCurriculumExamSummaryForUser(req.user.id, detail.id),
                db.listUserTopicMastery(req.user.id),
            ]);

            const masteryByNorm = {};
            for (const m of masteryList) {
                masteryByNorm[m.normalizedTopic] = m;
            }

            const normalizeTopic = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();

            const blocks = detail.blocks.map((block) => {
                const topics = (block.topics || []).map((topic) => {
                    const norm = normalizeTopic(topic.displayName);
                    const progress = progressMap[topic.id] || null;
                    const mastery = masteryByNorm[norm] || null;
                    return {
                        id: topic.id,
                        displayName: topic.displayName,
                        normalizedTopic: norm,
                        status: progress?.status || 'not_started',
                        quizAttempts: progress?.quizAttempts || 0,
                        correctCount: progress?.correctCount || 0,
                        lastScorePct: progress?.lastScorePct ?? null,
                        overallScore: mastery?.overallScore ?? null,
                        recallScore: mastery?.recallScore ?? null,
                        clinicalApplicationScore: mastery?.clinicalApplicationScore ?? null,
                        guidelineScore: mastery?.guidelineScore ?? null,
                        nextReviewAt: mastery?.nextReviewAt ?? null,
                    };
                });
                const started = topics.filter((t) => t.status !== 'not_started').length;
                const confident = topics.filter((t) => t.status === 'confident').length;
                const avgScore = topics.filter((t) => t.overallScore != null).length > 0
                    ? Math.round(topics.filter((t) => t.overallScore != null).reduce((s, t) => s + t.overallScore, 0) / topics.filter((t) => t.overallScore != null).length)
                    : null;
                return {
                    id: block.id,
                    name: block.name,
                    sortOrder: block.sortOrder,
                    topicCount: topics.length,
                    started,
                    confident,
                    avgScore,
                    topics,
                };
            });

            res.json({
                curriculum: { id: detail.id, slug: detail.slug, name: detail.name },
                examSummary,
                blocks,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Topic progress error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Adaptive topic memory
    // ==========================================

    app.get('/api/learning/topic-memory/:topic', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const memory = await db.getUserTopicMemory(req.user.id, topic);
            res.json({ memory });
        } catch (error) {
            req.log.error({ err: error }, 'Topic memory fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/claim-mastery/:topic', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '80'), 10) || 80, 1), 200);
            const claims = await db.getUserClaimMastery(req.user.id, topic, { limit });
            const summary = {
                total: claims.length,
                untested: claims.filter((claim) => claim.masteryState === 'untested').length,
                weak: claims.filter((claim) => claim.masteryState === 'weak').length,
                mastered: claims.filter((claim) => claim.masteryState === 'mastered').length,
            };
            res.json({ topic, summary, claims });
        } catch (error) {
            req.log.error({ err: error }, 'Claim mastery fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/quiz-attempts/by-claim/:claimKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            if (claimKey.length < 8 || claimKey.length > 64) {
                return res.status(400).json({ error: 'claimKey is required' });
            }
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 100);
            const attempts = await db.getQuizAttemptsForClaimKey(req.user.id, claimKey, { limit });
            res.json({ claimKey, count: attempts.length, attempts });
        } catch (error) {
            req.log.error({ err: error }, 'Claim quiz attempts fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/quiz-attribution-coverage', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 60);
            const scopeUserId = req.query.scope === 'global' ? null : req.user.id;
            const coverage = await getQuizAttributionCoverage(db, { days, userId: scopeUserId });
            res.json(coverage || {
                days,
                totalAttempts: 0,
                attemptsWithSource: 0,
                attributedAttempts: 0,
                sourceCoverageRate: null,
                attributionRate: null,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz attribution coverage error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/prompt-variant-metrics', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const days = Math.min(Math.max(parseInt(String(req.query.days || '14'), 10) || 14, 1), 90);
            const rows = await db.all(
                `SELECT COALESCE(prompt_variant, 'unknown') AS prompt_variant,
                        COUNT(*) AS attempts,
                        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
                        AVG(CASE WHEN is_correct = 1 THEN 1.0 ELSE 0.0 END) AS accuracy,
                        AVG(confidence) AS avg_confidence
                 FROM quiz_attempts
                 WHERE user_id = ? AND created_at >= datetime('now', ?)
                 GROUP BY COALESCE(prompt_variant, 'unknown')
                 ORDER BY attempts DESC`,
                [req.user.id, `-${days} days`]
            );
            res.json({
                days,
                variants: rows.map((row) => ({
                    promptVariant: row.prompt_variant,
                    attempts: Number(row.attempts || 0),
                    correct: Number(row.correct || 0),
                    accuracy: row.accuracy == null ? null : Math.round(Number(row.accuracy) * 1000) / 10,
                    avgConfidence: row.avg_confidence == null ? null : Math.round(Number(row.avg_confidence) * 10) / 10,
                })),
            });
        } catch (error) {
            req.log.error({ err: error }, 'Prompt variant metrics fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/quiz-eval-dataset', requireAuthJwt, rateLimit(20, 60), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 10), 250);
            const topic = String(req.query.topic || '').trim();
            const normalizedTopic = topic ? db.normalizeTopic(topic) : '';
            const rows = await db.all(
                `SELECT question_id, topic, normalized_topic, question_type, question_text,
                        correct_answer, confidence, source_article_uid, outline_node_id,
                        claim_key, concept_hash, prompt_variant, created_at
                 FROM quiz_attempts
                 WHERE user_id = ?
                   AND is_correct = 1
                   AND confidence >= 4
                   AND (? = '' OR normalized_topic = ?)
                 ORDER BY confidence DESC, created_at DESC
                 LIMIT ?`,
                [req.user.id, normalizedTopic, normalizedTopic, limit]
            );
            const byType = {};
            for (const row of rows) {
                const key = row.question_type || 'unknown';
                byType[key] = (byType[key] || 0) + 1;
            }
            res.json({
                generatedAt: new Date().toISOString(),
                topic: topic || null,
                count: rows.length,
                byType,
                dataset: rows.map((row) => ({
                    questionId: row.question_id,
                    topic: row.topic,
                    normalizedTopic: row.normalized_topic,
                    questionType: row.question_type,
                    questionText: row.question_text,
                    groundTruthAnswer: row.correct_answer,
                    confidence: Number(row.confidence || 0),
                    sourceArticleUid: row.source_article_uid || null,
                    outlineNodeId: row.outline_node_id || null,
                    claimKey: row.claim_key || null,
                    conceptHash: row.concept_hash || null,
                    promptVariant: row.prompt_variant || null,
                    createdAt: row.created_at,
                })),
            });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz eval dataset fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/evidence-judgement-profile', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 20);
            const profile = await db.getEvidenceJudgementProfile(req.user.id, { topic, limit });
            res.json({ profile });
        } catch (error) {
            req.log.error({ err: error }, 'Evidence judgement profile fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/practice-alerts', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
            const alerts = await db.listPracticeChangingTeachingObjects({ topic, limit });
            res.json({ alerts, count: alerts.length });
        } catch (error) {
            req.log.error({ err: error }, 'Practice alerts fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/staleness', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.query.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const snapshots = await (db.getLatestSynthesisSnapshots?.(topic, 2) ?? Promise.resolve([]));
            if (snapshots.length < 2) {
                return res.json({ hasPrior: snapshots.length > 0, significantChange: false, snapshots });
            }
            const [latest, prior] = snapshots;
            const latestClaims = (() => { try { return JSON.parse(latest.claim_texts_json || '[]'); } catch { return []; } })();
            const priorClaims = (() => { try { return JSON.parse(prior.claim_texts_json || '[]'); } catch { return []; } })();
            const latestClaimSet = new Set(latestClaims.map((c) => String(c).toLowerCase()));
            const priorClaimSet = new Set(priorClaims.map((c) => String(c).toLowerCase()));
            const addedClaims = latestClaims.filter((c) => !priorClaimSet.has(String(c).toLowerCase())).slice(0, 3);
            const removedClaims = priorClaims.filter((c) => !latestClaimSet.has(String(c).toLowerCase())).slice(0, 3);
            const gradeDiffers = latest.evidence_grade !== prior.evidence_grade;
            const findingCountDelta = Math.abs(latest.key_finding_count - prior.key_finding_count);
            const claimFingerprintDiffers = latest.claim_fingerprint && prior.claim_fingerprint && latest.claim_fingerprint !== prior.claim_fingerprint;
            const significantChange = gradeDiffers || findingCountDelta >= 2 || claimFingerprintDiffers;
            const changes = [];
            if (gradeDiffers) changes.push(`Evidence grade changed from ${prior.evidence_grade} to ${latest.evidence_grade}`);
            if (findingCountDelta >= 2) changes.push(`Key finding count shifted from ${prior.key_finding_count} to ${latest.key_finding_count}`);
            if (claimFingerprintDiffers) changes.push('Clinical teaching claims changed since the previous synthesis');
            for (const claim of addedClaims) changes.push(`New/changed claim: ${String(claim).slice(0, 180)}`);
            for (const claim of removedClaims) changes.push(`Prior claim no longer prominent: ${String(claim).slice(0, 180)}`);
            res.json({ hasPrior: true, significantChange, changes, latest, prior, addedClaims, removedClaims });
        } catch (error) {
            req.log.error({ err: error }, 'Staleness check error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });


}

module.exports = { registerProfileRoutes };
