'use strict';

const crypto = require('crypto');

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
