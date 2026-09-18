'use strict';

const Sqlite = require('better-sqlite3');
const mixin = require('../../database/mixins/m02a-guidelines');

function buildDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`CREATE TABLE topic_guidelines (
        id INTEGER PRIMARY KEY, topic TEXT, normalized_topic TEXT, source_body TEXT,
        source_region TEXT, source_year INTEGER, source_url TEXT, source_specialty TEXT,
        source_domain TEXT, recommendation_text TEXT, recommendation_strength TEXT,
        recommendation_certainty TEXT, population TEXT, intervention TEXT, cautions TEXT,
        status TEXT, reviewed_by TEXT, reviewed_at TEXT, superseded_by_id INTEGER,
        last_checked_at TEXT, created_at TEXT, updated_at TEXT, evidence_tier TEXT,
        rec_direction TEXT, rec_exclusions TEXT, rec_trigger TEXT, structured_at TEXT,
        document_id INTEGER
    )`);
    class Base {
        normalizeTopic(topic) {
            return String(topic || '').toLowerCase()
                .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
        }
        async all(sql, params) { return sqlite.prepare(sql).all(...params); }
        async run(sql, params) {
            const result = sqlite.prepare(sql).run(...params);
            return { id: Number(result.lastInsertRowid), changes: result.changes };
        }
    }
    const db = new (mixin(Base))();
    const insert = (row) => sqlite.prepare(
        `INSERT INTO topic_guidelines (topic, normalized_topic, source_body, source_year,
            recommendation_text, status, last_checked_at)
         VALUES (@topic, @normalized_topic, @source_body, @source_year,
            @recommendation_text, 'human_reviewed', @last_checked_at)`
    ).run({ last_checked_at: new Date().toISOString(), ...row });
    return { db, sqlite, insert };
}

