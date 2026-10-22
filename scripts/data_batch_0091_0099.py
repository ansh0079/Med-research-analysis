# data_batch_0091_0099.py
"""
Definitions for Batch 7 of Topics 1-100 (Topics 91 to 99).
"""
from data_batch_0001_0015 import make_entry

BATCH_7 = {}

# 91: Advanced Melanoma Immunotherapy
BATCH_7[91] = make_entry(
    'advanced_melanoma_immunotherapy',
    "The therapeutic paradigm for advanced/metastatic melanoma has been revolutionized by immune checkpoint blockade targeting PD-1 and CTLA-4. In the benchmark CheckMate 067 trial, dual checkpoint inhibition with nivolumab plus ipilimumab achieved unprecedented durable 6.5-year overall survival (49% vs 42% for nivolumab alone and 23% for ipilimumab alone), with median overall survival reaching 72.1 months. While dual therapy yields the highest response rates (58%) and intracranial control, it induces severe Grade 3/4 immune-related adverse events (irAEs) in 59% of patients, necessitating proactive monitoring, prompt high-dose corticosteroid intervention, and careful risk-benefit stratification against anti-PD-1 monotherapy.",
    [
        ("In the landmark phase 3 CheckMate 067 trial (Wolchok et al., NEJM), nivolumab plus ipilimumab achieved a median overall survival of 72.1 months and a 6.5-year overall survival rate of 49%, establishing dual checkpoint blockade as the most potent frontline regimen.", ["34818487"]),
        ("Nivolumab monotherapy in CheckMate 067 demonstrated robust efficacy with a 6.5-year survival rate of 42% and a substantially lower rate of Grade 3/4 treatment-related adverse events (24%) compared to combination therapy (59%).", ["34818487", "28889792"]),
        ("The randomized phase 3 KEYNOTE-006 trial established pembrolizumab (anti-PD-1) superiority over ipilimumab in both treatment-naive and previously treated advanced melanoma, prolonging progression-free and overall survival with significantly lower toxicity.", ["25891173"]),
        ("Immune-related adverse events (colitis, hepatitis, hypophysitis, pneumonitis, myocarditis) require protocolized grading and prompt high-dose systemic corticosteroids (prednisone 1-2 mg/kg/day or IV methylprednisolone); refractory colitis responds rapidly to infliximab or vedolizumab.", ["34818487", "25891173"])
    ],
    [
        ("34818487", "Long-Term Outcomes With Nivolumab Plus Ipilimumab or Nivolumab Alone Versus Ipilimumab in Patients With Advanced Melanoma (CheckMate 067).", 2022, "trial"),
        ("28889792", "Overall Survival with Combined Nivolumab and Ipilimumab in Advanced Melanoma.", 2017, "trial"),
        ("25891173", "Pembrolizumab versus Ipilimumab in Advanced Melanoma (KEYNOTE-006).", 2015, "trial")
    ],
    [
        "Optimal sequencing and selection between dual immunotherapy (nivo/ipi) versus targeted BRAF/MEK inhibitors (dabrafenib/trametinib) in treatment-naive BRAF V600E-mutant metastatic melanoma.",
        "Duration of anti-PD-1 therapy and safety of elective treatment discontinuation in patients achieving sustained complete radiologic response at 2 years."
    ],
    [
        "Survival statistics and long-term durability of dual nivolumab/ipilimumab from CheckMate 067.",
        "Incidence and management algorithms for Grade 3/4 immune-related adverse events during combination immunotherapy.",
        "Comparative outcomes of pembrolizumab versus ipilimumab established in the KEYNOTE-006 trial."
    ],
    [
        "A 54-year-old male with BRAF wild-type metastatic melanoma presenting with liver and lung metastases initiating nivolumab 1 mg/kg plus ipilimumab 3 mg/kg.",
        "A 62-year-old female on cycle 3 of dual checkpoint inhibition who develops 8 watery bowel movements daily, crampy abdominal pain, and endoscopic ulceration consistent with Grade 3 immune-mediated colitis."
    ]
)

