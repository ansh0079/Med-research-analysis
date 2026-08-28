'use strict';

/**
 * Clinical guideline & landmark trial search taxonomy.
 *
 * Governing rule: WHEN A SEARCH FAILS, ASSUME THE QUERY MAY BE WRONG BEFORE
 * ASSUMING THE EVIDENCE DOES NOT EXIST.
 *
 * This codifies what earlier audits kept rediscovering by hand. Searching the
 * literal curriculum title reported "Oliguria", "Vasopressor and inotrope use" and
 * "Aortic stenosis TAVR" as having zero guideline coverage — when the guidance for
 * each plainly exists, under KDIGO AKI, the Surviving Sepsis Campaign, and the
 * valvular heart disease guideline respectively. The failure was the query, not the
 * corpus, and a coverage report that cannot tell those apart is actively
 * misleading: it sends people off to ingest evidence that is already reachable.
 *
 * Two distinctions do the real work here:
 *
 *   1. HOW a topic is covered. A drug covered inside its parent disease guideline
 *      (PARENT_GUIDELINE) is well served; it is not the same as having its own
 *      document (DIRECT_GUIDELINE), and neither is a gap.
 *   2. WHY nothing was found. "Not searched properly yet" (UNRESOLVED) is a
 *      different claim from "no such document exists" (NOT_A_GUIDELINE_TOPIC) and
 *      from "genuinely nothing after the full ladder" (TRUE_ZERO_COVERAGE).
 */

/** What kind of thing is this topic? Determines how to search for it. */
const TOPIC_TYPE = Object.freeze({
    DISEASE: 'disease',
    SYNDROME: 'syndrome',
    PRESENTATION: 'presentation',
    DIAGNOSTIC_PROBLEM: 'diagnostic_problem',
    INTERVENTION: 'intervention',
    PROCEDURE: 'procedure',
    DRUG: 'drug',
    DRUG_CLASS: 'drug_class',
    CRITERIA: 'criteria',
    GUIDELINE_CONCEPT: 'guideline_concept',
    TRIAL: 'trial',
    PROGNOSTIC: 'prognostic',
});

/**
 * Evidence fallback ladder. Descend only as far as needed, and record where you
 * stopped — the rung reached is itself information the reader needs.
 */
const EVIDENCE_TIER = Object.freeze([
    { rung: 1, id: 'formal_guideline', label: 'Current formal clinical practice guideline' },
    { rung: 2, id: 'consensus_guideline', label: 'International consensus guideline / recommendations' },
    { rung: 3, id: 'society_statement', label: 'Society practice guidance / scientific or position statement' },
    { rung: 4, id: 'systematic_review', label: 'High-quality systematic review or meta-analysis' },
    { rung: 5, id: 'landmark_trial', label: 'Landmark randomised controlled trial' },
    { rung: 6, id: 'observational', label: 'Major prospective observational study' },
]);

/** How a topic turned out to be covered — or why it is not. */
const COVERAGE = Object.freeze({
    DIRECT_GUIDELINE: 'DIRECT_GUIDELINE',
    PARENT_GUIDELINE: 'PARENT_GUIDELINE',
    CONSENSUS_GUIDANCE: 'CONSENSUS_GUIDANCE',
    SOCIETY_STATEMENT: 'SOCIETY_STATEMENT',
    TRIAL_EVIDENCE: 'TRIAL_EVIDENCE',
    REVIEW_EVIDENCE: 'REVIEW_EVIDENCE',
    // Reached the end of the ladder with nothing. A real, reportable gap.
    TRUE_ZERO_COVERAGE: 'TRUE_ZERO_COVERAGE',
    // No guideline SHOULD exist: LUNG SAFE is epidemiology, SLICC/ACR-EULAR are
    // classification criteria. Reporting these as gaps invites someone to ingest a
    // weak substitute and present it as guidance.
    NOT_A_GUIDELINE_TOPIC: 'NOT_A_GUIDELINE_TOPIC',
    // Ladder not yet walked. Never present this as a gap.
    UNRESOLVED: 'UNRESOLVED',
});

