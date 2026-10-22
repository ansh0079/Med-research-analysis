# -*- coding: utf-8 -*-
"""
Builder script for remediating the 18 "TO DO: replace placeholders" topics.
Replaces all generic placeholder claims, rewrites mentor intros, generates specific MCQ angles,
and maintains full 5-layer curriculum depth.
"""

REMEDIATED_18 = {
    "Recurrent nephrolithiasis medical prevention": {
        "mentor_intro": "Medical prevention of recurrent nephrolithiasis requires comprehensive 24-hour urine metabolic evaluation following stone analysis. Tailored dietary modifications combined with targeted pharmacotherapy—thiazide diuretics for hypercalciuria, potassium citrate for hypocitraturia or uric acid stones, and allopurinol for hyperuricosuria—substantially reduce recurrence rates.",
        "teaching_points": [
            "High fluid intake targeting a 24-hour urine volume greater than 2.0 to 2.5 L/day, dietary sodium restriction (<2 g/day), moderate dietary calcium intake (1,000–1,200 mg/day), and reduction of non-dairy animal protein are foundational dietary interventions for preventing recurrent calcium oxalate stones.",
            "Thiazide diuretics (chlorthalidone 25-50 mg daily, indapamide 2.5 mg daily, or hydrochlorothiazide 25-50 mg twice daily) stimulate distal renal tubular calcium reabsorption, significantly lowering urinary calcium excretion in patients with idiopathic hypercalciuria.",
            "Potassium citrate (30-60 mEq/day in divided doses) alkalinizes urine and corrects hypocitraturia; urinary citrate acts as a potent natural inhibitor of calcium oxalate and calcium phosphate crystal nucleation and agglomeration.",
            "In patients with recurrent calcium stones and persistent hyperuricosuria despite purine dietary reduction, allopurinol (100-300 mg daily) significantly reduces stone recurrence by inhibiting xanthine oxidase."
        ],
        "mcq_angles": [
            "Dietary calcium paradox in nephrolithiasis: restricting dietary calcium increases intestinal oxalate absorption and paradoxical stone recurrence.",
            "First-line pharmacotherapy for recurrent calcium stones with hypercalciuria: thiazide diuretics, not loop diuretics (which increase calciuria).",
            "Target urinary parameters in stone prevention: urine volume >2.5 L/day, pH 6.0–6.5 for calcium oxalate, pH 6.5–7.0 for uric acid stones."
        ],
        "case_hooks": [
            "A 38-year-old man with his third episode of calcium oxalate nephrolithiasis and elevated 24-hour urine calcium on a low-sodium diet.",
            "A 52-year-old woman with recurrent radiolucent stones, persistent urine pH of 5.1, and elevated serum uric acid."
        ],
        "uncertainties": [
            "Optimal long-term dosing of thiazides balancing fracture protection versus hypokalemia and dyslipidemia.",
            "Comparative efficacy of sodium citrate versus potassium citrate in patients with comorbid stage 3 chronic kidney disease."
        ]
    },

    "Rheumatoid arthritis: ACR/EULAR 2010 classification criteria, RF and anti-CCP serology": {
        "mentor_intro": "The 2010 ACR/EULAR classification criteria for rheumatoid arthritis prioritize early disease recognition to enable prompt disease-modifying antirheumatic drug (DMARD) initiation before irreversible erosive joint damage occurs. Classification combines joint distribution, serology, acute-phase reactants, and symptom duration.",
        "teaching_points": [
            "The 2010 ACR/EULAR classification criteria utilize a score-based algorithm across four domains: joint involvement (0-5 points), serology with RF or anti-CCP (0-3 points), acute-phase reactants CRP/ESR (0-1 point), and symptom duration >=6 weeks (0-1 point), with a cumulative score of >=6/10 defining definite rheumatoid arthritis.",
            "Anti-citrullinated protein antibodies (anti-CCP / ACPA) demonstrate high diagnostic specificity (>95%) for rheumatoid arthritis and independently predict aggressive radiographic erosive progression, often preceding clinical arthritis by several years.",
            "Rheumatoid factor (RF) has moderate sensitivity (60-80%) but lower specificity (approx. 80-85%), occurring in primary Sjogren syndrome, systemic lupus erythematosus, chronic hepatitis C, subacute bacterial endocarditis, and healthy elderly individuals.",
            "Symmetric polyarthritis classically involves the metacarpophalangeal (MCP), proximal interphalangeal (PIP), and wrist joints, while characteristically sparing the distal interphalangeal (DIP) joints, thoracolumbar spine, and sacroiliac joints."
        ],
        "mcq_angles": [
            "Joint distribution scoring under 2010 criteria: involvement of >10 joints with at least 1 small joint yields maximum 5 points.",
            "Differentiating RA from nodal osteoarthritis: sparing of DIP joints and presence of prolonged morning stiffness (>30-60 minutes).",
            "Serological interpretation: high-titer ACPA (>3 times upper limit of normal) yields 3 points and dictates early aggressive DMARD combination."
        ],
        "case_hooks": [
            "A 42-year-old woman presenting with 8 weeks of symmetric pain and swelling in bilateral MCPs, wrists, and PIPs with 2 hours of morning stiffness.",
            "A 60-year-old man with seronegative inflammatory oligoarthritis of the wrists and MCP joints, evaluated for classification criteria score calculation."
        ],
        "uncertainties": [
            "Classification accuracy of 2010 criteria in early seronegative elderly-onset rheumatoid arthritis.",
            "Prognostic significance of dual-seropositive (RF+ and ACPA+) versus isolated ACPA seropositivity in predicting biologic response."
        ]
    },

    "STEMI primary PCI reperfusion": {
        "mentor_intro": "Prompt reperfusion is the cornerstone of ST-elevation myocardial infarction (STEMI) management. Primary percutaneous coronary intervention (PCI) is the gold standard when achievable within guideline-mandated timeframes, while fibrinolytic therapy serves as an essential alternative when transfer delays preclude timely catheterization.",
        "teaching_points": [
            "Primary percutaneous coronary intervention (PCI) is the preferred reperfusion strategy when it can be performed within 120 minutes of STEMI diagnosis; in PCI-capable centers, the target door-to-balloon time is under 90 minutes (or under 60 minutes for direct presentation).",
            "When anticipated delay from STEMI diagnosis to PCI exceeds 120 minutes, emergency intravenous fibrinolysis (tenecteplase weight-adjusted bolus) should be administered within 10 minutes of diagnosis, followed by immediate transfer to a PCI center for routine pharmacoinvasive angiography within 2 to 24 hours.",
            "Dual antiplatelet therapy comprising aspirin (150-300 mg loading dose) plus a potent P2Y12 inhibitor (ticagrelor 180 mg or prasugrel 60 mg) is superior to clopidogrel in reducing ischemic events and stent thrombosis without excess overall mortality.",
            "Radial artery access is strongly recommended over femoral access (Class I, Level A) to reduce major vascular bleeding complications, access-site hematomas, and 30-day all-cause mortality."
        ],
        "mcq_angles": [
            "Reperfusion timeframe rules: transfer for primary PCI if FMC-to-device is <120 minutes; otherwise immediate fibrinolysis within 10 minutes.",
            "Contraindications to fibrinolysis: prior intracranial hemorrhage, ischemic stroke within 6 months, active internal bleeding, known intracranial neoplasm.",
            "Vascular access selection: radial artery access significantly reduces mortality and major bleeding compared to femoral access in STEMI."
        ],
        "case_hooks": [
            "A 58-year-old man presenting to a rural non-PCI facility with 90 minutes of crushing chest pain and 4 mm ST-elevation in leads V1-V4, with an estimated transfer time of 150 minutes.",
            "A 65-year-old woman undergoing emergent primary PCI via radial approach who develops refractory no-reflow phenomenon after stent deployment."
        ],
        "uncertainties": [
            "Timing of non-culprit lesion revascularization: immediate multivessel PCI during the index procedure versus staged inpatient intervention.",
            "Optimal duration of dual antiplatelet therapy in patients at high bleeding risk receiving contemporary drug-eluting stents."
        ]
    },

    "Sedation outside theatres and procedural sedation safety": {
        "mentor_intro": "Procedural sedation outside the operating theater requires rigorous pre-procedural risk assessment, standardized physiological monitoring, and immediate access to airway rescue equipment. Maintaining safety hinges on recognizing sedation depths, adherence to fasting guidelines, and prompt reversal of over-sedation.",
        "teaching_points": [
            "Procedural sedation outside the operating room requires dedicated pre-procedure fasting assessment (typically 2 hours for clear fluids, 6 hours for light meals), continuous multi-parameter monitoring (pulse oximetry, continuous capnography, non-invasive blood pressure, ECG), and an independent trained practitioner whose sole responsibility is patient monitoring.",
            "Continuous end-tidal CO2 capnography is mandatory for moderate and deep sedation because it detects hypoventilation, respiratory depression, and airway obstruction significantly earlier than pulse oximetry or visual inspection.",
            "Specific pharmacological reversal agents must be immediately accessible: naloxone (0.1-0.2 mg titrated IV every 2-3 minutes) for opioid-induced respiratory depression, and flumazenil (0.2 mg IV titrated up to 1.0 mg) for benzodiazepine toxicity.",
            "Propofol and dexmedetomidine provide rapid-onset, titratable sedation but lack specific pharmacological antagonists, necessitating direct supervision by clinicians skilled in advanced airway management and bag-mask ventilation."
        ],
        "mcq_angles": [
            "Diagnostic superiority of capnography: capnography detects alveolar hypoventilation and apnea minutes before pulse oximetry desaturation, especially in supplemental oxygen.",
            "Half-life hazard of reversal agents: naloxone and flumazenil have shorter half-lives than long-acting opioids/benzodiazepines, risking resedation.",
            "Fasting guidelines for elective sedation: 2 hours for clears, 6 hours for solids, with emergency procedures balanced against aspiration risk."
        ],
        "case_hooks": [
            "A 54-year-old man undergoing colonoscopy who develops sudden flatline capnography waveform despite normal oxygen saturation on 4 L/min nasal cannula.",
            "A 72-year-old woman who receives midazolam and fentanyl for shoulder reduction, becomes unarousable with shallow respirations, and requires titrated reversal."
        ],
        "uncertainties": [
            "Role of routine pre-procedure gastric point-of-care ultrasound (POCUS) versus strict fasting hour intervals in emergency procedural sedation.",
            "Safety profile of ketofol (ketamine-propofol combination) versus propofol monotherapy regarding hemodynamic stability and recovery time."
        ]
    },

    "Syncope evaluation and pacing indications": {
        "mentor_intro": "Evaluation of syncope requires distinguishing benign reflex/orthostatic etiologies from life-threatening cardiogenic causes. Permanent pacemaker implantation is indicated for high-grade atrioventricular block, symptomatic sick sinus syndrome, and severe cardioinhibitory reflex syncope meeting strict diagnostic criteria.",
        "teaching_points": [
            "Diagnostic workup of syncope prioritizes distinguishing cardiac (arrhythmic or structural) causes from vasovagal and orthostatic syncope; persistent unexplained syncope in patients with underlying structural heart disease or abnormal baseline ECG carries high risk of sudden cardiac death.",
            "Class I indications for permanent cardiac pacing in acquired atrioventricular (AV) block include complete third-degree AV block, advanced/high-grade second-degree AV block, and Mobitz Type II second-degree AV block, regardless of symptoms.",
            "In sick sinus syndrome (sinus node dysfunction), pacing is indicated only when syncope or presyncope is directly documented to correlate with symptomatic sinus bradycardia, sinus pauses, or sinoatrial exit block.",
            "For recurrent cardioinhibitory reflex syncope in patients aged >=40 years, dual-chamber pacemaker implantation is indicated when documentation of asystolic pauses >=3 seconds (with syncope) or >=6 seconds (asymptomatic) is confirmed during tilt-table testing or implantable loop recorder (ILR) monitoring."
        ],
        "mcq_angles": [
            "ECG red flags in syncope: bifascicular block, Mobitz II second-degree AV block, prolonged QT interval, Brugada pattern, or pre-excitation (WPW).",
            "Pacing threshold in carotid sinus hypersensitivity: reproduction of syncope with asystole >3 seconds during carotid sinus massage confirms cardioinhibitory subtype.",
            "Mobitz I vs Mobitz II pacing indications: Mobitz I (Wenckebach) usually does not require pacing unless symptomatic; Mobitz II always warrants permanent pacing."
        ],
        "case_hooks": [
            "A 74-year-old man presenting with sudden drop attacks without aura whose ECG demonstrates right bundle branch block with left anterior fascicular block (bifascicular block).",
            "A 45-year-old woman with recurrent traumatic syncopal episodes whose 3-month implantable loop recorder captures a 6.2-second sinus pause coincident with collapse."
        ],
        "uncertainties": [
            "Efficacy of closed-loop stimulation (CLS) pacing versus conventional dual-chamber DDD pacing in suppressing vasovagal syncope recurrence.",
            "Threshold for prophylactic pacemaker implantation in asymptomatic patients with alternating bundle branch block."
        ]
    },

    "TNF Receptor-Associated Periodic Syndrome": {
        "mentor_intro": "TNF receptor-associated periodic syndrome (TRAPS) is an autosomal dominant systemic autoinflammatory disorder caused by mutations in the TNFRSF1A gene. Characterized by prolonged febrile episodes lasting weeks, migratory myalgias with overlying fasciitis, and periorbital edema, TRAPS carries a substantial risk of secondary AA amyloidosis.",
        "teaching_points": [
            "TNF receptor-associated periodic syndrome (TRAPS) is an autosomal dominant autoinflammatory disorder caused by mutations in the TNFRSF1A gene (encoding the 55-kDa TNF receptor type 1), leading to protein misfolding, defective receptor clearance, ligand-independent intracellular signaling, and hyperactivation of the IL-1 beta pathway.",
            "Clinical attacks typically persist for 1 to 3 weeks (significantly longer than the 1-3 day attacks in familial Mediterranean fever) and feature prolonged spiking fevers, centrifugal painful migratory erythematous plaques with underlying monocytic fasciitis, periorbital edema, serositis, and severe arthralgias.",
            "Secondary reactive (AA) amyloidosis represents the most severe long-term complication, developing in up to 15-25% of untreated patients with structural pathogenic mutations (e.g., cysteine residue substitutions) and manifesting as progressive proteinuria and renal failure.",
            "Targeted cytokine inhibition with interleukin-1 antagonists (canakinumab, anakinra) is the evidence-based first-line therapy, achieving rapid clinical remission, biochemical normalization of CRP/SAA, and effective prevention of amyloidosis; NSAIDs provide only partial symptomatic relief, and etanercept shows diminishing long-term efficacy."
        ],
        "mcq_angles": [
            "Attack duration comparison: TRAPS episodes last 1 to 4 weeks, contrasting with FMF (12-72 hours) and HIDS/MKD (3-7 days).",
            "Characteristic physical signs: migratory erythematous plaques over deep muscular fasciitis and unilateral/bilateral periorbital edema.",
            "Therapeutic drug of choice: IL-1 blockade (canakinumab/anakinra) is superior to TNF inhibitors (etanercept) in maintaining complete disease remission."
        ],
        "case_hooks": [
            "A 28-year-old woman presenting with a 14-day history of high fevers, severe thigh pain with overlying warm erythematous rash, periorbital edema, and elevated CRP of 180 mg/L.",
            "A 35-year-old man with childhood-onset periodic fever syndromes who develops nephrotic-range proteinuria and renal biopsy-proven apple-green birefringent deposits on Congo red staining."
        ],
        "uncertainties": [
            "Clinical penetrance and treatment thresholds for low-penetrance variants (such as R92Q and P46L) presenting with atypical mild autoinflammatory symptoms.",
            "Long-term strategy for on-demand versus continuous maintenance dosing with canakinumab in adult TRAPS."
        ]
    },

    "Thyroid cancer surveillance: recurrence monitoring, thyroglobulin, neck ultrasound protocols": {
        "mentor_intro": "Long-term surveillance for differentiated thyroid carcinoma (papillary and follicular) utilizes high-resolution cervical ultrasonography and serial serum thyroglobulin measurements. Risk-stratified follow-up allows tailoring of TSH suppression therapy and avoids unnecessary invasive imaging in patients achieving an excellent response to treatment.",
        "teaching_points": [
            "Serum thyroglobulin (Tg) measured alongside anti-thyroglobulin antibodies (TgAb) is the primary sensitive tumor marker for recurrent differentiated thyroid carcinoma following total thyroidectomy and radioiodine ablation; any presence of TgAb invalidates automated immunometric Tg assays and mandates radioimmunoassay or LC-MS/MS measurement.",
            "High-resolution neck ultrasonography performed at 6 to 12 months post-ablation and periodically thereafter evaluates the central and lateral cervical nodal basins; suspicious features include microcalcifications, round shape, cystic necrosis, hyperechoic punctate foci, and loss of the fatty hilum.",
            "According to the American Thyroid Association (ATA) dynamic risk stratification, patients are reclassified into excellent response, biochemically incomplete response, structurally incomplete response, or indeterminate response based on follow-up imaging and stimulated/unstimulated Tg levels.",
            "In patients achieving an 'excellent response' (undetectable unstimulated Tg <0.2 ng/mL or stimulated Tg <1 ng/mL with negative imaging), TSH targets are relaxed to the normal reference range (0.5-2.0 mIU/L), minimizing iatrogenic risks of osteoporosis and atrial fibrillation."
        ],
        "mcq_angles": [
            "Laboratory pitfall with thyroglobulin: anti-Tg antibodies falsely lower immunometric Tg measurements; serial monitoring must always include concurrent TgAb titers.",
            "Lymph node biopsy threshold: suspicious cervical lymph nodes should undergo ultrasound-guided FNA with needle washout for Tg measurement when measuring >=8-10 mm in smallest diameter.",
            "TSH suppression targets: maintain TSH <0.1 mIU/L for high-risk persistent disease, 0.1-0.5 mIU/L for intermediate risk, and 0.5-2.0 mIU/L for low-risk complete responders."
        ],
        "case_hooks": [
            "A 46-year-old woman 1 year post-total thyroidectomy and 131-I ablation whose serum Tg is undetectable (<0.1 ng/mL) but anti-Tg antibody rises from 15 to 140 IU/mL.",
            "A 55-year-old man with treated papillary thyroid cancer whose routine surveillance ultrasound detects a 12-mm round, hypoechoic lymph node in level IV with microcalcifications."
        ],
        "uncertainties": [
            "Optimal interval for routine ultrasound surveillance in low-risk patients who maintain undetectable thyroglobulin beyond 5 years.",
            "Clinical threshold for empiric radioiodine therapy versus surveillance in patients with biochemically incomplete response without structural localization."
        ]
    },

    "Thyroid nodules: ATA risk stratification, ultrasound features, FNA indications": {
        "mentor_intro": "Evaluation of thyroid nodules is guided by ultrasound pattern risk stratification according to the American Thyroid Association (ATA) guidelines or ACR TI-RADS. Determining when to perform fine-needle aspiration (FNA) balances identifying clinically significant thyroid carcinomas against avoiding overdiagnosis of indolent microcarcinomas.",
        "teaching_points": [
            "Ultrasound features associated with high suspicion of malignancy (ATA high risk: >70-90% cancer risk) include solid hypoechoic composition, irregular or microlobulated margins, microcalcifications, taller-than-wide shape, and rim calcifications with small extrusive soft-tissue components.",
            "Fine-needle aspiration (FNA) is recommended for high-suspicion nodules >=1.0 cm, intermediate-suspicion nodules >=1.0 cm, low-suspicion nodules >=1.5 cm, and very low-suspicion nodules >=2.0 cm; purely cystic nodules carry <1% malignancy risk and do not require diagnostic biopsy.",
            "Initial biochemical workup requires checking serum thyroid-stimulating hormone (TSH); a suppressed TSH warrants radionuclide thyroid scintigraphy (I-123 or Tc-99m) to detect hyperfunctioning ('hot') nodules, which are rarely malignant and do not require FNA.",
            "Cytological results are classified according to the Bethesda System for Reporting Thyroid Cytopathology (Categories I to VI), where Category III (AUS/FLUS) and Category IV (Follicular Neoplasm) represent indeterminate lesions suitable for molecular diagnostic testing (e.g., Afirma, ThyroSeq) to avoid unnecessary diagnostic hemithyroidectomy."
        ],
        "mcq_angles": [
            "First step in thyroid nodule workup: serum TSH measurement; if low, perform scintigraphy before considering FNA.",
            "Most specific ultrasound predictor of papillary thyroid cancer: punctate microcalcifications (psammoma bodies) and taller-than-wide geometry.",
            "Size threshold rule: nodules <1.0 cm without extrathyroidal extension, regional lymphadenopathy, or high-risk clinical features do not undergo routine FNA regardless of sonographic appearance."
        ],
        "case_hooks": [
            "A 40-year-old woman found to have an incidental 1.4-cm solid, hypoechoic thyroid nodule with microcalcifications and irregular margins on carotid Doppler imaging.",
            "A 52-year-old man with a 2.2-cm spongiform thyroid nodule in the left lobe and a normal serum TSH of 1.8 mIU/L."
        ],
        "uncertainties": [
            "Cost-effectiveness and long-term diagnostic utility of reflex molecular testing in Bethesda III nodules with low-risk sonographic appearance.",
            "Active surveillance protocols versus immediate surgery for biopsy-proven low-risk micropapillary thyroid carcinomas (<1 cm)."
        ]
    },

    "recurrent chest infections": {
        "mentor_intro": "Recurrent lower respiratory tract infections in adults mandate structured investigation to distinguish anatomical airway abnormalities, impaired mucociliary clearance, and systemic immune deficiencies from environmental or aspiration-related triggers. High-resolution CT and targeted immunologic screening form the initial diagnostic core.",
        "teaching_points": [
            "Adults presenting with recurrent lower respiratory tract infections (>=3 episodes per year) require high-resolution computed tomography (HRCT) of the chest to detect underlying bronchiectasis, localized bronchial obstruction, tracheobronchomalacia, or foreign body aspiration.",
            "Initial immunological evaluation includes quantitative serum immunoglobulins (IgG, IgA, IgM) and baseline specific functional antibody titers against pneumococcal capsular polysaccharides, tetanus toxoid, and Haemophilus influenzae type b to diagnose common variable immunodeficiency (CVID) or specific antibody deficiency.",
            "In patients with bilateral bronchiectasis or persistent Pseudomonas aeruginosa colonization, diagnostic evaluation must include sweat chloride testing or CFTR genetic screening for cystic fibrosis, alongside nasal nitric oxide measurement for primary ciliary dyskinesia (PCD).",
            "Chronic macrolide maintenance therapy (azithromycin 250-500 mg three times weekly) significantly reduces exacerbation frequency and hospitalizations in non-cystic fibrosis bronchiectasis through immunomodulatory and anti-inflammatory properties, provided non-tuberculous mycobacterial (NTM) infection has been excluded."
        ],
        "mcq_angles": [
            "Prerequisite before commencing long-term macrolides: sputum screening for Non-Tuberculous Mycobacteria (NTM) to avoid inducing macrolide resistance.",
            "Diagnostic hallmark of CVID: significantly reduced serum IgG (>=2 SD below mean) plus low IgA or IgM, with impaired vaccine antibody responses.",
            "High-resolution CT features of bronchiectasis: internal bronchoarterial diameter ratio >1 ('signet ring sign') and lack of bronchial tapering within 1 cm of the pleural surface."
        ],
        "case_hooks": [
            "A 34-year-old woman with a history of 4 treated episodes of bacterial pneumonia over 18 months, chronic cough, and serum IgG of 3.2 g/L (normal 7-16 g/L).",
            "A 62-year-old non-smoker with daily purulent sputum production whose chest HRCT demonstrates diffuse bilateral cylindrical bronchiectasis."
        ],
        "uncertainties": [
            "Optimal threshold and criteria for initiating long-term subcutaneous or intravenous immunoglobulin (IVIG/SCIG) replacement in specific antibody deficiency.",
            "Emergence of macrolide resistance and cardiovascular safety profiles during multi-year azithromycin maintenance therapy."
        ]
    },

    "sacubitril valsartan heart failure reduced ejection fraction mortality": {
        "mentor_intro": "The angiotensin receptor-neprilysin inhibitor (ARNI) sacubitril/valsartan is a cornerstone guideline-directed medical therapy for heart failure with reduced ejection fraction (HFrEF). Simultaneous neprilysin inhibition and angiotensin receptor blockade enhance natriuretic peptide signaling while counteracting neurohormonal maladaptation.",
        "teaching_points": [
            "In the landmark PARADIGM-HF trial of patients with heart failure and reduced ejection fraction (HFrEF, LVEF <=40%), sacubitril/valsartan significantly reduced the composite endpoint of cardiovascular death and heart failure hospitalization by 20% compared with enalapril (HR 0.80, P<0.001).",
            "Transitioning from an ACE inhibitor to sacubitril/valsartan requires a mandatory 36-hour washout period to prevent bradykinin accumulation and the life-threatening risk of angioedema; this washout is not required when switching from an angiotensin receptor blocker (ARB).",
            "Sacubitril degrades neprilysin, preventing breakdown of natriuretic peptides (ANP, BNP, CNP), bradykinin, and adrenomedullin; consequently, plasma B-type natriuretic peptide (BNP) levels increase during therapy, making N-terminal pro-BNP (NT-proBNP)—which is not a neprilysin substrate—the only reliable biomarker for monitoring.",
            "Target maintenance dosing is 97/103 mg twice daily (equivalent to 200 mg twice daily); titration from initial lower doses (24/26 mg or 49/51 mg twice daily) is performed every 2 to 4 weeks while monitoring blood pressure, serum potassium, and renal function."
        ],
        "mcq_angles": [
            "Mandatory washout rule: strict 36-hour drug-free interval between last ACE inhibitor dose and first ARNI dose to prevent fatal angioedema.",
            "Biomarker interpretation on ARNI: BNP rises due to neprilysin inhibition; NT-proBNP must be measured to evaluate clinical congestion and treatment response.",
            "Guideline-directed 4-pillar HFrEF therapy: ARNI, evidence-based beta-blocker, mineralocorticoid receptor antagonist (MRA), and SGLT2 inhibitor."
        ],
        "case_hooks": [
            "A 64-year-old man with ischemic cardiomyopathy (LVEF 30%) on ramipril 10 mg and bisoprolol 10 mg who is transitioned to sacubitril/valsartan following guideline review.",
            "A 70-year-old woman with HFrEF whose serum creatinine rises by 20% and systolic BP falls to 98 mmHg during titration to sacubitril/valsartan 97/103 mg BID."
        ],
        "uncertainties": [
            "Safety and efficacy of in-hospital ARNI initiation immediately following hemodynamic stabilization from acute decompensated heart failure (PIONEER-HF).",
            "Long-term cognitive safety profile regarding neprilysin-mediated degradation of amyloid-beta in the central nervous system."
        ]
    },

    "semaglutide once weekly obesity weight loss STEP 1": {
        "mentor_intro": "Once-weekly subcutaneous semaglutide 2.4 mg represents a breakthrough GLP-1 receptor agonist therapy for chronic weight management. Landmark randomized trials have established substantial body weight reductions and major cardiovascular risk benefits in individuals with obesity.",
        "teaching_points": [
            "In the landmark STEP 1 randomized trial of adults with overweight or obesity without diabetes, once-weekly subcutaneous semaglutide 2.4 mg combined with lifestyle intervention achieved a mean body weight reduction of -14.9% at 68 weeks versus -2.4% with placebo (treatment difference -12.4 percentage points, P<0.001).",
            "In the landmark SELECT cardiovascular outcomes trial, semaglutide 2.4 mg once weekly significantly reduced the incidence of major adverse cardiovascular events (cardiovascular death, nonfatal myocardial infarction, or nonfatal stroke) by 20% (HR 0.80, P<0.001) in overweight or obese patients with preexisting cardiovascular disease and no diabetes.",
            "Semaglutide delays gastric emptying, enhances glucose-dependent insulin secretion, suppresses glucagon, and acts centrally on hypothalamic and mesolimbic hunger and satiety pathways to reduce appetite, food cravings, and overall caloric intake.",
            "To minimize gastrointestinal adverse effects (nausea, vomiting, diarrhea, constipation), semaglutide is initiated at 0.25 mg once weekly and escalated monthly through 0.5 mg, 1.0 mg, 1.7 mg, up to the target maintenance dose of 2.4 mg once weekly."
        ],
        "mcq_angles": [
            "Magnitude of weight loss in STEP 1: ~15% mean weight loss at 68 weeks with semaglutide 2.4 mg, with over one-third of participants achieving >=20% weight loss.",
            "SELECT trial cardiovascular outcome: 20% relative reduction in MACE in non-diabetic obese patients with established atherosclerotic cardiovascular disease.",
            "Contraindications to GLP-1 receptor agonists: personal or family history of medullary thyroid carcinoma (MTC) or Multiple Endocrine Neoplasia type 2 (MEN 2)."
        ],
        "case_hooks": [
            "A 48-year-old non-diabetic woman with a BMI of 38 kg/m2 and hypertension seeking pharmacological intervention after failing structured dietary programs.",
            "A 62-year-old man with previous coronary stent placement and a BMI of 33 kg/m2 evaluated for secondary cardiovascular event risk reduction."
        ],
        "uncertainties": [
            "Magnitude of weight regain following cessation of long-term semaglutide therapy (STEP 4 trial extension data).",
            "Long-term risks of lean body mass and skeletal muscle loss during rapid GLP-1-mediated weight reduction in older adults."
        ]
    },

    "Tocilizumab in giant cell arteritis: GiACTA trial, steroid sparing, remission": {
        "mentor_intro": "Giant cell arteritis (GCA) is a medical emergency requiring rapid intervention to prevent irreversible visual loss. The IL-6 receptor antagonist tocilizumab provides potent steroid-sparing immunosuppression, achieving sustained glucocorticoid-free remission in large-scale clinical trials.",
        "teaching_points": [
            "In the landmark GiACTA randomized trial, subcutaneous tocilizumab (162 mg weekly or every other week) combined with a 26-week prednisone taper achieved significantly higher sustained glucocorticoid-free remission at 52 weeks (56% and 53%) compared with placebo plus 26-week (14%) or 52-week (18%) prednisone tapers (P<0.001).",
            "Tocilizumab directly binds both soluble and membrane-bound interleukin-6 (IL-6) receptors, which rapidly normalizes acute-phase reactants (ESR and CRP) regardless of underlying persistent arterial wall inflammation, rendering ESR and CRP unreliable markers for disease flare during therapy.",
            "Immediate high-dose glucocorticoid therapy (prednisolone 40-60 mg daily, or intravenous methylprednisolone pulses 500-1000 mg daily for 3 days if visual symptoms are present) must never be delayed while awaiting temporal artery biopsy or vascular ultrasound.",
            "Routine safety monitoring during tocilizumab therapy requires periodic evaluation of neutrophil count, platelet count, liver transaminases, lipid profiles, and screening for latent tuberculosis and bowel perforation risk (diverticulitis history)."
        ],
        "mcq_angles": [
            "Biomarker unreliability during tocilizumab therapy: ESR and CRP remain suppressed due to IL-6 receptor blockade and cannot be used to monitor clinical relapse.",
            "GiACTA trial clinical impact: proven steroid-sparing efficacy allowing cumulative prednisone reduction and sustained flare-free remission.",
            "Pre-treatment screening: mandatory testing for latent tuberculosis and chronic hepatitis B/C, and assessing past history of diverticular disease."
        ],
        "case_hooks": [
            "A 72-year-old woman with biopsy-proven GCA experiencing recurrent jaw claudication and temporal headaches while tapering prednisone to 15 mg daily.",
            "A 68-year-old man on tocilizumab 162 mg weekly for GCA who presents with fever and mild abdominal discomfort with normal CRP and ESR, subsequently found to have a perforated diverticulum."
        ],
        "uncertainties": [
            "Optimal treatment duration with tocilizumab beyond 12 months and relapse rates following discontinuation.",
            "Role of advanced imaging (PET-CT, contrast MRI) in monitoring persistent large-vessel vasculitis activity in patients with suppressed serum inflammatory markers."
        ]
    },

    "Toxic and nutritional neuropathies: B12, B6 deficiency, chemotherapy-induced": {
        "mentor_intro": "Toxic and nutritional neuropathies present as insidious, length-dependent, symmetrical sensorimotor polyneuropathies. Recognizing deficiency states (B12, copper) and neurotoxic exposures (pyridoxine excess, platinum agents, taxanes) is essential for arresting axonal degeneration before permanent disability occurs.",
        "teaching_points": [
            "Nutritional and toxic neuropathies present with symmetric, length-dependent distal sensorimotor polyneuropathy; vitamin B12 (cobalamin) deficiency characteristically produces subacute combined degeneration (SCD) of the spinal cord, combining dorsal column sensory ataxia with lateral corticospinal tract spastic paraparesis.",
            "While vitamin B6 (pyridoxine) deficiency causes peripheral neuropathy, chronic excessive pyridoxine supplementation (>100-200 mg/day) produces severe, irreversible non-length-dependent sensory neuronopathy (ganglionopathy) affecting dorsal root ganglia with profound sensory ataxia and areflexia.",
            "Chemotherapy-induced peripheral neuropathy (CIPN) is a major dose-limiting complication of platinum compounds (oxaliplatin acute cold-induced dysesthesias; cisplatin cumulative sensory neuropathy), taxanes (paclitaxel axonal neuropathy), vinca alkaloids (vincristine autonomic and motor neuropathy), and proteasome inhibitors (bortezomib).",
            "In patients with low-normal serum B12 levels (150-300 pmol/L), elevated functional metabolic intermediates—methylmalonic acid (MMA) and homocysteine—confirm true intracellular cobalamin deficiency; concurrent copper deficiency must be excluded as it closely mimics subacute combined degeneration."
        ],
        "mcq_angles": [
            "Pyridoxine toxicity paradox: mega-dose vitamin B6 causes pure sensory ganglionopathy with loss of proprioception and preserved motor power.",
            "Differential diagnosis of subacute combined degeneration: copper deficiency (e.g., from zinc toxicity or gastric bypass) produces identical posterior/lateral column degeneration.",
            "Oxaliplatin unique toxicity: acute cold-triggered perioral and distal paresthesias occurring during or immediately following infusion."
        ],
        "case_hooks": [
            "A 56-year-old strict vegan presenting with progressive unsteady gait, lower limb paresthesias, bilateral extensor plantar responses, and absent vibratory sensation to the costal margins.",
            "A 42-year-old woman presenting with sensory ataxia and absent tendon reflexes after consuming 300 mg daily of over-the-counter vitamin B6 supplements for 2 years."
        ],
        "uncertainties": [
            "Efficacy of duloxetine as the only guideline-recommended pharmacotherapy for symptomatic chemotherapy-induced peripheral neuropathy.",
            "Role of neurofilament light chain (NfL) biomarkers in detecting subclinical early axonal injury before irreversible neuropathy develops."
        ]
    },

    "Type 2 diabetes mellitus: insulin resistance, beta-cell failure, treatment targets": {
        "mentor_intro": "The management of type 2 diabetes mellitus combines holistic lifestyle intervention with organ-protective pharmacotherapy tailored to patient-specific cardiovascular, renal, and metabolic risk profiles. Modern glycemic targets emphasize individualized HbA1c goals while avoiding hypoglycemia.",
        "teaching_points": [
            "Type 2 diabetes pathogenesis combines progressive pancreatic beta-cell secretory dysfunction with peripheral insulin resistance in skeletal muscle, liver, and adipose tissue; modern glycemic management prioritizes organ-protective agents (SGLT2 inhibitors and GLP-1 receptor agonists) independent of baseline HbA1c in patients with established cardiovascular disease, heart failure, or chronic kidney disease.",
            "Glycemic targets are individualized: standard target HbA1c is <=7.0% (53 mmol/mol) for most non-pregnant adults to prevent microvascular complications, tighter targets (<6.5%) for young patients without cardiovascular disease, and relaxed targets (7.5-8.5%) for frail older adults with limited life expectancy or severe hypoglycemia risk.",
            "Metformin remains the foundational first-line oral antihyperglycemic agent, acting primarily by inhibiting hepatic gluconeogenesis via AMPK activation; it requires dose adjustment when eGFR is 30-45 mL/min/1.73m2 and is contraindicated when eGFR is <30 mL/min/1.73m2 due to lactic acidosis risk.",
            "SGLT2 inhibitors (empagliflozin, dapagliflozin) reduce cardiovascular death, heart failure hospitalizations, and CKD progression, while GLP-1 receptor agonists (semaglutide, dulaglutide) demonstrate robust reductions in atherosclerotic cardiovascular events (MACE) and provide substantial weight reduction."
        ],
        "mcq_angles": [
            "First-line agent selection based on comorbidities: SGLT2 inhibitors preferred in HFrEF/HFpEF and CKD; GLP-1 RAs preferred in established ASCVD and severe obesity.",
            "Metformin renal cutoffs: safe down to eGFR 45; maximum 1000 mg daily for eGFR 30-45; stop when eGFR <30 mL/min/1.73m2.",
            "Hypoglycemia risk profiles: sulfonylureas and insulins carry high hypoglycemia risk; metformin, SGLT2 inhibitors, and GLP-1 RAs carry negligible intrinsic hypoglycemia risk."
        ],
        "case_hooks": [
            "A 58-year-old man with newly diagnosed type 2 diabetes (HbA1c 8.2%), established coronary artery disease, and eGFR 52 mL/min/1.73m2.",
            "An 81-year-old woman with longstanding T2DM, mild cognitive impairment, and recurrent presyncope on gliclazide 160 mg daily with an HbA1c of 6.1%."
        ],
        "uncertainties": [
            "Optimal sequencing of dual SGLT2 inhibitor and GLP-1 receptor agonist combination therapy in early diabetic kidney disease.",
            "Durability of non-insulin glycemic control using dual GIP/GLP-1 receptor co-agonists (tirzepatide) in advanced beta-cell failure."
        ]
    },

    "Urate-lowering therapy: allopurinol, febuxostat, target serum urate, titration": {
        "mentor_intro": "Effective long-term management of gout requires treat-to-target urate-lowering therapy (ULT) to promote monosodium urate crystal dissolution, prevent recurrent acute flares, and resolve tophaceous deposits. Stepwise dose titration and concomitant flare prophylaxis are essential for successful treatment.",
        "teaching_points": [
            "Allopurinol is the preferred first-line urate-lowering therapy for all patients, starting at a low dose (<=100 mg/day, or <=50 mg/day in chronic kidney disease stage 3-5) and titrated upward every 2 to 4 weeks based on serial serum urate measurements to achieve target levels.",
            "Treat-to-target serum urate thresholds are <6.0 mg/dL (<360 umol/L) for all gout patients to prevent crystal formation, and a more stringent target of <5.0 mg/dL (<300 umol/L) for patients with severe tophaceous gout, chronic erosive arthropathy, or frequent flares.",
            "Concomitant anti-inflammatory flare prophylaxis (colchicine 0.5 mg once or twice daily, or low-dose NSAIDs) is strongly recommended when initiating or titrating urate-lowering therapy and should be continued for at least 3 to 6 months to prevent mobilization flares.",
            "Prior to starting allopurinol, HLA-B*58:01 allele screening is recommended in high-risk populations (individuals of Han Chinese, Korean, Thai, or African American descent) due to a dramatically elevated risk of allopurinol hypersensitivity syndrome (DRESS/SJS/TEN); febuxostat serves as an alternative xanthine oxidase inhibitor."
        ],
        "mcq_angles": [
            "Titration in renal impairment: allopurinol can be safely titrated above conventional renal doses (beyond 300 mg daily) with gradual dose escalations and close monitoring.",
            "Pharmacogenetic screening: HLA-B*58:01 screening prevents life-threatening allopurinol-induced severe cutaneous adverse reactions.",
            "Initiation timing during acute gout flare: ULT can be started during an active flare provided effective anti-inflammatory therapy has been initiated."
        ],
        "case_hooks": [
            "A 54-year-old man of Han Chinese descent with recurrent podagra and palpable olecranon tophi, evaluated for urate-lowering therapy initiation.",
            "A 68-year-old man with stage 4 CKD (eGFR 24 mL/min) and chronic tophaceous gout whose serum urate remains 8.8 mg/dL on allopurinol 100 mg daily."
        ],
        "uncertainties": [
            "Cardiovascular safety profile of febuxostat compared to allopurinol in patients with preexisting severe cardiovascular disease (CARES vs FAST trial discrepancies).",
            "Optimal duration of flare prophylaxis following complete clinical dissolution of all palpable tophi."
        ]
    },

    "VTE prophylaxis in mechanically ventilated ICU patients": {
        "mentor_intro": "Critically ill, mechanically ventilated patients are at exceptionally high risk for venous thromboembolism (VTE) due to immobilization, vascular stasis, systemic inflammation, and invasive central venous access. Pharmacological thromboprophylaxis with low-molecular-weight heparin is the standard of care unless contraindicated by active hemorrhage.",
        "teaching_points": [
            "All critically ill mechanically ventilated adults require routine venous thromboembolism (VTE) prophylaxis; low-molecular-weight heparin (enoxaparin 40 mg once daily or dalteparin 5,000 units once daily) is preferred over unfractionated heparin due to superior efficacy in reducing deep vein thrombosis and a lower incidence of heparin-induced thrombocytopenia (HIT).",
            "In patients with severe renal impairment (creatinine clearance <30 mL/min), unfractionated heparin (5,000 units subcutaneously twice or three times daily) or dose-adjusted enoxaparin (20-30 mg once daily with anti-Xa monitoring) is recommended to avoid bioaccumulation and major bleeding.",
            "Mechanical thromboprophylaxis with intermittent pneumatic compression (IPC) devices is recommended in patients with active bleeding, severe thrombocytopenia (platelets <50 x 10^9/L), or high bleeding risk until pharmacological anticoagulation can be safely introduced.",
            "Routine surveillance venous Doppler ultrasonography is not recommended in asymptomatic ICU patients; however, sudden unexplained hypoxemia, tachycardia, right ventricular strain, or acute difficulty weaning from mechanical ventilation mandates urgent evaluation for pulmonary embolism."
        ],
        "mcq_angles": [
            "LMWH versus UFH in critical care: LMWH significantly reduces DVT and pulmonary embolism risk with lower rates of heparin-induced thrombocytopenia (HIT).",
            "Management of active coagulopathy: mechanical prophylaxis (IPC) alone until active hemorrhage resolves, followed by prompt resumption of LMWH.",
            "Renal adjustment rules: enoxaparin accumulates in renal failure; switch to UFH or reduce dose to 30 mg daily with peak anti-Xa level monitoring (target 0.2-0.5 IU/mL)."
        ],
        "case_hooks": [
            "A 62-year-old mechanically ventilated man with severe acute respiratory distress syndrome (ARDS) and septic shock receiving continuous sedation and paralysis.",
            "A 45-year-old polytrauma patient with cerebral contusions, intracranial pressure monitoring, and pelvic fractures evaluated for thromboprophylaxis timing."
        ],
        "uncertainties": [
            "Benefit of weight-adjusted or anti-Xa-guided LMWH dosing versus standard fixed dosing in morbidly obese critically ill patients.",
            "Role of extended post-ICU pharmacological thromboprophylaxis in patients with persistent severe mobility impairment."
        ]
    },

    "Vancomycin therapeutic drug monitoring: AUC-based dosing, nephrotoxicity, trough targets": {
        "mentor_intro": "Vancomycin remains a mainstay glycopeptide antibiotic for serious Methicillin-resistant Staphylococcus aureus (MRSA) infections. Modern therapeutic drug monitoring consensus guidelines recommend area under the curve (AUC)-guided dosing to ensure clinical efficacy while minimizing acute kidney injury.",
        "teaching_points": [
            "Consensus therapeutic drug monitoring guidelines recommend targeting a 24-hour area under the curve to minimum inhibitory concentration ratio (AUC24/MIC) of 400 to 600 mg*h/L (assuming a broth microdilution MIC of 1 mg/L) for serious invasive MRSA infections (bacteremia, infective endocarditis, osteomyelitis, hospital-acquired pneumonia).",
            "AUC-guided dosing using Bayesian software modeling (or two pharmacokinetic concentrations: peak at 1-2 hours post-infusion and trough) is strongly preferred over trough-only monitoring (15-20 ug/mL) because it significantly reduces the incidence of vancomycin-associated acute kidney injury (AKI) without compromising clinical efficacy.",
            "A weight-based loading dose of 25 to 35 mg/kg (based on actual body weight, capped at 3,000 mg) is recommended for critically ill patients with suspected or confirmed serious MRSA infections to rapidly achieve therapeutic target concentrations.",
            "Vancomycin-induced nephrotoxicity (toxic acute tubular necrosis) risk increases substantially when AUC24 exceeds 650 mg*h/L or sustained troughs exceed 20 ug/mL, and is potentiated by concomitant nephrotoxic agents (piperacillin-tazobactam, aminoglycosides, loop diuretics, IV iodinated contrast)."
        ],
        "mcq_angles": [
            "AUC24/MIC target window: 400–600 mg*h/L balances maximal MRSA bactericidal killing against nephrotoxicity risk.",
            "Trough-only monitoring obsolescence: traditional 15–20 ug/mL trough targets cause excess acute kidney injury; AUC-guided dosing is now standard of care.",
            "Nephrotoxic synergy: combining vancomycin with piperacillin-tazobactam dramatically elevates AKI rates compared with vancomycin plus cefepime."
        ],
        "case_hooks": [
            "A 55-year-old woman with MRSA bacteremia and suspected mitral valve endocarditis whose 48-hour vancomycin trough is 24 ug/mL with an acute rise in serum creatinine from 0.8 to 1.6 mg/dL.",
            "A 70-year-old critically ill man weighing 100 kg admitted with septic shock secondary to severe hospital-acquired pneumonia requiring emergency loading dose calculation."
        ],
        "uncertainties": [
            "Optimal AUC monitoring protocols in non-critically ill patients with non-invasive infections (skin and soft tissue infections, uncomplicated urinary tract infections).",
            "Pharmacokinetic performance of Bayesian priors in patients with rapidly fluctuating renal clearance or requiring continuous renal replacement therapy (CRRT)."
        ]
    },

    "Vitamin D deficiency: 25-OHD thresholds, supplementation doses, osteomalacia": {
        "mentor_intro": "Vitamin D is essential for calcium homeostasis, bone mineralization, and neuromuscular function. Assessment utilizes serum 25-hydroxyvitamin D [25(OH)D], with treatment strategies stratified by deficiency severity to heal osteomalacia, prevent rickets, and preserve bone mineral density.",
        "teaching_points": [
            "Serum 25-hydroxyvitamin D [25(OH)D] is the definitive diagnostic marker for evaluating vitamin D status; deficiency is defined as <25-30 nmol/L (<10-12 ng/mL), insufficiency as 30-50 nmol/L (12-20 ng/mL), and sufficiency as >50 nmol/L (>20 ng/mL), with target levels of 75 nmol/L (30 ng/mL) recommended in osteoporosis.",
            "Treatment of symptomatic deficiency or osteomalacia requires high-dose repletion: oral cholecalciferol (vitamin D3) 50,000 IU once weekly (or 300,000 IU total cumulative loading dose divided over 6 to 10 weeks), followed by lifelong daily maintenance dosing of 800 to 2,000 IU daily.",
            "Severe prolonged vitamin D deficiency leads to secondary hyperparathyroidism, hypophosphatemia, elevated alkaline phosphatase, and defective osteoid mineralization, manifesting as osteomalacia in adults (diffuse bone pain, proximal muscle weakness, Waddling gait, pseudo-fractures/Looser zones) and rickets in children.",
            "Cholecalciferol (vitamin D3) is preferred over ergocalciferol (vitamin D2) because it maintains serum 25(OH)D concentrations longer and has greater bioefficacy; active 1,25-dihydroxyvitamin D (calcitriol) is indicated only in severe renal failure or 1-alpha-hydroxylase deficiency, not in nutritional deficiency."
        ],
        "mcq_angles": [
            "Diagnostic biomarker selection: measure 25-hydroxyvitamin D (calcidiol), not 1,25-dihydroxyvitamin D (calcitriol), which is often normal or elevated in nutritional deficiency due to secondary hyperparathyroidism.",
            "Radiographic hallmark of osteomalacia: Looser zones (pseudofractures)—transverse cortical radiolucent bands perpendicular to the bone cortex, classically in the femoral neck, pubic rami, or scapula.",
            "Laboratory pattern in osteomalacia: low or low-normal calcium, low phosphate, elevated parathyroid hormone (PTH), and elevated alkaline phosphatase (ALP)."
        ],
        "case_hooks": [
            "A 68-year-old housebound woman presenting with chronic widespread bone pain, difficulty standing from a chair, a serum 25(OH)D of 16 nmol/L, and elevated alkaline phosphatase.",
            "A 32-year-old woman with celiac disease presenting with bilateral groin pain whose pelvic radiographs demonstrate bilateral femoral neck Looser zones."
        ],
        "uncertainties": [
            "Optimal target 25(OH)D levels for extra-skeletal health benefits (immune modulation, cardiovascular protection, cancer prevention).",
            "Comparative safety and hypercalcemia risk of intermittent high-dose bolus therapy (e.g., annual megadoses) versus daily low-dose maintenance supplementation in fall prevention."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(REMEDIATED_18)} remediated topics.")
    for name, data in REMEDIATED_18.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 18 topics pass 100% of structural and depth criteria!")
