'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
    async ensurePersonalizationArms(policyType, armIds = [], scopeKey = 'global') {
        if (!this.kysely || !policyType) return;
        const now = new Date().toISOString();
        for (const armId of armIds) {
            await this.run(
                `INSERT INTO personalization_arm_state (policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward, updated_at)
                 VALUES (?, ?, ?, 1.0, 1.0, 0, 0, ?)
                 ON CONFLICT(policy_type, arm_id, scope_key) DO NOTHING`,
                [String(policyType), String(armId), String(scopeKey), now]
            ).catch(() => null);
        }
    }

    async listPersonalizationArmStates(policyType, scopeKey = 'global') {
        if (!this.kysely || !policyType) return [];
        return this.all(
            `SELECT policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward, updated_at
             FROM personalization_arm_state
             WHERE policy_type = ? AND scope_key = ?
             ORDER BY arm_id ASC`,
            [String(policyType), String(scopeKey)]
        );
    }

    async recordPersonalizationArmPull(policyType, armId, reward, scopeKey = 'global') {
        if (!this.kysely || !policyType || !armId) return null;
        const now = new Date().toISOString();
        const success = Number(reward) > 0.35;
        await this.ensurePersonalizationArms(policyType, [armId], scopeKey);
        await this.run(
            `UPDATE personalization_arm_state
             SET alpha = alpha + ?,
                 beta = beta + ?,
                 pulls = pulls + 1,
                 total_reward = total_reward + ?,
                 updated_at = ?
             WHERE policy_type = ? AND arm_id = ? AND scope_key = ?`,
            [
                success ? 1 : 0,
                success ? 0 : 1,
                Number(reward) || 0,
                now,
                String(policyType),
                String(armId),
                String(scopeKey),
            ]
        );
        return { policyType, armId, scopeKey, reward, success };
    }

    async insertPersonalizationDecision({
        userId = null,
        policyType,
        armId,
        searchId = null,
        topic = null,
        normalizedTopic = null,
        articleUid = null,
        context = {},
        immediateReward = null,
        delayedReward = null,
        totalReward = null,
    }) {
        if (!this.kysely || !policyType || !armId) return null;
        const now = new Date().toISOString();
        const result = await this.run(
            `INSERT INTO personalization_decisions (
                user_id, policy_type, arm_id, search_id, topic, normalized_topic, article_uid,
                context_json, immediate_reward, delayed_reward, total_reward, reward_computed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId ? String(userId) : null,
                String(policyType),
                String(armId),
                searchId != null ? Number(searchId) : null,
                topic ? String(topic).slice(0, 240) : null,
                normalizedTopic ? String(normalizedTopic).slice(0, 240) : null,
                articleUid ? String(articleUid).slice(0, 120) : null,
                JSON.stringify(context || {}),
                immediateReward != null ? Number(immediateReward) : null,
                delayedReward != null ? Number(delayedReward) : null,
                totalReward != null ? Number(totalReward) : null,
                totalReward != null ? now : null,
                now,
            ]
        );
        return { id: result?.lastID ?? result?.lastInsertRowid ?? null };
    }

    async insertSearchLearningOutcome({
        userId,
        searchId = null,
        impressionId = null,
        articleUid,
        claimKey = null,
        topic = null,
        normalizedTopic = null,
        quizAttemptId = null,
        firstAttemptCorrect = false,
        reward,
        banditArmId = null,
    }) {
        if (!this.kysely || !userId || !articleUid) return null;
        const now = new Date().toISOString();
        const result = await this.run(
            `INSERT INTO search_learning_outcomes (
                user_id, search_id, impression_id, article_uid, claim_key, topic, normalized_topic,
                quiz_attempt_id, first_attempt_correct, reward, bandit_arm_id, attributed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(userId),
                searchId != null ? Number(searchId) : null,
                impressionId != null ? Number(impressionId) : null,
                String(articleUid).slice(0, 120),
                claimKey ? String(claimKey).slice(0, 80) : null,
                topic ? String(topic).slice(0, 240) : null,
                normalizedTopic ? String(normalizedTopic).slice(0, 240) : null,
                quizAttemptId != null ? Number(quizAttemptId) : null,
                firstAttemptCorrect ? 1 : 0,
                Number(reward) || 0,
                banditArmId ? String(banditArmId).slice(0, 80) : null,
                now,
                now,
            ]
        );
        return { id: result?.lastID ?? result?.lastInsertRowid ?? null };
    }

    async findRecentSearchImpressionsForAttribution(userId, {
        sessionId = null,
        topic = '',
        normalizedTopic = '',
        articleUid = null,
        days = 7,
        limit = 15,
    } = {}) {
        if (!this.kysely || (!userId && !sessionId)) return [];
        const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 7, 1), 30) * 86400000).toISOString();
        const normalized = normalizedTopic || (typeof this.normalizeTopic === 'function' ? this.normalizeTopic(topic) : '');
        const params = [since];
        const actorParts = [];
        if (userId) {
            actorParts.push('sri.user_id = ?');
            params.push(String(userId));
        }
        if (sessionId) {
            actorParts.push('sri.session_id = ?');
            params.push(String(sessionId));
        }
        const actorClause = ` AND (${actorParts.join(' OR ')})`;
        let topicClause = '';
        if (normalized) {
            topicClause = ' AND (s.normalized_topic = ? OR LOWER(s.query) LIKE ?)';
            params.push(normalized, `%${normalized.replace(/-/g, '%')}%`);
        }
        let articleClause = '';
        if (articleUid) {
            articleClause = ' AND LOWER(sri.article_uid) = ?';
            params.push(String(articleUid).toLowerCase());
        }
        params.push(Math.min(Math.max(Number(limit) || 15, 1), 50));
        return this.all(
            `SELECT sri.id AS impression_id, sri.search_id, sri.article_uid, sri.position,
                    sri.was_clicked, sri.was_saved, sri.dwell_time_ms, sri.created_at,
                    s.query, s.normalized_topic
             FROM search_result_impressions sri
             JOIN searches s ON s.id = sri.search_id
             WHERE sri.created_at >= ?
               ${actorClause}
               ${topicClause}
               ${articleClause}
             ORDER BY sri.created_at DESC
             LIMIT ?`,
            params
        );
    }

    async countPriorQuizAttemptsOnClaim(userId, claimKey, beforeAttemptId = null) {
        if (!this.kysely || !userId || !claimKey) return 0;
        const params = [String(userId), String(claimKey)];
        let extra = '';
        if (beforeAttemptId != null) {
            extra = ' AND id < ?';
            params.push(Number(beforeAttemptId));
        }
        const row = await this.get(
            `SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id = ? AND claim_key = ?${extra}`,
            params
        );
        return Number(row?.count || 0);
    }

    async listPersonalizationDecisionsPendingReward({ days = 14, limit = 500 } = {}) {
        if (!this.kysely) return [];
        const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 14, 1), 60) * 86400000).toISOString();
        return this.all(
            `SELECT * FROM personalization_decisions
             WHERE delayed_reward IS NULL
               AND created_at >= ?
             ORDER BY created_at ASC
             LIMIT ?`,
            [since, Math.min(Math.max(Number(limit) || 500, 1), 2000)]
        );
    }

    async updatePersonalizationDecisionReward(decisionId, { immediateReward, delayedReward, totalReward }) {
        if (!this.kysely || !decisionId) return null;
        const now = new Date().toISOString();
        await this.run(
            `UPDATE personalization_decisions
             SET immediate_reward = COALESCE(?, immediate_reward),
                 delayed_reward = COALESCE(?, delayed_reward),
                 total_reward = COALESCE(?, total_reward),
                 reward_computed_at = ?
             WHERE id = ?`,
            [
                immediateReward != null ? Number(immediateReward) : null,
                delayedReward != null ? Number(delayedReward) : null,
                totalReward != null ? Number(totalReward) : null,
                now,
                Number(decisionId),
            ]
        );
        return true;
    }

    mapPersonalizationArmRow(row) {
        if (!row) return null;
        return {
            policyType: row.policy_type,
            armId: row.arm_id,
            scopeKey: row.scope_key,
            alpha: Number(row.alpha || 1),
            beta: Number(row.beta || 1),
            pulls: Number(row.pulls || 0),
            totalReward: Number(row.total_reward || 0),
            updatedAt: row.updated_at,
        };
    }

    mapPersonalizationDecisionRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            userId: row.user_id,
            policyType: row.policy_type,
            armId: row.arm_id,
            searchId: row.search_id,
            topic: row.topic,
            normalizedTopic: row.normalized_topic,
            articleUid: row.article_uid,
            context: safeJsonParse(row.context_json, {}),
            immediateReward: row.immediate_reward != null ? Number(row.immediate_reward) : null,
            delayedReward: row.delayed_reward != null ? Number(row.delayed_reward) : null,
            totalReward: row.total_reward != null ? Number(row.total_reward) : null,
            rewardComputedAt: row.reward_computed_at,
            createdAt: row.created_at,
        };
    }
};
