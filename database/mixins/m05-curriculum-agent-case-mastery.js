'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// Curriculum & study-path progress
// ==========================================

async listCurricula() {
    const rows = await this.all(
        `SELECT id, slug, name, exam_stage_label, description, sort_order FROM curricula ORDER BY sort_order ASC, id ASC`
    );
    return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        examStageLabel: r.exam_stage_label,
        description: r.description,
        sortOrder: r.sort_order,
    }));
}

async countCurriculumTopics(curriculumId) {
    const row = await this.get(
        `SELECT COUNT(*) AS c FROM curriculum_topics t
         JOIN curriculum_blocks b ON b.id = t.block_id WHERE b.curriculum_id = ?`,
        [curriculumId]
    );
    return row?.c != null ? Number(row.c) : 0;
}

async getCurriculumDetailBySlug(slug) {
    const cur = await this.get(`SELECT * FROM curricula WHERE slug = ?`, [slug]);
    if (!cur) return null;
    const blocks = await this.all(
        `SELECT id, curriculum_id, name, sort_order FROM curriculum_blocks WHERE curriculum_id = ? ORDER BY sort_order ASC, id ASC`,
        [cur.id]
    );
    const topicsByBlock = {};
    for (const b of blocks) {
        const topics = await this.all(
            `SELECT id, block_id, display_name, suggested_query, sort_order, prerequisites FROM curriculum_topics WHERE block_id = ? ORDER BY sort_order ASC, id ASC`,
            [b.id]
        );
        topicsByBlock[b.id] = topics.map((t) => ({
            id: t.id,
            blockId: t.block_id,
            displayName: t.display_name,
            suggestedQuery: t.suggested_query,
            sortOrder: t.sort_order,
            prerequisites: (() => { try { return JSON.parse(t.prerequisites || '[]'); } catch { return []; } })(),
        }));
    }
    return {
        id: cur.id,
        slug: cur.slug,
        name: cur.name,
        examStageLabel: cur.exam_stage_label,
        description: cur.description,
        sortOrder: cur.sort_order,
        blocks: blocks.map((b) => ({
            id: b.id,
            curriculumId: b.curriculum_id,
            name: b.name,
            sortOrder: b.sort_order,
            topics: topicsByBlock[b.id] || [],
        })),
    };
}

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
        [
            slug,
            name,
            attrs.examStageLabel || null,
            attrs.description || null,
            Number(attrs.sortOrder || 0),
        ]
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
    const values = [
        suggestedQuery,
        Number(topic.sortOrder || topic.sort_order || 0),
        String(topic.priority || 'medium'),
        String(topic.volatility || 'moderate'),
        String(topic.seedStatus || topic.seed_status || 'not_seeded'),
        existing?.id,
    ];
    if (existing) {
        await this.run(
            `UPDATE curriculum_topics
             SET suggested_query = ?, sort_order = ?, priority = ?, volatility = ?, seed_status = ?
             WHERE id = ?`,
            values
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

async getUserCurriculumProgressMap(userId, curriculumId) {
    const rows = await this.all(
        `SELECT p.curriculum_topic_id, p.status, p.quiz_attempts, p.correct_count, p.last_score_pct, p.updated_at
         FROM user_curriculum_progress p
         JOIN curriculum_topics t ON t.id = p.curriculum_topic_id
         JOIN curriculum_blocks b ON b.id = t.block_id
         WHERE p.user_id = ? AND b.curriculum_id = ?`,
        [userId, curriculumId]
    );
    const map = {};
    for (const r of rows) {
        map[Number(r.curriculum_topic_id)] = {
            status: r.status,
            quizAttempts: Number(r.quiz_attempts || 0),
            correctCount: Number(r.correct_count || 0),
            lastScorePct: r.last_score_pct != null ? Number(r.last_score_pct) : null,
            updatedAt: r.updated_at,
        };
    }
    return map;
}

async touchCurriculumTopicProgress(userId, curriculumTopicId, status = 'in_progress') {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO user_curriculum_progress (user_id, curriculum_topic_id, status, quiz_attempts, correct_count, last_score_pct, updated_at)
         VALUES (?, ?, ?, 0, 0, NULL, ?)
         ON CONFLICT(user_id, curriculum_topic_id) DO UPDATE SET
         status = CASE WHEN user_curriculum_progress.status = 'confident' THEN user_curriculum_progress.status ELSE excluded.status END,
         updated_at = excluded.updated_at`,
        [userId, curriculumTopicId, status, now]
    );
}

async mergeCurriculumTopicAttemptBatch(userId, curriculumTopicId, batchCorrect, batchTotal) {
    if (!curriculumTopicId || batchTotal <= 0) return;
    const row = await this.get(
        `SELECT quiz_attempts, correct_count, status FROM user_curriculum_progress WHERE user_id = ? AND curriculum_topic_id = ?`,
        [userId, curriculumTopicId]
    );
    const prevA = row ? Number(row.quiz_attempts || 0) : 0;
    const prevC = row ? Number(row.correct_count || 0) : 0;
    const newA = prevA + batchTotal;
    const newC = prevC + batchCorrect;
    const lastPct = Math.round((batchCorrect / batchTotal) * 100);
    let status = 'in_progress';
    if (newA >= 8 && newC / newA >= 0.75) status = 'confident';
    else if (newA >= 3 && lastPct >= 80) status = 'in_progress';

    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO user_curriculum_progress (user_id, curriculum_topic_id, status, quiz_attempts, correct_count, last_score_pct, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, curriculum_topic_id) DO UPDATE SET
         status = excluded.status,
         quiz_attempts = excluded.quiz_attempts,
         correct_count = excluded.correct_count,
         last_score_pct = excluded.last_score_pct,
         updated_at = excluded.updated_at`,
        [userId, curriculumTopicId, status, newA, newC, lastPct, now]
    );
}

async getCurriculumExamSummaryForUser(userId, curriculumId) {
    const totalTopics = await this.countCurriculumTopics(curriculumId);
    if (totalTopics === 0) return { totalTopics: 0, topicsStarted: 0, confident: 0, pctTowardGoal: 0 };
    const row = await this.get(
        `SELECT
           COUNT(*) AS started,
           SUM(CASE WHEN p.status = 'confident' THEN 1 ELSE 0 END) AS confident
         FROM user_curriculum_progress p
         JOIN curriculum_topics t ON t.id = p.curriculum_topic_id
         JOIN curriculum_blocks b ON b.id = t.block_id
         WHERE p.user_id = ? AND b.curriculum_id = ?`,
        [userId, curriculumId]
    );
    const topicsStarted = Number(row?.started || 0);
    const confident = Number(row?.confident || 0);
    const pctTopicsTouched = Math.round((topicsStarted / totalTopics) * 100);
    return {
        totalTopics,
        topicsStarted,
        confident,
        pctTopicsTouched,
    };
}

async getStudyRun(id) {
    const row = await this.get(`SELECT * FROM study_runs WHERE id = ?`, [id]);
    return this.mapStudyRunRow(row);
}

async listStudyRuns(userId, { status = '', limit = 20, offset = 0 } = {}) {
    const rows = await this.all(
        `SELECT * FROM study_runs
         WHERE user_id = ? AND (? = '' OR status = ?)
         ORDER BY last_active_at DESC
         LIMIT ? OFFSET ?`,
        [userId, status, status, limit, offset]
    );
    return rows.map((r) => this.mapStudyRunRow(r));
}

async getActiveStudyRun(userId, topic = '') {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const row = await this.get(
        `SELECT * FROM study_runs
         WHERE user_id = ? AND status = 'active' AND (? = '' OR normalized_topic = ?)
         ORDER BY last_active_at DESC
         LIMIT 1`,
        [userId, normalized, normalized]
    );
    return this.mapStudyRunRow(row);
}

async updateStudyRun(id, patch = {}) {
    const existing = await this.getStudyRun(id);
    if (!existing) return null;
    const fields = [];
    const values = [];
    const add = (col, val) => {
        if (val !== undefined) {
            fields.push(`${col} = ?`);
            values.push(val);
        }
    };
    add('status', patch.status);
    add('progress', patch.progress !== undefined ? JSON.stringify(patch.progress || {}) : undefined);
    add('node_coverage', patch.nodeCoverage !== undefined ? JSON.stringify(patch.nodeCoverage || {}) : undefined);
    add('completed_at', patch.completedAt);
    add('last_active_at', new Date().toISOString());
    values.push(id);
    await this.run(`UPDATE study_runs SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getStudyRun(id);
}

// ==========================================
// Learning Agent — Agent Conversations
// ==========================================

async createAgentConversation(userId, topic, title) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(topic);
    const result = await this.run(
        `INSERT INTO agent_conversations (user_id, topic, normalized_topic, title, messages, message_count, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, topic, normalized, title || topic, '[]', 0, now, now]
    );
    return this.getAgentConversation(result.id);
}

async getAgentConversation(id) {
    const row = await this.get(`SELECT * FROM agent_conversations WHERE id = ?`, [id]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        title: row.title,
        messages: safeJsonParse(row.messages, []),
        messageCount: row.message_count,
        lastMessageAt: row.last_message_at,
        conversationSummary: row.conversation_summary || null,
        learnerSnapshot: safeJsonParse(row.learner_snapshot_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.last_message_at || row.created_at,
    };
}

async updateAgentConversationMemory(conversationId, { conversationSummary = null, learnerSnapshot = null } = {}) {
    const conv = await this.getAgentConversation(conversationId);
    if (!conv) return null;
    const now = new Date().toISOString();
    const snapshotJson = learnerSnapshot != null
        ? JSON.stringify(learnerSnapshot).slice(0, 12000)
        : JSON.stringify(conv.learnerSnapshot || {}).slice(0, 12000);
    const summary = conversationSummary != null
        ? String(conversationSummary).slice(0, 8000)
        : conv.conversationSummary;
    await this.run(
        `UPDATE agent_conversations
         SET conversation_summary = ?, learner_snapshot_json = ?, updated_at = ?, last_message_at = ?
         WHERE id = ?`,
        [summary, snapshotJson, now, now, conversationId]
    );
    return this.getAgentConversation(conversationId);
}

async listAgentConversations(userId, { topic = '', limit = 20, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT id, user_id, topic, normalized_topic, title, message_count, last_message_at, created_at
         FROM agent_conversations WHERE user_id = ? AND (? = '' OR normalized_topic = ?)
         ORDER BY last_message_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        title: r.title,
        messageCount: r.message_count,
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
    }));
}

