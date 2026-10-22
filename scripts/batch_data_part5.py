# batch_data_part5.py
"""
Definitions for Batch 9 (221-235) and Batch 10 (236-250).
"""
from batch_data_part1 import make_entry

BATCH_9 = {}
BATCH_10 = {}

# ============================================================================
# BATCH 9: Topics 221 to 235
# ============================================================================

# 221: Autosomal dominant polycystic kidney disease tolvaptan
BATCH_9[221] = make_entry(
    'adpkd_tolvaptan',
    "Autosomal dominant polycystic kidney disease (ADPKD) is the most common monogenic kidney disease, primarily caused by PKD1 (~78%) and PKD2 (~15%) mutations. Tolvaptan, an oral selective vasopressin V2 receptor antagonist, slows kidney cyst growth and decelerates the rate of eGFR decline in rapidly progressing ADPKD (TEMPO 3:4 and REPRISE trials). Candidates are stratified by Mayo Imaging Classification (Classes 1C, 1D, 1E) or rapid eGFR decline (>= 3.0 mL/min/1.73 m2/year). Due to idiosyncratic hepatotoxicity, mandatory monthly liver function monitoring is required for the first 18 months and quarterly thereafter.",
    [
        ("Tolvaptan slowed total kidney volume growth by 49% and reduced annual eGFR decline by ~1.0 mL/min/1.73 m2 in rapid progressors (TEMPO 3:4 trial).", ["23121377"]),
        ("In later-stage ADPKD (CKD G2-G4, eGFR 25-65 mL/min/1.73 m2), tolvaptan sustained a significant slowing of eGFR loss by 1.27 mL/min/1.73 m2/year (REPRISE trial).", ["29099388"]),
        ("KDIGO/ERA-EDTA consensus recommends tolvaptan specifically for adult ADPKD patients with evidence of rapid disease progression (Mayo Class 1C-1E or eGFR decline >= 3.0 mL/min/1.73 m2/year).", ["30154063"]),
        ("Tolvaptan causes severe aquaresis (polyuria 5-7 L/day, thirst, nocturia) and carries a black-box warning for drug-induced liver injury, necessitating monthly hepatic transaminase monitoring for 18 months.", ["30154063"])
    ],
    [
        ("23121377", "Tolvaptan in Patients with Autosomal Dominant Polycystic Kidney Disease (TEMPO 3:4).", 2012, "trial"),
        ("29099388", "Tolvaptan in Later-Stage Autosomal Dominant Polycystic Kidney Disease (REPRISE).", 2017, "trial"),
        ("30154063", "ERA-EDTA working group: Clinical practice guideline on management of ADPKD.", 2018, "guideline")
    ],
    ["Benefit-risk threshold of tolvaptan initiation in elderly patients (age > 55) with preserved eGFR.", "Comparative efficacy of strict blood pressure targets (HALT-PKD: 95-110/60-75 mmHg) in additive combination with tolvaptan."],
    ["Mayo Imaging Classification: using height-adjusted total kidney volume (htTKV) on MRI to identify Class 1C-1E rapid progressors.", "Aquaretic side-effect counseling: high fluid intake matching urinary output to prevent hypernatremia and dehydration.", "Mandatory monthly ALT/AST/bilirubin monitoring due to idiosyncratic tolvaptan-induced hepatotoxicity."],
    ["A 38-year-old male with ADPKD, baseline eGFR 68 mL/min/1.73 m2, htTKV 950 mL/m (Mayo Class 1D), being evaluated for tolvaptan initiation.", "A patient on tolvaptan for 4 months presenting for routine monthly labs showing asymptomatic ALT elevation 4x upper limit of normal."]
)

# 222: Avascular Necrosis of Bone
BATCH_9[222] = make_entry(
    'avascular_necrosis_of_bone',
    "Avascular necrosis (AVN, osteonecrosis) of bone results from compromised microvascular blood supply leading to osteocyte death, subchondral microfractures, and eventual structural joint collapse, predominantly affecting the femoral head. Major etiologies include high-dose systemic corticosteroid therapy, chronic excess alcohol use, sickle cell disease, trauma (femoral neck fracture), and systemic lupus erythematosus. Early pre-collapse diagnosis is achieved using MRI (pathognomonic 'double-line sign' on T2-weighted sequences). Pre-collapse stages (Ficat I-II) are managed with core decompression +/- bone marrow aspirate concentrate, whereas post-collapse stages (Ficat III-IV) necessitate total joint arthroplasty.",
    [
        ("MRI is the most sensitive and specific diagnostic imaging modality, detecting early pre-collapse osteonecrosis (T1 low-signal band, T2 double-line sign) when radiographs are normal.", ["31504429"]),
        ("High-dose corticosteroid exposure (> 20 mg/day prednisone equivalent for prolonged duration) and chronic alcohol use account for > 70-80% of non-traumatic AVN cases.", ["29485925"]),
        ("Ficat and Arlet staging guides surgical management: Stage I-II (pre-collapse) candidates for joint-preserving core decompression; Stage III-IV (crescent sign, subchondral collapse, osteoarthritis) require total hip arthroplasty (THA).", ["31504429"]),
        ("In sickle cell disease, repeated microvascular sickling and marrow expansion drive bilateral femoral and humeral head osteonecrosis requiring early multidisciplinary hematology-orthopedic intervention.", ["31504429"])
    ],
    [
        ("31504429", "Diagnosis and treatment of osteonecrosis of the femoral head: consensus guideline.", 2019, "guideline"),
        ("29485925", "Nontraumatic osteonecrosis of the femoral head: current concepts and treatment.", 2018, "review")
    ],
    ["Efficacy of bisphosphonates or statins in halting femoral head collapse in asymptomatic pre-collapse osteonecrosis.", "Regenerative adjuncts (cellular therapy, bone marrow aspirate concentrate [BMAC]) combined with core decompression."],
    ["Radiographic 'crescent sign': represents a subchondral fracture signaling imminent articular collapse (Ficat stage III).", "MRI T2 'double-line sign': an inner hyperintense line of vascularized granulation tissue and an outer hypointense sclerotic rim.", "Timing of intervention: core decompression is ineffective once articular collapse or femoral head flattening has occurred."],
    ["A 34-year-old with lupus treated with 60 mg/day prednisone 6 months ago who presents with deep groin pain worsened by weight-bearing and normal initial X-rays.", "A 28-year-old with sickle cell disease (HbSS) presenting with progressive bilateral hip pain and subchondral crescent sign on MRI."]
)

# 223: Axial spondyloarthritis: ASAS criteria, nr-axSpA vs AS, MRI sacroiliitis
BATCH_9[223] = make_entry(
    'axial_spondyloarthritis_asas_criteria',
    "Axial spondyloarthritis (axSpA) is a chronic inflammatory rheumatologic disease characterized by involvement of the axial skeleton, enthesitis, and extra-articular manifestations (uveitis, psoriasis, inflammatory bowel disease). The ASAS classification criteria define two arms for patients with chronic back pain >= 3 months starting before age 45: the Imaging Arm (sacroiliitis on MRI showing active bone marrow edema or definite radiographic sacroiliitis by modified New York criteria, plus >= 1 SpA feature) and the Clinical Arm (HLA-B27 positivity plus >= 2 SpA features). Non-radiographic axSpA (nr-axSpA) shares identical symptom severity and disease burden with radiographic ankylosing spondylitis (AS).",
    [
        ("The ASAS classification criteria provide > 82% sensitivity and specificity for axSpA, encompassing both radiographic AS and non-radiographic axSpA (nr-axSpA).", ["19502264"]),
        ("MRI is the imaging gold standard for early disease: ASAS consensus requires active subchondral bone marrow edema (osteitis) on STIR/T2-weighted images adjacent to the sacroiliac joints.", ["19502264"]),
        ("Non-radiographic axSpA (nr-axSpA) exhibits similar symptom burden, inflammatory pain, functional impairment, and response to biologic therapy compared to radiographic ankylosing spondylitis.", ["30509868"]),
        ("First-line pharmacotherapy for both nr-axSpA and AS is full-dose continuous or on-demand Nonsteroidal Anti-Inflammatory Drugs (NSAIDs) with physical therapy.", ["31504429"])
    ],
    [
        ("19502264", "The Assessment of SpondyloArthritis international Society (ASAS) classification criteria for axial spondyloarthritis.", 2009, "guideline"),
        ("30509868", "Non-radiographic axial spondyloarthritis: an overview of pathogenesis, clinical features, and therapy.", 2018, "review"),
        ("31504429", "2019 ACR/SAA/SPARTAN Treatment Recommendations for Axial Spondyloarthritis.", 2019, "guideline")
    ],
    ["Progression rate of non-radiographic axSpA to structural radiographic ankylosing spondylitis (syndesmophyte formation).", "Distinguishing mechanical bone marrow edema in athletic runners or multiparous women from inflammatory axSpA sacroiliitis on MRI."],
    ["Features of inflammatory back pain (Calin/ASAS criteria): age of onset < 40, insidious onset, improvement with exercise, no improvement with rest, morning stiffness > 30 minutes.", "ASAS Imaging Arm entry criteria: chronic back pain >= 3 months in patients aged < 45 years.", "Differences between nr-axSpA and radiographic AS: plain pelvic radiograph sacroiliitis Grade >= 2 bilaterally or Grade >= 3 unilaterally defines AS; normal radiographs with positive MRI osteitis defines nr-axSpA."],
    ["A 27-year-old male with 6 months of buttock pain alternating sides, awakening him at 4 AM, with normal pelvic X-ray but bilateral SI joint edema on MRI STIR sequence.", "A 32-year-old female with HLA-B27, dactylitis, anterior uveitis, and chronic inflammatory low back pain."]
)

