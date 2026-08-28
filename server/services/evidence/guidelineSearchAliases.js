'use strict';

/**
 * Canonical guideline search terms per topic.
 *
 * The guideline ingestor searched Europe PMC using the topic's own name, which is
 * how a curriculum heading is phrased rather than how a guideline is titled. That
 * silently failed for the launch-critical set: "Oliguria" returns nothing because
 * the guidance lives under acute kidney injury (KDIGO); "Hot swollen joint" is
 * covered by septic arthritis and crystal arthropathy guidance; "Vasopressor and
 * inotrope use" sits inside the Surviving Sepsis Campaign.
 *
 * Each entry maps a topic to the terms a guideline body would actually use, most
 * specific first. Search uses these; storage still keys on the original topic name,
 * so the curriculum keeps its own phrasing.
 *
 * `syndromic: true` marks presentations that legitimately have no single guideline
 * — "Acute breathlessness", "Rash with fever". These fan out to their differential
 * rather than pretending one document covers them, and callers should expect
 * several partial sources instead of one authoritative one.
 */

const GUIDELINE_SEARCH_ALIASES = {
    // ── Cardiology ──────────────────────────────────────────────────────────
    'Bradyarrhythmias and AV block': ['cardiac pacing', 'atrioventricular block', 'bradycardia', 'conduction disease'],
    'Essential hypertension': ['arterial hypertension', 'elevated blood pressure', 'hypertension management'],
    'Stable ischaemic heart disease / chronic coronary syndrome': ['chronic coronary syndrome', 'chronic coronary disease', 'stable angina'],
    'Supraventricular tachycardia': ['supraventricular tachycardia', 'AVNRT', 'atrial tachycardia'],
    'Palpitations': { syndromic: true, terms: ['atrial fibrillation', 'supraventricular tachycardia', 'ventricular arrhythmia'] },

    // ── Endocrine ───────────────────────────────────────────────────────────
    'Adrenal insufficiency / Addison disease': ['primary adrenal insufficiency', 'adrenal crisis', 'Addison disease'],
    'Type 2 diabetes mellitus: practical treatment algorithm': ['type 2 diabetes', 'glycaemic treatment', 'pharmacologic approaches to glycemic treatment'],

    // ── Gastroenterology / hepatology ───────────────────────────────────────
    'Acute diarrhoea and infectious gastroenteritis': ['infectious diarrhea', 'acute gastroenteritis'],
    'Alcohol-associated liver disease': ['alcohol-associated liver disease', 'alcoholic hepatitis'],
    'Decompensated cirrhosis': ['decompensated cirrhosis', 'ascites', 'spontaneous bacterial peritonitis', 'hepatorenal syndrome'],
    'Gastro-oesophageal reflux disease': ['gastroesophageal reflux disease', 'GERD'],
    'Hepatic encephalopathy': ['hepatic encephalopathy'],
    'Lower gastrointestinal bleeding': ['acute lower gastrointestinal bleeding', 'lower GI bleeding'],
    'Metabolic dysfunction-associated steatotic liver disease (MASLD)':
        ['metabolic dysfunction-associated steatotic liver disease', 'nonalcoholic fatty liver disease', 'MASH'],
    'Variceal bleeding': ['portal hypertension', 'oesophageal varices', 'variceal haemorrhage'],
    'Jaundice': { syndromic: true, terms: ['cholestasis', 'abnormal liver tests', 'jaundice'] },

    // ── General presentations (mostly syndromic) ────────────────────────────
    'Acute breathlessness': { syndromic: true, terms: ['heart failure', 'pulmonary embolism', 'asthma', 'chronic obstructive pulmonary disease', 'pneumonia'] },
    'Acute focal neurological deficit': ['acute ischaemic stroke', 'suspected stroke'],
    'Dizziness / vertigo': ['benign paroxysmal positional vertigo', 'acute vestibular syndrome'],
    'Hot swollen joint': ['septic arthritis', 'acute monoarthritis', 'gout'],
    'Leg swelling': { syndromic: true, terms: ['deep vein thrombosis', 'venous thromboembolism', 'heart failure'] },
    'Oliguria': ['acute kidney injury'],
    'Rash with fever': { syndromic: true, terms: ['meningococcal disease', 'drug reaction with eosinophilia', 'toxic epidermal necrolysis'] },
    'Unintentional weight loss': ['suspected cancer referral', 'unexplained weight loss'],

    // ── Haematology ─────────────────────────────────────────────────────────
    'Febrile neutropenia': ['neutropenic sepsis', 'febrile neutropenia'],
    'Iron-deficiency anaemia': ['iron deficiency anaemia', 'iron deficiency anemia'],
    'Major bleeding while anticoagulated': ['anticoagulant reversal', 'management of bleeding on anticoagulants'],
    'Sickle cell crisis': ['sickle cell disease', 'acute painful sickle cell episode', 'acute chest syndrome'],

    // ── ICU / critical care ─────────────────────────────────────────────────
    'Acute hypercapnic respiratory failure': ['acute hypercapnic respiratory failure', 'non-invasive ventilation'],
    'Acute hypoxaemic respiratory failure': ['acute hypoxemic respiratory failure', 'high flow nasal oxygen'],
    'Acute kidney injury in the critically ill': ['acute kidney injury', 'acute kidney disease'],
    'Acute respiratory distress syndrome (ARDS)': ['acute respiratory distress syndrome', 'ARDS'],
    'Delirium in critical illness': ['ICU delirium', 'pain agitation delirium immobility sleep'],
    'Fluid resuscitation in critical illness': ['fluid resuscitation', 'intravenous fluid therapy', 'septic shock'],
    'Nutrition in critical illness': ['nutrition in the intensive care unit', 'enteral nutrition critically ill'],
    'Poisoning and drug overdose: initial approach': ['poisoning management', 'drug overdose', 'toxicology'],
    'Red-cell transfusion thresholds': ['red blood cell transfusion', 'restrictive transfusion threshold'],
    'Renal replacement therapy indications and timing': ['kidney replacement therapy', 'acute kidney injury'],
    'VTE prophylaxis': ['venous thromboembolism prophylaxis', 'thromboprophylaxis'],
    'Vasopressor and inotrope use': ['septic shock', 'vasopressor therapy', 'haemodynamic support'],

    // ── Infectious diseases ─────────────────────────────────────────────────
    'Cellulitis and erysipelas': ['cellulitis', 'skin and soft tissue infection'],
    'HIV infection': ['HIV antiretroviral therapy', 'HIV infection management'],
    'Necrotising soft-tissue infection': ['necrotizing fasciitis', 'necrotizing soft tissue infection'],
    'Sepsis of unknown source': ['sepsis', 'septic shock'],
    'Urinary tract infection and pyelonephritis': ['urinary tract infection', 'acute pyelonephritis', 'complicated urinary tract infection'],

    // ── Nephrology ──────────────────────────────────────────────────────────
    'Acute indications for renal replacement therapy': ['kidney replacement therapy', 'acute kidney injury'],
    'Chronic dialysis complications': { syndromic: true, terms: ['chronic kidney disease mineral bone disorder', 'anaemia of chronic kidney disease', 'haemodialysis'] },
    'Diabetic kidney disease': ['diabetes in chronic kidney disease', 'diabetic kidney disease'],
    'Nephritic syndrome': ['glomerular disease', 'glomerulonephritis'],
    'Proteinuria and haematuria evaluation': ['chronic kidney disease evaluation', 'albuminuria', 'haematuria'],

    // ── Neurology ───────────────────────────────────────────────────────────
    'Guillain-Barré syndrome': ['Guillain-Barre syndrome'],
    'Myasthenia gravis': ['myasthenia gravis', 'myasthenic crisis'],
    'Transient ischaemic attack': ['transient ischemic attack', 'secondary stroke prevention'],

    // ── Oncology ────────────────────────────────────────────────────────────
    'Immune checkpoint inhibitor toxicity': ['immune-related adverse events', 'immune checkpoint inhibitor toxicity'],
    'Malignant spinal cord compression': ['metastatic spinal cord compression'],
    'Superior vena cava obstruction': { syndromic: true, terms: ['superior vena cava syndrome', 'oncological emergency'] },

    // ── Respiratory ─────────────────────────────────────────────────────────
    'Acute exacerbation of COPD': ['COPD exacerbation', 'chronic obstructive pulmonary disease'],
    'Pleural infection / empyema': ['pleural infection', 'empyema', 'pleural disease'],

    // ── Rheumatology ────────────────────────────────────────────────────────
    'Inflammatory myopathy': ['idiopathic inflammatory myopathy', 'dermatomyositis', 'polymyositis'],
    'Sjögren syndrome': ['Sjogren syndrome', 'Sjogren disease'],

    // ── Curriculum topics named for an intervention or trial ────────────────
    // Mapped to the guideline that actually covers them. Entries marked
    // `notGuideline` are deliberate dead ends: chasing a CPG for them wastes
    // ingest budget and invites a weak source to be dressed up as guidance.
    'STEMI: electrocardiographic mimics and reperfusion decision':
        ['ST-elevation myocardial infarction', 'acute coronary syndrome'],
    'Acute kidney injury prevention management': ['acute kidney injury', 'acute kidney disease'],
    'Therapeutic plasma exchange in the ICU: TTP, Guillain-Barré, myasthenic crisis':
        { syndromic: true, terms: ['thrombotic thrombocytopenic purpura', 'Guillain-Barre syndrome', 'myasthenia gravis'] },
    'HIV antiretroviral therapy initiation': ['HIV antiretroviral therapy', 'HIV infection management'],
    'HIV: initial diagnosis, CD4 count, viral load, when to start ART':
        ['HIV antiretroviral therapy', 'HIV infection management'],
    'Absence seizures and juvenile myoclonic epilepsy (JME) therapeutic profiles':
        ['epilepsy', 'antiseizure medication', 'juvenile myoclonic epilepsy'],
    "Bell's palsy: corticosteroid timing, antiviral therapy, eye care": ['Bell palsy', 'facial nerve palsy'],
    "Wilson’s disease: caeruloplasmin levels, slit-lamp exam, chelating therapies": ['Wilson disease'],
    'Opioid Rotation and Equianalgesic Dosing': ['opioid prescribing', 'cancer pain management', 'opioid rotation'],
    'Denosumab, romosozumab, teriparatide: anabolic and resorption-inhibiting agents in osteoporosis':
        ['osteoporosis', 'osteoporosis pharmacological management'],
    'SLE: SLICC 2012 and ACR/EULAR 2019 classification criteria compared':
        { notGuideline: 'classification criteria, not treatment guidance', terms: ['systemic lupus erythematosus'] },
    'Chikungunya and Zika Arthropathy': ['chikungunya', 'Zika virus infection'],
    'Viral-Induced Arthritides': ['viral arthritis'],
    "Whipple's Disease rheumatological features":
        { notGuideline: 'no modern standalone CPG; expert review only', terms: ['Whipple disease'] },
    'Achalasia endoscopic and surgical therapy': ['achalasia', 'peroral endoscopic myotomy'],
    "Alzheimer's disease anti-amyloid immunotherapy": ['Alzheimer disease', 'anti-amyloid therapy'],
    'Antithrombotic therapy after TAVR': ['valvular heart disease', 'prosthetic valve antithrombotic therapy'],
    'Aortic stenosis TAVR': ['valvular heart disease', 'aortic stenosis'],
    'ARDS epidemiology and global burden (LUNG SAFE study)':
        { notGuideline: 'epidemiological evidence, not a guideline topic', terms: ['acute respiratory distress syndrome'] },
    'Atherosclerotic renal artery stenosis revascularization': ['renovascular disease', 'renal artery stenosis'],
    'Autoimmune hepatitis immunosuppression': ['autoimmune hepatitis'],
    'BK polyomavirus nephropathy in kidney transplant': ['BK polyomavirus', 'kidney transplantation'],
    'C3 glomerulopathy and complement inhibition': ['glomerular disease', 'C3 glomerulopathy'],
    'Chronic inflammatory demyelinating polyneuropathy treatment':
        ['chronic inflammatory demyelinating polyradiculoneuropathy', 'CIDP'],
    'Conservative oxygen therapy in mechanically ventilated patients':
        ['oxygen therapy critically ill', 'mechanical ventilation'],
    'Conservative versus liberal fluid strategy in ARDS (FACTT trial)':
        ['acute respiratory distress syndrome', 'fluid management ARDS'],
    'Dupilumab (IL-4/IL-13 inhibitor) biologic therapy':
        ['atopic dermatitis', 'systemic therapy atopic dermatitis'],
    'Essential tremor procedural and medical therapy': ['essential tremor'],
    'Hepatitis C virus direct-acting antiviral therapy': ['hepatitis C', 'direct-acting antiviral'],
    'Hereditary hemochromatosis diagnosis and phlebotomy': ['haemochromatosis', 'hemochromatosis'],
    'Huntington disease chorea management': ['Huntington disease', 'chorea'],
    "Huntington's disease: CAG repeats, chorea management, psychiatric features":
        ['Huntington disease', 'chorea'],
    'Hypertrophic cardiomyopathy myosin inhibitor therapy': ['hypertrophic cardiomyopathy'],
    'Icosapent ethyl residual cardiovascular risk':
        ['dyslipidaemia', 'cardiovascular disease prevention', 'hypertriglyceridemia'],
    'Left main coronary disease revascularization': ['coronary revascularization', 'chronic coronary syndrome'],
    'Lewy body dementia diagnosis and symptomatic therapy': ['dementia with Lewy bodies'],
    'Migraine CGRP monoclonal antibody prevention': ['migraine prevention', 'migraine'],
    'MOG antibody-associated disease diagnosis and relapse prevention':
        ['MOG antibody-associated disease', 'MOGAD'],
    'Non-alcoholic fatty liver disease pharmacotherapy':
        ['metabolic dysfunction-associated steatotic liver disease', 'MASH', 'nonalcoholic steatohepatitis'],
    'Plaque psoriasis biologic therapy (IL-17/IL-23 inhibitors)':
        ['plaque psoriasis', 'psoriasis biologic therapy'],
    'Primary biliary cholangitis pharmacotherapy': ['primary biliary cholangitis'],
    'Recurrent nephrolithiasis medical prevention':
        ['urolithiasis', 'kidney stones', 'nephrolithiasis prevention'],
    'Sedation minimization and analgesia-first in ICU':
        ['pain agitation delirium immobility sleep', 'sedation critically ill'],
    'Tricuspid regurgitation TEER': ['valvular heart disease', 'tricuspid regurgitation'],
    'Klinefelter syndrome 47XXY: testosterone deficiency, fertility options, metabolic risks':
        ['Klinefelter syndrome', 'male hypogonadism'],
    'Wolfram syndrome DIDMOAD: diabetes insipidus, DM, optic atrophy, deafness':
        { notGuideline: 'rare monogenic syndrome; consensus review only', terms: ['Wolfram syndrome'] },
    'EBV infectious mononucleosis: Monospot, complications, amoxicillin rash, splenic rupture':
        ['infectious mononucleosis', 'Epstein-Barr virus'],
    'Toxic and nutritional neuropathies: B12, B6 deficiency, chemotherapy-induced':
        { syndromic: true, terms: ['peripheral neuropathy', 'vitamin B12 deficiency', 'chemotherapy-induced peripheral neuropathy'] },
    'Third, fourth, and sixth cranial nerve palsies: pupil-sparing oculomotor palsy':
        { syndromic: true, terms: ['oculomotor nerve palsy', 'cranial nerve palsy', 'diplopia'] },
    "Meniere's disease: intratympanic therapy, low-salt diet, surgical options": ['Meniere disease'],
};

function normalizeKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
        .replace(/\s+/g, ' ')
        .trim();
}

const INDEX = new Map(
    Object.entries(GUIDELINE_SEARCH_ALIASES).map(([k, v]) => [normalizeKey(k), v])
);

/**
 * @returns {{terms: string[], syndromic: boolean, notGuideline: string|null}}
 * Search terms for a topic, falling back to the topic itself when unmapped.
 *
 * `notGuideline` carries the reason a topic has no clinical practice guideline to
 * find (LUNG SAFE is epidemiology; SLE SLICC/ACR-EULAR is classification criteria).
 * Callers should skip these rather than settle for a weak substitute, and should
 * report them as "no guideline exists" rather than "no guideline found" — the two
 * mean very different things to whoever reads the coverage report.
 */
function searchTermsForTopic(topicName) {
    const entry = INDEX.get(normalizeKey(topicName));
    if (!entry) {
        return {
            terms: [String(topicName || '').trim()].filter(Boolean),
            syndromic: false,
            notGuideline: null,
        };
    }
    if (Array.isArray(entry)) return { terms: entry, syndromic: false, notGuideline: null };
    return {
        terms: entry.terms || [],
        syndromic: Boolean(entry.syndromic),
        notGuideline: entry.notGuideline || null,
    };
}

module.exports = { GUIDELINE_SEARCH_ALIASES, searchTermsForTopic, normalizeKey };
