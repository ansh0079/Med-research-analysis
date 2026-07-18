'use strict';

const fs = require('fs');
const path = require('path');

function applyQueryOverrides(queries, overrides = []) {
    if (!Array.isArray(overrides) || overrides.length === 0) return queries;
    const overrideMap = new Map(overrides.map((row) => [String(row.query || '').trim(), row]));
    return queries.map((querySpec) => {
        const override = overrideMap.get(String(querySpec.query || '').trim());
        if (!override) return querySpec;
        return {
            ...querySpec,
            ...override,
            relevantUids: override.relevantUids || querySpec.relevantUids,
            offTopicUids: override.offTopicUids || querySpec.offTopicUids,
            requiredTypes: override.requiredTypes || querySpec.requiredTypes,
        };
    });
}

/**
 * Normalize graded relevance objects `{ uid, grade }` into string UIDs + relevanceGrades map.
 */
function normalizeQueryRelevantUids(querySpec = {}) {
    const relevanceGrades = { ...(querySpec.relevanceGrades || {}) };
    const relevantUids = [];
    for (const entry of querySpec.relevantUids || []) {
        if (typeof entry === 'string' || typeof entry === 'number') {
            const uid = String(entry).trim();
            if (uid) relevantUids.push(uid);
            continue;
        }
        if (entry && typeof entry === 'object') {
            const uid = String(entry.uid || entry.pmid || entry.id || '').trim();
            if (!uid) continue;
            relevantUids.push(uid);
            if (entry.grade != null || entry.relevance != null || entry.score != null) {
                relevanceGrades[uid] = Math.max(
                    0,
                    Math.min(3, Number(entry.grade ?? entry.relevance ?? entry.score ?? 1) || 1)
                );
            }
        }
    }
    return {
        ...querySpec,
        relevantUids,
        relevanceGrades,
    };
}

function loadSearchGoldFixture(primaryPath, options = {}) {
    const root = options.root || process.cwd();
    const fullPrimary = path.resolve(root, primaryPath);
    const fixture = JSON.parse(fs.readFileSync(fullPrimary, 'utf8'));
    const expansionPath = options.expansionPath
        || path.join(path.dirname(fullPrimary), 'search-quality-gold-expansion.json');
    if (fs.existsSync(expansionPath)) {
        const expansion = JSON.parse(fs.readFileSync(expansionPath, 'utf8'));
        fixture.queries = applyQueryOverrides(fixture.queries || [], expansion.queryOverrides || []);
        const extraQueries = Array.isArray(expansion.queries) ? expansion.queries : [];
        fixture.queries = [...(fixture.queries || []), ...extraQueries];
        fixture.expansionLoaded = expansionPath;
        fixture.expansionQueryCount = extraQueries.length;
        fixture.overrideCount = Array.isArray(expansion.queryOverrides) ? expansion.queryOverrides.length : 0;
    }
    fixture.queries = (fixture.queries || []).map(normalizeQueryRelevantUids);
    fixture.queryCount = Array.isArray(fixture.queries) ? fixture.queries.length : 0;
    return fixture;
}

module.exports = { loadSearchGoldFixture, normalizeQueryRelevantUids, applyQueryOverrides };
