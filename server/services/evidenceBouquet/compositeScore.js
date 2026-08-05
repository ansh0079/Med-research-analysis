const {
    CURRENT_YEAR,
    GRADE_ORDER,
    LANDMARK_CITATION_THRESHOLD,
    CLINICAL_PATTERNS,
} = require('./constants');
const { getJournalBonus } = require('./journalQuality');
const {
    getCitationCount,
    hasCitationData,
    getYear,
    isGuideline,
    guidelineAuthorityBonus,
    isRCT,
} = require('./articleClassifiers');
const { classifyArchetype } = require('./archetype');

function computeCompositeScore(article) {
    let score = 0;

    // 1. EBM score (0-7) → up to 35 points (increased weight — evidence pyramid is primary signal)
    const ebm = article._ebmScore ?? 0;
    score += (ebm / 7) * 35;

    // 2. Quality grade → up to 20 points
    const grade = GRADE_ORDER[(article._quality?.grade)] ?? 0;
    score += (grade / 4) * 20;

    // 3. Impact / citations → up to 18 points (log-scaled).
    //    Cap lowered from 25 so topical match can win Precision@5 against
    //    famous-but-less-relevant highly-cited papers.
    const citations = getCitationCount(article);
    score += Math.min(18, Math.log10(Math.max(1, citations)) * 4.2);

    // 4. Recency → up to 18 points
    const year = getYear(article);
    const age = Math.max(0, CURRENT_YEAR - year);
    const hasCitations = hasCitationData(article);
    const citedEnough = !hasCitations || citations >= 2 || age <= 2;
    const recencyScore = citedEnough
        ? (age <= 1 ? 18 : age <= 3 ? 14 : age <= 5 ? 9 : age <= 10 ? 4 : 0)
        : 0;
    score += recencyScore;

    // 4b. Recency × citations synergy → up to 6 points
    const recencyCitationScore = (recencyScore > 0 && citations > 0)
        ? Math.min(6, (Math.log10(citations + 1) * recencyScore) / 10)
        : 0;
    score += recencyCitationScore;

    // 5. Guideline bonus → up to 20 points, plus up to 10 for authoritative /
    //    widely-endorsed issuing bodies (WHO, NICE, AASLD, ACC/AHA, KDIGO, …).
    if (isGuideline(article)) score += 20 + guidelineAuthorityBonus(article);

    // 6. Open access → 5 points
    if (article.isFree || article.pmcid) score += 5;

    // 7. Landmark bonus → up to 15 points.
    //    Citation data is frequently missing for PubMed results, so a citation-gated
    //    bonus silently denies real landmark trials (which have huge real citation
    //    counts PubMed just doesn't report) the recognition it gives mediocre recent
    //    papers that happen to carry an OpenAlex citation count. Also treat a top-tier
    //    evidence study (RCT/SR/MA) in a flagship journal as a landmark candidate.
    const flagshipEvidence = (article._ebmScore ?? 0) >= 6 && getJournalBonus(article) >= 12;
    if (citations >= LANDMARK_CITATION_THRESHOLD || flagshipEvidence) score += 15;

    // 8. Journal prestige bonus (tiered whitelist: +6 / +12 / +18)
    score += getJournalBonus(article);

    // 9. Core journal bonus (from OpenAlex — catches journals not in our whitelist)
    if (article._openalexMetrics?.sourceIsCore) score += 5;

    // 10. Top citation percentile bonus
    if (article._openalexMetrics?.isTopCitationPercentile) score += 5;

    // Clinical signal bonus — reward patient-facing research
    const fullText = `${String(article.title || '')} ${String(article.abstract || '')}`;
    if (CLINICAL_PATTERNS.test(fullText)) score += 8;

    // Penalties
    if (article._isPreprint) score -= 15;
    if (article._retraction?.isRetracted) score = 0; // Will be filtered anyway
    // Penalise basic science archetype — deprioritise vs clinical evidence
    // Groundbreaking basic science (landmark-cited, top-tier journal, clinical translation) is exempt
    const archetype = classifyArchetype(article);
    if (archetype === 'mechanism') score -= 10;

    return Math.max(0, score);
}

module.exports = {
    computeCompositeScore,
};
