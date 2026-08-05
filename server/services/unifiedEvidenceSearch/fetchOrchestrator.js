const { buildProxyService } = require('../externalApiProxy');
const { clinicalQueryAliases, clinicalQueryPinnedPmids, buildPubMedSearchQuery } = require('./clinicalQueryPubmed');
const { dedupeKey, collapseNearDuplicateTitles } = require('./articleDedupe');
const { mergeAndRank } = require('./rrfFusion');
const { articleFromOpenAlexWork } = require('./openAlexMapper');
const { reformulateQueryForPubMed } = require('./llmQueryIntelligence');
const { appendPubMedPublicationFilters } = require('./pubmedFilters');

/**
 * @param {object} opts
 * @param {string} opts.query
 * @param {number} opts.safeLimit
 * @param {string[]} opts.sourceList
 * @param {import('../../config').serverConfig} opts.serverConfig
 * @param {Function} opts.fetch
 * @param {object} [opts.telemetry] — optional; when PubMed returns zero hits, may set `lowRecallLearning`
 * @param {string} [opts.specificity] — 'broad' | 'moderate' | 'strict'
 * @param {string[]} [opts.parsedStudyTypes] — optional PubMed publication-type clauses inferred server-side
 * @param {string[]} [opts.parsedYearFilters] — optional PubMed year filters such as 2020:2024[PDAT]
 * @returns {Promise<object[]>}
 */
