'use strict';

const logger = require('../../config/logger');

/**
 * Hierarchical prerequisite remediation (curriculum RL, Phase 2).
 *
 * A confidently-wrong quiz answer usually marks a gap in a *prerequisite*
 * concept, not the tested one. When a miss carries high confidence, we seed
 * a spaced-repetition card for the parent concept so the learner's review
 * queue re-teaches the foundation before the advanced material is retested.
 *
 * The map below is a deliberately small seed (core clinical relationships).
 * It is child-normalized-topic → parent concepts; extend it as misconception
 * telemetry shows which upstream gaps drive the most repeated misses.
 */

const MAX_REMEDIATIONS_PER_SUBMISSION = 3;
// Quiz confidence is reported on a 1–5 scale (see hasDangerousMisconception).
const HIGH_CONFIDENCE_THRESHOLD = 4;

const PREREQUISITE_MAP = {
    'sepsis vasopressor management': [
        { topic: 'Circulatory shock recognition', rationale: 'Vasopressor choice presumes correct shock classification.' },
        { topic: 'Fluid resuscitation principles', rationale: 'Vasopressors follow, not replace, adequate volume resuscitation.' },
    ],
    'sepsis': [
        { topic: 'Circulatory shock recognition', rationale: 'Sepsis management builds on shock recognition and hemodynamics.' },
    ],
    'atrial fibrillation anticoagulation': [
        { topic: 'Stroke risk stratification (CHA2DS2-VASc)', rationale: 'Anticoagulation decisions start from stroke-risk scoring.' },
        { topic: 'Bleeding risk assessment (HAS-BLED)', rationale: 'Bleeding risk gates anticoagulant choice and intensity.' },
    ],
    'heart failure management': [
        { topic: 'Cardiac preload and afterload physiology', rationale: 'HF therapy is applied preload/afterload manipulation.' },
        { topic: 'RAAS physiology', rationale: 'Cornerstone HF drugs act on the renin-angiotensin system.' },
    ],
    'copd exacerbation management': [
        { topic: 'Obstructive lung disease physiology', rationale: 'Exacerbation therapy assumes airflow-limitation mechanics.' },
        { topic: 'Arterial blood gas interpretation', rationale: 'Severity and ventilatory support decisions are ABG-driven.' },
    ],
    'asthma exacerbation management': [
        { topic: 'Bronchodilator pharmacology', rationale: 'Stepwise escalation rests on beta-agonist/anticholinergic dosing.' },
        { topic: 'Peak expiratory flow monitoring', rationale: 'Severity stratification uses PEF and its percent predicted.' },
    ],
    'diabetic ketoacidosis management': [
        { topic: 'Insulin pharmacology', rationale: 'DKA protocols depend on kinetics of IV insulin and transitions.' },
        { topic: 'Acid-base compensation', rationale: 'Anion-gap and compensation rules drive the diagnosis.' },
    ],
    'hyponatremia correction': [
        { topic: 'Serum osmolality and tonicity', rationale: 'Hyponatremia workup begins with osmolar gap and tonicity.' },
        { topic: 'Volume status assessment', rationale: 'Correction strategy hinges on euvolemia vs hypovolemia.' },
    ],
    'acute kidney injury staging': [
        { topic: 'Creatinine kinetics', rationale: 'KDIGO staging assumes understanding of Cr generation and clearance.' },
        { topic: 'Urine output monitoring', rationale: 'Staging uses UO criteria alongside creatinine criteria.' },
    ],
    'pneumonia treatment': [
        { topic: 'Antibiotic pharmacology', rationale: 'Empiric regimens require spectrum and PK/PD grounding.' },
        { topic: 'Respiratory pathogen virulence', rationale: 'Pathogen risk stratification shapes empiric coverage.' },
    ],
    'anemia workup': [
        { topic: 'Red blood cell physiology', rationale: 'Classification starts from production/destruction balance.' },
        { topic: 'Iron metabolism', rationale: 'Microcytic anemia differentiation is iron-metabolism driven.' },
    ],
};

function normalizeTopicKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Find parent prerequisite concepts for a missed question.
 * Matches the quiz topic, then the question text, against the seed map:
 * exact normalized match, substring containment either way, or all of the
 * key's tokens appearing in the haystack (word order may differ).
 *
 * @returns {Array<{topic: string, rationale: string, matchedKey: string}>}
 */
