'use strict';

/**
 * Embedding-based re-filing (migration 096).
 *
 * Coverage gaps looked like ranking faults: 52 KDIGO recommendations sat in
 * the structured corpus with none under any AKI topic. Every prior fallback
 * (exact keys, probe words, text-name probes) can only surface what a
 * recommendation's own text names. These tests pin the two halves of the fix:
 *   - the backfill files a recommendation under its canonical condition even
 *     when the text never names it (fake embedFn, no network);
 *   - getGuidelinesByTopic surfaces refiled rows through the side-table join
 *     and lets them pass the score > 0 floor that exists to block cross-topic
 *     noise.
 */

const Sqlite = require('better-sqlite3');
const GuidelinesMixin = require('../../database/mixins/m02a-guidelines');
const {
    cosineSimilarity,
    buildConditionIndexEntries,
    fileRecommendationRow,
    backfillGuidelineRefiling,
    clearConditionIndexCache,
    textHash,
} = require('../../server/services/guidelineEmbeddingRefiling');
const { resolveConditionGroupForTopic } = require('../../server/utils/topicSynonyms');

// ─── Deterministic fake embeddings ────────────────────────────────────────────
// Bag-of-words over a fixed axis vocabulary, so similar texts land near each
// other without any network call.
const AXIS_WORDS = ['aki', 'kidney', 'injury', 'acute', 'renal', 'chronic', 'disease', 'sepsis', 'septic', 'shock', 'coronary', 'heart'];
const AXIS = new Map(AXIS_WORDS.map((word, index) => [word, index]));

function fakeEmbed(text) {
    const vector = new Array(AXIS_WORDS.length).fill(0);
    for (const token of String(text || '').toLowerCase().match(/[a-z]+/g) || []) {
        const axis = AXIS.get(token);
        if (axis !== undefined) vector[axis] += 1;
    }
    return vector;
}

// ─── Service-level tests ─────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
    it('is 1 for identical vectors and 0 for orthogonal ones', () => {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
        expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
        expect(cosineSimilarity([1, 1], [1, 1])).toBeCloseTo(1);
    });

    it('handles empty and mismatched vectors', () => {
        expect(cosineSimilarity([], [])).toBe(0);
        expect(cosineSimilarity([1], [1, 2])).toBe(0);
    });
});

describe('buildConditionIndexEntries', () => {
    it('produces one canonical key per synonym group', () => {
        const entries = buildConditionIndexEntries();
        const aki = entries.find((e) => e.keys.includes('aki'));
        expect(aki).toBeDefined();
        expect(aki.canonicalNormalized).toBe('acute kidney injury');
    });
});

describe('resolveConditionGroupForTopic', () => {
    const normalize = (s) => String(s || '').trim().toLowerCase();

    it('resolves abbreviation queries to their condition cluster', () => {
        const group = resolveConditionGroupForTopic('aki diagnosis and management', normalize);
        expect(group.canonicalNormalized).toBe('acute kidney injury');
        expect(group.keys).toContain('aki');
    });

    it('resolves a token inside a longer query', () => {
        const group = resolveConditionGroupForTopic('contrast-induced aki prevention', normalize);
        expect(group.canonicalNormalized).toBe('acute kidney injury');
    });

    it('returns null for conditions outside the curated clusters', () => {
        expect(resolveConditionGroupForTopic('stroke rehabilitation', normalize)).toBeNull();
    });
});

describe('fileRecommendationRow', () => {
    const conditionIndex = [
        { canonicalNormalized: 'acute kidney injury', keys: ['aki', 'acute kidney injury', 'acute renal failure'], embedding: fakeEmbed('acute kidney injury') },
        { canonicalNormalized: 'sepsis', keys: ['sepsis', 'septic shock'], embedding: fakeEmbed('sepsis') },
    ];

    it('files an AKI-text row filed under a sibling topic, even though the text never says AKI', async () => {
        const row = {
            id: 10,
            topic: 'Contrast-induced nephropathy',
            normalized_topic: 'contrast-induced nephropathy',
            source_body: 'KDIGO',
            recommendation_text: 'We recommend monitoring kidney function in acute illness and stopping nephrotoxic drugs after contrast exposure.',
        };
        const filing = await fileRecommendationRow(row, conditionIndex, { embedFn: fakeEmbed, threshold: 0.3 });
        expect(filing).not.toBeNull();
        expect(filing.canonicalNormalized).toBe('acute kidney injury');
        expect(filing.similarity).toBeGreaterThanOrEqual(0.3);
    });

    it('does not re-file a row already reachable under the condition keys', async () => {
        const row = {
            id: 11,
            topic: 'Acute kidney injury',
            normalized_topic: 'acute kidney injury',
            source_body: 'KDIGO',
            recommendation_text: 'We recommend monitoring kidney function in critically ill patients.',
        };
        expect(await fileRecommendationRow(row, conditionIndex, { embedFn: fakeEmbed, threshold: 0.3 })).toBeNull();
    });

    it('returns null when nothing clears the threshold', async () => {
        const row = {
            id: 12,
            topic: 'Atrial fibrillation anticoagulation',
            normalized_topic: 'atrial fibrillation anticoagulation',
            source_body: 'ESC',
            recommendation_text: 'We recommend anticoagulation for stroke prevention in atrial fibrillation.',
        };
        expect(await fileRecommendationRow(row, conditionIndex, { embedFn: fakeEmbed, threshold: 0.3 })).toBeNull();
    });
});

// ─── Backfill + query-path tests against real SQLite ─────────────────────────

