const Joi = require('joi');

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function requireJson(req, res, next) {
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    next();
}

function validateAnalysisBody(body) {
    const errors = [];
    if (!body.text || typeof body.text !== 'string') {
        errors.push('text is required and must be a string');
    } else if (body.text.length > 100000) {
        errors.push('text exceeds maximum length of 100000 characters');
    }
    const validTypes = ['quick', 'comprehensive', 'critical', 'layperson', 'methodology'];
    if (body.analysisType && !validTypes.includes(body.analysisType)) {
        errors.push(`analysisType must be one of: ${validTypes.join(', ')}`);
    }
    return errors;
}

function validateBody(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map((d) => d.message),
            });
        }
        next();
    };
}

const schemas = {
    search: Joi.object({
        query: Joi.string().max(500).required(),
        max: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('relevance', 'date').default('relevance'),
    }),
    analyze: Joi.object({
        text: Joi.string().max(100000).required(),
        analysisType: Joi.string()
            .valid('quick', 'comprehensive', 'critical', 'layperson', 'methodology')
            .default('comprehensive'),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
        model: Joi.string().max(100).optional(),
    }),
    saveArticle: Joi.object({
        article: Joi.object({
            uid: Joi.string().required(),
            title: Joi.string().optional(),
            abstract: Joi.string().optional(),
        }).required(),
    }),
    alert: Joi.object({
        query: Joi.string().max(500).required(),
        sources: Joi.array().items(Joi.string()).optional(),
        frequency: Joi.string().valid('daily', 'weekly', 'monthly').default('weekly'),
    }),
    annotation: Joi.object({
        text: Joi.string().max(5000).required(),
        position: Joi.object().optional(),
    }),
    quiz: Joi.object({
        topic: Joi.string().max(200).required(),
        articles: Joi.array().optional(),
        count: Joi.number().integer().min(1).max(10).default(5),
        difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').default('mixed'),
        studyRunId: Joi.number().integer().optional(),
        trainingStage: Joi.string()
            .valid('preclinical', 'early_clinical', 'finals', 'foundation_doctor')
            .optional(),
        explanationDepth: Joi.string()
            .valid('foundation', 'exam_focus', 'mechanistic')
            .optional(),
        explicitTargetNodeIds: Joi.array().items(Joi.string().max(120)).max(20).optional(),
        mode: Joi.string().valid('spaced_rep', 'standard').optional(),
        /** When set, each question must target one row from ai_generation_claims for this job. */
        claimJobKey: Joi.string().max(160).allow('', null).optional(),
    }),
    synopsis: Joi.object({
        article: Joi.object({ title: Joi.string().required() }).unknown(true).required(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
        async: Joi.boolean().optional(),
    }),
    synthesize: Joi.object({
        articles: Joi.array().min(1).required(),
        topic: Joi.string().max(500).optional(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
        async: Joi.boolean().optional(),
    }),
    journalClub: Joi.object({
        articles: Joi.array().min(1).max(15).required(),
        topic: Joi.string().max(500).required(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
    }),
    reviewCreate: Joi.object({
        title: Joi.string().max(300).optional(),
        question: Joi.string().max(2000).required(),
        ownerType: Joi.string().valid('user', 'session', 'team').optional(),
        teamId: Joi.string().max(100).when('ownerType', {
            is: 'team',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        criteria: Joi.object({
            inclusion: Joi.array().items(Joi.string()).default([]),
            exclusion: Joi.array().items(Joi.string()).default([]),
        }).default({ inclusion: [], exclusion: [] }),
    }),
    reviewArticles: Joi.object({
        articles: Joi.array()
            .items(Joi.object({ uid: Joi.string().required() }).unknown(true))
            .min(1)
            .required(),
    }),
    reviewScreening: Joi.object({
        decision: Joi.string().valid('pending', 'included', 'excluded', 'maybe').required(),
        exclusionReason: Joi.string().max(1000).allow('', null).optional(),
        notes: Joi.string().max(2000).allow('', null).optional(),
    }),
    reviewPicoExtract: Joi.object({
        articles: Joi.array()
            .items(Joi.object({ uid: Joi.string().required() }).unknown(true))
            .min(1)
            .required(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
    }),
    reviewScreenAssist: Joi.object({
        criteria: Joi.object().required(),
        article: Joi.object({ uid: Joi.string().required() }).unknown(true).required(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
    }),
    caseAnalyze: Joi.object({
        caseText: Joi.string().max(5000).required(),
        provider: Joi.string().valid('auto', 'gemini', 'mistral').default('auto'),
        topic: Joi.string().max(240).allow('', null).optional(),
        learningMode: Joi.string().valid('student', 'resident', 'specialist', 'exam').default('student'),
        /** Topic-workspace “top evidence” rows — merged first into case retrieval (max 8). */
        seedArticles: Joi.array().items(Joi.object().unknown(true)).max(8).optional(),
    }),
    learningProfile: Joi.object({
        persona: Joi.string().valid('clinician', 'researcher', 'student').optional(),
        goals: Joi.array().items(Joi.string().max(200)).max(10).optional(),
        weakTopics: Joi.array().items(Joi.string().max(200)).max(20).optional(),
        strongTopics: Joi.array().items(Joi.string().max(200)).max(20).optional(),
        preferredDifficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').optional(),
        dailyGoalMinutes: Joi.number().integer().min(1).max(240).optional(),
        trainingStage: Joi.string()
            .valid('preclinical', 'early_clinical', 'finals', 'foundation_doctor')
            .optional(),
        defaultExplanationDepth: Joi.string()
            .valid('foundation', 'exam_focus', 'mechanistic')
            .optional(),
        activeCurriculumId: Joi.number().integer().allow(null).optional(),
    }),
    quizAttempt: Joi.object({
        topic: Joi.string().max(200).required(),
        studyRunId: Joi.number().integer().optional(),
        curriculumTopicId: Joi.number().integer().optional(),
        attempts: Joi.array().items(Joi.object({
            questionId: Joi.string().required(),
            questionType: Joi.string().valid('recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall').required(),
            questionText: Joi.string().max(5000).required(),
            userAnswer: Joi.string().max(500).required(),
            correctAnswer: Joi.string().max(500).required(),
            isCorrect: Joi.boolean().required(),
            timeMs: Joi.number().integer().optional(),
            confidence: Joi.number().integer().min(1).max(5).optional(),
            sourceArticleUid: Joi.string().optional(),
            sourceArticleTitle: Joi.string().max(500).allow('', null).optional(),
            outlineNodeId: Joi.string().max(120).allow('', null).optional(),
            outlineLabel: Joi.string().max(300).allow('', null).optional(),
            claimKey: Joi.string().max(80).allow('', null).optional(),
            promptVariant: Joi.string().max(80).allow('', null).optional(),
        })).min(1).required(),
    }),
    studyRunCreate: Joi.object({
        topic: Joi.string().max(200).required(),
        curriculumTopicId: Joi.number().integer().optional(),
    }),
    studyRunUpdate: Joi.object({
        status: Joi.string().valid('active', 'completed', 'paused').optional(),
        progress: Joi.object().unknown(true).optional(),
        nodeCoverage: Joi.object().unknown(true).optional(),
    }),
    agentConversation: Joi.object({
        topic: Joi.string().max(200).required(),
        title: Joi.string().max(200).optional(),
    }),
    agentMessageAppend: Joi.object({
        messages: Joi.array().items(Joi.object({
            role: Joi.string().valid('user', 'assistant').required(),
            content: Joi.string().max(20000).required(),
            timestamp: Joi.string().isoDate().optional(),
        })).min(1).required(),
    }),
};

function limitBodySize(maxBytes) {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > maxBytes) {
            return res.status(413).json({ error: `Request body exceeds ${maxBytes} bytes` });
        }
        next();
    };
}

module.exports = { sanitizeInput, escapeHtml, requireJson, validateAnalysisBody, validateBody, schemas, limitBodySize };
