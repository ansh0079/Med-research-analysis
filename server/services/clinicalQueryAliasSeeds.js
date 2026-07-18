'use strict';

/**
 * Compile data-driven landmark alias seeds (JSON) into runtime rules
 * compatible with CLINICAL_QUERY_ALIAS_RULES.
 */

const path = require('path');
const fs = require('fs');

const DEFAULT_SEEDS_PATH = path.join(__dirname, '../config/clinicalQueryAliasSeeds.json');

function compileSeedRule(seed = {}) {
    const patterns = Array.isArray(seed.all) ? seed.all : [];
    const all = patterns
        .map((p) => {
            if (p instanceof RegExp) return p;
            try {
                return new RegExp(String(p), 'i');
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    if (!all.length) return null;
    return {
        all,
        aliases: Array.isArray(seed.aliases) ? seed.aliases.map(String).filter(Boolean) : [],
        pmids: Array.isArray(seed.pmids) ? seed.pmids.map(String).filter(Boolean) : [],
        source: seed.source || 'seed',
    };
}

function loadClinicalQueryAliasSeeds(seedsPath = DEFAULT_SEEDS_PATH) {
    if (!fs.existsSync(seedsPath)) return [];
    const raw = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
    const seeds = Array.isArray(raw?.seeds) ? raw.seeds : [];
    return seeds.map(compileSeedRule).filter(Boolean);
}

/**
 * Suggest seed stubs from labelled landmark misses (eval output or gold gaps).
 * @param {Array<{ query: string, missingRelevantUids?: string[], relevantUids?: string[], notes?: string }>} misses
 */
function suggestSeedsFromLandmarkMisses(misses = []) {
    return (Array.isArray(misses) ? misses : []).map((row) => {
        const query = String(row.query || '').trim();
        const pmids = (row.missingRelevantUids || row.relevantUids || [])
            .map((u) => (typeof u === 'object' ? u?.uid || u?.pmid : u))
            .map(String)
            .filter(Boolean);
        const tokens = query
            .toLowerCase()
            .split(/[^a-z0-9+-]+/)
            .filter((t) => t.length >= 4)
            .slice(0, 6);
        const all = tokens.slice(0, 2).map((t) => `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        return {
            source: 'suggested_from_miss',
            query,
            notes: row.notes || '',
            all: all.length ? all : ['\\bTODO\\b'],
            aliases: tokens.slice(0, 2).map((t) => t.toUpperCase()),
            pmids,
        };
    }).filter((s) => s.pmids.length > 0);
}

function analyzeAliasCoverage(rules = [], queries = []) {
    const pinned = new Set();
    for (const rule of rules) {
        for (const pmid of rule.pmids || []) pinned.add(String(pmid));
    }
    const uncovered = [];
    const covered = [];
    for (const q of queries) {
        const category = String(q.category || '');
        const uids = (q.relevantUids || [])
            .map((u) => (typeof u === 'object' ? u?.uid || u?.pmid : u))
            .map(String)
            .filter(Boolean);
        for (const pmid of uids) {
            const row = { query: q.query, pmid, category, notes: q.notes || '' };
            if (pinned.has(pmid)) covered.push(row);
            else uncovered.push(row);
        }
    }
    return {
        pinnedPmidCount: pinned.size,
        coveredCount: covered.length,
        uncoveredCount: uncovered.length,
        coverageRatio: (covered.length + uncovered.length) > 0
            ? covered.length / (covered.length + uncovered.length)
            : 1,
        uncovered,
        covered,
    };
}

function ruleMatchesQuery(rule, queryText) {
    const text = String(queryText || '');
    return Array.isArray(rule?.all) && rule.all.every((pattern) => pattern.test(text));
}

function pinnedPmidsForQuery(rules, query) {
    const out = new Set();
    for (const rule of rules) {
        if (Array.isArray(rule.pmids) && ruleMatchesQuery(rule, query)) {
            rule.pmids.forEach((pmid) => out.add(String(pmid)));
        }
    }
    return [...out];
}

module.exports = {
    DEFAULT_SEEDS_PATH,
    compileSeedRule,
    loadClinicalQueryAliasSeeds,
    suggestSeedsFromLandmarkMisses,
    analyzeAliasCoverage,
    ruleMatchesQuery,
    pinnedPmidsForQuery,
};
