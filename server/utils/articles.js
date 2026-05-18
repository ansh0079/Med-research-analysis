const { escapeHtml } = require('./validation');
const { computeQualityScore } = require('../services/qualityService');
const { getEbmScore, isPreprint } = require('../services/unifiedEvidenceSearch');

const EBM_LABELS = [
    { min: 7, label: 'Meta-analysis / Systematic Review', short: 'Meta-analysis' },
    { min: 6, label: 'Randomised Controlled Trial', short: 'RCT' },
    { min: 5, label: 'Controlled Clinical Trial', short: 'Clinical Trial' },
    { min: 4, label: 'Cohort Study', short: 'Cohort' },
    { min: 3, label: 'Case-Control Study', short: 'Case-Control' },
    { min: 2, label: 'Cross-Sectional Study', short: 'Cross-Sectional' },
    { min: 1, label: 'Case Report / Series', short: 'Case Report' },
    { min: 0, label: 'Editorial / Opinion', short: 'Editorial' },
];

function ebmLabel(score) {
    for (const tier of EBM_LABELS) {
        if (score >= tier.min) return { label: tier.label, short: tier.short };
    }
    return { label: 'Study', short: 'Study' };
}

/** PubMed publication types aligned with guideline / consensus documents */
const GUIDELINE_PUBTYPE_RES = [
    /\bpractice guideline\b/i,
    /\bguideline\b/i,
    /\bconsensus development conference\b/i,
    /\bclinical consensus\b/i,
    /\bclinical practice guideline\b/i,
];

function hasGuidelinePubtype(article) {
    const pts = article.pubtype;
    if (!Array.isArray(pts)) return false;
    return pts.some((pt) => typeof pt === 'string' && GUIDELINE_PUBTYPE_RES.some((re) => re.test(pt.trim())));
}

function guidelineEvidenceBonus(article) {
    if (!hasGuidelinePubtype(article)) return { add: 0, labels: [] };
    return {
        add: 28,
        labels: ['Guideline / consensus document (PubMed type)'],
    };
}

/** OpenAlex signals: FWCI ≈ citations vs peers; percentile = highly cited in similar works */
function openAlexRankingBonus(metrics) {
    if (!metrics || typeof metrics !== 'object') return { add: 0, labels: [] };
    let add = 0;
    const labels = [];

    const fwci = metrics.fwci;
    if (typeof fwci === 'number' && Number.isFinite(fwci) && fwci > 0) {
        const piece = Math.min(22, Math.log10(fwci + 1) * 8);
        add += piece;
        if (fwci >= 2) labels.push('Strong vs-field citation impact (FWCI)');
        else if (fwci >= 1) labels.push('Above-average vs-field citations (FWCI)');
    }

    const p = metrics.citationPercentile;
    if (typeof p === 'number' && Number.isFinite(p)) {
        if (p >= 0.97) {
            add += 14;
            labels.push('Top citation percentile vs similar papers');
        } else if (p >= 0.9) {
            add += 10;
            labels.push('High citation percentile vs similar papers');
        } else if (p >= 0.75) {
            add += 5;
            labels.push('Elevated citation percentile vs similar papers');
        }
    } else if (metrics.isTopCitationPercentile) {
        add += 8;
        labels.push('Highly cited vs similar papers (OpenAlex)');
    }

    if (metrics.sourceIsCore) {
        add += 6;
        labels.push('Venue flagged as influential (OpenAlex “core”)');
    }

    return { add, labels };
}

const HIGH_IMPACT_JOURNALS = new Set([
    'new england journal of medicine', 'nejm',
    'the lancet', 'lancet',
    'jama', 'journal of the american medical association',
    'bmj', 'british medical journal',
    'nature medicine', 'nature',
    'science', 'science translational medicine',
    'cell', 'cell reports medicine',
    'annals of internal medicine',
    'plos medicine',
    'circulation',
    'journal of clinical oncology',
    'gastroenterology',
    'gut',
    'chest',
    'critical care medicine',
    'intensive care medicine',
    'american journal of respiratory and critical care medicine',
    'hepatology',
    'kidney international',
    'diabetes care',
    'diabetes',
    'journal of allergy and clinical immunology',
    'brain',
    'neurology',
    'annals of neurology',
    'journal of infectious diseases',
    'clinical infectious diseases',
    'blood',
    'journal of clinical investigation',
    'proceedings of the national academy of sciences', 'pnas',
]);

