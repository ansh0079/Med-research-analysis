// ==========================================
// Database Module
// SQLite for development, PostgreSQL for production
// ==========================================

const { Pool } = require('pg');
const { spawnSync } = require('child_process');
const { Kysely, SqliteDialect, PostgresDialect } = require('kysely');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { buildPgPoolConfig, buildPgVectorPoolConfig } = require('../server/utils/pgPoolOptions');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../server/utils/topicSynonyms');

function safeJsonParse(value, fallback = null) {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

/** Apply SQL migrations via scripts/sqlite-migrate.mjs (node:sqlite) before opening better-sqlite3 */
function runExternalSqliteMigrations(absDbPath) {
    const migrateScript = path.join(__dirname, '..', 'scripts', 'sqlite-migrate.mjs');
    const { status, error } = spawnSync(process.execPath, [migrateScript], {
        env: { ...process.env, SQLITE_PATH: absDbPath },
        stdio: 'inherit',
        windowsHide: true,
    });
    if (error) throw error;
    if (status !== 0) {
        throw new Error(`SQLite migrations failed (exit ${status}). Fix errors above or set SKIP_BUILTIN_SQLITE_MIGRATE=1 and use db:migrate:kysely after repairing better-sqlite3.`);
    }
}

class Database {
    constructor(dbPath = './database/app.db') {
        this.dbPath = dbPath;
        /** @type {import('better-sqlite3').Database | null} */
        this._bs = null;
        /** @type {import('kysely').Kysely<Record<string, unknown>> | null} */
        this.kysely = null;
        this.pool = null;
        this.pgVectorPool = null;
        // Full app on Postgres only when explicitly migrating (not used by default)
        this.isPostgres = process.env.USE_POSTGRES_MAIN === 'true' && Boolean(process.env.DATABASE_URL);
    }

    async connect() {
        const vectorUrl = process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL;
        if (vectorUrl && String(vectorUrl).trim()) {
            const sslVec = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
            this.pgVectorPool = new Pool(buildPgVectorPoolConfig(String(vectorUrl).trim(), sslVec));
            console.log('Γ£à PG vector pool connected (pgvector / articles_cache)');
        }

        if (this.isPostgres) {
            const sslMain = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
            const pool = new Pool(buildPgPoolConfig(process.env.DATABASE_URL, sslMain));
            this.pool = pool;
            this.kysely = new Kysely({
                dialect: new PostgresDialect({ pool })
            });
            console.log('Γ£à Connected to PostgreSQL (main app)');
            return true;
        }

        return new Promise((resolve, reject) => {
            try {
                const dir = path.dirname(this.dbPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                if (process.env.SKIP_BUILTIN_SQLITE_MIGRATE !== '1') {
                    const absDbPath = path.isAbsolute(this.dbPath)
                        ? this.dbPath
                        : path.resolve(process.cwd(), this.dbPath);
                    runExternalSqliteMigrations(absDbPath);
                }

                const BetterSqlite = require('better-sqlite3');
                this._bs = new BetterSqlite(this.dbPath, { fileMustExist: false });
                this._bs.pragma('journal_mode = WAL');
                this._bs.pragma('foreign_keys = ON');
                this.kysely = new Kysely({ dialect: new SqliteDialect({ database: this._bs }) });
                console.log('Γ£à Connected to SQLite (better-sqlite3 + Kysely)');
                this.initialize().then(resolve).catch(reject);
            } catch (err) {
                console.error('Database connection failed:', err);
                reject(err);
            }
        });
    }

    async initialize() {
        const schemaPath = this.isPostgres
            ? path.join(__dirname, 'production_schema.sql')
            : path.join(__dirname, 'schema.sql');
        if (this._bs) {
            this._bs.exec(fs.readFileSync(schemaPath, 'utf8'));
            this._bs.exec(`
                CREATE TABLE IF NOT EXISTS annotations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT,
                    text TEXT NOT NULL,
                    position TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } else if (this.isPostgres) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            const statements = schema.split(';').filter(s => s.trim());
            for (const statement of statements) {
                if (statement.trim()) await this.run(statement);
            }
        }
        const migrationsDdl = this.isPostgres
            ? `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`
            : `CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
        await this.run(migrationsDdl);

        // Audit logs
        if (this._bs) {
            this._bs.exec(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    session_id TEXT,
                    action TEXT NOT NULL,
                    resource_type TEXT,
                    resource_id TEXT,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this._bs.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
            this._bs.exec(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
            this._bs.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
        }

        console.log('Γ£à Database schema initialized');
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        const migrationsDir = path.join(__dirname, 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('Γä╣∩╕Å No migrations directory');
            return { migrated: 0 };
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        const applied = await this.all('SELECT name FROM _migrations ORDER BY id');
        const appliedNames = new Set(applied.map(m => m.name));
        const pending = files.filter(f => !appliedNames.has(f));

        if (pending.length === 0) {
            console.log('Γ£à Database is up to date');
            return { migrated: 0 };
        }

        console.log(`Running ${pending.length} migration(s)...`);

        for (const file of pending) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            console.log(`Running migration: ${file}`);
            
            // Strip line comments before splitting on semicolons to avoid
            // fragments from comments that contain semicolons.
            const sqlWithoutComments = sql
                .split('\n')
                .map(line => line.split('--')[0])
                .join('\n');
            const statements = sqlWithoutComments.split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.run(statement);
                    } catch (err) {
                        // Ignore "duplicate column name" errors so migrations stay idempotent
                        if (err && err.message && err.message.includes('duplicate column name')) {
                            console.log(`   ΓÜá∩╕Å  Skipped (already exists): ${statement.split(/\s+/).slice(0, 6).join(' ')}...`);
                        } else {
                            throw err;
                        }
                    }
                }
            }
            
            await this.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
            console.log(`Γ£à Completed: ${file}`);
        }

        return { migrated: pending.length };
    }

    toPgQuery(sql) {
        let paramIndex = 1;
        let inString = false;
        let stringChar = null;
        let escaped = false;
        let result = '';
        for (let i = 0; i < sql.length; i++) {
            const ch = sql[i];
            if (escaped) {
                result += ch;
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                result += ch;
                escaped = true;
                continue;
            }
            if (!inString && (ch === "'" || ch === '"')) {
                inString = true;
                stringChar = ch;
                result += ch;
                continue;
            }
            if (inString && ch === stringChar) {
                inString = false;
                stringChar = null;
                result += ch;
                continue;
            }
            if (!inString && ch === '?') {
                result += '$' + paramIndex++;
                continue;
            }
            result += ch;
        }
        return result;
    }

    run(sqlText, params = []) {
        if (this.isPostgres) {
            const pgSql = this.toPgQuery(sqlText);
            return this.pool.query(pgSql, params).then((res) => {
                const id = res.rows && res.rows[0] && res.rows[0].id !== null && res.rows[0].id !== undefined ? res.rows[0].id : null;
                return { id: id ?? res.insertId, changes: res.rowCount, rows: res.rows };
            });
        }
        return new Promise((resolve, reject) => {
            try {
                const st = this._bs.prepare(sqlText);
                const r = st.run(...params);
                resolve({ id: Number(r.lastInsertRowid) || 0, changes: r.changes });
            } catch (e) {
                reject(e);
            }
        });
    }

    get(sqlText, params = []) {
        if (this.isPostgres) {
            const pgSql = this.toPgQuery(sqlText);
            return this.pool.query(pgSql, params).then((res) => res.rows[0]);
        }
        return new Promise((resolve, reject) => {
            try {
                const st = this._bs.prepare(sqlText);
                const row = st.get(...params);
                resolve(row);
            } catch (e) {
                reject(e);
            }
        });
    }

    all(sqlText, params = []) {
        if (this.isPostgres) {
            const pgSql = this.toPgQuery(sqlText);
            return this.pool.query(pgSql, params).then((res) => res.rows);
        }
        return new Promise((resolve, reject) => {
            try {
                const st = this._bs.prepare(sqlText);
                resolve(st.all(...params));
            } catch (e) {
                reject(e);
            }
        });
    }

    close() {
        const v = this.pgVectorPool ? this.pgVectorPool.end() : Promise.resolve();
        if (this.isPostgres) {
            this.kysely = null;
            if (this.pool) {
                const p = this.pool;
                this.pool = null;
                return Promise.all([v, p.end()]).then(() => undefined);
            }
            return v;
        }
        return v.then(
            () =>
                new Promise((resolve, reject) => {
                    try {
                        this.kysely = null;
                        if (this._bs) {
                            this._bs.close();
                            this._bs = null;
                        }
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })
        );
    }

    async getSearchHistory(sessionId, limit = 50) {
        if (!this.kysely) return [];
        return this.kysely
            .selectFrom('searches')
            .selectAll()
            .where('session_id', '=', sessionId)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .execute();
    }

    async getPopularSearches(limit = 20) {
        if (!this.kysely) return [];
        const { sql } = this.kysely;
        return this.kysely
            .selectFrom('searches')
            .select([
                'query',
                sql`COUNT(*)`.as('count'),
                sql`AVG(results_count)`.as('avg_results')
            ])
            .groupBy('query')
            .having(sql`COUNT(*)`, '>', 1)
            .orderBy('count', 'desc')
            .limit(limit)
            .execute();
    }

    async cacheArticle(articleId, source, articleData, ttlHours = 24) {
        if (!this.kysely) return;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);

        return this.kysely
            .insertInto('article_cache')
            .values({
                id: articleId,
                source,
                data: JSON.stringify(articleData),
                title: articleData.title,
                authors: JSON.stringify(articleData.authors),
                abstract: articleData.abstract,
                publication_date: articleData.pubdate || articleData.year,
                journal: articleData.source || articleData.journal,
                citation_count: articleData.pmcrefcount || articleData.citationCount || 0,
                expires_at: expiresAt.toISOString()
            })
            .onConflict(oc => oc.column('id').doUpdateSet({
                data: JSON.stringify(articleData),
                expires_at: expiresAt.toISOString()
            }))
            .execute();
    }

    // ==========================================
    // Search Logging
    // ==========================================

    async logSearch(sessionId, query, sources, filters, resultsCount, executionTime, ipAddress, { sessionSequenceIndex = 0, previousQueries = [] } = {}) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('searches')
            .values({
                session_id: sessionId,
                query,
                normalized_topic: this.normalizeTopic(query) || null,
                sources: JSON.stringify(sources || []),
                filters: JSON.stringify(filters || {}),
                results_count: resultsCount || 0,
                execution_time_ms: executionTime || 0,
                session_sequence_index: sessionSequenceIndex,
                previous_queries: previousQueries.length > 0 ? JSON.stringify(previousQueries) : null,
                ip_address: ipAddress || null,
                created_at: new Date().toISOString()
            })
            .execute();
    }

    async getMaxSessionSequenceIndex(sessionId) {
        if (!this.kysely || !sessionId) return 0;
        const row = await this.get(
            'SELECT MAX(session_sequence_index) as max_idx FROM searches WHERE session_id = ?',
            [sessionId]
        );
        return row?.max_idx ? Number(row.max_idx) : 0;
    }

    async getPreviousSearchInSession(sessionId, currentSequenceIndex) {
        if (!this.kysely || !sessionId || currentSequenceIndex <= 0) return null;
        return this.get(
            'SELECT * FROM searches WHERE session_id = ? AND session_sequence_index = ? ORDER BY created_at DESC LIMIT 1',
            [sessionId, currentSequenceIndex - 1]
        );
    }

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

        for (const key of keys) {
            const byAlias = await this._getTopicKnowledgeRowByAlias(key);
            if (byAlias) return this.mapTopicKnowledgeRow(byAlias);
        }
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

    // ==========================================
    // Guideline Memory
    // ==========================================

    mapGuidelineRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            topic: row.topic,
            normalizedTopic: row.normalized_topic,
            sourceBody: row.source_body,
            sourceRegion: row.source_region || undefined,
            sourceYear: row.source_year === null || row.source_year === undefined ? undefined : Number(row.source_year),
            sourceUrl: row.source_url || undefined,
            sourceSpecialty: row.source_specialty || undefined,
            sourceDomain: row.source_domain || undefined,
            recommendationText: row.recommendation_text,
            recommendationStrength: row.recommendation_strength || undefined,
            recommendationCertainty: row.recommendation_certainty || undefined,
            population: row.population || undefined,
            intervention: row.intervention || undefined,
            cautions: row.cautions || undefined,
            status: row.status,
            reviewedBy: row.reviewed_by || undefined,
            reviewedAt: row.reviewed_at || undefined,
            supersededById: row.superseded_by_id === null || row.superseded_by_id === undefined ? undefined : Number(row.superseded_by_id),
            lastCheckedAt: row.last_checked_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async createGuideline(guideline) {
        const now = new Date().toISOString();
        const normalized = this.normalizeTopic(guideline.topic);
        const result = await this.run(
            `INSERT INTO topic_guidelines (
                topic, normalized_topic, source_body, source_region, source_year,
                source_url, source_specialty, source_domain, recommendation_text,
                recommendation_strength, recommendation_certainty, population,
                intervention, cautions, status, last_checked_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(guideline.topic || '').trim().slice(0, 240),
                normalized,
                String(guideline.sourceBody || '').trim(),
                guideline.sourceRegion ? String(guideline.sourceRegion).trim() : null,
                guideline.sourceYear ? parseInt(guideline.sourceYear, 10) : null,
                guideline.sourceUrl ? String(guideline.sourceUrl).trim() : null,
                guideline.sourceSpecialty ? String(guideline.sourceSpecialty).trim() : null,
                guideline.sourceDomain ? String(guideline.sourceDomain).trim() : null,
                String(guideline.recommendationText || '').trim(),
                guideline.recommendationStrength ? String(guideline.recommendationStrength).trim() : null,
                guideline.recommendationCertainty ? String(guideline.recommendationCertainty).trim() : null,
                guideline.population ? String(guideline.population).trim() : null,
                guideline.intervention ? String(guideline.intervention).trim() : null,
                guideline.cautions ? String(guideline.cautions).trim() : null,
                guideline.status || 'ai_extracted',
                now, now, now,
            ]
        );
        return this.getGuidelineById(result.id);
    }

    async getGuidelineById(id) {
        const row = await this.get(`SELECT * FROM topic_guidelines WHERE id = ?`, [id]);
        return this.mapGuidelineRow(row);
    }

    async getGuidelinesByTopic(topic, { status = '', limit = 20 } = {}) {
        const normalized = this.normalizeTopic(topic);
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
        const statusFilter = String(status || '').trim();
        const staleThreshold = new Date(Date.now() - 365 * 86400000).toISOString();
        // Auto-flag stale guidelines on read
        await this.run(
            `UPDATE topic_guidelines SET status = 'stale'
             WHERE normalized_topic = ?
               AND status IN ('ai_extracted', 'human_reviewed')
               AND last_checked_at < ?
               AND superseded_by_id IS NULL`,
            [normalized, staleThreshold]
        );
        const rows = await this.all(
            `SELECT * FROM topic_guidelines
             WHERE normalized_topic = ?
               AND (? = '' OR status = ?)
               AND superseded_by_id IS NULL
             ORDER BY source_year DESC, updated_at DESC
             LIMIT ?`,
            [normalized, statusFilter, statusFilter, safeLimit]
        );
        return rows.map((row) => this.mapGuidelineRow(row));
    }

    async listGuidelines({ query = '', status = '', sourceBody = '', limit = 50, offset = 0, onlyActive = false } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
        const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
        const qRaw = String(query || '').trim();
        const qLower = qRaw.toLowerCase();
        const qPattern = qRaw ? `%${qLower}%` : '';
        const statusFilter = String(status || '').trim();
        const sourceFilter = String(sourceBody || '').trim();
        const activeOnly = onlyActive ? 1 : 0;

        const rows = await this.all(
            `SELECT * FROM topic_guidelines
             WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
               AND (? = '' OR status = ?)
               AND (? = '' OR source_body = ?)
               AND (? != 1 OR superseded_by_id IS NULL)
             ORDER BY updated_at DESC
             LIMIT ? OFFSET ?`,
            [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly, safeLimit, safeOffset]
        );
        const countRow = await this.get(
            `SELECT COUNT(*) AS count FROM topic_guidelines
             WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
               AND (? = '' OR status = ?)
               AND (? = '' OR source_body = ?)
               AND (? != 1 OR superseded_by_id IS NULL)`,
            [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly]
        );
        return {
            guidelines: rows.map((row) => this.mapGuidelineRow(row)),
            total: Number(countRow?.count || 0),
            limit: safeLimit,
            offset: safeOffset,
        };
    }

    async updateGuideline(id, patch) {
        const existing = await this.getGuidelineById(id);
        if (!existing) return null;
        const now = new Date().toISOString();

        const fields = [];
        const values = [];
        const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); values.push(val); } };

        add('topic', patch.topic !== undefined ? String(patch.topic).trim().slice(0, 240) : undefined);
        add('normalized_topic', patch.topic !== undefined ? this.normalizeTopic(patch.topic) : undefined);
        add('source_body', patch.sourceBody !== undefined ? String(patch.sourceBody).trim() : undefined);
        add('source_region', patch.sourceRegion !== undefined ? (patch.sourceRegion ? String(patch.sourceRegion).trim() : null) : undefined);
        add('source_year', patch.sourceYear !== undefined ? (patch.sourceYear ? parseInt(patch.sourceYear, 10) : null) : undefined);
        add('source_url', patch.sourceUrl !== undefined ? (patch.sourceUrl ? String(patch.sourceUrl).trim() : null) : undefined);
        add('source_specialty', patch.sourceSpecialty !== undefined ? (patch.sourceSpecialty ? String(patch.sourceSpecialty).trim() : null) : undefined);
        add('source_domain', patch.sourceDomain !== undefined ? (patch.sourceDomain ? String(patch.sourceDomain).trim() : null) : undefined);
        add('recommendation_text', patch.recommendationText !== undefined ? String(patch.recommendationText).trim() : undefined);
        add('recommendation_strength', patch.recommendationStrength !== undefined ? (patch.recommendationStrength ? String(patch.recommendationStrength).trim() : null) : undefined);
        add('recommendation_certainty', patch.recommendationCertainty !== undefined ? (patch.recommendationCertainty ? String(patch.recommendationCertainty).trim() : null) : undefined);
        add('population', patch.population !== undefined ? (patch.population ? String(patch.population).trim() : null) : undefined);
        add('intervention', patch.intervention !== undefined ? (patch.intervention ? String(patch.intervention).trim() : null) : undefined);
        add('cautions', patch.cautions !== undefined ? (patch.cautions ? String(patch.cautions).trim() : null) : undefined);
        add('status', patch.status !== undefined ? String(patch.status).trim() : undefined);
        add('last_checked_at', patch.lastCheckedAt !== undefined ? patch.lastCheckedAt : now);
        add('updated_at', now);

        if (fields.length === 0) return existing;
        values.push(id);
        await this.run(`UPDATE topic_guidelines SET ${fields.join(', ')} WHERE id = ?`, values);
        return this.getGuidelineById(id);
    }

    async markGuidelineReviewed(id, reviewerId) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE topic_guidelines SET status = 'human_reviewed', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
            [reviewerId || null, now, now, id]
        );
        return this.getGuidelineById(id);
    }

    async markGuidelineStale(id) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE topic_guidelines SET status = 'stale', updated_at = ? WHERE id = ?`,
            [now, id]
        );
        return this.getGuidelineById(id);
    }

    async markGuidelineSuperseded(id, supersededById) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE topic_guidelines SET status = 'superseded', superseded_by_id = ?, updated_at = ? WHERE id = ?`,
            [supersededById, now, id]
        );
        return this.getGuidelineById(id);
    }

    async deleteGuideline(id) {
        await this.run(`DELETE FROM topic_guidelines WHERE id = ?`, [id]);
        return { deleted: true };
    }

    // ==========================================
    // Learning Agent ΓÇö User Profiles
    // ==========================================

    async getLearningProfile(userId) {
        const row = await this.get(`SELECT * FROM user_learning_profiles WHERE user_id = ?`, [userId]);
        if (!row) return null;
        return {
            id: row.id,
            userId: row.user_id,
            persona: row.persona,
            goals: safeJsonParse(row.goals, []),
            weakTopics: safeJsonParse(row.weak_topics, []),
            strongTopics: safeJsonParse(row.strong_topics, []),
            preferredDifficulty: row.preferred_difficulty,
            dailyGoalMinutes: row.daily_goal_minutes,
            currentStreak: row.current_streak,
            longestStreak: row.longest_streak,
            lastStudyDate: row.last_study_date,
            trainingStage: row.training_stage || undefined,
            defaultExplanationDepth: row.default_explanation_depth || undefined,
            activeCurriculumId: row.active_curriculum_id != null ? Number(row.active_curriculum_id) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async upsertLearningProfile(userId, data) {
        const now = new Date().toISOString();
        const existing = await this.get(`SELECT id FROM user_learning_profiles WHERE user_id = ?`, [userId]);
        if (existing) {
            const fields = [];
            const values = [];
            const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); values.push(val); } };
            add('persona', data.persona);
            add('goals', data.goals !== undefined ? JSON.stringify(data.goals) : undefined);
            add('weak_topics', data.weakTopics !== undefined ? JSON.stringify(data.weakTopics) : undefined);
            add('strong_topics', data.strongTopics !== undefined ? JSON.stringify(data.strongTopics) : undefined);
            add('preferred_difficulty', data.preferredDifficulty);
            add('daily_goal_minutes', data.dailyGoalMinutes);
            add('current_streak', data.currentStreak);
            add('longest_streak', data.longestStreak);
            add('last_study_date', data.lastStudyDate);
            add('training_stage', data.trainingStage);
            add('default_explanation_depth', data.defaultExplanationDepth);
            add('active_curriculum_id', data.activeCurriculumId);
            fields.push('updated_at = ?');
            values.push(now);
            values.push(existing.id);
            await this.run(`UPDATE user_learning_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
            return this.getLearningProfile(userId);
        }
        await this.run(
            `INSERT INTO user_learning_profiles (user_id, persona, goals, weak_topics, strong_topics, preferred_difficulty, daily_goal_minutes, current_streak, longest_streak, last_study_date, training_stage, default_explanation_depth, active_curriculum_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                data.persona || null,
                JSON.stringify(data.goals || []),
                JSON.stringify(data.weakTopics || []),
                JSON.stringify(data.strongTopics || []),
                data.preferredDifficulty || 'mixed',
                data.dailyGoalMinutes || 15,
                data.currentStreak || 0,
                data.longestStreak || 0,
                data.lastStudyDate || null,
                data.trainingStage || 'finals',
                data.defaultExplanationDepth || 'exam_focus',
                data.activeCurriculumId != null ? data.activeCurriculumId : null,
                now,
                now,
            ]
        );
        return this.getLearningProfile(userId);
    }

    // ==========================================
    // Learning Agent ΓÇö Quiz Attempts
    // ==========================================

    async createQuizAttempt(attempt) {
        const normalizedTopic = this.normalizeTopic(attempt.topic);
        // Stable concept identifier: deterministic hash of (topic, questionType, first 100 chars of question)
        const conceptSeed = attempt.claimKey
            ? `${normalizedTopic}|claim|${attempt.claimKey}`
            : `${normalizedTopic}|${attempt.questionType || ''}|${String(attempt.questionText || '').slice(0, 100)}`;
        const conceptHash = require('crypto').createHash('sha256').update(conceptSeed).digest('hex').slice(0, 32);
        const result = await this.run(
            `INSERT INTO quiz_attempts (user_id, topic, normalized_topic, question_id, question_type, question_text, user_answer, correct_answer, is_correct, time_ms, confidence, source_article_uid, study_run_id, outline_node_id, concept_hash, claim_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                attempt.userId,
                attempt.topic,
                normalizedTopic,
                attempt.questionId,
                attempt.questionType,
                attempt.questionText,
                attempt.userAnswer,
                attempt.correctAnswer,
                attempt.isCorrect ? 1 : 0,
                attempt.timeMs || null,
                attempt.confidence || null,
                attempt.sourceArticleUid || null,
                attempt.studyRunId || null,
                attempt.outlineNodeId || null,
                conceptHash,
                attempt.claimKey || null,
            ]
        );
        return { id: result.id, conceptHash, ...attempt };
    }

    async getQuizAttempts({ userId, topic = '', limit = 50, offset = 0 } = {}) {
        const normalized = topic ? this.normalizeTopic(topic) : '';
        const rows = await this.all(
            `SELECT * FROM quiz_attempts WHERE user_id = ? AND (? = '' OR normalized_topic = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, normalized, normalized, limit, offset]
        );
        return rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            topic: r.topic,
            normalizedTopic: r.normalized_topic,
            questionId: r.question_id,
            questionType: r.question_type,
            questionText: r.question_text,
            userAnswer: r.user_answer,
            correctAnswer: r.correct_answer,
            isCorrect: r.is_correct === 1,
            timeMs: r.time_ms,
            confidence: r.confidence,
            sourceArticleUid: r.source_article_uid,
            studyRunId: r.study_run_id,
            outlineNodeId: r.outline_node_id,
            conceptHash: r.concept_hash || null,
            claimKey: r.claim_key || null,
            createdAt: r.created_at,
        }));
    }

    async getRepeatedMisconceptions(userId, { limit = 10, minAttempts = 2 } = {}) {
        const rows = await this.all(
            `SELECT concept_hash, question_type, question_text, normalized_topic,
                    COUNT(*) AS total_attempts,
                    SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count
             FROM quiz_attempts
             WHERE user_id = ? AND concept_hash IS NOT NULL
             GROUP BY concept_hash
             HAVING total_attempts >= ? AND wrong_count > 0
             ORDER BY wrong_count DESC, total_attempts DESC
             LIMIT ?`,
            [userId, minAttempts, limit]
        );
        return rows.map((r) => ({
            conceptHash: r.concept_hash,
            questionType: r.question_type,
            questionText: r.question_text,
            topic: r.normalized_topic,
            totalAttempts: Number(r.total_attempts),
            wrongCount: Number(r.wrong_count),
            errorRate: Number(r.wrong_count) / Number(r.total_attempts),
        }));
    }

    async getQuizAttemptStats(userId, topic) {
        const normalized = this.normalizeTopic(topic);
        const rows = await this.all(
            `SELECT question_type, is_correct, created_at FROM quiz_attempts WHERE user_id = ? AND normalized_topic = ? ORDER BY created_at DESC`,
            [userId, normalized]
        );
        return rows;
    }

    // ==========================================
    // Adaptive topic memory (search + quiz weak nodes)
    // ==========================================

    _mergeWeightedUids(existingArr, uidList) {
        const map = new Map();
        for (const e of existingArr || []) {
            if (e && e.uid) {
                map.set(String(e.uid), { uid: String(e.uid), w: Number(e.w || 1), at: e.at || null });
            }
        }
        const now = new Date().toISOString();
        for (const uid of uidList || []) {
            if (!uid) continue;
            const key = String(uid);
            const cur = map.get(key);
            if (cur) {
                cur.w += 1;
                cur.at = now;
            } else {
                map.set(key, { uid: key, w: 1, at: now });
            }
        }
        return [...map.values()].sort((a, b) => b.w - a.w).slice(0, 24);
    }

    _memoryTierFromScore(score) {
        const s = Number(score) || 0;
        if (s < 0.28) return 'sparse';
        if (s < 0.62) return 'building';
        return 'strong';
    }

    _computeTopicMemoryScores(row, masteryRow) {
        const searchCount = Number(row.search_count || 0);
        const top = safeJsonParse(row.top_article_uids, []);
        const saved = safeJsonParse(row.saved_article_uids, []);
        const weak = safeJsonParse(row.weak_outline_node_ids, []);
        const masteryOverall = masteryRow ? Number(masteryRow.overall_score || 0) : 0;
        const attempts = masteryRow ? Number(masteryRow.attempts_count || 0) : 0;
        const memoryScore = Math.min(
            1,
            0.18 * Math.min(1, searchCount / 10) +
                0.22 * Math.min(1, top.length / 6) +
                0.12 * Math.min(1, saved.length / 8) +
                0.2 * Math.min(1, attempts / 24) +
                0.18 * Math.min(1, masteryOverall / 100) +
                0.1 * Math.min(1, weak.length / 8)
        );
        return { memoryScore, memoryTier: this._memoryTierFromScore(memoryScore) };
    }

    mapUserTopicMemoryRow(row) {
        if (!row) return null;
        const top = safeJsonParse(row.top_article_uids, []);
        const saved = safeJsonParse(row.saved_article_uids, []);
        const weakOutlineNodeIds = safeJsonParse(row.weak_outline_node_ids, []);
        return {
            userId: row.user_id,
            normalizedTopic: row.normalized_topic,
            displayTopic: row.display_topic,
            searchCount: Number(row.search_count || 0),
            lastSearchAt: row.last_search_at,
            topArticles: top,
            savedArticles: saved,
            weakOutlineNodeIds,
            memoryScore: Number(row.memory_score || 0),
            memoryTier: row.memory_tier || 'sparse',
            topPaperCount: top.length,
            savedPaperCount: saved.length,
            promotedProposalAt: row.promoted_proposal_at || null,
            updatedAt: row.updated_at,
        };
    }

    async getUserTopicMemory(userId, topicOrNormalized) {
        if (!this.kysely || !userId || !topicOrNormalized) return null;
        const normalized = this.normalizeTopic(topicOrNormalized);
        if (!normalized) return null;
        const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        if (!row) {
            return {
                userId,
                normalizedTopic: normalized,
                displayTopic: String(topicOrNormalized || '').trim().slice(0, 240),
                searchCount: 0,
                lastSearchAt: null,
                topArticles: [],
                savedArticles: [],
                weakOutlineNodeIds: [],
                memoryScore: 0,
                memoryTier: 'sparse',
                topPaperCount: 0,
                savedPaperCount: 0,
                promotedProposalAt: null,
                updatedAt: null,
            };
        }
        return this.mapUserTopicMemoryRow(row);
    }

    async listUserTopicMemory(userId, { limit = 50, offset = 0 } = {}) {
        if (!this.kysely || !userId) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
        const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
        const rows = await this.all(
            `SELECT * FROM user_topic_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [userId, safeLimit, safeOffset]
        );
        return rows.map((r) => this.mapUserTopicMemoryRow(r));
    }

    async _finalizeUserTopicMemory(userId, normalized) {
        if (!userId || !normalized) return null;
        const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        if (!row) return null;
        const masteryRow = await this.get(`SELECT overall_score, attempts_count FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        const { memoryScore, memoryTier } = this._computeTopicMemoryScores(row, masteryRow);
        await this.run(`UPDATE user_topic_memory SET memory_score = ?, memory_tier = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            memoryScore,
            memoryTier,
            new Date().toISOString(),
            userId,
            normalized,
        ]);
        const refreshed = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        await this.maybePromoteAdaptiveTopicProposal(userId, refreshed).catch(() => null);
        return this.mapUserTopicMemoryRow(refreshed);
    }

    async maybePromoteAdaptiveTopicProposal(userId, row) {
        if (!row || !this.kysely || typeof this.createTopicKnowledgeProposal !== 'function') return null;
        if (row.memory_tier !== 'strong') return null;
        if (row.promoted_proposal_at) return null;
        if (Number(row.search_count || 0) < 5) return null;
        const top = safeJsonParse(row.top_article_uids, []);
        if (top.length < 3) return null;
        const displayTopic = String(row.display_topic || row.normalized_topic || '').trim().slice(0, 240);
        if (!displayTopic) return null;
        const pending = await this.listTopicKnowledgeProposals({ topic: displayTopic, status: 'pending_review', limit: 5 });
        if (pending.total > 0) return null;
        const existingTk = await this.getTopicKnowledge(displayTopic).catch(() => null);
        if (existingTk && existingTk.status === 'human_reviewed') return null;

        const sourceArticles = top.slice(0, 8).map((t, i) => ({
            uid: t.uid,
            title: `Tracked evidence ${i + 1}`,
            sourceIndex: i + 1,
        }));
        const knowledge = {
            teachingPoints: top.slice(0, 5).map((t, i) => ({
                claim: `Repeated learner focus on tracked source ${i + 1} (${String(t.uid).slice(0, 18)}ΓÇª).`,
                sourceIndices: [i + 1],
            })),
            mentorMessage: `Adaptive memory draft from ${row.search_count} searches and ${top.length} tracked papers ΓÇö curator review required.`,
        };
        const prop = await this.createTopicKnowledgeProposal(displayTopic, {
            knowledge,
            sourceArticles,
            reason: `adaptive_topic_memory:auto user=${userId}`,
            confidence: Math.min(0.75, 0.42 + Number(row.memory_score || 0) * 0.35),
            createdBy: userId,
        });
        if (prop) {
            await this.run(`UPDATE user_topic_memory SET promoted_proposal_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
                new Date().toISOString(),
                userId,
                row.normalized_topic,
            ]);
        }
        return prop;
    }

    async recordUserTopicSearchSignal(userId, displayQuery, articleUidList = []) {
        if (!this.kysely || !userId || !displayQuery) return null;
        const normalized = this.normalizeTopic(displayQuery);
        if (!normalized) return null;
        const now = new Date().toISOString();
        const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        const mergedTop = this._mergeWeightedUids(row ? safeJsonParse(row.top_article_uids, []) : [], articleUidList);
        const searchCount = row ? Number(row.search_count || 0) + 1 : 1;
        const display_topic = String(displayQuery).trim().slice(0, 240);
        const savedJson = row ? row.saved_article_uids || '[]' : '[]';
        const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
        const created = row ? row.created_at : now;

        await this.run(
            `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
             ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
               search_count = excluded.search_count,
               last_search_at = excluded.last_search_at,
               display_topic = excluded.display_topic,
               top_article_uids = excluded.top_article_uids,
               updated_at = excluded.updated_at`,
            [userId, normalized, display_topic, searchCount, now, JSON.stringify(mergedTop), savedJson, weakJson, created, now]
        );
        return this._finalizeUserTopicMemory(userId, normalized);
    }

    async recordUserTopicSavedArticleSignal(userId, displayTopic, articleUid) {
        if (!this.kysely || !userId || !displayTopic || !articleUid) return null;
        const normalized = this.normalizeTopic(displayTopic);
        if (!normalized) return null;
        const now = new Date().toISOString();
        const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        const mergedSaved = this._mergeWeightedUids(row ? safeJsonParse(row.saved_article_uids, []) : [], [articleUid]);
        const display_topic = String(displayTopic).trim().slice(0, 240);
        const topJson = row ? row.top_article_uids || '[]' : '[]';
        const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
        const searchCount = row ? Number(row.search_count || 0) : 0;
        const created = row ? row.created_at : now;

        await this.run(
            `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
             ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
               saved_article_uids = excluded.saved_article_uids,
               display_topic = CASE WHEN LENGTH(excluded.display_topic) > LENGTH(COALESCE(user_topic_memory.display_topic, '')) THEN excluded.display_topic ELSE user_topic_memory.display_topic END,
               updated_at = excluded.updated_at`,
            [userId, normalized, display_topic, searchCount, topJson, JSON.stringify(mergedSaved), weakJson, created, now]
        );
        return this._finalizeUserTopicMemory(userId, normalized);
    }

    async mergeUserTopicWeakOutlineNodes(userId, topicDisplay, attempts = []) {
        if (!this.kysely || !userId || !topicDisplay) return null;
        const normalized = this.normalizeTopic(topicDisplay);
        if (!normalized) return null;
        const weakIds = attempts.filter((a) => a && !a.isCorrect && a.outlineNodeId).map((a) => String(a.outlineNodeId));
        if (weakIds.length === 0) {
            const exists = await this.get(`SELECT 1 AS x FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
            if (exists) return this._finalizeUserTopicMemory(userId, normalized);
            return null;
        }

        const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        const existing = new Set(row ? safeJsonParse(row.weak_outline_node_ids, []) : []);
        for (const id of weakIds) existing.add(id);
        const arr = [...existing].slice(-28);
        const now = new Date().toISOString();

        if (!row) {
            await this.run(
                `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
                 VALUES (?, ?, ?, 0, NULL, '[]', '[]', ?, 0, 'sparse', NULL, ?, ?)`,
                [userId, normalized, String(topicDisplay).trim().slice(0, 240), JSON.stringify(arr), now, now]
            );
        } else {
            await this.run(`UPDATE user_topic_memory SET weak_outline_node_ids = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
                JSON.stringify(arr),
                now,
                userId,
                normalized,
            ]);
        }
        return this._finalizeUserTopicMemory(userId, normalized);
    }

    async listStrongMemoryUserTopicsForDrift({ limit = 80 } = {}) {
        if (!this.kysely) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
        return this.all(
            `SELECT user_id, normalized_topic, display_topic, top_article_uids, saved_article_uids, updated_at
             FROM user_topic_memory
             WHERE memory_tier = 'strong'
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        );
    }

    async hasRecentProactiveEvidenceAlertForArticle(userId, normalizedTopic, landmarkArticleUid, withinDays = 90) {
        if (!this.kysely || !userId || !normalizedTopic || !landmarkArticleUid) return false;
        const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
        const row = await this.get(
            `SELECT 1 AS x FROM proactive_evidence_alerts
             WHERE user_id = ? AND normalized_topic = ? AND landmark_article_uid = ? AND created_at > ?
             LIMIT 1`,
            [userId, normalizedTopic, landmarkArticleUid, cutoff]
        );
        return Boolean(row);
    }

    async insertProactiveEvidenceAlert({
        userId,
        normalizedTopic,
        displayTopic = null,
        title,
        summary = null,
        payload = null,
        landmarkArticleUid = null,
        alertKind = 'knowledge_drift',
    } = {}) {
        if (!this.kysely || !userId || !normalizedTopic || !title) return null;
        const now = new Date().toISOString();
        const payloadJson = payload && typeof payload === 'object' ? JSON.stringify(payload) : null;
        const result = await this.run(
            `INSERT INTO proactive_evidence_alerts (
                user_id, normalized_topic, display_topic, alert_kind, title, summary, payload_json, landmark_article_uid, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                normalizedTopic,
                displayTopic ? String(displayTopic).slice(0, 240) : null,
                String(alertKind || 'knowledge_drift').slice(0, 64),
                String(title).slice(0, 500),
                summary ? String(summary).slice(0, 4000) : null,
                payloadJson,
                landmarkArticleUid ? String(landmarkArticleUid).slice(0, 256) : null,
                now,
            ]
        );
        const insertId = result.lastID || result.id;
        const row = insertId
            ? await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ?', [insertId])
            : await this.get(
                  'SELECT * FROM proactive_evidence_alerts WHERE user_id = ? ORDER BY id DESC LIMIT 1',
                  [userId]
              );
        return row ? this.mapProactiveEvidenceAlertRow(row) : null;
    }

    mapProactiveEvidenceAlertRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            userId: row.user_id,
            normalizedTopic: row.normalized_topic,
            displayTopic: row.display_topic || null,
            alertKind: row.alert_kind || 'knowledge_drift',
            title: row.title,
            summary: row.summary || null,
            payload: safeJsonParse(row.payload_json, null),
            landmarkArticleUid: row.landmark_article_uid || null,
            readAt: row.read_at || null,
            createdAt: row.created_at,
        };
    }

    async listProactiveEvidenceAlertsForUser(userId, { limit = 40, unreadOnly = false, normalizedTopic = '' } = {}) {
        if (!this.kysely || !userId) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 40, 1), 100);
        const nt = normalizedTopic ? this.normalizeTopic(normalizedTopic) : '';
        const clauses = ['user_id = ?'];
        const params = [userId];
        if (unreadOnly) clauses.push('read_at IS NULL');
        if (nt) {
            clauses.push('normalized_topic = ?');
            params.push(nt);
        }
        params.push(safeLimit);
        const rows = await this.all(
            `SELECT * FROM proactive_evidence_alerts
             WHERE ${clauses.join(' AND ')}
             ORDER BY created_at DESC
             LIMIT ?`,
            params
        );
        return rows.map((r) => this.mapProactiveEvidenceAlertRow(r)).filter(Boolean);
    }

    async markProactiveEvidenceAlertRead(alertId, userId) {
        if (!this.kysely || !alertId || !userId) return null;
        const now = new Date().toISOString();
        await this.run(
            `UPDATE proactive_evidence_alerts SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`,
            [now, Number(alertId), userId]
        );
        const row = await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ? AND user_id = ?', [
            Number(alertId),
            userId,
        ]);
        return row ? this.mapProactiveEvidenceAlertRow(row) : null;
    }

    // ==========================================
    // Cross-user bouquet signals (topic learning)
    // ==========================================

    // Called after every search with the ranked papers from the evidence bouquet.
    // Aggregates across all users: which articles consistently surface for a topic.
    async recordBouquetSignals(displayTopic, papers = []) {
        if (!this.kysely || !displayTopic || !papers.length) return;
        const normalized = this.normalizeTopic(displayTopic);
        if (!normalized) return;
        const display = String(displayTopic).trim().slice(0, 240);
        const now = new Date().toISOString();
        await this.run('BEGIN');
        try {
            for (const p of papers) {
                if (!p?.uid) continue;
                const uid = String(p.uid);
                const archetype = p.archetype ? String(p.archetype) : null;
                const score = Number(p.compositeScore || 0);
                await this.run(
                    `INSERT INTO topic_bouquet_signals
                        (normalized_topic, display_topic, article_uid, archetype, composite_score, signal_count, last_seen_at, created_at)
                     VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                     ON CONFLICT(normalized_topic, article_uid) DO UPDATE SET
                       signal_count = signal_count + 1,
                       composite_score = (composite_score * signal_count + excluded.composite_score) / (signal_count + 1),
                       archetype = COALESCE(excluded.archetype, topic_bouquet_signals.archetype),
                   display_topic = excluded.display_topic,
                   last_seen_at = excluded.last_seen_at`,
                    [normalized, display, uid, archetype, score, now, now]
                );
            }
            await this.run('COMMIT');
        } catch (err) {
            await this.run('ROLLBACK').catch(() => {});
            throw err;
        }
    }

    // Returns the most consistently-ranked article UIDs for a topic, ordered by signal_count desc.
    async getTopBouquetArticlesForTopic(normalizedTopic, limit = 8) {
        if (!this.kysely || !normalizedTopic) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 8, 1), 30);
        const rows = await this.all(
            `SELECT article_uid AS uid, archetype, composite_score, signal_count
             FROM topic_bouquet_signals
             WHERE normalized_topic = ?
             ORDER BY signal_count DESC, composite_score DESC
             LIMIT ?`,
            [normalizedTopic, safeLimit]
        );
        return rows.map((r) => ({
            uid: r.uid,
            archetype: r.archetype,
            compositeScore: Number(r.composite_score || 0),
            signalCount: Number(r.signal_count || 0),
        }));
    }

    // Builds a loose topic graph edge by shared high-signal bouquet articles.
    // No persistent graph table: edges are derived from compact bouquet signals.
    async getRelatedBouquetTopicsForTopic(normalizedTopic, { limit = 5, minSharedArticles = 2 } = {}) {
        if (!this.kysely || !normalizedTopic) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 5, 1), 20);
        const safeMinShared = Math.min(Math.max(parseInt(String(minSharedArticles), 10) || 2, 1), 10);
        const rows = await this.all(
            `SELECT
                b.normalized_topic,
                COALESCE(MAX(b.display_topic), b.normalized_topic) AS display_topic,
                COUNT(DISTINCT b.article_uid) AS shared_articles,
                SUM(MIN(a.signal_count, b.signal_count)) AS shared_signal_strength,
                AVG((a.composite_score + b.composite_score) / 2.0) AS avg_composite_score
             FROM topic_bouquet_signals a
             JOIN topic_bouquet_signals b ON b.article_uid = a.article_uid
             WHERE a.normalized_topic = ?
               AND b.normalized_topic <> a.normalized_topic
             GROUP BY b.normalized_topic
             HAVING shared_articles >= ?
             ORDER BY shared_articles DESC, shared_signal_strength DESC, avg_composite_score DESC
             LIMIT ?`,
            [normalizedTopic, safeMinShared, safeLimit]
        );
        return rows.map((r) => ({
            normalizedTopic: r.normalized_topic,
            displayTopic: r.display_topic || r.normalized_topic,
            sharedArticles: Number(r.shared_articles || 0),
            sharedSignalStrength: Number(r.shared_signal_strength || 0),
            averageCompositeScore: Number(r.avg_composite_score || 0),
        }));
    }

    async getClusterBouquetArticlesForTopic(normalizedTopic, { topicLimit = 5, articleLimit = 12, minSharedArticles = 2 } = {}) {
        if (!this.kysely || !normalizedTopic) return [];
        const related = await this.getRelatedBouquetTopicsForTopic(normalizedTopic, {
            limit: topicLimit,
            minSharedArticles,
        });
        const topics = [normalizedTopic, ...related.map((t) => t.normalizedTopic)].filter(Boolean);
        const placeholders = topics.map(() => '?').join(',');
        const safeArticleLimit = Math.min(Math.max(parseInt(String(articleLimit), 10) || 12, 1), 40);
        const rows = await this.all(
            `SELECT
                article_uid AS uid,
                COUNT(DISTINCT normalized_topic) AS topic_count,
                SUM(signal_count) AS total_signal_count,
                AVG(composite_score) AS avg_composite_score,
                MAX(last_seen_at) AS last_seen_at
             FROM topic_bouquet_signals
             WHERE normalized_topic IN (${placeholders})
             GROUP BY article_uid
             ORDER BY topic_count DESC, total_signal_count DESC, avg_composite_score DESC
             LIMIT ?`,
            [...topics, safeArticleLimit]
        );
        return rows.map((r) => ({
            uid: r.uid,
            topicCount: Number(r.topic_count || 0),
            totalSignalCount: Number(r.total_signal_count || 0),
            averageCompositeScore: Number(r.avg_composite_score || 0),
            lastSeenAt: r.last_seen_at || null,
        }));
    }

    // Returns topics that are frequently searched (high signal activity) but have
    // decayed or absent topic_knowledge ΓÇö candidates for background refresh.
    async getStaleTopicsForRefresh({ minSignalCount = 3, maxAgeDays = 90, minPriorityScore = 0.18, limit = 10 } = {}) {
        if (!this.kysely) return [];
        const { topicRefreshPriority } = require('../server/services/topicKnowledgeFreshness');
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
        const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const oldCutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
        const rows = await this.all(
            `SELECT
                s.normalized_topic,
                s.display_topic,
                SUM(s.signal_count) AS total_signals,
                COUNT(DISTINCT s.article_uid) AS distinct_articles,
                tk.id AS topic_knowledge_id,
                tk.topic,
                tk.knowledge,
                tk.confidence,
                tk.last_refreshed_at,
                tk.status
             FROM topic_bouquet_signals s
             LEFT JOIN topic_knowledge tk ON tk.normalized_topic = s.normalized_topic
             WHERE s.last_seen_at > ?
             GROUP BY s.normalized_topic
             HAVING total_signals >= ?
               AND (tk.id IS NULL OR tk.last_refreshed_at IS NULL OR tk.last_refreshed_at < ?)
               AND (tk.status IS NULL OR tk.status NOT IN ('locked', 'human_reviewed', 'verified'))
             ORDER BY total_signals DESC
             LIMIT ?`,
            [recentCutoff, minSignalCount, oldCutoff, Math.max(safeLimit * 4, safeLimit)]
        );
        return rows
            .map((r) => {
                const totalSignals = Number(r.total_signals || 0);
                const distinctArticles = Number(r.distinct_articles || 0);
                const freshness = topicRefreshPriority({
                    confidence: Number(r.confidence || 0),
                    refreshedAt: r.last_refreshed_at,
                    topic: r.topic || r.display_topic || r.normalized_topic,
                    knowledge: safeJsonParse(r.knowledge, {}),
                    totalSignals,
                    distinctArticles,
                    hasKnowledge: Boolean(r.topic_knowledge_id),
                });
                return {
                    normalizedTopic: r.normalized_topic,
                    displayTopic: r.display_topic || r.topic || r.normalized_topic,
                    totalSignals,
                    distinctArticles,
                    lastRefreshedAt: r.last_refreshed_at || null,
                    status: r.status || null,
                    confidence: Number(r.confidence || 0),
                    effectiveConfidence: freshness.effectiveConfidence,
                    confidenceDecay: freshness.confidenceDecay,
                    volatility: freshness.volatility,
                    priorityScore: freshness.priorityScore,
                    priorityReason: freshness.reason,
                };
            })
            .filter((r) => r.priorityScore >= minPriorityScore || !r.lastRefreshedAt)
            .sort((a, b) => b.priorityScore - a.priorityScore || b.totalSignals - a.totalSignals)
            .slice(0, safeLimit);
    }

    /**
     * Find "Strong Memory" topics that need proactive refresh.
     *
     * Strong-memory topics are those with high-confidence or human-reviewed knowledge
     * that have active community engagement (clicks, saves, dwell time) but haven't
     * been refreshed recently. These get periodic delta-extraction so the knowledge
     * stays current with what the community is actively reading.
     *
     * Results are weighted by aggregated community engagement score + dwell time.
     */
    async getStrongMemoryTopicsForRefresh({ minEngagementScore = 5, minRefreshAgeDays = 14, limit = 5 } = {}) {
        if (!this.kysely) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 5, 1), 20);
        const engagementCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const refreshCutoff = new Date(Date.now() - minRefreshAgeDays * 24 * 60 * 60 * 1000).toISOString();

        const rows = await this.all(
            `SELECT
                tk.normalized_topic,
                tk.topic AS display_topic,
                tk.knowledge,
                tk.confidence,
                tk.status,
                tk.last_refreshed_at,
                COUNT(DISTINCT s.id) AS search_count,
                COUNT(DISTINCT i.article_uid) AS engaged_article_count,
                SUM(CASE
                    WHEN i.was_saved = 1 THEN 5
                    WHEN i.dwell_time_ms >= 60000 THEN 3
                    WHEN i.was_clicked = 1 THEN 2
                    WHEN i.dwell_time_ms >= 30000 THEN 1
                    ELSE 0
                END) AS community_engagement_score,
                COALESCE(SUM(i.dwell_time_ms), 0) AS total_dwell_ms
             FROM topic_knowledge tk
             JOIN searches s ON s.normalized_topic = tk.normalized_topic
             JOIN search_result_impressions i ON i.search_id = s.id
             WHERE (tk.confidence >= 0.8 OR tk.status = 'human_reviewed')
               AND s.created_at > ?
               AND (tk.last_refreshed_at IS NULL OR tk.last_refreshed_at < ?)
               AND (tk.status IS NULL OR tk.status NOT IN ('locked'))
             GROUP BY tk.normalized_topic
             HAVING community_engagement_score >= ?
             ORDER BY community_engagement_score DESC, total_dwell_ms DESC
             LIMIT ?`,
            [engagementCutoff, refreshCutoff, minEngagementScore, safeLimit]
        );

        return rows.map((r) => ({
            normalizedTopic: r.normalized_topic,
            displayTopic: r.display_topic || r.normalized_topic,
            confidence: Number(r.confidence || 0),
            status: r.status || null,
            lastRefreshedAt: r.last_refreshed_at || null,
            searchCount: Number(r.search_count || 0),
            engagedArticleCount: Number(r.engaged_article_count || 0),
            communityEngagementScore: Number(r.community_engagement_score || 0),
            totalDwellMs: Number(r.total_dwell_ms || 0),
            memoryTier: r.status === 'human_reviewed' ? 'human_reviewed' : 'high_confidence',
        }));
    }

    /**
     * Get community-engaged article UIDs for a specific topic.
     * Used by the strong-memory refresh worker to seed bouquet selection
     * with what the community is actually clicking and saving.
     */
    async getCommunityEngagedArticlesForTopic(normalizedTopic, limit = 12) {
        if (!this.kysely || !normalizedTopic) return [];
        return this.all(
            `SELECT
                i.article_uid AS uid,
                SUM(CASE
                    WHEN i.was_saved = 1 THEN 5
                    WHEN i.dwell_time_ms >= 60000 THEN 3
                    WHEN i.was_clicked = 1 THEN 2
                    WHEN i.dwell_time_ms >= 30000 THEN 1
                    ELSE 0
                END) AS engagement_score,
                COUNT(*) AS impression_count,
                COALESCE(SUM(i.dwell_time_ms), 0) AS total_dwell_ms
             FROM search_result_impressions i
             JOIN searches s ON s.id = i.search_id
             WHERE s.normalized_topic = ?
               AND (i.was_clicked = 1 OR i.was_saved = 1 OR i.dwell_time_ms >= 30000)
             GROUP BY i.article_uid
             ORDER BY engagement_score DESC, total_dwell_ms DESC, impression_count DESC
             LIMIT ?`,
            [normalizedTopic, limit]
        );
    }

    // Record per-topic intent distribution so the refresh scheduler can weight
    // teaching points toward what users actually search for on each topic.
    async recordTopicDemandSignal(sanitizedTopic, displayTopic, intent = 'general') {
        if (!this.kysely || !sanitizedTopic) return;
        const normalized = this.normalizeTopic(sanitizedTopic);
        if (!normalized) return;
        const display = String(displayTopic || sanitizedTopic).trim().slice(0, 240);
        const safeIntent = String(intent || 'general').slice(0, 40);
        const now = new Date().toISOString();
        await this.run(
            `INSERT INTO topic_demand_signals (normalized_topic, display_topic, intent, search_count, last_seen_at, created_at)
             VALUES (?, ?, ?, 1, ?, ?)
             ON CONFLICT(normalized_topic, intent) DO UPDATE SET
               search_count = search_count + 1,
               display_topic = excluded.display_topic,
               last_seen_at = excluded.last_seen_at`,
            [normalized, display, safeIntent, now, now]
        );
    }

    // Returns the intent distribution for a topic: which intents users search with most.
    // Used by the refresh scheduler to emphasise the right archetype types in AI extraction.
    async getTopicIntentDistribution(normalizedTopic) {
        if (!this.kysely || !normalizedTopic) return [];
        const rows = await this.all(
            `SELECT intent, search_count FROM topic_demand_signals WHERE normalized_topic = ? ORDER BY search_count DESC`,
            [normalizedTopic]
        );
        return rows.map((r) => ({ intent: r.intent, count: Number(r.search_count || 0) }));
    }

    // If the raw query is a new phrasing for an already-known topic, register it as an alias
    // so future searches with this phrasing resolve to the same knowledge entry.
    async maybeRegisterTopicAlias(sanitizedTopic, rawQuery) {
        if (!this.kysely || !sanitizedTopic || !rawQuery) return;
        const normalized = this.normalizeTopic(sanitizedTopic);
        const rawNormalized = this.normalizeTopic(rawQuery);
        if (!normalized || !rawNormalized || normalized === rawNormalized) return;
        // Only register as alias if topic_knowledge already exists for the canonical form
        const existing = await this.getTopicKnowledge(normalized).catch(() => null);
        if (!existing) return;
        await this.mergeTopicKnowledgeAliases(normalized, [rawQuery], {
            createIfMissing: false,
            reason: 'casual_search_alias',
        }).catch(() => {});
    }

    // ==========================================
    // User Interactions (Recommendation Learning)
    // ==========================================

    async recordUserInteraction({ userId, sessionId, articleId, interactionType = 'view', dwellTime = null }) {
        if (!this.kysely || (!userId && !sessionId) || !articleId) return null;
        const now = new Date().toISOString();
        return this.kysely
            .insertInto('user_interactions')
            .values({
                user_id: userId || null,
                session_id: sessionId || null,
                article_id: String(articleId),
                interaction_type: String(interactionType),
                dwell_time_ms: dwellTime != null ? Number(dwellTime) : null,
                created_at: now,
            })
            .execute();
    }

    async getUserInteractions(userId, { limit = 50, days = 30 } = {}) {
        if (!this.kysely || !userId) return [];
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        return this.kysely
            .selectFrom('user_interactions')
            .selectAll()
            .where('user_id', '=', userId)
            .where('created_at', '>=', since)
            .orderBy('created_at', 'desc')
            .limit(Math.min(Number(limit) || 50, 200))
            .execute();
    }

    // ==========================================
    // Search Result Feedback
    // ==========================================

    async recordSearchResultFeedback({ userId, sessionId, searchId, articleUid, feedbackType, reason = null }) {
        if (!this.kysely || (!userId && !sessionId) || !articleUid || !feedbackType) return null;
        const now = new Date().toISOString();
        return this.kysely
            .insertInto('search_result_feedback')
            .values({
                search_id: searchId != null ? Number(searchId) : null,
                user_id: userId || null,
                session_id: sessionId || null,
                article_uid: String(articleUid),
                feedback_type: String(feedbackType),
                reason: reason ? String(reason).slice(0, 500) : null,
                created_at: now,
            })
            .execute();
    }

    async getSearchResultFeedbackForUser(userId, articleUid) {
        if (!this.kysely || !userId || !articleUid) return null;
        return this.kysely
            .selectFrom('search_result_feedback')
            .selectAll()
            .where('user_id', '=', userId)
            .where('article_uid', '=', String(articleUid))
            .orderBy('created_at', 'desc')
            .limit(1)
            .executeTakeFirst();
    }

    async listSearchResultFeedbackForUser(userId, { limit = 200, days = 90 } = {}) {
        if (!this.kysely || !userId) return [];
        const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();
        return this.kysely
            .selectFrom('search_result_feedback')
            .selectAll()
            .where('user_id', '=', userId)
            .where('created_at', '>=', since)
            .orderBy('created_at', 'desc')
            .limit(Math.min(Math.max(Number(limit) || 200, 1), 500))
            .execute();
    }

    // ==========================================
    // Search Result Impressions (Implicit Negative Feedback)
    // ==========================================

    async recordSearchImpressions(searchId, sessionId, impressions) {
        if (!this.kysely || !searchId || !Array.isArray(impressions) || impressions.length === 0) return;
        const now = new Date().toISOString();
        const values = impressions.map((imp) => ({
            search_id: Number(searchId),
            session_id: sessionId || null,
            article_uid: String(imp.articleUid),
            position: Number(imp.position),
            was_clicked: 0,
            was_saved: 0,
            dwell_time_ms: null,
            created_at: now,
        }));
        // Batch insert in chunks of 20 to avoid param limits
        const chunkSize = 20;
        for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize);
            await this.kysely.insertInto('search_result_impressions').values(chunk).execute();
        }
    }

    async updateSearchImpressionInteraction(searchId, articleUid, { wasClicked, wasSaved, dwellTimeMs } = {}) {
        if (!this.kysely || !searchId || !articleUid) return;
        const updates = {};
        if (wasClicked !== undefined) updates.was_clicked = wasClicked ? 1 : 0;
        if (wasSaved !== undefined) updates.was_saved = wasSaved ? 1 : 0;
        if (dwellTimeMs !== undefined) updates.dwell_time_ms = Number(dwellTimeMs);
        if (Object.keys(updates).length === 0) return;
        await this.kysely
            .updateTable('search_result_impressions')
            .set(updates)
            .where('search_id', '=', Number(searchId))
            .where('article_uid', '=', String(articleUid))
            .execute();
    }

    async getImpressionsForSearch(searchId, { limit = 20 } = {}) {
        if (!this.kysely || !searchId) return [];
        return this.kysely
            .selectFrom('search_result_impressions')
            .selectAll()
            .where('search_id', '=', Number(searchId))
            .orderBy('position', 'asc')
            .limit(Math.min(Number(limit) || 20, 100))
            .execute();
    }

    async getRecentImpressions(sessionId, { days = 30, limit = 200 } = {}) {
        if (!this.kysely || !sessionId) return [];
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        return this.kysely
            .selectFrom('search_result_impressions')
            .selectAll()
            .where('session_id', '=', sessionId)
            .where('created_at', '>=', since)
            .orderBy('created_at', 'desc')
            .limit(Math.min(Number(limit) || 200, 500))
            .execute();
    }

    async getSearchResultFeedbackStats(articleUid, { days = 90 } = {}) {
        if (!this.kysely || !articleUid) return { helpful: 0, notHelpful: 0 };
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const rows = await this.kysely
            .selectFrom('search_result_feedback')
            .select(({ fn }) => ['feedback_type', fn.count('id').as('count')])
            .where('article_uid', '=', String(articleUid))
            .where('created_at', '>=', since)
            .groupBy('feedback_type')
            .execute();
        const stats = { helpful: 0, notHelpful: 0 };
        for (const row of rows) {
            if (row.feedback_type === 'helpful') stats.helpful = Number(row.count);
            if (row.feedback_type === 'not_helpful') stats.notHelpful = Number(row.count);
        }
        return stats;
    }

    /**
     * Aggregates top engaged articles across all users for a topic.
     * Used to improve agent suggestions.
     */
    async getGlobalEngagedArticles(normalizedTopic, limit = 5) {
        if (!this.kysely || !normalizedTopic) return [];
        return this.all(
            `SELECT sri.article_uid, COUNT(*) as interaction_count,
                    SUM(CASE
                        WHEN sri.was_saved = 1 THEN (CASE WHEN u.role IN ('pro','enterprise','admin') THEN 15 ELSE 5 END)
                        WHEN sri.dwell_time_ms >= 60000 THEN (CASE WHEN u.role IN ('pro','enterprise','admin') THEN 9 ELSE 3 END)
                        WHEN sri.was_clicked = 1 THEN (CASE WHEN u.role IN ('pro','enterprise','admin') THEN 4 ELSE 2 END)
                        WHEN sri.dwell_time_ms >= 30000 THEN (CASE WHEN u.role IN ('pro','enterprise','admin') THEN 3 ELSE 1 END)
                        ELSE 0
                    END) as weighted_score,
                    COALESCE(SUM(sri.dwell_time_ms), 0) as total_dwell_ms
             FROM search_result_impressions sri
             JOIN searches s ON s.id = sri.search_id
             LEFT JOIN users u ON u.id = s.user_id
             WHERE s.normalized_topic = ?
               AND (sri.was_clicked = 1 OR sri.was_saved = 1 OR sri.dwell_time_ms >= 30000)
             GROUP BY sri.article_uid
             ORDER BY weighted_score DESC, total_dwell_ms DESC
             LIMIT ?`,
            [normalizedTopic, limit]
        );
    }

    /**
     * Finds topics that also cite any of the given article UIDs.
     * Used for cross-topic synapse detection (e.g. Sepsis Γåö AKI bridges).
     * Returns one row per (articleUid, topic) pair so callers know exactly which article bridges where.
     */
    async findSynapseTopicsForArticleUids(articleUids, excludeNormalizedTopic = '') {
        if (!this.kysely || !Array.isArray(articleUids) || articleUids.length === 0) return [];
        const out = [];
        for (const uid of articleUids.slice(0, 10)) {
            const safeUid = String(uid);
            const sql = this.isPostgres
                ? `SELECT topic, normalized_topic
                   FROM topic_knowledge
                   WHERE normalized_topic != $1
                     AND EXISTS (
                       SELECT 1 FROM jsonb_array_elements(source_articles::jsonb) elem
                       WHERE elem->>'uid' = $2
                     )
                   ORDER BY updated_at DESC
                   LIMIT 3`
                : `SELECT topic, normalized_topic
                   FROM topic_knowledge
                   WHERE normalized_topic != ?
                     AND EXISTS (
                       SELECT 1 FROM json_each(source_articles)
                       WHERE json_extract(value, '$.uid') = ?
                     )
                   ORDER BY updated_at DESC
                   LIMIT 3`;
            const rows = await this.all(sql, [excludeNormalizedTopic, safeUid]);
            for (const r of rows) {
                out.push({ articleUid: uid, topic: r.topic, normalizedTopic: r.normalized_topic });
            }
        }
        return out;
    }

    async recordLowRecallSearch({ query, resultCount = 0, sources = [], expandedAliases = [] } = {}) {
        if (!this.kysely || !query) return null;
        const normalized = this.normalizeTopic(query);
        if (!normalized) return null;
        const display = String(query || '').trim().slice(0, 240);
        const now = new Date().toISOString();
        const aliasJson = JSON.stringify(
            [...new Set((Array.isArray(expandedAliases) ? expandedAliases : [])
                .map((a) => this.normalizeTopic(a))
                .filter(Boolean))]
                .slice(0, 80)
        );
        const sourceJson = JSON.stringify(Array.isArray(sources) ? sources.map(String).slice(0, 10) : []);
        await this.run(
            `INSERT INTO low_recall_searches
                (normalized_topic, display_query, result_count, source_list, expanded_aliases, attempt_count, last_seen_at, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)
             ON CONFLICT(normalized_topic, display_query) DO UPDATE SET
                result_count = excluded.result_count,
                source_list = excluded.source_list,
                expanded_aliases = excluded.expanded_aliases,
                attempt_count = attempt_count + 1,
                last_seen_at = excluded.last_seen_at`,
            [normalized, display, Number(resultCount || 0), sourceJson, aliasJson, now, now]
        );
        const row = await this.get(
            `SELECT * FROM low_recall_searches WHERE normalized_topic = ? AND display_query = ?`,
            [normalized, display]
        );
        return row ? {
            id: row.id,
            normalizedTopic: row.normalized_topic,
            displayQuery: row.display_query,
            resultCount: Number(row.result_count || 0),
            sources: safeJsonParse(row.source_list, []),
            expandedAliases: safeJsonParse(row.expanded_aliases, []),
            attemptCount: Number(row.attempt_count || 0),
            lastSeenAt: row.last_seen_at,
            createdAt: row.created_at,
        } : null;
    }

    mapLearningSchedulerRunRow(row) {
        if (!row) return null;
        return {
            id: Number(row.id),
            runType: row.run_type,
            status: row.status,
            startedAt: row.started_at,
            finishedAt: row.finished_at || null,
            candidatesCount: Number(row.candidates_count || 0),
            refreshedCount: Number(row.refreshed_count || 0),
            skippedCount: Number(row.skipped_count || 0),
            errorCount: Number(row.error_count || 0),
            details: safeJsonParse(row.details, {}),
            error: row.error || null,
        };
    }

    async createLearningSchedulerRun({ runType = 'topic_refresh', details = {} } = {}) {
        if (!this.kysely) return null;
        const now = new Date().toISOString();
        const result = await this.run(
            `INSERT INTO learning_scheduler_runs (run_type, status, started_at, details)
             VALUES (?, 'running', ?, ?)`,
            [String(runType || 'topic_refresh'), now, JSON.stringify(details || {})]
        );
        const id = result?.lastID || result?.id;
        if (!id) return null;
        const row = await this.get(`SELECT * FROM learning_scheduler_runs WHERE id = ?`, [id]);
        return this.mapLearningSchedulerRunRow(row);
    }

    async finishLearningSchedulerRun(id, {
        status = 'completed',
        candidatesCount = 0,
        refreshedCount = 0,
        skippedCount = 0,
        errorCount = 0,
        details = {},
        error = null,
    } = {}) {
        if (!this.kysely || !id) return null;
        const now = new Date().toISOString();
        await this.run(
            `UPDATE learning_scheduler_runs
             SET status = ?, finished_at = ?, candidates_count = ?, refreshed_count = ?,
                 skipped_count = ?, error_count = ?, details = ?, error = ?
             WHERE id = ?`,
            [
                String(status || 'completed'),
                now,
                Number(candidatesCount || 0),
                Number(refreshedCount || 0),
                Number(skippedCount || 0),
                Number(errorCount || 0),
                JSON.stringify(details || {}),
                error ? String(error).slice(0, 2000) : null,
                Number(id),
            ]
        );
        const row = await this.get(`SELECT * FROM learning_scheduler_runs WHERE id = ?`, [Number(id)]);
        return this.mapLearningSchedulerRunRow(row);
    }

    async listLearningSchedulerRuns({ limit = 10, runType = 'topic_refresh' } = {}) {
        if (!this.kysely) return [];
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
        const rows = await this.all(
            `SELECT * FROM learning_scheduler_runs
             WHERE (? = '' OR run_type = ?)
             ORDER BY started_at DESC
             LIMIT ?`,
            [String(runType || ''), String(runType || ''), safeLimit]
        );
        return rows.map((row) => this.mapLearningSchedulerRunRow(row));
    }

    async getLearningObservability({ lowRecallDays = 7, limit = 10 } = {}) {
        if (!this.kysely) return null;
        const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
        const lowRecallSince = new Date(Date.now() - Number(lowRecallDays || 7) * 86400000).toISOString();
        const [
            bouquetRows,
            lowRecallRows,
            aliasSeededRows,
            vectorUsageRows,
            schedulerRuns,
            refreshCandidates,
        ] = await Promise.all([
            this.all(
                `SELECT normalized_topic, MAX(display_topic) AS display_topic,
                        SUM(signal_count) AS total_signals,
                        COUNT(DISTINCT article_uid) AS distinct_articles,
                        MAX(last_seen_at) AS last_seen_at
                 FROM topic_bouquet_signals
                 GROUP BY normalized_topic
                 ORDER BY total_signals DESC
                 LIMIT ?`,
                [safeLimit]
            ),
            this.all(
                `SELECT normalized_topic, display_query, result_count, expanded_aliases,
                        attempt_count, last_seen_at
                 FROM low_recall_searches
                 WHERE last_seen_at >= ?
                 ORDER BY attempt_count DESC, last_seen_at DESC
                 LIMIT ?`,
                [lowRecallSince, safeLimit]
            ),
            this.all(
                `SELECT topic, normalized_topic, confidence, aliases_normalized, updated_at
                 FROM topic_knowledge
                 WHERE status = 'alias_seeded'
                 ORDER BY updated_at DESC
                 LIMIT ?`,
                [safeLimit]
            ),
            this.all(
                `SELECT
                    SUM(CASE WHEN metadata LIKE '%"vector":true%' THEN 1 ELSE 0 END) AS vector_true,
                    SUM(CASE WHEN metadata LIKE '%"vector":false%' THEN 1 ELSE 0 END) AS vector_false,
                    COUNT(*) AS total
                 FROM analytics
                 WHERE event_type = 'search'
                   AND created_at >= ?`,
                [lowRecallSince]
            ).catch(() => []),
            this.listLearningSchedulerRuns({ limit: 5, runType: 'topic_refresh' }),
            this.getStaleTopicsForRefresh({ minSignalCount: 3, maxAgeDays: 1, minPriorityScore: 0, limit: safeLimit }).catch(() => []),
        ]);

        const vu = vectorUsageRows?.[0] || {};
        const vectorTrue = Number(vu.vector_true || 0);
        const vectorFalse = Number(vu.vector_false || 0);
        const vectorTotal = Number(vu.total || 0);
        return {
            generatedAt: new Date().toISOString(),
            topBouquetTopics: bouquetRows.map((r) => ({
                normalizedTopic: r.normalized_topic,
                displayTopic: r.display_topic || r.normalized_topic,
                totalSignals: Number(r.total_signals || 0),
                distinctArticles: Number(r.distinct_articles || 0),
                lastSeenAt: r.last_seen_at || null,
            })),
            lowRecall: {
                days: Number(lowRecallDays || 7),
                items: lowRecallRows.map((r) => ({
                    normalizedTopic: r.normalized_topic,
                    displayQuery: r.display_query,
                    resultCount: Number(r.result_count || 0),
                    expandedAliases: safeJsonParse(r.expanded_aliases, []),
                    attemptCount: Number(r.attempt_count || 0),
                    lastSeenAt: r.last_seen_at,
                })),
            },
            aliasSeededTopics: aliasSeededRows.map((r) => ({
                topic: r.topic,
                normalizedTopic: r.normalized_topic,
                confidence: Number(r.confidence || 0),
                aliasesNormalized: safeJsonParse(r.aliases_normalized, []),
                updatedAt: r.updated_at,
            })),
            vectorUsage: {
                windowDays: Number(lowRecallDays || 7),
                used: vectorTrue,
                notUsed: vectorFalse,
                total: vectorTotal,
                usageRate: vectorTotal > 0 ? Number((vectorTrue / vectorTotal).toFixed(3)) : 0,
            },
            refreshCandidates,
            schedulerRuns,
        };
    }

    mapStudyRunRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            userId: row.user_id,
            topic: row.topic,
            normalizedTopic: row.normalized_topic,
            outlineId: row.outline_id,
            curriculumTopicId: row.curriculum_topic_id != null ? Number(row.curriculum_topic_id) : null,
            status: row.status,
            progress: safeJsonParse(row.progress, {}),
            nodeCoverage: safeJsonParse(row.node_coverage, {}),
            startedAt: row.started_at,
            lastActiveAt: row.last_active_at,
            completedAt: row.completed_at,
        };
    }

    async createStudyRun(userId, { topic, outlineId = null, progress = {}, nodeCoverage = {}, curriculumTopicId = null }) {
        const normalized = this.normalizeTopic(topic);
        const now = new Date().toISOString();
        const result = await this.run(
            `INSERT INTO study_runs (user_id, topic, normalized_topic, outline_id, curriculum_topic_id, status, progress, node_coverage, started_at, last_active_at)
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
            [
                userId,
                topic,
                normalized,
                outlineId || null,
                curriculumTopicId != null ? Number(curriculumTopicId) : null,
                JSON.stringify(progress || {}),
                JSON.stringify(nodeCoverage || {}),
                now,
                now,
            ]
        );
        return this.getStudyRun(result.id);
    }

    // ==========================================
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
        const rows = await this.all(
            `SELECT b.id, b.curriculum_id, b.name, b.sort_order,
                    t.id as topic_id, t.block_id, t.display_name, t.suggested_query, t.sort_order as topic_sort_order, t.prerequisites
             FROM curriculum_blocks b
             LEFT JOIN curriculum_topics t ON t.block_id = b.id
             WHERE b.curriculum_id = ?
             ORDER BY b.sort_order ASC, b.id ASC, t.sort_order ASC, t.id ASC`,
            [cur.id]
        );
        const blockMap = new Map();
        for (const row of rows) {
            if (!blockMap.has(row.id)) {
                blockMap.set(row.id, {
                    id: row.id,
                    curriculumId: row.curriculum_id,
                    name: row.name,
                    sortOrder: row.sort_order,
                    topics: [],
                });
            }
            if (row.topic_id != null) {
                const block = blockMap.get(row.id);
                block.topics.push({
                    id: row.topic_id,
                    blockId: row.block_id,
                    displayName: row.display_name,
                    suggestedQuery: row.suggested_query,
                    sortOrder: row.topic_sort_order,
                    prerequisites: (() => { try { return JSON.parse(row.prerequisites || '[]'); } catch { return []; } })(),
                });
            }
        }
        return {
            id: cur.id,
            slug: cur.slug,
            name: cur.name,
            examStageLabel: cur.exam_stage_label,
            description: cur.description,
            sortOrder: cur.sort_order,
            blocks: Array.from(blockMap.values()),
        };
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
    // Learning Agent ΓÇö Agent Conversations
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
            createdAt: row.created_at,
        };
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
    // Learning Agent ΓÇö Case Attempts
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
    // Learning Agent ΓÇö Topic Mastery
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
        const existing = await this.get(`SELECT id FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        if (existing) {
            await this.run(
                `UPDATE user_topic_mastery SET
                    overall_score = ?, recall_score = ?, clinical_application_score = ?, trial_interpretation_score = ?,
                    guideline_score = ?, pitfall_score = ?, attempts_count = ?, correct_count = ?,
                    last_attempt_at = ?, next_review_at = ?, updated_at = ?
                 WHERE id = ?`,
                [
                    scores.overallScore ?? 0, scores.recallScore ?? 0, scores.clinicalApplicationScore ?? 0,
                    scores.trialInterpretationScore ?? 0, scores.guidelineScore ?? 0, scores.pitfallScore ?? 0,
                    scores.attemptsCount ?? 0, scores.correctCount ?? 0,
                    scores.lastAttemptAt || now, scores.nextReviewAt || now, now, existing.id,
                ]
            );
            return this.getUserTopicMastery(userId, topic);
        }
        await this.run(
            `INSERT INTO user_topic_mastery (user_id, topic, normalized_topic, overall_score, recall_score, clinical_application_score, trial_interpretation_score, guideline_score, pitfall_score, attempts_count, correct_count, last_attempt_at, next_review_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // ==========================================
    // Session Management
    // ==========================================

    async createSession(sessionId, userAgent, ipAddress, preferences) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('sessions')
            .values({
                id: sessionId,
                user_agent: userAgent || null,
                ip_address: ipAddress || null,
                preferences: preferences ? JSON.stringify(preferences) : null,
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString()
            })
            .onConflict(oc => oc.column('id').doUpdateSet({
                last_active: new Date().toISOString()
            }))
            .execute();
    }

    async updateSessionActivity(sessionId) {
        if (!this.kysely) return { changes: 0 };
        const result = await this.kysely
            .updateTable('sessions')
            .set({ last_active: new Date().toISOString() })
            .where('id', '=', sessionId)
            .executeTakeFirst();
        return { changes: Number(result.numUpdatedRows) };
    }

    // ==========================================
    // Saved Articles (Session-based)
    // ==========================================

    async saveArticle(sessionId, article) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('saved_articles')
            .values({
                session_id: sessionId,
                article_id: article.uid,
                article_data: JSON.stringify(article),
                notes: article.notes || null,
                tags: article.tags ? JSON.stringify(article.tags) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .onConflict(oc => oc.columns(['session_id', 'article_id']).doUpdateSet({
                article_data: JSON.stringify(article),
                updated_at: new Date().toISOString()
            }))
            .execute();
    }

    async unsaveArticle(sessionId, articleId) {
        return this.run(
            `DELETE FROM saved_articles WHERE session_id = ? AND article_id = ?`,
            [sessionId, articleId]
        );
    }

    async getSavedArticles(sessionId) {
        if (!this.kysely) return [];
        const rows = await this.kysely
            .selectFrom('saved_articles')
            .selectAll()
            .where('session_id', '=', sessionId)
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map(row => ({
            ...safeJsonParse(row.article_data, {}),
            _savedAt: row.created_at,
            _notes: row.notes,
            _tags: safeJsonParse(row.tags, [])
        }));
    }

    // ==========================================
    // Cache Maintenance
    // ==========================================

    async cleanExpiredCache() {
        const nowIso = new Date().toISOString();
        const articleResult = await this.run(
            `DELETE FROM article_cache WHERE expires_at IS NOT NULL AND expires_at < ?`,
            [nowIso]
        );
        const analysisResult = await this.run(
            `DELETE FROM analysis_cache WHERE expires_at IS NOT NULL AND expires_at < ?`,
            [nowIso]
        );
        return (articleResult.changes || 0) + (analysisResult.changes || 0);
    }

    // Batch-fetch cached retraction data for a list of article IDs.
    // Returns a map of { [id]: { isRetracted, retractionDate?, reason?, source, checkedAt } }
    // Only includes articles that have been checked (retraction_data IS NOT NULL).
    async getArticleRetractionBatch(ids = []) {
        if (!this.kysely || !ids.length) return {};
        const safeIds = ids.map(String).filter(Boolean).slice(0, 100);
        if (!safeIds.length) return {};
        const rows = await this.all(
            `SELECT id, retraction_data, is_retracted FROM article_cache
             WHERE id IN (${safeIds.map(() => '?').join(',')})
               AND retraction_data IS NOT NULL`,
            safeIds
        );
        const out = {};
        for (const row of rows) {
            const parsed = safeJsonParse(row.retraction_data, null);
            if (parsed) out[row.id] = parsed;
            else if (row.is_retracted) out[row.id] = { isRetracted: true, source: 'cache' };
        }
        return out;
    }

    // Write retraction check result back to article_cache for future lookups.
    async setArticleRetractionData(articleId, data) {
        if (!this.kysely || !articleId || !data) return;
        const now = new Date().toISOString();
        await this.run(
            `UPDATE article_cache
             SET retraction_data = ?, is_retracted = ?, updated_at = ?
             WHERE id = ?`,
            [JSON.stringify({ ...data, checkedAt: now }), data.isRetracted ? 1 : 0, now, String(articleId)]
        );
        // If no row existed yet, insert a minimal stub so the data isn't lost
        await this.run(
            `INSERT OR IGNORE INTO article_cache (id, source, data, retraction_data, is_retracted, created_at)
             VALUES (?, 'retraction_check', '{}', ?, ?, ?)`,
            [String(articleId), JSON.stringify({ ...data, checkedAt: now }), data.isRetracted ? 1 : 0, now]
        );
    }

    async getCachedArticle(articleId) {
        if (!this.kysely) return null;
        const row = await this.kysely
            .selectFrom('article_cache')
            .selectAll()
            .where('id', '=', articleId)
            .where(eb => eb.or([
                eb('expires_at', 'is', null),
                eb('expires_at', '>', new Date().toISOString())
            ]))
            .executeTakeFirst();
        
        if (row) {
            return {
                ...safeJsonParse(row.data, {}),
                _cached: true,
                _cachedAt: row.created_at
            };
        }
        return null;
    }

    // ==========================================
    // User Authentication Operations
    // ==========================================

    async createUser(user) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('users')
            .values(user)
            .onConflict(oc => oc.column('email').doUpdateSet({ updated_at: new Date().toISOString() }))
            .execute();
    }

    async getUserByEmail(email) {
        if (!this.kysely) return null;
        return this.kysely
            .selectFrom('users')
            .selectAll()
            .where('email', '=', email)
            .executeTakeFirst();
    }

    async getUserById(id) {
        if (!this.kysely) return null;
        return this.kysely
            .selectFrom('users')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }

    async updateUser(id, updates) {
        if (!this.kysely) return { changes: 0 };
        const result = await this.kysely
            .updateTable('users')
            .set({ ...updates, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .executeTakeFirst();
        return { changes: Number(result.numUpdatedRows) };
    }

    // ==========================================
    // Saved Articles (User-based)
    // ==========================================

    async saveArticleToUser(userId, article) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('user_saved_articles')
            .values({
                user_id: userId,
                article_id: article.uid,
                article_data: JSON.stringify(article),
                created_at: new Date().toISOString()
            })
            .execute();
    }

    async getUserSavedArticles(userId) {
        if (!this.kysely) return [];
        const rows = await this.kysely
            .selectFrom('user_saved_articles')
            .selectAll()
            .where('user_id', '=', userId)
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map(row => ({
            ...safeJsonParse(row.article_data, {}),
            _savedAt: row.created_at
        }));
    }

    async unsaveArticleFromUser(userId, articleId) {
        return this.run(
            `DELETE FROM user_saved_articles 
             WHERE user_id = ? AND article_id = ?`,
            [userId, articleId]
        );
    }

    // ==========================================
    // Saved Articles (Team-based)
    // ==========================================

    async saveArticleToTeam(teamId, userId, article) {
        const now = new Date().toISOString();
        return this.run(
            `INSERT INTO team_saved_articles
             (team_id, article_id, article_data, saved_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(team_id, article_id) DO UPDATE SET
                article_data = excluded.article_data,
                saved_by = excluded.saved_by,
                updated_at = excluded.updated_at`,
            [teamId, article.uid, JSON.stringify(article), userId, now, now]
        );
    }

    async getTeamSavedArticles(teamId) {
        const rows = await this.all(
            `SELECT * FROM team_saved_articles
             WHERE team_id = ?
             ORDER BY created_at DESC`,
            [teamId]
        );

        return rows.map(row => ({
            ...safeJsonParse(row.article_data, {}),
            _savedAt: row.created_at,
            _savedBy: row.saved_by,
            _ownerType: 'team',
            _teamId: row.team_id
        }));
    }

    async unsaveArticleFromTeam(teamId, articleId) {
        return this.run(
            `DELETE FROM team_saved_articles
             WHERE team_id = ? AND article_id = ?`,
            [teamId, articleId]
        );
    }

    // ==========================================
    // Search Alerts
    // ==========================================

    async createSearchAlert(userId, alert) {
        return this.run(
            `INSERT INTO search_alerts
             (user_id, query, frequency, sources, email, active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
            [userId, alert.query, alert.frequency || 'weekly', alert.sources || JSON.stringify(['pubmed']), alert.email || null]
        );
    }

    async getUserSearchAlerts(userId) {
        return this.all(
            `SELECT * FROM search_alerts
             WHERE user_id = ? AND active = 1
             ORDER BY created_at DESC`,
            [userId]
        );
    }

    async deactivateSearchAlert(userId, alertId) {
        return this.run(
            `UPDATE search_alerts 
             SET active = 0 
             WHERE user_id = ? AND id = ?`,
            [userId, alertId]
        );
    }

    // ==========================================
    // Team Workspace
    // ==========================================

    async createTeam(team) {
        return this.run(
            `INSERT INTO teams (id, name, slug, owner_id, plan, member_limit, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [team.id, team.name, team.slug, team.ownerId, team.plan || 'free', team.memberLimit || 3]
        );
    }

    async getTeamById(teamId) {
        return this.get(`SELECT * FROM teams WHERE id = ?`, [teamId]);
    }

    async getUserTeams(userId) {
        return this.all(
            `SELECT t.*, COUNT(tm.id) as member_count
             FROM teams t
             LEFT JOIN team_members tm ON t.id = tm.team_id
             WHERE t.owner_id = ? OR t.id IN (
                 SELECT team_id FROM team_members WHERE user_id = ?
             )
             GROUP BY t.id
             ORDER BY t.created_at DESC`,
            [userId, userId]
        );
    }

    async updateTeam(teamId, updates) {
        const fields = [];
        const values = [];
        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(updates.plan); }
        if (updates.memberLimit !== undefined) { fields.push('member_limit = ?'); values.push(updates.memberLimit); }
        if (fields.length === 0) return { changes: 0 };
        fields.push('updated_at = ?'); values.push(new Date().toISOString());
        values.push(teamId);
        return this.run(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    async deleteTeam(teamId) {
        return this.run(`DELETE FROM teams WHERE id = ?`, [teamId]);
    }

    async addTeamMember(teamId, userId, role = 'member') {
        return this.run(
            `INSERT INTO team_members (team_id, user_id, role, joined_at)
             VALUES (?, ?, ?, datetime('now'))`,
            [teamId, userId, role]
        );
    }

    async getTeamMembers(teamId) {
        return this.all(
            `SELECT tm.*, u.name, u.email
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = ?
             ORDER BY tm.joined_at ASC`,
            [teamId]
        );
    }

    async getTeamRoleForUser(teamId, userId) {
        const team = await this.getTeamById(teamId);
        if (!team) return null;
        if (team.owner_id === userId) return 'owner';

        const member = await this.get(
            `SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`,
            [teamId, userId]
        );
        return member?.role || null;
    }

    async updateTeamMemberRole(teamId, userId, role) {
        return this.run(
            `UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?`,
            [role, teamId, userId]
        );
    }

    async removeTeamMember(teamId, userId) {
        return this.run(
            `DELETE FROM team_members WHERE team_id = ? AND user_id = ?`,
            [teamId, userId]
        );
    }

    async createTeamCollection(collection) {
        return this.run(
            `INSERT INTO team_collections (id, team_id, name, description, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [collection.id, collection.teamId, collection.name, collection.description || null, collection.createdBy]
        );
    }

    async getTeamCollections(teamId) {
        return this.all(
            `SELECT tc.*, COUNT(tca.id) as article_count
             FROM team_collections tc
             LEFT JOIN team_collection_articles tca ON tc.id = tca.collection_id
             WHERE tc.team_id = ?
             GROUP BY tc.id
             ORDER BY tc.updated_at DESC`,
            [teamId]
        );
    }

    async getTeamCollection(collectionId) {
        return this.get(`SELECT * FROM team_collections WHERE id = ?`, [collectionId]);
    }

    async deleteTeamCollection(collectionId) {
        return this.run(`DELETE FROM team_collections WHERE id = ?`, [collectionId]);
    }

    async addArticleToTeamCollection(collectionId, article, addedBy) {
        return this.run(
            `INSERT INTO team_collection_articles (collection_id, article_id, article_data, added_by, added_at, notes)
             VALUES (?, ?, ?, ?, datetime('now'), ?)`,
            [collectionId, article.uid, JSON.stringify(article), addedBy, article.notes || null]
        );
    }

    async getTeamCollectionArticles(collectionId) {
        return this.all(
            `SELECT * FROM team_collection_articles WHERE collection_id = ? ORDER BY added_at DESC`,
            [collectionId]
        );
    }

    async removeArticleFromTeamCollection(collectionId, articleId) {
        return this.run(
            `DELETE FROM team_collection_articles WHERE collection_id = ? AND article_id = ?`,
            [collectionId, articleId]
        );
    }

    async createTeamInvitation(invitation) {
        return this.run(
            `INSERT INTO team_invitations (id, team_id, email, role, token, status, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
            [invitation.id, invitation.teamId, invitation.email, invitation.role || 'member', invitation.token, invitation.expiresAt]
        );
    }

    async getTeamInvitationByToken(token) {
        return this.get(`SELECT * FROM team_invitations WHERE token = ? AND status = 'pending'`, [token]);
    }

    async acceptTeamInvitation(token, userId) {
        const now = new Date().toISOString();
        // Fetch invitation BEFORE updating so we have the details after status changes
        const invitation = await this.getTeamInvitationByToken(token);
        if (!invitation) return null;

        const updateRes = await this.run(
            `UPDATE team_invitations SET status = 'accepted', accepted_at = ? WHERE token = ? AND status = 'pending' AND expires_at > ?`,
            [now, token, now]
        );
        if (!updateRes.changes) return null;
        await this.addTeamMember(invitation.team_id, userId, invitation.role);
        return invitation;
    }

    // ==========================================
    // Analytics Operations
    // ==========================================

    async logEvent(eventType, sessionId, metadata = {}) {
        if (!this.kysely) return;
        return this.kysely
            .insertInto('analytics')
            .values({
                event_type: eventType,
                session_id: sessionId,
                metadata: JSON.stringify(metadata),
                created_at: new Date().toISOString()
            })
            .execute();
    }

    async getAnalytics(startDate, endDate) {
        return this.all(
            `SELECT event_type, COUNT(*) as count, date(created_at) as date
             FROM analytics 
             WHERE created_at BETWEEN ? AND ?
             GROUP BY event_type, date(created_at)
             ORDER BY date`,
            [startDate, endDate]
        );
    }

    async getDailyStats(days = 30) {
        if (this.isPostgres) {
            return this.all(
                `SELECT 
                    DATE(created_at) as date,
                    COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
                    COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
                    COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
                 FROM analytics 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * ?
                 GROUP BY DATE(created_at)
                 ORDER BY date DESC`,
                [days]
            );
        }
        return this.all(
            `SELECT 
                date(created_at) as date,
                COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
                COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
                COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
             FROM analytics 
             WHERE created_at >= date('now', '-' || ? || ' days')
             GROUP BY date(created_at)
             ORDER BY date DESC`
        , [days]);
    }

    // ==========================================
    // PostgreSQL + pgvector (articles_cache)
    // ==========================================

    isVectorSearchAvailable() {
        return !!this.pgVectorPool;
    }

    /**
     * @param {string} externalId
     * @param {string} source
     * @param {object} data - article JSON (stored as JSONB)
     * @param {number[]} embedding - length 384
     * @param {string} [doi]
     */
    async upsertArticleCacheVector(externalId, source, data, embedding, doi = null) {
        if (!this.pgVectorPool) {
            throw new Error('Vector cache requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
        }
        const vec = toPgVectorLiteral(embedding);
        const dataJson = JSON.stringify(data);
        const sql = `
            INSERT INTO articles_cache (external_id, doi, source, data, embedding, updated_at)
            VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())
            ON CONFLICT (external_id) DO UPDATE SET
                doi = EXCLUDED.doi,
                source = EXCLUDED.source,
                data = EXCLUDED.data,
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
        `;
        const res = await this.pgVectorPool.query(sql, [externalId, doi, source, dataJson, vec]);
        return { changes: res.rowCount };
    }

    /**
     * @param {number[]} queryEmbedding
     * @param {number} limit
     * @param {number} minSimilarity 0..1 (1 = identical direction for cosine)
     */
    async searchSimilarArticlesCache(queryEmbedding, limit = 10, minSimilarity = 0.4) {
        if (!this.pgVectorPool) {
            throw new Error('Vector search requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
        }
        const vec = toPgVectorLiteral(queryEmbedding);
        const maxDistance = 1 - minSimilarity;
        const sql = `
            SELECT data, 1 - (embedding <=> $1::vector) AS score
            FROM articles_cache
            WHERE embedding IS NOT NULL
              AND (embedding <=> $1::vector) < $2
            ORDER BY embedding <=> $1::vector ASC
            LIMIT $3
        `;
        const { rows } = await this.pgVectorPool.query(sql, [vec, maxDistance, limit]);
        return rows.map((r) => ({
            data: r.data,
            score: r.score !== null && r.score !== undefined ? Number(r.score) : 0
        }));
    }

    closeVectorPool() {
        if (this.pgVectorPool) {
            return this.pgVectorPool.end();
        }
        return Promise.resolve();
    }

    // ==========================================
    // Annotation Operations
    // ==========================================

    async getAnnotationsByArticle(articleId, userId = null) {
        if (!this.kysely) return [];
        let query = this.kysely
            .selectFrom('annotations')
            .selectAll()
            .where('article_id', '=', articleId);
        if (userId) {
            query = query.where('user_id', '=', userId);
        }
        const rows = await query.orderBy('created_at', 'asc').execute();
        
        return rows.map(row => ({
            ...row,
            position: safeJsonParse(row.position, null)
        }));
    }

    async createAnnotation(articleId, userId, userName, text, position) {
        if (!this.kysely) return;
        const result = await this.kysely
            .insertInto('annotations')
            .values({
                article_id: articleId,
                user_id: userId,
                user_name: userName,
                text,
                position: position ? JSON.stringify(position) : null,
                created_at: new Date().toISOString()
            })
            .executeTakeFirst();
        return { id: Number(result.insertId) };
    }

    // ==========================================
    // Analysis Cache Operations
    // ==========================================

    async getCachedAnalysis(articleId, analysisType, model) {
        if (!this.kysely) return null;
        const row = await this.kysely
            .selectFrom('analysis_cache')
            .selectAll()
            .where('article_id', '=', articleId)
            .where('analysis_type', '=', analysisType)
            .where('model', '=', model)
            .where(eb => eb.or([
                eb('expires_at', 'is', null),
                eb('expires_at', '>', new Date().toISOString())
            ]))
            .executeTakeFirst();

        if (row) {
            return {
                ...safeJsonParse(row.result, {}),
                _cached: true,
                _cachedAt: row.created_at,
                _cost: row.cost
            };
        }
        return null;
    }

    async cacheAnalysis(articleId, analysisType, model, result, tokensUsed, cost, ttlHours = 168) {
        if (!this.kysely) return;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);

        return this.kysely
            .insertInto('analysis_cache')
            .values({
                article_id: articleId,
                analysis_type: analysisType,
                model: model,
                result: JSON.stringify(result),
                tokens_used: tokensUsed,
                cost: cost,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString()
            })
            .onConflict(oc => oc.columns(['article_id', 'analysis_type', 'model']).doUpdateSet({
                result: JSON.stringify(result),
                expires_at: expiresAt.toISOString()
            }))
            .execute();
    }

    // ==========================================
    // PDF full-text persistence (no TTL ΓÇö survives cache restarts)
    // ==========================================

    async savePdfSections(articleUid, payload) {
        if (!articleUid || !payload?.sections) return;
        await this.run(
            `INSERT INTO pdf_sections (article_uid, sections, ordered_keys, tables, word_count, url, source, numpages, indexed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(article_uid) DO UPDATE SET
               sections = excluded.sections,
               ordered_keys = excluded.ordered_keys,
               tables = excluded.tables,
               word_count = excluded.word_count,
               url = excluded.url,
               source = excluded.source,
               numpages = excluded.numpages,
               indexed_at = excluded.indexed_at`,
            [
                String(articleUid),
                JSON.stringify(payload.sections || {}),
                JSON.stringify(payload.orderedKeys || []),
                JSON.stringify(payload.tables || []),
                payload.wordCount || 0,
                payload.url || null,
                payload.source || null,
                payload.numpages || 0,
            ]
        );
    }

    async getPdfSections(articleUid) {
        if (!articleUid) return null;
        const row = await this.get(`SELECT * FROM pdf_sections WHERE article_uid = ?`, [String(articleUid)]);
        if (!row) return null;
        try {
            return {
                sections: JSON.parse(row.sections || '{}'),
                orderedKeys: JSON.parse(row.ordered_keys || '[]'),
                tables: JSON.parse(row.tables || '[]'),
                wordCount: row.word_count || 0,
                url: row.url || null,
                source: row.source || null,
                numpages: row.numpages || 0,
                indexedAt: row.indexed_at,
            };
        } catch {
            return null;
        }
    }

    // ==========================================
    // Durable AI generation jobs
    // ==========================================

    mapAiGenerationJobRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            jobKey: row.job_key,
            jobType: row.job_type,
            status: row.status,
            topic: row.topic || null,
            inputHash: row.input_hash || null,
            inputPayload: safeJsonParse(row.input_payload, null),
            resultPayload: safeJsonParse(row.result_payload, null),
            errorMessage: row.error_message || null,
            provider: row.provider || null,
            model: row.model || null,
            auditPayload: safeJsonParse(row.audit_payload, null),
            attempts: Number(row.attempts || 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at || null,
            completedAt: row.completed_at || null,
            expiresAt: row.expires_at || null,
        };
    }

    async getAiGenerationJobByKey(jobKey) {
        if (!jobKey) return null;
        const row = await this.get(`SELECT * FROM ai_generation_jobs WHERE job_key = ?`, [String(jobKey)]);
        return this.mapAiGenerationJobRow(row);
    }

    async createAiGenerationJob({ jobKey, jobType, topic = null, inputHash = null, inputPayload = null, provider = null, model = null, expiresAt = null } = {}) {
        if (!jobKey || !jobType) return null;
        const now = new Date().toISOString();
        await this.run(
            `INSERT INTO ai_generation_jobs (job_key, job_type, status, topic, input_hash, input_payload, provider, model, created_at, updated_at, expires_at)
             VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(job_key) DO NOTHING`,
            [
                String(jobKey),
                String(jobType),
                topic || null,
                inputHash || null,
                inputPayload ? JSON.stringify(inputPayload) : null,
                provider || null,
                model || null,
                now,
                now,
                expiresAt || null,
            ]
        );
        return this.getAiGenerationJobByKey(jobKey);
    }

    async markAiGenerationJobRunning(jobKey) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE ai_generation_jobs
             SET status = 'running', attempts = attempts + 1, started_at = COALESCE(started_at, ?), updated_at = ?
             WHERE job_key = ? AND status IN ('queued', 'failed')`,
            [now, now, String(jobKey)]
        );
        return this.getAiGenerationJobByKey(jobKey);
    }

    async completeAiGenerationJob(jobKey, { resultPayload, provider = null, model = null, auditPayload = null } = {}) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE ai_generation_jobs
             SET status = 'completed', result_payload = ?, error_message = NULL, provider = COALESCE(?, provider), model = COALESCE(?, model), audit_payload = ?, completed_at = ?, updated_at = ?
             WHERE job_key = ?`,
            [
                JSON.stringify(resultPayload || null),
                provider || null,
                model || null,
                auditPayload ? JSON.stringify(auditPayload) : null,
                now,
                now,
                String(jobKey),
            ]
        );
        return this.getAiGenerationJobByKey(jobKey);
    }

    async failAiGenerationJob(jobKey, errorMessage) {
        const now = new Date().toISOString();
        await this.run(
            `UPDATE ai_generation_jobs
             SET status = 'failed', error_message = ?, updated_at = ?
             WHERE job_key = ?`,
            [String(errorMessage || 'Generation failed').slice(0, 2000), now, String(jobKey)]
        );
        return this.getAiGenerationJobByKey(jobKey);
    }

    mapAiGenerationClaimRow(row) {
        if (!row) return null;
        return {
            id: row.id,
            jobKey: row.job_key,
            claimKey: row.claim_key,
            ordinal: Number(row.ordinal || 0),
            claimText: row.claim_text,
            sourceIds: safeJsonParse(row.source_ids_json, []),
            evidenceQuote: row.evidence_quote || null,
            confidence: row.confidence != null ? Number(row.confidence) : null,
            validationStatus: row.validation_status || 'unvalidated',
            conceptKey: row.concept_key || null,
            createdAt: row.created_at,
        };
    }

    async replaceAiGenerationClaims(jobKey, claims = []) {
        await this.run(`DELETE FROM ai_generation_claims WHERE job_key = ?`, [String(jobKey)]);
        for (const c of claims) {
            await this.run(
                `INSERT INTO ai_generation_claims (job_key, claim_key, ordinal, claim_text, source_ids_json, evidence_quote, confidence, validation_status, concept_key, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    String(jobKey),
                    String(c.claimKey),
                    Number(c.ordinal) || 0,
                    String(c.claimText || '').slice(0, 4000),
                    JSON.stringify(c.sourceIds || []),
                    c.evidenceQuote ? String(c.evidenceQuote).slice(0, 3000) : null,
                    c.confidence != null && Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
                    String(c.validationStatus || 'unvalidated'),
                    c.conceptKey ? String(c.conceptKey) : null,
                ]
            );
        }
    }

    async listAiGenerationClaimsByJobKey(jobKey) {
        const rows = await this.all(
            `SELECT * FROM ai_generation_claims WHERE job_key = ? ORDER BY ordinal ASC, id ASC`,
            [String(jobKey)]
        );
        return rows.map((r) => this.mapAiGenerationClaimRow(r));
    }

    // ==========================================
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
        await this.run('BEGIN');
        try {
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
            await this.run('COMMIT');
        } catch (err) {
            await this.run('ROLLBACK').catch(() => {});
            throw err;
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
        const reflectionId = result.lastInsertRowid ?? result.lastID ?? result.id;
        const row = await this.get(`SELECT * FROM portfolio_reflections WHERE id = ? AND user_id = ?`, [reflectionId, userId]);
        return this.mapPortfolioReflectionRow(row);
    }
}

// Methods live in mixins until monolith is fully composed via build-layer.
const _m02Proto = require('./mixins/m02-guidelines-learning-quiz-adaptive')(class {}).prototype;
const _m08Proto = require('./mixins/m08-review-audit-billing-cpd')(class {}).prototype;
const _dbMethodsFromMixins = [
    'getQuizAttemptsForClaimKey',
    'listPortfolioReflections',
    'updatePortfolioReflection',
    'mapTeachingObjectRow',
    'upsertTeachingObject',
    'getTeachingObjectByKey',
    'getTeachingObjectForArticle',
    'listTeachingObjectsForTopic',
    'mapTeachingObjectClaimRow',
    'replaceTeachingObjectClaims',
    'listTeachingObjectClaimsByObjectKey',
    'getTeachingClaimByKey',
    'listTeachingObjectClaimsForTopic',
    'getUserClaimMastery',
    'listTeachingClaimsForReview',
    'updateTeachingClaimVerification',
    'getTeachingObjectStats',
];
for (const name of _dbMethodsFromMixins) {
  const fn = _m08Proto[name] || _m02Proto[name];
  if (typeof fn === 'function' && typeof Database.prototype[name] !== 'function') {
    Database.prototype[name] = fn;
  }
}

function toPgVectorLiteral(embedding) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding array');
    }
    return `[${embedding.map((n) => Number(n).toFixed(6)).join(',')}]`;
}

const singleton = new Database();
singleton.Database = Database;
module.exports = singleton;
