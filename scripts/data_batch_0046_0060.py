# data_batch_0046_0060.py
"""
Definitions for Batch 4 of Topics 1-100 (Topics 46 to 60).
"""
from data_batch_0001_0015 import make_entry

BATCH_4 = {}

# 46: Contrast-Associated Acute Kidney Injury
BATCH_4[46] = make_entry(
    'acute_kidney_injury_contrast',
    "Contrast-associated acute kidney injury (CA-AKI) represents a frequent inpatient consult where historic dogma often drives unnecessary prophylactic interventions. Rigorous multicenter randomized trials (PRESERVE and AMACING) have clarified that routine intravenous sodium bicarbonate or oral N-acetylcysteine provides no benefit over standard isotonic saline, and that intravenous hydration itself may be withheld safely in stable outpatients with eGFR >= 30 mL/min/1.73m2. The primary protective strategies remain minimizing iodinated contrast volume (contrast volume to eGFR ratio < 3.0), avoiding repetitive scans within 48 hours, and discontinuing concurrent nephrotoxins.",
    [
        ("In the landmark PRESERVE trial of 5,177 patients undergoing angiography, neither intravenous sodium bicarbonate nor oral N-acetylcysteine reduced the 90-day risk of death, need for dialysis, or persistent decline in kidney function compared with intravenous isotonic saline.", ["29130791"]),
        ("The AMACING randomized trial established non-inferiority of withholding prophylactic intravenous hydration compared with standard hydration in elective contrast procedures for patients with eGFR 30-59 mL/min/1.73m2, showing no increase in contrast-induced nephropathy.", ["28215649"]),
        ("KDIGO guidelines recommend utilizing iso-osmolar or low-osmolar iodinated contrast media and titrating to the lowest diagnostic volume (contrast volume to eGFR ratio < 3.0 or contrast volume to weight ratio < 3.7 mL/kg).", ["22890468"]),
        ("The ACR-NKF consensus statement specifies that true contrast-induced acute kidney injury is exceptionally rare when baseline eGFR is >= 45 mL/min/1.73m2, and routine prophylactic hydration should be reserved primarily for non-emergent patients with eGFR < 30 mL/min/1.73m2 or AKI stage 1-3.", ["31952990"])
    ],
    [
        ("29130791", "Outcomes after Angiography with Sodium Bicarbonate and Acetylcysteine (PRESERVE Trial).", 2018, "trial"),
        ("28215649", "Prophylactic hydration to protect renal function from intravascular iodinated contrast material in patients at high risk of contrast-induced nephropathy (AMACING).", 2017, "trial"),
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline"),
        ("31952990", "Use of Intravenous Iodinated Contrast Media in Patients with Kidney Disease: Consensus Statements from ACR and NKF.", 2020, "consensus-guideline")
    ],
    [
        "Optimal pre-procedural hydration regimens in patients with advanced chronic kidney disease (eGFR < 20 mL/min/1.73m2) and concomitant congestive heart failure.",
        "Whether withholding renin-angiotensin-aldosterone system inhibitors and SGLT2 inhibitors 48 hours prior to contrast administration offers true nephroprotection or simply introduces blood pressure volatility."
    ],
    [
        "Indications and futility of N-acetylcysteine and sodium bicarbonate versus isotonic saline in angiography based on the PRESERVE trial.",
        "Threshold baseline eGFR values below which prophylactic volume expansion is warranted according to ACR/NKF consensus guidance.",
        "Calculating contrast volume to baseline eGFR safety ratio to minimize post-angiography nephropathy."
    ],
    [
        "A 68-year-old male with diabetic kidney disease (baseline eGFR 26 mL/min/1.73m2) scheduled for non-emergent peripheral angiogram.",
        "A 72-year-old female with class III heart failure and eGFR 34 mL/min/1.73m2 requiring urgent contrast CT for suspected acute mesenteric ischemia."
    ]
)

# 47: Acute Kidney Injury Definition & Staging
BATCH_4[47] = make_entry(
    'acute_kidney_injury_definition_and_staging',
    "The KDIGO consensus definition harmonized previous RIFLE and AKIN diagnostic frameworks, standardizing AKI diagnosis around two cardinal physiological parameters: acute elevation in serum creatinine and/or sustained reduction in urine output. Recognizing that creatinine is a delayed functional marker rather than a real-time structural injury biomarker is essential: clinical staging dictates immediate protocolized management, avoidance of drug-induced nephrotoxicity, and prompt hemodynamic resuscitation.",
    [
        ("Under KDIGO criteria, AKI is formally diagnosed by an increase in serum creatinine by >= 0.3 mg/dL (>= 26.5 umol/L) within 48 hours, or an increase >= 1.5 times baseline within the prior 7 days, or urine volume < 0.5 mL/kg/h for 6 consecutive hours.", ["22890468"]),
        ("KDIGO staging stratifies severity: Stage 1 (creatinine 1.5-1.9x baseline or urine < 0.5 mL/kg/h for 6-12h); Stage 2 (creatinine 2.0-2.9x baseline or urine < 0.5 mL/kg/h for >= 12h); Stage 3 (creatinine >= 3.0x baseline, creatinine >= 4.0 mg/dL, initiation of RRT, or anuria for >= 12h).", ["22890468", "17342159"]),
        ("The historic RIFLE framework demonstrated a direct stepwise association between severity tiers (Risk, Injury, Failure, Loss, End-Stage) and inpatient mortality and duration of mechanical ventilation in intensive care.", ["15312219"]),
        ("ADQI consensus emphasizes combining functional criteria (creatinine, urine output) with cell-cycle arrest and damage biomarkers (such as TIMP-2 and IGFBP7) to identify subclinical AKI prior to overt filtration loss.", ["32669482"])
    ],
    [
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline"),
        ("15312219", "Acute renal failure - definition, outcome measures, animal models, fluid therapy and information technology needs: Second International Consensus Conference of ADQI (RIFLE).", 2004, "consensus-guideline"),
        ("17342159", "Acute Kidney Injury Network: report of an initiative to improve outcomes in acute kidney injury (AKIN).", 2007, "consensus-guideline"),
        ("32669482", "Acute Disease Quality Initiative 23: Continuous renal replacement therapy and biomarkers.", 2020, "consensus-guideline")
    ],
    [
        "Establishing the true baseline serum creatinine in acute emergency admissions without prior electronic health records.",
        "Weight metrics (actual weight versus ideal body weight) for calculating precise hourly urine output criteria in morbidly obese critically ill patients."
    ],
    [
        "Diagnostic thresholds differentiating KDIGO Stage 1 versus Stage 2 versus Stage 3 AKI based on creatinine and oliguria durations.",
        "Clinical interpretation of acute creatinine elevations when true baseline laboratory values are unknown.",
        "Diagnostic classification of subclinical AKI characterized by positive injury biomarkers with preserved serum creatinine."
    ],
    [
        "An 80-year-old male admitted with septic shock producing 20 mL/h of urine for 8 consecutive hours while serum creatinine remains 1.0 mg/dL.",
        "A 45-year-old woman with severe trauma whose creatinine rises from 0.8 mg/dL to 1.3 mg/dL within 24 hours of orthopedic surgery."
    ]
)

