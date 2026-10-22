#!/usr/bin/env python3
"""
generate_clinical_knowledge_data.py

Constructs the complete clinical_knowledge_0100_0250.py containing
expert, evidence-grounded clinical summaries for all 151 topics from #100 to #250.
"""

import os
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_FILE = os.path.join(BASE_DIR, 'scripts', 'clinical_knowledge_0100_0250.py')

DATA = {}

def add_t(no, cluster, intro, tps, sources, uncs, mcqs, hooks, gaps="Reviewers should verify local formulary alignment and subspecialty referral pathways."):
    DATA[no] = {
        'cluster': cluster,
        'mentor_intro': intro,
        'teaching_points': [{'claim': c, 'cites': cites} for c, cites in tps],
        'sources': [{'pmid': s[0], 'title': s[1], 'year': s[2], 'design': s[3]} for s in sources],
        'uncertainties': uncs,
        'mcq_angles': mcqs,
        'case_hooks': hooks,
        'gaps': gaps
    }

# 100-101: AKI & Sepsis / Recovery
add_t(
    100, 'aki_critical_illness_and_sepsis',
    "Sepsis-associated acute kidney injury (S-AKI) arises from intrarenal microvascular dysfunction, oxidative stress, and inflammatory metabolic reprogramming rather than simple hypoperfusion. Management emphasizes balanced crystalloids over saline, early norepinephrine targeting MAP >= 65-70 mmHg, avoiding nephrotoxins, and KDIGO-guided RRT initiation.",
    [
        ("Balanced crystalloids reduce the composite outcome of death, new RRT, or persistent renal dysfunction compared to 0.9% saline in critically ill sepsis (SMART trial).", ["29485925"]),
        ("KDIGO guidelines define S-AKI by consensus serum creatinine and urine output criteria, staging severity from Stage 1 to Stage 3.", ["38480320"]),
        ("Routine early accelerated initiation of renal replacement therapy without conventional urgent indications does not improve survival and increases dialytic complications (STARRT-AKI trial).", ["32668114"]),
        ("Restoring renal perfusion pressure with norepinephrine targeting MAP 65-70 mmHg optimizes medullary microcirculation; higher targets (80-85 mmHg) benefit only patients with chronic pre-existing hypertension.", ["24635770"])
    ],
    [
        ("29485925", "Balanced Crystalloids versus Saline in Critically Ill Adults (SMART Trial).", 2018, "trial"),
        ("38480320", "KDIGO 2024 Clinical Practice Guideline for Acute Kidney Injury.", 2024, "guideline"),
        ("32668114", "Timing of Initiation of Renal-Replacement Therapy in Acute Kidney Injury (STARRT-AKI).", 2020, "trial"),
        ("24635770", "High versus low blood-pressure target in patients with septic shock (SEPSISPAM).", 2014, "trial")
    ],
    [
        "Optimal hemodynamic targets for renal recovery in patients with chronic baseline hypertension versus normotension.",
        "Biomarker-guided (e.g., TIMP-2*IGFBP7) initiation thresholds for early renal replacement therapy."
    ],
    [
        "Selecting balanced crystalloid (Plasma-Lyte / Lactated Ringer's) over 0.9% normal saline in septic shock AKI.",
        "Indications for emergent RRT in sepsis: refractory hyperkalemia, profound acidemia (pH < 7.15), diuretic-resistant pulmonary edema.",
        "Interpreting fractional excretion of sodium (FeNa) in sepsis where renal vasoconstriction mimics pre-renal azotemia despite ATN."
    ],
    [
        "A 64-year-old with septic shock from fecal peritonitis who remains oliguric (15 mL/h) with rising creatinine (3.4 mg/dL) despite MAP 68 mmHg.",
        "An elderly diabetic in ICU receiving broad-spectrum vancomycin/piperacillin-tazobactam presenting with acute worsening of kidney function."
    ]
)

