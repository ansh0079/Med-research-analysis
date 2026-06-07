/**
 * OpenAPI Spec Generator
 * Auto-generates openapi.json from Joi schemas + manual route registry.
 */

const fs = require('fs');
const path = require('path');
const j2s = require('joi-to-swagger');
const { schemas } = require('../utils/validation');

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'docs', 'openapi.json');

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
      schemas: {},
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

  // Convert Joi schemas to OpenAPI components
  Object.keys(schemas).forEach((key) => {
    try {
      const { swagger } = j2s(schemas[key]);
      spec.components.schemas[key] = swagger;
    } catch (err) {
      // Fallback for complex Joi features joi-to-swagger may not support
      spec.components.schemas[key] = { type: 'object', description: `Joi schema: ${key}` };
    }
  });

  // Build paths from registry
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
