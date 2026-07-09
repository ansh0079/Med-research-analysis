'use strict';

const { resolveCanonicalNormalized } = require('../utils/topicSynonyms');
const { MEDICAL_TOPIC_KEYWORDS } = require('./relatedTopicService');

const TITLE_STOP_WORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'and', 'or', 'for', 'with', 'on', 'at', 'to', 'vs', 'versus',
    'using', 'based', 'among', 'patients', 'patient', 'study', 'trial', 'randomized', 'randomised',
    'effect', 'effects', 'impact', 'outcomes', 'clinical', 'controlled', 'double', 'blind',
]);

function normalizeTopic(topic) {
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

function scoreTopicKeyInText(text, key, keywords = []) {
    const haystack = String(text || '').toLowerCase();
    if (!haystack || !key) return 0;
    const normalizedKey = key.replace(/-/g, ' ');
    if (haystack.includes(normalizedKey)) return normalizedKey.length + 10;
    let best = 0;
    for (const term of keywords) {
        const normalizedTerm = String(term || '').toLowerCase().trim();
        if (normalizedTerm.length > 2 && haystack.includes(normalizedTerm)) {
            best = Math.max(best, normalizedTerm.length + 8);
        }
    }
    if (best) return best;
    const tokens = normalizedKey.split(/\s+/).filter(Boolean);
    const hits = tokens.filter((t) => t.length > 2 && haystack.includes(t));
    if (!hits.length) return 0;
    return hits.reduce((sum, t) => sum + t.length, 0);
}

function bestTopicKeyFromText(text) {
    let bestKey = null;
    let bestScore = 0;
    for (const [key, keywords] of Object.entries(MEDICAL_TOPIC_KEYWORDS)) {
        const score = scoreTopicKeyInText(text, key, keywords);
        if (score > bestScore) {
            bestScore = score;
            bestKey = key;
        }
    }
    return bestKey;
}

function titleFallbackTopic(title) {
    const words = String(title || '')
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3 && !TITLE_STOP_WORDS.has(w));
    return words.slice(0, 3).join(' ');
}

function pushCandidate(candidates, seen, { topic, source, confidence, reason }) {
    const display = String(topic || '').trim();
    if (!display) return;
    const normalized = normalizeTopic(display);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const canonical = resolveCanonicalNormalized(display, normalizeTopic);
    candidates.push({
        displayTopic: display,
        normalizedTopic: normalized,
        canonicalTopic: canonical || normalized,
        source,
        confidence: Math.max(0, Math.min(1, Number(confidence) || 0.5)),
        reason,
    });
}

/**
 * Infer a canonical clinical topic for guideline lookup from article metadata.
 * Prefers stored teaching-object topic, synapse topics, MeSH/keywords, then keyword-map title match.
 *
 * @param {object} article
 * @param {{ searchTopic?: string, teachingObjectTopic?: string|null, normalizeFn?: Function }} [options]
 */
function inferTopicFromArticle(article = {}, options = {}) {
    const normalizeFn = typeof options.normalizeFn === 'function' ? options.normalizeFn : normalizeTopic;
    const candidates = [];
    const seen = new Set();

    if (options.searchTopic) {
        pushCandidate(candidates, seen, {
            topic: options.searchTopic,
            source: 'search_context',
            confidence: 0.92,
            reason: 'Active search query context',
        });
    }

    if (options.teachingObjectTopic) {
        pushCandidate(candidates, seen, {
            topic: options.teachingObjectTopic,
            source: 'teaching_object',
            confidence: 0.9,
            reason: 'Persisted teaching object topic',
        });
    }

    for (const syn of (article._synapseTopics || []).slice(0, 3)) {
        pushCandidate(candidates, seen, {
            topic: syn,
            source: 'synapse',
            confidence: 0.86,
            reason: 'Cross-topic synapse from evidence graph',
        });
    }

    for (const kw of (article.keywords || []).slice(0, 8)) {
        const term = typeof kw === 'string' ? kw : kw?.term || kw?.name;
        pushCandidate(candidates, seen, {
            topic: term,
            source: 'keyword',
            confidence: 0.72,
            reason: 'Article keyword',
        });
    }

    const titleKey = bestTopicKeyFromText(article.title);
    if (titleKey) {
        pushCandidate(candidates, seen, {
            topic: titleKey.replace(/-/g, ' '),
            source: 'title_keyword_map',
            confidence: 0.78,
            reason: 'Matched curated clinical topic map from title',
        });
    }

    const abstractKey = bestTopicKeyFromText(String(article.abstract || '').slice(0, 600));
    if (abstractKey && abstractKey !== titleKey) {
        pushCandidate(candidates, seen, {
            topic: abstractKey.replace(/-/g, ' '),
            source: 'abstract_keyword_map',
            confidence: 0.7,
            reason: 'Matched curated clinical topic map from abstract',
        });
    }

    const fallback = titleFallbackTopic(article.title);
    if (fallback) {
        pushCandidate(candidates, seen, {
            topic: fallback,
            source: 'title_fallback',
            confidence: 0.35,
            reason: 'Fallback from title tokens (low confidence)',
        });
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0] || null;
    const canonicalTopic = best
        ? resolveCanonicalNormalized(best.displayTopic, normalizeFn)
        : '';

    return {
        displayTopic: best?.displayTopic || '',
        normalizedTopic: best?.normalizedTopic || '',
        canonicalTopic: canonicalTopic || best?.normalizedTopic || '',
        source: best?.source || 'none',
        confidence: best?.confidence ?? 0,
        reason: best?.reason || 'No topic could be inferred',
        candidates: candidates.slice(0, 6),
    };
}

async function inferTopicForArticleRecord(db, article = {}, options = {}) {
    let teachingObjectTopic = options.teachingObjectTopic || null;
    const uid = article.uid || article.pmid || article.doi || null;
    if (!teachingObjectTopic && db?.getTeachingObjectForArticle && uid) {
        const object = await db.getTeachingObjectForArticle(uid).catch(() => null);
        teachingObjectTopic = object?.topic || object?.payload?.topic || null;
    }
    return inferTopicFromArticle(article, {
        ...options,
        teachingObjectTopic,
    });
}

module.exports = {
    inferTopicFromArticle,
    inferTopicForArticleRecord,
    normalizeTopic,
    bestTopicKeyFromText,
};
