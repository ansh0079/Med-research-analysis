const { normalizePmid } = require('../../utils/articleKeys');

const TITLE_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'from',
    'effects', 'effect', 'study', 'studies', 'clinical', 'patients', 'patient', 'using', 'use',
    'randomized', 'randomised', 'controlled', 'trial', 'trials', 'versus', 'vs',
]);

/** Strip DOI URL prefixes and lowercase for stable cross-source matching */
function normalizeDoi(doi) {
    if (!doi) return null;
    let d = String(doi).trim().toLowerCase();
    d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    return d || null;
}

function titleWordSet(title) {
    if (!title || typeof title !== 'string') return new Set();
    const words = title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w));
    return new Set(words);
}

function jaccardWordSets(a, b) {
    if (a.size === 0 && b.size === 0) return 1;
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

function titlesNearDuplicate(aWords, bWords, minJaccard = 0.72) {
    if (jaccardWordSets(aWords, bWords) >= minJaccard) return true;
    // OpenAlex often truncates titles; treat high containment of the shorter set as a near-dup.
    const smaller = aWords.size <= bWords.size ? aWords : bWords;
    const larger = aWords.size <= bWords.size ? bWords : aWords;
    if (smaller.size < 3) return false;
    let hit = 0;
    for (const w of smaller) if (larger.has(w)) hit += 1;
    return hit / smaller.size >= 0.85;
}

function parseArticleYear(article) {
    const y = article.year ?? article.pubdate;
    if (typeof y === 'number' && y > 1900 && y < 2100) return y;
    if (typeof y === 'string') {
        const m = y.match(/\b(19|20)\d{2}\b/);
        if (m) return parseInt(m[0], 10);
    }
    return null;
}

function publicationYearsCompatible(a, b) {
    const ya = parseArticleYear(a);
    const yb = parseArticleYear(b);
    if (ya === null || ya === undefined || yb === null || yb === undefined) return true;
    return Math.abs(ya - yb) <= 1;
}

/**
 * Drop near-duplicate titles (same paper, different DOI/uid across sources) after RRF.
 * Preserves first occurrence = higher fused rank.
 */
function preferCanonicalArticle(primary, incoming) {
    if (!primary) return incoming;
    if (!incoming) return primary;
    // Prefer pinned PubMed landmarks over OpenAlex title twins that lack PMIDs.
    if (incoming._pinnedLandmark && !primary._pinnedLandmark) return incoming;
    if (primary._pinnedLandmark && !incoming._pinnedLandmark) return primary;
    const primaryPmid = normalizePmid(primary.pmid);
    const incomingPmid = normalizePmid(incoming.pmid);
    if (incomingPmid && !primaryPmid) return incoming;
    if (primaryPmid && !incomingPmid) return primary;
    const primaryIsPubmed = String(primary._source || primary.uid || '').toLowerCase().includes('pubmed');
    const incomingIsPubmed = String(incoming._source || incoming.uid || '').toLowerCase().includes('pubmed');
    if (incomingIsPubmed && !primaryIsPubmed) return incoming;
    return primary;
}

function mergeArticleMetadata(primary, incoming) {
    if (!primary) return incoming;
    if (!incoming) return primary;
    const merged = { ...primary };
    for (const field of ['doi', 'pmid', 'pmcid', 'abstract', 'journal', 'source', 'pubdate', 'year']) {
        if (!merged[field] && incoming[field]) merged[field] = incoming[field];
    }
    if (incoming._pinnedLandmark) merged._pinnedLandmark = true;
    // Keep a PubMed-shaped uid when we know the PMID so gold eval / pins resolve.
    const pmid = normalizePmid(merged.pmid || incoming.pmid);
    if (pmid) {
        merged.pmid = pmid;
        const uidHasPmid = normalizePmid(merged.uid) === pmid;
        if (!uidHasPmid && (primary._pinnedLandmark || incoming._pinnedLandmark || String(primary._source || '').includes('pubmed') || String(incoming._source || '').includes('pubmed'))) {
            merged.uid = `pubmed-${pmid}`;
            merged._source = merged._source || 'pubmed';
        }
    }
    const sources = new Set([
        ...(Array.isArray(primary._sources) ? primary._sources : [primary._source || primary.source].filter(Boolean)),
        ...(Array.isArray(incoming._sources) ? incoming._sources : [incoming._source || incoming.source].filter(Boolean)),
    ]);
    if (sources.size > 0) merged._sources = [...sources];
    const primaryAuthors = Array.isArray(primary.authors) ? primary.authors : [];
    const incomingAuthors = Array.isArray(incoming.authors) ? incoming.authors : [];
    if (primaryAuthors.length === 0 && incomingAuthors.length > 0) merged.authors = incomingAuthors;
    if ((incoming.pmcrefcount || 0) > (merged.pmcrefcount || 0)) merged.pmcrefcount = incoming.pmcrefcount;
    const primaryTypes = Array.isArray(primary.pubtype) ? primary.pubtype : [];
    const incomingTypes = Array.isArray(incoming.pubtype) ? incoming.pubtype : [];
    if (primaryTypes.length === 0 && incomingTypes.length > 0) merged.pubtype = incomingTypes;
    return merged;
}

/**
 * Canonical deduplication key: DOI (normalized) > uid > title (normalized).
 * Normalizing removes punctuation differences that cause the same paper to
 * appear as two distinct entries across sources.
 */
function dedupeKey(article) {
    const doiNorm = normalizeDoi(article.doi);
    if (doiNorm) {
        return 'doi:' + doiNorm;
    }
    const uid = String(article.uid || '');
    const pmidNorm = normalizePmid(article.pmid || (/^pmid[:\-_]/i.test(uid) ? uid : null));
    if (pmidNorm) {
        return 'pmid:' + pmidNorm;
    }
    if (article.title) {
        const norm = article.title
            .toLowerCase()
            .replace(/\b(a|an|the)\b/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
        const year = parseArticleYear(article);
        if (norm && norm.length >= 20) return `title:${norm}|year:${year || 'unknown'}`;
    }
    if (article.uid) {
        return 'uid:' + String(article.uid).toLowerCase().trim();
    }
    return null;
}

function collapseNearDuplicateTitles(articles, { minJaccard = 0.72 } = {}) {
    const kept = [];
    const seen = [];
    for (const article of articles) {
        const words = titleWordSet(article.title);
        let mergeAt = -1;
        for (let i = 0; i < seen.length; i++) {
            if (titlesNearDuplicate(words, seen[i].words, minJaccard) && publicationYearsCompatible(article, seen[i].article)) {
                mergeAt = i;
                break;
            }
        }
        if (mergeAt >= 0) {
            const previous = kept[mergeAt];
            const preferred = preferCanonicalArticle(previous, article);
            const other = preferred === previous ? article : previous;
            const merged = mergeArticleMetadata(preferred, other);
            const pmid = normalizePmid(merged.pmid);
            if (pmid && !normalizePmid(merged.uid)) {
                merged.uid = `pubmed-${pmid}`;
            }
            if (previous._pinnedLandmark || article._pinnedLandmark) merged._pinnedLandmark = true;
            kept[mergeAt] = merged;
            seen[mergeAt] = { words: titleWordSet(merged.title), article: merged };
        } else {
            kept.push(article);
            seen.push({ words, article });
        }
    }
    return kept;
}

module.exports = {
    normalizeDoi,
    titleWordSet,
    jaccardWordSets,
    titlesNearDuplicate,
    parseArticleYear,
    publicationYearsCompatible,
    preferCanonicalArticle,
    collapseNearDuplicateTitles,
    dedupeKey,
    mergeArticleMetadata,
};
