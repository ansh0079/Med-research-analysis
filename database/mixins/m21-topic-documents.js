'use strict';

const REVIEW_STATES = new Set(['unreviewed', 'confirmed', 'rejected']);

module.exports = (Sup) => class extends Sup {
    /**
     * Link a document to a topic. A re-load refreshes the descriptive fields but never changes a decision a
     * reviewer has already made.
     */
    async upsertTopicDocument({ topicId, topic, pmid, docKind = null, fit = null, sourceBatch = null, note = null }) {
        const id = String(topicId || '').trim();
        const doc = String(pmid || '').trim();
        if (!id || !topic || !doc) throw new Error('topicId, topic and pmid are required');
        const now = new Date().toISOString();
        const existing = await this.get('SELECT id FROM topic_documents WHERE topic_id = ? AND pmid = ?', [id, doc]);
        if (existing) {
            await this.run(
                `UPDATE topic_documents SET topic = ?, doc_kind = ?, fit = ?, source_batch = ?, note = ?, updated_at = ? WHERE id = ?`,
                [topic, docKind, fit, sourceBatch, note, now, existing.id]
            );
            return { id: existing.id, created: false };
        }
        const res = await this.run(
            `INSERT INTO topic_documents (topic_id, topic, pmid, doc_kind, fit, source_batch, note, review_state, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?, ?)`,
            [id, topic, doc, docKind, fit, sourceBatch, note, now, now]
        );
        return { id: res.id, created: true };
    }

    /** Documents for a topic. Readers that serve learners pass reviewState 'confirmed'. */
    async getTopicDocuments(topicId, { reviewState = null } = {}) {
        const params = [String(topicId)];
        let sql = `SELECT d.*, g.title, g.source_year, g.evidence_tier, g.full_text_source
                   FROM topic_documents d LEFT JOIN guideline_documents g ON g.pmid = d.pmid
                   WHERE d.topic_id = ?`;
        if (reviewState) { sql += ' AND d.review_state = ?'; params.push(reviewState); }
        return this.all(`${sql} ORDER BY d.pmid`, params);
    }

    /** Topics that use a document. */
    async getDocumentTopics(pmid) {
        return this.all(
            'SELECT topic_id, topic, doc_kind, fit, review_state FROM topic_documents WHERE pmid = ? ORDER BY topic',
            [String(pmid)]
        );
    }

    async reviewTopicDocument(id, { state, reviewer }) {
        if (!REVIEW_STATES.has(state) || state === 'unreviewed') throw new Error('state must be confirmed or rejected');
        const now = new Date().toISOString();
        await this.run(
            'UPDATE topic_documents SET review_state = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?',
            [state, reviewer || null, now, now, id]
        );
    }
};
