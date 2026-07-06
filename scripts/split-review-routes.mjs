#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const srcPath = path.join(ROOT, 'server/controllers/reviewRoutes.js');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

function fixImportPaths(text) {
    return text.replace(/require\('\.\.\//g, "require('../../");
}

const headerImports = fixImportPaths(lines.slice(0, 22).join('\n'));
const contextBody = slice(29, 295);
const reviewRoutes = slice(297, 657);
const caseRoutes = slice(659, 1284);

const ctxReturn = [
    'serverConfig',
    'db',
    'cache',
    'rateLimit',
    'requireJson',
    'requireAuthJwt',
    'requireCaseAuth',
    'requirePaidFeature',
    'validateBody',
    'schemas',
    'auditLog',
    'fetchImpl',
    'ai',
    'reviews',
    'mcqValidator',
    'validateCaseMcqs',
    'assertTeamMember',
    'resolveOwner',
    'requireReviewAccess',
    'callProvider',
    'normalizeLearningMode',
    'firstArticleTitle',
    'fallbackLearningCase',
    'fallbackTeachingVignette',
].map((k) => `        ${k}`).join(',\n');

const ctxDestructuring = ctxReturn;

function wrapRegistrar(name, routeBody) {
    return [
        headerImports,
        '',
        '/**',
        ' * @param {import(\'express\').Application} app',
        ' * @param {ReturnType<import(\'./createReviewRouteContext\').createReviewRouteContext>} ctx',
        ' */',
        'function ' + name + '(app, ctx) {',
        '    const {',
        ctxDestructuring + ',',
        '    } = ctx;',
        '',
        routeBody,
        '}',
        '',
        'module.exports = { ' + name + ' };',
        '',
    ].join('\n');
}

const createContext = [
    headerImports,
    '',
    '/**',
    ' * @param {object} deps',
    ' */',
    'function createReviewRouteContext(deps) {',
    contextBody,
    '    return {',
    '        deps,',
    ctxReturn + ',',
    '    };',
    '}',
    '',
    'module.exports = { createReviewRouteContext };',
    '',
].join('\n');

const orchestrator = [
    "const { createReviewRouteContext } = require('./review/createReviewRouteContext');",
    "const { registerReviewCrudRoutes } = require('./review/registerReviewCrudRoutes');",
    "const { registerCaseRoutes } = require('./review/registerCaseRoutes');",
    '',
    '/**',
    ' * @param {import(\'express\').Application} app',
    ' * @param {object} deps',
    ' */',
    'function registerReviewRoutes(app, deps) {',
    '    const ctx = createReviewRouteContext(deps);',
    '    registerReviewCrudRoutes(app, ctx);',
    '    registerCaseRoutes(app, ctx);',
    '}',
    '',
    'module.exports = { registerReviewRoutes };',
    '',
].join('\n');

const dir = path.join(ROOT, 'server/controllers/review');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'createReviewRouteContext.js'), createContext);
fs.writeFileSync(path.join(dir, 'registerReviewCrudRoutes.js'), wrapRegistrar('registerReviewCrudRoutes', reviewRoutes));
fs.writeFileSync(path.join(dir, 'registerCaseRoutes.js'), wrapRegistrar('registerCaseRoutes', caseRoutes));
fs.writeFileSync(path.join(ROOT, 'server/controllers/reviewRoutes.js'), orchestrator);

console.log('Split reviewRoutes.js complete');
for (const f of ['reviewRoutes.js', ...fs.readdirSync(dir).map((n) => 'review/' + n)]) {
    const p = path.join(ROOT, 'server/controllers', f);
    const n = fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
    console.log(String(n).padStart(5) + '  server/controllers/' + f);
}
