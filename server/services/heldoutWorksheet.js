'use strict';

/**
 * Held-out labeling worksheet: validates the scenario catalog in
 * tests/fixtures/heldout/scenarios/ and graduated label fixtures before the
 * release gate (evalDatasetPolicy) ever sees them.
 *
 * A scenario is a labeling TARGET: a query plus intended sense, family,
 * stratification cell and labeler guidance. It is not a label. Graduated
 * fixtures (top-level tests/fixtures/heldout/*.json) carry the actual labels
 * and are the only inputs the release gate loads.
 *
 * Judgment schema per candidate (graduated fixtures):
 *   judgments: [{ candidateUid|pmid, labelledBy, labelledAt,
 *                 relevance: "on-topic"|"adjacent"|"off-topic",
 *                 applicability?, evidenceType?, support? }]
 *   adjudication: { adjudicatedBy, adjudicatedAt,
 *                   resolutions: [{ candidateUid, finalRelevance, note }] }
 * Two labelers judging the same candidate differently MUST have an
 * adjudication resolution; without one the fixture is invalid.
 */

const fs = require('fs');
const path = require('path');

const { normalizeQuery } = require('./evalDatasetPolicy');

const WORKSHEET_FILE = path.resolve(
    __dirname, '..', '..', 'tests', 'fixtures', 'heldout', 'scenarios', 'worksheet.json',
);

const RELEVENCE_CLASSES = Object.freeze(['on-topic', 'adjacent', 'off-topic']);
const APPLICABILITY_CLASSES = Object.freeze(['applicable', 'partial', 'not-applicable']);
const EVIDENCE_TYPES = Object.freeze(['guideline', 'trial', 'review', 'other']);
const SUPPORT_LEVELS = Object.freeze(['passage', 'abstract-only', 'metadata-only', 'unsupported']);

class WorksheetError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'WorksheetError';
        this.details = details;
    }
}

function loadWorksheet(file = WORKSHEET_FILE) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Structural validation of the scenario catalog itself. Throws WorksheetError. */
function validateWorksheet(sheet) {
    if (sheet?.kind !== 'heldout-labeling-worksheet') {
        throw new WorksheetError('worksheet must declare kind "heldout-labeling-worksheet"');
    }
    if (!Array.isArray(sheet.scenarios) || sheet.scenarios.length === 0) {
        throw new WorksheetError('worksheet has no scenarios');
    }
    const intents = new Set(sheet.intents || []);
    const dimensions = new Set(sheet.dimensions || []);
    const ids = new Set();
    const seen = new Set();
    for (const s of sheet.scenarios) {
        for (const field of ['id', 'intent', 'dimension', 'query', 'intendedSense', 'family']) {
            if (!String(s?.[field] || '').trim()) {
                throw new WorksheetError(`scenario ${s?.id || '(unknown)'} is missing "${field}"`);
            }
        }
        if (ids.has(s.id)) throw new WorksheetError(`duplicate scenario id "${s.id}"`);
        ids.add(s.id);
        if (!intents.has(s.intent)) throw new WorksheetError(`${s.id}: intent "${s.intent}" not in worksheet intents`);
        if (!dimensions.has(s.dimension)) throw new WorksheetError(`${s.id}: dimension "${s.dimension}" not in worksheet dimensions`);
        const key = normalizeQuery(s.query);
        if (seen.has(key)) throw new WorksheetError(`duplicate scenario query "${s.query}"`);
        seen.add(key);
    }
    return true;
}

function summarizeCoverage(sheet) {
    validateWorksheet(sheet);
    const byIntent = {};
    const byDimension = {};
    const byFamily = {};
    for (const s of sheet.scenarios) {
        byIntent[s.intent] = (byIntent[s.intent] || 0) + 1;
        byDimension[s.dimension] = (byDimension[s.dimension] || 0) + 1;
        byFamily[s.family] = (byFamily[s.family] || 0) + 1;
    }
    const total = sheet.scenarios.length;
    return { total, byIntent, byDimension, byFamily };
}

/** Diversity guard for GRADUATED held-out cases (per section 14.1 stratification). */
function checkDiversity(cases, guard = {}) {
    const maxFamily = guard.maxFamilyShare ?? 0.4;
    const maxCell = guard.maxCellShare ?? 0.15;
    const problems = [];
    const byFamily = {};
    const byCell = {};
    for (const c of cases) {
        byFamily[c.family || 'unknown'] = (byFamily[c.family || 'unknown'] || 0) + 1;
        const cell = `${c.intent || 'unknown'}/${c.dimension || 'unknown'}`;
        byCell[cell] = (byCell[cell] || 0) + 1;
    }
    const total = Math.max(cases.length, 1);
    for (const [family, n] of Object.entries(byFamily)) {
        if (n / total > maxFamily) {
            problems.push(`family "${family}" is ${(100 * n / total).toFixed(0)}% of held-out cases (cap ${Math.round(maxFamily * 100)}%)`);
        }
    }
    for (const [cell, n] of Object.entries(byCell)) {
        if (n / total > maxCell) {
            problems.push(`cell ${cell} is ${(100 * n / total).toFixed(0)}% of held-out cases (cap ${Math.round(maxCell * 100)}%)`);
        }
    }
    return problems;
}

