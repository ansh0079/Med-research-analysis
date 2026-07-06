'use strict';

const logger = require('../../config/logger');
const { buildEvidenceMap } = require('../../services/teachingObjectService');

const isDev = process.env.NODE_ENV === 'development';

function registerEvidenceMapRoutes(app, deps) {
    const { db, rateLimit, requireAuthJwt, topicHelpers } = deps;
    const { buildSynapseGraphForTopic } = topicHelpers;

    app.get('/api/topics/:topic/evidence-map', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            const normalized = db.normalizeTopic(topic);
            const [teachingObjects, relatedTopics, clusterArticles, guidelines, teachingClaims] = await Promise.all([
                db.listTeachingObjectsForTopic(topic, { limit: 30 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getRelatedBouquetTopicsForTopic(normalized, { limit: 8, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getRelatedBouquetTopicsForTopic failed'); return []; }),
                db.getClusterBouquetArticlesForTopic(normalized, { topicLimit: 8, articleLimit: 15, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getClusterBouquetArticlesForTopic failed'); return []; }),
                db.getGuidelinesByTopic(topic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(topic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
            ]);
            const articles = (topicKnowledge?.sourceArticles || []).map((a) => ({
                ...a,
                uid: a.uid || a.pmid || a.doi || a.title,
                _source: 'topic_knowledge',
            }));
            const evidenceMap = buildEvidenceMap({
                topic,
                topicKnowledge,
                articles,
                teachingObjects,
                relatedTopics,
                clusterArticles,
            });
            evidenceMap.nodes.groundedClaims = teachingClaims;
            res.json({ evidenceMap, guidelines, topicKnowledgeFound: Boolean(topicKnowledge) });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence map fetch failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/topics/:topic/synapse-graph', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
       try {
           const raw = decodeURIComponent(String(req.params.topic || '').trim());
           if (raw.length < 2) return res.status(400).json({ error: 'topic is required' });
           const graph = await buildSynapseGraphForTopic(raw);
           res.json(graph);
       } catch (error) {
           req.log?.error?.({ err: error }, 'Synapse graph fetch failed');
           res.status(500).json({ error: 'Internal Server Error' });
       }
    });

    app.get('/api/topic/:topic/crosslinks', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic) return res.status(400).json({ error: 'topic is required' });
        try {
            const normalized = db.normalizeTopic(topic);
            const crosslinks = await db.getTopicCrosslinks(normalized, { limit: 8 });
            return res.json({ crosslinks });
        } catch (err) {
            req.log?.error?.({ err, topic }, 'Topic crosslinks fetch failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerEvidenceMapRoutes };
