'use strict';

/**
 * Evidence snapshots (contract v2): the exact evidence a search showed, replayable later.
 *
 *   snapshot (search_evidence_snapshots)   query, ordering, lane/route per item, policy and
 *                                          ranker versions, explicit truncation, evidence added
 *                                          after the search
 *   source version (evidence_source_versions)   content-addressed and immutable: id = hash of the
 *                                          text, so a changed abstract is a NEW row. A snapshot
 *                                          points at the version it saw; replay reads that row and
 *                                          never substitutes updated text.
 *
 * Persistence never throws into a search: a failure is returned as status 'failed' so the caller
 * can surface it, and generation treats "no durable snapshot" as an unverified lineage state.
 * Not a clinical writer: audit, replay and provenance only.
 */

const crypto = require('crypto');
const { sectionEntries } = require('../clinical/clinicalFacts');
const logger = require('../../config/logger');

const SNAPSHOT_CONTRACT_VERSION = 2;
/** Explicit cap on stored evidence per snapshot. A snapshot over the cap is marked truncated. */
const MAX_SNAPSHOT_ARTICLES = 100;
const MAX_PASSAGE_CHARS = 4000;
const MAX_PASSAGES_PER_SOURCE = 40;
const DEFAULT_QUERY_RETENTION_DAYS = 365;

function snapshotEnabled(env = process.env) {
    return String(env.SEARCH_EVIDENCE_SNAPSHOTS || 'on').toLowerCase() !== 'off';
}

function articleUid(article) {
    return String(article?.uid || article?.pmid || article?.id || '').trim();
}

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
    return cleanText(text)
        .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function wordCount(value) {
    return cleanText(value).split(/\s+/).filter(Boolean).length;
}

/**
 * What the reader could actually see of this source. Anything stronger than abstract_only
 * means passages beyond the abstract were available to support a claim. Both the plain
 * `sections` shape and the enrichment pipeline's `_fullTextSections` shape count: synopsis
 * prompts consume the latter, so a snapshot that ignored it would store abstract_only while
 * the model read full text.
 */
function accessStateOf(article) {
    const sections = sectionEntries(article);
    const hasSections = sections.some(([, text]) => wordCount(text) >= 40);
    if (hasSections || wordCount(article?.fullText || article?.full_text) >= 200) return 'full_text';
    if (cleanText(article?.abstract)) return 'abstract_only';
    return 'metadata_only';
}

/*
 * Section text comes from the canonical clinical-facts layer, so what the snapshot stores is exactly
 * what every other consumer reads out of an article.
 */

/**
 * Build the immutable source version for an article. The id hashes the text the version
 * contains, so identical text always resolves to the same row and changed text never
 * overwrites it. Passage ids are stable for identical text.
 */
function buildSourceVersion(article) {
    const uid = articleUid(article);
    const title = cleanText(article?.title);
    const abstract = cleanText(article?.abstract);
    const sections = sectionEntries(article);
    const fullText = cleanText(article?.fullText || article?.full_text);
    const canonical = JSON.stringify({ uid, title, abstract, sections, fullText: fullText.slice(0, MAX_PASSAGE_CHARS * 4) });
    const id = sha256(canonical);
    const prefix = id.slice(0, 12);

    const passages = [];
    if (title) passages.push({ id: `${prefix}:title`, kind: 'title', text: title.slice(0, MAX_PASSAGE_CHARS) });
    splitSentences(abstract).forEach((text, i) => {
        passages.push({ id: `${prefix}:abstract:${i + 1}`, kind: 'abstract', text: text.slice(0, MAX_PASSAGE_CHARS) });
    });
    for (const [name, text] of sections) {
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
        passages.push({ id: `${prefix}:section:${key}`, kind: 'section', section: name, text: text.slice(0, MAX_PASSAGE_CHARS) });
    }
    if (!sections.length && fullText) {
        passages.push({ id: `${prefix}:fulltext`, kind: 'fulltext', text: fullText.slice(0, MAX_PASSAGE_CHARS) });
    }
    // Explicit truncation report: consumers (and the review of a replay) must be able to
    // tell that the stored passages are a cap, not the whole source.
    const truncated = passages.length > MAX_PASSAGES_PER_SOURCE
        || passages.some((p) => p.text.length >= MAX_PASSAGE_CHARS);

    return {
        id,
        uid,
        pmid: article?.pmid ? String(article.pmid) : null,
        doi: article?.doi ? String(article.doi) : null,
        title,
        passages: passages.slice(0, MAX_PASSAGES_PER_SOURCE),
        truncated,
        accessState: accessStateOf(article),
        source: article?.source ? String(article.source).slice(0, 60) : null,
    };
}