async appendAgentMessages(conversationId, newMessages) {
    const conv = await this.getAgentConversation(conversationId);
    if (!conv) return null;
    const messages = [...conv.messages, ...newMessages];
    const now = new Date().toISOString();
    await this.run(
        `UPDATE agent_conversations SET messages = ?, message_count = ?, last_message_at = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(messages), messages.length, now, now, conversationId]
    );
    return this.getAgentConversation(conversationId);
}

async deleteAgentConversation(id) {
    await this.run(`DELETE FROM agent_conversations WHERE id = ?`, [id]);
    return { deleted: true };
}

// ==========================================
// Learning Agent — Case Attempts
// ==========================================

async createCaseAttempt(attempt) {
    const result = await this.run(
        `INSERT INTO case_attempts (user_id, topic, normalized_topic, case_text, case_type, learning_mode, user_response, ai_feedback, score, seed_article_uids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            attempt.userId,
            attempt.topic,
            this.normalizeTopic(attempt.topic),
            attempt.caseText,
            attempt.caseType || 'analysis',
            attempt.learningMode || 'resident',
            attempt.userResponse ? JSON.stringify(attempt.userResponse) : null,
            attempt.aiFeedback ? JSON.stringify(attempt.aiFeedback) : null,
            attempt.score ?? null,
            JSON.stringify(attempt.seedArticleUids || []),
        ]
    );
    return { id: result.id, ...attempt };
}

