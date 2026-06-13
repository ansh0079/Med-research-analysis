'use strict';

module.exports = (Sup) => class extends Sup {

    mapContradictionRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            normalizedTopic: row.normalized_topic,
            severity: row.severity || 'nuanced',
            contradictionSummary: row.contradiction_summary,
            bodyAPosition: row.body_a_position,
            bodyBPosition: row.body_b_position,
            clinicalImplication: row.clinical_implication,
            aiConfidence: Number(row.ai_confidence || 0),
            status: row.status || 'ai_detected',
            detectedAt: row.detected_at,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            guidelineA: {
                id: row.guideline_a_id,
                sourceBody: row.a_source_body,
                sourceYear: row.a_source_year ? Number(row.a_source_year) : null,
                sourceUrl: row.a_source_url,
                recommendationStrength: row.a_recommendation_strength,
                recommendationText: row.a_recommendation_text,
            },
            guidelineB: {
                id: row.guideline_b_id,
                sourceBody: row.b_source_body,
                sourceYear: row.b_source_year ? Number(row.b_source_year) : null,
                sourceUrl: row.b_source_url,
                recommendationStrength: row.b_recommendation_strength,
                recommendationText: row.b_recommendation_text,
            },
        };
    }

    async upsertContradiction({
        guidelineAId, guidelineBId, normalizedTopic,
        severity, contradictionSummary, bodyAPosition, bodyBPosition,
        clinicalImplication, aiConfidence,
    }) {
        const aId = String(guidelineAId);
        const bId = String(guidelineBId);
        const [safeA, safeB] = aId < bId ? [aId, bId] : [bId, aId];
        const now = new Date().toISOString();
        await this.run(
            `INSERT INTO guideline_contradictions
             (guideline_a_id, guideline_b_id, normalized_topic, severity,
              contradiction_summary, body_a_position, body_b_position,
              clinical_implication, ai_confidence, status, detected_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_detected', ?, ?, ?)
             ON CONFLICT (guideline_a_id, guideline_b_id) DO UPDATE SET
              severity = EXCLUDED.severity,
              contradiction_summary = EXCLUDED.contradiction_summary,
              body_a_position = EXCLUDED.body_a_position,
              body_b_position = EXCLUDED.body_b_position,
              clinical_implication = EXCLUDED.clinical_implication,
              ai_confidence = EXCLUDED.ai_confidence,
              detected_at = EXCLUDED.detected_at,
              updated_at = EXCLUDED.updated_at`,
            [safeA, safeB, normalizedTopic, severity || 'nuanced',
             contradictionSummary, bodyAPosition, bodyBPosition,
             clinicalImplication || null, Number(aiConfidence || 0),
             now, now, now]
        );
    }

    async getContradictionsForTopic(normalizedTopic) {
        const rows = await this.all(
            `SELECT gc.*,
                ga.source_body AS a_source_body, ga.source_year AS a_source_year,
                ga.recommendation_text AS a_recommendation_text, ga.recommendation_strength AS a_recommendation_strength,
                ga.source_url AS a_source_url,
                gb.source_body AS b_source_body, gb.source_year AS b_source_year,
                gb.recommendation_text AS b_recommendation_text, gb.recommendation_strength AS b_recommendation_strength,
                gb.source_url AS b_source_url
             FROM guideline_contradictions gc
             JOIN topic_guidelines ga ON gc.guideline_a_id = ga.id
             JOIN topic_guidelines gb ON gc.guideline_b_id = gb.id
             WHERE gc.normalized_topic = ?
               AND gc.status != 'dismissed'
             ORDER BY
               CASE gc.severity WHEN 'major' THEN 1 WHEN 'minor' THEN 2 ELSE 3 END,
               GREATEST(COALESCE(ga.source_year, 0), COALESCE(gb.source_year, 0)) DESC`,
            [normalizedTopic]
        );
        return rows.map(r => this.mapContradictionRow(r));
    }

    async getContradictionStats() {
        const rows = await this.all(
            `SELECT severity, COUNT(*) AS cnt
             FROM guideline_contradictions
             WHERE status != 'dismissed'
             GROUP BY severity`
        );
        const stats = { total: 0, major: 0, minor: 0, nuanced: 0 };
        for (const row of rows) {
            const c = Number(row.cnt);
            stats[row.severity] = c;
            stats.total += c;
        }
        return stats;
    }
};
