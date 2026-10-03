'use strict';

/**
 * Whether a search starts its AI extras straight away (paper synopses for the top results, the
 * consensus summary and live clinical answer, topic teaching-point seeding, flagship enrichment), or
 * leaves each to be made when someone opens it. Off by default: with few users most precomputed
 * extras were never read, and they were a large share of the AI bill. SEARCH_PRECOMPUTE_AI_EXTRAS=1
 * turns precomputation back on once enough people search the same topics for it to pay off.
 */
function shouldPrecomputeAiExtras(env = process.env) {
    const flag = String(env.SEARCH_PRECOMPUTE_AI_EXTRAS || '').toLowerCase();
    return flag === '1' || flag === 'true';
}

/** Topic teaching-point seeding from a search. AUTO_SEED_ON_SEARCH wins when set; otherwise it follows the precompute policy. */
function shouldAutoSeedFromSearch(env = process.env) {
    const flag = String(env.AUTO_SEED_ON_SEARCH || '').toLowerCase();
    if (flag === 'false' || flag === '0') return false;
    if (flag === 'true' || flag === '1') return true;
    return shouldPrecomputeAiExtras(env);
}

module.exports = { shouldAutoSeedFromSearch, shouldPrecomputeAiExtras };
