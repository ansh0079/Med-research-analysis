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
function phenotypeConflict(flagshipTopic, displayNormalized) {
    const f = String(flagshipTopic || '').toLowerCase();
    const d = String(displayNormalized || '').toLowerCase();
    const flagReduced = /\bhfref\b|reduced ejection/.test(f);
    const flagPreserved = /\bhfpef\b|preserved ejection/.test(f);
    const nameReduced = /\bhfref\b|reduced ejection/.test(d);
    const namePreserved = /\bhfpef\b|preserved ejection/.test(d);
    if (flagReduced && namePreserved) return true;
    if (flagPreserved && nameReduced) return true;
    return false;
}

function curriculumMatchesFlagship(displayName, flagship, {
    normalizeFn = defaultNormalize,
    fuzzy = false,
} = {}) {
    const n = normalizeFn(displayName);
    if (!n) return { match: false, reason: 'empty' };
    if (phenotypeConflict(flagship.topic, n)) {
        return { match: false, reason: 'phenotype_conflict', score: 0 };
    }

    const exactKeys = new Set([
        normalizeFn(flagship.topic),
        ...(flagship.aliases || []).map((a) => normalizeFn(a)).filter(Boolean),
    ]);
    // Also accept configured synonym expansions for the flagship title only (not short tokens alone).
    for (const key of flagshipMatchKeys(flagship, normalizeFn)) {
        if (key && key.split(/\s+/).length >= 2) exactKeys.add(key);
    }
    if (exactKeys.has(n)) return { match: true, reason: 'exact_alias', score: 1 };

    const flagTokens = tokenSet(normalizeFn(flagship.topic));
    const nameTokens = tokenSet(n);
    const overlap = jaccard(flagTokens, nameTokens);

    // Short codes safe for "CODE: subtitle" curriculum titles only.
    const SHORT_PREFIX_ALLOW = new Set(['ards', 'copd', 'aecopd', 'aki', 'ckd', 'cap', 'hap', 'hfref', 'hfpef']);
    // Mid-title token hits (GDMT … HFrEF). Do NOT include ards/copd — too many sibling rows.
    const MID_TITLE_SHORT_ALLOW = new Set(['hfref', 'hfpef', 'aecopd']);

    for (const key of exactKeys) {
        if (!key || key.length < 4) continue;
        if (n === key) return { match: true, reason: 'exact_alias', score: 1 };
        const keyTokens = key.split(/\s+/).filter(Boolean);
        const shortAlias = keyTokens.length === 1 || key.length <= 12;
        if (shortAlias) {
            if (
                SHORT_PREFIX_ALLOW.has(key)
                && n.startsWith(key)
                && /^[:\s,-]/.test(n.slice(key.length))
            ) {
                return { match: true, reason: 'prefix_short_alias', score: 0.92 };
            }
            if (MID_TITLE_SHORT_ALLOW.has(key) && nameTokens.has(key)) {
                return { match: true, reason: 'allowed_short_token', score: 0.84 };
            }
            continue;
        }
        // Curriculum rows often look like "Concept: long subtitle…".
        if (n.startsWith(key) && (n.length === key.length || /^[:\s,-]/.test(n.slice(key.length)))) {
            return { match: true, reason: 'prefix_alias', score: 0.95 };
        }
        // Require the alias to dominate the display name so
        // "acute lung injury" does not pull in TRALI / similar siblings.
        const ratio = Math.min(n.length, key.length) / Math.max(n.length, key.length);
        if (n.includes(key) && ratio >= 0.62) {
            return { match: true, reason: 'contained_alias', score: 0.9 };
        }
        if (key.includes(n) && ratio >= 0.62) {
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
        const startsWithTarget = n.startsWith(target) ? 400 : 0;
        const prefixShort = String(row.matchReason || '').startsWith('prefix') ? 300 : 0;
        const content =
            Number(row.guidelineCount || 0) * 3
            + Number(row.claimCount || 0)
            + Number(row.teachingCount || 0) * 2
            + Number(row.sourceArticles || 0) * 4
            + (row.hasKnowledge ? 20 : 0);
        const matchScore = Number(row.matchScore || 0) * 10;
        return { row, score: exact + startsWithTarget + prefixShort + content + matchScore };
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