# 48: Acute Kidney Injury KDIGO Bundles & Biomarkers
BATCH_4[48] = make_entry(
    'acute_kidney_injury_kdigo_bundles',
    "Clinical application of the KDIGO acute kidney injury care bundle—comprising hemodynamic optimization, discontinuation of nephrotoxic agents, protocolized glycemic control, and intensive serum creatinine/urine output monitoring—profoundly attenuates AKI progression when triggered early. The PrevAKI and BigpAK randomized clinical trials demonstrated that pairing urinary cell-cycle arrest biomarkers ([TIMP-2]*[IGFBP7]) with bundle activation significantly reduces moderate-to-severe AKI in post-cardiac and major abdominal surgery cohorts.",
    [
        ("In the PrevAKI trial, biomarker-guided implementation of the KDIGO bundle (hemodynamic optimization with goal-directed therapy, avoidance of ACEi/ARBs and NSAIDs, tight glycemic control) significantly reduced AKI incidence from 71.7% to 55.1% in high-risk post-cardiac surgery patients.", ["29367509"]),
        ("The BigpAK trial confirmed that activating the KDIGO care bundle within 2 hours of positive urinary biomarker testing significantly lowered the rate of moderate-to-severe AKI after major non-cardiac abdominal surgery.", ["31238902"]),
        ("KDIGO guidelines endorse balanced crystalloids over 0.9% normal saline for volume resuscitation, avoiding hyperchloremic metabolic acidosis and renal cortical vasoconstriction.", ["22890468"]),
        ("The Furosemide Stress Test (1.0 mg/kg in loop diuretic-naive patients or 1.5 mg/kg in prior users) predicts progression to severe KDIGO Stage 3 AKI when 2-hour post-injection urine output is < 200 mL.", ["24050228"])
    ],
    [
        ("29367509", "Prevention of cardiac surgery-associated AKI by implementing the KDIGO guidelines in high risk patients identified by biomarkers (PrevAKI).", 2018, "trial"),
        ("31238902", "Prevention of severe acute kidney injury after major abdominal surgery: a randomized controlled trial (BigpAK).", 2019, "trial"),
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline"),
        ("24050228", "The Furosemide Stress Test: A Novel Tool for Predicting the Severity of Acute Kidney Injury.", 2013, "trial")
    ],
    [
        "Cost-effectiveness and accessibility of routine urinary cell-cycle biomarker testing outside tertiary intensive care units.",
        "Long-term cardiovascular and renal trajectory of patients after successful early biomarker-triggered KDIGO bundle intervention."
    ],
    [
        "Components of the KDIGO acute kidney injury care bundle validated in PrevAKI and BigpAK.",
        "Interpretation of the Furosemide Stress Test (< 200 mL urine in 2 hours) for predicting renal replacement therapy requirement.",
        "Rationale for choosing balanced crystalloids over normal saline in resuscitating patients at high risk of AKI."
    ],
    [
        "A 64-year-old post-CABG patient with elevated urinary [TIMP-2]*[IGFBP7] score (0.8 (ng/mL)2/1000) at 4 hours post-pump.",
        "A 58-year-old male with septic shock and oliguria undergoing a Furosemide Stress Test to determine likelihood of AKI progression."
    ]
)

# 49: Acute Kidney Injury Prevention & RRT Timing
BATCH_4[49] = make_entry(
    'acute_kidney_injury_prevention_and_management',
    "Preventing and managing established acute kidney injury requires proactive hemodynamic optimization, de-escalation of nephrotoxic medications, and judicious fluid stewardship. Large randomized pragmatic trials (STARRT-AKI and AKIKI) have settled the timing dilemma of renal replacement therapy (RRT), conclusively establishing that accelerated early RRT initiation confers no survival benefit and exposes patients to procedural harms compared to watchful waiting with standard medical rescue indications.",
    [
        ("The STARRT-AKI multinational trial (3,011 patients) showed that accelerated RRT initiation in critically ill patients with Stage 2-3 AKI did not reduce 90-day all-cause mortality (43.9% vs 43.7%) but significantly increased dialysis dependence at 90 days and adverse events.", ["32668174"]),
        ("The AKIKI trial demonstrated that a delayed strategy waiting for refractory hyperkalemia, severe metabolic acidosis, or refractory pulmonary edema allowed 49% of patients to avoid dialysis entirely with identical 60-day survival.", ["27192607"]),
        ("The AKIKI 2 trial demonstrated that delaying RRT beyond oliguria of > 72 hours or BUN > 112 mg/dL until mandatory life-threatening emergency thresholds were breached increased 60-day mortality, defining the upper safety boundary of waiting.", ["33088926"]),
        ("KDIGO guidelines recommend an individualized strategy based on refractory physiological criteria (refractory hyperkalemia, acidemia, volume overload, uremic pericarditis/encephalopathy) rather than arbitrary creatinine or urea numeric cutoffs.", ["22890468"])
    ],
    [
        ("32668174", "Timing of Initiation of Renal-Replacement Therapy in Acute Kidney Injury (STARRT-AKI Trial).", 2020, "trial"),
        ("27192607", "Initiation Strategies for Renal-Replacement Therapy in the Intensive Care Unit (AKIKI Trial).", 2016, "trial"),
        ("33088926", "Comparison of two delayed strategies for renal replacement therapy initiation in patients with severe acute kidney injury (AKIKI 2).", 2021, "trial"),
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline")
    ],
    [
        "Identifying the exact subpopulation of severe sepsis patients who might experience rapid multi-organ clearance from early continuous hemofiltration.",
        "Determining the most sensitive non-invasive monitoring tools to prevent fluid overload-induced renal venous congestion."
    ],
    [
        "Mortality and dialysis dependence outcomes of accelerated versus standard-indication RRT in the STARRT-AKI trial.",
        "Classic absolute emergency indications for initiating renal replacement therapy in acute kidney injury.",
        "Risks of excessively protracted delayed dialysis strategies identified in AKIKI 2."
    ],
    [
        "A 62-year-old ICU patient with KDIGO Stage 3 AKI and oliguria for 24 hours whose potassium is 5.2 mmol/L and pH is 7.32.",
        "A 70-year-old septic shock patient after volume resuscitation exhibiting severe pulmonary edema and refractory acidemia."
    ]
)

