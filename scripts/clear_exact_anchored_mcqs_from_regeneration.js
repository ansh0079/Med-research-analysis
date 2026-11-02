'use strict';

/**
 * Removes an MCQ from the regeneration list only when an existing exact quotation
 * is found verbatim in its identified stored full-text document. No fuzzy/title match.
 * Usage: node scripts/clear_exact_anchored_mcqs_from_regeneration.js [--apply]
 */
const path = require('path');
const Database = require('better-sqlite3');

const apply = process.argv.includes('--apply');
const db = new Database(path.resolve('database/app.db'), apply ? {} : { readonly: true });
const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const documents = new Map(db.prepare(`SELECT id,full_text,full_text_source FROM guideline_documents
    WHERE length(trim(COALESCE(full_text,''))) >= 500`).all().map((row) => [String(row.id), row]));
const objects = db.prepare(`SELECT id,object_key,object_payload FROM teaching_objects
    WHERE object_type IN ('curated_topic_mcq','verified_topic_mcq')
      AND review_state IN ('approved','verified','human_reviewed')`).all();
const updates = [];
const report = { apply, pendingInspected: 0, exactAnchoredCleared: 0, objectsUpdated: 0 };

function verifiedAnchors(question) {
    const candidates = [
        ...(Array.isArray(question.evidenceAnchors) ? question.evidenceAnchors : []),
        ...(Array.isArray(question.evidenceCandidates) ? question.evidenceCandidates : []),
        ...(Array.isArray(question.sourceRefs) ? question.sourceRefs : []),
    ];
    return candidates.filter((anchor) => {
        const document = documents.get(String(anchor?.documentId ?? anchor?.guidelineDocumentId ?? ''));
        const quote = normalize(anchor?.exactQuote || anchor?.quote || anchor?.excerpt);
        return document && quote.length >= 40
            && !['abstract', 'bibliographic_abstract'].includes(String(document.full_text_source || '').toLowerCase())
            && normalize(document.full_text).includes(quote);
    });
}

for (const object of objects) {
    let payload;
    try { payload = JSON.parse(object.object_payload || '{}'); } catch { continue; }
    let dirty = false;
    for (const question of (payload.mcqs || [])) {
        if (question?.evidenceRecovery?.disposition !== 'regenerate_from_topic_evidence') continue;
        report.pendingInspected += 1;
        const anchors = verifiedAnchors(question);
        if (!anchors.length) continue;
        question.evidenceRecovery = {
            status: 'verified', disposition: 'existing_exact_anchor_verified',
            verificationMethod: 'stored_full_text_exact_quote_v1',
            sourceIdentities: [...new Set(anchors.map((anchor) => `document:${anchor.documentId}`))],
            verifiedAt: new Date().toISOString(),
        };
        report.exactAnchoredCleared += 1;
        dirty = true;
    }
    if (dirty) updates.push({ id: object.id, payload: JSON.stringify(payload) });
}
if (apply) {
    const update = db.prepare('UPDATE teaching_objects SET object_payload = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();
    db.transaction(() => updates.forEach((row) => update.run(row.payload, now, row.id)))();
}
report.objectsUpdated = updates.length;
console.log(JSON.stringify(report, null, 2));
db.close();
