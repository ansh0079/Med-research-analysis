'use strict';

const DEFAULT_MIN_SCORE = 0.22;
const DEFAULT_FETCH_CAP = 400;
const BOILERPLATE_TOPIC_SPAN = 15;

const STOPWORDS = new Set([
    'about', 'after', 'also', 'among', 'and', 'any', 'are', 'based', 'been', 'being',
    'care', 'clinical', 'consider', 'for', 'from', 'general', 'guideline', 'guidelines',
    'health', 'healthcare', 'including', 'information', 'into', 'management', 'may',
    'must', 'nice', 'offer', 'other', 'patient', 'patients', 'people', 'professional',
    'professionals', 'recommend', 'recommendation', 'recommendations', 'recommended',
    'see', 'should', 'that', 'the', 'their', 'this', 'those', 'treatment', 'use',
    'used', 'using', 'with', 'within', 'without',
]);

const SHORT_KEEP = new Set([
    'af', 'aki', 'bp', 'ckd', 'copd', 'dvt', 'hf', 'ich', 'icu', 'iv', 'mi', 'nih',
    'pe', 'po', 'qt', 'rrt', 'sah', 't3', 't4', 'tb', 'tbi', 'tia', 'tpa', 'vf', 'vt',
]);

const BOILERPLATE_PATTERNS = [
    /healthcare professionals should follow our general guidelines/i,
    /this guideline covers/i,
    /for more information see/i,
    /see the nice guideline on/i,
    /the recommendations in this guideline/i,
    /follow our general guidelines on/i,
    /how we develop nice guidelines/i,
    /this is a summary of the evidence/i,
];

function foldMedicalSpelling(token) {
    return String(token || '')
        .replace(/ae/g, 'e')
        .replace(/oe/g, 'e');
}

function tokenizeGuidelineText(text) {
    const raw = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .map((token) => foldMedicalSpelling(token.trim()))
        .filter(Boolean);
    const out = [];
    for (const token of raw) {
        if (STOPWORDS.has(token)) continue;
        if (token.length <= 2 && !SHORT_KEEP.has(token)) continue;
        if (token.length === 3 && STOPWORDS.has(token)) continue;
        out.push(token);
    }
    return out;
}

function uniqueTokens(text) {
    return [...new Set(tokenizeGuidelineText(text))];
}

function guidelineSearchText(guideline = {}) {
    return [
        guideline.recommendationText || guideline.recommendation_text,
        guideline.population,
        guideline.intervention,
        guideline.cautions,
        guideline.sourceSpecialty || guideline.source_specialty,
        guideline.sourceDomain || guideline.source_domain,
    ].filter(Boolean).join(' ');
}

function isBoilerplateGuideline(guidelineOrText) {
    const text = typeof guidelineOrText === 'string'
        ? guidelineOrText
        : String(
            guidelineOrText?.recommendationText
            || guidelineOrText?.recommendation_text
            || ''
        );
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length < 40) return true;
    return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function scoreGuidelineForTopic(topic, guideline) {
    if (isBoilerplateGuideline(guideline)) {
        return { score: 0, hits: 0, topicTokenCount: 0, reason: 'boilerplate' };
    }
    const topicTokens = uniqueTokens(topic);
    if (!topicTokens.length) {
        return { score: 0, hits: 0, topicTokenCount: 0, reason: 'empty_topic' };
    }
    const textTokens = new Set(tokenizeGuidelineText(guidelineSearchText(guideline)));
    let hits = 0;
    for (const token of topicTokens) {
        if (textTokens.has(token)) hits += 1;
    }
    const score = hits / topicTokens.length;
    return {
        score,
        hits,
        topicTokenCount: topicTokens.length,
        reason: hits === 0 ? 'no_overlap' : 'overlap',
    };
}

function rankGuidelinesForTopic(topic, guidelines = [], {
    limit = 20,
    minScore = DEFAULT_MIN_SCORE,
} = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const floor = Number.isFinite(Number(minScore)) ? Number(minScore) : DEFAULT_MIN_SCORE;
    const scored = (Array.isArray(guidelines) ? guidelines : [])
        .map((guideline) => {
            const relevance = scoreGuidelineForTopic(topic, guideline);
            const year = Number(guideline?.sourceYear ?? guideline?.source_year ?? 0) || 0;
            const quality = Number(guideline?.qualityAssessment?.score ?? 0) || 0;
            return { guideline, relevance, year, quality };
        })
        .filter((row) => row.relevance.score >= floor && row.relevance.hits >= 1)
        .sort((a, b) => {
            if (b.relevance.score !== a.relevance.score) return b.relevance.score - a.relevance.score;
            if (b.year !== a.year) return b.year - a.year;
            return b.quality - a.quality;
        })
        .slice(0, safeLimit);

    return scored.map((row) => ({
        ...row.guideline,
        relevanceScore: Math.round(row.relevance.score * 100) / 100,
        relevanceHits: row.relevance.hits,
    }));
}

function fetchCapForLimit(limit) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return Math.min(DEFAULT_FETCH_CAP, Math.max(safeLimit * 8, 80));
}

module.exports = {
    DEFAULT_MIN_SCORE,
    DEFAULT_FETCH_CAP,
    BOILERPLATE_TOPIC_SPAN,
    BOILERPLATE_PATTERNS,
    tokenizeGuidelineText,
    uniqueTokens,
    isBoilerplateGuideline,
    scoreGuidelineForTopic,
    rankGuidelinesForTopic,
    fetchCapForLimit,
    guidelineSearchText,
};
