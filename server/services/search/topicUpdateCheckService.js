'use strict';

// Weekly check for anything that should end a topic's monthly review early.
//
// Between reviews a topic is served from its stored search. That is right until something changes, so
// once a week every stored topic is checked for:
//   - a new guideline in our own guideline library for the topic since it was reviewed;
//   - new high-level evidence on PubMed since it was reviewed: an RCT, meta-analysis, systematic
//     review or guideline (a count query, no AI);
//   - a retraction among the papers the stored review shows.
// Any of these deletes that topic's stored review, so its next search (or the nightly review) fetches
// fresh. Nothing else is touched; AI content is remade only when someone opens it on the new evidence.

const { invalidateTopicReviews } = require('./topicReviewStore');

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const HIGH_LEVEL_FILTER = '(randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt] OR practice guideline[pt] OR guideline[pt])';

function pubmedDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** PMIDs of the papers a stored review shows. */
function reviewedPmids(payload) {
    try {
        const shared = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const ids = (shared?.articles || [])
            .map((a) => String(a?.pmid || '').trim() || String(a?.uid || '').replace(/^pubmed-/, ''))
            .filter((id) => /^\d{1,9}$/.test(id));
        return [...new Set(ids)].slice(0, 40);
    } catch {
        return [];
    }
}

async function esearchCount(term, { fetchImpl, serverConfig }) {
    const key = serverConfig?.keys?.ncbi;
    const email = serverConfig?.keys?.ncbiEmail || 'anonymous@localhost';
    const url = `${ESEARCH}?db=pubmed&retmode=json&retmax=0&term=${encodeURIComponent(term)}`
        + `&tool=signalmd_topic_update&email=${encodeURIComponent(email)}${key ? `&api_key=${encodeURIComponent(key)}` : ''}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`PubMed esearch ${res.status}`);
    const data = await res.json();
    return Number(data?.esearchresult?.count || 0);
}

async function newGuidelineCount(db, topic, since) {
    if (!db?.get) return 0;
    const normalized = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(topic) : String(topic).toLowerCase();
    const row = await db.get(
        'SELECT COUNT(*) AS n FROM topic_guidelines WHERE normalized_topic = ? AND created_at > ?',
        [normalized, since],
    ).catch(() => null);
    return Number(row?.n || 0);
}

/**
 * Check one stored topic. Returns the reasons it changed (empty when it has not).
 * A source that cannot be reached is reported as unchecked, never as a change.
 */
async function checkTopic(db, { topic, reviewedAt, payload }, { fetchImpl, serverConfig, sleep, paceMs }) {
    const reasons = [];
    const unchecked = [];

    if (await newGuidelineCount(db, topic, reviewedAt) > 0) reasons.push('new_guideline');

    const since = pubmedDate(reviewedAt);
    if (since) {
        try {
            const count = await esearchCount(`(${topic}) AND ${HIGH_LEVEL_FILTER} AND ("${since}"[edat] : "3000"[edat])`, { fetchImpl, serverConfig });
            if (count > 0) reasons.push('new_high_level_evidence');
        } catch {
            unchecked.push('pubmed_new_evidence');
        }
        if (paceMs > 0) await sleep(paceMs);
    }

    const pmids = reviewedPmids(payload);
    if (pmids.length) {
        try {
            const count = await esearchCount(`(${pmids.map((id) => `${id}[uid]`).join(' OR ')}) AND retracted publication[pt]`, { fetchImpl, serverConfig });
            if (count > 0) reasons.push('retraction');
        } catch {
            unchecked.push('pubmed_retraction');
        }
        if (paceMs > 0) await sleep(paceMs);
    }
    return { reasons, unchecked };
}

async function runTopicUpdateCheck(db, {
    fetchImpl,
    serverConfig,
    logger = console,
    now = Date.now(),
    // NCBI allows 3 requests/second without a key and 10 with one; stay well under either.
    paceMs = serverConfig?.keys?.ncbi ? 150 : 400,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    maxConsecutiveUnchecked = 10,
} = {}) {
    const summary = { topics: 0, invalidated: 0, byReason: {}, unchecked: 0, stoppedReason: null };
    if (!db?.all) return summary;

    const rows = await db.all(
        `SELECT topic, MIN(reviewed_at) AS reviewed_at, MAX(payload) AS payload
         FROM topic_search_reviews WHERE expires_at > ? GROUP BY topic`,
        [new Date(now).toISOString()],
    ).catch((err) => { logger.warn?.({ err }, 'topic update check: could not list stored topics'); return []; });

    let consecutiveUnchecked = 0;
    for (const row of rows) {
        summary.topics += 1;
        const { reasons, unchecked } = await checkTopic(db, { topic: row.topic, reviewedAt: row.reviewed_at, payload: row.payload }, { fetchImpl, serverConfig, sleep, paceMs });
        if (unchecked.length) {
            summary.unchecked += 1;
            consecutiveUnchecked += 1;
            // PubMed down or throttling: stop rather than hammer it; next week's run picks up the rest.
            if (consecutiveUnchecked >= maxConsecutiveUnchecked) { summary.stoppedReason = 'pubmed_unavailable'; break; }
        } else {
            consecutiveUnchecked = 0;
        }
        if (reasons.length) {
            await invalidateTopicReviews(db, row.topic);
            summary.invalidated += 1;
            for (const r of reasons) summary.byReason[r] = (summary.byReason[r] || 0) + 1;
            logger.info?.({ topic: row.topic, reasons }, 'topic review ended early: update found');
        }
    }
    logger.info?.({ summary }, 'topic update check finished');
    return summary;
}

module.exports = { HIGH_LEVEL_FILTER, reviewedPmids, checkTopic, runTopicUpdateCheck };
