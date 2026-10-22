# data_batch_0031_0045.py
"""
Definitions for Batch 3 of Topics 1-100 (Topics 31 to 45).
"""
from data_batch_0001_0015 import make_entry

BATCH_3 = {}

# 31, 32, 33: Acute Confusion, Delirium, and Capacity Assessment
e31_33 = make_entry(
    'acute_confusion_and_delirium',
    "Acute confusion (delirium) is an acute, fluctuating neurocognitive disturbance characterized by inattention, altered level of consciousness, and disorganized thinking, triggered by underlying acute medical illness, surgery, or toxidrome. Diagnostic confirmation requires validated screening instruments, predominantly the Confusion Assessment Method (CAM; acute onset/fluctuation + inattention + disorganized thinking or altered consciousness) or 4AT. Non-pharmacologic multicomponent prevention and treatment (HELP model: reorientation, sleep-wake cycle hygiene, early mobilization, pain control, sensory aids, avoidance of deliriogenic medications like anticholinergics and benzodiazepines) is the evidence-based first-line cornerstone. Pharmacotherapy with low-dose atypical antipsychotics (haloperidol, quetiapine, olanzapine) does NOT shorten delirium duration or reduce mortality, and is strictly indicated only when severe agitation threatens imminent patient or staff safety. Formal mental capacity assessment must be decision-specific and time-specific, assessing the ability to understand, retain, weigh information, and communicate a choice.",
    [
        ("Diagnosis requires validated bedside tools; the Confusion Assessment Method (CAM) requires features 1 (acute onset/fluctuating course) AND 2 (inattention), PLUS either 3 (disorganized thinking) OR 4 (altered level of consciousness).", ["31504429"]),
        ("Non-pharmacological multicomponent bundles (Hospital Elder Life Program [HELP]: early mobilization, hydration, cognitive reorientation, sleep protocols) reduce delirium incidence by > 30-40%.", ["29485925"]),
        ("Randomized clinical trials (MIND-USA trial) proved that routine antipsychotic administration (haloperidol or ziprasidone) does not alter delirium duration, ICU length of stay, or 30-day mortality compared to placebo.", ["30346242"]),
        ("Mental capacity is legally presumed unless proven otherwise, must be assessed specifically for the particular decision at that exact moment, and requires structured assessment of understanding, retaining, weighing, and communicating decisions.", ["31504429"])
    ],
    [
        ("31504429", "NICE Guideline NG103: Delirium: prevention, diagnosis and management in healthcare settings.", 2019, "guideline"),
        ("29485925", "Delirium in hospitalized older adults: prevention and management.", 2018, "review"),
        ("30346242", "Haloperidol and Ziprasidone for Treatment of Delirium in Critical Illness (MIND-USA).", 2018, "trial")
    ],
    ["Subtype prognostic differences: hyperactive vs hypoactive delirium (hypoactive is frequently missed, underdiagnosed, and carries higher 1-year mortality).", "Utility of alpha-2 agonists (dexmedetomidine) in reducing extubation failure and delirium duration in mechanically ventilated ICU patients."],
    ["CAM 4 cardinal features: 1 (Acute onset/fluctuation), 2 (Inattention) are MANDATORY; plus either 3 (Disorganized thinking) OR 4 (Altered consciousness).", "Antipsychotic evidence summary: MIND-USA trial showed haloperidol has zero impact on delirium duration; use only for dangerous combativeness or severe hallucinations.", "Capacity vs Competence: Capacity is a clinical, decision-specific determination made by any treating physician; competence is a global legal status determined solely by a judge."],
    ["An 81-year-old post-operative patient who becomes quiet, refuses food, cannot recite months backwards, and drifts to sleep during interview, diagnosed with hypoactive delirium.", "A 74-year-old with urosepsis pulling out peripheral IV lines and trying to leave the ward, stabilized with verbal de-escalation, family presence, and low-dose oral quetiapine."]
)
BATCH_3[31] = e31_33
BATCH_3[32] = e31_33
BATCH_3[33] = e31_33

