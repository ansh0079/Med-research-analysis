'use strict';

/**
 * Nightly corpus crawler: evolve topics that have stored guidelines and/or
 * searchable article sources but stale/missing topic_knowledge.
 */

const cron = require('node-cron');
const { withCronHeartbeat } = require('./cronHeartbeat');
const { loadFlagshipConfig } = require('./flagshipTopicOps');
const { evolveTopicKnowledge } = require('./topicEvolutionService');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');

let task = null;

function normalizeTopic(db, topic) {
    if (typeof db?.normalizeTopic === 'function') return db.normalizeTopic(String(topic || '').trim());
    return String(topic || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function articlesFromKnowledgeSources(db, topic) {
    const stored = await db.getTopicKnowledge(topic).catch(() => null);
    const sources = Array.isArray(stored?.sourceArticles) ? stored.sourceArticles : [];
    return sources
        .map((s) => ({
            uid: s.uid || s.pmid || null,
            pmid: s.pmid || null,
            doi: s.doi || null,
            title: s.title || 'Unknown',
            journal: s.source || null,
            pubdate: s.pubdate || null,
            abstract: s.abstract || '',
        }))
        .filter((a) => a.title);
}

async function runTopicEvolutionBatch(db, {
    serverConfig,
    fetchImpl,
    cache = null,
    logger = console,
    limit = Number(process.env.TOPIC_EVOLUTION_BATCH_LIMIT || 15) || 15,
} = {}) {
    const max = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const cfg = loadFlagshipConfig();
    const flagshipTopics = Array.isArray(cfg?.topics) ? cfg.topics.map((t) => String(t.topic || '').trim()).filter(Boolean) : [];

    // Prefer topics that already have guidelines in store.
    const guidelineTopics = await db.all(
        `SELECT normalized_topic, MAX(topic) AS topic, COUNT(*) AS guideline_count
         FROM topic_guidelines
         WHERE superseded_by_id IS NULL
         GROUP BY normalized_topic
         ORDER BY guideline_count DESC
         LIMIT ?`,
        [Math.max(max * 3, 40)]
    ).catch(() => []);

    const candidates = [];
    const seen = new Set();
    for (const row of guidelineTopics || []) {
        const topic = String(row.topic || row.normalized_topic || '').trim();
        const key = normalizeTopic(db, topic);
        if (!topic || seen.has(key)) continue;
        seen.add(key);
        candidates.push({ topic, reason: 'has_guidelines', guidelineCount: Number(row.guideline_count || 0) });
    }
    for (const topic of flagshipTopics) {
        const key = normalizeTopic(db, topic);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ topic, reason: 'flagship', guidelineCount: 0 });
    }

    let evolved = 0;
    let skipped = 0;
    let failed = 0;

    for (const candidate of candidates) {
        if (evolved >= max) break;
        const topic = candidate.topic;

        const existing = await db.getTopicKnowledge(topic).catch(() => null);
        if (existing && ['human_reviewed', 'human_edited'].includes(String(existing.status || ''))) {
            skipped += 1;
            continue;
        }

        // Skip recently refreshed live memory unless still thin.
        if (existing?.lastRefreshedAt || existing?.updatedAt) {
            const ts = Date.parse(existing.lastRefreshedAt || existing.updatedAt);
            const ageHours = Number.isFinite(ts) ? (Date.now() - ts) / 3600000 : Infinity;
            const teachingN = Array.isArray(existing?.knowledge?.teachingPoints)
                ? existing.knowledge.teachingPoints.length
                : 0;
            if (ageHours < 72 && teachingN >= 3 && Number(existing.confidence || 0) >= 0.7) {
                skipped += 1;
                continue;
            }
        }

        let articles = await articlesFromKnowledgeSources(db, topic);
        if (articles.length < 3 && serverConfig && fetchImpl) {
            try {
                const raw = await fetchUnifiedEvidence({
                    query: topic,
                    safeLimit: 12,
                    sourceList: ['pubmed', 'openalex'],
                    serverConfig,
                    fetch: fetchImpl,
                    vectorList: [],
                });
                articles = selectTopEvidence(raw, 8);
            } catch (err) {
                logger.warn?.({ err, topic }, 'topic evolution crawl fetch failed');
            }
        }

        if (articles.length < 3) {
            skipped += 1;
            continue;
        }

        try {
            await evolveTopicKnowledge({
                topic,
                articles,
                serverConfig,
                fetchImpl,
                db,
                cache,
                allowLiveCommit: true,
                existingKnowledge: existing,
            });
            evolved += 1;
            logger.info?.({ topic, reason: candidate.reason }, 'topic evolution crawl evolved topic');
        } catch (err) {
            failed += 1;
            logger.warn?.({ err, topic }, 'topic evolution crawl failed for topic');
        }
    }

    return {
        scanned: candidates.length,
        evolved,
        skipped,
        failed,
        limit: max,
    };
}

function scheduleTopicEvolution(db, deps = {}, logger = console) {
    if (task) return task;
    if (process.env.TOPIC_EVOLUTION_CRON_DISABLED === 'true') {
        logger.info?.('Topic evolution crawler disabled');
        return null;
    }

    const expr = process.env.TOPIC_EVOLUTION_CRON || '20 3 * * *';
    task = cron.schedule(expr, withCronHeartbeat('topic-evolution', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) {
            logger.info?.('Topic evolution crawl skipped — background automation paused');
            return;
        }
        const summary = await runTopicEvolutionBatch(db, {
            serverConfig: deps.serverConfig,
            fetchImpl: deps.fetchImpl,
            cache: deps.cache,
            logger,
        });
        logger.info?.(summary, 'Topic evolution crawl batch complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ cron: expr }, 'Topic evolution crawler scheduled');
    return task;
}

function stopTopicEvolution() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = {
    runTopicEvolutionBatch,
    scheduleTopicEvolution,
    stopTopicEvolution,
};