# 92: Advanced Urothelial Carcinoma Treatment
BATCH_7[92] = make_entry(
    'advanced_urothelial_carcinoma',
    "The treatment landscape of locally advanced or metastatic urothelial carcinoma has been fundamentally transformed by the antibody-drug conjugate (ADC) enfortumab vedotin paired with the anti-PD-1 inhibitor pembrolizumab. In the practice-changing EV-302 phase 3 trial, enfortumab vedotin plus pembrolizumab nearly doubled median overall survival compared to traditional platinum-based chemotherapy (gemcitabine plus cisplatin or carboplatin), establishing a new frontline standard of care regardless of cisplatin eligibility. In patients receiving initial platinum chemotherapy, the JAVELIN Bladder 100 trial proved that switch maintenance avelumab significantly extends survival in those without disease progression.",
    [
        ("In the global phase 3 EV-302 / KEYNOTE-A39 trial (Powles et al., NEJM), enfortumab vedotin combined with pembrolizumab nearly doubled median overall survival (31.5 vs 16.1 months; hazard ratio for death 0.47, p<0.001) compared with platinum-based chemotherapy.", ["38446675"]),
        ("The landmark JAVELIN Bladder 100 randomized trial proved that avelumab maintenance therapy (anti-PD-L1) significantly prolonged median overall survival (21.4 vs 14.3 months, HR 0.69) in patients with advanced urothelial carcinoma whose disease did not progress after 4-6 cycles of first-line platinum-gemcitabine chemotherapy.", ["32945632"]),
        ("Enfortumab vedotin targets Nectin-4 to deliver the microtubule-disrupting cytotoxic payload monomethyl auristatin E (MMAE); cardinal toxicities require rigorous monitoring for peripheral neuropathy, severe cutaneous adverse reactions (Stevens-Johnson syndrome), and hyperglycemia.", ["38446675"]),
        ("For patients with advanced urothelial carcinoma harboring susceptible FGFR3 or FGFR2 genetic alterations who progress after platinum chemotherapy, the oral FGFR tyrosine kinase inhibitor erdafitinib demonstrates proven survival extension over single-agent chemotherapy.", ["38446675", "32945632"])
    ],
    [
        ("38446675", "Enfortumab Vedotin and Pembrolizumab in Untreated Advanced Urothelial Cancer (EV-302 Trial).", 2024, "trial"),
        ("32945632", "Avelumab Maintenance Therapy for Advanced or Metastatic Urothelial Carcinoma (JAVELIN Bladder 100).", 2020, "trial")
    ],
    [
        "Sequencing and optimal subsequent salvage therapies (e.g., sacituzumab govitecan, platinum rechallenge, erdafitinib) following frontline failure of enfortumab vedotin plus pembrolizumab.",
        "Role of perioperative neoadjuvant enfortumab vedotin plus pembrolizumab prior to radical cystectomy in muscle-invasive bladder cancer."
    ],
    [
        "Magnitude of overall survival benefit with enfortumab vedotin plus pembrolizumab versus platinum chemotherapy in the EV-302 trial.",
        "Clinical design, inclusion criteria, and survival benefits of avelumab switch maintenance in JAVELIN Bladder 100.",
        "Distinct mechanism-based toxicities of enfortumab vedotin (rash/SJS, neuropathy, hyperglycemia)."
    ],
    [
        "A 68-year-old male with newly diagnosed metastatic urothelial carcinoma (visceral lung metastases) and borderline renal function (eGFR 48 mL/min) initiating frontline enfortumab vedotin plus pembrolizumab.",
        "A 71-year-old female with stable disease after 6 cycles of gemcitabine/carboplatin initiated on maintenance avelumab 10 mg/kg every 2 weeks."
    ]
)