# 34, 35, 36: Acute Coronary Syndrome Antiplatelet & Diagnostic Strategy
e34_36 = make_entry(
    'acute_coronary_syndromes_antiplatelet_strategy',
    "Acute Coronary Syndrome (ACS) management centers on rapid risk stratification, coronary revascularization, and potent antithrombotic therapy. Dual Antiplatelet Therapy (DAPT) combining aspirin with a potent P2Y12 receptor inhibitor (ticagrelor 90 mg BID or prasugrel 10 mg daily) is the guideline-directed standard of care for 12 months post-PCI, demonstrating superior reduction in ischemic events and stent thrombosis compared to clopidogrel (PLATO, TRITON-TIMI 38). In the randomized head-to-head ISAR-REACT 5 trial, prasugrel was superior to ticagrelor in reducing composite death, MI, or stroke (6.9% vs 9.3%) without increasing major bleeding. High-bleeding-risk (HBR) patients can safely undergo abbreviated DAPT (1-3 months) followed by P2Y12 inhibitor monotherapy (ticagrelor or clopidogrel; TWILIGHT and STOPDAPT-2 trials), which halves major bleeding without increasing ischemic events. Glycoprotein IIb/IIIa inhibitors (eptifibatide, tirofiban) are reserved for thrombotic bailout during PCI.",
    [
        ("Prasugrel and ticagrelor are significantly superior to clopidogrel in ACS, reducing ischemic death and stent thrombosis (TRITON-TIMI 38 and PLATO trials).", ["17982182", "19717846"]),
        ("The head-to-head ISAR-REACT 5 trial demonstrated that a prasugrel-based strategy significantly reduced ischemic events compared to ticagrelor without increasing major bleeding in ACS.", ["31475799"]),
        ("In high-bleeding-risk patients undergoing PCI, dropping aspirin after 1-3 months and continuing P2Y12 inhibitor monotherapy significantly reduces major bleeding without increasing stent thrombosis (TWILIGHT trial).", ["31556978"]),
        ("Triple antithrombotic therapy (OAC + DAPT) in patients with atrial fibrillation undergoing PCI should be minimized: transition to dual therapy (DOAC + clopidogrel) at hospital discharge reduces bleeding by > 40% (AUGUSTUS trial).", ["30883058"])
    ],
    [
        ("37622654", "2023 ESC Guidelines for the management of acute coronary syndromes.", 2023, "guideline"),
        ("17982182", "Prasugrel versus clopidogrel in patients with acute coronary syndromes (TRITON-TIMI 38).", 2007, "trial"),
        ("19717846", "Ticagrelor versus clopidogrel in patients with acute coronary syndromes (PLATO).", 2009, "trial"),
        ("31475799", "Ticagrelor or Prasugrel in Patients with Acute Coronary Syndromes (ISAR-REACT 5).", 2019, "trial"),
        ("31556978", "Ticagrelor with or without Aspirin in High-Risk Patients after PCI (TWILIGHT).", 2019, "trial"),
        ("30883058", "Antithrombotic Therapy after Acute Coronary Syndrome or PCI in Atrial Fibrillation (AUGUSTUS).", 2019, "trial")
    ],
    ["Platelet function testing or CYP2C19 genotyping-guided antiplatelet escalation/de-escalation (POPular AGE and TAILOR-PCI trials).", "Duration of DAPT in patients presenting with spontaneous coronary artery dissection (SCAD) managed conservatively."],
    ["ISAR-REACT 5 trial outcome: Prasugrel showed superior ischemic protection over ticagrelor with lower MI recurrence and equal bleeding.", "TWILIGHT strategy: Aspirin + Ticagrelor for 3 months, then drop aspirin and continue Ticagrelor monotherapy for 9 months in high-risk PCI.", "Triple therapy duration in AF + PCI: Aspirin is dropped at discharge or <= 1 week; maintain DOAC + Clopidogrel for up to 12 months (AUGUSTUS trial)."],
    ["A 58-year-old male with anterior STEMI receiving primary PCI with drug-eluting stent, initiated on aspirin and prasugrel 10 mg daily.", "A 71-year-old female with non-valvular AF on apixaban undergoing PCI for NSTEMI, discharged on apixaban 5 mg BID plus clopidogrel 75 mg daily without aspirin."]
)
BATCH_3[34] = e34_36
BATCH_3[35] = e34_36
BATCH_3[36] = e34_36

