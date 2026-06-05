'use strict';

/**
 * Convert SQLite DDL (schema.sql / migration files) to PostgreSQL-compatible DDL.
 * Used for production_schema.sql generation and Postgres migration execution.
 */
function convertSqliteDdlToPostgres(sql) {
    if (!sql || !String(sql).trim()) return sql;

    let out = String(sql);

    out = out.replace(/^\s*PRAGMA\s+[^;]+;/gim, '');

    out = out.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

    out = out.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');

    out = out.replace(/\bDATETIME\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');

    out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');

    return out;
}

module.exports = { convertSqliteDdlToPostgres };
