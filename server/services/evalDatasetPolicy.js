'use strict';

/**
 * Eval dataset policy: tuning and held-out cases are physically separate and the
 * release gate can only load held-out ones.
 *
 * - Fixtures under tests/fixtures/ declare "split": "tuning" (used to develop and
 *   tune ranking; anything here may be overfit to).
 * - Fixtures under tests/fixtures/heldout/ declare "split": "heldout" and every case
 *   must carry provenance: who labelled it, when, from what source, and which
 *   clinical sense the query intends.
 * - loadReleaseGateCases() throws on a tuning fixture, on missing provenance, and on
 *   any held-out query that also appears in a tuning fixture (leakage).
 */

const fs = require('fs');
const path = require('path');

const FIXTURE_DIR = path.resolve(__dirname, '..', '..', 'tests', 'fixtures');
const HELDOUT_DIR = path.join(FIXTURE_DIR, 'heldout');
const REQUIRED_PROVENANCE = Object.freeze(['labelledBy', 'labelledAt', 'source', 'intendedSense']);

class EvalSplitViolation extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'EvalSplitViolation';
        this.details = details;
    }
}

function normalizeQuery(query) {
    return String(query || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function readFixture(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listJson(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => path.join(dir, name));
}

function tuningFixtureFiles(fixtureDir = FIXTURE_DIR) {
    return listJson(fixtureDir).filter((file) => {
        try {
            const data = readFixture(file);
            return Array.isArray(data.queries) && data.split === 'tuning';
        } catch {
            return false;
        }
    });
}

function tuningQueryKeys(fixtureDir = FIXTURE_DIR) {
    const keys = new Set();
    for (const file of tuningFixtureFiles(fixtureDir)) {
        for (const c of readFixture(file).queries) keys.add(normalizeQuery(c.query));
    }
    return keys;
}

function missingProvenance(testCase) {
    const prov = testCase?.provenance || {};
    return REQUIRED_PROVENANCE.filter((field) => !String(prov[field] || '').trim());
}

/**
 * @returns {{ cases: object[], files: string[] }} held-out cases, validated
 * @throws {EvalSplitViolation}
 */
function loadReleaseGateCases({ heldoutDir = HELDOUT_DIR, fixtureDir = FIXTURE_DIR } = {}) {
    const tuningKeys = tuningQueryKeys(fixtureDir);
    const cases = [];
    const files = listJson(heldoutDir);
    for (const file of files) {
        const data = readFixture(file);
        if (data.split !== 'heldout') {
            throw new EvalSplitViolation(
                `${path.basename(file)} declares split "${data.split}"; the release gate loads only "heldout" fixtures`,
                { file },
            );
        }
        for (const c of Array.isArray(data.queries) ? data.queries : []) {
            const missing = missingProvenance(c);
            if (missing.length) {
                throw new EvalSplitViolation(
                    `held-out case "${c.query}" is missing provenance: ${missing.join(', ')}`,
                    { file, query: c.query, missing },
                );
            }
            if (tuningKeys.has(normalizeQuery(c.query))) {
                throw new EvalSplitViolation(
                    `held-out case "${c.query}" also appears in a tuning fixture`,
                    { file, query: c.query },
                );
            }
            cases.push({ ...c, split: 'heldout' });
        }
    }
    return { cases, files };
}

/** Informational summary for the dataset check script. Never throws. */
function describeDatasets({ heldoutDir = HELDOUT_DIR, fixtureDir = FIXTURE_DIR } = {}) {
    const tuning = tuningFixtureFiles(fixtureDir).map((file) => {
        const queries = readFixture(file).queries;
        return {
            file: path.basename(file),
            cases: queries.length,
            withProvenance: queries.filter((c) => missingProvenance(c).length === 0).length,
        };
    });
    let heldout = { cases: 0, files: 0, error: null };
    try {
        const loaded = loadReleaseGateCases({ heldoutDir, fixtureDir });
        heldout = { cases: loaded.cases.length, files: loaded.files.length, error: null };
    } catch (err) {
        heldout = { cases: 0, files: 0, error: err.message };
    }
    return { tuning, heldout };
}

/**
 * Would this query leak tuning data into the held-out split? Asked before a labelled scenario is
 * exported, so leakage is refused at the point it is created rather than at the gate.
 */
function isHeldoutLeakage(query, fixtureDir = FIXTURE_DIR) {
    const key = normalizeQuery(query);
    return Boolean(key) && tuningQueryKeys(fixtureDir).has(key);
}

module.exports = {
    EvalSplitViolation,
    REQUIRED_PROVENANCE,
    HELDOUT_DIR,
    normalizeQuery,
    tuningFixtureFiles,
    isHeldoutLeakage,
    loadReleaseGateCases,
    describeDatasets,
};