function findPrerequisites(topic, questionText = '') {
    const haystacks = [normalizeTopicKey(topic), normalizeTopicKey(questionText)].filter(Boolean);
    if (!haystacks.length) return [];
    const seen = new Set();
    const parents = [];
    for (const [key, entries] of Object.entries(PREREQUISITE_MAP)) {
        const keyTokens = key.split(' ');
        const matched = haystacks.some((hay) => {
            if (hay === key || hay.includes(key) || key.includes(hay)) return true;
            const hayTokens = hay.split(' ');
            return keyTokens.every((token) => hayTokens.includes(token));
        });
        if (!matched) continue;
        for (const entry of entries) {
            const parentTopic = String(entry.topic || '').trim();
            if (!parentTopic || seen.has(parentTopic)) continue;
            seen.add(parentTopic);
            parents.push({ topic: parentTopic, rationale: entry.rationale || null, matchedKey: key });
        }
    }
    return parents.slice(0, MAX_REMEDIATIONS_PER_SUBMISSION);
}

function isHighConfidenceMiss(attempt) {
    const confidence = Number(attempt?.confidence);
    return Number.isFinite(confidence) && confidence >= HIGH_CONFIDENCE_THRESHOLD;
}

/**
 * Merge seed-map parents with MeSH DAG parents (cache-only, no network).
 * Seed entries win on collision; MeSH extras fill remaining slots.
 */
async function collectPrerequisites(topic, questionText = '') {
    const seed = findPrerequisites(topic, questionText);
    let mesh = [];
    try {
        const { meshPrerequisites } = require('./meshPrerequisiteBridge');
        mesh = await meshPrerequisites(topic);
    } catch {
        mesh = [];
    }
    const seen = new Set(seed.map((p) => normalizeTopicKey(p.topic)));
    const merged = [...seed];
    for (const parent of mesh) {
        if (merged.length >= MAX_REMEDIATIONS_PER_SUBMISSION) break;
        const key = normalizeTopicKey(parent.topic);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(parent);
    }
    return merged.slice(0, MAX_REMEDIATIONS_PER_SUBMISSION);
}

/**
 * Seed FSRS cards for prerequisite concepts behind high-confidence misses.
 * Never throws — remediation is best-effort on top of normal quiz flow.
 *
 * @param {object} db - DB mixin bag (recordLearningEvent used if present).
 * @param {object} spacedRep - spaced-repetition service exposing updateCard.
 * @param {object} args - { userId, topic, normalizedTopic, missedAttempts }.
 * @returns {Promise<{created: number, parents: string[]}>}
 */
async function remediatePrerequisites(db, spacedRep, { userId, topic, normalizedTopic, missedAttempts = [] }) {
    const result = { created: 0, parents: [] };
    if (!userId || !db || typeof spacedRep?.updateCard !== 'function') return result;

    const confidentMisses = (Array.isArray(missedAttempts) ? missedAttempts : [])
        .filter((attempt) => attempt?.isCorrect === false && isHighConfidenceMiss(attempt));
    if (!confidentMisses.length) return result;

    const seenParents = new Set();
    for (const attempt of confidentMisses) {
        const parents = await collectPrerequisites(topic, attempt?.questionText || attempt?.questionTextPreview || '');
        for (const parent of parents) {
            if (result.parents.length >= MAX_REMEDIATIONS_PER_SUBMISSION) return result;
            if (seenParents.has(parent.topic)) continue;
            seenParents.add(parent.topic);
            const parentNormalized = normalizeTopicKey(parent.topic);
            try {
                await spacedRep.updateCard(db, {
                    userId,
                    topic: parent.topic,
                    normalizedTopic: parentNormalized,
                    outlineNodeId: `prereq:${parentNormalized}`,
                    outlineLabel: `${parent.topic} (prerequisite of ${topic})`,
                    isCorrect: false,
                    timeMs: null,
                });
                result.created += 1;
                result.parents.push(parent.topic);
                if (typeof db.recordLearningEvent === 'function') {
                    await db.recordLearningEvent({
                        userId,
                        eventType: 'prerequisite_remediation',
                        topic: parent.topic,
                        sourceType: 'quiz_miss',
                        payload: {
                            childTopic: topic,
                            childNormalizedTopic: normalizedTopic || null,
                            matchedKey: parent.matchedKey,
                            rationale: parent.rationale,
                            confidence: Number(attempt.confidence) || null,
                            questionType: attempt.questionType || null,
                            outlineNodeId: attempt.outlineNodeId || null,
                        },
                    }).catch((err) => { logger.warn({ err }, 'prerequisite_remediation event failed'); return null; });
                }
            } catch (err) {
                logger.warn({ err, parent: parent.topic }, 'prerequisite remediation card failed');
            }
        }
    }
    return result;
}

module.exports = {
    PREREQUISITE_MAP,
    MAX_REMEDIATIONS_PER_SUBMISSION,
    HIGH_CONFIDENCE_THRESHOLD,
    normalizeTopicKey,
    findPrerequisites,
    isHighConfidenceMiss,
    collectPrerequisites,
    remediatePrerequisites,
};