# 93: Agitation: Acute Inpatient Assessment & Management
BATCH_7[93] = make_entry(
    'agitation_acute_inpatient_management',
    "Agitation in hospitalized adult medical and surgical patients represents a clinical emergency reflecting underlying delirium, substance intoxication or withdrawal, toxic-metabolic encephalopathy, or acute exacerbation of psychiatric illness. Systematic clinical evaluation utilizing the Richmond Agitation-Sedation Scale (RASS) objectively gauges severity. The initial approach prioritizes environmental optimization, de-escalation, addressing uncomfortable physical triggers (pain, urinary retention, hypoxia, constipation), and minimizing deliriogenic restraints. When severe aggression endangers the patient or staff, structured pharmacological calming (rapid tranquilization with oral or parenteral atypical antipsychotics) is implemented with continuous airway and vital sign monitoring.",
    [
        ("Structured bedside agitation scoring using validated tools such as the Richmond Agitation-Sedation Scale (RASS; ranging from +4 combative to -5 unarousable) allows objective titration of behavioral and pharmacological calming interventions.", ["12432012"]),
        ("NICE Guideline NG103 emphasizes that non-pharmacological interventions—reorientation, reassurance, family presence, lighting regulation, noise reduction, and pain control—are the mandatory first-line strategy for agitated delirium in hospital inpatients.", ["31504429"]),
        ("In the multicenter TREC randomized trials of rapid tranquilization in emergency settings, intramuscular olanzapine or haloperidol plus promethazine achieved rapid tranquility within 15-30 minutes with significantly lower risks of respiratory depression than parenteral benzodiazepines.", ["16905298"]),
        ("Physical restraints are an intervention of absolute last resort, carry high risks of strangulation, blunt trauma, and worsening agitation, and mandate continuous 1-on-1 nursing observation and regular vital sign checks every 15 minutes.", ["31504429", "12432012"])
    ],
    [
        ("12432012", "The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients.", 2002, "trial"),
        ("31504429", "NICE Guideline NG103: Delirium: prevention, diagnosis and management in healthcare settings.", 2019, "guideline"),
        ("16905298", "Rapid tranquilisation in psychiatric emergencies: Cochrane systematic review and meta-analysis of the TREC trials.", 2006, "trial")
    ],
    [
        "Role of sublingual or intravenous dexmedetomidine as a non-deliriogenic, non-respiratory-depressant sedative for severe agitation outside the ICU.",
        "Risk-benefit ratio of short-course low-dose oral atypical antipsychotics in elderly demented patients with persistent non-injurious restlessness."
    ],
    [
        "Operational scoring and clinical interpretation of the Richmond Agitation-Sedation Scale (RASS).",
        "Evidence from the TREC trials comparing intramuscular antipsychotics, promethazine, and benzodiazepines for rapid tranquilization.",
        "Standard medical workup (PQRST approach) to identify remediable organic triggers of acute delirium and agitation."
    ],
    [
        "A 77-year-old post-operative male who becomes combative, pulling at his urinary catheter and IV lines, responding to gentle verbal reorientation, pain control, and catheter removal.",
        "A 30-year-old male with acute amphetamine intoxication displaying extreme violent agitation (RASS +4), tranquilized safely with IM olanzapine under continuous cardiac and pulse oximetry monitoring."
    ]
)

