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
    fixture.queryCount = Array.isArray(fixture.queries) ? fixture.queries.length : 0;
    return fixture;
}

module.exports = { loadSearchGoldFixture };
