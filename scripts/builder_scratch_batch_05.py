# -*- coding: utf-8 -*-
"""
Builder script for Batch 5 (Topics 101-125) of the 280 Write-From-Scratch cohort.
Replaces generic placeholder text with textbook-grade clinical evidence,
diagnostic pearls, landmark trials, and high-yield MCQ angles.
"""

BATCH_05_TOPICS = {
    "Stress ulcer prophylaxis in critically ill patients": {
        "mentor_intro": "Stress ulcer prophylaxis (SUP) in the intensive care unit is aimed at preventing stress-related mucosal bleeding in critically ill patients. Routine universal prophylaxis is no longer supported; targeted therapy balances gastroprotection against the risks of hospital-acquired pneumonia and Clostridioides difficile infection.",
        "teaching_points": [
            "Stress-related mucosal disease (SRMD) develops from splanchnic hypoperfusion, mucosal ischemia, and impaired bicarbonate secretion in critically ill patients; clinically significant gastrointestinal bleeding carries high attributable mortality, but occurs in <2–3% of modern ICU patients.",
            "Independent risk factors mandating stress ulcer prophylaxis include: mechanical ventilation anticipated for >48 hours and severe coagulopathy (platelet count <50,000/uL, INR >1.5, or PTT >2 times control).",
            "The landmark PEPTIC trial (over 26,000 ICU patients) and the SUP-ICU trial demonstrated that Proton Pump Inhibitors (PPIs, e.g., pantoprazole 40 mg daily) and Histamine-2 Receptor Antagonists (H2RAs, e.g., famotidine 20 mg twice daily) achieve low rates of overt GI bleeding without significant differences in 90-day all-cause mortality.",
            "Acid suppression alters upper gastrointestinal and pulmonary microflora: chronic PPI therapy in the ICU is associated with a modest but statistically significant increased risk of hospital-acquired pneumonia and Clostridioides difficile-associated diarrhea.",
            "Prophylaxis should be discontinued promptly once major risk factors resolve (extubation from mechanical ventilation, resolution of shock and coagulopathy, and establishment of full enteral nutrition) to prevent inappropriate outpatient continuation."
        ],
        "mcq_angles": [
            "Mandatory indications for stress ulcer prophylaxis: invasive mechanical ventilation >48 hours and clinically significant coagulopathy (platelets <50k or INR >1.5).",
            "PEPTIC trial finding: PPIs and H2RAs demonstrate equivalent 90-day mortality and low rates of clinically significant GI bleeding in mechanical ventilation.",
            "Adverse effect trade-off of acid suppression: increased risks of Clostridioides difficile colitis and ventilator-associated pneumonia secondary to loss of gastric acid barrier."
        ],
        "case_hooks": [
            "A 64-year-old mechanically ventilated man with severe acute respiratory distress syndrome on day 4 of ICU admission with normal platelets and coagulation, evaluated for SUP.",
            "A 72-year-old woman recovering from septic shock extubated on day 5 and tolerating full enteral nutrition, whose pantoprazole is discontinued upon ICU stepdown."
        ],
        "uncertainties": [
            "Impact of high-dose early enteral nutrition alone as protective against stress mucosal bleeding without concurrent pharmacological acid suppression.",
            "Optimal comparative choice between intravenous H2RAs versus PPIs in neurocritical intensive care patients with traumatic brain injury."
        ]
    },

    "Stress ulcer prophylaxis: indications and risk-benefit in critical illness": {
        "mentor_intro": "Evidence-based prescribing of stress ulcer prophylaxis requires identifying specific high-risk critical care cohorts while avoiding overuse in low-risk ward and ICU populations. Re-evaluating daily indications minimizes drug-drug interactions and infectious sequelae.",
        "teaching_points": [
            "Primary high-risk indications for SUP encompass: invasive mechanical ventilation >=48 hours, severe coagulopathy (INR >1.5, platelets <50 x 10^9/L), traumatic brain injury (GCS <=8), major severe burn injury (>35% BSA), and polytrauma with high injury severity score.",
            "Secondary lower-risk contributing factors that may justify prophylaxis when multiple are present include: septic shock requiring vasopressors, acute kidney injury requiring renal replacement therapy, high-dose systemic corticosteroid therapy (>250 mg hydrocortisone equivalent daily), and a documented history of GI ulceration within the past year.",
            "In patients receiving full enteral nutrition, nutritional infusion provides direct luminal buffering and mucosal blood flow promotion; randomized trials indicate that enteral nutrition alone significantly attenuates stress ulceration risk.",
            "Proton pump inhibitors provide more potent acid suppression than H2-receptor antagonists and avoid the tachyphylaxis (tolerance within 48 to 72 hours) characteristic of H2RAs; however, both drug classes have comparable clinical outcomes in large pragmatic trials.",
            "Failure to discontinue stress ulcer prophylaxis upon discharge from the ICU results in inappropriate long-term outpatient acid suppression in up to 50–70% of survivors, predisposing patients to bone fractures, hypomagnesemia, and recurrent enteric infections."
        ],
        "mcq_angles": [
            "Tachyphylaxis with H2-receptor antagonists: rapid tolerance develops within 48 to 72 hours of continuous H2RA infusion, whereas PPIs maintain consistent acid suppression.",
            "Discontinuation trigger: extubation and establishment of enteral nutrition should trigger immediate cessation of stress ulcer prophylaxis in the absence of other risk factors.",
            "Risk of outpatient discharge continuation: inappropriate post-discharge continuation of inpatient acid suppression exposes patients to long-term chronic kidney disease and micronutrient deficiencies."
        ],
        "case_hooks": [
            "A 45-year-old trauma patient with 40% total body surface area burns admitted to the burn intensive care unit, initiated on IV pantoprazole.",
            "An 80-year-old patient transferred to the rehabilitation ward on continuous omeprazole initiated during a 2-day ICU stay for postoperative monitoring."
        ],
        "uncertainties": [
            "Biomarkers or gastric mucosal pH monitoring in predicting overt stress-induced mucosal ulceration before clinical bleeding occurs.",
            "Comparative cost-effectiveness of oral sucralfate mucosal coating versus systemic acid-suppressive agents in modern critical care."
        ]
    },

    "Subarachnoid hemorrhage ICU management": {
        "mentor_intro": "Aneurysmal subarachnoid hemorrhage (aSAH) is a neurological catastrophe characterized by high initial mortality and complex delayed secondary cerebral complications. Intensive care management centers on emergent aneurysm securing, neuroprotective nimodipine, aggressive vasospasm surveillance, and maintenance of euvolemia.",
        "teaching_points": [
            "Immediate emergency priority in aneurysmal SAH is early securing of the ruptured aneurysm (within 24 to 48 hours) via endovascular coiling or microsurgical clipping to prevent fatal rebleeding (rebleeding risk is highest in the first 24 hours, carrying >50% mortality); endovascular coiling is favored in anatomically suitable anterior circulation aneurysms (ISAT trial).",
            "Oral nimodipine (60 mg every 4 hours for exactly 21 days) is the only pharmacological neuroprotective agent proven in randomized clinical trials to improve neurological outcomes and reduce delayed ischemic deficits, acting through cellular neuroprotective mechanisms rather than gross cerebral arterial vasodilation.",
            "Delayed Cerebral Ischemia (DCI)—secondary to microvascular dysfunction, cortical spreading depolarization, microthrombosis, and macrovascular arterial vasospasm—classically develops between days 4 and 14 post-hemorrhage; monitoring incorporates daily transcranial Doppler (TCD: mean flow velocity >120-200 cm/s in MCA indicates vasospasm) and serial neurological examinations.",
            "Management of delayed cerebral ischemia requires induced hypertension (elevating MAP using noradrenaline targeting SBP 160–180 mmHg or 20–30 mmHg above baseline in secured aneurysms) and maintenance of strict euvolemia; legacy 'Triple-H' therapy (Hypervolemia, Hemodilution, Hypertension) has been abandoned due to risks of pulmonary edema and myocardial infarction without clinical benefit.",
            "Hyponatremia occurs in >30–50% of SAH patients, predominantly driven by Cerebral Salt Wasting (CSW, hypovolemic hyponatremia with high urine sodium) or SIADH (euvolemic hyponatremia); CSW must be treated with volume and sodium repletion (hypertonic saline 3% or fludrocortisone), avoiding fluid restriction which precipitates cerebral infarction."
        ],
        "mcq_angles": [
            "Nimodipine protocol in aSAH: oral nimodipine (60 mg q4h for 21 days) is mandatory; IV formulation increases hypotension and does not improve outcomes over oral delivery.",
            "Management of hyponatremia in SAH: fluid restriction is strictly contraindicated; differentiate CSW from SIADH and maintain euvolemia/hypervolemia with isotonic or hypertonic saline.",
            "Modern hemodynamic strategy for DCI: induced hypertension with euvolemia (monitored by noradrenaline titration); hypervolemia and hemodilution are abandoned."
        ],
        "case_hooks": [
            "A 52-year-old woman presenting with a 'thunderclap' headache, Hunt and Hess Grade 2 aSAH, whose basilar tip aneurysm is successfully coiled within 18 hours.",
            "A 48-year-old woman on day 7 post-SAH who develops new-onset expressive dysphasia and right pronator drift with MCA flow velocity 210 cm/s on TCD."
        ],
        "uncertainties": [
            "Role of continuous intra-arterial vasodilator infusions (milrinone, nicardipine) versus balloon angioplasty in refractory proximal delayed cerebral vasospasm.",
            "Prognostic utility of continuous electroencephalography (cEEG) in detecting non-convulsive seizures and cortical spreading depolarizations in comatose SAH patients."
        ]
    },

    "Subclinical hypothyroidism treatment thresholds": {
        "mentor_intro": "Subclinical hypothyroidism is a biochemical diagnosis defined by an elevated serum thyroid-stimulating hormone (TSH) level with normal circulating free thyroxine (FT4) and free triiodothyronine (FT3). Deciding when to initiate levothyroxine therapy balances cardiovascular and symptom benefits against the risks of overtreatment, guided by TSH cutoffs and patient age.",
        "teaching_points": [
            "Subclinical hypothyroidism is defined biochemically by a confirmed elevated serum TSH (above the reference range, typically >4.0–4.5 mIU/L) with normal circulating free T4 (FT4); repeat testing at 2 to 3 months is mandatory before diagnosis, as up to 50% of mildly elevated TSH values spontaneously normalize.",
            "A serum TSH threshold >=10.0 mIU/L represents an established consensus indication for levothyroxine replacement therapy across all age groups, based on observational evidence showing increased risks of heart failure, atherosclerotic cardiovascular disease, and progression to overt hypothyroidism (~5% per year).",
            "For mild TSH elevations (4.5 to 9.9 mIU/L), routine treatment is NOT recommended in adults aged >=65–70 years (TRUST trial), as levothyroxine does not improve quality of life, fatigue, or cognitive function in older adults and increases the risk of iatrogenic atrial fibrillation and osteoporosis.",
            "Indications for treating mild TSH elevation (4.5 to 9.9 mIU/L) in younger adults (<65 years) include: persistent symptoms of hypothyroidism, positive anti-thyroid peroxidase (anti-TPO) antibodies, presence of a goiter, or planning pregnancy.",
            "In pregnancy or women actively pursuing conception, treatment thresholds are significantly more aggressive: levothyroxine is recommended if TSH is above the pregnancy-specific upper limit (>4.0 mIU/L) or >2.5 mIU/L in the presence of positive anti-TPO antibodies, to prevent miscarriage, pre-eclampsia, and neurodevelopmental impairment."
        ],
        "mcq_angles": [
            "TRUST trial landmark finding in older adults: levothyroxine replacement in adults >=65 years with subclinical hypothyroidism (TSH 4.5-9.9) provides NO benefit for hypothyroid symptoms or fatigue.",
            "Definitive TSH treatment threshold: TSH >=10.0 mIU/L warrants levothyroxine therapy regardless of age due to increased cardiovascular mortality and risk of heart failure.",
            "Pregnancy-specific threshold: levothyroxine is indicated if TSH >2.5 mIU/L with positive anti-TPO antibodies or TSH >4.0 mIU/L irrespective of antibody status."
        ],
        "case_hooks": [
            "A 74-year-old asymptomatic woman whose routine lab screening shows a confirmed TSH of 7.2 mIU/L with a normal free T4 of 14 pmol/L.",
            "A 28-year-old woman in her first trimester of pregnancy presenting with a TSH of 4.8 mIU/L, normal free T4, and positive anti-TPO antibodies."
        ],
        "uncertainties": [
            "Cardiovascular risk reduction magnitude of levothyroxine in young adults (age 35-55) with mild subclinical hypothyroidism (TSH 7.0-9.9 mIU/L).",
            "Optimal long-term monitoring intervals for untreated older patients maintaining stable TSH levels between 5.0 and 8.0 mIU/L."
        ]
    },

    "Sudden Unexpected Death in Epilepsy (SUDEP): risk factors, patient counselling": {
        "mentor_intro": "Sudden Unexpected Death in Epilepsy (SUDEP) is the leading cause of epilepsy-related mortality, defined as the non-traumatic, non-drowning sudden death of an individual with epilepsy with or without evidence of a seizure. Transparent patient counseling, optimizing seizure control, and nocturnal supervision are life-saving.",
        "teaching_points": [
            "SUDEP is defined as a sudden, unexpected, witnessed or unwitnessed, non-traumatic, and non-drowning death in a patient with epilepsy, with or without evidence of an antecedent seizure, where post-mortem examination does not reveal a toxicological or anatomical cause of death.",
            "The single greatest modifiable risk factor for SUDEP is the frequency of generalized tonic-clonic seizures (GTCS): patients experiencing >=3 GTCS per year have a >15-fold increased risk of SUDEP compared to seizure-free individuals.",
            "Major secondary risk factors include: nocturnal seizures, sleeping alone/unsupervised, prone sleeping position ('face-down' post-ictal suffocation), early age of epilepsy onset, long disease duration, and poor adherence to antiseizure medications (ASMs).",
            "The proposed terminal pathophysiological mechanism (MORTEMUS study) involves a post-ictal sequence: a generalized convulsive seizure triggers post-ictal generalized EEG suppression (PGES), followed by central hypopnea/apnea, bradyarrhythmia or asystole, and secondary terminal cardiac arrest.",
            "Counseling and preventive strategies: transparent counseling regarding SUDEP is recommended by guidelines (NICE, AAN); the primary prevention is maximizing seizure control to abolish GTCS, promoting medication adherence, avoiding sleep deprivation and excess alcohol, utilizing nocturnal supervision/monitors, and avoiding prone sleep posturing."
        ],
        "mcq_angles": [
            "Single strongest modifiable risk factor for SUDEP: frequency of generalized tonic-clonic seizures (GTCS); complete control of GTCS dramatically reduces SUDEP risk.",
            "Post-ictal sleep position hazard: prone sleeping position is found in >70% of unwitnessed SUDEP cases, contributing to post-ictal suffocation and respiratory arrest.",
            "Guideline communication standard: clinicians should discuss SUDEP early with patients and families to emphasize the critical importance of antiseizure medication adherence."
        ],
        "case_hooks": [
            "A 22-year-old university student with refractory juvenile myoclonic epilepsy experiencing 4 nocturnal generalized tonic-clonic seizures per year while living alone in a dormitory.",
            "A 16-year-old newly diagnosed with focal epilepsy with secondary generalization whose parents inquire about nocturnal seizure alarms and safety."
        ],
        "uncertainties": [
            "Clinical efficacy of wearable smartwatch/accelerometer seizure detection devices in reducing true SUDEP incidence through prompt caregiver alerting.",
            "Role of adjunctive selective serotonin reuptake inhibitors (SSRIs) in mitigating post-ictal respiratory depression and central apnea."
        ]
    },

    "Sudden sensorineural hearing loss: diagnosis and treatment": {
        "mentor_intro": "Sudden sensorineural hearing loss (SSNHL) is an otolaryngological emergency characterized by rapid-onset sensorineural hearing impairment developing within 72 hours. Immediate clinical diagnosis and urgent initiation of high-dose corticosteroids within the initial therapeutic window dictate recovery.",
        "teaching_points": [
            "Diagnostic criteria for SSNHL require sensorineural hearing loss of >=30 decibels (dB) affecting at least three contiguous audiometric frequencies, developing over a period of <=72 hours; it is predominantly unilateral (98%) and idiopathic in >90% of cases.",
            "Emergency bedside tuning fork assessment: Weber test lateralizes to the UNAFFECTED normal ear (indicating sensorineural loss in the affected ear), and Rinne test demonstrates air conduction greater than bone conduction (AC > BC, positive Rinne) bilaterally, ruling out conductive cerumen impaction or middle ear effusion.",
            "High-dose systemic corticosteroid therapy is the mainstay of treatment, initiated as early as possible within 2 weeks of symptom onset: oral prednisone (1 mg/kg/day, typically 60 mg daily for 7 to 14 days followed by a taper) promotes resolution by reducing cochlear edema and microvascular inflammation.",
            "Intratympanic (IT) corticosteroid injections (dexamethasone or methylprednisolone injected through the tympanic membrane into the middle ear) achieve high perilymph concentrations without systemic side effects; IT steroids are recommended as salvage therapy for incomplete recovery after systemic steroids or as primary therapy in patients with contraindications to systemic steroids (uncontrolled diabetes, severe hypertension).",
            "Contrast-enhanced magnetic resonance imaging (MRI) of the brain and internal auditory canals (IACs) is mandatory in all patients with confirmed SSNHL to rule out a vestibular schwannoma (acoustic neuroma, found in 2–5% of SSNHL cases), stroke, or demyelinating disease."
        ],
        "mcq_angles": [
            "Tuning fork findings in unilateral sensorineural hearing loss: Weber test lateralizes to the normal opposite ear; Rinne test is positive (AC > BC) in both ears.",
            "Therapeutic window for corticosteroids: maximal recovery occurs when systemic corticosteroids are initiated within 72 hours to 14 days of symptom onset; efficacy declines sharply after 2–4 weeks.",
            "Mandatory imaging modality: contrast-enhanced MRI of the internal auditory canals is required to rule out vestibular schwannoma (acoustic neuroma)."
        ],
        "case_hooks": [
            "A 46-year-old man who wakes up with complete loss of hearing, fullness, and high-pitched tinnitus in his left ear with a normal otoscopic examination.",
            "A 60-year-old diabetic woman with acute left SSNHL whose hearing fails to improve after 10 days of oral prednisone, evaluated for salvage intratympanic dexamethasone injections."
        ],
        "uncertainties": [
            "Additive therapeutic benefit of hyperbaric oxygen therapy (HBOT) combined with corticosteroids versus corticosteroids alone in severe profound SSNHL.",
            "Prognostic significance of initial audiogram configuration (upsloping low-frequency loss carrying superior recovery vs flat/downsloping profound loss)."
        ]
    },

    "Suicide risk assessment and self-harm": {
        "mentor_intro": "Suicide risk assessment requires an empathic, structured clinical interview to evaluate intent, identify psychiatric and situational risk factors, and co-design a personalized safety plan. Moving beyond simplistic risk stratification checklists improves clinical engagement and patient safety.",
        "teaching_points": [
            "Evidence-based guidelines (NICE, APA) explicitly advise against utilizing actuarial or numerical risk categorization tools (e.g., categorizing patients into 'low', 'medium', or 'high' risk) to guide clinical management, as these tools have unacceptable false-negative rates and fail to predict completed suicide.",
            "A comprehensive clinical risk formulation systematically evaluates: suicidal ideation (frequency, intensity, duration), specific plan and lethal feasibility, preparatory behaviors (acquiring means, writing notes, giving away belongings), and degree of suicidal intent versus ambivalence.",
            "Self-harm (non-suicidal self-injury [NSSI] vs suicide attempts) must be differentiated: NSSI is typically performed to regulate overwhelming negative affect, alleviate distress, or express emotional pain without intent to die; however, chronic NSSI is a powerful independent longitudinal risk factor for future suicide attempts.",
            "The Stanley-Brown Safety Planning Intervention (SPI) is an evidence-based clinical tool comprising six sequential steps: identifying personalized warning signs, internal coping strategies, social contacts/distractions, trusted family/friends for support, professional crisis services, and making the environment safe (restricting access to lethal means).",
            "Pharmacological interventions with proven, specific antisuicidal properties include: Lithium in bipolar disorder and major depressive disorder (reduces suicide attempts and completed suicides by >60%), Clozapine in schizophrenia (the only FDA-approved antipsychotic for reducing suicidal behavior), and rapid-acting subanesthetic ketamine/esketamine for acute depressive crises."
        ],
        "mcq_angles": [
            "Psychiatric medication with proven antisuicidal properties in mood disorders: Lithium significantly reduces completed suicide rates independent of its antidepressant maintenance efficacy.",
            "Clozapine unique regulatory indication: the only antipsychotic with a specific FDA indication for reducing suicidal behavior in schizophrenia.",
            "Guideline consensus on risk scales: numeric risk stratification scales should not be used to determine admission or discharge; clinical risk formulation and safety planning are required."
        ],
        "case_hooks": [
            "A 24-year-old woman with borderline personality disorder presenting to the emergency department after superficial forearm cutting following abandonment by her partner.",
            "A 50-year-old man with severe major depression and active suicidal intent who recently purchased a firearm, evaluated for emergency involuntary inpatient psychiatric stabilization."
        ],
        "uncertainties": [
            "Long-term real-world effectiveness of digital smartphone safety-planning applications versus physical paper-based safety plans in reducing crisis readmissions.",
            "Clinical thresholds for electroconvulsive therapy (ECT) in acute suicidal crises with psychotic depression."
        ]
    },

    "Superficial Thrombophlebitis versus DVT": {
        "mentor_intro": "Superficial vein thrombosis (SVT / superficial thrombophlebitis) was historically considered a benign localized condition, but is now recognized as part of the venous thromboembolism (VTE) spectrum. Accurately distinguishing SVT from deep vein thrombosis (DVT) and evaluating for concurrent deep propagation is essential.",
        "teaching_points": [
            "Superficial vein thrombosis (SVT) presents with localized pain, erythema, tenderness, and a palpable, tender, indurated subcutaneous 'cord' along the anatomical course of a superficial vein (most commonly the great saphenous vein [GSV]); deep vein thrombosis (DVT) typically presents with diffuse unilateral calf or whole-leg swelling, edema, and calf tenderness without a visible superficial cord.",
            "Comprehensive duplex venous ultrasonography of the entire lower extremity is mandatory in all patients with suspected SVT to measure the exact thrombus length and rule out concurrent deep vein thrombosis, which is present in 20–25% of patients presenting with apparent isolated SVT.",
            "In patients with isolated lower extremity SVT that is >=5 cm in length and located >=3 cm from the saphenofemoral junction (SFJ) or saphenopopliteal junction (SPJ), the landmark CALISTO randomized trial established that subcutaneous fondaparinux (2.5 mg once daily for 45 days) significantly reduces the composite of death, PE, DVT, or SVT extension by 85% without increasing major bleeding.",
            "SVT extending within 3 cm of the saphenofemoral junction or saphenopopliteal junction carries high risk of embolization and is classified as equivalent to deep vein thrombosis, mandating full-dose therapeutic anticoagulation (DOACs or therapeutic LMWH) for at least 3 months.",
            "Migratory or recurrent superficial thrombophlebitis in atypical sites without varicose veins (Trousseau syndrome) is a classic paraneoplastic manifestation of occult visceral adenocarcinoma (pancreatic, gastric, lung, or ovarian malignancy) or underlying systemic vasculitis (Behcet disease, Buerger disease)."
        ],
        "mcq_angles": [
            "CALISTO trial regimen for extensive SVT: prophylactic-dose fondaparinux (2.5 mg daily for 45 days) is the evidence-based treatment for isolated SVT >=5 cm in length.",
            "SVT within 3 cm of saphenofemoral junction: treated as deep vein thrombosis with full-dose therapeutic anticoagulation for 3 months due to high risk of progression into the common femoral vein.",
            "Trousseau syndrome clinical significance: recurrent migratory thrombophlebitis is a paraneoplastic marker indicating underlying visceral adenocarcinoma (especially pancreatic cancer)."
        ],
        "case_hooks": [
            "A 54-year-old woman presenting with a painful, erythematous, palpable 8-cm cord over the medial lower calf with duplex ultrasound confirming great saphenous vein SVT ending 12 cm below the SFJ.",
            "A 62-year-old man presenting with acute groin tenderness whose duplex scan reveals great saphenous vein thrombosis extending to within 1.5 cm of the common femoral vein."
        ],
        "uncertainties": [
            "Efficacy and safety of direct oral anticoagulants (rivaroxaban 10 mg daily) compared to fondaparinux in isolated lower limb SVT (SURPRISE trial extrapolation).",
            "Indications for thrombophilia screening in young patients presenting with unprovoked, recurrent superficial vein thrombosis."
        ]
    },

    "Surgical site infection: prevention and management": {
        "mentor_intro": "Surgical site infections (SSIs) are the most common healthcare-associated infections among surgical patients, contributing to prolonged hospitalization, readmission, and morbidity. Implementing evidence-based preventive care bundles across preoperative, intraoperative, and postoperative phases significantly reduces infection rates.",
        "teaching_points": [
            "CDC classifications divide SSIs into: (1) Superficial incisional (involves only skin and subcutaneous tissue within 30 days), (2) Deep incisional (involves deep soft tissues, fascial and muscle layers within 30 to 90 days), and (3) Organ/Space (involves any anatomical part opened or manipulated during surgery within 30 to 90 days).",
            "Preoperative hair removal: routine shaving with razors causes microscopic skin abrasions that harbor bacteria and significantly increases SSI rates; if hair removal is necessary, electric clippers with a single-use blade immediately prior to surgery must be used.",
            "Surgical skin antisepsis: chlorhexidine gluconate in an alcoholic solution (2% chlorhexidine in 70% isopropyl alcohol) is guideline-preferred (WHO, CDC, NICE) over povidone-iodine due to superior residual bactericidal persistence and lower SSI incidence in clean-contaminated surgeries.",
            "Intraoperative physiological optimization requires: maintaining strict normothermia (core temperature >=36.0 C via active forced-air warming blankets, preventing hypothermia-induced vasoconstriction and impaired neutrophil killing), perioperative glycemic control (blood glucose <200 mg/dL / <11 mmol/L in all patients), and maintaining adequate tissue oxygenation via normovolemia.",
            "Management of established incisional SSI requires: opening the surgical incision to evacuate purulent collections, debriding devitalized tissue, taking deep tissue specimens for Gram stain and culture, and packing with saline-moistened sterile gauze or applying negative pressure wound therapy (NPWT); systemic antibiotics are indicated only if systemic toxicity (fever, tachycardia) or surrounding erythema >5 cm is present."
        ],
        "mcq_angles": [
            "Hair removal standard of care: hair should NOT be removed routinely; if required, electric clipping immediately before surgery is mandatory; razors are strictly contraindicated.",
            "Skin preparation agent of choice: alcoholic chlorhexidine gluconate is superior to aqueous povidone-iodine in preventing surgical site infections.",
            "Hypothermia prevention mechanism: maintaining core normothermia (>=36 C) prevents peripheral vasoconstriction and preserves neutrophil oxidative bactericidal burst."
        ],
        "case_hooks": [
            "A 58-year-old woman on postoperative day 6 following an elective open sigmoid colectomy who develops low-grade fever, erythema, and purulent discharge from the midline wound.",
            "A surgical safety committee reviewing preoperative preparation protocols to transition from disposable razors to single-use surgical clippers."
        ],
        "uncertainties": [
            "Clinical efficacy of prophylactic closed incisional negative pressure wound therapy (ciNPWT) in clean-contaminated high-risk abdominal incisions.",
            "Comparative effectiveness of supplemental high fraction of inspired oxygen (FiO2 80% vs 30-35%) in reducing SSI rates in mechanically ventilated surgical patients."
        ]
    },

    "Surgical site infections: classification, risk factors, prophylaxis timing, MRSA decolonisation": {
        "mentor_intro": "Antimicrobial surgical prophylaxis is a time-critical intervention designed to achieve bactericidal tissue concentrations at the precise moment of incision. Adherence to strict administration windows, redosing intervals, and targeted MRSA screening prevents SSI without fostering antimicrobial resistance.",
        "teaching_points": [
            "Timing of surgical antimicrobial prophylaxis: intravenous antibiotics must be completely infused within 60 minutes prior to surgical incision (or within 120 minutes for agents with long infusion times like vancomycin or fluoroquinolones) to guarantee peak tissue drug concentrations at the moment of initial skin incision.",
            "Postoperative discontinuation: antimicrobial prophylaxis should be discontinued within 24 hours of surgery completion (or immediately at wound closure); continuing prophylactic antibiotics postoperatively does NOT reduce SSI rates and promotes Clostridioides difficile colitis and multidrug-resistant pathogen emergence.",
            "Intraoperative redosing is mandatory if the procedure duration exceeds two half-lives of the antibiotic (e.g., redose cefazolin every 3 to 4 hours) or in cases of massive intraoperative blood loss (>1,500 mL) to maintain adequate minimum inhibitory concentrations.",
            "Cefazolin (2 g IV for patients <120 kg, or 3 g IV for patients >=120 kg) is the standard workhorse prophylactic agent for clean and clean-contaminated procedures; broad-spectrum agents with anaerobic coverage (cefazolin plus metronidazole, or cefoxitin) are required for colorectal surgery.",
            "Targeted preoperative MRSA screening and decolonization (nasal mupirocin 2% ointment twice daily for 5 days combined with daily 4% chlorhexidine body washes) prior to elective high-risk procedures (orthopedic arthroplasty and cardiac surgery) significantly reduces S. aureus surgical site infections; vancomycin is added to cefazolin only for confirmed MRSA carriers or high-risk institutional settings."
        ],
        "mcq_angles": [
            "Timing window for standard antibiotic prophylaxis: complete infusion within 60 minutes prior to surgical incision; vancomycin requires 120 minutes due to Red Man syndrome.",
            "Postoperative antibiotic duration rule: prophylactic antibiotics must be stopped within 24 hours post-op (or at wound closure); prolonged continuation is not guideline-adherent.",
            "Cefazolin weight-based dosing: 2 g for patients <120 kg; increased to 3 g for patients weighing >=120 kg (or BMI >35)."
        ],
        "case_hooks": [
            "A 45-year-old man undergoing elective total hip replacement whose anesthesia record indicates cefazolin was administered 15 minutes after surgical skin incision.",
            "A 70-year-old woman scheduled for elective coronary artery bypass grafting whose preoperative nasal swab is positive for Methicillin-Resistant Staphylococcus aureus."
        ],
        "uncertainties": [
            "Universal versus targeted preoperative nasal mupirocin decolonization in community hospitals with low baseline MRSA prevalence.",
            "Safety and allergy de-labeling protocols for utilizing cefazolin in patients with non-anaphylactic historical penicillin allergies."
        ]
    },

    "Syncope and postural hypotension": {
        "mentor_intro": "Syncope is a transient loss of consciousness (TLOC) caused by global cerebral hypoperfusion, characterized by rapid onset, short duration, and spontaneous complete recovery. Differentiating benign orthostatic and reflex syncope from cardiac syncope requires systematic orthostatic vital sign measurement and risk stratification.",
        "teaching_points": [
            "Orthostatic (postural) hypotension is defined as a sustained reduction in systolic blood pressure of >=20 mmHg or diastolic blood pressure of >=10 mmHg (or a fall in SBP to <90 mmHg) within 3 minutes of standing or head-up tilt to >=60 degrees.",
            "Pathophysiological categories of orthostatic hypotension include: (1) Non-neurogenic (hypovolemia, dehydration, blood loss, vasodilating medications, diuretics, alcohol), and (2) Neurogenic (primary autonomic failure in Parkinson disease, Multiple System Atrophy, pure autonomic failure; or secondary autonomic neuropathy in diabetes, amyloidosis, autoimmune autonomic ganglionopathy).",
            "Neurogenic orthostatic hypotension (nOH) is characterized by an inadequate compensatory heart rate increase upon standing (typically <10–15 bpm rise despite severe hypotension) and postprandial/supine hypertension; diagnosis can be supported by measuring supine and standing plasma norepinephrine (failure of norepinephrine to double on standing confirms defective sympathetic efferent release).",
            "Non-pharmacological interventions are foundational: review and deprescribe culprit antihypertensive medications, liberalize dietary fluid (2–2.5 L/day) and sodium intake (6–10 g/day), apply waist-high compression stockings and abdominal binders, elevate head of the bed 10–15 degrees at night, and teach physical counterpressure maneuvers (leg crossing, squatting).",
            "Pharmacological therapy for refractory neurogenic orthostatic hypotension includes: Midodrine (selective peripheral alpha-1 adrenergic agonist), Droxidopa (norepinephrine prodrug), and Fludrocortisone (synthetic mineralocorticoid promoting renal sodium retention and plasma volume expansion; monitor for supine hypertension and hypokalemia)."
        ],
        "mcq_angles": [
            "Diagnostic criteria for orthostatic hypotension: sustained fall in SBP >=20 mmHg or DBP >=10 mmHg within 3 minutes of standing.",
            "Distinguishing neurogenic from non-neurogenic orthostatic hypotension: neurogenic OH features blunted compensatory tachycardia (<10-15 bpm increase) due to baroreflex failure.",
            "Fludrocortisone monitoring hazard: promotes volume expansion but exacerbates supine hypertension, predisposing to nocturnal stroke and congestive heart failure."
        ],
        "case_hooks": [
            "A 72-year-old man with Parkinson disease who feels dizzy upon standing, with supine BP 155/85 mmHg (HR 72) falling to 95/55 mmHg (HR 76) at 2 minutes of standing.",
            "An 80-year-old woman taking hydrochlorothiazide and amlodipine presenting with recurrent syncopal falls upon getting out of bed in the morning."
        ],
        "uncertainties": [
            "Comparative long-term clinical efficacy and supine hypertension safety of droxidopa versus midodrine in multiple system atrophy.",
            "Role of pyridostigmine (acetylcholinesterase inhibitor augmenting autonomic ganglionic transmission) as monotherapy for orthostatic hypotension."
        ]
    },

    "Synovial fluid analysis: WBC thresholds, crystals, viscosity, culture interpretation": {
        "mentor_intro": "Synovial fluid arthrocentesis and analysis is the definitive diagnostic procedure for acute arthritis. Evaluating fluid appearance, leukocyte count, differential, polarized microscopy for crystals, and microbiological culture allows reliable differentiation of non-inflammatory, inflammatory, and septic joint pathology.",
        "teaching_points": [
            "Synovial fluid classification divides effusions into four major categories: (1) Normal (clear, viscous, WBC <200/uL), (2) Non-inflammatory (clear/yellow, viscous, WBC 200–2,000/uL with <25% PMNs; osteoarthritis, trauma), (3) Inflammatory (cloudy/translucent, low viscosity, WBC 2,000–50,000/uL with >50% PMNs; RA, gout, pseudogout, spondyloarthritis), and (4) Septic (opaque/purulent, low viscosity, WBC >50,000/uL with >75–90% PMNs).",
            "Viscosity is high in normal and non-inflammatory fluid (forming a 3–5 cm string between fingers / 'string sign' due to intact high-molecular-weight hyaluronic acid), and is low/watery in inflammatory and septic states where bacterial and leukocyte hyaluronidases depolymerize hyaluronic acid.",
            "Compensated polarized light microscopy differentiates crystal types: Monosodium Urate (MSU / gout) crystals are needle-shaped with strongly negative birefringence (appearing bright yellow when aligned parallel to the compensator axis and blue when perpendicular); Calcium Pyrophosphate Dihydrate (CPPD / pseudogout) crystals are rhomboid/rod-shaped with weakly positive birefringence (appearing blue when aligned parallel and yellow when perpendicular).",
            "Synovial fluid glucose is normally identical to serum glucose; in septic arthritis and severe rheumatoid arthritis, synovial glucose is markedly depressed (<50% of simultaneous blood glucose) due to leukocyte and bacterial consumption.",
            "Microbiological culture: synovial fluid should be inoculated directly into blood culture bottles (aerobic and anaerobic) at the bedside, which significantly enhances bacterial recovery and yield compared to standard sterile specimen cups, particularly for fastidious organisms (Kingella kingae in children, Neisseria, and Streptococci)."
        ],
        "mcq_angles": [
            "Compensated polarized light microscopy rules: Gout (MSU) = needle-shaped, strongly negative birefringence, yellow when parallel; Pseudogout (CPPD) = rhomboid, weakly positive birefringence, blue when parallel.",
            "Synovial leukocyte cutoffs: Non-inflammatory = <2,000 WBC/uL; Inflammatory = 2,000–50,000 WBC/uL; Septic = >50,000 WBC/uL with >90% PMNs.",
            "Blood culture bottle inoculation: direct bedside inoculation of synovial fluid into blood culture media dramatically increases culture sensitivity in septic arthritis."
        ],
        "case_hooks": [
            "A 56-year-old man presenting with acute podagra of the first MTP joint whose aspirated fluid reveals intracellular needle-shaped crystals that turn yellow parallel to the slow axis.",
            "A 72-year-old woman with an acutely swollen right knee yielding cloudy yellow fluid with 38,000 WBC/uL and weakly positive rhomboid-shaped crystals."
        ],
        "uncertainties": [
            "Diagnostic utility of automated synovial fluid PCR syndromic panels in patients with suspected septic arthritis who received empiric antibiotics prior to arthrocentesis.",
            "Significance of intracellular versus extracellular crystals in predicting true acute crystal-induced flare versus incidental background crystalluria."
        ]
    },

    "Syringomyelia: Chiari malformation associations, shunt indications": {
        "mentor_intro": "Syringomyelia is a neurological disorder characterized by the development of a fluid-filled cavity (syrinx) within the spinal cord parenchyma. Most commonly associated with Chiari I malformation, it presents with a classic dissociated sensory loss and requires neurosurgical restoration of normal cerebrospinal fluid dynamics.",
        "teaching_points": [
            "Syringomyelia most frequently results from obstruction to normal pulsatile cerebrospinal fluid (CSF) flow at the foramen magnum; Chiari I malformation (downward herniation of cerebellar tonsils >5 mm below the foramen magnum) accounts for >50–70% of non-traumatic syringomyelia cases.",
            "Secondary non-Chiari etiologies include spinal cord trauma (post-traumatic syringomyelia developing months to years after injury), spinal arachnoiditis (infectious, post-surgical), spinal cord tumors (ependymoma, hemangioblastoma), and tethered cord syndrome.",
            "The classic clinical presentation is a 'dissociated sensory loss' in a cape-like distribution across the shoulders, arms, and upper torso: loss of pain and temperature sensation with complete preservation of light touch, vibration, and proprioception, caused by the expanding syrinx disrupting crossing second-order spinothalamic neurons in the anterior white commissure.",
            "Progression of the syrinx into anterior horn gray matter causes lower motor neuron weakness, muscle atrophy, and fasciculations in the hands and arms, while compression of lateral corticospinal tracts produces spastic paraparesis and hyperreflexia in the lower extremities; extension into the brainstem is termed syringobulbia (producing vocal cord paralysis, dysphagia, and tongue wasting).",
            "Surgical management: Posterior Fossa Decompression (PFD—suboccipital craniectomy, C1 laminectomy, and duraplasty) is the primary definitive surgery for Chiari I-associated syringomyelia, restoring normal CSF dynamics at the craniovertebral junction and leading to syrinx collapse in >80% of cases; direct syrinx shunting (syringosubarachnoid or syringoperitoneal shunt) is reserved for non-communicating post-traumatic or post-inflammatory syringes refractory to decompression."
        ],
        "mcq_angles": [
            "Anatomical basis of dissociated sensory loss: selective destruction of decussating spinothalamic fibers in the anterior white commissure, sparing dorsal columns (proprioception intact).",
            "First-line surgical treatment for Chiari-associated syrinx: posterior fossa suboccipital craniectomy and duraplasty (restoring CSF flow); direct syrinx shunts are avoided as initial therapy.",
            "Chiari I diagnostic MRI threshold: caudal herniation of one or both cerebellar tonsils >=5 mm below the level of the foramen magnum."
        ],
        "case_hooks": [
            "A 32-year-old woman presenting with painless cigarette burns on her fingertips and hands, whose neurological exam confirms absent pinprick sensation in a cape-like distribution across both shoulders.",
            "A 40-year-old man with Chiari I malformation and a large holocord syrinx undergoing posterior fossa decompression with C1 laminectomy."
        ],
        "uncertainties": [
            "Management of asymptomatic, incidentally detected Chiari I malformations with small stable non-expansile syringes on cervical MRI.",
            "Failure rates and optimal revision strategies for arachnoid scarring following previous posterior fossa duraplasty."
        ]
    },

    "Systemic Sclerosis": {
        "mentor_intro": "Systemic sclerosis (scleroderma) is a multisystem autoimmune connective tissue disease characterized by a triad of microvascular obliterative vasculopathy, systemic immune activation with autoantibody production, and widespread progressive tissue fibrosis of skin and internal organs.",
        "teaching_points": [
            "Systemic sclerosis (SSc) is broadly classified into two major cutaneous subsets: Limited cutaneous SSc (lcSSc, formerly CREST syndrome: Calcinosis, Raynaud phenomenon, Esophageal dysmotility, Sclerodactyly, Telangiectasia; skin thickening restricted to hands, face, and distal elbows/knees) and Diffuse cutaneous SSc (dcSSc: rapid skin thickening extending proximally to trunk and thighs, carrying high early visceral organ failure risk).",
            "Autoantibody profiles strongly correlate with clinical phenotypes: Anti-centromere antibodies (ACA) are classic for lcSSc (associated with severe Raynaud's, digital ulcers, and late development of isolated pulmonary arterial hypertension [PAH]); Anti-topoisomerase I (anti-Scl-70) is characteristic of dcSSc (strongly associated with progressive pulmonary fibrosis / SSc-ILD); Anti-RNA polymerase III antibodies are linked to rapidly progressive diffuse skin disease and a high risk of scleroderma renal crisis.",
            "Raynaud phenomenon is the universal early presenting sign (>95% of patients); nailfold capillaroscopy is an essential diagnostic tool revealing early microvascular architectural changes: dilated giant capillary loops, microhemorrhages, and progressive capillary loss/avascular areas.",
            "Leading causes of mortality in modern systemic sclerosis are pulmonary complications: Interstitial Lung Disease (SSc-ILD, developing in up to 80% of dcSSc) and Pulmonary Arterial Hypertension (PAH, developing in 10–15% of lcSSc); baseline high-resolution CT of the chest, pulmonary function tests with DLCO, and annual screening echocardiography are mandatory.",
            "Targeted organ-specific pharmacotherapy: dihydropyridine calcium channel blockers (nifedipine) and PDE-5 inhibitors (sildenafil) for Raynaud's and digital ulcers; mycophenolate mofetil or nintedanib for active SSc-ILD; oral captopril for scleroderma renal crisis; and ERA/PDE-5i combinations for pulmonary arterial hypertension."
        ],
        "mcq_angles": [
            "Antibody-phenotype correlations: Anti-Scl-70 predicts interstitial lung disease; anti-centromere predicts late pulmonary arterial hypertension; anti-RNA polymerase III predicts scleroderma renal crisis.",
            "Leading causes of death: pulmonary involvement (SSc-ILD and PAH) has surpassed renal crisis as the primary cause of scleroderma mortality.",
            "Diagnostic utility of nailfold capillaroscopy: detects giant enlarged capillary loops and avascular drop-out areas, distinguishing primary Raynaud from secondary autoimmune systemic sclerosis."
        ],
        "case_hooks": [
            "A 42-year-old woman presenting with severe cold-induced digital triphasic color changes, sclerodactyly of both hands, facial telangiectasias, and positive anti-centromere antibodies.",
            "A 38-year-old woman with diffuse cutaneous scleroderma and anti-Scl-70 antibodies presenting with progressive exertional dyspnea and bibasilar crackles, whose HRCT shows non-specific interstitial pneumonia (NSIP)."
        ],
        "uncertainties": [
            "Therapeutic role and patient selection criteria for autologous hematopoietic stem cell transplantation (HSCT) in severe, rapidly progressive diffuse systemic sclerosis.",
            "Clinical utility of novel antifibrotic and anti-IL-6 combinations in slowing multi-organ dermal and pulmonary fibrosis."
        ]
    },

    "Systemic lupus erythematosus biologic therapy": {
        "mentor_intro": "Biologic therapies in systemic lupus erythematosus (SLE) provide targeted immunosuppression directed at pathogenic B-cell survival factors and type I interferon signaling pathways. Integrating approved biologics alongside conventional synthetic therapy enables corticosteroid minimization and durable clinical remission.",
        "teaching_points": [
            "Belimumab—a fully human monoclonal antibody that binds and neutralizes soluble B-lymphocyte stimulator (BLyS / BAFF)—was the first targeted biologic approved for active autoantibody-positive SLE; it inhibits B-cell survival and differentiation, significantly reducing SLE disease flares and corticosteroid requirements (BLISS trials).",
            "In active lupus nephritis (LN), the landmark BLISS-LN trial demonstrated that adding belimumab to standard induction therapy (mycophenolate mofetil or cyclophosphamide) significantly improved primary efficacy renal response and reduced the risk of renal-related events or death.",
            "Anifrolumab—a fully human monoclonal antibody targeting the type I interferon receptor subunit 1 (IFNAR1)—blocks the downstream biological activity of all type I interferons (IFN-alpha, IFN-beta); the TULIP trials established that anifrolumab significantly improves composite skin and musculoskeletal disease activity in active moderate-to-severe SLE.",
            "Rituximab (anti-CD20 monoclonal antibody) is utilized off-label as evidence-based therapy for severe, refractory lupus manifestations: refractory Class III/IV lupus nephritis, severe immune thrombocytopenia (ITP), autoimmune hemolytic anemia (AIHA), and central nervous system neuropsychiatric lupus.",
            "Targeted biologic therapy allows substantial glucocorticoid minimization: international EULAR guidelines establish a clinical target of tapering maintenance prednisone to <=5 mg/day (or complete withdrawal) to prevent irreversible cumulative organ damage."
        ],
        "mcq_angles": [
            "Belimumab molecular target: binds soluble B-lymphocyte stimulator (BLyS/BAFF) to inhibit autoreactive B-cell survival and autoantibody production.",
            "Anifrolumab mechanism of action: blocks type I interferon receptor subunit 1 (IFNAR1), dampening the pathogenic interferon gene signature in SLE.",
            "BLISS-LN trial clinical impact: adding belimumab to standard induction therapy improves complete renal response and slows renal function decline in lupus nephritis."
        ],
        "case_hooks": [
            "A 32-year-old woman with active SLE experiencing persistent polyarthritis, malar rash, and positive anti-dsDNA despite hydroxychloroquine and methotrexate, started on IV belimumab.",
            "A 28-year-old woman with refractory biopsy-proven Class IV lupus nephritis on mycophenolate mofetil and prednisone who receives add-on B-cell depletion with rituximab."
        ],
        "uncertainties": [
            "Efficacy of dual B-cell targeted therapy (sequential rituximab followed by belimumab) in preventing compensatory BLyS surges and sustaining remission in severe lupus nephritis.",
            "Risk of herpes zoster reactivation during anifrolumab therapy and optimal timing for recombinant zoster vaccination (Shingrix)."
        ]
    },

    "Systemic sclerosis interstitial lung disease": {
        "mentor_intro": "Systemic sclerosis-associated interstitial lung disease (SSc-ILD) is the leading cause of mortality in systemic sclerosis, affecting up to 80% of patients on imaging. Early screening with high-resolution chest CT and pulmonary function tests guides timely combination immunosuppression and antifibrotic therapy.",
        "teaching_points": [
            "Interstitial lung disease (ILD) occurs in both diffuse and limited cutaneous systemic sclerosis, with the highest prevalence and most rapid progression occurring in patients with dcSSc, male sex, older age, and anti-topoisomerase I (anti-Scl-70) autoantibodies.",
            "High-resolution CT (HRCT) of the chest is mandatory at baseline for all patients with systemic sclerosis; the predominant radiological and histological pattern in SSc-ILD is Non-Specific Interstitial Pneumonia (NSIP, present in 70–80%), characterized by bilateral, symmetric, basilar ground-glass opacities with traction bronchiectasis and relative subpleural sparing; UIP pattern occurs in 15–20%.",
            "The Scleroderma Lung Study I and II (SLS I and II) established Mycophenolate Mofetil (MMF, target 2 to 3 g daily) as the preferred first-line immunosuppressive agent for active SSc-ILD, demonstrating equivalent stabilization of forced vital capacity (FVC) with vastly superior safety and tolerability compared to oral cyclophosphamide.",
            "In patients with progressive fibrosing SSc-ILD, the landmark SENSCIS trial demonstrated that adding the antifibrotic tyrosine kinase inhibitor nintedanib (150 mg twice daily) to baseline therapy significantly reduced the annual rate of decline in FVC by 44% (annual decline of -52.4 mL/year with nintedanib vs -93.3 mL/year with placebo, P=0.04).",
            "The anti-IL-6 receptor antagonist tocilizumab (focuSSced trial) demonstrated preservation of lung function in patients with early diffuse cutaneous SSc with elevated inflammatory markers, earning regulatory approval for slowing FVC decline in SSc-ILD."
        ],
        "mcq_angles": [
            "Predominant HRCT pattern in SSc-ILD: Non-Specific Interstitial Pneumonia (NSIP) with bilateral basal ground-glass opacities and subpleural sparing, contrasting with idiopathic pulmonary fibrosis (UIP).",
            "First-line immunosuppressive of choice: mycophenolate mofetil (MMF) is the preferred standard first-line agent based on the Scleroderma Lung Study II.",
            "SENSCIS trial landmark outcome: nintedanib (antifibrotic TKI) significantly reduces the annual rate of FVC decline in systemic sclerosis-associated ILD."
        ],
        "case_hooks": [
            "A 46-year-old woman with newly diagnosed diffuse systemic sclerosis and anti-Scl-70 antibodies whose baseline HRCT demonstrates bibasilar ground-glass opacities with an FVC of 72% predicted.",
            "A 52-year-old woman with SSc-ILD on maintenance mycophenolate mofetil who exhibits a 6% decline in FVC over 12 months, evaluated for combination therapy with nintedanib."
        ],
        "uncertainties": [
            "Optimal threshold for combining upfront immunosuppression (MMF) with antifibrotic therapy (nintedanib) versus sequential add-on upon documented FVC progression.",
            "Role of cyclophosphamide rescue followed by autologous stem cell transplantation in rapidly progressive SSc-ILD refractory to MMF."
        ]
    },

    "T-Cell Lymphomas in Oncology": {
        "mentor_intro": "Peripheral T-cell lymphomas (PTCL) and Cutaneous T-cell lymphomas (CTCL) are rare, heterogeneous non-Hodgkin lymphomas arising from mature post-thymic T lymphocytes and natural killer cells. Characterized by aggressive clinical behavior and poorer outcomes than B-cell lymphomas, personalized immunophenotypic and molecular classification dictates therapy.",
        "teaching_points": [
            "Peripheral T-cell lymphomas (PTCL) represent approximately 10–15% of all non-Hodgkin lymphomas, comprising major clinical subtypes: Peripheral T-cell lymphoma not otherwise specified (PTCL-NOS), Angioimmunoblastic T-cell lymphoma (AITL), and Anaplastic Large Cell Lymphoma (ALCL, ALK-positive vs ALK-negative).",
            "ALK status in systemic anaplastic large cell lymphoma (ALCL) is the single most important prognostic factor: ALK-positive ALCL (driven by the t(2;5) translocation fusing NPM1 and ALK genes) occurs in younger patients and carries a favorable 5-year overall survival (>70–80%), whereas ALK-negative ALCL carries a significantly poorer prognosis.",
            "The landmark ECHELON-2 randomized trial established frontline therapy for CD30-expressing peripheral T-cell lymphomas: brentuximab vedotin (an antibody-drug conjugate targeting CD30 linked to monomethyl auristatin E) combined with cyclophosphamide, doxorubicin, and prednisone (A+CHP) significantly improved progression-free survival and overall survival compared with standard CHOP chemotherapy.",
            "For fit patients with nodal PTCL (excluding ALK-positive ALCL) achieving a complete first remission, consolidation with high-dose chemotherapy and autologous stem cell transplantation (ASCT) is guideline-recommended to prevent early relapse.",
            "Cutaneous T-cell lymphoma (CTCL—predominantly Mycosis Fungoides and Sezary Syndrome) presents with cutaneous patches, plaques, and tumors; Sezary syndrome is the leukemic variant characterized by the triad of erythroderma, generalized lymphadenopathy, and circulating clonally identical neoplastic T cells with cerebriform nuclei ('Sezary cells') in peripheral blood, treated with targeted agents like mogamulizumab (anti-CCR4)."
        ],
        "mcq_angles": [
            "ECHELON-2 trial landmark finding: brentuximab vedotin plus CHP (A+CHP) is superior to CHOP for CD30-positive peripheral T-cell lymphomas (including ALCL).",
            "Prognostic impact of ALK translocation in ALCL: ALK-positive ALCL carries an excellent prognosis with high cure rates compared to ALK-negative disease.",
            "Sezary syndrome clinical triad: pruritic erythroderma covering >80% BSA, generalized lymphadenopathy, and circulating malignant T-cells with cerebriform nuclei."
        ],
        "case_hooks": [
            "A 28-year-old man presenting with B symptoms, bulky cervical lymphadenopathy, and biopsy confirming CD30-positive, ALK-positive systemic anaplastic large cell lymphoma.",
            "A 64-year-old man presenting with extensive cutaneous erythema, pruritus, diffuse lymphadenopathy, and 25% atypical lymphocytes with cerebriform nuclei on peripheral smear."
        ],
        "uncertainties": [
            "Efficacy of targeted epigenetic therapies (histone deacetylase inhibitors romidepsin, belinostat; and DNA methyltransferase inhibitors) in angioimmunoblastic T-cell lymphoma.",
            "Role of allogeneic stem cell transplantation versus novel targeted CAR-T cellular therapies in relapsed/refractory peripheral T-cell lymphoma."
        ]
    },

    "TB screening": {
        "mentor_intro": "Tuberculosis (TB) screening aims to identify active tuberculosis disease and detect latent tuberculosis infection (LTBI) in individuals at high risk of disease reactivation. Targeted screening of immunocompromised hosts, healthcare workers, contacts, and immigrants prevents transmission and clinical disease.",
        "teaching_points": [
            "Screening for Latent Tuberculosis Infection (LTBI) is indicated prior to initiating biologic therapies (especially TNF-alpha inhibitors), before solid organ or stem cell transplantation, in HIV infection, in close contacts of active pulmonary TB cases, and in recent immigrants from high-incidence countries.",
            "Diagnostic tests for LTBI include Interferon-Gamma Release Assays (IGRAs: QuantiFERON-TB Gold Plus, T-SPOT.TB) and the Tuberculin Skin Test (TST / Mantoux test); IGRAs measure in vitro interferon-gamma release by T cells stimulated with specific M. tuberculosis antigens (ESAT-6 and CFP-10).",
            "IGRAs possess significantly superior diagnostic specificity (>95%) compared to TST in individuals who have received the Bacillus Calmette-Guerin (BCG) vaccine, as ESAT-6 and CFP-10 antigens are absent from the BCG vaccine strain and most non-tuberculous mycobacteria (NTM), eliminating false-positive BCG cross-reactions.",
            "Tuberculin skin test (TST) interpretation criteria for induration at 48 to 72 hours: >=5 mm is positive in high-risk individuals (HIV-positive, recent TB contacts, organ transplant, immunosuppressed on prednisone >=15 mg/day); >=10 mm is positive in moderate-risk individuals (recent immigrants <5 years, IV drug users, healthcare workers, diabetic/ESRD); >=15 mm is positive in low-risk individuals with no known risk factors.",
            "Any positive IGRA or TST mandates a chest radiograph and systematic symptom evaluation to strictly exclude active pulmonary tuberculosis before initiating LTBI treatment; modern preferred LTBI regimens include short-course rifamycin-based therapies: 3 months of once-weekly oral rifapentine plus isoniazid (3HP), 4 months of daily rifampin (4R), or 3 months of daily isoniazid plus rifampin (3HR)."
        ],
        "mcq_angles": [
            "IGRA advantage over TST: IGRAs do not cross-react with BCG vaccination, providing high specificity in BCG-vaccinated populations.",
            "Mandatory step following positive LTBI screening: perform chest radiography to rule out active pulmonary tuberculosis before commencing preventive therapy.",
            "Preferred short-course LTBI treatment regimen: 3 months of once-weekly rifapentine plus isoniazid (3HP) or 4 months of daily rifampin (4R), replacing legacy 9-month isoniazid monotherapy."
        ],
        "case_hooks": [
            "A 32-year-old healthcare worker born in an endemic country with childhood BCG vaccination undergoing pre-employment screening with a positive QuantiFERON test and normal chest X-ray.",
            "A 45-year-old woman with severe Crohn's disease undergoing pre-biologic screening before initiating infliximab therapy."
        ],
        "uncertainties": [
            "Diagnostic reliability and indeterminate rate of IGRAs in patients with severe peripheral lymphopenia (CD4 count <100/uL).",
            "Optimal screening frequency and cost-effectiveness of annual serial IGRA testing in healthcare workers in low-incidence settings."
        ]
    },

    "TKI cardiotoxicity": {
        "mentor_intro": "Tyrosine kinase inhibitors (TKIs) utilized in oncology and hematology can induce target-specific and off-target cardiotoxicity. Manifestations encompass hypertension, left ventricular systolic dysfunction, QT prolongation, and arterial occlusive vascular events, mandating baseline and serial cardio-oncology surveillance.",
        "teaching_points": [
            "VEGF receptor (VEGFR) tyrosine kinase inhibitors (e.g., sunitinib, sorafenib, axitinib, cabozantinib, lenvatinib) commonly induce de novo or worsening hypertension in up to 40–80% of patients; mechanism involves inhibition of vascular endothelial VEGFR-2, reducing endothelial nitric oxide synthase (eNOS) and prostacyclin production while increasing endothelin-1.",
            "VEGFR-TKIs can cause cardiomyopathy and congestive heart failure with left ventricular systolic dysfunction (LVEF decline >=10 percentage points to <50%); baseline echocardiography and blood pressure monitoring (targeting BP <130/80 mmHg using ACEi, ARBs, or dihydropyridine calcium channel blockers) is mandatory.",
            "BCR-ABL tyrosine kinase inhibitors used in chronic myeloid leukemia (CML) exhibit distinct cardiotoxic profiles: Ponatinib (third-generation TKI) is associated with severe arterial occlusive events (myocardial infarction, stroke, limb ischemia in up to 20–30% of patients); Dasatinib carries a unique risk of pre-capillary pulmonary arterial hypertension (PAH) and pleural effusions; Nilotinib accelerates peripheral arterial disease and QT prolongation.",
            "HER2-targeted small molecule TKIs (e.g., lapatinib, tucatinib, neratinib) can induce reversible, non-dose-dependent myocardial dysfunction (Type II cardiotoxicity), typically resolving upon drug withholding and cardioprotective medical therapy (beta-blockers and ACE inhibitors).",
            "Third-generation EGFR-TKIs (specifically osimertinib in non-small cell lung cancer) carry a documented risk of QTc prolongation, cardiomyopathy/heart failure, and atrial fibrillation, warranting baseline and periodic ECG and echocardiographic surveillance."
        ],
        "mcq_angles": [
            "VEGFR inhibitor hypertension mechanism: inhibition of VEGFR-2 signaling suppresses endothelial nitric oxide production and increases systemic vascular resistance.",
            "Ponatinib black-box vascular warning: high incidence of arterial thrombotic occlusive events (stroke, myocardial infarction, peripheral limb ischemia).",
            "Dasatinib specific complication: precapillary pulmonary arterial hypertension (PAH) and large pleural effusions, resolving upon drug cessation."
        ],
        "case_hooks": [
            "A 62-year-old man with metastatic renal cell carcinoma initiating sunitinib whose home blood pressure escalates from 124/78 to 175/105 mmHg within 2 weeks of starting therapy.",
            "A 48-year-old woman with CML on dasatinib 100 mg daily who presents with progressive exertional dyspnea, bilateral pleural effusions, and an elevated estimated pulmonary artery systolic pressure of 65 mmHg on echo."
        ],
        "uncertainties": [
            "Efficacy of prophylactic cardioprotective therapy (carvedilol and enalapril) in preventing TKI-induced left ventricular dysfunction.",
            "Long-term reversibility of ponatinib-associated arterial occlusive microvascular remodeling following dose reduction or discontinuation."
        ]
    },

    "Takayasu's Arteritis": {
        "mentor_intro": "Takayasu's arteritis ('pulseless disease') is a chronic granulomatous large-vessel vasculitis primarily affecting the aorta, its primary branches, and the pulmonary arteries in young females. Transmural inflammation leads to arterial stenosis, occlusion, aneurysm formation, and limb claudication, requiring early immunosuppression.",
        "teaching_points": [
            "Takayasu's arteritis predominantly affects young women (female-to-male ratio 8:1 to 9:1, typically presenting before age 40); transmural granulomatous inflammation of the aorta and major branch vessels leads to marked arterial wall thickening, luminal stenosis, thrombosis, and post-stenotic aneurysm formation.",
            "Clinical presentation classically follows a biphasic course: an initial 'pre-pulseless' systemic inflammatory phase (fever, night sweats, fatigue, arthralgias, weight loss) followed by a late 'pulseless' occlusive vascular phase (upper limb claudication, asymmetric blood pressures [>10 mmHg difference between arms], absent peripheral pulses, carotidynia, vascular bruits, and lightheadedness).",
            "Diagnostic vascular imaging of choice is contrast-enhanced Magnetic Resonance Angiography (MRA) or CT Angiography (CTA) of the entire aorta and its branches, or 18F-FDG PET-CT; imaging demonstrates concentric, circumferential arterial wall thickening, wall edema, delayed contrast enhancement, and luminal stenosis/occlusion.",
            "First-line medical induction therapy is high-dose systemic corticosteroids (prednisone 1 mg/kg/day, typically 40–60 mg daily); however, relapses occur in >50% of patients during steroid tapering, mandating early co-administration of steroid-sparing conventional synthetic immunosuppressants (methotrexate, azathioprine, or leflunomide).",
            "In patients with refractory or relapsing large-vessel vasculitis, biologic therapy with TNF-alpha inhibitors (infliximab, adalimumab) or the IL-6 receptor antagonist tocilizumab demonstrates proven efficacy in achieving sustained clinical remission and arresting arterial structural progression.",
            "Surgical or endovascular revascularization (bypass grafting, percutaneous transluminal angioplasty) must be strictly avoided during active acute vascular inflammation due to catastrophic risks of graft thrombosis, anastomotic disruption, and pseudoaneurysm formation; revascularization should be performed electively only after stable immunosuppressive-induced disease remission is achieved."
        ],
        "mcq_angles": [
            "Surgical timing rule in Takayasu arteritis: vascular revascularization must NEVER be performed during active vascular inflammation; postpone until complete clinical and biochemical remission is achieved.",
            "Physical examination hallmarks: asymmetric blood pressure (>10 mmHg discrepancy between arms), diminished or absent radial pulses, and arterial bruits over carotids, subclavians, or abdominal aorta.",
            "Biologic therapy of choice for refractory disease: TNF-alpha inhibitors (infliximab) or IL-6 receptor blockade (tocilizumab) significantly reduce steroid requirements and vascular progression."
        ],
        "case_hooks": [
            "A 24-year-old woman presenting with fatigue, bilateral arm claudication while blow-drying her hair, and blood pressure 135/85 mmHg in the right arm but 95/60 mmHg in the left arm with a left subclavian bruit.",
            "A 32-year-old woman with known Takayasu arteritis on prednisone whose MRA reveals active concentric wall thickening and delayed enhancement throughout the descending thoracic aorta."
        ],
        "uncertainties": [
            "Diagnostic accuracy of serum biomarkers (e.g., pentraxin-3, matrix metalloproteinases) versus 18F-FDG PET-CT in monitoring subclinical intramural vascular inflammation.",
            "Optimal long-term antithrombotic therapy (antiplatelet vs anticoagulation) in patients with extensive large-vessel stenoses and aneurysms."
        ]
    },

    "Takotsubo cardiomyopathy: diagnostic criteria, management, recurrence": {
        "mentor_intro": "Takotsubo cardiomyopathy (stress-induced cardiomyopathy / 'broken heart syndrome') is a transient acute myocardial syndrome mimicking acute coronary syndrome. Characteristically triggered by severe physical or emotional stressors in postmenopausal women, management focuses on supportive hemodynamics and managing complications.",
        "teaching_points": [
            "Takotsubo cardiomyopathy is characterized by acute, transient left ventricular systolic dysfunction with regional wall motion abnormalities that typically extend beyond the distribution of a single epicardial coronary artery, accompanied by electrocardiographic changes and mild cardiac biomarker elevation mimicking STEMI.",
            "Pathophysiology is mediated by massive sympathetic nervous system activation and a surge in circulating catecholamines, which triggers microvascular coronary spasm, direct myocyte catecholamine toxicity, and functional myocardial stunning via high-affinity beta-2 adrenergic receptor Gs-to-Gi pathway switching.",
            "Diagnostic criteria (InterTAK Diagnostic Criteria / Mayo Clinic criteria) require: (1) Transient LV regional wall motion abnormalities (apical ballooning [classic in 80%], midventricular, basal, or focal variants), (2) Absence of culprit obstructive coronary atherothrombosis or acute plaque rupture on emergency coronary angiography, (3) New ECG abnormalities (ST-segment elevation, T-wave inversion, prolonged QTc), and (4) Modest troponin elevation disproportionately low relative to the extensive extent of LV wall motion dysfunction.",
            "Complications develop in up to 20% of patients and include: left ventricular outflow tract (LVOT) obstruction with dynamic systolic anterior motion (SAM) of the mitral valve, acute cardiogenic shock, apical mural thrombus formation, lethal ventricular arrhythmias (associated with severe QTc prolongation >500 ms), and heart failure.",
            "In patients who develop cardiogenic shock with dynamic LVOT obstruction, inotropes (dobutamine, milrinone, adrenaline) are strictly CONTRAINDICATED as they worsen the intraventricular pressure gradient; management requires IV fluid hydration, beta-blocker titration, and pure alpha-1 vasoconstrictors (phenylephrine or noradrenaline); in refractory shock without LVOT obstruction, mechanical circulatory support (Impella or VA-ECMO) provides hemodynamic rescue."
        ],
        "mcq_angles": [
            "Inotrope contraindication in Takotsubo LVOT obstruction: inotropes (dobutamine) worsen systolic anterior motion (SAM) and intraventricular pressure gradients; beta-blockers and gentle fluids are indicated.",
            "InterTAK diagnostic feature: troponin elevation is characteristically modest and disproportionately small relative to the substantial degree of left ventricular akinesia.",
            "Prognosis and recovery: ventricular systolic function typically recovers completely to normal (LVEF >50–60%) within 4 to 8 weeks in surviving patients."
        ],
        "case_hooks": [
            "A 68-year-old woman presenting with acute chest pain, 3 mm ST elevation in V2-V5, and severe apical ballooning on echo 4 hours after learning of her husband's sudden death, whose emergency angiogram reveals normal coronary arteries.",
            "A 72-year-old woman with acute Takotsubo cardiomyopathy who develops hypotension, a new harsh late-systolic murmur at the left sternal border, and a peak LVOT gradient of 65 mmHg on echocardiography."
        ],
        "uncertainties": [
            "Efficacy of chronic long-term beta-blocker or ACE inhibitor therapy in preventing late recurrences (recurrence rate approx. 1-2% per year).",
            "Optimal duration of prophylactic therapeutic anticoagulation in patients with severe apical ballooning and akinesia to prevent apical thrombus formation."
        ]
    },

    "Targeted Therapy Principles": {
        "mentor_intro": "Targeted cancer therapy utilizes drugs designed to interfere with specific molecular pathways, mutated oncoproteins, or cell-surface receptors driving tumor growth and survival. Understanding predictive biomarkers, mechanism of action, and secondary resistance mechanisms forms the core of modern precision oncology.",
        "teaching_points": [
            "Targeted therapies are broadly categorized into two major pharmacological classes: (1) Small-molecule inhibitors (suffix '-nib': e.g., osimertinib, imatinib), which are orally bioavailable and penetrate the cell membrane to inhibit intracellular kinase catalytic domains, and (2) Monoclonal antibodies (suffix '-mab': e.g., trastuzumab, rituximab, cetuximab), which are large macromolecules administered intravenously that bind extracellular cell-surface receptors or circulating ligands.",
            "Therapy must be guided by validated predictive biomarkers: testing must confirm the presence of the specific molecular target before drug administration (e.g., EGFR exon 19 deletions / L858R for osimertinib; BRAF V600E mutations for dabrafenib; HER2 overexpression/amplification for trastuzumab; BCR-ABL1 fusion for imatinib).",
            "Targeted therapies exhibit a fundamentally different toxicity profile compared with cytotoxic chemotherapy: instead of alopecia and myelosuppression, adverse effects are mechanism-specific (e.g., acneiform papulopustular skin rash and diarrhea with EGFR inhibitors; hypertension, proteinuria, and impaired wound healing with VEGF inhibitors; hepatotoxicity with multi-kinase TKIs).",
            "Secondary acquired resistance inevitably develops through Darwinian clonal selection: mechanisms include on-target secondary gatekeeper mutations in the kinase domain (e.g., EGFR T790M or C797S mutations, BCR-ABL T315I mutation), bypass signaling pathway activation (MET amplification in EGFR-mutant lung cancer), phenotypic histological transformation (adenocarcinoma to small-cell lung cancer), or loss of target expression.",
            "Antibody-Drug Conjugates (ADCs—e.g., trastuzumab deruxtecan [T-DXd], sacituzumab govitecan) combine the antigen-specificity of a monoclonal antibody with the cytotoxic potency of a membrane-permeable payload (topoisomerase I inhibitor or microtubule disruptor) via a cleavable linker, exerting potent 'bystander killing' on neighboring antigen-negative tumor cells."
        ],
        "mcq_angles": [
            "Small molecule versus monoclonal antibody distinction: small molecules ('-nib') inhibit intracellular catalytic domains; monoclonal antibodies ('-mab') bind extracellular surface receptors or circulating ligands.",
            "EGFR inhibitor class toxicity: papulopustular acneiform rash, paronychia, and diarrhea; rash severity positively correlates with therapeutic tumor response.",
            "Antibody-Drug Conjugate (ADC) bystander effect: membrane-permeable cytotoxic payloads diffuse out of the targeted cell to destroy adjacent heterogeneous tumor cells lacking target expression."
        ],
        "case_hooks": [
            "A 54-year-old non-smoking woman with metastatic lung adenocarcinoma whose tumor next-generation sequencing reveals an EGFR exon 19 deletion, initiated on first-line osimertinib.",
            "A 60-year-old woman with metastatic HER2-low breast cancer receiving trastuzumab deruxtecan who achieves a partial tumor response."
        ],
        "uncertainties": [
            "Optimal sequencing of next-generation covalent allosteric inhibitors versus antibody-drug conjugates following progression on frontline targeted therapies.",
            "Role of serial circulating tumor DNA (ctDNA) liquid biopsies in preemptively detecting emergent resistance mutations prior to radiographic progression."
        ]
    },

    "Targeted temperature management after cardiac arrest": {
        "mentor_intro": "Targeted temperature management (TTM) is a core neuroprotective strategy for comatose survivors of cardiac arrest. landmark trials have established that preventing fever and maintaining strict normothermia (36.0 to 37.5 C) provides neurological outcomes and survival equivalent to hypothermia (33 C).",
        "teaching_points": [
            "Targeted temperature management (TTM) is indicated for adult patients who remain comatose (unresponsive or not following commands) after return of spontaneous circulation (ROSC) following out-of-hospital or in-hospital cardiac arrest, regardless of initial cardiac rhythm.",
            "The landmark TTM2 randomized controlled trial (1,900 patients) demonstrated that targeted hypothermia at 33 C did NOT reduce all-cause mortality or improve functional neurological outcomes at 6 months compared with targeted normothermia (maintaining core temperature <=37.5 C with active device warming/cooling), while hypothermia caused significantly higher rates of cardiac arrhythmias requiring intervention.",
            "Current international guidelines (ILCOR, AHA, ERC) recommend maintaining a constant target temperature between 32.0 C and 37.5 C for at least 24 hours post-ROSC; active prevention and treatment of fever (temperature >=37.8 C) is mandatory for at least 72 hours post-cardiac arrest.",
            "Temperature control must be achieved using dedicated closed-loop feedback systems (intravascular cooling catheters or surface cooling pads with automated water circulation) coupled to continuous core temperature monitoring (esophageal, bladder, or intravascular probe).",
            "Multimodal neuroprognostication must be delayed until at least 72 hours post-arrest (or 72 hours after rewarming/normothermia) to avoid confounding by sedatives and hypothermia: evaluating bilateral absent pupillary and corneal reflexes, bilaterally absent N20 somatosensory evoked potential (SSEP) waves, high serum neuron-specific enolase (NSE >60 ug/L at 48-72h), and status myoclonus."
        ],
        "mcq_angles": [
            "TTM2 trial landmark outcome: hypothermia at 33 C does NOT improve survival or neurological recovery compared to targeted normothermia (<=37.5 C) in post-cardiac arrest coma.",
            "Fever prevention duration: actively prevent fever (temperature >=37.8 C) for at least 72 hours post-ROSC in comatose cardiac arrest patients.",
            "Neuroprognostication timing standard: multimodal neurological prognostication must be deferred until at least 72 hours after cardiac arrest to prevent premature withdrawal of life-sustaining therapy."
        ],
        "case_hooks": [
            "A 56-year-old man resuscitated from out-of-hospital ventricular fibrillation arrest who remains intubated and comatose (GCS 3T) in the ICU, placed on an automated surface cooling feedback protocol set to 36.5 C.",
            "A 62-year-old comatose cardiac arrest patient at 72 hours post-ROSC evaluated with SSEP, EEG, and serum neuron-specific enolase."
        ],
        "uncertainties": [
            "Subgroup benefits of deeper hypothermia (33 C) in specific high-severity arrest phenotypes (e.g., prolonged downtime or severe post-ischemic brain swelling).",
            "Optimal rewarming speed and shivering control protocols during automated temperature feedback management."
        ]
    },

    "Temporal lobe epilepsy: mesial temporal sclerosis, anterior temporal lobectomy": {
        "mentor_intro": "Temporal lobe epilepsy (TLE) is the most common form of drug-resistant focal epilepsy in adults, frequently caused by mesial temporal sclerosis (MTS). In patients with medically refractory TLE, early surgical intervention with anterior temporal lobectomy achieves long-term seizure freedom and stops cognitive decline.",
        "teaching_points": [
            "Mesial temporal sclerosis (MTS / hippocampal sclerosis) is the most frequent underlying structural pathology in temporal lobe epilepsy, pathologically characterized by selective neuronal loss and severe astrogliosis in the CA1 and CA4 subfields and dentate gyrus of the hippocampus with relative preservation of CA2.",
            "High-resolution epilepsy-protocol MRI is the definitive imaging modality, characteristically demonstrating hippocampal volume loss (atrophy) on T1-weighted sequences and hyperintensity on T2-weighted and FLAIR sequences.",
            "Classic clinical semiology features an epigastric rising aura ('butterflies in stomach'), psychic auras (deja vu, jamais vu, intense fear), olfactory/gustatory hallucinations, followed by behavioral arrest, staring, prominent oroalimentary automatisms (lip smacking, chewing, swallowing), manual automatisms (fumbling, picking), and contralateral dystonic limb posturing.",
            "Drug-resistant epilepsy is defined as failure of adequate trials of two tolerated and appropriately chosen antiseizure medications (as monotherapy or in combination) to achieve sustained seizure freedom; in drug-resistant temporal lobe epilepsy, early surgical referral should not be delayed.",
            "In the landmark randomized controlled trial by Wiebe et al. (NEJM), anterior temporal lobectomy (ATL) combined with medical therapy was vastly superior to continued medical therapy alone, achieving complete seizure freedom in 58% of surgically treated patients compared with only 8% in the medical group (P<0.001); superior quadrantanopia ('pie in the sky' visual field defect) is an expected postoperative anatomical risk due to disruption of Meyer's loop."
        ],
        "mcq_angles": [
            "Wiebe et al. trial landmark finding: anterior temporal lobectomy achieves significantly superior seizure freedom (~58% vs 8%) over continued medical therapy in drug-resistant TLE.",
            "Postoperative visual field complication of anterior temporal lobectomy: contralateral superior quadrantanopia ('pie in the sky' defect) caused by disruption of Meyer's loop in temporal white matter.",
            "MRI hallmark of mesial temporal sclerosis: unilateral hippocampal atrophy on T1 and increased signal hyperintensity on T2/FLAIR images."
        ],
        "case_hooks": [
            "A 28-year-old woman with a childhood history of prolonged febrile seizures presenting with rising epigastric auras, lip-smacking automatisms, and refractory seizures despite levetiracetam and lamotrigine.",
            "A 34-year-old man who achieves complete seizure freedom following left anterior temporal lobectomy, undergoing routine post-surgical visual field perimetry."
        ],
        "uncertainties": [
            "Comparative cognitive and verbal memory outcomes of selective amygdalohippocampectomy or MRI-guided laser interstitial thermal therapy (LITT) versus open anterior temporal lobectomy.",
            "Long-term psychiatric outcomes (depression, anxiety, psychosis) following successful temporal lobe resection."
        ]
    },

    "Tension-type headache: tricyclic antidepressants, lifestyle interventions": {
        "mentor_intro": "Tension-type headache (TTH) is the most prevalent neurological primary headache disorder worldwide. Characterized by bilateral, non-pulsatile, pressing or tightening pain without migraine-associated features, management combines acute simple analgesics with prophylactic tricyclic antidepressants and behavioral lifestyle modifications.",
        "teaching_points": [
            "International Headache Society (ICHD-3) diagnostic criteria for tension-type headache require at least two of the following pain characteristics: bilateral location, pressing or tightening (non-pulsatile) quality, mild-to-moderate intensity, and not aggravated by routine physical activity (walking, climbing stairs).",
            "TTH is strictly differentiated from migraine by the absence of severe nausea or vomiting and the presence of no more than one of photophobia or phonophobia; it is divided chronologically into episodic TTH (<15 days per month) and chronic TTH (>=15 days per month for >3 months).",
            "First-line acute abortive therapy consists of simple analgesics: ibuprofen (400 mg), paracetamol (acetaminophen 1,000 mg), or naproxen (500 mg); acute medication use must be limited to <=2 days per week (or <10–15 days per month) to prevent the development of secondary medication overuse headache (MOH).",
            "Amitriptyline (titrated from 10 mg at bedtime up to 25–75 mg daily) is the guideline-recommended first-line pharmacological prophylactic therapy for chronic and high-frequency episodic TTH, reducing headache frequency and duration by modulating central descending pain inhibition pathways; second-line alternatives include mirtazapine and venlafaxine.",
            "Non-pharmacological and lifestyle interventions are foundational: stress management, biofeedback, cognitive behavioral therapy, acupuncture, physical therapy for pericranial muscle tenderness, regular sleep hygiene, and physical exercise all achieve significant reductions in headache frequency."
        ],
        "mcq_angles": [
            "ICHD-3 differentiation from migraine: TTH is bilateral, pressing/tightening, not worsened by routine physical activity, and lacks nausea/vomiting.",
            "First-line prophylactic pharmacotherapy for chronic TTH: low-dose amitriptyline (tricyclic antidepressant) taken at bedtime.",
            "Medication overuse headache prevention: restrict acute analgesic intake to fewer than 10 to 15 days per month to avoid refractory secondary analgesic rebound headaches."
        ],
        "case_hooks": [
            "A 36-year-old office worker presenting with daily, bilateral, band-like dull headache that tightens around the forehead and occiput without nausea, present 20 days per month for 6 months.",
            "A 42-year-old woman with chronic TTH who consumes over-the-counter paracetamol and codeine combinations daily, presenting with refractory morning headaches."
        ],
        "uncertainties": [
            "Efficacy of pericranial trigger point injections with local anesthetics or botulinum toxin in refractory chronic tension-type headache.",
            "Comparative long-term adherence and efficacy of digital app-based mindfulness cognitive therapy versus daily tricyclic antidepressant prophylaxis."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(BATCH_05_TOPICS)} topics in Batch 5.")
    for name, data in BATCH_05_TOPICS.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 25 topics in Batch 5 pass 100% of structural and depth criteria!")
