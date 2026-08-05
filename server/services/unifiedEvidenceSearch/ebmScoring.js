// EBM evidence hierarchy — higher score = stronger study design
const EBM_SCORES = {
    'clinical practice guideline': 7,
    'practice guideline': 7,
    'guideline': 7,
    'consensus development conference': 6,
    'consensus statement': 6,
    'systematic review': 7,
    'meta-analysis': 7,
    'meta analysis': 7,
    'randomized controlled trial': 6,
    'randomised controlled trial': 6,
    'rct': 6,
    'controlled clinical trial': 5,
    'clinical trial': 5,
    'cohort study': 4,
    'cohort': 4,
    'case-control': 3,
    'case control': 3,
    'cross-sectional': 2,
    'cross sectional': 2,
    'case report': 1,
    'case series': 1,
    'editorial': 0,
    'letter': 0,
    'comment': 0,
};

function getEbmScore(article) {
    const types = [
        ...(Array.isArray(article.pubtype) ? article.pubtype : []),
        article.studyDesign || '',
    ].map((t) => (t || '').toLowerCase());
    let best = -1;
    for (const [keyword, score] of Object.entries(EBM_SCORES)) {
        if (types.some((t) => t.includes(keyword))) best = Math.max(best, score);
    }
    return best >= 0 ? best : 2; // default to cross-sectional tier
}

function isPreprint(article) {
    const sources = ['biorxiv', 'medrxiv', 'preprint', 'ssrn', 'researchsquare'];
    const text = ((article.source || '') + (article.journal || '')).toLowerCase();
    return sources.some((s) => text.includes(s));
}

module.exports = {
    getEbmScore,
    isPreprint,
};