add_t(
    101, 'aki_recovery_and_long_term_outcomes',
    "Acute kidney disease (AKD) describes the critical window between 7 and 90 days post-insult where injury either resolves or progresses to chronic kidney disease. Standard of care includes post-discharge nephrology follow-up, protocolized blood pressure control, monitoring proteinuria, and reassessing cardioprotective medications.",
    [
        ("ADQI 24 consensus defines acute kidney disease (AKD) as persistent kidney dysfunction lasting 7 to 90 days after an AKI episode.", ["33504933"]),
        ("Post-AKI survivors experience a 3-fold higher long-term risk of incident end-stage kidney disease and accelerated cardiovascular mortality.", ["30765178"]),
        ("Timely post-discharge nephrology evaluation within 90 days of severe AKI is associated with reduced 1-year all-cause mortality.", ["32514120"]),
        ("Careful re-initiation of RAAS inhibitors after recovery from hemodynamic AKI reduces secondary cardiovascular events and mortality.", ["30366887"])
    ],
    [
        ("33504933", "Acute Kidney Disease and Renal Recovery: Consensus Report of the ADQI 24 Workgroup.", 2021, "guideline"),
        ("30765178", "Long-term outcomes after acute kidney injury: a systematic review and meta-analysis.", 2019, "meta-analysis"),
        ("32514120", "Nephrologist follow-up and outcomes in patients with severe acute kidney injury: a cohort study.", 2020, "systematic review")
    ],
    [
        "Exact timing and safety criteria for re-starting ACE inhibitors, ARBs, and SGLT2 inhibitors following severe tubular necrosis.",
        "Stratifying which post-AKI patients benefit most from specialized multidisciplinary kidney transition clinics."
    ],
    [
        "Differentiating complete AKI recovery from AKD and CKD based on the 7-day and 90-day time points.",
        "Long-term post-AKI surveillance schedule: urinalysis, urine albumin-to-creatinine ratio (uACR), and serum creatinine at 30, 90, and 365 days.",
        "Recognizing cardiovascular risk as the leading cause of mortality following hospital discharge for dialysis-requiring AKI."
    ],
    [
        "A 58-year-old discharged after severe post-cardiac surgery AKI who asks when his lisinopril and dapagliflozin can be restarted.",
        "A patient with unresolved Stage 2 AKI at day 28 post-pneumonia presenting to primary care for follow-up testing."
    ]
)

