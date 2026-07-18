'use strict';

const { resolveCanonicalNormalized } = require('../utils/topicSynonyms');

function safeJsonParse(value, fallback) {
    try {
        if (value == null || value === '') return fallback;
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
        return fallback;
    }
}

function normalizeForMap(db, topic) {
    return db.normalizeTopic(String(topic || '').trim());
}

function normalizeKeyVariants(db, topic) {
    const raw = String(topic || '').trim();
    if (!raw) return [];
    const primary = normalizeForMap(db, raw);
    const dehyphenated = normalizeForMap(db, raw.replace(/-/g, ' '));
    return [...new Set([primary, dehyphenated].filter(Boolean))];
}

function knowledgeLookupKeys(db, topic) {
    const raw = String(topic || '').trim();
    if (!raw) return [];
    // Prefer exact + canonical keys only. Full synonym token expansion is too broad
    // (e.g. "neutropenic sepsis" must not inherit plain sepsis knowledge).
    const keys = new Set(normalizeKeyVariants(db, raw));
    const canon = resolveCanonicalNormalized(raw, (s) => db.normalizeTopic(s));
    const canonDehyphen = resolveCanonicalNormalized(raw.replace(/-/g, ' '), (s) => db.normalizeTopic(s));
    if (canon) keys.add(canon);
    if (canonDehyphen) keys.add(canonDehyphen);
    return [...keys];
}

function resolveKnowledgeRow(knowledgeByTopic, knowledgeByAlias, db, topic) {
    const keys = knowledgeLookupKeys(db, topic);
    for (const key of keys) {
        if (knowledgeByTopic.has(key)) return knowledgeByTopic.get(key);
    }
    for (const key of keys) {
        if (knowledgeByAlias.has(key)) return knowledgeByAlias.get(key);
    }
    return null;
}

function readinessTier(row) {
    const c = row.counts || {};
    const hasKnowledge = Boolean(row.topicKnowledge);
    const sourceArticles = Number(c.sourceArticles || 0);
    const guidelines = Number(c.guidelines || 0);
    const claims = Number(c.claims || 0);
    const teachingObjects = Number(c.teachingObjects || 0);
    const mcqs = Number(c.mcqObjects || 0);

    if (hasKnowledge && guidelines >= 1 && claims >= 8 && teachingObjects >= 3 && mcqs >= 1 && sourceArticles >= 3) {
        return 'flagship';
    }
    if (hasKnowledge && claims >= 5 && (mcqs >= 1 || teachingObjects >= 2)) {
        return 'learner_ready';
    }
    if (hasKnowledge || sourceArticles >= 2 || guidelines >= 1) {
        return 'search_ready';
    }
    return 'needs_enrichment';
}

function missingSignals(row) {
    const c = row.counts || {};
    const missing = [];
    if (!row.topicKnowledge) missing.push('topic_knowledge');
    if (Number(c.sourceArticles || 0) < 3) missing.push('source_articles');
    if (Number(c.guidelines || 0) < 1) missing.push('guidelines');
    if (Number(c.claims || 0) < 5) missing.push('claims');
    if (Number(c.teachingObjects || 0) < 2) missing.push('teaching_objects');
    if (Number(c.mcqObjects || 0) < 1) missing.push('mcqs');
    return missing;
}

function sortRows(rows) {
    const tierOrder = {
        needs_enrichment: 0,
        search_ready: 1,
        learner_ready: 2,
        flagship: 3,
    };
    return rows.sort((a, b) => {
        const tierDelta = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0);
        if (tierDelta !== 0) return tierDelta;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDelta = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
        if (priorityDelta !== 0) return priorityDelta;
        return String(a.displayName).localeCompare(String(b.displayName));
    });
}

async function getTableCount(db, table) {
    const row = await db.get(`SELECT COUNT(*) AS count FROM ${table}`).catch(() => null);
    return Number(row?.count || 0);
}

