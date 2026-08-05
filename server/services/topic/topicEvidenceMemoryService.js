'use strict';

const logger = require('../../config/logger');
const { summarizeTopicLifecycle } = require('../claimLifecycleService');
const { classifyArchetype } = require('../evidenceBouquet/archetype');
const {
    isGuideline,
    isReview,
    isRCT,
    getCitationCount,
    getYear,
} = require('../evidenceBouquet/articleClassifiers');
const { LANDMARK_CITATION_THRESHOLD } = require('../evidenceBouquet/constants');

const STRONG_MEMORY_MIN_CLAIMS = 3;
const STRONG_MEMORY_MIN_TRUSTED = 2;

function daysSince(iso) {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/**
 * Learner-facing evidence memory summary for a topic.
 * Signature preserved: buildTopicEvidenceMemory(db, userId, topic)
 */
async function buildTopicEvidenceMemory(db, userId, topic) {
    const cleanTopic = String(topic || '').trim();
    const normalized = db.normalizeTopic(cleanTopic);

    const [claims, mastery, watchEvents, topicReview, snapshotRow] = await Promise.all([
        db.listTeachingObjectClaimsForTopic(cleanTopic, { limit: 80 }).catch(() => []),
        userId
            ? db.getUserClaimMastery(userId, cleanTopic, { limit: 80 }).catch(() => [])
            : Promise.resolve([]),
        db.listGuidelineWatchEvents?.(cleanTopic, { limit: 20 }).catch(() => []) || [],
        userId && db.getUserTopicReview
            ? db.getUserTopicReview(userId, cleanTopic).catch(() => null)
            : Promise.resolve(null),
        db.get?.(
            `SELECT generated_at FROM synthesis_snapshots
             WHERE normalized_topic = ?
             ORDER BY generated_at DESC LIMIT 1`,
            [normalized]
        ).catch(() => null),
    ]);

    const lifecycle = summarizeTopicLifecycle(claims);
    const trustedCount = (lifecycle.byStage.human_reviewed || 0)
        + (lifecycle.byStage.source_verified || 0)
        + (lifecycle.byStage.guideline_supported || 0);
    const strongEvidenceMemory = claims.length >= STRONG_MEMORY_MIN_CLAIMS
        && trustedCount >= STRONG_MEMORY_MIN_TRUSTED;

    const untestedForUser = mastery.filter((c) => c.masteryState === 'untested').length;
    const guidelineConflictCount = (lifecycle.byStage.guideline_conflict || 0)
        + watchEvents.filter((e) => String(e.eventType || '').includes('conflict') || e.severity === 'high').length;

    const claimUpdated = claims.reduce((max, c) => {
        const t = c.updatedAt ? Date.parse(c.updatedAt) : 0;
        return t > max ? t : max;
    }, 0);
    const refreshedAt = snapshotRow?.generated_at
        || (claimUpdated ? new Date(claimUpdated).toISOString() : null)
        || topicReview?.reviewedAt
        || null;
    const daysSinceRefresh = daysSince(refreshedAt);

    // Optional durable best-evidence set (RL quality pack) — additive, non-breaking.
    let durableEvidence = null;
    try {
        durableEvidence = await getDurableEvidenceMemory(db, cleanTopic);
    } catch {
        durableEvidence = null;
    }

    return {
        topic: cleanTopic,
        strongEvidenceMemory,
        totalClaims: claims.length,
        trustedClaimCount: trustedCount,
        untestedClaimCount: untestedForUser,
        guidelineConflictCount,
        refreshedAt,
        daysSinceRefresh,
        lifecycleNeedsAttention: lifecycle.needsAttention,
        messages: buildEvidenceMemoryMessages({
            strongEvidenceMemory,
            untestedClaimCount: untestedForUser,
            guidelineConflictCount,
            daysSinceRefresh,
        }),
        durableEvidence,
    };
}

function buildEvidenceMemoryMessages({
    strongEvidenceMemory,
    untestedClaimCount,
    guidelineConflictCount,
    daysSinceRefresh,
}) {
    const messages = [];
    if (strongEvidenceMemory) {
        messages.push({ key: 'strong_memory', text: 'This topic has strong evidence memory', tone: 'positive' });
    }
    if (untestedClaimCount > 0) {
        messages.push({
            key: 'untested',
            text: `${untestedClaimCount} claim${untestedClaimCount === 1 ? '' : 's'} are untested for you`,
            tone: 'neutral',
        });
    }
    if (guidelineConflictCount > 0) {
        messages.push({
            key: 'conflict',
            text: `${guidelineConflictCount} guideline conflict${guidelineConflictCount === 1 ? '' : 's'} exist${guidelineConflictCount === 1 ? 's' : ''}`,
            tone: 'warning',
        });
    }
    if (daysSinceRefresh != null) {
        const unit = daysSinceRefresh === 1 ? 'day' : 'days';
        messages.push({
            key: 'refreshed',
            text: `This topic was refreshed ${daysSinceRefresh} ${unit} ago`,
            tone: 'neutral',
        });
    }
    return messages;
}

// ── Durable best-evidence set (guidelines / landmarks / reviews / safety) ──

function uidOf(article) {
    return String(article?.uid || article?.pmid || article?.doi || '').trim();
}

function toRef(article, extra = {}) {
    return {
        uid: uidOf(article),
        title: article?.title || null,
        year: getYear(article) || null,
        journal: article?.journal || article?.source || null,
        citations: getCitationCount(article),
        archetype: classifyArchetype(article),
        ...extra,
    };
}

function partitionEvidence(articles = []) {
    const guidelines = [];
    const landmarkTrials = [];
    const recentReviews = [];
    const controversies = [];
    const safetyUpdates = [];
    const yearNow = new Date().getFullYear();

    for (const article of Array.isArray(articles) ? articles : []) {
        const uid = uidOf(article);
        if (!uid) continue;
        const text = `${article.title || ''} ${article.abstract || ''}`.toLowerCase();
        if (isGuideline(article)) {
            guidelines.push(toRef(article, { role: 'guideline' }));
            continue;
        }
        if (/\b(safety|black box|boxed warning|pharmacovigilance|recall|withdrawal)\b/.test(text)
            && getYear(article) >= yearNow - 2) {
            safetyUpdates.push(toRef(article, { role: 'safety' }));
        }
        if (isRCT(article) && getCitationCount(article) >= LANDMARK_CITATION_THRESHOLD) {
            landmarkTrials.push(toRef(article, { role: 'landmark' }));
            continue;
        }
        if (isReview(article) && getYear(article) >= yearNow - 5) {
            recentReviews.push(toRef(article, { role: 'recent_review' }));
            continue;
        }
        if (/\b(controvers|conflict|debate|equipoise|versus|vs\.?)\b/.test(text)) {
            controversies.push(toRef(article, { role: 'controversy' }));
        }
    }

    const uniq = (arr) => {
        const seen = new Set();
        return arr.filter((r) => {
            if (!r.uid || seen.has(r.uid)) return false;
            seen.add(r.uid);
            return true;
        }).slice(0, 12);
    };

    return {
        guidelines: uniq(guidelines),
        landmarkTrials: uniq(landmarkTrials),
        recentReviews: uniq(recentReviews),
        controversies: uniq(controversies),
        safetyUpdates: uniq(safetyUpdates),
    };
}

async function upsertDurableEvidenceMemory(db, topic, articles = [], { source = 'search_blend' } = {}) {
    if (!db?.run || !topic) return null;
    const normalized = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topic)
        : String(topic).toLowerCase().trim();
    const parts = partitionEvidence(articles);
    const uids = [
        ...parts.guidelines,
        ...parts.landmarkTrials,
        ...parts.recentReviews,
        ...parts.controversies,
        ...parts.safetyUpdates,
    ].map((r) => r.uid).filter(Boolean);
    const now = new Date().toISOString();

    let existing = null;
    if (db.get) {
        existing = await db.get(
            `SELECT * FROM topic_evidence_memory WHERE normalized_topic = ?`,
            [normalized]
        ).catch(() => null);
    }
    const merge = (key, incoming) => {
        const prev = existing ? (() => {
            try { return JSON.parse(existing[key] || '[]'); } catch { return []; }
        })() : [];
        const map = new Map();
        for (const r of [...prev, ...incoming]) {
            if (r?.uid) map.set(r.uid, { ...map.get(r.uid), ...r });
        }
        return [...map.values()].slice(0, 16);
    };

    const merged = {
        guidelines: merge('guidelines_json', parts.guidelines),
        landmarkTrials: merge('landmark_trials_json', parts.landmarkTrials),
        recentReviews: merge('recent_reviews_json', parts.recentReviews),
        controversies: merge('controversies_json', parts.controversies),
        safetyUpdates: merge('safety_updates_json', parts.safetyUpdates),
    };
    const allUids = [...new Set([
        ...(existing ? (() => { try { return JSON.parse(existing.article_uids_json || '[]'); } catch { return []; } })() : []),
        ...uids,
    ])].slice(0, 60);

    await db.run(
        `INSERT INTO topic_evidence_memory (
            normalized_topic, topic, guidelines_json, landmark_trials_json, recent_reviews_json,
            controversies_json, safety_updates_json, article_uids_json, source, updated_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(normalized_topic) DO UPDATE SET
            topic = excluded.topic,
            guidelines_json = excluded.guidelines_json,
            landmark_trials_json = excluded.landmark_trials_json,
            recent_reviews_json = excluded.recent_reviews_json,
            controversies_json = excluded.controversies_json,
            safety_updates_json = excluded.safety_updates_json,
            article_uids_json = excluded.article_uids_json,
            source = excluded.source,
            updated_at = excluded.updated_at`,
        [
            normalized,
            String(topic).slice(0, 240),
            JSON.stringify(merged.guidelines),
            JSON.stringify(merged.landmarkTrials),
            JSON.stringify(merged.recentReviews),
            JSON.stringify(merged.controversies),
            JSON.stringify(merged.safetyUpdates),
            JSON.stringify(allUids),
            String(source),
            now,
            now,
        ]
    ).catch((err) => {
        logger.warn({ err, topic }, 'upsertDurableEvidenceMemory failed');
    });

    return getDurableEvidenceMemory(db, topic);
}

