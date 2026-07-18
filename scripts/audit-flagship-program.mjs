#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'eval-results');
const require = createRequire(import.meta.url);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function normalizeTopic(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadGoldQueries() {
  const rows = [];
  for (const file of ['tests/fixtures/search-quality-gold.json', 'tests/fixtures/search-quality-gold-expansion.json']) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const json = readJson(file);
    for (const query of json.queries || []) rows.push({ ...query, sourceFile: file });
  }
  return rows;
}

function goldMatchesTopic(gold, topic) {
  const haystack = [
    gold.query,
    gold.notes,
    ...(gold.relevantUids || []),
    ...(gold.requiredTypes || []),
  ].join(' ').toLowerCase();
  const aliases = [topic.topic, ...(topic.aliases || [])].map((x) => String(x).toLowerCase());
  return aliases.some((alias) => alias && haystack.includes(alias));
}

function readinessIndex(readiness) {
  const byTopic = new Map();
  for (const row of readiness?.topics || []) {
    byTopic.set(row.normalizedTopic, row);
    byTopic.set(normalizeTopic(row.displayName), row);
  }
  return byTopic;
}

async function loadReadiness() {
  const dbPath = process.env.FLAGSHIP_DB || path.join(ROOT, 'database/app.db');
  if (!fs.existsSync(dbPath)) return { dbPath, readiness: null, error: 'DB not found' };
  try {
    const Database = (await import('better-sqlite3')).default;
    const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
    const db = {
      get: async (sql, params = []) => sqlite.prepare(sql).get(params),
      all: async (sql, params = []) => sqlite.prepare(sql).all(params),
      normalizeTopic,
    };
    const { collectTopicReadiness } = require('../server/services/topicReadinessService');
    const readiness = await collectTopicReadiness(db, { limit: 3000 });
    sqlite.close();
    return { dbPath, readiness, error: null };
  } catch (err) {
    return { dbPath, readiness: null, error: err.message };
  }
}

function assessTopic(topic, goldRows, readinessByTopic, targets = {}) {
  const normalizedTopic = normalizeTopic(topic.topic);
  const row = readinessByTopic.get(normalizedTopic) || null;
  const matchingGold = goldRows.filter((gold) => goldMatchesTopic(gold, topic));
  const counts = row?.counts || {};
  const missing = new Set(row?.missing || []);

  if ((topic.searchQueries || []).length < 2 && matchingGold.length < 2) missing.add('search_eval_queries');
  if ((topic.landmarkPmids || []).length < Number(targets.minimumLandmarkPmids || 1)) missing.add('landmark_pmids');
  if ((topic.guidelineQueries || []).length < 1) missing.add('guideline_query');

  return {
    topic: topic.topic,
    normalizedTopic,
    block: topic.block,
    priority: topic.priority,
    readinessTier: row?.tier || 'not_loaded',
    dbCounts: {
      sourceArticles: Number(counts.sourceArticles || 0),
      guidelines: Number(counts.guidelines || 0),
      claims: Number(counts.claims || 0),
      teachingObjects: Number(counts.teachingObjects || 0),
      mcqObjects: Number(counts.mcqObjects || 0),
    },
    configured: {
      aliases: (topic.aliases || []).length,
      landmarkPmids: (topic.landmarkPmids || []).length,
      guidelineQueries: (topic.guidelineQueries || []).length,
      searchQueries: (topic.searchQueries || []).length,
      matchingGoldQueries: matchingGold.length,
    },
    missing: [...missing],
  };
}

function summarize(rows) {
  const byTier = {};
  const byMissing = {};
  for (const row of rows) {
    byTier[row.readinessTier] = (byTier[row.readinessTier] || 0) + 1;
    for (const signal of row.missing) byMissing[signal] = (byMissing[signal] || 0) + 1;
  }
  return {
    topicCount: rows.length,
    flagshipReady: rows.filter((row) => row.readinessTier === 'flagship').length,
    learnerReady: rows.filter((row) => ['learner_ready', 'flagship'].includes(row.readinessTier)).length,
    withTwoSearchQueries: rows.filter((row) => row.configured.searchQueries >= 2 || row.configured.matchingGoldQueries >= 2).length,
    byTier,
    byMissing,
  };
}

async function main() {
  const config = readJson('server/config/flagshipTopics.json');
  const goldRows = loadGoldQueries();
  const { dbPath, readiness, error } = await loadReadiness();
  const readinessByTopic = readinessIndex(readiness);
  const topics = (config.topics || []).map((topic) => assessTopic(topic, goldRows, readinessByTopic, config.targets));
  const report = {
    generatedAt: new Date().toISOString(),
    dbPath,
    dbError: error,
    configVersion: config.version,
    targets: config.targets,
    summary: summarize(topics),
    topics,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `flagship-topic-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('Flagship Topic Audit');
  console.log(`Topics: ${report.summary.topicCount}`);
  console.log(`Flagship-ready: ${report.summary.flagshipReady}`);
  console.log(`Learner-ready or better: ${report.summary.learnerReady}`);
  console.log(`Two-query eval coverage: ${report.summary.withTwoSearchQueries}/${report.summary.topicCount}`);
  console.log(`Tiers: ${JSON.stringify(report.summary.byTier)}`);
  console.log(`Missing: ${JSON.stringify(report.summary.byMissing)}`);
  if (error) console.log(`DB readiness note: ${error}`);
  console.log(`Full report: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
