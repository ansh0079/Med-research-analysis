'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// Review Assistant + PICO
// ==========================================

async createReviewProject(project) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO review_projects (id, title, question, criteria, owner_type, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            project.id,
            project.title,
            project.question,
            JSON.stringify(project.criteria || {}),
            project.ownerType || 'session',
            project.ownerId,
            now,
            now,
        ]
    );
    return this.getReviewProject(project.id);
}

async getReviewProject(reviewId) {
    const row = await this.get(`SELECT * FROM review_projects WHERE id = ?`, [reviewId]);
    if (!row) return null;
    return {
        ...row,
        criteria: safeJsonParse(row.criteria, {}),
    };
}

async addReviewArticles(reviewId, articles = []) {
    const now = new Date().toISOString();
    for (const article of articles) {
        const articleId = String(article.uid || article.articleId || '').trim();
        if (!articleId) continue;
        await this.run(
            `INSERT INTO review_articles (review_id, article_id, article_data, screening_status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', ?, ?)
             ON CONFLICT(review_id, article_id) DO UPDATE SET
                article_data = excluded.article_data,
                updated_at = excluded.updated_at`,
            [reviewId, articleId, JSON.stringify(article), now, now]
        );
    }
    return this.listReviewArticles(reviewId);
}

async listReviewArticles(reviewId) {
    const rows = await this.all(
        `SELECT * FROM review_articles WHERE review_id = ? ORDER BY created_at DESC`,
        [reviewId]
    );
    return rows.map((row) => ({
        ...row,
        article_data: safeJsonParse(row.article_data, {}),
    }));
}

async updateReviewScreening(reviewId, articleId, patch = {}) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE review_articles
         SET screening_status = ?, exclusion_reason = ?, notes = ?, updated_at = ?
         WHERE review_id = ? AND article_id = ?`,
        [
            patch.screeningStatus || 'pending',
            patch.exclusionReason || null,
            patch.notes || null,
            now,
            reviewId,
            articleId,
        ]
    );
    return this.get(
        `SELECT * FROM review_articles WHERE review_id = ? AND article_id = ?`,
        [reviewId, articleId]
    );
}

async getReviewPrismaCounts(reviewId) {
    const rows = await this.all(
        `SELECT screening_status, COUNT(*) AS count
         FROM review_articles
         WHERE review_id = ?
         GROUP BY screening_status`,
        [reviewId]
    );
    const counts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };
    for (const row of rows) {
        const key = String(row.screening_status || 'pending');
        const count = Number(row.count || 0);
        counts.total += count;
        if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] = count;
    }
    return counts;
}

async upsertPicoExtraction(articleId, extraction, provider, model, confidence = 0) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO pico_extractions (article_id, extraction, provider, model, confidence, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(article_id) DO UPDATE SET
            extraction = excluded.extraction,
            provider = excluded.provider,
            model = excluded.model,
            confidence = excluded.confidence,
            updated_at = excluded.updated_at`,
        [articleId, JSON.stringify(extraction || {}), provider || null, model || null, Number(confidence || 0), now, now]
    );
    return this.getPicoExtraction(articleId);
}

async getPicoExtraction(articleId) {
    const row = await this.get(`SELECT * FROM pico_extractions WHERE article_id = ?`, [articleId]);
    if (!row) return null;
    return {
        ...row,
        extraction: safeJsonParse(row.extraction, {}),
    };
}

async getReviewExtractionRows(reviewId) {
    const rows = await this.all(
        `SELECT ra.review_id, ra.article_id, ra.screening_status, ra.exclusion_reason, ra.notes, ra.article_data,
                pe.extraction, pe.confidence, pe.provider, pe.model
         FROM review_articles ra
         LEFT JOIN pico_extractions pe ON pe.article_id = ra.article_id
         WHERE ra.review_id = ?
         ORDER BY ra.created_at DESC`,
        [reviewId]
    );
    return rows.map((row) => ({
        ...row,
        article_data: safeJsonParse(row.article_data, {}),
        extraction: safeJsonParse(row.extraction, null),
    }));
}

// ==========================================
// Audit Logging
// ==========================================