function policyVersions(queryRepresentation, env = process.env) {
    return {
        snapshotContract: SNAPSHOT_CONTRACT_VERSION,
        queryRepresentation: queryRepresentation?.version ?? null,
        gitSha: env.GIT_SHA || null,
        flags: {
            laneRetrieval: String(env.SEARCH_LANE_RETRIEVAL || 'off').toLowerCase(),
            entailmentMode: String(env.POLICY_ENTAILMENT_MODE || 'shadow').toLowerCase(),
            lineageEnforcement: String(env.EVIDENCE_LINEAGE_ENFORCEMENT || 'shadow').toLowerCase(),
        },
    };
}

function sourceVersionRow(version, now) {
    return [
        version.id, version.uid, version.pmid, version.doi, version.title.slice(0, 1000),
        JSON.stringify(version.passages), version.accessState, version.source, now,
    ];
}

/**
 * Write source versions in batches rather than one statement each.
 *
 * Snapshot persistence is awaited on the search path, so one round trip per article put ~20 of them
 * (up to MAX_SNAPSHOT_ARTICLES) in series in front of every response: negligible on local SQLite,
 * real latency against a networked Postgres. Multi-row INSERT ... ON CONFLICT DO NOTHING is portable
 * across both engines. The chunk keeps the statement under parameter limits.
 */
const SOURCE_VERSION_COLUMNS = 9;
const SOURCE_VERSION_CHUNK = 50;

async function upsertSourceVersions(db, versions, now) {
    const list = Array.isArray(versions) ? versions : [versions];
    for (let i = 0; i < list.length; i += SOURCE_VERSION_CHUNK) {
        const chunk = list.slice(i, i + SOURCE_VERSION_CHUNK);
        const tuples = chunk.map(() => `(${new Array(SOURCE_VERSION_COLUMNS).fill('?').join(', ')})`).join(', ');
        await db.run(
            `INSERT INTO evidence_source_versions
                (id, article_uid, pmid, doi, title, passages, access_state, source, first_seen_at)
             VALUES ${tuples}
             ON CONFLICT (id) DO NOTHING`,
            chunk.flatMap((version) => sourceVersionRow(version, now))
        );
    }
}

/** Single-version convenience for callers outside the search path. */
async function upsertSourceVersion(db, version, now) {
    return upsertSourceVersions(db, [version], now);
}

/**
 * Persist a snapshot and its source versions.
 * @returns {Promise<{ id: string|null, status: 'persisted'|'disabled'|'failed', articleCount: number,
 *   articleTotal: number, truncated: boolean, sourceVersionCount: number, error?: string }>}
 */
