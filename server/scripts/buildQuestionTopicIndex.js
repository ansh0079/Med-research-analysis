'use strict';

/**
 * Builds the question-to-topic index (migration 109).
 *
 *   node server/scripts/buildQuestionTopicIndex.js                 dry run: classify and write a report, change nothing
 *   node server/scripts/buildQuestionTopicIndex.js --write         also write question_topic_index and guideline_topic_index
 *   options: --limit N (first N questions, for a quick check)  --report PATH  --thresholds '{"alignedSupport":0.6}'
 *
 * The stored questions and guideline rows are never modified. A dry run costs the embeddings only
 * (~45k short texts, under a dollar) and writes a JSON report with the distributions and examples
 * needed to choose the thresholds before anything is stored.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { embedBatch } = require('../services/questionIndex/batchEmbed');
const { loadSources, buildIndex, writeIndex } = require('../services/questionIndex/questionIndexService');
const { DEFAULT_THRESHOLDS } = require('../services/questionIndex/classify');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const WRITE = flag('--write');
const IF_DIRTY = flag('--if-dirty');
const CACHE_DIR = value('--cache');
const LIMIT = value('--limit') ? parseInt(value('--limit'), 10) : Infinity;
const REPORT = value('--report', path.join(process.cwd(), 'question-topic-index-report.json'));
const thresholds = { ...DEFAULT_THRESHOLDS, ...(value('--thresholds') ? JSON.parse(value('--thresholds')) : {}) };

const crypto = require('crypto');
const textKey = (text) => crypto.createHash('sha1').update(String(text)).digest('hex');
const DIM = 384;

function loadEmbeddingCache(dir) {
    const map = new Map();
    const keysFile = path.join(dir, 'keys.json');
    const vecsFile = path.join(dir, 'vectors.bin');
    if (fs.existsSync(keysFile) && fs.existsSync(vecsFile)) {
        const keys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
        const buf = fs.readFileSync(vecsFile);
        const all = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        keys.forEach((k, i) => map.set(k, all.slice(i * DIM, (i + 1) * DIM)));
        console.log(`Embedding cache: ${map.size} vectors loaded`);
    }
    return map;
}

function saveEmbeddingCache(dir, map) {
    fs.mkdirSync(dir, { recursive: true });
    const keys = [...map.keys()];
    const all = new Float32Array(keys.length * DIM);
    keys.forEach((k, i) => all.set(map.get(k), i * DIM));
    fs.writeFileSync(path.join(dir, 'keys.json'), JSON.stringify(keys));
    fs.writeFileSync(path.join(dir, 'vectors.bin'), Buffer.from(all.buffer));
    console.log(`Embedding cache saved: ${keys.length} vectors`);
}

async function embedWithCache(map, texts, label, rawEmbed) {
    const keys = texts.map(textKey);
    const missingIdx = [];
    keys.forEach((k, i) => { if (!map.has(k)) missingIdx.push(i); });
    if (missingIdx.length) {
        const fresh = await rawEmbed(missingIdx.map((i) => texts[i]), label);
        missingIdx.forEach((i, j) => map.set(keys[i], fresh[j]));
    }
    return keys.map((k) => map.get(k));
}

function percentile(sorted, p) {
    if (!sorted.length) return null;
    return Number(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))].toFixed(3));
}

function distribution(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return { n: sorted.length, p05: percentile(sorted, 0.05), p25: percentile(sorted, 0.25), p50: percentile(sorted, 0.5), p75: percentile(sorted, 0.75), p95: percentile(sorted, 0.95) };
}

/** A few examples per category, evenly spread, so the thresholds can be judged by reading real questions. */
function examples(questions, category, n = 8) {
    const list = questions.filter((q) => q.category === category);
    const step = Math.max(1, Math.floor(list.length / n));
    return list.filter((_, i) => i % step === 0).slice(0, n).map((q) => ({
        stem: q.stem,
        filedUnder: q.originalTopic,
        placedOn: q.assignedTopicName,
        topicSimilarity: Number(q.topicSimilarity.toFixed(3)),
        runnerUpGap: Number((q.topicSimilarity - q.runnerUpSimilarity).toFixed(3)),
        guidelineSupport: Number(q.guidelineSupport.toFixed(3)),
        paperSupport: Number((q.paperSupport || 0).toFixed(3)),
        evidenceSupport: q.evidenceSupport,
        reasons: q.reasons,
    }));
}