# 94: Air Embolism: Venous vs Arterial & Hyperbaric Oxygen
BATCH_7[94] = make_entry(
    'air_embolism_management',
    "Vascular air embolism is a rare but catastrophic iatrogenic or barotraumatic event categorized into Venous Air Embolism (VAE; entrainment into systemic venous circulation or right heart) and Arterial Air Embolism (AAE; air entering pulmonary veins, left heart, or systemic arteries, leading to cerebral or coronary occlusions). VAE occurs during central venous catheter placement/removal, neurosurgical operations in the sitting position, or laparoscopic insufflation, precipitating right ventricular outflow tract 'air lock' and cardiovascular collapse. Immediate management requires stopping air ingress, 100% high-flow oxygen, Durant maneuver (left lateral decubitus and Trendelenburg positioning), and urgent hyperbaric oxygen (HBOT) therapy.",
    [
        ("Venous air embolism entering the right ventricle creates a mechanical 'air lock' obstructing the pulmonary artery, producing acute pulmonary hypertension, acute cor pulmonale, profound hypotension, and sudden drop in end-tidal CO2 (EtCO2).", ["17255858"]),
        ("Immediate bedside rescue positioning for suspected venous air embolism is the Durant maneuver: placing the patient in the left lateral decubitus and Trendelenburg position, which traps the air bubble at the apex of the right ventricle away from the pulmonary outflow tract.", ["17255858", "23625946"]),
        ("Administration of 100% inspired oxygen accelerates bubble reabsorption by washing out systemic nitrogen, creating a steep nitrogen concentration gradient from the bubble into blood and reducing bubble volume.", ["17255858"]),
        ("Hyperbaric oxygen therapy (HBOT at 2.8 to 3.0 atmospheres absolute) is the definitive treatment of choice for arterial gas embolism and severe venous embolism with neurological or hemodynamic impairment, rapidly compressing bubble diameter (Boyle's law) and restoring microvascular tissue perfusion.", ["23625946", "17255858"])
    ],
    [
        ("17255858", "Diagnosis and treatment of vascular air embolism.", 2007, "review"),
        ("23625946", "Air embolism: a review of the pathophysiology, diagnosis, and management.", 2013, "review")
    ],
    [
        "Feasibility and success rates of emergency aspiration of air through a central venous catheter positioned in the superior vena cava or right atrium.",
        "Long-term neurological outcomes of delayed hyperbaric oxygen therapy initiated > 6 to 12 hours after the embolic insult."
    ],
    [
        "Pathophysiological rationale of the Durant maneuver (left lateral decubitus + Trendelenburg) in right ventricular air lock.",
        "Mechanism of high-flow 100% oxygen and hyperbaric oxygen therapy in accelerating bubble clearance.",
        "Clinical differences in presentation between venous air embolism (pulmonary shock) versus arterial air embolism (stroke, acute MI)."
    ],
    [
        "A 61-year-old female undergoing central venous catheter removal in an upright sitting posture who suddenly gasps, becomes cyanotic, and develops cardiovascular collapse.",
        "A 45-year-old scuba diver presenting with acute left-sided hemiplegia and altered consciousness immediately after rapid ascent, transferred for emergency hyperbaric recompression."
    ]
)