async function persistSearchEvidenceSnapshot(db, {
    query,
    queryRepresentation = {},
    articles = [],
    userId = null,
    sessionId = null,
    origin = 'search',
    env = process.env,
} = {}) {
    const list = Array.isArray(articles) ? articles : [];
    const articleTotal = list.length;
    const base = { id: null, articleCount: 0, articleTotal, truncated: false, sourceVersionCount: 0 };
    if (!snapshotEnabled(env)) return { ...base, status: 'disabled' };
    if (!db || typeof db.run !== 'function') return { ...base, status: 'failed', error: 'no database handle' };

    const stored = list.filter((a) => articleUid(a)).slice(0, MAX_SNAPSHOT_ARTICLES);
    const truncated = list.filter((a) => articleUid(a)).length > MAX_SNAPSHOT_ARTICLES;
    const versions = stored.map((article) => ({ article, version: buildSourceVersion(article) }));
    const items = versions.map(({ article, version }, index) => ({
        uid: version.uid,
        versionId: version.id,
        rank: index + 1,
        lane: article._evidenceLane || null,
        route: article._eligibilityRoute || null,
        evidenceRank: article._evidenceRank || null,
        accessState: version.accessState,
        retracted: Boolean(article._retraction?.isRetracted),
    }));

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const write = async () => {
        await upsertSourceVersions(db, versions.map((v) => v.version), now);
        await db.run(
            `INSERT INTO search_evidence_snapshots
                (id, query_text, query_representation, article_uids, eligibility_routes,
                 user_id, session_id, created_at,
                 contract_version, origin, selected_order, evidence_items, policy_versions,
                 article_total, truncated, additional_evidence)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
            [
                id,
                String(query || '').slice(0, 500),
                JSON.stringify(queryRepresentation || {}),
                JSON.stringify(items.map((i) => i.uid)),
                JSON.stringify(Object.fromEntries(items.map((i) => [i.uid, { route: i.route, lane: i.lane, evidenceRank: i.evidenceRank }]))),
                userId ? String(userId) : null,
                sessionId ? String(sessionId) : null,
                now,
                SNAPSHOT_CONTRACT_VERSION,
                String(origin).slice(0, 40),
                JSON.stringify(items.map((i) => i.uid)),
                JSON.stringify(items),
                JSON.stringify(policyVersions(queryRepresentation, env)),
                articleTotal,
                truncated ? 1 : 0,
            ]
        );
    };
    try {
        if (typeof db.withTransaction === 'function') await db.withTransaction(write);
        else await write();
        return {
            id,
            status: 'persisted',
            articleCount: items.length,
            articleTotal,
            truncated,
            sourceVersionCount: new Set(versions.map((v) => v.version.id)).size,
            sourceVersions: Object.fromEntries(items.map((i) => [i.uid, i.versionId])),
        };
    } catch (err) {
        logger.warn({ err, origin }, 'evidence snapshot persistence failed');
        return { ...base, status: 'failed', error: String(err?.message || err).slice(0, 200) };
    }
}

function parseJson(value, fallback) {
    try {
        return value == null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

/** A snapshot is private to the user (or anonymous session) that produced it. */
function canAccessSnapshot(row, { userId = null, sessionId = null, isAdmin = false } = {}) {
    if (isAdmin) return true;
    if (row.user_id) return Boolean(userId) && String(row.user_id) === String(userId);
    if (row.session_id) return Boolean(sessionId) && String(row.session_id) === String(sessionId);
    return false;
}

async function loadSourceVersions(db, ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    const out = new Map();
    for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const rows = await db.all(
            `SELECT * FROM evidence_source_versions WHERE id IN (${chunk.map(() => '?').join(',')})`,
            chunk
        );
        for (const row of rows) {
            out.set(row.id, {
                id: row.id,
                uid: row.article_uid,
                pmid: row.pmid,
                doi: row.doi,
                title: row.title,
                passages: parseJson(row.passages, []),
                accessState: row.access_state,
                source: row.source,
                firstSeenAt: row.first_seen_at,
            });
        }
    }
    return out;
}

/**
 * Read a snapshot with the exact source versions it references.
 * @returns {Promise<{ ok: true, snapshot: object } | { ok: false, reason: 'not_found'|'forbidden' }>}
 */
async function getEvidenceSnapshot(db, id, { userId = null, sessionId = null, isAdmin = false, withSources = true } = {}) {
    const snapshotId = String(id || '').trim();
    if (!snapshotId) return { ok: false, reason: 'not_found' };
    const row = await db.get('SELECT * FROM search_evidence_snapshots WHERE id = ?', [snapshotId]);
    if (!row) return { ok: false, reason: 'not_found' };
    if (!canAccessSnapshot(row, { userId, sessionId, isAdmin })) return { ok: false, reason: 'forbidden' };

    const items = parseJson(row.evidence_items, []);
    const additional = parseJson(row.additional_evidence, []);
    const sources = withSources
        ? await loadSourceVersions(db, [...items.map((i) => i.versionId), ...additional.map((a) => a.versionId)])
        : new Map();
    return {
        ok: true,
        snapshot: {
            id: row.id,
            contractVersion: Number(row.contract_version || 1),
            origin: row.origin || 'search',
            query: row.query_text,
            queryRedactedAt: row.query_redacted_at || null,
            queryRepresentation: parseJson(row.query_representation, {}),
            createdAt: row.created_at,
            selectedOrder: parseJson(row.selected_order, []),
            items: items.map((item) => ({ ...item, source: sources.get(item.versionId) || null })),
            additionalEvidence: additional.map((item) => ({ ...item, source: sources.get(item.versionId) || null })),
            policyVersions: parseJson(row.policy_versions, {}),
            articleTotal: Number(row.article_total || items.length),
            truncated: Boolean(Number(row.truncated || 0)),
            // Legacy (v1) rows carry only uids: replay is not possible for them.
            replayable: Number(row.contract_version || 1) >= 2,
        },
    };
}

/**
 * Record evidence introduced after the initial search (a generation that used an article
 * the search did not show). The original snapshot is not rewritten; additions are listed
 * separately with the reason, so lineage always shows what was added and when.
 */
async function addEvidenceToSnapshot(db, id, articles, { userId = null, sessionId = null, reason = 'generation' } = {}) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => articleUid(a));
    if (!list.length) return { ok: true, added: [] };
    const found = await getEvidenceSnapshot(db, id, { userId, sessionId, withSources: false });
    if (!found.ok) return found;
    const row = await db.get('SELECT additional_evidence FROM search_evidence_snapshots WHERE id = ?', [id]);
    const existing = parseJson(row?.additional_evidence, []);
    const known = new Set(existing.map((a) => a.versionId));
    const now = new Date().toISOString();
    const added = [];
    for (const article of list) {
        const version = buildSourceVersion(article);
        if (known.has(version.id)) continue;
        await upsertSourceVersion(db, version, now);
        const entry = { uid: version.uid, versionId: version.id, reason: String(reason).slice(0, 60), addedAt: now, accessState: version.accessState };
        existing.push(entry);
        known.add(version.id);
        added.push(entry);
    }
    if (added.length) {
        await db.run('UPDATE search_evidence_snapshots SET additional_evidence = ? WHERE id = ?', [JSON.stringify(existing.slice(0, 200)), id]);
    }
    return { ok: true, added };
}

/**
 * The exact passages of one immutable source version, by id: what a claim rests on. Source
 * versions hold public bibliographic text (title, abstract, sections), not query or user data.
 * @returns {Promise<{ version: object|null, passages: object[] }>}
 */
async function getSourcePassages(db, versionId, passageIds = []) {
    const id = String(versionId || '').trim();
    if (!id) return { version: null, passages: [] };
    const row = await db.get('SELECT * FROM evidence_source_versions WHERE id = ?', [id]);
    if (!row) return { version: null, passages: [] };
    const all = parseJson(row.passages, []);
    const wanted = new Set((Array.isArray(passageIds) ? passageIds : []).map(String));
    return {
        version: { id: row.id, uid: row.article_uid, title: row.title, accessState: row.access_state, firstSeenAt: row.first_seen_at },
        passages: wanted.size ? all.filter((p) => wanted.has(p.id)) : all,
    };
}

/**
 * Retention. Query text is personal data: after `queryRetentionDays` it is redacted (the row,
 * ordering and source versions stay so historical attempts remain replayable). Source versions
 * are never deleted here: a snapshot, generated object or attempt may still point at one.
 */
async function redactExpiredSnapshotQueries(db, { queryRetentionDays = DEFAULT_QUERY_RETENTION_DAYS, now = new Date(), limit = 5000 } = {}) {
    const cutoff = new Date(now.getTime() - queryRetentionDays * 86400000).toISOString();
    const result = await db.run(
        `UPDATE search_evidence_snapshots
         SET query_text = '[redacted]', query_representation = '{}', query_redacted_at = ?
         WHERE created_at < ? AND query_redacted_at IS NULL
           AND id IN (SELECT id FROM search_evidence_snapshots WHERE created_at < ? AND query_redacted_at IS NULL LIMIT ?)`,
        [now.toISOString(), cutoff, cutoff, limit]
    );
    return { redacted: Number(result?.changes ?? result?.rowCount ?? 0), cutoff };
}

module.exports = {
    SNAPSHOT_CONTRACT_VERSION,
    MAX_SNAPSHOT_ARTICLES,
    DEFAULT_QUERY_RETENTION_DAYS,
    snapshotEnabled,
    accessStateOf,
    buildSourceVersion,
    upsertSourceVersion,
    upsertSourceVersions,
    persistSearchEvidenceSnapshot,
    getEvidenceSnapshot,
    addEvidenceToSnapshot,
    getSourcePassages,
    redactExpiredSnapshotQueries,
    canAccessSnapshot,
};
