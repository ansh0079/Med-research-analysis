/**
 * Operate the source-invalidation queue.
 *
 *   node server/scripts/sourceInvalidation.js stats
 *   node server/scripts/sourceInvalidation.js process [--limit 50]
 *   node server/scripts/sourceInvalidation.js enqueue --type retraction|correction --article pubmed-123
 *   node server/scripts/sourceInvalidation.js failed
 *   node server/scripts/sourceInvalidation.js reinstate --article pubmed-123 --reviewer "Dr Name"
 *
 * `enqueue --type correction` is the only producer of correction events: nothing detects
 * corrections automatically yet. `reinstate` reverses a withdrawal (a false-positive
 * retraction) and returns the content as needs_revision, never as verified.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const {
    enqueueSourceInvalidation,
    enqueueExistingRetractions,
    processInvalidationQueue,
    getInvalidationStats,
} = require('../services/registry/sourceInvalidationQueue');
const { reinstateWithdrawnArtifacts } = require('../services/registry/registryInvalidation');

function argValue(flag) {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : null;
}

const COMMANDS = {
    async stats() {
        console.log(JSON.stringify(await getInvalidationStats(db), null, 2));
    },
    async process() {
        await enqueueExistingRetractions(db);
        console.log(JSON.stringify(await processInvalidationQueue(db, { limit: Number(argValue('--limit')) || 50 })));
    },
    async enqueue() {
        const result = await enqueueSourceInvalidation(db, {
            eventType: argValue('--type'),
            articleUid: argValue('--article'),
            normalizedTopic: argValue('--topic'),
            sourceRef: argValue('--ref'),
        });
        console.log(JSON.stringify(result));
    },
    async failed() {
        const rows = await db.all(
            `SELECT id, event_type, article_uid, normalized_topic, attempts, last_error, updated_at
             FROM source_invalidation_events WHERE status = 'failed' ORDER BY updated_at`
        );
        for (const r of rows) console.log(JSON.stringify(r));
        console.log(`\n${rows.length} failed event(s)`);
    },
    async reinstate() {
        const report = await reinstateWithdrawnArtifacts(db, { articleUid: argValue('--article'), reviewer: argValue('--reviewer') });
        console.log(JSON.stringify(report));
        if (!report.ok) process.exitCode = 1;
    },
};

(async () => {
    const command = COMMANDS[process.argv[2]];
    if (!command) {
        console.error('usage: sourceInvalidation.js <stats|process|enqueue|failed|reinstate>');
        process.exit(2);
    }
    try {
        await command();
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    } finally {
        if (typeof db.close === 'function') await db.close().catch(() => {});
    }
})();
