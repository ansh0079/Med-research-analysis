#!/usr/bin/env node
/**
 * Ingest reviewer judgment files into the relevance_judgements table.
 *
 * The clinician review UI is API-only today, so an offline labeler works from a
 * worksheet (see labeler-handoff/) and this script carries their JSON into the
 * database, where the existing graduation path picks it up:
 *
 *   npm run eval:heldout:ingest -- labeler-handoff/submissions/reviewer-a.json
 *   npm run eval:heldout:ingest -- --dir labeler-handoff/submissions
 *   npm run eval:heldout:ingest -- file.json --write     (default is dry-run)
 *   npm run eval:heldout:ingest -- file.json --write --reviewer-role tuner
 *
 * --reviewer-role matters: anyone who tuned the ranker must be marked 'tuner'
 * (their verdicts are recorded but can never graduate into the held-out set).
 * The default 'clinician' is for independent labelers; do not use it for
 * yourself if you have touched ranking code or weights.
 *
 * Input file shape (one per labeler; matches tests/fixtures/heldout/README.md):
 *
 *   {
 *     "labelledBy": "reviewer id",
 *     "judgments": [
 *       {
 *         "scenarioId": "S-TX-AMB-01",
 *         "query": "ACS treatment",
 *         "candidateUid": "https://openalex.org/W...",
 *         "labelledAt": "2026-09-21",
 *         "relevance": "on-topic | adjacent | off-topic",
 *         "applicability": "optional note",
 *         "evidenceType": "optional",
 *         "support": "optional",
 *         "edition": "optional",
 *         "reason": "optional free text"
 *       }
 *     ]
 *   }
 *
 * Inserts are idempotent (upsert on query_key, article_uid, reviewer_id), so
 * re-ingesting a corrected file replaces the earlier verdicts, never doubles.
 */
'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv } = require('../config');
loadEnv();

const db = require('../database');
const { recordJudgement, JudgementRejected } = require('../server/services/eval/relevanceJudgements');
const worksheet = require('../server/services/heldoutWorksheet');

const CANONICAL = { 'on-topic': 'on_topic', on_topic: 'on_topic', adjacent: 'adjacent', 'off-topic': 'off_topic', off_topic: 'off_topic' };

function argValue(flag, fallback = null) {
    const i = process.argv.indexOf(flag);
    if (i < 0) return fallback;
    if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) {
        throw new Error(`${flag} requires a value`);
    }
    return process.argv[i + 1];
}

function loadFiles(args = process.argv.slice(2)) {
    const dirIndex = args.indexOf('--dir');
    const dir = dirIndex >= 0 ? args[dirIndex + 1] : null;
    if (dirIndex >= 0 && (!dir || dir.startsWith('--'))) throw new Error('--dir requires a directory');
    if (dir) {
        return fs.readdirSync(dir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => path.join(dir, f));
    }
    const files = [];
    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--write') continue;
        if (args[i] === '--reviewer-role' || args[i] === '--dir') {
            i += 1;
            continue;
        }
        if (args[i].startsWith('--')) throw new Error(`Unknown option: ${args[i]}`);
        files.push(args[i]);
    }
    return files;
}

async function main() {
    const write = process.argv.includes('--write');
    const reviewerRole = argValue('--reviewer-role', 'clinician');
    if (!['clinician', 'tuner'].includes(reviewerRole)) {
        throw new Error('--reviewer-role must be clinician or tuner');
    }
    const files = loadFiles();
    if (!files.length) {
        console.error('usage: node scripts/heldout-ingest-judgements.js <file.json>... | --dir <dir> [--write]');
        process.exit(2);
    }

    if (typeof db.connect === 'function') await db.connect();

    let ingested = 0;
    let skipped = 0;
    let failed = 0;
    const validFiles = [];
    try {
        for (const file of files) {
            const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
            const reviewer = String(raw.labelledBy || '').trim();
            const judgments = Array.isArray(raw.judgments) ? raw.judgments : [];
            if (!reviewer) {
                console.error(`✗ ${path.basename(file)}: missing top-level "labelledBy"`);
                failed += 1;
                continue;
            }
            if (!judgments.length) {
                console.error(`✗ ${path.basename(file)}: no judgments`);
                failed += 1;
                continue;
            }

            // Structural validation reuses the gate's own worksheet checks,
            // which expect labelledBy/labelledAt on each judgment; fall back
            // to the file-level values.
            const normalized = judgments.map((j) => ({
                ...j,
                labelledBy: j.labelledBy || reviewer,
                labelledAt: j.labelledAt || raw.labelledAt || new Date().toISOString().slice(0, 10),
                candidateUid: j.candidateUid || j.pmid,
            }));
            const problems = worksheet.validateJudgments
                ? worksheet.validateJudgments({ judgments: normalized })
                : [];
            if (problems.length) {
                console.error(`✗ ${path.basename(file)}: ${problems.length} structural problem(s):`);
                for (const p of problems.slice(0, 10)) console.error(`    - ${p}`);
                failed += 1;
                continue;
            }

            validFiles.push({ file, reviewer, normalized });
        }

        if (failed) {
            console.error(`\nValidation failed for ${failed} file(s); no judgments ingested.`);
            return 1;
        }

        for (const { file, reviewer, normalized } of validFiles) {
            for (const j of normalized) {
                const label = CANONICAL[String(j.relevance || '').trim().toLowerCase()];
                const uid = String(j.candidateUid || j.pmid || '').trim();
                if (!label || !uid) {
                    console.error(`  ✗ ${file}: "${j.query || '?'}" / ${uid || '?'}: unrecognised relevance "${j.relevance}"`);
                    skipped += 1;
                    continue;
                }
                if (!write) continue;
                try {
                    await recordJudgement(db, {
                        query: j.query,
                        articleUid: uid,
                        label,
                        reviewerId: reviewer,
                        reviewerRole,
                        reason: j.reason || j.applicability || null,
                        scenarioId: j.scenarioId || null,
                        intendedSense: j.intendedSense || null,
                        articleTitle: j.articleTitle || null,
                    });
                    ingested += 1;
                } catch (err) {
                    if (err instanceof JudgementRejected) {
                        console.error(`  ✗ ${file}: ${j.query} / ${uid}: ${err.message}`);
                        skipped += 1;
                    } else {
                        throw err;
                    }
                }
            }
            console.log(`✓ ${path.basename(file)}: ${normalized.length} judgment(s) by "${reviewer}"${write ? '' : ' (dry run)'}`);
        }

        if (!write) {
            console.log(`\nDry run: ${validFiles.length} file(s), structurally valid. Re-run with --write to ingest.`);
            return 0;
        }
        console.log(`\nIngested ${ingested} judgment(s); skipped ${skipped}.`);
        return failed ? 1 : 0;
    } finally {
        if (typeof db.close === 'function') await db.close();
    }
}

if (require.main === module) {
    main().then((code) => process.exit(code)).catch((err) => {
        console.error('heldout-ingest-judgements: crashed:', err);
        process.exit(1);
    });
}

module.exports = { loadFiles, main };
