'use strict';

const { convertSqliteDdlToPostgres } = require('../../database/lib/sqliteDdlToPg');

describe('convertSqliteDdlToPostgres', () => {
    test('converts INTEGER PRIMARY KEY AUTOINCREMENT to SERIAL PRIMARY KEY', () => {
        expect(convertSqliteDdlToPostgres('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT)'))
            .toBe('CREATE TABLE t (id SERIAL PRIMARY KEY)');
    });

    // Note: unlike DatabaseCore.js's toPgQuery (used for runtime DML against an
    // already-created live schema), this converter runs at DDL-creation time when the
    // column's own type is still TEXT in the same statement — so a TEXT-producing
    // to_char(...) default is correct here, not a bug. Do not "fix" this to NOW().
    test('converts datetime(\'now\') to a TEXT-producing default (matches the TEXT column type declared alongside it)', () => {
        expect(convertSqliteDdlToPostgres("created_at TEXT DEFAULT (datetime('now'))"))
            .toBe("created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))");
    });

    describe('usersIdType: uuid — foreign key column type coercion', () => {
        test('leaves TEXT columns alone when usersIdType is not uuid', () => {
            const sql = 'CREATE TABLE teams (owner_id TEXT NOT NULL, FOREIGN KEY (owner_id) REFERENCES users(id))';
            expect(convertSqliteDdlToPostgres(sql, { usersIdType: 'text' })).toBe(sql);
        });

        test('converts inline user_id REFERENCES users(id) to UUID (pre-existing behavior)', () => {
            const sql = 'user_id TEXT NOT NULL REFERENCES users(id)';
            expect(convertSqliteDdlToPostgres(sql, { usersIdType: 'uuid' }))
                .toBe('user_id UUID NOT NULL REFERENCES users(id)');
        });

        // Regression: table-level `FOREIGN KEY (col) REFERENCES users(id)` with a
        // non-`user_id` column name declared separately in the same statement — this is
        // the exact pattern that caused `teams.owner_id` and `collab_collections.owner_id`
        // to fail with "incompatible types: text and uuid" in production, because the
        // table itself was never created (silently) and every downstream feature relying
        // on it broke.
        test('converts owner_id via a table-level FOREIGN KEY constraint to UUID', () => {
            const sql = 'CREATE TABLE teams (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE)';
            const result = convertSqliteDdlToPostgres(sql, { usersIdType: 'uuid' });
            expect(result).toContain('owner_id UUID NOT NULL');
            expect(result).not.toMatch(/owner_id\s+TEXT\b/);
        });

        test('converts multiple differently-named FK columns referencing users(id) in one statement', () => {
            const sql = 'CREATE TABLE t (created_by TEXT NOT NULL, added_by TEXT NOT NULL, FOREIGN KEY (created_by) REFERENCES users(id), FOREIGN KEY (added_by) REFERENCES users(id))';
            const result = convertSqliteDdlToPostgres(sql, { usersIdType: 'uuid' });
            expect(result).toMatch(/created_by\s+UUID\s+NOT\s+NULL/);
            expect(result).toMatch(/added_by\s+UUID\s+NOT\s+NULL/);
        });

        test('does not touch TEXT columns that are not foreign keys to users(id)', () => {
            const sql = 'CREATE TABLE t (name TEXT NOT NULL, owner_id TEXT NOT NULL, FOREIGN KEY (owner_id) REFERENCES users(id))';
            const result = convertSqliteDdlToPostgres(sql, { usersIdType: 'uuid' });
            expect(result).toMatch(/name\s+TEXT\s+NOT\s+NULL/);
        });
    });
});
