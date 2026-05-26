'use strict';

describe('Database.withTransaction', () => {
    let db;

    beforeEach(() => {
        const calls = [];
        db = {
            calls,
            run: jest.fn(async (sql) => {
                calls.push(sql.trim().split(/\s+/)[0].toUpperCase());
                return { changes: 1 };
            }),
            async withTransaction(fn) {
                await this.run('BEGIN');
                try {
                    const result = await fn(this);
                    await this.run('COMMIT');
                    return result;
                } catch (err) {
                    await this.run('ROLLBACK');
                    throw err;
                }
            },
            committed: false,
            rolledBack: false,
            rows: [],
        };
    });

    test('commits multi-step writes atomically', async () => {
        await db.withTransaction(async (tx) => {
            await tx.run(`INSERT INTO txn_test (value) VALUES (?)`, ['a']);
            await tx.run(`INSERT INTO txn_test (value) VALUES (?)`, ['b']);
        });
        expect(db.calls).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
    });

    test('rolls back all writes on failure', async () => {
        await expect(
            db.withTransaction(async (tx) => {
                await tx.run(`INSERT INTO txn_test (value) VALUES (?)`, ['ok']);
                throw new Error('boom');
            })
        ).rejects.toThrow('boom');
        expect(db.calls).toEqual(['BEGIN', 'INSERT', 'ROLLBACK']);
    });
});
