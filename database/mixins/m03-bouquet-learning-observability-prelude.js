'use strict';

const { safeJsonParse, toPgVectorLiteral, sqlAuthorityWeightedImpressionScore } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const { canonicalTopic, topicGroupKeys } = require('../../server/utils/topicKey');

// Signals are recorded under the literal query topic; a topic's readers must
// gather every synonym it may have been searched as ("aki", "aki diagnosis",
// "acute kidney injury"), or synonym searches never count toward it.
const inList = (keys) => keys.map(() => '?').join(',');

module.exports = (Sup) => class extends Sup {
// Cross-user bouquet signals (topic learning)
// ==========================================

// Called after every search with the ranked papers from the evidence bouquet.
// Aggregates across all users: which articles consistently surface for a topic.
async recordBouquetSignals(displayTopic, papers = []) {
    if (!this.kysely || !displayTopic || !papers.length) return;
    const normalized = this.normalizeTopic(displayTopic);
    if (!normalized) return;
    const display = String(displayTopic).trim().slice(0, 240);
    const now = new Date().toISOString();
    for (const p of papers) {
        if (!p?.uid) continue;
        const uid = String(p.uid);
        const archetype = p.archetype ? String(p.archetype) : null;
        const score = Number(p.compositeScore || 0);
        await this.run(
            `INSERT INTO topic_bouquet_signals
                (normalized_topic, display_topic, article_uid, archetype, composite_score, signal_count, last_seen_at, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)
             ON CONFLICT(normalized_topic, article_uid) DO UPDATE SET
               signal_count = topic_bouquet_signals.signal_count + 1,
               composite_score = (topic_bouquet_signals.composite_score * topic_bouquet_signals.signal_count + excluded.composite_score) / (topic_bouquet_signals.signal_count + 1),
               archetype = COALESCE(excluded.archetype, topic_bouquet_signals.archetype),
               display_topic = excluded.display_topic,
               last_seen_at = excluded.last_seen_at`,
            [normalized, display, uid, archetype, score, now, now]
        );
    }
}

// Returns the most consistently-ranked article UIDs for a topic, ordered by signal_count desc.
async getTopBouquetArticlesForTopic(normalizedTopic, limit = 8) {
    if (!this.kysely || !normalizedTopic) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 8, 1), 30);
    const keys = topicGroupKeys(normalizedTopic);
    const rows = await this.all(
        `SELECT article_uid AS uid, MAX(archetype) AS archetype,
                SUM(composite_score * signal_count) / SUM(signal_count) AS composite_score,
                SUM(signal_count) AS signal_count
         FROM topic_bouquet_signals
         WHERE normalized_topic IN (${inList(keys)})
         GROUP BY article_uid
         ORDER BY signal_count DESC, composite_score DESC
         LIMIT ?`,
        [...keys, safeLimit]
    );
    return rows.map((r) => ({
        uid: r.uid,
        archetype: r.archetype,
        compositeScore: Number(r.composite_score || 0),
        signalCount: Number(r.signal_count || 0),
    }));
}

// Builds a loose topic graph edge by shared high-signal bouquet articles.
// No persistent graph table: edges are derived from compact bouquet signals.
async getRelatedBouquetTopicsForTopic(normalizedTopic, { limit = 5, minSharedArticles = 2 } = {}) {
    if (!this.kysely || !normalizedTopic) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 5, 1), 20);
    const safeMinShared = Math.min(Math.max(parseInt(String(minSharedArticles), 10) || 2, 1), 10);
    const rows = await this.all(
        `SELECT
            b.normalized_topic,
            COALESCE(MAX(b.display_topic), b.normalized_topic) AS display_topic,
            COUNT(DISTINCT b.article_uid) AS shared_articles,
            SUM(CASE WHEN a.signal_count < b.signal_count THEN a.signal_count ELSE b.signal_count END) AS shared_signal_strength,
            AVG((a.composite_score + b.composite_score) / 2.0) AS avg_composite_score
         FROM topic_bouquet_signals a
         JOIN topic_bouquet_signals b ON b.article_uid = a.article_uid
         WHERE a.normalized_topic = ?
           AND b.normalized_topic <> a.normalized_topic
         GROUP BY b.normalized_topic
         HAVING COUNT(DISTINCT b.article_uid) >= ?
         ORDER BY shared_articles DESC, shared_signal_strength DESC, avg_composite_score DESC
         LIMIT ?`,
        [normalizedTopic, safeMinShared, safeLimit]
    );
    return rows.map((r) => ({
        normalizedTopic: r.normalized_topic,
        displayTopic: r.display_topic || r.normalized_topic,
        sharedArticles: Number(r.shared_articles || 0),
        sharedSignalStrength: Number(r.shared_signal_strength || 0),
        averageCompositeScore: Number(r.avg_composite_score || 0),
    }));
}