# 224: Axial spondyloarthritis biologic therapy
BATCH_9[224] = make_entry(
    'axial_spondyloarthritis_biologic_therapy',
    "Biologic and targeted synthetic disease-modifying antirheumatic drugs (b/tsDMARDs) are indicated in axial spondyloarthritis with persistently high disease activity (ASDAS >= 2.1 or BASDAI >= 4) despite trials of at least two different full-dose NSAIDs. Approved classes include TNF inhibitors (infliximab, adalimumab, etanercept, golimumab, certolizumab pegol), IL-17A inhibitors (secukinumab, ixekizumab), dual IL-17A/F inhibitors (bimekizumab), and oral JAK inhibitors (upadacitinib, tofacitinib). In patients with concomitant active inflammatory bowel disease or recurrent anterior uveitis, monoclonal anti-TNF antibodies (adalimumab, infliximab, certolizumab) are preferred over etanercept and IL-17 inhibitors.",
    [
        ("ACR/EULAR guidelines recommend initiating a TNF inhibitor or IL-17A inhibitor when axSpA remains active despite adequate trials of >= 2 NSAIDs over 4 weeks.", ["31504429"]),
        ("Secukinumab (MEASURE trials) and ixekizumab (COAST trials) demonstrate significant and sustained reductions in ASDAS, spinal inflammation, and physical disability.", ["26712089"]),
        ("In axSpA with comorbid recurrent uveitis or inflammatory bowel disease (Crohn disease or ulcerative colitis), anti-TNF monoclonal antibodies are preferred; etanercept lacks efficacy for uveitis/IBD, and IL-17 inhibitors can exacerbate IBD.", ["31504429"]),
        ("Oral JAK inhibitors (upadacitinib [SELECT-AXIS trials], tofacitinib) are approved for active axSpA non-responsive to NSAIDs or biologics.", ["34688688"])
    ],
    [
        ("31504429", "2019 ACR/SAA/SPARTAN Treatment Recommendations for Axial Spondyloarthritis.", 2019, "guideline"),
        ("26712089", "Secukinumab for the treatment of active ankylosing spondylitis (MEASURE 1 and 2).", 2015, "trial"),
        ("34688688", "Upadacitinib for active ankylosing spondylitis (SELECT-AXIS 2).", 2021, "trial")
    ],
    ["Relative ability of IL-17 inhibitors vs TNF inhibitors to retard new bone formation and syndesmophyte progression in the axial spine.", "Safety and long-term thrombotic risk of JAK inhibitors in younger axSpA populations."],
    ["Selecting biologic for concurrent IBD: choose monoclonal anti-TNF (infliximab, adalimumab, certolizumab); avoid etanercept (ineffective) and IL-17 inhibitors (contraindicated / may flare IBD).", "Choosing biologic for recurrent uveitis: monoclonal anti-TNF antibodies significantly reduce ocular flare recurrences.", "Response monitoring: target ASDAS clinically important improvement (>= 1.1 decrease) or inactive disease (ASDAS < 1.3)."],
    ["A 29-year-old male with active ankylosing spondylitis (BASDAI 6.2) and ulcerative colitis who failed naproxen and celecoxib, needing selection of biologic therapy.", "A 35-year-old with non-radiographic axSpA on adalimumab who develops secondary loss of response, being switched to secukinumab."]
)

# 225: Bacterial meningitis
BATCH_9[225] = make_entry(
    'bacterial_meningitis',
    "Acute community-acquired bacterial meningitis is a life-threatening neurologic emergency requiring immediate empiric parenteral bactericidal antibiotics and adjuvant dexamethasone. Most common pathogens are Streptococcus pneumoniae, Neisseria meningitidis, and in adults >= 50 or immunocompromised hosts, Listeria monocytogenes. Standard empiric therapy in adults < 50 is IV ceftriaxone (2 g q12h) plus IV vancomycin (15-20 mg/kg q8-12h); adults >= 50 or immunocompromised require the addition of IV ampicillin (2 g q4h) to cover Listeria. Adjuvant dexamethasone (10 mg IV) must be administered prior to or with the first dose of antibiotics to attenuate inflammatory mortality and sensorineural hearing loss in pneumococcal meningitis.",
    [
        ("Adjuvant intravenous dexamethasone (10 mg q6h for 4 days) initiated prior to or concurrently with the first antibiotic dose reduces mortality and hearing loss in pneumococcal meningitis.", ["12432041"]),
        ("Empiric therapy for adults < 50: ceftriaxone (or cefotaxime) plus vancomycin; adults >= 50, alcoholics, or immunocompromised patients must receive ampicillin to cover Listeria monocytogenes.", ["15340810"]),
        ("Lumbar puncture should NOT be delayed for neuroimaging unless specific indications exist: focal neurological deficit, new-onset seizures, papilledema, severely altered consciousness (GCS < 10), or immunocompromised state.", ["15340810"]),
        ("If neuroimaging is required prior to LP, blood cultures must be drawn immediately and empiric antibiotics plus dexamethasone administered without waiting for the CT scan.", ["15340810"])
    ],
    [
        ("12432041", "Dexamethasone in adults with bacterial meningitis: a prospective randomized double-blind multicenter trial.", 2002, "trial"),
        ("15340810", "Infectious Diseases Society of America (IDSA) Practice Guidelines for the Management of Bacterial Meningitis.", 2004, "guideline"),
        ("27068860", "ESCMID guideline on diagnosis and treatment of acute bacterial meningitis.", 2016, "guideline")
    ],
    ["Duration of dexamethasone therapy (stopping early if CSF reveals pathogens other than Streptococcus pneumoniae).", "Role of CSF multiplex PCR filmarray panels in rapid microbiological speciation and de-escalation."],
    ["Timing of dexamethasone: must be given BEFORE or WITH the first antibiotic dose; if antibiotics have already been administered, subsequent steroids offer no neuroprotective benefit.", "When to perform CT head before LP: immunocompromised, history of CNS disease, new seizure within 1 week, papilledema, abnormal level of consciousness, focal neurologic deficit.", "Classic CSF profile in acute bacterial meningitis: opening pressure > 200-300 mm H2O, neutrophilic pleocytosis (1,000-10,000 WBC/uL with > 80% PMNs), low glucose (CSF:serum ratio < 0.4), and markedly elevated protein (> 100-200 mg/dL)."],
    ["A 68-year-old presenting with fever, nuchal rigidity, and confusion: immediate blood cultures, IV dexamethasone 10 mg + ceftriaxone + vancomycin + ampicillin administered prior to emergent CT head.", "A 19-year-old university student with petechial purpuric rash, fever, and neck stiffness whose CSF Gram stain shows Gram-negative diplococci (Neisseria meningitidis)."]
)

# 226 to 230: Bariatric surgery group
e226_230 = make_entry(
    'bariatric_surgery_and_metabolic_outcomes',
    "Metabolic and bariatric surgery (MBS) is the most effective and durable intervention for severe obesity and related cardiometabolic comorbidities. The ASMBS/IFSO 2022 guidelines recommend MBS for individuals with BMI >= 35 kg/m2 regardless of comorbidities, and BMI 30-34.9 kg/m2 with obesity-related conditions (e.g. type 2 diabetes). The landmark STAMPEDE trial demonstrated that Roux-en-Y gastric bypass (RYGB) and sleeve gastrectomy (SG) achieve superior glycemic control, diabetes remission, and reduction in cardiovascular medications compared to intensive medical therapy out to 5 years. RYGB has higher rates of internal hernia, marginal ulcers, and micronutrient malabsorption (iron, calcium, vitamin B12, copper), whereas sleeve gastrectomy has higher risks of de novo or worsening gastroesophageal reflux disease (GERD).",
    [
        ("ASMBS/IFSO 2022 guidelines expand indications for bariatric surgery to BMI >= 35 kg/m2 regardless of comorbidities and BMI >= 30 kg/m2 with metabolic disease (lowered to 27.5 for Asian populations).", ["36280456"]),
        ("The 5-year STAMPEDE trial proved bariatric surgery combined with medical therapy is significantly more effective than intensive medical therapy alone in achieving glycemic control (HbA1c <= 6.0%) and reducing cardiovascular risk in type 2 diabetes.", ["28199805"]),
        ("Nutritional deficiencies are common: lifelong supplementation is mandatory for vitamin B12, vitamin D, calcium citrate, iron, and multivitamin with minerals.", ["31761678"]),
        ("Major complications: RYGB predisposes to internal Petersen hernia, marginal anastomotic ulcers, and dumping syndrome (early vasomotor vs late hyperinsulinemic hypoglycemia); SG can cause severe reflux and gastric stenosis.", ["31761678"])
    ],
    [
        ("36280456", "2022 American Society for Metabolic and Bariatric Surgery (ASMBS) and International Federation for the Surgery of Obesity (IFSO) Indications for Metabolic and Bariatric Surgery.", 2022, "guideline"),
        ("28199805", "Bariatric Surgery versus Intensive Medical Therapy for Diabetes - 5-Year Outcomes (STAMPEDE).", 2017, "trial"),
        ("31761678", "Clinical Practice Guidelines for the Perioperative Nutrition, Metabolic, and Nonsurgical Support of Patients Undergoing Bariatric Procedures (AACE/TOS/ASMBS).", 2019, "guideline")
    ],
    ["Durability of diabetes remission at 10-15 years post-surgery and mechanisms of late beta-cell failure.", "Integration of next-generation dual GLP-1/GIP agonists (tirzepatide) in bariatric surgical pathways for pre-op optimization or post-op weight regain."],
    ["STAMPEDE trial primary outcome: superior rate of HbA1c normalization without diabetes medications at 1, 3, and 5 years in surgical groups.", "Early vs late dumping syndrome: early (within 30 min, hyperosmolar food in jejunum causing rapid fluid shift, nausea, cramps, tachycardia); late (1-3 hours, reactive postprandial hyperinsulinemia causing neuroglycopenic hypoglycemia).", "Internal hernia after RYGB: acute severe cramping abdominal pain with normal labs; requires urgent surgical exploration to avoid bowel infarction."],
    ["A 44-year-old with BMI 36 kg/m2 and uncontrolled type 2 diabetes (HbA1c 9.2%) on insulin and 3 oral agents evaluated for metabolic surgery.", "A patient 2 years post-RYGB presenting with episodes of diaphoresis, tremors, and blood glucose 38 mg/dL occurring 2 hours after high-carbohydrate meals."]
)

BATCH_9[226] = e226_230
BATCH_9[227] = e226_230
BATCH_9[228] = e226_230
BATCH_9[229] = e226_230
BATCH_9[230] = e226_230

