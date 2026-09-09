'use strict';

/**
 * createGuideline() and upsertGuidelineDocument() inserted rows successfully
 * on Postgres while returning undefined for every insert.
 *
 * Found running discoverGuidelinesForTopic against 10 pilot topics for
 * zero-guideline flagship coverage: the pilot's own report said 0 recommendations
 * extracted for all 10, but a direct query of topic_guidelines showed real rows
 * -- with real attribution (CDC, ACC/AHA, ESC) -- written at the exact timestamp
 * the pilot ran, for 7 of the 10 topics.
 *
 * Cause: DatabaseCore.run() on Postgres reads the inserted id from
 * `res.rows[0].id`, which only exists when the SQL has a RETURNING clause. A
 * plain INSERT on Postgres returns `rows: []`, so `result.id` was undefined,
 * `getGuidelineById(undefined)` could not find the just-inserted row, and
 * createGuideline() returned undefined despite the row committing.
 *
 * This could not have been caught by the existing discoverGuidelinesForTopic
 * test (guidelineDiscoveryParsing.test.js), which mocks db.createGuideline
 * wholesale -- the same "mock hiding a 100% failure rate" shape already in
 * project memory.
 *
 * These tests exercise the REAL mixin methods (mapGuidelineRow included) against
 * a fake `run`/`get` that mimics each dialect's actual wire behaviour, so a
 * regression that drops RETURNING again fails here rather than only in
 * production logs nobody is watching for a return value nobody checks.
 */

const guidelinesMixin = require('../../database/mixins/m02a-guidelines');

/**
 * A fake DB base that mimics node-pg and better-sqlite3's actual `run()`
 * contract closely enough to catch a missing RETURNING clause, without
 * needing a real database.
 */
function makeBase({ isPostgres }) {
    const store = new Map();
    let autoId = 1;
    const runCalls = [];

    return class Base {
        constructor() {
            this.isPostgres = isPostgres;
        }

        normalizeTopic(v) {
            return String(v || '').toLowerCase().trim();
        }

        async run(sql, params = []) {
            runCalls.push(sql);
            const insertMatch = sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)/i);
            if (insertMatch) {
                const table = insertMatch[1];
                const columns = insertMatch[2].split(',').map((c) => c.trim());
                const id = autoId++;
                const row = { id, table };
                columns.forEach((col, i) => { row[col] = params[i]; });
                store.set(`${table}:${id}`, row);
                const hasReturning = /RETURNING/i.test(sql);
                if (isPostgres) {
                    // A plain INSERT on real Postgres returns no rows at all --
                    // only a RETURNING clause populates res.rows.
                    return hasReturning
                        ? { id, changes: 1, rows: [{ id }] }
                        : { id: undefined, changes: 1, rows: [] };
                }
                // better-sqlite3's .run() always reports lastInsertRowid,
                // RETURNING clause or not -- verified empirically against the
                // real driver, not assumed.
                return { id, changes: 1 };
            }
            const updateMatch = sql.match(/UPDATE (\w+)/i);
            if (updateMatch) return { changes: 1 };
            return { id: undefined, changes: 0, rows: [] };
        }

        async get(sql, params = []) {
            const m = sql.match(/FROM (\w+) WHERE (\w+) = \?/i);
            if (!m) return null;
            const [, table, col] = m;
            for (const row of store.values()) {
                if (row.table === table && String(row[col]) === String(params[0])) return row;
            }
            return null;
        }

        get _runCalls() { return runCalls; }
    };
}

function buildHost(dialect) {
    const Base = makeBase(dialect);
    const Mixed = guidelinesMixin(Base);
    return new Mixed();
}

const recommendation = () => ({
    topic: 'hepatorenal syndrome',
    sourceBody: 'AGA Institute',
    sourceYear: 2024,
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
    recommendationText: 'Terlipressin plus albumin is recommended for HRS-AKI.',
    recommendationStrength: 'strong',
});

describe('createGuideline on Postgres', () => {
    test('the INSERT carries RETURNING id', async () => {
        const host = buildHost({ isPostgres: true });
        await host.createGuideline(recommendation());
        expect(host._runCalls.some((sql) => /INSERT INTO topic_guidelines/i.test(sql) && /RETURNING id/i.test(sql))).toBe(true);
    });

    test('returns the real row rather than undefined -- this is the regression the bug produced', async () => {
        const host = buildHost({ isPostgres: true });
        const result = await host.createGuideline(recommendation());
        expect(result).not.toBeUndefined();
        expect(result).not.toBeNull();
        expect(result.sourceBody).toBe('AGA Institute');
        expect(result.recommendationText).toContain('Terlipressin');
    });

    test('demonstrates the bug mechanism: without RETURNING, Postgres returns nothing usable', async () => {
        // Not a test of production code -- documents why the fix is a single
        // clause, by showing what a plain INSERT reports on this dialect.
        const Base = makeBase({ isPostgres: true });
        const host = new Base();
        const result = await host.run('INSERT INTO topic_guidelines (topic) VALUES (?)', ['x']);
        expect(result.rows).toEqual([]);
        expect(result.id).toBeUndefined();
    });
});

describe('createGuideline on SQLite', () => {
    test('still returns the real row -- the fix must not regress the existing dialect', async () => {
        const host = buildHost({ isPostgres: false });
        const result = await host.createGuideline(recommendation());
        expect(result.sourceBody).toBe('AGA Institute');
    });
});

describe('upsertGuidelineDocument on Postgres', () => {
    const doc = () => ({
        pmcid: null,
        title: 'EASL clinical practice guidelines on ascites',
        sourceBody: 'EASL',
        sourceYear: 2018,
    });

    test('the INSERT carries RETURNING id', async () => {
        const host = buildHost({ isPostgres: true });
        await host.upsertGuidelineDocument(doc());
        expect(host._runCalls.some((sql) => /INSERT INTO guideline_documents/i.test(sql) && /RETURNING id/i.test(sql))).toBe(true);
    });

    test('returns a real id rather than undefined', async () => {
        const host = buildHost({ isPostgres: true });
        const id = await host.upsertGuidelineDocument(doc());
        expect(id).not.toBeUndefined();
        expect(Number.isFinite(Number(id))).toBe(true);
    });

    test('the pmcid-dedup path is unaffected -- it returns existing.id directly, no RETURNING needed', async () => {
        const host = buildHost({ isPostgres: true });
        const first = await host.upsertGuidelineDocument({ pmcid: 'PMC123', title: 'A', sourceBody: 'NICE' });
        const second = await host.upsertGuidelineDocument({ pmcid: 'PMC123', title: 'A (dup)', sourceBody: 'NICE' });
        expect(second).toBe(first);
    });
});
