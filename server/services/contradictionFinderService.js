'use strict';

const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { sanitizeArticleOutput } = require('../utils/articles');

function buildContradictionSearchQuery(topic, claimText) {
    const t = String(topic || '').trim().slice(0, 140);
    const c = String(claimText || '').trim().replace(/\[[^\]]+\]/g, '').slice(0, 220);
    const neg = '("no benefit" OR harm OR harmful OR "not associated" OR "failed to show" OR nonsignificant OR "neutral" OR futility OR contradiction OR "increased mortality")';
    return `${t} ${c} ${neg}`.replace(/\s+/g, ' ').trim();
}

function scoreContradictionRelevance(article, claimText) {
    const hay = `${article.title || ''} ${article.abstract || ''}`.toLowerCase();
    const claimTokens = String(claimText || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 5)
        .slice(0, 12);
    let hits = 0;
    for (const token of claimTokens) {
        if (hay.includes(token)) hits += 1;
    }
    const negSignals = ['no benefit', 'not associated', 'harm', 'failed', 'neutral', 'futility', 'contradict', 'worse'];
    const negHit = negSignals.some((s) => hay.includes(s));
    return hits + (negHit ? 3 : 0);
}

async function findContradictionsForClaim(db, { claimKey, topic, claimText, serverConfig, fetchImpl, limit = 10 } = {}) {
    const query = buildContradictionSearchQuery(topic, claimText);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 3), 20);
    const raw = await fetchUnifiedEvidence({
        query,
        safeLimit: safeLimit * 2,
        sourceList: ['pubmed', 'semantic', 'openalex'],
        serverConfig,
        fetch: fetchImpl,
        vectorList: [],
        telemetry: {},
    });
    const ranked = raw
        .map((a) => sanitizeArticleOutput(a))
        .map((a) => ({ article: a, score: scoreContradictionRelevance(a, claimText) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, safeLimit)
        .map((r) => ({
            ...r.article,
            _contradictionScore: r.score,
            _contradictionRationale: r.score >= 4
                ? 'Title/abstract language may limit or contradict the claim.'
                : 'Possibly relevant disconfirming or neutral evidence.',
        }));

    if (typeof db.saveClaimContradictionSearch === 'function') {
        await db.saveClaimContradictionSearch({
            claimKey,
            topic,
            searchQuery: query,
            results: ranked.map((a) => ({ uid: a.uid, title: a.title, score: a._contradictionScore })),
        }).catch(() => {});
    }

    return { claimKey, query, articles: ranked, count: ranked.length };
}

module.exports = { buildContradictionSearchQuery, findContradictionsForClaim };