async function collectTopicReadiness(db, {
    curriculumSlug = 'specialty-clinical-topics',
    limit = 200,
    offset = 0,
    includeRows = true,
} = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 2000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const [
        curriculumRows,
        knowledgeRows,
        guidelineRows,
        teachingRows,
        claimRows,
        tableCounts,
    ] = await Promise.all([
        db.all(
            `SELECT t.id, t.display_name, t.suggested_query, t.priority, t.volatility,
                    t.seed_status, t.last_seeded_at, t.review_due_at,
                    b.name AS block_name, c.slug AS curriculum_slug
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE c.slug = ?
             ORDER BY b.sort_order ASC, t.sort_order ASC, t.id ASC`,
            [curriculumSlug]
        ).catch(() => []),
        db.all(
            `SELECT id, topic, normalized_topic, canonical_normalized, aliases_normalized,
                    status, confidence, source_articles, updated_at, last_refreshed_at
             FROM topic_knowledge
             ORDER BY updated_at DESC`
        ).catch(() => []),
        db.all(
            `SELECT normalized_topic, COUNT(*) AS count
             FROM topic_guidelines
             WHERE status != 'stale' AND superseded_by_id IS NULL
             GROUP BY normalized_topic`
        ).catch(() => []),
        db.all(
            `SELECT normalized_topic,
                    COUNT(*) AS total,
                    SUM(CASE WHEN object_type = 'paper' THEN 1 ELSE 0 END) AS papers,
                    SUM(CASE WHEN object_type IN ('paper_mcq', 'guideline_mcq') THEN 1 ELSE 0 END) AS mcqs
             FROM teaching_objects
             GROUP BY normalized_topic`
        ).catch(() => []),
        db.all(
            `SELECT normalized_topic, COUNT(*) AS count
             FROM teaching_object_claims
             GROUP BY normalized_topic`
        ).catch(() => []),
        Promise.all([
            getTableCount(db, 'curriculum_topics'),
            getTableCount(db, 'topic_knowledge'),
            getTableCount(db, 'topic_guidelines'),
            getTableCount(db, 'teaching_objects'),
            getTableCount(db, 'teaching_object_claims'),
        ]),
    ]);

    const guidelineByTopic = new Map(guidelineRows.map((row) => [String(row.normalized_topic || ''), Number(row.count || 0)]));
    const teachingByTopic = new Map(teachingRows.map((row) => [String(row.normalized_topic || ''), {
        teachingObjects: Number(row.total || 0),
        paperObjects: Number(row.papers || 0),
        mcqObjects: Number(row.mcqs || 0),
    }]));
    const claimsByTopic = new Map(claimRows.map((row) => [String(row.normalized_topic || ''), Number(row.count || 0)]));
    const knowledgeByTopic = new Map();
    const knowledgeByAlias = new Map();
    for (const row of knowledgeRows) {
        const key = String(row.normalized_topic || normalizeForMap(db, row.topic));
        if (!knowledgeByTopic.has(key)) knowledgeByTopic.set(key, row);
        const canon = String(row.canonical_normalized || '').trim();
        if (canon && !knowledgeByTopic.has(canon)) knowledgeByTopic.set(canon, row);
        const aliases = safeJsonParse(row.aliases_normalized, []);
        if (Array.isArray(aliases)) {
            for (const alias of aliases) {
                for (const a of normalizeKeyVariants(db, alias)) {
                    if (!knowledgeByAlias.has(a)) knowledgeByAlias.set(a, row);
                }
            }
        }
    }

    const topicMap = new Map();
    for (const row of curriculumRows) {
        const normalizedTopic = normalizeForMap(db, row.display_name);
        topicMap.set(normalizedTopic, {
            source: 'curriculum',
            curriculumTopicId: row.id,
            displayName: row.display_name,
            normalizedTopic,
            block: row.block_name || 'Unassigned',
            priority: row.priority || 'medium',
            volatility: row.volatility || 'moderate',
            seedStatus: row.seed_status || 'not_seeded',
            suggestedQuery: row.suggested_query || row.display_name,
            lastSeededAt: row.last_seeded_at || null,
            reviewDueAt: row.review_due_at || null,
        });
    }

    for (const row of knowledgeRows) {
        const normalizedTopic = String(row.normalized_topic || normalizeForMap(db, row.topic));
        if (!topicMap.has(normalizedTopic)) {
            topicMap.set(normalizedTopic, {
                source: 'topic_knowledge',
                curriculumTopicId: null,
                displayName: row.topic,
                normalizedTopic,
                block: 'Unassigned',
                priority: 'unknown',
                volatility: 'unknown',
                seedStatus: 'knowledge_only',
                suggestedQuery: row.topic,
                lastSeededAt: null,
                reviewDueAt: null,
            });
        }
    }

    const rows = [];
    for (const topic of topicMap.values()) {
        const knowledge = resolveKnowledgeRow(knowledgeByTopic, knowledgeByAlias, db, topic.displayName)
            || knowledgeByTopic.get(topic.normalizedTopic)
            || null;
        const sourceArticles = safeJsonParse(knowledge?.source_articles, []);
        const teachingCounts = teachingByTopic.get(topic.normalizedTopic) || {};
        const enriched = {
            ...topic,
            topicKnowledge: knowledge ? {
                id: knowledge.id,
                status: knowledge.status,
                confidence: Number(knowledge.confidence || 0),
                updatedAt: knowledge.updated_at || null,
                lastRefreshedAt: knowledge.last_refreshed_at || null,
            } : null,
            counts: {
                sourceArticles: Array.isArray(sourceArticles) ? sourceArticles.length : 0,
                guidelines: guidelineByTopic.get(topic.normalizedTopic) || 0,
                teachingObjects: Number(teachingCounts.teachingObjects || 0),
                paperObjects: Number(teachingCounts.paperObjects || 0),
                mcqObjects: Number(teachingCounts.mcqObjects || 0),
                claims: claimsByTopic.get(topic.normalizedTopic) || 0,
            },
        };
        enriched.tier = readinessTier(enriched);
        enriched.missing = missingSignals(enriched);
        rows.push(enriched);
    }

    sortRows(rows);

    const summary = {
        canonicalTopics: rows.length,
        curriculumTopics: curriculumRows.length,
        topicKnowledgeRows: knowledgeRows.length,
        knowledgeOnlyTopics: rows.filter((row) => row.source === 'topic_knowledge').length,
        byTier: {},
        byBlock: {},
        bySeedStatus: {},
        tableCounts: {
            curriculumTopics: tableCounts[0],
            topicKnowledge: tableCounts[1],
            topicGuidelines: tableCounts[2],
            teachingObjects: tableCounts[3],
            teachingObjectClaims: tableCounts[4],
        },
    };

    for (const row of rows) {
        summary.byTier[row.tier] = (summary.byTier[row.tier] || 0) + 1;
        summary.byBlock[row.block] = (summary.byBlock[row.block] || 0) + 1;
        summary.bySeedStatus[row.seedStatus] = (summary.bySeedStatus[row.seedStatus] || 0) + 1;
    }

    return {
        generatedAt: new Date().toISOString(),
        curriculumSlug,
        summary,
        limit: safeLimit,
        offset: safeOffset,
        topics: includeRows ? rows.slice(safeOffset, safeOffset + safeLimit) : [],
    };
}

module.exports = {
    collectTopicReadiness,
    readinessTier,
    missingSignals,
    resolveKnowledgeRow,
    knowledgeLookupKeys,
};