async getClusterBouquetArticlesForTopic(normalizedTopic, { topicLimit = 5, articleLimit = 12, minSharedArticles = 2 } = {}) {
    if (!this.kysely || !normalizedTopic) return [];
    const related = await this.getRelatedBouquetTopicsForTopic(normalizedTopic, {
        limit: topicLimit,
        minSharedArticles,
    });
    const topics = [normalizedTopic, ...related.map((t) => t.normalizedTopic)].filter(Boolean);
    const placeholders = topics.map(() => '?').join(',');
    const safeArticleLimit = Math.min(Math.max(parseInt(String(articleLimit), 10) || 12, 1), 40);
    const rows = await this.all(
        `SELECT
            article_uid AS uid,
            COUNT(DISTINCT normalized_topic) AS topic_count,
            SUM(signal_count) AS total_signal_count,
            AVG(composite_score) AS avg_composite_score,
            MAX(last_seen_at) AS last_seen_at
         FROM topic_bouquet_signals
         WHERE normalized_topic IN (${placeholders})
         GROUP BY article_uid
         ORDER BY topic_count DESC, total_signal_count DESC, avg_composite_score DESC
         LIMIT ?`,
        [...topics, safeArticleLimit]
    );
    return rows.map((r) => ({
        uid: r.uid,
        topicCount: Number(r.topic_count || 0),
        totalSignalCount: Number(r.total_signal_count || 0),
        averageCompositeScore: Number(r.avg_composite_score || 0),
        lastSeenAt: r.last_seen_at || null,
    }));
}

