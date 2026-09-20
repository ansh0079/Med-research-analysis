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
const { queryPopulationCue, queryJurisdictionCue } = require('../../utils/queryScopeCues');
const COHORT = require('../../config/registryCohort.json');

const CONCEPT_CACHE_TTL_MS = 60 * 1000;
let conceptCache = { at: 0, names: [] };

function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const COHORT_ALIAS_PHRASES = (() => {
    const map = new Map();
    for (const condition of COHORT.conditions || []) {
        const name = normalizeText(condition.conceptName);
        if (!name) continue;
        const phrases = new Set([name]);
        for (const alias of condition.aliases || []) {
            const phrase = normalizeText(alias);
            if (phrase) phrases.add(phrase);
        }
        map.set(name, [...phrases]);
    }
    return map;
})();

function clearRegistryConceptCache() {
    conceptCache = { at: 0, names: [] };
}

function containsPhrase(haystack, phrase) {
    if (!haystack || !phrase) return false;
    return ` ${haystack} `.includes(` ${phrase} `);
}

function phrasesForConcept(name) {
    return COHORT_ALIAS_PHRASES.get(name) || [name];
}

function entryMatchesQueryScope(entry, query) {
    const popCue = queryPopulationCue(query);
    const jurCue = queryJurisdictionCue(query);
    const pop = String(entry.population || '').toLowerCase();
    const scope = String(entry.scope || '').toLowerCase();
    const jur = String(entry.jurisdiction || '').toLowerCase();
    const popScope = `${pop} ${scope}`;

    if (popCue === 'pregnancy') {
        const pregnancyish = /pregnan|obstetric|antenatal/.test(popScope);
        if (!pregnancyish && (/adult/.test(popScope) || /paediatric|pediatric|child/.test(popScope))) {
            return false;
        }
    }
    if (popCue === 'paediatric') {
        if (/adult/.test(popScope) && !/paediatric|pediatric|child/.test(popScope)) return false;
        if (/pregnan/.test(popScope) && !/paediatric|pediatric|child/.test(popScope)) return false;
    }
    if (popCue === 'adult') {
        if (/paediatric|pediatric|child|pregnan/.test(popScope) && !/adult/.test(popScope)) return false;
    }
    if (jurCue && jur && jur !== 'unspecified' && jur !== jurCue) return false;
    return true;
}

function inferJurisdiction({ sourceRegion, issuer } = {}) {
    const region = String(sourceRegion || '').trim().toLowerCase();
    if (region && region !== 'unspecified') return region;
    const body = String(issuer || '').toLowerCase();
    if (/\bnice\b|\bnhs\b|\bsign\b/.test(body)) return 'uk';
    if (/\baha\b|\bacc\b|\bacp\b|\bidsa\b|\bcdc\b/.test(body)) return 'us';
    if (/\besc\b|\bers\b|\beasl\b|\besmo\b/.test(body)) return 'europe';
    if (/\bkdigo\b|\bwho\b/.test(body)) return 'international';
    return 'unspecified';
}

function inferScope({ population, topic, recommendationText } = {}) {
    const text = `${population || ''} ${topic || ''} ${recommendationText || ''}`.toLowerCase();
    if (/\bpregnan|antenatal|obstetric|pre-eclampsia|preeclampsia/.test(text)) return 'pregnancy';
    if (/\bpaediatric|pediatric|children|neonat|infant/.test(text)) return 'paediatric';
    if (/\badult/.test(text)) return 'adult';
    return 'unspecified';
}

/**
 * Which verified registry concepts does this query name? Matches the concept's
 * normalized name, cohort aliases (HFrEF, AF, …), or synonym expansions.
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
    const matched = conceptCache.names.filter((name) => {
        const phrases = phrasesForConcept(name);
        return [...haystacks].some((h) => phrases.some((p) => containsPhrase(h, p)));
    });
    return matched.filter((name) => !matched.some((other) => (
        other !== name && other.includes(name) && [...haystacks].some((h) => containsPhrase(h, other))
    )));
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
        return entries
            .filter((entry) => entryMatchesQueryScope(entry, query))
            .map(registryEntryToArticle);
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
async function proposeRegistryCandidates(db, { conceptName, topicKeys = [], jurisdiction = null } = {}) {
    const keys = [...new Set([normalizeText(conceptName), ...topicKeys.map(normalizeText)].filter(Boolean))];
    if (!keys.length) return { proposed: [], skipped: [] };
    const placeholders = keys.map(() => '?').join(',');
    const rows = await db.all(
        `SELECT id, topic, source_body, source_region, source_year, source_url, population, recommendation_text
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
        const inferredJurisdiction = jurisdiction || inferJurisdiction({
            sourceRegion: row.source_region,
            issuer: row.source_body,
        });
        const scope = inferScope({
            population,
            topic: row.topic,
            recommendationText: row.recommendation_text,
        });
        const key = [
            normalizeText(row.source_body),
            row.source_year,
            normalizeText(population),
            inferredJurisdiction,
            scope,
            row.source_url,
        ].join('|');
        if (!groups.has(key)) {
            groups.set(key, {
                issuer: String(row.source_body).trim(),
                year: Number(row.source_year),
                sourceUrl: String(row.source_url).trim(),
                population,
                jurisdiction: inferredJurisdiction,
                scope,
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
            jurisdiction: group.jurisdiction,
            population: group.population,
            scope: group.scope,
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
    inferJurisdiction,
    inferScope,
    entryMatchesQueryScope,
};