async createAuditLog({ userId, sessionId, action, resourceType, resourceId, details, ipAddress, userAgent }) {
    return this.run(
        `INSERT INTO audit_logs (user_id, session_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            userId || null,
            sessionId || null,
            action,
            resourceType || null,
            resourceId || null,
            details ? JSON.stringify(details) : null,
            ipAddress || null,
            userAgent || null,
        ]
    );
}

async getAuditLogs({ userId, action, limit = 50, offset = 0 }) {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    if (userId) {
        sql += ` AND user_id = ?`;
        params.push(userId);
    }
    if (action) {
        sql += ` AND action = ?`;
        params.push(action);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.all(sql, params);
}

// ==========================================
// Billing / paywall audit (subscriptions, denials, webhooks)
// ==========================================

async logBillingEvent({
    userId,
    sessionId,
    action,
    externalRef,
    details,
    ipAddress,
    userAgent,
}) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    return this.run(
        `INSERT INTO billing_audit_log (id, user_id, session_id, action, external_ref, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            userId || null,
            sessionId || null,
            action,
            externalRef || null,
            details ? JSON.stringify(details) : null,
            ipAddress || null,
            userAgent || null,
            createdAt,
        ]
    );
}

async listBillingAuditLog({ limit = 100, offset = 0, action = null } = {}) {
    let sql = `SELECT * FROM billing_audit_log WHERE 1=1`;
    const params = [];
    if (action) {
        sql += ` AND action = ?`;
        params.push(action);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.all(sql, params);
}

// ==========================================
// CPD Sessions
// ==========================================

async createCpdSession(userId, { activityType, topic = '', durationMinutes = 0, questionCount = 0, accuracyPct = null, notes = '', source = 'auto' }) {
    const result = await this.run(
        `INSERT INTO cpd_sessions (user_id, activity_type, topic, duration_minutes, question_count, accuracy_pct, notes, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, activityType, String(topic || '').slice(0, 200), Number(durationMinutes) || 0,
         Number(questionCount) || 0, accuracyPct != null ? Number(accuracyPct) : null,
         String(notes || '').slice(0, 500), source]
    );
    return { id: result.lastID };
}

async listCpdSessions(userId, { limit = 50, offset = 0, startDate = '', endDate = '', activityType = '' } = {}) {
    let sql = `SELECT * FROM cpd_sessions WHERE user_id = ?`;
    const params = [userId];
    if (startDate) { sql += ` AND created_at >= ?`; params.push(startDate); }
    if (endDate)   { sql += ` AND created_at <= ?`; params.push(endDate + 'T23:59:59'); }
    if (activityType) { sql += ` AND activity_type = ?`; params.push(activityType); }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Math.min(limit, 200), offset);
    const rows = await this.all(sql, params);
    return rows.map((r) => ({
        id: r.id,
        activityType: r.activity_type,
        topic: r.topic,
        durationMinutes: r.duration_minutes,
        questionCount: r.question_count,
        accuracyPct: r.accuracy_pct,
        notes: r.notes,
        source: r.source,
        createdAt: r.created_at,
    }));
}

async getCpdSummary(userId, { year = new Date().getFullYear() } = {}) {
    const start = `${year}-01-01`;
    const end   = `${year}-12-31T23:59:59`;
    const rows = await this.all(
        `SELECT activity_type,
                COUNT(*) AS session_count,
                SUM(duration_minutes) AS total_minutes,
                SUM(question_count) AS total_questions,
                AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct END) AS avg_accuracy
         FROM cpd_sessions
         WHERE user_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY activity_type`,
        [userId, start, end]
    );
    const byType = {};
    let totalMinutes = 0;
    for (const r of rows) {
        byType[r.activity_type] = {
            sessions: Number(r.session_count),
            minutes: Math.round(Number(r.total_minutes) || 0),
            questions: Number(r.total_questions) || 0,
            avgAccuracy: r.avg_accuracy != null ? Math.round(Number(r.avg_accuracy)) : null,
        };
        totalMinutes += Number(r.total_minutes) || 0;
    }
    // Monthly breakdown for chart
    const monthly = await this.all(
        `SELECT strftime('%m', created_at) AS month,
                SUM(duration_minutes) AS minutes,
                COUNT(*) AS sessions
         FROM cpd_sessions
         WHERE user_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY month ORDER BY month ASC`,
        [userId, start, end]
    );
    return {
        year,
        totalMinutes: Math.round(totalMinutes),
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        byType,
        monthly: monthly.map((m) => ({
            month: Number(m.month),
            minutes: Math.round(Number(m.minutes) || 0),
            sessions: Number(m.sessions),
        })),
    };
}

mapPortfolioReflectionRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        reflectionType: row.reflection_type,
        sourceType: row.source_type,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        whatHappened: row.what_happened,
        whatILearned: row.what_i_learned,
        whatIWillChange: row.what_i_will_change,
        evidenceUsed: row.evidence_used,
        supervisorDiscussion: row.supervisor_discussion,
        status: row.status,
        linkedCpdSessionId: row.linked_cpd_session_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async createPortfolioReflection(userId, data = {}) {
    const topic = String(data.topic || '').slice(0, 240);
    const now = new Date().toISOString();
    const result = await this.run(
        `INSERT INTO portfolio_reflections (
            user_id, reflection_type, source_type, topic, normalized_topic,
            what_happened, what_i_learned, what_i_will_change, evidence_used,
            supervisor_discussion, status, linked_cpd_session_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            String(data.reflectionType || 'CBD').slice(0, 40),
            String(data.sourceType || 'manual').slice(0, 40),
            topic,
            this.normalizeTopic(topic),
            String(data.whatHappened || '').slice(0, 8000),
            String(data.whatILearned || '').slice(0, 8000),
            String(data.whatIWillChange || '').slice(0, 8000),
            String(data.evidenceUsed || '').slice(0, 12000),
            String(data.supervisorDiscussion || '').slice(0, 8000),
            String(data.status || 'draft').slice(0, 40),
            data.linkedCpdSessionId != null ? Number(data.linkedCpdSessionId) : null,
            now,
            now,
        ]
    );
    const reflectionId = result.lastID || result.id;
    const row = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [reflectionId, userId]);
    return this.mapPortfolioReflectionRow(row);
}