describe('getGuidelinesByTopic ranking', () => {
    it('does not let one issuing body take every slot', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            // NICE repeats the topic words slightly more often, so on raw term score
            // it swept all twelve slots on production while ATS/ERS/BTS sat below it.
            for (let i = 0; i < 12; i += 1) {
                insert({
                    topic: 'community-acquired pneumonia',
                    normalized_topic: 'community-acquired pneumonia',
                    source_body: 'NICE',
                    source_year: 2014,
                    recommendation_text: `Offer antibiotics in community acquired pneumonia within four hours, item ${i}.`,
                });
            }
            for (const body of ['American Thoracic Society', 'ERS', 'British Thoracic Society']) {
                insert({
                    topic: 'community-acquired pneumonia',
                    normalized_topic: 'community-acquired pneumonia',
                    source_body: body,
                    source_year: 2026,
                    recommendation_text: 'Consider amoxicillin first-line for pneumonia and monitor response.',
                });
            }

            const rows = await db.getGuidelinesByTopic('community-acquired pneumonia', { limit: 6 });
            const bodies = new Set(rows.map((r) => r.sourceBody));
            expect(bodies.size).toBeGreaterThan(1);
            expect(bodies).toContain('American Thoracic Society');
        } finally { sqlite.close(); }
    });

    it('treats one body spelled several ways as one body', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            for (const body of ['American Thoracic Society', 'American Thoracic Society (ATS)']) {
                for (let i = 0; i < 3; i += 1) {
                    insert({
                        topic: 'sepsis', normalized_topic: 'sepsis', source_body: body,
                        source_year: 2025, recommendation_text: `Initiate the sepsis bundle step ${i}; antibiotics must start within one hour.`,
                    });
                }
            }
            insert({
                topic: 'sepsis', normalized_topic: 'sepsis', source_body: 'NICE',
                source_year: 2024, recommendation_text: 'Screen for sepsis at triage and escalate; treatment must not be delayed.',
            });

            const rows = await db.getGuidelinesByTopic('sepsis', { limit: 2 });
            // Without parenthetical stripping the two ATS spellings take both slots.
            expect(rows.map((r) => r.sourceBody)).toContain('NICE');
        } finally { sqlite.close(); }
    });

    it('does not hand a journal name its own slot alongside real bodies', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            // source_body is free text and a large minority of it is journal names.
            // Giving every distinct value a slot led "iron deficiency anaemia" with
            // PLoS One, Gut and Anemia ahead of the bodies that issued guidance.
            for (const journal of ['PloS one', 'Gut', 'Anemia', 'Przeglad gastroenterologiczny']) {
                insert({
                    topic: 'iron deficiency anaemia', normalized_topic: 'iron deficiency anaemia',
                    source_body: journal, source_year: 2025,
                    recommendation_text: 'Consider oral iron in iron deficiency anaemia and monitor the response.',
                });
            }
            for (const body of ['NICE', 'WHO']) {
                insert({
                    topic: 'iron deficiency anaemia', normalized_topic: 'iron deficiency anaemia',
                    source_body: body, source_year: 2025,
                    recommendation_text: 'Consider oral iron in iron deficiency anaemia and monitor the response.',
                });
            }

            const rows = await db.getGuidelinesByTopic('iron deficiency anaemia', { limit: 3 });
            const bodies = rows.map((r) => r.sourceBody);
            expect(bodies).toContain('NICE');
            expect(bodies).toContain('WHO');
            // The four journals collectively compete for one body's worth of slots.
            expect(bodies.filter((b) => ['PloS one', 'Gut', 'Anemia', 'Przeglad gastroenterologiczny'].includes(b)))
                .toHaveLength(1);
        } finally { sqlite.close(); }
    });

    it('prefers the newer guideline when term scores differ only by noise', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            insert({
                topic: 'osteoarthritis', normalized_topic: 'osteoarthritis', source_body: 'OldBody',
                source_year: 2014,
                recommendation_text: 'Consider osteoarthritis osteoarthritis review; clinicians should offer osteoarthritis advice.',
            });
            insert({
                topic: 'osteoarthritis', normalized_topic: 'osteoarthritis', source_body: 'NewBody',
                source_year: 2026,
                recommendation_text: 'Offer structured exercise in osteoarthritis before referral for surgery.',
            });

            const rows = await db.getGuidelinesByTopic('osteoarthritis', { limit: 2 });
            expect(rows[0].sourceYear).toBe(2026);
        } finally { sqlite.close(); }
    });

    it('matches the hyphenated storage key itself, not just the fuzzy widening', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            // The stale-flag UPDATE runs only against the exact topic keys, never the
            // widened LIKE probe, so its effect proves which path matched the row.
            insert({
                topic: 'iron-deficiency anaemia', normalized_topic: 'iron-deficiency anaemia',
                source_body: 'WHO', source_year: 2026,
                recommendation_text: 'Offer oral iron first-line in iron deficiency anaemia and monitor ferritin.',
            });
            sqlite.prepare("UPDATE topic_guidelines SET last_checked_at = '2019-01-01T00:00:00.000Z'").run();

            await db.getGuidelinesByTopic('iron deficiency anaemia', { limit: 5 });

            const status = sqlite.prepare('SELECT status FROM topic_guidelines').get().status;
            expect(status).toBe('stale');
        } finally { sqlite.close(); }
    });

    it('finds guidelines stored under the hyphenated spelling of the topic', async () => {
        const { db, sqlite, insert } = buildDb();
        try {
            insert({
                topic: 'iron-deficiency anaemia', normalized_topic: 'iron-deficiency anaemia',
                source_body: 'WHO', source_year: 2026,
                recommendation_text: 'Offer oral iron first-line in iron deficiency anaemia and monitor ferritin.',
            });

            const rows = await db.getGuidelinesByTopic('iron deficiency anaemia', { limit: 5 });
            expect(rows).toHaveLength(1);
            expect(rows[0].sourceBody).toBe('WHO');
        } finally { sqlite.close(); }
    });
});
