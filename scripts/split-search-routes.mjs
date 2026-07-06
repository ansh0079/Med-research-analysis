#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const srcPath = path.join(ROOT, 'server/routes/search.js');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

function fixImportPaths(text) {
    return text.replace(/require\('\.\.\//g, "require('../../");
}

const helpers = fixImportPaths(lines.slice(0, 74).join('\n'));
const helpersModule = helpers + `

module.exports = {
    clampLimit,
    attachApiKeyUser,
    setEdgeCacheHeaders,
    setNoStoreSearchHeaders,
    shouldAutoSeedFromSearch,
    isDev,
    CROSSREF_BASE,
};
`;

const moduleImports = fixImportPaths(lines.slice(5, 35).join('\n'));
const contextBody = slice(77, 329);
const sourceRoutes = slice(331, 471);
const unifiedRoutes = slice(472, 898);
const intelligenceRoutes = slice(899, 978);
const knowledgeRoutes = slice(980, 1490);

const ctxKeys = [
    'serverConfig', 'db', 'cache', 'rateLimit', 'requireJson', 'requireAuthJwt', 'requireRole',
    'dailySearchLimit', 'f', 'proxy', 'queueFullTextIndexing', 'buildAgentGuidance',
    'safeNormalizeTopic', 'safeDbList', 'buildSynapseGraphForTopic', 'buildTopicIntelligence',
    'buildCuratedEvidenceArticles', 'applyTeachingObjectSearchBoost',
];
const ctxReturn = ctxKeys.map((k) => '        ' + k).join(',\n');
const sharedRequires = `const {
    clampLimit,
    attachApiKeyUser,
    setEdgeCacheHeaders,
    setNoStoreSearchHeaders,
    shouldAutoSeedFromSearch,
    isDev,
    CROSSREF_BASE,
} = require('./searchHelpers');
${moduleImports}`;

function wrapRegistrar(name, routeBody) {
    return [
        sharedRequires,
        '',
        '/**',
        ' * @param {import(\'express\').Application} app',
        ' * @param {ReturnType<import(\'./createSearchRouteContext\').createSearchRouteContext>} ctx',
        ' */',
        'function ' + name + '(app, ctx) {',
        '    const {',
        ctxReturn + ',',
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
    sharedRequires,
    '',
    'function createSearchRouteContext(_app, deps) {',
    contextBody,
    '    return {',
    '        deps,',
    ctxReturn + ',',
    '    };',
    '}',
    '',
    'module.exports = { createSearchRouteContext };',
    '',
].join('\n');

const orchestrator = [
    "const { createSearchRouteContext } = require('./search/createSearchRouteContext');",
    "const { registerSourceSearchRoutes } = require('./search/registerSourceSearchRoutes');",
    "const { registerUnifiedSearchRoutes } = require('./search/registerUnifiedSearchRoutes');",
    "const { registerSearchIntelligenceRoutes } = require('./search/registerSearchIntelligenceRoutes');",
    "const { registerKnowledgeRoutes } = require('./search/registerKnowledgeRoutes');",
    '',
    'function registerSearchRoutes(app, deps) {',
    '    const ctx = createSearchRouteContext(app, deps);',
    '    registerSourceSearchRoutes(app, ctx);',
    '    registerUnifiedSearchRoutes(app, ctx);',
    '    registerSearchIntelligenceRoutes(app, ctx);',
    '    registerKnowledgeRoutes(app, ctx);',
    '}',
    '',
    'module.exports = { registerSearchRoutes };',
    '',
].join('\n');

const dir = path.join(ROOT, 'server/routes/search');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'searchHelpers.js'), helpersModule);
fs.writeFileSync(path.join(dir, 'createSearchRouteContext.js'), createContext);
fs.writeFileSync(path.join(dir, 'registerSourceSearchRoutes.js'), wrapRegistrar('registerSourceSearchRoutes', sourceRoutes));
fs.writeFileSync(path.join(dir, 'registerUnifiedSearchRoutes.js'), wrapRegistrar('registerUnifiedSearchRoutes', unifiedRoutes));
fs.writeFileSync(path.join(dir, 'registerSearchIntelligenceRoutes.js'), wrapRegistrar('registerSearchIntelligenceRoutes', intelligenceRoutes));
fs.writeFileSync(path.join(dir, 'registerKnowledgeRoutes.js'), wrapRegistrar('registerKnowledgeRoutes', knowledgeRoutes));
fs.writeFileSync(path.join(ROOT, 'server/routes/search.js'), orchestrator);

console.log('Split search.js complete');
for (const f of ['search.js', ...fs.readdirSync(dir).map((n) => 'search/' + n)]) {
    const p = path.join(ROOT, 'server/routes', f);
    console.log(String(fs.readFileSync(p, 'utf8').split(/\r?\n/).length).padStart(5) + '  server/routes/' + f);
}