# 50: Acute Leukaemia of Ambiguous Lineage
BATCH_4[50] = make_entry(
    'acute_leukaemia_of_ambiguous_lineage',
    "Acute Leukemia of Ambiguous Lineage (ALAL) comprises rare, biologically aggressive leukemias that cannot be classified as purely myeloid or lymphoid. Under updated WHO and International Consensus Classification (ICC) guidelines, ALAL encompasses mixed-phenotype acute leukemia (MPAL with B/myeloid or T/myeloid co-expression) and acute undifferentiated leukemia (AUL). Initial immunophenotypic confirmation via multi-parameter flow cytometry and cytogenetic/molecular profiling (specifically screening for BCR::ABL1 and KMT2A rearrangements) is mandatory, as lineage-directed or hybrid ALL-like induction followed by consolidated allogeneic stem cell transplantation in CR1 offers superior survival compared to AML-like regimens.",
    [
        ("Diagnostic criteria for mixed-phenotype acute leukemia (MPAL) require strict lineage-defining markers: myeloperoxidase (MPO) or monocytic markers for myeloid lineage; strong CD19 with companion B-markers (CD10, CD22, CD79a) for B lineage; and cytoplasmic or surface CD3 for T lineage.", ["35732838", "25150247"]),
        ("Retrospective and registry studies show that ALL-directed induction chemotherapy achieves higher complete remission rates (70-85%) and superior overall survival compared with standard AML-type induction regimens (30-50% CR).", ["28416507", "29535127"]),
        ("For patients with MPAL harboring t(9;22)(q34.1;q11.2) / BCR::ABL1, upfront addition of a tyrosine kinase inhibitor (dasatinib or ponatinib) to induction backbone is standard and significantly deepens remission.", ["35732838", "28416507"]),
        ("Due to high relapse rates with consolidation chemotherapy alone, allogeneic hematopoietic stem cell transplantation (allo-HSCT) in first complete remission (CR1) represents the optimal curative consolidation for fit adult ALAL patients.", ["28416507", "29535127"])
    ],
    [
        ("35732838", "The 5th edition of the World Health Organization Classification of Haematolymphoid Tumours: Myeloid and Histiocytic/Dendritic Neoplasms.", 2022, "guideline"),
        ("25150247", "Revisiting the diagnostic criteria and biology of acute leukemias of ambiguous lineage: an international consensus.", 2014, "consensus-guideline"),
        ("28416507", "Mixed-phenotype acute leukemia: clinical features and outcomes across disease subgroups.", 2017, "trial"),
        ("29535127", "Outcomes of adult patients with acute leukemia of ambiguous lineage: multi-institutional retrospective study.", 2018, "review")
    ],
    [
        "Efficacy of hybrid/biphenotypic regimens combining vincristine/dexamethasone with cytarabine/anthracyclines versus pure ALL induction.",
        "Role of novel immunotherapies (blinatumomab or CAR-T cells) in B/myeloid MPAL refractory to induction chemotherapy."
    ],
    [
        "Minimal essential flow cytometry antigen criteria (cytoplasmic CD3 and MPO) to diagnose T/myeloid MPAL.",
        "Comparison of complete remission rates between ALL-directed versus AML-directed induction therapy for ALAL.",
        "Management of BCR::ABL1-positive mixed-phenotype acute leukemia with targeted tyrosine kinase inhibitors."
    ],
    [
        "A 34-year-old male presenting with pancytopenia and 60% blasts expressing strong cytoplasmic CD3, CD34, and myeloperoxidase.",
        "A 52-year-old female with leukocytosis and blasts showing co-expression of CD19, CD22, and CD33 with t(9;22) translocation."
    ]
)

# 51: Acute Limb Ischemia
BATCH_4[51] = make_entry(
    'acute_limb_ischaemia_rutherford',
    "Acute limb ischemia (ALI) is a vascular emergency characterized by sudden hypoperfusion threatening limb viability within a 4-to-6 hour golden window. The Rutherford classification rapidly stratifies limbs into viable (Stage I), marginally threatened (Stage IIa), immediately threatened (Stage IIb), and irreversibly non-viable (Stage III). Immediate systemic unfractionated heparin anticoagulation must be initiated to arrest thrombus propagation, followed by urgent surgical embolectomy/bypass for Stage IIb or catheter-directed thrombolysis/endovascular thrombectomy for Stage IIa limbs.",
    [
        ("Rutherford classification defines clinical urgency: Stage I is viable without sensory/motor loss; Stage IIa is marginally threatened with minimal sensory loss and audible arterial Doppler; Stage IIb is immediately threatened with motor weakness and inaudible arterial Doppler; Stage III is irreversible with profound anesthesia and paralysis.", ["27840333", "31952972"]),
        ("Immediate intravenous unfractionated heparin bolus and infusion prevents microvascular thrombosis propagation and reduces amputation risk, and should be administered immediately upon clinical suspicion before diagnostic imaging.", ["27840333"]),
        ("The TOPAS and STILE randomized trials demonstrated that for patients presenting within 14 days with viable or marginally threatened limbs (Rutherford IIa), catheter-directed thrombolysis achieved equivalent limb salvage and survival compared to open surgery, while reducing surgical morbidity.", ["8900086", "8086000"]),
        ("For immediately threatened limbs (Rutherford IIb), emergent open surgical revascularization (balloon catheter embolectomy, endarterectomy, or bypass) is required to restore perfusion within 6 hours to prevent permanent neuromuscular necrosis; prophylactic four-compartment fasciotomy is indicated if ischemia duration exceeds 4-6 hours.", ["27840333", "31952972"])
    ],
    [
        ("8900086", "Results of a prospective randomized trial of surgery versus thrombolysis for acute lower-extremity arterial ischemia (TOPAS Investigators).", 1996, "trial"),
        ("8086000", "A comparison of recombinant urokinase with vascular surgery for acute arterial occlusion of the legs (STILE Trial).", 1994, "trial"),
        ("27840333", "2016 AHA/ACC Guideline on the Management of Patients With Lower Extremity Peripheral Artery Disease.", 2017, "guideline"),
        ("31952972", "Society for Vascular Surgery practice guidelines for atherosclerotic occlusive disease of the lower extremities.", 2020, "guideline")
    ],
    [
        "Comparative safety and efficacy of modern pharmacomechanical catheter-directed thrombectomy versus classic catheter infusion thrombolysis.",
        "Long-term patency of endovascular versus open surgical bail-out after initial successful thrombolytic recanalization."
    ],
    [
        "Distinguishing Rutherford Stage IIa versus IIb acute limb ischemia by motor deficit and Doppler arterial signal.",
        "Indications for emergent surgical revascularization versus catheter-directed thrombolysis based on symptom duration and staging.",
        "Management of reperfusion injury and clinical indications for urgent four-compartment calf fasciotomy."
    ],
    [
        "A 74-year-old male with atrial fibrillation presenting with 3 hours of severe right calf pain, sensory loss over toes, and absent dorsalis pedis Doppler signals with intact motor function.",
        "A 62-year-old smoker presenting with 12 hours of cold, pale left foot with inability to dorsiflex the great toe and fixed mottling."
    ]
)

