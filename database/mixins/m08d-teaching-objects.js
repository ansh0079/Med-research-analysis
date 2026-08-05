'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
// Teaching objects & claims CRUD
// ==========================================

mapTeachingObjectRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        objectKey: row.object_key,
        objectType: row.object_type,
        articleUid: row.article_uid || null,
        normalizedTopic: row.normalized_topic || null,
        topic: row.topic || null,
        title: row.title || null,
        payload: safeJsonParse(row.object_payload || '{}', {}),
        provider: row.provider || null,
        model: row.model || null,
        confidence: Number(row.confidence || 0),
        generatedAt: row.generated_at || null,
        reviewState: row.review_state || 'unreviewed',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

async upsertTeachingObject(object = {}) {
    if (!this.kysely) return null;
    const objectKey = String(object.objectKey || '').trim().slice(0, 240);
    if (!objectKey) return null;
    const now = new Date().toISOString();
    const topic = object.topic ? String(object.topic).trim().slice(0, 240) : null;
    const normalizedTopic = object.normalizedTopic || (topic ? this.normalizeTopic(topic) : null);
    const articleUid = object.articleUid ? String(object.articleUid).trim().slice(0, 240) : null;
    await this.run(
        `INSERT INTO teaching_objects (
            object_key, object_type, article_uid, normalized_topic, topic, title,
            object_payload, provider, model, confidence, review_state, generated_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(object_key) DO UPDATE SET
            object_type = excluded.object_type,
            article_uid = excluded.article_uid,
            normalized_topic = excluded.normalized_topic,
            topic = excluded.topic,
            title = excluded.title,
            object_payload = excluded.object_payload,
            provider = excluded.provider,
            model = excluded.model,
            confidence = excluded.confidence,
            review_state = CASE
                WHEN teaching_objects.review_state = 'human_reviewed'
                    AND (excluded.review_state IS NULL OR excluded.review_state != 'needs_revision')
                THEN teaching_objects.review_state
                ELSE excluded.review_state
            END,
            generated_at = excluded.generated_at,
            updated_at = excluded.updated_at`,
        [
            objectKey,
            String(object.objectType || 'paper').slice(0, 40),
            articleUid,
            normalizedTopic || null,
            topic,
            object.title ? String(object.title).slice(0, 500) : null,
            JSON.stringify(object.payload || {}),
            object.provider || null,
            object.model || null,
            Math.max(0, Math.min(1, Number(object.confidence || 0.5))),
            String(object.reviewState || object.payload?.reviewState || 'unreviewed').slice(0, 40),
            object.generatedAt || now,
            now,
            now,
        ]
    );
    await this.replaceTeachingObjectClaims({
        objectKey,
        articleUid,
        normalizedTopic: normalizedTopic || null,
        claims: object.payload?.claimAnchors || [],
    });
    return this.getTeachingObjectByKey(objectKey);
}

async getTeachingObjectByKey(objectKey) {
    const row = await this.get(`SELECT * FROM teaching_objects WHERE object_key = ?`, [String(objectKey || '').trim()]);
    return this.mapTeachingObjectRow(row);
}

