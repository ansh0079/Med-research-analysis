'use strict';

const USER_SECRET_COLUMNS = new Set([
    'password',
    'email_verification_token',
    'email_verification_expires',
    'pending_email_token',
    'pending_email_expires_at',
]);

const EXPORT_OMIT_COLUMNS = {
    api_keys: new Set(['key_hash']),
    refresh_tokens: new Set(['token_hash']),
    password_reset_tokens: new Set(['token']),
    revoked_tokens: new Set(['token_hash', 'token_jti']),
};

const DIRECT_USER_TABLES = [
    ['agent_conversations', 'user_id'],
    ['ai_generation_jobs', 'user_id'],
    ['ai_usage_monthly', 'user_id'],
    ['annotations', 'user_id'],
    ['api_keys', 'user_id'],
    ['audit_logs', 'user_id'],
    ['billing_audit_log', 'user_id'],
    ['case_attempts', 'user_id'],
    ['case_evidence_briefs', 'user_id'],
    ['case_sessions', 'user_id'],
    ['collab_activities', 'user_id'],
    ['collab_annotations', 'user_id'],
    ['collab_collection_collaborators', 'user_id'],
    ['collab_comment_reactions', 'user_id'],
    ['collab_comments', 'user_id'],
    ['collab_notifications', 'user_id'],
    ['cpd_sessions', 'user_id'],
    ['learning_events', 'user_id'],
    ['learning_rounds', 'user_id'],
    ['llm_usage_log', 'user_id', { castText: true }],
    ['password_reset_tokens', 'user_id'],
    ['personalization_decisions', 'user_id'],
    ['portfolio_reflections', 'user_id'],
    ['proactive_evidence_alerts', 'user_id'],
    ['product_quality_feedback', 'user_id'],
    ['quiz_attempts', 'user_id'],
    ['refresh_tokens', 'user_id'],
    ['search_alerts', 'user_id'],
    ['search_learning_outcomes', 'user_id'],
    ['search_result_feedback', 'user_id'],
    ['search_result_impressions', 'user_id'],
    ['search_usage_daily', 'user_id'],
    ['spaced_rep_cards', 'user_id'],
    ['study_runs', 'user_id'],
    ['synopsis_feedback', 'user_id'],
    ['user_claim_misconceptions', 'user_id'],
    ['user_curriculum_progress', 'user_id'],
    ['user_interactions', 'user_id'],
    ['user_learning_profiles', 'user_id'],
    ['user_saved_articles', 'user_id'],
    ['user_topic_mastery', 'user_id'],
    ['user_topic_mastery_snapshots', 'user_id'],
    ['user_topic_memory', 'user_id'],
    ['user_topic_reviews', 'user_id'],
];

const RELATED_USER_TABLES = [
    ['beta_invites', 'created_by'],
    ['collab_collection_articles', 'added_by'],
    ['collab_collection_collaborators', 'added_by'],
    ['collab_collections', 'owner_id'],
    ['collab_invitations', 'invited_by'],
    ['review_projects', 'owner_id', { extraWhere: 'owner_type = ?', extraParams: ['user'] }],
    ['team_collection_articles', 'added_by'],
    ['team_collections', 'created_by'],
    ['team_members', 'user_id'],
    ['team_saved_articles', 'saved_by'],
    ['teams', 'owner_id'],
    ['topic_guidelines', 'reviewed_by'],
    ['topic_knowledge_proposals', 'created_by'],
    ['topic_knowledge_proposals', 'reviewed_by', { exportKey: 'topic_knowledge_proposals_reviewed' }],
];

const DELETE_USER_TABLES = [
    ...DIRECT_USER_TABLES.map(([table, column, opts]) => [table, column, opts]),
    ['collab_activities', 'user_id'],
    ['collab_annotations', 'user_id'],
    ['collab_collection_articles', 'added_by'],
    ['collab_collection_collaborators', 'user_id'],
    ['collab_collection_collaborators', 'added_by'],
    ['collab_comment_reactions', 'user_id'],
    ['collab_comments', 'user_id'],
    ['collab_invitations', 'invited_by'],
    ['collab_notifications', 'user_id'],
    ['team_collection_articles', 'added_by'],
    ['team_collections', 'created_by'],
    ['team_members', 'user_id'],
    ['team_saved_articles', 'saved_by'],
    ['topic_knowledge_proposals', 'created_by'],
];