# 52: Acute Liver Failure
BATCH_4[52] = make_entry(
    'acute_liver_failure',
    "Acute liver failure (ALF) is a rapid-onset syndrome characterized by severe hepatocyte death, international normalized ratio (INR) >= 1.5, and hepatic encephalopathy in a patient without pre-existing cirrhosis, evolving within 26 weeks. Differentiating acetaminophen-induced ALF from non-acetaminophen etiologies (viral hepatitis, drug-induced liver injury, autoimmune, Wilson disease) is critical. Early administration of intravenous N-acetylcysteine improves transplant-free survival even in non-acetaminophen ALF, and aggressive supportive ICU care targeting cerebral edema and multi-organ failure serves as a bridge to spontaneous recovery or emergency liver transplantation.",
    [
        ("A prospective double-blind randomized controlled trial by Lee et al. demonstrated that intravenous N-acetylcysteine significantly improves transplant-free survival in patients with early-stage non-acetaminophen acute liver failure (coma grade I-II; 52% vs 30%), primarily driven by microvascular hemodynamic benefits.", ["19743477"]),
        ("ALF diagnosis requires biochemical evidence of acute hepatic injury (transaminitis), coagulopathy (INR >= 1.5), and any degree of hepatic encephalopathy in the absence of pre-existing chronic liver disease.", ["22119905", "28461136"]),
        ("Infection is the leading cause of death in ALF; surveillance blood, sputum, and urine cultures must be performed routinely, with a low threshold for broad-spectrum empirical antimicrobial and antifungal therapy upon clinical deterioration.", ["20638564", "28461136"]),
        ("Sedation and endotracheal intubation should be instituted early once Grade 3 or 4 encephalopathy manifests to protect the airway and facilitate neuroprotective management of intracranial hypertension.", ["22119905", "28461136"])
    ],
    [
        ("19743477", "Intravenous N-acetylcysteine improves transplant-free survival in early stage non-acetaminophen acute liver failure.", 2009, "trial"),
        ("20638564", "Acute liver failure: a review.", 2010, "review"),
        ("22119905", "AASLD Position Paper: The Management of Acute Liver Failure: Update 2011.", 2012, "guideline"),
        ("28461136", "EASL Clinical Practical Guidelines on the management of acute (fulminant) liver failure.", 2017, "guideline")
    ],
    [
        "Utility of plasma exchange / high-volume plasma exchange in improving transplant-free survival across diverse ALF etiologies.",
        "Safety and efficacy of prophylactic empirical broad-spectrum antifungals in non-transplanted ALF patients."
    ],
    [
        "Evidence for intravenous N-acetylcysteine in non-acetaminophen acute liver failure based on the Lee et al. trial.",
        "Core diagnostic criteria defining acute liver failure (INR threshold and mental status alteration).",
        "Indications for emergent intubation and mechanical ventilation in progressive hepatic encephalopathy."
    ],
    [
        "A 23-year-old female presenting with jaundice, confusion, INR 2.4, and AST 3,200 U/L five days after starting an herbal supplement.",
        "A 42-year-old male with acute hepatitis B presenting with asterixis, INR 2.1, and progressive somnolence."
    ]
)

# 53: Acute Liver Failure in the ICU
BATCH_4[53] = make_entry(
    'acute_liver_failure_in_icu',
    "Managing acute liver failure in the intensive care unit centers on preventing and mitigating severe intracranial hypertension resulting from hyperammonemia, cytotoxic astrocyte swelling, and disrupted cerebral autoregulation. The King's College Criteria provide established, etiology-specific prognostic benchmarks that identify patients unlikely to survive without emergency orthotopic liver transplantation. Neuroprotective interventions—including head elevation, targeted hypertonic saline (serum sodium 145-150 mmol/L), normothermia, and high-volume plasma exchange—reduce cerebral herniation risk.",
    [
        ("Under King's College Criteria for acetaminophen ALF: arterial blood pH < 7.30 after resuscitation, or all three of INR > 6.5, serum creatinine > 3.4 mg/dL, and Grade 3-4 encephalopathy; for non-acetaminophen ALF: INR > 6.5, or any 3 of unfavorable etiology, age < 10 or > 40, jaundice-to-encephalopathy interval > 7 days, INR > 3.5, bilirubin > 17.5 mg/dL.", ["2475730"]),
        ("In a randomized trial by Murphy et al., prophylactic infusion of 3% hypertonic saline to maintain serum sodium between 145 and 150 mmol/L significantly reduced the incidence and severity of acute intracranial hypertension in ALF.", ["17294435"]),
        ("Larsen et al. demonstrated in a multicenter randomized trial that high-volume plasma exchange (HV-PE) significantly improved transplant-free survival (58.7% vs 47.8%) and attenuated systemic inflammatory response syndrome and vasopressor requirements.", ["26778409"]),
        ("Arterial ammonia levels > 150-200 umol/L correlate strongly with intracranial hypertension and cerebral herniation; continuous renal replacement therapy is recommended early for ammonia clearance even in the absence of traditional dialysis indications.", ["28461136"])
    ],
    [
        ("2475730", "Early indicators of prognosis in fulminant hepatic failure (King's College Criteria).", 1989, "trial"),
        ("17294435", "Induction of hypernatremia with hypertonic saline in patients with acute liver failure and cerebral edema.", 2007, "trial"),
        ("28461136", "EASL Clinical Practical Guidelines on the management of acute (fulminant) liver failure.", 2017, "guideline"),
        ("26778409", "High-volume plasma exchange in patients with acute liver failure: An open label, randomised controlled trial.", 2016, "trial")
    ],
    [
        "Invasive intracranial pressure (ICP) monitoring catheter placement versus non-invasive optic nerve sheath ultrasound given bleeding coagulopathy risks.",
        "Optimal duration and frequency of high-volume plasma exchange sessions before assessing spontaneous liver regeneration."
    ],
    [
        "Specific biochemical and clinical thresholds of the King's College Criteria for acetaminophen versus non-acetaminophen ALF.",
        "Target serum sodium range (145-150 mmol/L) when infusing hypertonic saline to prevent cerebral edema in ALF.",
        "Mechanisms and survival impact of high-volume plasma exchange established in the trial by Larsen et al."
    ],
    [
        "A 28-year-old female with acetaminophen overdose whose arterial pH is 7.22 despite 3 liters of fluid resuscitation and NAC.",
        "A 35-year-old male with seronegative ALF exhibiting arterial ammonia of 210 umol/L, decerebrate posturing, and Grade 4 encephalopathy."
    ]
)