async getCaseAttempts({ userId, topic = '', limit = 50, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT * FROM case_attempts WHERE user_id = ? AND (? = '' OR normalized_topic = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        caseText: r.case_text,
        caseType: r.case_type,
        learningMode: r.learning_mode,
        userResponse: safeJsonParse(r.user_response, null),
        aiFeedback: safeJsonParse(r.ai_feedback, null),
        score: r.score,
        seedArticleUids: safeJsonParse(r.seed_article_uids, []),
        createdAt: r.created_at,
    }));
}

// ==========================================
// Learning Agent — Topic Mastery
// ==========================================

async getUserTopicMastery(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const row = await this.get(`SELECT * FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        overallScore: row.overall_score,
        recallScore: row.recall_score,
        clinicalApplicationScore: row.clinical_application_score,
        trialInterpretationScore: row.trial_interpretation_score,
        guidelineScore: row.guideline_score,
        pitfallScore: row.pitfall_score,
        attemptsCount: row.attempts_count,
        correctCount: row.correct_count,
        lastAttemptAt: row.last_attempt_at,
        nextReviewAt: row.next_review_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async listUserTopicMastery(userId, { limit = 50, offset = 0 } = {}) {
    const rows = await this.all(
        `SELECT * FROM user_topic_mastery WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        overallScore: r.overall_score,
        recallScore: r.recall_score,
        clinicalApplicationScore: r.clinical_application_score,
        trialInterpretationScore: r.trial_interpretation_score,
        guidelineScore: r.guideline_score,
        pitfallScore: r.pitfall_score,
        attemptsCount: r.attempts_count,
        correctCount: r.correct_count,
        lastAttemptAt: r.last_attempt_at,
        nextReviewAt: r.next_review_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
}

async upsertUserTopicMastery(userId, topic, scores) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(topic);
    await this.run(
        `INSERT INTO user_topic_mastery
            (user_id, topic, normalized_topic, overall_score, recall_score, clinical_application_score,
             trial_interpretation_score, guideline_score, pitfall_score, attempts_count, correct_count,
             last_attempt_at, next_review_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, normalized_topic) DO UPDATE SET
            overall_score = excluded.overall_score,
            recall_score = excluded.recall_score,
            clinical_application_score = excluded.clinical_application_score,
            trial_interpretation_score = excluded.trial_interpretation_score,
            guideline_score = excluded.guideline_score,
            pitfall_score = excluded.pitfall_score,
            attempts_count = excluded.attempts_count,
            correct_count = excluded.correct_count,
            last_attempt_at = excluded.last_attempt_at,
            next_review_at = excluded.next_review_at,
            updated_at = excluded.updated_at`,
        [
            userId, topic, normalized,
            scores.overallScore ?? 0, scores.recallScore ?? 0, scores.clinicalApplicationScore ?? 0,
            scores.trialInterpretationScore ?? 0, scores.guidelineScore ?? 0, scores.pitfallScore ?? 0,
            scores.attemptsCount ?? 0, scores.correctCount ?? 0,
            scores.lastAttemptAt || now, scores.nextReviewAt || now, now, now,
        ]
    );
    return this.getUserTopicMastery(userId, topic);
}

