'use strict';

/**
 * Background jobs that generate content off the core loop (search -> synopsis -> learning), paused
 * by default. Each is a place to fail without anyone seeing: in one week topic-evolution was found
 * failing every night, and nothing surfaced it. Paused, not deleted - the code and data stay, and
 * SCHEDULERS_PAUSED turns any of them back on.
 *
 * Also paused: the jobs that spend on AI on a timer whether or not anyone is using the app. Topics are
 * reviewed about once a month (search-prewarm) and their AI content is made when someone opens it, so
 * hourly topic-knowledge refresh, claim regeneration every 90 seconds, curriculum seeding every 6 hours
 * and the nightly search evaluation (~40 live queries, plus model reranks) were mostly paying for
 * content nobody read: with one user they were most of the daily AI bill.
 *
 * Not paused: jobs that keep data correct (invalidation, retention, zombie sweep), cost nothing on AI
 * (digests, rollups, disk and anomaly checks), the monthly topic review, and learning-quality-eval.
 *
 * Kept apart from the registry so /health can report it without loading every scheduler.
 */
const DEFAULT_PAUSED = Object.freeze([
    'collective-memory',
    'topic-evolution',
    'knowledge-drift',
    'guideline-watchtower',
    'guideline-discovery-warm-start',
    'flagship-enrich',
    'topic-refresh',
    'claim-regeneration',
    'curriculum-seed',
    'offline-eval-nightly',
]);

/**
 * SCHEDULERS_PAUSED: unset uses DEFAULT_PAUSED; "none" runs everything; otherwise a comma list that
 * REPLACES the default (so "topic-evolution" alone re-enables the other five).
 */
function pausedSchedulers(env = process.env) {
    const raw = env.SCHEDULERS_PAUSED;
    if (raw === undefined || String(raw).trim() === '') return new Set(DEFAULT_PAUSED);
    if (String(raw).trim().toLowerCase() === 'none') return new Set();
    return new Set(String(raw).split(',').map((s) => s.trim()).filter(Boolean));
}

module.exports = { DEFAULT_PAUSED, pausedSchedulers };
