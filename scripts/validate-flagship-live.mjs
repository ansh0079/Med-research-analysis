#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'eval-results');
const args = process.argv.slice(2);

function flag(name, fallback) {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const BASE = String(flag('--base', 'https://signalmd.co')).replace(/\/$/, '');
const COUNT = Math.max(1, Math.min(50, Number(flag('--count', '20')) || 20));
const TIMEOUT_MS = Math.max(5000, Number(flag('--timeout-ms', '60000')) || 60000);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGuidelineArticle(article) {
  const types = Array.isArray(article?.pubtype) ? article.pubtype.join(' ') : '';
  const text = `${article?.title || ''} ${types} ${article?._ranking?.archetype || ''}`;
  return /guideline|practice guideline|consensus/i.test(text);
}

function isHumanReviewed(row) {
  const checks = row?.qualityAssessment?.checks || {};
  return row?.status === 'human_reviewed'
    || row?.verificationStatus === 'human_reviewed'
    || row?.reviewState === 'approved'
    || checks.humanReviewed === true;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const columns = [
    'topic', 'evidenceQuery', 'guidelineQuery', 'httpOk', 'latencyMs', 'articleCount', 'landmarkHit',
    'guidelineLaneHit', 'storedGuidelines', 'exactTopicGuidelines',
    'unrelatedGuidelines', 'humanReviewedGuidelines', 'teachingObjects',
    'groundedClaims', 'humanReviewedClaims', 'canGenerateMcqs',
    'canGenerateCase', 'automatedGate', 'clinicianSignoff', 'failures',
  ];
  return [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n');
}

async function validateTopic(topic) {
  const evidenceQuery = topic.searchQueries?.[0] || topic.topic;
  const guidelineQuery = topic.guidelineQueries?.[0] || `${topic.topic} clinical practice guideline`;
  const started = Date.now();

  try {
    const search = async (query, intelligence = 'async') => {
      const url = new URL('/api/search', BASE);
      url.searchParams.set('q', query);
      url.searchParams.set('sources', 'pubmed');
      url.searchParams.set('limit', '10');
      url.searchParams.set('intelligence', intelligence);
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${payload.error || 'search failed'}`);
      return payload;
    };
    const evidencePayload = await search(evidenceQuery, 'async');
    const canonicalPayload = normalize(evidenceQuery) === normalize(topic.topic)
      ? evidencePayload
      : await search(topic.topic, 'sync');
    const guidelinePayload = await search(guidelineQuery, 'async');
    const guidelineUrl = new URL('/api/guidelines', BASE);
    guidelineUrl.searchParams.set('topic', topic.topic);
    guidelineUrl.searchParams.set('limit', '10');
    const guidelineResponse = await fetch(guidelineUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const storedPayload = await guidelineResponse.json().catch(() => ({}));
    if (!guidelineResponse.ok) {
      throw new Error(`HTTP ${guidelineResponse.status}: ${storedPayload.error || 'guideline lookup failed'}`);
    }

    const articles = Array.isArray(evidencePayload.articles) ? evidencePayload.articles : [];
    const guidelineArticles = Array.isArray(guidelinePayload.articles)
      ? guidelinePayload.articles.filter(isGuidelineArticle)
      : [];
    const intelligence = canonicalPayload.topicIntelligence || {};
    const nodes = intelligence.evidenceMap?.nodes || {};
    const guidelines = Array.isArray(storedPayload.guidelines)
      ? storedPayload.guidelines
      : [];
    const aliases = new Set([topic.topic, ...(topic.aliases || [])].map(normalize).filter(Boolean));
    const exactGuidelines = guidelines.filter((row) => aliases.has(normalize(row.normalizedTopic || row.topic)));
    const unrelatedGuidelines = guidelines.filter((row) => !aliases.has(normalize(row.normalizedTopic || row.topic)));
    const expectedPmids = new Set((topic.landmarkPmids || []).map(String));
    const landmarkHits = articles.filter((article) => expectedPmids.has(String(article.pmid || '')));
    const claims = Array.isArray(nodes.groundedClaims) ? nodes.groundedClaims : [];
    const teachingObjects = Array.isArray(nodes.teachingObjects) ? nodes.teachingObjects : [];
    const failures = [];

    if (articles.length < 5) failures.push('fewer_than_5_articles');
    if (!landmarkHits.length) failures.push('no_configured_landmark_in_top_10');
    if (!guidelineArticles.length) failures.push('no_guideline_or_consensus_in_guideline_lane');
    if (!exactGuidelines.length) failures.push('no_exact_topic_guideline');
    if (unrelatedGuidelines.length) failures.push('unrelated_guidelines_in_panel');
    if (!teachingObjects.length) failures.push('no_teaching_objects');
    if (!claims.length) failures.push('no_grounded_claims');
    if (intelligence.actions?.canGenerateMcqs !== true) failures.push('mcq_action_unavailable');
    if (intelligence.actions?.canGenerateCase !== true) failures.push('case_action_unavailable');

    return {
      topic: topic.topic,
      evidenceQuery,
      guidelineQuery,
      httpOk: true,
      latencyMs: Date.now() - started,
      articleCount: articles.length,
      landmarkHit: landmarkHits.length > 0,
      landmarkPmidsFound: landmarkHits.map((article) => article.pmid),
      guidelineLaneHit: guidelineArticles.length > 0,
      storedGuidelines: guidelines.length,
      exactTopicGuidelines: exactGuidelines.length,
      unrelatedGuidelines: unrelatedGuidelines.length,
      unrelatedGuidelineExamples: unrelatedGuidelines.slice(0, 5).map((row) => ({
        topic: row.topic,
        sourceBody: row.sourceBody,
        sourceUrl: row.sourceUrl,
      })),
      humanReviewedGuidelines: exactGuidelines.filter(isHumanReviewed).length,
      teachingObjects: teachingObjects.length,
      groundedClaims: claims.length,
      humanReviewedClaims: claims.filter(isHumanReviewed).length,
      canGenerateMcqs: intelligence.actions?.canGenerateMcqs === true,
      canGenerateCase: intelligence.actions?.canGenerateCase === true,
      automatedGate: failures.length === 0 ? 'pass' : 'fail',
      clinicianSignoff: 'pending',
      failures,
      topArticles: articles.slice(0, 5).map((article) => ({
        uid: article.uid,
        pmid: article.pmid,
        title: article.title,
        archetype: article._ranking?.archetype || null,
      })),
      topGuidelineArticles: guidelineArticles.slice(0, 5).map((article) => ({
        uid: article.uid,
        pmid: article.pmid,
        title: article.title,
        source: article.source || article.journal || null,
      })),
    };
  } catch (error) {
    return {
      topic: topic.topic,
      evidenceQuery,
      guidelineQuery,
      httpOk: false,
      latencyMs: Date.now() - started,
      articleCount: 0,
      landmarkHit: false,
      guidelineLaneHit: false,
      storedGuidelines: 0,
      exactTopicGuidelines: 0,
      unrelatedGuidelines: 0,
      humanReviewedGuidelines: 0,
      teachingObjects: 0,
      groundedClaims: 0,
      humanReviewedClaims: 0,
      canGenerateMcqs: false,
      canGenerateCase: false,
      automatedGate: 'fail',
      clinicianSignoff: 'pending',
      failures: [String(error?.message || error)],
    };
  }
}

async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/config/flagshipTopics.json'), 'utf8'));
  const topics = (config.topics || []).slice(0, COUNT);
  const rows = [];

  for (const [index, topic] of topics.entries()) {
    const row = await validateTopic(topic);
    rows.push(row);
    console.log(`${index + 1}/${topics.length} ${row.automatedGate.toUpperCase()} ${topic.topic}`);
  }

  const summary = {
    topicCount: rows.length,
    httpHealthy: rows.filter((row) => row.httpOk).length,
    automatedPass: rows.filter((row) => row.automatedGate === 'pass').length,
    landmarkHit: rows.filter((row) => row.landmarkHit).length,
    guidelineLaneHit: rows.filter((row) => row.guidelineLaneHit).length,
    exactTopicGuideline: rows.filter((row) => row.exactTopicGuidelines > 0).length,
    contaminatedGuidelinePanel: rows.filter((row) => row.unrelatedGuidelines > 0).length,
    withHumanReviewedGuideline: rows.filter((row) => row.humanReviewedGuidelines > 0).length,
    withHumanReviewedClaim: rows.filter((row) => row.humanReviewedClaims > 0).length,
    clinicianSignoffComplete: 0,
    medianLatencyMs: [...rows].sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(rows.length / 2)]?.latencyMs || 0,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    catalogVersion: config.version,
    reviewPolicy: 'Automated checks prepare the queue; clinician sign-off must be recorded separately.',
    summary,
    topics: rows,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `flagship-live-${COUNT}-${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `flagship-live-${COUNT}-clinical-review-${stamp}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(csvPath, toCsv(rows));

  console.log(JSON.stringify(summary));
  console.log(`Report: ${jsonPath}`);
  console.log(`Clinical review queue: ${csvPath}`);
  process.exitCode = summary.automatedPass === rows.length ? 0 : 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