// Returns topics that are frequently searched (high signal activity) but have
// decayed or absent topic_knowledge — candidates for background refresh.
async getStaleTopicsForRefresh({ minSignalCount = 3, maxAgeDays = 90, minPriorityScore = 0.18, limit = 10 } = {}) {
    if (!this.kysely) return [];
    const { topicRefreshPriority } = require('../../server/services/topicKnowledgeFreshness');
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
    const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldCutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    // Aggregate signals only — deliberately no JOIN here. topic_knowledge.knowledge is
    // jsonb on Postgres, which has no default MAX()/MIN() aggregate, and repeating
    // non-jsonb tk.* columns in GROUP BY risks splitting groups if a signal row's
    // display_topic ever drifts from another row's for the same normalized_topic.
    // Looking up topic_knowledge separately for just the candidate topics sidesteps both.
    const signalRows = await this.all(
        `SELECT
            s.normalized_topic,
            s.display_topic,
            SUM(s.signal_count) AS total_signals,
            COUNT(DISTINCT s.article_uid) AS distinct_articles
         FROM topic_bouquet_signals s
         WHERE s.last_seen_at > ?
         GROUP BY s.normalized_topic, s.display_topic
         HAVING SUM(s.signal_count) >= ?
         ORDER BY total_signals DESC
         LIMIT ?`,
        [recentCutoff, minSignalCount, Math.max(safeLimit * 4, safeLimit)]
    );
    if (!signalRows.length) return [];

    // upsertTopicKnowledge saves "AKI diagnosis" onto the canonical row ("acute kidney
    // injury"), so looking rows up by the literal normalized_topic never found it: the
    // topic stayed "never refreshed" and was regenerated every hourly run (~46 Gemini
    // calls/day each for AKI and PE). Resolve the same way the writer does, canonical
    // first, and refresh each canonical topic at most once per run.
    const canonOf = (row) => canonicalTopic(row.display_topic || row.normalized_topic);
    const seenCanon = new Set();
    const uniqueRows = signalRows.filter((row) => {
        const key = canonOf(row) || row.normalized_topic;
        if (seenCanon.has(key)) return false;
        seenCanon.add(key);
        return true;
    });

    const normalizedTopics = uniqueRows.map((r) => r.normalized_topic);
    const canonTopics = [...new Set(uniqueRows.map(canonOf).filter(Boolean))];
    const keys = [...normalizedTopics, ...canonTopics];
    const normPlaceholders = normalizedTopics.map(() => '?').join(',');
    const canonClause = canonTopics.length ? ` OR canonical_normalized IN (${canonTopics.map(() => '?').join(',')})` : '';
    const knowledgeRows = await this.all(
        `SELECT id, normalized_topic, canonical_normalized, topic, knowledge, confidence, last_refreshed_at, status
         FROM topic_knowledge
         WHERE normalized_topic IN (${normPlaceholders})${canonClause}`,
        keys
    );
    const byNorm = new Map(knowledgeRows.map((k) => [k.normalized_topic, k]));
    const byCanon = new Map(knowledgeRows.filter((k) => k.canonical_normalized).map((k) => [k.canonical_normalized, k]));
    const knowledgeFor = (row) => {
        const canon = canonOf(row);
        return (canon && byCanon.get(canon)) || byNorm.get(row.normalized_topic) || null;
    };
    const knowledgeByTopic = new Map(uniqueRows.map((r) => [r.normalized_topic, knowledgeFor(r)]));

    return uniqueRows
        .filter((s) => {
            const tk = knowledgeByTopic.get(s.normalized_topic);
            if (!tk) return true;
            // pg returns TIMESTAMPTZ columns as Date objects (not strings), so compare via
            // getTime() rather than raw `<` — a Date-vs-ISO-string `<` compares via
            // Date.toString(), which doesn't match ISO format and silently misorders.
            const staleEnough = !tk.last_refreshed_at || new Date(tk.last_refreshed_at).getTime() < new Date(oldCutoff).getTime();
            const notLocked = !tk.status || !['locked', 'human_reviewed', 'verified'].includes(tk.status);
            return staleEnough && notLocked;
        })
        .map((r) => {
            const tk = knowledgeByTopic.get(r.normalized_topic) || null;
            const totalSignals = Number(r.total_signals || 0);
            const distinctArticles = Number(r.distinct_articles || 0);
            const freshness = topicRefreshPriority({
                confidence: Number(tk?.confidence || 0),
                refreshedAt: tk?.last_refreshed_at || null,
                topic: tk?.topic || r.display_topic || r.normalized_topic,
                knowledge: safeJsonParse(tk?.knowledge, {}),
                totalSignals,
                distinctArticles,
                hasKnowledge: Boolean(tk?.id),
            });
            return {
                normalizedTopic: r.normalized_topic,
                displayTopic: r.display_topic || tk?.topic || r.normalized_topic,
                totalSignals,
                distinctArticles,
                lastRefreshedAt: tk?.last_refreshed_at || null,
                status: tk?.status || null,
                confidence: Number(tk?.confidence || 0),
                effectiveConfidence: freshness.effectiveConfidence,
                confidenceDecay: freshness.confidenceDecay,
                volatility: freshness.volatility,
                priorityScore: freshness.priorityScore,
                priorityReason: freshness.reason,
            };
        })
        .filter((r) => r.priorityScore >= minPriorityScore || !r.lastRefreshedAt)
        .sort((a, b) => b.priorityScore - a.priorityScore || b.totalSignals - a.totalSignals)
        .slice(0, safeLimit);
}