/** Coverage states that mean the topic is adequately served. */
const COVERED_STATES = new Set([
    COVERAGE.DIRECT_GUIDELINE,
    COVERAGE.PARENT_GUIDELINE,
    COVERAGE.CONSENSUS_GUIDANCE,
    COVERAGE.SOCIETY_STATEMENT,
]);

/** Document labels guidance is actually published under (taxonomy §5). */
const DOCUMENT_LABELS = Object.freeze([
    'guideline', 'clinical guideline', 'clinical practice guideline', 'practice guideline',
    'practice guidance', 'clinical practice guidance', 'recommendations',
    'management recommendations', 'consensus guideline', 'consensus statement',
    'expert consensus', 'scientific statement', 'position statement', 'clinical statement',
    'practice statement', 'appropriate use criteria', 'standards of care', 'society guidance',
]);

/** Issuing bodies worth trusting, by domain (taxonomy §4). */
const SOCIETIES = Object.freeze({
    general: ['NICE', 'WHO', 'SIGN'],
    cardiology: ['ESC', 'EACTS', 'ACC', 'AHA', 'HRS'],
    renal: ['KDIGO'],
    endocrine: ['ADA', 'EASD', 'Endocrine Society'],
    hepatology: ['EASL', 'AASLD', 'ACG', 'AGA', 'BSG'],
    respiratory: ['ATS', 'ERS', 'BTS', 'GOLD', 'GINA'],
    critical_care: ['SCCM', 'ESICM', 'Surviving Sepsis Campaign'],
    infectious_disease: ['IDSA', 'ESCMID', 'BHIVA', 'EACS'],
    neurology: ['AAN', 'EAN', 'ESO'],
    rheumatology: ['EULAR', 'ACR', 'BSR'],
    oncology: ['ASCO', 'ESMO', 'NCCN'],
    haematology: ['ASH', 'ISTH'],
});

const ALL_SOCIETIES = Object.freeze(
    [...new Set(Object.values(SOCIETIES).flat())]
);

/**
 * Classify a topic from its title. Heuristic and deliberately conservative — it
 * decides HOW to search, so a wrong confident answer is worse than DISEASE, which
 * simply searches the title as written.
 */
function classifyTopic(title) {
    const t = String(title || '').toLowerCase();
    if (!t) return TOPIC_TYPE.DISEASE;

    if (/\b(trial|study)\b|\(.*(trial|study).*\)/.test(t)) return TOPIC_TYPE.TRIAL;
    if (/\b(criteria|classification|staging|definition)\b/.test(t)) return TOPIC_TYPE.CRITERIA;
    // "monoclonal antibody" is spelled out far more often than suffixed as -mab,
    // so matching only \bmab\b classified "Migraine CGRP monoclonal antibody
    // prevention" as a disease and searched it as one.
    if (/monoclonal antibod|\b\w+mab\b|\b\w+nib\b/.test(t)
        || /\b(inhibitor|antagonist|agonist|blocker|statin|anticoagulant|biologic)/.test(t)
        || /\b(dupilumab|denosumab|romosozumab|teriparatide|imatinib|daratumumab|sparsentan|mavacamten|icosapent|ruxolitinib|finerenone)\b/.test(t)) {
        return /\b(inhibitors?|antibodies|class|biologics?)\b/.test(t)
            ? TOPIC_TYPE.DRUG_CLASS
            : TOPIC_TYPE.DRUG;
    }
    if (/\b(tavr|tavi|teer|ablation|revasculari[sz]ation|transplant|ecmo|dialysis|surgery|endoscop|myotomy|repair|positioning|ventilation|exchange)\b/.test(t)) {
        return TOPIC_TYPE.PROCEDURE;
    }
    if (/\b(therapy|treatment|prophylaxis|management|immunotherapy|resuscitation|transfusion|sedation|monitoring)\b/.test(t)) {
        return TOPIC_TYPE.INTERVENTION;
    }
    if (/\b(evaluation|workup|work-up|diagnosis|diagnostic|assessment|screening)\b/.test(t)) {
        return TOPIC_TYPE.DIAGNOSTIC_PROBLEM;
    }
    if (/\b(pain|breathlessness|dyspnoea|dizziness|vertigo|jaundice|swelling|palpitations|oliguria|weight loss|rash|confusion|fever)\b/.test(t)) {
        return TOPIC_TYPE.PRESENTATION;
    }
    if (/\bsyndrome\b|\bfailure\b/.test(t)) return TOPIC_TYPE.SYNDROME;
    return TOPIC_TYPE.DISEASE;
}