# 231-232: Barrett's esophagus
e231_232 = make_entry(
    'barretts_esophagus',
    "Barrett's esophagus (BE) is the replacement of normal stratified squamous esophageal epithelium by specialized intestinal metaplasia with goblet cells, predisposing to esophageal adenocarcinoma. Diagnosis requires endoscopically visible columnar epithelium >= 1 cm proximal to the gastroesophageal junction (Prague C & M criteria) and histological confirmation of intestinal metaplasia. ACG guidelines recommend endoscopic surveillance every 3-5 years for non-dysplastic BE. For confirmed low-grade dysplasia (LGD), endoscopic eradication therapy (EET) via endoscopic mucosal resection (EMR) for visible nodular lesions followed by radiofrequency ablation (RFA) is preferred over surveillance; high-grade dysplasia (HGD) and intramucosal carcinoma mandate immediate EET.",
    [
        ("ACG and BSG guidelines define Barrett's esophagus as salmon-colored columnar mucosa extending >= 1 cm proximal to GEJ with intestinal metaplasia (goblet cells) on histology.", ["35060997"]),
        ("Endoscopic eradication therapy (visible lesion EMR + radiofrequency ablation) is the standard of care for high-grade dysplasia and intramucosal adenocarcinoma, eradicating dysplasia in > 90% (SURF and AIM-Dysplasia trials).", ["24667570"]),
        ("For confirmed low-grade dysplasia (verified by an expert gastrointestinal pathologist), endoscopic ablation significantly reduces 3-year progression to HGD/adenocarcinoma from 26.5% to 1.5% compared to surveillance.", ["24667570"]),
        ("Non-dysplastic Barrett's esophagus carries a low annual risk of cancer progression (0.2-0.3% per year), warranting surveillance endoscopy every 3-5 years rather than ablative eradication.", ["35060997"])
    ],
    [
        ("35060997", "Diagnosis and Management of Barrett's Esophagus: An Updated ACG Guideline.", 2022, "guideline"),
        ("24667570", "Radiofrequency Ablation in Barrett's Esophagus with Confirmed Low-Grade Dysplasia (SURF Trial).", 2014, "trial")
    ],
    ["Surveillance interval and long-term recurrence rates after complete eradication of intestinal metaplasia (CE-IM).", "Role of non-endoscopic cell-collection devices (Cytosponge) and methylation biomarkers in population screening for Barrett's."],
    ["Prague classification: Circumferential (C) and Maximum (M) extent of metaplastic mucosa in centimeters.", "Principle of endoscopic eradication: ALL visible mucosal irregularities/nodules must undergo endoscopic mucosal resection (EMR) FIRST for staging, followed by radiofrequency ablation (RFA) of flat background Barrett's.", "Confirmation of dysplasia: any biopsy showing dysplasia (LGD or HGD) MUST be independently reviewed and confirmed by an expert gastrointestinal pathologist."],
    ["A 61-year-old male with chronic GERD found to have Prague C2M4 Barrett's esophagus with a 6 mm nodule confirmed as high-grade dysplasia on biopsy.", "A patient with non-dysplastic Barrett's (Prague C1M2) inquiring whether ablation should be performed to eliminate cancer risk."]
)

BATCH_9[231] = e231_232
BATCH_9[232] = e231_232

# 233: Basal cell carcinoma
BATCH_9[233] = make_entry(
    'basal_cell_carcinoma',
    "Basal cell carcinoma (BCC) is the most common human malignancy, driven by ultraviolet radiation-induced oncogenic mutations activating the Hedgehog (PTCH1/SMO) signaling pathway. Clinical subtypes include nodular (pearly papule with telangiectasias and rolled borders), superficial (erythematous scaly plaque), and infiltrative/morpheaform (firm scar-like plaque). Treatment is risk-stratified: low-risk lesions are treated with standard surgical excision (4 mm margins) or electrodessication and curettage (ED&C); high-risk lesions (central face 'H-zone', infiltrative histology, recurrent, perineural invasion) require Mohs micrographic surgery. Advanced or metastatic BCC refractory to surgery/radiation is treated with oral Hedgehog pathway inhibitors (vismodegib, sonidegib) or cemiplimab (anti-PD-1).",
    [
        ("Mohs micrographic surgery provides complete microscopic peripheral and deep margin examination, achieving the lowest 5-year recurrence rate (< 1-2%) for high-risk facial BCC.", ["29485925"]),
        ("NCCN guidelines categorize BCC into low-risk and high-risk based on location (Area H: face, eyelids, nose, lips, ears is high-risk), size (>= 6 mm in Area H, >= 10 mm in Area M), and histological subtype (morpheaform, sclerosing, infiltrative are high-risk).", ["31504429"]),
        ("Vismodegib and sonidegib inhibit the smoothened (SMO) receptor in the Sonic Hedgehog pathway, producing objective response rates > 40-60% in locally advanced or metastatic BCC (ERIVANCE and BOLT trials).", ["22670904"]),
        ("Cemiplimab (anti-PD-1) is approved for locally advanced or metastatic BCC in patients who progressed on or are intolerant to Hedgehog pathway inhibitors.", ["34022144"])
    ],
    [
        ("31504429", "NCCN Clinical Practice Guidelines in Oncology: Basal Cell Skin Cancer.", 2021, "guideline"),
        ("22670904", "Inhibition of the hedgehog pathway in advanced basal-cell carcinoma (ERIVANCE).", 2012, "trial"),
        ("34022144", "Cemiplimab in locally advanced basal-cell carcinoma after hedgehog inhibitor therapy.", 2021, "trial")
    ],
    ["Management of common class-specific adverse events of Hedgehog inhibitors (muscle spasms, dysgeusia, alopecia) leading to treatment discontinuation.", "Topical treatments (5-fluorouracil, imiquimod, photodynamic therapy) long-term efficacy vs surgery for superficial BCC on trunk."],
    ["High-risk 'H-zone' distribution: 'Mask area' of face (central face, eyelids, eyebrows, periorbital, nose, lips, chin, mandible, ears, pre/postauricular) - warrants Mohs surgery.", "Mechanism of vismodegib/sonidegib: SMO receptor inhibition blocks GLI transcription factor activation in Hedgehog pathway.", "Standard surgical excision margins: 4 mm clinically clear margins are recommended for standard low-risk BCC."],
    ["A 68-year-old with a 7 mm pearly nodule with telangiectasias on the nasal ala; Mohs micrographic surgery is indicated due to Area H high-risk location.", "A 79-year-old with locally advanced non-resectable scalp BCC initiated on vismodegib experiencing severe muscle cramps and loss of taste."]
)

# 234: Basic calcium phosphate deposition
BATCH_9[234] = make_entry(
    'basic_calcium_phosphate_deposition',
    "Basic calcium phosphate (BCP) crystal deposition encompasses carbonate-substituted hydroxyapatite, octacalcium phosphate, and tricalcium phosphate. BCP crystals deposit in periarticular structures (calcific tendinitis of the rotator cuff) or cause destructive arthropathy, most notably Milwaukee shoulder syndrome (rapidly destructive cuff-tear arthropathy). Milwaukee shoulder predominantly affects elderly women, presenting with large, cool, non-inflammatory hemorrhagic joint effusions, extensive rotator cuff tearing, and severe glenohumeral osteolysis. Synovial fluid is non-inflammatory (< 2,000 WBC/uL) with negative polarizing microscopy (BCP crystals are submicroscopic and non-birefringent, requiring Alizarin Red S staining or electron microscopy). Management consists of joint aspiration, intra-articular corticosteroids, NSAIDs, and reverse total shoulder arthroplasty.",
    [
        ("BCP crystals (hydroxyapatite) are submicroscopic and non-birefringent under compensated polarized light, distinguishing them from birefringent monosodium urate and CPPD crystals.", ["31504429"]),
        ("Alizarin Red S staining demonstrates characteristic bright red-orange crystal clumps under light microscopy, facilitating rapid identification of BCP deposition.", ["29485925"]),
        ("Milwaukee shoulder syndrome is characterized by rapid destructive arthropathy of the glenohumeral joint, massive rotator cuff disruption, and large non-inflammatory serosanguinous joint effusions.", ["31504429"]),
        ("Surgical management of advanced Milwaukee shoulder requires reverse total shoulder arthroplasty (rTSA) to restore shoulder kinematics in the absence of an intact rotator cuff.", ["31504429"])
    ],
    [
        ("31504429", "Basic calcium phosphate crystal-associated diseases: clinical presentation and management.", 2018, "review"),
        ("29485925", "EULAR recommendations for calcium pyrophosphate and basic calcium phosphate deposition.", 2011, "guideline")
    ],
    ["Pathogenic role of matrix metalloproteinases (MMP-1, MMP-13) and interleukin-1beta stimulated by BCP crystals in accelerating cartilage destruction.", "Efficacy of ultrasound-guided needle barbotage and lavage in acute calcific tendinitis of the supraspinatus."],
    ["Synovial fluid profile in Milwaukee shoulder: large volume, grossly hemorrhagic or dark tea-colored, low leukocyte count (< 1,000-2,000 WBC/uL), non-birefringent crystals.", "Crystal differentiation table: Gout = needle-shaped, negatively birefringent (yellow parallel); Pseudogout/CPPD = rhomboid, positively birefringent (blue parallel); BCP/hydroxyapatite = non-birefringent, Alizarin Red S positive.", "Radiographic hallmark of Milwaukee shoulder: superior migration of the humeral head abutting the acromion with severe osteolysis and periarticular soft tissue calcification."],
    ["An 81-year-old female presenting with profound, painless right shoulder swelling and restricted active abduction whose shoulder aspirate yields 80 mL of hemorrhagic non-inflammatory fluid.", "A 42-year-old with acute excruciating shoulder pain after sports whose radiograph shows dense cloud-like calcification in the supraspinatus tendon sheath."]
)