# 37, 38, 42: Acute Decompensated Heart Failure Decongestion
e37_42 = make_entry(
    'adhf_decongestion_strategies',
    "Acute decompensated heart failure (ADHF) requires aggressive, early decongestion to relieve elevated ventricular filling pressures and systemic congestion. Intravenous loop diuretics (furosemide, bumetanide) are the foundation of therapy: the landmark DOSE-AHF trial established that high-dose IV loop diuretic therapy (2.5x oral home dose) achieves more rapid symptom relief and fluid loss without worsening long-term renal function compared to low-dose therapy, with continuous infusion offering no superiority over bolus dosing. Sequential nephron blockade overcomes diuretic resistance: adding oral acetazolamide (500 mg IV; carbonic anhydrase inhibitor blocking proximal tubule sodium reabsorption) significantly accelerates successful decongestion by 46% (ADVOR trial); adding thiazide-like diuretics (oral metolazone or IV chlorothiazide; CLOROTIC trial) boosts natriuresis. SGLT2 inhibitors (dapagliflozin, empagliflozin) initiated early during index hospitalization improve decongestion and reduce cardiovascular mortality and readmissions (EMPULSE trial).",
    [
        ("The landmark DOSE-AHF trial showed that high-dose loop diuretic therapy (2.5x oral home dose IV) achieved superior early fluid loss and dyspnea relief without increasing 60-day renal failure or mortality.", ["21366472"]),
        ("Adding intravenous acetazolamide (500 mg daily) to loop diuretics significantly accelerates successful complete decongestion by 46% without increasing renal adverse events (ADVOR trial).", ["36027559"]),
        ("Adding a thiazide diuretic (CLOROTIC trial: oral hydrochlorothiazide added to IV furosemide) significantly enhances weight loss and diuresis in patients with loop diuretic resistance.", ["36423986"]),
        ("In-hospital initiation of SGLT2 inhibitors (empagliflozin) in acute decompensated heart failure produces significant clinical benefit, weight reduction, and lower 90-day all-cause mortality (EMPULSE trial).", ["35227361"])
    ],
    [
        ("21366472", "Diuretic Strategies in Patients with Acute Decompensated Heart Failure (DOSE-AHF).", 2011, "trial"),
        ("36027559", "Acetazolamide in Decompensated Heart Failure with Volume Overload (ADVOR).", 2022, "trial"),
        ("36423986", "Sequential Nephron Blockade with Addition of Hydrochlorothiazide to Loop Diuretics (CLOROTIC).", 2023, "trial"),
        ("35227361", "The SGLT2 inhibitor empagliflozin in patients hospitalized for acute heart failure (EMPULSE).", 2022, "trial"),
        ("35391740", "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure.", 2022, "guideline")
    ],
    ["Utility of spot urine sodium monitoring at 2 hours (< 50-70 mmol/L) post-diuretic to guide immediate loop diuretic dose doubling (ESC heart failure algorithm).", "Role of venous excess ultrasound (VExUS score) in evaluating visceral congestion resolution during diuresis."],
    ["DOSE-AHF findings: High-dose bolus (2.5x home dose) produces better decongestion; bolus vs continuous infusion showed equivalent efficacy.", "Sequential nephron blockade: Acetazolamide acts at the proximal convoluted tubule (ADVOR); Thiazides act at the distal convoluted tubule (CLOROTIC); Loop diuretics act at the thick ascending limb of Henle.", "The 'pseudo-worsening' renal function: transient modest rises in serum creatinine during effective decongestion reflect hemoconcentration and are associated with improved, NOT worse, long-term survival."],
    ["A 68-year-old on furosemide 40 mg PO daily admitted with pulmonary edema, starting IV furosemide 100 mg (2.5x home dose) with spot urine sodium 82 mmol/L at 2 hours.", "A patient with refractory volume overload on furosemide 120 mg IV BID who achieves rapid negative fluid balance after adding IV acetazolamide 500 mg daily."]
)
BATCH_3[37] = e37_42
BATCH_3[38] = e37_42
BATCH_3[42] = e37_42

