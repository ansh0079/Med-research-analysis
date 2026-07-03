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

    out = out.replace(/datetime\s*\(\s*'now'\s*\)/gi, "to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')");

    out = out.replace(/\bDATETIME\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');

    out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');

    if (usersIdType === 'uuid') {
        out = out.replace(/\buser_id\s+INTEGER\b/gi, 'user_id UUID');
        out = out.replace(
            /user_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+users\s*\(\s*id\s*\)/gi,
            'user_id UUID NOT NULL REFERENCES users(id)'
        );
        out = out.replace(
            /user_id\s+TEXT\s+REFERENCES\s+users\s*\(\s*id\s*\)/gi,
            'user_id UUID REFERENCES users(id)'
        );

        // Any other column referencing users(id) — e.g. owner_id, created_by, added_by,
        // saved_by — must also become UUID, or Postgres rejects the FK with "incompatible
        // types: text and uuid". This covers both declaration styles seen in schema.sql:
        // inline (`col TEXT REFERENCES users(id)`) and table-level
        // (`FOREIGN KEY (col) REFERENCES users(id)`, with `col TEXT` declared separately
        // earlier in the same CREATE TABLE statement).
        const fkColumns = new Set();
        const inlineRe = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+TEXT\b(?:\s+NOT\s+NULL)?\s+REFERENCES\s+users\s*\(\s*id\s*\)/gi;
        const tableLevelRe = /FOREIGN\s+KEY\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*REFERENCES\s+users\s*\(\s*id\s*\)/gi;
        for (const re of [inlineRe, tableLevelRe]) {
            let m;
            while ((m = re.exec(out)) !== null) fkColumns.add(m[1]);
        }
        for (const col of fkColumns) {
            out = out.replace(new RegExp(`\\b${col}\\s+TEXT\\b`, 'gi'), `${col} UUID`);
        }
    }

    return out;
}

module.exports = { convertSqliteDdlToPostgres };
