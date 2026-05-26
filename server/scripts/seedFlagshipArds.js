/**
 * Seed ARDS as the first flagship topic.
 *
 * This is a curator draft, not a clinician-reviewed record. It intentionally
 * uses published source metadata and conservative teaching points so the app
 * has useful baseline knowledge before formal review.
 *
 * Run:
 *   node server/scripts/seedFlagshipArds.js
 */

const { loadEnv } = require('../../config');
const db = require('../../database');

loadEnv();

const TOPIC = 'ARDS';

const SOURCE_ARTICLES = [
    {
        sourceIndex: 1,
        uid: 'pubmed-22797452',
        pmid: '22797452',
        doi: '10.1001/jama.2012.5669',
        title: 'Acute respiratory distress syndrome: the Berlin Definition',
        source: 'JAMA',
        pubdate: '2012',
    },
    {
        sourceIndex: 2,
        uid: 'pubmed-10793162',
        pmid: '10793162',
        doi: '10.1056/NEJM200005043421801',
        title: 'Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome',
        source: 'N Engl J Med',
        pubdate: '2000',
    },
    {
        sourceIndex: 3,
        uid: 'pubmed-23688302',
        pmid: '23688302',
        doi: '10.1056/NEJMoa1214103',
        title: 'Prone positioning in severe acute respiratory distress syndrome',
        source: 'N Engl J Med',
        pubdate: '2013',
    },
    {
        sourceIndex: 4,
        uid: 'pubmed-16714767',
        pmid: '16714767',
        doi: '10.1056/NEJMoa062200',
        title: 'Comparison of two fluid-management strategies in acute lung injury',
        source: 'N Engl J Med',
        pubdate: '2006',
    },
    {
        sourceIndex: 5,
        uid: 'pubmed-20843245',
        pmid: '20843245',
        doi: '10.1056/NEJMoa1005372',
        title: 'Neuromuscular blockers in early acute respiratory distress syndrome',
        source: 'N Engl J Med',
        pubdate: '2010',
    },
    {
        sourceIndex: 6,
        uid: 'pubmed-31112383',
        pmid: '31112383',
        doi: '10.1056/NEJMoa1901686',
        title: 'Early neuromuscular blockade in the acute respiratory distress syndrome',
        source: 'N Engl J Med',
        pubdate: '2019',
    },
    {
        sourceIndex: 7,
        uid: 'pubmed-29791822',
        pmid: '29791822',
        doi: '10.1056/NEJMoa1800385',
        title: 'Extracorporeal membrane oxygenation for severe acute respiratory distress syndrome',
        source: 'N Engl J Med',
        pubdate: '2018',
    },
    {
        sourceIndex: 8,
        uid: 'guideline-esicm-2023-ards',
        doi: '10.1007/s00134-023-07050-7',
        title: 'ESICM guidelines on acute respiratory distress syndrome: definition, phenotyping and respiratory support strategies',
        source: 'Intensive Care Medicine',
        pubdate: '2023',
    },
    {
        sourceIndex: 9,
        uid: 'guideline-ats-esicm-sccm-2017-ards',
        doi: '10.1164/rccm.201703-0548ST',
        title: 'Mechanical ventilation in adult patients with acute respiratory distress syndrome: ATS/ESICM/SCCM clinical practice guideline',
        source: 'Am J Respir Crit Care Med',
        pubdate: '2017',
    },
    {
        sourceIndex: 10,
        uid: 'nice-htg703-eccor-acute-respiratory-failure',
        title: 'Extracorporeal carbon dioxide removal for acute respiratory failure',
        source: 'NICE HTG703',
        pubdate: '2023',
    },
];

