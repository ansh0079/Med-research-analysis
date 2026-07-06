/**
 * OpenAPI Spec Generator
 * Auto-generates openapi.json from inline JSON schemas + manual route registry.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'docs', 'openapi.json');

// Inline JSON Schema representations of each validation schema.
const COMPONENT_SCHEMAS = {
    search: {
        type: 'object',
        required: ['query'],
        properties: {
            query: { type: 'string', maxLength: 500 },
            max: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sort: { type: 'string', enum: ['relevance', 'date'], default: 'relevance' },
        },
    },
    analyze: {
        type: 'object',
        required: ['text'],
        properties: {
            text: { type: 'string', maxLength: 100000 },
            analysisType: { type: 'string', enum: ['quick', 'comprehensive', 'critical', 'layperson', 'methodology'], default: 'comprehensive' },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
            model: { type: 'string', maxLength: 100 },
        },
    },
    saveArticle: {
        type: 'object',
        required: ['article'],
        properties: {
            article: {
                type: 'object',
                required: ['uid'],
                properties: {
                    uid: { type: 'string' },
                    title: { type: 'string' },
                    abstract: { type: 'string' },
                },
            },
        },
    },
    alert: {
        type: 'object',
        required: ['query'],
        properties: {
            query: { type: 'string', maxLength: 500 },
            sources: { type: 'array', items: { type: 'string' } },
            frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
        },
    },
    annotation: {
        type: 'object',
        required: ['text'],
        properties: {
            text: { type: 'string', maxLength: 5000 },
            position: { type: 'object', additionalProperties: true },
        },
    },
    quiz: {
        type: 'object',
        required: ['topic'],
        properties: {
            topic: { type: 'string', maxLength: 200 },
            articles: { type: 'array' },
            count: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
            studyRunId: { type: 'integer' },
            trainingStage: { type: 'string', enum: ['preclinical', 'early_clinical', 'finals', 'foundation_doctor'] },
            explanationDepth: { type: 'string', enum: ['foundation', 'exam_focus', 'mechanistic'] },
            explicitTargetNodeIds: { type: 'array', items: { type: 'string', maxLength: 120 }, maxItems: 20 },
            mode: { type: 'string', enum: ['spaced_rep', 'standard'] },
            claimJobKey: { type: 'string', maxLength: 160, nullable: true },
            teachingPoints: { type: 'array', items: { type: 'object' }, maxItems: 20 },
            mcqAngles: { type: 'array', items: { type: 'string', maxLength: 500 }, maxItems: 15 },
        },
    },
    synopsis: {
        type: 'object',
        required: ['article'],
        properties: {
            article: { type: 'object', required: ['title'], properties: { title: { type: 'string' } }, additionalProperties: true },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
            async: { type: 'boolean' },
            topic: { type: 'string', maxLength: 500, nullable: true },
            trainingStage: { type: 'string', enum: ['preclinical', 'early_clinical', 'finals', 'foundation_doctor'] },
        },
    },
    synthesize: {
        type: 'object',
        required: ['articles'],
        properties: {
            articles: { type: 'array', minItems: 1 },
            topic: { type: 'string', maxLength: 500 },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
            async: { type: 'boolean' },
        },
    },
    journalClub: {
        type: 'object',
        required: ['articles', 'topic'],
        properties: {
            articles: { type: 'array', minItems: 1, maxItems: 15 },
            topic: { type: 'string', maxLength: 500 },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
        },
    },
    reviewCreate: {
        type: 'object',
        required: ['question'],
        properties: {
            title: { type: 'string', maxLength: 300 },
            question: { type: 'string', maxLength: 2000 },
            ownerType: { type: 'string', enum: ['user', 'session', 'team'] },
            teamId: { type: 'string', maxLength: 100 },
            criteria: {
                type: 'object',
                properties: {
                    inclusion: { type: 'array', items: { type: 'string' }, default: [] },
                    exclusion: { type: 'array', items: { type: 'string' }, default: [] },
                },
                default: { inclusion: [], exclusion: [] },
            },
        },
    },
    reviewArticles: {
        type: 'object',
        required: ['articles'],
        properties: {
            articles: {
                type: 'array',
                minItems: 1,
                items: { type: 'object', required: ['uid'], properties: { uid: { type: 'string' } }, additionalProperties: true },
            },
        },
    },
    reviewScreening: {
        type: 'object',
        required: ['decision'],
        properties: {
            decision: { type: 'string', enum: ['pending', 'included', 'excluded', 'maybe'] },
            exclusionReason: { type: 'string', maxLength: 1000, nullable: true },
            notes: { type: 'string', maxLength: 2000, nullable: true },
        },
    },
    reviewPicoExtract: {
        type: 'object',
        required: ['articles'],
        properties: {
            articles: {
                type: 'array',
                minItems: 1,
                items: { type: 'object', required: ['uid'], properties: { uid: { type: 'string' } }, additionalProperties: true },
            },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
        },
    },
    reviewScreenAssist: {
        type: 'object',
        required: ['criteria', 'article'],
        properties: {
            criteria: { type: 'object', additionalProperties: true },
            article: { type: 'object', required: ['uid'], properties: { uid: { type: 'string' } }, additionalProperties: true },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
        },
    },
    caseAnalyze: {
        type: 'object',
        required: ['caseText'],
        properties: {
            caseText: { type: 'string', maxLength: 5000 },
            provider: { type: 'string', enum: ['auto', 'gemini', 'mistral'], default: 'auto' },
            topic: { type: 'string', maxLength: 240, nullable: true },
            learningMode: { type: 'string', enum: ['student', 'resident', 'specialist', 'exam'], default: 'student' },
            seedArticles: { type: 'array', items: { type: 'object' }, maxItems: 8 },
        },
    },
    learningProfile: {
        type: 'object',
        properties: {
            persona: { type: 'string', enum: ['clinician', 'researcher', 'student'] },
            goals: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 10 },
            weakTopics: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 20 },
            strongTopics: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 20 },
            preferredDifficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'mixed'] },
            dailyGoalMinutes: { type: 'integer', minimum: 1, maximum: 240 },
            trainingStage: { type: 'string', enum: ['preclinical', 'early_clinical', 'finals', 'foundation_doctor'] },
            defaultExplanationDepth: { type: 'string', enum: ['foundation', 'exam_focus', 'mechanistic'] },
            specialtyInterest: { type: 'string', maxLength: 120, nullable: true },
            studyGoal: { type: 'string', maxLength: 160, nullable: true },
            activeCurriculumId: { type: 'integer', nullable: true },
        },
    },
    quizAttempt: {
        type: 'object',
        required: ['topic', 'attempts'],
        properties: {
            topic: { type: 'string', maxLength: 200 },
            studyRunId: { type: 'integer' },
            curriculumTopicId: { type: 'integer' },
            attempts: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['questionId', 'questionType', 'questionText', 'userAnswer', 'correctAnswer'],
                    properties: {
                        questionId: { type: 'string' },
                        questionType: { type: 'string', enum: ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'] },
                        questionText: { type: 'string', maxLength: 5000 },
                        userAnswer: { type: 'string', maxLength: 500 },
                        correctAnswer: { type: 'string', maxLength: 500 },
                        isCorrect: { type: 'boolean' },
                        timeMs: { type: 'integer' },
                        confidence: { type: 'integer', minimum: 1, maximum: 5 },
                        sourceArticleUid: { type: 'string' },
                        sourceArticleTitle: { type: 'string', maxLength: 500, nullable: true },
                        decisionId: { type: 'integer' },
                        banditArmId: { type: 'string', maxLength: 80, nullable: true },
                        searchId: { type: 'integer' },
                        outlineNodeId: { type: 'string', maxLength: 120, nullable: true },
                        outlineLabel: { type: 'string', maxLength: 300, nullable: true },
                        claimKey: { type: 'string', maxLength: 80, nullable: true },
                        promptVariant: { type: 'string', maxLength: 80, nullable: true },
                    },
                },
            },
        },
    },
    studyRunCreate: {
        type: 'object',
        required: ['topic'],
        properties: {
            topic: { type: 'string', maxLength: 200 },
            curriculumTopicId: { type: 'integer' },
        },
    },
    studyRunUpdate: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: ['active', 'completed', 'paused'] },
            progress: { type: 'object', additionalProperties: true },
            nodeCoverage: { type: 'object', additionalProperties: true },
        },
    },
    agentConversation: {
        type: 'object',
        required: ['topic'],
        properties: {
            topic: { type: 'string', maxLength: 200 },
            title: { type: 'string', maxLength: 200 },
        },
    },
    agentMessageAppend: {
        type: 'object',
        required: ['messages'],
        properties: {
            messages: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['role', 'content'],
                    properties: {
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        content: { type: 'string', maxLength: 20000 },
                        timestamp: { type: 'string' },
                    },
                },
            },
        },
    },
};

// Route registry: mount point, method, schema key, auth required, description, tags
const ROUTE_REGISTRY = [
  // Health
  { path: '/health', method: 'get', auth: false, tags: ['System'], description: 'Health check' },
  { path: '/api/config', method: 'get', auth: false, tags: ['System'], description: 'Client configuration' },
  { path: '/metrics', method: 'get', auth: true, admin: true, tags: ['System'], description: 'Prometheus metrics (admin only)' },

  // Search
  { path: '/api/search', method: 'get', auth: false, tags: ['Search'], description: 'Unified search' },
  { path: '/api/pubmed/search', method: 'get', auth: false, tags: ['Search'], description: 'PubMed search' },
  { path: '/api/semantic/search', method: 'get', auth: false, tags: ['Search'], description: 'Semantic Scholar search' },
  { path: '/api/openalex/search', method: 'get', auth: false, tags: ['Search'], description: 'OpenAlex search' },
  { path: '/api/crossref/search', method: 'get', auth: false, tags: ['Search'], description: 'Crossref search' },
  { path: '/api/search/intelligence', method: 'post', schema: 'search', auth: false, tags: ['Search'], description: 'Search intelligence' },
  { path: '/api/search/mesh-suggest', method: 'get', auth: false, tags: ['Search'], description: 'MeSH suggestions' },
  { path: '/api/search/vector', method: 'post', auth: true, tags: ['Search'], description: 'Vector search' },

  // AI
  { path: '/api/ai/synopsis', method: 'post', schema: 'synopsis', auth: true, tags: ['AI'], description: 'Generate article synopsis' },
  { path: '/api/ai/analyze', method: 'post', schema: 'analyze', auth: true, tags: ['AI'], description: 'Analyze article text' },
  { path: '/api/ai/synthesize', method: 'post', schema: 'synthesize', auth: true, tags: ['AI'], description: 'Synthesize multiple articles' },
  { path: '/api/ai/journal-club', method: 'post', schema: 'journalClub', auth: true, tags: ['AI'], description: 'Generate journal club material' },

  // Quiz / Learning
  { path: '/api/quiz/generate', method: 'post', schema: 'quiz', auth: true, tags: ['Learning'], description: 'Generate quiz' },
  { path: '/api/quiz/from-evidence', method: 'post', schema: 'quiz', auth: true, tags: ['Learning'], description: 'Generate quiz from evidence' },
  { path: '/api/learning/quiz-attempt', method: 'post', schema: 'quizAttempt', auth: true, tags: ['Learning'], description: 'Submit quiz attempt' },
  { path: '/api/learning/mastery', method: 'get', auth: true, tags: ['Learning'], description: 'Get all mastery data' },
  { path: '/api/learning/mastery/{topic}', method: 'get', auth: true, tags: ['Learning'], description: 'Get mastery for topic' },
  { path: '/api/learning/study-run', method: 'post', schema: 'studyRunCreate', auth: true, tags: ['Learning'], description: 'Create study run' },
  { path: '/api/learning/profile', method: 'post', schema: 'learningProfile', auth: true, tags: ['Learning'], description: 'Update learning profile' },

  // Reviews
  { path: '/api/reviews', method: 'post', schema: 'reviewCreate', auth: true, tags: ['Reviews'], description: 'Create systematic review' },
  { path: '/api/reviews/{id}/articles', method: 'post', schema: 'reviewArticles', auth: true, tags: ['Reviews'], description: 'Add articles to review' },
  { path: '/api/reviews/{id}/screening', method: 'post', schema: 'reviewScreening', auth: true, tags: ['Reviews'], description: 'Submit screening decision' },

  // User
  { path: '/api/user/history', method: 'get', auth: true, tags: ['User'], description: 'Search history' },
  { path: '/api/user/saved', method: 'get', auth: true, tags: ['User'], description: 'Saved articles' },
  { path: '/api/user/saved', method: 'post', schema: 'saveArticle', auth: true, tags: ['User'], description: 'Save article' },

  // Alerts
  { path: '/api/alerts', method: 'post', schema: 'alert', auth: true, tags: ['Alerts'], description: 'Create alert' },

  // Annotations
  { path: '/api/annotations', method: 'post', schema: 'annotation', auth: true, tags: ['Annotations'], description: 'Create annotation' },

  // Agent
  { path: '/api/agent/conversation', method: 'post', schema: 'agentConversation', auth: true, tags: ['Agent'], description: 'Start agent conversation' },
  { path: '/api/agent/conversation/{id}/messages', method: 'post', schema: 'agentMessageAppend', auth: true, tags: ['Agent'], description: 'Append messages' },
];

function buildSpec() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Signal MD API',
      version: '2.0.0',
      description: 'Multi-source medical search with AI analysis, learning, and systematic review tools.',
      contact: { name: 'API Support', url: 'https://signalmd.co' },
    },
    servers: [
      { url: 'http://localhost:3002', description: 'Local development' },
      { url: 'https://api.medresearch.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT obtained from /api/auth/login',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Session cookie',
        },
      },
      schemas: { ...COMPONENT_SCHEMAS },
      responses: {
        BadRequest: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { error: { type: 'string' } } },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          headers: {
            'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until retry' },
            'X-RateLimit-Limit': { schema: { type: 'integer' } },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          },
          content: {
            'application/json': {
              schema: { type: 'object', properties: { error: { type: 'string' }, retryAfter: { type: 'integer' } } },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { error: { type: 'string' }, requestId: { type: 'string' } } },
            },
          },
        },
      },
    },
    security: [],
    paths: {},
    tags: [
      { name: 'System', description: 'Health, config, metrics' },
      { name: 'Search', description: 'Evidence search across sources' },
      { name: 'AI', description: 'LLM-powered analysis and synthesis' },
      { name: 'Learning', description: 'Quizzes, mastery, study runs' },
      { name: 'Reviews', description: 'Systematic review management' },
      { name: 'User', description: 'User data and saved items' },
      { name: 'Alerts', description: 'Search alerts and digests' },
      { name: 'Annotations', description: 'Article annotations' },
      { name: 'Agent', description: 'Conversational AI agent' },
    ],
  };

  ROUTE_REGISTRY.forEach((route) => {
    const pathKey = route.path;
    if (!spec.paths[pathKey]) spec.paths[pathKey] = {};

    const method = route.method.toLowerCase();
    const operation = {
      summary: route.description,
      description: route.description,
      tags: route.tags,
      operationId: `${method}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
      responses: {
        200: { description: 'Success' },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/RateLimited' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    };

    if (route.schema && spec.components.schemas[route.schema]) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${route.schema}` },
          },
        },
      };
    }

    if (route.auth) {
      operation.security = [{ bearerAuth: [] }, { cookieAuth: [] }];
    }

    if (route.admin) {
      operation.security = [{ bearerAuth: [] }];
      operation.responses['403'] = { description: 'Forbidden — admin role required' };
    }

    spec.paths[pathKey][method] = operation;
  });

  return spec;
}

function generate() {
  const spec = buildSpec();
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2));
  console.log(`✅ OpenAPI spec written to ${OUTPUT_PATH}`);
  return spec;
}

if (require.main === module) {
  generate();
}

module.exports = { generate, buildSpec, ROUTE_REGISTRY };
