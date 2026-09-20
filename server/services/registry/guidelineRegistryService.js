'use strict';

/**
 * Guideline registry service.
 *
 * The registry is a verified, versioned projection over topic_guidelines rows
 * (see migration 098). This module does two things:
 *   - proposeRegistryCandidates: group the rows already stored for a condition into
 *     candidate entries by issuer + edition + population, for a curator to verify.
 *     Nothing it writes is served until a named reviewer verifies it.
 *   - registryArticlesForQuery: turn verified entries for the resolved condition into
 *     guideline-lane results tagged _guidelineRegistryMatch, so the 'registry'
 *     eligibility route is a real path rather than a label.
 */

const { expandNormalizedTopicKeys } = require('../../utils/topicSynonyms');

const CONCEPT_CACHE_TTL_MS = 60 * 1000;
let conceptCache = { at: 0, names: [] };

function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function clearRegistryConceptCache() {
    conceptCache = { at: 0, names: [] };
}

function containsPhrase(haystack, phrase) {
    if (!haystack || !phrase) return false;
    return ` ${haystack} `.includes(` ${phrase} `);
}

/**
 * Which verified registry concepts does this query name? Matches the concept's
 * normalized name as a whole phrase in the query or in any synonym expansion of it,
 * so "AKI management" reaches "acute kidney injury" and "diagnosis of acute kidney
 * injury" does too.
 */
async function resolveRegistryConcepts(db, query, { now = Date.now() } = {}) {
    if (!db || typeof db.listVerifiedRegistryConcepts !== 'function') return [];
    if (now - conceptCache.at > CONCEPT_CACHE_TTL_MS) {
        conceptCache = { at: now, names: await db.listVerifiedRegistryConcepts().catch(() => []) };
    }
    if (!conceptCache.names.length) return [];
    const normalized = normalizeText(query);
    if (!normalized) return [];
    const haystacks = new Set([normalized, ...expandNormalizedTopicKeys(normalized, normalizeText)]);
    return conceptCache.names.filter((name) => [...haystacks].some((h) => containsPhrase(h, name)));
}

function registryEntryToArticle(entry) {
    const recs = Array.isArray(entry.recommendations) ? entry.recommendations : [];
    const edition = entry.year || entry.version || '';
    const scopeBits = [entry.population, entry.scope, entry.jurisdiction]
        .filter((v) => v && v !== 'unspecified');
    const abstract = recs
        .map((r) => String(r.recommendation_text || '').trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(' ')
        .slice(0, 900);
    return {
        uid: `registry:${entry.id}`,
        title: `${entry.issuer} ${entry.canonical_name} guideline${edition ? ` (${edition})` : ''}`,
        abstract: abstract || `${entry.issuer} guideline for ${entry.canonical_name}.`,
        year: entry.year ? Number(entry.year) : null,
        url: entry.source_url || null,
        source: 'registry',
        journal: entry.issuer,
        pubtype: ['Practice Guideline'],
        _guidelineRegistryMatch: true,
        _eligibilityRoute: 'registry',
        _registry: {
            entryId: entry.id,
            concept: entry.canonical_name,
            issuer: entry.issuer,
            edition: edition || null,
            scope: scopeBits,
            verifiedBy: entry.verified_by || null,
            verifiedAt: entry.verified_at || null,
            recommendationCount: recs.length,
        },
    };
}

/** Guideline-lane articles for verified registry entries the query resolves to. Never throws. */
async function registryArticlesForQuery(db, query, options = {}) {
    try {
        const concepts = await resolveRegistryConcepts(db, query, options);
        if (!concepts.length) return [];
        const entries = await db.getVerifiedRegistryForConcepts(concepts);
        return entries.map(registryEntryToArticle);
    } catch {
        return [];
    }
}

/** Merge registry articles ahead of retrieved ones, dropping any retrieved duplicate uid. */
function mergeRegistryArticles(articles, registryArticles) {
    if (!registryArticles?.length) return articles;
    const seen = new Set(registryArticles.map((a) => a.uid));
    return [...registryArticles, ...(articles || []).filter((a) => !seen.has(a.uid))];
}

/**
 * Group the topic_guidelines rows stored for a condition into candidate registry entries.
 * A row can only be proposed if it names its issuer, a year and a source URL: those are
 * the fields a curator needs to verify it, and the write policy blocks entries without them.
 *
 * @returns {{ proposed: object[], skipped: { reason: string, guidelineId: number }[] }}
 */
async function proposeRegistryCandidates(db, { conceptName, topicKeys = [], jurisdiction = 'unspecified' } = {}) {
    const keys = [...new Set([normalizeText(conceptName), ...topicKeys.map(normalizeText)].filter(Boolean))];
    if (!keys.length) return { proposed: [], skipped: [] };
    const placeholders = keys.map(() => '?').join(',');
    const rows = await db.all(
        `SELECT id, source_body, source_year, source_url, population
         FROM topic_guidelines
         WHERE normalized_topic IN (${placeholders}) AND superseded_by_id IS NULL`,
        keys
    );
    const groups = new Map();
    const skipped = [];
    for (const row of rows) {
        if (!String(row.source_body || '').trim()) { skipped.push({ reason: 'no_issuer', guidelineId: row.id }); continue; }
        if (!row.source_year) { skipped.push({ reason: 'no_year', guidelineId: row.id }); continue; }
        if (!String(row.source_url || '').trim()) { skipped.push({ reason: 'no_source_url', guidelineId: row.id }); continue; }
        const population = String(row.population || '').trim() || 'unspecified';
        const key = [normalizeText(row.source_body), row.source_year, normalizeText(population), row.source_url].join('|');
        if (!groups.has(key)) {
            groups.set(key, {
                issuer: String(row.source_body).trim(),
                year: Number(row.source_year),
                sourceUrl: String(row.source_url).trim(),
                population,
                guidelineIds: [],
            });
        }
        groups.get(key).guidelineIds.push(row.id);
    }
    const proposed = [];
    for (const group of groups.values()) {
        const entry = await db.upsertRegistryEntry({
            conceptName,
            issuer: group.issuer,
            jurisdiction,
            population: group.population,
            year: group.year,
            sourceUrl: group.sourceUrl,
            guidelineIds: group.guidelineIds,
            proposedFrom: 'topic_guidelines',
        });
        if (entry) proposed.push({ ...entry, issuer: group.issuer, year: group.year });
    }
    return { proposed, skipped };
}

module.exports = {
    clearRegistryConceptCache,
    resolveRegistryConcepts,
    registryEntryToArticle,
    registryArticlesForQuery,
    mergeRegistryArticles,
    proposeRegistryCandidates,
};