const ANONYMIZE_TABLES = [
    ['audit_logs', {
        user_id: null,
        session_id: null,
        resource_id: null,
        details: '{"anonymized":true,"reason":"account_deleted"}',
        ip_address: null,
        user_agent: null,
    }],
    ['billing_audit_log', {
        user_id: null,
        session_id: null,
        external_ref: null,
        details: '{"anonymized":true,"reason":"account_deleted"}',
        ip_address: null,
        user_agent: null,
    }],
    ['product_quality_feedback', {
        user_id: null,
        session_id: null,
        comment: null,
        metadata_json: '{"anonymized":true,"reason":"account_deleted"}',
    }],
    ['synopsis_feedback', {
        user_id: null,
        session_id: null,
        reason: null,
        metadata_json: '{"anonymized":true,"reason":"account_deleted"}',
    }],
    ['llm_usage_log', { user_id: null }],
    ['search_result_impressions', { user_id: null, session_id: null }],
];

function assertIdentifier(identifier) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(String(identifier || ''))) {
        throw new Error(`Unsafe SQL identifier: ${identifier}`);
    }
}

function unique(values) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '').map(String))];
}

module.exports = (Sup) => class extends Sup {
    async _accountTableExists(table) {
        assertIdentifier(table);
        if (this.isPostgres) {
            const row = await this.get(
                `SELECT 1 AS present FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = ? LIMIT 1`,
                [table]
            );
            return Boolean(row);
        }
        const row = await this.get(
            `SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
            [table]
        );
        return Boolean(row);
    }

    async _accountColumnExists(table, column) {
        assertIdentifier(table);
        assertIdentifier(column);
        if (!(await this._accountTableExists(table))) return false;
        if (this.isPostgres) {
            const row = await this.get(
                `SELECT 1 AS present FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = ? AND column_name = ? LIMIT 1`,
                [table, column]
            );
            return Boolean(row);
        }
        const rows = await this.all(`PRAGMA table_info(${table})`);
        return rows.some((row) => row.name === column);
    }

    _stripExportColumns(table, rows) {
        const omit = EXPORT_OMIT_COLUMNS[table] || new Set();
        return rows.map((row) => {
            const next = {};
            for (const [key, value] of Object.entries(row || {})) {
                if (!omit.has(key)) next[key] = value;
            }
            return next;
        });
    }

    async _accountSelectRows(table, whereSql, params = [], { requiredColumns = [], exportKey = null } = {}) {
        assertIdentifier(table);
        if (!(await this._accountTableExists(table))) return { key: exportKey || table, rows: [] };
        for (const column of requiredColumns) {
            if (!(await this._accountColumnExists(table, column))) {
                return { key: exportKey || table, rows: [] };
            }
        }
        const rows = await this.all(`SELECT * FROM ${table} WHERE ${whereSql}`, params);
        return { key: exportKey || table, rows: this._stripExportColumns(table, rows) };
    }

    async _accountDeleteWhere(table, column, value, { castText = false } = {}) {
        assertIdentifier(table);
        assertIdentifier(column);
        if (!(await this._accountColumnExists(table, column))) return { changes: 0 };
        const where = castText ? `CAST(${column} AS TEXT) = ?` : `${column} = ?`;
        return this.run(`DELETE FROM ${table} WHERE ${where}`, [String(value)]);
    }

    async _accountUpdateWhere(table, updates, whereColumn, value, { castText = false } = {}) {
        assertIdentifier(table);
        assertIdentifier(whereColumn);
        if (!(await this._accountColumnExists(table, whereColumn))) return { changes: 0 };
        const entries = [];
        for (const [column, nextValue] of Object.entries(updates)) {
            assertIdentifier(column);
            if (await this._accountColumnExists(table, column)) entries.push([column, nextValue]);
        }
        if (entries.length === 0) return { changes: 0 };
        const setSql = entries.map(([column]) => `${column} = ?`).join(', ');
        const where = castText ? `CAST(${whereColumn} AS TEXT) = ?` : `${whereColumn} = ?`;
        return this.run(`UPDATE ${table} SET ${setSql} WHERE ${where}`, [
            ...entries.map(([, nextValue]) => nextValue),
            String(value),
        ]);
    }

    async _accountRowsByIds(table, column, ids, exportKey = null) {
        assertIdentifier(table);
        assertIdentifier(column);
        const cleanIds = unique(ids);
        if (cleanIds.length === 0) return { key: exportKey || table, rows: [] };
        if (!(await this._accountColumnExists(table, column))) return { key: exportKey || table, rows: [] };
        const rows = [];
        for (let i = 0; i < cleanIds.length; i += 200) {
            const chunk = cleanIds.slice(i, i + 200);
            const placeholders = chunk.map(() => '?').join(', ');
            rows.push(...await this.all(`SELECT * FROM ${table} WHERE ${column} IN (${placeholders})`, chunk));
        }
        return { key: exportKey || table, rows: this._stripExportColumns(table, rows) };
    }

    async _accountDeleteByIds(table, column, ids) {
        assertIdentifier(table);
        assertIdentifier(column);
        const cleanIds = unique(ids);
        if (cleanIds.length === 0 || !(await this._accountColumnExists(table, column))) return;
        for (let i = 0; i < cleanIds.length; i += 200) {
            const chunk = cleanIds.slice(i, i + 200);
            const placeholders = chunk.map(() => '?').join(', ');
            await this.run(`DELETE FROM ${table} WHERE ${column} IN (${placeholders})`, chunk);
        }
    }

    async _accountLinkedSessionIds(userId) {
        const sessionIds = [];
        for (const table of ['audit_logs', 'billing_audit_log', 'product_quality_feedback', 'search_result_impressions', 'synopsis_feedback', 'user_interactions']) {
            if (!(await this._accountColumnExists(table, 'user_id')) || !(await this._accountColumnExists(table, 'session_id'))) continue;
            const rows = await this.all(`SELECT DISTINCT session_id FROM ${table} WHERE user_id = ? AND session_id IS NOT NULL`, [String(userId)]);
            sessionIds.push(...rows.map((row) => row.session_id));
        }
        return unique(sessionIds);
    }

    async _accountOwnedReviewIds(userId) {
        if (!(await this._accountColumnExists('review_projects', 'owner_id'))) return [];
        const rows = await this.all(
            `SELECT id FROM review_projects WHERE owner_type = 'user' AND owner_id = ?`,
            [String(userId)]
        );
        return rows.map((row) => row.id);
    }

    async _accountOwnedCollabCollectionIds(userId) {
        if (!(await this._accountColumnExists('collab_collections', 'owner_id'))) return [];
        const rows = await this.all(`SELECT id FROM collab_collections WHERE owner_id = ?`, [String(userId)]);
        return rows.map((row) => row.id);
    }

    async _accountOwnedTeamIds(userId) {
        if (!(await this._accountColumnExists('teams', 'owner_id'))) return [];
        const rows = await this.all(`SELECT id FROM teams WHERE owner_id = ?`, [String(userId)]);
        return rows.map((row) => row.id);
    }

    async _accountTeamCollectionIds(teamIds) {
        const cleanTeamIds = unique(teamIds);
        if (cleanTeamIds.length === 0 || !(await this._accountColumnExists('team_collections', 'team_id'))) return [];
        const rows = [];
        for (let i = 0; i < cleanTeamIds.length; i += 200) {
            const chunk = cleanTeamIds.slice(i, i + 200);
            rows.push(...await this.all(
                `SELECT id FROM team_collections WHERE team_id IN (${chunk.map(() => '?').join(', ')})`,
                chunk
            ));
        }
        return rows.map((row) => row.id);
    }

    async _accountAiJobKeys(userId) {
        if (!(await this._accountColumnExists('ai_generation_jobs', 'user_id'))) return [];
        const rows = await this.all(`SELECT job_key FROM ai_generation_jobs WHERE user_id = ?`, [String(userId)]);
        return rows.map((row) => row.job_key);
    }

    async exportUserData(userId) {
        const id = String(userId || '').trim();
        if (!id) throw new Error('userId is required');

        const accountRow = await this.get(`SELECT * FROM users WHERE id = ?`, [id]);
        if (!accountRow) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        const account = {};
        for (const [key, value] of Object.entries(accountRow)) {
            if (!USER_SECRET_COLUMNS.has(key)) account[key] = value;
        }

        const tables = {};
        for (const [table, column, opts = {}] of DIRECT_USER_TABLES) {
            const where = opts.castText ? `CAST(${column} AS TEXT) = ?` : `${column} = ?`;
            const { key, rows } = await this._accountSelectRows(table, where, [id], {
                requiredColumns: [column],
                exportKey: opts.exportKey,
            });
            tables[key] = rows;
        }

        for (const [table, column, opts = {}] of RELATED_USER_TABLES) {
            const parts = [`${column} = ?`];
            const params = [id];
            if (opts.extraWhere) {
                parts.push(opts.extraWhere);
                params.push(...(opts.extraParams || []));
            }
            const { key, rows } = await this._accountSelectRows(table, parts.join(' AND '), params, {
                requiredColumns: [column],
                exportKey: opts.exportKey,
            });
            if (tables[key]) tables[key].push(...rows);
            else tables[key] = rows;
        }

        if (account.email) {
            const { rows } = await this._accountSelectRows('team_invitations', 'email = ?', [account.email], {
                requiredColumns: ['email'],
                exportKey: 'team_invitations_by_email',
            });
            tables.team_invitations_by_email = rows;
            tables.collab_invitations_by_email = (await this._accountSelectRows('collab_invitations', 'invitee_email = ?', [account.email], {
                requiredColumns: ['invitee_email'],
            })).rows;
            tables.collab_collection_collaborators_by_email = (await this._accountSelectRows('collab_collection_collaborators', 'email = ?', [account.email], {
                requiredColumns: ['email'],
            })).rows;
        }

        const reviewIds = await this._accountOwnedReviewIds(id);
        const reviewArticles = await this._accountRowsByIds('review_articles', 'review_id', reviewIds);
        tables.review_articles = reviewArticles.rows;
        const reviewArticleIds = unique(reviewArticles.rows.map((row) => row.article_id));
        tables.pico_extractions_for_review_articles = (await this._accountRowsByIds('pico_extractions', 'article_id', reviewArticleIds)).rows;

        const aiJobKeys = await this._accountAiJobKeys(id);
        tables.ai_generation_claims = (await this._accountRowsByIds('ai_generation_claims', 'job_key', aiJobKeys)).rows;

        const sessionIds = await this._accountLinkedSessionIds(id);
        tables.sessions = (await this._accountRowsByIds('sessions', 'id', sessionIds)).rows;
        tables.searches = (await this._accountRowsByIds('searches', 'session_id', sessionIds)).rows;
        tables.analytics = (await this._accountRowsByIds('analytics', 'session_id', sessionIds)).rows;

        return {
            metadata: {
                exportedAt: new Date().toISOString(),
                userId: id,
                format: 'signalmd.account-data-export.v1',
                note: 'Credential secrets, token hashes, and password reset tokens are intentionally omitted.',
            },
            account,
            tables,
        };
    }

    async deleteUserAccount(userId) {
        const id = String(userId || '').trim();
        if (!id) throw new Error('userId is required');

        const user = await this.get(`SELECT id, email FROM users WHERE id = ?`, [id]);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        const summary = {
            userId: id,
            deletedAt: new Date().toISOString(),
            deletedRows: {},
            anonymizedTables: [],
        };

        await this.withTransaction(async () => {
            const sessionIds = await this._accountLinkedSessionIds(id);
            const reviewIds = await this._accountOwnedReviewIds(id);
            const collabCollectionIds = await this._accountOwnedCollabCollectionIds(id);
            const teamIds = await this._accountOwnedTeamIds(id);
            const teamCollectionIds = await this._accountTeamCollectionIds(teamIds);
            const aiJobKeys = await this._accountAiJobKeys(id);

            await this._accountDeleteByIds('ai_generation_claims', 'job_key', aiJobKeys);
            await this._accountDeleteByIds('review_articles', 'review_id', reviewIds);
            await this._accountDeleteByIds('collab_comment_reactions', 'comment_id', (await this._accountRowsByIds('collab_comments', 'collection_id', collabCollectionIds)).rows.map((row) => row.id));
            await this._accountDeleteByIds('collab_comments', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('collab_annotations', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('collab_collection_articles', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('collab_collection_collaborators', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('collab_activities', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('collab_invitations', 'collection_id', collabCollectionIds);
            await this._accountDeleteByIds('team_collection_articles', 'collection_id', teamCollectionIds);
            await this._accountDeleteByIds('team_collections', 'team_id', teamIds);
            await this._accountDeleteByIds('team_invitations', 'team_id', teamIds);
            await this._accountDeleteByIds('team_members', 'team_id', teamIds);
            await this._accountDeleteByIds('team_saved_articles', 'team_id', teamIds);

            if (user.email) {
                await this._accountDeleteWhere('team_invitations', 'email', user.email);
                await this._accountDeleteWhere('collab_invitations', 'invitee_email', user.email);
                await this._accountDeleteWhere('collab_collection_collaborators', 'email', user.email);
            }

            await this._accountDeleteByIds('analytics', 'session_id', sessionIds);
            await this._accountDeleteByIds('searches', 'session_id', sessionIds);
            await this._accountDeleteByIds('sessions', 'id', sessionIds);

            for (const [table, updates] of ANONYMIZE_TABLES) {
                const result = await this._accountUpdateWhere(table, updates, 'user_id', id, { castText: table === 'llm_usage_log' });
                if (Number(result?.changes || 0) > 0) summary.anonymizedTables.push(table);
            }
            await this._accountUpdateWhere('audit_logs', {
                user_id: null,
                session_id: null,
                resource_id: null,
                details: '{"anonymized":true,"reason":"account_deleted"}',
                ip_address: null,
                user_agent: null,
            }, 'resource_id', id);
            await this._accountUpdateWhere('beta_invites', { created_by: null }, 'created_by', id);
            await this._accountUpdateWhere('topic_guidelines', { reviewed_by: null }, 'reviewed_by', id);
            await this._accountUpdateWhere('topic_knowledge_proposals', { reviewed_by: null }, 'reviewed_by', id);

            for (const [table, column, opts = {}] of DELETE_USER_TABLES) {
                if (ANONYMIZE_TABLES.some(([anonymizeTable]) => anonymizeTable === table)) continue;
                const result = await this._accountDeleteWhere(table, column, id, opts);
                if (Number(result?.changes || 0) > 0) {
                    summary.deletedRows[`${table}.${column}`] = Number(result.changes);
                }
            }

            let reviewResult = { changes: 0 };
            if (await this._accountColumnExists('review_projects', 'owner_id')) {
                reviewResult = await this.run(
                    `DELETE FROM review_projects WHERE owner_type = 'user' AND owner_id = ?`,
                    [id]
                );
            }
            if (Number(reviewResult?.changes || 0) > 0) summary.deletedRows['review_projects.owner_id'] = Number(reviewResult.changes);
            const collabResult = await this._accountDeleteWhere('collab_collections', 'owner_id', id);
            if (Number(collabResult?.changes || 0) > 0) summary.deletedRows['collab_collections.owner_id'] = Number(collabResult.changes);
            const teamResult = await this._accountDeleteWhere('teams', 'owner_id', id);
            if (Number(teamResult?.changes || 0) > 0) summary.deletedRows['teams.owner_id'] = Number(teamResult.changes);

            await this.run(`DELETE FROM users WHERE id = ?`, [id]);
        });

        return summary;
    }
};
