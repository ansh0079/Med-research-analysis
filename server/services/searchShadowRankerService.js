'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL_PATH = path.join(__dirname, '../config/searchShadowRanker.json');

const FEATURE_NAMES = Object.freeze([
    'intercept',
    'titleOverlap',
    'abstractOverlap',
    'citationScore',
    'recencyScore',
    'qualityScore',
    'ebmScore',
    'pinnedLandmark',
    'openAccess',
    'guideline',
    'rct',
    'review',
]);

const DEFAULT_MODEL = Object.freeze({
    version: 'shadow-logistic-v1',
    source: 'default_heuristic_prior',
    featureNames: FEATURE_NAMES,
    weights: [0, 1.2, 0.6, 0.8, 0.35, 0.7, 0.65, 1.3, 0.15, 0.7, 0.45, 0.3],
});

function shadowRankerMode() {
    const mode = String(process.env.SEARCH_SHADOW_RANKER_MODE || 'shadow').toLowerCase();
    return ['shadow', 'apply'].includes(mode) ? mode : 'shadow';
}

function tokens(text) {
    return new Set(String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3));
}

function overlapScore(query, text) {
    const q = tokens(query);
    if (!q.size) return 0;
    const hay = tokens(text);
    let hit = 0;
    for (const token of q) if (hay.has(token)) hit += 1;
    return hit / q.size;
}

function articleYear(article = {}) {
    const raw = article.year || String(article.pubdate || '').slice(0, 4);
    const year = Number(raw);
    return Number.isFinite(year) ? year : 0;
}

function hasPubType(article, re) {
    return (Array.isArray(article?.pubtype) ? article.pubtype : [])
        .some((type) => re.test(String(type || '')));
}

function featureVector(article = {}, query = '') {
    const citations = Number(article.pmcrefcount ?? article.citationCount ?? article._ranking?.citations ?? 0) || 0;
    const year = articleYear(article);
    const age = year ? Math.max(0, new Date().getFullYear() - year) : 20;
    const quality = Number(article._quality?.score || 0) || 0;
    const ebm = Number(article._ebmScore ?? 0) || 0;
    const rankingText = String(article._ranking?.archetype || '');
    return [
        1,
        overlapScore(query, article.title),
        overlapScore(query, article.abstract),
        Math.min(1, Math.log10(citations + 1) / 4),
        Math.max(0, Math.min(1, 1 - age / 20)),
        Math.max(0, Math.min(1, quality / 100)),
        Math.max(0, Math.min(1, ebm / 7)),
        article._pinnedLandmark ? 1 : 0,
        article.isFree || article.openAccess ? 1 : 0,
        /guideline/i.test(rankingText) || hasPubType(article, /guideline/i) ? 1 : 0,
        /rct|random/i.test(rankingText) || hasPubType(article, /random/i) ? 1 : 0,
        /review|meta/i.test(rankingText) || hasPubType(article, /review|meta/i) ? 1 : 0,
    ];
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, x))));
}

function loadShadowRankerModel(modelPath = process.env.SEARCH_SHADOW_RANKER_MODEL || DEFAULT_MODEL_PATH) {
    if (String(process.env.SEARCH_SHADOW_RANKER_ENABLED || 'true').toLowerCase() === 'false') return null;
    try {
        if (modelPath && fs.existsSync(modelPath)) {
            const parsed = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
            if (Array.isArray(parsed.weights) && parsed.weights.length === FEATURE_NAMES.length) {
                return { ...DEFAULT_MODEL, ...parsed, featureNames: FEATURE_NAMES };
            }
        }
    } catch {
        return DEFAULT_MODEL;
    }
    return DEFAULT_MODEL;
}

function scoreArticle(model, article, query) {
    const weights = Array.isArray(model?.weights) ? model.weights : DEFAULT_MODEL.weights;
    const x = featureVector(article, query);
    const linear = x.reduce((sum, value, index) => sum + value * Number(weights[index] || 0), 0);
    return sigmoid(linear);
}

function shadowRankArticles(articles = [], { query = '', model = loadShadowRankerModel(), topK = 10 } = {}) {
    if (!model || !Array.isArray(articles) || !articles.length) return null;
    const ranked = articles
        .map((article, index) => ({
            articleUid: String(article.uid || article.pmid || article.doi || ''),
            currentRank: index + 1,
            shadowScore: Number(scoreArticle(model, article, query).toFixed(4)),
        }))
        .filter((row) => row.articleUid)
        .sort((a, b) => b.shadowScore - a.shadowScore)
        .map((row, index) => ({ ...row, shadowRank: index + 1 }))
        .slice(0, Math.min(Math.max(Number(topK) || 10, 1), 25));
    return {
        modelVersion: model.version || DEFAULT_MODEL.version,
        source: model.source || DEFAULT_MODEL.source,
        topK: ranked,
    };
}

