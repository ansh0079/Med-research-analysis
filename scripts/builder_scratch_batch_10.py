# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 10 (Topics 226-250) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_10_TOPICS = {
    "Veno-arterial ECMO: indications, circuit management, weaning": {
        "mentor_intro": (
            "Veno-arterial extracorporeal membrane oxygenation (VA-ECMO) provides temporary biventricular mechanical circulatory support and extracorporeal gas exchange for refractory cardiogenic shock and cardiac arrest (E-CPR). "
            "Deoxygenated blood drained from the right atrium or vena cava is pumped through a membrane oxygenator and returned under arterial pressure into the femoral artery (peripheral) or ascending aorta (central). "
            "Critical circuit management mandates preventing left ventricular (LV) distension/stasis from retrograde arterial afterload, monitoring for differential hypoxemia ('Harlequin syndrome' / North-South syndrome), and deploying structured protocolized weaning."
        ),
        "teaching_points": [
            "Retrograde arterial inflow in peripheral VA-ECMO increases left ventricular afterload, risking LV distension, elevated end-diastolic pressures, pulmonary oedema, and intracardiac thrombus; proactive LV venting/unloading (percutaneous microaxial pump [Impella / ECPELLA], intra-aortic balloon pump [IABP], or atrial septostomy) is frequently necessary.",
            "Differential hypoxemia ('Harlequin syndrome' / North-South syndrome) occurs when recovering native left ventricular ejection of deoxygenated blood from poorly ventilated lungs perfuses the coronary and cerebral circulations while well-oxygenated ECMO blood perfuses the lower body; monitoring right radial arterial blood gas is mandatory.",
            "Distal limb ischemia is a frequent limb-threatening complication of femoral arterial cannulation; an antegrade distal perfusion cannula (6-8 Fr) must be routinely placed in the superficial femoral artery at the time of primary cannulation with continuous NIRS monitoring.",
            "Weaning readiness requires clinical and echocardiographic stability during circuit flow reduction (to 1.0-1.5 L/min): LVEF >=20-25%, aortic velocity-time integral (VTI) >=10-12 cm, lateral mitral annular s' >=6 cm/s, and stable mean arterial pressure with minimal inotropes."
        ],
        "mcq_angles": [
            "Detecting Harlequin syndrome: explaining why right radial arterial blood gas (coronary/cerebral delivery) must be sampled rather than lower extremity lines.",
            "Mandatory placement of an antegrade distal limb perfusion cannula to prevent lower extremity ischemic necrosis in peripheral VA-ECMO.",
            "Echocardiographic criteria confirming weaning readiness: aortic VTI >=10-12 cm and LVEF >20-25% at minimal pump flow."
        ],
        "case_hooks": [
            "A 48-year-old male on peripheral VA-ECMO for acute myocarditis develops pink frothy sputum and complete absence of aortic valve opening on echocardiogram; LV venting with an Impella device (ECPELLA) is planned.",
            "A patient on femoral VA-ECMO has SpO2 99% in the left foot but SpO2 84% on the right index finger with clear native pulse contour; the team manages Harlequin syndrome by adjusting ventilator FiO2 and evaluating V-AV ECMO reconfiguration."
        ],
        "uncertainties": [
            "Routine upfront prophylactic LV unloading versus selective delayed unloading based on hemodynamic and echocardiographic triggers.",
            "Anticoagulation targets and safety of low-dose versus therapeutic unfractionated heparin in reducing circuit thrombosis without provoking major bleeding."
        ]
    },

    "Veno-venous ECMO for respiratory failure: cannulation and monitoring": {
        "mentor_intro": (
            "Veno-venous extracorporeal membrane oxygenation (VV-ECMO) provides life-saving extracorporeal gas exchange (oxygenation and CO2 removal) in patients with severe acute respiratory distress syndrome (ARDS) refractory to optimal mechanical ventilation. "
            "By offloading the lung's metabolic gas exchange burden, VV-ECMO facilitates 'ultra-protective lung ventilation' (tidal volumes <=4 mL/kg predicted body weight, driving pressures <14 cmH2O, and plateau pressures <25 cmH2O), attenuating ventilator-induced lung injury (VILI). "
            "Cannulation strategies utilize two-site configurations (femoro-jugular or femoro-femoral) or single-site bicaval dual-lumen cannulas, with monitoring focused on circuit recirculation, membrane sweep gas titration, and native shunt."
        ),
        "teaching_points": [
            "The landmark EOLIA trial established that early initiation of VV-ECMO in severe ARDS (PaO2/FiO2 <50 mmHg for >3 hours, or <80 mmHg for >6 hours, or pH <7.15 with PaCO2 >=60 mmHg despite prone positioning and neuromuscular blockade) reduces treatment failure and 60-day mortality in secondary analyses.",
            "VV-ECMO enables ultra-protective lung ventilation (target driving pressure <=10-14 cmH2O, Pplat <=24-28 cmH2O, Vt 3-4 mL/kg PBW, respiratory rate 10-15 bpm, PEEP 10-15 cmH2O) to promote lung rest while extracorporeal circuit blood flow dictates oxygenation and sweep gas flow regulates PaCO2 clearance.",
            "Recirculation—the re-aspiration of freshly oxygenated blood from the reinfusion cannula directly back into the drainage cannula without passing through native systemic circulation—reduces effective patient oxygenation, identified by drainage pre-oxygenator saturation (SvO2) approximating post-oxygenator saturation.",
            "Circuit anticoagulation with unfractionated heparin or bivalirudin balances thrombosis prevention with bleeding risks; recent evidence supports low-intensity or even heparin-free VV-ECMO strategies in patients with severe active haemorrhage or trauma."
        ],
        "mcq_angles": [
            "EOLIA trial criteria: identifying severe ARDS arterial blood gas thresholds indicating VV-ECMO cannulation.",
            "Adjusting circuit parameters: increasing ECMO pump blood flow to treat hypoxemia versus increasing sweep gas flow rate to clear hypercapnia.",
            "Identifying and mitigating cannula recirculation (increasing inter-cannula distance on fluoroscopy/echocardiography or optimizing volume)."
        ],
        "case_hooks": [
            "A 36-year-old female with severe influenza ARDS has PaO2/FiO2 of 58 mmHg and respiratory acidosis (pH 7.12, PaCO2 74 mmHg) despite 16 hours of prone positioning and cisatracurium paralysis; VV-ECMO is initiated.",
            "A patient on VV-ECMO has persistent hypoxemia (SpO2 82%) despite 100% circuit FiO2; pre-membrane blood saturation is 88%, confirming high recirculation."
        ],
        "uncertainties": [
            "Comparative clinical benefits of bicaval dual-lumen single cannula (Avalon/Crescent) versus traditional dual-cannula femoro-jugular access.",
            "Optimal timing and safety of early active physical therapy and awake extubation ('awake ECMO') in non-transplant candidate ARDS."
        ]
    },

    "Venous leg ulcers, lymphoedema and lower leg management": {
        "mentor_intro": (
            "Venous leg ulcers (VLUs) represent the most frequent cause of lower extremity chronic ulceration, resulting from chronic venous insufficiency, ambulatory venous hypertension, and microvascular lipodermatosclerosis. "
            "Ulcers classically arise in the 'gaiter region' (between the ankle and mid-calf, especially over the medial malleolus), characterized by shallow irregular borders, heavy fibrinous exudate, surrounding stasis dermatitis, and hemosiderin hyperpigmentation. "
            "Graduated multi-layer compression therapy is the undisputed gold standard of conservative management, provided significant arterial insufficiency is rigorously excluded by measuring the Ankle-Brachial Pressure Index (ABPI >=0.8)."
        ),
        "teaching_points": [
            "Multi-layer compression bandaging providing 40 mmHg of graduated pressure at the ankle is the cornerstone of VLU management, significantly accelerating wound healing and reducing ulcer recurrence compared to non-compression dressings.",
            "Measurement of the Ankle-Brachial Pressure Index (ABPI) is mandatory prior to applying high-compression bandaging; an ABPI <0.8 indicates peripheral arterial disease requiring modified reduced compression, while ABPI <0.5 represents severe ischemia where compression is strictly contraindicated.",
            "Early endovenous ablation of superficial truncal venous reflux (great or small saphenous vein radiofrequency/laser ablation) within 2 weeks of ulcer presentation significantly accelerates ulcer healing and reduces recurrence (landmark EVRA randomized trial).",
            "Lymphoedema management integrates Complete Decongestive Therapy (CDT), encompassing manual lymphatic drainage, skin hygiene, multi-layer bandaging, and daily prescribed exercise to mobilize extracellular fluid."
        ],
        "mcq_angles": [
            "EVRA trial findings: early surgical/endovenous ablation of superficial reflux accelerates ulcer healing compared to delayed intervention.",
            "ABPI safety cutoffs: determining when standard 40 mmHg four-layer compression is safe (>=0.8), requires modification (0.5-0.8), or is contraindicated (<0.5).",
            "Differentiating venous ulcers (medial gaiter region, exudative, irregular, painless/achy) from arterial ulcers (distal toes/calcaneus, punched-out, pale base, severe pain worse with elevation)."
        ],
        "case_hooks": [
            "A 64-year-old woman presents with an 8-month history of a shallow, weeping 4x3 cm ulcer above the medial malleolus with surrounding hyperpigmentation; ABPI is 1.05.",
            "A patient with chronic bilateral lower leg swelling and woody induration ('inverted champagne bottle' leg) presents with recurrent cellulitis and chronic skin weeping."
        ],
        "uncertainties": [
            "Role of advanced cellular and tissue-engineered skin substitutes in venous ulcers failing 4-12 weeks of standard four-layer compression.",
            "Comparative long-term recurrence rates between oral pentoxifylline or micronized purified flavonoid fractions (MPFF) as systemic adjuncts to compression."
        ]
    },

    "Venous thromboembolism and anticoagulation management": {
        "mentor_intro": (
            "Venous thromboembolism (VTE)—encompassing deep vein thrombosis (DVT) and pulmonary embolism (PE)—is the third most frequent acute cardiovascular syndrome globally. "
            "Anticoagulation is the primary medical treatment, preventing thrombus propagation, early fatal embolization, and chronic post-thrombotic syndrome or chronic thromboembolic pulmonary hypertension (CTEPH). "
            "Management requires risk stratification (provoked by transient major surgery/trauma vs unprovoked), selection between direct oral anticoagulants (DOACs) and low-molecular-weight heparin (LMWH), and determining optimal anticoagulation duration (3 months vs extended/lifelong)."
        ),
        "teaching_points": [
            "Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) are the preferred first-line anticoagulants over vitamin K antagonists (warfarin) for acute VTE in the general population, providing equal efficacy with a ~50% reduction in major intracranial haemorrhage.",
            "VTE provoked by a major transient risk factor (e.g., major surgery with general anaesthesia >30 min, fracture, bed confinement >=3 days) requires 3 months of therapeutic anticoagulation, after which anticoagulation should be discontinued due to low recurrence risk (<1-3%/year).",
            "Unprovoked VTE (or persistent risk factor) carries a high annual recurrence rate (~8-10% in year 1; ~30-40% at 5 years) upon stopping therapy; extended anticoagulation is recommended unless bleeding risk is high, with reduced-dose DOAC options (apixaban 2.5 mg bid or rivaroxaban 10 mg daily) after 6 months (AMPLIFY-EXT, EINSTEIN-CHOICE).",
            "Antiphospholipid antibody syndrome (APS, especially triple-positive: lupus anticoagulant, anti-cardiolipin, anti-beta-2-glycoprotein I) requires adjusted-dose warfarin (target INR 2.0-3.0); DOACs are strictly contraindicated in triple-positive APS due to increased arterial thrombosis and stroke (TRAPS trial)."
        ],
        "mcq_angles": [
            "TRAPS trial outcomes: why DOACs are contraindicated in triple-positive antiphospholipid syndrome and warfarin remains mandatory.",
            "Duration of anticoagulation: distinguishing provoked transient VTE (stop at 3 months) from unprovoked VTE (indefinite/extended therapy).",
            "Reduced-dose DOAC maintenance for extended secondary prevention: apixaban 2.5 mg BID and rivaroxaban 10 mg OD."
        ],
        "case_hooks": [
            "A 42-year-old male sustains an unprovoked proximal DVT; after completing 6 months of apixaban 5 mg bid without bleeding, the physician discusses extended secondary prophylaxis with apixaban 2.5 mg bid.",
            "A 34-year-old woman with recurrent DVT tests strongly positive for lupus anticoagulant, high-titer anti-cardiolipin IgG, and anti-beta-2-GPI IgG; the haematologist transitions her from rivaroxaban to warfarin."
        ],
        "uncertainties": [
            "Clinical utility of serial D-dimer testing (HERDOO2 rule) to guide safe discontinuation of anticoagulation in women with first unprovoked VTE.",
            "Safety and optimal dosing of DOACs in severe renal impairment (eGFR 15-29 mL/min) and dialysis-dependent end-stage renal disease."
        ]
    },

    "Venous thromboembolism anticoagulation": {
        "mentor_intro": (
            "Anticoagulation is the cornerstone of therapy for acute venous thromboembolism, interrupting the coagulation cascade to halt thrombus accretion while endogenous fibrinolysis resorbs the clot. "
            "Treatment phases comprise acute phase (days 0-21: intensified dosing or parenteral lead-in), maintenance phase (up to 3-6 months), and extended phase (secondary prevention beyond 6 months). "
            "Regimen choice is dictated by clinical scenario: apixaban and rivaroxaban offer single-drug oral regimens with upfront loading; dabigatran and edoxaban require a mandatory 5-day parenteral lead-in (LMWH); while LMWH monotherapy remains favored in severe liver disease or mechanical valves."
        ),
        "teaching_points": [
            "Apixaban (10 mg orally twice daily for 7 days, then 5 mg twice daily) and rivaroxaban (15 mg orally twice daily with food for 21 days, then 20 mg once daily) provide immediate oral anticoagulation without requiring initial parenteral heparin bridging.",
            "Dabigatran (150 mg twice daily) and edoxaban (60 mg once daily) require a minimum 5-day lead-in of therapeutic parenteral anticoagulation (e.g., enoxaparin 1 mg/kg bid) before transitioning to the oral agent.",
            "In patients with severe renal impairment (eGFR <15-30 mL/min) or advanced liver cirrhosis with coagulopathy, unfractionated heparin (titrated by aPTT or anti-Xa) or dose-adjusted warfarin remains the standard, while DOACs are avoided.",
            "Specific reversal agents are indicated for life-threatening bleeding or emergency surgery: idarucizumab (5 g IV) for dabigatran, and andexanet alfa or 4-factor prothrombin complex concentrate (4F-PCC) for factor Xa inhibitors (apixaban, rivaroxaban, edoxaban)."
        ],
        "mcq_angles": [
            "Dosing requirements of DOACs: identifying which agents require a 5-day parenteral lead-in (edoxaban, dabigatran) versus single-drug oral loading (apixaban, rivaroxaban).",
            "Emergency reversal of direct factor Xa inhibitors: utilizing 4-factor prothrombin complex concentrates (4F-PCC) or andexanet alfa in life-threatening bleeding.",
            "Monitoring and management of therapeutic enoxaparin in severe renal failure (accumulation risk; using anti-Xa monitoring or unfractionated heparin)."
        ],
        "case_hooks": [
            "A 55-year-old man is diagnosed with acute PE; the resident prescribes edoxaban 60 mg daily but forgets the mandatory 5-day LMWH parenteral lead-in; the pharmacist intervenes.",
            "A patient taking rivaroxaban 20 mg daily presents following a motor vehicle collision with an acute subdural haematoma; the neurosurgeon requests immediate 4F-PCC reversal."
        ],
        "uncertainties": [
            "Management of isolated subsegmental pulmonary embolism (SSPE) in low-risk ambulatory outpatients: active anticoagulation versus clinical surveillance with serial bilateral leg ultrasound.",
            "Role of direct oral factor XIa inhibitors (milvexian, asundexian) in dissociating antithrombotic efficacy from bleeding risk in secondary VTE prevention."
        ]
    },

    "Venous thromboembolism direct oral anticoagulant therapy": {
        "mentor_intro": (
            "Direct oral anticoagulants (DOACs)—encompassing direct thrombin inhibitors (dabigatran) and direct factor Xa inhibitors (apixaban, rivaroxaban, edoxaban)—have supplanted vitamin K antagonists as the standard of care for acute venous thromboembolism. "
            "DOACs provide predictable pharmacokinetics, rapid onset, fixed dosing, and lack of routine laboratory coagulation monitoring, alongside significantly lower rates of life-threatening intracranial and fatal bleeding. "
            "Clinical mastery requires understanding drug-drug interactions (P-gp and strong CYP3A4 inhibitors/inducers), gastrointestinal bleeding profiles in cancer-associated thrombosis, and renal clearance fractions (dabigatran 80%, edoxaban 50%, rivaroxaban 33%, apixaban 27%)."
        ),
        "teaching_points": [
            "The renal clearance fractions of DOACs vary markedly: dabigatran has the highest renal dependence (80%), edoxaban (50%), rivaroxaban (33%), and apixaban has the lowest (27%), making apixaban the preferred DOAC in moderate-to-severe renal impairment.",
            "In cancer-associated thrombosis (CAT), randomized trials (Hokusai-VTE Cancer, SELECT-D, CARAVAGGIO) demonstrated that DOACs are non-inferior to LMWH in preventing recurrent VTE; however, rivaroxaban and edoxaban carry increased risk of major gastrointestinal bleeding in patients with unresected luminal GI malignancies, where apixaban or LMWH is preferred.",
            "Co-administration of DOACs with strong dual inducers of P-glycoprotein and CYP3A4 (e.g., rifampicin, carbamazepine, phenytoin, St. John's wort) significantly reduces DOAC plasma concentrations and is contraindicated due to elevated thromboembolic failure risk.",
            "In pregnancy and lactation, all DOACs are strictly contraindicated because they cross the placenta and pass into breast milk, conferring teratogenic and fetal bleeding risks; low-molecular-weight heparin (LMWH) is the drug of choice throughout pregnancy and the postpartum period."
        ],
        "mcq_angles": [
            "Comparing renal elimination of DOACs: recognizing dabigatran's 80% renal excretion making it most hazardous in acute kidney injury.",
            "DOAC contraindication in pregnancy and lactation: managing acute DVT in pregnancy exclusively with weight-adjusted LMWH.",
            "Selecting anticoagulation for cancer-associated thrombosis with active gastric or oesophageal adenocarcinoma (LMWH preferred over edoxaban/rivaroxaban due to luminal mucosal bleeding risk)."
        ],
        "case_hooks": [
            "A 66-year-old male with an unresected gastroesophageal junction adenocarcinoma develops acute DVT; the oncologist evaluates whether to start LMWH versus apixaban versus rivaroxaban.",
            "A 28-year-old female at 14 weeks gestation presents with acute left femoral DVT; the emergency doctor considers anticoagulation choices, ruling out DOACs and warfarin."
        ],
        "uncertainties": [
            "Safety and efficacy of DOACs in extreme obesity (body weight >120 kg or BMI >40 kg/m2) and following malabsorptive bariatric surgery.",
            "Utility of measuring drug-specific anti-Xa levels for DOACs in acute critical illness, extreme body weight, or suspected malabsorption."
        ]
    },

    "Venous thromboembolism prophylaxis in the ICU": {
        "mentor_intro": (
            "Critically ill intensive care unit (ICU) patients are at exceptionally high risk for hospital-acquired venous thromboembolism (exceeding 20-30% without thromboprophylaxis) due to immobilization, vascular cannulation, systemic inflammation, sepsis, and organ failure. "
            "Paradoxically, these patients simultaneously harbor high risks of severe gastrointestinal, procedural, and surgical bleeding, necessitating dynamic daily balancing of thrombotic versus haemorrhagic risk. "
            "Pharmacological thromboprophylaxis with low-molecular-weight heparin (LMWH) is superior to unfractionated heparin (UFH) in reducing pulmonary embolism, supplemented by pneumatic compression devices when pharmacological agents are temporarily contraindicated."
        ),
        "teaching_points": [
            "Low-molecular-weight heparin (LMWH, e.g., enoxaparin 40 mg subcutaneously daily, or 30 mg bid in trauma) is preferred over unfractionated heparin (UFH 5000 units bid or tid) for ICU thromboprophylaxis, delivering significant reductions in pulmonary embolism and heparin-induced thrombocytopenia (PROTECT trial).",
            "In patients with severe renal impairment (creatinine clearance <30 mL/min), unfractionated heparin (5000 units SC twice daily) or dose-adjusted enoxaparin (20 mg SC daily with peak anti-Xa monitoring 0.2-0.4 IU/mL) prevents progressive enoxaparin bioaccumulation and major bleeding.",
            "Mechanical thromboprophylaxis using graduated compression stockings or intermittent pneumatic compression (IPC) devices is indicated in ICU patients with active bleeding, high bleeding risk, or severe thrombocytopenia (platelets <50 x 10^9/L), with pharmacologic prophylaxis added as soon as bleeding risk abates.",
            "In critically ill patients with morbid obesity (BMI >=40 kg/m2), standard-dose enoxaparin results in subtherapeutic anti-Xa levels; high-risk weight-adjusted prophylaxis (e.g., enoxaparin 40 mg SC twice daily or 0.5 mg/kg daily) is recommended."
        ],
        "mcq_angles": [
            "PROTECT trial findings: LMWH vs UFH in the ICU (LMWH significantly reduces pulmonary embolism and HIT with similar major bleeding).",
            "Managing thromboprophylaxis in severe renal impairment (CrCl <30 mL/min): switching to UFH 5000 units SC q12h or dose-reduced enoxaparin with anti-Xa monitoring.",
            "Dosing enoxaparin in morbidly obese ICU patients (BMI >=40 kg/m2): escalating to 40 mg BID or 60 mg daily to achieve protective anti-Xa levels."
        ],
        "case_hooks": [
            "A 68-year-old male with septic shock and acute tubular necrosis (eGFR 14 mL/min) requires VTE prophylaxis; the intensivist chooses between UFH 5000 units SC q12h and enoxaparin.",
            "A polytrauma patient with intracranial contusions and an external ventricular drain has pharmacologic anticoagulation held; intermittent pneumatic compression boots are applied."
        ],
        "uncertainties": [
            "Clinical utility and target ranges for routine therapeutic anti-Xa peak monitoring for LMWH prophylaxis in critically ill septic patients with capillary leak and edema.",
            "Optimal timing for safely restarting pharmacologic thromboprophylaxis following severe traumatic brain injury with intracranial hematomas."
        ]
    },

    "Ventilator weaning and spontaneous breathing trials": {
        "mentor_intro": (
            "Weaning from invasive mechanical ventilation represents the structured process of transitioning patients to unassisted spontaneous breathing, accounting for up to 40-50% of total ventilator duration. "
            "Both premature extubation (leading to emergent re-intubation, aspiration, and increased mortality) and delayed extubation (causing ventilator-associated pneumonia, airway trauma, and muscle atrophy) carry substantial clinical hazards. "
            "Weaning requires daily protocolized screening for readiness, coupled with a spontaneous breathing trial (SBT) using pressure support ventilation or T-piece, and objective assessment of airway patency and protection before extubation."
        ),
        "teaching_points": [
            "Daily readiness testing for spontaneous breathing trials (SBT) requires: resolution/improvement of primary respiratory failure, adequate oxygenation (PaO2/FiO2 >=150-200 with PEEP <=5-8 cmH2O and FiO2 <=0.4-0.5), hemodynamic stability without high-dose vasopressors, and spontaneous respiratory drive with adequate conscious level.",
            "A Spontaneous Breathing Trial (SBT) performed using low-level pressure support (PSV 5-8 cmH2O with PEEP 0-5 cmH2O) for 30 minutes results in higher extubation success and lower post-extubation reintubation rates compared to T-piece trials in modern randomized clinical trials.",
            "The Rapid Shallow Breathing Index (RSBI = Respiratory Rate [bpm] / Tidal Volume [L]) measured during unassisted breathing predicts weaning success; an RSBI <105 breaths/min/L strongly predicts successful extubation, whereas RSBI >105 predicts weaning failure.",
            "Prior to extubation, patients must demonstrate adequate cough strength, minimal secretions, and a positive endotracheal tube 'cuff leak test' (verifying peritubal air leak when the cuff is deflated to exclude life-threatening post-extubation laryngeal stridor/edema)."
        ],
        "mcq_angles": [
            "Calculating the Rapid Shallow Breathing Index (RSBI = RR / Vt in liters) and applying the <105 threshold for extubation readiness.",
            "Comparing SBT techniques: pressure support (5-8 cmH2O) yielding higher extubation success than T-piece trials.",
            "Evaluating a negative cuff leak test: administering systemic IV corticosteroids (e.g., methylprednisolone 20 mg q4h for 4 doses) prior to planned extubation."
        ],
        "case_hooks": [
            "A 62-year-old male ventilated for 5 days for pneumonia meets readiness criteria; during a 30-minute PSV SBT, his RR is 18 bpm and Vt is 450 mL (RSBI = 18 / 0.45 = 40), predicting extubation success.",
            "A 45-year-old female intubated for 7 days has zero audible cuff leak upon endotracheal tube cuff deflation; the team plans IV steroid administration and repeat assessment."
        ],
        "uncertainties": [
            "Predictive accuracy of point-of-care diaphragmatic ultrasound (diaphragmatic excursion and thickening fraction) over traditional clinical weaning indices.",
            "Prophylactic high-flow nasal cannula (HFNC) versus non-invasive ventilation (NIV) immediately post-extubation in patients at high risk of extubation failure."
        ]
    },

    "Ventilator-associated pneumonia: bundle prevention, diagnosis, empiric treatment": {
        "mentor_intro": (
            "Ventilator-associated pneumonia (VAP) is a nosocomial lower respiratory tract infection arising >48 hours after endotracheal intubation and mechanical ventilation. "
            "VAP is associated with significant attributable mortality, prolonged mechanical ventilation, and substantial ICU costs, driven by microaspiration of contaminated oropharyngeal secretions and pathogen colonization of endotracheal tube biofilms. "
            "Management hinges on an evidence-based prevention bundle, objective diagnostic sampling (bronchoalveolar lavage [BAL] or quantitative endotracheal aspirate), and timely risk-stratified empirical antimicrobial therapy."
        ),
        "teaching_points": [
            "The VAP prevention bundle includes: maintaining the head of the bed elevated at 30-45 degrees (semi-recumbent position), daily sedation interruption and spontaneous breathing trials, maintaining endotracheal cuff pressure at 20-30 cmH2O, subglottic secretion drainage endotracheal tubes, and early mobilization.",
            "Diagnostic confirmation requires new or progressive pulmonary infiltrates on chest imaging paired with >=2 clinical features (fever >38 C or hypothermia <36 C, leukocytosis or leukopenia, purulent tracheal secretions) and quantitative microbiological cultures (BAL >=10^4 CFU/mL or endotracheal aspirate >=10^6 CFU/mL).",
            "Empirical antimicrobial coverage must be guided by local ICU antibiograms; patients with risk factors for multidrug-resistant (MDR) pathogens (prior IV antibiotics within 90 days, septic shock, ARDS preceding VAP, >=5 days hospitalization) require dual antipseudomonal coverage plus an agent active against MRSA (vancomycin or linezolid).",
            "A short 7-day course of appropriate antibiotic therapy is as effective as a 14-day course for VAP, achieving equivalent cure rates and mortality with significantly fewer antibiotic-related complications and less antimicrobial resistance."
        ],
        "mcq_angles": [
            "Components of the evidence-based VAP prevention bundle: semi-recumbent positioning (30-45 degrees), subglottic suctioning, and daily sedation vacations.",
            "Quantitative microbiological thresholds for diagnosing VAP (BAL >=10^4 CFU/mL vs endotracheal aspirate >=10^6 CFU/mL).",
            "Optimal treatment duration: 7-day short-course therapy is non-inferior to 14-day therapy for uncomplicated VAP."
        ],
        "case_hooks": [
            "A 56-year-old intubated male on day 6 develops new fevers (38.8 C), purulent tracheal aspirate, and new right lower lobe consolidation on CXR; quantitative BAL yields 10^5 CFU/mL Pseudomonas aeruginosa.",
            "An intensivist reviews the clinical response of a patient treated with meropenem for VAP on day 7; the patient is afebrile with normalized procalcitonin, and antibiotics are stopped."
        ],
        "uncertainties": [
            "Utility of adjunctive inhaled (nebulized) aminoglycosides or colistin in addition to systemic IV antibiotics for difficult-to-treat resistant Gram-negative VAP.",
            "Role of routine chlorhexidine oral care in mechanically ventilated patients, given meta-analyses suggesting potential adverse mortality signals in non-cardiac ICU cohorts."
        ]
    },

    "Ventilator-induced lung injury: volutrauma, barotrauma, atelectrauma": {
        "mentor_intro": (
            "Ventilator-induced lung injury (VILI) describes iatrogenic parenchymal lung injury and systemic inflammatory cascade provoked by mechanical ventilation in vulnerable lungs. "
            "The classical pathophysiological mechanisms comprise volutrauma (alveolar overdistension from excessive tidal volumes), barotrauma (gross air leaks—pneumothorax, pneumomediastinum—from high transpulmonary pressures), atelectrauma (shear stress from cyclic opening and collapse of unstable alveoli), and biotrauma (translocation of inflammatory cytokines into the systemic circulation). "
            "Lung-protective ventilation—pioneered by the landmark ARDS Network ARMA trial—remains the foundation of modern critical care."
        ),
        "teaching_points": [
            "The ARMA trial established that lung-protective ventilation using low tidal volumes (6 mL/kg of predicted body weight [PBW], NOT actual body weight) and plateau pressure limit <=30 cmH2O reduces mortality in ARDS from 40% to 31% compared to traditional 12 mL/kg volumes.",
            "Driving pressure (Delta P = Plateau Pressure - PEEP, reflecting the ratio of tidal volume to respiratory system compliance: Vt / Crs) is the strongest physiological variable correlated with survival in ARDS; targeting driving pressure <=14-15 cmH2O significantly reduces VILI.",
            "Mechanical power (the energy delivered to the respiratory system per minute, determined by tidal volume, driving pressure, flow rate, and respiratory rate) integrates all physical variables of VILI; mechanical power >12-17 J/min is associated with ventilator-induced damage.",
            "Prone positioning for >=16 hours daily in moderate-to-severe ARDS (PaO2/FiO2 <150 mmHg) improves survival (PROSEVA trial) by homogenizing pleural pressure gradients, reducing alveolar shear stress, and unloading the right ventricle."
        ],
        "mcq_angles": [
            "ARMA trial landmark principles: calculating tidal volumes based on PREDICTED body weight (PBW, using height and sex) rather than actual measured body weight.",
            "Calculating driving pressure (Plateau pressure minus PEEP) and understanding its target threshold (<=14 cmH2O).",
            "PROSEVA trial criteria for prone positioning in severe ARDS: PaO2/FiO2 <150 mmHg, PEEP >=10 cmH2O, FiO2 >=0.6, maintained for >=16 consecutive hours."
        ],
        "case_hooks": [
            "A 180 cm male weighing 120 kg (predicted body weight 75 kg) is admitted with ARDS; the resident calculates initial tidal volume at 6 mL/kg PBW (450 mL), preventing catastrophic volutrauma.",
            "A ventilated ARDS patient has a plateau pressure of 28 cmH2O and PEEP of 16 cmH2O (driving pressure = 12 cmH2O); the team evaluates whether lung-protective thresholds are met."
        ],
        "uncertainties": [
            "Efficacy and clinical utility of titration of positive end-expiratory pressure (PEEP) guided by esophageal balloon transpulmonary pressure monitoring (EPVent-2 trial).",
            "Individualized mechanical power limits across different patient age groups and baseline lung compliance."
        ]
    },

    "Ventricular tachycardia catheter ablation": {
        "mentor_intro": (
            "Ventricular tachycardia (VT) in structural heart disease—most commonly ischemic cardiomyopathy post-myocardial infarction or non-ischemic dilated cardiomyopathy—is predominantly driven by scar-related macro-reentry. "
            "Implantable cardioverter-defibrillators (ICDs) prevent sudden cardiac death through antitachycardia pacing (ATP) or shock delivery, but recurrent ICD shocks cause severe psychological distress, myocardial injury, and increased mortality. "
            "Catheter ablation—utilizing 3D electroanatomic mapping to identify scar borders, low-voltage areas, and critical diastolic isthmus channels—significantly reduces recurrent VT episodes, ICD shocks, and hospitalizations."
        ),
        "teaching_points": [
            "In patients with ischemic cardiomyopathy and an ICD who experience recurrent VT despite antiarrhythmic drugs (or antiarrhythmic drug intolerance), catheter ablation significantly reduces recurrent VT shocks, storm, and cardiovascular hospitalizations (VANISH trial).",
            "Substrate-based catheter ablation targets electrophysiological properties of the scar during stable sinus rhythm (late potentials, local abnormal ventricular activities [LAVA], and pace-mapping of conducting channels), eliminating the need for prolonged hemodynamic instability from induced VT mapping.",
            "Non-ischemic cardiomyopathy VT substrates frequently reside in the mid-myocardial or epicardial layers, frequently requiring combined endocardial and percutaneous subxiphoid epicardial mapping and ablation approaches.",
            "Preemptive mechanical circulatory support (e.g., Impella percutaneous LV assist device) during catheter ablation allows mapping of hemodynamically unstable VT circuits and reduces procedural decompensation and 30-day mortality in high-risk patients."
        ],
        "mcq_angles": [
            "VANISH trial landmark outcomes: superiority of VT catheter ablation over escalated antiarrhythmic drug therapy (amiodarone/mexiletine) in ischemic cardiomyopathy with recurrent ICD shocks.",
            "Substrate mapping techniques: identifying late potentials and LAVA in dense scar tissue without inducing sustained unstable VT.",
            "Indications for epicardial subxiphoid access in non-ischemic dilated cardiomyopathy and arrhythmogenic right ventricular cardiomyopathy (ARVC)."
        ],
        "case_hooks": [
            "A 66-year-old male with prior anterior MI and an ICD experiences three appropriate shocks in 24 hours for sustained monomorphic VT despite amiodarone therapy; he is transferred for emergent catheter ablation.",
            "An electrophysiologist maps a post-infarct VT circuit; 3D voltage mapping reveals an extensive basal inferior scar with isolated diastolic potentials that match the clinical VT morphology during pace mapping."
        ],
        "uncertainties": [
            "First-line early VT ablation at the time of initial ICD implantation versus waiting for first shock recurrence (PARTITA and PAUSE-SCD trials).",
            "Role of stereotactic body radiation therapy (SBRT / cardiac radioablation) in treating refractory VT circuits inaccessible to catheter ablation."
        ]
    },

    "Vericiguat in worsening heart failure": {
        "mentor_intro": (
            "In heart failure with reduced ejection fraction (HFrEF), endothelial dysfunction, chronic inflammation, and oxidative stress impair endogenous nitric oxide (NO) bioavailability, downregulating soluble guanylate cyclase (sGC) and cyclic GMP synthesis. "
            "This deficiency accelerates myocardial stiffness, cardiomyocyte hypertrophy, interstitial fibrosis, and vascular remodeling. "
            "Vericiguat is an oral, direct stimulator of soluble guanylate cyclase that directly enhances cGMP production independently of endogenous NO and sensitizes sGC to available NO, reducing adverse remodeling."
        ),
        "teaching_points": [
            "The landmark VICTORIA trial established that in high-risk patients with worsening HFrEF (LVEF <45%, recent HF hospitalization or requirement for IV diuretics, and elevated natriuretic peptides), vericiguat added to baseline GDMT significantly reduced the composite of cardiovascular death or HF hospitalization (35.5% vs 38.5%, p = 0.02).",
            "Vericiguat acts via a novel mechanism independent of the neurohormonal system, binding directly to soluble guanylate cyclase (sGC) to stimulate cGMP synthesis without causing clinically significant renal impairment or hyperkalaemia.",
            "Initiation begins at an oral dose of 2.5 mg once daily with food, titrated every 2 weeks to 5 mg once daily and to the target maintenance dose of 10 mg once daily, monitored for symptomatic hypotension and anaemia.",
            "Vericiguat is specifically indicated for 'worsening heart failure'—patients recently stabilized following a decompensation event—functioning as a valuable add-on agent when standard GDMT (quadruple therapy) has been established."
        ],
        "mcq_angles": [
            "VICTORIA trial patient population: patients with worsening HFrEF recently hospitalized or requiring outpatient IV diuretics with elevated BNP/NT-proBNP.",
            "Mechanism of action of vericiguat: direct stimulation of soluble guanylate cyclase (sGC) augmenting cGMP, distinct from PDE-5 inhibitors.",
            "Lack of electrolyte and renal hemodynamic contraindications: vericiguat does not provoke hyperkalaemia or decline in eGFR, making it uniquely safe in borderline renal disease."
        ],
        "case_hooks": [
            "A 68-year-old male with ischemic cardiomyopathy (LVEF 28%) is hospitalized for decompensated heart failure; he is already on target doses of sacubitril-valsartan, carvedilol, dapagliflozin, and spironolactone; vericiguat 2.5 mg daily is initiated at discharge.",
            "A patient with HFrEF taking vericiguat undergoes dose titration from 5 mg to 10 mg daily; routine labs show stable serum potassium (4.4 mmol/L) and creatinine (105 umol/L)."
        ],
        "uncertainties": [
            "Clinical efficacy of vericiguat in heart failure with preserved ejection fraction (HFpEF) in the ongoing VITALITY-HFpEF and CAPACITY trials.",
            "Direct comparison of vericiguat add-on therapy versus early optimization of foundational quadruple GDMT in real-world registries."
        ]
    },

    "Vestibular Schwannoma: surveillance vs radiation vs surgery, neurofibromatosis 2": {
        "mentor_intro": (
            "Vestibular schwannoma (acoustic neuroma) is a benign, slow-growing neoplasm arising from the Schwann cell sheath of the superior or inferior vestibular branch of the eighth cranial nerve (CN VIII) within the internal auditory canal (IAC) and cerebellopontine angle (CPA). "
            "Sporadic tumours are typically unilateral and present in the fifth to sixth decades, whereas bilateral vestibular schwannomas are pathognomonic for Neurofibromatosis Type 2 (NF2-related schwannomatosis, caused by NF2 tumour suppressor gene mutations on chromosome 22q12). "
            "Management decisions—surveillance ('wait-and-scan'), stereotactic radiosurgery (SRS), or microsurgical resection—depend on tumour size (Koos classification), hearing status, brainstem compression, and patient age."
        ),
        "teaching_points": [
            "The classic triad of symptoms includes progressive unilateral sensorineural hearing loss, asymmetrical tinnitus, and unsteadiness; high-resolution contrast-enhanced brain MRI (T1 with gadolinium through the posterior fossa and thin-slice CISS/FIESTA) is the gold standard diagnostic imaging.",
            "Initial observation with serial MRI ('wait-and-scan' protocol every 6-12 months) is the preferred primary strategy for small, intracanalicular tumours (<1.5 cm) or asymptomatic lesions in older adults, as up to 50% demonstrate no measurable growth over several years.",
            "Stereotactic radiosurgery (SRS, e.g., Gamma Knife, single fraction <=12-13 Gy to margin) provides excellent long-term local tumour control (>90-95%) with low facial nerve injury risk (<1%) for small-to-medium tumours (<2.5-3.0 cm) without significant brainstem compression.",
            "Microsurgical resection (translabyrinthine, retrosigmoid, or middle cranial fossa approach) is indicated for large tumours (Koos Grade IV, >3 cm) causing brainstem displacement, progressive obstructive hydrocephalus, or intractable trigeminal neuropathy.",
            "In Neurofibromatosis Type 2 (NF2), bilateral vestibular schwannomas cause inevitable bilateral profound deafness; bevacizumab (anti-VEGF monoclonal antibody) is an evidence-based medical therapy that halts tumour progression and preserves or improves hearing in up to 40-50% of NF2 patients."
        ],
        "mcq_angles": [
            "Pathognomonic criterion for Neurofibromatosis Type 2 (NF2): bilateral vestibular schwannomas on neuroimaging.",
            "Comparing surgical approaches: translabyrinthine approach guarantees complete hearing sacrifice but minimizes brain retraction; retrosigmoid allows potential hearing preservation.",
            "Role of bevacizumab in NF2: medical management to reduce tumour volume and preserve hearing without surgery."
        ],
        "case_hooks": [
            "A 52-year-old male presents with gradual hearing loss in his left ear and difficulty understanding telephone speech; audiogram shows high-frequency asymmetric sensorineural loss; MRI demonstrates an 8 mm left intracanalicular mass.",
            "A 21-year-old woman with known NF2 presents with bilateral vestibular schwannomas (1.8 cm right, 2.2 cm left); she has rapidly deteriorating speech discrimination in her remaining functional ear; bevacizumab therapy is initiated."
        ],
        "uncertainties": [
            "Long-term risk of secondary radiation-induced malignant transformation (malignant peripheral nerve sheath tumour) following stereotactic radiosurgery in young patients and NF2 patients.",
            "Optimal timing of auditory brainstem implant (ABI) versus cochlear implant (CI) in NF2 patients undergoing vestibular schwannoma removal."
        ]
    },

    "Viral encephalitis diagnostic and empiric acyclovir strategy": {
        "mentor_intro": (
            "Viral encephalitis is a medical and neurological emergency characterized by acute inflammation of the brain parenchyma, manifesting as altered mental status, fever, seizures, and focal neurological deficits. "
            "Herpes simplex virus type 1 (HSV-1) is the most frequent and devastating cause of sporadic viral encephalitis in adults, carrying an untreated mortality of >70% with devastating permanent neurocognitive sequelae. "
            "Immediate empirical intravenous acyclovir must be instituted upon the earliest clinical suspicion without waiting for lumbar puncture results or neuroimaging, as treatment delay directly correlates with fatal outcomes and catastrophic permanent brain necrosis."
        ),
        "teaching_points": [
            "Empirical intravenous acyclovir (10 mg/kg IV every 8 hours, adjusted for renal function) must be administered IMMEDIATELY to any patient presenting with acute encephalopathy and fever, prior to or concurrently with diagnostic lumbar puncture and brain MRI.",
            "CSF analysis classically reveals lymphocytic pleocytosis (50-500 WBC/uL), elevated protein (0.6-1.5 g/L), normal glucose (CSF-to-serum ratio >0.5), and frequently elevated red blood cells reflecting necrotizing haemorrhagic encephalitis.",
            "CSF HSV-1 polymerase chain reaction (PCR) is the gold standard diagnostic test (>95% sensitivity and specificity); however, testing performed within the first 24-48 hours can yield false-negative results; if clinical suspicion remains high, acyclovir must be continued and CSF PCR repeated at 3 to 7 days.",
            "Brain MRI is the neuroimaging modality of choice, characteristically demonstrating hyperintensity on T2-weighted and FLAIR sequences with restricted diffusion restricted to the temporal lobes, insular cortex, and inferior frontal lobes (frequently asymmetric).",
            "Intravenous acyclovir therapy for confirmed HSV encephalitis must be continued for a full 14 to 21 days; acyclovir can precipitate crystal nephropathy and acute tubular obstruction, requiring adequate pre-hydration and renal function monitoring."
        ],
        "mcq_angles": [
            "Emergency management priority: starting empiric IV acyclovir immediately upon presentation before neuroimaging or LP.",
            "Characteristic brain MRI distribution of HSV-1 encephalitis: bilateral asymmetric temporal and frontobasal cortical T2/FLAIR hyperintensity.",
            "Handling early negative CSF HSV PCR: recognizing false-negative results in the first 24-48 hours and continuing acyclovir with repeat LP in 3-7 days."
        ],
        "case_hooks": [
            "A 46-year-old male is brought to the ED with acute confusion, fever of 38.9 C, aphasia, and a focal motor seizure; non-contrast head CT is unremarkable; the physician immediately begins IV acyclovir 10 mg/kg.",
            "A patient with confirmed HSV-1 encephalitis receives IV acyclovir; on day 4, serum creatinine rises from 85 to 210 umol/L; urine microscopy shows needle-shaped birefrigent acyclovir crystals."
        ],
        "uncertainties": [
            "Role of adjunctive systemic corticosteroids (e.g., dexamethasone) alongside acyclovir in reducing cerebral edema and long-term neurocognitive impairment.",
            "Diagnostic yield and turnaround impact of metagenomic next-generation sequencing (mNGS) in suspected infectious encephalitis with negative standard viral PCR panels."
        ]
    },

    "Viral haemorrhagic fevers and high-consequence infectious diseases in the ICU": {
        "mentor_intro": (
            "Viral haemorrhagic fevers (VHFs)—encompassing Filoviruses (Ebola, Marburg), Arenaviruses (Lassa fever), Bunyavirales (Crimean-Congo haemorrhagic fever), and Flaviviruses (Yellow fever, severe Dengue)—are high-consequence infectious diseases (HCIDs) capable of causing catastrophic multi-organ failure and nosocomial dissemination. "
            "Pathophysiology involves viral tropism for endothelial cells, macrophages, and dendritic cells, triggering massive pro-inflammatory cytokine release, microvascular leakage, consumptive coagulopathy, and profound hypovolemic/distributive shock. "
            "ICU management demands strict biosafety containment, aggressive volume resuscitation, organ support, and rapid deployment of targeted therapeutics (monoclonal antibodies for Ebola, intravenous ribavirin for Lassa fever)."
        ),
        "teaching_points": [
            "Infection prevention and control is paramount: strict biosafety Level 4 precautions or specialized High-Level Isolation Units (HLIU) with full personal protective equipment (PPE: powered air-purifying respirators [PAPRs] or fluid-resistant coveralls with double gloving, N95/FFP3 respirators, and chemical-resistant boots) with trained observers for donning/doffing.",
            "Severe Ebola virus disease (EVD) typically manifests with massive gastrointestinal volume loss (severe watery diarrhoea and vomiting up to 5-10 L/day), causing profound hypovolemia, electrolyte wasting (hypokalaemia, hypomagnesaemia), metabolic acidosis, and prerenal AKI requiring aggressive point-of-care-guided fluid replacement.",
            "Monoclonal antibody therapies—specifically Inmazeb (atoltivimab, maftivimab, and odesivimab-ebgn cocktail) and Ebanga (ansuvimab-zykw)—significantly reduce 28-day mortality in Ebola virus disease (Zaire ebolavirus) when administered early (PALM randomized trial).",
            "Intravenous ribavirin is the specific antiviral therapy of choice for Lassa fever and Crimean-Congo haemorrhagic fever, demonstrating significant mortality reduction when initiated within the first 6 days of illness onset."
        ],
        "mcq_angles": [
            "Specific antiviral treatments by VHF family: monoclonal antibodies (Inmazeb, Ebanga) for Ebola vs intravenous ribavirin for Lassa fever.",
            "Primary mechanism of death in severe Ebola virus disease: profound hypovolemic shock and electrolyte collapse from massive gastrointestinal fluid losses.",
            "Personal protective equipment protocol: mandatory use of trained buddy observers during doffing to eliminate self-contamination."
        ],
        "case_hooks": [
            "A healthcare aid worker returns from the Democratic Republic of Congo with high fevers, diffuse myalgias, and explosive watery diarrhea; RT-PCR confirms Zaire ebolavirus; isolation and monoclonal antibody therapy are mobilized.",
            "A traveller from rural Sierra Leone presents with fever, pharyngitis, facial edema, and mucosal bleeding; Lassa virus RT-PCR is positive, and intravenous ribavirin is started."
        ],
        "uncertainties": [
            "Efficacy of novel broad-spectrum antivirals (remdesivir, favipiravir) across diverse filovirus species (e.g., Sudan virus, Marburg virus) where specific monoclonal antibodies are ineffective.",
            "Safety and optimal delivery of continuous renal replacement therapy (CRRT) and mechanical ventilation in high-level biocontainment environments."
        ]
    },

    "Viral respiratory infections: RSV, parainfluenza, adenovirus: clinical features, at-risk populations": {
        "mentor_intro": (
            "Viral respiratory pathogens beyond influenza and SARS-CoV-2—prominently respiratory syncytial virus (RSV), human parainfluenza viruses (HPIV), and adenoviruses—cause immense disease burden across extremes of age and in immunocompromised hosts. "
            "RSV is the primary cause of bronchiolitis and pneumonia in infants and acute cardiopulmonary hospitalization in older adults. "
            "Parainfluenza viruses (especially HPIV-1 and HPIV-2) are the classic culprits behind acute laryngotracheobronchitis (croup), while adenovirus produces severe pharyngitis, follicular conjunctivitis, pneumonia, and life-threatening disseminated disease in stem cell transplant recipients."
        ),
        "teaching_points": [
            "Respiratory syncytial virus (RSV) manifests in infants as acute bronchiolitis (tachypnoea, wheezing, subcostal retractions, feeding difficulty); in older adults (>=60-65 years) and patients with COPD or congestive heart failure, RSV causes severe lower respiratory tract disease and mortality comparable to non-pandemic influenza.",
            "Passive immunoprophylaxis with nirsevimab (a long-acting monoclonal antibody targeting the prefusion F protein) administered as a single intramuscular injection protects all infants entering their first RSV season; maternal prefusion F bivalent vaccine (Abrysvo) given at 32-36 weeks gestation confers passive transplacental protection.",
            "Human parainfluenza virus (HPIV-1) is the leading cause of viral croup (laryngotracheobronchitis) in children aged 6 months to 3 years, characterized by a classic 'barking' seal-like cough, inspiratory stridor, and the 'steeple sign' (subglottic tracheal narrowing) on neck radiograph; treatment is oral dexamethasone (0.15-0.60 mg/kg) and nebulized epinephrine for severe distress.",
            "Adenovirus infections in allogeneic haematopoietic stem cell transplant recipients can cause disseminated disease, necrotizing pneumonia, and acute liver failure; quantitative plasma adenovirus PCR is monitored, with intravenous cidofovir (or brincidofovir) used for preemptive or targeted therapy."
        ],
        "mcq_angles": [
            "RSV preventative strategies: nirsevimab long-acting monoclonal antibody for infants vs maternal vaccination during weeks 32-36.",
            "Management of acute croup: single dose oral dexamethasone (0.15-0.6 mg/kg) with nebulized racemic epinephrine for resting stridor.",
            "Recognizing life-threatening adenovirus disease in transplant recipients: quantitative plasma PCR monitoring and cidofovir therapy."
        ],
        "case_hooks": [
            "A 4-month-old infant presents in December with rhinorrhoea, persistent wheezing, intercostal retractions, and oxygen saturation 89% on room air; viral multiplex PCR is positive for RSV.",
            "A 2-year-old boy presents at 2 AM with a sudden barking cough, hoarseness, and inspiratory stridor that worsens with crying; neck X-ray demonstrates subglottic narrowing ('steeple sign')."
        ],
        "uncertainties": [
            "Clinical efficacy and renal safety profile of novel investigational oral RSV fusion inhibitors in immunocompromised bone marrow transplant patients.",
            "Efficacy of adoptive virus-specific T-cell (VST) immunotherapy in refractory disseminated adenovirus infections post-transplantation."
        ]
    },

    "Viral-Induced Arthritides": {
        "mentor_intro": (
            "Viral-induced arthritides are acute, self-limiting or chronic inflammatory joint syndromes triggered by systemic viral infections. "
            "Underlying mechanisms include direct synovial viral invasion, immune complex deposition with complement consumption (Type III hypersensitivity), and molecular mimicry triggering autoimmunity. "
            "Classic culprits include Parvovirus B19 (symmetric small joint polyarthritis mimicking early rheumatoid arthritis in adults), Hepatitis B and C, Rubella, and arthropod-borne alphaviruses (Chikungunya, Ross River, Mayaro); distinguishing viral arthritis from emerging autoimmune disease avoids unnecessary immunosuppressive therapy."
        ),
        "teaching_points": [
            "Parvovirus B19 causes erythema infectiosum ('fifth disease', slapped-cheek rash) in children, but in adults (especially mothers and schoolteachers) presents as acute symmetric polyarthritis of the small joints of the hands, wrists, and knees, closely mimicking rheumatoid arthritis with positive anti-B19 IgM antibodies.",
            "Hepatitis B virus infection triggers a serum sickness-like prodrome prior to the onset of jaundice, characterized by urticarial rash, angioedema, symmetric polyarthritis, and hypocomplementaemia due to circulating HBsAg-anti-HBs immune complex deposition.",
            "Hepatitis C virus is strongly associated with mixed cryoglobulinaemia (Type II/III), presenting with the classic Meltzer triad of purpura, arthralgias, and asthenia/fatigue, accompanied by positive rheumatoid factor and low C4 levels.",
            "Chikungunya virus (transmitted by Aedes mosquitoes) causes an acute syndrome of high fever, petechial rash, and severe, debilitating, incapacitating polyarthralgias/polyarthritis that can persist chronically in over 30-50% of patients for months to years.",
            "Viral arthritides are generally managed symptomatically with non-steroidal anti-inflammatory drugs (NSAIDs) and paracetamol; systemic corticosteroids and immunosuppressives should be strictly avoided in the acute phase as they can impair viral clearance."
        ],
        "mcq_angles": [
            "Differentiating Parvovirus B19 polyarthritis from rheumatoid arthritis: sudden onset, exposure to children, spontaneous resolution within 2-6 weeks, and presence of anti-B19 IgM.",
            "Recognizing Hepatitis B serum sickness-like prodrome: acute arthritis, urticaria, low complement (C3/C4) preceding hepatic transaminase elevation.",
            "Mixed cryoglobulinaemia associated with Hepatitis C: low C4, positive RF, purpura, and treatment directed at antiviral cure (direct-acting antivirals [DAAs])."
        ],
        "case_hooks": [
            "A 32-year-old primary school teacher presents with sudden bilateral wrist and MCP swelling and morning stiffness 10 days after several students in her class had facial rashes; Parvovirus B19 IgM is positive.",
            "A 45-year-old male with chronic Hepatitis C presents with palpable purpura on both lower legs, arthralgias, and numbness in his feet; laboratory work reveals elevated rheumatoid factor and undetectable serum C4."
        ],
        "uncertainties": [
            "Pathophysiological mechanisms governing the transition from acute Chikungunya viremia to chronic, destructive post-viral arthropathy.",
            "Role of temporary low-dose methotrexate or biologics in chronic, refractory Chikungunya arthritis unresponsive to NSAIDs."
        ]
    },

    "Vitamin B12 and Folate Deficiency": {
        "mentor_intro": (
            "Vitamin B12 (cobalamin) and folate (vitamin B9) are essential water-soluble vitamins critical for DNA synthesis, erythropoiesis, and neurological myelin maintenance. "
            "Both deficiencies impair pyrimidine synthesis, resulting in nuclear-cytoplasmic dyssynchrony that manifests morphologically as megaloblastic anaemia (macrocytosis, MCV >100-110 fL, and hypersegmented neutrophils on peripheral smear). "
            "The critical clinical mandate is never administering folic acid alone for megaloblastic anaemia without first excluding vitamin B12 deficiency; folate corrects the haematologic anaemia but accelerates catastrophic, irreversible neurological degeneration (subacute combined degeneration of the spinal cord)."
        ),
        "teaching_points": [
            "Folic acid supplementation must NEVER be given as monotherapy in undiagnosed megaloblastic anaemia without ruling out vitamin B12 deficiency; folate bypasses the thymidylate synthase block to correct haematologic cytopenias while allowing irreversible neurological destruction to progress unchecked.",
            "Vitamin B12 deficiency causes subacute combined degeneration (SCD) of the spinal cord, characterized by demyelination of the posterior columns (loss of vibration and proprioception, sensory ataxia) and lateral corticospinal tracts (spastic paraparesis, hyperreflexia, extensor plantar responses).",
            "Biochemical differentiation between B12 and folate deficiency uses metabolic intermediates: methylmalonic acid (MMA) is elevated in B12 deficiency but NORMAL in folate deficiency; homocysteine is elevated in BOTH B12 and folate deficiencies.",
            "Pernicious anaemia—an autoimmune gastritis causing intrinsic factor deficiency from destruction of gastric parietal cells—is the leading cause of B12 deficiency in adults, confirmed by positive anti-intrinsic factor antibodies (highly specific) or anti-parietal cell antibodies.",
            "Parenteral vitamin B12 replacement (intramuscular hydroxycobalamin 1000 ug on alternate days until neurological symptoms stabilize, followed by maintenance every 2-3 months) is the standard for pernicious anaemia and patients with neurological involvement."
        ],
        "mcq_angles": [
            "Diagnostic biochemical distinction: elevated methylmalonic acid (MMA) confirms B12 deficiency (normal in folate deficiency).",
            "Consequences of administering folic acid monotherapy to a B12-deficient patient (corrects macrocytic anaemia but precipitates/accelerates subacute combined degeneration of the cord).",
            "Specific antibody testing in pernicious anaemia: anti-intrinsic factor antibody (high specificity ~99%) vs anti-parietal cell antibody (high sensitivity ~90% but lower specificity)."
        ],
        "case_hooks": [
            "A 64-year-old woman presents with progressive tingling in her fingers and toes, unsteady gait, and positive Romberg sign; CBC reveals Hb 85 g/L, MCV 114 fL, and blood smear shows hypersegmented neutrophils; serum methylmalonic acid is markedly elevated.",
            "A strict vegan of 6 years who takes no supplements presents with fatigue, memory lapses, and lower extremity hyperreflexia with bilateral Babinski signs."
        ],
        "uncertainties": [
            "Clinical equivalence of high-dose oral vitamin B12 (1000-2000 ug daily via passive intestinal diffusion) versus intramuscular injections in patients with severe pernicious anaemia and neurological deficits.",
            "Diagnostic accuracy of serum total B12 versus holotranscobalamin (active B12) in borderline deficiency states."
        ]
    },

    "Vitamin K Deficiency and Liver Disease Coagulopathy": {
        "mentor_intro": (
            "Coagulopathy in chronic liver disease was historically viewed as an isolated bleeding diathesis, defined by elevated conventional clotting times (prothrombin time [PT] and international normalized ratio [INR]). "
            "Modern haematology recognizes cirrhosis as a state of 'rebalanced haemostasis': concomitant declines in liver-synthesized procoagulant factors (II, VII, IX, X, V) are offset by parallel declines in endogenous anticoagulants (protein C, protein S, antithrombin III) and elevated endothelial von Willebrand factor. "
            "Vitamin K deficiency (from malnutrition, prolonged antibiotics, or cholestasis with bile salt deficiency impairing fat-soluble vitamin absorption) must be distinguished from parenchymal hepatic synthetic failure."
        ),
        "teaching_points": [
            "Liver disease coagulopathy represents a fragile 'rebalanced haemostasis' where patients have reduced procoagulants but also reduced anticoagulants (protein C, protein S, antithrombin); routine INR reflects ONLY procoagulant factor deficiencies and does NOT accurately predict clinical bleeding risk or protection against thrombosis.",
            "Vitamin K is an essential cofactor for gamma-glutamyl carboxylase, which carboxymates procoagulant factors II, VII, IX, X, and anticoagulant proteins C and S; vitamin K deficiency responds to intravenous vitamin K (10 mg IV), whereas end-stage parenchymal failure does not correct.",
            "Factor V activity testing differentiates vitamin K deficiency from hepatic synthetic failure: Factor V is synthesized by the liver independently of vitamin K; low Factor V indicates genuine parenchymal synthetic failure, whereas normal Factor V with prolonged PT/INR points to pure vitamin K deficiency.",
            "Prophylactic correction of elevated INR using fresh frozen plasma (FFP) prior to low-risk invasive procedures (paracentesis, thoracentesis, endoscopic band ligation) is explicitly not recommended by gastroenterology guidelines, as it increases portal hypertension and circulatory overload without reducing bleeding.",
            "Viscoelastometric testing (thromboelastography [TEG] or rotational thromboelastometry [ROTEM]) provides a comprehensive assessment of whole-blood clot firmness and fibrinolysis, serving as the superior method to guide blood product transfusions in actively bleeding cirrhotic patients."
        ],
        "mcq_angles": [
            "Differentiating vitamin K deficiency from liver failure using Factor V vs Factor VII (Factor V synthesis is vitamin K-independent).",
            "Why INR cannot be used to predict procedural bleeding risk in cirrhotic patients (rebalanced haemostasis with concurrent protein C/S reduction).",
            "Inappropriateness of routine pre-procedure fresh frozen plasma (FFP) transfusions in stable cirrhosis undergoing paracentesis (increases volume and portal pressure without hemostatic benefit)."
        ],
        "case_hooks": [
            "A 58-year-old male with biliary obstruction from choledocholithiasis presents with an INR of 2.4; after receiving 10 mg of intravenous phytomenadione (vitamin K1), his INR normalizes to 1.1 within 24 hours.",
            "A patient with decompensated cirrhosis (Child-Pugh C) has an INR of 2.2 and platelet count 55 x 10^9/L; the surgical resident orders 4 units of FFP before an elective paracentesis, which the attending cancels."
        ],
        "uncertainties": [
            "Safety and efficacy of 4-factor prothrombin complex concentrates (4F-PCC) versus fresh frozen plasma in acute severe bleeding in cirrhosis.",
            "Reliability of viscoelastometric parameters (TEG/ROTEM) in guiding pre-operative optimization prior to major hepatic resection or liver transplantation."
        ]
    },

    "Vocal Cord Dysfunction": {
        "mentor_intro": (
            "Vocal cord dysfunction (VCD)—now formally termed inducible laryngeal obstruction (ILO) or paradoxical vocal fold motion (PVFM)—is characterized by inappropriate, episodic adduction of the vocal cords during respiration, primarily during inspiration. "
            "VCD causes acute upper airway obstruction, manifesting as episodic dyspnoea, choking sensations, throat tightness, and inspiratory stridor, frequently triggered by exercise, emotional distress, cold air, or irritants (laryngopharyngeal reflux). "
            "Because VCD classically mimics asthma, patients are frequently misdiagnosed for years, receiving escalating high-dose inhaled corticosteroids, systemic steroids, and repeated emergency department visits without clinical improvement."
        ),
        "teaching_points": [
            "Vocal cord dysfunction / inducible laryngeal obstruction (VCD/ILO) is defined by paradoxical adduction of the true vocal folds during inspiration, producing acute inspiratory dyspnoea, throat tightness, and stridor; symptoms are unresponsive to inhaled short-acting beta-agonists (albuterol).",
            "The diagnostic gold standard is direct visualization via flexible nasolaryngoscopy during an acute symptomatic episode (or immediately following a provocative trigger, such as continuous exercise testing), documenting >=50% vocal fold adduction during inspiration with posterior chink formation.",
            "Spirometry during an acute episode demonstrates a classic variable extrathoracic upper airway obstruction pattern: marked flattening or truncation of the inspiratory flow-volume loop with a normal expiratory limb.",
            "First-line management centers on specialized speech-language pathology (respiratory retraining therapy, quick-release rescue breathing techniques: pursed-lip breathing, sniff-puffs, diaphragmatic breathing) and treating concurrent triggers (gastroesophageal/laryngopharyngeal reflux and post-nasal drip)."
        ],
        "mcq_angles": [
            "Flow-volume loop characteristics of VCD: truncated/flattened inspiratory loop with preserved expiratory loop (variable extrathoracic obstruction).",
            "Gold standard diagnostic test: direct flexible nasolaryngoscopy demonstrating paradoxical vocal fold adduction during inspiration.",
            "First-line therapy for VCD: speech therapy and respiratory retraining breathing maneuvers rather than bronchodilators or steroids."
        ],
        "case_hooks": [
            "A 17-year-old female competitive cross-country runner experiences acute severe breathlessness and high-pitched inspiratory wheezing that develops precisely 5 minutes into maximal sprinting and resolves 10 minutes post-rest; albuterol inhalers provide no relief.",
            "A 42-year-old woman treated for 'refractory severe asthma' on triple-therapy inhalers and oral prednisone undergoes spirometry; the flow-volume loop shows complete flattening of the inspiratory loop with normal FEV1/FVC ratio."
        ],
        "uncertainties": [
            "Diagnostic sensitivity and concordance of continuous laryngoscopy during exercise (CLE) testing versus post-exercise laryngoscopy.",
            "Role of laryngeal botulinum toxin (Botox) injections into the thyroarytenoid muscles in severe, intractable VCD refractory to behavioral speech retraining."
        ]
    },

    "Von Hippel-Lindau syndrome: phaeochromocytoma, renal cell carcinoma, pancreatic NETs": {
        "mentor_intro": (
            "Von Hippel-Lindau (VHL) syndrome is an autosomal dominant hereditary cancer predisposition syndrome caused by germline inactivating mutations in the VHL tumour suppressor gene on chromosome 3p25.3. "
            "Loss of functional pVHL impairs ubiquitin-mediated degradation of hypoxia-inducible factor alpha (HIF-1alpha and HIF-2alpha), causing constitutive HIF accumulation and overtranscription of angiogenic and oncogenic target genes (VEGF, PDGF, erythropoietin). "
            "VHL manifests with multi-organ hypervascular neoplasms: central nervous system and retinal hemangioblastomas, clear cell renal cell carcinoma (ccRCC), pheochromocytomas/paragangliomas, and pancreatic neuroendocrine tumours (pNETs)."
        ),
        "teaching_points": [
            "Von Hippel-Lindau syndrome is inherited in an autosomal dominant fashion with high penetrance, caused by mutations in the VHL gene on chromosome 3p25, predisposing to hypervascular tumours driven by constitutive HIF-2alpha accumulation.",
            "Surveillance for clear cell renal cell carcinoma (ccRCC) utilizes contrast-enhanced abdominal MRI/CT; to preserve long-term renal function, surgical intervention (nephron-sparing partial nephrectomy or thermal ablation) is deferred until the largest solid renal mass reaches 3 cm in diameter ('the 3 cm rule').",
            "Pheochromocytomas in VHL produce predominantly normetanephrine (noradrenaline hypersecretion) rather than metanephrine/adrenaline; cortical-sparing partial adrenalectomy is preferred over total adrenalectomy to avoid lifelong adrenal insufficiency in bilateral disease.",
            "Belzutifan—a first-in-class small-molecule oral HIF-2alpha inhibitor—is FDA/EMA approved for adult patients with VHL syndrome who require therapy for associated ccRCC, CNS hemangioblastomas, or pancreatic neuroendocrine tumours not requiring immediate surgery, achieving high objective response rates (>50-60%)."
        ],
        "mcq_angles": [
            "The '3 cm rule' for renal cell carcinoma in VHL: active surveillance for tumors <3 cm to preserve renal parenchyma and defer partial nephrectomy until >=3 cm.",
            "Mechanism of action and indications for belzutifan: direct oral inhibitor of hypoxia-inducible factor-2alpha (HIF-2alpha) in VHL-associated neoplasms.",
            "Screening guidelines: annual blood pressure and fractionated plasma/urinary metanephrines starting at age 5; biennial central nervous system and abdominal MRI starting in adolescence."
        ],
        "case_hooks": [
            "A 28-year-old male with known VHL syndrome has multiple bilateral renal cysts and a 2.4 cm solid enhancing cortex lesion in the right kidney on surveillance MRI; his eGFR is normal; the urologist recommends continued surveillance until the mass reaches 3 cm.",
            "A 34-year-old female with VHL and growing multiple spinal hemangioblastomas and a 2.5 cm pancreatic neuroendocrine tumor is initiated on oral belzutifan 120 mg daily."
        ],
        "uncertainties": [
            "Optimal duration of belzutifan therapy and safety of drug holidays in patients achieving durable objective radiographic tumor regression.",
            "Malignant potential and surgical intervention thresholds for VHL-associated pancreatic neuroendocrine tumours based on exon 3 mutations or size criteria (>2-3 cm)."
        ]
    },

    "Von Willebrand Disease": {
        "mentor_intro": (
            "Von Willebrand Disease (VWD) is the most prevalent inherited human bleeding disorder, caused by quantitative deficiency or qualitative structural dysfunction of von Willebrand factor (VWF). "
            "VWF serves dual critical hemostatic roles: mediating platelet adhesion to subendothelial collagen at sites of vascular injury (via platelet glycoprotein Ib receptors) and serving as the carrier chaperone protein protecting circulating Factor VIII from rapid degradation. "
            "VWD is categorized into quantitative deficiencies (Type 1: partial deficiency, >75-80% of cases; Type 3: total absence) and qualitative structural defects (Type 2 variants: 2A, 2B, 2M, 2N), with treatment tailored to subtype and bleeding severity."
        ),
        "teaching_points": [
            "VWD diagnostic evaluation requires a diagnostic panel: VWF antigen (VWF:Ag, quantitative level), VWF platelet-dependent activity (VWF:RCo or VWF:GPIbM / VWF:GPIbR, functional activity), Factor VIII coagulant activity (FVIII:C), and VWF multimers.",
            "Type 1 VWD is characterized by proportional reduction of both VWF:Ag and VWF activity (VWF activity-to-antigen ratio >0.7); Type 2 variants exhibit qualitative defects with disproportionate functional loss (VWF activity-to-antigen ratio <0.7).",
            "Desmopressin (DDAVP, 0.3 ug/kg IV or subcutaneous, or 300 ug concentrated nasal spray) stimulates rapid endogenous release of stored VWF and Factor VIII from endothelial Weibel-Palade bodies; it is the first-line treatment for minor bleeding or procedural prophylaxis in Type 1 VWD.",
            "Desmopressin is strictly contraindicated in Type 2B VWD because the mutant VWF has hyper-affinity for platelet GPIb receptors, causing platelet hyper-aggregation and precipitating acute severe thrombocytopenia; desmopressin is also ineffective in Type 3 VWD (no endogenous stores).",
            "Plasma-derived or recombinant VWF concentrates containing Factor VIII are the definitive treatment for Type 3 VWD, severe Type 2 variants, and Type 1 patients unresponsive to or with contraindications to DDAVP."
        ],
        "mcq_angles": [
            "Contraindication of desmopressin (DDAVP) in Type 2B VWD: induces paradoxical platelet clumping and severe thrombocytopenia.",
            "Distinguishing Type 1 (concordant ratio >0.7) from Type 2 variants (discordant activity/antigen ratio <0.7).",
            "Type 2N VWD mimicry: qualitative defect in Factor VIII binding domain that mimics mild-to-moderate Haemophilia A in males and females."
        ],
        "case_hooks": [
            "A 22-year-old woman with severe menorrhagia and recurrent epistaxis has VWF:Ag 28%, VWF:RCo 24% (ratio 0.85), and FVIII 45%; a desmopressin trial demonstrates an excellent 3-fold rise in both VWF and FVIII.",
            "A 14-year-old boy diagnosed with atypical VWD receives DDAVP prior to dental extraction; 1 hour post-dose, his platelet count drops precipitously from 180 to 22 x 10^9/L, confirming Type 2B VWD."
        ],
        "uncertainties": [
            "Diagnostic definition and clinical bleeding significance of 'low VWF' levels (30-50 IU/dL) versus definitive VWD (<30 IU/dL).",
            "Long-term efficacy and safety of recombinant VWF (vonicog alfa) compared to plasma-derived concentrates in major surgery and delivery."
        ]
    },

    "Vulvar and Vaginal Cancers": {
        "mentor_intro": (
            "Vulvar and vaginal cancers are rare gynaecological malignancies predominantly comprising squamous cell carcinomas (SCC, >80-90%). "
            "Pathogenesis follows dual distinct etiologic pathways: human papillomavirus (HPV)-dependent pathways (associated with high-risk HPV types 16 and 18, high-grade squamous intraepithelial lesions [HSIL / vVIN], younger patients, and smoking) and HPV-independent pathways (associated with chronic inflammatory lichen sclerosus, differentiated VIN [dVIN], TP53 mutations, and older age). "
            "Treatment centers on individualised radical wide local excision with sentinel lymph node biopsy (SLNB) or inguinofemoral lymphadenectomy, followed by adjuvant chemoradiotherapy for positive nodal metastasis."
        ),
        "teaching_points": [
            "Vulvar squamous cell carcinoma arises via two distinct carcinogenic pathways: HPV-associated (younger women, p16 positive, better prognosis) and HPV-independent (older women, associated with lichen sclerosus, TP53 mutated, higher recurrence rates).",
            "Inguinofemoral lymph node status is the single most critical prognostic determinant for survival; sentinel lymph node biopsy (SLNB) using radiotracer and blue dye or indocyanine green is the standard of care for unifocal tumours <4 cm without clinically suspicious groin nodes (GROINSS-V trials).",
            "Surgical management of early vulvar cancer requires radical local excision achieving >=1 cm gross surgical margins (histological clearance >=8 mm after tissue fixation) to minimize local recurrence risk while avoiding disfiguring radical vulvectomy.",
            "Primary vaginal cancer is rare (most vaginal malignancies represent metastases from cervix, vulva, or endometrium); definitive concurrent chemoradiotherapy (external beam radiation plus brachytherapy with cisplatin) is the standard of care for locally advanced (Stage II-IV) primary vaginal carcinoma."
        ],
        "mcq_angles": [
            "Prognostic importance of inguinofemoral lymphadenectomy / SLNB in vulvar cancer staging and management.",
            "Dual pathways of vulvar carcinogenesis: p16/HPV-associated vs p53/lichen sclerosus-associated.",
            "Primary treatment modality for locally advanced vaginal cancer: definitive chemoradiotherapy with image-guided brachytherapy rather than radical exenterative surgery."
        ],
        "case_hooks": [
            "A 68-year-old woman with a 15-year history of vulvar lichen sclerosus presents with an unhealing, painful 2.2 cm ulcerated lesion on the right labium majus; biopsy confirms invasive keratinizing SCC.",
            "A 38-year-old female presents with a unifocal 1.8 cm vulvar SCC on the left labium; clinical exam and groin ultrasound show no lymphadenopathy; the gynaecologic oncologist plans radical local excision with sentinel lymph node biopsy."
        ],
        "uncertainties": [
            "Safety of omitting full inguinofemoral lymphadenectomy in patients with isolated micrometastases (<=2 mm) detected on sentinel lymph node biopsy (GROINSS-V II trial).",
            "Efficacy of immune checkpoint inhibitors (pembrolizumab) in recurrent or metastatic HPV-associated versus HPV-independent vulvar carcinoma."
        ]
    },

    "Walled-Off Pancreatic Necrosis": {
        "mentor_intro": (
            "Walled-Off Pancreatic Necrosis (WON) is a mature, encapsulated collection of solid pancreatic and/or peripancreatic necrotic tissue enclosed by a thick inflammatory wall, typically developing >=4 weeks after the onset of acute necrotizing pancreatitis. "
            "Differentiating sterile from infected necrosis is the crucial clinical junction: infected necrosis—confirmed by new fevers, leukocytosis, sepsis, or presence of gas bubbles on contrast-enhanced CT—is a life-threatening indication for intervention. "
            "The international standard of care has definitively shifted from open surgical necrosectomy to the minimally invasive 'step-up approach' (conservative medical therapy and antibiotics, followed by endoscopic or percutaneous catheter drainage, and endoscopic transmural necrosectomy only when needed)."
        ),
        "teaching_points": [
            "Walled-off pancreatic necrosis (WON) is distinguished from pancreatic pseudocyst by containing solid necrotic debris on contrast-enhanced CT or endoscopic ultrasound (pseudocysts contain pure non-necrotic amylase-rich fluid); draining WON requires wide-caliber access to evacuate solid necrosis.",
            "The minimally invasive step-up approach (PANTER trial) is the standard of care for infected necrotizing pancreatitis, reducing new-onset organ failure, long-term complications (pancreatic insufficiency, incisional hernias), and healthcare costs compared to primary open surgical necrosectomy.",
            "Endoscopic step-up approach utilizing endoscopic ultrasound (EUS)-guided transmural drainage with lumen-apposing metal stents (LAMS, e.g., Axios) followed by direct endoscopic necrosectomy (DEN) as needed demonstrates equivalent mortality with significantly lower fistula rates and hospital stay compared to surgical step-up drainage (TENSION trial).",
            "Intervention should be delayed whenever clinically feasible until >=4 weeks from pancreatitis onset, allowing the necrotic collection to organize and form a mature fibrous encapsulation ('walling-off'), which dramatically reduces procedural bleeding and perforation risks."
        ],
        "mcq_angles": [
            "PANTER and TENSION trial outcomes: superiority of the minimally invasive endoscopic step-up approach over open necrosectomy.",
            "Timing of intervention: intentionally delaying intervention to >=4 weeks post-onset to allow mature fibrous wall formation.",
            "Differentiating pancreatic pseudocyst from walled-off necrosis on imaging (solid necrotic tissue vs homogeneous fluid)."
        ],
        "case_hooks": [
            "A 48-year-old male 5 weeks post-severe acute gallstone pancreatitis develops spiking fevers and leukocytosis; CT abdomen reveals a 12 cm retroperitoneal encapsulated collection containing mixed fluid, non-enhancing solid debris, and multiple gas pockets (infected WON).",
            "An interventional endoscopist performs EUS-guided cystogastrostomy using a 20 mm lumen-apposing metal stent (LAMS) into a mature retroperitoneal WON collection, evacuating 800 mL of purulent necrotic debris."
        ],
        "uncertainties": [
            "Optimal timing for removing lumen-apposing metal stents (LAMS) (typically 3-4 weeks) to prevent delayed pseudoaneurysm bleeding from stent erosion into adjacent splenic or gastroduodenal vessels.",
            "Role of upfront direct endoscopic necrosectomy (DEN) at the index drainage procedure versus a true staged step-up drainage-first protocol (DESTIN trial)."
        ]
    },

    "Zollinger-Ellison Syndrome": {
        "mentor_intro": (
            "Zollinger-Ellison Syndrome (ZES) is a clinical syndrome caused by severe, unregulated hypersecretion of gastric acid driven by autonomous gastrin release from a neuroendocrine tumour (gastrinoma). "
            "Gastrinomas are located primarily within the 'gastrinoma triangle' (bounded by the confluence of the cystic/common bile duct, junction of the 2nd/3rd duodenal parts, and neck/body of the pancreas), occurring sporadically (75-80%) or as part of Multiple Endocrine Neoplasia Type 1 (MEN1, 20-25%). "
            "Clinical hallmarks include severe, recurrent, refractory peptic ulcer disease (often in atypical locations like the distal duodenum or jejunum), severe reflux oesophagitis, and chronic watery secretory diarrhoea that resolves with gastric acid suppression."
        ),
        "teaching_points": [
            "Zollinger-Ellison syndrome should be suspected in patients with multiple peptic ulcers, ulcers in atypical post-bulbar or jejunal locations, ulcers refractory to standard therapy, ulcers associated with severe chronic diarrhea, or personal/family history of MEN1 endocrinopathies.",
            "Initial diagnostic screening requires measuring fasting serum gastrin (FSG); an FSG >1000 pg/mL (>10-fold ULN) in the presence of gastric acid hypersecretion (gastric pH <=2.0) is virtually pathognomonic for ZES.",
            "Prior to measuring fasting serum gastrin, proton pump inhibitors (PPIs) must be temporarily discontinued for at least 1-2 weeks (with bridging via H2-receptor antagonists, held 24-48 hours before testing), as PPI-induced hypochlorhydria causes secondary physiological hypergastrinaemia that generates false-positive results.",
            "If fasting serum gastrin is non-diagnostic (between 100 and 1000 pg/mL with pH <=2), a secretin stimulation test is the confirmatory test of choice; a paradoxical rise in serum gastrin of >120 pg/mL above baseline confirms ZES.",
            "Primary tumor localization is established with 68Ga-DOTATATE PET/CT (somatostatin receptor imaging), which possesses superior sensitivity (>90%) over conventional CT/MRI and octreotide scintigraphy; high-dose PPI therapy (e.g., omeprazole 60-120 mg daily) is the medical treatment of choice to control acid hypersecretion."
        ],
        "mcq_angles": [
            "Secretin stimulation test interpretation: paradoxical rise in serum gastrin (>120 pg/mL) confirming gastrinoma.",
            "Diagnostic protocol: why PPIs must be held for 1-2 weeks before measuring fasting gastrin and mandatory measurement of gastric pH to exclude achlorhydria.",
            "Preferred functional imaging modality for gastrinoma localization: 68Ga-DOTATATE PET/CT."
        ],
        "case_hooks": [
            "A 38-year-old male with recurrent duodenal bulb and jejunal ulcers despite twice-daily pantoprazole presents with chronic watery diarrhoea; fasting serum gastrin is 1,450 pg/mL with a gastric pH of 1.4.",
            "A patient with suspected ZES has a borderline fasting gastrin of 380 pg/mL; intravenous secretin (2 U/kg) is administered, resulting in a serum gastrin surge to 820 pg/mL at 15 minutes."
        ],
        "uncertainties": [
            "Surgical resection versus conservative medical surveillance in patients with MEN1-associated multifocal duodenal microgastrinomas.",
            "Role of peptide receptor radionuclide therapy (PRRT with 177Lu-DOTATATE) in metastatic, unresectable gastrinomas progressing on somatostatin analogues."
        ]
    }
}
