'use strict';

const { classifyArchetype } = require('../evidenceBouquet/archetype');
const { getCitationCount, getYear, isRCT, isReview } = require('../evidenceBouquet/articleClassifiers');

const PAPER_SIGNIFICANCE = Object.freeze([
    'landmark',
    'practice_changing',
    'confirmatory',
    'niche',
    'weak',
    'underpowered',
    'hypothesis_generating',
]);

const ARCHETYPE_TO_SIGNIFICANCE = {
    landmark_rct: 'landmark',
    landmark_basic_science: 'landmark',
    guideline: 'practice_changing',
    management_trial: 'confirmatory',
    recent_review: 'confirmatory',
    review: 'confirmatory',
    rct: 'confirmatory',
    cohort: 'hypothesis_generating',
    mechanism: 'niche',
    definition: 'niche',
    other: 'niche',
};

function normalizeSignificance(value) {
    const s = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (PAPER_SIGNIFICANCE.includes(s)) return s;
    if (s.includes('practice')) return 'practice_changing';
    if (s.includes('landmark') || s.includes('seminal')) return 'landmark';
    if (s.includes('underpower')) return 'underpowered';
    if (s.includes('hypothesis') || s.includes('explorat') || s.includes('pilot')) return 'hypothesis_generating';
    if (s.includes('confirm') || s.includes('replicat')) return 'confirmatory';
    if (s.includes('weak') || s.includes('low_quality')) return 'weak';
    return null;
}

/**
 * Heuristic calibration from citation/EBM/ranker features (LLM may override).
 */
function calibratePaperSignificance(article = {}, synopsis = {}) {
    const llm = normalizeSignificance(synopsis.paperSignificance || synopsis.whyThisPaperMatters);
    const archetype = classifyArchetype(article);
    const citations = getCitationCount(article);
    const year = getYear(article);
    const age = year ? (new Date().getFullYear() - year) : null;
    const text = [
        synopsis.weaknesses,
        synopsis.limitations,
        synopsis.trustRationale,
        synopsis.background,
    ].flat().filter(Boolean).join(' ').toLowerCase();

    let heuristic = ARCHETYPE_TO_SIGNIFICANCE[archetype] || 'niche';
    if (citations >= 300 && (isRCT(article) || isReview(article))) heuristic = 'landmark';
    else if (citations >= 100 && age != null && age >= 2) heuristic = heuristic === 'niche' ? 'confirmatory' : heuristic;

    if (/underpowered|small sample|pilot study|exploratory|hypothesis.generating|not powered/.test(text)) {
        heuristic = /underpowered|not powered|small sample/.test(text) ? 'underpowered' : 'hypothesis_generating';
    }
    if (/practice.changing|changes practice|should change/.test(text) && heuristic !== 'landmark') {
        heuristic = 'practice_changing';
    }
    if ((synopsis.trustRating === 'VERY_LOW' || synopsis.trustRating === 'LOW') && heuristic === 'confirmatory') {
        heuristic = 'weak';
    }

    const significance = llm || heuristic;
    return {
        paperSignificance: significance,
        whyThisPaperMatters: synopsis.whyThisPaperMatters
            || synopsis.background
            || `Calibrated as ${significance.replace(/_/g, ' ')} (${archetype}, ~${citations} citations).`,
        calibration: {
            source: llm ? 'llm_with_heuristic_fallback' : 'heuristic',
            llmSuggestion: llm,
            heuristic,
            archetype,
            citations,
            year,
        },
    };
}

function applyPaperSignificance(synopsis = {}, article = null) {
    const cal = calibratePaperSignificance(article || {}, synopsis);
    return {
        synopsis: {
            ...synopsis,
            paperSignificance: cal.paperSignificance,
            whyThisPaperMatters: cal.whyThisPaperMatters,
        },
        paperSignificanceAudit: cal.calibration,
    };
}

module.exports = {
    PAPER_SIGNIFICANCE,
    normalizeSignificance,
    calibratePaperSignificance,
    applyPaperSignificance,
};
