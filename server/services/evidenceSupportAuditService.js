'use strict';

const {
    claimStructureFindings, mcqFormFindings, expectedLongestIsKeyRate,
} = require('../utils/evidenceSupport');

/**
 * Audits whether generated teaching content is answerable from the evidence it
 * cites, and reports it as counts against a stated baseline rather than as a
 * pass/fail badge.
 *
 * The existing checks do not cover this. `citationCheckPassed` verifies that a
 * citation marker like [1] or [G2] points at an in-range index, and
 * claimGuidelineAlignmentService scores token overlap with a negation guard.
 * Both are satisfied by a claim the cited passage never supports.
 *
 * Nothing here deletes or hides content. The output is evidence about the
 * generator, for a human to act on.
 */

const MCQ_OBJECT_TYPES = ['guideline_mcq', 'paper_mcq', 'cold_start_mcq'];

function tally(findings, into) {
    for (const { code } of findings) into.set(code, (into.get(code) || 0) + 1);
}

function mapToSortedCounts(map) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ code, count }));
}

/**
 * @param {object} db connected database
 * @param {{limit?: number}} options
 * @returns {Promise<{total: number, affected: number, findings: Array}>}
 */
async function auditStoredClaims(db, { limit = 0 } = {}) {
    const rows = await db.all(
        `SELECT claim_key, claim_text, evidence_quote, article_uid, normalized_topic
         FROM teaching_object_claims
         ORDER BY created_at DESC${limit > 0 ? ' LIMIT ?' : ''}`,
        limit > 0 ? [limit] : []
    );

    const counts = new Map();
    const examples = new Map();
    let affected = 0;
    for (const row of rows) {
        const findings = claimStructureFindings({
            claimText: row.claim_text,
            evidenceQuote: row.evidence_quote,
        });
        if (!findings.length) continue;
        affected += 1;
        tally(findings, counts);
        for (const { code } of findings) {
            if (!examples.has(code)) {
                examples.set(code, {
                    claimKey: row.claim_key,
                    topic: row.normalized_topic,
                    claim: String(row.claim_text || '').slice(0, 160),
                    quote: String(row.evidence_quote || '').slice(0, 160),
                });
            }
        }
    }
    return {
        total: rows.length,
        affected,
        findings: mapToSortedCounts(counts).map((f) => ({ ...f, example: examples.get(f.code) })),
    };
}

/**
 * Cueing is reported as observed-versus-chance, never as a raw count. "6,447
 * questions have the longest option as the key" means nothing until set against
 * the rate an uncued bank of the same shape would show.
 */
async function auditStoredMcqs(db, { limit = 0 } = {}) {
    const placeholders = MCQ_OBJECT_TYPES.map(() => '?').join(', ');
    const rows = await db.all(
        `SELECT object_key, object_payload, normalized_topic
         FROM teaching_objects
         WHERE object_type IN (${placeholders})
         ORDER BY created_at DESC${limit > 0 ? ' LIMIT ?' : ''}`,
        limit > 0 ? [...MCQ_OBJECT_TYPES, limit] : [...MCQ_OBJECT_TYPES]
    );

    const counts = new Map();
    const examples = new Map();
    const optionCounts = [];
    let total = 0;
    let affected = 0;
    let keyIsLongest = 0;

    for (const row of rows) {
        let payload = row.object_payload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch { continue; }
        }
        const mcqs = Array.isArray(payload?.mcqs) ? payload.mcqs : [];
        for (const mcq of mcqs) {
            total += 1;
            if (Array.isArray(mcq.options)) optionCounts.push(mcq.options.length);
            const findings = mcqFormFindings(mcq);
            if (findings.some((f) => f.code === 'key_is_longest_option')) keyIsLongest += 1;
            if (!findings.length) continue;
            affected += 1;
            tally(findings, counts);
            for (const { code, detail } of findings) {
                if (!examples.has(code)) {
                    examples.set(code, {
                        objectKey: row.object_key,
                        topic: row.normalized_topic,
                        question: String(mcq.question || mcq.vignette || '').slice(0, 160),
                        detail: detail || null,
                    });
                }
            }
        }
    }

    const chance = expectedLongestIsKeyRate(optionCounts);
    const observed = total ? keyIsLongest / total : null;
    return {
        total,
        affected,
        cueing: {
            keyIsLongest,
            observedRate: observed,
            chanceRate: chance,
            // How many more questions carry the cue than chance explains.
            excessOverChance: chance !== null && observed !== null
                ? Math.round((observed - chance) * total)
                : null,
        },
        findings: mapToSortedCounts(counts).map((f) => ({ ...f, example: examples.get(f.code) })),
    };
}

async function auditEvidenceSupport(db, options = {}) {
    const [claims, mcqs] = await Promise.all([
        auditStoredClaims(db, options),
        auditStoredMcqs(db, options),
    ]);
    return { generatedAt: new Date().toISOString(), claims, mcqs };
}

module.exports = { auditEvidenceSupport, auditStoredClaims, auditStoredMcqs, MCQ_OBJECT_TYPES };
