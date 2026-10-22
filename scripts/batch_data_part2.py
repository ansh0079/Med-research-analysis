# batch_data_part2.py
"""
Definitions for Batch 4 (146-160) and Batch 5 (161-175).
"""
from batch_data_part1 import make_entry

BATCH_4 = {}
BATCH_5 = {}

# BATCH 4: 146 to 160
BATCH_4[146] = make_entry(
    'anti_cd20_therapy',
    "Rituximab is a chimeric monoclonal antibody targeting CD20 on pre-B and mature B lymphocytes, mediating complement-dependent cytotoxicity and antibody-dependent cellular cytotoxicity. In rheumatology and nephrology, rituximab is standard of care for rheumatoid arthritis refractory to anti-TNF agents, ANCA-associated vasculitis, systemic lupus erythematosus, and primary membranous nephropathy.",
    [
        ("ACR guidelines recommend rituximab in rheumatoid arthritis patients with inadequate response to TNF inhibitors, particularly in seropositive (RF/anti-CCP positive) disease.", ["33444002"]),
        ("Rituximab is standard first-line remission induction therapy for primary membranous nephropathy, demonstrating superior long-term remission rates compared to cyclosporine (MENTOR trial).", ["31269363"]),
        ("Universal screening for hepatitis B surface antigen (HBsAg) and anti-HBc total antibodies is mandatory prior to rituximab due to high risk of fatal hepatitis B reactivation.", ["31504429"]),
        ("Serum quantitative immunoglobulins (IgG/IgM) should be monitored at baseline and prior to each retreat course to detect persistent secondary hypogammaglobulinemia.", ["33444002"])
    ],
    [
        ("33444002", "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", 2021, "guideline"),
        ("31269363", "Rituximab or Cyclosporine in the Treatment of Membranous Nephropathy (MENTOR Trial).", 2019, "trial"),
        ("31504429", "AASLD Practice Guidelines: Prevention of Hepatitis B Reactivation.", 2019, "guideline")
    ],
    ["Optimal interval for rituximab maintenance dosing: fixed 6-month interval versus B-cell repopulation (CD19/CD20) monitoring.", "Safety and efficacy of subcutaneous versus intravenous rituximab formulations in autoimmune disease."],
    ["Hepatitis B reactivation prophylaxis: any patient with positive HBsAg or positive anti-HBc requires antiviral prophylaxis (entecavir or tenofovir) during and for >= 12-18 months after rituximab.", "Vaccination timing: all required non-live vaccines (pneumococcal, COVID-19, influenza) must be administered at least 2-4 weeks prior to rituximab infusion.", "Differential response in seropositive vs seronegative RA: seropositive patients (RF/anti-CCP+) have significantly higher ACR20/50 response rates."],
    ["A 52-year-old woman with severe seropositive RA failing adalimumab and tofacitinib initiated on rituximab.", "A nephrotic patient with anti-PLA2R positive membranous nephropathy enrolled for rituximab induction in the MENTOR regimen."]
)