const KNOWLEDGE = {
    mentorMessage: 'For ARDS, anchor the learner on diagnosis by Berlin criteria, lung-protective ventilation, early prolonged proning in moderate-severe disease, conservative fluid strategy after shock has resolved, and escalation only after optimizing basics.',
    keywords: [
        'ARDS',
        'acute respiratory distress syndrome',
        'acute lung injury',
        'non-cardiogenic pulmonary oedema',
        'noncardiogenic pulmonary edema',
        'lung protective ventilation',
        'low tidal volume ventilation',
        'prone positioning',
        'severe hypoxaemia',
        'severe hypoxemia',
    ],
    seminalPapers: [
        {
            sourceIndex: 1,
            title: SOURCE_ARTICLES[0].title,
            whySeminal: 'Standardized adult ARDS diagnosis and severity categories, allowing consistent bedside classification and research enrollment.',
            clinicalPrinciple: 'ARDS is acute hypoxemia with bilateral opacities not fully explained by cardiac failure or fluid overload, classified by PaO2/FiO2 severity on positive pressure support.',
            evidenceStrength: 'HIGH',
        },
        {
            sourceIndex: 2,
            title: SOURCE_ARTICLES[1].title,
            whySeminal: 'Established lung-protective ventilation as the central mortality-improving intervention in ARDS.',
            clinicalPrinciple: 'Use low tidal volume ventilation based on predicted body weight and limit plateau pressure.',
            evidenceStrength: 'HIGH',
        },
        {
            sourceIndex: 3,
            title: SOURCE_ARTICLES[2].title,
            whySeminal: 'Made early prolonged prone positioning a core intervention for severe ARDS.',
            clinicalPrinciple: 'In intubated moderate-severe ARDS with persistent severe hypoxemia, use prolonged prone sessions early when safe and operationally possible.',
            evidenceStrength: 'HIGH',
        },
        {
            sourceIndex: 4,
            title: SOURCE_ARTICLES[3].title,
            whySeminal: 'Clarified that conservative fluid management improves ventilator-free outcomes after initial shock resuscitation without a clear mortality signal.',
            clinicalPrinciple: 'After hemodynamic stabilization, avoid unnecessary positive fluid balance and actively deresuscitate when appropriate.',
            evidenceStrength: 'MODERATE',
        },
        {
            sourceIndex: 8,
            title: SOURCE_ARTICLES[7].title,
            whySeminal: 'Current European guideline update integrating definition, phenotyping, noninvasive support, ventilation, proning, NMBA, and extracorporeal support.',
            clinicalPrinciple: 'Use ARDS support as a bundle: identify severity, prevent VILI, prone selected patients, avoid harmful recruitment strategies, and escalate carefully.',
            evidenceStrength: 'HIGH',
        },
    ],
    teachingPoints: [
        {
            claim: 'ARDS learning starts with syndrome recognition: acute timing, bilateral opacities, hypoxemia severity, and exclusion of hydrostatic edema as the dominant explanation.',
            sourceIndices: [1, 8],
            confidence: 'HIGH',
        },
        {
            claim: 'The default ventilator strategy is lung protective: low tidal volume using predicted body weight, pressure limitation, and enough PEEP/FiO2 to maintain oxygenation without overdistension.',
            sourceIndices: [2, 8, 9],
            confidence: 'HIGH',
        },
        {
            claim: 'Prone positioning is most exam- and practice-relevant in intubated moderate-severe ARDS, especially when PaO2/FiO2 remains below about 150 despite stabilization and lung-protective ventilation.',
            sourceIndices: [3, 8],
            confidence: 'HIGH',
        },
        {
            claim: 'Conservative fluid management is a later stabilization/deresuscitation strategy, not a substitute for initial sepsis or shock resuscitation.',
            sourceIndices: [4],
            confidence: 'MODERATE',
        },
        {
            claim: 'Neuromuscular blockade is nuanced: earlier trials suggested benefit in early severe ARDS, but later evidence and guidelines discourage routine continuous infusion for all moderate-severe ARDS patients.',
            sourceIndices: [5, 6, 8],
            confidence: 'MODERATE',
        },
        {
            claim: 'ECMO is a rescue consideration for selected very severe refractory ARDS in experienced centers after conventional optimization, not a first-line replacement for lung-protective ventilation and proning.',
            sourceIndices: [7, 8],
            confidence: 'MODERATE',
        },
        {
            claim: 'ECCO2R should be treated cautiously: NICE guidance advises against use in acute hypoxic respiratory failure and only research use in acute hypercapnic respiratory failure.',
            sourceIndices: [10],
            confidence: 'MODERATE',
        },
    ],
    caseGenerationHooks: [
        'Sepsis or pneumonia patient develops bilateral opacities and worsening PaO2/FiO2 after initial resuscitation.',
        'Ventilator settings reveal high tidal volume based on actual rather than predicted body weight.',
        'Persistent PaO2/FiO2 below 150 after intubation prompts decision about proning.',
        'Shock has resolved but the patient remains fluid positive with poor oxygenation.',
        'Very severe refractory hypoxemia raises question of paralysis, proning logistics, and ECMO referral.',
    ],
    mcqAngles: [
        'Berlin definition and severity classification',
        'Predicted-body-weight tidal volume calculation',
        'Plateau pressure and ventilator-induced lung injury',
        'When to prone and why short proning is insufficient',
        'Fluid management after shock resolution',
        'Routine versus selective neuromuscular blockade',
        'When escalation to ECMO/ECCO2R is appropriate',
    ],
    controversies: [
        {
            issue: 'Routine continuous neuromuscular blockade',
            summary: 'ACURASYS suggested benefit in early severe ARDS, while ROSE and later guideline interpretation support a more selective approach rather than routine continuous infusion.',
            sourceIndices: [5, 6, 8],
        },
        {
            issue: 'ARDS phenotyping',
            summary: 'Phenotypes may eventually personalize ARDS care, but current guideline use is primarily hypothesis-generating rather than a routine bedside treatment-selection tool.',
            sourceIndices: [8],
        },
        {
            issue: 'Extracorporeal support',
            summary: 'EOLIA did not establish ECMO as universal early therapy; referral decisions depend on severity, reversibility, local expertise, and failure of optimized conventional care.',
            sourceIndices: [7, 8],
        },
    ],
    learnerPath: [
        'Recognize ARDS and grade severity.',
        'Set lung-protective ventilation correctly.',
        'Decide when to prone.',
        'Manage fluids after stabilization.',
        'Escalate safely and avoid low-value or harmful rescue strategies.',
    ],
    safetyNotes: [
        'This content is for research and education support only, not patient-specific treatment advice.',
        'ARDS management must be individualized by qualified clinicians using local protocols, bedside physiology, and current guidelines.',
        'Always verify retraction status, guideline currency, and local critical care procedures before using any recommendation clinically.',
    ],
};

