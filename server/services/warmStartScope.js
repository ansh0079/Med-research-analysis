'use strict';

/**
 * Warm-start scope. Warming amplifies whatever it touches, so it starts with the same
 * conditions as the first registry cohort and widens only when that is decided
 * deliberately (WARM_START_SCOPE=flagship, or options.scope), not by default.
 *
 * Demand is not the trigger here: there is no organic demand signal to forecast from, so
 * cohort membership is the forecast. Ordering follows the cohort list, so the conditions
 * the registry is completed first are warmed first.
 */

const registryCohort = require('../config/registryCohort.json');

function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-phrase match; abbreviations of three letters or fewer must match case-sensitively. */
function conditionMatcher(condition) {
    const phrases = [condition.conceptName, ...(condition.aliases || [])].filter(Boolean);
    const tests = phrases.map((phrase) => {
        if (phrase.length <= 3) {
            const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(phrase)}($|[^A-Za-z0-9])`);
            return (raw) => re.test(raw);
        }
        const needle = ` ${normalize(phrase)} `;
        return (raw) => ` ${normalize(raw)} `.includes(needle);
    });
    return (raw) => tests.some((test) => test(raw));
}

function resolveWarmStartScope(explicit, env = process.env) {
    const value = String(explicit || env.WARM_START_SCOPE || 'cohort').toLowerCase();
    return value === 'flagship' ? 'flagship' : 'cohort';
}

/** @returns {object[]} topics in warm order, each tagged with the cohort condition that admitted it */
function selectWarmStartTopics(topics, { scope = 'cohort', cohort = registryCohort } = {}) {
    const list = Array.isArray(topics) ? topics : [];
    if (scope === 'flagship') return list;
    const matchers = (cohort.conditions || []).map((condition) => ({ condition, matches: conditionMatcher(condition) }));
    const buckets = matchers.map(() => []);
    for (const entry of list) {
        const raw = String(entry?.topic || '');
        const index = matchers.findIndex(({ matches }) => matches(raw));
        if (index >= 0) buckets[index].push({ ...entry, _registryCondition: matchers[index].condition.conceptName });
    }
    return buckets.flat();
}

module.exports = { resolveWarmStartScope, selectWarmStartTopics, conditionMatcher };