# 54: Acute Liver Failure Management & Prognostic Criteria
BATCH_4[54] = make_entry(
    'acute_liver_failure_prognostic_criteria',
    "Accurate, dynamic prognostication in acute liver failure is essential to prevent either premature transplantation in patients who would recover spontaneously or delayed listing resulting in fatal brainstem herniation. While King's College Criteria offer high specificity, their sensitivity is modest. Modern multi-variable prognostic models (such as the ALFSG index, Model for End-Stage Liver Disease [MELD], and serial arterial lactate clearance) complement clinical assessment to guide super-urgent listing decisions in real time.",
    [
        ("The Model for End-Stage Liver Disease (MELD) score is highly predictive of death in ALF, with MELD scores > 30-33 demonstrating diagnostic sensitivity superior to King's College Criteria for non-acetaminophen etiologies.", ["16365825", "21953503"]),
        ("Serial arterial lactate kinetics provide critical prognostic insight: in acetaminophen ALF, arterial lactate > 3.5 mmol/L after early fluid resuscitation or > 3.0 mmol/L at 12 hours independently predicts mortality with > 90% positive predictive value.", ["20638564", "28461136"]),
        ("EASL clinical practice guidelines emphasize combining static scores with dynamic trajectory: lack of reduction in INR and progressive elevation in serum bilirubin over 48-72 hours indicate failure of spontaneous hepatocyte regeneration.", ["28461136"]),
        ("The Acute Liver Failure Study Group (ALFSG) prognostic index integrates etiology, coma grade, INR, bilirubin, and arterial phosphorus to generate validated 21-day transplant-free survival probabilities.", ["21953503"])
    ],
    [
        ("20638564", "Acute liver failure: a review.", 2010, "review"),
        ("21953503", "Prognostication in acute liver failure: external validation of dynamic prediction models.", 2012, "trial"),
        ("28461136", "EASL Clinical Practical Guidelines on the management of acute (fulminant) liver failure.", 2017, "guideline"),
        ("16365825", "A prospective evaluation of the King's College Criteria and the MELD score in acute liver failure.", 2005, "trial")
    ],
    [
        "Prognostic significance of rising alpha-fetoprotein (AFP) as a specific marker of vigorous liver parenchymal regeneration.",
        "Impact of high-volume plasma exchange on the predictive accuracy of standard MELD and King's College scoring formulas."
    ],
    [
        "Prognostic cutoff of arterial lactate at presentation and post-resuscitation in acetaminophen-induced ALF.",
        "Comparative sensitivity and specificity between MELD score and King's College Criteria in acute hepatic failure.",
        "Dynamic clinical and laboratory markers indicating failure of spontaneous liver regeneration."
    ],
    [
        "A 32-year-old female with acetaminophen overdose presenting with blood lactate 5.4 mmol/L after 4 hours of fluid loading.",
        "A 40-year-old male with drug-induced liver injury whose MELD score rises from 24 to 34 over 48 hours without clinical improvement."
    ]
)

# 55: Acute Liver Failure Transplant Referral
BATCH_4[55] = make_entry(
    'acute_liver_failure_transplant_referral',
    "Timely referral to a specialized liver transplant center is the single most vital intervention determining survival in acute liver failure. Listing for emergency liver transplantation (UNOS Status 1A / UK Super-Urgent Scheme) must occur before irreversible multi-organ failure, refractory sepsis, or fixed dilated pupils from cerebral herniation preclude surgery. Understanding the distinct pathophysiological criteria—King's College, Clichy-Villejuif criteria (Factor V < 20-30%), and contraindications to transplantation—enables frontline clinicians to coordinate transfer without fatal delay.",
    [
        ("Immediate contact with a liver transplant center is mandatory as soon as coagulopathy (INR >= 1.5) and any altered mental status occur, rather than delaying until full King's College Criteria listing benchmarks are reached.", ["28461136", "22119905"]),
        ("Under the Clichy-Villejuif criteria (widely used in Europe), fulminant viral hepatitis patients with Factor V level < 20% (age < 30) or Factor V < 30% (age >= 30) in the presence of encephalopathy meet emergency transplant listing criteria.", ["7619894"]),
        ("Super-urgent transplant listing criteria (UNOS Status 1A) require fulminant liver failure with life expectancy < 7 days, manifesting as encephalopathy, mechanical ventilation, renal replacement therapy, or severe coagulopathy (INR > 2.0).", ["22119905"]),
        ("Absolute contraindications to emergency liver transplantation include irreversible catastrophic brain damage (fixed dilated pupils, sustained cerebral perfusion pressure < 40 mmHg), uncontrolled active septic shock, and severe active cardiopulmonary comorbidities.", ["28461136", "22119905"])
    ],
    [
        ("2475730", "Early indicators of prognosis in fulminant hepatic failure (King's College Criteria).", 1989, "trial"),
        ("7619894", "Emergency liver transplantation for fulminant hepatitis: the Clichy-Villejuif criteria.", 1995, "trial"),
        ("28461136", "EASL Clinical Practical Guidelines on the management of acute (fulminant) liver failure.", 2017, "guideline"),
        ("22119905", "AASLD Position Paper: The Management of Acute Liver Failure: Update 2011.", 2012, "guideline")
    ],
    [
        "Transplant eligibility for patients with acute liver failure secondary to intentional substance overdose without established social support.",
        "Safety and outcomes of auxiliary partial orthotopic liver transplantation allowing subsequent native liver recovery and immunosuppression withdrawal."
    ],
    [
        "Factor V level cutoffs in the Clichy-Villejuif criteria indicating need for emergency liver transplantation.",
        "UNOS Status 1A emergency liver allocation criteria and eligibility thresholds.",
        "Clinical contraindications precluding emergency orthotopic liver transplantation in fulminant hepatic failure."
    ],
    [
        "A 19-year-old male with acute hepatitis A, somnolence, Factor V level 16%, and INR 3.8 being evaluated for emergency transfer.",
        "A 45-year-old female with acetaminophen toxicity requiring high norepinephrine doses, refractory hypoxemia, and fixed dilated pupils."
    ]
)

