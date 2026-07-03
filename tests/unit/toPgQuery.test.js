'use strict';

const Database = require('../../database/DatabaseCore');

// toPgQuery is a pure string transform (no `this` usage), so it can be exercised
// without a real DB connection via Database.prototype.toPgQuery.call(null, sql).
const toPgQuery = (sql) => Database.prototype.toPgQuery.call(null, sql);

describe('toPgQuery SQL dialect translation', () => {
    test('translates ? placeholders to positional $N params', () => {
        expect(toPgQuery('SELECT * FROM users WHERE id = ? AND email = ?'))
            .toBe('SELECT * FROM users WHERE id = $1 AND email = $2');
    });

    test('does not touch ? characters inside string literals', () => {
        expect(toPgQuery("SELECT * FROM t WHERE q = 'what?' AND id = ?"))
            .toBe("SELECT * FROM t WHERE q = 'what?' AND id = $1");
    });

    // Virtually every timestamp column in the live Postgres schema is TIMESTAMPTZ
    // (created via CURRENT_TIMESTAMP defaults). datetime('now') must translate to a
    // native timestamptz-producing expression, not a TEXT string, or every raw-SQL
    // insert/update using this literal fails with "column is of type timestamp with
    // time zone but expression is of type text".
    test('translates datetime(\'now\') to a native timestamptz expression (NOW())', () => {
        expect(toPgQuery("INSERT INTO t (created_at) VALUES (datetime('now'))"))
            .toBe('INSERT INTO t (created_at) VALUES (NOW())');
    });

    test('translates multiple datetime(\'now\') occurrences in one statement', () => {
        expect(toPgQuery("INSERT INTO t (created_at, updated_at) VALUES (datetime('now'), datetime('now'))"))
            .toBe('INSERT INTO t (created_at, updated_at) VALUES (NOW(), NOW())');
    });

    test('does not produce a TEXT-typed expression for datetime(\'now\')', () => {
        // Regression guard: to_char(...) would produce TEXT, which is incompatible
        // with TIMESTAMPTZ columns. Assert the old broken output is not reintroduced.
        expect(toPgQuery("datetime('now')")).not.toMatch(/to_char/i);
    });
});
