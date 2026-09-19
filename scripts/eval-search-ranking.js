#!/usr/bin/env node
/**
 * Offline ranking eval — frozen candidates, no PubMed/OpenAlex.
 *
 * Live `eval:search-quality` (and even `:gold`) hits providers ~40 times per
 * run. Landmark hit-rate has swung 1.000 → 0.704 → 0.426 on identical code.
 * Do not revert ranking changes on the strength of a live run.
 *
 * Usage:
 *   npm run eval:search-ranking
 *   node scripts/eval-search-ranking.js
 */

const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(
    process.execPath,
    [
        require.resolve('jest/bin/jest'),
        '--testPathPatterns=searchAbbreviationRanking|searchRankingTune|guidelineTopicFallback',
        '--no-coverage',
    ],
    {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
    }
);

if (result.status !== 0) {
    console.error('\nOffline ranking eval failed. This is the signal that a ranking fix worked or did not.');
    console.error('Do not use live PubMed/OpenAlex hit-rate as a substitute.\n');
}
process.exit(result.status == null ? 1 : result.status);
