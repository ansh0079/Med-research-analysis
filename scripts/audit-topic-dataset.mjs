#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'eval-results');
const require = createRequire(import.meta.url);
const { collectTopicReadiness } = require('../server/services/topicReadinessService');

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function normalizeTopic(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function simpleSpecialty(topic) {
  const text = String(topic || '').toLowerCase();
  const rules = [
    ['Cardiovascular', /\b(heart|cardiac|coronary|atrial|fibrillation|hypertension|stroke|thrombo|embol|vascular|syncope|endocarditis|anticoag)/],
    ['Respiratory', /\b(asthma|copd|pneumonia|respiratory|lung|pulmonary|ards|bronch|sleep apnoea|fibrosis|ild)/],
    ['Gastrointestinal / Hepatology', /\b(gastro|bowel|colon|crohn|colitis|liver|hepati|cirrhosis|pancrea|ulcer|gi |abdominal|ascites|portal)/],
    ['Renal / Urology', /\b(kidney|renal|ckd|aki|urinary|uti|urology|electrolyte|sodium|potassium|calcium|uropathy|pyelonephritis)/],
    ['Endocrine / Metabolic', /\b(diabetes|thyroid|adrenal|obesity|lipid|metabolic|calcaemia|parathyroid|bariatric)/],
    ['Neurology', /\b(neuro|seizure|epilep|parkinson|dementia|delirium|headache|migraine|confusion|sciatica|radiculopathy|ms )/],
    ['Rheumatology / Musculoskeletal', /\b(arthritis|gout|osteoporosis|fracture|rheumat|spondyl|lupus|vasculitis|back pain|tendin)/],
    ['Infectious Diseases / Sepsis', /\b(sepsis|infection|tuberculosis|hiv|malaria|dengue|typhoid|cellulitis|antibiotic|fever)/],
    ['Haematology / Oncology', /\b(cancer|oncology|anaemia|thrombocyt|coagulation|lymphoma|leukaemia|neutropenic|myeloma)/],
    ['Psychiatry / Mental Health', /\b(depression|anxiety|psych|suicide|behaviour|withdrawal|addiction|mental)/],
    ['Dermatology', /\b(dermat|rash|eczema|psoriasis|skin|ulcer|angioedema|stevens|dress)/],
    ['Obstetrics / Gynaecology', /\b(pregnancy|obstetric|gynaec|uterine|ectopic|pre-eclampsia|gestational|pelvic|fibroid|hormone replacement)/],
    ['Paediatrics', /\b(paediatric|pediatric|child|childhood|bronchiolitis|viral wheeze)/],
    ['Emergency / Acute Care', /\b(emergency|ed |acute|collapse|cardiac arrest|appendicitis|cholecystitis|obstruction|shortness of breath|chest pain)/],
    ['Anaesthesia / Critical Care', /\b(anaesthesia|anesthesia|perioperative|airway|sedation|critical care|icu|rcri|ards)/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || 'Unclassified';
}

function topicFromAny(row) {
  if (typeof row === 'string') return row;
  return row?.displayName || row?.topic || row?.name || row?.title || '';
}

function sourceRows() {
  const sources = [];
  const legacy = readJson('server/scripts/topics.json');
  if (legacy?.topics) {
    sources.push({
      source: 'server/scripts/topics.json',
      kind: 'legacy_topic_strings',
      rows: legacy.topics.map((topic) => ({ topic, specialty: simpleSpecialty(topic) })),
    });
  }

  const core = readJson('server/data/coreClinicalTopics.json');
  if (Array.isArray(core)) {
    sources.push({
      source: 'server/data/coreClinicalTopics.json',
      kind: 'structured_core_clinical_topics',
      rows: core.map((row) => ({
        topic: row.displayName,
        specialty: row.block || simpleSpecialty(row.displayName),
        priority: row.priority || 'unknown',
        volatility: row.volatility || 'unknown',
        suggestedQuery: row.suggestedQuery || '',
      })),
    });
  }

  const prereqs = readJson('server/scripts/topic-prerequisites.json');
  if (Array.isArray(prereqs)) {
    sources.push({
      source: 'server/scripts/topic-prerequisites.json',
      kind: 'topic_prerequisites',
      rows: prereqs.map((row) => ({
        topic: row.topic,
        specialty: simpleSpecialty(row.topic),
        prerequisites: Array.isArray(row.prerequisites) ? row.prerequisites : [],
      })),
    });
  }

  const aliasSeeds = readJson('server/config/clinicalQueryAliasSeeds.json');
  if (Array.isArray(aliasSeeds?.seeds)) {
    sources.push({
      source: 'server/config/clinicalQueryAliasSeeds.json',
      kind: 'clinical_query_alias_seeds',
      rows: aliasSeeds.seeds.map((row) => ({
        topic: [...(row.aliases || []), ...(row.pmids || [])].filter(Boolean).join(' / '),
        specialty: simpleSpecialty([...(row.all || []), ...(row.aliases || [])].join(' ')),
        aliases: row.aliases || [],
        pmids: row.pmids || [],
      })),
    });
  }

  return sources;
}

function summarizeRows(rows) {
  const bySpecialty = {};
  const byPriority = {};
  const byVolatility = {};
  const normalized = new Map();
  const tooBroad = [];
  const tooNarrow = [];
  const acronymLike = [];

  for (const row of rows) {
    const topic = topicFromAny(row).trim();
    if (!topic) continue;
    const key = normalizeTopic(topic);
    if (!normalized.has(key)) normalized.set(key, []);
    normalized.get(key).push(topic);
    bySpecialty[row.specialty || simpleSpecialty(topic)] = (bySpecialty[row.specialty || simpleSpecialty(topic)] || 0) + 1;
    if (row.priority) byPriority[row.priority] = (byPriority[row.priority] || 0) + 1;
    if (row.volatility) byVolatility[row.volatility] = (byVolatility[row.volatility] || 0) + 1;
    const words = topic.split(/\s+/).filter(Boolean);
    if (words.length <= 1 && topic.length < 11) acronymLike.push(topic);
    if (words.length <= 2 && /\b(management|disease|infection|cancer|pain|asthma|diabetes|hypertension)\b/i.test(topic)) tooBroad.push(topic);
    if (words.length >= 7) tooNarrow.push(topic);
  }

  const duplicateGroups = [...normalized.values()]
    .filter((items) => new Set(items.map((v) => v.toLowerCase())).size > 1 || items.length > 1)
    .map((items) => [...new Set(items)])
    .slice(0, 50);

  return {
    count: rows.length,
    uniqueNormalizedCount: normalized.size,
    duplicateGroupCount: [...normalized.values()].filter((items) => items.length > 1).length,
    bySpecialty,
    byPriority,
    byVolatility,
    samples: rows.slice(0, 20).map((row) => topicFromAny(row)),
    flags: {
      tooBroad: tooBroad.slice(0, 50),
      tooNarrow: tooNarrow.slice(0, 50),
      acronymLike: acronymLike.slice(0, 50),
      duplicateGroups,
    },
  };
}

function findSqliteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findSqliteFiles(full));
    else if (/\.(db|sqlite|sqlite3)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function sqliteSummary(file) {
  const raw = new Database(file, { readonly: true, fileMustExist: true });
  const db = {
    normalizeTopic(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
    },
    get(sql, params = []) {
      return Promise.resolve(raw.prepare(sql).get(params));
    },
    all(sql, params = []) {
      return Promise.resolve(raw.prepare(sql).all(params));
    },
  };
  const tables = [
    'curriculum_topics',
    'topic_knowledge',
    'topic_guidelines',
    'teaching_objects',
    'teaching_object_claims',
    'quiz_attempts',
    'searches',
    'search_result_impressions',
    'search_result_feedback',
    'synopsis_feedback',
    'personalization_decisions',
  ];
  const counts = {};
  for (const table of tables) {
    try {
      counts[table] = raw.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    } catch {
      counts[table] = null;
    }
  }
  const curriculumSamples = counts.curriculum_topics
    ? raw.prepare(`
        SELECT t.display_name, b.name AS block_name, t.priority, t.volatility, t.seed_status
        FROM curriculum_topics t
        LEFT JOIN curriculum_blocks b ON b.id = t.block_id
        LIMIT 20
      `).all()
    : [];
  const knowledgeSamples = counts.topic_knowledge
    ? raw.prepare('SELECT topic, status, updated_at FROM topic_knowledge LIMIT 20').all()
    : [];
  const readiness = await collectTopicReadiness(db, { limit: 50 }).catch((err) => ({ error: err.message }));
  raw.close();
  return {
    file: path.relative(ROOT, file),
    sizeBytes: fs.statSync(file).size,
    counts,
    readiness,
    curriculumSamples,
    knowledgeSamples,
  };
}

async function main() {
  const sources = sourceRows();
  const allRows = sources.flatMap((s) => s.rows.map((row) => ({ ...row, source: s.source, kind: s.kind })));
  const report = {
    generatedAt: new Date().toISOString(),
    sourceSummaries: sources.map((source) => ({
      source: source.source,
      kind: source.kind,
      ...summarizeRows(source.rows),
    })),
    combinedStaticCorpus: summarizeRows(allRows),
    sqliteDatabases: await Promise.all(findSqliteFiles(ROOT).map((file) => {
      try {
        return sqliteSummary(file);
      } catch (err) {
        return { file: path.relative(ROOT, file), error: err.message };
      }
    })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `topic-dataset-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('Topic Dataset Audit');
  console.log(`Static sources: ${report.sourceSummaries.length}`);
  for (const summary of report.sourceSummaries) {
    console.log(`- ${summary.source}: ${summary.count} rows, ${summary.uniqueNormalizedCount} unique normalized`);
  }
  console.log(`Combined static corpus: ${report.combinedStaticCorpus.count} rows, ${report.combinedStaticCorpus.uniqueNormalizedCount} unique normalized`);
  console.log('SQLite DBs:');
  for (const db of report.sqliteDatabases) {
    const counts = db.counts || {};
    const readiness = db.readiness?.summary;
    const tiers = readiness ? `, tiers=${JSON.stringify(readiness.byTier)}` : '';
    console.log(`- ${db.file}: curriculum=${counts.curriculum_topics ?? 'n/a'}, topic_knowledge=${counts.topic_knowledge ?? 'n/a'}, guidelines=${counts.topic_guidelines ?? 'n/a'}, teaching_objects=${counts.teaching_objects ?? 'n/a'}, searches=${counts.searches ?? 'n/a'}${tiers}`);
  }
  console.log(`Full report: ${outPath}`);
}

main();
