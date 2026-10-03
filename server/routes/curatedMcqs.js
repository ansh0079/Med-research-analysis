'use strict';

// Curated MCQs routes — read-only listing and per-topic retrieval

const { attachQuizGradingTokens } = require('../services/quizGradingToken');
const { canonicalQuestionType } = require('../utils/questionType');
const { expandNormalizedTopicKeys } = require('../utils/topicSynonyms');
const { isIssuingBodyValue } = require('../utils/guidelineAttribution');
const { normalizeTopic } = require('../utils/topicKey');

/**
 * Curated MCQs API:
 * - GET /api/mcqs/topics
 *     -> { topics: [{ topicKey, displayName, count, storedRowCount }] }
 * - GET /api/topics/:topic/mcqs
 *     -> { topicKey, displayName, count, questions: [...] } with grading tokens
 */
function registerCuratedMcqRoutes(app, deps) {
  const { db, requireAuthJwt, rateLimit } = deps;

  // List topics with curated MCQs and counts
  app.get('/api/mcqs/topics', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
    try {
      const rows = await db.all(
        `SELECT object_key, topic, object_payload
         FROM teaching_objects
         WHERE object_type = 'curated_topic_mcq'
           AND review_state != 'withdrawn'
         ORDER BY topic ASC`
      );
      const topics = [];
      for (const row of rows) {
        let payload;
        try { payload = JSON.parse(row.object_payload || '{}'); } catch { payload = {}; }
        const mcqCount = Array.isArray(payload.mcqs) ? payload.mcqs.length : 0;
        if (mcqCount <= 0) continue; // hide empty topics from listing
        const topicKey = String(payload.topicKey || row.object_key.replace(/^curated-mcq:/, '') || '').trim();
        topics.push({
          topicKey,
          displayName: payload.topicDisplayName || row.topic || topicKey,
          count: mcqCount,
          storedRowCount: Number(payload.storedRowCount || 0),
          coverageNote: payload.coverageNote || null,
        });
      }
      res.json({ topics });
    } catch (err) {
      req.log.error({ err }, 'List curated MCQ topics error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Fetch questions for a topic string (resolves via topic aliases) or exact curated key.
  app.get('/api/topics/:topic/mcqs', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
    try {
      const raw = String(req.params.topic || '').trim();
      if (!raw) return res.status(400).json({ error: 'topic is required' });

      // Try exact curated key first
      const objectKey = raw.startsWith('curated-mcq:') ? raw : `curated-mcq:${raw.toLowerCase()}`;
      let row = await db.get(`SELECT * FROM teaching_objects WHERE object_key = ? AND object_type = 'curated_topic_mcq'`, [objectKey]);

      // Fall back to resolving topic string via alias -> curriculum topic id
      if (!row) {
        const id = await db.resolveCurriculumTopicId(raw);
        if (id) {
          row = await db.get(
            `SELECT * FROM teaching_objects WHERE object_type = 'curated_topic_mcq' AND curriculum_topic_id = ? ORDER BY updated_at DESC LIMIT 1`,
            [id]
          );
        }
      }

      // Final fallback: curated alias + synonym match against query
      if (!row) {
        const queryNorm = normalizeTopic(raw);
        const queryKeys = new Set([queryNorm, ...expandNormalizedTopicKeys(queryNorm, normalizeTopic)]);
        const candidates = await db.all(
          `SELECT object_key, topic, object_payload
           FROM teaching_objects
           WHERE object_type = 'curated_topic_mcq' AND review_state != 'withdrawn'`
        );
        for (const cand of candidates) {
          let p = {};
          try { p = JSON.parse(cand.object_payload || '{}'); } catch { /* ignore */ }
          const keys = new Set([
            normalizeTopic(p.topicDisplayName || cand.topic || ''),
            ...(Array.isArray(p.aliases) ? p.aliases.map((a) => normalizeTopic(a || '')) : []),
          ].filter(Boolean));
          const intersects = [...keys].some((k) => queryKeys.has(k));
          if (intersects) { row = { ...cand, object_payload: cand.object_payload }; break; }
        }
      }

      if (!row) return res.status(404).json({ error: 'No curated MCQs for this topic' });
      const payload = (() => { try { return JSON.parse(row.object_payload || '{}'); } catch { return {}; } })();
      const topicKeyOut = String(payload.topicKey || row.object_key.replace(/^curated-mcq:/, '') || '').trim();
      const displayName = payload.topicDisplayName || row.topic || topicKeyOut;
      const coverageNote = payload.coverageNote || null;

      // Transform to API shape expected by quiz components
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const questions = (Array.isArray(payload.mcqs) ? payload.mcqs : [])
        .filter((q) => q && q.question && q.correctAnswer && Array.isArray(q.options))
        .map((q, i) => ({
          id: q.id || `curated_${row.object_key}_${i}`,
          type: 'multiple_choice',
          questionType: canonicalQuestionType(q.questionType || 'guideline'),
          question: q.question,
          options: Array.isArray(q.options) ? q.options : letters.map((L) => `${L}: ${(q.options && q.options[L]) || ''}`),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          outdatedSources: Boolean(q.outdatedSources),
          // Surface citations for UI — array with body/year/url/excerpt
          sourceRefs: Array.isArray(q.sourceRefs) ? q.sourceRefs : [],
        }));

      // If no questions, do not expose an empty quiz
      if (questions.length === 0) {
        return res.status(404).json({ error: 'No curated MCQs for this topic' });
      }

      // Sign and withhold answers
      const signed = attachQuizGradingTokens({ questions });
      res.json({
        topicKey: topicKeyOut,
        displayName,
        coverageNote,
        count: questions.length,
        ...signed,
      });
    } catch (err) {
      req.log.error({ err }, 'Get curated MCQs for topic error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}

module.exports = { registerCuratedMcqRoutes };