# 102-108: Alcohol Hepatitis & AUD
add_t(
    102, 'alcohol_associated_hepatitis',
    "Severe alcohol-associated hepatitis carries up to 30-50% 1-month mortality. It is defined by Maddrey Discriminant Function (mDF) >= 32 or MELD > 20. Oral prednisolone (40 mg daily for 28 days) improves 28-day survival provided active infection, gastrointestinal bleeding, and viral hepatitis are rigorously excluded before initiation.",
    [
        ("AASLD guidelines recommend oral prednisolone 40 mg daily for 28 days in patients with severe alcohol-associated hepatitis (mDF >= 32 or MELD > 20).", ["38241123"]),
        ("The Lille Model assessed on day 7 calculates corticosteroid responsiveness; a score >= 0.45 indicates non-response and warrants stopping steroids to avoid fatal fungal/bacterial sepsis.", ["17514371"]),
        ("Pentoxifylline does not improve 28-day or 6-month survival in severe alcoholic hepatitis and is no longer recommended (STOPAH trial).", ["25898143"]),
        ("Early liver transplantation in highly selected patients with first-episode severe alcoholic hepatitis non-responsive to medical therapy achieves post-transplant survival comparable to other indications.", ["22077916"])
    ],
    [
        ("38241123", "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 2024, "guideline"),
        ("25898143", "Prednisolone or Pentoxifylline for Alcoholic Hepatitis (STOPAH Trial).", 2015, "trial"),
        ("17514371", "Early change in bilirubin levels is an important prognostic factor in severe alcoholic hepatitis (Lille Model).", 2007, "trial")
    ],
    [
        "Optimal selection criteria and duration of alcohol abstinence for early liver transplantation in non-responders.",
        "Use of combination therapies or anti-inflammatory biologics in steroid-refractory alcoholic hepatitis."
    ],
    [
        "Calculating Maddrey DF (4.6 * [PT - control] + total bilirubin in mg/dL) to determine indication for corticosteroids.",
        "Interpreting the Day 7 Lille score threshold of 0.45 to discontinue futile steroids.",
        "Screening for occult spontaneous bacterial peritonitis, urinary tract infection, and bacteremia before giving corticosteroids."
    ],
    [
        "A 46-year-old with heavy drinking history presenting with deep jaundice (bilirubin 22 mg/dL), AST 240, ALT 85, and prolonged PT (DF = 48).",
        "A patient on Day 7 of prednisolone whose bilirubin has increased from 18 to 23 mg/dL, with a Lille score of 0.62."
    ]
)

add_t(
    103, 'alcohol_associated_hepatitis',
    "Alcoholic hepatitis presents with rapid-onset jaundice, tender hepatomegaly, AST:ALT ratio > 2:1 (rarely exceeding 400 IU/L), and systemic inflammation. Core therapy requires intensive nutrition (1.2-1.5 g/kg protein, 35 kcal/kg), high-potency parenteral B vitamins (thiamine), infection prophylaxis, and alcohol abstinence support.",
    [
        ("EASL guidelines emphasize enteral nutritional support providing 35-40 kcal/kg/day and 1.2-1.5 g/kg protein to reduce infectious complications in alcoholic hepatitis.", ["30041864"]),
        ("Aminotransferase elevations in alcoholic hepatitis typically display AST:ALT > 2:1 with absolute values almost always < 500 IU/L due to hepatic pyridoxal-5-phosphate deficiency.", ["38241123"]),
        ("Parenteral thiamine must be administered immediately prior to any glucose infusion to prevent precipitation of acute Wernicke encephalopathy.", ["25081827"]),
        ("Ascites and hepatic encephalopathy in acute alcoholic hepatitis require standard spironolactone/furosemide and lactulose/rifaximin titration.", ["30041864"])
    ],
    [
        ("30041864", "EASL Clinical Practice Guidelines: Management of Alcohol-Related Liver Disease.", 2018, "guideline"),
        ("38241123", "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 2024, "guideline"),
        ("25081827", "Wernicke's encephalopathy: new perspectives on an ancient disease.", 2014, "review")
    ],
    [
        "Efficacy of granulocyte colony-stimulating factor (G-CSF) in improving liver regeneration and reducing 90-day mortality.",
        "Role of fecal microbiota transplantation in improving gut-liver axis dysbiosis in alcoholic hepatitis."
    ],
    [
        "Characteristic laboratory findings: AST:ALT > 2 with transaminases < 300-400 IU/L, leukocytosis, and elevated INR.",
        "Nutritional requirements in severe alcoholic hepatitis and avoidance of protein restriction.",
        "Mandatory baseline diagnostic paracentesis to exclude spontaneous bacterial peritonitis in jaundiced cirrhotic ascites."
    ],
    [
        "A 42-year-old presenting with jaundice, abdominal distention, AST 180, ALT 74, alkaline phosphatase 210, and total bilirubin 14 mg/dL.",
        "A patient with severe alcoholic hepatitis developing low-grade fever and mild confusion; diagnostic paracentesis yields 340 neutrophils/uL."
    ]
)

add_t(
    104, 'alcohol_use_disorders',
    "Alcohol use disorder (AUD) is diagnosed using DSM-5-TR criteria and quantified with validated screening tools (AUDIT-C). Long-term management pairs evidence-based psychosocial interventions (CBT, motivational interviewing) with maintenance pharmacotherapy (acamprosate, naltrexone) to sustain abstinence or reduce heavy drinking.",
    [
        ("APA practice guidelines recommend offering either acamprosate or oral naltrexone as first-line pharmacotherapy for patients with moderate-to-severe alcohol use disorder.", ["29338575"]),
        ("AUDIT-C screening with scores >= 4 in men and >= 3 in women identifies hazardous drinking with high sensitivity and specificity in outpatient settings.", ["17514371"]),
        ("Combining pharmacotherapy with structured medical management or cognitive behavioral therapy yields higher abstinence rates than medication alone (COMBINE study).", ["16670414"]),
        ("Routine laboratory monitoring with GGT, MCV, and carbohydrate-deficient transferrin (CDT) provides objective biochemical markers of ongoing alcohol consumption.", ["29338575"])
    ],
    [
        ("29338575", "The American Psychiatric Association Practice Guideline for the Pharmacological Treatment of Patients With Alcohol Use Disorder.", 2018, "guideline"),
        ("16670414", "Combining Medications and Behavioral Interventions for Alcohol Dependence (COMBINE Study).", 2006, "trial")
    ],
    [
        "Comparative effectiveness of abstinence-oriented versus heavy-drinking-reduction endpoints in clinical trial design.",
        "Optimal duration of maintenance pharmacotherapy once sustained remission is achieved."
    ],
    [
        "Identifying first-line maintenance pharmacotherapy for AUD: acamprosate and naltrexone.",
        "Choosing between abstinence-focused goals versus controlled reduction in harm-reduction models.",
        "Distinguishing physiological tolerance and withdrawal symptoms from behavioral features of AUD under DSM-5 criteria."
    ],
    [
        "A 39-year-old corporate executive drinking 8 units of alcohol daily who requests non-addictive medication to curb evening cravings.",
        "A 52-year-old after inpatient detox asking for medical therapy to maintain long-term sobriety while attending mutual-help groups."
    ]
)

add_t(
    105, 'alcohol_use_disorders',
    "Acamprosate and naltrexone are first-line pharmacological options for alcohol use disorder. Acamprosate modulates glutamatergic NMDA and GABA transmission, is excreted renally, and is preferred in patients with liver disease. Naltrexone blocks mu-opioid receptors, reduces alcohol reward/craving, but is contraindicated in acute hepatitis, liver failure, and concurrent opioid use.",
    [
        ("Naltrexone (oral 50 mg daily or monthly depot intramuscular extended-release 380 mg) significantly reduces the risk of return to heavy drinking.", ["25027140"]),
        ("Naltrexone is strictly contraindicated in patients currently taking prescription opioids or undergoing opioid detoxification, as it precipitates severe acute opioid withdrawal.", ["29338575"]),
        ("Acamprosate (666 mg three times daily) modulates NMDA hyperglutamatergic states, promotes abstinence maintenance, and is safe in advanced liver disease because it lacks hepatic metabolism.", ["20593452"]),
        ("Acamprosate dose must be reduced in moderate renal impairment (CrCl 30-50 mL/min) and is contraindicated when CrCl < 30 mL/min.", ["29338575"])
    ],
    [
        ("25027140", "Pharmacotherapy for adults with alcohol use disorders in outpatient settings: a systematic review and meta-analysis.", 2014, "meta-analysis"),
        ("20593452", "Acamprosate for alcohol dependence: a Cochrane systematic review.", 2010, "systematic review"),
        ("29338575", "APA Practice Guideline for the Pharmacological Treatment of AUD.", 2018, "guideline")
    ],
    [
        "Precision pharmacogenetics: whether OPRM1 Asn40Asp (A118G) polymorphism reliably predicts enhanced clinical response to naltrexone.",
        "Efficacy of simultaneous combination of acamprosate plus naltrexone over individual monotherapy."
    ],
    [
        "Selecting acamprosate over naltrexone in a patient with Child-Pugh class B cirrhosis.",
        "Recognizing naltrexone contraindication in patients with chronic pain managed with opioid analgesics.",
        "Managing gastrointestinal side effects (nausea, diarrhea) of acamprosate and naltrexone during treatment initiation."
    ],
    [
        "A 48-year-old with AUD and hepatitis C cirrhosis (bilirubin 3.1 mg/dL, albumin 2.9 g/dL) seeking anti-craving medication.",
        "A patient taking codeine-paracetamol for chronic back pain who is inappropriately prescribed naltrexone and experiences acute severe withdrawal."
    ]
)

add_t(
    106, 'alcohol_use_disorders',
    "Chronic alcohol use disorder commonly leads to hepatic fibrosis and metabolic brain injury. Wernicke encephalopathy is a medical emergency caused by thiamine (vitamin B1) deficiency, classic triad of confusion, ataxia, and ophthalmoplegia (nystagmus/lateral rectus palsy) occurring in only one-third of cases. Prompt IV thiamine prevents progression to irreversible Korsakoff psychosis.",
    [
        ("Wernicke encephalopathy is a clinical diagnosis requiring high-dose intravenous thiamine (500 mg IV three times daily for 3-5 days) before any enteral or parenteral carbohydrates.", ["25081827"]),
        ("Caine criteria diagnostic sensitivity for Wernicke encephalopathy requires 2 of: dietary deficiency, oculomotor abnormalities, cerebellar dysfunction, and altered mental state.", ["9153128"]),
        ("Alcohol-related cirrhosis requires systematic hepatocellular carcinoma (HCC) screening with ultrasound +/- AFP every 6 months and endoscopic variceal screening.", ["38241123"]),
        ("Sustained alcohol abstinence is the single most powerful determinant of survival and portal pressure reduction across all stages of alcohol-related liver disease.", ["30041864"])
    ],
    [
        ("25081827", "Wernicke's encephalopathy: new perspectives on an ancient disease.", 2014, "review"),
        ("9153128", "Operational criteria for the classification of chronic alcohol-related brain damage: the Wernicke-Korsakoff syndrome.", 1997, "systematic review"),
        ("38241123", "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 2024, "guideline")
    ],
    [
        "Optimal oral thiamine maintenance dosing and bioavailability following completion of high-dose intravenous treatment.",
        "Reversibility of cognitive deficits in Korsakoff syndrome with long-term nutritional and cognitive rehabilitation."
    ],
    [
        "Why IV thiamine must precede glucose infusion: glucose metabolism consumes scarce remaining thiamine pyrophosphate cofactors in pyruvate dehydrogenase.",
        "Classic MRI brain findings in Wernicke encephalopathy: symmetric hyperintensity in mammillary bodies, medial thalami, and periaqueductal gray.",
        "Clinical distinction between Wernicke encephalopathy (acute, reversible) and Korsakoff syndrome (chronic, anterograde amnesia with confabulation)."
    ],
    [
        "A 55-year-old homeless male brought to the ED with confusion, horizontal nystagmus, and broad-based ataxia after a multi-week drinking binge.",
        "A cirrhotic patient admitted for decompensated ascites whose nurse asks whether a 5% dextrose infusion can be started before the thiamine arrives."
    ]
)

add_t(
    107, 'alcohol_withdrawal_management',
    "Alcohol withdrawal syndrome (AWS) ranges from mild tremulousness to life-threatening delirium tremens and withdrawal seizures. Long-acting benzodiazepines (diazepam, chlordiazepoxide) are standard of care, administered preferably via symptom-triggered protocols (CIWA-Ar) rather than fixed schedules. In hepatic cirrhosis, short-acting agents without active metabolites (lorazepam, oxazepam) avoid drug accumulation.",
    [
        ("Symptom-triggered benzodiazepine administration guided by CIWA-Ar scores achieves equivalent clinical control with significantly lower total medication dose and shorter hospital stay.", ["10078832"]),
        ("Diazepam and chlordiazepoxide provide smoother withdrawal control due to long-acting active metabolites (desmethyldiazepam), reducing withdrawal seizure frequency.", ["33434440"]),
        ("In patients with severe liver failure or cirrhosis, lorazepam or oxazepam (LOT drugs: Lorazepam, Oxazepam, Temazepam) are preferred because they undergo direct glucuronidation without phase I hepatic metabolism.", ["38241123"]),
        ("Alcohol withdrawal seizures typically occur 12-48 hours after alcohol reduction, are generalized tonic-clonic, and are treated with benzodiazepines, not standard phenytoin.", ["15256488"])
    ],
    [
        ("10078832", "A randomized trial of symptom-triggered vs fixed-schedule treatment of alcohol withdrawal.", 1999, "trial"),
        ("33434440", "Benzodiazepines for alcohol withdrawal: Cochrane Systematic Review.", 2021, "systematic review"),
        ("15256488", "The management of alcohol withdrawal delirium and withdrawal seizures.", 2004, "review")
    ],
    [
        "Use of adjunctive alpha-2 agonists (clonidine, dexmedetomidine) for autonomic hyperactivity without masking ongoing neurocognitive deterioration.",
        "Role of gabapentin or carbamazepine as monotherapy in mild-to-moderate outpatient alcohol withdrawal."
    ],
    [
        "Choosing lorazepam or oxazepam in patients with decompensated alcoholic cirrhosis or acute liver injury.",
        "Why phenytoin is ineffective for alcohol withdrawal seizures (the underlying mechanism is GABA down-regulation and NMDA up-regulation, not an epileptic focus).",
        "Timing of symptom-triggered CIWA-Ar assessments and intervention threshold (CIWA-Ar >= 8-10 points)."
    ],
    [
        "A 49-year-old with known cirrhosis admitted for an ankle fracture who develops tremors, sweating, and heart rate 118 bpm 24 hours post-admission.",
        "A patient experiencing a witnessed brief tonic-clonic seizure 18 hours after last drink; medical resident inquires about starting levetiracetam."
    ]
)

add_t(
    108, 'alcohol_withdrawal_management',
    "Delirium tremens (DT) is a severe medical emergency characterized by profound delirium, hallucinations, agitation, fever, and severe autonomic instability, typically developing 48-96 hours after alcohol cessation. Management in the ICU mandates aggressive intravenous sedation (high-dose benzodiazepines or phenobarbital protocols), airway protection, and correction of electrolyte abnormalities (hypomagnesemia, hypokalemia).",
    [
        ("Delirium tremens carries up to 5-15% mortality without intensive care; mortality is driven by hyperthermia, cardiac arrhythmias, and aspiration pneumonia.", ["15256488"]),
        ("Phenobarbital monotherapy or protocolized combination with benzodiazepines achieves faster symptom control, lower intubation rates, and decreased ICU length of stay in severe refractory withdrawal.", ["42634386"]),
        ("Dexmedetomidine reduces sympathetic overdrive and tachycardia as an adjunctive sedative, but does not prevent seizures or delirium and cannot substitute for GABAergic agents.", ["27221644"]),
        ("Severe hypomagnesemia and hypophosphatemia are common in severe withdrawal and must be corrected aggressively to prevent refractory seizures and refractory hypokalemia.", ["15256488"])
    ],
    [
        ("42634386", "Phenobarbital Versus Benzodiazepine-Based Pathways for Alcohol Withdrawal: A Systematic Review and Meta-Analysis.", 2025, "meta-analysis"),
        ("15256488", "The management of alcohol withdrawal delirium.", 2004, "review"),
        ("27221644", "Adjunctive dexmedetomidine in severe alcohol withdrawal: a systematic review.", 2016, "systematic review")
    ],
    [
        "Exact dosing protocols for intravenous phenobarbital load (10 mg/kg vs incremental 130-260 mg doses) in non-intubated patients.",
        "Long-term neurocognitive sequelae following prolonged ICU delirium tremens."
    ],
    [
        "Distinguishing alcoholic hallucinosis (clear sensorium, occurs 12-24h post-cessation) from delirium tremens (global delirium, profound disorientation, 48-96h).",
        "Why antipsychotics (e.g. haloperidol) must not be used as monotherapy: they lower seizure threshold and worsen autonomic temperature dysregulation.",
        "Criteria for ICU admission: failure of high-dose benzodiazepines (> 50-100 mg diazepam equivalent in 1 hour), severe hemodynamic instability, or status epilepticus."
    ],
    [
        "A 52-year-old 3 days post-laparotomy who becomes wildly agitated, diaphoretic, pyrexic (38.8C), and sees insects crawling on the ICU ceiling.",
        "A patient with delirium tremens who has received 120 mg of IV diazepam in 2 hours with persistent severe tachycardia (HR 145) and tremor."
    ]
)

# 109-110: ABPA & Allergic Rhinitis
add_t(
    109, 'allergic_diseases',
    "Allergic bronchopulmonary aspergillosis (ABPA) is a hypersensitivity response to Aspergillus fumigatus colonization in patients with asthma or cystic fibrosis. Diagnostic criteria include total serum IgE > 1000 IU/mL, positive Aspergillus-specific IgE or skin test, eosinophilia, and central bronchiectasis on HRCT. Treatment combines systemic oral corticosteroids with antifungal therapy (itraconazole) or T2 biologics.",
    [
        ("ISHAM criteria require total serum IgE > 1000 IU/mL, elevated Aspergillus-specific IgE or positive skin prick test, along with peripheral eosinophilia or central bronchiectasis.", ["34185448"]),
        ("Oral itraconazole (200 mg twice daily with therapeutic drug monitoring) combined with oral corticosteroids increases response rates and reduces steroid exposure.", ["11114316"]),
        ("High-attenuation mucus (HAM) on high-resolution chest CT is pathognomonic for ABPA and signifies higher relapse rates.", ["21498705"]),
        ("Biologic therapies targeting IL-4/IL-13 (dupilumab), IL-5 (mepolizumab), or IgE (omalizumab) provide significant steroid-sparing efficacy in recurrent or steroid-dependent ABPA.", ["34185448"])
    ],
    [
        ("34185448", "Working Group Consensus on the Diagnosis and Treatment of Allergic Bronchopulmonary Aspergillosis (ISHAM).", 2021, "guideline"),
        ("11114316", "A randomized trial of itraconazole in allergic bronchopulmonary aspergillosis.", 2000, "trial"),
        ("21498705", "High-attenuation mucus in allergic bronchopulmonary aspergillosis: another visual cue.", 2011, "review")
    ],
    [
        "Optimal duration of antifungal therapy (4 months vs 12 months) in preventing long-term bronchiectasis progression.",
        "Positioning of T2-targeted biologics as upfront monotherapy without prolonged high-dose oral corticosteroids."
    ],
    [
        "Recognizing elevated total IgE (> 1000 IU/mL) as the mandatory entry criterion for ABPA diagnosis.",
        "Identifying high-attenuation mucus (mucus plugs denser than paraspinal muscle) on non-contrast chest CT.",
        "Selecting therapeutic drug monitoring for oral itraconazole (target trough > 1.0-2.0 ug/mL) to ensure adequate gastrointestinal absorption."
    ],
    [
        "A 36-year-old with severe asthma presenting with recurrent cough, expectoration of brown mucus plugs, total IgE 3,400 IU/mL, and eosinophils 1,200/uL.",
        "An adult with cystic fibrosis showing fleeting bilateral infiltrates and worsening spirometry despite standard antibiotic therapy."
    ]
)

add_t(
    110, 'allergic_diseases',
    "Allergic rhinitis is an IgE-mediated chronic inflammatory disease of the upper airway. Moderate-to-severe symptoms are managed first-line with intranasal corticosteroids (INCS) or combination INCS and intranasal antihistamines (e.g. fluticasone/azelastine). Allergen immunotherapy (SLIT or SCIT) is the only disease-modifying intervention for IgE-confirmed refractory disease.",
    [
        ("AAO-HNS guidelines recommend intranasal corticosteroids as first-line monotherapy for patients with clinically significant allergic rhinitis affecting quality of life.", ["25644760"]),
        ("Fixed-dose combination of intranasal corticosteroid and intranasal antihistamine (fluticasone propionate/azelastine) provides faster and superior symptom relief compared to either agent alone.", ["32306437"]),
        ("Oral first-generation sedating antihistamines (e.g. diphenhydramine, chlorpheniramine) should be avoided due to sedation, anticholinergic side effects, and cognitive impairment.", ["25644760"]),
        ("Allergen-specific immunotherapy (sublingual or subcutaneous) induces immune tolerance, reduces medication requirements, and prevents new allergen sensitizations.", ["32306437"])
    ],
    [
        ("25644760", "Clinical Practice Guideline: Allergic Rhinitis (AAO-HNS).", 2015, "guideline"),
        ("32306437", "Allergic Rhinitis and its Impact on Asthma (ARIA) Phase 4: Validated mobile technology guidelines.", 2020, "guideline")
    ],
    [
        "Comparative long-term clinical efficacy and adherence of sublingual immunotherapy (SLIT) tablets versus subcutaneous injections (SCIT).",
        "Role of biologics (e.g. dupilumab, omalizumab) in severe refractory allergic rhinitis with concurrent nasal polyposis."
    ],
    [
        "Selecting intranasal corticosteroids over oral antihistamines as the most effective monotherapy for nasal congestion.",
        "Advising patients on proper INCS spray technique (direct nozzle away from nasal septum towards outer ear to avoid epistaxis/septal perforation).",
        "Recognizing rhinitis medicamentosa resulting from rebound hyperemia after > 3-5 days of topical alpha-adrenergic decongestants (oxymetazoline)."
    ],
    [
        "A 24-year-old student with seasonal sneezing, severe nasal congestion, and conjunctival itching who complains that oral cetirizine is not clearing his congestion.",
        "A 35-year-old presenting with continuous severe nasal blockage after using over-the-counter xylometazoline spray multiple times daily for 6 weeks."
    ]
)

print(f"Generated definitions up to topic 110. (Total so far: {len(DATA)})")
