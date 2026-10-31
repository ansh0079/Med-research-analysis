'use strict';

/**
 * Read side of topic_documents: which guidelines, reviews, meta-analyses and trials a reviewer has linked to a topic.
 *
 * A topic is known to the app in two ways -- a curriculum topic (uuid) and a topic_knowledge entry (lowercase,
 * query-style name) -- and links are stored under either key ('knowledge:<normalized topic>' for the second). Learners
 * only ever see CONFIRMED links; the admin listing shows every state so a reviewer can decide.
 */

const FULL_TEXT = new Set(['jats', 'pdf', 'manual', 'nice_html']);

async function topicKeysForName(db, topic) {
    const name = String(topic || '').trim();
    if (!name) return [];
    const keys = [];
    const curricula = await db.all('SELECT id FROM curriculum_topics WHERE lower(display_name) = lower(?)', [name]);
    for (const row of curricula) keys.push(String(row.id));
    const normalized = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(name)
        : name.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalized) keys.push(`knowledge:${normalized}`);
    return keys;
}

function mapRow(row) {
    return {
        id: row.id,
        topicId: row.topic_id,
        topic: row.topic,
        pmid: row.pmid,
        title: row.title || null,
        year: row.source_year || null,
        kind: row.doc_kind || null,
        fit: row.fit || null,
        note: row.note || null,
        reviewState: row.review_state,
        reviewedBy: row.reviewed_by || null,
        reviewedAt: row.reviewed_at || null,
        sourceBatch: row.source_batch || null,
        fullTextAvailable: FULL_TEXT.has(row.full_text_source),
    };
}

const SELECT = `SELECT d.*, g.title, g.source_year, g.full_text_source
                FROM topic_documents d LEFT JOIN guideline_documents g ON g.pmid = d.pmid`;

/** Confirmed documents for a topic, by display name. This is what learners are shown. */
async function getConfirmedDocumentsForTopic(db, topic) {
    const keys = await topicKeysForName(db, topic);
    if (!keys.length) return [];
    const marks = keys.map(() => '?').join(', ');
    const rows = await db.all(
        `${SELECT} WHERE d.topic_id IN (${marks}) AND d.review_state = 'confirmed' ORDER BY d.doc_kind, d.pmid`,
        keys,
    );
    const seen = new Set();
    return rows.map(mapRow).filter((doc) => (seen.has(doc.pmid) ? false : seen.add(doc.pmid)));
}

/** Admin listing across all states. */
async function listTopicDocuments(db, { state = '', search = '', limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (state) { where.push('d.review_state = ?'); params.push(state); }
    if (search) { where.push('(lower(d.topic) LIKE ? OR d.pmid = ?)'); params.push(`%${String(search).toLowerCase()}%`, String(search)); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await db.get(`SELECT COUNT(*) AS n FROM topic_documents d ${clause}`, params);
    const rows = await db.all(`${SELECT} ${clause} ORDER BY d.topic, d.pmid LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { total: Number(total?.n || 0), items: rows.map(mapRow) };
}

/**
 * How a draft's cited sources relate to the links reviewers have made for the topic. Informational: it never
 * blocks a draft, it tells the reviewer which sources nobody has linked to this topic yet.
 */
async function summariseSourceLinks(db, topicId, sources = []) {
    const rows = await db.all('SELECT pmid, review_state FROM topic_documents WHERE topic_id = ?', [String(topicId)]);
    const byPmid = new Map(rows.map((row) => [String(row.pmid), row.review_state]));
    const out = { confirmed: 0, unreviewed: 0, rejected: 0, notLinked: 0, unlinkedPmids: [] };
    for (const source of Array.isArray(sources) ? sources : []) {
        const pmid = source && source.pmid ? String(source.pmid) : '';
        if (!pmid) continue;
        const state = byPmid.get(pmid);
        if (state === 'confirmed') out.confirmed += 1;
        else if (state === 'unreviewed') out.unreviewed += 1;
        else if (state === 'rejected') out.rejected += 1;
        else { out.notLinked += 1; out.unlinkedPmids.push(pmid); }
    }
    return out;
}

module.exports = { getConfirmedDocumentsForTopic, listTopicDocuments, summariseSourceLinks, topicKeysForName };