# 95: Airway Management: DAS Algorithm & Difficult Airway Assessment
BATCH_7[95] = make_entry(
    'airway_management_das_guidelines',
    "Systematic airway management requires structured pre-intubation difficult airway assessment and adherence to validated rescue algorithms to avoid the dreaded 'cannot intubate, cannot oxygenate' (CICO) scenario. The 4th National Audit Project (NAP4) in the United Kingdom revealed that poor airway assessment, failure to plan for difficult intubation, and persistent repeated laryngoscopy attempts are the leading causes of catastrophic airway brain damage and death. The 2015 Difficult Airway Society (DAS) guidelines structure unanticipated difficult tracheal intubation into four sequential plans: Plan A (facemask and video-laryngoscopy), Plan B (second-generation supraglottic airway device [SAD]), Plan C (facemask oxygenation and waking the patient), and Plan D (emergency front-of-neck access [FONA]).",
    [
        ("The NAP4 major airway complications audit demonstrated that unrecognized esophageal intubation, repeated blind attempts at laryngoscopy, and delay in performing surgical cricothyroidotomy were major causes of fatal airway outcomes.", ["21447488"]),
        ("The 2015 Difficult Airway Society (DAS) guidelines structure failed intubation into a strict sequential protocol: Plan A (tracheal intubation with video-laryngoscopy, maximum 3+1 attempts); Plan B (maintaining oxygenation with a 2nd generation supraglottic airway device); Plan C (facemask oxygenation); Plan D (emergency front-of-neck access).", ["26558848"]),
        ("Second-generation supraglottic airway devices (e.g., i-gel, ProSeal LMA) are superior to first-generation LMAs because of higher seal pressures (> 30 cmH2O) and a separate gastric drainage port that reduces pulmonary aspiration risk.", ["26558848"]),
        ("Plan D (Emergency Front-of-Neck Access / FONA) mandates a scalpel-bougie-tube cricothyroidotomy (stab incision through the cricothyroid membrane, coude-tip bougie insertion, and railroading a 6.0 mm cuffed endotracheal tube), which is faster and more reliable than needle/cannula techniques.", ["26558848", "21447488"])
    ],
    [
        ("26558848", "Difficult Airway Society 2015 guidelines for management of unanticipated difficult intubation in adults.", 2015, "guideline"),
        ("21447488", "Major complications of airway management in the UK: results of the Fourth National Audit Project of the Royal College of Anaesthetists and the Difficult Airway Society (NAP4).", 2011, "guideline")
    ],
    [
        "Awake video-laryngoscopy versus awake flexible fiberoptic bronchoscopic intubation in predicted anatomically difficult airways.",
        "Role of high-flow nasal oxygen (THRIVE) in prolonging safe apnoea time during difficult airway induction."
    ],
    [
        "Sequential operational steps of Plans A, B, C, and D in the 2015 Difficult Airway Society guidelines.",
        "Anatomical and clinical parameters comprising the LEMON difficult airway assessment framework.",
        "Technical execution of the scalpel-bougie-tube emergency front-of-neck access technique."
    ],
    [
        "A 52-year-old male with severe Ludwig angina and limited mouth opening (inter-incisor distance 1.5 cm) evaluated for awake fiberoptic intubation versus primary tracheostomy.",
        "An emergency patient where direct laryngoscopy fails (Plan A) and supraglottic airway fails (Plan B), who desaturates to 68% despite facemask (Plan C), triggering emergency scalpel-bougie FONA."
    ]
)

