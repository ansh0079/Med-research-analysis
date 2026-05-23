'use strict';

const { safeJsonParse } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {

    normalizeTopic(topic) {
        return String(topic || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);
    }

    /**
     * Normalized strings for JSON `aliases_normalized` (synonyms + model keywords).
     */
    buildTopicKnowledgeAliasesJson(displayTopic, knowledge) {
        const set = new Set();
        const canon = resolveCanonicalNormalized(String(displayTopic || '').trim(), (s) => this.normalizeTopic(s));
        if (canon) set.add(canon);
        const primary = this.normalizeTopic(displayTopic);
        if (primary) set.add(primary);
        expandNormalizedTopicKeys(primary, (s) => this.normalizeTopic(s)).forEach((k) => set.add(k));
        const kw = knowledge && typeof knowledge === 'object' ? knowledge.keywords : null;
        if (Array.isArray(kw)) {
            for (const item of kw) {
                if (typeof item === 'string' && item.trim()) {
                    const n = this.normalizeTopic(item.trim());
                    if (n) set.add(n);
                    expandNormalizedTopicKeys(n, (s) => this.normalizeTopic(s)).forEach((k) => set.add(k));
                }
            }
        }
        return JSON.stringify([...set].filter(Boolean).slice(0, 80));
    }

    mergeNormalizedAliasesJson(existingAliases = [], aliases = []) {
        const set = new Set(Array.isArray(existingAliases) ? existingAliases.filter(Boolean) : []);
        for (const alias of Array.isArray(aliases) ? aliases : []) {
            const normalized = this.normalizeTopic(alias);
            if (!normalized) continue;
            set.add(normalized);
            expandNormalizedTopicKeys(normalized, (s) => this.normalizeTopic(s)).forEach((k) => set.add(k));
        }
        return JSON.stringify([...set].filter(Boolean).slice(0, 120));
    }

    /**
     * Preserves clinician-verified anchors: entries with `verifiedAt` from the existing row cannot be
     * removed or replaced by AI difference analysis; new anchors may only be added with `verifiedAt`.
     */
    mergeVerifiedAnchorsIntoKnowledge(incomingKnowledge, existingKnowledgeObj) {
        const incoming = incomingKnowledge && typeof incomingKnowledge === 'object' ? { ...incomingKnowledge } : {};
        const existing = existingKnowledgeObj && typeof existingKnowledgeObj === 'object' ? existingKnowledgeObj : {};
        const prev = Array.isArray(existing.verifiedAnchors)
            ? existing.verifiedAnchors.filter((a) => a && typeof a === 'object' && a.verifiedAt)
            : [];
        const inc = Array.isArray(incoming.verifiedAnchors) ? incoming.verifiedAnchors : [];
        const prevIds = new Set(prev.map((a) => String(a.id || '')).filter(Boolean));
        const extra = inc.filter((a) => a && typeof a === 'object' && a.verifiedAt && a.id && !prevIds.has(String(a.id)));
        incoming.verifiedAnchors = [...prev, ...extra];
        return incoming;
    }

    /**
     * @param {string} normalizedAlias
     */
    async _getTopicKnowledgeRowByAlias(normalizedAlias) {
        if (!normalizedAlias) return null;
        if (this.isPostgres) {
            const sql = this.toPgQuery(
                `SELECT * FROM topic_knowledge
                 WHERE (
                   CASE
                     WHEN NULLIF(TRIM(aliases_normalized), '') IS NULL THEN '[]'::jsonb
                     ELSE NULLIF(TRIM(aliases_normalized), '')::jsonb
                   END
                 ) @> json_build_array(?)::jsonb
                 LIMIT 1`
            );
            const res = await this.pool.query(sql, [normalizedAlias]);
            return res.rows?.[0] || null;
        }
        return this.get(
            `SELECT * FROM topic_knowledge
             WHERE EXISTS (
               SELECT 1 FROM json_each(COALESCE(NULLIF(TRIM(aliases_normalized), ''), '[]'))
               WHERE value = ?
             )
             LIMIT 1`,
            [normalizedAlias]
        );
    }

    async _getTopicKnowledgeRowByAliases(keys) {
        if (!keys || keys.length === 0) return null;
        if (this.isPostgres) {
            // Build: aliases_normalized @> ANY(ARRAY[...])
            const placeholders = keys.map((_, i) => `json_build_array($${i + 1})::jsonb`).join(', ');
            const sql = `SELECT * FROM topic_knowledge WHERE (
                CASE WHEN NULLIF(TRIM(aliases_normalized), '') IS NULL THEN '[]'::jsonb
                     ELSE NULLIF(TRIM(aliases_normalized), '')::jsonb END
            ) @> ANY(ARRAY[${placeholders}]) LIMIT 1`;
            const res = await this.pool.query(sql, keys);
            return res.rows?.[0] || null;
        }
        // SQLite: single scan checking if any of the keys appear in the JSON array
        const placeholders = keys.map(() => '?').join(', ');
        return this.get(
            `SELECT * FROM topic_knowledge
             WHERE EXISTS (
               SELECT 1 FROM json_each(COALESCE(NULLIF(TRIM(aliases_normalized), ''), '[]'))
               WHERE value IN (${placeholders})
             )
             LIMIT 1`,
            keys
        );
    }

    async getTopicKnowledge(topic) {
        if (!this.kysely) return null;
        const normalizedInput = this.normalizeTopic(topic);
        if (!normalizedInput) return null;

        const canon = resolveCanonicalNormalized(String(topic || '').trim(), (s) => this.normalizeTopic(s));
        if (canon) {
            const byCanon = await this.kysely
                .selectFrom('topic_knowledge')
                .selectAll()
                .where('canonical_normalized', '=', canon)
                .executeTakeFirst();
            if (byCanon) return this.mapTopicKnowledgeRow(byCanon);
        }

        const keys = [...new Set(expandNormalizedTopicKeys(normalizedInput, (s) => this.normalizeTopic(s)))].filter(Boolean);
        if (!keys.length) return null;

        const row = await this.kysely
            .selectFrom('topic_knowledge')
            .selectAll()
            .where('normalized_topic', 'in', keys)
            .executeTakeFirst();

        if (row) return this.mapTopicKnowledgeRow(row);

        // Batch alias lookup — single query checking all keys at once instead of N round-trips
        const aliasRow = await this._getTopicKnowledgeRowByAliases(keys);
        if (aliasRow) return this.mapTopicKnowledgeRow(aliasRow);
        return null;
    }

    mapTopicKnowledgeRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            topic: row.topic,
            normalizedTopic: row.normalized_topic,
            knowledge: safeJsonParse(row.knowledge, {}),
            sourceArticles: safeJsonParse(row.source_articles, []),
            aliasesNormalized: safeJsonParse(row.aliases_normalized || '[]', []),
            canonicalNormalized: String(row.canonical_normalized || row.normalized_topic || ''),
            status: row.status,
            confidence: Number(row.confidence || 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastRefreshedAt: row.last_refreshed_at,
        };
    }

    isProtectedTopicKnowledgeStatus(status) {
        return ['human_reviewed', 'locked', 'verified'].includes(String(status || '').toLowerCase());
    }

    mapTopicKnowledgeProposalRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            topic: row.topic,
            normalizedTopic: row.normalized_topic,
            knowledge: safeJsonParse(row.knowledge, {}),
            sourceArticles: safeJsonParse(row.source_articles, []),
            proposedStatus: row.proposed_status,
            confidence: Number(row.confidence || 0),
            reason: row.reason || undefined,
            createdBy: row.created_by || undefined,
            status: row.status,
            reviewedBy: row.reviewed_by || undefined,
            reviewedAt: row.reviewed_at || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async listTopicKnowledge({ query = '', status = '', limit = 50, offset = 0 } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
        const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
        const q = String(query || '').trim().toLowerCase();
        const statusFilter = String(status || '').trim();
        const rows = await this.all(
            `SELECT * FROM topic_knowledge
             WHERE (? = '' OR lower(topic) LIKE ?)
               AND (? = '' OR status = ?)
             ORDER BY updated_at DESC
             LIMIT ? OFFSET ?`,
            [q, `%${q}%`, statusFilter, statusFilter, safeLimit, safeOffset]
        );
        const countRow = await this.get(
            `SELECT COUNT(*) AS count FROM topic_knowledge
             WHERE (? = '' OR lower(topic) LIKE ?)
               AND (? = '' OR status = ?)`,
            [q, `%${q}%`, statusFilter, statusFilter]
        );
        return {
            topics: rows.map((row) => this.mapTopicKnowledgeRow(row)),
            total: Number(countRow?.count || 0),
            limit: safeLimit,
            offset: safeOffset,
        };
    }

    async isTopicKnowledgeStale(topic, maxAgeDays = 180) {
        const row = await this.getTopicKnowledge(topic);
        if (!row) return true;
        const refreshed = new Date(row.lastRefreshedAt);
        const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        return refreshed < cutoff;
    }

    async upsertTopicKnowledge(topic, knowledge, sourceArticles = [], status = 'ai_generated', confidence = 0.6) {
        if (!this.kysely) return null;
        const trimmed = String(topic || '').trim().slice(0, 240);
        const normalized = this.normalizeTopic(trimmed);
        if (!normalized) return null;
        const canon = resolveCanonicalNormalized(trimmed, (s) => this.normalizeTopic(s));

        const existingForGuard = await this.getTopicKnowledge(trimmed);
        if (
            existingForGuard &&
            this.isProtectedTopicKnowledgeStatus(existingForGuard.status) &&
            ['ai_generated', 'ai_refreshed', 'pending_review'].includes(String(status || '').toLowerCase())
        ) {
            const proposal = await this.createTopicKnowledgeProposal(trimmed, {
                knowledge,
                sourceArticles,
                proposedStatus: status,
                confidence,
                reason: 'AI update proposed for protected topic knowledge',
            });
            return { ...existingForGuard, protected: true, proposalCreated: Boolean(proposal), proposalId: proposal?.id || null };
        }

        const now = new Date().toISOString();

        const existingCanon = canon
            ? await this.kysely.selectFrom('topic_knowledge').selectAll().where('canonical_normalized', '=', canon).executeTakeFirst()
            : null;
        const existingNorm = existingCanon
            ? null
            : await this.kysely.selectFrom('topic_knowledge').selectAll().where('normalized_topic', '=', normalized).executeTakeFirst();
        const target = existingCanon || existingNorm;

        const existingKnowledgeObj = target ? safeJsonParse(target.knowledge, {}) : {};
        const mergedKnowledge = this.mergeVerifiedAnchorsIntoKnowledge(knowledge || {}, existingKnowledgeObj);
        const aliasesJson = this.buildTopicKnowledgeAliasesJson(trimmed, mergedKnowledge);

        const mergedTopic =
            target && trimmed.length > String(target.topic || '').length ? trimmed : (target?.topic || trimmed);

        if (target) {
            await this.kysely
                .updateTable('topic_knowledge')
                .set({
                    topic: String(mergedTopic || '').slice(0, 240),
                    knowledge: JSON.stringify(mergedKnowledge || {}),
                    source_articles: JSON.stringify(sourceArticles || []),
                    aliases_normalized: aliasesJson,
                    canonical_normalized: canon,
                    status,
                    confidence,
                    updated_at: now,
                    last_refreshed_at: now,
                })
                .where('id', '=', target.id)
                .execute();
            return this.getTopicKnowledge(trimmed);
        }

        await this.kysely
            .insertInto('topic_knowledge')
            .values({
                topic: trimmed,
                normalized_topic: normalized,
                canonical_normalized: canon,
                knowledge: JSON.stringify(mergedKnowledge || {}),
                source_articles: JSON.stringify(sourceArticles || []),
                aliases_normalized: aliasesJson,
                status,
                confidence,
                created_at: now,
                updated_at: now,
                last_refreshed_at: now,
            })
            .execute();
        return this.getTopicKnowledge(trimmed);
    }

    async createTopicKnowledgeProposal(topic, {
        knowledge = {},
        sourceArticles = [],
        proposedStatus = 'ai_generated',
        confidence = 0.5,
        reason = '',
        createdBy = null,
    } = {}) {
        if (!this.kysely) return null;
        const normalized = this.normalizeTopic(topic);
        if (!normalized) return null;
        const now = new Date().toISOString();
        const result = await this.kysely
            .insertInto('topic_knowledge_proposals')
            .values({
                topic: String(topic || '').trim().slice(0, 240),
                normalized_topic: normalized,
                knowledge: JSON.stringify(knowledge || {}),
                source_articles: JSON.stringify(Array.isArray(sourceArticles) ? sourceArticles : []),
                proposed_status: proposedStatus || 'ai_generated',
                confidence: Math.max(0, Math.min(1, Number(confidence) || 0.5)),
                reason: reason || null,
                created_by: createdBy || null,
                status: 'pending_review',
                created_at: now,
                updated_at: now,
            })
            .executeTakeFirst();
        const id = Number(result?.insertId || result?.numInsertedOrUpdatedRows || 0);
        if (id) return this.getTopicKnowledgeProposal(id);
        return this.listTopicKnowledgeProposals({ topic, status: 'pending_review', limit: 1 })
            .then((rows) => rows.proposals[0] || null);
    }

    async getTopicKnowledgeProposal(id) {
        if (!this.kysely) return null;
        const row = await this.kysely
            .selectFrom('topic_knowledge_proposals')
            .selectAll()
            .where('id', '=', Number(id))
            .executeTakeFirst();
        return this.mapTopicKnowledgeProposalRow(row);
    }

    async listTopicKnowledgeProposals({ topic = '', status = 'pending_review', limit = 50, offset = 0 } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
        const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
        const normalized = this.normalizeTopic(topic);
        let query = this.kysely.selectFrom('topic_knowledge_proposals').selectAll();
        let countQuery = this.kysely.selectFrom('topic_knowledge_proposals').select(({ fn }) => fn.count('id').as('count'));
        if (normalized) {
            query = query.where('normalized_topic', '=', normalized);
            countQuery = countQuery.where('normalized_topic', '=', normalized);
        }
        if (status) {
            query = query.where('status', '=', status);
            countQuery = countQuery.where('status', '=', status);
        }
        const rows = await query
            .orderBy('created_at', 'desc')
            .limit(safeLimit)
            .offset(safeOffset)
            .execute();
        const countRow = await countQuery.executeTakeFirst();
        return {
            proposals: rows.map((row) => this.mapTopicKnowledgeProposalRow(row)),
            total: Number(countRow?.count || 0),
            limit: safeLimit,
            offset: safeOffset,
        };
    }

    async listTopicKnowledgeProposalsForUser(userId, { topic = '', status = 'pending_review', limit = 20 } = {}) {
        if (!this.kysely || !userId) return { proposals: [], total: 0 };
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
        const normalized = this.normalizeTopic(topic);
        let query = this.kysely.selectFrom('topic_knowledge_proposals').selectAll();
        let countQuery = this.kysely.selectFrom('topic_knowledge_proposals').select(({ fn }) => fn.count('id').as('count'));
        query = query.where('created_by', '=', userId);
        countQuery = countQuery.where('created_by', '=', userId);
        if (normalized) {
            query = query.where('normalized_topic', '=', normalized);
            countQuery = countQuery.where('normalized_topic', '=', normalized);
        }
        if (status) {
            query = query.where('status', '=', status);
            countQuery = countQuery.where('status', '=', status);
        }
        const rows = await query
            .orderBy('created_at', 'desc')
            .limit(safeLimit)
            .execute();
        const countRow = await countQuery.executeTakeFirst();
        return {
            proposals: rows.map((row) => this.mapTopicKnowledgeProposalRow(row)),
            total: Number(countRow?.count || 0),
        };
    }

    async approveTopicKnowledgeProposal(id, reviewerId = null) {
        if (!this.kysely) return null;
        const proposal = await this.getTopicKnowledgeProposal(id);
        if (!proposal || proposal.status !== 'pending_review') return null;
        const live = await this.getTopicKnowledge(proposal.topic);
        const mergedKnowledge = this.mergeVerifiedAnchorsIntoKnowledge(
            {
                ...(proposal.knowledge || {}),
                proposalApprovedFrom: proposal.id,
            },
            live?.knowledge || {}
        );
        let updated = await this.updateTopicKnowledge(proposal.topic, {
            knowledge: mergedKnowledge,
            sourceArticles: proposal.sourceArticles,
            status: 'human_reviewed',
            confidence: Math.max(Number(proposal.confidence || 0), 0.85),
            editorId: reviewerId,
        });
        if (!updated) {
            updated = await this.upsertTopicKnowledge(
                proposal.topic,
                {
                    ...mergedKnowledge,
                    reviewedBy: reviewerId || null,
                    reviewedAt: new Date().toISOString(),
                },
                proposal.sourceArticles,
                'human_reviewed',
                Math.max(Number(proposal.confidence || 0), 0.85)
            );
        }
        const now = new Date().toISOString();
        await this.kysely
            .updateTable('topic_knowledge_proposals')
            .set({
                status: 'approved',
                reviewed_by: reviewerId || null,
                reviewed_at: now,
                updated_at: now,
            })
            .where('id', '=', Number(id))
            .execute();
        return { proposal: await this.getTopicKnowledgeProposal(id), topicKnowledge: updated };
    }

    async rejectTopicKnowledgeProposal(id, reviewerId = null) {
        if (!this.kysely) return null;
        const now = new Date().toISOString();
        await this.kysely
            .updateTable('topic_knowledge_proposals')
            .set({
                status: 'rejected',
                reviewed_by: reviewerId || null,
                reviewed_at: now,
                updated_at: now,
            })
            .where('id', '=', Number(id))
            .where('status', '=', 'pending_review')
            .execute();
        return this.getTopicKnowledgeProposal(id);
    }

    async updateTopicKnowledge(topic, { knowledge, sourceArticles, status = 'human_edited', confidence = 0.9, editorId = null } = {}) {
        if (!this.kysely) return null;
        const existing = await this.getTopicKnowledge(topic);
        if (!existing) return null;
        const now = new Date().toISOString();
        const patch = knowledge && typeof knowledge === 'object' ? knowledge : existing.knowledge || {};
        const nextKnowledge = {
            ...this.mergeVerifiedAnchorsIntoKnowledge(patch, existing.knowledge || {}),
            editedBy: editorId || existing.knowledge?.editedBy || null,
            editedAt: now,
        };
        const aliasesJson = this.buildTopicKnowledgeAliasesJson(existing.topic, nextKnowledge);
        const canon = resolveCanonicalNormalized(String(existing.topic || '').trim(), (s) => this.normalizeTopic(s));
        await this.kysely
            .updateTable('topic_knowledge')
            .set({
                knowledge: JSON.stringify(nextKnowledge),
                source_articles: JSON.stringify(Array.isArray(sourceArticles) ? sourceArticles : existing.sourceArticles || []),
                aliases_normalized: aliasesJson,
                canonical_normalized: canon,
                status,
                confidence: Math.max(0, Math.min(1, Number(confidence) || 0.9)),
                updated_at: now,
            })
            .where('id', '=', existing.id)
            .execute();
        return this.getTopicKnowledge(topic);
    }

    async appendTopicKnowledgeVerifiedAnchor(topic, { text, articleUid = null, userId = null } = {}) {
        if (!this.kysely) return null;
        const existing = await this.getTopicKnowledge(topic);
        if (!existing) return null;
        const claim = String(text || '').trim();
        if (claim.length < 8) return null;
        const k = { ...(existing.knowledge || {}) };
        const anchors = Array.isArray(k.verifiedAnchors) ? [...k.verifiedAnchors] : [];
        const id = `vanch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        anchors.push({
            id,
            text: claim.slice(0, 2000),
            articleUid: articleUid ? String(articleUid).trim().slice(0, 128) : null,
            verifiedBy: userId ? String(userId) : null,
            verifiedAt: new Date().toISOString(),
        });
        k.verifiedAnchors = anchors;
        return this.updateTopicKnowledge(topic, {
            knowledge: k,
            sourceArticles: existing.sourceArticles,
            status: existing.status,
            confidence: existing.confidence,
            editorId: userId,
        });
    }

    async mergeTopicKnowledgeAliases(topic, aliases = [], { createIfMissing = true, reason = 'low_recall_mesh' } = {}) {
        if (!this.kysely || !topic || !Array.isArray(aliases) || aliases.length === 0) return null;
        const trimmed = String(topic || '').trim().slice(0, 240);
        const normalized = this.normalizeTopic(trimmed);
        if (!normalized) return null;

        const existing = await this.getTopicKnowledge(trimmed);
        const now = new Date().toISOString();
        if (existing) {
            const mergedAliasesJson = this.mergeNormalizedAliasesJson(existing.aliasesNormalized || [], aliases);
            const nextKnowledge = {
                ...(existing.knowledge || {}),
                meshAliasUpdatedAt: now,
                meshAliasReason: reason,
            };
            await this.kysely
                .updateTable('topic_knowledge')
                .set({
                    knowledge: JSON.stringify(nextKnowledge),
                    aliases_normalized: mergedAliasesJson,
                    updated_at: now,
                })
                .where('id', '=', existing.id)
                .execute();
            return this.getTopicKnowledge(trimmed);
        }

        if (!createIfMissing) return null;
        const knowledge = {
            mentorMessage: `Low-recall search expansion placeholder for ${trimmed}. Evidence guide still needs extraction.`,
            keywords: aliases.slice(0, 20),
            meshAliasReason: reason,
            meshAliasUpdatedAt: now,
        };
        return this.upsertTopicKnowledge(trimmed, knowledge, [], 'alias_seeded', 0.25);
    }

    async markTopicKnowledgeReviewed(topic, reviewerId = null) {
        if (!this.kysely) return null;
        const now = new Date().toISOString();
        const existing = await this.getTopicKnowledge(topic);
        if (!existing) return null;
        const knowledge = {
            ...(existing.knowledge || {}),
            reviewedBy: reviewerId || existing.knowledge?.reviewedBy || null,
            reviewedAt: now,
        };
        const aliasesJson = this.buildTopicKnowledgeAliasesJson(existing.topic, knowledge);
        const canon = resolveCanonicalNormalized(String(existing.topic || '').trim(), (s) => this.normalizeTopic(s));
        await this.kysely
            .updateTable('topic_knowledge')
            .set({
                knowledge: JSON.stringify(knowledge),
                aliases_normalized: aliasesJson,
                canonical_normalized: canon,
                status: 'human_reviewed',
                confidence: Math.max(Number(existing.confidence || 0), 0.85),
                updated_at: now,
            })
            .where('id', '=', existing.id)
            .execute();
        return this.getTopicKnowledge(topic);
    }
};
