'use strict';

const { z } = require('zod');
const { sanitizeUserInput, escapeHtml } = require('./sanitization');

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return sanitizeUserInput(input, { maxLength: 5000, escapeHtml: true });
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
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation error',
                details: result.error.issues.map((e) => e.message),
            });
        }
        req.body = result.data;
        next();
    };
}

const PROVIDERS = z.enum(['auto', 'gemini', 'mistral']).default('auto');
const TRAINING_STAGE = z.enum(['preclinical', 'early_clinical', 'finals', 'foundation_doctor']).optional();
const EXPLANATION_DEPTH = z.enum(['foundation', 'exam_focus', 'mechanistic']).optional();

const schemas = {
    search: z.object({
        query: z.string().max(500),
        max: z.number().int().min(1).max(100).default(20),
        sort: z.enum(['relevance', 'date']).default('relevance'),
    }),

    analyze: z.object({
        text: z.string().max(100000),
        analysisType: z.enum(['quick', 'comprehensive', 'critical', 'layperson', 'methodology']).default('comprehensive'),
        provider: PROVIDERS,
        model: z.string().max(100).optional(),
    }),

    saveArticle: z.object({
        article: z.object({
            uid: z.string(),
            title: z.string().optional(),
            abstract: z.string().optional(),
        }),
    }),

    alert: z.object({
        query: z.string().max(500),
        sources: z.array(z.string()).optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    }),

    annotation: z.object({
        text: z.string().max(5000),
        position: z.record(z.string(), z.unknown()).optional(),
    }),

    quiz: z.object({
        topic: z.string().max(200),
        articles: z.array(z.unknown()).optional(),
        count: z.number().int().min(1).max(10).default(5),
        difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
        studyRunId: z.number().int().optional(),
        trainingStage: TRAINING_STAGE,
        explanationDepth: EXPLANATION_DEPTH,
        explicitTargetNodeIds: z.array(z.string().max(120)).max(20).optional(),
        mode: z.enum(['spaced_rep', 'standard']).optional(),
        claimJobKey: z.string().max(160).nullable().optional(),
        teachingPoints: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
        mcqAngles: z.array(z.string().max(500)).max(15).optional(),
    }),

    synopsis: z.object({
        article: z.object({ title: z.string() }).passthrough(),
        provider: PROVIDERS,
        async: z.boolean().optional(),
        topic: z.string().max(500).nullable().optional(),
        trainingStage: TRAINING_STAGE,
    }),

    synthesize: z.object({
        articles: z.array(z.unknown()).min(1),
        topic: z.string().max(500).optional(),
        provider: PROVIDERS,
        async: z.boolean().optional(),
    }),

    journalClub: z.object({
        articles: z.array(z.unknown()).min(1).max(15),
        topic: z.string().max(500),
        provider: PROVIDERS,
    }),

    reviewCreate: z.object({
        title: z.string().max(300).optional(),
        question: z.string().max(2000),
        ownerType: z.enum(['user', 'session', 'team']).optional(),
        teamId: z.string().max(100).optional(),
        criteria: z.object({
            inclusion: z.array(z.string()).default([]),
            exclusion: z.array(z.string()).default([]),
        }).default({ inclusion: [], exclusion: [] }),
    }).superRefine((data, ctx) => {
        if (data.ownerType === 'team' && !data.teamId) {
            ctx.addIssue({ code: 'custom', message: 'teamId is required when ownerType is team', path: ['teamId'] });
        }
    }),

    reviewArticles: z.object({
        articles: z.array(z.object({ uid: z.string() }).passthrough()).min(1),
    }),

    reviewScreening: z.object({
        decision: z.enum(['pending', 'included', 'excluded', 'maybe']),
        exclusionReason: z.string().max(1000).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
    }),

    reviewPicoExtract: z.object({
        articles: z.array(z.object({ uid: z.string() }).passthrough()).min(1),
        provider: PROVIDERS,
    }),

    reviewScreenAssist: z.object({
        criteria: z.record(z.string(), z.unknown()),
        article: z.object({ uid: z.string() }).passthrough(),
        provider: PROVIDERS,
    }),

    caseAnalyze: z.object({
        caseText: z.string().max(5000),
        provider: PROVIDERS,
        topic: z.string().max(240).nullable().optional(),
        learningMode: z.enum(['student', 'resident', 'specialist', 'exam']).default('student'),
        seedArticles: z.array(z.record(z.string(), z.unknown())).max(8).optional(),
    }),

    learningProfile: z.object({
        persona: z.enum(['clinician', 'researcher', 'student']).optional(),
        goals: z.array(z.string().max(200)).max(10).optional(),
        weakTopics: z.array(z.string().max(200)).max(20).optional(),
        strongTopics: z.array(z.string().max(200)).max(20).optional(),
        preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
        dailyGoalMinutes: z.number().int().min(1).max(240).optional(),
        trainingStage: TRAINING_STAGE,
        defaultExplanationDepth: EXPLANATION_DEPTH,
        specialtyInterest: z.string().max(120).nullable().optional(),
        studyGoal: z.string().max(160).nullable().optional(),
        activeCurriculumId: z.number().int().nullable().optional(),
    }),

    quizAttempt: z.object({
        topic: z.string().max(200),
        studyRunId: z.number().int().optional(),
        curriculumTopicId: z.number().int().optional(),
        attempts: z.array(z.object({
            questionId: z.string(),
            questionType: z.enum(['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall']),
            questionText: z.string().max(5000),
            userAnswer: z.string().max(500),
            correctAnswer: z.string().max(500),
            isCorrect: z.boolean().optional(),
            timeMs: z.number().int().optional(),
            confidence: z.number().int().min(1).max(5).optional(),
            sourceArticleUid: z.string().optional(),
            sourceArticleTitle: z.string().max(500).nullable().optional(),
            decisionId: z.number().int().optional(),
            banditArmId: z.string().max(80).nullable().optional(),
            searchId: z.number().int().optional(),
            outlineNodeId: z.string().max(120).nullable().optional(),
            outlineLabel: z.string().max(300).nullable().optional(),
            claimKey: z.string().max(80).nullable().optional(),
            promptVariant: z.string().max(80).nullable().optional(),
        })).min(1),
    }),

    studyRunCreate: z.object({
        topic: z.string().max(200),
        curriculumTopicId: z.number().int().optional(),
    }),

    studyRunUpdate: z.object({
        status: z.enum(['active', 'completed', 'paused']).optional(),
        progress: z.record(z.string(), z.unknown()).optional(),
        nodeCoverage: z.record(z.string(), z.unknown()).optional(),
    }),

    agentConversation: z.object({
        topic: z.string().max(200),
        title: z.string().max(200).optional(),
    }),

    agentMessageAppend: z.object({
        messages: z.array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(20000),
            timestamp: z.string().optional(),
        })).min(1),
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
