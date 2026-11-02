'use strict';

/** Production-safe exact-anchor reconciliation and evidence packet export.
 * Uses the configured database adapter and makes no network or LLM calls.
 */
const fs = require('fs');
const path = require('path');
const db = require('../database');

const args = process.argv.slice(2);
const apply = args.includes('--apply-exact');
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const topicLimit = Number(option('--topics', 25));
const output = path.resolve(option('--output', 'audit/production-mcq-regeneration-packet.json'));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const words = (value) => [...new Set((String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((word) => word.length >= 5))];
const synonyms = new Map([['acute confusion', ['delirium', 'acute confusional state']]]);
const generic = new Set(['management', 'treatment', 'diagnosis', 'timing', 'therapy', 'clinical',
    'guideline', 'review', 'disease', 'syndrome', 'induced', 'modes']);

function relevant(topic, document) {
    const label = clean(topic).toLowerCase();
    const text = clean(`${document.title || ''} ${document.full_text || ''}`).toLowerCase();
    if (text.includes(label) || (synonyms.get(label) || []).some((value) => text.includes(value))) return true;
    const tokens = words(topic);
    const condition = tokens.find((word) => !generic.has(word));
    if (condition && !text.includes(condition)) return false;
    const hits = tokens.filter((word) => text.includes(word));
    return tokens.length >= 2 && hits.length >= 2 && hits.length / tokens.length >= 0.5;
}

function rankedPassages(text, query) {
    const queryWords = words(query);
    return String(text || '').replace(/<[^>]+>/g, ' ').split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map(clean).filter((value) => value.length >= 80 && value.length <= 1800)
        .map((value) => ({ exactQuote: value,
            score: queryWords.filter((word) => value.toLowerCase().includes(word)).length }))
        .filter((item) => item.score >= 2).sort((a, b) => b.score - a.score).slice(0, 8);
}

async function main() {
    await db.connect();
    const [documents, objects] = await Promise.all([
        db.all(`SELECT id,title,pmid,pmcid,doi,source_url,full_text,full_text_source
                FROM guideline_documents WHERE length(trim(COALESCE(full_text,''))) >= 500`),
        db.all(`SELECT id,object_key,topic,normalized_topic,curriculum_topic_id,object_payload
                FROM teaching_objects WHERE object_type IN ('curated_topic_mcq','verified_topic_mcq')
                AND review_state IN ('approved','verified','human_reviewed') ORDER BY topic,object_key`),
    ]);
    const byId = new Map(documents.map((row) => [String(row.id), row]));
    const packets = []; const chosenTopics = new Set();
    let pending = 0; let exactCleared = 0; let objectsUpdated = 0;
    for (const object of objects) {
        let payload; try { payload = JSON.parse(object.object_payload || '{}'); } catch { continue; }
        let dirty = false;
        for (let index = 0; index < (payload.mcqs || []).length; index += 1) {
            const question = payload.mcqs[index];
            if (question?.evidenceRecovery?.disposition !== 'regenerate_from_topic_evidence') continue;
            pending += 1;
            const anchors = [...(question.evidenceAnchors || []), ...(question.evidenceCandidates || []),
                ...(question.sourceRefs || [])].filter((anchor) => {
                const document = byId.get(String(anchor?.documentId ?? anchor?.guidelineDocumentId ?? ''));
                const quote = clean(anchor?.exactQuote || anchor?.quote || anchor?.excerpt);
                return document && quote.length >= 40 && clean(document.full_text).includes(quote);
            });
            if (anchors.length) {
                question.evidenceRecovery = { status: 'verified', disposition: 'existing_exact_anchor_verified',
                    verificationMethod: 'stored_full_text_exact_quote_v1', verifiedAt: new Date().toISOString() };
                exactCleared += 1; dirty = true; continue;
            }
            const topic = object.topic || object.normalized_topic;
            if (!chosenTopics.has(topic) && chosenTopics.size >= topicLimit) continue;
            const evidence = [...new Set(question.evidenceRecovery.candidateDocumentIds || [])]
                .map((id) => byId.get(String(id))).filter((document) => document && relevant(topic, document))
                .map((document) => ({ documentId: document.id, title: document.title, pmid: document.pmid,
                    pmcid: document.pmcid, doi: document.doi, sourceUrl: document.source_url,
                    passages: rankedPassages(document.full_text, `${topic} ${question.question} ${question.explanation}`) }))
                .filter((item) => item.passages.length);
            if (!evidence.length) continue;
            chosenTopics.add(topic);
            packets.push({ topic, normalizedTopic: object.normalized_topic,
                curriculumTopicId: object.curriculum_topic_id, sourceObjectKey: object.object_key,
                sourceQuestionId: question.id || null, sourceQuestionIndex: index, evidence });
        }
        if (apply && dirty) {
            await db.run('UPDATE teaching_objects SET object_payload = ?, updated_at = ? WHERE id = ?',
                [JSON.stringify(payload), new Date().toISOString(), object.id]);
            objectsUpdated += 1;
        }
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify({ createdAt: new Date().toISOString(), pending,
        exactCleared, objectsUpdated, topicCount: chosenTopics.size, questionCount: packets.length, packets }, null, 2)}\n`);
    console.log(JSON.stringify({ output, pending, exactCleared, objectsUpdated,
        topicCount: chosenTopics.size, questionCount: packets.length }, null, 2));
    await db.close();
}
main().catch(async (error) => { console.error(error); await db.close().catch(() => null); process.exitCode = 1; });
