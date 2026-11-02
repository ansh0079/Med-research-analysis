'use strict';

/** Import the 2,832-row citation-only audit into a production-safe queue.
 * No network or LLM calls. Existing teaching objects are read but never modified.
 * Usage: node scripts/import_mcq_regeneration_audit_queue.js <audit.csv>
 */
const fs = require('fs');
const crypto = require('crypto');
const db = require('../database');

const auditBatch = 'topic-fulltext-regrounding-2026-11-01';
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const norm = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function parseCsv(text) {
    const rows = []; let row = []; let field = ''; let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
            if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
            else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
        else field += char;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(
        headers.map((header, index) => [header, values[index] || '']),
    ));
}

function exactAnchors(question, documents) {
    return [...(question?.evidenceAnchors || []), ...(question?.evidenceCandidates || []),
        ...(question?.sourceRefs || [])].filter((anchor) => {
        const document = documents.byId.get(String(anchor?.documentId ?? anchor?.guidelineDocumentId ?? ''));
        const quote = clean(anchor?.exactQuote || anchor?.quote || anchor?.excerpt);
        return document && quote.length >= 40 && clean(document.full_text).includes(quote);
    });
}

async function main() {
    const input = process.argv[2];
    if (!input) throw new Error('Audit CSV path is required');
    const audited = parseCsv(fs.readFileSync(input, 'utf8')).filter((row) => row.outcome === 'regenerate');
    await db.connect();
    const [objectRows, documentRows, catalogueRows, guidelineRows, knowledgeRows] = await Promise.all([
        db.all('SELECT id,object_key,topic,normalized_topic,curriculum_topic_id,object_payload FROM teaching_objects'),
        db.all(`SELECT id,title,pmid,pmcid,doi,source_url,full_text,full_text_source FROM guideline_documents
                WHERE length(trim(COALESCE(full_text,''))) >= 500
                AND lower(COALESCE(full_text_source,'')) NOT IN ('abstract','bibliographic_abstract')`),
        db.all(`SELECT topic_id,normalized_topic,guideline_document_id FROM topic_evidence_catalogue
                WHERE guideline_document_id IS NOT NULL`),
        db.all(`SELECT normalized_topic,document_id FROM topic_guidelines
                WHERE document_id IS NOT NULL AND status IN ('active','ai_extracted')`),
        db.all(`SELECT topic,normalized_topic,source_articles FROM topic_knowledge
                WHERE source_articles IS NOT NULL AND source_articles <> '[]'`),
    ]);
    const objects = new Map(objectRows.map((row) => [row.object_key, row]));
    const locationsById = new Map(); const locationsByText = new Map();
    const addLocation = (map, key, location) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(location);
    };
    for (const object of objectRows) {
        let payload = {}; try { payload = JSON.parse(object.object_payload || '{}'); } catch { payload = {}; }
        (payload.mcqs || []).forEach((question, index) => {
            const location = { object, question, index };
            addLocation(locationsById, String(question.id || ''), location);
            addLocation(locationsByText, norm(question.question), location);
        });
    }
    const documents = { byId: new Map(documentRows.map((row) => [String(row.id), row])) };
    const documentsByPmid = new Map(documentRows.filter((row) => row.pmid)
        .map((row) => [String(row.pmid), row.id]));
    const documentsByDoi = new Map(documentRows.filter((row) => row.doi)
        .map((row) => [String(row.doi).toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, ''), row.id]));
    const documentsByUrl = new Map(documentRows.filter((row) => row.source_url)
        .map((row) => [String(row.source_url).replace(/\/$/, ''), row.id]));
    const linksByTopic = new Map(); const linksByTopicId = new Map();
    const add = (map, key, value) => { if (!key || !documents.byId.has(String(value))) return;
        if (!map.has(key)) map.set(key, new Set()); map.get(key).add(Number(value)); };
    for (const row of catalogueRows) {
        add(linksByTopic, norm(row.normalized_topic), row.guideline_document_id);
        add(linksByTopicId, String(row.topic_id || ''), row.guideline_document_id);
    }
    for (const row of guidelineRows) add(linksByTopic, norm(row.normalized_topic), row.document_id);
    for (const row of knowledgeRows) {
        let articles = []; try { articles = JSON.parse(row.source_articles || '[]'); } catch { articles = []; }
        for (const article of articles) {
            const pmid = String(article?.pmid || article?.url || '').match(/(?:pubmed\.ncbi\.nlm\.nih\.gov\/)?(\d{5,9})/)?.[1];
            const doi = String(article?.doi || '').toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '');
            const url = String(article?.url || '').replace(/\/$/, '');
            const documentId = article?.documentId || documentsByPmid.get(pmid)
                || documentsByDoi.get(doi) || documentsByUrl.get(url);
            add(linksByTopic, norm(row.normalized_topic || row.topic), documentId);
        }
    }
    const counts = { audited: audited.length, ready_for_generation: 0, awaiting_evidence: 0,
        cleared_existing_exact_anchor: 0, mapping_mismatch: 0 };
    for (const row of audited) {
        let object = objects.get(row.object_key); let question = null;
        let questionIndex = Number(row.question_index); let status; let reason;
        if (object) {
            let payload = {}; try { payload = JSON.parse(object.object_payload || '{}'); } catch { payload = {}; }
            question = (payload.mcqs || [])[questionIndex] || null;
        }
        if (!question || norm(question.question) !== norm(row.question)) {
            let matches = [...(locationsById.get(String(row.question_id || '')) || []),
                ...(locationsByText.get(norm(row.question)) || [])];
            matches = [...new Map(matches.map((match) => [`${match.object.object_key}#${match.index}`, match])).values()];
            const topicMatches = matches.filter((match) => norm(match.object.topic || match.object.normalized_topic) === norm(row.topic));
            if (topicMatches.length === 1) matches = topicMatches;
            if (matches.length === 1) [{ object, question, index: questionIndex }] = matches;
        }
        if (!object || !question) { status = 'mapping_mismatch'; reason = 'Object or question index not found'; }
        else if (norm(question.question) !== norm(row.question)) {
            status = 'mapping_mismatch'; reason = 'Current question text differs from audited question';
        } else if (exactAnchors(question, documents).length) {
            status = 'cleared_existing_exact_anchor'; reason = 'Existing exact quotation verified in stored full text';
        } else {
            const topicKey = norm(object.normalized_topic || object.topic || row.topic);
            const ids = new Set([...(linksByTopic.get(topicKey) || []),
                ...(linksByTopicId.get(String(object.curriculum_topic_id || '')) || [])]);
            status = ids.size ? 'ready_for_generation' : 'awaiting_evidence';
            reason = ids.size ? `${ids.size} linked stored full-text document(s)` : 'No linked stored full text';
            row.candidateDocumentIds = [...ids];
        }
        counts[status] += 1;
        const key = crypto.createHash('sha256').update(`${row.object_key}#${row.question_index}`).digest('hex');
        await db.run(`INSERT INTO evidence_locked_mcq_regeneration_queue
            (queue_key,topic,normalized_topic,source_object_key,source_question_id,source_question_index,
             audited_question,current_question,curriculum_topic_id,candidate_document_ids,status,status_reason,
             audit_batch,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(queue_key) DO UPDATE SET source_object_key=excluded.source_object_key,
             source_question_index=excluded.source_question_index,current_question=excluded.current_question,
             curriculum_topic_id=excluded.curriculum_topic_id,candidate_document_ids=excluded.candidate_document_ids,
             status=excluded.status,status_reason=excluded.status_reason,updated_at=excluded.updated_at`,
        [key, row.topic, norm(row.topic), object?.object_key || row.object_key, row.question_id || null, questionIndex,
            row.question, question?.question || null, object?.curriculum_topic_id || null,
            JSON.stringify(row.candidateDocumentIds || []), status, reason, auditBatch,
            new Date().toISOString(), new Date().toISOString()]);
    }
    console.log(JSON.stringify(counts, null, 2));
    await db.close();
}
main().catch(async (error) => { console.error(error); await db.close().catch(() => null); process.exitCode = 1; });
