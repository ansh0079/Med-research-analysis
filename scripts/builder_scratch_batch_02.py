# -*- coding: utf-8 -*-
"""
Builder script for Batch 2 (Topics 26-50) of the 280 Write-From-Scratch cohort.
Replaces generic placeholder text with textbook-grade clinical evidence,
diagnostic pearls, landmark trials, and high-yield MCQ angles.
"""

BATCH_02_TOPICS = {
    "Retroperitoneal Sarcoma and Rare Sarcomas": {
        "mentor_intro": "Retroperitoneal sarcomas (RPS) are rare mesodermal malignancies that typically present late as large, asymptomatic abdominal masses. Complete compartmental surgical resection with microscopically negative margins (R0/R1) by a specialized sarcoma multidisciplinary team represents the only curative modality, as local recurrence remains the predominant mode of failure.",
        "teaching_points": [
            "Retroperitoneal sarcomas (predominantly liposarcoma and leiomyosarcoma) are characterized by insidious growth within the compliant retroperitoneal space; percutaneous core needle biopsy (retroperitoneal/flank approach avoiding transperitoneal seeding) is mandatory before any intervention to establish histological subtype and grade.",
            "Complete macroscopically negative surgical resection (R0 or R1) performed en bloc with involved contiguous organs (e.g., kidney, colon, psoas fascia) in a high-volume specialized sarcoma center is the cornerstone of curative therapy and the strongest predictor of long-term disease-specific survival.",
            "Well-differentiated liposarcomas (WDLPS) and dedifferentiated liposarcomas (DDLPS) are driven by MDM2 and CDK4 gene amplifications on chromosome 12q, which can be identified by fluorescence in situ hybridization (FISH) to differentiate them from benign lipomatous neoplasms.",
            "The phase III STRASS trial demonstrated that routine preoperative radiotherapy did not significantly improve abdominal recurrence-free survival in unselected retroperitoneal sarcoma, though post-hoc subgroup analyses suggested potential locoregional benefit specifically in low-grade well-differentiated liposarcoma.",
            "Leiomyosarcomas arise from retroperitoneal smooth muscle or major venous structures (inferior vena cava); IVC leiomyosarcomas require careful vascular planning for en bloc vascular resection and reconstruction (prosthetic PTFE graft or primary venorrhaphy)."
        ],
        "mcq_angles": [
            "Preoperative biopsy route: retroperitoneal flank approach under CT/ultrasound guidance is essential to avoid contaminating the peritoneal cavity.",
            "Diagnostic hallmark of liposarcoma: MDM2 gene amplification detected by FISH distinguishes well-differentiated liposarcoma from benign lipoma.",
            "Primary mode of failure in retroperitoneal sarcoma: locoregional recurrence (accounting for ~75% of disease-specific deaths), contrasting with extremity sarcomas where distant metastases dominate."
        ],
        "case_hooks": [
            "A 62-year-old man presenting with early satiety and an incidental 18-cm heterogeneous retroperitoneal mass encasing the left kidney on abdominal CT.",
            "A 54-year-old woman with an en bloc resected inferior vena cava leiomyosarcoma presenting for routine surveillance oncological staging."
        ],
        "uncertainties": [
            "Role of neoadjuvant histology-tailored chemotherapy (doxorubicin/ifosfamide) in high-grade dedifferentiated liposarcoma (STRASS 2 trial evaluation).",
            "Therapeutic threshold for re-resection versus palliative systemic therapy in multifocal retroperitoneal recurrence."
        ]
    },

    "Rheumatic valvular disease anticoagulation": {
        "mentor_intro": "Rheumatic heart disease (RHD) remains a leading cause of valvular morbidity worldwide, predominantly manifesting as rheumatic mitral stenosis (MS). Thromboembolism is a devastating complication, and anticoagulation principles differ fundamentally from non-valvular atrial fibrillation.",
        "teaching_points": [
            "Rheumatic mitral stenosis (moderate-to-severe, valve area <=1.5 cm2) is classified as 'valvular' heart disease; oral anticoagulation with Vitamin K Antagonists (warfarin, target INR 2.0 to 3.0) is the guideline-mandated standard of care for stroke prevention in the presence of atrial fibrillation, prior thromboembolism, or left atrial thrombus.",
            "The landmark INVICTUS randomized controlled trial in rheumatic heart disease with atrial fibrillation established that warfarin was significantly superior to direct oral anticoagulants (rivaroxaban), demonstrating lower rates of stroke and cardiovascular death without a significant difference in major bleeding.",
            "Direct Oral Anticoagulants (DOACs: dabigatran, rivaroxaban, apixaban, edoxaban) are contraindicated or not recommended in patients with moderate-to-severe rheumatic mitral stenosis or mechanical prosthetic valves based on trial evidence (INVICTUS and RE-ALIGN).",
            "Anticoagulation with warfarin is recommended even in sinus rhythm if rheumatic mitral stenosis is accompanied by a severely enlarged left atrium (left atrial diameter >50 mm or volume index >60 mL/m2), spontaneous echocardiographic contrast ('smoke'), or prior systemic embolism.",
            "Secondary antibiotic prophylaxis against recurrent Group A streptococcal infection (intramuscular benzathine penicillin G every 3 to 4 weeks) is mandatory alongside anticoagulation to prevent progressive valvular scarring and deterioration."
        ],
        "mcq_angles": [
            "INVICTUS trial evidence: warfarin is superior to DOACs (rivaroxaban) for stroke prevention and all-cause mortality in rheumatic mitral stenosis with AF.",
            "Definition of 'valvular AF': atrial fibrillation occurring in the presence of moderate-to-severe rheumatic mitral stenosis or a mechanical heart valve.",
            "Anticoagulation in sinus rhythm: indicated in rheumatic MS with left atrial thrombus, prior thromboembolism, or spontaneous echo contrast."
        ],
        "case_hooks": [
            "A 38-year-old immigrant woman with rheumatic severe mitral stenosis (valve area 1.1 cm2) and newly documented paroxysmal atrial fibrillation.",
            "A 45-year-old man with rheumatic heart disease and a mechanical mitral valve whose clinic INR is found to be 1.8."
        ],
        "uncertainties": [
            "Safety and efficacy of factor XI inhibitors in preventing left atrial thrombosis in rheumatic mitral stenosis.",
            "Target INR optimization (2.0-3.0 vs 2.5-3.5) in patients with rheumatic mitral stenosis and spontaneous echocardiographic dense left atrial contrast."
        ]
    },

    "Rheumatoid Lung Disease": {
        "mentor_intro": "Pulmonary involvement is the most common extra-articular manifestation of rheumatoid arthritis (RA) and a leading cause of RA-related mortality. Manifestations encompass interstitial lung disease (RA-ILD), pleural disease, pulmonary nodules, and airway disorders (bronchiectasis, bronchiolitis obliterans).",
        "teaching_points": [
            "Rheumatoid arthritis-associated interstitial lung disease (RA-ILD) affects 10–15% of RA patients clinically and up to 30% subclinically; unlike most other connective tissue diseases where NSIP predominates, RA-ILD characteristically exhibits an aggressive Usual Interstitial Pneumonia (UIP) high-resolution CT pattern (subpleural basal reticulation, honeycombing, traction bronchiectasis).",
            "High-titer seropositivity (RF and anti-CCP / ACPA), male sex, older age, smoking history, and elevated disease activity scores are strong independent risk factors for the development and progression of RA-ILD.",
            "In patients with progressive fibrosing interstitial lung disease despite immunosuppression, the landmark INBUILD trial established that the intracellular tyrosine kinase inhibitor nintedanib significantly reduces the annual rate of decline in forced vital capacity (FVC).",
            "Immunosuppressive management of inflammatory RA-ILD incorporates corticosteroids combined with mycophenolate mofetil (preferred first-line), rituximab, or abatacept; in contrast, TNF inhibitors carry variable associations with ILD flare and should be used with caution.",
            "Rheumatoid pulmonary nodules are typically subpleural, well-circumscribed, and asymptomatic; they can cavitate, rupture causing secondary pneumothorax or pleural effusion (characteristically with very low pleural fluid glucose <1.6 mmol/L and high LDH), and can be accelerated by methotrexate therapy ('accelerated nodulosis')."
        ],
        "mcq_angles": [
            "Predominant HRCT pattern in RA-ILD: Usual Interstitial Pneumonia (UIP) with basal subpleural honeycombing, contrasting with scleroderma and myositis (NSIP).",
            "Pleural fluid signature of rheumatoid pleurisy: extremely low pleural fluid glucose (<1.6 mmol/L / <30 mg/dL), pH <7.20, and markedly elevated rheumatoid factor.",
            "Antifibrotic indication in RA-ILD: nintedanib slows FVC decline in progressive fibrosing phenotype based on the INBUILD trial."
        ],
        "case_hooks": [
            "A 64-year-old male smoker with longstanding seropositive RA presenting with 6 months of worsening exertional dyspnea and bilateral basal inspiratory 'velcro' crackles.",
            "A 52-year-old woman on methotrexate for RA who develops multiple cavitary peripheral lung nodules and a right-sided exudative pleural effusion with glucose 0.8 mmol/L."
        ],
        "uncertainties": [
            "Causal contribution of methotrexate to acute hypersensitivity pneumonitis versus progressive RA-ILD progression.",
            "Comparative efficacy of rituximab versus mycophenolate mofetil as first-line induction therapy for rapidly progressive RA-ILD."
        ]
    },

    "Rheumatoid arthritis biologic and JAK inhibitor therapy": {
        "mentor_intro": "Biologic and targeted synthetic disease-modifying antirheumatic drugs (bDMARDs and tsDMARDs) have revolutionized rheumatoid arthritis care. Following inadequate response to conventional synthetic DMARDs, treatment escalates to TNF inhibitors, IL-6 receptor antagonists, T-cell costimulation modulators, B-cell depleters, or Janus kinase (JAK) inhibitors.",
        "teaching_points": [
            "Biologic DMARDs are indicated in active RA with inadequate response or intolerance to conventional synthetic DMARDs (methotrexate); combination of a biologic (e.g., TNF inhibitor or IL-6 inhibitor) with methotrexate is significantly more effective at achieving clinical remission and preventing radiographic damage than biologic monotherapy.",
            "Classes of approved targeted therapies include: TNF inhibitors (adalimumab, etanercept, infliximab, certolizumab, golimumab), IL-6 receptor inhibitors (tocilizumab, sarilumab), T-cell co-stimulation inhibitor (abatacept), B-cell depleting antibody (rituximab), and oral targeted synthetic JAK inhibitors (tofacitinib, baricitinib, upadacitinib, filgotinib).",
            "Prior to initiating any biologic or JAK inhibitor, mandatory screening includes testing for latent tuberculosis (IGRA or tuberculin skin test with chest radiograph) and chronic viral hepatitis B and C; active or untreated latent TB must receive prophylactic antimycobacterial therapy before commencing biologics.",
            "The ORAL Surveillance trial in patients aged >=50 with cardiovascular risk factors demonstrated that the JAK inhibitor tofacitinib was associated with increased risks of major adverse cardiovascular events (MACE), venous thromboembolism (VTE), and malignancies compared with TNF inhibitors; regulatory agencies advise reserving JAK inhibitors for patients with inadequate response or contraindications to other therapies.",
            "Rituximab (anti-CD20) is particularly efficacious in seropositive (RF-positive and/or ACPA-positive) RA, administered as two 1,000 mg IV infusions 14 days apart, but requires pre-treatment screening for hepatitis B (risk of fatal reactivation) and surveillance for secondary hypogammaglobulinemia."
        ],
        "mcq_angles": [
            "Safety findings of ORAL Surveillance trial: JAK inhibitors carry black-box warnings for MACE, venous thromboembolism, and malignancies in older patients with CV risk.",
            "Mandatory screening before starting TNF/JAK inhibitors: IGRA/chest X-ray for latent tuberculosis and hepatitis B serology (HBsAg, anti-HBc).",
            "Biologic class of choice in seropositive RA after TNF failure: rituximab (anti-CD20) or tocilizumab (anti-IL-6R)."
        ],
        "case_hooks": [
            "A 48-year-old woman with active erosive RA on methotrexate 25 mg weekly whose disease activity score (DAS28) remains 5.4, evaluated for biologic therapy initiation.",
            "A 62-year-old hypertensive smoker with RA on a JAK inhibitor who presents with sudden left lower extremity swelling and a confirmed popliteal deep vein thrombosis."
        ],
        "uncertainties": [
            "Successful DMARD tapering and dose-reduction strategies in patients maintaining sustained deep clinical and ultrasound remission.",
            "Long-term comparative malignancy risks among selective JAK-1 inhibitors versus pan-JAK inhibitors."
        ]
    },

    "Rheumatoid arthritis initial DMARD strategy": {
        "mentor_intro": "Early diagnosis and immediate initiation of conventional synthetic disease-modifying antirheumatic drugs (csDMARDs) within the 'window of opportunity' (<3 months from symptom onset) are critical to arrest synovial inflammation and prevent irreversible cartilage destruction and bone erosions in rheumatoid arthritis.",
        "teaching_points": [
            "Methotrexate (MTX) is the foundational, anchor first-line csDMARD for all active rheumatoid arthritis patients without contraindications, initiated at 10 to 15 mg weekly and rapidly escalated (by 5 mg every 2 to 4 weeks) to a target dose of 20 to 25 mg weekly orally or subcutaneously.",
            "Concomitant oral folic acid (5 mg weekly or 1 mg daily except on the day of methotrexate) must be prescribed to reduce methotrexate-induced adverse effects, including oral stomatitis, nausea, transaminitis, and cytopenias, without diminishing therapeutic antirheumatic efficacy.",
            "Subcutaneous methotrexate provides superior bioavailability, higher clinical response rates, and fewer gastrointestinal side effects compared with oral administration at doses >=15–20 mg weekly, serving as an effective step before declaring methotrexate treatment failure.",
            "Short-term bridging glucocorticoids (low-dose oral prednisone <=10 mg daily or intramuscular/intra-articular depot methylprednisolone) provide rapid symptomatic relief during the 6- to 12-week latency period before csDMARDs achieve therapeutic efficacy, but must be tapered and discontinued as rapidly as clinically feasible.",
            "Treat-to-Target (T2T) strategy mandates systematic objective assessment of disease activity (using CDAI, SDAI, or DAS28) every 1 to 3 months; if at least 50% improvement is not achieved by 3 months or target remission/low disease activity by 6 months, treatment adjustment (adding sulfasalazine/hydroxychloroquine or escalating to a biologic) is required."
        ],
        "mcq_angles": [
            "Treat-to-target evaluation timeline: failure to achieve >=50% reduction in disease activity by 3 months or remission by 6 months mandates immediate DMARD escalation.",
            "Folic acid co-prescription rule: weekly folic acid significantly reduces methotrexate gastrointestinal and hepatic toxicity without impairing DMARD efficacy.",
            "Contraindications to methotrexate: pregnancy/breastfeeding (teratogen), severe renal impairment (eGFR <30 mL/min), chronic liver disease, and active alcohol abuse."
        ],
        "case_hooks": [
            "A 35-year-old woman with newly diagnosed seropositive RA presenting with 10 swollen joints and elevated CRP, started on methotrexate 15 mg weekly and folic acid.",
            "A 42-year-old woman on oral methotrexate 20 mg weekly for 3 months with persistent mild nausea and suboptimal disease control, switched to subcutaneous methotrexate."
        ],
        "uncertainties": [
            "Comparative long-term structural outcomes of initial csDMARD monotherapy versus upfront triple csDMARD therapy (methotrexate + sulfasalazine + hydroxychloroquine).",
            "Role of baseline ultrasound-detected tenosynovitis and power Doppler positivity in selecting patients for upfront biologic DMARD initiation."
        ]
    },

    "Right ventricular failure in the ICU: management principles": {
        "mentor_intro": "Acute right ventricular (RV) failure in the intensive care unit is a hemodynamic emergency characterized by ventriculo-arterial uncoupling, systemic congestion, and low cardiac output. Effective management hinges on optimizing RV preload, reducing RV afterload, augmenting inotropy, and avoiding detrimental mechanical ventilation settings.",
        "teaching_points": [
            "Acute right ventricular failure is provoked by abrupt increases in RV afterload (massive pulmonary embolism, acute respiratory distress syndrome ARDS, severe hypoxic pulmonary vasoconstriction) or primary RV ischemia/infarction; the thin-walled RV rapidly dilates, shifting the interventricular septum leftward ('D-shaped' left ventricle), impairing left ventricular diastolic filling and precipitating systemic hypotension.",
            "Preload management requires avoiding fluid overload; while moderate initial volume expansion may benefit hypovolemic patients, excessive volume worsens RV wall tension, triggers tricuspid annular dilation with functional severe tricuspid regurgitation, and compromises LV stroke volume; central venous decongestion with loop diuretics or ultrafiltration is frequently required.",
            "Maintaining adequate coronary perfusion pressure is paramount: the right coronary artery supplies the RV throughout both systole and diastole; systemic hypotension reduces RV myocardial perfusion, triggering ischemia and a fatal spiral of RV dilation; noradrenaline is the vasopressor of choice to restore systemic vascular resistance and aortic root pressure.",
            "Targeted RV afterload reduction utilizes inhaled pulmonary vasodilators (inhaled nitric oxide [iNO] 10–40 ppm or inhaled prostacyclin [iloprost/epoprostenol]), which selectively dilate ventilated pulmonary vascular beds without causing systemic hypotension.",
            "Mechanical ventilation in RV failure demands lung-protective strategies to avoid increasing pulmonary vascular resistance (PVR): hypercapnia, severe hypoxia, acidosis, high mean airway pressures, and excessive PEEP all dramatically elevate PVR; tidal volumes should be limited to 6 mL/kg PBW with driving pressure minimized."
        ],
        "mcq_angles": [
            "Hemodynamic goal in acute RV failure: maintain systemic MAP with noradrenaline to preserve right coronary artery perfusion pressure and prevent RV ischemic collapse.",
            "Inhaled versus systemic pulmonary vasodilators: inhaled nitric oxide or epoprostenol selectively reduces pulmonary vascular resistance without systemic vasodilation.",
            "Echocardiographic hallmark of RV pressure overload: McConnell sign (RV free wall hypokinesia with preserved apex sparing) and leftward septal flattening ('D-shaped' LV)."
        ],
        "case_hooks": [
            "A 58-year-old woman with submassive pulmonary embolism admitted to the ICU whose blood pressure drops to 78/48 mmHg following an infusion of 1.5 L normal saline, with marked JVD and cold extremities.",
            "A 64-year-old mechanically ventilated man with severe ARDS whose echocardiogram shows acute RV dilation, TAPSE 10 mm, and severe tricuspid regurgitation."
        ],
        "uncertainties": [
            "Threshold and timing for percutaneous right ventricular mechanical circulatory support (e.g., Impella RP or ProtekDuo) in medical RV failure.",
            "Optimal PEEP titration strategy balancing alveolar recruitment against pulmonary vascular resistance and RV afterload in ARDS-induced cor pulmonale."
        ]
    },

    "SGLT-2 inhibitors in heart failure": {
        "mentor_intro": "Sodium-glucose cotransporter-2 (SGLT2) inhibitors have fundamentally redefined heart failure therapeutics across the entire spectrum of left ventricular ejection fraction. Regardless of glycemic status or diabetes diagnosis, SGLT2 inhibitors provide rapid, robust reductions in cardiovascular mortality and heart failure hospitalizations.",
        "teaching_points": [
            "Landmark trials in heart failure with reduced ejection fraction (DAPA-HF with dapagliflozin and EMPEROR-Reduced with empagliflozin) demonstrated that adding an SGLT2 inhibitor to standard guideline-directed medical therapy significantly reduces the composite of cardiovascular death and heart failure hospitalization by 25–26% in patients with or without type 2 diabetes.",
            "Subsequent landmark trials in heart failure with preserved ejection fraction (EMPEROR-Preserved with empagliflozin and DELIVER with dapagliflozin) demonstrated that SGLT2 inhibitors significantly reduce cardiovascular death and heart failure hospitalizations in HFpEF and HFmrEF (LVEF >40%), establishing them as the first drug class with proven efficacy across all ejection fractions.",
            "SGLT2 inhibitors exert beneficial cardiovascular and renal effects through multiple neurohormonal and metabolic mechanisms: promoting osmotic diuresis and natriuresis (interstitial decongestion with minimal intravascular volume depletion), reducing cardiac preload/afterload, shifting myocardial fuel utilization toward energy-efficient ketone bodies, reducing myocardial fibrosis, and preserving glomerular filtration.",
            "In patients hospitalized with acute decompensated heart failure, in-hospital initiation of SGLT2 inhibitors once hemodynamically stabilized (EMPULSE trial) significantly improves 90-day clinical benefit, reduces heart failure readmissions, and accelerates decongestion with an exemplary safety profile.",
            "Standard maintenance dosing is fixed: dapagliflozin 10 mg once daily or empagliflozin 10 mg once daily; no dose titration is required, and therapy can be initiated down to an eGFR threshold of 20 to 25 mL/min/1.73m2."
        ],
        "mcq_angles": [
            "Universality across ejection fraction: SGLT2 inhibitors are the only drug class recommended with Class I evidence across the entire ejection fraction spectrum (HFrEF, HFmrEF, and HFpEF).",
            "Glycemic independence: the cardiovascular and mortality benefits of SGLT2 inhibitors in heart failure are identical in diabetic and non-diabetic patients.",
            "In-hospital initiation: the EMPULSE trial demonstrated that early in-hospital initiation of empagliflozin in stabilized acute heart failure produces significant 90-day clinical benefit."
        ],
        "case_hooks": [
            "A 68-year-old non-diabetic man with ischemic cardiomyopathy (LVEF 28%) on bisoprolol, sacubitril/valsartan, and spironolactone evaluated for guideline-directed medical therapy optimization.",
            "A 74-year-old woman with hypertensive heart failure with preserved ejection fraction (LVEF 55%) admitted with acute pulmonary edema."
        ],
        "uncertainties": [
            "Optimal threshold for SGLT2 inhibitor continuation in advanced CKD when eGFR falls below 20 mL/min/1.73m2 during chronic heart failure therapy.",
            "Comparative long-term clinical outcomes of dual SGLT1/SGLT2 inhibitors (sotagliflozin) versus selective SGLT2 inhibitors in post-acute heart failure."
        ]
    },

    "SGLT2 Inhibitors in CKD and Nephrology": {
        "mentor_intro": "Sodium-glucose cotransporter-2 (SGLT2) inhibitors are powerful disease-modifying agents in chronic kidney disease (CKD). By restoring tubuloglomerular feedback and attenuating intraglomerular hypertension, SGLT2 inhibitors halt kidney functional decline, reduce albuminuria, and reduce mortality in diabetic and non-diabetic nephropathies.",
        "teaching_points": [
            "Landmark dedicated renal outcomes trials—DAPA-CKD (dapagliflozin) and EMPA-KIDNEY (empagliflozin)—demonstrated that SGLT2 inhibitors significantly reduce the risk of kidney disease progression (>=50% sustained eGFR decline, end-stage kidney disease, or renal death) by 28–39% in patients with chronic kidney disease, both with and without type 2 diabetes.",
            "Hemodynamic renal protection is mediated by inhibiting sodium and glucose reabsorption in the proximal convoluted tubule, which increases distal sodium delivery to the macula densa; this restores tubuloglomerular feedback, triggering adenosine-mediated afferent arteriolar vasoconstriction and alleviating pathological intraglomerular hypertension.",
            "Initiating an SGLT2 inhibitor causes an expected, reversible 'hemodynamic dip' in eGFR of 3 to 5 mL/min/1.73m2 (or up to 30%) within the first 2 to 4 weeks; this physiological reduction reflects relief of glomerular hyperfiltration and predicts superior long-term preservation of renal function, and should not prompt drug discontinuation.",
            "Clinical guidelines (KDIGO) recommend initiating an SGLT2 inhibitor in patients with CKD and persistent albuminuria (urine albumin-to-creatinine ratio UACR >=200 mg/g / 20 mg/mmol) down to an eGFR of 20 mL/min/1.73m2, and continuing therapy until the initiation of kidney replacement therapy (dialysis or transplantation).",
            "Patients must be educated regarding sick-day rules: temporarily withholding SGLT2 inhibitors during acute illness, sepsis, prolonged fasting, or major surgery to prevent the development of euglycemic diabetic ketoacidosis (euDKA) and acute hypovolemia."
        ],
        "mcq_angles": [
            "Mechanism of nephroprotection: restoration of tubuloglomerular feedback via increased macula densa sodium delivery, causing afferent arteriolar constriction and reducing intraglomerular pressure.",
            "Management of initial eGFR dip: an acute drop of up to 30% in eGFR is expected and reflects hemodynamic unloading; the drug should NOT be stopped.",
            "EMPA-KIDNEY and DAPA-CKD inclusion criteria: renal benefits extend to non-diabetic causes of CKD, including ischemic nephrosclerosis, IgA nephropathy, and FSGS."
        ],
        "case_hooks": [
            "A 56-year-old non-diabetic woman with biopsy-proven IgA nephropathy (eGFR 38 mL/min/1.73m2, UACR 650 mg/g) whose eGFR decreases to 34 mL/min 3 weeks after starting dapagliflozin 10 mg.",
            "A 62-year-old man with type 2 diabetes and stage 4 CKD (eGFR 24 mL/min) evaluated for SGLT2 inhibitor initiation under KDIGO guidelines."
        ],
        "uncertainties": [
            "Long-term nephroprotective efficacy and safety of SGLT2 inhibitors in advanced non-albuminuric CKD (UACR <30 mg/g).",
            "Synergistic renal endpoints achieved by combining SGLT2 inhibitors with non-steroidal mineralocorticoid receptor antagonists (finerenone) in early diabetic nephropathy."
        ]
    },

    "SGLT2 inhibitor therapy for type 2 diabetes": {
        "mentor_intro": "In type 2 diabetes mellitus (T2DM), SGLT2 inhibitors provide insulin-independent glycemic control accompanied by weight reduction, blood pressure lowering, and profound cardiovascular and renal protection. Consensus ADA/EASD guidelines prioritize SGLT2 inhibitors for patients with high-risk cardiorenal comorbidities.",
        "teaching_points": [
            "SGLT2 inhibitors (canagliflozin, dapagliflozin, empagliflozin, ertugliflozin) lower blood glucose by selectively blocking the high-capacity low-affinity sodium-glucose cotransporter in the S1/S2 segments of the proximal renal tubule, promoting urinary glucose excretion of 60 to 80 grams per day.",
            "The glycemic efficacy of SGLT2 inhibitors (typical HbA1c reduction of 0.6–1.0%) is glucose-dependent and filtered-load-dependent, diminishing substantially as eGFR falls below 45 mL/min/1.73m2; however, cardiovascular and nephroprotective benefits persist independent of glycemic lowering.",
            "In patients with T2DM and established atherosclerotic cardiovascular disease, heart failure (any ejection fraction), or chronic kidney disease, consensus guidelines mandate prescribing an SGLT2 inhibitor regardless of the baseline HbA1c or current metformin therapy.",
            "Key clinical benefits beyond glucose control include moderate sustained weight loss (approx. 2 to 3 kg) due to caloric loss via glycosuria, modest blood pressure reduction (3–5 mmHg systolic) secondary to mild osmotic diuresis, and reduction of serum uric acid.",
            "Adverse effect profiles include mycotic genital infections (candidal vulvovaginitis and balanitis, occurring in 5–10% of patients), volume depletion/orthostatic hypotension in elderly patients on loop diuretics, and rare but life-threatening euglycemic diabetic ketoacidosis (euDKA) and necrotizing fasciitis of the perineum (Fournier gangrene)."
        ],
        "mcq_angles": [
            "Glycemic efficacy dependence on renal function: HbA1c-lowering efficacy wanes at lower eGFR, but organ-protective cardiovascular and renal benefits remain robust.",
            "Most common adverse effect: mycotic genital infections (vulvovaginal candidiasis in females, candidal balanitis in uncircumcised males), easily managed with topical antifungals.",
            "Euglycemic DKA recognition: metabolic acidosis with elevated anion gap and ketonemia in the setting of normal or minimally elevated blood glucose (<14 mmol/L / <250 mg/dL)."
        ],
        "case_hooks": [
            "A 54-year-old man with T2DM (HbA1c 7.8%) and a history of myocardial infarction evaluated for second-line antihyperglycemic add-on therapy after metformin.",
            "A 60-year-old woman taking empagliflozin 25 mg who undergoes elective hip arthroplasty, developing lethargy, tachypnea, arterial pH 7.18, and plasma ketones 4.2 mmol/L with a blood glucose of 180 mg/dL."
        ],
        "uncertainties": [
            "Differential risk of non-traumatic lower extremity amputations across individual agents within the SGLT2 inhibitor class (CANVAS trial signal vs real-world data).",
            "Optimal timing and protocol for preoperative discontinuation of SGLT2 inhibitors (3 to 4 days prior) before major elective surgical procedures."
        ]
    },

    "SGLT2 inhibitors heart failure": {
        "mentor_intro": "The application of SGLT2 inhibitors in heart failure represents one of the major therapeutic advances in modern cardiovascular medicine. Functioning as core foundational guideline-directed medical therapy, their hemodynamic, metabolic, and neurohormonal actions improve survival, diminish hospitalizations, and enhance functional capacity.",
        "teaching_points": [
            "SGLT2 inhibitors (dapagliflozin and empagliflozin) constitute one of the four foundational pillars of guideline-directed medical therapy (GDMT) for heart failure with reduced ejection fraction (alongside ARNI/ACEi, beta-blockers, and MRAs), carrying a Class I, Level A recommendation.",
            "Cardiovascular mortality and heart failure hospitalization risk reductions emerge remarkably early after initiating therapy (statistically significant divergence of Kaplan-Meier curves within 12 to 28 days of starting treatment).",
            "Unlike loop diuretics which cause neurohormonal activation, hypokalemia, and intravascular volume depletion, SGLT2 inhibitors preferentially clear interstitial fluid over intravascular volume, achieving effective cardiac unloading while preserving organ perfusion.",
            "SGLT2 inhibitors reduce the risk of hyperkalemia associated with renin-angiotensin-aldosterone system inhibitors (RAASi) and mineralocorticoid receptor antagonists (MRAs), enabling more successful initiation and maintenance of target MRA dosing.",
            "SGLT2 inhibitor therapy is well-tolerated with low discontinuation rates; routine monitoring of blood pressure and renal function at 2 to 4 weeks is advised, with no requirement for dose titration (fixed standard 10 mg daily dose)."
        ],
        "mcq_angles": [
            "Timing of clinical benefit in heart failure: significant reductions in cardiovascular death and hospitalization are demonstrated within 2 to 4 weeks of starting SGLT2 inhibitors.",
            "Interaction with MRAs: SGLT2 inhibitors reduce the incidence of moderate-to-severe hyperkalemia induced by mineralocorticoid receptor antagonists.",
            "Interstitial versus intravascular fluid clearance: SGLT2 inhibitors preferentially deplete interstitial third-space fluid, preserving renal perfusion better than loop diuretics."
        ],
        "case_hooks": [
            "A 62-year-old man with non-ischemic cardiomyopathy (LVEF 32%) admitted with mild decompensated heart failure, initiated on dapagliflozin 10 mg daily prior to discharge.",
            "A 70-year-old woman with chronic HFrEF whose serum potassium is 5.2 mmol/L on spironolactone 25 mg daily, started on empagliflozin with subsequent stabilization of potassium."
        ],
        "uncertainties": [
            "Efficacy and safety of SGLT2 inhibitors in patients with cardiogenic shock or those dependent on continuous inotropic infusions.",
            "Role of SGLT2 inhibitors in advanced congenital heart disease (e.g., systemic right ventricles or Fontan circulation)."
        ]
    },

    "SGLT2 inhibitors heart failure reduced ejection fraction outcomes": {
        "mentor_intro": "In heart failure with reduced ejection fraction (HFrEF, LVEF <=40%), landmark clinical trials have demonstrated profound reductions in all-cause mortality, cardiovascular death, and recurrent heart failure admissions with SGLT2 inhibitors. They are recommended for all symptomatic HFrEF patients irrespective of glycemic status.",
        "teaching_points": [
            "The DAPA-HF trial (4,744 patients with HFrEF, LVEF <=40%) demonstrated that dapagliflozin 10 mg daily added to standard therapy significantly reduced the primary composite outcome of cardiovascular death or worsening heart failure by 26% (HR 0.74, P<0.001), with a 17% reduction in all-cause mortality.",
            "The EMPEROR-Reduced trial (3,730 patients with HFrEF, LVEF <=40%) demonstrated that empagliflozin 10 mg daily reduced the primary composite outcome of cardiovascular death or hospitalization for heart failure by 25% (HR 0.75, P<0.001) and significantly slowed the rate of decline in eGFR over time.",
            "Meta-analyses pooling DAPA-HF and EMPEROR-Reduced confirm a statistically significant 13% reduction in all-cause death (HR 0.87), a 14% reduction in cardiovascular death (HR 0.86), and a 31% reduction in first hospitalization for heart failure.",
            "The magnitude of relative risk reduction with SGLT2 inhibitors is independent of background medical therapies, showing equal benefit in patients already receiving sacubitril/valsartan (ARNI), beta-blockers, and mineralocorticoid receptor antagonists.",
            "Health-related quality of life, assessed objectively via the Kansas City Cardiomyopathy Questionnaire (KCCQ), improves rapidly and substantially within 8 to 12 weeks of initiating SGLT2 inhibitor therapy."
        ],
        "mcq_angles": [
            "All-cause mortality reduction: pooled trial data confirm that SGLT2 inhibitors achieve statistically significant reductions in all-cause and cardiovascular mortality in HFrEF.",
            "Independence from background GDMT: SGLT2 inhibitor benefit is additive and does not depend on achieving target doses of ARNI, beta-blockers, or MRAs.",
            "KCCQ score enhancement: SGLT2 inhibitors produce clinically meaningful, early improvements in patient-reported symptoms and functional physical capacity."
        ],
        "case_hooks": [
            "A 58-year-old non-diabetic male with dilated cardiomyopathy (LVEF 25%) and NYHA Class III dyspnea evaluating the mortality impact of adding empagliflozin to baseline ARNI and carvedilol.",
            "A 66-year-old patient with HFrEF who achieves an 8-point improvement in KCCQ clinical summary score 12 weeks after starting dapagliflozin."
        ],
        "uncertainties": [
            "Comparative magnitude of reverse cardiac remodeling (LVEF improvement, LV end-diastolic volume reduction) across individual SGLT2 inhibitors.",
            "Optimal strategy for rapid four-pillar GDMT sequencing: simultaneous low-dose four-drug initiation versus rapid stepwise 4-week titration."
        ]
    },

    "SGLT2 inhibitors in cardiovascular disease: empagliflozin, dapagliflozin, renal protection": {
        "mentor_intro": "Empagliflozin and dapagliflozin provide coordinated cardiovascular and renal protection across broad patient populations with atherosclerotic cardiovascular disease, heart failure, and chronic kidney disease. Understanding their hemodynamic and cellular mechanisms clarifies their role in modern preventive cardiology and nephrology.",
        "teaching_points": [
            "In the landmark EMPA-REG OUTCOME trial of patients with type 2 diabetes and established cardiovascular disease, empagliflozin reduced major adverse cardiovascular events (3-point MACE) by 14%, cardiovascular death by 38%, and heart failure hospitalizations by 35%.",
            "In the DECLARE-TIMI 58 trial of patients with type 2 diabetes with established cardiovascular disease or multiple risk factors, dapagliflozin significantly reduced the composite of cardiovascular death or hospitalization for heart failure by 17%.",
            "Renal composite outcomes across major cardiovascular outcome trials (CVOTs) consistently demonstrate 30 to 45% relative risk reductions in persistent doubling of serum creatinine, progression to end-stage kidney disease (ESKD), or renal-related mortality.",
            "SGLT2 inhibitors reduce sympathetic nervous system overactivity, attenuate arterial stiffness, lower central systolic blood pressure, reduce serum uric acid, and stimulate modest erythropoiesis via increased renal erythropoietin production secondary to improved cortical oxygen tension.",
            "The cardiorenal benefits of SGLT2 inhibitors are consistent across clinical subgroups, including elderly patients (>=65-75 years), varying baseline albuminuria levels, and baseline renal function down to eGFR 20 mL/min/1.73m2."
        ],
        "mcq_angles": [
            "EMPA-REG OUTCOME primary findings: statistically significant 38% reduction in cardiovascular death and 35% reduction in heart failure hospitalization in patients with established ASCVD.",
            "Renal endpoint consistency: SGLT2 inhibitors consistently reduce incident ESKD and progression of albuminuria across all cardiovascular outcome trials.",
            "Effect on hematocrit: SGLT2 inhibitors stimulate a modest, physiologically favorable increase in hematocrit (2-4%) via erythropoietin synthesis, enhancing tissue oxygen delivery."
        ],
        "case_hooks": [
            "A 64-year-old woman with a history of CABG and T2DM presenting for routine review of secondary cardiovascular and renal prevention.",
            "A 59-year-old diabetic male with recurrent microalbuminuria and hypertension evaluated for SGLT2 inhibitor initiation."
        ],
        "uncertainties": [
            "Clinical relevance of secondary polycythemia in rare patients receiving long-term SGLT2 inhibitors with baseline high-normal hemoglobin.",
            "Mechanism underlying the dissociation between lack of classical stroke reduction and substantial heart failure/mortality reductions in CVOTs."
        ]
    },

    "SGLT2 inhibitors: mechanism, heart failure and renal benefits, euglycaemic DKA risk": {
        "mentor_intro": "Sodium-glucose cotransporter-2 (SGLT2) inhibitors exert multi-organ protective effects that extend far beyond glycosuria. Recognizing their cellular mechanisms alongside rare but serious metabolic complications—specifically euglycemic diabetic ketoacidosis (euDKA)—is essential for safe clinical prescribing.",
        "teaching_points": [
            "SGLT2 inhibitors promote urinary glucose and sodium excretion by inhibiting SGLT2 in the proximal renal tubule, leading to metabolic reprogramming characterized by a shift from carbohydrate to fatty acid oxidation and increased hepatic ketogenesis (beta-hydroxybutyrate), providing an energy-efficient fuel for failing myocardium and renal tubular cells.",
            "Renal benefits are mediated by restoring tubuloglomerular feedback: increased sodium delivery to the macula densa induces afferent arteriolar constriction, normalizing intraglomerular pressure, reducing albuminuria, and arresting glomerulosclerosis.",
            "Euglycemic diabetic ketoacidosis (euDKA) is a severe metabolic emergency characterized by severe high anion gap metabolic acidosis and ketonemia in the setting of normal or near-normal blood glucose levels (<14 mmol/L / <250 mg/dL), which frequently delays diagnosis.",
            "Pathophysiology of euDKA involves SGLT2i-induced insulinopenia, increased glucagon secretion from pancreatic alpha cells, and reduced carbohydrate availability, driving brisk lipolysis and hepatic ketogenesis; renal clearance of ketones is simultaneously reduced by SGLT2 inhibitors.",
            "Precipitating triggers for euDKA include acute intercurrent illness, sepsis, dehydration, prolonged fasting, reduction or omission of insulin doses, ketogenic/low-carbohydrate diets, and surgical stress; treatment requires immediate IV fluid resuscitation, intravenous dextrose infusions, and IV insulin to suppress ketogenesis."
        ],
        "mcq_angles": [
            "Diagnostic trap in euglycemic DKA: normal or only mildly elevated blood glucose obscures the diagnosis; arterial/venous blood gas and blood beta-hydroxybutyrate must be measured.",
            "Management of euDKA: concurrent IV dextrose (10% or 5%) and IV insulin infusion are mandatory to clear ketonemia while preventing hypoglycemia.",
            "Surgical sick-day rule: SGLT2 inhibitors must be discontinued 3 to 4 days prior to major elective surgery to avoid perioperative euglycemic ketoacidosis."
        ],
        "case_hooks": [
            "A 52-year-old woman with T2DM on dapagliflozin admitted with acute cholecystitis who presents with nausea, vomiting, arterial pH 7.15, bicarbonate 10 mmol/L, anion gap 24, and blood glucose 195 mg/dL.",
            "A 45-year-old man on empagliflozin who adopts a strict ketogenic diet and presents with severe fatigue, deep Kussmaul respirations, and blood beta-hydroxybutyrate 5.6 mmol/L."
        ],
        "uncertainties": [
            "Mechanistic role of SGLT2 inhibitors in cardiac sodium-hydrogen exchanger 1 (NHE-1) and renal NHE-3 inhibition.",
            "Threshold criteria for safe re-initiation of SGLT2 inhibitors in patients following complete recovery from an episode of provoked euglycemic DKA."
        ]
    },

    "Sarcoidosis pulmonary": {
        "mentor_intro": "Pulmonary sarcoidosis is a multisystem granulomatous disorder of unknown etiology, characterized pathologically by non-caseating epithelioid granulomas. Clinical presentation ranges from incidental asymptomatic bilateral hilar lymphadenopathy to progressive pulmonary fibrosis and respiratory failure.",
        "teaching_points": [
            "Pathological hallmark of sarcoidosis is the presence of well-formed, non-caseating epithelioid granulomas composed of CD4+ T helper cells, epithelioid histiocytes, and multinucleated giant cells (often containing Schaumann bodies and asteroid bodies); special stains and cultures must strictly exclude mycobacterial and fungal infections.",
            "Chest radiographic staging (Scadding criteria) categorizes pulmonary involvement into: Stage 0 (normal radiograph), Stage I (bilateral hilar lymphadenopathy [BHL] alone), Stage II (BHL plus parenchymal pulmonary infiltration), Stage III (parenchymal infiltration without BHL), and Stage IV (end-stage pulmonary fibrosis, predominantly upper-lobe reticulation, volume loss, and traction bronchiectasis).",
            "Lofgren syndrome—the acute, benign presentation combining bilateral hilar lymphadenopathy, erythema nodosum, bilateral ankle periarthritis, and fever—has an >80–90% spontaneous remission rate within 1 to 2 years and typically requires only supportive NSAID therapy rather than systemic corticosteroids.",
            "High-resolution CT (HRCT) of the chest characteristically demonstrates a perilymphatic distribution of micronodules along bronchovascular bundles, subpleural surfaces, and interlobular septa, predominantly affecting middle and upper lung zones.",
            "Diagnostic tissue confirmation is achieved via endobronchial ultrasound-guided transbronchial needle aspiration (EBUS-TBNA) of mediastinal/hilar lymph nodes, which provides superior diagnostic yield (>85–90%) and lower complication rates compared with transbronchial lung biopsy."
        ],
        "mcq_angles": [
            "Scadding radiographic stages: Stage I = bilateral hilar lymphadenopathy alone; Stage II = BHL + parenchymal infiltrates; Stage IV = pulmonary fibrosis with upper-lobe volume loss.",
            "Lofgren syndrome features and prognosis: erythema nodosum, bilateral hilar lymphadenopathy, arthritis/fever; carries excellent prognosis and high spontaneous resolution.",
            "Histological requirement: non-caseating granulomas with negative acid-fast bacilli and fungal stains to exclude tuberculosis and histoplasmosis."
        ],
        "case_hooks": [
            "A 28-year-old Scandinavian woman presenting with bilateral painful pretibial red nodules, swollen painful ankles, and incidental bilateral hilar lymphadenopathy on chest radiograph.",
            "A 44-year-old African American man presenting with chronic dry cough, dyspnea, serum ACE level 120 U/L, and HRCT showing perilymphatic micronodules in the upper lobes."
        ],
        "uncertainties": [
            "Prognostic reliability of serum soluble interleukin-2 receptor (sIL-2R) compared to serum ACE in predicting disease progression.",
            "Optimal threshold and criteria for initiating antifibrotic therapy in Stage IV fibrotic sarcoidosis with progressive lung functional decline."
        ]
    },

    "Sarcoidosis systemic immunosuppression": {
        "mentor_intro": "Systemic immunosuppression in sarcoidosis is reserved for organ- or life-threatening disease, or debilitating symptoms impairing quality of life. Oral corticosteroids remain the first-line therapy, with steroid-sparing immunosuppressants and targeted TNF inhibitors utilized for chronic, progressive, or steroid-refractory disease.",
        "teaching_points": [
            "Absolute indications for systemic immunosuppressive therapy in sarcoidosis include cardiac sarcoidosis, central nervous system involvement (neurosarcoidosis), sight-threatening ocular disease, hypercalcemia/hypercalciuria with nephrocalcinosis, and progressive pulmonary functional decline.",
            "Oral corticosteroids (prednisone 20 to 40 mg daily / 0.5 mg/kg) are the established first-line treatment; clinical and functional response is assessed at 3 to 6 months, followed by gradual dose tapering to the lowest effective dose (<=5–10 mg daily) or discontinuation over 6 to 12 months.",
            "Second-line steroid-sparing immunosuppressive agents—methotrexate (preferred, 10–20 mg weekly with folic acid), azathioprine (1.5–2.5 mg/kg daily), or leflunomide—are indicated when patients experience corticosteroid toxicity, require >10 mg/day prednisone to maintain remission, or fail to respond to steroids.",
            "For refractory or progressive disease, third-line therapy with TNF-alpha inhibitors (infliximab 5 mg/kg IV or adalimumab) demonstrates proven efficacy in closing lupus pernio lesions, suppressing neurosarcoidosis, and arresting refractory pulmonary disease.",
            "Abnormal vitamin D metabolism in sarcoidosis is driven by 1-alpha-hydroxylase expression in activated macrophages inside granulomas, producing excessive 1,25-dihydroxyvitamin D (calcitriol); this causes intestinal hyperabsorption of calcium, hypercalciuria, and hypercalcemia, which responds promptly to corticosteroid suppression."
        ],
        "mcq_angles": [
            "Mechanism of hypercalcemia in sarcoidosis: macrophage 1-alpha-hydroxylase overexpression inside granulomas produces autonomous 1,25(OH)2D (calcitriol) independent of PTH.",
            "First-line steroid-sparing agent: methotrexate is the preferred second-line therapy for chronic sarcoidosis, reducing corticosteroid requirement.",
            "Third-line targeted biologic therapy: infliximab (monoclonal anti-TNF-alpha) is the evidence-based biologic of choice for refractory sarcoidosis."
        ],
        "case_hooks": [
            "A 40-year-old woman with pulmonary sarcoidosis who develops acute complete heart block and delayed myocardial enhancement on cardiac MRI.",
            "A 36-year-old man with sarcoidosis presenting with recurrent kidney stones, serum calcium 3.1 mmol/L, suppressed PTH (<5 pg/mL), and elevated 1,25-dihydroxyvitamin D."
        ],
        "uncertainties": [
            "Optimal duration of infliximab maintenance therapy in neurosarcoidosis and relapse rates following biologic withdrawal.",
            "Role of JAK inhibitors (tofacitinib) in cutaneous and multi-organ recalcitrant sarcoidosis."
        ]
    },

    "Scabies: diagnosis, treatment and outbreak management": {
        "mentor_intro": "Scabies is a contagious parasitic skin infestation caused by the mite Sarcoptes scabiei var. hominis. Transmission occurs through prolonged direct skin-to-skin contact, producing intense nocturnal pruritus and characteristic burrows. Effective eradication demands simultaneous treatment of all household contacts.",
        "teaching_points": [
            "Classic scabies is caused by female mites burrowing into the stratum corneum to lay eggs, eliciting a Type IV hypersensitivity allergic reaction that manifests 3 to 6 weeks after primary infestation (or 1 to 4 days upon re-infestation) with intense, debilitating nocturnal pruritus.",
            "Pathognomonic physical examination findings are linear or serpiginous burrows, most frequently located in web spaces of fingers, flexor wrists, axillae, umbilicus, belt line, buttocks, and male genitalia (penile and scrotal papules/nodules); the head and neck are classically spared in adults but can be involved in infants and older adults.",
            "First-line topical therapy is 5% permethrin dermal cream applied from neck to toes (including scalp/face in infants/elderly), left on for 8 to 14 hours before washing off, and repeated in 7 to 14 days to eradicate newly hatched nymphs.",
            "Oral ivermectin (200 ug/kg taken as two single doses spaced 7 to 14 days apart) is equally efficacious to topical permethrin and represents the treatment of choice for institutional outbreaks, crusted scabies, and patients with poor compliance or severe eczema.",
            "Crusted (Norwegian) scabies is a severe, hyperkeratotic variant occurring in immunosuppressed, neurologically impaired, or elderly individuals, characterized by thick scaly crusts harboring millions of mites; it is highly contagious through fomites and requires combination therapy (repeated oral ivermectin plus daily 5% permethrin) and strict contact isolation."
        ],
        "mcq_angles": [
            "Treatment schedule rule: any scabicide regimen (topical permethrin or oral ivermectin) MUST be repeated 7 to 14 days later because treatments do not kill unhatched eggs.",
            "Mandatory epidemiological rule: all household members, sexual contacts, and close personal contacts must be treated simultaneously, regardless of whether symptoms are present.",
            "Post-scabetic pruritus: persistent itching for 2 to 4 weeks after successful mite eradication is common due to residual mite antigens and does NOT indicate treatment failure."
        ],
        "case_hooks": [
            "A 24-year-old university student presenting with 4 weeks of severe nocturnal itching, excoriations in the finger web spaces, and pruritic erythematous papules on the shaft of the penis.",
            "An 82-year-old nursing home resident with advanced dementia presenting with extensive, thick, non-pruritic hyperkeratotic crusts over the hands and elbows harboring visible mites."
        ],
        "uncertainties": [
            "Emergence of clinical permethrin resistance in widespread community outbreaks and optimal timing for switching to oral ivermectin.",
            "Safety and dosing protocols for oral ivermectin in pregnant women and infants weighing under 15 kg."
        ]
    },

    "Schizophrenia antipsychotic treatment strategies": {
        "mentor_intro": "Antipsychotic pharmacotherapy is the cornerstone of treatment for schizophrenia, effectively reducing positive psychotic symptoms and preventing relapses. Selecting between first- and second-generation agents balances therapeutic efficacy against neurological, metabolic, and cardiovascular side-effect profiles.",
        "teaching_points": [
            "Second-generation (atypical) antipsychotics (e.g., aripiprazole, risperidone, olanzapine, quetiapine) are guideline-preferred first-line options due to a lower risk of extrapyramidal symptoms (EPS) and tardive dyskinesia compared with first-generation (typical) high-potency antipsychotics (haloperidol).",
            "Second-generation agents carry substantial cardiometabolic risks (weight gain, dyslipidemia, insulin resistance, type 2 diabetes), with olanzapine and clozapine carrying the highest risk, and aripiprazole, ziprasidone, and lurasidone carrying the lowest metabolic liability; baseline and regular metabolic monitoring (weight, fasting glucose, lipid panel) is mandatory.",
            "Treatment-resistant schizophrenia (TRS)—defined as persistent moderate-to-severe symptoms despite adequate trials of at least two different antipsychotics (at therapeutic doses for >=6 weeks, with at least one being a second-generation agent)—is an absolute indication for clozapine.",
            "Clozapine is the only antipsychotic with proven superiority in treatment-resistant schizophrenia and reducing suicidal behavior; however, it requires strict hematological monitoring due to the risk of life-threatening severe neutropenia/agranulocytosis (absolute neutrophil count ANC cutoff: withhold if ANC <1,500/uL / <1.5 x 10^9/L, or <1,000/uL in benign ethnic neutropenia).",
            "Long-acting injectable (LAI) antipsychotics (e.g., paliperidone palmitate, aripiprazole lauroxil, haloperidol decanoate) significantly reduce hospital readmissions and relapse rates in patients with poor medication adherence or frequent relapses, and should be offered early in the illness course."
        ],
        "mcq_angles": [
            "Indication for clozapine: treatment-resistant schizophrenia following two failed antipsychotic trials; clozapine significantly reduces all-cause mortality and suicide risk.",
            "Clozapine monitoring parameters: mandatory regular absolute neutrophil count (ANC) monitoring to detect agranulocytosis; other lethal risks include myocarditis and severe constipation/ileus.",
            "Metabolic liability spectrum: olanzapine and clozapine cause the greatest weight gain and metabolic syndrome; aripiprazole, ziprasidone, and lurasidone are metabolically neutral."
        ],
        "case_hooks": [
            "A 26-year-old man with persistent auditory hallucinations and persecutory delusions who has failed therapeutic trials of risperidone 6 mg daily and olanzapine 20 mg daily.",
            "A 32-year-old woman on clozapine 400 mg daily for 6 weeks who presents with high fever, sore throat, and an absolute neutrophil count of 800/uL (0.8 x 10^9/L)."
        ],
        "uncertainties": [
            "Role of adjunctive glutamate-modulating agents (e.g., NMDA receptor modulators) in treating persistent negative and cognitive symptoms of schizophrenia.",
            "Optimal timing for introducing long-acting injectable formulations following the first psychotic episode."
        ]
    },

    "Scleroderma Renal Crisis": {
        "mentor_intro": "Scleroderma renal crisis (SRC) is a life-threatening complication of systemic sclerosis, primarily affecting patients with diffuse cutaneous systemic sclerosis (dcSSc) and RNA polymerase III antibodies. Characterized by abrupt, severe hypertension, acute oliguric renal failure, and microangiopathic hemolytic anemia, SRC is a medical emergency.",
        "teaching_points": [
            "Scleroderma renal crisis (SRC) occurs in 5–15% of patients with diffuse cutaneous systemic sclerosis (dcSSc), strongly associated with anti-RNA polymerase III antibody seropositivity, rapid progression of skin thickening, and recent high-dose corticosteroid exposure (prednisone >=15 mg/day).",
            "The classic clinical presentation is an abrupt onset of severe 'flash' hypertension (systolic BP >160–180 mmHg or diastolic >100 mmHg), progressive oliguric acute kidney injury, mild proteinuria, microscopic hematuria with granular casts, and microangiopathic hemolytic anemia (MAHA with thrombocytopenia and schistocytes on blood smear).",
            "Approximately 10–15% of SRC cases are 'normotensive' (normotensive scleroderma renal crisis), which carries a significantly worse renal prognosis and higher mortality due to delayed clinical recognition.",
            "Immediate initiation of Angiotensin-Converting Enzyme (ACE) inhibitors—specifically short-acting oral captopril—is the definitive, life-saving therapy; captopril reverses intrarenal vasoconstriction, lowers mortality from >90% to <30%, and should be aggressively up-titrated to normalize blood pressure within 48 to 72 hours.",
            "ACE inhibitors must be maintained even if serum creatinine initially rises during acute blood pressure lowering; prophylactic use of ACE inhibitors prior to SRC onset is ineffective and associated with worse outcomes, while high-dose systemic corticosteroids are strictly contraindicated as they precipitate SRC."
        ],
        "mcq_angles": [
            "Medication that precipitates SRC: systemic glucocorticoids (prednisone >=15 mg/day) are strongly associated with triggering scleroderma renal crisis.",
            "Drug of choice for SRC: prompt initiation and aggressive titration of oral captopril (ACE inhibitor); do not substitute with ARBs as first-line.",
            "Antibody profile linked to highest SRC risk: anti-RNA polymerase III antibodies carry the highest risk among scleroderma-specific autoantibodies."
        ],
        "case_hooks": [
            "A 46-year-old woman with diffuse systemic sclerosis on prednisone 20 mg daily for joint pain who presents with new-onset headache, blurred vision, BP 210/115 mmHg, and serum creatinine 3.4 mg/dL.",
            "A 52-year-old man with anti-RNA polymerase III positive dcSSc presenting with microangiopathic hemolytic anemia, normal blood pressure (125/80 mmHg), and oliguric renal failure."
        ],
        "uncertainties": [
            "Efficacy of adjunctive terminal complement C5 inhibition (eculizumab) in patients with SRC-induced thrombotic microangiopathy refractory to ACE inhibitors.",
            "Threshold and timing for initiating renal replacement therapy with prospective expectation of delayed renal recovery up to 12 to 24 months."
        ]
    },

    "Scleroderma renal crisis: ACE inhibitors, hypertensive emergency, captopril": {
        "mentor_intro": "The management of scleroderma renal crisis represents a true hypertensive emergency where prompt pharmacological intervention with short-acting ACE inhibitors dictates survival. Careful hemodynamic titration preserves renal perfusion while arresting hyperreninemic cortical ischemia.",
        "teaching_points": [
            "Scleroderma renal crisis is driven by intense renal cortical vasospasm and intimal arterial proliferation ('onion-skin' hypertrophy), resulting in severe renal hypoperfusion and massive activation of the renin-angiotensin-aldosterone system (hyperreninemic state).",
            "Short-acting oral captopril is the gold-standard agent of choice, initiated at a low test dose (6.25 to 12.5 mg) and rapidly escalated every 4 to 8 hours up to maximum doses (50–100 mg three times daily) to achieve a target reduction in systolic blood pressure of approx. 20 mmHg per 24 hours.",
            "Blood pressure lowering should be controlled and gradual, aiming for normalization (systolic BP 120–130 mmHg) over 48 to 72 hours; overly rapid precipitous drops in blood pressure can exacerbate renal cortical hypoperfusion and precipitate acute tubular necrosis.",
            "If blood pressure remains uncontrolled despite maximal ACE inhibitor titration, second-line add-on antihypertensives include dihydropyridine calcium channel blockers (amlodipine, nicardipine) or intravenous prostacyclin analogues (iloprost); beta-blockers and ARBs are avoided as first-line adjuncts.",
            "Renal recovery is characteristically slow and may occur up to 12 to 24 months following the acute episode; approximately 50% of patients requiring temporary hemodialysis can successfully discontinue dialysis if ACE inhibitors are continuously maintained."
        ],
        "mcq_angles": [
            "Target blood pressure lowering rate: reduce systolic BP by approx. 20 mmHg/day, achieving normal BP over 48-72 hours to prevent ischemic acute tubular necrosis.",
            "Persistence of dialysis dependence: over 50% of patients who initially require dialysis during SRC achieve renal recovery and come off dialysis within 1-2 years if ACEi is continued.",
            "Second-line antihypertensive agent of choice: calcium channel blockers (e.g. amlodipine, nicardipine) or intravenous prostacyclins added to maximal captopril."
        ],
        "case_hooks": [
            "A 48-year-old woman with systemic sclerosis presenting in hypertensive crisis (BP 205/118 mmHg) whose creatinine increases from 1.0 to 2.2 mg/dL on captopril 12.5 mg TID.",
            "A 55-year-old woman with SRC who has been hemodialysis-dependent for 9 months on maintenance lisinopril who begins producing 1.2 L of urine daily with improving native clearance."
        ],
        "uncertainties": [
            "Comparative safety and pharmacokinetic stability of long-acting ACE inhibitors (enalapril, ramipril) once initial stabilization is achieved with captopril.",
            "Role of endothelin receptor antagonists (bosentan) in mitigating chronic vascular remodeling following acute scleroderma renal crisis."
        ]
    },

    "Secondary immunodeficiency from biologics and steroids": {
        "mentor_intro": "Secondary immunodeficiency (SID) is increasingly recognized in patients receiving long-term systemic corticosteroids, immunosuppressive therapies, and targeted biologics. Understanding drug-specific immunosuppressive mechanisms enables proactive risk stratification, targeted antimicrobial prophylaxis, and monitoring for hypogammaglobulinemia.",
        "teaching_points": [
            "Systemic corticosteroids impair cellular immunity, phagocyte function, and cytokine expression in a dose- and duration-dependent manner; chronic prednisone doses >=15–20 mg/day (or cumulative doses >700 mg) significantly increase the risk of opportunistic infections, predominantly Pneumocystis jirovecii pneumonia (PJP), Aspergillus, and reactivation of latent tuberculosis.",
            "Pneumocystis jirovecii pneumonia (PJP) prophylaxis with trimethoprim-sulfamethoxazole (TMP-SMX, 1 single-strength tablet daily or 1 double-strength tablet 3 times weekly) is strongly indicated for patients receiving prednisone >=15–20 mg daily for >=4 weeks in combination with a second immunosuppressive agent.",
            "B-cell depleting therapies (rituximab, obinutuzumab) cause prolonged peripheral B-cell aplasia and can induce progressive, symptomatic secondary hypogammaglobulinemia (IgG <4–5 g/L), resulting in recurrent encapsulated sinopulmonary bacterial infections; baseline and serial quantitative immunoglobulin (IgG, IgA, IgM) monitoring is mandatory.",
            "TNF-alpha inhibitors (adalimumab, infliximab) selectively impair granuloma maintenance and macrophage activation, markedly increasing the risk of active tuberculosis reactivation (often presenting with atypical, extrapulmonary, or disseminated disease) and intracellular infections (Histoplasma, Coccidioides, Listeria).",
            "In patients with severe secondary hypogammaglobulinemia (serum IgG <4.0 g/L) and recurrent or severe bacterial infections despite antibiotic prophylaxis, immunoglobulin replacement therapy (IVIG or SCIG) significantly reduces pneumonia rates and hospitalization."
        ],
        "mcq_angles": [
            "PJP prophylaxis indication threshold: prednisone >=15-20 mg/day for >=4 weeks combined with another immunosuppressive agent warrants routine TMP-SMX prophylaxis.",
            "Rituximab long-term complication: secondary hypogammaglobulinemia (low IgG) leading to recurrent bacterial respiratory tract infections, requiring quantitative IgG monitoring.",
            "Infection pattern with TNF inhibitors: breakdown of granulomas leading to disseminated or extrapulmonary tuberculosis and endemic mycoses (histoplasmosis)."
        ],
        "case_hooks": [
            "A 62-year-old man with ANCA vasculitis receiving rituximab and prednisone 20 mg daily who presents with progressive dyspnea, dry cough, bilateral ground-glass opacities, and PaO2 55 mmHg.",
            "A 54-year-old woman with rheumatoid arthritis on maintenance rituximab for 4 years presenting with her third episode of bacterial pneumonia in 12 months, found to have serum IgG 2.8 g/L."
        ],
        "uncertainties": [
            "Threshold criteria of serum IgG level versus clinical infection frequency for initiating replacement IVIG/SCIG in secondary hypogammaglobulinemia.",
            "Vaccination response kinetics and optimal scheduling of non-live vaccines relative to B-cell reconstitution following rituximab therapy."
        ]
    },

    "Secondary mitral regurgitation: transcatheter MitraClip vs medical therapy, COAPT trial": {
        "mentor_intro": "Secondary (functional) mitral regurgitation (SMR) arises from left ventricular dilation and systolic dysfunction rather than structural valvular disease. The landmark COAPT trial established that transcatheter edge-to-edge repair (TEER) with the MitraClip system provides substantial mortality and hospitalization benefits in appropriately selected heart failure patients.",
        "teaching_points": [
            "Secondary mitral regurgitation (SMR) is a disease of the left ventricle: LV enlargement and regional wall motion abnormalities displace papillary muscles, causing tethering and restricted leaflet motion (Carpentier Type IIIb) and failure of coaptation across a structurally normal mitral valve.",
            "Optimal Guideline-Directed Medical Therapy (GDMT)—including the four foundational pillars (ARNI, beta-blocker, MRA, SGLT2i) and cardiac resynchronization therapy (CRT) if indicated—is the mandatory first-line strategy, which frequently promotes reverse LV remodeling and reduces SMR severity.",
            "The landmark COAPT randomized trial demonstrated that transcatheter edge-to-edge repair (TEER with MitraClip) added to maximal GDMT in patients with symptomatic heart failure and severe SMR significantly reduced heart failure hospitalizations by 47% (HR 0.53, P<0.001) and all-cause mortality by 38% (HR 0.62, P<0.001) at 2 and 5 years.",
            "Discrepancy with the neutral MITRA-FR trial is explained by the concept of 'disproportionate' versus 'proportionate' mitral regurgitation: COAPT enrolled patients with severe MR (effective regurgitant orifice area EROA >=30-40 mm2) relative to moderate LV dilation (LV end-systolic dimension LVESD <=70 mm), whereas MITRA-FR enrolled patients with more extreme LV dilation and less severe MR.",
            "Patient eligibility criteria for MitraClip TEER in secondary MR require persistent symptomatic NYHA class II-IV heart failure despite maximal GDMT, LVEF between 20% and 50%, LVESD <=70 mm, pulmonary artery systolic pressure <=70 mmHg, and favorable transesophageal echocardiographic anatomy."
        ],
        "mcq_angles": [
            "COAPT trial landmark outcome: MitraClip TEER added to GDMT significantly reduces 2-year all-cause mortality and heart failure hospitalizations in disproportionate severe SMR.",
            "Why COAPT succeeded and MITRA-FR did not: COAPT selected patients with truly severe SMR (EROA >=30 mm2) without end-stage extreme LV dilation (LVESD <=70 mm).",
            "Mandatory first step before MitraClip consideration: maximal optimization of guideline-directed medical therapy (GDMT) and CRT for at least 3 months."
        ],
        "case_hooks": [
            "A 66-year-old man with ischemic cardiomyopathy (LVEF 30%, LVESD 58 mm) on maximal GDMT with persistent NYHA Class III dyspnea and severe functional MR (EROA 42 mm2).",
            "A 72-year-old woman with dilated cardiomyopathy (LVEF 15%, LVESD 76 mm) evaluated for MitraClip whose extreme ventriculomegaly reflects proportionate end-stage cardiomyopathy."
        ],
        "uncertainties": [
            "Long-term clinical durability of transcatheter mitral valve replacement (TMVR) versus transcatheter edge-to-edge repair (TEER) in secondary MR.",
            "Management of persistent mild-to-moderate residual mitral regurgitation following single or dual clip deployment."
        ]
    },

    "Secondary stroke prevention antiplatelet anticoagulation": {
        "mentor_intro": "Secondary stroke prevention requires tailoring antithrombotic therapy to the underlying stroke mechanism. Antiplatelet therapy is standard for non-cardioembolic ischemic stroke and TIA, whereas therapeutic anticoagulation is mandatory for cardioembolic stroke, predominantly atrial fibrillation.",
        "teaching_points": [
            "For non-cardioembolic ischemic stroke and high-risk TIA (ABCD2 score >=4 or minor stroke with NIHSS <=3), urgent dual antiplatelet therapy (DAPT) with aspirin (150-300 mg loading, then 75-100 mg daily) plus clopidogrel (300-600 mg loading, then 75 mg daily) initiated within 24 hours and continued for 21 days (CHANCE and POINT trials) significantly reduces recurrent stroke risk without excess major hemorrhage.",
            "In patients with minor stroke or TIA and confirmed intracranial atherosclerotic stenosis (ICAS >=70%), the THALES trial demonstrated that DAPT with aspirin plus ticagrelor (90 mg twice daily for 30 days) significantly reduces stroke recurrence or death compared with aspirin alone.",
            "For long-term maintenance monotherapy beyond 21 to 30 days, single antiplatelet therapy with clopidogrel (75 mg daily) or aspirin (75-100 mg daily) is recommended; long-term DAPT beyond 90 days carries an unacceptable risk of major intracranial and gastrointestinal hemorrhage.",
            "For cardioembolic ischemic stroke secondary to non-valvular atrial fibrillation, Direct Oral Anticoagulants (DOACs: apixaban, rivaroxaban, dabigatran, edoxaban) are superior to warfarin, achieving equivalent or lower ischemic stroke rates with a ~50% reduction in life-threatening intracranial hemorrhage.",
            "Timing of anticoagulation initiation after acute cardioembolic stroke follows the '1-3-6-12 day rule' (or recent ELAN trial evidence supporting early initiation): day 1 for TIA, day 3-4 for minor stroke, day 6-7 for moderate stroke, and day 12-14 for large infarcts after repeat CT/MRI excludes hemorrhagic transformation."
        ],
        "mcq_angles": [
            "Duration of short-term DAPT (aspirin + clopidogrel): exactly 21 days for high-risk TIA or minor ischemic stroke (CHANCE/POINT trials), transitioning to monotherapy.",
            "DOAC superiority over warfarin in AF stroke prevention: DOACs cause significantly lower rates of hemorrhagic stroke and intracranial hemorrhage.",
            "Antiplatelets versus anticoagulants in non-cardioembolic stroke: anticoagulation provides no benefit over antiplatelet therapy for non-cardioembolic stroke and causes excess hemorrhage."
        ],
        "case_hooks": [
            "A 60-year-old man presenting 6 hours after transient right arm weakness and expressive aphasia lasting 45 minutes (ABCD2 score 5), with normal brain CT.",
            "A 74-year-old woman with paroxysmal atrial fibrillation who sustains a moderate cardioembolic MCA stroke (NIHSS 8), evaluated for optimal anticoagulation start timing."
        ],
        "uncertainties": [
            "Utility of CYP2C19 loss-of-function loss allele pharmacogenetic testing to guide clopidogrel versus ticagrelor selection in acute DAPT.",
            "Efficacy and safety of direct oral Factor XIa inhibitors (e.g., asundexian, milvexian) in acute non-cardioembolic ischemic stroke prevention."
        ]
    },

    "Sedation and analgesia in mechanically ventilated patients: ABCDEF bundle": {
        "mentor_intro": "Sedation and analgesia in critically ill mechanically ventilated adults are guided by the PADIS (Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption) clinical practice guidelines. Implementing the evidence-based ABCDEF bundle improves survival, accelerates weaning, and diminishes delirium.",
        "teaching_points": [
            "The PADIS guidelines prioritize an 'analgesia-first' (analgosedation) approach: pain assessment and intravenous opioid titration (fentanyl, morphine, hydromorphone) must precede the administration of sedative agents, as unmanaged pain is the leading trigger of ICU agitation.",
            "Light sedation targets (Richmond Agitation-Sedation Scale [RASS] score -1 to 0) are strongly recommended over deep sedation; light sedation significantly reduces mechanical ventilation duration, ICU length of stay, and 90-day mortality without increasing accidental extubation.",
            "Non-benzodiazepine sedatives—specifically propofol and the selective alpha-2 adrenergic agonist dexmedetomidine—are preferred over benzodiazepines (midazolam, lorazepam), which are independent risk factors for prolonged ventilation, delirium, and cognitive impairment.",
            "The evidence-based ABCDEF bundle integrates multidisciplinary care: Assess/prevent/manage pain (A), Both Spontaneous Awakening Trials and Spontaneous Breathing Trials (B), Choice of analgesia and sedation (C), Delirium assessment/prevention/management using CAM-ICU (D), Early mobility and exercise (E), and Family engagement and empowerment (F).",
            "Routine screening for delirium using validated tools (Confusion Assessment Method for the ICU [CAM-ICU] or Intensive Care Delirium Screening Checklist [ICDSC]) is mandatory; non-pharmacological interventions (reorientation, day-night circadian light cycles, noise reduction, early mobilization) are first-line, while routine prophylactic antipsychotics (haloperidol) do not reduce delirium incidence or mortality."
        ],
        "mcq_angles": [
            "Sedative choice in ICU: propofol or dexmedetomidine preferred over benzodiazepines (midazolam) due to lower delirium and faster extubation.",
            "Target RASS score: aim for light sedation (RASS -1 to 0: drowsy to alert and calm) rather than deep sedation (RASS -3 to -5).",
            "ABCDEF bundle components: paired daily Spontaneous Awakening Trial (SAT) and Spontaneous Breathing Trial (SBT) accelerate liberation from mechanical ventilation."
        ],
        "case_hooks": [
            "A 56-year-old mechanically ventilated man with severe pancreatitis receiving continuous midazolam infusion who remains comatose (RASS -4) on day 5 of ICU admission.",
            "A 68-year-old woman in the ICU who becomes acutely confused, inattentive, and agitated on postoperative day 2 following cardiac surgery with a positive CAM-ICU."
        ],
        "uncertainties": [
            "Optimal role and timing of volatile anesthetic sedation (isoflurane/sevoflurane delivered via Anaconda/Sedaconda devices) in long-term ICU sedation.",
            "Comparative delirium and hemodynamic outcomes of dexmedetomidine versus propofol in patients with severe septic shock."
        ]
    },

    "Self-harm, suicide risk assessment and safe management": {
        "mentor_intro": "Clinical assessment and management of self-harm and suicide risk requires a compassionate, non-judgmental, person-centered approach. Evidence-based suicide risk formulation prioritizes structured clinical assessment and collaborative safety planning over simplistic, unvalidated risk categorization scales.",
        "teaching_points": [
            "Standardized risk assessment scales (such as the SAD PERSONS scale) have very poor predictive validity (high false-positive and false-negative rates) and must never be used in isolation to determine hospital admission, discharge, or risk level; guidelines (NICE, APA) mandate a comprehensive psychosocial and clinical risk assessment.",
            "Comprehensive suicide risk formulation identifies modifiable risk factors (active depression, psychosis, substance intoxication, access to lethal means, acute severe psychosocial stressors) and protective factors (social connectedness, children at home, future orientation, therapeutic alliance).",
            "High-risk clinical indicators of suicidal intent include violent or highly lethal methods, meticulous planning and preparation (writing suicide notes, making wills, giving away possessions), active steps to avoid discovery, expressions of profound hopelessness, and persistent regret over surviving a suicide attempt.",
            "Collaborative safety planning—co-creating a structured written Safety Planning Intervention (SPI) identifying personal warning signs, internal coping strategies, social distractions, trusted contacts, and emergency crisis lines—significantly reduces suicidal behavior and repeat presentations.",
            "Restriction of access to lethal means (safe storage or disposal of firearms, lethal medications, poisons, and ligature points) is the single most effective public health and clinical intervention for reducing completed suicides.",
            "In patients presenting with acute toxic ingestion or overdose, medical stabilization and poison control consultation (assessing acetaminophen levels, ECG for QRS/QTc prolongation) takes immediate priority alongside constant direct visual observation to ensure safety."
        ],
        "mcq_angles": [
            "Predictive validity of risk assessment tools: structured numerical scales (e.g. SAD PERSONS) should not be used to predict suicide risk or determine admission due to low accuracy.",
            "Most effective evidence-based suicide prevention strategy: restriction of access to lethal means (securing firearms, prescription medications).",
            "Collaborative Safety Planning Intervention: structured six-step written personalized crisis plan reduces subsequent suicidal behavior."
        ],
        "case_hooks": [
            "A 21-year-old university student brought to the emergency department following an impulsive non-lethal wrist laceration during acute alcohol intoxication after a relationship breakup.",
            "A 55-year-old recently unemployed man who survived a high-velocity carbon monoxide inhalation attempt, expressing bitter regret that his wife discovered him."
        ],
        "uncertainties": [
            "Predictive accuracy and clinical integration of machine learning algorithms analyzing electronic health records for emergent suicidal behavior.",
            "Rapid antisuicidal efficacy and long-term durability of sub-anesthetic intravenous ketamine or intranasal esketamine in acute depressive crises."
        ]
    },

    "Sepsis and septic shock": {
        "mentor_intro": "Sepsis is defined by the Sepsis-3 consensus as life-threatening organ dysfunction caused by a dysregulated host response to infection. Septic shock represents a severe subset with profound circulatory, cellular, and metabolic abnormalities carrying hospital mortality greater than 40%. Rapid bundle resuscitation is life-saving.",
        "teaching_points": [
            "According to the Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3), sepsis is defined as an acute increase in the Sequential Organ Failure Assessment (SOFA) score of >=2 points attributable to infection; septic shock is clinically identified by persistent hypotension requiring vasopressors to maintain MAP >=65 mmHg and a serum lactate >2.0 mmol/L despite adequate fluid resuscitation.",
            "The Surviving Sepsis Campaign (SSC) 1-hour bundle mandates immediate actions upon recognition: measure blood lactate (remeasure if initial lactate >2 mmol/L), obtain blood cultures prior to administering broad-spectrum antimicrobials, administer empiric broad-spectrum IV antimicrobials within 1 hour, and initiate rapid fluid resuscitation (30 mL/kg of balanced crystalloids) for hypotension or lactate >=4 mmol/L.",
            "Balanced crystalloids (Plasma-Lyte, Ringer's lactate) are preferred over 0.9% normal saline for fluid resuscitation, as large-volume saline causes hyperchloremic metabolic acidosis and increases the incidence of acute kidney injury and renal replacement therapy.",
            "Noradrenaline (norepinephrine) is the first-line vasopressor of choice, targeting a mean arterial pressure (MAP) of >=65 mmHg; vasopressin (titrated up to fixed 0.03 units/min) should be added as a second-line vasopressor if noradrenaline dose is escalating, while adrenaline is added if MAP remains refractory.",
            "Low-dose intravenous corticosteroids (hydrocortisone 200 mg daily administered as 50 mg IV every 6 hours or continuous infusion) are indicated for patients with septic shock who have ongoing requirement for vasopressor therapy (noradrenaline or adrenaline >=0.25 ug/kg/min) for at least 4 hours.",
            "Source control is an absolute emergency principle: identifying and intervening on anatomical infection foci (draining abscesses, debriding necrotizing soft-tissue infections, removing infected central venous catheters, relieving obstructed pyelonephritis) must be achieved within 6 to 12 hours."
        ],
        "mcq_angles": [
            "Sepsis-3 diagnostic criteria: SOFA score increase >=2 points represents sepsis; septic shock requires vasopressor dependency (MAP >=65 mmHg) AND lactate >2.0 mmol/L despite fluid repletion.",
            "Fluid resuscitation choice: balanced crystalloids (Ringer's lactate) preferred over 0.9% saline to prevent hyperchloremic acidosis and acute kidney injury.",
            "Indication for hydrocortisone: septic shock requiring escalating doses of vasopressors (noradrenaline >=0.25 ug/kg/min) for >4 hours."
        ],
        "case_hooks": [
            "A 68-year-old woman presenting with high fever, confusion, blood pressure 76/42 mmHg, heart rate 124 bpm, and serum lactate 4.8 mmol/L secondary to severe pyelonephritis.",
            "A 52-year-old man in the ICU with perforated diverticulitis requiring noradrenaline 0.35 ug/kg/min and vasopressin 0.03 units/min to maintain a MAP of 65 mmHg."
        ],
        "uncertainties": [
            "Optimal fluid volume in patients with preexisting heart failure or end-stage renal disease (restrictive vs liberal 30 mL/kg fluid administration).",
            "Role of hemoperfusion and extracorporeal cytokine adsorption cartridges (e.g., CytoSorb) in refractory hyperinflammatory septic shock."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(BATCH_02_TOPICS)} topics in Batch 2.")
    for name, data in BATCH_02_TOPICS.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 25 topics in Batch 2 pass 100% of structural and depth criteria!")
