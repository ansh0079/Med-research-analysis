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
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function loadFiles() {
    const dir = argValue('--dir');
    if (dir) {
        return fs.readdirSync(dir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => path.join(dir, f));
    }
    return process.argv.slice(2).filter((a) => !a.startsWith('--'));
}

async function main() {
    const write = process.argv.includes('--write');
    const files = loadFiles();
    if (!files.length) {
        console.error('usage: node scripts/heldout-ingest-judgements.js <file.json>... | --dir <dir> [--write]');
        process.exit(2);
    }

    if (typeof db.connect === 'function') await db.connect();

    let ingested = 0;
    let skipped = 0;
    let failed = 0;
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
                        reviewerRole: 'clinician',
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
            console.log(`\nDry run: ${files.length} file(s), structurally valid. Re-run with --write to ingest.`);
            return 0;
        }
        console.log(`\nIngested ${ingested} judgment(s); skipped ${skipped}.`);
        return failed ? 1 : 0;
    } finally {
        if (typeof db.close === 'function') await db.close();
    }
}

main().then((code) => process.exit(code)).catch((err) => {
    console.error('heldout-ingest-judgements: crashed:', err);
    process.exit(1);
});