# 96: Airway Management in the ICU: RSI & Video-Laryngoscopy
BATCH_7[96] = make_entry(
    'airway_management_in_icu',
    "Endotracheal intubation in the intensive care unit is a high-risk procedure carrying a 10-to-20-fold higher incidence of life-threatening complications (severe hypoxemia, cardiovascular collapse, cardiac arrest) compared to elective operating room intubations. The landmark DEVICE trial (Prekker et al., NEJM) definitively established that video-laryngoscopy significantly improves first-pass intubation success (85.1% vs 70.8%) compared to direct laryngoscopy in critically ill adults. Structured ICU intubation bundles—comprising pre-oxygenation with HFNC or NIV, hemodynamic optimization, mandatory video-laryngoscopy, neuromuscular blockade, and capnography confirmation—mitigate peri-intubation morbidity.",
    [
        ("In the multicenter randomized DEVICE trial (1,417 critically ill patients, Prekker et al., NEJM), video-laryngoscopy resulted in a higher rate of successful intubation on the first attempt compared with direct laryngoscopy (85.1% vs 70.8%; absolute difference 14.2 percentage points, p<0.001).", ["37326325"]),
        ("The French MACMAN randomized trial demonstrated that video-laryngoscopy did not improve first-pass intubation when performed by highly experienced operators with standard Mac blades, highlighting that operator familiarity and blade geometry (hyperangulated vs standard) dictate performance.", ["28114623"]),
        ("DAS and Intensive Care Society (ICS) guidelines for management of the critically ill airway recommend mandatory pre-oxygenation with non-invasive ventilation (NIV) or high-flow nasal oxygen, aggressive fluid and vasopressor pre-loading, and continuous waveform capnography.", ["29126840"]),
        ("Peri-intubation cardiovascular collapse occurs in up to 30% of critically ill patients; prophylactic pre-induction initiation of peripheral norepinephrine or push-dose vasopressors significantly reduces severe hypotension and cardiac arrest during induction.", ["29126840", "37326325"])
    ],
    [
        ("37326325", "Video versus Direct Laryngoscopy for Tracheal Intubation of Critically Ill Adults (DEVICE Trial).", 2023, "trial"),
        ("28114623", "Effect of Video Laryngoscopy on First-Pass Success Among Patients with Anticipated Difficult Tracheal Intubation in the Intensive Care Unit: A Randomized Clinical Trial (MACMAN).", 2017, "trial"),
        ("29126840", "Difficult Airway Society guidelines for the management of tracheal intubation in critically ill adults.", 2018, "guideline")
    ],
    [
        "Hyperangulated video-laryngoscope blades versus standard Macintosh-geometry video blades in patients with immobilized cervical spines.",
        "Ketamine versus etomidate as the induction agent of choice in septic shock patients at risk of adrenal suppression."
    ],
    [
        "First-pass success rates and clinical findings comparing video versus direct laryngoscopy in the DEVICE trial.",
        "Key physiological differences and hazard profiles between ICU emergency intubation versus elective operating theatre intubation.",
        "Components of the DAS/ICS ICU airway bundle to prevent post-induction hemodynamic collapse."
    ],
    [
        "A 66-year-old male with severe septic shock and ARDS requiring emergency intubation, where video-laryngoscopy achieves immediate first-pass vocal cord visualization.",
        "A 59-year-old female with acute hypoxemic respiratory failure pre-oxygenated on BiPAP with continuous push-dose phenylephrine infusing to prevent induction hypotension."
    ]
)

# 97: Airway Obstruction in Malignancy
BATCH_7[97] = make_entry(
    'airway_obstruction_in_malignancy',
    "Malignant central airway obstruction (CAO) is a life-threatening complication occurring in up to 20-30% of advanced lung cancers and metastatic malignancies (esophagus, thyroid, melanoma, breast). Patients present with stridor, severe dyspnea, wheezing mistakenly treated as asthma, recurrent post-obstructive pneumonias, or hemoptysis. Emergency management requires high-dose corticosteroids, heliox (helium-oxygen mixture) to reduce airway resistance in laminar flow, and emergent multidisciplinary interventional pulmonology consultation. Rigid bronchoscopy is the optimal platform to secure the airway, de-bulk endobronchial tumor via ablative modalities (electrocautery, APC, cryotherapy), and deploy self-expanding metallic or silicone tracheobronchial stents.",
    [
        ("American College of Chest Physicians (CHEST) guidelines recommend rigid bronchoscopy under general anesthesia as the preferred diagnostic and therapeutic interventional modality for severe malignant central airway obstruction.", ["12631580"]),
        ("Immediate mechanical airway recanalization is achieved via rigid bronchoscope core-out debridement combined with immediate ablative thermal modalities (argon plasma coagulation [APC], electrocautery, or contact diode laser).", ["12631580", "26046961"]),
        ("Airway stenting with silicone (Dumon) or self-expanding covered metallic stents (SEMS) provides immediate structural stabilization for extrinsic airway compression or mixed endobronchial/extrinsic obstruction, restoring airway lumen in > 90% of cases.", ["26046961"]),
        ("In the multicenter AQuIRE registry study (Ost et al., Chest), therapeutic bronchoscopy for malignant CAO resulted in immediate, statistically significant improvements in dyspnea, health-related quality of life, and lung function, with complication rates < 4% in experienced centers.", ["26046961"])
    ],
    [
        ("12631580", "Interventional pulmonology: guidelines for providing and operating an interventional pulmonology service (CHEST Guidelines).", 2003, "guideline"),
        ("26046961", "Therapeutic bronchoscopy for malignant central airway obstruction: results from the AQuIRE registry.", 2015, "trial")
    ],
    [
        "Silicone versus fully covered self-expanding metallic stents in long-term complication profiles (mucus plugging, migration, granulation tissue).",
        "Role of endobronchial brachytherapy versus external beam radiotherapy in maintaining long-term airway patency after mechanical de-bulking."
    ],
    [
        "Clinical indications and therapeutic advantages of rigid bronchoscopy over flexible bronchoscopy in critical malignant airway obstruction.",
        "Quality of life and functional outcomes documented in the AQuIRE prospective multicenter registry.",
        "Distinction between intrinsic intraluminal, extrinsic compressive, and mixed airway obstructions and corresponding stenting choices."
    ],
    [
        "A 62-year-old male with squamous cell lung carcinoma presenting with inspiratory and expiratory stridor, whose CT reveals 85% tracheal luminal narrowing from an exophytic endotracheal mass.",
        "A 55-year-old female with metastatic esophageal cancer causing critical extrinsic compression of the left main bronchus, treated with a fully covered self-expanding metallic stent."
    ]
)

