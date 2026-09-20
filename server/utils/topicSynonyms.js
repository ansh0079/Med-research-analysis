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
    // Ambiguous clinician abbreviations — primary sense only. Competing senses
    // (ACS = American Cancer Society / acute compartment syndrome) are rejected
    // at ranking time, not merged into the topic key.
    ['acs', 'acute coronary syndrome', 'acute coronary syndromes'],
    ['ms', 'multiple sclerosis'],
    ['ra', 'rheumatoid arthritis'],
    ['sirs', 'systemic inflammatory response syndrome'],
    ['sepsis', 'septic shock', 'sepsis and septic shock', 'sepsis-3', 'surviving sepsis campaign'],
    ['ohca', 'out of hospital cardiac arrest'],
    // PRES / PRESS — clinico-radiological hypertensive encephalopathy syndrome
    [
        'pres',
        'press',
        'posterior reversible encephalopathy syndrome',
        'posterior reversible encephalopathy',
        'reversible posterior leukoencephalopathy',
        'reversible posterior leukoencephalopathy syndrome',
        'hypertensive encephalopathy',
        'management of press',
        'management of pres',
    ],
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

/**
 * Resolve a raw topic to its condition cluster (TOPIC_SYNONYM_GROUPS), if any.
 * Used by embedding-based re-filing: the cluster's canonical key is the stable
 * filing target, so "AKI", "acute kidney injury", and "AKI diagnosis and
 * management" all resolve to the same condition group.
 *
 * Two match rules, in increasing looseness:
 *   - a multi-word group phrase must appear verbatim in the query;
 *   - a single-token group phrase is the group's abbreviation entry ('aki',
 *     'pres', 'copd') and matches as a whole query token.
 * Generic tokens must never match: "management" inside the PRES alias
 * "management of press" would otherwise drag that cluster into every
 * management query. When several clusters match, the longest matched phrase
 * wins (so "heart failure reduced ejection fraction" lands on HFrEF, not CHF).
 *
 * @param {string} rawTopic
 * @param {(s: string) => string} normalizeFn
 * @returns {{canonicalNormalized: string, keys: string[]}|null}
 */
function resolveConditionGroupForTopic(rawTopic, normalizeFn) {
    const normalize = typeof normalizeFn === 'function' ? normalizeFn : ((s) => String(s || '').toLowerCase().trim());
    const primary = normalize(String(rawTopic || '').trim());
    if (!primary) return null;
    const tokens = primary.split(' ').filter(Boolean);

    let best = null;
    for (const group of TOPIC_SYNONYM_GROUPS) {
        const normGroup = group.map((g) => normalize(g)).filter(Boolean);
        if (!normGroup.length) continue;
        let matchedPhrase = null;
        for (const phrase of normGroup) {
            const phraseTokens = phrase.split(' ').filter(Boolean);
            const hit = phraseTokens.length === 1
                ? tokens.includes(phrase)
                : primary.includes(phrase);
            if (hit && (!matchedPhrase || phrase.length > matchedPhrase.length)) {
                matchedPhrase = phrase;
            }
        }
        if (!matchedPhrase) continue;
        const keys = [...new Set(normGroup)].filter(Boolean);
        const canonicalNormalized = keys.reduce((bestKey, k) => (k.length > bestKey.length ? k : bestKey));
        if (!best || matchedPhrase.length > best.matchedPhrase.length) {
            best = { canonicalNormalized, keys, matchedPhrase };
        }
    }
    if (!best) return null;
    return { canonicalNormalized: best.canonicalNormalized, keys: best.keys };
}

module.exports = {
    TOPIC_SYNONYM_GROUPS,
    expandNormalizedTopicKeys,
    resolveCanonicalNormalized,
    resolveConditionGroupForTopic,
};
