'use strict';

/**
 * Guideline discovery warm-start.
 *
 * Problem: the first search on a new topic returned an empty guideline panel —
 * guidelines are discovered on demand, so a tester's entire first impression of
 * a topic was "nothing found" while discovery ran (or had never been kicked
 * from the search path at all).
 *
 * This scheduler walks the in-scope topics (the registry cohort's conditions by default;
 * the whole flagship catalog only when WARM_START_SCOPE=flagship) and kicks discovery for every
 * topic whose guideline panel is still empty, so by the time a user first
 * asks, the panel is far more likely to be populated. It uses each flagship
 * entry's curated `guidelineQueries[0]` as the PubMed search string — a better
 * query than the raw topic name — falling back to the condition-spelled-out
 * default inside kickGuidelineDiscoveryIfEmpty.
 *
 * Guardrails, matching the curriculum seed scheduler's posture:
 *  - only runs when at least one provider key is configured;
 *  - a bounded number of kicks per cycle (discovery itself is provider-bound);
 *  - skips topics already served, in flight, or already attempted-empty
 *    (kickGuidelineDiscoveryIfEmpty owns those gates, reused not duplicated);
 *  - per-topic errors are logged and never abort the cycle.
 */

const logger = require('../config/logger');
const {
    kickGuidelineDiscoveryIfEmpty,
    canRunGuidelineDiscovery,
} = require('./guidelineService');

const { resolveWarmStartScope, selectWarmStartTopics } = require('./warmStartScope');

const DEFAULT_STARTUP_DELAY_MS = 90_000;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_KICKS_PER_CYCLE = 5;
const FLAGSHIP_CONFIG_PATH = require('path').join(__dirname, '../config/flagshipTopics.json');

let intervalId = null;
let startupTimer = null;
let running = false;

function loadFlagshipTopics(configPath = FLAGSHIP_CONFIG_PATH) {
    const fs = require('fs');
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Array.isArray(raw.topics) ? raw.topics : [];
}

/**
 * One warm-start cycle. Exported for tests.
 *
 * @param {object} deps
 * @param {object} deps.db
 * @param {object} deps.serverConfig
 * @param {object} [deps.aiService]
 * @param {object} [deps.options]
 * @param {number} [deps.options.maxKicksPerCycle]
 * @param {string} [deps.options.flagshipConfigPath]
 * @param {object} [deps.log]
 * @returns {Promise<{scanned: number, served: number, kicked: number, skipped: string|null}>}
 */
async function runGuidelineDiscoveryWarmStart({ db, serverConfig, aiService, options = {}, log = logger }) {
    const outcome = { scanned: 0, served: 0, kicked: 0, skipped: null, scope: 'cohort', inScope: 0 };
    if (!db || typeof db.getGuidelinesByTopic !== 'function') {
        outcome.skipped = 'no_db';
        return outcome;
    }
    if (!canRunGuidelineDiscovery(serverConfig)) {
        outcome.skipped = 'no_provider_keys';
        return outcome;
    }
    const maxKicks = Math.max(1, Number(options.maxKicksPerCycle ?? DEFAULT_MAX_KICKS_PER_CYCLE) || DEFAULT_MAX_KICKS_PER_CYCLE);

    let topics;
    try {
        topics = loadFlagshipTopics(options.flagshipConfigPath);
    } catch (err) {
        log.warn({ err }, 'guideline warm-start: failed to load flagship config');
        outcome.skipped = 'config_unavailable';
        return outcome;
    }
    // Warming amplifies what it touches, so it starts with the registry cohort's conditions and
    // widens to the whole flagship catalogue only by explicit choice (see warmStartScope.js).
    outcome.scope = resolveWarmStartScope(options.scope);
    const flagshipTotal = topics.length;
    topics = selectWarmStartTopics(topics, { scope: outcome.scope });
    outcome.scanned = flagshipTotal;
    outcome.inScope = topics.length;

    for (const entry of topics) {
        if (outcome.kicked >= maxKicks) break;
        const topic = String(entry?.topic || '').trim();
        if (!topic) continue;
        try {
            const existing = await db.getGuidelinesByTopic(topic, { limit: 1 });
            if (existing.length > 0) {
                outcome.served += 1;
                continue;
            }
            const status = kickGuidelineDiscoveryIfEmpty(topic, {
                db,
                serverConfig,
                aiService,
                log,
                searchQuery: Array.isArray(entry.guidelineQueries) && entry.guidelineQueries.length
                    ? entry.guidelineQueries[0]
                    : undefined,
            });
            if (status === 'pending') outcome.kicked += 1;
        } catch (err) {
            log.warn({ err, topic }, 'guideline warm-start: topic check failed; skipping');
        }
    }
    return outcome;
}

function scheduleGuidelineDiscoveryWarmStart({ db, serverConfig, aiService, log = logger } = {}) {
    stopGuidelineDiscoveryWarmStart();
    const run = () => {
        if (running) return;
        running = true;
        runGuidelineDiscoveryWarmStart({ db, serverConfig, aiService, log })
            .then((outcome) => {
                if (outcome.skipped) {
                    log.debug({ skipped: outcome.skipped }, 'guideline warm-start cycle skipped');
                } else {
                    log.info(outcome, 'guideline warm-start cycle complete');
                }
            })
            .catch((err) => log.warn({ err }, 'guideline warm-start cycle failed'))
            .finally(() => { running = false; });
    };
    startupTimer = setTimeout(() => {
        run();
        intervalId = setInterval(run, DEFAULT_INTERVAL_MS);
    }, DEFAULT_STARTUP_DELAY_MS);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    return scheduleGuidelineDiscoveryWarmStart;
}

function stopGuidelineDiscoveryWarmStart() {
    if (startupTimer) clearTimeout(startupTimer);
    if (intervalId) clearInterval(intervalId);
    startupTimer = null;
    intervalId = null;
}

module.exports = {
    runGuidelineDiscoveryWarmStart,
    scheduleGuidelineDiscoveryWarmStart,
    stopGuidelineDiscoveryWarmStart,
};
