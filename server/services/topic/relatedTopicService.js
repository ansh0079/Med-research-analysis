/**
 * Related Topic Service
 *
 * Determines semantic similarity between clinical topics to enable
 * cross-topic "Just-in-Time" misconception reminders.
 *
 * Example: A user searching "Sepsis" who has a recorded misconception
 * about "steroid timing in ARDS" should see a reminder about the
 * difference between steroid evidence in ARDS vs Sepsis.
 *
 * Implementation: lightweight keyword overlap + shared medical terms.
 * Future improvement: use embedding similarity or MeSH term overlap.
 */

const MEDICAL_TOPIC_KEYWORDS = {
    // Respiratory
    ards: ['respiratory', 'lung', 'ventilation', 'peep', 'fio2', 'hypoxia', 'ards', 'mechanical ventilation'],
    copd: ['copd', 'emphysema', 'chronic obstructive', 'bronchitis', 'smoking', 'niv', 'hypercapnia'],
    asthma: ['asthma', 'bronchospasm', 'inhaler', 'salbutamol', 'albuterol', 'wheeze'],
    pneumonia: ['pneumonia', 'infection', 'consolidation', 'antibiotic', 'chest x-ray', ' infiltrate'],
    'covid-19': ['covid', 'sars-cov-2', 'coronavirus', 'pneumonia', 'ards', 'remdesivir', 'dexamethasone'],

    // Cardiovascular
    sepsis: ['sepsis', 'septic shock', 'lactate', 'vasopressor', 'norepinephrine', 'fluid resuscitation', 'bundle'],
    'acute coronary syndrome': ['acs', 'mi', 'myocardial infarction', 'stemi', 'nstemi', 'troponin', 'antiplatelet'],
    'heart failure': ['heart failure', 'hfref', 'hfpef', 'diuretic', 'furosemide', 'bnp', 'nt-probnp'],
    'pulmonary embolism': ['pe', 'pulmonary embolism', 'dvt', 'anticoagulation', 'rivaroxaban', 'apixaban', 'heparin'],
    hypertension: ['hypertension', 'blood pressure', 'ace inhibitor', 'arb', 'amlodipine'],

    // Renal / Metabolic
    'acute kidney injury': ['aki', 'acute kidney injury', 'creatinine', 'uraemia', 'renal replacement', 'diuretic', 'fluid'],
    'chronic kidney disease': ['ckd', 'chronic kidney disease', 'dialysis', 'esrd', 'creatinine', 'egfr'],
    'diabetic ketoacidosis': ['dka', 'ketoacidosis', 'insulin', 'hyperglycaemia', 'acidosis', 'ketones'],

    // Neuro
    stroke: ['stroke', 'thrombolysis', 'alteplase', 'nihss', 'ischemic', 'haemorrhagic', 'tpa'],
    'subarachnoid hemorrhage': ['sah', 'subarachnoid', 'aneurysm', 'nimodipine', 'vasospasm'],

    // GI
    'upper gi bleed': ['gi bleed', 'varices', 'ppi', 'endoscopy', 'haematemesis', 'melaena', 'transfusion'],
    'acute pancreatitis': ['pancreatitis', 'amylase', 'lipase', 'gallstone', 'alcohol', 'ranson', 'glasgow'],

    // Haematology / Oncology
    anaemia: ['anaemia', 'transfusion', 'iron', 'b12', 'folate', 'haemoglobin'],
    'venous thromboembolism': ['vte', 'dvt', 'pe', 'anticoagulation', 'warfarin', 'doac', 'heparin'],

    // Infectious Disease
    meningitis: ['meningitis', 'encephalitis', 'cefotaxime', 'ampicillin', 'aciclovir', 'lp', 'csf'],
    'cellulitis': ['cellulitis', 'skin infection', 'antibiotic', 'flucloxacillin'],

    // Endocrine
    'thyroid': ['thyroid', 'hypothyroidism', 'hyperthyroidism', 'levothyroxine', 'tsh', 'ft4'],
    'adrenal': ['adrenal', 'addison', 'cushing', 'steroid', 'hydrocortisone', 'dexamethasone'],

    // Rheumatology
    'gout': ['gout', 'urate', 'allopurinol', 'colchicine', 'nsaid', 'joint'],
};

function normalizeTopicForKeywords(topic) {
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim();
}

