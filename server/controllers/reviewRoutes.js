const logger = require('../config/logger');
const { createAiService, PINNED_MODELS } = require('../services/aiService');
const {
    buildPicoExtractionPrompt,
    buildScreeningAssistPrompt,
    buildCaseEvidencePrompt,
    buildCaseSearchQueryPrompt,
    buildTeachingVignettePrompt,
} = require('../prompts');
const { createReviewService } = require('../services/reviewService');
const { gatherEvidenceArticlesForCase, heuristicSearchQuery } = require('../services/caseEvidenceService');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerReviewRoutes(app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requirePaidFeature,
        validateBody,
        schemas,
        auditLog,
        fetch: fetchImpl,
    } = deps;

    const ai = createAiService({ serverConfig, fetchImpl });
    const reviews = createReviewService({ db });

    async function assertTeamMember(teamId, userId) {
        const role = await db.getTeamRoleForUser(String(teamId), userId);
        if (!role) {
            const error = new Error('Access denied: you are not a member of this team');
            error.status = 403;
            throw error;
        }
        return role;
    }

    async function resolveOwner(req) {
        if (req.body.ownerType === 'team' || req.body.teamId) {
            if (!req.body.teamId) {
                const error = new Error('teamId is required for team-owned reviews');
                error.status = 400;
                throw error;
            }
            await assertTeamMember(req.body.teamId, req.user.id);
            return { ownerType: 'team', ownerId: String(req.body.teamId) };
        }

        return {
            ownerType: 'user',
            ownerId: String(req.user.id),
        };
    }

    async function requireReviewAccess(req, res, next) {
        try {
            const review = await reviews.getProject(req.params.id);
            if (!review) return res.status(404).json({ error: 'Review not found' });

            const ownerType = review.owner_type || 'session';
            const ownerId = review.owner_id;

            if (ownerType === 'user') {
                if (!req.user || req.user.id !== ownerId) {
                    return res.status(403).json({ error: 'Access denied: you do not own this review' });
                }
            } else if (ownerType === 'session') {
                if (req.sessionId !== ownerId) {
                    return res.status(403).json({ error: 'Access denied: invalid session' });
                }
            } else if (ownerType === 'team') {
                if (!req.user?.id) {
                    return res.status(401).json({ error: 'Authentication required for team review access' });
                }
                const role = await db.getTeamRoleForUser(ownerId, req.user.id);
                if (!role) {
                    return res.status(403).json({ error: 'Access denied: you are not a member of this team' });
                }
            }

            req.review = review;
            next();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    const { resolveProvider: resolveProviderUtil } = require('../utils/aiProvider');

    async function callProvider(prompt, provider = 'auto') {
        const { provider: selectedProvider, model } = resolveProviderUtil({ provider }, serverConfig);
        if (!selectedProvider) {
            throw new Error('No AI provider configured for review assistant');
        }
        if (selectedProvider === 'gemini') {
            const text = await ai.callGemini(prompt, model);
            return { text, provider: 'gemini', model };
        }
        const text = await ai.callMistralAI(prompt, model);
        return { text, provider: 'mistral', model };
    }

    function normalizeLearningMode(mode) {
        return ['student', 'resident', 'specialist', 'exam'].includes(mode) ? mode : 'student';
    }

    function firstArticleTitle(articles) {
        return articles?.[0]?.title || 'the top evidence paper';
    }

    function fallbackLearningCase({ parsed, caseText, topic, learningMode, articles }) {
        const focus = topic || parsed.caseSummary || caseText.split(/[.\n]/)[0] || 'this clinical topic';
        const topArticles = (articles || []).slice(0, 5);
        const firstTitle = firstArticleTitle(topArticles);
        const difficulty = learningMode === 'student' ? 'easy' : learningMode === 'specialist' ? 'hard' : 'medium';

        const caseMCQs = Array.isArray(parsed.caseMCQs) && parsed.caseMCQs.length
            ? parsed.caseMCQs.slice(0, 5)
            : [
                {
                    id: 'case-1',
                    type: 'multiple_choice',
                    question: `Which feature should most strongly guide the next evidence review step for ${focus}?`,
                    options: ['Patient phenotype and severity', 'Journal title alone', 'Publication date alone', 'Author institution'],
                    correctAnswer: 'Patient phenotype and severity',
                    explanation: 'Evidence applies best when the population, severity, setting, and outcomes match the case, not when judged by metadata alone.',
                    difficulty,
                    sourceReference: 'Evidence 1',
                },
                {
                    id: 'case-2',
                    type: 'multiple_choice',
                    question: `What is the main limitation when applying ${firstTitle} to this case?`,
                    options: ['Population and setting may differ', 'The title is too long', 'It has a citation number', 'It appears in the evidence list'],
                    correctAnswer: 'Population and setting may differ',
                    explanation: 'Applicability depends on whether the study population, intervention, comparator, and outcomes match the clinical scenario.',
                    difficulty,
                    sourceReference: 'Evidence 1',
                },
                {
                    id: 'case-3',
                    type: 'multiple_choice',
                    question: 'Which statement best describes the role of this generated case?',
                    options: ['Learning and evidence appraisal support', 'A final diagnosis', 'A treatment order', 'A replacement for guidelines'],
                    correctAnswer: 'Learning and evidence appraisal support',
                    explanation: 'The case mode supports learning and literature interpretation only; clinical decisions require qualified review and local guidance.',
                    difficulty,
                    sourceReference: 'Safety note',
                },
            ];

        const paperApplications = Array.isArray(parsed.paperApplications) && parsed.paperApplications.length
            ? parsed.paperApplications.slice(0, 5)
            : topArticles.map((article, index) => ({
                studyIndex: index + 1,
                title: article.title || `Evidence ${index + 1}`,
                howItApplies: `Use this paper to compare its population, intervention, outcomes, and limitations against the ${focus} case before drawing conclusions.`,
            }));

        return {
            mode: learningMode,
            vignette: String(parsed.vignette || `A fictional learner-facing case is framed around ${focus}, using the retrieved literature as the evidence base.`),
            patientPresentation: String(parsed.patientPresentation || 'Review the salient presentation, risk factors, investigations, and severity markers before applying evidence.'),
            keyDecisionPoint: String(parsed.keyDecisionPoint || 'Identify the highest-value diagnostic or management decision and match it to the strongest available evidence.'),
            differentialReasoning: String(parsed.differentialReasoning || 'Compare likely diagnoses or management paths by looking for supporting clues, refuting clues, urgency, and evidence certainty.'),
            evidenceExplanation: String(parsed.evidenceExplanation || 'The top papers should be interpreted by matching PICO elements to the case and noting uncertainty where populations or outcomes differ.'),
            caseMCQs,
            paperApplications,
        };
    }

    function fallbackTeachingVignette({ topic, learningMode, seedArticles, guidelines, topicKnowledgeRow }) {
        const knowledge = topicKnowledgeRow?.knowledge || {};
        const teachingPoints = Array.isArray(knowledge.teachingPoints)
            ? knowledge.teachingPoints
            : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
        const hooks = Array.isArray(knowledge.caseGenerationHooks) ? knowledge.caseGenerationHooks : [];
        const focus = topic || 'this clinical topic';
        const firstHook = hooks.find((h) => String(h || '').trim().length > 10);
        const firstGuideline = guidelines?.[0];
        const topSeeds = (seedArticles || []).slice(0, 5);
        const firstSeed = topSeeds[0]?.title || 'the top evidence paper';
        const difficulty = learningMode === 'student' ? 'easy' : learningMode === 'specialist' ? 'hard' : 'medium';
        const sourceRef = (idx) => {
            const seed = topSeeds[Math.max(0, idx - 1)];
            return seed ? `Seed ${idx}: ${seed.source || seed.journal || 'Evidence'} ${seed.pubdate || seed.year || ''}`.trim() : undefined;
        };
        return {
            presentingComplaint: `Fictional ${focus} case requiring evidence-grounded respiratory support decisions.`,
            history: firstHook || `A patient develops a clinical scenario consistent with ${focus}; the learner must match severity, physiology, and evidence before choosing management.`,
            examination: 'The learner should identify severity markers, respiratory distress, oxygenation status, hemodynamic stability, and contraindications to proposed interventions.',
            investigations: 'Use imaging, oxygenation indices, ventilator settings, and relevant laboratory data to establish syndrome severity and guide escalation.',
            differential: [
                {
                    diagnosis: focus,
                    supporting: 'Presentation is framed around the searched topic and the supplied evidence set.',
                    against: 'Alternative causes must be considered when the supplied evidence does not fully explain the case.',
                    rank: 1,
                },
                {
                    diagnosis: 'Alternative respiratory or systemic cause',
                    supporting: 'Critical illness often has overlapping causes and confounders.',
                    against: 'Management should not be based on topic label alone.',
                    rank: 2,
                },
            ],
            managementReasoning: firstGuideline
                ? `Start by matching the patient population and severity to the supplied evidence. Use ${firstSeed} [1] alongside ${firstGuideline.sourceBody || 'guideline'} guidance [G1], then flag uncertainty rather than inventing unsupported interventions.`
                : `Start by matching the patient population and severity to ${firstSeed} [1]. Use the evidence set to support learning, and flag uncertainty rather than inventing unsupported interventions.`,
            teachingPoints: teachingPoints.slice(0, 5).map((point, idx) => ({
                point: String(point.claim || point || `Apply evidence source ${idx + 1} to the case context.`),
                seedIndices: Array.isArray(point.sourceIndices) && point.sourceIndices.length ? point.sourceIndices.slice(0, 3) : [Math.min(idx + 1, Math.max(1, topSeeds.length))],
            })),
            evidenceLinks: topSeeds.map((seed, idx) => ({
                seedIndex: idx + 1,
                howItApplies: `Use ${seed.title || `seed ${idx + 1}`} to compare the case population, intervention, setting, and limitations before drawing a management conclusion.`,
            })),
            uncertaintyFlags: ['This fallback case is generated from stored topic knowledge because AI JSON parsing failed; verify all claims against primary sources and guidelines.'],
            caseMCQs: [
                {
                    questionType: 'clinical_application',
                    question: `In this ${focus} vignette, what is the best first reasoning step before applying a management recommendation?`,
                    options: ['A: Match severity and population to the cited evidence', 'B: Follow the topic label alone', 'C: Ignore guideline cautions', 'D: Apply uncited interventions'],
                    correctAnswer: 'A',
                    explanation: 'Evidence applies only when population, severity, intervention, and outcome match the case context.',
                    whyOthersWrong: 'B, C, and D bypass evidence matching and source verification.',
                    difficulty,
                    sourceReference: sourceRef(1),
                },
                {
                    questionType: 'guideline',
                    question: 'Which approach best reflects guideline-aware case reasoning?',
                    options: ['A: Use guideline population and cautions explicitly', 'B: Treat all recommendations as universal', 'C: Ignore uncertainty flags', 'D: Prefer uncited claims'],
                    correctAnswer: 'A',
                    explanation: 'Guidelines must be applied with attention to population, setting, strength, certainty, and cautions.',
                    whyOthersWrong: 'The other options remove safeguards that are essential in clinical learning.',
                    difficulty,
                    sourceReference: firstGuideline ? `Guideline 1: ${firstGuideline.sourceBody}` : sourceRef(1),
                },
                {
                    questionType: 'pitfall',
                    question: 'What is the main safety pitfall with this generated teaching case?',
                    options: ['A: Using it as direct patient care advice', 'B: Checking the primary source', 'C: Noting limitations', 'D: Comparing study population to the patient'],
                    correctAnswer: 'A',
                    explanation: 'The case is for research and education only; clinical decisions require qualified review and current local guidance.',
                    whyOthersWrong: 'B, C, and D are appropriate verification steps.',
                    difficulty,
                    sourceReference: sourceRef(1),
                },
            ],
        };
    }

    app.post('/api/reviews', requireJson, requireAuthJwt, auditLog('review.create'), validateBody(schemas.reviewCreate), async (req, res) => {
        try {
            const { question, title, criteria } = req.body;
            const owner = await resolveOwner(req);
            const project = await reviews.createProject({
                question,
                title,
                criteria,
                ownerType: owner.ownerType,
                ownerId: owner.ownerId,
            });
            await db.logEvent('review:create', req.sessionId, { reviewId: project.id });
            res.status(201).json({ review: project });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    app.get('/api/reviews/:id', requireReviewAccess, async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const prisma = await reviews.prismaCounts(req.params.id);
            res.json({ review: req.review, articles, prisma });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/articles', requireJson, requireReviewAccess, auditLog('review.add_articles'), validateBody(schemas.reviewArticles), async (req, res) => {
        try {
            const { articles, duplicates } = await reviews.addArticles(req.params.id, req.body.articles || []);
            await db.logEvent('review:add_articles', req.sessionId, {
                reviewId: req.params.id,
                count: (req.body.articles || []).length,
                duplicatesDetected: duplicates.length,
            });
            res.json({ articles, duplicates });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch(
        '/api/reviews/:id/articles/:articleId/screening',
        requireJson,
        requireReviewAccess,
        auditLog('review.screen'),
        validateBody(schemas.reviewScreening),
        async (req, res) => {
            try {
                const row = await reviews.updateScreening(req.params.id, req.params.articleId, {
                    screeningStatus: req.body.decision,
                    exclusionReason: req.body.exclusionReason,
                    notes: req.body.notes,
                });
                const prisma = await reviews.prismaCounts(req.params.id);
                await db.logEvent('review:screen', req.sessionId, {
                    reviewId: req.params.id,
                    articleId: req.params.articleId,
                    decision: req.body.decision,
                });
                req.broadcast?.broadcastScreeningUpdate?.(req.params.id, {
                    article: row,
                    prisma,
                    articleId: req.params.articleId,
                    decision: req.body.decision,
                    userId: req.user?.id,
                    userName: req.user?.name,
                });
                res.json({ article: row, prisma });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    );

    app.get('/api/reviews/:id/prisma', requireReviewAccess, async (req, res) => {
        try {
            const prisma = await reviews.prismaCounts(req.params.id);
            res.json({ prisma });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/reviews/:id/export.csv', requireAuthJwt, requireReviewAccess, requirePaidFeature('review_csv_export'), async (req, res) => {
        try {
            const csv = await reviews.exportCsv(req.params.id);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="review-${req.params.id}.csv"`);
            res.send(csv);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/pico/extract', requireJson, requireAuthJwt, requirePaidFeature('pico_extraction'), rateLimit(8, 60), validateBody(schemas.reviewPicoExtract), async (req, res) => {
        try {
            const articles = req.body.articles || [];
            const provider = req.body.provider || 'auto';
            const results = [];

            for (const article of articles) {
                const articleId = String(article.uid || '').trim();
                if (!articleId) continue;

                const cached = await reviews.getPico(articleId);
                if (cached) {
                    results.push({ articleId, extraction: cached.extraction, cached: true, confidence: cached.confidence || 0 });
                    continue;
                }

                const prompt = buildPicoExtractionPrompt(article);
                const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
                const parsed = reviews.parseJsonBlock(text);
                const normalized = reviews.normalizePicoExtraction(parsed || {});
                await reviews.upsertPico(articleId, normalized, usedProvider, model, normalized.confidence);
                results.push({ articleId, extraction: normalized, cached: false, confidence: normalized.confidence });
            }

            await db.logEvent('review:pico_extract', req.sessionId, { count: results.length });
            res.json({ results });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/articles/:articleId/rob', requireJson, requireReviewAccess, requirePaidFeature('pico_extraction'), rateLimit(6, 60), async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const article = articles.find((a) => a.article_id === req.params.articleId);
            if (!article) return res.status(404).json({ error: 'Article not found in review' });

            const ad = article.article_data || {};
            const title = ad.title || req.params.articleId;
            const abstract = ad.abstract || ad.snippet || '';
            const studyDesign = ad.pubtype?.[0] || 'unknown';

            const prompt = `You are a systematic review methodologist. Assess the risk of bias for this study using the Cochrane RoB 2 framework.

Study: "${title}"
Study design: ${studyDesign}
Abstract: ${abstract.slice(0, 1200)}

For each domain, provide:
- judgement: "low" | "some_concerns" | "high"
- rationale: 1 sentence

Return ONLY valid JSON:
{
  "randomisation": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "allocation_concealment": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "blinding_participants": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "blinding_outcome": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "incomplete_outcomes": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "selective_reporting": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "overall": {"judgement": "low|some_concerns|high", "rationale": "One overall judgement sentence"}
}`;

            const { text, provider: usedProvider, model } = await callProvider(prompt, req.body.provider || 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed) return res.status(422).json({ error: 'AI returned non-JSON response for RoB assessment' });

            const validJudgements = new Set(['low', 'some_concerns', 'high']);
            const domains = ['randomisation', 'allocation_concealment', 'blinding_participants', 'blinding_outcome', 'incomplete_outcomes', 'selective_reporting', 'overall'];
            const rob = {};
            for (const domain of domains) {
                const d = parsed[domain] || {};
                rob[domain] = {
                    judgement: validJudgements.has(d.judgement) ? d.judgement : 'some_concerns',
                    rationale: String(d.rationale || 'Insufficient information').slice(0, 400),
                };
            }

            await db.logEvent('review:rob_assessment', req.sessionId, { reviewId: req.params.id, articleId: req.params.articleId });
            res.json({ rob, provider: usedProvider, model, articleId: req.params.articleId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/grade-table', requireJson, requireReviewAccess, requirePaidFeature('pico_extraction'), rateLimit(4, 60), async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const included = articles.filter((a) => a.screening_status === 'included');
            if (included.length === 0) return res.status(400).json({ error: 'No included articles — screen articles first' });

            const review = await reviews.getProject(req.params.id);
            const question = review?.question || 'Clinical question not specified';

            const articleSummaries = included.slice(0, 12).map((a, i) => {
                const ad = a.article_data || {};
                const pico = a.extraction || {};
                return `[${i + 1}] "${ad.title || a.article_id}"
  Design: ${ad.pubtype?.[0] || pico.studyDesign || 'unknown'}, n=${pico.sampleSize || ad.sampleSize || '?'}
  Population: ${pico.population || 'not extracted'}
  Outcome: ${Array.isArray(pico.outcomes) ? pico.outcomes[0] : pico.outcomes || 'not extracted'}`;
            }).join('\n');

            const prompt = `You are a systematic review methodologist. Generate a GRADE Summary of Findings (SoF) table for this systematic review.

Clinical question: ${question}
Included studies (n=${included.length}):
${articleSummaries}

Return ONLY valid JSON:
{
  "question": "PICO-formatted clinical question",
  "outcomes": [
    {
      "name": "outcome name",
      "studyCount": 3,
      "participantCount": 1200,
      "effect": "RR 0.85 (95% CI 0.72–1.01) or narrative if no meta-analysis",
      "certainty": "HIGH|MODERATE|LOW|VERY_LOW",
      "certaintyDowngrade": ["risk of bias", "inconsistency", "imprecision"],
      "certaintyUpgrade": [],
      "comment": "brief clinical interpretation"
    }
  ],
  "overallCertainty": "HIGH|MODERATE|LOW|VERY_LOW",
  "limitations": "Key limitation of the body of evidence in 1-2 sentences"
}`;

            const { text, provider: usedProvider, model } = await callProvider(prompt, req.body.provider || 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed) return res.status(422).json({ error: 'AI returned non-JSON response for GRADE table' });

            await db.logEvent('review:grade_table', req.sessionId, { reviewId: req.params.id, includedCount: included.length });
            res.json({ gradeTable: parsed, provider: usedProvider, model, includedCount: included.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/screening/assist', requireJson, requireAuthJwt, requirePaidFeature('screening_assist'), rateLimit(8, 60), validateBody(schemas.reviewScreenAssist), async (req, res) => {
        try {
            const { criteria, article, provider = 'auto' } = req.body;
            const prompt = buildScreeningAssistPrompt(criteria, article);
            const { text } = await callProvider(prompt, provider);
            const parsed = reviews.parseJsonBlock(text) || {};
            const decision = ['include', 'exclude', 'uncertain'].includes(parsed.decision) ? parsed.decision : 'uncertain';
            res.json({
                decision,
                rationale: String(parsed.rationale || 'Insufficient information for high-confidence screening.'),
                matchedInclusion: Array.isArray(parsed.matchedInclusion) ? parsed.matchedInclusion : [],
                triggeredExclusion: Array.isArray(parsed.triggeredExclusion) ? parsed.triggeredExclusion : [],
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post(
        '/api/cases/analyze',
        requireJson,
        requireAuthJwt,
        validateBody(schemas.caseAnalyze),
        rateLimit(8, 60),
        async (req, res) => {
        try {
            const { caseText, provider = 'auto' } = req.body;
            const topic = String(req.body.topic || '').trim();
            const learningMode = normalizeLearningMode(req.body.learningMode);
            const seedArticles = Array.isArray(req.body.seedArticles) ? req.body.seedArticles : [];

            let literatureQuery = heuristicSearchQuery(topic ? `${topic}\n${caseText}` : caseText);
            let queryHints = null;
            try {
                const qPrompt = buildCaseSearchQueryPrompt(topic ? `Topic: ${topic}\n${caseText}` : caseText);
                const { text: qText } = await callProvider(qPrompt, provider);
                const qParsed = reviews.parseJsonBlock(qText);
                const q = qParsed && typeof qParsed.searchQuery === 'string' ? qParsed.searchQuery.trim() : '';
                if (q.length >= 6) {
                    literatureQuery = q.slice(0, 420);
                    queryHints = qParsed;
                }
            } catch (err) {
                req.log?.warn?.({ err }, 'AI query generation failed, falling back to heuristic');
            }

            const seedKey =
                seedArticles.length > 0
                    ? seedArticles
                        .map((s) => String(s.uid || s.doi || s.pmid || '').slice(0, 80))
                        .join('|')
                        .slice(0, 200)
                    : '';
            const knowledgeTopic = (topic || literatureQuery || '').trim();
            const topicKnowledgeRow = knowledgeTopic.length >= 2
                ? await db.getTopicKnowledge(knowledgeTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; })
                : null;
            const tkSig = topicKnowledgeRow?.updatedAt
                ? String(topicKnowledgeRow.updatedAt).slice(0, 24)
                : 'none';
            const cacheKey = `case:${learningMode}:${topic.toLowerCase()}:${literatureQuery.slice(0, 220).toLowerCase()}:s:${seedKey}:tk:${tkSig}`;
            const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
            if (cached) return res.json({ ...cached, cached: true });

            const { articles: baseArticles, vectorUsed, sourcesTried } = await gatherEvidenceArticlesForCase({
                searchQuery: literatureQuery,
                limit: 14,
                serverConfig,
                db,
                fetch: fetchImpl,
                logWarn: req.log?.warn ? (...args) => req.log.warn(...args) : undefined,
                seedArticles,
            });

            const evidenceRows = [];
            for (const article of baseArticles) {
                const picoKey = String(article.uid || article.pmid || '').trim();
                const pico = picoKey ? (await reviews.getPico(picoKey))?.extraction || null : null;
                evidenceRows.push({ article, pico });
            }

            const guidelines = await db.getGuidelinesByTopic((topic || knowledgeTopic || '').trim(), { limit: 5 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

            let userContext = null;
            if (req.user && req.user.id) {
                const masteryTopic = (topic || knowledgeTopic || '').trim();
                const [profile, mastery] = await Promise.all([
                    db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                    db.getUserTopicMastery(req.user.id, masteryTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                ]);
                userContext = { profile, mastery };
            }

            const prompt = buildCaseEvidencePrompt(caseText, evidenceRows, { topic, learningMode, topicKnowledge: topicKnowledgeRow }, guidelines, userContext);
            const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
            const parsed = reviews.parseJsonBlock(text) || {};
            const learning = fallbackLearningCase({ parsed, caseText, topic, learningMode, articles: baseArticles });
            const result = {
                provider: usedProvider,
                model,
                query: literatureQuery,
                queryHints,
                searchSources: sourcesTried,
                vectorUsed,
                ...learning,
                caseSummary: String(parsed.caseSummary || ''),
                interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
                uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
                disclaimer: String(
                    parsed.disclaimer ||
                        'FOR RESEARCH SUPPORT ONLY. This summary is not a substitute for clinical judgement. Findings must be verified against primary sources and interpreted by a qualified healthcare professional before informing any patient care decision.'
                ),
                safetyNotes: String(
                    parsed.safetyNotes ||
                        'Research-assistant output only. Verify with full guidelines and local protocols before clinical use.'
                ),
                citations: baseArticles,
            };
            await Promise.resolve(cache.set(cacheKey, result, 1800)).catch(() => undefined);
            await db.logEvent('case:analyze', req.sessionId, {
                query: literatureQuery,
                topic,
                learningMode,
                evidenceCount: baseArticles.length,
                vectorUsed,
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
        }
    );

    // ── Teaching Vignette ────────────────────────────────────────────────────
    // POST /api/cases/teaching-vignette
    // Accepts { topic, seedArticles, learningMode } — no free-text patient needed.
    // Generates a fully-synthetic teaching case grounded strictly in the supplied abstracts.
    app.post(
        '/api/cases/teaching-vignette',
        requireJson,
        requireAuthJwt,
        rateLimit(8, 60),
        async (req, res) => {
            try {
                const topic = String(req.body.topic || '').trim();
                if (!topic) return res.status(400).json({ error: 'topic is required' });

                const seedArticles = Array.isArray(req.body.seedArticles) ? req.body.seedArticles.slice(0, 8) : [];
                if (!seedArticles.length) return res.status(400).json({ error: 'seedArticles is required (at least 1)' });

                const learningMode = normalizeLearningMode(req.body.learningMode);
                const provider = req.body.provider || 'auto';

                const seedKey = seedArticles
                    .map((s) => String(s.uid || s.doi || s.pmid || s.title || '').slice(0, 60))
                    .join('|')
                    .slice(0, 200);
                const topicKnowledgeRow = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
                const tkSig = topicKnowledgeRow?.updatedAt
                    ? String(topicKnowledgeRow.updatedAt).slice(0, 24)
                    : 'none';
                const cacheKey = `teaching:${learningMode}:${topic.toLowerCase().slice(0, 80)}:${seedKey}:tk:${tkSig}`;
                const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
                if (cached) return res.json({ ...cached, cached: true });

                const guidelines = await db.getGuidelinesByTopic(topic || '', { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                let userContext = null;
                if (req.user && req.user.id) {
                    const [profile, mastery] = await Promise.all([
                        db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                        db.getUserTopicMastery(req.user.id, topic || '').catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                    ]);
                    userContext = { profile, mastery };
                }

                const prompt = buildTeachingVignettePrompt(topic, seedArticles, learningMode, guidelines, userContext, topicKnowledgeRow);
                const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
                const parsed = reviews.parseJsonBlock(text) || {};
                const fallback = fallbackTeachingVignette({ topic, learningMode, seedArticles, guidelines, topicKnowledgeRow });
                const useText = (value, fallbackValue) => {
                    const textValue = String(value || '').trim();
                    return textValue || fallbackValue;
                };
                const useArray = (value, fallbackValue) => (
                    Array.isArray(value) && value.length ? value : fallbackValue
                );

                // Post-check: flag management text referencing drug names not found in any seed abstract.
                const seedText = seedArticles.map((a) => (a.abstract || '') + ' ' + (a.title || '')).join(' ').toLowerCase();
                const managementText = useText(parsed.managementReasoning, fallback.managementReasoning);
                const drugPattern = /\b([a-z]{4,}(?:mab|nib|mycin|cillin|olol|pril|sartan|statin|tidine|oxacin|cycline|azole|vir|umab))\b/gi;
                const flaggedDrugs = [];
                for (const match of managementText.matchAll(drugPattern)) {
                    const drug = match[1].toLowerCase();
                    if (!seedText.includes(drug)) flaggedDrugs.push(match[1]);
                }

                const result = {
                    provider: usedProvider,
                    model,
                    topic,
                    learningMode,
                    seedCount: seedArticles.length,
                    presentingComplaint: useText(parsed.presentingComplaint, fallback.presentingComplaint),
                    history: useText(parsed.history, fallback.history),
                    examination: useText(parsed.examination, fallback.examination),
                    investigations: useText(parsed.investigations, fallback.investigations),
                    differential: useArray(parsed.differential, fallback.differential),
                    managementReasoning: managementText,
                    teachingPoints: useArray(parsed.teachingPoints, fallback.teachingPoints),
                    evidenceLinks: useArray(parsed.evidenceLinks, fallback.evidenceLinks),
                    uncertaintyFlags: useArray(parsed.uncertaintyFlags, fallback.uncertaintyFlags),
                    caseMCQs: useArray(parsed.caseMCQs, fallback.caseMCQs)
                        .slice(0, 5).map((q, i) => ({
                            id: `tv-${i + 1}`,
                            type: 'multiple_choice',
                            questionType: ['clinical_application', 'recall', 'trial_interpretation', 'guideline', 'pitfall'].includes(q.questionType)
                                ? q.questionType : 'clinical_application',
                            question: String(q.question || ''),
                            options: Array.isArray(q.options) ? q.options : [],
                            correctAnswer: String(q.correctAnswer || 'A'),
                            explanation: String(q.explanation || ''),
                            whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : undefined,
                            difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
                            sourceReference: q.sourceReference ? String(q.sourceReference) : undefined,
                        })),
                    postCheckFlags: flaggedDrugs.length > 0
                        ? { unsupportedDrugReferences: [...new Set(flaggedDrugs)], note: 'These drug names appear in management text but were not found in any seed abstract. Verify before use.' }
                        : null,
                    disclaimer: String(parsed.disclaimer || 'FOR RESEARCH AND EDUCATION ONLY. This vignette is fictional. Management steps are derived from provided research abstracts and must not be used for direct patient care.'),
                };

                await Promise.resolve(cache.set(cacheKey, result, 1800)).catch(() => undefined);
                await db.logEvent('case:teaching_vignette', req.sessionId, {
                    topic,
                    learningMode,
                    seedCount: seedArticles.length,
                    flaggedDrugs: flaggedDrugs.length,
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    );
}

module.exports = { registerReviewRoutes };
