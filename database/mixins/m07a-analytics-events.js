'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const crypto = require('crypto');

function extractSynthesisSnapshotClaims(synthesis = {}) {
    const candidates = [
        synthesis.clinicalBottomLine,
        synthesis.overallAnswer,
        synthesis.consensus,
        synthesis.limitations,
        synthesis.researchGaps,
        synthesis.clinicalImplications,
        synthesis.practiceImpact?.mondayMorningLine,
        synthesis.practiceImpact?.rationale,
        synthesis.clinicalActionCard?.recommendation,
        synthesis.clinicalActionCard?.caveat,
        ...(Array.isArray(synthesis.keyFindings) ? synthesis.keyFindings : []),
        ...(Array.isArray(synthesis.agreement) ? synthesis.agreement : []),
        ...(Array.isArray(synthesis.uncertainties) ? synthesis.uncertainties : []),
        ...(Array.isArray(synthesis.conflicts) ? synthesis.conflicts : []),
    ];
    const seen = new Set();
    return candidates
        .map((claim) => String(typeof claim === 'object' && claim !== null
            ? claim.summary || claim.finding || claim.text || claim.claim || ''
            : claim || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 700))
        .filter((claim) => {
            if (claim.length < 12) return false;
            const key = claim.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 24);
}

function buildSynthesisSnapshotFingerprint(synthesis = {}) {
    const claims = extractSynthesisSnapshotClaims(synthesis);
    const normalized = claims
        .map((claim) => claim.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim())
        .sort();
    return {
        claims,
        fingerprint: crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
    };
}

module.exports = (Sup) => class extends Sup {
// Analytics Operations
// ==========================================

async logEvent(eventType, sessionId, metadata = {}) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('analytics')
        .values({
            event_type: eventType,
            session_id: sessionId,
            metadata: JSON.stringify(metadata),
            created_at: new Date().toISOString()
        })
        .execute();
}

async getRecentSynopsisViews(userId, { days = 60, limit = 200 } = {}) {
    if (!userId) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const safeLimit = Math.min(Number(limit) || 200, 500);
    return this.all(
        `SELECT json_extract(metadata, '$.articleId') AS article_id, created_at
         FROM analytics
         WHERE event_type = 'synopsis'
           AND json_extract(metadata, '$.userId') = ?
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, since, safeLimit]
    );
}

async getAnalytics(startDate, endDate) {
    return this.all(
        `SELECT event_type, COUNT(*) as count, date(created_at) as date
         FROM analytics 
         WHERE created_at BETWEEN ? AND ?
         GROUP BY event_type, date(created_at)
         ORDER BY date`,
        [startDate, endDate]
    );
}

async getDailyStats(days = 30) {
    if (this.isPostgres) {
        return this.all(
            `SELECT 
                DATE(created_at) as date,
                COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
                COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
                COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
             FROM analytics 
             WHERE created_at >= NOW() - INTERVAL '1 day' * ?
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [days]
        );
    }
    return this.all(
        `SELECT 
            date(created_at) as date,
            COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
            COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
            COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
         FROM analytics 
         WHERE created_at >= date('now', '-' || ? || ' days')
         GROUP BY date(created_at)
         ORDER BY date DESC`
    , [days]);
}

// ── Synthesis snapshots (staleness detection) ─────────────────────────────

async saveSynthesisSnapshot(topic, synthesis, articleUids = []) {
    const normalizedUids = Array.isArray(articleUids) ? articleUids : [];
    const normalized = this.normalizeTopic(topic);
    const consensusText = String(synthesis?.consensus || synthesis?.overallAnswer || '').slice(0, 2000);
    const keyFindingCount = Array.isArray(synthesis?.keyFindings) ? synthesis.keyFindings.length : 0;
    const generatedAt = new Date().toISOString();
    const claimFingerprint = buildSynthesisSnapshotFingerprint(synthesis);
    await this.run(
        `INSERT INTO synthesis_snapshots
           (normalized_topic, topic, consensus_text, evidence_grade, key_finding_count, article_count, article_uids, claim_fingerprint, claim_texts_json, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            normalized,
            String(topic).slice(0, 200),
            consensusText,
            String(synthesis?.evidenceGrade || 'MODERATE'),
            keyFindingCount,
            normalizedUids.length,
            JSON.stringify(normalizedUids.slice(0, 20)),
            claimFingerprint.fingerprint,
            JSON.stringify(claimFingerprint.claims),
            generatedAt,
        ]
    );
}

async getLatestSynthesisSnapshots(topic, limit = 2) {
    const normalized = this.normalizeTopic(topic);
    return this.all(
        `SELECT * FROM synthesis_snapshots WHERE normalized_topic = ?
         ORDER BY generated_at DESC LIMIT ?`,
        [normalized, Math.min(limit, 10)]
    );
}

// ── Product quality metrics ───────────────────────────────────────────────

async recordProductQualityFeedback({
    userId = null,
    sessionId = null,
    productType,
    topic = null,
    factualAccuracy = null,
    completeness = null,
    clinicalUsefulness = null,
    timeSavedMinutes = null,
    comment = null,
    metadata = {},
} = {}) {
    if (!this.kysely || !productType) return null;
    const now = new Date().toISOString();
    return this.kysely
        .insertInto('product_quality_feedback')
        .values({
            user_id: userId || null,
            session_id: sessionId || null,
            product_type: String(productType).slice(0, 40),
            topic: topic ? String(topic).slice(0, 240) : null,
            factual_accuracy: factualAccuracy != null ? Number(factualAccuracy) : null,
            completeness: completeness != null ? Number(completeness) : null,
            clinical_usefulness: clinicalUsefulness != null ? Number(clinicalUsefulness) : null,
            time_saved_minutes: timeSavedMinutes != null ? Number(timeSavedMinutes) : null,
            comment: comment ? String(comment).slice(0, 1000) : null,
            metadata_json: JSON.stringify(metadata || {}),
            created_at: now,
        })
        .execute();
}

_metricsSinceIso(days) {
    const safeDays = Math.min(90, Math.max(1, Number(days) || 30));
    return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
}

async getSearchImpressionMetricsWindow(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT search_id, position, was_clicked, was_saved, dwell_time_ms
         FROM search_result_impressions
         WHERE created_at >= ?
         ORDER BY search_id ASC, position ASC`,
        [since]
    );
}