# 56: Acute Lymphoblastic Leukaemia
BATCH_4[56] = make_entry(
    'acute_lymphoblastic_leukaemia',
    "Adult acute lymphoblastic leukemia (ALL) management has been revolutionized by pediatric-inspired multi-agent chemotherapy regimens, molecular risk-stratification, and targeted immunotherapies. In Philadelphia chromosome-positive (Ph+) ALL, combining second- or third-generation tyrosine kinase inhibitors (dasatinib, ponatinib) with blinatumomab has enabled chemotherapy-free induction with high complete molecular remission rates. For relapsed/refractory B-ALL, antibody-drug conjugates (inotuzumab ozogamicin) and bispecific T-cell engagers (blinatumomab) demonstrate marked superiority over conventional salvage.",
    [
        ("In the phase 3 TOWER trial, blinatumomab (CD19/CD3 bispecific T-cell engager) significantly improved overall survival (median 7.7 vs 4.0 months) and complete remission rates compared to standard salvage chemotherapy in relapsed/refractory B-ALL.", ["28249141"]),
        ("The INO-VATE trial showed that inotuzumab ozogamicin (anti-CD22 calicheamicin conjugate) achieved significantly higher CR rates (80.7% vs 29.4%) and higher MRD negativity than standard chemotherapy, though requiring careful monitoring for hepatic sinusoidal obstruction syndrome prior to HSCT.", ["27294709"]),
        ("The D-ALBA trial established that first-line chemotherapy-free induction with dasatinib plus blinatumomab achieved a 98% hematologic complete response rate and high molecular clearance in adult Ph+ B-ALL.", ["33085860"]),
        ("Pediatric-inspired regimens (such as augmented Berlin-Frankfurt-Münster [BFM] or CALGB protocols) significantly improve event-free survival in adolescents and young adults (AYAs, ages 18-39) with Ph-negative ALL compared to historic adult protocols.", ["7686862"])
    ],
    [
        ("28249141", "Blinatumomab versus Chemotherapy for Advanced Acute Lymphoblastic Leukemia (TOWER Trial).", 2017, "trial"),
        ("27294709", "Inotuzumab Ozogamicin versus Standard Therapy for Acute Lymphoblastic Leukemia (INO-VATE Trial).", 2016, "trial"),
        ("7686862", "A five-drug remission induction regimen with intensive consolidation for adults with acute lymphoblastic leukemia: CALGB 8811.", 1995, "trial"),
        ("33085860", "Dasatinib-Blinatumomab for Ph-Positive Acute Lymphoblastic Leukemia in Adults (D-ALBA Trial).", 2020, "trial")
    ],
    [
        "Optimal timing and necessity of consolidative allogeneic stem cell transplantation in adult Ph+ ALL achieving complete molecular remission on blinatumomab and ponatinib.",
        "Sequencing blinatumomab and CAR-T cell therapy (brexucabtagene autoleucel) to prevent CD19 antigen escape."
    ],
    [
        "Mechanism of action and primary toxicities (cytokine release syndrome, ICANS) associated with blinatumomab infusion.",
        "Specific hepatic risk (sinusoidal obstruction syndrome) associated with inotuzumab ozogamicin prior to stem cell transplantation.",
        "Therapeutic benefits of chemotherapy-free combinations (dasatinib/blinatumomab) in Philadelphia chromosome-positive ALL."
    ],
    [
        "A 24-year-old male with newly diagnosed Philadelphia-negative B-ALL being considered for pediatric-inspired multi-agent chemotherapy.",
        "A 48-year-old female with relapsed B-ALL following previous hyper-CVAD, being evaluated for blinatumomab versus inotuzumab salvage."
    ]
)