function computeImpactScore(article) {
    let score = 0;
    const factors = [];

    const citations = article.pmcrefcount ?? article.citationCount ?? 0;
    if (citations > 0) {
        // Emphasise heavily cited papers (log-scaled, higher cap than before)
        const citScore = Math.min(52, Math.log10(citations + 1) * 18);
        score += citScore;
        if (citations >= 2000) factors.push('Highly cited (2000+)');
        else if (citations >= 1000) factors.push('Highly cited (1000+)');
        else if (citations >= 100) factors.push('100+ citations');
        else if (citations >= 10) factors.push('10+ citations');
    }

    const g = guidelineEvidenceBonus(article);
    score += g.add;
    factors.push(...g.labels);

    const oaBonus = openAlexRankingBonus(article._openalexMetrics);
    score += oaBonus.add;
    factors.push(...oaBonus.labels);

    const year = parseInt(article.pubdate?.split(' ')[0] || article.year || '0', 10);
    if (year > 1990) {
        const age = Math.max(0, new Date().getFullYear() - year);
        const recencyScore = Math.max(0, 25 - age * 1.25);
        score += recencyScore;
        if (age <= 2) factors.push('Recent (≤2 years)');
        else if (age <= 5) factors.push('Recent (≤5 years)');
    }

    const journalName = (article.source || article.journal || '').toLowerCase().trim();
    if (journalName && HIGH_IMPACT_JOURNALS.has(journalName)) {
        score += 24;
        factors.push('High-impact journal (curated tier)');
    }

    const isFree = article.isFree || !!article.pmcid || article.openAccess;
    if (isFree) {
        score += 5;
        factors.push('Open access');
    }

    if (article._source === 'pubmed') score += 2;
    else if (article._source === 'semantic') score += 1;

    const level = score >= 58 ? 'high' : score >= 32 ? 'medium' : 'low';
    return { score: Math.round(score * 10) / 10, level, factors, citations };
}

function sanitizeArticleOutput(article) {
    if (!article || typeof article !== 'object') return article;
    const quality = computeQualityScore(article);
    const ebmScore = article._ebmScore ?? getEbmScore(article);
    return {
        ...article,
        title: article.title ? escapeHtml(article.title) : article.title,
        abstract: article.abstract ? escapeHtml(article.abstract) : article.abstract,
        source: article.source ? escapeHtml(article.source) : article.source,
        _impact: computeImpactScore(article),
        _quality: quality,
        _ebmScore: ebmScore,
        _ebmLabel: ebmLabel(ebmScore),
        _isPreprint: article._isPreprint ?? isPreprint(article),
    };
}

function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        return { valid: false, error: 'Query is required' };
    }
    const trimmed = query.trim();
    if (trimmed.length === 0) return { valid: false, error: 'Query cannot be empty' };
    if (trimmed.length > 500) return { valid: false, error: 'Query too long (max 500 characters)' };
    const dangerousPatterns = [/<script/i, /javascript:/i, /onerror\s*=/i, /eval\s*\(/i];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) return { valid: false, error: 'Query contains invalid characters' };
    }
    const { sanitizeInput } = require('./validation');
    return { valid: true, sanitized: sanitizeInput(trimmed) };
}

function validatePagination(page, limit) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return {
        page: isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
        limit: isNaN(limitNum) || limitNum < 1 ? 20 : Math.min(limitNum, 100),
    };
}

function sanitizeArticleIdParam(id) {
    if (!id || typeof id !== 'string') return null;
    const t = id.trim();
    if (!t.length || t.length > 128) return null;
    return t;
}

module.exports = {
    HIGH_IMPACT_JOURNALS,
    hasGuidelinePubtype,
    computeImpactScore,
    sanitizeArticleOutput,
    validateQuery,
    validatePagination,
    sanitizeArticleIdParam,
};
