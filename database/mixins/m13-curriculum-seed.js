'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {

    mapCurriculumSeedTopicRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            blockId: row.block_id,
            block: row.block_name || row.block,
            curriculumId: row.curriculum_id,
            curriculumSlug: row.curriculum_slug,
            displayName: row.display_name,
            suggestedQuery: row.suggested_query,
            sortOrder: Number(row.sort_order || 0),
            priority: row.priority || 'medium',
            volatility: row.volatility || 'moderate',
            seedStatus: row.seed_status || 'not_seeded',
            lastSeededAt: row.last_seeded_at || null,
            lastSynthesisAt: row.last_synthesis_at || null,
            claimCount: Number(row.claim_count || 0),
            reviewDueAt: row.review_due_at || null,
        };
    }

    async ensureCurriculum(slug, name, attrs = {}) {
        const existing = await this.get(`SELECT * FROM curricula WHERE slug = ?`, [slug]);
        if (existing) return existing;
        await this.run(
            `INSERT INTO curricula (slug, name, exam_stage_label, description, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [slug, name, attrs.examStageLabel || null, attrs.description || null, Number(attrs.sortOrder || 0)]
        );
        return this.get(`SELECT * FROM curricula WHERE slug = ?`, [slug]);
    }

    async ensureCurriculumBlock(curriculumId, name, sortOrder = 0) {
        const existing = await this.get(
            `SELECT * FROM curriculum_blocks WHERE curriculum_id = ? AND name = ?`,
            [curriculumId, name]
        );
        if (existing) return existing;
        await this.run(
            `INSERT INTO curriculum_blocks (curriculum_id, name, sort_order) VALUES (?, ?, ?)`,
            [curriculumId, name, Number(sortOrder || 0)]
        );
        return this.get(
            `SELECT * FROM curriculum_blocks WHERE curriculum_id = ? AND name = ?`,
            [curriculumId, name]
        );
    }

    async upsertCurriculumSeedTopic(topic, options = {}) {
        const curriculum = await this.ensureCurriculum(
            options.curriculumSlug || 'core-clinical-topics',
            options.curriculumName || 'Core Clinical Topics',
            {
                examStageLabel: options.examStageLabel || 'Core clinical practice',
                description: options.description || 'Curated seed topics for evidence synthesis, claim extraction, and adaptive review.',
                sortOrder: options.sortOrder || 10,
            }
        );
        const blockName = String(topic.block || 'General Medicine').trim();
        const block = await this.ensureCurriculumBlock(curriculum.id, blockName, Number(topic.blockSortOrder || 0));
        const displayName = String(topic.displayName || topic.display_name || '').trim();
        const suggestedQuery = String(topic.suggestedQuery || topic.suggested_query || displayName).trim();
        if (!displayName || !suggestedQuery) throw new Error('displayName and suggestedQuery are required');
        const existing = await this.get(
            `SELECT * FROM curriculum_topics WHERE block_id = ? AND lower(display_name) = lower(?)`,
            [block.id, displayName]
        );
        if (existing) {
            await this.run(
                `UPDATE curriculum_topics
                 SET suggested_query = ?, sort_order = ?, priority = ?, volatility = ?, seed_status = ?
                 WHERE id = ?`,
                [
                    suggestedQuery,
                    Number(topic.sortOrder || topic.sort_order || 0),
                    String(topic.priority || 'medium'),
                    String(topic.volatility || 'moderate'),
                    String(topic.seedStatus || topic.seed_status || 'not_seeded'),
                    existing.id,
                ]
            );
        } else {
            await this.run(
                `INSERT INTO curriculum_topics
                 (block_id, display_name, suggested_query, sort_order, priority, volatility, seed_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    block.id,
                    displayName,
                    suggestedQuery,
                    Number(topic.sortOrder || topic.sort_order || 0),
                    String(topic.priority || 'medium'),
                    String(topic.volatility || 'moderate'),
                    String(topic.seedStatus || topic.seed_status || 'not_seeded'),
                ]
            );
        }
        const row = await this.get(
            `SELECT t.*, b.name AS block_name, c.slug AS curriculum_slug, c.id AS curriculum_id
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE b.id = ? AND lower(t.display_name) = lower(?)`,
            [block.id, displayName]
        );
        return this.mapCurriculumSeedTopicRow(row);
    }

    async importCurriculumSeedTopics(topics = [], options = {}) {
        const seenBlocks = new Map();
        const imported = [];
        for (const topic of Array.isArray(topics) ? topics : []) {
            const block = String(topic.block || 'General Medicine').trim();
            if (!seenBlocks.has(block)) seenBlocks.set(block, seenBlocks.size + 1);
            imported.push(await this.upsertCurriculumSeedTopic({
                ...topic,
                blockSortOrder: seenBlocks.get(block),
                sortOrder: topic.sortOrder || imported.filter((t) => t.block === block).length + 1,
            }, options));
        }
        return { importedCount: imported.length, topics: imported };
    }

    async listCurriculumSeedTopics({ curriculumSlug = 'core-clinical-topics', seedStatus = '', limit = 200, offset = 0 } = {}) {
        const params = [curriculumSlug];
        let where = `c.slug = ?`;
        if (seedStatus) {
            where += ` AND t.seed_status = ?`;
            params.push(seedStatus);
        }
        params.push(Math.min(Math.max(Number(limit) || 200, 1), 500), Math.max(Number(offset) || 0, 0));
        const rows = await this.all(
            `SELECT t.*, b.name AS block_name, c.slug AS curriculum_slug, c.id AS curriculum_id
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE ${where}
             ORDER BY b.sort_order ASC, t.sort_order ASC, t.id ASC
             LIMIT ? OFFSET ?`,
            params
        );
        return rows.map((row) => this.mapCurriculumSeedTopicRow(row));
    }

    async listCurriculumSeedCandidates({ curriculumSlug = 'core-clinical-topics', limit = 5, now = new Date().toISOString(), seedStatuses = [] } = {}) {
        const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
        const statuses = (Array.isArray(seedStatuses) ? seedStatuses : [seedStatuses])
            .map((s) => String(s || '').trim())
            .filter(Boolean);
        const params = [curriculumSlug];
        const statusClause = statuses.length
            ? `AND t.seed_status IN (${statuses.map(() => '?').join(', ')})`
            : `AND t.seed_status NOT IN ('queued', 'seeding')
               AND (
                    t.seed_status IN ('not_seeded', 'failed_low_recall', 'failed', 'seeded_with_warnings')
                    OR t.last_seeded_at IS NULL
                    OR (t.review_due_at IS NOT NULL AND t.review_due_at <= ?)
               )`;
        if (statuses.length) {
            params.push(...statuses);
        } else {
            params.push(now);
        }
        params.push(safeLimit);
        const rows = await this.all(
            `SELECT t.*, b.name AS block_name, c.slug AS curriculum_slug, c.id AS curriculum_id
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE c.slug = ?
               ${statusClause}
             ORDER BY
               CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
               CASE t.seed_status WHEN 'not_seeded' THEN 0 WHEN 'failed_low_recall' THEN 1 WHEN 'failed' THEN 2 WHEN 'seeded_with_warnings' THEN 3 ELSE 4 END ASC,
               COALESCE(t.review_due_at, '1970-01-01T00:00:00.000Z') ASC,
               b.sort_order ASC,
               t.sort_order ASC,
               t.id ASC
             LIMIT ?`,
            params
        );
        return rows.map((row) => this.mapCurriculumSeedTopicRow(row));
    }

    async getCurriculumSeedStatusCounts({ curriculumSlug = 'core-clinical-topics' } = {}) {
        const rows = await this.all(
            `SELECT t.seed_status, COUNT(*) AS count, COALESCE(SUM(t.claim_count), 0) AS claim_count
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE c.slug = ?
             GROUP BY t.seed_status
             ORDER BY count DESC, t.seed_status ASC`,
            [curriculumSlug]
        );
        return rows.map((row) => ({
            seedStatus: row.seed_status || 'not_seeded',
            count: Number(row.count || 0),
            claimCount: Number(row.claim_count || 0),
        }));
    }

    async getAdminRuntimeSetting(key, fallback = null) {
        const row = await this.get(`SELECT value FROM admin_runtime_settings WHERE key = ?`, [String(key)]);
        return row ? safeJsonParse(row.value, fallback) : fallback;
    }

    async setAdminRuntimeSetting(key, value) {
        const now = new Date().toISOString();
        await this.run(
            `INSERT INTO admin_runtime_settings (key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [String(key), JSON.stringify(value || {}), now]
        );
        return this.getAdminRuntimeSetting(key, null);
    }

    async getCurriculumSeedUsageForDate(date = new Date().toISOString().slice(0, 10)) {
        const row = await this.get(`SELECT * FROM curriculum_seed_usage_daily WHERE date = ?`, [date]);
        return {
            date,
            topicsAttempted: Number(row?.topics_attempted || 0),
            topicsSeeded: Number(row?.topics_seeded || 0),
            topicsFailed: Number(row?.topics_failed || 0),
            synopsesGenerated: Number(row?.synopses_generated || 0),
            estimatedCostUsd: Number(row?.estimated_cost_usd || 0),
            updatedAt: row?.updated_at || null,
        };
    }

    async incrementCurriculumSeedUsage(date, patch = {}) {
        const day = String(date || new Date().toISOString().slice(0, 10));
        const now = new Date().toISOString();
        await this.run(
            `INSERT INTO curriculum_seed_usage_daily
                (date, topics_attempted, topics_seeded, topics_failed, synopses_generated, estimated_cost_usd, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(date) DO UPDATE SET
                topics_attempted = topics_attempted + excluded.topics_attempted,
                topics_seeded = topics_seeded + excluded.topics_seeded,
                topics_failed = topics_failed + excluded.topics_failed,
                synopses_generated = synopses_generated + excluded.synopses_generated,
                estimated_cost_usd = estimated_cost_usd + excluded.estimated_cost_usd,
                updated_at = excluded.updated_at`,
            [
                day,
                Number(patch.topicsAttempted || 0),
                Number(patch.topicsSeeded || 0),
                Number(patch.topicsFailed || 0),
                Number(patch.synopsesGenerated || 0),
                Number(patch.estimatedCostUsd || 0),
                now,
            ]
        );
        return this.getCurriculumSeedUsageForDate(day);
    }

    async getCurriculumSeedTopic(topicId) {
        const row = await this.get(
            `SELECT t.*, b.name AS block_name, c.slug AS curriculum_slug, c.id AS curriculum_id
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE t.id = ?`,
            [topicId]
        );
        return this.mapCurriculumSeedTopicRow(row);
    }

    async updateCurriculumSeedStatus(topicId, patch = {}) {
        const allowed = {
            seedStatus: 'seed_status',
            lastSeededAt: 'last_seeded_at',
            lastSynthesisAt: 'last_synthesis_at',
            claimCount: 'claim_count',
            reviewDueAt: 'review_due_at',
        };
        const sets = [];
        const params = [];
        for (const [key, col] of Object.entries(allowed)) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                sets.push(`${col} = ?`);
                params.push(key === 'claimCount' ? Number(patch[key] || 0) : patch[key]);
            }
        }
        if (!sets.length) return null;
        params.push(topicId);
        await this.run(`UPDATE curriculum_topics SET ${sets.join(', ')} WHERE id = ?`, params);
        const row = await this.get(
            `SELECT t.*, b.name AS block_name, c.slug AS curriculum_slug, c.id AS curriculum_id
             FROM curriculum_topics t
             JOIN curriculum_blocks b ON b.id = t.block_id
             JOIN curricula c ON c.id = b.curriculum_id
             WHERE t.id = ?`,
            [topicId]
        );
        return this.mapCurriculumSeedTopicRow(row);
    }
};
