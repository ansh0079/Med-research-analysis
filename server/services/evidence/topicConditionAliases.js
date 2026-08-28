'use strict';

/**
 * Curated topic -> clinical condition mapping.
 *
 * Many curriculum topics are named for an INTERVENTION or a TRIAL rather than a
 * condition: "Prone positioning in severe ARDS", "Migraine CGRP monoclonal antibody
 * prevention", "Aortic stenosis TAVR". Condition-head extraction pulls the wrong
 * noun out of these ("prone positioning", not ARDS), so they resolve to nothing
 * even though the parent condition is well covered.
 *
 * Each entry lists conditions to try in order: the most specific reading first,
 * then widening to the parent. Retrieval takes the first that returns relevant
 * recommendations, so a topic with dedicated guidance keeps it and only falls back
 * to the parent when it has none.
 *
 * ICU entries stay distinct rather than collapsing into ARDS/sepsis, because each
 * has standalone landmark evidence a clinician would cite on its own (PROSEVA,
 * FACTT, ACURASYS, EOLIA, LUNG SAFE).
 *
 * Keys are lowercased with whitespace collapsed and curly quotes folded; see
 * aliasKey(). Add new entries here rather than widening the generic matcher — a
 * looser matcher costs precision on every topic, an alias costs nothing elsewhere.
 */