(async () => {
    await db.connect();
    // A dry run only reads; the tables are created (migration 109) when the index is actually written.
    if (WRITE) await db.runMigrations();
    if (IF_DIRTY) {
        const pending = await db.get('SELECT COUNT(*) AS count FROM question_index_dirty WHERE processed_at IS NULL', []).catch(() => ({ count: 0 }));
        if (!Number(pending?.count || 0)) {
            console.log('Question index is clean; no rebuild needed.');
            process.exit(0);
        }
        console.log(`Question index has ${pending.count} changed source rows.`);
    }

    const sources = await loadSources(db);
    if (Number.isFinite(LIMIT)) sources.questions = sources.questions.slice(0, LIMIT);
    console.log(`Loaded ${sources.questions.length} questions, ${sources.topics.length} topics, ${sources.recs.length} guideline rows, ${sources.papers.length} papers`);

    const rawEmbed = (texts, label) => embedBatch(texts, {
        geminiKey: serverConfig.keys.gemini,
        onProgress: (done, total) => { if (done === total || done % 2000 === 0) console.log(`  embedded ${label}: ${done}/${total}`); },
    });
    // --cache DIR keeps embeddings between runs, keyed by text, so tuning thresholds costs nothing.
    const cache = CACHE_DIR ? loadEmbeddingCache(CACHE_DIR) : null;
    const embed = cache ? (texts, label) => embedWithCache(cache, texts, label, rawEmbed) : rawEmbed;
    const built = await buildIndex({ sources, embed, thresholds, onStage: (stage, n) => console.log(`Stage ${stage} (${n})`) });

    const report = {
        generatedAt: new Date().toISOString(),
        thresholds,
        stats: built.stats,
        similarityBelow: Object.fromEntries([0.58, 0.6, 0.62, 0.64, 0.66, 0.68].map((x) => [x, built.questions.filter((q) => q.topicSimilarity < x).length])),
        topicSimilarity: distribution(built.questions.map((q) => q.topicSimilarity)),
        guidelineSupport: distribution(built.questions.map((q) => q.guidelineSupport)),
        paperSupport: distribution(built.questions.map((q) => q.paperSupport || 0)),
        byEvidenceSupport: built.questions.reduce((acc, q) => { acc[q.evidenceSupport] = (acc[q.evidenceSupport] || 0) + 1; return acc; }, {}),
        byCategory: built.questions.reduce((acc, q) => { acc[q.category] = (acc[q.category] || 0) + 1; return acc; }, {}),
        byCategoryAndEvidenceSupport: (() => {
            const map = {};
            for (const q of built.questions) {
                const c = q.category || 'unknown';
                const e = q.evidenceSupport || 'none';
                map[c] = map[c] || {};
                map[c][e] = (map[c][e] || 0) + 1;
            }
            return map;
        })(),
        margin: distribution(built.questions.map((q) => q.topicSimilarity - q.runnerUpSimilarity)),
        dualLinked: {
            total: built.questions.filter((q) => q.category === 'dual_linked').length,
            byPair: (() => {
                const map = new Map();
                for (const q of built.questions) {
                    if (q.category !== 'dual_linked') continue;
                    const a = String(q.assignedCurriculumTopicId || '').trim();
                    const b = String(q.secondaryCurriculumTopicId || q.runnerUpCurriculumTopicId || '').trim();
                    if (!a || !b) continue;
                    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
                    map.set(key, (map.get(key) || 0) + 1);
                }
                return [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, 50).map(([pair, count]) => ({ pair, count }));
            })(),
        },
        examples: {
            aligned: examples(built.questions, 'aligned'),
            alignedButMoved: examples(built.questions.filter((q) => q.category === 'aligned' && !q.sameAsFiled).map((q) => q), 'aligned'),
            unclear: examples(built.questions, 'unclear'),
            unassignable: examples(built.questions, 'unassignable'),
            lowestSimilarity: [...built.questions].sort((a, b) => a.topicSimilarity - b.topicSimilarity).slice(0, 25).map((q) => ({ stem: q.stem, filedUnder: q.originalTopic, placedOn: q.assignedTopicName, topicSimilarity: Number(q.topicSimilarity.toFixed(3)), category: q.category })),
            lowestSupport: [...built.questions].filter((q) => q.guidelineSupport > 0).sort((a, b) => a.guidelineSupport - b.guidelineSupport).slice(0, 15).map((q) => ({ stem: q.stem, placedOn: q.assignedTopicName, guidelineSupport: Number(q.guidelineSupport.toFixed(3)), category: q.category })),
            noSupportAtAll: built.questions.filter((q) => q.guidelineSupport === 0).slice(0, 15).map((q) => ({ stem: q.stem, filedUnder: q.originalTopic, placedOn: q.assignedTopicName })),
        },
    };
    if (cache) saveEmbeddingCache(CACHE_DIR, cache);
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ stats: built.stats, topicSimilarity: report.topicSimilarity, guidelineSupport: report.guidelineSupport, margin: report.margin }, null, 2));
    console.log(`Report written to ${REPORT}`);

    if (WRITE) {
        const written = await writeIndex(db, built);
        console.log(`Index written: ${written.questions} questions, ${written.guidelines} guideline rows`);
    } else {
        console.log('Dry run: nothing written to the database. Re-run with --write to store the index.');
    }
    process.exit(0);
})().catch((err) => { console.error('FAILED', err); process.exit(1); });