async function getDurableEvidenceMemory(db, topic) {
    if (!db?.get || !topic) return null;
    const normalized = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topic)
        : String(topic).toLowerCase().trim();
    const row = await db.get(
        `SELECT * FROM topic_evidence_memory WHERE normalized_topic = ?`,
        [normalized]
    ).catch(() => null);
    if (!row) return null;
    const parse = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    return {
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        guidelines: parse(row.guidelines_json),
        landmarkTrials: parse(row.landmark_trials_json),
        recentReviews: parse(row.recent_reviews_json),
        controversies: parse(row.controversies_json),
        safetyUpdates: parse(row.safety_updates_json),
        articleUids: parse(row.article_uids_json),
        source: row.source,
        updatedAt: row.updated_at,
    };
}

/**
 * Blend durable best-evidence UIDs into live results (memory first for missing items).
 */
function blendLiveWithEvidenceMemory(liveArticles = [], memory = null, { maxInject = 6 } = {}) {
    if (!memory?.articleUids?.length) {
        return { articles: liveArticles, injected: [], memoryUsed: false };
    }
    const live = Array.isArray(liveArticles) ? [...liveArticles] : [];
    const liveUids = new Set(live.map(uidOf).filter(Boolean));
    const memoryRefs = [
        ...(memory.guidelines || []),
        ...(memory.landmarkTrials || []),
        ...(memory.safetyUpdates || []),
        ...(memory.recentReviews || []),
        ...(memory.controversies || []),
    ];
    const injected = [];
    for (const ref of memoryRefs) {
        if (injected.length >= maxInject) break;
        if (!ref?.uid || liveUids.has(ref.uid)) continue;
        injected.push({
            uid: ref.uid,
            title: ref.title || `Evidence memory: ${ref.uid}`,
            abstract: '',
            pubdate: ref.year ? String(ref.year) : undefined,
            journal: ref.journal || undefined,
            citationCount: ref.citations || 0,
            _fromTopicEvidenceMemory: true,
            _protectionClass: ref.role || 'memory',
            _pinnedLandmark: ref.role === 'landmark',
        });
        liveUids.add(ref.uid);
    }
    if (!injected.length) return { articles: live, injected: [], memoryUsed: true };
    const head = live.slice(0, 2);
    const tail = live.slice(2);
    return {
        articles: [...head, ...injected, ...tail],
        injected,
        memoryUsed: true,
    };
}

module.exports = {
    buildTopicEvidenceMemory,
    buildEvidenceMemoryMessages,
    partitionEvidence,
    upsertDurableEvidenceMemory,
    getDurableEvidenceMemory,
    blendLiveWithEvidenceMemory,
    // Aliases used by search/admin wiring
    upsertTopicEvidenceMemory: upsertDurableEvidenceMemory,
    getTopicEvidenceMemory: getDurableEvidenceMemory,
};