# 57: Acute MS Relapse
BATCH_4[57] = make_entry(
    'acute_ms_relapse_corticosteroids_vs_plex',
    "Acute relapses in multiple sclerosis (MS) present as subacute neurological deficits developing over hours to days in the absence of fever or infection. High-dose corticosteroids (intravenous or oral methylprednisolone 1,000 mg daily for 3-5 days) represent the first-line standard of care, accelerating functional recovery as proven in the Optic Neuritis Treatment Trial (ONTT) and COPOUSEP trials. In patients with severe, disabling deficits refractory to high-dose steroids, therapeutic plasma exchange (PLEX) provides proven rescue therapy, demonstrating marked functional improvement when instituted early.",
    [
        ("The Optic Neuritis Treatment Trial (ONTT) demonstrated that high-dose intravenous methylprednisolone (1 g daily for 3 days) followed by oral prednisone accelerated visual recovery compared to placebo, whereas oral prednisone alone at standard doses increased relapse recurrence rates.", ["1732049"]),
        ("The double-blind COPOUSEP non-inferiority trial demonstrated that oral methylprednisolone (1,000 mg daily for 3 days) is clinically non-inferior to intravenous methylprednisolone in achieving functional recovery at day 28 in acute MS relapses.", ["26189914"]),
        ("In a sham-controlled randomized trial by Weinshenker et al., therapeutic plasma exchange (PLEX, 5-7 exchanges over 14 days) produced moderate to marked neurological recovery in 42.1% of patients with severe steroid-refractory acute inflammatory demyelinating relapses versus 5.9% with sham treatment.", ["10606451"]),
        ("Pseudo-relapses—transient re-emergence of previous neurological deficits triggered by infection (e.g., UTI), elevated core body temperature (Uhthoff phenomenon), or metabolic stress—must be ruled out before initiating high-dose immunosuppressive therapies.", ["29527230"])
    ],
    [
        ("1732049", "The clinical profile of optic neuritis: Experience of the Optic Neuritis Treatment Trial.", 1991, "trial"),
        ("10606451", "A randomized trial of plasma exchange in acute central nervous system demyelinating disease.", 1999, "trial"),
        ("26189914", "Oral versus intravenous high-dose methylprednisolone for treatment of relapses in patients with multiple sclerosis (COPOUSEP).", 2015, "trial"),
        ("29527230", "Diagnosis of multiple sclerosis: 2017 revisions of the McDonald criteria.", 2018, "guideline")
    ],
    [
        "Efficacy and safety of intravenous immunoglobulin (IVIG) as a rescue alternative when therapeutic plasma exchange is contraindicated.",
        "Long-term neuroaxonal protection of ultra-early plasma exchange instituted within 7 days of steroid failure."
    ],
    [
        "Clinical equivalence and route administration evidence between high-dose oral versus IV methylprednisolone from COPOUSEP.",
        "Efficacy and timing of therapeutic plasma exchange in steroid-refractory severe central nervous system demyelinating attacks.",
        "Distinction between authentic inflammatory MS relapse and infection-triggered pseudo-relapse (Uhthoff phenomenon)."
    ],
    [
        "A 28-year-old female with relapsing-remitting MS presenting with dense paraparesis and bladder retention whose deficits progress despite 5 days of 1 g IV methylprednisolone.",
        "A 36-year-old male with MS who develops blurred vision and paresthesias in the setting of fever and pyuria."
    ]
)

# 58: Acute Myeloid Leukaemia
BATCH_4[58] = make_entry(
    'acute_myeloid_leukaemia',
    "Acute myeloid leukemia (AML) management is anchored in rapid cytogenetic and molecular risk stratification under the 2022 European LeukemiaNet (ELN) recommendations. For fit adult patients, traditional '7+3' cytarabine and anthracycline induction is now systematically enhanced by targeted agents: adding the FLT3 inhibitor midostaurin in FLT3-mutated AML (RATIFY trial), or the anti-CD33 antibody-drug conjugate gemtuzumab ozogamicin in favorable-risk cytogenetics (ALFA-0701 trial). Defining measurable residual disease (MRD) after induction guides the decision to pursue allogeneic stem cell transplantation in CR1.",
    [
        ("The ELN 2022 classification stratifies AML into Favorable (e.g., inv(16), t(8;21), mutated NPM1 without FLT3-ITD), Intermediate, and Adverse (e.g., mutated TP53, complex karyotype, adverse gene fusions, myelodysplasia-related gene mutations).", ["35797463"]),
        ("The international RATIFY trial established that adding the multikinase FLT3 inhibitor midostaurin to standard 7+3 induction and consolidation significantly prolonged overall survival (hazard ratio for death 0.78, p=0.009) in both FLT3-ITD and FLT3-TKD mutated AML.", ["28644114"]),
        ("The ALFA-0701 randomized trial demonstrated that fractionated gemtuzumab ozogamicin added to standard induction improved event-free and overall survival in patients with favorable and intermediate-risk cytogenetics, without increasing fatal toxicities.", ["22521382"]),
        ("Flow cytometric or molecular measurable residual disease (MRD) negativity after consolidation is the strongest predictor of long-term relapse-free survival and stratifies the necessity of allogeneic stem cell transplantation in intermediate-risk disease.", ["35797463"])
    ],
    [
        ("35797463", "Diagnosis and management of AML in adults: 2022 recommendations from an international expert panel on behalf of the ELN.", 2022, "guideline"),
        ("28644114", "Midostaurin plus Chemotherapy for Acute Myeloid Leukemia with a FLT3 Mutation (RATIFY Trial).", 2017, "trial"),
        ("22521382", "Effect of gemtuzumab ozogamicin on survival of adult patients with de-novo acute myeloid leukaemia (ALFA-0701).", 2012, "trial"),
        ("19776406", "Intensive chemotherapy does not benefit most older patients (age 70 years or older) with acute myeloid leukemia.", 2009, "review")
    ],
    [
        "Survival benefit of post-transplant maintenance therapy with second-generation FLT3 inhibitors (gilteritinib) across various FLT3-ITD allelic ratios.",
        "Efficacy of intensive induction versus targeted hypomethylating agent combinations in fit patients aged 60-75 with adverse-risk cytogenetics."
    ],
    [
        "Prognostic risk classification under ELN 2022 based on NPM1, FLT3-ITD, and TP53 mutational status.",
        "Survival benefits of adding midostaurin to 7+3 chemotherapy in FLT3-mutated AML based on the RATIFY trial.",
        "Role of gemtuzumab ozogamicin in favorable versus adverse risk cytogenetic subgroups."
    ],
    [
        "A 46-year-old female with newly diagnosed AML whose bone marrow shows 60% blasts with FLT3-ITD high allelic ratio mutation.",
        "A 55-year-old male with inv(16) core-binding factor AML being evaluated for fractionated gemtuzumab ozogamicin integration."
    ]
)

