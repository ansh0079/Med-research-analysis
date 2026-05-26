'use strict';

module.exports = (Sup) => class extends Sup {
    async upsertTopicCrosslink({
        topicA, normalizedTopicA, topicB, normalizedTopicB,
        linkType, sharedEvidence, strength, aiRationale,
    }) {
        let tA = topicA, ntA = normalizedTopicA, tB = topicB, ntB = normalizedTopicB;
        if (ntA > ntB) {
            [tA, ntA, tB, ntB] = [tB, ntB, tA, ntA];
        }
        await this.run(
            `INSERT OR IGNORE INTO topic_crosslinks
             (topic_a, normalized_topic_a, topic_b, normalized_topic_b, link_type, shared_evidence, strength, ai_rationale)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tA, ntA, tB, ntB, linkType,
             sharedEvidence != null ? String(sharedEvidence) : null,
             strength != null ? Number(strength) : 0.5,
             aiRationale != null ? String(aiRationale) : null]
        );
    }

    async getTopicCrosslinks(normalizedTopic, { limit = 10 } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
        const rows = await this.all(
            `SELECT * FROM topic_crosslinks
             WHERE normalized_topic_a = ? OR normalized_topic_b = ?
             ORDER BY strength DESC
             LIMIT ?`,
            [normalizedTopic, normalizedTopic, safeLimit]
        );
        return rows.map((row) => {
            const isA = row.normalized_topic_a === normalizedTopic;
            return {
                topic: isA ? row.topic_b : row.topic_a,
                normalizedTopic: isA ? row.normalized_topic_b : row.normalized_topic_a,
                linkType: row.link_type,
                sharedEvidence: row.shared_evidence ? (() => {
                    try { return JSON.parse(row.shared_evidence); } catch { return row.shared_evidence; }
                })() : null,
                strength: row.strength,
                aiRationale: row.ai_rationale,
                createdAt: row.created_at,
            };
        });
    }
};