/**
 * Anonymous cohort stats for a topic: peer stage average, foundation-doctor reference, global avg, percentile.
 */
async getMasteryCohortBenchmark(userId, topic) {
    const normalized = this.normalizeTopic(topic);
    const mine = await this.getUserTopicMastery(userId, topic);
    if (!mine) return null;
    const profile = await this.getLearningProfile(userId);
    const stage = profile?.trainingStage || 'finals';

    const peerRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = ? AND m.attempts_count >= 1 AND m.user_id != ?`,
        [normalized, stage, userId]
    ).catch(() => []);

    const peerRankRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = ? AND m.attempts_count >= 1`,
        [normalized, stage]
    ).catch(() => []);

    const seniorRows = await this.all(
        `SELECT m.overall_score AS s FROM user_topic_mastery m
         INNER JOIN user_learning_profiles p ON p.user_id = m.user_id
         WHERE m.normalized_topic = ? AND COALESCE(p.training_stage, 'finals') = 'foundation_doctor' AND m.attempts_count >= 1 AND m.user_id != ?`,
        [normalized, userId]
    ).catch(() => []);

    const globalRow = await this.get(
        `SELECT AVG(overall_score) AS avg, COUNT(*) AS n FROM user_topic_mastery
         WHERE normalized_topic = ? AND attempts_count >= 1 AND user_id != ?`,
        [normalized, userId]
    ).catch(() => null);

    const avg = (rows) => {
        if (!rows.length) return null;
        const sum = rows.reduce((a, r) => a + Number(r.s), 0);
        return Math.round(sum / rows.length);
    };

    const peerScores = peerRankRows.map((r) => Number(r.s)).sort((a, b) => a - b);
    let percentileAmongPeers = null;
    if (peerScores.length >= 3) {
        const below = peerScores.filter((s) => s < mine.overallScore).length;
        percentileAmongPeers = Math.round((below / peerScores.length) * 100);
    }

    return {
        normalizedTopic: normalized,
        myScore: mine.overallScore,
        peerStage: stage,
        peerAvg: avg(peerRows),
        peerSampleSize: peerRows.length,
        foundationDoctorAvg: avg(seniorRows),
        foundationDoctorSampleSize: seniorRows.length,
        globalAvg: globalRow?.avg != null ? Math.round(Number(globalRow.avg)) : null,
        globalSampleSize: globalRow?.n != null ? Number(globalRow.n) : 0,
        percentileAmongPeers,
    };
}
};