async getTeachingObjectForArticle(articleUid) {
    const uid = String(articleUid || '').trim();
    if (!uid) return null;
    const row = await this.get(
        `SELECT * FROM teaching_objects
         WHERE article_uid = ? AND object_type = 'paper'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [uid]
    );
    return this.mapTeachingObjectRow(row);
}

async listTeachingObjectsForTopic(topic, { limit = 20, objectType = '' } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const type = String(objectType || '').trim();
    const rows = await this.all(
        `SELECT * FROM teaching_objects
         WHERE (? = '' OR normalized_topic = ?)
           AND (? = '' OR object_type = ?)
         ORDER BY updated_at DESC
         LIMIT ?`,
        [normalized, normalized, type, type, safeLimit]
    );
    return rows.map((row) => this.mapTeachingObjectRow(row));
}

mapTeachingObjectClaimRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        objectKey: row.object_key,
        claimKey: row.claim_key,
        ordinal: Number(row.ordinal || 0),
        claimText: row.claim_text,
        evidenceQuote: row.evidence_quote || null,
        sourcePath: row.source_path || null,
        articleUid: row.article_uid || null,
        normalizedTopic: row.normalized_topic || null,
        conceptKey: row.concept_key || null,
        confidence: row.confidence == null ? null : Number(row.confidence),
        verificationStatus: row.verification_status || 'unverified',
        verificationReason: row.verification_reason || null,
        verifiedAt: row.verified_at || null,
        curatorMetadata: row.curator_metadata
            ? (() => { try { return JSON.parse(row.curator_metadata); } catch { return null; } })()
            : null,
        reviewState: row.review_state || 'unreviewed',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

async replaceTeachingObjectClaims({ objectKey, articleUid = null, normalizedTopic = null, claims = [] } = {}) {
    if (!objectKey) return [];
    const now = new Date().toISOString();
    await this.withTransaction(async () => {
        await this.run(`DELETE FROM teaching_object_claims WHERE object_key = ?`, [objectKey]);
        let ordinal = 0;
        for (const claim of Array.isArray(claims) ? claims : []) {
            const claimKey = String(claim.claimKey || '').trim().slice(0, 80);
            const claimText = String(claim.claimText || '').trim().slice(0, 1400);
            if (!claimKey || !claimText) continue;
            await this.run(
                `INSERT INTO teaching_object_claims (
                    object_key, claim_key, ordinal, claim_text, evidence_quote, source_path,
                    article_uid, normalized_topic, concept_key, confidence, verification_status,
                    verification_reason, verified_at, review_state, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(claim_key) DO UPDATE SET
                    object_key = excluded.object_key,
                    ordinal = excluded.ordinal,
                    claim_text = excluded.claim_text,
                    evidence_quote = excluded.evidence_quote,
                    source_path = excluded.source_path,
                    article_uid = excluded.article_uid,
                    normalized_topic = excluded.normalized_topic,
                    concept_key = excluded.concept_key,
                    confidence = excluded.confidence,
                    verification_status = excluded.verification_status,
                    verification_reason = excluded.verification_reason,
                    verified_at = excluded.verified_at,
                    review_state = excluded.review_state,
                    updated_at = excluded.updated_at`,
                [
                    objectKey,
                    claimKey,
                    Number(claim.ordinal ?? ordinal),
                    claimText,
                    claim.evidenceQuote ? String(claim.evidenceQuote).slice(0, 2000) : null,
                    claim.sourcePath ? String(claim.sourcePath).slice(0, 160) : null,
                    claim.articleUid || articleUid || null,
                    claim.topic ? this.normalizeTopic(claim.topic) : normalizedTopic,
                    claim.conceptKey ? String(claim.conceptKey).slice(0, 160) : null,
                    claim.confidence == null ? null : Math.max(0, Math.min(1, Number(claim.confidence))),
                    claim.verificationStatus ? String(claim.verificationStatus).slice(0, 80) : 'unverified',
                    claim.verificationReason ? String(claim.verificationReason).slice(0, 500) : null,
                    claim.verifiedAt ? String(claim.verifiedAt).slice(0, 40) : null,
                    String(claim.reviewState || 'unreviewed').slice(0, 40),
                    now,
                    now,
                ]
            );
            ordinal += 1;
        }
    });
    return this.listTeachingObjectClaimsByObjectKey(objectKey);
}

async listTeachingObjectClaimsByObjectKey(objectKey) {
    const rows = await this.all(
        `SELECT * FROM teaching_object_claims WHERE object_key = ? ORDER BY ordinal ASC, id ASC`,
        [String(objectKey || '').trim()]
    );
    return rows.map((row) => this.mapTeachingObjectClaimRow(row));
}

async getTeachingClaimByKey(claimKey) {
    const key = String(claimKey || '').trim();
    if (!key) return null;
    const row = await this.get(
        `SELECT c.*, o.topic, o.object_type, o.title AS object_title
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         WHERE c.claim_key = ?
         LIMIT 1`,
        [key]
    );
    if (!row) return null;
    return {
        ...this.mapTeachingObjectClaimRow(row),
        topic: row.topic || row.normalized_topic || null,
        objectType: row.object_type || null,
        objectTitle: row.object_title || null,
    };
}

async listTeachingObjectClaimsForTopic(topic, { limit = 50 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const rows = await this.all(
        `SELECT * FROM teaching_object_claims
         WHERE (? = '' OR normalized_topic = ?)
         ORDER BY
            CASE verification_status
                WHEN 'human_reviewed' THEN 0
                WHEN 'source_verified' THEN 1
                WHEN 'guideline_supported' THEN 2
                WHEN 'abstract_only' THEN 3
                WHEN 'synthesis_inferred' THEN 4
                WHEN 'agent_draft' THEN 8
                ELSE 6
            END ASC,
            updated_at DESC,
            ordinal ASC
         LIMIT ?`,
        [normalized, normalized, safeLimit]
    );
    return rows.map((row) => this.mapTeachingObjectClaimRow(row));
}
};
