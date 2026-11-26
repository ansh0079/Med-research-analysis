'use strict';

// Curated MCQs routes — read-only listing and per-topic retrieval

const { loadAuditHolds } = require('../services/questionAudit/questionAuditService');
const { questionHash } = require('../services/questionIndex/questionIndexService');
const { attachQuizGradingTokens } = require('../services/quizGradingToken');
const { canonicalQuestionType } = require('../utils/questionType');
const { expandNormalizedTopicKeys } = require('../utils/topicSynonyms');
const { normalizeTopic } = require('../utils/topicKey');
const { loadWithdrawnOverrides } = require('../services/mcqReviewOverrideService');
const { loadEvidenceIndexIfEnabled, passesEvidenceGate, servableReviewStateSql } = require('../services/mcqEvidenceGate');
const { computeMcqClaimKey } = require('../utils/mcqClaimKey');


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
         WHERE object_type IN ('curated_topic_mcq', 'verified_topic_mcq')
           AND ${servableReviewStateSql()}
         ORDER BY topic ASC`
      );
      const evidenceIndex = await loadEvidenceIndexIfEnabled(db);
      const topics = [];
      for (const row of rows) {
        let payload;
        try { payload = JSON.parse(row.object_payload || '{}'); } catch { payload = {}; }
        const mcqCount = Array.isArray(payload.mcqs)
          ? payload.mcqs.filter((q) => passesEvidenceGate(q, evidenceIndex)).length : 0;
        if (mcqCount <= 0) continue; // hide empty topics from listing
        const topicKey = String(payload.topicKey || row.object_key.replace(/^curated-mcq[:-]/, '') || '').trim();
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
      const withdrawn = await loadWithdrawnOverrides(db);

      // Try exact curated or verified key first
      const slug = raw.toLowerCase().replace(/^(curated|verified)-mcq[:-]/, '');
      let row = await db.get(
        `SELECT * FROM teaching_objects
         WHERE object_key IN (?, ?, ?, ?) AND object_type IN ('curated_topic_mcq', 'verified_topic_mcq')
           AND ${servableReviewStateSql()}`,
        [`curated-mcq:${slug}`, `curated-mcq-${slug}`, `verified-mcq:${slug}`, `verified-mcq-${slug}`]
      );

      // Fall back to resolving topic string via alias -> curriculum topic id
      if (!row) {
        const id = await db.resolveCurriculumTopicId(raw);
        if (id) {
          row = await db.get(
            `SELECT * FROM teaching_objects WHERE object_type IN ('curated_topic_mcq', 'verified_topic_mcq')
             AND ${servableReviewStateSql()} AND curriculum_topic_id = ? ORDER BY updated_at DESC LIMIT 1`,
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
           WHERE object_type IN ('curated_topic_mcq', 'verified_topic_mcq')
             AND ${servableReviewStateSql()}`
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
      const topicKeyOut = String(payload.topicKey || row.object_key.replace(/^curated-mcq[:-]/, '') || '').trim();
      const displayName = payload.topicDisplayName || row.topic || topicKeyOut;
      const coverageNote = payload.coverageNote || null;

      // Transform to API shape expected by quiz components
      const letters = ['A', 'B', 'C', 'D', 'E'];
      // Clinical audit: hold out questions both AI reviewers flagged as serious, or a clinician retired.
      const stored = (Array.isArray(payload.mcqs) ? payload.mcqs : []);
      const evidenceIndex = await loadEvidenceIndexIfEnabled(db);
      const held = await loadAuditHolds(db, stored.map((q) => questionHash(q || {})));
      // Combine: per-question withdrawal overrides (by object index and by hash) AND clinical audit holds.
      const questions = stored
        .filter((q, i) => {
          const hasOptions = Array.isArray(q?.options) || (q?.options && typeof q.options === 'object');
          const hasAnswer = Boolean(q?.correctAnswer || q?.correct);
          if (!q || !q.question || !hasAnswer || !hasOptions) return false;
          if (!passesEvidenceGate(q, evidenceIndex)) return false;
          // Withdrawn via explicit override for this object slot
          if (withdrawn.byObjectIndex.has(`${row.object_key}#${i}`)) return false;
          try {
            const h = questionHash(q);
            if (withdrawn.byHash.has(h)) return false;
            if (held.has(h)) return false;
          } catch { return false; }
          return true;
        })
        .map((q, i) => {
          const claimKey = q.claimKey || q.claim_key
            || computeMcqClaimKey(q, row.object_type, row.topic || displayName);
          const outlineNodeId = q.outlineNodeId || `curated:${row.object_key}:${i}`;
          const outlineLabel = q.outlineLabel || q.question.slice(0, 120);
          return {
            id: q.id || `curated_${row.object_key}_${i}`,
            topic: displayName || row.topic || topicKeyOut,
            type: 'multiple_choice',
            questionType: canonicalQuestionType(q.questionType || 'guideline'),
            question: q.question,
            options: Array.isArray(q.options)
              ? q.options
              : letters.filter((L) => q.options && q.options[L] !== undefined).map((L) => `${L}: ${q.options[L]}`),
            correctAnswer: q.correctAnswer || q.correct,
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'medium',
            outdatedSources: Boolean(q.outdatedSources),
            sourceRefs: Array.isArray(q.sourceRefs) ? q.sourceRefs : [],
            claimKey,
            reviewStatus: q.reviewStatus || null,
            outlineNodeId,
            outlineLabel,
            sourceArticleUid: q.sourceArticleUid || q.articleUid || null,
            sourceArticleTitle: q.sourceArticleTitle || q.sourceArticle || null,
          };
        });

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

