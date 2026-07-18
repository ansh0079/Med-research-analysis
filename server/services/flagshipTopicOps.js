'use strict';

const fs = require('fs');
const path = require('path');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../utils/topicSynonyms');

function loadFlagshipConfig(configPath) {
    const resolved = configPath || path.join(__dirname, '../config/flagshipTopics.json');
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function defaultNormalize(topic) {
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

function flagshipMatchKeys(flagship, normalizeFn = defaultNormalize) {
    const keys = new Set();
    const primary = normalizeFn(flagship?.topic);
    if (primary) {
        keys.add(primary);
        expandNormalizedTopicKeys(primary, normalizeFn).forEach((k) => keys.add(k));
    }
    for (const alias of flagship?.aliases || []) {
        const n = normalizeFn(alias);
        if (!n) continue;
        keys.add(n);
        expandNormalizedTopicKeys(n, normalizeFn).forEach((k) => keys.add(k));
    }
    return [...keys].filter(Boolean);
}

function tokenSet(normalized) {
    return new Set(
        String(normalized || '')
            .split(/\s+/)
            .filter((t) => t.length >= 3 && !['and', 'the', 'for', 'with', 'from'].includes(t))
    );
}

function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter += 1;
    return inter / (a.size + b.size - inter);
}

/**
 * Strict near-duplicate match for curriculum rows under one flagship concept.
 * Avoids pulling in sibling disease modifiers (e.g. neutropenic sepsis → sepsis)
 * unless they are explicit aliases or high token overlap with the flagship title.
 */
function curriculumMatchesFlagship(displayName, flagship, {
    normalizeFn = defaultNormalize,
    fuzzy = false,
} = {}) {
    const n = normalizeFn(displayName);
    if (!n) return { match: false, reason: 'empty' };

    const exactKeys = new Set([
        normalizeFn(flagship.topic),
        ...(flagship.aliases || []).map((a) => normalizeFn(a)).filter(Boolean),
    ]);
    if (exactKeys.has(n)) return { match: true, reason: 'exact_alias', score: 1 };

    const flagTokens = tokenSet(normalizeFn(flagship.topic));
    const nameTokens = tokenSet(n);
    const overlap = jaccard(flagTokens, nameTokens);

    // Containment vs an explicit alias / title. Short single-token aliases
    // (e.g. "sepsis") require exact match so siblings like "neutropenic sepsis"
    // are not swallowed.
    for (const key of exactKeys) {
        if (!key || key.length < 4) continue;
        if (n === key) return { match: true, reason: 'exact_alias', score: 1 };
        const keyTokens = key.split(/\s+/).filter(Boolean);
        const shortAlias = keyTokens.length === 1 || key.length <= 12;
        if (shortAlias) continue;
        if (n.includes(key) && n.length <= Math.max(key.length + 24, Math.ceil(key.length * 1.55))) {
            return { match: true, reason: 'contained_alias', score: 0.9 };
        }
        if (key.includes(n) && key.length <= Math.max(n.length + 24, Math.ceil(n.length * 1.55))) {
            return { match: true, reason: 'alias_contains_name', score: 0.85 };
        }
    }

    if (fuzzy && overlap >= 0.55 && nameTokens.size >= 2) {
        return { match: true, reason: 'fuzzy_jaccard', score: overlap };
    }

    return { match: false, reason: 'no_match', score: overlap };
}

function pickClusterWinner(candidates, flagship, normalizeFn = defaultNormalize) {
    const target = normalizeFn(flagship.topic);
    const scored = candidates.map((row) => {
        const n = normalizeFn(row.display_name || row.displayName);
        const exact = n === target ? 1000 : 0;
        const content =
            Number(row.guidelineCount || 0) * 3
            + Number(row.claimCount || 0)
            + Number(row.teachingCount || 0) * 2
            + Number(row.sourceArticles || 0) * 4
            + (row.hasKnowledge ? 20 : 0);
        const matchScore = Number(row.matchScore || 0) * 10;
        return { row, score: exact + content + matchScore };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.row || null;
}

function buildLandmarkSourceArticles(landmarkPmids = []) {
    return (landmarkPmids || [])
        .map((pmid, index) => {
            const id = String(pmid || '').replace(/\D/g, '');
            if (!id) return null;
            return {
                sourceIndex: index + 1,
                uid: `pubmed-${id}`,
                pmid: id,
                title: `Landmark PMID ${id}`,
                source: 'pubmed',
                pubdate: null,
                landmark: true,
            };
        })
        .filter(Boolean)
        .slice(0, 40);
}

function buildStubKnowledge(topic, flagship = {}) {
    const pmids = flagship.landmarkPmids || [];
    return {
        mentorMessage: `${topic}: curated landmark seed pending fuller AI/human synopsis refresh.`,
        teachingPoints: (flagship.searchQueries || []).slice(0, 3).map((q) => ({
            point: q,
            evidence: 'flagship search query seed',
        })),
        seminalPapers: pmids.slice(0, 5).map((pmid) => ({
            pmid: String(pmid),
            note: 'Configured landmark PMID',
        })),
        keywords: [topic, ...(flagship.aliases || [])].filter(Boolean).slice(0, 20),
        seededFrom: 'flagshipTopics.json',
        seededAt: new Date().toISOString(),
    };
}

function mergeSourceArticles(existing = [], incoming = []) {
    const seen = new Set();
    const out = [];
    for (const item of [...(existing || []), ...(incoming || [])]) {
        const key = String(item?.uid || item?.pmid || item?.doi || '').toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out.slice(0, 40);
}

module.exports = {
    loadFlagshipConfig,
    defaultNormalize,
    flagshipMatchKeys,
    curriculumMatchesFlagship,
    pickClusterWinner,
    buildLandmarkSourceArticles,
    buildStubKnowledge,
    mergeSourceArticles,
    resolveCanonicalNormalized,
};