const TOPIC_CONDITION_ALIASES = {
    // ── Cardiology ──────────────────────────────────────────────────────────
    'stemi: electrocardiographic mimics and reperfusion decision':
        ['st-elevation myocardial infarction', 'acute coronary syndrome', 'myocardial infarction'],
    'aortic stenosis tavr': ['aortic stenosis'],
    'antithrombotic therapy after tavr': ['aortic stenosis', 'antithrombotic therapy'],
    'atrial fibrillation catheter ablation and early rhythm control': ['atrial fibrillation'],
    'cardiac myosin activator therapy in hfref':
        ['heart failure with reduced ejection fraction', 'heart failure'],
    'heart failure remote hemodynamic monitoring': ['heart failure'],
    'hypertrophic cardiomyopathy myosin inhibitor therapy': ['hypertrophic cardiomyopathy'],
    'icosapent ethyl residual cardiovascular risk':
        ['hypertriglyceridaemia', 'hypertriglyceridemia', 'cardiovascular risk'],
    'left main coronary disease revascularization':
        ['left main coronary artery disease', 'coronary artery disease'],
    'tricuspid regurgitation teer': ['tricuspid regurgitation'],
    'syncope evaluation and pacing indications': ['syncope'],
    'intermediate-risk pulmonary embolism reperfusion': ['pulmonary embolism'],

    // ── Respiratory ─────────────────────────────────────────────────────────
    'copd maintenance bronchodilator combination therapy':
        ['chronic obstructive pulmonary disease', 'copd'],
    'sleep-related hypoxemia in copd': ['chronic obstructive pulmonary disease', 'copd'],
    'hypersensitivity pneumonitis variants by antigen': ['hypersensitivity pneumonitis'],

    // ── ICU / critical care (kept as distinct themes) ────────────────────────
    'ards epidemiology and global burden (lung safe study)':
        ['acute respiratory distress syndrome', 'ards'],
    'conservative versus liberal fluid strategy in ards (factt trial)':
        ['acute respiratory distress syndrome', 'ards'],
    'high-frequency oscillatory ventilation and lung recruitment in severe ards':
        ['acute respiratory distress syndrome', 'ards'],
    'neuromuscular blockade in early ards': ['acute respiratory distress syndrome', 'ards'],
    'prone positioning in severe ards': ['acute respiratory distress syndrome', 'ards'],
    'venovenous ecmo for severe ards': ['acute respiratory distress syndrome', 'ards'],
    'conservative oxygen therapy in mechanically ventilated patients':
        ['oxygen therapy', 'mechanical ventilation'],
    'fluid resuscitation type in sepsis and critical illness': ['sepsis', 'septic shock'],
    'angiotensin ii for catecholamine-refractory vasodilatory shock':
        ['vasodilatory shock', 'septic shock', 'shock'],
    'sedation minimization and analgesia-first in icu': ['sedation', 'mechanical ventilation'],
    'vte prophylaxis in mechanically ventilated icu patients':
        ['venous thromboembolism', 'thromboprophylaxis'],
    'severe acute pancreatitis icu management': ['acute pancreatitis', 'pancreatitis'],
    'acute kidney injury prevention management': ['acute kidney injury'],
    'therapeutic plasma exchange in the icu: ttp, guillain-barre, myasthenic crisis':
        ['thrombotic thrombocytopenic purpura', 'guillain-barre syndrome', 'myasthenia gravis'],

    // ── Nephrology ──────────────────────────────────────────────────────────
    'dialysis initiation timing in advanced ckd':
        ['chronic kidney disease', 'renal replacement therapy'],
    'atherosclerotic renal artery stenosis revascularization': ['renal artery stenosis'],
    'bk polyomavirus nephropathy in kidney transplant':
        ['bk polyomavirus nephropathy', 'kidney transplantation'],
    'c3 glomerulopathy and complement inhibition': ['c3 glomerulopathy', 'glomerulonephritis'],
    'fsgs sparsentan and supportive therapy': ['focal segmental glomerulosclerosis', 'fsgs'],
    'recurrent nephrolithiasis medical prevention': ['nephrolithiasis', 'kidney stones'],

    // ── Gastroenterology / hepatology ───────────────────────────────────────
    'achalasia endoscopic and surgical therapy': ['achalasia'],
    'gerd refractory symptoms and antireflux surgery':
        ['gastro-oesophageal reflux disease', 'gastroesophageal reflux disease', 'gerd'],
    'autoimmune hepatitis immunosuppression': ['autoimmune hepatitis'],
    'primary biliary cholangitis pharmacotherapy': ['primary biliary cholangitis'],
    'hepatitis c virus direct-acting antiviral therapy': ['hepatitis c'],
    'hepatocellular carcinoma systemic therapy': ['hepatocellular carcinoma'],
    'cholangiocarcinoma systemic therapy': ['cholangiocarcinoma'],
    'hereditary hemochromatosis diagnosis and phlebotomy':
        ['hereditary haemochromatosis', 'hereditary hemochromatosis', 'haemochromatosis'],
    'non-alcoholic fatty liver disease pharmacotherapy':
        ['non-alcoholic fatty liver disease',
            'metabolic dysfunction-associated steatotic liver disease', 'fatty liver'],

    // ── Neurology ───────────────────────────────────────────────────────────
    "alzheimer's disease anti-amyloid immunotherapy":
        ["alzheimer's disease", 'alzheimer disease', 'dementia'],
    'lewy body dementia diagnosis and symptomatic therapy': ['lewy body dementia', 'dementia'],
    'huntington disease chorea management': ['huntington disease'],
    "huntington's disease: cag repeats, chorea management, psychiatric features":
        ['huntington disease'],
    'essential tremor procedural and medical therapy': ['essential tremor'],
    'migraine cgrp monoclonal antibody prevention': ['migraine'],
    'chronic inflammatory demyelinating polyneuropathy treatment':
        ['chronic inflammatory demyelinating polyneuropathy', 'cidp'],
    'mog antibody-associated disease diagnosis and relapse prevention':
        ['mog antibody-associated disease', 'neuromyelitis optica', 'multiple sclerosis'],
    'toxic and nutritional neuropathies: b12, b6 deficiency, chemotherapy-induced':
        ['peripheral neuropathy', 'vitamin b12 deficiency',
            'chemotherapy-induced peripheral neuropathy'],
    "bell's palsy: corticosteroid timing, antiviral therapy, eye care":
        ['bell palsy', 'facial nerve palsy'],
    'third, fourth, and sixth cranial nerve palsies: pupil-sparing oculomotor palsy':
        ['cranial nerve palsy', 'oculomotor nerve palsy', 'diplopia'],
    'absence seizures and juvenile myoclonic epilepsy (jme) therapeutic profiles':
        ['juvenile myoclonic epilepsy', 'absence epilepsy', 'epilepsy'],
    "meniere's disease: intratympanic therapy, low-salt diet, surgical options":
        ['meniere disease', 'vertigo'],
    "wilson's disease: caeruloplasmin levels, slit-lamp exam, chelating therapies":
        ['wilson disease'],
    'radiation necrosis vs tumour progression: perfusion mri, pet scan':
        ['brain metastases', 'glioma'],

    // ── Haematology / oncology ──────────────────────────────────────────────
    'chronic myeloid leukemia imatinib': ['chronic myeloid leukaemia', 'chronic myeloid leukemia'],
    'aml transformed from mpn':
        ['acute myeloid leukaemia', 'acute myeloid leukemia', 'myeloproliferative neoplasm'],
    'platelet transfusion thresholds in haematological malignancies':
        ['platelet transfusion', 'thrombocytopenia', 'haematological malignancy'],
    'ovarian cancer parp inhibitor maintenance therapy': ['ovarian cancer'],
    'non-small cell lung cancer immunotherapy': ['non-small cell lung cancer', 'lung cancer'],
    'opioid rotation and equianalgesic dosing': ['cancer pain', 'opioid'],

    // ── Rheumatology / dermatology / infectious diseases ────────────────────
    'plaque psoriasis biologic therapy (il-17/il-23 inhibitors)': ['plaque psoriasis', 'psoriasis'],
    'dupilumab (il-4/il-13 inhibitor) biologic therapy': ['atopic dermatitis', 'eczema'],
    'anti-cd20 therapy in rheumatology':
        ['rheumatoid arthritis', 'systemic lupus erythematosus', 'vasculitis'],
    'chikungunya and zika arthropathy': ['chikungunya', 'zika virus', 'viral arthritis'],
    'viral-induced arthritides': ['viral arthritis', 'arthritis'],
    "whipple's disease rheumatological features": ['whipple disease'],
    'sle: slicc 2012 and acr/eular 2019 classification criteria compared':
        ['systemic lupus erythematosus'],
    'denosumab, romosozumab, teriparatide: anabolic and resorption-inhibiting agents in osteoporosis':
        ['osteoporosis'],
    'ebv infectious mononucleosis: monospot, complications, amoxicillin rash, splenic rupture':
        ['infectious mononucleosis', 'epstein-barr virus'],
    'hiv antiretroviral therapy initiation': ['hiv infection', 'hiv'],
    'hiv: initial diagnosis, cd4 count, viral load, when to start art': ['hiv infection', 'hiv'],

    // ── Endocrinology ───────────────────────────────────────────────────────
    'klinefelter syndrome 47xxy: testosterone deficiency, fertility options, metabolic risks':
        ['klinefelter syndrome', 'hypogonadism'],
    'wolfram syndrome didmoad: diabetes insipidus, dm, optic atrophy, deafness':
        ['wolfram syndrome', 'diabetes insipidus'],
};

/**
 * Normalize a topic name to an alias-table key.
 * Folds curly apostrophes and accented Latin-1 vowels so "Wilson’s" and
 * "Guillain-Barré" match the plain-ASCII keys above.
 */
function aliasKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .replace(/[à-å]/g, 'a')
        .replace(/[è-ë]/g, 'e')
        .replace(/[ì-ï]/g, 'i')
        .replace(/[ò-ö]/g, 'o')
        .replace(/[ù-ü]/g, 'u')
        .replace(/\s+/g, ' ')
        .trim();
}

/** @returns {string[]} conditions to try, most specific first; empty if unmapped. */
function conditionsForTopic(topicName) {
    return TOPIC_CONDITION_ALIASES[aliasKey(topicName)] || [];
}

module.exports = { TOPIC_CONDITION_ALIASES, conditionsForTopic, aliasKey };
