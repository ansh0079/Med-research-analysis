'use strict';

/**
 * Bridge-demolition tracker. The embedding bridge (guidelineEmbeddingRefiling) is a
 * transitional layer: it may serve a condition only until that condition has a verified
 * registry entry. This report counts how many cohort conditions still depend on it; the
 * target is zero. Pure over the rows from db.getRegistryCoverage, so it is testable
 * without a database.
 */

function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function buildCoverageReport(cohort, coverageRows) {
    const byConcept = new Map(coverageRows.map((r) => [normalize(r.concept), r]));
    const conditions = (cohort.conditions || []).map((condition) => {
        const row = byConcept.get(normalize(condition.conceptName)) || {
            bridgeRows: 0, candidate: 0, verified: 0, superseded: 0, rejected: 0,
        };
        const verified = Number(row.verified || 0);
        const bridgeRows = Number(row.bridgeRows || 0);
        let state;
        if (verified > 0) state = bridgeRows > 0 ? 'registry_complete_bridge_rows_remain' : 'registry_complete';
        else if (bridgeRows > 0) state = 'bridge_dependent';
        else if (Number(row.candidate || 0) > 0) state = 'candidate_only';
        else state = 'uncovered';
        return {
            conceptName: condition.conceptName,
            specialty: condition.specialty,
            state,
            verified,
            candidate: Number(row.candidate || 0),
            bridgeRows,
        };
    });
    const count = (state) => conditions.filter((c) => c.state === state).length;
    return {
        total: conditions.length,
        registryComplete: conditions.filter((c) => c.verified > 0).length,
        bridgeDependent: count('bridge_dependent'),
        bridgeRowsToDemolish: conditions.filter((c) => c.verified > 0).reduce((n, c) => n + c.bridgeRows, 0),
        candidateOnly: count('candidate_only'),
        uncovered: count('uncovered'),
        conditions,
    };
}

function formatCoverageReport(report) {
    const lines = [
        `Registry cohort: ${report.registryComplete}/${report.total} conditions verified`,
        `Bridge-dependent conditions (target 0): ${report.bridgeDependent}`,
        `Bridge rows now demolishable (covered by a verified entry): ${report.bridgeRowsToDemolish}`,
        `Candidate-only: ${report.candidateOnly}   Uncovered: ${report.uncovered}`,
        '',
    ];
    for (const c of report.conditions) {
        lines.push(`${c.state.padEnd(38)} ${c.conceptName} (verified ${c.verified}, candidate ${c.candidate}, bridge rows ${c.bridgeRows})`);
    }
    return lines.join('\n');
}

module.exports = { buildCoverageReport, formatCoverageReport };