/**
 * A topic type that is NOT a disease should be searched via its parent condition
 * (taxonomy §6): a drug or procedure rarely has a guideline of its own, and a
 * trial never does.
 */
function needsParentCondition(topicType) {
    return [
        TOPIC_TYPE.INTERVENTION, TOPIC_TYPE.PROCEDURE, TOPIC_TYPE.DRUG,
        TOPIC_TYPE.DRUG_CLASS, TOPIC_TYPE.TRIAL, TOPIC_TYPE.PROGNOSTIC,
    ].includes(topicType);
}

/**
 * Decide a coverage category from what a search actually produced.
 *
 * @param {object} found
 * @param {boolean} found.searchedLadder  whether the fallback ladder was walked
 * @param {string|null} found.matchedVia  'direct' | 'alias:x' | 'parent:x' | ...
 * @param {string|null} found.docLabel    label of the document found
 * @param {number} found.count            recommendations retrieved
 * @param {string|null} found.notGuideline reason no guideline should exist
 */
function classifyCoverage({
    searchedLadder = false,
    matchedVia = null,
    docLabel = null,
    count = 0,
    notGuideline = null,
} = {}) {
    if (notGuideline) {
        return { coverage: COVERAGE.NOT_A_GUIDELINE_TOPIC, reason: notGuideline };
    }
    if (count > 0) {
        const label = String(docLabel || '').toLowerCase();
        if (/scientific statement|position statement|practice guidance|clinical statement|practice statement|appropriate use/.test(label)) {
            return { coverage: COVERAGE.SOCIETY_STATEMENT, reason: docLabel };
        }
        if (/consensus/.test(label)) {
            return { coverage: COVERAGE.CONSENSUS_GUIDANCE, reason: docLabel };
        }
        if (/systematic review|meta-analys/.test(label)) {
            return { coverage: COVERAGE.REVIEW_EVIDENCE, reason: docLabel };
        }
        if (/trial|randomi/.test(label)) {
            return { coverage: COVERAGE.TRIAL_EVIDENCE, reason: docLabel };
        }
        const viaParent = /^(alias|parent):/.test(String(matchedVia || ''));
        return {
            coverage: viaParent ? COVERAGE.PARENT_GUIDELINE : COVERAGE.DIRECT_GUIDELINE,
            reason: matchedVia,
        };
    }
    // Nothing found. Whether that is a gap depends entirely on how hard we looked.
    return searchedLadder
        ? { coverage: COVERAGE.TRUE_ZERO_COVERAGE, reason: 'ladder exhausted' }
        : { coverage: COVERAGE.UNRESOLVED, reason: 'ladder not yet searched' };
}

/** Is this coverage state a real, reportable gap? */
function isRealGap(coverage) {
    return coverage === COVERAGE.TRUE_ZERO_COVERAGE;
}

/** Does this coverage state mean the topic is adequately served? */
function isCovered(coverage) {
    return COVERED_STATES.has(coverage);
}

module.exports = {
    TOPIC_TYPE,
    EVIDENCE_TIER,
    COVERAGE,
    COVERED_STATES,
    DOCUMENT_LABELS,
    SOCIETIES,
    ALL_SOCIETIES,
    classifyTopic,
    needsParentCondition,
    classifyCoverage,
    isRealGap,
    isCovered,
};
