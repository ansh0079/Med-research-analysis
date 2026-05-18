'use strict';

/**
 * One-time / on-demand splitter: reads monolithic database/index input and writes
 * DatabaseCore.js + mixins/*.js. Run from repo root: node database/build-layer.cjs
 *
 * Default input: database/index.monolith.js (create by copying index.js before replacing)
 */
const fs = require('fs');
const path = require('path');

const dbDir = __dirname;
const inputPath = process.argv[2] || path.join(dbDir, 'index.monolith.js');

if (!fs.existsSync(inputPath)) {
    console.error('Missing input file:', inputPath);
    console.error('Copy your monolithic database/index.js to database/index.monolith.js first.');
    process.exit(1);
}

const lines = fs.readFileSync(inputPath, 'utf8').split(/\n/);

function unindentBlock(start1, end1) {
    const slice = lines.slice(start1 - 1, end1);
    return slice.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}

// Core class body: line 38 (class Database {) through line 383 (end of cacheArticle)
const coreHeader = `// ==========================================
// Database core — connection, SQL helpers, search history helpers
// ==========================================

const { Pool } = require('pg');
const { Kysely, SqliteDialect, PostgresDialect } = require('kysely');
const path = require('path');
const fs = require('fs');
const { buildPgPoolConfig, buildPgVectorPoolConfig } = require('../server/utils/pgPoolOptions');
const { runExternalSqliteMigrations } = require('./lib/helpers');

`;

const coreBody = unindentBlock(39, 384);
const databaseCore =
    coreHeader +
    'class Database {\n' +
    coreBody +
    '\n}\n\nmodule.exports = Database;\n';

fs.writeFileSync(path.join(dbDir, 'DatabaseCore.js'), databaseCore);

const mixinHeader = `'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

`;

const ranges = [
    [386, 935, 'mixins/m01-search-topic-knowledge.js'],
    [936, 1563, 'mixins/m02-guidelines-learning-quiz-adaptive.js'],
    [1564, 1881, 'mixins/m03-bouquet-learning-observability-prelude.js'],
    [1882, 2348, 'mixins/m04-interactions-impressions-study-runs.js'],
    [2351, 2815, 'mixins/m05-curriculum-agent-case-mastery.js'],
    [2817, 3295, 'mixins/m06-sessions-saved-cache-teams.js'],
    [3298, 3705, 'mixins/m07-analytics-vector-cache-ai-jobs.js'],
    [3707, 4062, 'mixins/m08-review-audit-billing-cpd.js'],
];

for (const [a, b, rel] of ranges) {
    const body = unindentBlock(a, b);
    const out = mixinHeader + 'module.exports = (Sup) => class extends Sup {\n' + body + '\n};\n';
    const fp = path.join(dbDir, rel);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, out);
}

const portfolioPath = path.join(dbDir, 'mixins/m08-review-audit-billing-cpd.js');
let m8 = fs.readFileSync(portfolioPath, 'utf8');
m8 = m8.replace(
    `const row = await this.get(\`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?\`, [reflectionId, userId]);`,
    `const reflectionId = result.lastID || result.id;\n        const row = await this.get(\`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?\`, [reflectionId, userId]);`
);
fs.writeFileSync(portfolioPath, m8);

console.log('Wrote DatabaseCore.js and', ranges.length, 'mixins from', inputPath);
