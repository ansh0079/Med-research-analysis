'use strict';

const crypto = require('crypto');

const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const cleanDoi = (value) => String(value || '').trim().toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/\/$/, '');
const cleanPmid = (value) => String(value || '').match(/(?:pubmed\.ncbi\.nlm\.nih\.gov\/)?(\d{5,9})/)?.[1] || '';

function identifiers(ref = {}) {
    const uid = String(ref.sourceArticleUid || ref.articleUid || ref.uid || '').trim();
    const sourceUrl = String(ref.sourceUrl || ref.url || '').trim();
    return {
        documentId: ref.documentId ?? ref.guidelineDocumentId ?? null,
        pmid: cleanPmid(ref.pmid || sourceUrl || (/^pmid:/i.test(uid) ? uid : '')) || null,
        pmcid: ref.pmcid ? String(ref.pmcid).toUpperCase() : null,
        doi: cleanDoi(ref.doi || (/^doi:/i.test(uid) ? uid.replace(/^doi:/i, '') : '')) || null,
        sourceUrl: sourceUrl || null,
        title: ref.title || ref.sourceTitle || null,
    };
}

async function resolveDocument(db, ref) {
    const ids = identifiers(ref);
    let row = null;
    if (ids.documentId != null) row = await db.get('SELECT * FROM guideline_documents WHERE id = ?', [ids.documentId]).catch(() => null);
    if (!row && ids.pmcid) row = await db.get('SELECT * FROM guideline_documents WHERE upper(pmcid) = ?', [ids.pmcid]).catch(() => null);
    if (!row && ids.pmid) row = await db.get('SELECT * FROM guideline_documents WHERE pmid = ? LIMIT 1', [ids.pmid]).catch(() => null);
    if (!row && ids.doi) row = await db.get('SELECT * FROM guideline_documents WHERE lower(doi) = ? LIMIT 1', [ids.doi]).catch(() => null);
    if (!row && ids.sourceUrl) row = await db.get('SELECT * FROM guideline_documents WHERE source_url = ? LIMIT 1', [ids.sourceUrl]).catch(() => null);
    return { ids, row };
}

function generationKind(objectType) {
    const type = String(objectType || '');
    if (type.includes('mcq') || type.includes('quiz')) return 'mcq';
    if (type === 'paper' || type.includes('summary') || type.includes('consensus') || type.includes('synopsis')) return 'synopsis';
    return null;
}

function evidenceEntries(object = {}) {
    const payload = object.payload || {};
    const entries = [];
    if (object.articleUid || payload.paper) {
        entries.push({
            ref: { ...(payload.paper || {}), articleUid: object.articleUid || payload.paper?.uid },
            role: 'primary_source', questionId: null, claimKey: null, exactQuote: null,
            sourceVersionId: payload.lineage?.sourceVersionId || payload.claimSupport?.sourceVersionId || null,
        });
    }
    for (const claim of (Array.isArray(payload.claimAnchors) ? payload.claimAnchors : [])) {
        entries.push({ ref: claim, role: 'synopsis_claim', questionId: null,
            claimKey: claim.claimKey || null, exactQuote: claim.exactQuote || claim.quote || null,
            sourceVersionId: claim.sourceVersionId || payload.claimSupport?.sourceVersionId || null });
    }
    const questions = Array.isArray(payload.mcqs) ? payload.mcqs
        : (Array.isArray(payload.response?.questions) ? payload.response.questions : []);
    questions.forEach((question, index) => {
        const questionId = String(question.id || `index:${index}`);
        for (const [role, refs] of [
            ['mcq_source', question.sourceRefs], ['mcq_anchor', question.evidenceAnchors],
            ['mcq_candidate', question.evidenceCandidates],
        ]) {
            for (const ref of (Array.isArray(refs) ? refs : [])) {
                entries.push({
                    ref, role, questionId, claimKey: question.claimKey || null,
                    exactQuote: ref.exactQuote || ref.quote || ref.excerpt || null,
                    sourceVersionId: ref.sourceVersionId || null,
                });
            }
        }
        if (question.documentId || question.pmid || question.doi || question.sourceUrl || question.sourceArticleUid) {
            entries.push({ ref: question, role: 'mcq_source', questionId,
                claimKey: question.claimKey || null, exactQuote: question.exactQuote || null,
                sourceVersionId: question.sourceVersionId || null });
        }
    });
    return entries;
}

