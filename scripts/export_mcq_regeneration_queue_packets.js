'use strict';

/** Export ready production queue rows with exact stored passages. No network/LLM calls. */
const fs = require('fs');
const path = require('path');
const db = require('../database');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const topicLimit = Number(option('--topics', 10));
const output = path.resolve(option('--output', '/tmp/mcq-regeneration-ready-packet.json'));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const words = (value) => [...new Set((String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((word) => word.length >= 5))];
const generic = new Set(['management', 'treatment', 'diagnosis', 'timing', 'therapy', 'clinical',
    'guideline', 'review', 'disease', 'syndrome', 'induced', 'modes']);
const synonyms = new Map([['acute confusion', ['delirium', 'acute confusional state']]]);

function relevant(topic, document) {
    const label = clean(topic).toLowerCase();
    const text = clean(`${document.title || ''} ${document.full_text || ''}`).toLowerCase();
    if (text.includes(label) || (synonyms.get(label) || []).some((value) => text.includes(value))) return true;
    const tokens = words(topic); const condition = tokens.find((word) => !generic.has(word));
    if (condition && !text.includes(condition)) return false;
    const hits = tokens.filter((word) => text.includes(word));
    return tokens.length >= 2 && hits.length >= 2 && hits.length / tokens.length >= 0.5;
}

function passages(text, query) {
    const wanted = words(query);
    return String(text || '').replace(/<[^>]+>/g, ' ').split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map(clean).filter((value) => value.length >= 80 && value.length <= 1800)
        .map((exactQuote) => ({ exactQuote,
            score: wanted.filter((word) => exactQuote.toLowerCase().includes(word)).length }))
        .filter((item) => item.score >= 2).sort((a, b) => b.score - a.score).slice(0, 8);
}

async function main() {
    await db.connect();
    const rows = await db.all(`SELECT * FROM evidence_locked_mcq_regeneration_queue
        WHERE status = 'ready_for_generation' ORDER BY normalized_topic,id`);
    const ids = [...new Set(rows.flatMap((row) => {
        try { return JSON.parse(row.candidate_document_ids || '[]'); } catch { return []; }
    }))];
    const documents = new Map();
    for (const id of ids) {
        const row = await db.get(`SELECT id,title,pmid,pmcid,doi,source_url,full_text,full_text_source
            FROM guideline_documents WHERE id = ?`, [id]);
        if (row) documents.set(String(id), row);
    }
    const topics = new Set(); const packets = [];
    for (const row of rows) {
        if (!topics.has(row.topic) && topics.size >= topicLimit) continue;
        let documentIds = []; try { documentIds = JSON.parse(row.candidate_document_ids || '[]'); } catch { continue; }
        const evidence = documentIds.map((id) => documents.get(String(id))).filter(Boolean)
            .filter((document) => relevant(row.topic, document))
            .map((document) => ({ documentId: document.id, title: document.title, pmid: document.pmid,
                pmcid: document.pmcid, doi: document.doi, sourceUrl: document.source_url,
                passages: passages(document.full_text, `${row.topic} ${row.current_question}`) }))
            .filter((document) => document.passages.length);
        if (!evidence.length) continue;
        topics.add(row.topic);
        packets.push({ queueKey: row.queue_key, topic: row.topic, normalizedTopic: row.normalized_topic,
            curriculumTopicId: row.curriculum_topic_id, sourceObjectKey: row.source_object_key,
            sourceQuestionId: row.source_question_id, sourceQuestionIndex: row.source_question_index,
            originalQuestionForScopeOnly: row.current_question, evidence });
    }
    fs.writeFileSync(output, `${JSON.stringify({ createdAt: new Date().toISOString(), topicCount: topics.size,
        questionCount: packets.length, packets }, null, 2)}\n`);
    console.log(JSON.stringify({ output, topicCount: topics.size, questionCount: packets.length }, null, 2));
    await db.close();
}
main().catch(async (error) => { console.error(error); await db.close().catch(() => null); process.exitCode = 1; });
