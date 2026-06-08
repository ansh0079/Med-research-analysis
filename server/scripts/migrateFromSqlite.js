#!/usr/bin/env node
/**
 * One-time migration: SQLite app.db → production Postgres
 * Migrates: teaching_objects, topic_knowledge, topic_guidelines
 *
 * Usage (inside web container):
 *   node server/scripts/migrateFromSqlite.js /tmp/app.db
 */

'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const SQLITE_PATH = process.argv[2] || path.join(__dirname, '../../database/app.db');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL env var not set');
    process.exit(1);
}

const pg = new Pool({ connectionString: DATABASE_URL, ssl: false });

function safeJson(val, fallback = '{}') {
    if (val == null) return fallback;
    if (typeof val === 'object') return JSON.stringify(val);
    try { JSON.parse(val); return val; } catch { return fallback; }
}

function safeJsonArray(val) {
    return safeJson(val, '[]');
}

async function migrateTeachingObjects(sqlite) {
    console.log('\n── teaching_objects ──');
    const rows = sqlite.prepare('SELECT * FROM teaching_objects').all();
    console.log(`  Found ${rows.length} rows in SQLite`);

    let inserted = 0, skipped = 0;
    for (const row of rows) {
        try {
            await pg.query(`
                INSERT INTO teaching_objects
                    (object_key, object_type, article_uid, normalized_topic, topic, title,
                     object_payload, provider, model, confidence, generated_at, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                ON CONFLICT (object_key) DO NOTHING
            `, [
                row.object_key,
                row.object_type || 'paper',
                row.article_uid || null,
                row.normalized_topic || null,
                row.topic || null,
                row.title || null,
                safeJson(row.object_payload),
                row.provider || null,
                row.model || null,
                row.confidence ?? 0.5,
                row.generated_at || new Date().toISOString(),
                row.created_at || new Date().toISOString(),
                row.updated_at || new Date().toISOString(),
            ]);
            inserted++;
        } catch (err) {
            console.warn(`  SKIP ${row.object_key}: ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ Inserted: ${inserted}  Skipped/conflict: ${skipped}`);
}

async function migrateTopicKnowledge(sqlite) {
    console.log('\n── topic_knowledge ──');
    const rows = sqlite.prepare('SELECT * FROM topic_knowledge').all();
    console.log(`  Found ${rows.length} rows in SQLite`);

    let inserted = 0, skipped = 0;
    for (const row of rows) {
        try {
            await pg.query(`
                INSERT INTO topic_knowledge
                    (topic, normalized_topic, knowledge, source_articles,
                     aliases_normalized, canonical_normalized, status, confidence,
                     created_at, updated_at, last_refreshed_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                ON CONFLICT (normalized_topic) DO NOTHING
            `, [
                row.topic,
                row.normalized_topic,
                safeJson(row.knowledge),
                safeJsonArray(row.source_articles),
                safeJsonArray(row.aliases_normalized),
                row.canonical_normalized || '',
                row.status || 'ai_generated',
                row.confidence ?? 0.5,
                row.created_at || new Date().toISOString(),
                row.updated_at || new Date().toISOString(),
                row.last_refreshed_at || new Date().toISOString(),
            ]);
            inserted++;
        } catch (err) {
            console.warn(`  SKIP ${row.topic}: ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ Inserted: ${inserted}  Skipped/conflict: ${skipped}`);
}

async function migrateTopicGuidelines(sqlite) {
    console.log('\n── topic_guidelines ──');
    const rows = sqlite.prepare('SELECT * FROM topic_guidelines').all();
    console.log(`  Found ${rows.length} rows in SQLite`);

    // Check if already migrated to avoid duplicates
    const { rows: existing } = await pg.query('SELECT COUNT(*) as cnt FROM topic_guidelines');
    if (parseInt(existing[0].cnt) > 0) {
        console.log(`  ⚠ Postgres already has ${existing[0].cnt} rows — skipping to avoid duplicates`);
        console.log('    Run with --force-guidelines to override');
        if (!process.argv.includes('--force-guidelines')) return;
    }

    let inserted = 0, skipped = 0;
    for (const row of rows) {
        try {
            await pg.query(`
                INSERT INTO topic_guidelines
                    (topic, normalized_topic, source_body, source_region, source_year,
                     source_url, source_specialty, source_domain, recommendation_text,
                     recommendation_strength, recommendation_certainty, population,
                     intervention, cautions, status, reviewed_by, reviewed_at,
                     last_checked_at, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            `, [
                row.topic,
                row.normalized_topic,
                row.source_body,
                row.source_region || null,
                row.source_year || null,
                row.source_url || null,
                row.source_specialty || null,
                row.source_domain || null,
                row.recommendation_text,
                row.recommendation_strength || null,
                row.recommendation_certainty || null,
                row.population || null,
                row.intervention || null,
                row.cautions || null,
                row.status || 'ai_extracted',
                row.reviewed_by || null,
                row.reviewed_at || null,
                row.last_checked_at || new Date().toISOString(),
                row.created_at || new Date().toISOString(),
                row.updated_at || new Date().toISOString(),
            ]);
            inserted++;
        } catch (err) {
            console.warn(`  SKIP row: ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ Inserted: ${inserted}  Skipped/errors: ${skipped}`);
}

async function main() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║  SQLite → Postgres Migration          ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`SQLite: ${SQLITE_PATH}`);
    console.log(`Postgres: ${DATABASE_URL.replace(/:\/\/[^@]+@/, '://***@')}\n`);

    const sqlite = new Database(SQLITE_PATH, { readonly: true });

    try {
        await migrateTeachingObjects(sqlite);
        await migrateTopicKnowledge(sqlite);
        await migrateTopicGuidelines(sqlite);

        // Final counts
        console.log('\n── Final Postgres counts ──');
        const tables = ['teaching_objects', 'topic_knowledge', 'topic_guidelines'];
        for (const t of tables) {
            const { rows } = await pg.query(`SELECT COUNT(*) as cnt FROM ${t}`);
            console.log(`  ${t}: ${rows[0].cnt} rows`);
        }

        console.log('\n✅ Migration complete');
    } finally {
        sqlite.close();
        await pg.end();
    }
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