# 98: AKI Diagnosis and Management: Bundles & Fluid Stewardship
BATCH_7[98] = make_entry(
    'aki_diagnosis_and_management',
    "Acute kidney injury (AKI) diagnosis and management focuses on early detection, etiology identification, avoidance of compounding toxicities, and fluid stewardship. Under KDIGO recommendations, identifying AKI early via paired serum creatinine and hourly urine output monitoring mandates implementation of the KDIGO Stage-based Care Bundle. In resuscitating patients at risk of or suffering from AKI, the landmark SMART and SALT-ED randomized trials demonstrated that balanced crystalloids (Plasma-Lyte or Lactated Ringer's) significantly reduce Major Adverse Kidney Events at 30 days (MAKE30) compared to 0.9% normal saline, avoiding hyperchloremia-induced renal arteriolar vasoconstriction.",
    [
        ("In the landmark SMART trial of 15,802 critically ill adults (Semler et al., NEJM), intravenous resuscitation with balanced crystalloids significantly lowered the 30-day incidence of Major Adverse Kidney Events (MAKE30: death, new RRT, or persistent renal dysfunction) compared with 0.9% saline (14.3% vs 15.4%, p=0.04).", ["29485926"]),
        ("The companion SALT-ED trial in non-critically ill emergency department patients confirmed that balanced crystalloids reduced MAKE30 compared to saline (4.7% vs 5.6%), driven particularly by lower rates of acute renal replacement therapy in high-risk baseline subgroups.", ["29485925"]),
        ("KDIGO guidelines recommend discontinuing all potential nephrotoxic medications (NSAIDs, aminoglycosides, amphotericin B, vancomycin where alternatives exist) and holding RAAS inhibitors during acute hypotension and volume depletion.", ["22890468"]),
        ("In severe AKI with fluid overload, diuretics (loop diuretics alone or combined with metolazone/acetazolamide) do not improve renal recovery or survival, but facilitate fluid balance and buy time while deciding on renal replacement therapy initiation.", ["22890468", "29485926"])
    ],
    [
        ("29485926", "Balanced Crystalloids versus Saline in Critically Ill Adults (SMART Trial).", 2018, "trial"),
        ("29485925", "Balanced Crystalloids versus Saline in Noncritically Ill Adults (SALT-ED Trial).", 2018, "trial"),
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline")
    ],
    [
        "Whether acetazolamide or SGLT2 inhibitors added to loop diuretics accelerate decongestion in acute cardiorenal syndrome without worsening persistent tubular injury.",
        "Renal microcirculatory benefits of continuous terlipressin infusion in hepatorenal syndrome-AKI compared to norepinephrine."
    ],
    [
        "Primary findings and clinical impact of the SMART and SALT-ED trials on intravenous fluid selection in kidney injury.",
        "Pathophysiological rationale explaining why hyperchloremic metabolic acidosis causes renal cortical hypoperfusion.",
        "Components and implementation timing of the KDIGO acute kidney injury clinical care bundle."
    ],
    [
        "A 63-year-old male with septic shock receiving 4 liters of normal saline whose serum chloride rises to 116 mmol/L and creatinine doubles, transitioned to balanced crystalloid resuscitation.",
        "A 70-year-old female with KDIGO Stage 2 AKI on lisinopril and furosemide where temporary drug suspension and balanced volume expansion resolve renal hypoperfusion."
    ]
)

