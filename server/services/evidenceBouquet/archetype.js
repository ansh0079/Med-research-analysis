const {
    CURRENT_YEAR,
    LANDMARK_CITATION_THRESHOLD,
    RECENT_YEARS,
    ARCHETYPE_PATTERNS,
} = require('./constants');
const { getJournalBonus } = require('./journalQuality');
const {
    getCitationCount,
    getYear,
    isGuideline,
    isReview,
    isRCT,
    isCohort,
} = require('./articleClassifiers');

function classifyArchetype(article) {
    const title = String(article.title || '');
    const abstract = String(article.abstract || '');
    const text = `${title} ${abstract}`;
    const citations = getCitationCount(article);
    const year = getYear(article);
    const age = CURRENT_YEAR - year;

    if (isGuideline(article)) return 'guideline';
    if (isReview(article)) {
        if (ARCHETYPE_PATTERNS.definition.test(text)) return 'definition';
        if (age <= RECENT_YEARS) return 'recent_review';
        return 'review';
    }
    if (isRCT(article)) {
        if (citations >= LANDMARK_CITATION_THRESHOLD && age >= 3) return 'landmark_rct';
        if (ARCHETYPE_PATTERNS.management_trial.test(text)) return 'management_trial';
        return 'rct';
    }
    if (ARCHETYPE_PATTERNS.mechanism.test(text)) {
        if (citations >= LANDMARK_CITATION_THRESHOLD && getJournalBonus(article) >= 12) return 'landmark_basic_science';
        return 'mechanism';
    }
    if (isCohort(article)) return 'cohort';
    return 'other';
}

function mapStudyTypesToArchetypes(studyTypes = []) {
    const out = new Set();
    for (const st of studyTypes) {
        const s = String(st).toLowerCase();
        if (s.includes('randomized controlled trial')) {
            out.add('landmark_rct');
            out.add('management_trial');
            out.add('rct');
        }
        if (s.includes('systematic review') || s.includes('meta-analysis')) {
            out.add('recent_review');
            out.add('review');
        }
        if (s.includes('clinical trial')) {
            out.add('management_trial');
            out.add('rct');
        }
        if (s.includes('practice guideline') || s.includes('guideline')) {
            out.add('guideline');
        }
        if (s.includes('cohort')) {
            out.add('cohort');
        }
        if (s.includes('case report')) {
            out.add('other');
        }
        if (s.includes('cross-sectional')) {
            out.add('other');
        }
    }
    return [...out];
}

module.exports = {
    classifyArchetype,
    mapStudyTypesToArchetypes,
};
