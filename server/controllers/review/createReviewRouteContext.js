const logger = require('../../config/logger');
const { createAiService, PINNED_MODELS } = require('../../services/aiService');
const {
    buildPicoExtractionPrompt,
    buildScreeningAssistPrompt,
    buildCaseEvidencePrompt,
    buildCaseSearchQueryPrompt,
    buildTeachingVignettePrompt,
} = require('../../prompts');
const { buildAdaptiveCasePrompt, buildCaseInitPrompt, buildCaseStepPrompt, STEP_SEQUENCE } = require('../../prompts/adaptiveCase');
const { createReviewService } = require('../../services/reviewService');
const { gatherEvidenceArticlesForCase, heuristicSearchQuery } = require('../../services/caseEvidenceService');
const { extractTrialGuidelineConflicts } = require('../../services/conflictExtractionService');
const {
    extractPicoProfile,
    rerankArticlesByPico,
    selectTopRerankedArticles,
} = require('../../services/articleReranker');
const { getInferredMisconceptionsForTopic } = require('../../services/misconceptionInferenceService');
const { findRelatedTopicsWithMisconceptions, buildJitReminder } = require('../../services/relatedTopicService');
const { normalizeCaseMcqList } = require('../../utils/normalizeCaseMcqs');
const { createMcqValidationService } = require('../../services/mcqValidationService');

/**
 * @param {object} deps
 */
function createReviewRouteContext(deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireAuthOrBeta,
        requirePaidFeature,
        validateBody,
        schemas,
        auditLog,
        fetch: fetchImpl,
    } = deps;

    const requireCaseAuth = requireAuthOrBeta || requireAuthJwt;

    const ai = createAiService({ serverConfig, fetchImpl });
    const reviews = createReviewService({ db });
    const mcqValidator = createMcqValidationService({ ai, db, logger, PINNED_MODELS });

    async function validateCaseMcqs(topic, mcqs, articles = []) {
        const normalized = normalizeCaseMcqList(mcqs, { prefix: 'case' });
        if (!normalized.length) return normalized;
        try {
            const validation = await mcqValidator.validateBatch({
                topic,
                questions: normalized,
                provider: 'gemini',
                model: PINNED_MODELS.gemini,
                articles,
                guidelines: [],
            });
            if (validation?.validIndices?.size) {
                return normalized.filter((_, idx) => validation.validIndices.has(idx + 1));
            }
        } catch (err) {
            logger.warn({ err }, 'case MCQ validation skipped');
        }
        return normalized;
    }

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

    const { resolveProvider: resolveProviderUtil } = require('../../utils/aiProvider');

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
            ? normalizeCaseMcqList(parsed.caseMCQs.slice(0, 5), { prefix: 'case', difficulty })
            : normalizeCaseMcqList([
                {
                    id: 'case-1',
                    type: 'multiple_choice',
                    question: `Which feature should most strongly guide the next evidence review step for ${focus}?`,
                    options: ['A: Patient phenotype and severity', 'B: Journal title alone', 'C: Publication date alone', 'D: Author institution'],
                    correctAnswer: 'A',
                    explanation: 'Evidence applies best when the population, severity, setting, and outcomes match the case, not when judged by metadata alone.',
                    difficulty,
                    sourceReference: 'Evidence 1',
                },
                {
                    id: 'case-2',
                    type: 'multiple_choice',
                    question: `What is the main limitation when applying ${firstTitle} to this case?`,
                    options: ['A: Population and setting may differ', 'B: The title is too long', 'C: It has a citation number', 'D: It appears in the evidence list'],
                    correctAnswer: 'A',
                    explanation: 'Applicability depends on whether the study population, intervention, comparator, and outcomes match the clinical scenario.',
                    difficulty,
                    sourceReference: 'Evidence 1',
                },
                {
                    id: 'case-3',
                    type: 'multiple_choice',
                    question: 'Which statement best describes the role of this generated case?',
                    options: ['A: Learning and evidence appraisal support', 'B: A final diagnosis', 'C: A treatment order', 'D: A replacement for guidelines'],
                    correctAnswer: 'A',
                    explanation: 'The case mode supports learning and literature interpretation only; clinical decisions require qualified review and local guidance.',
                    difficulty,
                    sourceReference: 'Safety note',
                },
            ], { prefix: 'case', difficulty });

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
    return {
        deps,
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireCaseAuth,
        requirePaidFeature,
        validateBody,
        schemas,
        auditLog,
        fetchImpl,
        ai,
        reviews,
        mcqValidator,
        validateCaseMcqs,
        assertTeamMember,
        resolveOwner,
        requireReviewAccess,
        callProvider,
        normalizeLearningMode,
        firstArticleTitle,
        fallbackLearningCase,
        fallbackTeachingVignette,
    };
}

module.exports = { createReviewRouteContext };
