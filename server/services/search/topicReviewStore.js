'use strict';

// The month-long store for reviewed topic searches (migration 108).
//
// A topic is reviewed about once a month: its papers are fetched, filtered and ranked once, and that
// result is served until the review expires or an update signal invalidates it. This is the durable
// layer; Redis holds only a short hot copy in front of it.
//
// Every function degrades to "not stored" when the table or database is unavailable, so a storage
// fault means a fresh search, never a failed one.

const logger = require('../../config/logger');

const REVIEW_DAYS = (() => {
    const n = Number(process.env.TOPIC_REVIEW_DAYS);
    return Number.isFinite(n) && n >= 1 ? n : 30;
})();
const REVIEW_TTL_SECONDS = REVIEW_DAYS * 86400;

/** The stored result for this key, or null when there is none or it has expired. */
async function getReviewedSearch(db, cacheKey, { now = Date.now() } = {}) {
    if (!db?.get || !cacheKey) return null;
    try {
        const row = await db.get(
            'SELECT payload, reviewed_at, expires_at FROM topic_search_reviews WHERE cache_key = ? AND expires_at > ?',
            [cacheKey, new Date(now).toISOString()],
        );
        if (!row?.payload) return null;
        const shared = JSON.parse(row.payload);
        return shared && typeof shared === 'object' ? { shared, reviewedAt: row.reviewed_at, expiresAt: row.expires_at } : null;
    } catch (err) {
        logger.warn({ err }, 'topic review read failed; searching fresh');
        return null;
    }
}

/** Store a reviewed result for `ttlSeconds`. Returns true when stored. */
async function putReviewedSearch(db, { cacheKey, topic, quality, shared, ttlSeconds = REVIEW_TTL_SECONDS, now = Date.now() }) {
    if (!db?.run || !cacheKey || !shared || !(ttlSeconds > 0)) return false;
    try {
        await db.run(
            `INSERT INTO topic_search_reviews (cache_key, topic, quality, payload, reviewed_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (cache_key) DO UPDATE SET
                topic = excluded.topic,
                quality = excluded.quality,
                payload = excluded.payload,
                reviewed_at = excluded.reviewed_at,
                expires_at = excluded.expires_at`,
            [
                cacheKey,
                String(topic || '').slice(0, 300),
                String(quality || 'complete').slice(0, 20),
                JSON.stringify(shared),
                new Date(now).toISOString(),
                new Date(now + ttlSeconds * 1000).toISOString(),
            ],
        );
        return true;
    } catch (err) {
        logger.warn({ err, topic }, 'topic review write failed');
        return false;
    }
}

/** Expire every stored review for a topic early, so its next search or nightly review fetches fresh. */
async function invalidateTopicReviews(db, topic) {
    if (!db?.run || !topic) return 0;
    try {
        const result = await db.run('DELETE FROM topic_search_reviews WHERE LOWER(topic) = ?', [String(topic).trim().toLowerCase()]);
        return Number(result?.changes || 0);
    } catch (err) {
        logger.warn({ err, topic }, 'topic review invalidation failed');
        return 0;
    }
}

module.exports = { REVIEW_DAYS, REVIEW_TTL_SECONDS, getReviewedSearch, putReviewedSearch, invalidateTopicReviews };
