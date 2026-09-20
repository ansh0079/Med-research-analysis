'use strict';

const crypto = require('crypto');
const { applyWritePolicy } = require('../../server/services/policy/writePolicyEngine');

function normalizeConceptName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function lineageKey({ conceptId, issuer, jurisdiction, population, scope }) {
    return [conceptId, issuer, jurisdiction, population, scope]
        .map((part) => String(part || 'unspecified').trim().toLowerCase().replace(/\s+/g, '_'))
        .join('|');
}

module.exports = (Sup) => class extends Sup {
    async upsertClinicalConcept({ canonicalName, meshId = null, status = 'active' } = {}) {
        const name = String(canonicalName || '').trim();
        const normalized = normalizeConceptName(name);
        if (!normalized) return null;
        const now = new Date().toISOString();
        const existing = await this.get(
            'SELECT * FROM clinical_concepts WHERE normalized_name = ?',
            [normalized]
        );
        if (existing) {
            await this.run(
                `UPDATE clinical_concepts
                 SET canonical_name = ?, mesh_id = COALESCE(?, mesh_id), status = ?, updated_at = ?
                 WHERE id = ?`,
                [name, meshId || null, status || existing.status || 'active', now, existing.id]
            );
            return { ...existing, canonicalName: name, meshId: meshId || existing.mesh_id, status: status || existing.status };
        }
        const id = crypto.randomUUID();
        await this.run(
            `INSERT INTO clinical_concepts
                (id, canonical_name, normalized_name, mesh_id, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, normalized, meshId || null, status || 'active', now, now]
        );
        return {
            id,
            canonicalName: name,
            normalizedName: normalized,
            meshId: meshId || null,
            status: status || 'active',
        };
    }

    async getClinicalConceptByNormalized(normalizedName) {
        const normalized = normalizeConceptName(normalizedName);
        if (!normalized) return null;
        return this.get('SELECT * FROM clinical_concepts WHERE normalized_name = ?', [normalized]);
    }

    async upsertGuidelineLineage({
        conceptId,
        issuer,
        jurisdiction = 'unspecified',
        population = 'unspecified',
        scope = 'unspecified',
        version = null,
        year = null,
        documentUid = null,
    } = {}) {
        const cid = String(conceptId || '').trim();
        const body = String(issuer || '').trim();
        if (!cid || !body) return null;
        const key = lineageKey({
            conceptId: cid,
            issuer: body,
            jurisdiction,
            population,
            scope,
        });
        const now = new Date().toISOString();
        const versionKey = String(version || '');
        const existing = await this.get(
            `SELECT * FROM guideline_lineage
             WHERE lineage_key = ? AND version = ?`,
            [key, versionKey]
        );
        if (existing) {
            await this.run(
                `UPDATE guideline_lineage
                 SET year = COALESCE(?, year), document_uid = COALESCE(?, document_uid), updated_at = ?
                 WHERE id = ?`,
                [year == null ? null : Number(year), documentUid || null, now, existing.id]
            );
            return existing;
        }
        const id = crypto.randomUUID();
        await this.run(
            `INSERT INTO guideline_lineage
                (id, concept_id, issuer, jurisdiction, population, scope, lineage_key, version, year, document_uid, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                cid,
                body,
                String(jurisdiction || 'unspecified'),
                String(population || 'unspecified'),
                String(scope || 'unspecified'),
                key,
                versionKey,
                year == null ? null : Number(year),
                documentUid || null,
                now,
                now,
            ]
        );
        return { id, conceptId: cid, issuer: body, lineageKey: key, version: versionKey };
    }

    /**
     * Propose (or refresh) a registry entry for one guideline edition. Entries are
     * created as 'candidate'; only verifyRegistryEntry promotes them. The recommendation
     * text is never copied: guidelineIds link the topic_guidelines rows that carry it.
     */
    async upsertRegistryEntry({
        conceptName,
        issuer,
        jurisdiction = 'unspecified',
        population = 'unspecified',
        scope = 'unspecified',
        version = null,
        year = null,
        sourceUrl = null,
        guidelineIds = [],
        proposedFrom = 'manual',
    } = {}) {
        const ids = [...new Set((Array.isArray(guidelineIds) ? guidelineIds : [])
            .map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
        const verdict = await applyWritePolicy(this, {
            writer: 'upsertRegistryEntry',
            entityType: 'registry_entry',
            payload: { conceptName, issuer, year, version, sourceUrl, guidelineIds: ids },
        });
        if (!verdict.allowed) return null;

        const concept = await this.upsertClinicalConcept({ canonicalName: conceptName });
        if (!concept) return null;
        const conceptId = concept.id;
        const lineage = await this.upsertGuidelineLineage({
            // Edition is part of identity: without a version, two years would share one lineage row.
            conceptId, issuer, jurisdiction, population, scope, year,
            version: version ?? (year == null ? null : String(year)),
        });
        if (!lineage) return null;

        const now = new Date().toISOString();
        let entry = await this.get('SELECT * FROM guideline_registry_entries WHERE lineage_id = ?', [lineage.id]);
        if (!entry) {
            const id = crypto.randomUUID();
            await this.run(
                `INSERT INTO guideline_registry_entries
                    (id, lineage_id, concept_id, status, source_url, proposed_from, created_at, updated_at)
                 VALUES (?, ?, ?, 'candidate', ?, ?, ?, ?)`,
                [id, lineage.id, conceptId, sourceUrl, String(proposedFrom || 'manual'), now, now]
            );
            entry = { id };
        } else {
            await this.run(
                `UPDATE guideline_registry_entries SET source_url = COALESCE(?, source_url), updated_at = ? WHERE id = ?`,
                [sourceUrl, now, entry.id]
            );
        }
        for (const guidelineId of ids) {
            await this.run(
                `INSERT INTO guideline_registry_recommendations (entry_id, guideline_id, created_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT (entry_id, guideline_id) DO NOTHING`,
                [entry.id, guidelineId, now]
            );
        }
        return { id: entry.id, lineageId: lineage.id, conceptId, recommendationCount: ids.length };
    }

    /**
     * Promote a candidate to verified. Needs a named reviewer and at least one linked
     * recommendation. A newer edition supersedes an older verified entry that shares the
     * same concept + issuer + jurisdiction + population + scope; an older edition can
     * never displace a newer verified one.
     */
    async verifyRegistryEntry(entryId, reviewer) {
        const entry = await this.get(
            `SELECT e.*, l.issuer, l.jurisdiction, l.population, l.scope, l.year, l.version
             FROM guideline_registry_entries e
             JOIN guideline_lineage l ON l.id = e.lineage_id
             WHERE e.id = ?`,
            [entryId]
        );
        if (!entry) return null;
        const countRow = await this.get(
            'SELECT COUNT(*) AS n FROM guideline_registry_recommendations WHERE entry_id = ?',
            [entry.id]
        );
        const verdict = await applyWritePolicy(this, {
            writer: 'verifyRegistryEntry',
            entityType: 'registry_verification',
            entityId: entry.id,
            payload: { reviewer, recommendationCount: Number(countRow?.n || 0), conceptId: entry.concept_id },
        });
        if (!verdict.allowed) return null;

        const now = new Date().toISOString();
        const siblings = await this.all(
            `SELECT e.id, l.year, l.version
             FROM guideline_registry_entries e
             JOIN guideline_lineage l ON l.id = e.lineage_id
             WHERE e.concept_id = ? AND e.status = 'verified' AND e.id <> ?
               AND l.issuer = ? AND l.jurisdiction = ? AND l.population = ? AND l.scope = ?`,
            [entry.concept_id, entry.id, entry.issuer, entry.jurisdiction, entry.population, entry.scope]
        );
        const editionOf = (row) => Number(row.year) || 0;
        const newest = Math.max(editionOf(entry), ...siblings.map(editionOf));
        if (editionOf(entry) < newest) {
            return { id: entry.id, status: 'candidate', blocked: 'newer_verified_edition_exists' };
        }
        for (const old of siblings) {
            await this.run(
                `UPDATE guideline_registry_entries
                 SET status = 'superseded', superseded_by_entry_id = ?, updated_at = ? WHERE id = ?`,
                [entry.id, now, old.id]
            );
        }
        await this.run(
            `UPDATE guideline_registry_entries
             SET status = 'verified', verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?`,
            [String(reviewer).trim(), now, now, entry.id]
        );
        // Supersession is the invalidation trigger: anything generated from the old edition
        // is now stale. Emit one event per superseded entry for downstream consumers.
        if (siblings.length && typeof this.insertGuidelineWatchEvent === 'function') {
            const concept = await this.get('SELECT normalized_name FROM clinical_concepts WHERE id = ?', [entry.concept_id]);
            for (const old of siblings) {
                await this.insertGuidelineWatchEvent({
                    normalizedTopic: concept?.normalized_name || null,
                    eventType: 'registry_edition_superseded',
                    severity: 'warning',
                    message: `Registry edition ${old.year || old.version || '?'} superseded by ${entry.year || entry.version || '?'} (${entry.issuer})`,
                    payload: { supersededEntryId: old.id, supersededByEntryId: entry.id, conceptId: entry.concept_id },
                }).catch(() => null);
            }
        }
        return { id: entry.id, status: 'verified', supersededCount: siblings.length };
    }

    /** Verified entries for any of the given normalized concept names, newest edition first. */
    async getVerifiedRegistryForConcepts(normalizedNames = []) {
        const names = [...new Set((Array.isArray(normalizedNames) ? normalizedNames : [])
            .map(normalizeConceptName).filter(Boolean))];
        if (!names.length) return [];
        const placeholders = names.map(() => '?').join(',');
        const entries = await this.all(
            `SELECT e.id, e.source_url, e.verified_by, e.verified_at,
                    c.id AS concept_id, c.canonical_name, c.normalized_name,
                    l.issuer, l.jurisdiction, l.population, l.scope, l.year, l.version
             FROM guideline_registry_entries e
             JOIN clinical_concepts c ON c.id = e.concept_id
             JOIN guideline_lineage l ON l.id = e.lineage_id
             WHERE e.status = 'verified' AND c.normalized_name IN (${placeholders})`,
            names
        );
        entries.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
        for (const entry of entries) {
            entry.recommendations = await this.all(
                `SELECT g.id, g.recommendation_text, g.recommendation_strength, g.recommendation_certainty,
                        g.population, g.source_url
                 FROM guideline_registry_recommendations r
                 JOIN topic_guidelines g ON g.id = r.guideline_id
                 WHERE r.entry_id = ?`,
                [entry.id]
            );
        }
        return entries;
    }

    /** Normalized names of every concept that has at least one verified registry entry. */
    async listVerifiedRegistryConcepts() {
        const rows = await this.all(
            `SELECT DISTINCT c.normalized_name AS name
             FROM guideline_registry_entries e
             JOIN clinical_concepts c ON c.id = e.concept_id
             WHERE e.status = 'verified'`
        );
        return rows.map((r) => r.name).filter(Boolean);
    }

    /**
     * Delete the bridge rows filed under a concept, but only once a verified registry entry
     * covers it. dryRun (default) reports what would go. Bridge rows are derived data: the
     * backfill can recreate them, and it skips registry-covered concepts.
     */
    async demolishBridgeRowsForConcept(conceptName, { dryRun = true } = {}) {
        const normalized = normalizeConceptName(conceptName);
        if (!normalized) return { concept: normalized, refused: 'no_concept', deleted: 0 };
        const covered = await this.get(
            `SELECT COUNT(*) AS n
             FROM guideline_registry_entries e
             JOIN clinical_concepts c ON c.id = e.concept_id
             WHERE e.status = 'verified' AND c.normalized_name = ?`,
            [normalized]
        );
        if (!Number(covered?.n)) return { concept: normalized, refused: 'no_verified_registry_entry', deleted: 0 };
        const rows = await this.get(
            'SELECT COUNT(*) AS n FROM topic_guideline_refiling WHERE canonical_normalized = ?',
            [normalized]
        );
        const count = Number(rows?.n || 0);
        if (dryRun || count === 0) return { concept: normalized, dryRun: Boolean(dryRun), wouldDelete: count, deleted: 0 };
        await this.run('DELETE FROM topic_guideline_refiling WHERE canonical_normalized = ?', [normalized]);
        return { concept: normalized, dryRun: false, deleted: count };
    }

    /**
     * Per-concept coverage: registry status counts next to how many recommendations the
     * embedding bridge still files under that concept. bridgeDependent means the bridge
     * serves rows for a concept with no verified registry entry.
     */
    async getRegistryCoverage({ conceptNames = [] } = {}) {
        const names = [...new Set((Array.isArray(conceptNames) ? conceptNames : [])
            .map(normalizeConceptName).filter(Boolean))];
        const bridge = await this.all(
            'SELECT canonical_normalized AS name, COUNT(*) AS n FROM topic_guideline_refiling GROUP BY canonical_normalized'
        );
        const entries = await this.all(
            `SELECT c.normalized_name AS name, e.status, COUNT(*) AS n
             FROM guideline_registry_entries e
             JOIN clinical_concepts c ON c.id = e.concept_id
             GROUP BY c.normalized_name, e.status`
        );
        const rows = new Map();
        const row = (name) => {
            if (!rows.has(name)) rows.set(name, { concept: name, bridgeRows: 0, candidate: 0, verified: 0, superseded: 0, rejected: 0 });
            return rows.get(name);
        };
        for (const name of names) row(name);
        for (const b of bridge) {
            const name = normalizeConceptName(b.name);
            if (!names.length || names.includes(name)) row(name).bridgeRows = Number(b.n);
        }
        for (const e of entries) {
            const name = normalizeConceptName(e.name);
            if (!names.length || names.includes(name)) row(name)[e.status] = Number(e.n);
        }
        return [...rows.values()]
            .map((r) => ({ ...r, registryComplete: r.verified > 0, bridgeDependent: r.verified === 0 && r.bridgeRows > 0 }))
            .sort((a, b) => a.concept.localeCompare(b.concept));
    }

    async recordPolicyDecision(decision = {}) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const payloadJson = decision.payload ? JSON.stringify(decision.payload) : null;
        await this.run(
            `INSERT INTO policy_decisions
                (id, writer, family, action, reason, entity_type, entity_id, concept_id, payload_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                String(decision.writer || '').trim(),
                decision.family || null,
                String(decision.action || '').trim(),
                decision.reason || null,
                decision.entityType || null,
                decision.entityId || null,
                decision.conceptId || null,
                payloadJson,
                now,
            ]
        );
        return { id, ...decision, createdAt: now };
    }
};

module.exports.normalizeConceptName = normalizeConceptName;
module.exports.lineageKey = lineageKey;
