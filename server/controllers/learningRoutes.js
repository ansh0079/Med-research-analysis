// ==========================================
// Learning Agent Routes
// Phase A: User profiles, quiz attempts, agent conversations, topic mastery
// ==========================================

const logger = require('../config/logger');
const { limitBodySize, requireJson, validateBody, schemas } = require('../utils/validation');
const spacedRep = require('../services/spacedRepService');
const { resolveProvider } = require('../utils/aiProvider');

function registerLearningRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    // ==========================================
    // Mastery scoring utilities
    // ==========================================

    function calculateMastery(attempts) {
        const byType = {};
        for (const a of attempts) {
            const type = a.question_type || a.questionType;
            if (!byType[type]) byType[type] = [];
            byType[type].push(a);
        }
        const scores = {};
        for (const [type, typeAttempts] of Object.entries(byType)) {
            const recent = typeAttempts.slice(-10);
            let weightedSum = 0;
            let totalWeight = 0;
            for (let i = 0; i < recent.length; i++) {
                const weight = Math.pow(0.9, recent.length - 1 - i);
                const correct = (recent[i].is_correct === 1 || recent[i].isCorrect === true) ? 1 : 0;
                weightedSum += correct * weight;
                totalWeight += weight;
            }
            scores[type] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
        }
        const values = Object.values(scores);
        const overall = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
        return { overall, byType: scores };
    }

    function nextReviewDate(masteryScore) {
        const now = new Date();
        if (masteryScore >= 90) return new Date(now.getTime() + 14 * 86400000).toISOString();
        if (masteryScore >= 75) return new Date(now.getTime() + 7 * 86400000).toISOString();
        if (masteryScore >= 60) return new Date(now.getTime() + 3 * 86400000).toISOString();
        if (masteryScore >= 40) return new Date(now.getTime() + 1 * 86400000).toISOString();
        return now.toISOString();
    }

    function updateStreak(profile) {
        const today = new Date().toISOString().slice(0, 10);
        const last = profile.lastStudyDate ? profile.lastStudyDate.slice(0, 10) : null;
        if (last === today) return profile; // already studied today
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        let currentStreak = profile.currentStreak || 0;
        let longestStreak = profile.longestStreak || 0;
        if (last === yesterday) {
            currentStreak += 1;
        } else {
            currentStreak = 1;
        }
        if (currentStreak > longestStreak) longestStreak = currentStreak;
        return { ...profile, currentStreak, longestStreak, lastStudyDate: new Date().toISOString() };
    }

    function buildOutline(topicKnowledge) {
        const knowledge = topicKnowledge?.knowledge || {};
        const teachingPoints = Array.isArray(knowledge.teachingPoints)
            ? knowledge.teachingPoints
            : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
        const mcqAngles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
        const sourceArticles = Array.isArray(topicKnowledge?.sourceArticles) ? topicKnowledge.sourceArticles : [];

        const nodes = [];
        teachingPoints.slice(0, 12).forEach((point, index) => {
            const label = typeof point === 'string' ? point : (point.claim || point.point || point.text || `Teaching point ${index + 1}`);
            const sourceIndices = Array.isArray(point?.sourceIndices) ? point.sourceIndices : [];
            nodes.push({
                id: `tp-${index + 1}`,
                kind: 'teaching_point',
                label: String(label).slice(0, 240),
                sourceIndices,
            });
        });
        mcqAngles.slice(0, 8).forEach((angle, index) => {
            nodes.push({
                id: `mcq-${index + 1}`,
                kind: 'mcq_angle',
                label: String(angle).slice(0, 240),
                sourceIndices: [],
            });
        });
        sourceArticles.slice(0, 10).forEach((article, index) => {
            const sourceIndex = Number(article.sourceIndex || index + 1);
            nodes.push({
                id: `src-${sourceIndex}`,
                kind: 'source_article',
                label: String(article.title || `Source ${sourceIndex}`).slice(0, 240),
                sourceIndices: [sourceIndex],
                articleUid: article.uid || null,
            });
        });
        return {
            id: topicKnowledge?.id || null,
            topic: topicKnowledge?.topic || null,
            nodes,
        };
    }

    function initialCoverage(nodes) {
        return Object.fromEntries((nodes || []).map((node) => [
            node.id,
            { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
        ]));
    }

    function updateCoverage(run, attempts = []) {
        const coverage = { ...(run?.nodeCoverage || {}) };
        const now = new Date().toISOString();
        for (const attempt of attempts) {
            const nodeId = attempt.outlineNodeId;
            if (!nodeId) continue;
            const current = coverage[nodeId] || { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null };
            coverage[nodeId] = {
                ...current,
                seen: true,
                quizAttempts: Number(current.quizAttempts || 0) + 1,
                correct: Number(current.correct || 0) + (attempt.isCorrect ? 1 : 0),
                lastAttemptAt: now,
            };
        }
        return coverage;
    }

    function summarizeRunGaps(run, outline) {
        const nodes = outline?.nodes || [];
        const coverage = run?.nodeCoverage || {};
        const withCoverage = nodes.map((node) => {
            const cov = coverage[node.id] || { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null };
            const quizAttempts = Number(cov.quizAttempts || 0);
            const correct = Number(cov.correct || 0);
            const accuracy = quizAttempts > 0 ? Math.round((correct / quizAttempts) * 100) : null;
            return {
                id: node.id,
                kind: node.kind,
                label: node.label,
                sourceIndices: node.sourceIndices || [],
                articleUid: node.articleUid || null,
                seen: Boolean(cov.seen),
                quizAttempts,
                correct,
                accuracy,
                lastAttemptAt: cov.lastAttemptAt || null,
            };
        });
        const uncovered = withCoverage.filter((node) => !node.seen);
        const weak = withCoverage.filter((node) => node.seen && typeof node.accuracy === 'number' && node.accuracy < 70);
        return {
            totalNodes: nodes.length,
            coveredNodes: withCoverage.filter((node) => node.seen).length,
            uncoveredNodes: uncovered.slice(0, 6),
            weakNodes: weak.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 6),
        };
    }

    function textIncludes(text, needles) {
        const haystack = String(text || '').toLowerCase();
        return needles.some((needle) => haystack.includes(needle));
    }

    function inferEvidenceJudgement(attempt) {
        const questionType = String(attempt.questionType || '').toLowerCase();
        const combined = [
            attempt.questionText,
            attempt.userAnswer,
            attempt.correctAnswer,
            attempt.explanation,
            attempt.outlineLabel,
        ].filter(Boolean).join(' ');
        const tags = new Set();

        if (attempt.isCorrect && Number(attempt.confidence || 0) > 0 && Number(attempt.confidence || 0) <= 2) {
            tags.add('low_confidence_correct');
        }
        if (!attempt.isCorrect) {
            if (questionType === 'guideline' || textIncludes(combined, ['guideline', 'recommendation', 'nice', 'esc', 'aha', 'ats', 'idsa'])) {
                tags.add('guideline_alignment_missed');
            }
            if (questionType === 'trial_interpretation' || textIncludes(combined, ['random', 'bias', 'blinding', 'allocation', 'confounding', 'intention-to-treat', 'noninferiority'])) {
                tags.add('trial_design_weakness');
            }
            if (textIncludes(combined, ['subgroup', 'excluded', 'applicability', 'external validity', 'population', 'selected patients'])) {
                tags.add('misses_applicability');
            }
            if (textIncludes(combined, ['surrogate', 'composite', 'primary outcome', 'secondary outcome', 'mortality', 'patient-important'])) {
                tags.add('misses_outcome_hierarchy');
            }
            if (textIncludes(combined, ['overclaim', 'not powered', 'underpowered', 'neutral result', 'confidence interval', 'absolute risk', 'relative risk'])) {
                tags.add('overclaims_evidence');
            }
            if (tags.size === 0) tags.add('concept_gap');
        }

        const reasoningTags = [...tags].slice(0, 8);
        return {
            reasoningTags,
            reasoningNote: reasoningTags.length
                ? `Auto-classified evidence judgement signal: ${reasoningTags.join(', ')}`
                : null,
        };
    }

    // ==========================================
    // Learning Profile
    // ==========================================

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

    app.get('/api/learning/topic-memory', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
            const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
            const memories = await db.listUserTopicMemory(req.user.id, { limit, offset });
            res.json({ memories });
        } catch (error) {
            req.log.error({ err: error }, 'List topic memory error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/topic-proposals/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const result = await db.listTopicKnowledgeProposalsForUser(req.user.id, { topic, status: 'pending_review', limit: 5 });
            res.json({ proposals: result.proposals, total: result.total });
        } catch (error) {
            req.log.error({ err: error }, 'List topic proposals error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Quiz Attempts
    // ==========================================

    app.post('/api/learning/quiz-attempt', limitBodySize(256 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.quizAttempt), async (req, res) => {
        try {
            const { topic, attempts, studyRunId, curriculumTopicId } = req.body;
            const userId = req.user.id;
            let run = null;
            if (studyRunId) {
                run = await db.getStudyRun(studyRunId);
                if (!run || run.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
            }

            // Insert all attempts and update SM-2 spaced rep cards
            const normalizedTopic = db.normalizeTopic(topic);
            const attemptsWithJudgement = attempts.map((attempt) => ({
                ...attempt,
                ...inferEvidenceJudgement(attempt),
            }));
            for (const attempt of attemptsWithJudgement) {
                await db.createQuizAttempt({ ...attempt, userId, topic, studyRunId: run?.id || null });
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

            const ctId = curriculumTopicId != null ? Number(curriculumTopicId) : null;
            if (ctId && !Number.isNaN(ctId)) {
                const batchCorrect = attempts.filter((a) => a.isCorrect).length;
                await db.mergeCurriculumTopicAttemptBatch(userId, ctId, batchCorrect, attempts.length);
            }

            res.json({
                saved: attempts.length,
                mastery,
                remediation: {
                    missedCount: missedAttempts.length,
                    targets: remediationTargets,
                    nextReviewAt: nextReviewDate(mastery.overall),
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

    app.post('/api/learning/agent/conversations', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.agentConversation), async (req, res) => {
        try {
            const { topic, title } = req.body;
            const conversation = await db.createAgentConversation(req.user.id, topic, title);
            res.status(201).json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Create agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 20, offset = 0 } = req.query;
            const conversations = await db.listAgentConversations(req.user.id, {
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 20, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ conversations });
        } catch (error) {
            req.log.error({ err: error }, 'List agent conversations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            res.json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Get agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/learning/agent/conversations/:id', limitBodySize(256 * 1024), requireJson, requireAuthJwt, rateLimit(20, 60), validateBody(schemas.agentMessageAppend), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            const updated = await db.appendAgentMessages(req.params.id, req.body.messages);
            res.json({ conversation: updated });
        } catch (error) {
            req.log.error({ err: error }, 'Append agent messages error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.delete('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            await db.deleteAgentConversation(req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Case Attempts
    // ==========================================

    app.post('/api/learning/case-attempt', limitBodySize(512 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const attempt = await db.createCaseAttempt({ ...req.body, userId: req.user.id });
            res.status(201).json({ attempt });
        } catch (error) {
            req.log.error({ err: error }, 'Create case attempt error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/case-history', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 50, offset = 0 } = req.query;
            const attempts = await db.getCaseAttempts({
                userId: req.user.id,
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ attempts });
        } catch (error) {
            req.log.error({ err: error }, 'Get case history error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Topic Mastery
    // ==========================================

    app.get('/api/learning/mastery', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const mastery = await db.listUserTopicMastery(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'List topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic/cohort', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const cohort = await db.getMasteryCohortBenchmark(req.user.id, req.params.topic);
            if (!cohort) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ cohort });
        } catch (error) {
            req.log.error({ err: error }, 'Mastery cohort benchmark error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const mastery = await db.getUserTopicMastery(req.user.id, req.params.topic);
            if (!mastery) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'Get topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Dashboard
    // ==========================================

    // ==========================================
    // Personalised Insights
    // ==========================================

    app.get('/api/learning/insights', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [profile, masteryList, allAttempts] = await Promise.all([
                db.getLearningProfile(userId),
                db.listUserTopicMastery(userId, { limit: 100, offset: 0 }),
                db.getQuizAttempts({ userId, limit: 100, offset: 0 }),
            ]);
            const activeRuns = await db.listStudyRuns(userId, { status: 'active', limit: 10, offset: 0 }).catch((err) => { logger.warn({ err }, 'listStudyRuns failed'); return []; });

            const insights = [];

            const TYPE_LABELS = {
                recall: 'Recall', clinical_application: 'Clinical Application',
                trial_interpretation: 'Trial Interpretation', guideline: 'Guideline', pitfall: 'Pitfall/Misconception',
            };

            // Weak question types — consistent misses across >= 5 attempts
            const byType = {};
            for (const a of allAttempts) {
                const t = a.questionType || 'recall';
                if (!byType[t]) byType[t] = { correct: 0, total: 0, wrongTopics: [] };
                byType[t].total++;
                if (a.isCorrect) byType[t].correct++;
                else byType[t].wrongTopics.push(a.topic);
            }
            for (const [type, stats] of Object.entries(byType)) {
                if (stats.total < 5) continue;
                const accuracy = Math.round((stats.correct / stats.total) * 100);
                if (accuracy < 55) {
                    const topMissed = [...new Set(stats.wrongTopics)].slice(0, 3).join(', ');
                    insights.push({
                        type: 'weak_type',
                        severity: accuracy < 35 ? 'high' : 'medium',
                        icon: 'fa-exclamation-circle',
                        color: accuracy < 35 ? 'red' : 'amber',
                        message: `You're scoring ${accuracy}% on ${TYPE_LABELS[type] || type} questions across ${stats.total} attempts.`,
                        detail: topMissed ? `Most missed topics: ${topMissed}.` : '',
                        action: 'Drill this type',
                        questionType: type,
                        topic: stats.wrongTopics[0] || null,
                    });
                }
            }

            // Topics overdue for review
            const overdue = masteryList
                .filter((m) => m.nextReviewAt && new Date(m.nextReviewAt) <= new Date())
                .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
                .slice(0, 3);
            for (const m of overdue) {
                const ms = Date.now() - new Date(m.nextReviewAt).getTime();
                const daysOverdue = Math.max(0, Math.round(ms / 86400000));
                insights.push({
                    type: 'review_due',
                    severity: daysOverdue > 3 ? 'high' : 'medium',
                    icon: 'fa-clock',
                    color: 'amber',
                    message: `"${m.topic}" is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue` : 'due today'} for review.`,
                    detail: `Mastery: ${m.overallScore}% — ${m.attemptsCount} questions answered.`,
                    action: 'Review now',
                    topic: m.topic,
                });
            }

            for (const run of activeRuns.slice(0, 3)) {
                const coverage = run.nodeCoverage || {};
                const topicKnowledge = run.outlineId
                    ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [run.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
                    : await db.getTopicKnowledge(run.topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
                const outline = buildOutline(topicKnowledge);
                const gapReport = summarizeRunGaps(run, outline);
                const totalNodes = gapReport.totalNodes || Object.keys(coverage).length || Number(run.progress?.totalNodes || 0);
                const coveredNodes = gapReport.coveredNodes || Number(run.progress?.coveredNodes || 0);
                if (totalNodes > 0 && coveredNodes < totalNodes) {
                    const nextGap = gapReport.weakNodes[0] || gapReport.uncoveredNodes[0] || null;
                    insights.push({
                        type: 'coverage_gap',
                        severity: gapReport.weakNodes.length > 0 ? 'medium' : (coveredNodes === 0 ? 'medium' : 'low'),
                        icon: 'fa-map-signs',
                        color: 'indigo',
                        message: `"${run.topic}" has ${totalNodes - coveredNodes} outline node${totalNodes - coveredNodes === 1 ? '' : 's'} left to cover.`,
                        detail: nextGap ? `Next gap: ${nextGap.label}` : `Covered ${coveredNodes}/${totalNodes} nodes in this study run.`,
                        action: 'Resume run',
                        topic: run.topic,
                        studyRunId: run.id,
                        gapReport,
                    });
                }
            }

            // Improvement: topic with biggest recent gain
            const improving = masteryList
                .filter((m) => m.overallScore >= 70 && m.attemptsCount >= 5)
                .sort((a, b) => b.overallScore - a.overallScore)
                .slice(0, 1);
            if (improving.length > 0) {
                const m = improving[0];
                insights.push({
                    type: 'strength',
                    severity: 'low',
                    icon: 'fa-star',
                    color: 'emerald',
                    message: `Strong performance on "${m.topic}" — ${m.overallScore}% mastery.`,
                    detail: `${m.correctCount}/${m.attemptsCount} correct across all question types.`,
                    action: null,
                    topic: m.topic,
                });
            }

            // Streak milestone
            if (profile?.currentStreak >= 3) {
                insights.push({
                    type: 'milestone',
                    severity: 'low',
                    icon: 'fa-fire',
                    color: 'orange',
                    message: `${profile.currentStreak}-day study streak!`,
                    detail: profile.currentStreak >= 7 ? 'Outstanding consistency.' : 'Keep it going — 7 days is the first milestone.',
                    action: null,
                    topic: null,
                });
            }

            // Onboarding — no data yet
            if (allAttempts.length === 0) {
                insights.push({
                    type: 'onboarding',
                    severity: 'low',
                    icon: 'fa-graduation-cap',
                    color: 'indigo',
                    message: 'No quiz data yet.',
                    detail: 'Take your first quiz to start receiving personalised insights.',
                    action: 'Take a quiz',
                    topic: null,
                });
            }

            res.json({ insights, profile });
        } catch (error) {
            req.log.error({ err: error }, 'Learning insights error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Dashboard
    // ==========================================

    app.get('/api/learning/dashboard', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [profile, masteryList, recentAttempts, recentConversations, recentCases, activeRuns, dueCardCount] = await Promise.all([
                db.getLearningProfile(userId),
                db.listUserTopicMastery(userId, { limit: 100, offset: 0 }),
                db.getQuizAttempts({ userId, limit: 5, offset: 0 }),
                db.listAgentConversations(userId, { limit: 5, offset: 0 }),
                db.getCaseAttempts({ userId, limit: 5, offset: 0 }),
                db.listStudyRuns(userId, { status: 'active', limit: 5, offset: 0 }),
                spacedRep.countDueCards(db, userId).catch((err) => { logger.warn({ err }, 'countDueCards failed'); return 0; }),
            ]);

            const weakTopics = masteryList
                .filter((m) => m.overallScore < 60)
                .sort((a, b) => a.overallScore - b.overallScore)
                .slice(0, 5);

            const reviewQueue = masteryList
                .filter((m) => m.nextReviewAt && new Date(m.nextReviewAt) <= new Date())
                .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
                .slice(0, 10);

            const totalQuizAttempts = masteryList.reduce((s, m) => s + (m.attemptsCount || 0), 0);
            const totalCorrect = masteryList.reduce((s, m) => s + (m.correctCount || 0), 0);
            const totalCases = await db.get(`SELECT COUNT(*) AS count FROM case_attempts WHERE user_id = ?`, [userId]);

            const cl = await db.listCurricula().catch((err) => { logger.warn({ err }, 'listCurricula failed'); return []; });
            const curriculaOverview = await Promise.all(cl.map(async (c) => ({
                ...c,
                examSummary: await db.getCurriculumExamSummaryForUser(userId, c.id),
            })));

            res.json({
                profile,
                stats: {
                    currentStreak: profile?.currentStreak || 0,
                    longestStreak: profile?.longestStreak || 0,
                    totalQuizzes: totalQuizAttempts,
                    totalCases: totalCases?.count || 0,
                    overallAccuracy: totalQuizAttempts > 0 ? Math.round((totalCorrect / totalQuizAttempts) * 100) : 0,
                    topicsStudied: masteryList.length,
                },
                weakTopics,
                reviewQueue,
                dueCardCount,
                curriculaOverview,
                recentActivity: {
                    quizzes: recentAttempts,
                    conversations: recentConversations,
                    cases: recentCases,
                },
                mastery: masteryList,
                activeRuns,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Learning dashboard error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // CPD / CME Session Logging
    // ==========================================

    app.post('/api/learning/cpd', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { activityType, topic = '', durationMinutes = 0, questionCount = 0, accuracyPct = null, notes = '', source = 'auto' } = req.body;
            const VALID_TYPES = ['quiz', 'synthesis', 'case', 'search', 'study_run', 'manual'];
            if (!VALID_TYPES.includes(activityType)) {
                return res.status(400).json({ error: `activityType must be one of: ${VALID_TYPES.join(', ')}` });
            }
            const result = await db.createCpdSession(req.user.id, { activityType, topic, durationMinutes, questionCount, accuracyPct, notes, source });
            res.status(201).json({ id: result.id });
        } catch (error) {
            req.log.error({ err: error }, 'Create CPD session error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 100, offset = 0, startDate = '', endDate = '', activityType = '' } = req.query;
            const sessions = await db.listCpdSessions(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 100, 200),
                offset: parseInt(offset, 10) || 0,
                startDate: String(startDate),
                endDate: String(endDate),
                activityType: String(activityType),
            });
            res.json({ sessions });
        } catch (error) {
            req.log.error({ err: error }, 'List CPD sessions error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd/summary', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.json({ summary });
        } catch (error) {
            req.log.error({ err: error }, 'CPD summary error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    const CPD_PDF_LABELS = {
        quiz: 'Quiz',
        synthesis: 'Evidence review',
        case: 'Case',
        search: 'Search',
        study_run: 'Topic run',
        manual: 'Manual',
    };

    app.get('/api/learning/cpd/export-pdf', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const PDFDocument = require('pdfkit');
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            const sessionsRaw = await db.listCpdSessions(req.user.id, {
                startDate,
                endDate,
                limit: 500,
                offset: 0,
            });
            const sessions = [...sessionsRaw].reverse();
            if (!sessions.length) {
                return res.status(400).json({ error: 'No CPD sessions in this year to export' });
            }
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="cpd-record-${year}.pdf"`);

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            doc.pipe(res);

            doc.fontSize(18).text(`CPD / CME activity record — ${year}`, { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('#444').text(
                `Total recorded time: ${(summary?.totalHours ?? 0).toFixed(1)} hours · ${sessions.length} activities`,
            );
            doc.moveDown();
            doc.fillColor('#000');

            const tableTop = doc.y;
            const colX = [50, 105, 215, 300, 360, 420];
            doc.fontSize(9).font('Helvetica-Bold');
            ['Date', 'Type', 'Topic', 'Mins', 'Q#', 'Acc'].forEach((h, i) => {
                doc.text(h, colX[i], tableTop, { width: i === 2 ? 200 : 50, continued: false });
            });
            doc.font('Helvetica');
            let rowY = tableTop + 16;
            const maxY = 780;
            for (const s of sessions) {
                if (rowY > maxY) {
                    doc.addPage();
                    rowY = 50;
                }
                const typeLabel = CPD_PDF_LABELS[s.activityType] || s.activityType;
                const dateStr = s.createdAt ? String(s.createdAt).slice(0, 10) : '—';
                doc.fontSize(8).text(dateStr, colX[0], rowY, { width: 52 });
                doc.text(typeLabel, colX[1], rowY, { width: 105 });
                doc.text(String(s.topic || '—').slice(0, 48), colX[2], rowY, { width: 200 });
                doc.text(String(s.durationMinutes ?? '—'), colX[3], rowY, { width: 48 });
                doc.text(s.questionCount != null ? String(s.questionCount) : '—', colX[4], rowY, { width: 40 });
                doc.text(s.accuracyPct != null ? `${s.accuracyPct}%` : '—', colX[5], rowY, { width: 40 });
                rowY += 14;
            }

            doc.moveDown(2);
            doc.fontSize(8).fillColor('#666').text(
                `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · MedResearch · For your professional portfolio or regulatory return; verify against your local college requirements.`,
                { align: 'left' },
            );
            doc.end();
        } catch (error) {
            req.log.error({ err: error }, 'CPD PDF export error');
            if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Portfolio / WBA Reflection Drafts
    // ==========================================

    app.post('/api/learning/reflections', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const {
                reflectionType = 'CBD',
                sourceType = 'manual',
                topic = '',
                whatHappened = '',
                whatILearned = '',
                whatIWillChange = '',
                evidenceUsed = '',
                supervisorDiscussion = '',
                status = 'draft',
                linkedCpdSessionId = null,
            } = req.body || {};
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            if (!String(topic).trim()) return res.status(400).json({ error: 'topic is required' });
            const reflection = await db.createPortfolioReflection(req.user.id, {
                reflectionType,
                sourceType,
                topic,
                whatHappened,
                whatILearned,
                whatIWillChange,
                evidenceUsed,
                supervisorDiscussion,
                status,
                linkedCpdSessionId,
            });
            res.status(201).json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Create portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/reflections', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const reflections = await db.listPortfolioReflections(req.user.id, {
                limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
                offset: parseInt(req.query.offset, 10) || 0,
                topic: String(req.query.topic || ''),
                status: String(req.query.status || ''),
            });
            res.json({ reflections });
        } catch (error) {
            req.log.error({ err: error }, 'List portfolio reflections error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.put('/api/learning/reflections/:id', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: 'Invalid reflection id' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (req.body?.reflectionType && !validTypes.includes(req.body.reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            const validStatuses = ['draft', 'discussed', 'exported', 'submitted'];
            if (req.body?.status && !validStatuses.includes(req.body.status)) {
                return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
            }
            const reflection = await db.updatePortfolioReflection(req.user.id, id, req.body || {});
            if (!reflection) return res.status(404).json({ error: 'Reflection not found' });
            res.json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Update portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/reflections/draft', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const { reflectionType = 'CBD', topic = '' } = req.body || {};
            const cleanTopic = String(topic).trim();
            if (!cleanTopic) return res.status(400).json({ error: 'topic is required' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }

            // Gather context: recent quiz attempts + topic knowledge seminal papers
            const [attempts, topicKnowledge] = await Promise.all([
                db.getQuizAttempts({ userId: req.user.id, topic: cleanTopic, limit: 10 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; }),
            ]);

            const attemptsText = (attempts || []).slice(0, 8).map((a, i) =>
                `${i + 1}. Q: ${String(a.question || '').slice(0, 200)} | Correct: ${a.isCorrect ? 'Yes' : 'No'} | Type: ${a.questionType || 'unknown'}${a.explanation ? ` | Explanation: ${String(a.explanation).slice(0, 200)}` : ''}`
            ).join('\n') || 'No quiz attempts recorded for this topic.';

            const seminalText = topicKnowledge?.knowledge?.seminalPapers?.slice(0, 3).map((p) =>
                `- ${p.title}${p.clinicalPrinciple ? `: ${p.clinicalPrinciple}` : ''}`
            ).join('\n') || '';

            const typeGuidance = {
                'CBD': 'Case-Based Discussion (CBD): reflects on a specific patient case, clinical decision-making, and evidence used.',
                'mini-CEX': 'Mini-Clinical Evaluation Exercise (mini-CEX): reflects on a brief clinical encounter, communication, and examination skills.',
                'DOPS': 'Direct Observation of Procedural Skills (DOPS): reflects on a procedural skill, technique, and patient safety considerations.',
            }[reflectionType];

            const prompt = `You are helping a medical trainee draft a ${reflectionType} portfolio reflection for topic: "${cleanTopic}".
${typeGuidance}

Recent quiz performance on this topic:
${attemptsText}
${seminalText ? `\nKey evidence for this topic:\n${seminalText}` : ''}

Write a professional, first-person portfolio reflection. Each field should be 2-4 concise sentences. Be specific and evidence-linked where possible.

Return ONLY valid JSON:
{
  "whatHappened": "What happened or was encountered — describe a realistic clinical encounter or learning event related to ${cleanTopic}",
  "whatILearned": "What was learned from this event — connect to quiz performance and key evidence above",
  "whatIWillChange": "What will change in future practice — specific, actionable, grounded in evidence",
  "evidenceUsed": "Key papers or guidelines referenced — derive from the evidence list above where possible"
}`;

            const { createAiService, PINNED_MODELS } = require('../services/aiService');
            const { serverConfig } = deps;
            const ai = createAiService({ serverConfig });
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider: 'auto' }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            const rawText = selectedProvider === 'gemini'
                ? await ai.callGemini(prompt, selectedModel, { temperature: 0.5 })
                : await ai.callMistralAI(prompt, selectedModel, { temperature: 0.5 });
            let draft;
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                draft = JSON.parse(match ? match[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned an invalid response — try again' });
            }
            res.json({ draft, reflectionType, topic: cleanTopic });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Reflection draft error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Quiz explanation feedback
    // ==========================================

    app.post('/api/learning/quiz-feedback', requireJson, requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const { topic, outlineNodeId, feedbackType } = req.body || {};
            if (!topic || !outlineNodeId || !['confusing', 'clear'].includes(feedbackType)) {
                return res.status(400).json({ error: 'topic, outlineNodeId, and feedbackType (confusing|clear) required' });
            }
            // Patch confusingNodes in topic_knowledge.knowledge so the next quiz AI
            // prompt can warn the model which nodes learners found hard to understand.
            {
                const cleanTopic = String(topic).trim();
                const tkRow = await db.get(
                    `SELECT id, knowledge FROM topic_knowledge WHERE normalized_topic = LOWER(TRIM(?)) OR topic = ? LIMIT 1`,
                    [cleanTopic, cleanTopic]
                );
                if (tkRow) {
                    const knowledge = JSON.parse(String(tkRow.knowledge || '{}'));
                    const nodes = knowledge.confusingNodes || {};
                    const nodeId = String(outlineNodeId).trim();
                    nodes[nodeId] = nodes[nodeId] || { confusingCount: 0, clearCount: 0 };
                    if (feedbackType === 'confusing') nodes[nodeId].confusingCount += 1;
                    else nodes[nodeId].clearCount += 1;
                    knowledge.confusingNodes = nodes;
                    await db.run('UPDATE topic_knowledge SET knowledge = ? WHERE id = ?', [JSON.stringify(knowledge), tkRow.id]);
                }
            }
            res.status(204).send();
        } catch (error) {
            req.log.error({ err: error }, 'Quiz feedback error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Spaced Repetition — Due Reviews
    // ==========================================

    app.get('/api/learning/due-reviews', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 200);
            const cards = await spacedRep.getDueCards(db, userId, limit);

            // Group by topic so the UI can show "5 reviews in Sepsis, 3 in AKI"
            const byTopic = {};
            for (const card of cards) {
                if (!byTopic[card.normalizedTopic]) {
                    byTopic[card.normalizedTopic] = { topic: card.topic, normalizedTopic: card.normalizedTopic, cards: [] };
                }
                byTopic[card.normalizedTopic].cards.push(card);
            }

            const groups = Object.values(byTopic).sort((a, b) => b.cards.length - a.cards.length);
            res.json({ total: cards.length, groups });
        } catch (error) {
            req.log.error({ err: error }, 'Due reviews error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/due-reviews/count', requireAuthJwt, rateLimit(120, 60), async (req, res) => {
        try {
            const count = await spacedRep.countDueCards(db, req.user.id);
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/spaced-rep/topics', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topics = await spacedRep.listAllCardsGroupedByTopic(db, req.user.id);
            res.json({ topics });
        } catch (error) {
            req.log.error({ err: error }, 'Spaced rep topics error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerLearningRoutes };
