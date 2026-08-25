'use strict';

const DEFAULT_MIN_SCORE = 0.22;
const DEFAULT_FETCH_CAP = 400;
const BOILERPLATE_TOPIC_SPAN = 15;
const NEAR_DUPLICATE_JACCARD = 0.82;

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
    'af', 'aki', 'bp', 'ckd', 'copd', 'dvt', 'hf', 'hrs', 'ich', 'icu', 'iv', 'mi',
    'nih', 'pe', 'po', 'qt', 'rrt', 'sah', 't3', 't4', 'tb', 'tbi', 'tia', 'tpa',
    'vf', 'vt',
]);

const WEAK_DISTINCTIVE = new Set([
    'acute', 'adults', 'attack', 'children', 'chronic', 'confirmed', 'diagnosis',
    'disease', 'disorder', 'failure', 'infection', 'injury', 'primary', 'secondary',
    'severe', 'suspected', 'syndrome', 'targets', 'tumour', 'tumor',
]);

const SPELLING_PAIRS = [
    ['haemorrhage', 'hemorrhage'],
    ['haemorrhagic', 'hemorrhagic'],
    ['ischaemia', 'ischemia'],
    ['ischaemic', 'ischemic'],
    ['anaemia', 'anemia'],
    ['oedema', 'edema'],
    ['paediatric', 'pediatric'],
    ['oesophag', 'esophag'],
    ['leukaemia', 'leukemia'],
    ['coeliac', 'celiac'],
];

const TOKEN_ALIASES = {
    hepatorenal: ['hrs'],
    subarachnoid: ['sah'],
    intracerebral: ['ich'],
    tuberculosis: ['tb'],
    thrombectomy: ['evt'],
    haemorrhage: ['hemorrhage'],
    hemorrhage: ['haemorrhage'],
};

const BOILERPLATE_PHRASES = [
    'healthcare professionals should follow our general guidelines',
    'this guideline covers',
    'for more information see',
    'see the nice guideline on',
    'the recommendations in this guideline',
    'follow our general guidelines on',
    'how we develop nice guidelines',
    'this is a summary of the evidence',
];

const BOILERPLATE_PATTERNS = BOILERPLATE_PHRASES.map((phrase) => new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

function foldMedicalSpelling(token) {
    let folded = String(token || '');
    for (const [uk, us] of SPELLING_PAIRS) {
        if (folded.includes(uk)) folded = folded.split(uk).join(us);
    }
    return folded;
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
        out.push(token);
    }
    return out;
}

function uniqueTokens(text) {
    return [...new Set(tokenizeGuidelineText(text))];
}

function aliasesFor(token) {
    return TOKEN_ALIASES[token] || [];
}

function textHasToken(textTokens, token) {
    if (textTokens.has(token)) return true;
    return aliasesFor(token).some((alias) => textTokens.has(alias));
}

function topicQueryParts(topic) {
    const raw = String(topic || '').trim();
    const head = raw.split(':')[0].trim() || raw;
    const headTokens = uniqueTokens(head);
    const allTokens = uniqueTokens(raw);
    const pool = (headTokens.length ? headTokens : allTokens).filter((token) => !WEAK_DISTINCTIVE.has(token));
    const source = pool.length ? pool : (headTokens.length ? headTokens : allTokens);
    const distinctive = source.reduce((best, token) => {
        if (!best) return token;
        if (token.length >= best.length) return token;
        return best;
    }, null);
    return { head, headTokens, allTokens, distinctive };
}