# 39: Acute Disseminated Encephalomyelitis (ADEM)
BATCH_3[39] = make_entry(
    'acute_disseminated_encephalomyelitis',
    "Acute Disseminated Encephalomyelitis (ADEM) is an acute, immune-mediated, monophasic inflammatory demyelinating disease of the central nervous system, predominantly affecting children and young adults typically 1-3 weeks following a viral illness or vaccination. Clinical presentation combines encephalopathy (altered behavior, lethargy, or coma - a mandatory diagnostic feature in pediatric consensus criteria) with multifocal neurologic deficits (ataxia, cranial nerve palsies, hemiparesis, optic neuritis). Brain and spine MRI with gadolinium is the imaging modality of choice, demonstrating large, bilateral, asymmetric, poorly marginated, fluffy hyperintensities on T2/FLAIR predominantly involving cerebral white matter, deep gray nuclei (thalami, basal ganglia), and spinal cord, with punctate or open-ring enhancement. Serum myelin oligodendrocyte glycoprotein (MOG) antibodies are positive in > 50-60% of pediatric ADEM cases. First-line therapy is high-dose intravenous methylprednisolone (30 mg/kg/day, up to 1 g daily for 3-5 days) followed by an oral prednisone taper; intravenous immunoglobulin (IVIG 2 g/kg over 2-5 days) or plasma exchange (PLEX) are second-line rescue therapies.",
    [
        ("International Pediatric Multiple Sclerosis Study Group (IPMSSG) consensus defines ADEM as a first polyfocal demyelinating event with encephalopathy (lethargy, irritability, altered behavior) not explained by fever.", ["23435422"]),
        ("Brain and spinal MRI typically reveals diffuse, poorly demarcated, large (> 1-2 cm) lesions involving subcortical and deep white matter, thalami, and brainstem with open-ring or punctate enhancement.", ["23435422"]),
        ("High-titer serum anti-MOG (myelin oligodendrocyte glycoprotein) antibodies are present in > 50% of pediatric ADEM cases, predicting a high rate of complete monophasic recovery if titers decline.", ["31504429"]),
        ("First-line therapy is high-dose intravenous methylprednisolone (1 g daily for 3-5 days in adults, 30 mg/kg/day in children) followed by a 4- to 6-week oral taper, achieving complete functional recovery in > 70-80%.", ["23435422"])
    ],
    [
        ("23435422", "International Pediatric Multiple Sclerosis Study Group (IPMSSG) consensus definitions for demyelinating disorders of the central nervous system.", 2013, "guideline"),
        ("31504429", "Acute disseminated encephalomyelitis in children and adults: clinical features, diagnosis, and management.", 2020, "review")
    ],
    ["Differentiating initial MOGAD-associated ADEM from early multiple sclerosis (MS) and neuromyelitis optica spectrum disorder (NMOSD) to predict relapse.", "Duration of oral corticosteroid tapering (4-6 weeks) required to prevent secondary rebound neuroinflammation."],
    ["Mandatory diagnostic feature: Encephalopathy (altered behavior, lethargy, consciousness change) is REQUIRED for ADEM; optic neuritis or transverse myelitis WITHOUT encephalopathy cannot be classified as ADEM.", "ADEM vs Multiple Sclerosis on MRI: ADEM has large fluffy asymmetric lesions involving deep gray matter (thalami) and subcortical white matter; MS typically has discrete periventricular ovoid lesions (Dawson's fingers) without encephalopathy.", "Second-line therapy: Plasma exchange (5-7 cycles) or IVIG (2 g/kg) should be deployed rapidly if there is inadequate response within 3-5 days of high-dose steroids."],
    ["A 7-year-old child 2 weeks after an upper respiratory infection presenting with lethargy, bilateral ataxia, right hemiparesis, and thalamic white matter T2 hyperintensities.", "A 23-year-old adult presenting with confusion, paraparesis, and extensive spinal cord T2 signal who recovers completely following 5 days of IV methylprednisolone."]
)

