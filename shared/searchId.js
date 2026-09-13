'use strict';

/**
 * Normalize a search identifier for storage and comparison.
 *
 * `searches.id` is a uuid in production Postgres but an INTEGER in local SQLite.
 * Call sites used to coerce with `Number(searchId)`, which silently turns every
 * production uuid into `NaN` -- that made `/api/search/impressions` and
 * `/api/search/interaction` reject every request with a 400, so no impression,
 * click or dwell signal could ever be recorded.
 *
 * Returning a string works for both dialects: Postgres accepts the uuid text form,
 * and SQLite's dynamic typing coerces a numeric string back to an integer.
 *
 * @param {unknown} value
 * @returns {string|null} the id as a string, or null when absent/blank
 */
function normalizeEntityId(value) {
    if (value == null) return null;
    const str = String(value).trim();
    if (!str || str === 'null' || str === 'undefined' || str === 'NaN') return null;
    return str;
}

/**
 * The same coercion for any other id that is uuid in production Postgres and
 * INTEGER in local SQLite. `quiz_attempts.id` hit exactly the bug described
 * above: `Number(uuid)` is NaN, so search_learning_outcomes.quiz_attempt_id was
 * never written and the learning evaluation had nothing to join against.
 *
 * Exported under both names so existing search call sites keep reading naturally
 * while non-search callers are not forced to import something called
 * "normalizeSearchId" for a quiz attempt.
 */
const normalizeSearchId = normalizeEntityId;

module.exports = { normalizeSearchId, normalizeEntityId };
