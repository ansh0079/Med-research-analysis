const logger = require('../../config/logger');
const spacedRep = require('../../services/spacedRepService');
const { applyEffectiveDifficultyCalibration, sessionScorePct, detectPlateauAndSuggestLevelUp } = require('../../services/learningDifficultyService');
const { inferMisconceptionCategory } = require('../../services/misconceptionCategoryService');
const { recordMasterySnapshot, getLearningVelocity } = require('../../services/learningVelocityService');
const { updateInferredMisconceptionsForTopic } = require('../../services/misconceptionInferenceService');
const { analyzeQuizErrorPatterns } = require('../../services/quizErrorPatternService');
const { attributeQuizAttemptRewards, attributeRecommendationFollowThrough } = require('../../services/searchLearningOutcomeService');
const {
    calculateMastery, nextReviewDate, updateStreak,
    buildOutline, initialCoverage, updateCoverage, summarizeRunGaps,
    textIncludes, inferEvidenceJudgement, normalizeAttemptClaimKey,
} = require('../../utils/learningUtils');
function registerQuizRoutes(app, deps) {
    const { db, requireAuthJwt, requireAuthOrBeta, requireVerifiedEmail, rateLimit, serverConfig, fetch: fetchImpl } = deps;
    const { limitBodySize, requireJson, validateBody, schemas } = require('../../utils/validation');
    const requireQuizAuth = requireAuthOrBeta || requireAuthJwt;

    function recordLearningEventSafe(event) {
        return db.recordLearningEvent(event).catch((err) => {
            logger.warn({ err, eventType: event?.eventType }, 'recordLearningEvent failed');
            return null;
        });
    }

    app.post('/api/learning/quiz-attempt', limitBodySize(256 * 1024), requireJson, requireQuizAuth, requireVerifiedEmail, rateLimit(60, 60), validateBody(schemas.quizAttempt), async (req, res) => {
        try {
            const { topic, attempts, studyRunId, curriculumTopicId } = req.body;

            if (req.betaAnonymous) {
                const normalizedTopic = db.normalizeTopic(topic);
                const attemptsWithJudgement = attempts.map((attempt) => {
                    const claimKey = normalizeAttemptClaimKey(attempt);
                    const computedIsCorrect = String(attempt.userAnswer || '').trim().toLowerCase()
                        === String(attempt.correctAnswer || '').trim().toLowerCase();
                    return {
                        ...attempt,
                        claimKey,
                        isCorrect: computedIsCorrect,
                        clientReportedIsCorrect: attempt.isCorrect,
                        ...inferEvidenceJudgement({ ...attempt, claimKey, isCorrect: computedIsCorrect }),
                    };
                });
                for (const attempt of attemptsWithJudgement) {
                    void recordLearningEventSafe({
                        userId: null,
                        eventType: 'mcq_answered',
                        topic,
                        claimKey: attempt.claimKey || null,
                        sourceType: 'quiz_attempt',
                        sourceId: null,
                        payload: {
                            questionType: attempt.questionType,
                            isCorrect: Boolean(attempt.isCorrect),
                            confidence: attempt.confidence ?? null,
                            reasoningTags: attempt.reasoningTags || [],
                            promptVariant: attempt.promptVariant || null,
                            sessionId: req.sessionId,
                            betaAnonymous: true,
                        },
                    });
                }
                void attributeQuizAttemptRewards(db, null, attemptsWithJudgement, topic, { sessionId: req.sessionId })
                    .catch((err) => { logger.warn({ err }, 'attributeQuizAttemptRewards (beta) failed'); });
                return res.json({
                    saved: attempts.length,
                    mastery: { overall: 0, byType: {} },
                    betaAnonymous: true,
                });
            }

            if (!req.user?.id) {
                return res.status(401).json({ error: 'Authorization required' });
            }

            const userId = req.user.id;
            let run = null;
            if (studyRunId) {
                run = await db.getStudyRun(studyRunId);
                if (!run || run.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
            }

            // Insert all attempts and update FSRS spaced rep cards
            const normalizedTopic = db.normalizeTopic(topic);
            const attemptsWithJudgement = attempts.map((attempt) => {
                const claimKey = normalizeAttemptClaimKey(attempt);
                const computedIsCorrect = String(attempt.userAnswer || '').trim().toLowerCase()
                    === String(attempt.correctAnswer || '').trim().toLowerCase();
                const clientReportedIsCorrect = attempt.isCorrect;
                return {
                    ...attempt,
                    claimKey,
                    isCorrect: computedIsCorrect,
                    clientReportedIsCorrect,
                    ...inferEvidenceJudgement({ ...attempt, claimKey, isCorrect: computedIsCorrect }),
                };
            });
            for (const attempt of attemptsWithJudgement) {
                const savedAttempt = await db.createQuizAttempt({ ...attempt, userId, topic, studyRunId: run?.id || null });
                attempt.id = savedAttempt?.id || null;

                if (attempt.clientReportedIsCorrect !== undefined && attempt.clientReportedIsCorrect !== attempt.isCorrect) {
                    void recordLearningEventSafe({
                        userId,
                        eventType: 'validation_mismatch',
                        topic,
                        claimKey: attempt.claimKey || null,
                        sourceType: 'quiz_attempt',
                        sourceId: savedAttempt?.id,
                        payload: {
                            questionType: attempt.questionType,
                            clientReported: Boolean(attempt.clientReportedIsCorrect),
                            serverComputed: Boolean(attempt.isCorrect),
                            userAnswer: attempt.userAnswer,
                            correctAnswer: attempt.correctAnswer,
                        },
                    });
                }

                void recordLearningEventSafe({
                    userId,
                    eventType: 'mcq_answered',
                    topic,
                    claimKey: attempt.claimKey || null,
                    sourceType: 'quiz_attempt',
                    sourceId: savedAttempt?.id,
                    payload: {
                        questionType: attempt.questionType,
                        isCorrect: Boolean(attempt.isCorrect),
                        confidence: attempt.confidence ?? null,
                        reasoningTags: attempt.reasoningTags || [],
                        promptVariant: attempt.promptVariant || null,
                        studyRunId: run?.id || null,
                        outlineNodeId: attempt.outlineNodeId || null,
                    },
                });
                if (attempt.outlineNodeId) {
                    spacedRep.updateCard(db, {
                        userId,
                        topic,
                        normalizedTopic,
                        outlineNodeId: attempt.outlineNodeId,
                        outlineLabel: attempt.outlineLabel ?? attempt.questionText?.slice(0, 120) ?? null,
                        isCorrect: Boolean(attempt.isCorrect),
                        timeMs: attempt.timeMs ?? null,
                    }).catch((err) => { logger.warn({ err }, 'updateCard failed'); return null; });
                }
                if (attempt.claimKey) {
                    void recordLearningEventSafe({
                        userId,
                        eventType: 'claim_recalled',
                        topic,
                        claimKey: attempt.claimKey,
                        sourceType: 'quiz_attempt',
                        sourceId: savedAttempt?.id,
                        payload: {
                            isCorrect: Boolean(attempt.isCorrect),
                            confidence: attempt.confidence ?? null,
                            questionType: attempt.questionType,
                            promptVariant: attempt.promptVariant || null,
                        },
                    });
                    spacedRep.updateCard(db, {
                        userId,
                        topic,
                        normalizedTopic,
                        outlineNodeId: `claim:${attempt.claimKey}`,
                        outlineLabel: attempt.outlineLabel ?? attempt.questionText?.slice(0, 120) ?? null,
                        isCorrect: Boolean(attempt.isCorrect),
                        timeMs: attempt.timeMs ?? null,
                    }).catch((err) => { logger.warn({ err }, 'updateCard failed'); return null; });
                }
                // Track personal misconceptions for wrong answers tied to claims
                if (!attempt.isCorrect && attempt.claimKey && db.upsertUserClaimMisconception) {
                    void db.upsertUserClaimMisconception(userId, {
                        claimKey: attempt.claimKey,
                        wrongOptionText: String(attempt.userAnswer || '').slice(0, 500),
                        correctOptionText: String(attempt.correctAnswer || '').slice(0, 500),
                        topic,
                        misconceptionCategory: inferMisconceptionCategory({
                            questionType: attempt.questionType,
                            reasoningTags: attempt.reasoningTags || [],
                            claimKey: attempt.claimKey,
                        }),
                    }).catch((err) => { logger.warn({ err }, 'upsertUserClaimMisconception failed'); return null; });
                }
            }

            await db.mergeUserTopicWeakOutlineNodes(userId, topic, attempts).catch((err) => { logger.warn({ err }, 'mergeUserTopicWeakOutlineNodes failed'); return null; });

            const missedAttempts = attemptsWithJudgement.filter((attempt) => !attempt.isCorrect);
            const remediationTargets = missedAttempts
                .map((attempt) => ({
                    outlineNodeId: attempt.outlineNodeId || null,
                    claimKey: attempt.claimKey || null,
                    questionType: attempt.questionType,
                    sourceArticleUid: attempt.sourceArticleUid || null,
                    sourceArticleTitle: attempt.sourceArticleTitle || null,
                    prompt: attempt.claimKey
                        ? `Review claim ${attempt.claimKey} (missed).`
                        : attempt.outlineNodeId
                            ? `Review ${attempt.outlineNodeId} before the next quiz.`
                            : `Review the ${attempt.questionType} concept behind this missed question.`,
                }))
                .filter((target, index, arr) => {
                    const key = `${target.outlineNodeId || ''}:${target.claimKey || ''}:${target.questionType}:${target.sourceArticleUid || ''}`;
                    return arr.findIndex((item) => `${item.outlineNodeId || ''}:${item.claimKey || ''}:${item.questionType}:${item.sourceArticleUid || ''}` === key) === index;
                })
                .slice(0, 8);

            if (run) {
                const nodeCoverage = updateCoverage(run, attemptsWithJudgement);
                const totalNodes = Object.keys(nodeCoverage).length;
                const coveredNodes = Object.values(nodeCoverage).filter((n) => n.seen).length;
                await db.updateStudyRun(run.id, {
                    nodeCoverage,
                    progress: {
                        ...(run.progress || {}),
                        quizCompletedAt: new Date().toISOString(),
                        quizAttempts: Number(run.progress?.quizAttempts || 0) + attempts.length,
                        coveredNodes,
                        totalNodes,
                    },
                });
            }

            // Recalculate mastery
            const stats = await db.getQuizAttemptStats(userId, topic);
            const mastery = calculateMastery(stats);
            const totalAttempts = stats.length;
            const correctCount = stats.filter((s) => s.is_correct === 1).length;

            await db.upsertUserTopicMastery(userId, topic, {
                overallScore: mastery.overall,
                recallScore: mastery.byType.recall ?? 0,
                clinicalApplicationScore: mastery.byType.clinical_application ?? 0,
                trialInterpretationScore: mastery.byType.trial_interpretation ?? 0,
                guidelineScore: mastery.byType.guideline ?? 0,
                pitfallScore: mastery.byType.pitfall ?? 0,
                attemptsCount: totalAttempts,
                correctCount,
                lastAttemptAt: new Date().toISOString(),
                nextReviewAt: nextReviewDate(mastery.overall),
            });

            // Update streak
            const profile = await db.getLearningProfile(userId);
            if (profile) {
                const updated = updateStreak(profile);
                await db.upsertLearningProfile(userId, updated);
            }

            const sessionCorrect = attemptsWithJudgement.filter((attempt) => attempt.isCorrect).length;
            const sessionScore = sessionScorePct(sessionCorrect, attempts.length);

            await recordMasterySnapshot(db, userId, topic, {
                overallScore: mastery.overall,
                sessionScore,
                reason: 'quiz_session',
            }).catch((err) => { logger.warn({ err }, 'recordMasterySnapshot failed'); return null; });

            const difficultyCalibration = await applyEffectiveDifficultyCalibration(db, userId, {
                profile,
                masteryOverall: mastery.overall,
                sessionCorrect,
                sessionTotal: attempts.length,
            }).catch((err) => { logger.warn({ err }, 'applyEffectiveDifficultyCalibration failed'); return null; });

            const learningVelocity = await getLearningVelocity(db, userId, topic, { days: 7 })
                .catch((err) => { logger.warn({ err }, 'getLearningVelocity failed'); return null; });

            // ── Phase 3: Infer misconception tags from repeated wrong answers ───
            void updateInferredMisconceptionsForTopic(db, userId, topic, { lookbackLimit: 12 })
                .catch((err) => { logger.warn({ err }, 'updateInferredMisconceptionsForTopic failed'); });

            const ctId = curriculumTopicId != null ? Number(curriculumTopicId) : null;
            if (ctId && !Number.isNaN(ctId)) {
                const batchCorrect = attemptsWithJudgement.filter((a) => a.isCorrect).length;
                await db.mergeCurriculumTopicAttemptBatch(userId, ctId, batchCorrect, attempts.length);
            }

            // ── Phase 3: Detect plateau and suggest level-up ────────────────────
            const recentStats = stats.slice(-3);
            const recentCorrect = recentStats.filter((s) => s.is_correct === 1).length;
            const recentAccuracy = recentStats.length > 0 ? Math.round((recentCorrect / recentStats.length) * 100) : 0;
            const plateauCheck = detectPlateauAndSuggestLevelUp({
                sessionCount: stats.length,
                recentAccuracy,
                currentLearningMode: profile?.trainingStage || 'student',
                difficultyRecentlyChanged: Boolean(difficultyCalibration?.changed),
            });

            void attributeQuizAttemptRewards(db, userId, attemptsWithJudgement, topic)
                .catch((err) => { logger.warn({ err }, 'attributeQuizAttemptRewards failed'); });

            void attributeRecommendationFollowThrough(db, userId, {
                topic,
                normalizedTopic,
                eventType: 'quiz_session',
            }).catch((err) => { logger.warn({ err }, 'attributeRecommendationFollowThrough failed'); });

            const errorPatterns = analyzeQuizErrorPatterns(attemptsWithJudgement, { topic });
            if (errorPatterns.hasPatterns && db.recordLearningEvent) {
                void db.recordLearningEvent({
                    userId,
                    eventType: 'quiz_error_patterns',
                    topic,
                    sourceType: 'quiz_attempt',
                    sourceId: studyRunId ? String(studyRunId) : null,
                    payload: {
                        sessionMissed: errorPatterns.sessionMissed,
                        sessionTotal: errorPatterns.sessionTotal,
                        missRate: errorPatterns.missRate,
                        dominantReasoningTags: errorPatterns.dominantReasoningTags,
                        recurringClaimKeys: errorPatterns.recurringClaimKeys,
                        misconceptionCategories: errorPatterns.misconceptionCategories,
                        recommendations: errorPatterns.recommendations,
                    },
                }).catch((err) => { logger.warn({ err }, 'quiz_error_patterns event failed'); });
            }

            res.json({
                saved: attempts.length,
                mastery,
                sessionScore,
                effectiveDifficulty: difficultyCalibration,
                learningVelocity,
                plateauCheck,
                errorPatterns,
                remediation: {
                    missedCount: missedAttempts.length,
                    targets: remediationTargets,
                    nextReviewAt: nextReviewDate(mastery.overall),
                    patternRecommendations: errorPatterns.recommendations,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz attempt submission error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Study Runs
    // ==========================================

    app.get('/api/learning/study-runs', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { status = 'active', limit = 10, offset = 0 } = req.query;
            const runs = await db.listStudyRuns(req.user.id, {
                status: String(status),
                limit: Math.min(parseInt(limit, 10) || 10, 50),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ runs });
        } catch (error) {
            req.log.error({ err: error }, 'List study runs error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/study-runs', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.studyRunCreate), async (req, res) => {
        try {
            const topic = String(req.body.topic || '').trim();
            const curriculumTopicId = req.body.curriculumTopicId != null ? Number(req.body.curriculumTopicId) : null;
            const existing = await db.getActiveStudyRun(req.user.id, topic).catch((err) => { logger.warn({ err }, 'getActiveStudyRun failed'); return null; });
            if (existing) {
                const topicKnowledge = existing.outlineId
                    ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [existing.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
                    : await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
                return res.json({ run: existing, outline: buildOutline(topicKnowledge), resumed: true });
            }
            const topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            const outline = buildOutline(topicKnowledge);
            const run = await db.createStudyRun(req.user.id, {
                topic,
                outlineId: outline.id,
                curriculumTopicId: curriculumTopicId && !Number.isNaN(curriculumTopicId) ? curriculumTopicId : null,
                progress: { startedFrom: curriculumTopicId ? 'curriculum' : 'learning', totalNodes: outline.nodes.length, coveredNodes: 0 },
                nodeCoverage: initialCoverage(outline.nodes),
            });
            if (curriculumTopicId && !Number.isNaN(curriculumTopicId)) {
                await db.touchCurriculumTopicProgress(req.user.id, curriculumTopicId, 'in_progress');
            }
            res.status(201).json({ run, outline, resumed: false });
        } catch (error) {
            req.log.error({ err: error }, 'Create study run error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/study-runs/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const run = await db.getStudyRun(req.params.id);
            if (!run) return res.status(404).json({ error: 'Study run not found' });
            if (run.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            const topicKnowledge = run.outlineId
                ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [run.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
                : await db.getTopicKnowledge(run.topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            res.json({ run, outline: buildOutline(topicKnowledge) });
        } catch (error) {
            req.log.error({ err: error }, 'Get study run error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/learning/study-runs/:id', limitBodySize(64 * 1024), requireJson, requireAuthJwt, rateLimit(20, 60), validateBody(schemas.studyRunUpdate), async (req, res) => {
        try {
            const run = await db.getStudyRun(req.params.id);
            if (!run) return res.status(404).json({ error: 'Study run not found' });
            if (run.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            const updated = await db.updateStudyRun(run.id, {
                status: req.body.status,
                progress: req.body.progress,
                nodeCoverage: req.body.nodeCoverage,
                completedAt: req.body.status === 'completed' ? new Date().toISOString() : undefined,
            });
            res.json({ run: updated });
        } catch (error) {
            req.log.error({ err: error }, 'Update study run error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/quiz-history', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 50, offset = 0 } = req.query;
            const attempts = await db.getQuizAttempts({
                userId: req.user.id,
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ attempts });
        } catch (error) {
            req.log.error({ err: error }, 'Get quiz history error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/quiz-history/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const attempts = await db.getQuizAttempts({
                userId: req.user.id,
                topic: req.params.topic,
                limit: 100,
                offset: 0,
            });
            res.json({ attempts, topic: req.params.topic });
        } catch (error) {
            req.log.error({ err: error }, 'Get quiz history by topic error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Competency Record
    // ==========================================

    app.get('/api/learning/competency/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const topic = req.params.topic;

            const [attempts, mastery, topicMemory, topicKnowledge] = await Promise.all([
                db.getQuizAttempts({ userId, topic, limit: 200, offset: 0 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getUserTopicMastery(userId, topic).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                db.getUserTopicMemory(userId, topic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; }),
                db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; }),
            ]);

            // Session grouping: attempts within 2 hours of each other = same session
            const sessions = [];
            const sorted = [...attempts].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            let currentSession = null;
            for (const attempt of sorted) {
                const ts = new Date(attempt.created_at).getTime();
                if (!currentSession || ts - currentSession.lastTs > 2 * 60 * 60 * 1000) {
                    currentSession = { date: attempt.created_at.slice(0, 10), attempts: [], lastTs: ts };
                    sessions.push(currentSession);
                }
                currentSession.attempts.push(attempt);
                currentSession.lastTs = ts;
            }

            const sessionSummaries = sessions.map((s) => ({
                date: s.date,
                total: s.attempts.length,
                correct: s.attempts.filter((a) => a.is_correct).length,
                accuracyPct: Math.round((s.attempts.filter((a) => a.is_correct).length / Math.max(1, s.attempts.length)) * 100),
            }));

            // Papers seen (unique source_article_uid / title)
            const papersSeen = new Map();
            for (const a of attempts) {
                if (a.source_article_uid && !papersSeen.has(a.source_article_uid)) {
                    papersSeen.set(a.source_article_uid, { uid: a.source_article_uid, missCount: 0, hitCount: 0 });
                }
                if (a.source_article_uid) {
                    const p = papersSeen.get(a.source_article_uid);
                    if (a.is_correct) p.hitCount++; else p.missCount++;
                }
            }

            // Weak areas by question type
            const typeMap = {};
            for (const a of attempts) {
                const t = a.question_type || 'recall';
                if (!typeMap[t]) typeMap[t] = { correct: 0, total: 0 };
                typeMap[t].total++;
                if (a.is_correct) typeMap[t].correct++;
            }
            const weakAreas = Object.entries(typeMap)
                .filter(([, v]) => v.total >= 2 && (v.correct / v.total) < 0.6)
                .map(([type, v]) => ({ type, accuracyPct: Math.round((v.correct / v.total) * 100), attempted: v.total }))
                .sort((a, b) => a.accuracyPct - b.accuracyPct);

            // Evidence basis from topic knowledge
            const evidenceBasis = topicKnowledge?.knowledge?.seminalPapers?.slice(0, 5).map((p) => ({
                title: p.title,
                whySeminal: p.whySeminal,
                evidenceStrength: p.evidenceStrength,
            })) || [];

            const totalAttempts = attempts.length;
            const totalCorrect = attempts.filter((a) => a.is_correct).length;
            const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
            const lastQuizDate = sessions.length > 0 ? sessions[sessions.length - 1].date : null;
            const firstQuizDate = sessions.length > 0 ? sessions[0].date : null;

            // Evidence staleness: has topic knowledge been refreshed since the doctor last quizzed?
            const knowledgeUpdatedAt = topicKnowledge?.updated_at || topicKnowledge?.last_refreshed_at || null;
            let evidenceUpdatedSinceLastQuiz = false;
            if (knowledgeUpdatedAt && lastQuizDate) {
                evidenceUpdatedSinceLastQuiz = new Date(knowledgeUpdatedAt) > new Date(lastQuizDate);
            }

            res.json({
                topic,
                overallAccuracy,
                totalAttempts,
                totalCorrect,
                sessionCount: sessions.length,
                firstQuizDate,
                lastQuizDate,
                sessionSummaries: sessionSummaries.slice(-10),
                papersSeen: [...papersSeen.values()],
                weakAreas,
                evidenceBasis,
                mastery: mastery || null,
                topicMemoryTier: topicMemory?.memoryTier || 'none',
                searchCount: topicMemory?.searchCount || 0,
                evidenceUpdatedSinceLastQuiz,
                knowledgeUpdatedAt,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Competency record error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Agent Conversations
    // ==========================================


}

module.exports = { registerQuizRoutes };