async listPortfolioReflections(userId, { limit = 50, offset = 0, topic = '', status = '' } = {}) {
    let sql = `SELECT * FROM portfolio_reflections WHERE user_id = ?`;
    const params = [userId];
    const normalizedTopic = topic ? this.normalizeTopic(topic) : '';
    if (normalizedTopic) {
        sql += ` AND normalized_topic = ?`;
        params.push(normalizedTopic);
    }
    if (status) {
        sql += ` AND status = ?`;
        params.push(String(status));
    }
    sql += ` ORDER BY updated_at DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(Math.min(Number(limit) || 50, 200), Math.max(Number(offset) || 0, 0));
    const rows = await this.all(sql, params);
    return rows.map((row) => this.mapPortfolioReflectionRow(row));
}

async updatePortfolioReflection(userId, id, patch = {}) {
    const existing = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!existing) return null;

    const fields = [];
    const values = [];
    const add = (column, value) => {
        if (value === undefined) return;
        fields.push(`${column} = ?`);
        values.push(value);
    };

    const nextTopic = patch.topic !== undefined ? String(patch.topic || '').slice(0, 240) : undefined;
    add('reflection_type', patch.reflectionType !== undefined ? String(patch.reflectionType || 'CBD').slice(0, 40) : undefined);
    add('source_type', patch.sourceType !== undefined ? String(patch.sourceType || 'manual').slice(0, 40) : undefined);
    add('topic', nextTopic);
    add('normalized_topic', nextTopic !== undefined ? this.normalizeTopic(nextTopic) : undefined);
    add('what_happened', patch.whatHappened !== undefined ? String(patch.whatHappened || '').slice(0, 8000) : undefined);
    add('what_i_learned', patch.whatILearned !== undefined ? String(patch.whatILearned || '').slice(0, 8000) : undefined);
    add('what_i_will_change', patch.whatIWillChange !== undefined ? String(patch.whatIWillChange || '').slice(0, 8000) : undefined);
    add('evidence_used', patch.evidenceUsed !== undefined ? String(patch.evidenceUsed || '').slice(0, 12000) : undefined);
    add('supervisor_discussion', patch.supervisorDiscussion !== undefined ? String(patch.supervisorDiscussion || '').slice(0, 8000) : undefined);
    add('status', patch.status !== undefined ? String(patch.status || 'draft').slice(0, 40) : undefined);
    add('linked_cpd_session_id', patch.linkedCpdSessionId !== undefined && patch.linkedCpdSessionId !== null ? Number(patch.linkedCpdSessionId) : patch.linkedCpdSessionId);

    if (fields.length === 0) return this.mapPortfolioReflectionRow(existing);
    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString(), id, userId);

    await this.run(
        `UPDATE portfolio_reflections SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values
    );
    const row = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [id, userId]);
    return this.mapPortfolioReflectionRow(row);
}

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
            object_payload, provider, model, confidence, generated_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