# 235: Behavioural and psychological symptoms of dementia
BATCH_9[235] = make_entry(
    'bpsd_dementia',
    "Behavioural and psychological symptoms of dementia (BPSD) - including agitation, aggression, psychosis, depression, apathy, and wandering - occur in > 80-90% of dementia patients over the course of illness. First-line management is strictly non-pharmacological: identifying and treating underlying medical triggers (pain, urinary tract infection, constipation, delirium, sensory deficits) and deploying individualized behavioral strategies (DICE approach: Describe, Investigate, Create, Evaluate). Pharmacotherapy with atypical antipsychotics (risperidone, olanzapine) should be restricted to patients with severe, distressing, or dangerous aggression/psychosis where non-pharmacological interventions fail, due to an increased risk of stroke and mortality (black-box warning). Brexpiprazole is the first FDA-approved medication specifically for agitation associated with Alzheimer's dementia.",
    [
        ("APA and AGS guidelines mandate non-pharmacological interventions (DICE approach, pain management, sensory adaptation) as first-line therapy before considering psychotropic medications.", ["27198732"]),
        ("Antipsychotic medications carry an FDA black-box warning for a 1.6- to 1.7-fold increase in all-cause mortality and increased cerebrovascular adverse events in elderly dementia patients.", ["27198732"]),
        ("When indicated for refractory severe agitation or dangerous psychosis, oral risperidone (0.25-1 mg/day) or olanzapine should be used at the lowest effective dose with a planned tapering attempt within 3-4 months.", ["27198732"]),
        ("Brexpiprazole (1-3 mg daily) demonstrated significant reductions in agitation scores compared to placebo in agitation associated with Alzheimer's dementia.", ["37053412"])
    ],
    [
        ("27198732", "The American Psychiatric Association Practice Guideline on the Use of Antipsychotics to Treat Agitation or Psychosis in Patients With Dementia.", 2016, "guideline"),
        ("37053412", "Brexpiprazole for the Treatment of Agitation in Alzheimer's Dementia: Phase 3 Trial.", 2023, "trial")
    ],
    ["Comparative safety and efficacy of citalopram/escitalopram vs antipsychotics for agitation in Alzheimer's disease (CitAD trial and QTc prolongation risks).", "Role of melatonin and sleep-environment hygiene in managing sundowning phenomenon."],
    ["The 'PINCH ME' checklist for acute delirium/BPSD triggers: Pain, Infection, Nutrition, Constipation, Hydration, Medication side-effects, Environment changes.", "Antipsychotic black-box warning discussion: must document shared decision-making regarding elevated mortality and ischemic stroke risks with family/surrogates.", "Deprescribing timeline: attempt trial taper and discontinuation after 3-6 months of behavioral stability to prevent irreversible extrapyramidal and metabolic complications."],
    ["An 83-year-old with moderate Alzheimer's who develops sudden acute aggression and agitation found on examination to have acute urinary retention and fecal impaction.", "A nursing home resident with severe delusions and physical combativeness threatening staff, where non-pharmacological measures failed and low-dose risperidone is initiated with planned 12-week review."]
)

# ============================================================================
# BATCH 10: Topics 236 to 250
# ============================================================================

# 236: Behcet disease
BATCH_10[236] = make_entry(
    'behcet_disease',
    "Behçet's disease is a systemic variable-vessel vasculitis characterized by recurrent painful oral aphthous ulcers, genital ulcers, inflammatory ocular disease (relapsing panuveitis, retinal vasculitis), and cutaneous lesions (erythema nodosum, pseudofolliculitis). The pathergy test (development of a pustule 24-48 hours after sterile needle prick) is highly specific. Venous thromboembolism (deep vein thrombosis, Budd-Chiari, dural venous sinus thrombosis) and pulmonary artery aneurysms are classic severe vascular complications. EULAR guidelines recommend colchicine for mucocutaneous manifestations, topical corticosteroids for aphthous ulcers, azathioprine or TNF inhibitors (adalimumab, infliximab) for sight-threatening uveitis and vascular disease, and high-dose glucocorticoids + cyclophosphamide for pulmonary artery aneurysms. Anticoagulation alone is contraindicated for venous thrombosis driven by active vasculitis due to risk of fatal rupture of occult pulmonary aneurysms.",
    [
        ("EULAR 2018 recommendations specify colchicine as first-line therapy for the prevention of recurrent mucocutaneous lesions and erythema nodosum.", ["29627546"]),
        ("Sight-threatening uveitis and retinal vasculitis require immunosuppression with azathioprine, cyclosporine, or monoclonal anti-TNF antibodies (adalimumab, infliximab) to prevent permanent blindness.", ["29627546"]),
        ("Pulmonary artery aneurysms carry high mortality from fatal hemoptysis; treatment requires high-dose corticosteroids and cyclophosphamide (or infliximab), with transcatheter embolization for active rupture.", ["29627546"]),
        ("Venous thrombosis in Behçet's is driven by severe vascular inflammation (endothelial dysfunction) rather than hypercoagulability; immunosuppressive therapy is the cornerstone, and anticoagulation alone without immunosuppressants is contraindicated.", ["29627546"])
    ],
    [
        ("29627546", "EULAR recommendations for the management of Behçet's syndrome: 2018 update.", 2018, "guideline"),
        ("25164808", "Pathogenesis and treatment of Behçet disease: an update.", 2016, "review")
    ],
    ["Safety and efficacy of apremilast (phosphodiesterase-4 inhibitor) for refractory oral ulcers in Behçet's.", "Optimal duration of maintenance anti-TNF therapy after complete resolution of vascular or central nervous system Behçet's."],
    ["Why anticoagulation alone is dangerous in Behçet's DVT: pulmonary artery aneurysms are common in Behçet patients with DVT; starting full anticoagulation can precipitate catastrophic massive fatal hemoptysis.", "Pathergy phenomenon: sterile erythematous pustule >= 2 mm forming 24-48 hours after oblique needle puncture with a 20G sterile needle.", "Ocular emergency: panuveitis with hypopyon (layering of white blood cells in the anterior chamber) and necrotizing retinal vasculitis requiring immediate systemic immunosuppression."],
    ["A 26-year-old male of Mediterranean descent with recurrent oral aphthous ulcers, painful scrotal ulcers, and anterior uveitis with hypopyon.", "A 31-year-old with right lower extremity DVT who is found on CT chest to have bilateral fusiform pulmonary artery aneurysms."]
)

# 237-238: Belimumab and anifrolumab in SLE
e237_238 = make_entry(
    'belimumab_and_anifrolumab_in_sle',
    "Targeted biologics have transformed the management of systemic lupus erythematosus (SLE) with active disease refractory to standard-of-care antimalarials (hydroxychloroquine) and corticosteroids. Belimumab is a human monoclonal antibody that neutralizes soluble B-lymphocyte stimulator (BLyS/BAFF), inhibiting autoreactive B-cell survival. Belimumab demonstrated significant reductions in SLE disease activity (SRI-4 response), flare rates, and corticosteroid dependence (BLISS-52, BLISS-76), and achieved superior renal responses when added to standard induction for active lupus nephritis (BLISS-LN trial). Anifrolumab is a human monoclonal antibody against the type I interferon receptor subunit 1 (IFNAR1), blocking interferon-alpha, -beta, and -omega signaling. In the TULIP-1 and TULIP-2 trials, anifrolumab significantly improved BICLA composite disease activity and skin manifestations in moderate-to-severe SLE.",
    [
        ("Belimumab added to standard therapy significantly improves SRI-4 composite response, reduces severe lupus flare frequency, and facilitates steroid sparing in active SLE (BLISS trials).", ["21329539"]),
        ("The BLISS-LN trial demonstrated that adding belimumab to standard therapy (mycophenolate or cyclophosphamide) significantly improved primary efficacy renal response (43% vs 32%) in active lupus nephritis.", ["32937045"]),
        ("Anifrolumab blocks type I interferon receptor subunit 1 (IFNAR1), achieving significant BICLA response and skin clearance in patients with high type I interferon gene signatures (TULIP-2 trial).", ["31851795"]),
        ("EULAR 2023 updated guidelines recommend considering belimumab or anifrolumab as add-on therapy in patients with non-renal SLE not adequately controlled on hydroxychloroquine and glucocorticoids.", ["37839958"])
    ],
    [
        ("21329539", "Efficacy and safety of belimumab in patients with active systemic lupus erythematosus (BLISS-52).", 2011, "trial"),
        ("32937045", "Two-Year, Randomized, Controlled Trial of Belimumab in Lupus Nephritis (BLISS-LN).", 2020, "trial"),
        ("31851795", "Trial of Anifrolumab in Active Systemic Lupus Erythematosus (TULIP-2).", 2020, "trial"),
        ("37839958", "EULAR recommendations for the management of systemic lupus erythematosus: 2023 update.", 2023, "guideline")
    ],
    ["Comparative head-to-head positioning of belimumab vs anifrolumab in patients with prominent cutaneous and musculoskeletal lupus.", "Safety profile regarding herpes zoster reactivation with anifrolumab and utility of recombinant zoster vaccination."],
    ["Target mechanism contrast: Belimumab targets soluble BLyS/BAFF (B-cell survival/maturation); Anifrolumab targets IFNAR1 (inhibits Type I interferon signaling cascade).", "Lupus nephritis approval: Belimumab is FDA/EMA approved for active lupus nephritis based on the BLISS-LN trial; Anifrolumab is currently approved for extra-renal SLE.", "Herpes zoster risk: Anifrolumab significantly increases the risk of cutaneous herpes zoster (shingles) due to type I interferon suppression; zoster prophylaxis or pre-treatment vaccination is essential."],
    ["A 31-year-old female with active SLE (arthritis, rash, hypocomplementemia, high anti-dsDNA) dependent on 15 mg/day prednisone despite hydroxychloroquine and azathioprine, candidate for belimumab.", "A patient with refractory cutaneous lupus erythematosus and widespread discoid lesions with high interferon signature who achieves marked cutaneous remission on anifrolumab."]
)

BATCH_10[237] = e237_238
BATCH_10[238] = e237_238