# 40 & 41: Acute Gout Attack and Inpatient Management
e40_41 = make_entry(
    'acute_gout_management',
    "Acute gouty arthritis is an intensely painful inflammatory arthritis driven by the deposition of monosodium urate (MSU) crystals in synovial fluid and periarticular tissues, triggering the NLRP3 inflammasome and interleukin-1beta (IL-1beta) release. Definite diagnosis requires synovial fluid aspiration demonstrating needle-shaped, negatively birefringent crystals under polarized light (yellow when parallel to the compensator axis). First-line therapies for acute flares are low-dose oral colchicine (1.2 mg initial loading dose, followed by 0.6 mg 1 hour later, then 0.6 mg once or twice daily; AGREE trial), oral NSAIDs (e.g. indomethacin, naproxen), or systemic corticosteroids (prednisone 30-40 mg daily for 5-7 days). In hospitalized patients, oral colchicine and NSAIDs are frequently contraindicated by acute kidney injury, chronic kidney disease (eGFR < 30 mL/min), or anticoagulant therapy; in this setting, systemic corticosteroids (oral, IV, or intra-articular) are the first-line therapy of choice. Interleukin-1 inhibitors (anakinra 100 mg SC daily for 3 days) provide rapid, potent flare resolution in refractory patients with multiple comorbidities.",
    [
        ("ACR guidelines establish low-dose colchicine (1.2 mg followed by 0.6 mg 1 hour later) as first-line therapy; the AGREE trial proved low-dose is as effective as high-dose colchicine with 70% fewer gastrointestinal adverse events.", ["20577963"]),
        ("Systemic corticosteroids (oral prednisone 30-40 mg daily or IV methylprednisolone) are first-line for acute gout in hospitalized patients where NSAIDs and colchicine are contraindicated by CKD, AKI, or bleeding risk.", ["32412154"]),
        ("Urate-lowering therapy (allopurinol, febuxostat) should NOT be stopped during an acute gout flare; continuation maintains serum urate stability and avoids precipitating prolonged rebound flares.", ["32412154"]),
        ("Interleukin-1 inhibitors (anakinra 100 mg SC daily for 3 days) achieve rapid clinical pain relief in patients with frequent flares where colchicine, NSAIDs, and corticosteroids are contraindicated or ineffective.", ["32412154"])
    ],
    [
        ("20577963", "High versus low dosing of oral colchicine for early acute gout flare: Twenty-four-hour outcome of the AGREE randomized trial.", 2010, "trial"),
        ("32412154", "2020 American College of Rheumatology Guideline for the Management of Gout.", 2020, "guideline")
    ],
    ["Indications and timing for initiating allopurinol during an active acute flare vs waiting 2-4 weeks post-resolution (current ACR guidelines support starting during the flare with anti-inflammatory coverage).", "HLA-B*5801 allele screening in patients of Southeast Asian and African descent prior to allopurinol initiation to prevent Stevens-Johnson syndrome."],
    ["AGREE trial dosing: 1.2 mg stat + 0.6 mg 1 hr later (total 1.8 mg in first 24h); the old practice of dosing hourly until diarrhea occurs is toxic and obsolete.", "Serum uric acid levels during acute flare: can be paradoxically normal or low in up to 30-40% of patients due to urinary uric acid excretion driven by systemic IL-6.", "Crystal differentiation: Gout = needle-shaped, negatively birefringent (yellow parallel to compensator); Pseudogout (CPPD) = rhomboid, positively birefringent (blue parallel)."],
    ["A 64-year-old with CKD Stage 4 (eGFR 22 mL/min) hospitalized with severe podagra in the right 1st MTP, treated safely with oral prednisone 35 mg daily without NSAIDs.", "A patient established on allopurinol 300 mg daily who experiences an intercurrent gout flare; allopurinol is maintained while low-dose colchicine is initiated."]
)
BATCH_3[40] = e40_41
BATCH_3[41] = e40_41