async function registerTeachingObjectEvidence(db, object = {}, stored = null) {
    const kind = generationKind(object.objectType);
    if (!kind || typeof db?.run !== 'function' || typeof db?.get !== 'function') return { registered: 0 };
    const objectKey = String(object.objectKey || stored?.objectKey || '').trim();
    const topic = String(object.topic || stored?.topic || object.normalizedTopic || '').trim();
    if (!objectKey || !topic) return { registered: 0 };
    const normalizedTopic = object.normalizedTopic || stored?.normalizedTopic || db.normalizeTopic(topic);
    const curriculumTopicId = object.curriculumTopicId || stored?.curriculumTopicId
        || stored?.curriculum_topic_id || null;
    const generatedAt = object.generatedAt || stored?.generatedAt || new Date().toISOString();
    let registered = 0;
    for (const entry of evidenceEntries(object)) {
        const { ids, row } = await resolveDocument(db, entry.ref || {});
        const documentId = row?.id ?? ids.documentId ?? null;
        if (documentId == null && !ids.pmid && !ids.pmcid && !ids.doi && !ids.sourceUrl && !entry.sourceVersionId) continue;
        const identity = documentId != null ? `document:${documentId}`
            : ids.pmcid ? `pmcid:${ids.pmcid}` : ids.pmid ? `pmid:${ids.pmid}`
                : ids.doi ? `doi:${ids.doi}` : ids.sourceUrl ? `url:${ids.sourceUrl}`
                    : `version:${entry.sourceVersionId}`;
        const registryKey = crypto.createHash('sha256').update(JSON.stringify({ objectKey, generatedAt,
            kind, questionId: entry.questionId, claimKey: entry.claimKey, identity, role: entry.role,
            quote: entry.exactQuote || '' })).digest('hex');
        await db.run(`INSERT INTO generation_evidence_registry
            (registry_key,topic,normalized_topic,curriculum_topic_id,generation_kind,object_key,object_type,
             question_id,claim_key,guideline_document_id,document_title,pmid,pmcid,doi,source_url,
             source_version_id,evidence_snapshot_id,exact_quote,evidence_role,provider,model,review_state,
             generated_at,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(registry_key) DO UPDATE SET
              guideline_document_id=excluded.guideline_document_id,document_title=excluded.document_title,
              review_state=excluded.review_state,updated_at=excluded.updated_at`, [
            registryKey, topic, normalizedTopic, curriculumTopicId, kind, objectKey, object.objectType,
            entry.questionId, entry.claimKey, documentId, row?.title || ids.title,
            row?.pmid || ids.pmid, row?.pmcid || ids.pmcid, row?.doi || ids.doi,
            row?.source_url || ids.sourceUrl, entry.sourceVersionId,
            object.evidenceSnapshotId || stored?.evidenceSnapshotId || null, entry.exactQuote,
            entry.role, object.provider || null, object.model || null,
            object.reviewState || object.payload?.reviewState || stored?.reviewState || 'unreviewed',
            generatedAt, new Date().toISOString(), new Date().toISOString(),
        ]);
        registered += 1;
    }
    return { registered };
}

async function registerGuidelineDocumentSynopsis(db, document) {
    if (!document?.id || !document?.synopsis_json) return { registered: 0 };
    const topic = document.topic || document.title || `Document ${document.id}`;
    return registerTeachingObjectEvidence(db, {
        objectKey: `guideline-document-synopsis:${document.id}`, objectType: 'guideline_synopsis',
        topic, normalizedTopic: norm(topic), title: document.title,
        articleUid: document.pmid ? `pmid:${document.pmid}` : document.doi ? `doi:${document.doi}` : null,
        provider: document.synopsis_provider || null, model: document.synopsis_model || null,
        generatedAt: document.synopsis_generated_at, reviewState: 'unreviewed',
        payload: { paper: { documentId: document.id, pmid: document.pmid, pmcid: document.pmcid,
            doi: document.doi, sourceUrl: document.source_url, title: document.title } },
    });
}

module.exports = { generationKind, evidenceEntries, registerTeachingObjectEvidence, registerGuidelineDocumentSynopsis };