async getSearchClickLatencyEvents(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT metadata, created_at
         FROM analytics
         WHERE event_type = 'search_result_click'
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 5000`,
        [since]
    );
    return rows.map((row) => {
        const meta = safeJsonParse(row.metadata, {});
        return { elapsed_ms: Number(meta.elapsedMs ?? meta.dwellMs ?? 0) };
    }).filter((row) => row.elapsed_ms > 0);
}

async getProductQualityFeedbackWindow(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT product_type, factual_accuracy, completeness, clinical_usefulness, time_saved_minutes
         FROM product_quality_feedback
         WHERE created_at >= ?`,
        [since]
    );
}

async getSynthesisQualityHintsForTopic(topic, { days = 90, limit = 20 } = {}) {
    if (!this.kysely || !topic) return null;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.all(
        `SELECT clinical_usefulness, factual_accuracy, completeness, metadata_json, time_saved_minutes
         FROM product_quality_feedback
         WHERE product_type = 'synthesis'
           AND topic IS NOT NULL
           AND LOWER(TRIM(topic)) = LOWER(TRIM(?))
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [String(topic), since, safeLimit]
    ).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const usefulness = rows.map((r) => Number(r.clinical_usefulness)).filter((n) => n >= 1 && n <= 5);
    const factual = rows.map((r) => Number(r.factual_accuracy)).filter((n) => n >= 1 && n <= 5);
    const completeness = rows.map((r) => Number(r.completeness)).filter((n) => n >= 1 && n <= 5);
    const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const avgClinicalUsefulness = avg(usefulness);
    const avgFactualAccuracy = avg(factual);
    const avgCompleteness = avg(completeness);
    const lowRatedAspects = [];
    if (avgFactualAccuracy != null && avgFactualAccuracy < 3.5) lowRatedAspects.push('factual accuracy');
    if (avgCompleteness != null && avgCompleteness < 3.5) lowRatedAspects.push('completeness');
    if (avgClinicalUsefulness != null && avgClinicalUsefulness < 3.5) lowRatedAspects.push('clinical usefulness');

    return {
        sampleSize: rows.length,
        avgClinicalUsefulness,
        avgFactualAccuracy,
        avgCompleteness,
        lowRatedAspects,
    };
}

async getUserRetentionCohort(days = 30) {
    if (!this.kysely) return [];
    const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
    const halfMs = (safeDays / 2) * 24 * 60 * 60 * 1000;
    const recentStart = new Date(Date.now() - halfMs).toISOString();
    const priorStart = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    return this.all(
        `SELECT DISTINCT prior.user_id,
                CASE WHEN recent.user_id IS NOT NULL THEN 1 ELSE 0 END AS returned
         FROM (
             SELECT DISTINCT user_id
             FROM learning_events
             WHERE user_id IS NOT NULL
               AND occurred_at >= ?
               AND occurred_at < ?
         ) prior
         LEFT JOIN (
             SELECT DISTINCT user_id
             FROM learning_events
             WHERE user_id IS NOT NULL
               AND occurred_at >= ?
         ) recent ON recent.user_id = prior.user_id`,
        [priorStart, recentStart, recentStart]
    );
}

async getSearchRefinementStats(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT session_sequence_index
         FROM searches
         WHERE created_at >= ?
           AND session_sequence_index > 0`,
        [since]
    );
}

