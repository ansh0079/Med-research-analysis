'use strict';

const logger = require('../../config/logger');

/**
 * Lightweight contradiction flags for paper synopsis vs guidelines / landmark context.
 * Prefer deterministic keyword polarity when LLM conflict extraction is unavailable.
 */

function claimPolarity(text) {
    const t = String(text || '')
        .toLowerCase()
        // Normalize so "not recommended" cannot also count as positive "recommended".
        .replace(/\bnot recommended\b/g, 'contraindicated');
    if (!t.trim()) return 'neutral';
    const neg = /\b(no (significant )?benefit|does not|did not|failed to|inferior|harm|increase[sd]? mortality|worsen|contraindicated|against)\b/.test(t);
    const pos = /\b(reduces?|improved?|superior|benefit|effective|recommended|first[-\s]?line|decreased mortality|safer)\b/.test(t);
    if (neg && !pos) return 'negative';
    if (pos && !neg) return 'positive';
    if (pos && neg) return 'mixed';
    return 'neutral';
}

function guidelineSnippet(g) {
    return [
        g.recommendation_text,
        g.recommendationText,
        g.title,
        g.cautions,
    ].filter(Boolean).map(String).join(' ').slice(0, 500);
}

function detectSynopsisGuidelineConflicts(synopsis = {}, guidelines = []) {
    const list = Array.isArray(guidelines) ? guidelines.slice(0, 6) : [];
    if (!list.length) return { conflicts: [], checked: false };

    const paperClaims = [
        synopsis.bottomLine,
        synopsis.mainFindings,
        synopsis.practiceImplication,
        synopsis.authorsConclusion,
        synopsis.takeaway,
    ].filter(Boolean).map(String);

    const paperPolarity = claimPolarity(paperClaims.join(' '));
    const conflicts = [];

    for (let i = 0; i < list.length; i++) {
        const g = list[i];
        const gText = guidelineSnippet(g);
        const gPolarity = claimPolarity(gText);
        if (paperPolarity === 'neutral' || gPolarity === 'neutral' || paperPolarity === 'mixed' || gPolarity === 'mixed') {
            continue;
        }
        if (paperPolarity !== gPolarity) {
            const body = g.source_body || g.sourceBody || g.organization || 'Guideline';
            const year = g.source_year || g.sourceYear || '';
            conflicts.push({
                level: 'major',
                versus: 'guideline',
                summary: `This paper's conclusion (${paperPolarity}) differs from ${body}${year ? ` (${year})` : ''} (${gPolarity}).`,
                detail: gText.slice(0, 280),
                guidelineIndex: i,
                paperPolarity,
                guidelinePolarity: gPolarity,
            });
        }
    }

    // Also surface LLM-provided conflicts if present
    const modelConflicts = Array.isArray(synopsis.evidenceConflicts) ? synopsis.evidenceConflicts : [];
    for (const c of modelConflicts.slice(0, 4)) {
        conflicts.push({
            level: c.level || 'nuanced',
            versus: c.versus || 'prior_evidence',
            summary: c.summary || c.detail || 'Potential conflict with prior evidence',
            detail: c.detail || null,
            source: 'llm',
        });
    }

    return {
        checked: true,
        conflicts: conflicts.slice(0, 6),
        hasConflict: conflicts.length > 0,
    };
}

function applySynopsisContradictionFlags(synopsis = {}, { guidelines = [] } = {}) {
    let detection;
    try {
        detection = detectSynopsisGuidelineConflicts(synopsis, guidelines);
    } catch (err) {
        logger.warn({ err }, 'synopsis contradiction detection failed');
        detection = { checked: false, conflicts: [], hasConflict: false };
    }
    const next = { ...synopsis };
    if (detection.conflicts.length) {
        next.evidenceConflicts = detection.conflicts.map((c) => ({
            level: c.level,
            versus: c.versus,
            summary: c.summary,
            detail: c.detail,
        }));
        const note = `Evidence conflict: ${detection.conflicts[0].summary}`;
        next.trustRationale = next.trustRationale ? `${next.trustRationale} ${note}` : note;
    }
    return { synopsis: next, contradictionAudit: detection };
}

module.exports = {
    claimPolarity,
    detectSynopsisGuidelineConflicts,
    applySynopsisContradictionFlags,
};