async function fetchUnifiedEvidence({ query, safeLimit, sourceList, serverConfig, fetch: f, cache = null, vectorList = [], telemetry = null, specificity = 'moderate', parsedStudyTypes = [], parsedYearFilters = [] }) {
    const proxy = buildProxyService({ serverConfig, fetchImpl: f, cache, telemetry });
    const overallStart = Date.now();

    // Phase 0: LLM query reformulation — converts natural language into a structured
    // PubMed Boolean query with MeSH terms. Runs in parallel with MeSH lookup.
    // Only fires for conversational queries (>4 words, contains question-like patterns).
    // Skip reformulation if query already contains medical terminology to preserve precision.
    const hasMedicalTerms = /\b(syndrome|disease|treatment|therapy|diagnosis|cardiac|pulmonary|renal|diabetes|hypertension|infection|cancer|trial|study|efficacy|management|pathophysiology)\b/i.test(query);
    const isNaturalLanguageQuery = !hasMedicalTerms &&
        process.env.NODE_ENV !== 'test' && (
        query.split(/\s+/).length > 4 ||
        /\b(does|how|what|why|which|can|is|are|should)\b/i.test(query)
    );
    const llmReformulationPromise = (isNaturalLanguageQuery && sourceList.includes('pubmed'))
        ? reformulateQueryForPubMed(query, specificity, serverConfig, f, cache, telemetry).catch(() => null)
        : Promise.resolve(null);

    // Phase 1: MeSH canonical-term lookup (~100–300 ms).
    // Fires before source searches so PubMed can use the augmented query.
    // Only keeps terms that genuinely expand the query (not substring matches).
    let meshExpansions = [];
    if (sourceList.includes('pubmed')) {
        try {
            const meshStarted = Date.now();
            const suggestions = await proxy.meshSuggest(query, { limit: 4 });
            if (telemetry && typeof telemetry === 'object') {
                telemetry.meshLookupMs = Date.now() - meshStarted;
            }
            const qLow = query.toLowerCase();
            meshExpansions = suggestions
                .map((d) => String(d.label || '').trim())
                .filter((label) => {
                    if (!label) return false;
                    const labelLow = label.toLowerCase();
                    return labelLow !== qLow;
                })
                .slice(0, 2);
        } catch (meshErr) {
            console.warn('[unifiedEvidence] MeSH proactive lookup skipped:', meshErr.message);
        }
    }

    // Wait for LLM reformulation (runs in parallel with MeSH)
    const reformulatedQuery = await llmReformulationPromise;

    const clinicalAliases = clinicalQueryAliases(query);
    const pinnedPmids = clinicalQueryPinnedPmids(query);
    const pubmedQueryBase = reformulatedQuery || query;
    let pubmedQuery = buildPubMedSearchQuery(pubmedQueryBase, reformulatedQuery ? [] : meshExpansions, clinicalAliases);

    pubmedQuery = appendPubMedPublicationFilters(pubmedQuery, specificity, parsedStudyTypes, parsedYearFilters);

    if (telemetry && typeof telemetry === 'object') {
        telemetry.meshExpansions = meshExpansions;
        telemetry.clinicalAliases = clinicalAliases;
        telemetry.pubmedQuery = pubmedQuery;
        telemetry.usedReformulatedQuery = Boolean(reformulatedQuery);
    }

    // Phase 2: Build per-source fetch promises and run them all in parallel.
    const sourceFetches = [];
    const recordSourceFailure = (source, err) => {
        if (!telemetry || typeof telemetry !== 'object') return;
        telemetry.sourceFailures = telemetry.sourceFailures || {};
        telemetry.sourceFailures[source] = {
            failed: true,
            error: String(err?.message || err || 'unknown error').slice(0, 240),
        };
        telemetry.sourceFetches = telemetry.sourceFetches || {};
        telemetry.sourceFetches[source] = {
            ...(telemetry.sourceFetches[source] || {}),
            failed: true,
            error: telemetry.sourceFailures[source].error,
        };
    };
    const recordSourceOk = (source, count) => {
        if (!telemetry || typeof telemetry !== 'object') return;
        telemetry.sourceFetches = telemetry.sourceFetches || {};
        telemetry.sourceFetches[source] = {
            ...(telemetry.sourceFetches[source] || {}),
            failed: false,
            resultCount: count,
        };
    };

    if (sourceList.includes('pubmed')) {
        // The broadened query (base OR MeSH OR aliases) maximises recall, but on already
        // specific queries the OR-expansion ranks the precise landmark far down — sometimes
        // past the fetch limit. Also run the un-expanded base query so an exact match (e.g.
        // a trial whose abstract lacks its acronym) is always a candidate, and merge it in
        // first so PubMed's precise rank-1 result leads the fused list.
        const preciseQuery = appendPubMedPublicationFilters(pubmedQueryBase, specificity, parsedStudyTypes, parsedYearFilters);
        sourceFetches.push((async () => {
            try {
                const [broad, precise, pinned] = await Promise.all([
                    proxy.pubmedSearch(pubmedQuery, { maxResults: safeLimit }),
                    preciseQuery !== pubmedQuery
                        ? proxy.pubmedSearch(preciseQuery, { maxResults: Math.ceil(safeLimit / 2) }).catch(() => [])
                        : Promise.resolve([]),
                    pinnedPmids.length && typeof proxy.pubmedFetchByIds === 'function'
                        ? proxy.pubmedFetchByIds(pinnedPmids).catch(() => [])
                        : Promise.resolve([]),
                ]);
                const seen = new Set();
                const merged = [];
                // Pinned landmark trials go first — guaranteed inclusion regardless of
                // esearch relevance ranking (see clinicalQueryPinnedPmids).
                for (const a of [...pinned, ...precise, ...broad]) {
                    const dk = dedupeKey(a);
                    if (dk && seen.has(dk)) continue;
                    if (dk) seen.add(dk);
                    merged.push(a);
                }
                if (merged.length === 0 && telemetry && typeof telemetry === 'object') {
                    telemetry.lowRecallLearning = {
                        query,
                        resultCount: 0,
                        aliasCount: meshExpansions.length,
                        expandedAliases: meshExpansions,
                    };
                }
                recordSourceOk('pubmed', merged.length);
                return merged;
            } catch (err) {
                console.warn('[unifiedEvidence] PubMed failed', err.message);
                recordSourceFailure('pubmed', err);
                return [];
            }
        })());
    }

    if (sourceList.includes('semantic') || sourceList.includes('semantic-scholar')) {
        sourceFetches.push((async () => {
            try {
                const results = await proxy.semanticScholarSearch(query, { limit: safeLimit });
                recordSourceOk('semantic', Array.isArray(results) ? results.length : 0);
                return results;
            } catch (err) {
                console.warn('[unifiedEvidence] Semantic Scholar failed', err.message);
                recordSourceFailure('semantic', err);
                return [];
            }
        })());
    }

    if (sourceList.includes('openalex')) {
        sourceFetches.push((async () => {
            try {
                const works = await proxy.openAlexSearch(query, { limit: safeLimit });
                const mapped = works.map(articleFromOpenAlexWork);
                recordSourceOk('openalex', mapped.length);
                return mapped;
            } catch (err) {
                console.warn('[unifiedEvidence] OpenAlex failed', err.message);
                recordSourceFailure('openalex', err);
                return [];
            }
        })());
    }

    const sourceResults = await Promise.all(sourceFetches);
    if (telemetry && typeof telemetry === 'object') {
        telemetry.unifiedFetchMs = Date.now() - overallStart;
        if (vectorList.length > 0) {
            recordSourceOk('vector', vectorList.length);
        }
    }
    const perSourceLists = sourceResults.filter((list) => list.length > 0);

    // Optional vector fusion
    if (vectorList.length > 0) {
        perSourceLists.push(vectorList);
    }

    if (perSourceLists.length === 0) return [];
    // Give vector results a 1.25× weight so semantic signals aren't drowned out by multiple keyword sources
    const listWeights = vectorList.length > 0
        ? Array(perSourceLists.length - 1).fill(1).concat(1.25)
        : undefined;
    const ranked = mergeAndRank(perSourceLists, listWeights, clinicalAliases);
    return collapseNearDuplicateTitles(ranked);
}

module.exports = {
    fetchUnifiedEvidence,
};