/**
 * Find "Strong Memory" topics that need proactive refresh.
 *
 * Strong-memory topics are those with high-confidence or human-reviewed knowledge
 * that have active community engagement (clicks, saves, dwell time) but haven't
 * been refreshed recently. These get periodic delta-extraction so the knowledge
 * stays current with what the community is actively reading.
 *
 * Results are weighted by aggregated community engagement score + dwell time.
 */
async getStrongMemoryTopicsForRefresh({ minEngagementScore = 5, minRefreshAgeDays = 14, limit = 5 } = {}) {
    if (!this.kysely) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 5, 1), 20);
    const engagementCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const refreshCutoff = new Date(Date.now() - minRefreshAgeDays * 24 * 60 * 60 * 1000).toISOString();

    const weightExpr = sqlAuthorityWeightedImpressionScore('i');
    // Engagement is recorded per search topic; topic knowledge lives on the canonical
    // row. Joining on the literal name dropped every synonym search ("AKI diagnosis"
    // never counted toward "acute kidney injury"), so aggregate per search topic and
    // fold onto the canonical row here.
    const engagementRows = await this.all(
        `SELECT
            s.normalized_topic,
            COUNT(DISTINCT s.id) AS search_count,
            COUNT(DISTINCT i.article_uid) AS engaged_article_count,
            SUM(${weightExpr}) AS community_engagement_score,
            COALESCE(SUM(i.dwell_time_ms), 0) AS total_dwell_ms
         FROM searches s
         JOIN search_result_impressions i ON i.search_id = s.id
         LEFT JOIN users u ON u.id = i.user_id
         WHERE s.created_at > ? AND s.normalized_topic IS NOT NULL
         GROUP BY s.normalized_topic`,
        [engagementCutoff]
    );
    if (!engagementRows.length) return [];

    const byCanon = new Map();
    for (const e of engagementRows) {
        const canon = canonicalTopic(e.normalized_topic);
        const agg = byCanon.get(canon) || { topics: new Set(), searchCount: 0, engaged: 0, score: 0, dwell: 0 };
        agg.topics.add(e.normalized_topic);
        agg.searchCount += Number(e.search_count || 0);
        agg.engaged += Number(e.engaged_article_count || 0);
        agg.score += Number(e.community_engagement_score || 0);
        agg.dwell += Number(e.total_dwell_ms || 0);
        byCanon.set(canon, agg);
    }

    const canons = [...byCanon.keys()];
    const literalTopics = [...new Set(engagementRows.map((e) => e.normalized_topic))];
    const knowledgeRows = await this.all(
        `SELECT normalized_topic, canonical_normalized, topic AS display_topic, confidence, status, last_refreshed_at
         FROM topic_knowledge
         WHERE (canonical_normalized IN (${inList(canons)}) OR normalized_topic IN (${inList(literalTopics)}))
           AND (confidence >= 0.8 OR status = 'human_reviewed')
           AND (last_refreshed_at IS NULL OR last_refreshed_at < ?)
           AND (status IS NULL OR status NOT IN ('locked'))`,
        [...canons, ...literalTopics, refreshCutoff]
    );

    const rows = knowledgeRows
        .map((tk) => {
            const agg = byCanon.get(tk.canonical_normalized) || byCanon.get(canonicalTopic(tk.normalized_topic));
            if (!agg) return null;
            return {
                ...tk,
                search_count: agg.searchCount,
                engaged_article_count: agg.engaged,
                community_engagement_score: agg.score,
                total_dwell_ms: agg.dwell,
            };
        })
        .filter((r) => r && r.community_engagement_score >= minEngagementScore)
        .sort((a, b) => b.community_engagement_score - a.community_engagement_score || b.total_dwell_ms - a.total_dwell_ms)
        .slice(0, safeLimit);

    return rows.map((r) => ({
        normalizedTopic: r.normalized_topic,
        displayTopic: r.display_topic || r.normalized_topic,
        confidence: Number(r.confidence || 0),
        status: r.status || null,
        lastRefreshedAt: r.last_refreshed_at || null,
        searchCount: Number(r.search_count || 0),
        engagedArticleCount: Number(r.engaged_article_count || 0),
        communityEngagementScore: Number(r.community_engagement_score || 0),
        totalDwellMs: Number(r.total_dwell_ms || 0),
        memoryTier: r.status === 'human_reviewed' ? 'human_reviewed' : 'high_confidence',
    }));
}