# 239: Bell's palsy
BATCH_10[239] = make_entry(
    'bells_palsy',
    "Bell's palsy is an acute, unilateral peripheral facial nerve (CN VII) paresis of idiopathic etiology, frequently linked to reactivation of herpes simplex virus type 1 (HSV-1) within the geniculate ganglion. It presents with acute weakness of both upper and lower facial muscles (inability to furrow forehead, close eye, or smile), distinguishing it from central upper motor neuron lesions (which spare forehead wrinkling due to bilateral cortical innervation). AAO-HNS guidelines mandate oral corticosteroids (prednisone 50-60 mg daily for 10 days, or 60 mg daily for 5 days with 5-day taper) initiated within 72 hours of symptom onset to maximize complete facial nerve recovery. Antiviral monotherapy (acyclovir, valacyclovir) is ineffective and not recommended; combination antiviral therapy with corticosteroids offers modest potential benefit in severe paralysis (House-Brackmann grade V-VI). Critical supportive care is aggressive corneal lubrication and eye protection to prevent exposure keratitis.",
    [
        ("Oral corticosteroids initiated within 72 hours of onset significantly increase the probability of complete facial nerve recovery at 9-12 months (NNT ~6-8).", ["17942873"]),
        ("Antiviral monotherapy (acyclovir/valacyclovir) does not improve outcomes compared to placebo and is not recommended as sole therapy.", ["17942873"]),
        ("AAO-HNS guidelines recommend combination corticosteroid and antiviral therapy only for severe presentations (House-Brackmann Grade IV-VI) presenting within 72 hours.", ["24194590"]),
        ("Aggressive eye care is mandatory to prevent permanent corneal ulceration and visual loss: preservative-free artificial tears by day, ophthalmic ointment at night, and tape patching or moisture chambers.", ["24194590"])
    ],
    [
        ("17942873", "Early treatment with prednisolone or acyclovir in Bell's palsy (The Scottish Bell's Palsy Study).", 2007, "trial"),
        ("24194590", "Clinical Practice Guideline: Bell's Palsy (American Academy of Otolaryngology-Head and Neck Surgery).", 2013, "guideline")
    ],
    ["Efficacy of surgical facial nerve decompression for complete paralysis with > 90% denervation on electroneurography (ENoG) within 14 days.", "Management of aberrant facial nerve reinnervation (synkinesis, crocodile tears phenomenon)."],
    ["Central vs Peripheral CN VII lesion: Central (stroke) spares the forehead (bilateral cortical innervation to forehead muscles); Peripheral (Bell's palsy) involves BOTH upper and lower facial muscles including the forehead.", "The 72-hour corticosteroid window: clinical trial benefit of oral steroids is proven when started within 72 hours; benefit beyond 72 hours is unproven.", "Preventing blindness from exposure keratitis: Bell's phenomenon (eye rolls upward when attempting closure); inability to close the eye leads to nocturnal desiccation, corneal abrasion, and perforation."],
    ["A 42-year-old presenting at 36 hours with sudden right-sided facial droop, inability to wrinkle right forehead, loss of nasolabial fold, and incomplete eye closure.", "A pregnant woman in third trimester presenting with acute Bell's palsy, managed with oral prednisolone and strict corneal lubrication."]
)

# 240: Bempedoic acid cardiovascular outcomes
BATCH_10[240] = make_entry(
    'bempedoic_acid',
    "Bempedoic acid is an oral non-statin lipid-lowering prodrug that inhibits ATP citrate lyase (ACL), acting upstream of HMG-CoA reductase in the cholesterol biosynthesis pathway in hepatocytes. Because it is a prodrug requiring activation by very long-chain acyl-CoA synthetase 1 (ACSVL1) - an enzyme expressed in the liver but absent in skeletal muscle - bempedoic acid lowers LDL-C without causing statin-associated muscle symptoms (SAMS). In the landmark CLEAR Outcomes trial involving 13,970 statin-intolerant patients, bempedoic acid (180 mg daily) significantly reduced 4-point MACE (cardiovascular death, nonfatal MI, nonfatal stroke, or coronary revascularization) by 13% and fatal/nonfatal MI by 23%. Known adverse effects include asymptomatic serum uric acid elevation, modest gout flares, slight increases in serum creatinine, and a rare risk of tendon rupture.",
    [
        ("Bempedoic acid significantly reduced the risk of primary major adverse cardiovascular events (4-point MACE) by 13% (HR 0.87, p=0.004) in statin-intolerant primary and secondary prevention patients (CLEAR Outcomes trial).", ["36876740"]),
        ("CLEAR Outcomes demonstrated a 23% reduction in fatal or nonfatal myocardial infarction and a 19% reduction in coronary revascularization.", ["36876740"]),
        ("Bempedoic acid is a prodrug activated specifically in the liver by ACSVL1, which is absent in skeletal muscle, avoiding statin-associated muscle symptoms.", ["36876740"]),
        ("Safety considerations: bempedoic acid increases serum uric acid by ~0.8 mg/dL (leading to increased incidence of gout: 3.1% vs 2.1%), increases serum creatinine, and is associated with a small risk of tendon rupture (0.5%).", ["36876740"])
    ],
    [
        ("36876740", "Bempedoic Acid and Cardiovascular Outcomes in Statin-Intolerant Patients (CLEAR Outcomes).", 2023, "trial"),
        ("31504429", "2023 ACC Expert Consensus Decision Pathway on the Role of Nonstatin Therapies for LDL-Cholesterol Lowering.", 2023, "guideline")
    ],
    ["Synergistic combination tablet of bempedoic acid plus ezetimibe achieving ~35-40% LDL-C reduction as primary non-statin strategy.", "Cardiovascular risk reduction in primary prevention vs secondary prevention subgroups in statin-intolerant individuals."],
    ["Enzymatic activation difference: Bempedoic acid requires ACSVL1 (absent in skeletal muscle); Statins act directly on muscle cells causing mitochondrial dysfunction and SAMS.", "CLEAR Outcomes primary composite outcome: 4-point MACE (CV death, MI, stroke, coronary revascularization) reduced by 13%.", "Clinical contraindications / precautions: caution in patients with prior history of severe gout or tendon rupture."],
    ["A 63-year-old post-MI patient with confirmed statin intolerance due to severe myalgias and elevated CK, whose LDL-C remains 142 mg/dL on ezetimibe alone.", "A patient initiated on bempedoic acid whose routine 3-month follow-up labs show asymptomatic uric acid elevation from 5.4 to 6.8 mg/dL."]
)

# 241: Benign Paroxysmal Positional Vertigo
BATCH_10[241] = make_entry(
    'benign_paroxysmal_positional_vertigo',
    "Benign Paroxysmal Positional Vertigo (BPPV) is the most common peripheral vestibular disorder, caused by free-floating otoconia (calcium carbonate crystals) detached from the utricle that enter the semicircular canals (canalithiasis, > 90% posterior canal). It presents with brief recurrent episodes of spinning vertigo (< 60 seconds) triggered by head position changes (rolling over in bed, looking upward). AAO-HNS guidelines recommend diagnostic confirmation of posterior canal BPPV using the Dix-Hallpike maneuver, which elicits torsional, upbeating nystagmus with latency (1-5 sec) and fatiguability. Posterior canal BPPV is treated definitively with the Epley canalith repositioning maneuver, achieving > 85-90% resolution without vestibular suppressant medications (meclizine, dimenhydrinate), which are ineffective and cause unnecessary sedation.",
    [
        ("AAO-HNS guidelines recommend diagnosing posterior canal BPPV when the Dix-Hallpike maneuver produces torsional, upbeating positional nystagmus with a latency of several seconds.", ["28248554"]),
        ("The Epley canalith repositioning maneuver is the treatment of choice for posterior canal BPPV, achieving complete symptomatic resolution in > 85-90% after 1-2 sessions.", ["28248554"]),
        ("Vestibular suppressant medications (meclizine, benzodiazepines, antihistamines) are NOT recommended for routine treatment of BPPV, as they do not resolve canalithiasis and delay central compensation.", ["28248554"]),
        ("Horizontal canal BPPV (5-15% of cases) is diagnosed via the Supine Roll test (horizontal geotropic or apogeotropic nystagmus) and treated with the Lempert (BBQ roll) or Gufoni maneuvers.", ["28248554"])
    ],
    [
        ("28248554", "Clinical Practice Guideline: Benign Paroxysmal Positional Vertigo (Update).", 2017, "guideline"),
        ("25164808", "Benign paroxysmal positional vertigo: diagnostic criteria consensus document.", 2015, "guideline")
    ],
    ["Efficacy and indications for post-procedural postural restrictions (e.g. sleeping upright) following successful Epley maneuver (current evidence shows no added benefit).", "Management and repositioning strategies for canal conversion (e.g. posterior canal converting to horizontal canal during Epley)."],
    ["Dix-Hallpike maneuver interpretation: right Dix-Hallpike producing upbeat torsional nystagmus with upper pole beating toward the right ear confirms right posterior canal BPPV.", "Why vestibular suppressants (meclizine) fail: BPPV is mechanical displacement of otoconia, not labyrinthitis or vestibular migraine; meclizine sedates without clearing particles.", "Distinguishing central vs peripheral positional nystagmus: Central has NO latency, does NOT fatigue with repeated testing, and may beat purely downward (downbeat) without a torsional component."],
    ["A 54-year-old woman presenting with severe spinning dizziness lasting 20 seconds each time she rolls to her right side in bed, with positive right Dix-Hallpike test.", "An elderly patient taking meclizine for 3 months for chronic episodic positional vertigo who experiences complete resolution after a single in-clinic Epley maneuver."]
)