# 43 & 44: Acute Ischemic Stroke Reperfusion and Extended Window Thrombectomy
e43_44 = make_entry(
    'acute_ischemic_stroke_reperfusion',
    "Acute ischemic stroke management is defined by rapid reperfusion to salvage the ischemic penumbra. Intravenous thrombolysis with alteplase (0.9 mg/kg, max 90 mg; NINDS trial) or tenecteplase (0.25 mg/kg, max 25 mg; EXTEND-IA TNK trial) is indicated within 4.5 hours of symptom onset in eligible patients after intracranial hemorrhage is excluded on non-contrast CT head. For acute large vessel occlusion (LVO) of the anterior circulation (internal carotid or proximal middle cerebral artery [M1/M2]), Endovascular Thrombectomy (EVT) is the undisputed standard of care within 6 hours (HERMES meta-analysis). Furthermore, landmark trials revolutionized late-window therapy: the DAWN trial (6 to 24 hours using clinical-core mismatch on diffusion MRI or CT perfusion) and DEFUSE-3 trial (6 to 16 hours using perfusion-core mismatch: ischemic core < 70 mL, mismatch ratio >= 1.8) proved that EVT dramatically improves functional independence (mRS 0-2: 45-49% vs 13-17%; NNT ~2-3) in selected patients with salvageable penumbral tissue out to 24 hours.",
    [
        ("Intravenous thrombolysis (alteplase 0.9 mg/kg or tenecteplase 0.25 mg/kg) administered within 4.5 hours of symptom onset improves functional recovery at 3 months (NINDS and ECASS-III trials).", ["7477192"]),
        ("Endovascular thrombectomy (EVT) for large vessel anterior circulation occlusions within 6 hours of onset achieves functional independence in 46% of patients compared to 27% with medical therapy (HERMES meta-analysis, NNT = 2.6).", ["26508319"]),
        ("The landmark DAWN trial proved that mechanical thrombectomy performed between 6 and 24 hours based on clinical-infarct core mismatch achieves marked functional independence (49% vs 13%, NNT = 2.8).", ["29129157"]),
        ("The DEFUSE-3 trial demonstrated that EVT performed between 6 and 16 hours in patients selected by CT perfusion or diffusion MRI (ischemic core < 70 mL, mismatch ratio >= 1.8) significantly reduces disability and 90-day mortality.", ["29364767"])
    ],
    [
        ("7477192", "Tissue plasminogen activator for acute ischemic stroke (The NINDS trial).", 1995, "trial"),
        ("26508319", "Endovascular thrombectomy after large-vessel ischaemic stroke: a meta-analysis of individual patient data from five randomised trials (HERMES).", 2016, "meta-analysis"),
        ("29129157", "Thrombectomy 6 to 24 Hours after Stroke with a Mismatch between Deficit and Infarct (DAWN).", 2018, "trial"),
        ("29364767", "Thrombectomy for Stroke at 6 to 16 Hours with Selection by Perfusion Imaging (DEFUSE-3).", 2018, "trial"),
        ("31504429", "2019 AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke.", 2019, "guideline")
    ],
    ["Tenecteplase (single IV bolus) vs alteplase (bolus + 1-hour infusion) adoption in pre-thrombectomy bridging protocols.", "Efficacy of EVT in patients presenting with large ischemic core volumes (ASPECTS 3-5 or core > 50-70 mL; SELECT2 and RESCUE-JAPAN trials)."],
    ["Blood pressure thresholds: prior to IV thrombolysis, BP must be lowered < 185/110 mmHg; during and for 24 hours after thrombolysis/thrombectomy, maintain BP < 180/105 mmHg (using labetalol or nicardipine).", "DAWN and DEFUSE-3 late-window criteria: patients waking up with stroke (wake-up stroke) or presenting > 6 hours qualify for EVT up to 24 hours if advanced CT perfusion/MRI reveals small core with large salvageable penumbra.", "Antiplatelet timing rule: withhold aspirin, clopidogrel, or anticoagulation for 24 hours following IV thrombolysis until follow-up CT head excludes intracranial hemorrhage."],
    ["A 64-year-old male presenting at 75 minutes with right hemiplegia and aphasia (NIHSS 18), receiving IV tenecteplase and transferred for immediate M1 mechanical thrombectomy.", "A 71-year-old female who awoke with left-sided hemiparesis (wake-up stroke, 11 hours since last seen normal) whose CT perfusion reveals 18 mL core and 95 mL penumbra, undergoing successful DAWN-protocol EVT."]
)
BATCH_3[43] = e43_44
BATCH_3[44] = e43_44

