'use strict';

/**
 * Curated landmark PubMed excerpts for synthesis-trust integration tests.
 * Short educational summaries of public trial results — not full copyrighted abstracts.
 */

const CURATED_PUBMED_ARTICLES = [
    {
        pmid: '10793162',
        uid: '10793162',
        title: 'Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome',
        journal: 'N Engl J Med',
        pubdate: '2000',
        pubtype: ['Randomized Controlled Trial'],
        abstract: 'In patients with acute lung injury and the acute respiratory distress syndrome, mechanical ventilation with a lower tidal volume of 6 ml per kilogram of predicted body weight decreased mortality compared with traditional tidal volumes of 12 ml per kilogram. Plateau-pressure limits accompanied the low-tidal-volume protocol.',
    },
    {
        pmid: '11794169',
        uid: '11794169',
        title: 'Early goal-directed therapy in the treatment of severe sepsis and septic shock',
        journal: 'N Engl J Med',
        pubdate: '2001',
        pubtype: ['Randomized Controlled Trial'],
        abstract: 'Early goal-directed therapy provided in the emergency department for severe sepsis and septic shock, targeting central venous oxygen saturation, reduced in-hospital mortality compared with standard therapy. The protocol used fluids, vasopressors, and red-cell transfusion to meet early haemodynamic goals.',
    },
    {
        pmid: '19318384',
        uid: '19318384',
        title: 'Intensive versus conventional glucose control in critically ill patients',
        journal: 'N Engl J Med',
        pubdate: '2009',
        pubtype: ['Randomized Controlled Trial'],
        abstract: 'The NICE-SUGAR trial found that intensive glucose control targeting 81 to 108 mg per deciliter increased mortality among adults in the ICU compared with conventional control targeting 180 mg or less per deciliter. Severe hypoglycemia was more common with intensive control.',
    },
];

/**
 * Grounded synthesis that cites the correct study for each landmark claim.
 * Citation [1] = ARDSNet, [2] = Rivers EGDT, [3] = NICE-SUGAR.
 */
const GROUNDED_CURATED_SYNTHESIS = {
    overallAnswer: 'Low tidal volume ventilation reduced ARDS mortality [1]. Early goal-directed therapy reduced sepsis mortality in the emergency department [2]. Intensive glucose control increased ICU mortality versus conventional targets [3].',
    consensus: 'Landmark ICU trials support lung-protective ventilation [1], early sepsis resuscitation [2], and avoidance of intensive glucose targets [3].',
    clinicalBottomLine: 'Use 6 ml/kg predicted body-weight tidal volumes in ARDS; lower tidal volume decreased mortality compared with traditional 12 ml/kg volumes [1].',
    clinicalImplications: 'Monday-morning practice should pair low-tidal-volume ventilation [1] with early sepsis goals [2] and conventional glucose control [3].',
    limitations: 'Each trial enrolled a selected ICU population and may not generalise to every ward setting [1][2][3].',
    researchGaps: 'Optimal personalisation of tidal volume [1], EGDT targets after usual-care improvement [2], and glucose bands between intensive and conventional [3] remain open.',
    clinicalActionCard: {
        recommendation: 'Ventilate ARDS at 6 ml/kg PBW [1], resuscitate septic shock to early goals [2], and use conventional ICU glucose targets [3].',
        caveat: 'Do not assume intensive insulin is safer; NICE-SUGAR showed higher mortality [3].',
    },
    practiceImpact: {
        mondayMorningLine: 'Check the ventilator for 6 ml/kg PBW in ARDS [1] and keep ICU glucose conventional [3].',
        rationale: 'Mortality benefit for low tidal volume [1] and harm from intensive glucose control [3] are trial-level findings.',
    },
    evidenceDisagreement: {
        guidelineRecommendation: 'Guidelines endorse lung-protective ventilation after ARDSNet [1].',
        strongestSupportingTrial: { summary: 'ARDSNet showed lower mortality with 6 versus 12 ml/kg tidal volume [1].' },
        strongestContradictingTrial: { summary: 'NICE-SUGAR contradicted the idea that tighter ICU glucose is safer [3].' },
        populationsWhereFails: 'EGDT benefit may not replicate where usual care already meets early goals [2].',
        whatWouldChangePractice: 'A contemporary EGDT trial that worsened outcomes would reopen sepsis protocol targets [2].',
    },
    keyFindings: [
        'Lower tidal volume of 6 ml/kg reduced ARDS mortality versus 12 ml/kg [1].',
        'Early goal-directed therapy reduced in-hospital sepsis mortality [2].',
        'Intensive glucose control increased ICU mortality versus conventional control [3].',
    ],
    agreement: [
        'Protective ventilation and early sepsis resuscitation improved survival in their index trials [1][2].',
    ],
    uncertainties: [
        'How tightly glucose should sit below 180 mg/dL after NICE-SUGAR remains uncertain [3].',
    ],
};

/** Intentionally cites the wrong paper for the tidal-volume claim. */
const MISGROUNDED_CURATED_SYNTHESIS = {
    ...GROUNDED_CURATED_SYNTHESIS,
    clinicalBottomLine: 'Use 6 ml/kg predicted body-weight tidal volumes in ARDS; lower tidal volume decreased mortality [3].',
    keyFindings: [
        'Lower tidal volume of 6 ml/kg reduced ARDS mortality versus 12 ml/kg [3].',
    ],
};

module.exports = {
    CURATED_PUBMED_ARTICLES,
    GROUNDED_CURATED_SYNTHESIS,
    MISGROUNDED_CURATED_SYNTHESIS,
};
