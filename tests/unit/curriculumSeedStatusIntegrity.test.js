'use strict';

/**
 * A seed status that reports success without evidence of the work.
 *
 * 41 flagship topics reached production as seed_status='seeded' with a null
 * last_seeded_at, zero claims and no synthesis, while system-wide 1,065 of
 * 1,214 seeded topics carry a timestamp. Those 41 also had no stored guideline
 * and no stored paper -- the status had been written without the pipeline
 * having run.
 *
 * That matters beyond tidiness: seed_status is the natural thing to gate beta
 * topics on, so a success state carrying no evidence is worse than no state.
 *
 * Note the method is defined in two mixins. m13 is registered later and is on
 * compose.js's allowed-override list for m05a, so m13's copy is the live one --
 * fixing only m05a would have been dead code. Both carry the invariant.
 */

const m05a = require('../../database/mixins/m05a-curriculum-seed');
const m13 = require('../../database/mixins/m13-curriculum-seed');

function harness(mixin) {
    const captured = [];
    // Mixins are (Sup) => class extends Sup, so apply one to a stub base that
    // records the SQL instead of running it.
    class Base {
        async run(sql, params) { captured.push({ sql, params }); }
        async get() { return { id: 't1', seed_status: 'seeded' }; }
        mapCurriculumSeedTopicRow(row) { return row; }
    }
    const Mixed = mixin(Base);
    return { host: new Mixed(), captured };
}

/**
 * The written column -> value map, read out of the SET clause only. The trailing
 * `WHERE id = ?` is not a written column and must not be counted as one.
 */
function written({ sql, params }) {
    const setClause = sql.slice(sql.indexOf('SET') + 3, sql.indexOf('WHERE'));
    const cols = [...setClause.matchAll(/(\w+)\s*=\s*\?/g)].map((m) => m[1]);
    return Object.fromEntries(cols.map((c, i) => [c, params[i]]));
}

describe.each([['m05a', m05a], ['m13 (live)', m13]])('%s updateCurriculumSeedStatus', (_label, mixin) => {
    test('stamps last_seeded_at when a caller claims the topic is seeded', () => {
        const { host, captured } = harness(mixin);
        return host.updateCurriculumSeedStatus('t1', { seedStatus: 'seeded' }).then(() => {
            const row = written(captured[0]);
            expect(row.seed_status).toBe('seeded');
            expect(row.last_seeded_at).toBeTruthy();
            expect(Number.isFinite(Date.parse(row.last_seeded_at))).toBe(true);
        });
    });

    test('stamps it for seeded_with_warnings too, which is still a completed run', async () => {
        const { host, captured } = harness(mixin);
        await host.updateCurriculumSeedStatus('t1', { seedStatus: 'seeded_with_warnings' });
        expect(written(captured[0]).last_seeded_at).toBeTruthy();
    });

    test('never overwrites a timestamp the caller supplied', async () => {
        const { host, captured } = harness(mixin);
        const supplied = '2026-01-02T03:04:05.000Z';
        await host.updateCurriculumSeedStatus('t1', { seedStatus: 'seeded', lastSeededAt: supplied });
        expect(written(captured[0]).last_seeded_at).toBe(supplied);
    });

    test.each(['not_seeded', 'failed', 'failed_low_recall', 'seeding', 'queued', 'archived'])(
        'does not stamp %s, which is not a completed run',
        async (seedStatus) => {
            const { host, captured } = harness(mixin);
            await host.updateCurriculumSeedStatus('t1', { seedStatus });
            expect(written(captured[0])).not.toHaveProperty('last_seeded_at');
        },
    );

    test('a patch that does not touch seed status is left alone', async () => {
        const { host, captured } = harness(mixin);
        await host.updateCurriculumSeedStatus('t1', { claimCount: 4 });
        const row = written(captured[0]);
        expect(row).toEqual({ claim_count: 4 });
    });

    test('an empty patch still writes nothing', async () => {
        const { host, captured } = harness(mixin);
        await expect(host.updateCurriculumSeedStatus('t1', {})).resolves.toBeNull();
        expect(captured).toHaveLength(0);
    });

    test('does not mutate the caller’s patch object', async () => {
        const { host } = harness(mixin);
        const patch = { seedStatus: 'seeded' };
        await host.updateCurriculumSeedStatus('t1', patch);
        expect(patch).toEqual({ seedStatus: 'seeded' });
    });
});
