'use strict';

/**
 * Guideline extraction reads a publication year out of free text, and free text
 * contains other years. A WHO hepatitis B row arrived carrying `source_year: 2030`
 * because the recommendation it was pulled from talks about 2030 elimination
 * targets; the row then rendered to a reader as a guideline published in 2030 and
 * sorted ahead of every real one.
 *
 * Old years are kept: the 1992 ACCP/SCCM sepsis definitions are a genuine
 * publication, not a parse error. Only impossible ones are rejected.
 */
const EARLIEST_PLAUSIBLE_YEAR = 1900;

/**
 * @returns {number|null} the year, or null when it is absent or impossible.
 *   Callers store null rather than a wrong number — an unknown year sorts last,
 *   a fabricated future one sorts first.
 */
function sanitizePublicationYear(value, { now = new Date() } = {}) {
    if (value === null || value === undefined || value === '') return null;
    const year = parseInt(value, 10);
    if (!Number.isFinite(year)) return null;
    // Ahead-of-print carries next year's date, so allow one year of lead.
    const latestPlausible = now.getFullYear() + 1;
    if (year < EARLIEST_PLAUSIBLE_YEAR || year > latestPlausible) return null;
    return year;
}

module.exports = { sanitizePublicationYear, EARLIEST_PLAUSIBLE_YEAR };