function extractKeywords(topic) {
    const normalized = normalizeTopicForKeywords(topic);
    const words = normalized.split(/\s+/).filter((w) => w.length > 2);

    // Direct lookup in keyword map — prefer compound/multi-word keys first,
    // then earliest appearance in the string, then longest length.
    const scoredEntries = Object.entries(MEDICAL_TOPIC_KEYWORDS)
        .map(([key, keywords]) => {
            const pattern = new RegExp(`(?:^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`);
            const match = pattern.exec(normalized);
            return {
                key,
                keywords,
                match,
                score: match
                    ? (key.includes('-') || key.includes(' ') ? 10000 : 0)
                      - match.index * 10
                      + key.length
                    : -Infinity,
            };
        })
        .filter((e) => e.match)
        .sort((a, b) => b.score - a.score);

    if (scoredEntries.length > 0) {
        return new Set([...words, ...scoredEntries[0].keywords]);
    }

    return new Set(words);
}

/**
 * Compute a simple similarity score between two topics (0–1).
 */
function topicSimilarity(topicA, topicB) {
    const keywordsA = extractKeywords(topicA);
    const keywordsB = extractKeywords(topicB);

    if (keywordsA.size === 0 || keywordsB.size === 0) return 0;

    const intersection = new Set([...keywordsA].filter((k) => keywordsB.has(k)));
    const union = new Set([...keywordsA, ...keywordsB]);

    return intersection.size / union.size;
}

/**
 * Find topics related to the query topic from a user's topic memory.
 *
 * @param {string} queryTopic — the topic currently being searched
 * @param {object[]} userTopics — array of { normalizedTopic, displayTopic, misconceptions[] }
 * @param {object} [options]
 * @param {number} [options.similarityThreshold=0.15]
 * @param {number} [options.maxResults=3]
 * @returns {object[]} related topics with their misconceptions
 */
function findRelatedTopicsWithMisconceptions(queryTopic, userTopics, {
    similarityThreshold = 0.15,
    maxResults = 3,
} = {}) {
    if (!queryTopic || !Array.isArray(userTopics)) return [];

    const queryNormalized = normalizeTopicForKeywords(queryTopic);

    const scored = userTopics
        .filter((ut) => {
            // Must have misconceptions
            const hasMisconceptions = Array.isArray(ut.misconceptions) && ut.misconceptions.length > 0;
            // Exclude exact same topic
            const isDifferent = normalizeTopicForKeywords(ut.normalizedTopic || ut.displayTopic) !== queryNormalized;
            return hasMisconceptions && isDifferent;
        })
        .map((ut) => ({
            ...ut,
            similarity: topicSimilarity(queryTopic, ut.normalizedTopic || ut.displayTopic),
        }))
        .filter((ut) => ut.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, maxResults);
}

/**
 * Build a "Just-in-Time" reminder message if a related topic has relevant misconceptions.
 *
 * @param {string} queryTopic
 * @param {object[]} relatedTopics — output from findRelatedTopicsWithMisconceptions
 * @returns {string|null}
 */
function buildJitReminder(queryTopic, relatedTopics) {
    if (!relatedTopics || relatedTopics.length === 0) return null;

    const top = relatedTopics[0];
    const topMisconception = top.misconceptions?.[0];
    if (!topMisconception) return null;

    const relatedName = top.displayTopic || top.normalizedTopic;
    const queryName = queryTopic;

    // Generate contextual reminder based on category
    const category = topMisconception.category || 'general';
    const description = topMisconception.description || '';

    if (category === 'pitfall') {
        return `You previously struggled with a clinical pitfall in "${relatedName}". When reviewing "${queryName}", watch out for similar traps.`;
    }
    if (category === 'guideline') {
        return `Last time you reviewed "${relatedName}", you had trouble with guideline nuances. Note that recommendations for "${queryName}" may differ.`;
    }
    if (category === 'mechanism') {
        return `You had a mechanism gap in "${relatedName}". The underlying physiology in "${queryName}" shares some overlap — pay attention to the differences.`;
    }
    if (category === 'trial_interpretation') {
        return `You previously misread trial evidence for "${relatedName}". When appraising "${queryName}" studies, look for the same design features.`;
    }

    return `Quick reminder: you were reviewing "${relatedName}" and ${description}. Note that evidence for "${queryName}" may differ.`;
}

module.exports = {
    topicSimilarity,
    findRelatedTopicsWithMisconceptions,
    buildJitReminder,
    extractKeywords,
    normalizeTopicForKeywords,
    MEDICAL_TOPIC_KEYWORDS,
};