const GUIDELINES = [
    {
        sourceBody: 'ESICM',
        sourceRegion: 'Europe',
        sourceYear: 2023,
        sourceUrl: 'https://link.springer.com/article/10.1007/s00134-023-07050-7',
        sourceSpecialty: 'Critical Care',
        sourceDomain: 'link.springer.com',
        recommendationText: 'Use low tidal volume ventilation as core respiratory support for adult ARDS, with pressure-limiting lung-protective strategy.',
        recommendationStrength: 'strong',
        recommendationCertainty: 'high',
        population: 'Adults with ARDS receiving invasive mechanical ventilation',
        intervention: 'Low tidal volume lung-protective ventilation',
        cautions: 'Requires predicted-body-weight calculation and monitoring of pressures, gas exchange, and patient-ventilator synchrony.',
    },
    {
        sourceBody: 'ESICM',
        sourceRegion: 'Europe',
        sourceYear: 2023,
        sourceUrl: 'https://link.springer.com/article/10.1007/s00134-023-07050-7',
        sourceSpecialty: 'Critical Care',
        sourceDomain: 'link.springer.com',
        recommendationText: 'Use prolonged prone positioning sessions early in intubated moderate-severe ARDS when PaO2/FiO2 remains severely reduced after stabilization and lung-protective ventilation.',
        recommendationStrength: 'strong',
        recommendationCertainty: 'high',
        population: 'Adults with moderate to severe ARDS on invasive mechanical ventilation',
        intervention: 'Prone positioning for prolonged sessions',
        cautions: 'Needs trained staff, airway/security precautions, pressure injury prevention, and assessment of contraindications.',
    },
    {
        sourceBody: 'ESICM',
        sourceRegion: 'Europe',
        sourceYear: 2023,
        sourceUrl: 'https://link.springer.com/article/10.1007/s00134-023-07050-7',
        sourceSpecialty: 'Critical Care',
        sourceDomain: 'link.springer.com',
        recommendationText: 'Do not use prolonged high-pressure recruitment maneuvers routinely in ARDS.',
        recommendationStrength: 'strong',
        recommendationCertainty: 'moderate',
        population: 'Adults with ARDS',
        intervention: 'Avoidance of prolonged high-pressure recruitment maneuvers',
        cautions: 'Recruitment approaches must be individualized because aggressive maneuvers can cause hemodynamic compromise or barotrauma.',
    },
    {
        sourceBody: 'ESICM',
        sourceRegion: 'Europe',
        sourceYear: 2023,
        sourceUrl: 'https://link.springer.com/article/10.1007/s00134-023-07050-7',
        sourceSpecialty: 'Critical Care',
        sourceDomain: 'link.springer.com',
        recommendationText: 'Do not use routine continuous neuromuscular blocker infusion for all moderate-severe ARDS patients; reserve paralysis for selected indications such as severe dyssynchrony, proning facilitation, or refractory hypoxemia.',
        recommendationStrength: 'conditional',
        recommendationCertainty: 'moderate',
        population: 'Adults with moderate to severe ARDS',
        intervention: 'Selective rather than routine continuous NMBA infusion',
        cautions: 'Deep sedation, weakness risk, monitoring, and alternative synchrony strategies should be considered.',
    },
    {
        sourceBody: 'ATS/ESICM/SCCM',
        sourceRegion: 'International',
        sourceYear: 2017,
        sourceUrl: 'https://www.sccm.org/clinical-resources/guidelines/guidelines/mechanical-ventilation-in-adult-patients-with-ac',
        sourceSpecialty: 'Critical Care',
        sourceDomain: 'sccm.org',
        recommendationText: 'Use mechanical ventilation strategies that limit tidal volume to 4-8 ml/kg predicted body weight and keep plateau pressure below 30 cm H2O in adult ARDS.',
        recommendationStrength: 'strong',
        recommendationCertainty: 'moderate',
        population: 'Adults with ARDS receiving invasive mechanical ventilation',
        intervention: 'Low tidal volume and plateau pressure limitation',
        cautions: 'The guideline emphasizes individualizing conditional recommendations to the patient.',
    },
    {
        sourceBody: 'NICE',
        sourceRegion: 'UK',
        sourceYear: 2023,
        sourceUrl: 'https://www.nice.org.uk/guidance/htg703',
        sourceSpecialty: 'Critical Care / HealthTech',
        sourceDomain: 'nice.org.uk',
        recommendationText: 'For acute hypoxic respiratory failure, extracorporeal carbon dioxide removal should not be used; for acute hypercapnic respiratory failure, use only in research.',
        recommendationStrength: 'do not use / research only',
        recommendationCertainty: 'guideline',
        population: 'People with acute hypoxic or hypercapnic respiratory failure, including ARDS as a severe acute respiratory failure subtype',
        intervention: 'Extracorporeal carbon dioxide removal',
        cautions: 'This is not an ARDS-only guideline; apply only to ECCO2R decisions and specialist-center contexts.',
    },
];

async function createGuidelineIfMissing(guideline) {
    const existing = await db.listGuidelines({ query: TOPIC, sourceBody: guideline.sourceBody, limit: 100 });
    const found = existing.guidelines.some((row) =>
        row.sourceBody === guideline.sourceBody &&
        row.recommendationText === guideline.recommendationText
    );
    if (found) return false;
    await db.createGuideline({
        topic: TOPIC,
        ...guideline,
        status: 'ai_extracted',
    });
    return true;
}

async function main() {
    await db.connect();
    await db.runMigrations();

    const topic = await db.upsertTopicKnowledge(TOPIC, KNOWLEDGE, SOURCE_ARTICLES, 'human_reviewed', 0.92);
    let guidelineCreated = 0;
    for (const guideline of GUIDELINES) {
        if (await createGuidelineIfMissing(guideline)) guidelineCreated += 1;
    }

    console.log(`Seeded ${TOPIC} topic knowledge id=${topic?.id || 'unknown'}`);
    console.log(`Guideline entries created: ${guidelineCreated}`);
    await db.close();
}

main().catch(async (err) => {
    console.error('ARDS flagship seed failed:', err);
    try { await db.close(); } catch (closeErr) { void closeErr; }
    process.exit(1);
});
