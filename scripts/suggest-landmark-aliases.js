#!/usr/bin/env node
'use strict';

/**
 * Suggest data-driven landmark alias seeds from gold gaps and/or eval landmark misses.
 *
 * Usage:
 *   node scripts/suggest-landmark-aliases.js
 *   node scripts/suggest-landmark-aliases.js --eval eval-results/search-quality-gold-….json
 *   node scripts/suggest-landmark-aliases.js --write
 */

const fs = require('fs');
const path = require('path');
const { loadSearchGoldFixture } = require('./load-search-gold-fixture');
const {
    ALL_CLINICAL_QUERY_ALIAS_RULES,
} = require('../server/services/unifiedEvidenceSearch');
const {
    analyzeAliasCoverage,
    suggestSeedsFromLandmarkMisses,
    DEFAULT_SEEDS_PATH,
} = require('../server/services/clinicalQueryAliasSeeds');

function flag(name) {
    const args = process.argv.slice(2);
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : null;
}

function has(name) {
    return process.argv.slice(2).includes(name);
}

function main() {
    const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
    const coverage = analyzeAliasCoverage(ALL_CLINICAL_QUERY_ALIAS_RULES, fixture.queries);
    console.log(`Gold alias coverage: ${(coverage.coverageRatio * 100).toFixed(1)}% (${coverage.coveredCount}/${coverage.coveredCount + coverage.uncoveredCount})`);
    if (coverage.uncovered.length) {
        console.log('\nUncovered gold PMIDs:');
        coverage.uncovered.slice(0, 40).forEach((row) => {
            console.log(`  ${row.pmid}  ${row.query}`);
        });
    }

    const evalPath = flag('--eval');
    let missSuggestions = [];
    if (evalPath && fs.existsSync(evalPath)) {
        const evalJson = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
        const missQueries = evalJson.summary?.landmarkMisses || [];
        const missRows = (evalJson.results || [])
            .filter((r) => missQueries.includes(r.query) || r.landmarkHit === false)
            .map((r) => ({
                query: r.query,
                missingRelevantUids: r.missingRelevantUids || [],
                notes: 'eval landmark miss',
            }));
        missSuggestions = suggestSeedsFromLandmarkMisses(missRows);
        console.log(`\nEval miss suggestions: ${missSuggestions.length}`);
    }

    const gapSuggestions = suggestSeedsFromLandmarkMisses(
        coverage.uncovered.map((row) => ({
            query: row.query,
            relevantUids: [row.pmid],
            notes: row.notes,
        }))
    );

    const suggestions = [...gapSuggestions, ...missSuggestions];
    const outPath = path.join(process.cwd(), 'eval-results', `landmark-alias-suggestions-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), suggestions }, null, 2));
    console.log(`\nWrote ${suggestions.length} suggestions → ${outPath}`);
    console.log(`Merge reviewed seeds into ${DEFAULT_SEEDS_PATH}`);

    if (has('--write') && gapSuggestions.length) {
        console.log('--write is a dry-run helper only; review suggestions before merging into clinicalQueryAliasSeeds.json');
    }
}

main();
