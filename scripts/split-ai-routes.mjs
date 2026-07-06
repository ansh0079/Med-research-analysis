#!/usr/bin/env node
/**
 * Mechanical split of server/controllers/aiRoutes.js into ai/ submodules.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const srcPath = path.join(ROOT, 'server/controllers/aiRoutes.js');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

function fixImportPaths(text) {
    return text.replace(/require\('\.\.\//g, "require('../../");
}

const headerImports = fixImportPaths(lines.slice(0, 36).join('\n'));
const contextBody = slice(43, 75) + '\n' + slice(94, 523);
const analysisRoutes = slice(525, 742);
const quizRoutes = slice(744, 1441);
const synthesisRoutes = slice(1443, 2247);
const caseRoutes = slice(2252, 2368);
const streamMiddleware = slice(80, 92);

const ctxDestructuring = `        serverConfig,
        db,
        cache,
        rateLimit,
        ai,
        mcqValidator,
        logLlm,
        requireAiAuth,
        aiUserLimit,
        strictAiLimit,
        synthesisLimit,
        caseGenerationLimit,
        limitBodySize,
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        validateBody,
        validateAnalysisBody,
        schemas,
        fetchImpl,
        extractJsonArray,
        generateQuizQuestions,
        mapColdStartMcq,
        serveColdStartMCQs,
        buildStudyRunOutline,
        selectStudyRunTargets,
        selectAdaptiveMemoryTargets,
        normalizeOutlineNodeId,
        normalizeClaimKey,
        assignQuizPromptVariant,
        normalizeVisualExplanation,
        selectAdaptiveClaimAnchors,
        extractJsonObject,
        maybeStoreTopicKnowledge,
        attachEvidenceDeltaIfAvailable`;

const createContext = `${headerImports}

function createAiRouteContext(deps) {
${contextBody}
    return {
        deps,
${ctxDestructuring},
    };
}

module.exports = { createAiRouteContext };
`;

function wrapRegistrar(name, routeBody, extraImports = '') {
    return `${extraImports}${headerImports}

/**
 * @param {import('express').Application} app
 * @param {ReturnType<import('./createAiRouteContext').createAiRouteContext>} ctx
 */
function ${name}(app, ctx) {
    const {
${ctxDestructuring},
    } = ctx;

${routeBody}
}

module.exports = { ${name} };
`;
}

const orchestrator = `const { createAiRouteContext } = require('./ai/createAiRouteContext');
const { registerAiAnalysisRoutes } = require('./ai/registerAiAnalysisRoutes');
const { registerAiQuizRoutes } = require('./ai/registerAiQuizRoutes');
const { registerAiSynthesisRoutes } = require('./ai/registerAiSynthesisRoutes');
const { registerAiCaseRoutes } = require('./ai/registerAiCaseRoutes');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerAiRoutes(app, deps) {
    const ctx = createAiRouteContext(deps);

    app.use((req, res, next) => {
${streamMiddleware.split('\n').slice(1).join('\n')}
    });

    registerAiAnalysisRoutes(app, ctx);
    registerAiQuizRoutes(app, ctx);
    registerAiSynthesisRoutes(app, ctx);
    registerAiCaseRoutes(app, ctx);
}

module.exports = { registerAiRoutes };
`;

const aiDir = path.join(ROOT, 'server/controllers/ai');
fs.mkdirSync(aiDir, { recursive: true });
fs.writeFileSync(path.join(aiDir, 'createAiRouteContext.js'), createContext);
fs.writeFileSync(path.join(aiDir, 'registerAiAnalysisRoutes.js'), wrapRegistrar('registerAiAnalysisRoutes', analysisRoutes));
fs.writeFileSync(path.join(aiDir, 'registerAiQuizRoutes.js'), wrapRegistrar('registerAiQuizRoutes', quizRoutes));
fs.writeFileSync(path.join(aiDir, 'registerAiSynthesisRoutes.js'), wrapRegistrar('registerAiSynthesisRoutes', synthesisRoutes));
fs.writeFileSync(path.join(aiDir, 'registerAiCaseRoutes.js'), wrapRegistrar('registerAiCaseRoutes', caseRoutes));
fs.writeFileSync(path.join(ROOT, 'server/controllers/aiRoutes.js'), orchestrator);

console.log('Split aiRoutes.js complete');
for (const f of ['aiRoutes.js', ...fs.readdirSync(aiDir).map((n) => `ai/${n}`)]) {
    const p = path.join(ROOT, 'server/controllers', f);
    console.log(`${String(fs.readFileSync(p, 'utf8').split(/\r?\n/).length).padStart(5)}  server/controllers/${f}`);
}