function validateJudgments(testCase, label = 'case') {
    const problems = [];
    const byCandidate = new Map();
    for (const j of Array.isArray(testCase.judgments) ? testCase.judgments : []) {
        const who = String(j.labelledBy || '').trim();
        const when = String(j.labelledAt || '').trim();
        const uid = String(j.candidateUid || j.pmid || '').trim();
        if (!who || !when || !uid) {
            problems.push(`${label}: judgment missing labelledBy/labelledAt/candidateUid`);
            continue;
        }
        if (!RELEVENCE_CLASSES.includes(j.relevance)) {
            problems.push(`${label}: candidate ${uid} has invalid relevance "${j.relevance}"`);
        }
        if (j.applicability && !APPLICABILITY_CLASSES.includes(j.applicability)) {
            problems.push(`${label}: candidate ${uid} has invalid applicability "${j.applicability}"`);
        }
        if (j.evidenceType && !EVIDENCE_TYPES.includes(j.evidenceType)) {
            problems.push(`${label}: candidate ${uid} has invalid evidenceType "${j.evidenceType}"`);
        }
        if (j.support && !SUPPORT_LEVELS.includes(j.support)) {
            problems.push(`${label}: candidate ${uid} has invalid support "${j.support}"`);
        }
        const list = byCandidate.get(uid) || [];
        list.push(j);
        byCandidate.set(uid, list);
    }
    const resolutions = new Map();
    for (const r of Array.isArray(testCase.adjudication?.resolutions) ? testCase.adjudication.resolutions : []) {
        resolutions.set(String(r.candidateUid), r);
    }
    for (const [uid, judgments] of byCandidate) {
        const stances = new Set(judgments.map((j) => j.relevance));
        if (stances.size > 1 && !resolutions.has(uid)) {
            problems.push(`${label}: candidate ${uid} has disagreeing judgments without adjudication`);
        }
        const res = resolutions.get(uid);
        if (res && !RELEVENCE_CLASSES.includes(res.finalRelevance)) {
            problems.push(`${label}: adjudication for ${uid} has invalid finalRelevance "${res.finalRelevance}"`);
        }
    }
    if (resolutions.size > 0 && (!String(testCase.adjudication.adjudicatedBy || '').trim() || !String(testCase.adjudication.adjudicatedAt || '').trim())) {
        problems.push(`${label}: adjudication present but missing adjudicatedBy/adjudicatedAt`);
    }
    return problems;
}

/**
 * Validate a graduated held-out fixture against the worksheet: every labelled
 * case must map to a scenario (id + matching query), judgments must be
 * well-formed, and the diversity guard must pass. Returns { problems } —
 * an empty array means the fixture can be promoted to a top-level gate input.
 */
function validateGraduatedFixture(data, sheet = loadWorksheet()) {
    validateWorksheet(sheet);
    const byId = new Map(sheet.scenarios.map((s) => [s.id, s]));
    const problems = [];
    const cases = Array.isArray(data?.queries) ? data.queries : [];
    for (const c of cases) {
        const sid = String(c.scenarioId || '').trim();
        const scenario = byId.get(sid);
        if (!scenario) {
            problems.push(`case "${c.query}" references unknown scenarioId "${sid}"`);
        } else if (normalizeQuery(c.query) !== normalizeQuery(scenario.query)) {
            problems.push(`case "${c.query}" does not match scenario ${sid} query "${scenario.query}"`);
        } else {
            c.family = scenario.family;
            c.intent = scenario.intent;
            c.dimension = scenario.dimension;
        }
        problems.push(...validateJudgments(c, `case "${c.query}"`));
    }
    return problems;
}

/**
 * Aggregate stratification check across ALL graduated held-out cases (the
 * diversity guard is a property of the set, not of one fixture file).
 * Cases are mapped to worksheet scenarios by query to recover family/intent.
 */
function checkAggregateDiversity(heldoutCases, sheet = loadWorksheet()) {
    const byQuery = new Map(sheet.scenarios.map((s) => [normalizeQuery(s.query), s]));
    const enriched = heldoutCases.map((c) => {
        const s = byQuery.get(normalizeQuery(c.query));
        return s ? { ...c, family: s.family, intent: s.intent, dimension: s.dimension } : c;
    });
    const unknown = enriched.filter((c) => !c.family).map((c) => c.query);
    return { problems: checkDiversity(enriched, sheet.diversityGuard), unknownQueries: unknown };
}

module.exports = {
    WORKSHEET_FILE,
    RELEVENCE_CLASSES,
    APPLICABILITY_CLASSES,
    EVIDENCE_TYPES,
    SUPPORT_LEVELS,
    WorksheetError,
    loadWorksheet,
    validateWorksheet,
    summarizeCoverage,
    checkDiversity,
    validateJudgments,
    validateGraduatedFixture,
    checkAggregateDiversity,
};
