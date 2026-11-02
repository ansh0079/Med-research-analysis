'use strict';

const crypto = require('crypto');

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeTopic = (value) => String(value || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

function quotedAnchors(draft) {
    return [draft.answerEvidenceAnchor, ...(draft.explanationEvidenceAnchors || [])];
}

function validateShape(draft) {
    const errors = [];
    if (!draft || typeof draft !== 'object') return ['Draft must be an object'];
    if (!normalizeText(draft.question)) errors.push('question is required');
    if (!Array.isArray(draft.options) || draft.options.length !== 4) errors.push('exactly four options are required');
    if (!/^[A-D]$/.test(String(draft.correctAnswer || ''))) errors.push('correctAnswer must be A-D');
    if (!normalizeText(draft.explanation)) errors.push('explanation is required');
    if (!draft.answerEvidenceAnchor) errors.push('answerEvidenceAnchor is required');
    if (!Array.isArray(draft.explanationEvidenceAnchors) || !draft.explanationEvidenceAnchors.length) {
        errors.push('explanationEvidenceAnchors must contain at least one anchor');
    }
    for (const anchor of quotedAnchors(draft)) {
        if (!anchor || anchor.documentId == null) errors.push('every anchor requires documentId');
        if (normalizeText(anchor?.exactQuote).length < 40) errors.push('every exactQuote must be at least 40 characters');
    }
    return errors;
}

async function verifyExactAnchors(db, draft) {
    const errors = validateShape(draft);
    if (errors.length) return { ok: false, errors, documents: new Map() };
    const documents = new Map();
    for (const anchor of quotedAnchors(draft)) {
        const key = String(anchor.documentId);
        if (!documents.has(key)) {
            const row = await db.get(
                `SELECT id, title, pmid, pmcid, doi, source_url, full_text, full_text_source
                 FROM guideline_documents WHERE id = ?`, [anchor.documentId],
            );
            documents.set(key, row || null);
        }
        const document = documents.get(key);
        if (!document) {
            errors.push(`document ${key} does not exist`);
            continue;
        }
        if (['abstract', 'bibliographic_abstract'].includes(String(document.full_text_source || '').toLowerCase())
            || normalizeText(document.full_text).length < 500) {
            errors.push(`document ${key} is not stored full text`);
            continue;
        }
        const quote = normalizeText(anchor.exactQuote);
        if (!normalizeText(document.full_text).includes(quote)) {
            errors.push(`exactQuote was not found in document ${key}`);
        }
    }
    return { ok: errors.length === 0, errors, documents };
}

async function storeVerifiedDraft(db, input) {
    const verification = await verifyExactAnchors(db, input.replacement);
    if (!verification.ok) {
        const error = new Error(`Evidence-locked MCQ rejected: ${verification.errors.join('; ')}`);
        error.validationErrors = verification.errors;
        throw error;
    }
    const generatedAt = input.generatedAt || new Date().toISOString();
    const identity = {
        sourceObjectKey: input.sourceObjectKey,
        sourceQuestionIndex: Number(input.sourceQuestionIndex),
        replacement: input.replacement,
    };
    const draftKey = input.draftKey || crypto.createHash('sha256')
        .update(JSON.stringify(identity)).digest('hex');
    const documentIds = [...verification.documents.keys()].map(Number).sort((a, b) => a - b);
    const topic = normalizeText(input.topic);
    if (!topic || !normalizeText(input.sourceObjectKey) || !Number.isInteger(Number(input.sourceQuestionIndex))) {
        throw new Error('topic, sourceObjectKey and integer sourceQuestionIndex are required');
    }
    await db.run(
        `INSERT INTO evidence_locked_mcq_drafts
         (draft_key,batch_id,topic,normalized_topic,curriculum_topic_id,source_object_key,
          source_question_id,source_question_index,replacement_payload,guideline_document_ids,
          validation_status,review_state,generator,generated_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(draft_key) DO UPDATE SET
          replacement_payload=excluded.replacement_payload,
          guideline_document_ids=excluded.guideline_document_ids,
          validation_status=excluded.validation_status,
          updated_at=excluded.updated_at`,
        [draftKey, input.batchId, topic, normalizeTopic(topic), input.curriculumTopicId || null,
            input.sourceObjectKey, input.sourceQuestionId || null, Number(input.sourceQuestionIndex),
            JSON.stringify(input.replacement), JSON.stringify(documentIds), 'verified_exact_quotes',
            'unreviewed', 'codex_task_no_cloud_llm', generatedAt, generatedAt, generatedAt],
    );
    const { registerTeachingObjectEvidence } = require('./generationEvidenceRegistryService');
    await registerTeachingObjectEvidence(db, {
        objectKey: `evidence-locked-mcq-draft:${draftKey}`,
        objectType: 'evidence_locked_mcq_draft', topic, normalizedTopic: normalizeTopic(topic),
        curriculumTopicId: input.curriculumTopicId || null,
        provider: 'codex_task', model: 'codex_no_cloud_api', reviewState: 'unreviewed', generatedAt,
        payload: {
            mcqs: [{ ...input.replacement, id: input.sourceQuestionId || `index:${input.sourceQuestionIndex}`,
                evidenceAnchors: quotedAnchors(input.replacement) }],
        },
    });
    return { draftKey, documentIds, reviewState: 'unreviewed' };
}

module.exports = { normalizeText, validateShape, verifyExactAnchors, storeVerifiedDraft };