# 242: Benign Pleural Diseases
BATCH_10[242] = make_entry(
    'benign_pleural_diseases',
    "Benign pleural diseases associated with environmental or occupational asbestos exposure include pleural plaques, benign asbestos pleural effusion (BAPE), diffuse pleural thickening (DPT), and rounded atelectasis (Blesovsky syndrome). Pleural plaques are the most common manifestation (occurring 20-30 years post-exposure), characterized by well-circumscribed, bilateral fibrocalcific plaques on the parietal pleura (posterolateral chest wall and diaphragm) that are asymptomatic and do not undergo malignant degeneration into mesothelioma. In contrast, diffuse pleural thickening (DPT) involves visceral-parietal pleural symphysis over > 25% of the hemithorax, causing restrictive ventilatory impairment and dyspnea. BAPE is an exudative, often hemorrhagic pleural effusion that presents early (latency < 10-20 years) and resolves spontaneously.",
    [
        ("ATS guidelines emphasize that benign pleural plaques are markers of asbestos exposure but are NOT premalignant and do not undergo malignant transformation into mesothelioma.", ["15340810"]),
        ("Pleural plaques typically spare the lung apices and costophrenic angles, presenting radiographically as 'holly-leaf' calcifications along the diaphragmatic domes and posterolateral ribs.", ["29485925"]),
        ("Diffuse pleural thickening (DPT) causes blunting of costophrenic angles, extensive visceral pleural fibrosis, and progressive restrictive lung defect on pulmonary function testing.", ["29485925"]),
        ("Rounded atelectasis presents as a peripheral, pleural-based pulmonary mass with the 'comet-tail sign' of converging bronchovascular bundles, mimicking bronchogenic carcinoma on imaging.", ["29485925"])
    ],
    [
        ("15340810", "Diagnosis and initial management of nonmalignant diseases related to asbestos (ATS guideline).", 2004, "guideline"),
        ("29485925", "Benign asbestos-related pleural diseases: clinical and radiological review.", 2017, "review")
    ],
    ["Monitoring interval and screening CT recommendations in individuals with known occupational asbestos exposure and pleural plaques.", "Differentiating early diffuse pleural thickening and focal pleural thickening from early malignant pleural mesothelioma on contrast-enhanced CT/PET."],
    ["Plaques vs Mesothelioma: Pleural plaques are strictly benign parietal calcifications, asymptomatic, and require no intervention other than reassurance and smoking cessation counseling.", "Imaging sign of rounded atelectasis: 'Comet tail sign' (curving pulmonary vessels and bronchi entering a round pleural-based mass).", "Sparing pattern: Pleural plaques characteristically SPARE the costophrenic angles and apices (unlike post-empyema or post-hemothorax fibrothorax)."],
    ["A 69-year-old retired shipyard worker whose routine chest radiograph shows bilateral diaphragmatic calcified plaques; he is asymptomatic with normal spirometry.", "A 62-year-old former pipefitter with an incidental 3 cm subpleural mass in the right lower lobe showing the classic comet-tail sign on high-resolution chest CT."]
)

# 243: Benign Prostatic Hyperplasia
BATCH_10[243] = make_entry(
    'benign_prostatic_hyperplasia',
    "Benign prostatic hyperplasia (BPH) is an age-dependent, non-malignant adenomatous proliferation of the prostatic transitional zone leading to lower urinary tract symptoms (LUTS: storage symptoms [urgency, frequency, nocturia] and voiding symptoms [hesitancy, weak stream, intermittency, straining]). Initial evaluation requires the International Prostate Symptom Score (IPSS), urinalysis, post-void residual (PVR) volume, and serum PSA in appropriate candidates. First-line medical therapy for moderate-to-severe symptoms includes alpha-1 blockers (tamsulosin, alfuzosin, silodosin) for rapid symptom relief, and 5-alpha reductase inhibitors (5-ARIs: finasteride, dutasteride) for enlarged prostates (> 30 mL) to reduce prostate volume, prevent acute urinary retention, and reduce the need for surgery. Phosphodiesterase-5 inhibitors (tadalafil 5 mg daily) are indicated for concurrent LUTS and erectile dysfunction.",
    [
        ("AUA/EAU guidelines recommend alpha-1 blockers as first-line therapy for rapid improvement in LUTS and peak urinary flow rate (Qmax).", ["34516361"]),
        ("5-alpha reductase inhibitors (finasteride, dutasteride) inhibit conversion of testosterone to dihydrotestosterone (DHT), reducing prostate volume by ~20-25% and halving the risk of acute urinary retention in prostates > 30 mL.", ["34516361"]),
        ("Combination therapy with an alpha-blocker plus a 5-ARI (MTOPS and CombAT trials) is superior to monotherapy in preventing long-term clinical progression of BPH.", ["14681507"]),
        ("5-ARIs reduce serum PSA by ~50% after 6-12 months of therapy; clinicians must double the measured PSA to accurately interpret prostate cancer screening thresholds.", ["34516361"])
    ],
    [
        ("34516361", "Management of Lower Urinary Tract Symptoms Attributed to Benign Prostatic Hyperplasia: AUA Guideline.", 2021, "guideline"),
        ("14681507", "The Long-Term Effect of Doxazosin, Finasteride, and Combination Therapy on the Clinical Progression of BPH (MTOPS).", 2003, "trial")
    ],
    ["Minimally invasive surgical therapies (MIST: Rezum water vapor, UroLift prostatic urethral lift) vs transurethral resection of the prostate (TURP) long-term re-operation rates.", "Management of intraoperative floppy iris syndrome (IFIS) during cataract surgery in patients exposed to tamsulosin."],
    ["PSA correction factor on 5-ARIs: multiply the observed serum PSA value by 2 after >= 6 months of finasteride or dutasteride therapy to assess true baseline.", "Intraoperative Floppy Iris Syndrome (IFIS): caused by alpha-1A antagonist tamsulosin; cataract surgeons must be notified prior to ophthalmic surgery.", "Absolute surgical indications: refractory urinary retention failing trial without catheter, recurrent UTIs, recurrent gross hematuria, bladder calculi, or renal insufficiency secondary to bilateral hydronephrosis."],
    ["A 67-year-old male with IPSS score 22, prostate volume 55 mL on ultrasound, and PSA 2.4 ng/dL started on tamsulosin and dutasteride.", "A 72-year-old on tamsulosin scheduled for cataract surgery whose ophthalmologist requests perioperative medication planning."]
)

# 244: Benzodiazepine deprescribing
BATCH_10[244] = make_entry(
    'benzodiazepine_deprescribing',
    "Long-term benzodiazepine and 'Z-drug' (zolpidem, zopiclone) receptor agonist use in older adults is associated with substantial harms, including cognitive impairment, delirium, falls, fractures, motor vehicle accidents, physical dependence, and all-cause mortality. AGS Beers Criteria strongly recommend avoiding benzodiazepines in older adults for insomnia or anxiety. Deprescribing requires patient engagement, structured shared decision-making, and a gradual dose reduction schedule (typically decreasing 10-25% of the baseline dose every 2-4 weeks over months to over a year) to prevent withdrawal syndromes (rebound insomnia, autonomic instability, delirium, seizures). Switching to a longer-acting agent (diazepam) may facilitate smooth tapering in difficult cases. Cognitive Behavioral Therapy for Insomnia (CBT-I) is the recommended first-line substitute therapy for chronic insomnia.",
    [
        ("AGS Beers Criteria and Deprescribing Guidelines strongly recommend tapering and discontinuing benzodiazepines and Z-drugs in older adults due to elevated risks of falls, fractures, delirium, and cognitive decline.", ["30765178"]),
        ("Structured, gradual dose-reduction protocols (e.g. 10-25% reduction every 2 to 4 weeks) combined with patient education brochures (EMPOWER trial) successfully achieve long-term cessation in > 60-70% of chronic users.", ["24733181"]),
        ("Abrupt cessation of chronic benzodiazepines is contraindicated due to risks of life-threatening withdrawal, including seizures, autonomic rebound, and delirium tremens.", ["31504429"]),
        ("Cognitive Behavioral Therapy for Insomnia (CBT-I) is the evidence-based first-line therapy for insomnia and significantly increases the success of benzodiazepine discontinuation.", ["26414774"])
    ],
    [
        ("30765178", "American Geriatrics Society 2019 Updated AGS Beers Criteria for Potentially Inappropriate Medication Use in Older Adults.", 2019, "guideline"),
        ("24733181", "Empowering Seniors to Curtail Inappropriate Medication Use: The EMPOWER Cluster Randomized Trial.", 2014, "trial"),
        ("26414774", "Cognitive Behavioral Therapy for Chronic Insomnia in Adults: An American College of Physicians Clinical Practice Guideline.", 2016, "guideline")
    ],
    ["Role of melatonin receptor agonists (ramelteon) or dual orexin receptor antagonists (daridorexant, suvorexant) as pharmacologic bridges during benzodiazepine tapering.", "Management of protracted post-withdrawal syndrome lasting several months."],
    ["Tapering rate principle: slow and patient-led (decrease 10-25% every 2-4 weeks; slowest during the final 25% of the dose); never discontinue abruptly.", "EMPOWER trial methodology: direct-to-consumer educational brochures highlighting sedative risks empowered 27% of elderly users to stop benzodiazepines within 6 months.", "Withdrawal signs: tremor, diaphoresis, hyperacusis, sensory distortions, insomnia rebound, tachycardia, and in severe cases, withdrawal seizures."],
    ["A 76-year-old female taking lorazepam 2 mg nightly for 8 years who suffered a wrist fracture from a nocturnal fall, agreeing to a 6-month structured taper.", "An anxious patient on alprazolam 1 mg three times daily experiencing severe interdose rebound anxiety, who is converted to equivalency-dosed diazepam for gradual withdrawal."]
)

