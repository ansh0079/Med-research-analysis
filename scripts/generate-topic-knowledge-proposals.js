#!/usr/bin/env node
'use strict';

/**
 * Generate mentor-page topic_knowledge proposals from a list of topics.
 *
 * For each topic:
 *  - Fetch unified evidence and select top articles (min 2)
 *  - Build topic-knowledge prompt and call the configured AI provider
 *  - Validate the structured JSON (mentorMessage, teachingPoints, mcqAngles, caseGenerationHooks, seminalPapers)
 *  - Create a topic_knowledge_proposals row with proposed_status 'draft_pending_clinician_review'
 *
 * Usage:
 *   node scripts/generate-topic-knowledge-proposals.js --topics /review/topics-0251-0500.json [--limit 50] [--dry-run]
 *
 * The topics JSON format:
 *   { sheet: 'Topics 0251-0500', topics: [{ topic: '...', normalizedTopic: '...' }, ...] }
 */

const fs = require('fs');
const path = require('path');
const db = require('../database');
const serverConfig = require('../server/config');
const { fetchUnifiedEvidence } = require('../server/services/search/unifiedEvidenceSearch');
const { selectTopEvidence } = require('../server/utils/selectTopEvidence');
const { buildTopicKnowledgePrompt } = require('../server/prompts');
const { createAiService, getSharedAiService } = require('../server/services/aiService');
const { validateAiOutput } = require('../server/services/aiOutputValidation');
const { defaultNormalize } = require('../server/services/flagshipTopicOps');
const { validateTopicKnowledgeShape } = require('../server/services/topic/topicKnowledgeExtraction');

function readArg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const hasFlag = (f) => process.argv.includes(f);

async function main() {
  const topicsPath = readArg('--topics');
  const limit = Number(readArg('--limit', '0')) || 0;
  const dryRun = hasFlag('--dry-run');
  if (!topicsPath) {
    console.error('Missing --topics <path-to-json>');
    process.exit(2);
  }
  const payload = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
  const list = Array.isArray(payload?.topics) ? payload.topics : [];
  const slice = limit > 0 ? list.slice(0, limit) : list;
  if (slice.length === 0) {
    console.error('No topics found in', topicsPath);
    process.exit(2);
  }

  await db.connect();
  const ai = getSharedAiService({ serverConfig, fetchImpl: fetch });
  const results = [];
  for (const item of slice) {
    const display = String(item.topic || '').trim();
    if (!display) continue;
    const normalized = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(display) : defaultNormalize(display);
    try {
      const raw = await fetchUnifiedEvidence({
        query: normalized,
        safeLimit: 20,
        sourceList: ['pubmed', 'openalex'],
        serverConfig,
        fetch,
        vectorList: [],
      });
      const evidenceArticles = selectTopEvidence(raw, 8, {});
      if (evidenceArticles.length < 2) {
        results.push({ topic: display, ok: false, reason: 'insufficient_evidence', articles: evidenceArticles.length });
        continue;
      }
      const guidelines = typeof db.getGuidelinesByTopic === 'function'
        ? await db.getGuidelinesByTopic(normalized, { limit: 12 }).catch(() => [])
        : [];
      const prompt = buildTopicKnowledgePrompt(
        normalized,
        evidenceArticles,
        {}, // interaction stats
        null, // existing knowledge
        { guidelines, intentHint: null }
      );
      const rawAi = await ai.callText(prompt, 'gemini', null, {
        temperature: 0.15,
        maxOutputTokens: 8192,
        timeoutMs: 120000,
        usage: { operation: 'topic_knowledge_extraction', topic: normalized },
      });
      let knowledge = JSON.parse(rawAi.replace(/```json\\s*|```/g, '').trim());
      const validated = validateAiOutput('topic_knowledge', knowledge, { allowDegrade: false });
      if (!validated.ok) throw new Error(validated.errors.join('; '));
      knowledge = validated.data;
      validateTopicKnowledgeShape(knowledge);
      const sourceArticles = evidenceArticles.map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid,
        title: a.title,
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.source || null,
        pubdate: a.pubdate || null,
      }));
      if (dryRun) {
        results.push({ topic: display, ok: true, proposed: true, dryRun: true });
      } else {
        const prop = await db.createTopicKnowledgeProposal(display, {
          knowledge,
          sourceArticles,
          proposedStatus: 'draft_pending_clinician_review',
          confidence: 0.7,
          reason: 'Auto-generated mentor draft; pending clinician review',
        });
        results.push({ topic: display, ok: true, proposalId: prop?.id || null });
      }
    } catch (err) {
      results.push({ topic: display, ok: false, reason: err?.message || 'unknown_error' });
    }
  }
  await db.close?.();
  const ok = results.filter(r => r.ok).length;
  const failed = results.length - ok;
  console.log(JSON.stringify({ total: results.length, ok, failed, results }, null, 2));
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
}