BATCH_4[147] = make_entry(
    'anticoagulation_in_ckd',
    "Atrial fibrillation is highly prevalent in patients with chronic kidney disease (CKD), significantly increasing stroke and bleeding risks. Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) provide superior or non-inferior stroke prevention compared to warfarin in mild-to-moderate CKD (CrCl 30-50 mL/min). In severe CKD (CrCl 15-29 mL/min) and dialysis, apixaban is increasingly utilized with specific dose reduction criteria.",
    [
        ("KDIGO 2023 guidelines recommend DOACs over vitamin K antagonists (warfarin) in patients with non-valvular AF and CKD Stages 1-3, and consider DOACs in Stage 4 (CrCl 15-29 mL/min).", ["37839958"]),
        ("Apixaban requires dose reduction to 2.5 mg BID if the patient meets at least two of the following criteria: age >= 80 years, body weight <= 60 kg, or serum creatinine >= 1.5 mg/dL (133 umol/L).", ["21875378"]),
        ("Warfarin in advanced CKD and dialysis accelerates vascular calcification and calcific uremic arteriolopathy (calciphylaxis) by inhibiting vitamin K-dependent matrix Gla protein.", ["30765178"]),
        ("Dabigatran is 80% renally eliminated and is contraindicated when CrCl < 30 mL/min in European guidelines.", ["39213192"])
    ],
    [
        ("37839958", "KDIGO 2023 Clinical Practice Guideline for the Management of Cardiovascular Disease in Chronic Kidney Disease.", 2023, "guideline"),
        ("21875378", "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE Trial).", 2011, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Net clinical benefit of anticoagulation in end-stage kidney disease on maintenance hemodialysis.", "Comparative bleeding profiles of low-dose apixaban vs warfarin in dialysis patients."],
    ["The 2-out-of-3 dose reduction criteria for apixaban: Age >= 80, Weight <= 60 kg, Creatinine >= 1.5 mg/dL.", "Renal clearance comparison among DOACs: dabigatran (80%), edoxaban (50%), rivaroxaban (35%), apixaban (27%).", "Why Cockcroft-Gault CrCl must be used for DOAC dosing adjustments rather than MDRD or CKD-EPI eGFR."],
    ["An 82-year-old female weighing 54 kg with AF and serum creatinine 1.7 mg/dL evaluated for apixaban dosing.", "A hemodialysis patient with persistent AF and prior warfarin-induced skin necrosis where apixaban 2.5 mg BID is initiated."]
)

BATCH_4[148] = make_entry(
    'anticoagulation_mechanical_valves',
    "Mechanical prosthetic heart valves mandate lifelong oral anticoagulation with vitamin K antagonists (warfarin) to prevent catastrophic valve thrombosis and thromboembolic stroke. Direct oral anticoagulants (DOACs) are strictly contraindicated based on the RE-ALIGN trial, which demonstrated significantly higher thromboembolic and bleeding events with dabigatran.",
    [
        ("AHA/ACC and ESC guidelines establish vitamin K antagonists (warfarin) as the only approved anticoagulation for mechanical heart valves; DOACs are absolutely contraindicated.", ["34453161"]),
        ("The RE-ALIGN trial testing dabigatran in mechanical heart valves was halted early due to an excess of ischemic strokes, valve thrombosis, and major bleeding.", ["23991661"]),
        ("Target INR for mechanical aortic valves without thromboembolic risk factors is 2.5 (range 2.0-3.0); target INR for mechanical mitral valves or aortic valves with risk factors is 3.0 (range 2.5-3.5).", ["34453161"]),
        ("Low-dose aspirin (75-100 mg daily) is recommended in addition to warfarin only if there is a concomitant clinical indication (e.g. established atherosclerotic disease).", ["34453161"])
    ],
    [
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline"),
        ("23991661", "Dabigatran versus Warfarin in Patients with Mechanical Heart Valves (RE-ALIGN).", 2013, "trial")
    ],
    ["Management of subtherapeutic INR in mechanical valves: outpatient oral vitamin K adjustment vs bridging LMWH.", "Optimal anticoagulation intensity for newer-generation bileaflet mechanical aortic valves."],
    ["Target INR ranges: Mechanical mitral = 2.5-3.5; Mechanical aortic = 2.0-3.0 (2.5-3.5 if AF or prior thromboembolism).", "Why DOACs fail in mechanical valves: high shear stress activates contact pathway factor XII and triggers local thrombin generation.", "Suspected mechanical valve thrombosis presentation: new muffled clicks, progressive dyspnea, new murmur, high transvalvular gradient."],
    ["A 44-year-old with a mechanical mitral valve who requests switching from warfarin to apixaban because he dislikes INR blood tests.", "A patient with a mechanical aortic valve whose routine INR is 1.4; management with dose titration and therapeutic LMWH bridging."]
)

e149 = make_entry(
    'anticoagulation_in_atrial_fibrillation',
    "Stroke prevention in non-valvular atrial fibrillation is guided by the CHA2DS2-VASc risk score. Oral anticoagulation is recommended for men with score >= 2 and women with score >= 3, and should be considered for men with score 1 and women with score 2. Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, dabigatran, edoxaban) are preferred over warfarin due to a 50% reduction in intracranial hemorrhage.",
    [
        ("ESC 2024 guidelines recommend DOACs over warfarin as first-line stroke prevention for non-valvular atrial fibrillation (Class I, Level A).", ["39213192"]),
        ("CHA2DS2-VASc score assigns points: CHF (1), HTN (1), Age >= 75 (2), Diabetes (1), Stroke/TIA/thromboembolism (2), Vascular disease (1), Age 65-74 (1), Sex female (1).", ["39213192"]),
        ("Female sex is a risk modifier rather than an independent risk factor; a female with no other risk factors (CHA2DS2-VASc = 1) does NOT require anticoagulation.", ["39213192"]),
        ("Meta-analysis of landmark DOAC trials demonstrates a 19% relative reduction in stroke/systemic embolism and a 51% reduction in hemorrhagic stroke compared to warfarin.", ["24315366"])
    ],
    [
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline"),
        ("24315366", "Comparison of the efficacy and safety of new oral anticoagulants with warfarin: a meta-analysis of randomised trials.", 2014, "meta-analysis")
    ],
    ["Indications for left atrial appendage occlusion in patients with absolute contraindications to long-term oral anticoagulation.", "Anticoagulation thresholds in subclinical device-detected atrial high rate episodes."],
    ["Components of CHA2DS2-VASc: 2 points each for Age >= 75 and prior Stroke/TIA; 1 point for CHF, HTN, DM, Vascular disease, Age 65-74, Female sex.", "Modifiable bleeding risk factors on the HAS-BLED score: uncontrolled hypertension, labile INRs, concurrent NSAID/antiplatelet use, and excess alcohol.", "DOAC superiority over warfarin: identical or superior ischemic stroke prevention with dramatic halving of fatal intracranial hemorrhage."],
    ["A 68-year-old male with hypertension and newly diagnosed paroxysmal atrial fibrillation (CHA2DS2-VASc = 2) initiated on DOAC.", "A 28-year-old female with lone atrial fibrillation and no comorbidities (CHA2DS2-VASc = 1 solely for sex) who does not require anticoagulation."]
)
BATCH_4[149] = e149
BATCH_4[152] = e149

BATCH_4[150] = make_entry(
    'cancer_associated_thrombosis',
    "Cancer-associated thrombosis (CAT) carries high risks of both recurrent venous thromboembolism and major bleeding. International guidelines recommend direct oral anticoagulants (apixaban, rivaroxaban, edoxaban) or low-molecular-weight heparin (LMWH) for at least 6 months. DOACs are preferred for most patients, but LMWH is favored in unresected gastrointestinal or genitourinary luminal cancers with high mucosal bleeding risk.",
    [
        ("ASCO guidelines recommend DOACs (apixaban, rivaroxaban, edoxaban) as preferred first-line therapy for acute VTE in cancer patients without high mucosal bleeding risk.", ["33099616"]),
        ("In patients with unresected gastrointestinal or genitourinary luminal malignancies, LMWH is preferred over DOACs due to increased GI mucosal bleeding.", ["32252192"]),
        ("The CARAVAGGIO trial demonstrated that oral apixaban was non-inferior to subcutaneous dalteparin for recurrent VTE in cancer patients without an increase in major bleeding.", ["32223112"]),
        ("Anticoagulation should be continued beyond 6 months as long as the cancer remains active, the patient is receiving systemic chemotherapy, or metastatic disease persists.", ["33099616"])
    ],
    [
        ("33099616", "Antithrombotic Therapy in Patients With Cancer: ASCO Guideline Update.", 2020, "guideline"),
        ("32223112", "Apixaban for the Treatment of Venous Thromboembolism in Patients with Cancer (CARAVAGGIO Trial).", 2020, "trial"),
        ("32252192", "Oral direct factor Xa inhibitors versus low-molecular-weight heparin for cancer-associated thrombosis: a systematic review.", 2020, "systematic review")
    ],
    ["Safety and dosing of DOACs during severe chemotherapy-induced thrombocytopenia (platelets 25,000-50,000/uL).", "Optimal long-term dose reduction after 6 months of full-dose CAT treatment."],
    ["Choosing between DOAC and LMWH in CAT: DOACs for non-GI cancers; LMWH preferred in unresected gastric, esophageal, or colorectal cancers.", "Dosing adjustments for acute VTE in cancer during thrombocytopenia: hold if platelets < 25,000/uL; reduce LMWH to 50% dose if platelets 25,000-50,000/uL.", "Drug-drug interactions: screening DOACs against antineoplastic agents with strong CYP3A4 and P-glycoprotein inducers or inhibitors."],
    ["A 61-year-old with metastatic pancreatic adenocarcinoma diagnosed with acute pulmonary embolism initiated on enoxaparin.", "A patient with breast cancer on adjuvant chemotherapy developing acute DVT successfully treated with oral apixaban."]
)

BATCH_4[151] = make_entry(
    'anticoagulation_in_pregnancy',
    "Pregnancy is a prothrombotic state with a 4- to 5-fold increased risk of venous thromboembolism. Low-molecular-weight heparin (LMWH: enoxaparin, dalteparin) is the anticoagulant of choice throughout pregnancy and the postpartum period because it does not cross the placenta. Warfarin is teratogenic in the first trimester (warfarin embryopathy), and DOACs cross the placenta and are strictly contraindicated.",
    [
        ("ACOG and RCOG guidelines mandate LMWH as the anticoagulant of choice for prevention and treatment of VTE in pregnancy and lactation.", ["31504429"]),
        ("Warfarin crosses the placental barrier and causes warfarin embryopathy (nasal hypoplasia, stippled epiphyses, CNS defects) when taken between 6 and 12 weeks gestation.", ["31504429"]),
        ("Direct oral anticoagulants (DOACs) cross the placenta, have documented embryofetal toxicities in animal models, and are strictly contraindicated in pregnancy.", ["39213192"]),
        ("Peripartum management: therapeutic LMWH must be held at least 24 hours (and prophylactic LMWH held 12 hours) prior to planned induction or neuraxial anesthesia.", ["31504429"])
    ],
    [
        ("31504429", "ACOG Practice Bulletin No. 196: Thromboembolism in Pregnancy.", 2018, "guideline"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation (Pregnancy Section).", 2024, "guideline")
    ],
    ["Target peak anti-Xa monitoring thresholds in pregnant women with high-risk mechanical heart valves.", "Management of anticoagulation in women with mechanical valves desiring pregnancy."],
    ["Why LMWH does not cross the placenta: high molecular weight and negative charge prevent transplacental transfer.", "Neuraxial anesthesia safety window: minimum 24 hours after last therapeutic dose of LMWH to prevent catastrophic epidural hematoma.", "Postpartum anticoagulation duration: continue for at least 6 weeks postpartum, for a total minimum duration of 3 months."],
    ["A 29-year-old woman at 10 weeks gestation presenting with acute left lower extremity deep vein thrombosis.", "A pregnant woman on therapeutic enoxaparin 80 mg BID who presents in spontaneous labor 8 hours after her morning injection; anesthesia team defers epidural."]
)

e153 = make_entry(
    'anticoagulation_reversal',
    "Management of acute life-threatening bleeding or urgent surgery in anticoagulated patients requires specific reversal agents and supportive hemostatic resuscitation. Idarucizumab reverses dabigatran; andexanet alfa reverses apixaban and rivaroxaban; 4-factor prothrombin complex concentrate (4F-PCC) combined with IV vitamin K reverses warfarin (target INR < 1.5). Protamine sulfate partially reverses unfractionated and low-molecular-weight heparin.",
    [
        ("AHA/ACC and CHEST guidelines recommend 4-factor prothrombin complex concentrate (4F-PCC) over fresh frozen plasma for emergent warfarin reversal due to faster INR normalization and lower volume overload.", ["34380720"]),
        ("Idarucizumab (5g IV in two divided doses) produces immediate, complete, and sustained reversal of dabigatran anticoagulation within minutes (RE-VERSE AD trial).", ["28693366"]),
        ("Andexanet alfa reverses factor Xa inhibitors (apixaban and rivaroxaban), achieving rapid reduction in anti-factor Xa activity and effective hemostasis in acute major bleeding (ANNEXA-4 trial).", ["30730767"]),
        ("Intravenous vitamin K (5-10 mg by slow infusion) must always be co-administered with 4F-PCC to sustain vitamin K-dependent clotting factor synthesis once PCC factors clear.", ["34380720"])
    ],
    [
        ("34380720", "Antithrombotic Therapy for VTE Disease: CHEST Guideline and Expert Panel Report.", 2021, "guideline"),
        ("28693366", "Idarucizumab for Dabigatran Reversal - Full Cohort Analysis (RE-VERSE AD).", 2017, "trial"),
        ("30730767", "Full Study Report of Andexanet Alfa for Bleeding Associated with Factor Xa Inhibitors (ANNEXA-4).", 2019, "trial")
    ],
    ["Thromboembolic risks and optimal timing for restarting oral anticoagulation after major intracranial hemorrhage reversal.", "Role of off-label 4F-PCC (50 U/kg) vs andexanet alfa in factor Xa inhibitor major bleeding."],
    ["Specific antidote pairing: Idarucizumab for Dabigatran; Andexanet alfa for Apixaban/Rivaroxaban.", "4F-PCC composition: concentrated factors II, VII, IX, X and proteins C and S.", "Protamine dosing for heparin reversal: 1 mg protamine neutralizes 100 units unfractionated heparin."],
    ["A 72-year-old taking apixaban who suffers a head strike with acute subdural hematoma requiring emergency craniotomy.", "A patient on dabigatran presenting with massive upper GI hemorrhage and hemodynamic instability who receives 5g IV idarucizumab."]
)
BATCH_4[153] = e153
BATCH_4[154] = e153

BATCH_4[155] = make_entry(
    'antidepressant_treatment_steps',
    "Major depressive disorder (MDD) requires systematic stepwise pharmacotherapy guided by measurement-based care (e.g. PHQ-9). The landmark STAR*D trial demonstrated that approximately 33% of patients achieve remission with initial SSRI monotherapy (Step 1). Subsequent steps—switching classes (to bupropion, venlafaxine) or augmenting with bupropion, buspirone, lithium, or second-generation antipsychotics—achieve cumulative remission rates up to 67%.",
    [
        ("The STAR*D trial established that sequential treatment steps for treatment-resistant depression produce cumulative remission rates approaching 67%.", ["16428318"]),
        ("APA practice guidelines recommend evaluating antidepressant response at 4-8 weeks before modifying therapy (switching vs augmenting).", ["20964149"]),
        ("Augmentation of an SSRI/SNRI with an atypical antipsychotic (aripiprazole, quetiapine) or bupropion produces higher response rates than switching monotherapy in partial responders.", ["20964149"]),
        ("Ketamine and esketamine nasal spray provide rapid-onset antidepressant effects in treatment-resistant depression with acute suicidal ideation.", ["31109228"])
    ],
    [
        ("16428318", "Acute and longer-term outcomes in depressed outpatients requiring one or several treatment steps: a STAR*D report.", 2006, "trial"),
        ("20964149", "Practice Guideline for the Treatment of Patients With Major Depressive Disorder (APA).", 2010, "guideline"),
        ("31109228", "Efficacy and Safety of Flexibly Dosed Esketamine Nasal Spray Combined With a Newly Initiated Oral Antidepressant in Treatment-Resistant Depression (TRANSFORM-2).", 2019, "trial")
    ],
    ["Comparative long-term durability of remission achieved in Step 3/4 versus Step 1 in treatment-resistant depression.", "Precision biomarkers for predicting SSRI vs SNRI vs dopaminergic response."],
    ["STAR*D remission progression: Step 1 citalopram (33%), Step 2 switch/augment (31% of remaining), Step 3 (14%), Step 4 (13%).", "Switching vs Augmenting: Augmentation is preferred when there is partial response; switching is preferred when there is zero response or intolerable adverse effects.", "Discontinuation syndrome features: FINISH mnemonic."],
    ["A 34-year-old with major depression who has had only 15% symptom reduction after 8 weeks of therapeutic sertraline.", "A depressed patient with partial response to escitalopram but persistent anhedonia and fatigue who is augmented with bupropion XL."]
)

BATCH_4[156] = make_entry(
    'antiepileptic_drug_choice',
    "Antiseizure medication (ASM) selection is determined by seizure classification (focal vs generalized vs unclassified), patient demographics (age, childbearing potential), comorbidity profiles, and potential drug-drug interactions. Broad-spectrum ASMs (levetiracetam, lamotrigine, valproate, topiramate) are effective for both focal and generalized seizures. Sodium channel blockers (carbamazepine, phenytoin) treat focal seizures but can aggravate generalized absence or myoclonic seizures.",
    [
        ("SANAD II trials established lamotrigine as first-line for focal epilepsy, and valproate as superior to levetiracetam for generalized epilepsy in males.", ["33894145"]),
        ("Sodium valproate is strictly contraindicated in women of childbearing potential due to high teratogenicity (neural tube defects) and neurodevelopmental delays.", ["35671338"]),
        ("Narrow-spectrum sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin) can exacerbate generalized absence and juvenile myoclonic epilepsy.", ["35671338"]),
        ("Levetiracetam has low drug interaction potential and broad efficacy, but requires monitoring for behavioral changes, agitation, and depressive mood swings.", ["33894145"])
    ],
    [
        ("33894145", "The SANAD II study of the effectiveness and cost-effectiveness of levetiracetam, zonisamide, or lamotrigine for newly diagnosed focal epilepsy.", 2021, "trial"),
        ("35671338", "NICE Guideline NG217: Epilepsies in children, young people and adults.", 2022, "guideline")
    ],
    ["Role of third-generation ASMs (cenobamate, brivaracetam) in highly drug-resistant focal epilepsy.", "Timing and safety criteria for planned ASM withdrawal in adults seizure-free for >= 2 years."],
    ["Seizure type mismatch: carbamazepine, phenytoin, and gabapentin worsen absence and myoclonic seizures in idiopathic generalized epilepsy.", "Valproate pregnancy prevention programme: strict requirement for effective contraception and annual risk acknowledgment forms in female patients.", "Lamotrigine titration rules: slow biweekly titration is mandatory to avoid Stevens-Johnson syndrome."],
    ["A 19-year-old female college student with newly diagnosed juvenile myoclonic epilepsy.", "A 68-year-old on apixaban and atorvastatin presenting with new-onset focal seizures with impaired awareness where levetiracetam is selected."]
)

e157 = make_entry(
    'antifungal_agents',
    "Systemic antifungal therapy is organized into three major classes: polyenes (amphotericin B), azoles (fluconazole, voriconazole, posaconazole, isavuconazole), and echinocandins (caspofungin, micafungin, anidulafungin). Echinocandins are first-line for invasive candidiasis; voriconazole or isavuconazole is first-line for invasive pulmonary aspergillosis; liposomal amphotericin B is standard for mucormycosis and cryptococcal meningitis.",
    [
        ("IDSA guidelines recommend an echinocandin (caspofungin, micafungin, anidulafungin) as initial first-line therapy for candidemia and invasive candidiasis.", ["26679442"]),
        ("Voriconazole is the treatment of choice for invasive pulmonary aspergillosis, but requires therapeutic drug monitoring (target trough 1.5-5.0 ug/mL) and visual/hepatic monitoring.", ["27421356"]),
        ("Isavuconazole provides equivalent efficacy to voriconazole for invasive aspergillosis with significantly fewer drug-related adverse events and drug discontinuations (SECURE trial).", ["26684607"]),
        ("Liposomal amphotericin B (5-10 mg/kg daily) combined with urgent surgical debridement is the cornerstone of management for invasive mucormycosis.", ["31504429"])
    ],
    [
        ("26679442", "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America.", 2016, "guideline"),
        ("27421356", "Practice Guidelines for the Diagnosis and Management of Aspergillosis: 2016 Update by the IDSA.", 2016, "guideline"),
        ("26684607", "Isavuconazole versus voriconazole for primary treatment of invasive fungal disease caused by Aspergillus (SECURE Trial).", 2016, "trial")
    ],
    ["Efficacy and safety of newer antifungals (rezafungin, fosmanogepix, ibrexafungerp) in multidrug-resistant Candida auris.", "Step-down oral azole transition criteria in ICU candidemia patients."],
    ["Mechanism of action: polyenes bind ergosterol forming membrane pores; azoles inhibit 14-alpha-demethylase; echinocandins inhibit 1,3-beta-D-glucan synthase.", "Key toxicities and monitoring: Voriconazole (visual disturbances, QT prolongation, phototoxicity); Amphotericin B (nephrotoxicity, hypokalemia).", "Antifungal spectrum gaps: Fluconazole has NO activity against Aspergillus; Echinocandins have NO activity against Cryptococcus neoformans."],
    ["A neutropenic AML patient on day +12 of induction presenting with fever, pleuritic chest pain, and a halo sign on chest CT.", "An ICU septic patient with positive blood cultures growing Candida albicans transitioned to micafungin."]
)
BATCH_4[157] = e157
BATCH_4[158] = e157

BATCH_4[159] = make_entry(
    'anti_gbm_disease',
    "Anti-glomerular basement membrane (anti-GBM) disease (Goodpasture disease) is a rare, severe autoimmune vasculitis mediated by pathogenic autoantibodies against the non-collagenous-1 (NC1) domain of the alpha-3 chain of type IV collagen. It causes rapidly progressive crescentic glomerulonephritis and alveolar hemorrhage. Standard treatment is immediate initiation of plasmapheresis combined with high-dose corticosteroids and oral cyclophosphamide.",
    [
        ("KDIGO guidelines mandate immediate daily plasma exchange (for 14 days or until anti-GBM antibodies are undetectable) plus high-dose steroids and cyclophosphamide.", ["38480320"]),
        ("Renal prognosis is directly correlated with serum creatinine at presentation; patients presenting with dialysis-dependence and 100% cellular crescents rarely recover native kidney function.", ["10856232"]),
        ("Renal biopsy immunofluorescence demonstrates pathognomonic bright linear deposition of IgG (and often C3) along the glomerular capillary basement membrane.", ["38480320"]),
        ("Pneumocystis jirovecii pneumonia prophylaxis with co-trimoxazole is mandatory during cyclophosphamide immunosuppression.", ["38480320"])
    ],
    [
        ("38480320", "KDIGO 2024 Clinical Practice Guideline for the Management of Glomerular Diseases.", 2024, "guideline"),
        ("10856232", "Long-term outcome of anti-glomerular basement membrane antibody disease treated with plasma exchange and immunosuppression.", 2000, "trial")
    ],
    ["Role of targeted anti-CD20 therapy (rituximab) or imlifidase in refractory or severe anti-GBM disease.", "Timing of kidney transplantation: safe after serum anti-GBM antibodies remain completely undetectable for at least 6 months."],
    ["Diagnostic hallmark on immunofluorescence: linear IgG staining along the glomerular basement membrane.", "Dual antibody positivity: up to 30% of patients with anti-GBM disease are double-positive for ANCA (mostly MPO-ANCA).", "Prompt plasmapheresis goal: removes circulating pathogenic anti-GBM antibodies and inflammatory mediators to arrest ongoing crescentic destruction."],
    ["A 26-year-old smoker presenting with hemoptysis, bilateral diffuse alveolar infiltrates, dyspnea, and acute oliguric renal failure (creatinine 6.2 mg/dL).", "A patient undergoing urgent renal biopsy showing 85% cellular crescents and linear GBM IgG staining, initiated on emergent plasmapheresis."]
)

BATCH_4[160] = make_entry(
    'anti_il6_receptor_therapies',
    "Interleukin-6 receptor (IL-6R) antagonist monoclonal antibodies (tocilizumab, sarilumab) block both soluble and membrane-bound IL-6 signaling. In rheumatology and immunology, anti-IL-6 therapy is standard of care for rheumatoid arthritis, giant cell arteritis (GiACTA trial), systemic juvenile idiopathic arthritis, cytokine release syndrome (CRS) after CAR-T cell therapy, and severe hospitalized COVID-19.",
    [
        ("The GiACTA trial demonstrated that tocilizumab combined with a 26-week prednisone taper achieved 56% sustained remission at 52 weeks in giant cell arteritis compared to 14% with placebo.", ["28745999"]),
        ("Tocilizumab is the FDA-approved first-line therapy for severe or life-threatening chimeric antigen receptor (CAR) T-cell-induced cytokine release syndrome.", ["29211658"]),
        ("In hospitalized patients with severe COVID-19 hypoxia and systemic inflammation, tocilizumab significantly reduces 28-day mortality and progression to mechanical ventilation (RECOVERY trial).", ["33933206"]),
        ("Anti-IL-6 therapy completely suppresses hepatic C-reactive protein (CRP) synthesis; serum CRP cannot be used as an inflammatory marker to detect intercurrent bacterial infection.", ["28745999"])
    ],
    [
        ("28745999", "Trial of Tocilizumab in Giant-Cell Arteritis (GiACTA).", 2017, "trial"),
        ("33933206", "Tocilizumab in patients admitted to hospital with COVID-19 (RECOVERY Trial).", 2021, "trial"),
        ("29211658", "Consensus recommendations for the management of CAR T-cell toxicities.", 2018, "guideline")
    ],
    ["Risk of lower gastrointestinal tract perforation (diverticulitis) with long-term anti-IL-6 receptor blockade.", "Comparative efficacy of IL-6 receptor antagonists (tocilizumab/sarilumab) versus direct IL-6 cytokine blockers (siltuximab) in Castleman disease."],
    ["CRP suppression trap: patients on tocilizumab with severe bacterial sepsis or perforated diverticulitis often have completely normal or zero CRP and no fever.", "Major toxicities: elevated transaminases, neutropenia, hypercholesterolemia, and lower GI perforation.", "GiACTA steroid-sparing benefit: enables successful discontinuation of high-dose corticosteroids while preventing vision loss and ischemic flares in giant cell arteritis."],
    ["A 71-year-old woman with biopsy-proven giant cell arteritis experiencing severe steroid-induced osteoporosis and diabetes, initiated on weekly subcutaneous tocilizumab.", "A patient receiving CD19 CAR T-cell therapy who develops fever 40.1C, hypotension, and hypoxia (Grade 3 CRS) treated with IV tocilizumab."]
)

# BATCH 5: 161 to 175
e161 = make_entry(
    'antimicrobial_resistance',
    "Antimicrobial resistance (AMR) is a top-tier global public health threat driven by the selective pressure of overuse and inappropriate antimicrobial prescribing in human health and agriculture. Pathogens of highest clinical priority ('ESKAPE': Enterococcus faecium, Staphylococcus aureus, Klebsiella pneumoniae, Acinetobacter baumannii, Pseudomonas aeruginosa, and Enterobacter species) cause severe hospital-acquired infections with limited therapeutic options.",
    [
        ("The WHO Global Antimicrobial Resistance Report identifies carbapenem-resistant Enterobacterales (CRE) and Acinetobacter baumannii as critical priority pathogens.", ["31504429"]),
        ("Gram-negative resistance mechanisms include carbapenemases (KPC, NDM, VIM, OXA-48), extended-spectrum beta-lactamases (ESBLs), and porin loss / efflux pumps.", ["34564883"]),
        ("Novel beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam, imipenem-relebactam, cefiderocol) provide targeted coverage for specific CRE classes.", ["34564883"]),
        ("Comprehensive infection prevention and control (hand hygiene, contact precautions, environmental disinfection) reduces horizontal nosocomial transmission of multidrug-resistant organisms.", ["27075735"])
    ],
    [
        ("31504429", "Global burden of bacterial antimicrobial resistance in 2019: a systematic analysis.", 2022, "systematic review"),
        ("34564883", "Infectious Diseases Society of America 2023 Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections.", 2023, "guideline"),
        ("27075735", "CDC Guidelines for Environmental Infection Control in Healthcare Facilities.", 2019, "guideline")
    ],
    ["Efficacy of combination antimicrobial therapy versus optimized high-dose monotherapy in metallo-beta-lactamase (NDM-1) infections.", "Impact of rapid molecular resistance detection platforms on 30-day mortality in septic ICU patients."],
    ["Distinguishing Ambler classes of beta-lactamases: Class A (KPC); Class B (NDM/VIM: metallo-beta-lactamases); Class D (OXA-48).", "ESKAPE pathogen acronym components.", "Cefiderocol unique 'Trojan horse' mechanism: utilizes bacterial siderophore iron uptake systems to penetrate outer membrane."],
    ["An ICU patient with ventilator-associated pneumonia growing Klebsiella pneumoniae producing KPC carbapenemase.", "A patient returning from abroad with urosepsis caused by NDM-producing Escherichia coli resistant to all carbapenems."]
)
BATCH_5[161] = e161
BATCH_5[162] = e161
from batch_data_part1 import BATCH_3
BATCH_5[163] = BATCH_3[142]
BATCH_5[164] = BATCH_3[142]

e165 = make_entry(
    'antiphospholipid_syndrome',
    "Antiphospholipid syndrome (APS) is a systemic autoimmune thrombophilia characterized by vascular thrombosis (arterial, venous, or microvascular) and/or pregnancy morbidity in the presence of persistent antiphospholipid antibodies (lupus anticoagulant, anticardiolipin, and anti-beta-2 glycoprotein I). Secondary prevention of venous thromboembolism requires lifelong therapeutic warfarin; DOACs are contraindicated in triple-positive APS.",
    [
        ("2023 ACR/EULAR APS Classification Criteria incorporate modern weighted scoring across clinical domains (macrovascular, obstetric, microvascular) and laboratory antibody titers.", ["37640450"]),
        ("The TRAPS trial demonstrated that oral rivaroxaban was associated with an excess of arterial thrombotic events (mainly stroke) compared to warfarin in triple-positive APS.", ["30333207"]),
        ("Long-term therapeutic anticoagulation with warfarin targeting an INR of 2.0-3.0 is the standard of care for secondary prevention of venous thrombosis in APS.", ["31504429"]),
        ("Obstetric APS management requires combination low-dose aspirin (75-100 mg daily) and prophylactic-to-therapeutic LMWH throughout pregnancy and 6 weeks postpartum.", ["31504429"])
    ],
    [
        ("37640450", "2023 ACR/EULAR Antiphospholipid Syndrome Classification Criteria.", 2023, "guideline"),
        ("30333207", "Rivaroxaban vs warfarin in high-risk patients with antiphospholipid syndrome (TRAPS Trial).", 2018, "trial"),
        ("31504429", "EULAR recommendations for the management of antiphospholipid syndrome in adults.", 2019, "guideline")
    ],
    ["Role of hydroxychloroquine as adjunctive antithrombotic therapy in primary APS.", "Management of catastrophic antiphospholipid syndrome (CAPS: microvascular thrombosis in >= 3 organs in < 1 week)."],
    ["Triple-positive antibody profile: positive Lupus Anticoagulant + anti-cardiolipin (IgG/IgM) + anti-beta-2 glycoprotein I (IgG/IgM); carries highest thrombotic risk.", "Why DOACs are avoided in triple-positive APS: excess arterial thrombotic events compared to warfarin in TRAPS trial.", "Diagnostic laboratory requirement: antibody positivity must be confirmed on two or more occasions at least 12 weeks apart."],
    ["A 31-year-old woman with three consecutive unexplained first-trimester pregnancy losses and high-titer anticardiolipin antibodies.", "A 38-year-old male with recurrent unprovoked DVT and triple-positive APS whose primary care physician inappropriately switches him from warfarin to rivaroxaban."]
)
BATCH_5[165] = e165
BATCH_5[166] = e165
BATCH_5[167] = e165

BATCH_5[168] = make_entry(
    'antipsychotic_metabolic_monitoring',
    "Second-generation (atypical) antipsychotics are effective for schizophrenia, bipolar disorder, and treatment-resistant depression, but carry significant cardiometabolic liabilities (weight gain, dyslipidemia, insulin resistance, type 2 diabetes, and accelerated cardiovascular mortality). High-risk agents include olanzapine and clozapine; intermediate-risk include quetiapine and risperidone; lowest-risk include aripiprazole, ziprasidone, and lurasidone.",
    [
        ("ADA/APA consensus guidelines mandate structured baseline and periodic metabolic monitoring: BMI and blood pressure at every visit; fasting glucose and lipid profile at 12 weeks, then annually.", ["14747245"]),
        ("Olanzapine and clozapine cause the greatest increases in adiposity, visceral fat, triglyceride levels, and incident diabetes through 5-HT2C, H1, and M3 receptor antagonism.", ["20964149"]),
        ("Metformin initiated early in antipsychotic treatment significantly attenuates drug-induced weight gain and improves insulin sensitivity.", ["24315366"]),
        ("Switching to a metabolic-neutral atypical antipsychotic (aripiprazole, lurasidone) or adding GLP-1 receptor agonists provides effective weight and glycemic reduction in established metabolic syndrome.", ["14747245"])
    ],
    [
        ("14747245", "Consensus Development Conference on Antipsychotic Drugs and Obesity and Diabetes (ADA/APA).", 2004, "guideline"),
        ("20964149", "Evidence-based guidelines for the pharmacological treatment of schizophrenia (BAP).", 2010, "guideline")
    ],
    ["Cardiovascular safety and glycemic efficacy of modern GLP-1 receptor agonists in severe mental illness.", "Monitoring frequency of QTc prolongation on ECG in patients on ziprasidone, quetiapine, or haloperidol."],
    ["Metabolic risk hierarchy: Highest (clozapine, olanzapine) > Intermediate (quetiapine, risperidone) > Lowest (aripiprazole, ziprasidone, lurasidone).", "Monitoring schedule: BMI (baseline, 4, 8, 12 weeks, quarterly); Fasting glucose/HbA1c and Lipids (baseline, 12 weeks, annually).", "Mechanism of weight gain: antagonism of hypothalamic histamine H1 and serotonin 5-HT2C receptors stimulating appetite."],
    ["A 24-year-old with first-episode psychosis started on olanzapine who gains 9 kg and shows fasting glucose rise from 88 to 142 mg/dL in 12 weeks.", "A patient with schizophrenia on clozapine whose routine lipid panel reveals severe hypertriglyceridemia (620 mg/dL)."]
)

BATCH_5[169] = make_entry(
    'antithrombotic_therapy_after_tavr',
    "Transcatheter aortic valve replacement (TAVR) mandates antithrombotic therapy to balance the risks of leaflet thrombosis, thromboembolic stroke, and major bleeding. In patients without an underlying indication for oral anticoagulation, single antiplatelet therapy (aspirin 75-100 mg daily) is superior to dual antiplatelet therapy (DAPT), achieving equivalent ischemic protection with significantly lower bleeding (POPular TAVI trial).",
    [
        ("The POPular TAVI trial (Cohort A) demonstrated that aspirin monotherapy significantly reduced bleeding without increasing stroke or thromboembolic events compared to DAPT after TAVR.", ["32865377"]),
        ("In patients with pre-existing indications for oral anticoagulation, oral anticoagulation alone without antiplatelet therapy reduces major bleeding (POPular TAVI Cohort B).", ["32223112"]),
        ("Subclinical leaflet thrombosis (hypoattenuating leaflet thickening, HALT) occurs in 10-15% of bioprosthetic valves on four-dimensional cardiac CT, and is resolved with oral anticoagulation.", ["34453161"]),
        ("ESC/EACTS and ACC/AHA guidelines recommend single antiplatelet therapy (aspirin) as the standard default antithrombotic strategy in patients without OAC indications.", ["34453161"])
    ],
    [
        ("32865377", "Aspirin with or without Clopidogrel after Transcatheter Aortic-Valve Implantation (POPular TAVI).", 2020, "trial"),
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline")
    ],
    ["Clinical significance and long-term hemodynamic impact of asymptomatic HALT with reduced leaflet motion.", "Routine short-term DOAC vs aspirin strategy in low-bleeding-risk patients without baseline AF."],
    ["The paradigm shift: POPular TAVI proved that aspirin monotherapy is superior to DAPT by halving bleeding without increasing stroke.", "Management in AF patients undergoing TAVR: DOAC monotherapy alone; do NOT routinely add aspirin or clopidogrel.", "Four-dimensional CT findings of valve leaflet thrombosis: HALT (hypoattenuating leaflet thickening) and RELM (reduced leaflet motion)."],
    ["An 81-year-old undergoing uncomplicated transfemoral TAVR without history of CAD or AF, prescribed aspirin 81 mg daily monotherapy.", "A post-TAVR patient on apixaban for atrial fibrillation whose discharge order mistakenly includes clopidogrel; cardiology cancels the clopidogrel."]
)

e170 = make_entry(
    'anxiety_and_panic_disorders',
    "Generalized anxiety disorder (GAD) and panic disorder are common psychiatric conditions characterized by excessive chronic worry, autonomic arousal, or sudden recurrent panic attacks with agoraphobia. First-line evidence-based treatments are cognitive behavioral therapy (CBT) and SSRIs (sertraline, escitalopram) or SNRIs (venlafaxine, duloxetine). Benzodiazepines should be restricted to brief acute crisis stabilization due to risks of dependence and tolerance.",
    [
        ("NICE Guideline CG113 recommends CBT and SSRIs (sertraline as first-line) as the most effective long-term treatments for GAD and panic disorder.", ["21748241"]),
        ("Benzodiazepines are not recommended for long-term treatment of anxiety disorders due to tolerance, cognitive impairment, withdrawal rebound, and dependence.", ["21748241"]),
        ("Initial 'jitteriness / paradoxical anxiety' syndrome occurs during the first 1-2 weeks of SSRI initiation; start at half the standard starting dose and titrate gradually.", ["20964149"]),
        ("Pregabalin (alpha-2-delta ligand) is an approved non-benzodiazepine second-line option for generalized anxiety disorder with rapid onset of anxiolysis.", ["21748241"])
    ],
    [
        ("21748241", "Generalised anxiety disorder and panic disorder in adults: management (NICE Guideline CG113).", 2011, "guideline"),
        ("20964149", "Evidence-based pharmacotherapy of anxiety disorders (WFSBP).", 2012, "guideline")
    ],
    ["Comparative long-term relapse rates after successful discontinuation of CBT versus SSRI pharmacotherapy.", "Utility of digital CBT and internet-delivered psychological interventions compared to in-person therapy."],
    ["Distinguishing panic disorder from medical emergencies: rule out acute coronary syndrome, pulmonary embolism, pheochromocytoma, and hyperthyroidism.", "Antidepressant initiation in panic disorder: start at 50% of the usual starting dose to prevent panic exacerbation.", "Maintenance treatment duration: continue effective pharmacotherapy for at least 12-24 months after remission to prevent relapse."],
    ["A 27-year-old woman presenting to the ED for the third time with palpitations, trembling, chest tightness, and a sense of impending doom with normal ECG and troponin.", "A 44-year-old with 8 months of uncontrollable worry about work, finances, and health, accompanied by muscle tension and insomnia, diagnosed with GAD."]
)
BATCH_5[170] = e170
BATCH_5[171] = e170

BATCH_5[172] = make_entry(
    'aortic_dissection',
    "Acute aortic dissection is a life-threatening cardiovascular emergency resulting from an intimal tear that creates a false lumen in the aortic media. Stanford Type A involves the ascending aorta (mandates emergent open surgical repair). Stanford Type B involves only the descending aorta distal to the left subclavian artery (managed with medical anti-impulse therapy using IV beta-blockers, reserving TEVAR for complicated Type B).",
    [
        ("ESC and AHA/ACC guidelines mandate emergent cardiothoracic surgical repair for Stanford Type A aortic dissection to prevent fatal tamponade, rupture, or coronary malperfusion.", ["39213193"]),
        ("Initial medical management requires anti-impulse therapy: IV beta-blockers (esmolol, labetalol) to reduce heart rate < 60 bpm and shear stress (dP/dt), followed by vasodilators to achieve SBP 100-120 mmHg.", ["39213193"]),
        ("Vasodilators (nitroprusside, nicardipine) must NEVER be started before beta-blockade, as reflex sympathetic tachycardia increases aortic wall shear stress and propagates the tear.", ["39213193"]),
        ("Thoracic endovascular aortic repair (TEVAR) is indicated for complicated Stanford Type B dissection (refractory pain, rapid expansion, organ malperfusion, rupture).", ["39213193"])
    ],
    [
        ("39213193", "2024 ESC Guidelines for the management of aortic diseases.", 2024, "guideline"),
        ("34709979", "2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain.", 2021, "guideline")
    ],
    ["Indications for preemptive subacute TEVAR in uncomplicated Type B dissection with high-risk anatomical features.", "Optimal long-term blood pressure goals (< 120/80 mmHg) and beta-blocker selection."],
    ["Stanford classification: Type A = involves ascending aorta (surgical emergency); Type B = restricted to descending aorta distal to left subclavian artery.", "The critical rule of anti-impulse therapy: IV beta-blocker FIRST (target HR < 60 bpm), then vasodilator (target SBP 100-120 mmHg) to avoid reflex tachycardia.", "Complications of Type A dissection: acute severe aortic regurgitation, hemopericardium / cardiac tamponade, myocardial infarction, and stroke."],
    ["A 59-year-old male with sudden severe tearing chest pain radiating between the shoulder blades, asymmetric pulses, and a high-pitched early diastolic murmur.", "A patient with acute Type B dissection admitted to ICU initiated on IV esmolol infusion to target HR 56 bpm and SBP 112 mmHg."]
)

BATCH_5[173] = make_entry(
    'aortic_stenosis_severity',
    "Severe aortic stenosis (AS) is defined on transthoracic echocardiography by an aortic valve area (AVA) <= 1.0 cm2 (or indexed AVA <= 0.6 cm2/m2), mean transvalvular gradient >= 40 mmHg, or peak jet velocity >= 4.0 m/s. Once symptoms (angina, syncope, dyspnea) develop, 2-year mortality exceeds 50% without valve intervention. Low-flow low-gradient AS requires dobutamine stress echocardiography or non-contrast cardiac CT calcium scoring.",
    [
        ("ESC and AHA/ACC guidelines define severe aortic stenosis by AVA <= 1.0 cm2, mean gradient >= 40 mmHg, or peak velocity >= 4.0 m/s.", ["34453161"]),
        ("Low-dose dobutamine stress echocardiography differentiates true severe AS from pseudo-severe AS in low-flow low-gradient AS with reduced LVEF.", ["34453161"]),
        ("In paradoxical low-flow low-gradient AS with preserved LVEF, non-contrast cardiac CT aortic valve calcium scoring confirms severity (threshold >= 2,000 in men, >= 1,200 in women).", ["34453161"]),
        ("Aortic valve replacement (SAVR or TAVR) is indicated in all symptomatic patients with severe AS, and in asymptomatic patients with LVEF < 50% or abnormal exercise testing.", ["34453161"])
    ],
    [
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline"),
        ("34709979", "ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease.", 2020, "guideline")
    ],
    ["Indications for early intervention in asymptomatic severe AS with normal LVEF.", "Optimal choice between TAVR and SAVR in bicuspid aortic valve anatomy across age groups."],
    ["Classic triad of symptomatic severe AS: Dyspnea (heart failure, 2-year survival 50%), Syncope (exertional, 3-year survival), Angina (5-year survival).", "Dobutamine stress echo assessment of contractile reserve: an increase in stroke volume >= 20% confirms contractile reserve and predicts lower procedural mortality.", "Cardiac CT calcium score thresholds for severe AS: >= 2,000-3,000 AU in men; >= 1,200-1,600 AU in women."],
    ["An 80-year-old male presenting with exertional presyncope whose echocardiogram shows AVA 0.7 cm2, peak velocity 4.4 m/s, and mean gradient 46 mmHg.", "A 74-year-old with LVEF 30%, AVA 0.8 cm2, and mean gradient 26 mmHg referred for dobutamine stress echo to distinguish true from pseudo-severe AS."]
)

BATCH_5[174] = make_entry(
    'aortic_stenosis_tavr',
    "Transcatheter aortic valve replacement (TAVR) has transformed the treatment of severe symptomatic aortic stenosis across all surgical risk categories (high, intermediate, and low surgical risk). Valve selection between transfemoral TAVR and surgical aortic valve replacement (SAVR) is made by the Heart Team, considering patient age (TAVR favored in age >= 75; SAVR favored in age < 65), life expectancy, anatomical suitability, and vascular access.",
    [
        ("The PARTNER 3 and Evolut Low Risk trials demonstrated that transfemoral TAVR was non-inferior or superior to surgical aortic valve replacement in low-risk elderly patients.", ["30883058"]),
        ("ESC/EACTS guidelines recommend TAVR in older patients (age >= 75 years) or those who are inoperable or high surgical risk (STS/EuroSCORE II > 8%).", ["34453161"]),
        ("Complications of TAVR include complete heart block requiring permanent pacemaker implantation (higher with self-expanding valves), vascular access site injury, paravalvular leak, and stroke.", ["34453161"]),
        ("Pre-procedural planning requires ECG-gated multislice cardiac CT of the aortic root and iliofemoral vasculature for valve sizing and access evaluation.", ["34453161"])
    ],
    [
        ("30883058", "Transcatheter Aortic-Valve Replacement with a Balloon-Expandable Valve in Low-Risk Patients (PARTNER 3).", 2019, "trial"),
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline")
    ],
    ["Durability and re-intervention options after 10 years in younger TAVR recipients.", "Risk of coronary artery obstruction during TAVR-in-surgical-bioprosthesis."],
    ["Age-based guideline thresholds: age >= 75 favors transfemoral TAVR; age < 65 or life expectancy > 20 years favors mechanical or surgical bioprosthesis.", "Pacemaker risk after TAVR: mechanical compression of the membranous septum and atrioventricular conduction bundle.", "Pre-TAVR CT evaluation: assesses annular area and perimeter, distance from annular plane to coronary ostia, and minimal femoral lumen diameter."],
    ["A 79-year-old active woman with severe symptomatic AS and an STS score of 2.1% evaluated by the Heart Team for transfemoral TAVR.", "A post-TAVR patient on telemetry who develops new complete heart block on day 1 post-implantation of a self-expanding valve."]
)

BATCH_5[175] = make_entry(
    'apixaban_vs_rivaroxaban',
    "Apixaban and rivaroxaban are direct factor Xa inhibitors widely prescribed for stroke prevention in non-valvular atrial fibrillation and treatment of venous thromboembolism. Apixaban is administered twice daily (12-hour half-life) and has the lowest renal elimination (~27%) among DOACs. Rivaroxaban is administered once daily with food (to ensure absorption of 15 mg and 20 mg doses) and is 35% renally cleared. Large observational comparative studies show lower gastrointestinal bleeding and mortality with apixaban.",
    [
        ("Large real-world observational comparative effectiveness studies consistently associate apixaban with lower rates of major bleeding and gastrointestinal hemorrhage compared to rivaroxaban.", ["34929729"]),
        ("Rivaroxaban 15 mg and 20 mg tablets must strictly be taken with food to achieve predictable oral bioavailability (bioavailability falls to 66% in the fasting state).", ["39213192"]),
        ("Apixaban requires twice-daily dosing to maintain steady-state anticoagulation, reducing peak-to-trough plasma fluctuations compared to once-daily rivaroxaban.", ["21875378"]),
        ("Both agents are substrate of CYP3A4 and P-glycoprotein, requiring dose adjustment or avoidance with strong dual inhibitors (ketoconazole, ritonavir) or inducers (rifampin, carbamazepine).", ["39213192"])
    ],
    [
        ("34929729", "Association of Apixaban vs Rivaroxaban With Risk of Major Ischemic or Hemorrhagic Events in Patients With Atrial Fibrillation.", 2021, "meta-analysis"),
        ("21875378", "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE).", 2011, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Real-world adherence differences: twice-daily apixaban vs once-daily rivaroxaban.", "Comparative outcomes in extreme obesity (body weight > 120 kg or BMI > 40)."],
    ["Food effect distinction: rivaroxaban 15 mg and 20 mg require food for absorption; apixaban can be taken with or without food.", "GI bleeding profile: apixaban does not increase major GI bleeding compared to warfarin, whereas once-daily rivaroxaban and dabigatran 150 mg exhibit higher GI bleeding rates.", "Renal dosing: apixaban dose reduction based on the 2-of-3 criteria; rivaroxaban reduced from 20 mg to 15 mg if CrCl 15-49 mL/min."],
    ["A 73-year-old patient with prior mild gastritis and AF choosing between apixaban and rivaroxaban.", "A patient taking rivaroxaban 20 mg on an empty stomach whose morning trough levels show subtherapeutic drug concentration."]
)