async getKnowledgeProgressionSnapshot(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT memory_score, memory_tier, normalized_topic
         FROM user_topic_memory
         WHERE updated_at >= ?`,
        [since]
    );
}

async getRecommendationSatisfactionEvents(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT event_type
         FROM learning_events
         WHERE occurred_at >= ?
           AND event_type IN ('feedback_helpful', 'feedback_confusing')`,
        [since]
    );
}

async getSearchFeedbackStats(days = 30) {
    if (!this.kysely) return { helpful: 0, notHelpful: 0, total: 0, notHelpfulRate: null };
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT feedback_type, COUNT(*) AS count
         FROM search_result_feedback
         WHERE created_at >= ?
         GROUP BY feedback_type`,
        [since]
    );
    const counts = Object.fromEntries(rows.map((row) => [String(row.feedback_type), Number(row.count || 0)]));
    const helpful = Number(counts.helpful || 0);
    const notHelpful = Number(counts.not_helpful || 0);
    const total = helpful + notHelpful;
    return {
        helpful,
        notHelpful,
        total,
        notHelpfulRate: total ? notHelpful / total : null,
    };
}

async getSearchNoClickStats(days = 30) {
    if (!this.kysely) return { searchCount: 0, noClickCount: 0, noClickRate: null, sampleTopics: [] };
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT s.id AS search_id,
                s.query,
                s.normalized_topic,
                SUM(CASE WHEN i.was_clicked = 1 OR i.was_saved = 1 OR i.dwell_time_ms >= 30000 THEN 1 ELSE 0 END) AS relevant_interactions
         FROM searches s
         JOIN search_result_impressions i ON i.search_id = s.id
         WHERE s.created_at >= ?
         GROUP BY s.id, s.query, s.normalized_topic`,
        [since]
    );
    const noClickRows = rows.filter((row) => Number(row.relevant_interactions || 0) === 0);
    const topicCounts = new Map();
    for (const row of noClickRows) {
        const topic = String(row.normalized_topic || row.query || '').trim().toLowerCase();
        if (!topic) continue;
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
    const sampleTopics = [...topicCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));
    const searchCount = rows.length;
    const noClickCount = noClickRows.length;
    return {
        searchCount,
        noClickCount,
        noClickRate: searchCount ? noClickCount / searchCount : null,
        sampleTopics,
    };
}

async getLowRecallSearchStatsWindow(days = 30, limit = 50) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.all(
        `SELECT display_query, normalized_topic, result_count, attempt_count, last_seen_at, sources_json
         FROM low_recall_searches
         WHERE last_seen_at >= ?
         ORDER BY attempt_count DESC, last_seen_at DESC
         LIMIT ?`,
        [since, safeLimit]
    );
}

async getTopicSearchFailureClusters(days = 30, limit = 20) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const rows = await this.all(
        `SELECT normalized_topic AS topic,
                COUNT(*) AS low_recall_count,
                MAX(result_count) AS max_result_count,
                MAX(last_seen_at) AS last_seen_at
         FROM low_recall_searches
         WHERE last_seen_at >= ?
           AND normalized_topic IS NOT NULL
           AND TRIM(normalized_topic) != ''
         GROUP BY normalized_topic
         ORDER BY low_recall_count DESC, last_seen_at DESC
         LIMIT ?`,
        [since, safeLimit]
    );
    return rows.map((row) => ({
        topic: row.topic,
        lowRecallCount: Number(row.low_recall_count || 0),
        maxResultCount: Number(row.max_result_count || 0),
        lastSeenAt: row.last_seen_at,
    }));
}

async getSearchVolumeStats(days = 30) {
    if (!this.kysely) return { totalSearches: 0, reformulatedSearches: 0, reformulationRate: null };
    const since = this._metricsSinceIso(days);
    const row = await this.get(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN session_sequence_index > 0 THEN 1 ELSE 0 END) AS reformulated
         FROM searches
         WHERE created_at >= ?`,
        [since]
    );
    const totalSearches = Number(row?.total || 0);
    const reformulatedSearches = Number(row?.reformulated || 0);
    return {
        totalSearches,
        reformulatedSearches,
        reformulationRate: totalSearches ? reformulatedSearches / totalSearches : null,
    };
}

async getSynthesisCitationValidationStats(days = 30) {
    if (!this.kysely) return { passRate: null, sampleSize: 0 };
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT metadata
         FROM analytics
         WHERE event_type = 'synthesize'
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 2000`,
        [since]
    );
    let pass = 0;
    let total = 0;
    for (const row of rows) {
        const meta = safeJsonParse(row.metadata, {});
        if (meta.citationOk === undefined && meta.citationValidationOk === undefined) continue;
        total += 1;
        if (meta.citationOk === true || meta.citationValidationOk === true) pass += 1;
    }
    return {
        passRate: total ? pass / total : null,
        sampleSize: total,
    };
}
};
