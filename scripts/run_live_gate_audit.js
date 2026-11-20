'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const {
    loadStoredFullTextEvidenceIndex,
    mcqMatchesStoredFullText,
    cleanPmid,
    cleanDoi,
} = require('../server/services/mcqEvidenceGate');

async function main() {
    const rawDb = new Database(path.resolve('database/app.db'));
    const db = {
        all: async (sql, params = []) => rawDb.prepare(sql).all(...params),
        get: async (sql, params = []) => rawDb.prepare(sql).get(...params),
    };

    const evidenceIndex = await loadStoredFullTextEvidenceIndex(db);
    console.log('=== LIVE EVIDENCE INDEX ===');
    console.log('Full-text documentIds:', evidenceIndex.documentIds.size);
    console.log('Full-text guidelineIds:', evidenceIndex.guidelineIds.size);
    console.log('Full-text pmids:', evidenceIndex.pmids.size);
    console.log('Full-text dois:', evidenceIndex.dois.size);
    console.log('Full-text urls:', evidenceIndex.urls.size);
    console.log('Recovered documents:', evidenceIndex.recoveredDocuments.size);

    const rows = rawDb.prepare(`
        SELECT id, object_key, object_type, topic, normalized_topic, curriculum_topic_id, review_state, lineage_status, object_payload
        FROM teaching_objects
        WHERE object_type IN ('curated_topic_mcq', 'verified_topic_mcq', 'cold_start_mcq', 'guideline_mcq')
          AND COALESCE(review_state, '') != 'withdrawn'
          AND COALESCE(lineage_status, '') != 'legacy_retired'
    `).all();

    let totalQuestions = 0;
    let passingQuestions = 0;
    let failingRecoveryStatus = 0;
    let failingNoMatch = 0;
    let objectsWithZeroPassing = 0;
    let objectsWithSomePassing = 0;

    for (const row of rows) {
        let payload = {};
        try { payload = JSON.parse(row.object_payload || '{}'); } catch {}
        const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : (Array.isArray(payload.questions) ? payload.questions : []);
        let objPass = 0;
        for (const q of mcqs) {
            totalQuestions++;
            if (mcqMatchesStoredFullText(q, evidenceIndex)) {
                passingQuestions++;
                objPass++;
            } else {
                const recStatus = String(q?.evidenceRecovery?.status || q?.evidenceRecoveryStatus || '').trim().toLowerCase();
                if (recStatus && recStatus !== 'verified') {
                    failingRecoveryStatus++;
                } else {
                    failingNoMatch++;
                }
            }
        }
        if (objPass === 0) objectsWithZeroPassing++;
        else objectsWithSomePassing++;
    }

    console.log('\n=== LIVE MCQ GATE AUDIT ===');
    console.log('Total active MCQ objects:', rows.length);
    console.log('Objects with >=1 passing MCQ:', objectsWithSomePassing);
    console.log('Objects with 0 passing MCQs (return 404 in live app!):', objectsWithZeroPassing);
    console.log('Total MCQs:', totalQuestions);
    console.log('Passing mcqMatchesStoredFullText:', passingQuestions);
    console.log('Failing due to evidenceRecovery.status != verified:', failingRecoveryStatus);
    console.log('Failing due to no stored full-text identifier match:', failingNoMatch);

    rawDb.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