function sqlSearchTokens(topic) {
    const { allTokens, distinctive } = topicQueryParts(topic);
    const expanded = new Set();
    for (const token of allTokens) {
        if (token.length >= 5) expanded.add(token);
        for (const alias of aliasesFor(token)) {
            if (alias.length >= 3) expanded.add(alias);
        }
    }
    if (distinctive && distinctive.length >= 5) expanded.add(distinctive);
    return [...expanded].slice(0, 8);
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
    if (trimmed.length < 20) return true;
    return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function overlapScore(tokens, textTokens) {
    if (!tokens.length) return { score: 0, hits: 0 };
    let hits = 0;
    for (const token of tokens) {
        if (textHasToken(textTokens, token)) hits += 1;
    }
    return { score: hits / tokens.length, hits };
}

function scoreGuidelineForTopic(topic, guideline) {
    if (isBoilerplateGuideline(guideline)) {
        return { score: 0, hits: 0, topicTokenCount: 0, reason: 'boilerplate' };
    }
    const { headTokens, allTokens, distinctive } = topicQueryParts(topic);
    if (!allTokens.length) {
        return { score: 0, hits: 0, topicTokenCount: 0, reason: 'empty_topic' };
    }
    const textTokens = new Set(tokenizeGuidelineText(guidelineSearchText(guideline)));
    if (distinctive && !textHasToken(textTokens, distinctive)) {
        return {
            score: 0,
            hits: 0,
            topicTokenCount: allTokens.length,
            reason: 'missing_distinctive',
            distinctive,
        };
    }
    const full = overlapScore(allTokens, textTokens);
    const head = headTokens.length ? overlapScore(headTokens, textTokens) : full;
    const best = head.score > full.score ? head : full;
    return {
        score: best.score,
        hits: best.hits,
        topicTokenCount: allTokens.length,
        reason: best.hits === 0 ? 'no_overlap' : 'overlap',
        distinctive,
    };
}

function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    if (!a.size && !b.size) return 1;
    let inter = 0;
    for (const token of a) {
        if (b.has(token)) inter += 1;
    }
    return inter / (a.size + b.size - inter);
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
            return {
                guideline,
                relevance,
                year,
                quality,
                tokens: tokenizeGuidelineText(guidelineSearchText(guideline)),
            };
        })
        .filter((row) => row.relevance.score >= floor && row.relevance.hits >= 1)
        .sort((a, b) => {
            if (b.relevance.score !== a.relevance.score) return b.relevance.score - a.relevance.score;
            if (b.quality !== a.quality) return b.quality - a.quality;
            return b.year - a.year;
        });

    const deduped = [];
    for (const row of scored) {
        if (deduped.some((kept) => jaccard(row.tokens, kept.tokens) >= NEAR_DUPLICATE_JACCARD)) continue;
        deduped.push(row);
        if (deduped.length >= safeLimit) break;
    }

    return deduped.map((row) => ({
        ...row.guideline,
        relevanceScore: Math.round(row.relevance.score * 100) / 100,
        relevanceHits: row.relevance.hits,
    }));
}

function fetchCapForLimit(limit) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return Math.min(DEFAULT_FETCH_CAP, Math.max(safeLimit * 8, 80));
}

function contentMatchClause(tokens) {
    const safe = (Array.isArray(tokens) ? tokens : [])
        .map((token) => String(token || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter((token) => token.length >= 3);
    if (!safe.length) return { clause: '', params: [] };
    const parts = safe.map(() => (
        '(lower(coalesce(recommendation_text, \'\')) LIKE ? OR lower(coalesce(population, \'\')) LIKE ? OR lower(coalesce(intervention, \'\')) LIKE ?)'
    ));
    const params = safe.flatMap((token) => {
        const pattern = `%${token}%`;
        return [pattern, pattern, pattern];
    });
    return { clause: `AND (${parts.join(' OR ')})`, params };
}

module.exports = {
    DEFAULT_MIN_SCORE,
    DEFAULT_FETCH_CAP,
    BOILERPLATE_TOPIC_SPAN,
    BOILERPLATE_PATTERNS,
    BOILERPLATE_PHRASES,
    tokenizeGuidelineText,
    uniqueTokens,
    topicQueryParts,
    sqlSearchTokens,
    isBoilerplateGuideline,
    scoreGuidelineForTopic,
    rankGuidelinesForTopic,
    fetchCapForLimit,
    contentMatchClause,
    guidelineSearchText,
};