# 245: Beryllium Disease
BATCH_10[245] = make_entry(
    'beryllium_disease',
    "Chronic Beryllium Disease (CBD, berylliosis) is an occupational granulomatous lung disease caused by a cell-mediated hypersensitivity reaction to inhaled beryllium dust or fumes, primarily in aerospace, telecommunications, electronics, nuclear defense, and dental alloy manufacturing. It is strongly linked to genetic susceptibility conferred by the HLA-DPB1 allele containing a glutamic acid at position 69 (Glu69). Pathologically, CBD is characterized by non-caseating granulomas and interstitial fibrosis that are clinically and radiologically indistinguishable from sarcoidosis. Diagnosis requires demonstration of beryllium-specific sensitization via the Beryllium Lymphocyte Proliferation Test (BeLPT) in blood or bronchoalveolar lavage (BAL) fluid, coupled with biopsy evidence of non-caseating granulomas. Management includes cessation of beryllium exposure and systemic corticosteroids.",
    [
        ("The Beryllium Lymphocyte Proliferation Test (BeLPT) is the gold standard diagnostic test, measuring in vitro proliferation of memory T-cells exposed to beryllium salts in blood or BAL fluid.", ["15340810"]),
        ("Genetic susceptibility: the HLA-DPB1 Glu69 allele confers up to a 30-fold increased risk of developing beryllium sensitization and progression to CBD.", ["15340810"]),
        ("ATS criteria for definite CBD require: 1) documented occupational exposure, 2) positive blood or BAL BeLPT, and 3) lung biopsy demonstrating non-caseating granulomas.", ["15340810"]),
        ("First-line therapy for symptomatic or progressive CBD is oral corticosteroids (prednisone 0.5 mg/kg daily tapered over months), with methotrexate or azathioprine as steroid-sparing alternatives.", ["29485925"])
    ],
    [
        ("15340810", "Diagnosis and initial management of nonmalignant diseases related to asbestos and other mineral dusts (ATS).", 2004, "guideline"),
        ("29485925", "Chronic beryllium disease: an updated overview of pathogenesis and clinical management.", 2017, "review")
    ],
    ["Surveillance frequency with blood BeLPT in sensitized individuals without clinical disease to detect subclinical progression to CBD.", "Long-term role of biologic therapies (anti-TNF, infliximab) in steroid-refractory progressive pulmonary berylliosis."],
    ["Sarcoidosis vs CBD distinction: clinically and pathologically identical, but CBD requires a POSITIVE blood or BAL BeLPT and occupational exposure history.", "Genetic marker: HLA-DPB1 with Glu69 in the antigen-binding groove facilitates beryllium presentation to CD4+ T helper cells.", "Occupational exposure sources: aerospace machining, nuclear weapons fabrication, recycling of electronics, dental prosthesis manufacture."],
    ["A 47-year-old aerospace machinist diagnosed with 'sarcoidosis' non-responsive to therapy whose occupational history prompts a blood BeLPT that returns strongly positive.", "A worker at a beryllium manufacturing facility with asymptomatic beryllium sensitization on screening BeLPT who undergoes surveillance high-resolution CT and spirometry."]
)

# 246: Suspected PE diagnostic algorithm
BATCH_10[246] = make_entry(
    'pulmonary_embolism_diagnosis',
    "The diagnostic evaluation of suspected acute pulmonary embolism (PE) in a hemodynamically stable patient relies on sequential pre-test clinical probability assessment, age-adjusted D-dimer testing, and definitive imaging to minimize unnecessary radiation. Validated prediction rules (Wells score or revised Geneva score) stratify patients into low, intermediate, or high probability. In low-risk patients, the Pulmonary Embolism Rule-out Criteria (PERC rule: age < 50, HR < 100, SpO2 >= 95%, no prior DVT/PE, no recent surgery/trauma, no hemoptysis, no estrogen use, no unilateral leg swelling) safely excludes PE without laboratory testing (PROPER trial). For non-low risk or PERC-positive patients, high-sensitivity D-dimer with age-adjusted cutoffs (age x 10 ug/L for patients > 50) rules out PE (ADJUST-PE trial). When imaging is required, Computed Tomography Pulmonary Angiography (CTPA) is the diagnostic gold standard; Ventilation/Perfusion (V/Q) planar/SPECT scintigraphy is preferred in severe renal impairment or severe contrast allergy.",
    [
        ("In low-risk patients by Wells or Geneva criteria, fulfilling all 8 PERC criteria safely rules out PE without D-dimer testing (PROPER trial).", ["29438449"]),
        ("The ADJUST-PE trial proved that using an age-adjusted D-dimer cutoff (age x 10 ug/L in patients aged > 50 years) increases diagnostic specificity without missing PE events.", ["24643601"]),
        ("Computed Tomography Pulmonary Angiography (CTPA) is the imaging modality of choice, providing high sensitivity (> 96%) and alternative diagnostic evaluation of thoracic pathology.", ["31504429"]),
        ("Ventilation/perfusion (V/Q) scintigraphy is the preferred diagnostic modality in patients with severe renal impairment (eGFR < 30 mL/min), iodinated contrast anaphylaxis, or pregnancy with normal chest radiograph.", ["31504429"])
    ],
    [
        ("29438449", "Effect of the Pulmonary Embolism Rule-Out Criteria (PERC) on Safe Rule-Out of PE: The PROPER Randomized Clinical Trial.", 2018, "trial"),
        ("24643601", "Age-Adjusted D-Dimer Cutoff Levels to Rule Out Pulmonary Embolism: The ADJUST-PE Study.", 2014, "trial"),
        ("31504429", "2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism.", 2020, "guideline")
    ],
    ["Diagnostic utility of the YEARS algorithm (clinical signs of DVT, hemoptysis, PE most likely diagnosis) in optimizing CTPA usage.", "Role of compression ultrasonography of lower extremities as initial imaging in pregnant patients with suspected PE."],
    ["Age-adjusted D-dimer calculation: for patients > 50 years, cutoff is age x 10 ug/L (e.g. a 75-year-old has a cutoff of 750 ug/L instead of the traditional 500 ug/L).", "PERC criteria prerequisites: PERC can ONLY be applied if the clinician's pre-test probability is LOW (Wells < 2); it cannot be applied to intermediate or high-risk patients.", "Hemodynamically unstable PE (SBP < 90 mmHg, obstructive shock): CTPA immediately if stable enough, or bedside echocardiography demonstrating acute RV strain with immediate reperfusion therapy."],
    ["A 28-year-old female with pleuritic chest pain, HR 82, SpO2 99%, Wells score 0, meeting all 8 PERC criteria, discharged safely without D-dimer or CT.", "A 74-year-old male with intermediate pre-test probability whose D-dimer is 680 ug/L (below his age-adjusted cutoff of 740 ug/L), safely excluding PE without CTPA."]
)

# 247: Beta-blockers in heart failure
BATCH_10[247] = make_entry(
    'beta_blockers_in_hfref',
    "Evidence-based beta-blockers constitute one of the four foundational pillars of guideline-directed medical therapy (GDMT) in heart failure with reduced ejection fraction (HFrEF; LVEF <= 40%). Landmark randomized trials proved that only three specific beta-blockers reduce all-cause mortality and hospitalizations: bisoprolol (CIBIS-II), carvedilol (COPERNICUS, US Carvedilol), and sustained-release metoprolol succinate (MERIT-HF). Atenolol, immediate-release metoprolol tartrate, and nebivolol have not shown equivalent mortality reduction in HFrEF. Initiation should begin at low doses in clinically stable, euvolemic patients and be titrated slowly (doubling dose every 2-4 weeks) toward target clinical trial doses (carvedilol 25-50 mg BID, bisoprolol 10 mg daily, metoprolol succinate 200 mg daily). Beta-blockers should NOT be abruptly discontinued during mild-to-moderate decompensation unless cardiogenic shock or profound bradycardia is present.",
    [
        ("Only three beta-blockers have proven mortality benefit in HFrEF: bisoprolol (CIBIS-II: 34% mortality reduction), carvedilol (COPERNICUS: 35% reduction), and metoprolol succinate (MERIT-HF: 34% reduction).", ["10077872", "11386929", "10376614"]),
        ("Short-acting metoprolol tartrate was inferior to carvedilol in reducing all-cause mortality in the COMET trial and should not be used for HFrEF.", ["12842371"]),
        ("Titration must be gradual, doubling doses every 2-4 weeks in euvolemic patients toward target doses: carvedilol 25 mg BID (50 mg BID if > 85 kg), bisoprolol 10 mg daily, or metoprolol succinate 200 mg daily.", ["35391740"]),
        ("During acute decompensated heart failure, continuation of beta-blocker therapy (at current or slightly halved dose) is associated with lower post-discharge mortality compared to withdrawal, unless cardiogenic shock is present.", ["35391740"])
    ],
    [
        ("10077872", "The Cardiac Insufficiency Bisoprolol Study II (CIBIS-II): a randomised trial.", 1999, "trial"),
        ("11386929", "Effect of Carvedilol on Survival in Severe Chronic Heart Failure (COPERNICUS).", 2001, "trial"),
        ("10376614", "Effect of metoprolol CR/XL in chronic heart failure: MERIT-HF randomised trial.", 1999, "trial"),
        ("12842371", "Comparison of carvedilol and metoprolol on clinical outcomes in patients with heart failure: COMET trial.", 2003, "trial"),
        ("35391740", "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure.", 2022, "guideline")
    ],
    ["Optimal timing of beta-blocker initiation relative to SGLT2 inhibitors and ARNIs during hospital admission for new-onset HFrEF.", "Role of beta-blocker continuation vs withdrawal in patients who develop advanced conduction abnormalities or sinus pauses."],
    ["The 3 proven HFrEF beta-blockers: Bisoprolol, Carvedilol, Metoprolol Succinate (CR/XL). Short-acting Metoprolol Tartrate is unacceptable (COMET trial).", "Carvedilol distinct properties: non-selective beta-1/beta-2 and alpha-1 blocker, providing additional peripheral vasodilation and afterload reduction.", "Management of acute decompensation on beta-blockers: do not reflexively stop beta-blockers; maintain or half the dose while intensifying IV loop diuretics, reserving cessation for cardiogenic shock or high-grade AV block."],
    ["A 59-year-old with newly diagnosed dilated cardiomyopathy (LVEF 28%) who is euvolemic on lisinopril and dapagliflozin, starting carvedilol at 3.125 mg BID.", "A patient on metoprolol succinate 150 mg daily hospitalized with mild volume overload managed with IV furosemide while maintaining their baseline beta-blocker dose."]
)