# 59: Acute Myeloid Leukemia Venetoclax Azacitidine
BATCH_4[59] = make_entry(
    'acute_myeloid_leukemia_venetoclax_azacitidine',
    "The combination of the selective oral BCL-2 inhibitor venetoclax with a hypomethylating agent (azacitidine or decitabine) has transformed the therapeutic landscape for older adults (>= 75 years) or younger patients unfit for intensive chemotherapy. In the landmark VIALE-A trial, venetoclax plus azacitidine demonstrated marked improvements in complete remission rates and overall survival over azacitidine monotherapy. Managing this regimen demands rigorous tumor lysis syndrome (TLS) ramp-up prophylaxis, protocolized bone marrow reassessment on day 28, and proactive dose delays or growth factor support for prolonged cytopenias.",
    [
        ("In the global phase 3 VIALE-A trial, venetoclax combined with azacitidine significantly improved median overall survival (14.7 months vs 9.6 months; hazard ratio for death 0.66, p<0.001) and composite complete remission rate (66.4% vs 28.3%) compared with azacitidine alone in patients ineligible for intensive chemotherapy.", ["32786187"]),
        ("In patients receiving low-dose cytarabine backbones, the VIALE-C trial demonstrated superior composite remission (48% vs 13%) and clinically meaningful survival extension with the addition of venetoclax.", ["33074098", "31104944"]),
        ("Tumor lysis syndrome (TLS) mitigation requires cytoreduction with hydroxyurea for white blood cell counts > 25,000/uL, vigorous hydration, rasburicase or allopurinol, and structured daily venetoclax ramp-up (100 mg, 200 mg, 400 mg daily).", ["32786187", "35797463"]),
        ("When co-administered with strong CYP3A4 inhibitors (e.g., posaconazole, voriconazole), venetoclax dosage must be reduced by 75% (to 100 mg daily), and by 50% (to 200 mg daily) with moderate CYP3A4 inhibitors (e.g., fluconazole).", ["32786187", "35797463"])
    ],
    [
        ("32786187", "Azacitidine and Venetoclax in Previously Untreated Acute Myeloid Leukemia (VIALE-A Trial).", 2020, "trial"),
        ("33074098", "Venetoclax combined with low-dose cytarabine for previously untreated acute myeloid leukemia: results from the randomized phase 3 VIALE-C study.", 2020, "trial"),
        ("31104944", "Venetoclax plus low-dose cytarabine in older patients with acute myeloid leukaemia: a phase 1/2 study.", 2019, "trial"),
        ("35797463", "Diagnosis and management of AML in adults: 2022 recommendations from an international expert panel on behalf of the ELN.", 2022, "guideline")
    ],
    [
        "Mechanisms and optimal second-line salvage therapies for AML developing resistance to venetoclax (e.g., MCL-1 upregulation or FLT3 acquisition).",
        "Optimal duration of venetoclax consolidation and potential safety of elective drug holidays in patients in sustained MRD-negative remission."
    ],
    [
        "Overall survival and complete remission benefits from the VIALE-A trial evaluating venetoclax plus azacitidine.",
        "Mandatory venetoclax dose reduction percentages when concurrently administering strong azole antifungals.",
        "Pre-treatment tumor lysis syndrome mitigation strategies including target pre-induction leukocyte count thresholds."
    ],
    [
        "A 76-year-old male with de novo AML and coronary artery disease initiating venetoclax and azacitidine with baseline WBC 42,000/uL.",
        "A 72-year-old female on venetoclax/azacitidine who develops invasive pulmonary aspergillosis requiring posaconazole therapy."
    ]
)

# 60: Acute Myocarditis
BATCH_4[60] = make_entry(
    'acute_myocarditis',
    "Acute myocarditis encompasses an inflammatory spectrum ranging from mild chest pain with transient troponin elevation to fulminant cardiogenic shock and fatal ventricular arrhythmias. While historic Dallas histopathological criteria suffered from low sensitivity and biopsy sampling error, contemporary diagnosis centers on multiparametric cardiac magnetic resonance (CMR) utilizing the updated Lake Louise Criteria (T1 and T2 mapping). Endomyocardial biopsy remains mandatory in progressive or fulminant presentations to identify specific subtypes—such as giant cell myocarditis or eosinophilic myocarditis—where emergency immunosuppressive regimens are life-saving.",
    [
        ("Under the 2018 Updated Lake Louise Criteria, CMR diagnosis of acute myocarditis requires at least one T2-based criterion (myocardial edema on T2-weighted imaging or elevated myocardial T2 relaxation time) and at least one T1-based criterion (late gadolinium enhancement, increased myocardial T1 relaxation time, or extracellular volume fraction).", ["30482356"]),
        ("AHA/ACC/ESC guidelines reserve endomyocardial biopsy for specific clinical scenarios: new-onset heart failure of < 2 weeks' duration associated with hemodynamic compromise, or heart failure of 2 weeks to 3 months with ventricular arrhythmias, conduction block, or failure to respond to standard therapy within 1-2 weeks.", ["17965395", "23824828"]),
        ("Giant cell myocarditis carries a median survival of < 6 months without transplantation; Cooper et al. demonstrated that combined aggressive immunosuppression (cyclosporine, corticosteroids, and azathioprine or anti-thymocyte globulin) prolonged transplant-free survival to 12.3 months.", ["9203427"]),
        ("Routine immunosuppression is not recommended for mild lymphocytic myocarditis with preserved ejection fraction; management consists of standard guideline-directed medical therapy for heart failure, arrhythmia surveillance, and strict avoidance of competitive exercise for 3 to 6 months.", ["23824828"])
    ],
    [
        ("23824828", "Current state of knowledge on etiology, diagnosis, management, and pharmacotherapy of myocarditis: position statement of ESC Working Group.", 2013, "guideline"),
        ("30482356", "Cardiac Magnetic Resonance Targets in Myocarditis: The Updated Lake Louise Criteria.", 2018, "guideline"),
        ("9203427", "The clinical spectrum of giant-cell myocarditis: results of a prospective registry.", 1997, "trial"),
        ("17965395", "The role of endomyocardial biopsy in the management of cardiovascular disease: scientific statement from AHA, ACC, and ESC.", 2007, "guideline")
    ],
    [
        "Optimal immunosuppression duration and taper regimens in biopsy-proven virus-negative chronic lymphocytic myocarditis.",
        "Long-term prognostic significance of persistent late gadolinium enhancement on follow-up CMR despite complete clinical recovery."
    ],
    [
        "Diagnostic components of the 2018 Updated Lake Louise CMR Criteria (T1 and T2 imaging markers).",
        "Class I indications for urgent endomyocardial biopsy in new-onset acute heart failure according to AHA/ACC/ESC.",
        "Prognosis and prompt multi-agent immunosuppressive management of biopsy-proven giant cell myocarditis."
    ],
    [
        "A 24-year-old male with retrosternal chest pain, troponin I elevation to 4.8 ng/mL, and normal coronary angiography 10 days after a febrile viral illness.",
        "A 42-year-old female presenting with rapidly progressive cardiogenic shock, third-degree AV block, and refractory ventricular tachycardia undergoing urgent endomyocardial biopsy."
    ]
)