async replaceTeachingObjectClaims({ objectKey, articleUid = null, normalizedTopic = null, claims = [] } = {}) {
    if (!objectKey) return [];
    await this.run(`DELETE FROM teaching_object_claims WHERE object_key = ?`, [objectKey]);
    const now = new Date().toISOString();
    const inserted = [];
    for (const claim of Array.isArray(claims) ? claims : []) {
        const claimKey = String(claim.claimKey || '').trim().slice(0, 80);
        const claimText = String(claim.claimText || '').trim().slice(0, 1400);
        if (!claimKey || !claimText) continue;
        await this.run(
            `INSERT INTO teaching_object_claims (
                object_key, claim_key, ordinal, claim_text, evidence_quote, source_path,
                article_uid, normalized_topic, concept_key, confidence, verification_status,
                verification_reason, verified_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                updated_at = excluded.updated_at`,
            [
                objectKey,
                claimKey,
                Number(claim.ordinal || inserted.length),
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
                now,
                now,
            ]
        );
        inserted.push(claimKey);
    }
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

async getUserClaimMastery(userId, topic, { limit = 80 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
    const rows = await this.all(
        `SELECT
            c.*,
            COUNT(q.id) AS attempts,
            SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            MAX(q.created_at) AS last_attempt_at
         FROM teaching_object_claims c
         LEFT JOIN quiz_attempts q ON q.claim_key = c.claim_key AND q.user_id = ?
         WHERE (? = '' OR c.normalized_topic = ?)
         GROUP BY c.claim_key
         ORDER BY
            CASE WHEN COUNT(q.id) = 0 THEN 0 ELSE 1 END ASC,
            CASE c.verification_status
                WHEN 'human_reviewed' THEN 0
                WHEN 'source_verified' THEN 1
                WHEN 'guideline_supported' THEN 2
                WHEN 'abstract_only' THEN 3
                WHEN 'synthesis_inferred' THEN 4
                WHEN 'agent_draft' THEN 8
                ELSE 6
            END ASC,
            (COUNT(q.id) - SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END)) DESC,
            c.updated_at DESC
         LIMIT ?`,
        [userId, normalized, normalized, safeLimit]
    );
    return rows.map((row) => {
        const attempts = Number(row.attempts || 0);
        const correct = Number(row.correct || 0);
        return {
            ...this.mapTeachingObjectClaimRow(row),
            attempts,
            correct,
            accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
            lastAttemptAt: row.last_attempt_at || null,
            masteryState: attempts === 0 ? 'untested' : correct / Math.max(1, attempts) >= 0.8 ? 'mastered' : 'weak',
        };
    });
}

async listTeachingClaimsForReview({ topic = '', status = '', limit = 50, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const statuses = String(status || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const statusClause = statuses.length
        ? `AND c.verification_status IN (${statuses.map(() => '?').join(', ')})`
        : '';
    const params = [normalized, normalized, ...statuses, safeLimit, safeOffset];
    const rows = await this.all(
        `SELECT
            c.*,
            o.object_type,
            o.topic,
            o.title AS object_title,
            COUNT(q.id) AS quiz_attempts,
            SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END) AS quiz_correct
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         LEFT JOIN quiz_attempts q ON q.claim_key = c.claim_key
         WHERE (? = '' OR c.normalized_topic = ?)
         ${statusClause}
         GROUP BY c.claim_key
         ORDER BY
            CASE c.verification_status
                WHEN 'agent_draft' THEN 0
                WHEN 'synthesis_inferred' THEN 1
                WHEN 'abstract_only' THEN 2
                WHEN 'unverified' THEN 3
                WHEN 'guideline_conflict' THEN 4
                WHEN 'stale_needs_refresh' THEN 5
                ELSE 8
            END ASC,
            quiz_attempts DESC,
            c.updated_at DESC
         LIMIT ? OFFSET ?`,
        params
    );
    return rows.map((row) => ({
        ...this.mapTeachingObjectClaimRow(row),
        objectType: row.object_type || null,
        topic: row.topic || row.normalized_topic || null,
        objectTitle: row.object_title || null,
        quizAttempts: Number(row.quiz_attempts || 0),
        quizCorrect: Number(row.quiz_correct || 0),
    }));
}

async updateTeachingClaimVerification(claimKey, { verificationStatus, verificationReason = '', claimText = null, reviewerId = null } = {}) {
    const key = String(claimKey || '').trim();
    const status = String(verificationStatus || '').trim();
    if (!key || !status) return null;
    const allowed = new Set([
        'source_verified',
        'abstract_only',
        'synthesis_inferred',
        'agent_draft',
        'guideline_supported',
        'guideline_conflict',
        'stale_needs_refresh',
        'human_reviewed',
        'unverified',
    ]);
    if (!allowed.has(status)) {
        throw new Error('Invalid verification status');
    }
    const now = new Date().toISOString();
    const fields = ['verification_status = ?', 'verification_reason = ?', 'verified_at = ?', 'updated_at = ?'];
    const values = [
        status,
        String(verificationReason || '').slice(0, 500) || null,
        ['human_reviewed', 'guideline_supported', 'guideline_conflict'].includes(status) ? now : null,
        now,
    ];
    if (claimText != null) {
        const text = String(claimText || '').trim().slice(0, 1400);
        if (text) {
            fields.push('claim_text = ?');
            values.push(text);
        }
    }
    values.push(key);
    await this.run(`UPDATE teaching_object_claims SET ${fields.join(', ')} WHERE claim_key = ?`, values);
    await this.logEvent?.('teaching_claim_verification_updated', null, {
        claimKey: key,
        verificationStatus: status,
        reviewerId,
    }).catch(() => {});
    const row = await this.get(`SELECT * FROM teaching_object_claims WHERE claim_key = ?`, [key]);
    return this.mapTeachingObjectClaimRow(row);
}

async getTeachingObjectStats({ limit = 10 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
    const [total, byType, recent, topicRows, claimCount] = await Promise.all([
        this.get(`SELECT COUNT(*) AS count FROM teaching_objects`),
        this.all(`SELECT object_type, COUNT(*) AS count FROM teaching_objects GROUP BY object_type ORDER BY count DESC`),
        this.all(
            `SELECT object_key, object_type, topic, title, updated_at
             FROM teaching_objects
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT normalized_topic, COALESCE(MAX(topic), normalized_topic) AS topic, COUNT(*) AS count, MAX(updated_at) AS last_updated_at
             FROM teaching_objects
             WHERE normalized_topic IS NOT NULL AND normalized_topic <> ''
             GROUP BY normalized_topic
             ORDER BY count DESC, last_updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.get(`SELECT COUNT(*) AS count FROM teaching_object_claims`),
    ]);
    return {
        total: Number(total?.count || 0),
        claimCount: Number(claimCount?.count || 0),
        byType: byType.map((row) => ({ objectType: row.object_type, count: Number(row.count || 0) })),
        recent: recent.map((row) => ({
            objectKey: row.object_key,
            objectType: row.object_type,
            topic: row.topic || null,
            title: row.title || null,
            updatedAt: row.updated_at || null,
        })),
        topTopics: topicRows.map((row) => ({
            normalizedTopic: row.normalized_topic,
            topic: row.topic,
            count: Number(row.count || 0),
            lastUpdatedAt: row.last_updated_at || null,
        })),
    };
}

// Per-topic quiz performance aggregated into a judgement profile for a user.
async getEvidenceJudgementProfile(userId, { topic = '', limit = 8 } = {}) {
    const uid = String(userId || '').trim();
    if (!uid) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 8, 1), 20);
    const normalized = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT
            COALESCE(normalized_topic, topic, 'general') AS topic,
            COUNT(*) AS attempts,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            MAX(created_at) AS last_attempt_at
         FROM quiz_attempts
         WHERE user_id = ?
           AND (? = '' OR normalized_topic = ?)
         GROUP BY COALESCE(normalized_topic, topic, 'general')
         ORDER BY attempts DESC
         LIMIT ?`,
        [uid, normalized, normalized, safeLimit]
    );
    return rows.map((row) => ({
        topic: row.topic,
        attempts: Number(row.attempts || 0),
        correct: Number(row.correct || 0),
        accuracy: row.attempts > 0 ? Math.round((Number(row.correct) / Number(row.attempts)) * 100) : 0,
        lastAttemptAt: row.last_attempt_at || null,
    }));
}

// Teaching object claims flagged as practice-changing or clinical bottom lines.
async listPracticeChangingTeachingObjects({ topic = '', limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const normalized = this.normalizeTopic(topic);
    const rows = await this.all(
        `SELECT c.*, o.topic AS object_topic, o.title AS object_title, o.object_type
         FROM teaching_object_claims c
         LEFT JOIN teaching_objects o ON o.object_key = c.object_key
         WHERE (? = '' OR c.normalized_topic = ?)
           AND c.concept_key IN ('clinical_bottom_line', 'practice_changing', 'guideline_recommendation')
           AND c.verification_status NOT IN ('stale_needs_refresh', 'guideline_conflict')
         ORDER BY
            CASE c.verification_status
                WHEN 'guideline_supported' THEN 0
                WHEN 'human_reviewed' THEN 1
                WHEN 'source_verified' THEN 2
                ELSE 3
            END ASC,
            c.updated_at DESC
         LIMIT ?`,
        [normalized, normalized, safeLimit]
    );
    return rows.map((row) => ({
        ...this.mapTeachingObjectClaimRow(row),
        objectTopic: row.object_topic || null,
        objectTitle: row.object_title || null,
        objectType: row.object_type || null,
    }));
}
};