# 99: AKI: Diagnosis and Staging
BATCH_7[99] = make_entry(
    'aki_diagnosis_and_staging_criteria',
    "Accurate diagnosis and staging of acute kidney injury under the KDIGO consensus criteria requires serial assessment of both serum creatinine and hourly urine output. Urine output criteria frequently detect AKI earlier than serum creatinine, which requires 24 to 48 hours of accumulation to cross diagnostic thresholds. The Acute Disease Quality Initiative (ADQI) consensus emphasizes that combining functional staging (creatinine and urine output) with structural injury biomarkers (TIMP-2, IGFBP7, NGAL) defines subclinical AKI, guiding risk-adapted monitoring and preventing secondary iatrogenic insult.",
    [
        ("KDIGO diagnostic criteria define AKI by any of the following: rise in serum creatinine by >= 0.3 mg/dL within 48 hours; rise in creatinine >= 1.5 times baseline within 7 days; or urine volume < 0.5 mL/kg/h for 6 consecutive hours.", ["22890468"]),
        ("Oliguria criteria (< 0.5 mL/kg/h) provide earlier identification of AKI than creatinine in critically ill patients, and persistent oliguria beyond 12 hours independently predicts 30-day mortality even with minor creatinine increments.", ["22890468", "32669482"]),
        ("KDIGO Stage 3 criteria include: serum creatinine >= 3.0 times baseline; serum creatinine >= 4.0 mg/dL (>= 353.6 umol/L); initiation of renal replacement therapy; or in patients < 18 years, a decrease in eGFR to < 35 mL/min/1.73m2.", ["22890468"]),
        ("The ADQI 23 consensus recommendations advocate incorporating damage biomarkers to refine staging: identifying 'biomarker positive / function negative' patients with subclinical AKI who carry elevated risks of prolonged hospitalization and progression.", ["32669482"])
    ],
    [
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline"),
        ("32669482", "Consensus on Biomarkers for Acute Kidney Injury: The 23rd Acute Disease Quality Initiative (ADQI) Consensus Conference.", 2020, "consensus-guideline")
    ],
    [
        "True baseline creatinine estimation formulas (MDRD back-calculation vs lowest inpatient value) in patients with unknown pre-admission renal status.",
        "Role of urinary NGAL and KIM-1 as real-time structural damage monitors in directing diuretic versus fluid administration in early oliguria."
    ],
    [
        "Specific time windows and numeric thresholds defining KDIGO Stages 1, 2, and 3 AKI.",
        "Clinical differences in sensitivity and prognostic value between urine output criteria versus serum creatinine.",
        "The ADQI classification paradigm of subclinical AKI (biomarker-positive, functional criteria-negative)."
    ],
    [
        "A 55-year-old post-cardiac surgery patient with normal serum creatinine (0.9 mg/dL) but urine output of 15 mL/h (0.2 mL/kg/h) for 8 consecutive hours meeting KDIGO Stage 1.",
        "A 68-year-old female admitted with pancreatitis whose creatinine escalates from 0.8 to 2.6 mg/dL over 3 days (Stage 3 AKI)."
    ]
)
