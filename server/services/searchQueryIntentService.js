'use strict';

const {
    classifyQueryIntent,
    intentToPreferredArchetypes,
} = require('./evidenceBouquetService');

const FACET_PATTERNS = [
    ['landmark', /\b(landmark|seminal|classic|pivotal|practice[- ]changing|major trial|key trial|trial that changed)\b/i],
    ['guideline', /\b(guideline|recommendation|consensus|standard of care|best practice|algorithm|position statement)\b/i],
    ['recent', /\b(latest|recent|current|updated?|modern|new(?:est)?|202[0-9]|last\s+\d+\s+years?)\b/i],
    ['safety', /\b(safety|harm|adverse|toxicity|contraindication|black box|warning|side effect|risk)\b/i],
    ['diagnostic', /\b(diagnos\w+|sensitivity|specificity|screening|criteria|differential|workup|test(?:ing)?)\b/i],
    ['mechanistic', /\b(mechanism|pathophysiology|pathogenesis|molecular|gene|protein|receptor|pathway|biomarker)\b/i],
    ['trial', /\b(randomi[sz]ed|rct|clinical trial|phase\s+(?:i|ii|iii|iv|[1-4]))\b/i],
    ['review', /\b(systematic review|meta[- ]analysis|review)\b/i],
];

const INTENT_ROUTE_POLICY = {
    landmark: {
        bouquetIntent: 'therapeutic',
        ensureSources: ['pubmed', 'openalex'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['landmark_rct', 'guideline', 'recent_review', 'management_trial'],
        candidateMultiplier: 5,
    },
    guideline: {
        bouquetIntent: 'guideline',
        ensureSources: ['pubmed', 'openalex'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['guideline', 'definition', 'recent_review', 'landmark_rct'],
        candidateMultiplier: 4,
    },
    recent_evidence: {
        bouquetIntent: 'therapeutic',
        ensureSources: ['pubmed', 'openalex', 'semantic'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['guideline', 'recent_review', 'management_trial', 'rct'],
        candidateMultiplier: 4,
    },
    safety: {
        bouquetIntent: 'therapeutic',
        ensureSources: ['pubmed', 'openalex'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['guideline', 'recent_review', 'cohort', 'review'],
        candidateMultiplier: 4,
    },
    diagnostic: {
        bouquetIntent: 'diagnostic',
        ensureSources: ['pubmed', 'openalex'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['definition', 'guideline', 'recent_review', 'review'],
        candidateMultiplier: 4,
    },
    mechanistic: {
        bouquetIntent: 'mechanistic',
        ensureSources: ['pubmed', 'openalex', 'semantic'],
        sourceOrder: ['semantic', 'openalex', 'pubmed', 'crossref'],
        preferredArchetypes: ['landmark_basic_science', 'mechanism', 'recent_review'],
        candidateMultiplier: 3,
    },
    therapeutic: {
        bouquetIntent: 'therapeutic',
        ensureSources: ['pubmed', 'openalex'],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: ['guideline', 'recent_review', 'management_trial', 'landmark_rct'],
        candidateMultiplier: 4,
    },
    general: {
        bouquetIntent: 'general',
        ensureSources: [],
        sourceOrder: ['pubmed', 'openalex', 'semantic', 'crossref'],
        preferredArchetypes: intentToPreferredArchetypes('general'),
        candidateMultiplier: 3,
    },
};

function unique(values) {
    return [...new Set((Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean))];
}

function detectFacets(query) {
    const facets = [];
    for (const [facet, pattern] of FACET_PATTERNS) {
        if (pattern.test(String(query || ''))) facets.push(facet);
    }
    return facets;
}

function primaryIntentFromFacets(query, facets) {
    if (facets.includes('landmark')) return 'landmark';
    if (facets.includes('guideline')) return 'guideline';
    if (facets.includes('safety')) return 'safety';
    if (facets.includes('mechanistic') || facets.includes('mechanism')) return 'mechanistic';
    if (facets.includes('diagnostic')) return 'diagnostic';
    if (facets.includes('recent')) return 'recent_evidence';
    const legacy = classifyQueryIntent(query);
    return legacy === 'mechanistic' ? 'mechanistic' : legacy;
}

function deriveSearchIntentProfile(query, { specificity = 'moderate' } = {}) {
    const facets = detectFacets(query);
    const primaryIntent = primaryIntentFromFacets(query, facets);
    const policy = INTENT_ROUTE_POLICY[primaryIntent] || INTENT_ROUTE_POLICY.general;
    const confidence = Math.min(0.95, 0.45 + (facets.length * 0.16) + (primaryIntent === 'general' ? 0 : 0.18));
    return {
        primaryIntent,
        bouquetIntent: policy.bouquetIntent,
        facets,
        confidence: Number(confidence.toFixed(2)),
        specificity,
        preferredArchetypes: policy.preferredArchetypes,
        sourcePolicy: {
            ensureSources: policy.ensureSources,
            sourceOrder: policy.sourceOrder,
            candidateMultiplier: policy.candidateMultiplier,
        },
    };
}

function routeSearchSources(requestedSources = [], profile = {}, { explicitSources = false } = {}) {
    const requested = unique(requestedSources);
    const sourcePolicy = profile?.sourcePolicy || {};
    const sourceOrder = unique(sourcePolicy.sourceOrder || INTENT_ROUTE_POLICY.general.sourceOrder);
    const ensureSources = explicitSources ? [] : unique(sourcePolicy.ensureSources || []);
    const pool = unique([...requested, ...ensureSources]);
    const ordered = [
        ...sourceOrder.filter((source) => pool.includes(source)),
        ...pool.filter((source) => !sourceOrder.includes(source)),
    ];
    return ordered.length > 0 ? ordered : ['pubmed', 'openalex'];
}

module.exports = {
    deriveSearchIntentProfile,
    routeSearchSources,
};
