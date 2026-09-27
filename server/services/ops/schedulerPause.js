'use strict';

/**
 * Background jobs that generate content off the core loop (search -> synopsis -> learning), paused
 * by default. Each is a place to fail without anyone seeing: in one week topic-evolution was found
 * failing every night, and nothing surfaced it. Paused, not deleted - the code and data stay, and
 * SCHEDULERS_PAUSED turns any of them back on.
 *
 * Not paused: jobs that serve users directly (digests, topic/claim refresh, curriculum seed), keep
 * data correct (invalidation, retention, zombie sweep), or MEASURE rather than generate
 * (offline-eval-nightly, learning-quality-eval) - measurement is what the learning loop lacks.
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
