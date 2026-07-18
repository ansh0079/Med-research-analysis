/**
 * Curated synonym / abbreviation groups (display phrases). Matching uses normalizeTopic() from the DB layer.
 * Extend over time for high-traffic teaching topics.
 */
const TOPIC_SYNONYM_GROUPS = [
    ['ards', 'acute respiratory distress syndrome', 'acute respiratory distress', 'acute lung injury'],
    ['copd', 'chronic obstructive pulmonary disease', 'chronic obstructive airways disease', 'copd exacerbation', 'acute copd exacerbation', 'aecopd'],
    // Keep HFrEF and HFpEF in separate clusters so merges do not cross phenotypes.
    ['chf', 'congestive heart failure', 'heart failure'],
    ['hfref', 'heart failure reduced ejection fraction', 'heart failure with reduced ejection fraction', 'guideline directed medical therapy for hfref', 'guideline-directed medical therapy for hfref'],
    ['hfpef', 'heart failure preserved ejection fraction', 'heart failure with preserved ejection fraction'],
    ['af', 'atrial fibrillation', 'atrial fibrillation anticoagulation'],
    ['aki', 'acute kidney injury', 'acute renal failure'],
    ['ckd', 'chronic kidney disease', 'chronic renal failure'],
    ['tia', 'transient ischemic attack', 'transient ischaemic attack'],
    ['stemi', 'st elevation myocardial infarction', 'st elevation mi'],
    ['nstemi', 'non st elevation myocardial infarction', 'non st elevation mi'],
    ['dvt', 'deep vein thrombosis', 'deep venous thrombosis'],
    ['pe', 'pulmonary embolism', 'pulmonary embolism diagnosis'],
    ['cap', 'community acquired pneumonia'],
    ['hap', 'hospital acquired pneumonia'],
    ['sirs', 'systemic inflammatory response syndrome'],
    ['sepsis', 'septic shock', 'sepsis and septic shock', 'sepsis-3', 'surviving sepsis campaign'],
    ['ohca', 'out of hospital cardiac arrest'],
];

/**
 * @param {string} normalized - already lowercased / collapsed per Database.normalizeTopic
 * @param {(s: string) => string} normalizeFn
 * @returns {string[]}
 */
function expandNormalizedTopicKeys(normalized, normalizeFn) {
    const out = new Set();
    if (normalized) out.add(normalized);
    const tokens = normalized.split(' ').filter(Boolean);
    for (const group of TOPIC_SYNONYM_GROUPS) {
        const normGroup = group.map((g) => normalizeFn(g)).filter(Boolean);
        const hit = normGroup.some((k) => k === normalized || tokens.includes(k));
        if (hit) normGroup.forEach((k) => out.add(k));
    }
    return [...out];
}

/**
 * Single stable key per synonym cluster: longest normalized phrase (descriptive anchor).
 * Used as topic_knowledge.canonical_normalized so "ARDS" and long-form queries share one row.
 *
 * @param {string} rawTopic
 * @param {(s: string) => string} normalizeFn
 */
function resolveCanonicalNormalized(rawTopic, normalizeFn) {
    const primary = normalizeFn(String(rawTopic || '').trim());
    if (!primary) return '';
    const keys = [...new Set(expandNormalizedTopicKeys(primary, normalizeFn))].filter(Boolean);
    if (!keys.length) return primary;
    return keys.reduce((best, k) => (k.length > best.length ? k : best));
}

module.exports = {
    TOPIC_SYNONYM_GROUPS,
    expandNormalizedTopicKeys,
    resolveCanonicalNormalized,
};
