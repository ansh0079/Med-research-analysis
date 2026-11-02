'use strict';

const { loadEnv } = require('../config');
const {
    generationKind, evidenceEntries, registerTeachingObjectEvidence, registerGuidelineDocumentSynopsis,
} = require('../server/services/generationEvidenceRegistryService');

loadEnv();
const APPLY = process.argv.includes('--apply');

async function main() {
    const db = require('../database');
    await db.connect();
    const objects = await db.all(`SELECT * FROM teaching_objects ORDER BY id`);
    const documents = await db.all(`SELECT * FROM guideline_documents WHERE synopsis_json IS NOT NULL`);
    const report = { apply: APPLY, teachingObjectsScanned: objects.length, synopsisDocumentsScanned: documents.length,
        eligibleObjects: 0, resolvableEvidenceEntries: 0, objectRegistryWrites: 0,
        documentSynopsisWrites: 0, failures: [] };
    for (const row of objects) {
        let payload;
        try { payload = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload || '{}') : row.object_payload || {}; }
        catch { continue; }
        const object = {
            objectKey: row.object_key, objectType: row.object_type, articleUid: row.article_uid,
            normalizedTopic: row.normalized_topic, topic: row.topic, title: row.title, payload,
            provider: row.provider, model: row.model, reviewState: row.review_state,
            generatedAt: row.generated_at, evidenceSnapshotId: row.evidence_snapshot_id,
        };
        if (!generationKind(object.objectType)) continue;
        report.eligibleObjects += 1;
        report.resolvableEvidenceEntries += evidenceEntries(object).length;
        if (!APPLY) continue;
        try {
            const result = await registerTeachingObjectEvidence(db, object, object);
            report.objectRegistryWrites += result.registered;
        } catch (error) {
            report.failures.push({ objectKey: object.objectKey, error: String(error.message || error) });
        }
    }
    if (APPLY) {
        for (const document of documents) {
            try {
                const result = await registerGuidelineDocumentSynopsis(db, document);
                report.documentSynopsisWrites += result.registered;
            } catch (error) {
                report.failures.push({ documentId: document.id, error: String(error.message || error) });
            }
        }
    }
    console.log(JSON.stringify(report, null, 2));
    await db.close();
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
