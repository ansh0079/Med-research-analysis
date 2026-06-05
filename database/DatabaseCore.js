// ==========================================
// Database core — connection, SQL helpers, search history helpers
// ==========================================

const { Pool } = require('pg');
const { Kysely, SqliteDialect, PostgresDialect } = require('kysely');
const path = require('path');
const fs = require('fs');
const { buildPgPoolConfig, buildPgVectorPoolConfig } = require('../server/utils/pgPoolOptions');
const { runExternalSqliteMigrations } = require('./lib/helpers');
const { convertSqliteDdlToPostgres } = require('./lib/sqliteDdlToPg');

const MIGRATION_ALIASES = {
    '050_topic_crosslinks.sql': ['049_topic_crosslinks.sql'],
    '051_claim_lifecycle.sql': ['050_claim_lifecycle.sql'],
    '052_advanced_learning.sql': ['051_advanced_learning.sql'],
    '053_curriculum_seed_metadata.sql': ['052_curriculum_seed_metadata.sql'],
    '054_llm_usage_log.sql': ['052_llm_usage_log.sql'],
    '056_curriculum_seed_guardrails.sql': ['053_curriculum_seed_guardrails.sql'],
    '057_learning_event_ledger.sql': ['054_learning_event_ledger.sql'],
};
/** Migrations through this file are baked into schema.sql / production_schema.sql on fresh install. */
const BASELINE_MIGRATION = '057_learning_event_ledger.sql';
const SQLITE_BASELINE_MIGRATION = BASELINE_MIGRATION;
const POSTGRES_BASELINE_MIGRATION = BASELINE_MIGRATION;

class Database {
constructor(dbPath = './database/app.db') {
    this.dbPath = dbPath;
    /** @type {import('better-sqlite3').Database | null} */
    this._bs = null;
    /** @type {import('kysely').Kysely<Record<string, unknown>> | null} */
    this.kysely = null;
    this.pool = null;
    this.pgVectorPool = null;
    // Postgres mode is active when DATABASE_URL is a postgres:// or postgresql:// connection string.
    // Auto-detected from the URL scheme — no need to set USE_POSTGRES_MAIN manually.
    // USE_POSTGRES_MAIN=true is a legacy override but is ignored unless the URL is also a PG URL.
    const dbUrl = process.env.DATABASE_URL || '';
    const urlIsPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
    this.isPostgres = urlIsPostgres && Boolean(dbUrl);
}

async connect() {
    const vectorUrl = process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL;
    if (vectorUrl && String(vectorUrl).trim()) {
        const sslVec = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
        this.pgVectorPool = new Pool(buildPgVectorPoolConfig(String(vectorUrl).trim(), sslVec));
        console.log('✅ PG vector pool connected (pgvector / articles_cache)');
    }

    if (this.isPostgres) {
        const sslMain = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
        const pool = new Pool(buildPgPoolConfig(process.env.DATABASE_URL, sslMain));
        this.pool = pool;
        this.kysely = new Kysely({
            dialect: new PostgresDialect({ pool })
        });
        console.log('✅ Connected to PostgreSQL (main app)');
        await this.initialize();
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
            console.log('✅ Connected to SQLite (better-sqlite3 + Kysely)');
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
        const migrationsDdlPg = `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
        await this.run(migrationsDdlPg);

        const usersCheck = await this.pool.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`
        );
        this.pgUsersIdType = await this.detectPgUsersIdType();

        if (usersCheck.rows.length === 0) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            const statements = schema.split(';').filter(s => s.trim());
            const pgOpts = { usersIdType: this.pgUsersIdType };
            for (let statement of statements) {
                if (!statement.trim()) continue;
                statement = convertSqliteDdlToPostgres(statement, pgOpts);
                try {
                    await this.run(statement);
                } catch (err) {
                    const msg = String(err?.message || '');
                    const code = err?.code || '';
                    if (code === '42P07' || code === '42710' || msg.includes('already exists')) {
                        continue;
                    }
                    throw err;
                }
            }
        } else {
            console.log('ℹ️ PostgreSQL already bootstrapped — skipping production_schema.sql');
        }
    }
    const migrationsDdl = this.isPostgres
        ? null
        : `CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
    if (migrationsDdl) await this.run(migrationsDdl);

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

    console.log('✅ Database schema initialized');
}

/**
 * Run database migrations
 */
async runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('ℹ️ No migrations directory');
        return { migrated: 0 };
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const applied = await this.all('SELECT name FROM _migrations ORDER BY id');
    const appliedNames = new Set(applied.map(m => m.name));
    if (this.isPostgres && appliedNames.size === 0) {
        const baselineFiles = files.filter(f => f <= POSTGRES_BASELINE_MIGRATION);
        for (const file of baselineFiles) {
            await this.run('INSERT INTO _migrations (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [file]);
            appliedNames.add(file);
        }
        if (baselineFiles.length > 0) {
            console.log(`PostgreSQL baseline: production_schema.sql covers ${baselineFiles.length} migration marker(s) through ${POSTGRES_BASELINE_MIGRATION}`);
        }
    }
    if (!this.isPostgres && appliedNames.size === 0) {
        const baselineFiles = files.filter(f => f <= SQLITE_BASELINE_MIGRATION);
        for (const file of baselineFiles) {
            // ON CONFLICT DO NOTHING works on both SQLite (3.24+) and Postgres
            await this.run('INSERT INTO _migrations (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [file]);
            appliedNames.add(file);
        }
        if (baselineFiles.length > 0) {
            console.log(`SQLite baseline covers ${baselineFiles.length} migration(s) through ${SQLITE_BASELINE_MIGRATION}`);
        }
    }
    const pending = files.filter(f => {
        if (appliedNames.has(f)) return false;
        return !(MIGRATION_ALIASES[f] || []).some(alias => appliedNames.has(alias));
    });

    if (pending.length === 0) {
        console.log('✅ Database is up to date');
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
        
        for (let statement of statements) {
            if (statement.trim()) {
                if (this.isPostgres) {
                    if (!this.pgUsersIdType) {
                        this.pgUsersIdType = await this.detectPgUsersIdType();
                    }
                    statement = convertSqliteDdlToPostgres(statement, this.pgDdlOptions());
                }
                try {
                    await this.run(statement);
                } catch (err) {
                    const msg = String(err?.message || '');
                    const code = err?.code || '';
                    const duplicate =
                        msg.includes('duplicate column name')
                        || code === '42701'
                        || (code === '42P07' && /relation .* already exists/i.test(msg))
                        || (code === '42710' && /already exists/i.test(msg));
                    if (duplicate) {
                        console.log(`   ⚠️  Skipped (already exists): ${statement.split(/\s+/).slice(0, 6).join(' ')}...`);
                    } else {
                        throw err;
                    }
                }
            }
        }
        
        await this.run('INSERT INTO _migrations (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [file]);
        console.log(`✅ Completed: ${file}`);
    }

    return { migrated: pending.length };
}

async detectPgUsersIdType() {
    if (!this.isPostgres || !this.pool) return 'text';
    try {
        const res = await this.pool.query(
            `SELECT data_type FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'`
        );
        return res.rows[0]?.data_type === 'uuid' ? 'uuid' : 'text';
    } catch {
        return 'text';
    }
}

pgDdlOptions() {
    return { usersIdType: this.pgUsersIdType || 'text' };
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
    result = result.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
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

async withTransaction(fn) {
    await this.run('BEGIN');
    try {
        const result = await fn(this);
        await this.run('COMMIT');
        return result;
    } catch (err) {
        await this.run('ROLLBACK').catch(() => {});
        throw err;
    }
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
}

module.exports = Database;
