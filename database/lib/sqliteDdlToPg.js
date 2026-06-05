'use strict';

/**
 * Convert SQLite DDL (schema.sql / migration files) to PostgreSQL-compatible DDL.
 * Used for production_schema.sql generation and Postgres migration execution.
 */
function convertSqliteDdlToPostgres(sql, options = {}) {
    if (!sql || !String(sql).trim()) return sql;

    let out = String(sql);
    const usersIdType = options.usersIdType || 'text';

    out = out.replace(/^\s*PRAGMA\s+[^;]+;/gim, '');

    out = out.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

    out = out.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');

    out = out.replace(/\bDATETIME\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');

    out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');

    if (usersIdType === 'uuid') {
        out = out.replace(
            /user_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+users\s*\(\s*id\s*\)/gi,
            'user_id UUID NOT NULL REFERENCES users(id)'
        );
        out = out.replace(
            /user_id\s+TEXT\s+REFERENCES\s+users\s*\(\s*id\s*\)/gi,
            'user_id UUID REFERENCES users(id)'
        );
    }

    return out;
}

module.exports = { convertSqliteDdlToPostgres };
