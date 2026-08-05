const {
    PRECLINICAL_PATTERNS,
    CLINICAL_PATTERNS,
    CLINICAL_TRANSLATION_PATTERNS,
    LANDMARK_CITATION_THRESHOLD,
} = require('./constants');
const { getJournalBonus } = require('./journalQuality');

// Major guideline-issuing bodies whose recommendations are widely adopted across
// health systems. A guideline endorsed by one of these is a stronger "widely
// followed / authoritative" signal than an unattributed or regional one.
const AUTHORITATIVE_GUIDELINE_BODIES = /\b(who|world health organization|nice|national institute for health and care excellence|uspstf|u\.s\. preventive services task force|cdc|centers for disease control|acc\b|american college of cardiology|aha\b|american heart association|esc\b|european society of cardiology|idsa|infectious diseases society|ats\b|american thoracic society|ers\b|european respiratory society|aasld|easl|american association for the study of liver|kdigo|ada\b|american diabetes association|easd|asco|nccn|acr\b|american college of (rheumatology|radiology|physicians)|acp\b|acg\b|american college of gastroenterology|aga\b|surviving sepsis|gina\b|gold\b|kdoqi|eular|endocrine society|nkf\b|national kidney foundation)\b/i;

// Signal that a guideline reflects multi-society / broadly-endorsed consensus.
const CONSENSUS_ENDORSEMENT_PATTERNS = /\b(joint (guideline|statement|task force)|multisociety|multi-society|international consensus|expert consensus|scientific statement|collaborative (statement|guideline)|endorsed by)\b/i;

function getCitationCount(article) {
    return article.citationCount ?? article.pmcrefcount ?? article._impact?.citations ?? 0;
}

// True only when the article carries a real citation count from a source that
// provides one (OpenAlex, Semantic Scholar). PubMed results have none, so a
// missing value means "unknown", not "zero" — callers must not treat a 0 from
// getCitationCount as evidence the paper is uncited.
// Only the raw source fields count: _impact.citations is DERIVED (computeImpactScore
// coerces missing counts to 0), so trusting it would re-fabricate a fake "0 citations"
// for PubMed articles after sanitization.
function hasCitationData(article) {
    return [article?.citationCount, article?.pmcrefcount]
        .some((v) => typeof v === 'number' && Number.isFinite(v));
}

function getYear(article) {
    return article.year ?? (article.pubdate ? parseInt(article.pubdate.slice(0, 4), 10) : null) ?? 0;
}

function isGuideline(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('guideline') || p.includes('consensus') || p.includes('practice guideline'))) return true;
    const title = String(article.title || '').toLowerCase();
    return /\bguidelines?\b|\bconsensus\b|\brecommendations?\b/.test(title);
}

function guidelineAuthorityBonus(article) {
    if (!isGuideline(article)) return 0;
    const { getJournalName } = require('./journalQuality');
    const text = `${String(article.title || '')} ${String(article.abstract || '')} ${getJournalName(article)}`;
    let bonus = 0;
    if (AUTHORITATIVE_GUIDELINE_BODIES.test(text)) bonus += 8;
    if (CONSENSUS_ENDORSEMENT_PATTERNS.test(text)) bonus += 4;
    return Math.min(10, bonus);
}

function isReview(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('review') || p.includes('meta-analysis') || p.includes('systematic review'))) return true;
    const ebm = article._ebmScore ?? 0;
    return ebm >= 7; // systematic review / meta-analysis threshold
}

function isRCT(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('randomized') || p.includes('controlled trial') || p.includes('clinical trial'))) return true;
    const ebm = article._ebmScore ?? 0;
    // EBM_SCORES: RCT = 6, controlled/clinical trial = 5 (was incorrectly === 5 only)
    return ebm === 6 || ebm === 5;
}

function isCohort(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('cohort') || p.includes('observational'))) return true;
    const ebm = article._ebmScore ?? 0;
    return ebm === 4;
}

function isPreclinical(article) {
    const title = String(article.title || '');
    const abstract = String(article.abstract || '');
    const text = `${title} ${abstract}`;
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());

    // Explicit pub type signals
    if (pubtypes.some((p) => p.includes('in vitro') || p.includes('animal') || p.includes('laboratory'))) return true;

    // Strong preclinical signal in title alone (most reliable)
    if (PRECLINICAL_PATTERNS.test(title)) return true;

    // Preclinical in abstract AND no clinical signal anywhere
    if (PRECLINICAL_PATTERNS.test(abstract) && !CLINICAL_PATTERNS.test(text)) return true;

    return false;
}

// A preclinical paper qualifies as "groundbreaking basic science" — and is allowed through
// the clinical filter — only if it is landmark-cited (≥300), published in a Tier 1 or Tier 2
// journal, and its abstract explicitly signals clinical translation or therapeutic relevance.
// This is a tight proxy for "cited by clinical trials / guidelines on the topic."
function isGroundbreakingBasicScience(article) {
    if (!isPreclinical(article)) return false;
    if (getCitationCount(article) < LANDMARK_CITATION_THRESHOLD) return false;
    if (getJournalBonus(article) < 12) return false; // Tier 1 or Tier 2 only
    const abstract = String(article.abstract || '');
    const title = String(article.title || '');
    return CLINICAL_TRANSLATION_PATTERNS.test(abstract) || CLINICAL_TRANSLATION_PATTERNS.test(title);
}

module.exports = {
    getCitationCount,
    hasCitationData,
    getYear,
    isGuideline,
    guidelineAuthorityBonus,
    isReview,
    isRCT,
    isCohort,
    isPreclinical,
    isGroundbreakingBasicScience,
};