function makeDb(guidelineRows, refilingRows = []) {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`CREATE TABLE topic_guidelines (
        id INTEGER PRIMARY KEY, topic TEXT, normalized_topic TEXT, source_body TEXT,
        source_year INTEGER, recommendation_text TEXT, status TEXT,
        superseded_by_id INTEGER, last_checked_at TEXT, updated_at TEXT
    )`);
    sqlite.exec(`CREATE TABLE topic_guideline_refiling (
        guideline_id INTEGER PRIMARY KEY, canonical_normalized TEXT NOT NULL,
        similarity REAL NOT NULL, source_topic_normalized TEXT NOT NULL,
        embedded_text_hash TEXT NOT NULL, created_at TEXT NOT NULL
    )`);
    const insertGuideline = sqlite.prepare(
        `INSERT INTO topic_guidelines (id, topic, normalized_topic, source_body, source_year,
             recommendation_text, status, superseded_by_id, last_checked_at)
         VALUES (@id, @topic, @normalized_topic, @source_body, @source_year,
             @recommendation_text, @status, @superseded_by_id, @last_checked_at)`
    );
    for (const row of guidelineRows) insertGuideline.run({ last_checked_at: new Date().toISOString(), ...row });
    const insertRefiling = sqlite.prepare(
        `INSERT INTO topic_guideline_refiling (guideline_id, canonical_normalized, similarity,
             source_topic_normalized, embedded_text_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const row of refilingRows) insertRefiling.run(row.guideline_id, row.canonical_normalized, row.similarity || 0.5, row.source_topic_normalized || '', row.embedded_text_hash || 'x', new Date().toISOString());

    const Base = class {
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
    };
    return new (GuidelinesMixin(Base))();
}

// A KDIGO-style rec: filed under a fine sibling topic, text never says "aki".
const KDIGO_CONTRAST_ROW = {
    id: 20,
    topic: 'Contrast-induced nephropathy',
    normalized_topic: 'contrast-induced nephropathy',
    source_body: 'KDIGO',
    source_year: 2024,
    status: 'ai_extracted',
    superseded_by_id: null,
    recommendation_text: 'We recommend monitoring kidney function in acute illness and stopping nephrotoxic drugs after contrast exposure.',
};

describe('getGuidelinesByTopic with embedding re-filing', () => {
    test('an AKI query surfaces a refiled rec whose text never names AKI', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW], [
            { guideline_id: 20, canonical_normalized: 'acute kidney injury' },
        ]);
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).toContain(20);
    });

    test('without a refiling row the same query cannot see the rec', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW]);
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).not.toContain(20);
    });

    test('a refiled rec from an unrelated condition is not surfaced for AKI', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW], [
            { guideline_id: 20, canonical_normalized: 'sepsis' },
        ]);
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).not.toContain(20);
    });

    test('deleting a guideline also removes its refiling row', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW], [
            { guideline_id: 20, canonical_normalized: 'acute kidney injury' },
        ]);
        await db.deleteGuideline(20);
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).not.toContain(20);
    });
});

describe('backfillGuidelineRefiling', () => {
    beforeEach(() => clearConditionIndexCache());

    it('files semantically-matching rows and skips unchanged ones on a rerun', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW]);
        const serverConfig = { keys: {} }; // embedFn is injected; no real keys needed

        const first = await backfillGuidelineRefiling({
            db, serverConfig,
            options: { embedFn: fakeEmbed, threshold: 0.3, limit: 100 },
            log: { warn: jest.fn() },
        });
        expect(first.scanned).toBe(1);
        expect(first.embedded).toBe(1);
        expect(first.refiled).toBe(1);

        // The refiled row is now visible to AKI queries.
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).toContain(20);

        // Rerun: unchanged text is skipped, no second embedding.
        const second = await backfillGuidelineRefiling({
            db, serverConfig,
            options: { embedFn: fakeEmbed, threshold: 0.3, limit: 100 },
            log: { warn: jest.fn() },
        });
        expect(second.skippedUnchanged).toBe(1);
        expect(second.embedded).toBe(0);
    });

    it('records below-threshold rows so they are not re-embedded every batch', async () => {
        const afRow = {
            id: 30,
            topic: 'Atrial fibrillation anticoagulation',
            normalized_topic: 'atrial fibrillation anticoagulation',
            source_body: 'ESC',
            source_year: 2024,
            status: 'ai_extracted',
            superseded_by_id: null,
            recommendation_text: 'We recommend anticoagulation for stroke prevention in atrial fibrillation.',
        };
        const db = makeDb([afRow]);
        const outcome = await backfillGuidelineRefiling({
            db, serverConfig: { keys: {} },
            options: { embedFn: fakeEmbed, threshold: 0.3 },
            log: { warn: jest.fn() },
        });
        expect(outcome.refiled).toBe(0);
        expect(outcome.skippedBelowThreshold).toBe(1);
        // Below-threshold markers never surface for any query.
        const results = await db.getGuidelinesByTopic('aki diagnosis and management');
        expect(results.map((g) => g.id)).not.toContain(30);
    });

    it('skips cleanly when no embedding key or injectable embedFn is available', async () => {
        const db = makeDb([KDIGO_CONTRAST_ROW]);
        const outcome = await backfillGuidelineRefiling({
            db, serverConfig: { keys: {} },
            options: {},
            log: { warn: jest.fn() },
        });
        expect(outcome.skipped).toBe('no_embedding_key');
    });

    it('textHash changes when the recommendation text changes', () => {
        expect(textHash('a')).not.toBe(textHash('b'));
        expect(textHash('a')).toBe(textHash('a'));
    });
});