function shadowRankerAgreement(shadowTopK = []) {
    const rows = Array.isArray(shadowTopK) ? shadowTopK : [];
    if (rows.length === 0) return { meanAbsoluteRankDelta: null, top1Changed: false, top3Overlap: null };
    const deltas = rows.map((row) => Math.abs(Number(row.currentRank || 0) - Number(row.shadowRank || 0)));
    const top3Current = new Set(rows.filter((row) => Number(row.currentRank) <= 3).map((row) => row.articleUid));
    const top3Shadow = new Set(rows.filter((row) => Number(row.shadowRank) <= 3).map((row) => row.articleUid));
    let overlap = 0;
    for (const uid of top3Current) if (top3Shadow.has(uid)) overlap += 1;
    return {
        meanAbsoluteRankDelta: Number((deltas.reduce((sum, value) => sum + value, 0) / deltas.length).toFixed(2)),
        top1Changed: rows.some((row) => Number(row.currentRank) === 1 && Number(row.shadowRank) !== 1),
        top3Overlap: Number((overlap / Math.max(1, Math.min(3, top3Current.size || top3Shadow.size))).toFixed(2)),
    };
}

function applyShadowRankerRollout(articles = [], { query = '', model = loadShadowRankerModel(), mode = shadowRankerMode() } = {}) {
    const shadow = shadowRankArticles(articles, { query, model, topK: Math.min(25, articles.length || 10) });
    if (!shadow) return { articles, shadowRanker: null };
    const agreement = shadowRankerAgreement(shadow.topK);
    const audit = {
        ...shadow,
        mode,
        applied: mode === 'apply',
        agreement,
    };
    if (mode !== 'apply') return { articles, shadowRanker: audit };

    const scoreByUid = new Map(shadow.topK.map((row) => [row.articleUid, row.shadowScore]));
    const rankedArticles = [...articles].sort((a, b) => {
        const aScore = scoreByUid.get(String(a.uid || a.pmid || a.doi || '')) ?? 0;
        const bScore = scoreByUid.get(String(b.uid || b.pmid || b.doi || '')) ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        return Number(a._learningRank || a._evidenceRank || 999) - Number(b._learningRank || b._evidenceRank || 999);
    }).map((article, index) => ({
        ...article,
        _shadowRankApplied: true,
        _shadowRank: index + 1,
        _shadowScore: scoreByUid.get(String(article.uid || article.pmid || article.doi || '')) ?? null,
    }));
    return { articles: rankedArticles, shadowRanker: audit };
}

function trainLogisticRanker(judgments = [], {
    learningRate = 0.08,
    epochs = 250,
    l2 = 0.001,
} = {}) {
    const rows = (Array.isArray(judgments) ? judgments : [])
        .map((row) => ({
            x: featureVector(row.article || row, row.query),
            y: Number(row.label ?? row.relevant ?? row.clicked ?? row.saved ?? 0) > 0 ? 1 : 0,
        }))
        .filter((row) => row.x.length === FEATURE_NAMES.length);
    if (rows.length < 10) return { ok: false, reason: `need at least 10 judgments (have ${rows.length})` };
    const weights = Array(FEATURE_NAMES.length).fill(0);
    for (let epoch = 0; epoch < epochs; epoch += 1) {
        for (const row of rows) {
            const p = sigmoid(row.x.reduce((sum, value, index) => sum + value * weights[index], 0));
            const err = row.y - p;
            for (let i = 0; i < weights.length; i += 1) {
                weights[i] += learningRate * (err * row.x[i] - l2 * weights[i]);
            }
        }
    }
    return {
        ok: true,
        version: `shadow-logistic-trained-${new Date().toISOString().slice(0, 10)}`,
        source: 'trained_judgments',
        n: rows.length,
        positives: rows.filter((row) => row.y === 1).length,
        featureNames: FEATURE_NAMES,
        weights: weights.map((w) => Number(w.toFixed(6))),
    };
}

module.exports = {
    DEFAULT_MODEL,
    FEATURE_NAMES,
    featureVector,
    scoreArticle,
    shadowRankArticles,
    trainLogisticRanker,
    loadShadowRankerModel,
    shadowRankerAgreement,
    applyShadowRankerRollout,
    shadowRankerMode,
};