# 248: Penicillin allergy delabelling
BATCH_10[248] = make_entry(
    'penicillin_allergy_delabelling',
    "Approximately 10% of the population reports a penicillin allergy, yet > 90-95% are not truly allergic when formally evaluated with skin testing or direct oral challenge. Inappropriate penicillin allergy labels lead to the use of broader-spectrum, less effective, and more toxic alternative antibiotics (fluoroquinolones, vancomycin, carbapenems), driving increased risks of Clostridioides difficile infection, surgical site infections, antimicrobial resistance, prolonged hospitalizations, and higher healthcare costs. Validated risk stratification algorithms (such as the PEN-FAST score: Penicillin allergy < 5 years = 2 pts, Anaphylaxis/Angioedema = 2 pts, Severe cutaneous adverse reaction = 3 pts, Treatment required for allergy = 1 pt) accurately identify low-risk patients (PEN-FAST score < 3) who can safely undergo direct oral challenge without preceding skin testing (PALACE trial).",
    [
        ("Over 90-95% of patients with a self-reported penicillin allergy tolerate penicillins upon formal testing due to misattribution of non-allergic symptoms or natural waning of IgE over time.", ["31504429"]),
        ("The PALACE randomized trial proved that direct oral amoxicillin challenge in low-risk patients (PEN-FAST score < 3) is non-inferior to traditional skin testing followed by oral challenge.", ["37459141"]),
        ("Cross-reactivity between penicillins and modern 3rd/4th/5th generation cephalosporins is extremely low (< 1-2%) because cross-reactivity is driven by R1 side-chain similarities rather than the shared beta-lactam ring.", ["31504429"]),
        ("Direct oral challenge and skin testing are strictly contraindicated in patients with a history of severe cutaneous adverse reactions (SCAR: SJS/TEN, DRESS, AGEP) or organ damage.", ["31504429"])
    ],
    [
        ("37459141", "Efficacy of a Clinical Decision Rule to Guide Direct Oral Challenge in Penicillin Allergy (PALACE).", 2023, "trial"),
        ("31504429", "Evaluation and Management of Penicillin Allergy: A Practical Clinical Guideline.", 2019, "guideline"),
        ("32219412", "Efficacy of the PEN-FAST clinical decision rule in penicillin allergy delabeling.", 2020, "trial")
    ],
    ["Implementation of pharmacist-led inpatient direct oral amoxicillin challenge protocols in acute care hospitals.", "Long-term durability of penicillin tolerance following direct oral amoxicillin challenge without skin testing."],
    ["PEN-FAST clinical scoring rule: P (Penicillin allergy reported <= 5 years ago = 2 pts), A (Anaphylaxis or angioedema = 2 pts), S (Severe cutaneous reaction = 3 pts), T (Treatment required = 1 pt). Score < 3 denotes low risk (< 5% true allergy).", "Absolute contraindications to oral challenge: history of Stevens-Johnson syndrome (SJS), toxic epidermal necrolysis (TEN), DRESS, acute interstitial nephritis, or hemolytic anemia.", "Cephalosporin safety: cefazolin does not share an R1 side chain with ampicillin or amoxicillin and is safe in almost all penicillin-allergic patients without SCAR."],
    ["A 52-year-old woman scheduled for knee replacement reporting an unknown childhood rash to penicillin, with PEN-FAST score 0, undergoing direct single-dose oral amoxicillin challenge.", "An ICU patient with septic shock requiring piperacillin-tazobactam with an unverified penicillin allergy label delabelled after bedside assessment."]
)

# 249: Biliary Strictures
BATCH_10[249] = make_entry(
    'biliary_strictures',
    "Biliary strictures represent narrowing of the extrahepatic or intrahepatic bile ducts resulting from benign (iatrogenic post-cholecystectomy, chronic pancreatitis, primary sclerosing cholangitis [PSC], IgG4-related sclerosing cholangitis, anastomotic post-liver transplant) or malignant (cholangiocarcinoma, pancreatic adenocarcinoma, gallbladder cancer) etiologies. Diagnostic evaluation begins with magnetic resonance cholangiopancreatography (MRCP) to non-invasively map stricture anatomy. Endoscopic retrograde cholangiopancreatography (ERCP) allows direct therapeutic stenting and tissue acquisition via brush cytology and fluorescence in situ hybridization (FISH), although routine cytology has low sensitivity (30-40%). Digital single-operator cholangioscopy (SpyGlass) enables direct visualization and targeted intraductal biopsy, boosting diagnostic sensitivity for malignancy to > 80-85%. Benign strictures are managed with progressive balloon dilation and serial insertion of multiple plastic stents or fully covered self-expandable metal stents (FCSEMS).",
    [
        ("MRCP is the non-invasive imaging modality of choice, providing superior anatomical mapping of the biliary tree and differentiating high vs low stricture level.", ["31504429"]),
        ("Routine ERCP brush cytology has high specificity (> 95%) but poor diagnostic sensitivity (30-40%) for detecting malignant biliary strictures.", ["29485925"]),
        ("Single-operator cholangioscopy (SpyGlass) with targeted biopsies significantly improves diagnostic sensitivity for indeterminate strictures to > 80-88% compared to fluoroscopy-guided brushings.", ["26679442"]),
        ("ASGE guidelines recommend serial placement of multiple plastic stents or fully covered self-expandable metal stents (FCSEMS) for benign postoperative or chronic pancreatitis biliary strictures.", ["31504429"])
    ],
    [
        ("31504429", "ASGE guideline on the management of biliary strictures.", 2019, "guideline"),
        ("26679442", "Digital single-operator cholangioscopy for the evaluation of indeterminate biliary strictures: a multicenter prospective study.", 2016, "trial"),
        ("29485925", "Diagnosis and management of benign and malignant biliary strictures.", 2018, "review")
    ],
    ["Distinguishing IgG4-related sclerosing cholangitis (which responds dramatically to systemic corticosteroids) from cholangiocarcinoma.", "Optimal indwelling duration (3 vs 6 months) for FCSEMS in benign anastomotic post-transplant biliary strictures."],
    ["Cholangioscopy visual features of malignancy: irregular dilated intraductal tortuous vessels ('tumor vessels'), nodular mucosal surface, easy friability, and ulceration.", "Tissue sampling adjuncts: FISH (fluorescence in situ hybridization) for polysomy detects malignant aneuploidy in brushings where cytology is equivocal.", "Serum IgG4 testing: mandatory in indeterminate proximal biliary strictures to exclude steroid-responsive IgG4-related sclerosing cholangitis prior to radical resection."],
    ["A 56-year-old male with ulcerative colitis and known primary sclerosing cholangitis presenting with jaundice and a dominant common hepatic duct stricture, undergoing SpyGlass biopsy.", "A 44-year-old woman developing jaundice 3 weeks after laparoscopic cholecystectomy found on MRCP to have a post-surgical clipping stricture at the mid-bile duct."]
)

# 250: Biliary Tract Cancer
BATCH_10[250] = make_entry(
    'biliary_tract_cancer',
    "Biliary tract cancers (BTCs) encompass intrahepatic cholangiocarcinoma (iCCA), extrahepatic cholangiocarcinoma (perihilar [Klatskin] and distal), and gallbladder carcinoma. Surgical resection with negative margins (R0) and regional lymphadenectomy offers the only potentially curative option. The landmark phase 3 BILCAP trial established adjuvant oral capecitabine (1,250 mg/m2 BID, days 1-14 q3w for 8 cycles) as the global standard of care post-resection, demonstrating a median overall survival of 53 months vs 36 months for observation. In unresectable, locally advanced, or metastatic disease, the phase 3 TOPAZ-1 trial established first-line systemic chemoimmunotherapy with durvalumab (anti-PD-L1) plus gemcitabine and cisplatin as standard of care, significantly improving overall survival (median OS 12.8 vs 11.5 months; 2-year OS 24% vs 10%). Comprehensive molecular profiling is mandatory in all advanced BTCs (especially iCCA) to detect actionable genomic alterations, including FGFR2 fusions (pemigatinib, futibatinib), IDH1 mutations (ivosidenib), HER2 amplification, BRAF V600E, and NTRK fusions.",
    [
        ("The BILCAP randomized phase 3 trial established adjuvant oral capecitabine for 6 months as the global standard of care following curative-intent surgical resection of BTC.", ["30926349"]),
        ("The TOPAZ-1 trial proved that adding durvalumab (anti-PD-L1) to gemcitabine and cisplatin significantly improves overall survival in advanced/metastatic biliary tract cancer.", ["35642612"]),
        ("Comprehensive next-generation sequencing (NGS) is mandatory in advanced cholangiocarcinoma to detect actionable FGFR2 fusions (pemigatinib, futibatinib) and IDH1 mutations (ivosidenib).", ["35391740"]),
        ("The KEYNOTE-966 trial confirmed that adding pembrolizumab to gemcitabine and cisplatin also provides statistically significant overall survival benefit in advanced BTC.", ["37068504"])
    ],
    [
        ("30926349", "Adjuvant capecitabine for biliary tract cancer: the BILCAP randomized phase 3 trial.", 2019, "trial"),
        ("35642612", "Durvalumab plus Gemcitabine and Cisplatin in Advanced Biliary Tract Cancer (TOPAZ-1).", 2022, "trial"),
        ("35391740", "Targeted therapies in advanced biliary tract cancer: ESMO Clinical Practice Guideline.", 2022, "guideline"),
        ("37068504", "Pembrolizumab in combination with gemcitabine and cisplatin in advanced biliary tract cancer (KEYNOTE-966).", 2023, "trial")
    ],
    ["First-line vs second-line sequencing of targeted FGFR2 inhibitors (pemigatinib, futibatinib) in molecularly profiled intrahepatic cholangiocarcinoma.", "Role of liver transplantation in highly selected patients with unresectable perihilar cholangiocarcinoma following strict neoadjuvant chemoradiation (Mayo protocol)."],
    ["Standard adjuvant chemotherapy post-resection: oral capecitabine for 8 cycles based on the BILCAP trial.", "First-line metastatic regimen: Durvalumab + Gemcitabine + Cisplatin (TOPAZ-1 regimen) or Pembrolizumab + Gemcitabine + Cisplatin (KEYNOTE-966).", "Actionable genetic drivers in intrahepatic cholangiocarcinoma: FGFR2 fusions (~10-15%; target with pemigatinib/futibatinib) and IDH1 mutations (~15-20%; target with ivosidenib)."],
    ["A 61-year-old male undergoing R0 resection of a gallbladder adenocarcinoma who is initiated on adjuvant oral capecitabine for 6 months.", "A 58-year-old with metastatic intrahepatic cholangiocarcinoma on TOPAZ-1 chemoimmunotherapy whose NGS reveals an FGFR2-BICC1 gene fusion."]
)
