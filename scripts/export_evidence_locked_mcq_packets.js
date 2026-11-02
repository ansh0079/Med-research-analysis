'use strict';

/**
 * Builds bounded evidence packets from local stored full text. No network/LLM calls.
 * Usage: node scripts/export_evidence_locked_mcq_packets.js --topics 5 --output audit/mcq-regeneration-packet-001.json
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const topicLimit = Math.max(1, Number(option('--topics', 5)));
const output = path.resolve(option('--output', 'audit/mcq-regeneration-packet-001.json'));
const db = new Database(path.resolve('database/app.db'), { readonly: true });
const stop = new Set('a an and are as at be by for from has have in is it of on or that the this to was were which with patient patients following most appropriate'.split(' '));
const tokens = (value) => [...new Set(String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [])]
    .filter((word) => word.length >= 3 && !stop.has(word));
const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const topicSynonyms = new Map([
    ['acute confusion', ['delirium', 'acute confusional state']],
]);

function topicRelevant(topic, document) {
    const topicText = normalize(topic).toLowerCase();
    const evidenceText = normalize(`${document.title || ''} ${document.full_text || ''}`).toLowerCase();
    if (evidenceText.includes(topicText)) return true;
    if ((topicSynonyms.get(topicText) || []).some((synonym) => evidenceText.includes(synonym))) return true;
    const topicTokens = tokens(topic).filter((token) => token.length >= 5);
    const hits = topicTokens.filter((token) => evidenceText.includes(token));
    return topicTokens.length >= 2 && hits.length >= 2 && hits.length / topicTokens.length >= 0.5;
}

function passages(fullText, query) {
    const queryTokens = tokens(query);
    const units = String(fullText || '').replace(/<[^>]+>/g, ' ')
        .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map(normalize).filter((value) => value.length >= 80 && value.length <= 1800);
    return units.map((text, index) => {
        const textTokens = new Set(tokens(text));
        const score = queryTokens.reduce((sum, token) => sum + (textTokens.has(token) ? 1 : 0), 0);
        return { index, score, text };
    }).filter((item) => item.score >= 2)
        .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 8);
}

const documents = new Map(db.prepare(`SELECT id,title,pmid,pmcid,doi,source_url,full_text,full_text_source
    FROM guideline_documents`).all().map((row) => [String(row.id), row]));
const objects = db.prepare(`SELECT object_key,topic,normalized_topic,curriculum_topic_id,object_payload
    FROM teaching_objects WHERE object_type IN ('curated_topic_mcq','verified_topic_mcq')
      AND review_state IN ('approved','verified','human_reviewed') ORDER BY topic,object_key`).all();
const packets = [];
const selectedTopics = new Set();
for (const object of objects) {
    let payload;
    try { payload = JSON.parse(object.object_payload || '{}'); } catch { continue; }
    for (let index = 0; index < (payload.mcqs || []).length; index += 1) {
        const original = payload.mcqs[index];
        if (original?.evidenceRecovery?.disposition !== 'regenerate_from_topic_evidence') continue;
        const topic = object.topic || object.normalized_topic;
        if (!selectedTopics.has(topic) && selectedTopics.size >= topicLimit) continue;
        const candidateIds = [...new Set(original.evidenceRecovery.candidateDocumentIds || [])];
        const query = `${topic} ${original.question || ''} ${original.explanation || ''}`;
        const evidence = candidateIds.map((id) => documents.get(String(id))).filter(Boolean)
            .filter((row) => normalize(row.full_text).length >= 500
                && !['abstract', 'bibliographic_abstract'].includes(String(row.full_text_source || '').toLowerCase()))
            .filter((row) => topicRelevant(topic, row))
            .map((row) => ({ documentId: row.id, title: row.title, pmid: row.pmid, pmcid: row.pmcid,
                doi: row.doi, sourceUrl: row.source_url, passages: passages(row.full_text, query) }))
            .filter((row) => row.passages.length);
        if (!evidence.length) continue;
        selectedTopics.add(topic);
        packets.push({ topic, normalizedTopic: object.normalized_topic,
            curriculumTopicId: object.curriculum_topic_id, sourceObjectKey: object.object_key,
            sourceQuestionId: original.id || null, sourceQuestionIndex: index,
            originalQuestionForScopeOnly: original.question || '', evidence });
    }
}
const result = { createdAt: new Date().toISOString(), generator: 'local_stored_full_text_only',
    topicCount: selectedTopics.size, questionCount: packets.length, packets };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ output, topicCount: result.topicCount, questionCount: result.questionCount,
    evidenceAssociations: packets.reduce((sum, packet) => sum + packet.evidence.length, 0) }, null, 2));
db.close();
