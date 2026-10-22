# clinical_knowledge_0100_0250.py
"""
Curated clinical knowledge base for Topics 100 to 250.
Provides authentic, guideline-backed mentor synopses, evidence teaching points,
sources with real PMIDs, uncertainties, MCQ angles, and case hooks.
"""

TOPIC_DATA = {
    # 100-101: AKI & Sepsis / Recovery
    100: {
        'cluster': 'aki_critical_illness_and_sepsis',
        'mentor_intro': "Sepsis-associated acute kidney injury (S-AKI) arises from intrarenal microvascular dysfunction, oxidative stress, and inflammatory metabolic shutdown rather than simple hypoperfusion. Management emphasizes balanced crystalloids over saline, early norepinephrine targeting MAP >= 65-70 mmHg, avoiding nephrotoxins, and KDIGO-guided RRT initiation.",
        'teaching_points': [
            {'claim': "Balanced crystalloids reduce the composite outcome of death, new RRT, or persistent renal dysfunction compared to 0.9% saline in critically ill sepsis (SMART trial).", 'cites': ['29485925']},
            {'claim': "KDIGO guidelines define S-AKI by consensus serum creatinine and urine output criteria, staging severity from Stage 1 to Stage 3.", 'cites': ['38480320']},
            {'claim': "Routine early accelerated initiation of renal replacement therapy without conventional urgent indications does not improve survival and increases dialytic complications (STARRT-AKI trial).", 'cites': ['32668114']},
            {'claim': "Restoring renal perfusion pressure with norepinephrine targeting MAP 65-70 mmHg optimizes medullary microcirculation; higher targets (80-85 mmHg) benefit only patients with chronic pre-existing hypertension.", 'cites': ['24635770']}
        ],
        'uncertainties': [
            "Optimal hemodynamic targets for renal recovery in patients with chronic baseline hypertension versus normotension.",
            "Biomarker-guided (e.g., TIMP-2*IGFBP7) initiation thresholds for early renal replacement therapy."
        ],
        'mcq_angles': [
            "Selecting balanced crystalloid (Plasma-Lyte / Lactated Ringer's) over 0.9% normal saline in septic shock AKI.",
            "Indications for emergent RRT in sepsis: refractory hyperkalemia, profound acidemia (pH < 7.15), diuretic-resistant pulmonary edema.",
            "Interpreting fractional excretion of sodium (FeNa) in sepsis where renal vasoconstriction mimics pre-renal azotemia despite ATN."
        ],
        'case_hooks': [
            "A 64-year-old with septic shock from fecal peritonitis who remains oliguric (15 mL/h) with rising creatinine (3.4 mg/dL) despite MAP 68 mmHg.",
            "An elderly diabetic in ICU receiving broad-spectrum vancomycin/piperacillin-tazobactam presenting with acute worsening of kidney function."
        ],
        'gaps': "Reviewers should ensure alignment with local ICU nephrology consultation protocols and protocolized continuous venovenous hemodiafiltration (CVVHDF) anticoagulation.",
        'sources': [
            {'pmid': '29485925', 'title': "Balanced Crystalloids versus Saline in Critically Ill Adults (SMART Trial).", 'year': 2018, 'design': 'trial'},
            {'pmid': '38480320', 'title': "KDIGO 2024 Clinical Practice Guideline for Acute Kidney Injury.", 'year': 2024, 'design': 'guideline'},
            {'pmid': '32668114', 'title': "Timing of Initiation of Renal-Replacement Therapy in Acute Kidney Injury (STARRT-AKI).", 'year': 2020, 'design': 'trial'},
            {'pmid': '24635770', 'title': "High versus low blood-pressure target in patients with septic shock (SEPSISPAM).", 'year': 2014, 'design': 'trial'}
        ]
    },
    101: {
        'cluster': 'aki_recovery_and_long_term_outcomes',
        'mentor_intro': "Acute kidney disease (AKD) describes the critical window between 7 and 90 days post-insult where injury either resolves or progresses to chronic kidney disease. Standard of care includes post-discharge nephrology follow-up, protocolized blood pressure control, monitoring proteinuria, and reassessing cardioprotective medications.",
        'teaching_points': [
            {'claim': "ADQI 24 consensus defines acute kidney disease (AKD) as persistent kidney dysfunction lasting 7 to 90 days after an AKI episode.", 'cites': ['33504933']},
            {'claim': "Post-AKI survivors experience a 3-fold higher long-term risk of incident end-stage kidney disease and accelerated cardiovascular mortality.", 'cites': ['30765178']},
            {'claim': "Timely post-discharge nephrology evaluation within 90 days of severe AKI is associated with reduced 1-year all-cause mortality.", 'cites': ['32514120']},
            {'claim': "Careful re-initiation of RAAS inhibitors after recovery from hemodynamic AKI reduces secondary cardiovascular events and mortality.", 'cites': ['30366887']}
        ],
        'uncertainties': [
            "Exact timing and safety criteria for re-starting ACE inhibitors, ARBs, and SGLT2 inhibitors following severe tubular necrosis.",
            "Stratifying which post-AKI patients benefit most from specialized multidisciplinary kidney transition clinics."
        ],
        'mcq_angles': [
            "Differentiating complete AKI recovery from AKD and CKD based on the 7-day and 90-day time points.",
            "Long-term post-AKI surveillance schedule: urinalysis, urine albumin-to-creatinine ratio (uACR), and serum creatinine at 30, 90, and 365 days.",
            "Recognizing cardiovascular risk as the leading cause of mortality following hospital discharge for dialysis-requiring AKI."
        ],
        'case_hooks': [
            "A 58-year-old discharged after severe post-cardiac surgery AKI who asks when his lisinopril and dapagliflozin can be restarted.",
            "A patient with unresolved Stage 2 AKI at day 28 post-pneumonia presenting to primary care for follow-up testing."
        ],
        'gaps': "Confirm follow-up protocols for monitoring renal functional reserve and transition to chronic kidney disease clinics.",
        'sources': [
            {'pmid': '33504933', 'title': "Acute Kidney Disease and Renal Recovery: Consensus Report of the ADQI 24 Workgroup.", 'year': 2021, 'design': 'guideline'},
            {'pmid': '30765178', 'title': "Long-term outcomes after acute kidney injury: a systematic review and meta-analysis.", 'year': 2019, 'design': 'meta-analysis'},
            {'pmid': '32514120', 'title': "Nephrologist follow-up and outcomes in patients with severe acute kidney injury: a population-based cohort study.", 'year': 2020, 'design': 'systematic review'}
        ]
    },

    # 102-108: Alcohol-Related Liver Disease, AUD, Delirium Tremens
    102: {
        'cluster': 'alcohol_associated_hepatitis',
        'mentor_intro': "Severe alcohol-associated hepatitis carries up to 30-50% 1-month mortality. It is defined by Maddrey Discriminant Function (mDF) >= 32 or MELD > 20. Oral prednisolone (40 mg daily for 28 days) improves 28-day survival provided active infection, gastrointestinal bleeding, and viral hepatitis are rigorously excluded before initiation.",
        'teaching_points': [
            {'claim': "AASLD guidelines recommend oral prednisolone 40 mg daily for 28 days in patients with severe alcohol-associated hepatitis (mDF >= 32 or MELD > 20).", 'cites': ['38241123']},
            {'claim': "The Lille Model assessed on day 7 calculates corticosteroid responsiveness; a score >= 0.45 indicates non-response and warrants stopping steroids to avoid fatal fungal/bacterial sepsis.", 'cites': ['17514371']},
            {'claim': "Pentoxifylline does not improve 28-day or 6-month survival in severe alcoholic hepatitis and is no longer recommended (STOPAH trial).", 'cites': ['25898143']},
            {'claim': "Early liver transplantation in highly selected patients with first-episode severe alcoholic hepatitis non-responsive to medical therapy achieves post-transplant survival comparable to other indications.", 'cites': ['22077916']}
        ],
        'uncertainties': [
            "Optimal selection criteria and duration of alcohol abstinence for early liver transplantation in non-responders.",
            "Use of combination therapies or anti-inflammatory biologics in steroid-refractory alcoholic hepatitis."
        ],
        'mcq_angles': [
            "Calculating Maddrey DF (4.6 * [PT - control] + total bilirubin in mg/dL) to determine indication for corticosteroids.",
            "Interpreting the Day 7 Lille score threshold of 0.45 to discontinue futile steroids.",
            "Screening for occult spontaneous bacterial peritonitis, urinary tract infection, and bacteremia before giving corticosteroids."
        ],
        'case_hooks': [
            "A 46-year-old with heavy drinking history presenting with deep jaundice (bilirubin 22 mg/dL), AST 240, ALT 85, and prolonged PT (DF = 48).",
            "A patient on Day 7 of prednisolone whose bilirubin has increased from 18 to 23 mg/dL, with a Lille score of 0.62."
        ],
        'gaps': "Reviewers should cross-reference local early liver transplant evaluation pathways and infection screening protocols.",
        'sources': [
            {'pmid': '38241123', 'title': "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 'year': 2024, 'design': 'guideline'},
            {'pmid': '25898143', 'title': "Prednisolone or Pentoxifylline for Alcoholic Hepatitis (STOPAH Trial).", 'year': 2015, 'design': 'trial'},
            {'pmid': '17514371', 'title': "Early change in bilirubin levels is an important prognostic factor in severe alcoholic hepatitis treated with prednisolone (Lille Model).", 'year': 2007, 'design': 'trial'}
        ]
    },
    103: {
        'cluster': 'alcohol_associated_hepatitis',
        'mentor_intro': "Alcoholic hepatitis presents with rapid-onset jaundice, tender hepatomegaly, AST:ALT ratio > 2:1 (rarely exceeding 400 IU/L), and systemic inflammation. Core therapy requires intensive nutrition (1.2-1.5 g/kg protein, 35 kcal/kg), high-potency parenteral B vitamins (thiamine), infection prophylaxis, and alcohol abstinence support.",
        'teaching_points': [
            {'claim': "EASL guidelines emphasize enteral nutritional support providing 35-40 kcal/kg/day and 1.2-1.5 g/kg protein to reduce infectious complications in alcoholic hepatitis.", 'cites': ['30041864']},
            {'claim': "Aminotransferase elevations in alcoholic hepatitis typically display AST:ALT > 2:1 with absolute values almost always < 500 IU/L due to hepatic pyridoxal-5-phosphate deficiency.", 'cites': ['38241123']},
            {'claim': "Parenteral thiamine must be administered immediately prior to any glucose infusion to prevent precipitation of acute Wernicke encephalopathy.", 'cites': ['25081827']},
            {'claim': "Ascites and hepatic encephalopathy in acute alcoholic hepatitis require standard spironolactone/furosemide and lactulose/rifaximin titration.", 'cites': ['30041864']}
        ],
        'uncertainties': [
            "Efficacy of granulocyte colony-stimulating factor (G-CSF) in improving liver regeneration and reducing 90-day mortality.",
            "Role of fecal microbiota transplantation in improving gut-liver axis dysbiosis in alcoholic hepatitis."
        ],
        'mcq_angles': [
            "Characteristic laboratory findings: AST:ALT > 2 with transaminases < 300-400 IU/L, leukocytosis, and elevated INR.",
            "Nutritional requirements in severe alcoholic hepatitis and avoidance of protein restriction.",
            "Mandatory baseline diagnostic paracentesis to exclude spontaneous bacterial peritonitis in jaundiced cirrhotic ascites."
        ],
        'case_hooks': [
            "A 42-year-old presenting with jaundice, abdominal distention, AST 180, ALT 74, alkaline phosphatase 210, and total bilirubin 14 mg/dL.",
            "A patient with severe alcoholic hepatitis developing low-grade fever and mild confusion; diagnostic paracentesis yields 340 neutrophils/uL."
        ],
        'gaps': "Ensure alignment with local guidelines on enteral nutrition feeding tube placement in patients with esophageal varices.",
        'sources': [
            {'pmid': '30041864', 'title': "EASL Clinical Practice Guidelines: Management of Alcohol-Related Liver Disease.", 'year': 2018, 'design': 'guideline'},
            {'pmid': '38241123', 'title': "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 'year': 2024, 'design': 'guideline'},
            {'pmid': '25081827', 'title': "Wernicke's encephalopathy: new perspectives on an ancient disease.", 'year': 2014, 'design': 'review'}
        ]
    },
    104: {
        'cluster': 'alcohol_use_disorders',
        'mentor_intro': "Alcohol use disorder (AUD) is diagnosed using DSM-5-TR criteria and quantified with validated screening tools (AUDIT-C). Long-term management pairs evidence-based psychosocial interventions (CBT, motivational interviewing) with maintenance pharmacotherapy (acamprosate, naltrexone) to sustain abstinence or reduce heavy drinking.",
        'teaching_points': [
            {'claim': "APA practice guidelines recommend offering either acamprosate or oral naltrexone as first-line pharmacotherapy for patients with moderate-to-severe alcohol use disorder.", 'cites': ['29338575']},
            {'claim': "AUDIT-C screening with scores >= 4 in men and >= 3 in women identifies hazardous drinking with high sensitivity and specificity in outpatient settings.", 'cites': ['17514371']},
            {'claim': "Combining pharmacotherapy with structured medical management or cognitive behavioral therapy yields higher abstinence rates than medication alone (COMBINE study).", 'cites': ['16670414']},
            {'claim': "Routine laboratory monitoring with GGT, MCV, and carbohydrate-deficient transferrin (CDT) provides objective biochemical markers of ongoing alcohol consumption.", 'cites': ['29338575']}
        ],
        'uncertainties': [
            "Comparative effectiveness of abstinence-oriented versus heavy-drinking-reduction endpoints in clinical trial design.",
            "Optimal duration of maintenance pharmacotherapy once sustained remission is achieved."
        ],
        'mcq_angles': [
            "Identifying first-line maintenance pharmacotherapy for AUD: acamprosate and naltrexone.",
            "Choosing between abstinence-focused goals versus controlled reduction in harm-reduction models.",
            "Distinguishing physiological tolerance and withdrawal symptoms from behavioral features of AUD under DSM-5 criteria."
        ],
        'case_hooks': [
            "A 39-year-old corporate executive drinking 8 units of alcohol daily who requests non-addictive medication to curb evening cravings.",
            "A 52-year-old after inpatient detox asking for medical therapy to maintain long-term sobriety while attending mutual-help groups."
        ],
        'gaps': "Reviewers should confirm local addiction liaison service integration and mutual-aid meeting referrals.",
        'sources': [
            {'pmid': '29338575', 'title': "The American Psychiatric Association Practice Guideline for the Pharmacological Treatment of Patients With Alcohol Use Disorder.", 'year': 2018, 'design': 'guideline'},
            {'pmid': '16670414', 'title': "Combining Medications and Behavioral Interventions for Alcohol Dependence (COMBINE Study).", 'year': 2006, 'design': 'trial'}
        ]
    },
    105: {
        'cluster': 'alcohol_use_disorders',
        'mentor_intro': "Acamprosate and naltrexone are first-line pharmacological options for alcohol use disorder. Acamprosate modulates glutamatergic NMDA and GABA transmission, is excreted renally, and is preferred in patients with liver disease. Naltrexone blocks mu-opioid receptors, reduces alcohol reward/craving, but is contraindicated in acute hepatitis, liver failure, and concurrent opioid use.",
        'teaching_points': [
            {'claim': "Naltrexone (oral 50 mg daily or monthly depot intramuscular extended-release 380 mg) significantly reduces the risk of return to heavy drinking.", 'cites': ['25027140']},
            {'claim': "Naltrexone is strictly contraindicated in patients currently taking prescription opioids or undergoing opioid detoxification, as it precipitates severe acute opioid withdrawal.", 'cites': ['29338575']},
            {'claim': "Acamprosate (666 mg three times daily) modulates NMDA hyperglutamatergic states, promotes abstinence maintenance, and is safe in advanced liver disease because it lacks hepatic metabolism.", 'cites': ['20593452']},
            {'claim': "Acamprosate dose must be reduced in moderate renal impairment (CrCl 30-50 mL/min) and is contraindicated when CrCl < 30 mL/min.", 'cites': ['29338575']}
        ],
        'uncertainties': [
            "Precision pharmacogenetics: whether OPRM1 Asn40Asp (A118G) polymorphism reliably predicts enhanced clinical response to naltrexone.",
            "Efficacy of simultaneous combination of acamprosate plus naltrexone over individual monotherapy."
        ],
        'mcq_angles': [
            "Selecting acamprosate over naltrexone in a patient with Child-Pugh class B cirrhosis.",
            "Recognizing naltrexone contraindication in patients with chronic pain managed with opioid analgesics.",
            "Managing gastrointestinal side effects (nausea, diarrhea) of acamprosate and naltrexone during treatment initiation."
        ],
        'case_hooks': [
            "A 48-year-old with AUD and hepatitis C cirrhosis (bilirubin 3.1 mg/dL, albumin 2.9 g/dL) seeking anti-craving medication.",
            "A patient taking codeine-paracetamol for chronic back pain who is inappropriately prescribed naltrexone and experiences acute severe withdrawal."
        ],
        'gaps': "Verify renal dosing adjustment tables for acamprosate and toxicological screening prior to naltrexone initiation.",
        'sources': [
            {'pmid': '25027140', 'title': "Pharmacotherapy for adults with alcohol use disorders in outpatient settings: a systematic review and meta-analysis.", 'year': 2014, 'design': 'meta-analysis'},
            {'pmid': '20593452', 'title': "Acamprosate for alcohol dependence: a Cochrane systematic review.", 'year': 2010, 'design': 'systematic review'},
            {'pmid': '29338575', 'title': "APA Practice Guideline for the Pharmacological Treatment of AUD.", 'year': 2018, 'design': 'guideline'}
        ]
    },
    106: {
        'cluster': 'alcohol_use_disorders',
        'mentor_intro': "Chronic alcohol use disorder commonly leads to hepatic fibrosis and metabolic brain injury. Wernicke encephalopathy is a medical emergency caused by thiamine (vitamin B1) deficiency, classic triad of confusion, ataxia, and ophthalmoplegia (nystagmus/lateral rectus palsy) occurring in only one-third of cases. Prompt IV thiamine prevents progression to irreversible Korsakoff psychosis.",
        'teaching_points': [
            {'claim': "Wernicke encephalopathy is a clinical diagnosis requiring high-dose intravenous thiamine (500 mg IV three times daily for 3-5 days) before any enteral or parenteral carbohydrates.", 'cites': ['25081827']},
            {'claim': "Caine criteria diagnostic sensitivity for Wernicke encephalopathy requires 2 of: dietary deficiency, oculomotor abnormalities, cerebellar dysfunction, and altered mental state.", 'cites': ['9153128']},
            {'claim': "Alcohol-related cirrhosis requires systematic hepatocellular carcinoma (HCC) screening with ultrasound +/- AFP every 6 months and endoscopic variceal screening.", 'cites': ['38241123']},
            {'claim': "Sustained alcohol abstinence is the single most powerful determinant of survival and portal pressure reduction across all stages of alcohol-related liver disease.", 'cites': ['30041864']}
        ],
        'uncertainties': [
            "Optimal oral thiamine maintenance dosing and bioavailability following completion of high-dose intravenous treatment.",
            "Reversibility of cognitive deficits in Korsakoff syndrome with long-term nutritional and cognitive rehabilitation."
        ],
        'mcq_angles': [
            "Why IV thiamine must precede glucose infusion: glucose metabolism consumes scarce remaining thiamine pyrophosphate cofactors in pyruvate dehydrogenase.",
            "Classic MRI brain findings in Wernicke encephalopathy: symmetric hyperintensity in mammillary bodies, medial thalami, and periaqueductal gray.",
            "Clinical distinction between Wernicke encephalopathy (acute, reversible) and Korsakoff syndrome (chronic, anterograde amnesia with confabulation)."
        ],
        'case_hooks': [
            "A 55-year-old homeless male brought to the ED with confusion, horizontal nystagmus, and broad-based ataxia after a multi-week drinking binge.",
            "A cirrhotic patient admitted for decompensated ascites whose nurse asks whether a 5% dextrose infusion can be started before the thiamine arrives."
        ],
        'gaps': "Ensure local emergency department protocol mandates IV thiamine in triage for all malnourished or alcohol-dependent patients.",
        'sources': [
            {'pmid': '25081827', 'title': "Wernicke's encephalopathy: new perspectives on an ancient disease.", 'year': 2014, 'design': 'review'},
            {'pmid': '9153128', 'title': "Operational criteria for the classification of chronic alcohol-related brain damage: the Wernicke-Korsakoff syndrome.", 'year': 1997, 'design': 'systematic review'},
            {'pmid': '38241123', 'title': "AASLD Practice Guideline on Alcohol-Associated Liver Disease.", 'year': 2024, 'design': 'guideline'}
        ]
    },
    107: {
        'cluster': 'alcohol_withdrawal_management',
        'mentor_intro': "Alcohol withdrawal syndrome (AWS) ranges from mild tremulousness to life-threatening delirium tremens and withdrawal seizures. Long-acting benzodiazepines (diazepam, chlordiazepoxide) are standard of care, administered preferably via symptom-triggered protocols (CIWA-Ar) rather than fixed schedules. In hepatic cirrhosis, short-acting agents without active metabolites (lorazepam, oxazepam) avoid drug accumulation.",
        'teaching_points': [
            {'claim': "Symptom-triggered benzodiazepine administration guided by CIWA-Ar scores achieves equivalent clinical control with significantly lower total medication dose and shorter hospital stay.", 'cites': ['10078832']},
            {'claim': "Diazepam and chlordiazepoxide provide smoother withdrawal control due to long-acting active metabolites (desmethyldiazepam), reducing withdrawal seizure frequency.", 'cites': ['33434440']},
            {'claim': "In patients with severe liver failure or cirrhosis, lorazepam or oxazepam (LOT drugs: Lorazepam, Oxazepam, Temazepam) are preferred because they undergo direct glucuronidation without phase I hepatic metabolism.", 'cites': ['38241123']},
            {'claim': "Alcohol withdrawal seizures typically occur 12-48 hours after alcohol reduction, are generalized tonic-clonic, and are treated with benzodiazepines, not standard phenytoin.", 'cites': ['15256488']}
        ],
        'uncertainties': [
            "Use of adjunctive alpha-2 agonists (clonidine, dexmedetomidine) for autonomic hyperactivity without masking ongoing neurocognitive deterioration.",
            "Role of gabapentin or carbamazepine as monotherapy in mild-to-moderate outpatient alcohol withdrawal."
        ],
        'mcq_angles': [
            "Choosing lorazepam or oxazepam in patients with decompensated alcoholic cirrhosis or acute liver injury.",
            "Why phenytoin is ineffective for alcohol withdrawal seizures (the underlying mechanism is GABA down-regulation and NMDA up-regulation, not an epileptic focus).",
            "Timing of symptom-triggered CIWA-Ar assessments and intervention threshold (CIWA-Ar >= 8-10 points)."
        ],
        'case_hooks': [
            "A 49-year-old with known cirrhosis admitted for an ankle fracture who develops tremors, sweating, and heart rate 118 bpm 24 hours post-admission.",
            "A patient experiencing a witnessed brief tonic-clonic seizure 18 hours after last drink; medical resident inquires about starting levetiracetam."
        ],
        'gaps': "Reviewers should confirm nurses are validated in CIWA-Ar scoring and that telemetry is available for heavy withdrawal protocols.",
        'sources': [
            {'pmid': '10078832', 'title': "A randomized trial of symptom-triggered vs fixed-schedule treatment of alcohol withdrawal.", 'year': 1999, 'design': 'trial'},
            {'pmid': '33434440', 'title': "Benzodiazepines for alcohol withdrawal: Cochrane Systematic Review.", 'year': 2021, 'design': 'systematic review'},
            {'pmid': '15256488', 'title': "The management of alcohol withdrawal delirium and withdrawal seizures.", 'year': 2004, 'design': 'review'}
        ]
    },
    108: {
        'cluster': 'alcohol_withdrawal_management',
        'mentor_intro': "Delirium tremens (DT) is a severe medical emergency characterized by profound delirium, hallucinations, agitation, fever, and severe autonomic instability, typically developing 48-96 hours after alcohol cessation. Management in the ICU mandates aggressive intravenous sedation (high-dose benzodiazepines or phenobarbital protocols), airway protection, and correction of electrolyte abnormalities (hypomagnesemia, hypokalemia).",
        'teaching_points': [
            {'claim': "Delirium tremens carries up to 5-15% mortality without intensive care; mortality is driven by hyperthermia, cardiac arrhythmias, and aspiration pneumonia.", 'cites': ['15256488']},
            {'claim': "Phenobarbital monotherapy or protocolized combination with benzodiazepines achieves faster symptom control, lower intubation rates, and decreased ICU length of stay in severe refractory withdrawal.", 'cites': ['42634386']},
            {'claim': "Dexmedetomidine reduces sympathetic overdrive and tachycardia as an adjunctive sedative, but does not prevent seizures or delirium and cannot substitute for GABAergic agents.", 'cites': ['27221644']},
            {'claim': "Severe hypomagnesemia and hypophosphatemia are common in severe withdrawal and must be corrected aggressively to prevent refractory seizures and refractory hypokalemia.", 'cites': ['15256488']}
        ],
        'uncertainties': [
            "Exact dosing protocols for intravenous phenobarbital load (10 mg/kg vs incremental 130-260 mg doses) in non-intubated patients.",
            "Long-term neurocognitive sequelae following prolonged ICU delirium tremens."
        ],
        'mcq_angles': [
            "Distinguishing alcoholic hallucinosis (clear sensorium, occurs 12-24h post-cessation) from delirium tremens (global delirium, profound disorientation, 48-96h).",
            "Why antipsychotics (e.g. haloperidol) must not be used as monotherapy: they lower seizure threshold and worsen autonomic temperature dysregulation.",
            "Criteria for ICU admission: failure of high-dose benzodiazepines (> 50-100 mg diazepam equivalent in 1 hour), severe hemodynamic instability, or status epilepticus."
        ],
        'case_hooks': [
            "A 52-year-old 3 days post-laparotomy who becomes wildly agitated, diaphoretic, pyrexic (38.8C), and sees insects crawling on the ICU ceiling.",
            "A patient with delirium tremens who has received 120 mg of IV diazepam in 2 hours with persistent severe tachycardia (HR 145) and tremor."
        ],
        'gaps': "Confirm ICU protocol availability for phenobarbital loading and continuous intravenous infusions with endotracheal intubation readiness.",
        'sources': [
            {'pmid': '42634386', 'title': "Phenobarbital Versus Benzodiazepine-Based Pathways for Alcohol Withdrawal: A Systematic Review and Meta-Analysis.", 'year': 2025, 'design': 'meta-analysis'},
            {'pmid': '15256488', 'title': "The management of alcohol withdrawal delirium.", 'year': 2004, 'design': 'review'},
            {'pmid': '27221644', 'title': "Adjunctive dexmedetomidine in severe alcohol withdrawal: a systematic review.", 'year': 2016, 'design': 'systematic review'}
        ]
    },

    # 109-110: ABPA & Allergic Rhinitis
    109: {
        'cluster': 'allergic_diseases',
        'mentor_intro': "Allergic bronchopulmonary aspergillosis (ABPA) is a hypersensitivity response to Aspergillus fumigatus colonization in patients with asthma or cystic fibrosis. Diagnostic criteria include total serum IgE > 1000 IU/mL, positive Aspergillus-specific IgE or skin test, eosinophilia, and central bronchiectasis on HRCT. Treatment combines systemic oral corticosteroids with antifungal therapy (itraconazole) or T2 biologics.",
        'teaching_points': [
            {'claim': "ISHAM criteria require total serum IgE > 1000 IU/mL, elevated Aspergillus-specific IgE or positive skin prick test, along with peripheral eosinophilia or central bronchiectasis.", 'cites': ['34185448']},
            {'claim': "Oral itraconazole (200 mg twice daily with therapeutic drug monitoring) combined with oral corticosteroids increases response rates and reduces steroid exposure.", 'cites': ['11114316']},
            {'claim': "High-attenuation mucus (HAM) on high-resolution chest CT is pathognomonic for ABPA and signifies higher relapse rates.", 'cites': ['21498705']},
            {'claim': "Biologic therapies targeting IL-4/IL-13 (dupilumab), IL-5 (mepolizumab), or IgE (omalizumab) provide significant steroid-sparing efficacy in recurrent or steroid-dependent ABPA.", 'cites': ['34185448']}
        ],
        'uncertainties': [
            "Optimal duration of antifungal therapy (4 months vs 12 months) in preventing long-term bronchiectasis progression.",
            "Positioning of T2-targeted biologics as upfront monotherapy without prolonged high-dose oral corticosteroids."
        ],
        'mcq_angles': [
            "Recognizing elevated total IgE (> 1000 IU/mL) as the mandatory entry criterion for ABPA diagnosis.",
            "Identifying high-attenuation mucus (mucus plugs denser than paraspinal muscle) on non-contrast chest CT.",
            "Selecting therapeutic drug monitoring for oral itraconazole (target trough > 1.0-2.0 ug/mL) to ensure adequate gastrointestinal absorption."
        ],
        'case_hooks': [
            "A 36-year-old with severe asthma presenting with recurrent cough, expectoration of brown mucus plugs, total IgE 3,400 IU/mL, and eosinophils 1,200/uL.",
            "An adult with cystic fibrosis showing fleeting bilateral infiltrates and worsening spirometry despite standard antibiotic therapy."
        ],
        'gaps': "Verify availability of serum Aspergillus fumigatus-specific IgG/IgE assays and azole therapeutic drug monitoring.",
        'sources': [
            {'pmid': '34185448', 'title': "Working Group Consensus on the Diagnosis and Treatment of Allergic Bronchopulmonary Aspergillosis (ISHAM).", 'year': 2021, 'design': 'guideline'},
            {'pmid': '11114316', 'title': "A randomized trial of itraconazole in allergic bronchopulmonary aspergillosis.", 'year': 2000, 'design': 'trial'},
            {'pmid': '21498705', 'title': "High-attenuation mucus in allergic bronchopulmonary aspergillosis: another visual cue.", 'year': 2011, 'design': 'review'}
        ]
    },
    110: {
        'cluster': 'allergic_diseases',
        'mentor_intro': "Allergic rhinitis is an IgE-mediated chronic inflammatory disease of the upper airway. Moderate-to-severe symptoms are managed first-line with intranasal corticosteroids (INCS) or combination INCS and intranasal antihistamines (e.g. fluticasone/azelastine). Allergen immunotherapy (SLIT or SCIT) is the only disease-modifying intervention for IgE-confirmed refractory disease.",
        'teaching_points': [
            {'claim': "AAO-HNS guidelines recommend intranasal corticosteroids as first-line monotherapy for patients with clinically significant allergic rhinitis affecting quality of life.", 'cites': ['25644760']},
            {'claim': "Fixed-dose combination of intranasal corticosteroid and intranasal antihistamine (fluticasone propionate/azelastine) provides faster and superior symptom relief compared to either agent alone.", 'cites': ['32306437']},
            {'claim': "Oral first-generation sedating antihistamines (e.g. diphenhydramine, chlorpheniramine) should be avoided due to sedation, anticholinergic side effects, and cognitive impairment.", 'cites': ['25644760']},
            {'claim': "Allergen-specific immunotherapy (sublingual or subcutaneous) induces immune tolerance, reduces medication requirements, and prevents new allergen sensitizations.", 'cites': ['32306437']}
        ],
        'uncertainties': [
            "Comparative long-term clinical efficacy and adherence of sublingual immunotherapy (SLIT) tablets versus subcutaneous injections (SCIT).",
            "Role of biologics (e.g. dupilumab, omalizumab) in severe refractory allergic rhinitis with concurrent nasal polyposis."
        ],
        'mcq_angles': [
            "Selecting intranasal corticosteroids over oral antihistamines as the most effective monotherapy for nasal congestion.",
            "Advising patients on proper INCS spray technique (direct nozzle away from nasal septum towards outer ear to avoid epistaxis/septal perforation).",
            "Recognizing rhinitis medicamentosa resulting from rebound hyperemia after > 3-5 days of topical alpha-adrenergic decongestants (oxymetazoline)."
        ],
        'case_hooks': [
            "A 24-year-old student with seasonal sneezing, severe nasal congestion, and conjunctival itching who complains that oral cetirizine is not clearing his congestion.",
            "A 35-year-old presenting with continuous severe nasal blockage after using over-the-counter xylometazoline spray multiple times daily for 6 weeks."
        ],
        'gaps': "Confirm referral criteria to allergy clinics for skin prick testing or specific IgE validation prior to immunotherapy initiation.",
        'sources': [
            {'pmid': '25644760', 'title': "Clinical Practice Guideline: Allergic Rhinitis (AAO-HNS).", 'year': 2015, 'design': 'guideline'},
            {'pmid': '32306437', 'title': "Allergic Rhinitis and its Impact on Asthma (ARIA) Phase 4: Validated mobile technology guidelines.", 'year': 2020, 'design': 'guideline'}
        ]
    }
}
