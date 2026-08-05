'use strict';

function parseArticlePublishInstant(article) {
    const pubdate = String(article?.pubdate || '').trim();
    if (pubdate) {
        const yearMonth = pubdate.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
        if (yearMonth) {
            const y = Number(yearMonth[1]);
            const m = yearMonth[2] ? Number(yearMonth[2]) - 1 : 0;
            const d = yearMonth[3] ? Number(yearMonth[3]) : 1;
            if (y >= 1800 && y <= 2100) return new Date(Date.UTC(y, m, d));
        }
        const parsed = Date.parse(pubdate);
        if (Number.isFinite(parsed)) return new Date(parsed);
    }
    const year = Number(article?.year);
    if (Number.isInteger(year) && year >= 1800 && year <= 2100) {
        return new Date(Date.UTC(year, 0, 1));
    }
    return null;
}

function isArticleNewerThan(article, sinceInstant) {
    if (!sinceInstant) return true;
    const published = parseArticlePublishInstant(article);
    if (!published) return true;
    return published.getTime() > sinceInstant.getTime();
}

function normalizeTeachingClaimKey(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function teachingClaimOverlap(a, b) {
    const tokensA = new Set(normalizeTeachingClaimKey(a).split(' ').filter((w) => w.length >= 4));
    const tokensB = new Set(normalizeTeachingClaimKey(b).split(' ').filter((w) => w.length >= 4));
    if (!tokensA.size || !tokensB.size) return 0;
    let shared = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) shared += 1;
    }
    return shared / Math.max(tokensA.size, tokensB.size);
}

function findMatchingTeachingPointIndex(teachingPoints, existingPoint, { threshold = 0.35 } = {}) {
    let bestIdx = -1;
    let bestScore = 0;
    (teachingPoints || []).forEach((tp, idx) => {
        const claim = String(tp.claim || tp.text || '');
        const score = teachingClaimOverlap(claim, existingPoint);
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    });
    return bestScore >= threshold ? bestIdx : -1;
}

module.exports = {
    parseArticlePublishInstant,
    isArticleNewerThan,
    normalizeTeachingClaimKey,
    teachingClaimOverlap,
    findMatchingTeachingPointIndex,
};