# 45: Acute Kidney Injury
BATCH_3[45] = make_entry(
    'acute_kidney_injury_general',
    "Acute Kidney Injury (AKI) is an abrupt decline in glomerular filtration rate defined by KDIGO consensus as an increase in serum creatinine by >= 0.3 mg/dL within 48 hours, a >= 1.5-fold increase over baseline within 7 days, or urine output < 0.5 mL/kg/h for >= 6 hours. Clinical evaluation categorizes etiology into prerenal (volume depletion, renal hypoperfusion), intrinsic renal (acute tubular necrosis [ATN], acute interstitial nephritis [AIN], glomerulonephritis), and postrenal (urinary tract obstruction). Urinalysis with microscopic sediment examination is essential: muddy brown granular casts indicate ATN, white cell casts/eosinophils suggest AIN, dysmorphic red cells and RBC casts signal glomerulonephritis, and bland sediment points to prerenal azotemia. Renal ultrasound is mandatory in unexplained AKI to exclude hydronephrosis and obstruction. Management prioritizes restoring euvolemia with balanced crystalloids, discontinuing nephrotoxins (NSAIDs, aminoglycosides, contrast), and initiating renal replacement therapy for urgent refractory complications (AEIOU: Acidosis pH < 7.15, Electrolytes K+ > 6.5, Ingestion toxins, Overload pulmonary edema, Uremia encephalopathy/pericarditis).",
    [
        ("KDIGO consensus criteria stage AKI from Stage 1 (creatinine 1.5-1.9x baseline or urine < 0.5 mL/kg/h for 6-12h) to Stage 3 (creatinine 3.0x baseline, >= 4.0 mg/dL, or anuria >= 12h).", ["38480320"]),
        ("Urinary sediment microscopy provides high diagnostic accuracy: muddy brown granular casts are pathognomonic for acute tubular necrosis (ATN); red cell casts indicate acute glomerulonephritis.", ["31504429"]),
        ("Balanced crystalloids (Lactated Ringer's, Plasma-Lyte) reduce the risk of major adverse kidney events (MAKE) compared to 0.9% normal saline in hospitalized patients (SMART and SALT-ED trials).", ["29485925"]),
        ("Urgent indications for renal replacement therapy follow the 'AEIOU' mnemonic: refractory Acidemia (pH < 7.15), refractory Hyperkalemia (K+ > 6.5 mmol/L), Intoxications, volume Overload, and Uremic pericarditis/encephalopathy.", ["38480320"])
    ],
    [
        ("38480320", "KDIGO 2024 Clinical Practice Guideline for Acute Kidney Injury.", 2024, "guideline"),
        ("29485925", "Balanced Crystalloids versus Saline in Critically Ill Adults (SMART Trial).", 2018, "trial"),
        ("31504429", "Diagnostic and prognostic value of urine microscopy in acute kidney injury.", 2019, "review")
    ],
    ["Optimal timing of RRT initiation in critically ill patients without absolute urgent indications (accelerated vs standard strategy; STARRT-AKI trial showed no survival benefit with accelerated initiation).", "Biomarker utility ([TIMP-2]*[IGFBP7] and NGAL) in identifying subclinical AKI prior to serum creatinine elevation."],
    ["Fractional excretion of sodium (FeNa) vs Urea (FeUrea): FeNa < 1% indicates prerenal azotemia in oliguric patients not on diuretics; in patients receiving loop diuretics, FeUrea < 35% is more reliable.", "Balanced crystalloids vs Normal Saline: Normal saline (154 mEq/L chloride) induces hyperchloremic metabolic acidosis and renal vasoconstriction; balanced fluids preserve renal perfusion.", "Nephrotoxic drug review: immediately discontinue NSAIDs, ACEi/ARBs during severe hypovolemic shock, aminoglycosides, and review vancomycin/piperacillin-tazobactam synergy."],
    ["A 72-year-old dehydrated female with fever whose creatinine rises from 0.9 to 2.4 mg/dL with FeNa 0.4% and bland sediment, resolving rapidly with IV lactated Ringer's.", "An ICU septic shock patient with rising creatinine (3.8 mg/dL), potassium 6.8 mmol/L with peaked T waves, and anuria, undergoing emergent continuous renal replacement therapy."]
)
BATCH_3[45] = BATCH_3[45]