/**
 * Get community-engaged article UIDs for a specific topic.
 * Used by the strong-memory refresh worker to seed bouquet selection
 * with what the community is actually clicking and saving.
 */
async getCommunityEngagedArticlesForTopic(normalizedTopic, limit = 12) {
    if (!this.kysely || !normalizedTopic) return [];
    const weightExpr = sqlAuthorityWeightedImpressionScore('i');
    return this.all(
        `SELECT
            i.article_uid AS uid,
            SUM(${weightExpr}) AS engagement_score,
            COUNT(*) AS impression_count,
            COALESCE(SUM(i.dwell_time_ms), 0) AS total_dwell_ms
         FROM search_result_impressions i
         JOIN searches s ON s.id = i.search_id
         LEFT JOIN users u ON u.id = i.user_id
         WHERE s.normalized_topic IN (${inList(topicGroupKeys(normalizedTopic))})
           AND (i.was_clicked = 1 OR i.was_saved = 1 OR i.dwell_time_ms >= 30000)
         GROUP BY i.article_uid
         ORDER BY engagement_score DESC, total_dwell_ms DESC, impression_count DESC
         LIMIT ?`,
        [...topicGroupKeys(normalizedTopic), limit]
    );
}

// Record per-topic intent distribution so the refresh scheduler can weight
// teaching points toward what users actually search for on each topic.
async recordTopicDemandSignal(sanitizedTopic, displayTopic, intent = 'general') {
    if (!this.kysely || !sanitizedTopic) return;
    const normalized = this.normalizeTopic(sanitizedTopic);
    if (!normalized) return;
    const display = String(displayTopic || sanitizedTopic).trim().slice(0, 240);
    const safeIntent = String(intent || 'general').slice(0, 40);
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO topic_demand_signals (normalized_topic, display_topic, intent, search_count, last_seen_at, created_at)
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(normalized_topic, intent) DO UPDATE SET
           search_count = topic_demand_signals.search_count + 1,
           display_topic = excluded.display_topic,
           last_seen_at = excluded.last_seen_at`,
        [normalized, display, safeIntent, now, now]
    );
}

// Returns the intent distribution for a topic: which intents users search with most.
// Used by the refresh scheduler to emphasise the right archetype types in AI extraction.
async getTopicIntentDistribution(normalizedTopic) {
    if (!this.kysely || !normalizedTopic) return [];
    const keys = topicGroupKeys(normalizedTopic);
    const rows = await this.all(
        `SELECT intent, SUM(search_count) AS search_count FROM topic_demand_signals
         WHERE normalized_topic IN (${inList(keys)}) GROUP BY intent ORDER BY search_count DESC`,
        keys
    );
    return rows.map((r) => ({ intent: r.intent, count: Number(r.search_count || 0) }));
}

// If the raw query is a new phrasing for an already-known topic, register it as an alias
// so future searches with this phrasing resolve to the same knowledge entry.
async maybeRegisterTopicAlias(sanitizedTopic, rawQuery) {
    if (!this.kysely || !sanitizedTopic || !rawQuery) return;
    const normalized = this.normalizeTopic(sanitizedTopic);
    const rawNormalized = this.normalizeTopic(rawQuery);
    if (!normalized || !rawNormalized || normalized === rawNormalized) return;
    // Only register as alias if topic_knowledge already exists for the canonical form
    const existing = await this.getTopicKnowledge(normalized).catch(() => null);
    if (!existing) return;
    await this.mergeTopicKnowledgeAliases(normalized, [rawQuery], {
        createIfMissing: false,
        reason: 'casual_search_alias',
    }).catch(() => {});
}

};
