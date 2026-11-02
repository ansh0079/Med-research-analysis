'use strict';

/** Link blocked MCQ queue rows to full-text documents already recorded in the provenance registry. */
const db = require('../database');

async function main() {
    await db.connect();
    const rows = await db.all(`SELECT id,normalized_topic,curriculum_topic_id
        FROM evidence_locked_mcq_regeneration_queue WHERE status = 'awaiting_evidence'`);
    const registry = await db.all(`SELECT DISTINCT r.normalized_topic,r.curriculum_topic_id,r.guideline_document_id
        FROM generation_evidence_registry r JOIN guideline_documents d ON d.id=r.guideline_document_id
        WHERE r.guideline_document_id IS NOT NULL
          AND length(trim(COALESCE(d.full_text,''))) >= 500
          AND lower(COALESCE(d.full_text_source,'')) NOT IN ('abstract','bibliographic_abstract')`);
    const aliasLinks = await db.all(`SELECT DISTINCT ta.curriculum_topic_id,c.guideline_document_id
        FROM topic_aliases ta JOIN topic_evidence_catalogue c ON c.normalized_topic=ta.alias_norm
        JOIN guideline_documents d ON d.id=c.guideline_document_id
        WHERE c.guideline_document_id IS NOT NULL AND length(trim(COALESCE(d.full_text,''))) >= 500
          AND lower(COALESCE(d.full_text_source,'')) NOT IN ('abstract','bibliographic_abstract')
        UNION
        SELECT DISTINCT ta.curriculum_topic_id,tg.document_id AS guideline_document_id
        FROM topic_aliases ta JOIN topic_guidelines tg ON tg.normalized_topic=ta.alias_norm
        JOIN guideline_documents d ON d.id=tg.document_id
        WHERE tg.document_id IS NOT NULL AND length(trim(COALESCE(d.full_text,''))) >= 500
          AND lower(COALESCE(d.full_text_source,'')) NOT IN ('abstract','bibliographic_abstract')`);
    const byTopic = new Map(); const byTopicId = new Map();
    const add = (map, key, id) => { if (!key) return; if (!map.has(key)) map.set(key, new Set()); map.get(key).add(id); };
    for (const row of registry) {
        add(byTopic, row.normalized_topic, row.guideline_document_id);
        add(byTopicId, String(row.curriculum_topic_id || ''), row.guideline_document_id);
    }
    for (const row of aliasLinks) add(byTopicId, String(row.curriculum_topic_id || ''), row.guideline_document_id);
    let resolved = 0;
    for (const row of rows) {
        const ids = new Set([...(byTopic.get(row.normalized_topic) || []),
            ...(byTopicId.get(String(row.curriculum_topic_id || '')) || [])]);
        if (!ids.size) continue;
        await db.run(`UPDATE evidence_locked_mcq_regeneration_queue
            SET candidate_document_ids=?,status='ready_for_generation',status_reason=?,updated_at=? WHERE id=?`,
        [JSON.stringify([...ids]), `${ids.size} stored full-text document(s) recovered from provenance registry`,
            new Date().toISOString(), row.id]);
        resolved += 1;
    }
    console.log(JSON.stringify({ inspected: rows.length, resolved, remaining: rows.length - resolved }, null, 2));
    await db.close();
}
main().catch(async (error) => { console.error(error); await db.close().catch(() => null); process.exitCode = 1; });
