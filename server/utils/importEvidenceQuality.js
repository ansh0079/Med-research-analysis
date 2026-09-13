'use strict';

const { detectIssuingBody } = require('./guidelineAttribution');

function topicTokens(value) {
    const stop = new Set(['and', 'the', 'with', 'for', 'therapy', 'treatment', 'management', 'diagnosis']);
    return [...new Set(String(value || '').toLowerCase()
        .replace(/leukaostasis/g, 'leukostasis').replace(/metylene/g, 'methylene')
        .split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !stop.has(word)))];
}

function assessTopicRelevance(topic, article = {}) {
    const words = topicTokens(topic);
    const haystack = new Set(topicTokens(`${article.title || ''} ${article.abstractText || article.abstract || ''}`));
    const matches = words.filter((word) => haystack.has(word)).length;
    const ratio = words.length ? matches / words.length : 0;
    return { matches, ratio, accepted: words.length > 0 && matches >= Math.min(2, words.length) && ratio >= 0.5 };
}

function classifyImportedDocument(article = {}) {
    const types = article.pubTypeList?.pubType || article.pubtype || article.pubType || [];
    const publicationTypes = (Array.isArray(types) ? types : [types]).map((v) => String(v).toLowerCase());
    const title = String(article.title || '');
    const issuingBody = detectIssuingBody(title);
    const guidelineType = publicationTypes.some((v) => /^(practice guideline|guideline|consensus development conference)$/.test(v));
    const guidelineTitle = /\b(clinical practice guidelines?|guidelines?|recommendations|consensus statement)\b/i.test(title);
    const secondary = publicationTypes.some((v) => /review|meta.analysis|comment|editorial/.test(v))
        || /\b(review|meta.analysis|commentary|appraisal|adherence|implementation|survey)\b/i.test(title);
    if (issuingBody && !secondary && (guidelineType || guidelineTitle)) return 'clinical_practice_guideline';
    if (publicationTypes.some((v) => /meta.analysis|systematic review/.test(v)) || /systematic review|meta.analysis/i.test(title)) return 'systematic_review_meta_analysis';
    if (publicationTypes.includes('review') || /\breview\b/i.test(title)) return 'review_article';
    if (publicationTypes.includes('randomized controlled trial')) return 'randomized_controlled_trial';
    return 'article';
}

function isUsableImportedSource(topic, article) {
    return Boolean(article?.bodyStored && assessTopicRelevance(topic, article).accepted);
}

function normalizeStoredDocument(row) {
    if (!row) return row;
    if (row.document_label !== 'clinical_practice_guideline') return row;
    const classified = classifyImportedDocument({ title: row.title });
    if (classified === 'clinical_practice_guideline') return row;
    return { ...row, document_label: classified, evidence_tier: 'literature', attribution_status: 'unverified' };
}

module.exports = { assessTopicRelevance, classifyImportedDocument, isUsableImportedSource, normalizeStoredDocument };
