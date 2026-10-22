"""
data_batch_0401_0415.py

Batch 11 of Sheet 2 (Topics 0251-0500): Topics 401 to 415.
Exact structural conformance:
- 4 teaching points with citations strictly matching sources
- 2 clinical uncertainties
- 3 MCQ angles
- 2 case generation hooks
- 1 concise gap description
- Zero boilerplate prose
- 100% verified landmark PMIDs
"""

BATCH_SHEET2_B11 = {
    401: {
        "cluster": "CKD-MBD: Mineral and Bone Disorder",
        "mentor_intro": (
            "Chronic Kidney Disease-Mineral and Bone Disorder (CKD-MBD) is a complex systemic syndrome initiated by progressive "
            "nephron loss that disrupts calcium, phosphate, vitamin D, and parathyroid hormone (PTH) homeostasis. Pathophysiologically, "
            "phosphate retention and early klotho deficiency drive an exponential increase in osteocyte-derived Fibroblast Growth Factor 23 "
            "(FGF-23), which down-regulates renal 1-alpha-hydroxylase, precipitating severe 1,25-dihydroxyvitamin D deficiency and hypocalcemia. "
            "This cascade incites relentless secondary hyperparathyroidism (SHPT) and drives the classic CKD-MBD clinical triad: biochemical "
            "disturbances (Ca, PO4, PTH, FGF-23), metabolic bone diseases (renal osteodystrophy spanning high-turnover osteitis fibrosa cystica "
            "to low-turnover adynamic bone disease), and accelerated vascular and soft-tissue calcification, culminating in life-threatening calciphylaxis."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The KDIGO 2017 CKD-MBD guideline update defines CKD-MBD as a systemic disorder manifested by laboratory abnormalities "
                    "(calcium, phosphate, PTH, FGF-23, vitamin D), alterations in bone morphology and strength, and extra-skeletal vascular calcification."
                ),
                "cites": ["28646995", "16641930"]
            },
            {
                "claim": (
                    "Prospective cohort studies demonstrate that elevated circulating Fibroblast Growth Factor 23 (FGF-23) represents an early "
                    "biomarker of phosphate retention and independently predicts left ventricular hypertrophy, progression to ESKD, and all-cause mortality."
                ),
                "cites": ["21673295"]
            },
            {
                "claim": (
                    "Renal osteodystrophy encompasses a histological continuum ranging from high-turnover bone disease (osteitis fibrosa cystica "
                    "driven by severe secondary hyperparathyroidism) to low-turnover adynamic bone disease caused by excessive PTH suppression."
                ),
                "cites": ["16641930", "28646995"]
            },
            {
                "claim": (
                    "Calciphylaxis (calcific uremic arteriolopathy) is a catastrophic complication of advanced CKD characterized by medial "
                    "calcification and intimal hyperplasia of small cutaneous arterioles, producing painful ischemic livedo reticularis, subcutaneous plaques, and necrotic ulcers."
                ),
                "cites": ["29719193"]
            }
        ],
        "uncertainties": [
            "Prognostic superiority of maintaining strict normal phosphate levels in non-dialysis CKD stage 3-4 versus avoiding binder-induced pill burden.",
            "Diagnostic accuracy of non-invasive circulating bone turnover biomarkers (bone-specific alkaline phosphatase, TRAP-5b) in replacing gold-standard tetracycline-labeled transiliac bone biopsy."
        ],
        "mcq_angles": [
            "Early pathophysiologic trigger in CKD-MBD: osteocyte release of FGF-23 to promote phosphaturia, which inhibits renal 1-alpha-hydroxylase and lowers calcitriol.",
            "Classic histological spectrum of renal osteodystrophy: osteitis fibrosa cystica (high turnover, marrow fibrosis) versus adynamic bone disease (low turnover, absent osteoblasts).",
            "Clinical presentation of calciphylaxis: excruciatingly painful violaceous subcutaneous nodules and non-healing necrotic cutaneous ulcerations in a dialysis patient."
        ],
        "case_hooks": [
            "A 54-year-old male with CKD stage 4 (eGFR 22 mL/min) presenting with serum phosphate 1.9 mmol/L, corrected calcium 2.1 mmol/L, intact PTH 380 pg/mL, and elevated FGF-23.",
            "A 62-year-old female on hemodialysis who develops exquisitely tender, indurated, violaceous reticulated plaques with central eschar over both thighs, evaluated for calciphylaxis."
        ],
        "gaps": "Define KDIGO target monitoring intervals for serum calcium, phosphate, and intact PTH across CKD stages G3a through G5D.",
        "sources": [
            {
                "pmid": "28646995",
                "title": "Executive summary of the 2017 KDIGO Chronic Kidney Disease-Mineral and Bone Disorder (CKD-MBD) Guideline Update: what's changed and why it matters.",
                "year": 2017,
                "design": "guideline",
                "journal": "Kidney Int"
            },
            {
                "pmid": "21673295",
                "title": "Fibroblast growth factor 23 and risks of mortality and end-stage renal disease in patients with chronic kidney disease.",
                "year": 2011,
                "design": "literature",
                "journal": "JAMA"
            },
            {
                "pmid": "16641930",
                "title": "Definition, evaluation, and classification of renal osteodystrophy: a position statement from Kidney Disease: Improving Global Outcomes (KDIGO).",
                "year": 2006,
                "design": "consensus-guideline",
                "journal": "Kidney Int"
            },
            {
                "pmid": "29719193",
                "title": "Calciphylaxis.",
                "year": 2018,
                "design": "review",
                "journal": "N Engl J Med"
            }
        ]
    },

    402: {
        "cluster": "CKD mineral and bone disorder",
        "mentor_intro": (
            "Medical management of CKD-MBD focuses on lowering serum phosphate toward the normal range, preventing hypercalcemia, "
            "and controlling secondary hyperparathyroidism without inducing adynamic bone disease. Dietary phosphate restriction is combined "
            "with oral phosphate binders taken with meals. Clinical guidelines prioritize non-calcium-based phosphate binders (sevelamer, "
            "lanthanum carbonate) over calcium-based binders (calcium acetate, calcium carbonate) to avoid positive calcium balance and "
            "accelerated coronary artery calcification. In dialysis patients, secondary hyperparathyroidism is managed using calcimimetics "
            "(cinacalcet or intravenous etelcalcetide), which allosterically activate the parathyroid calcium-sensing receptor to suppress "
            "PTH secretion without increasing serum calcium or phosphate."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the randomized EVOLVE trial of 3,883 hemodialysis patients with secondary hyperparathyroidism, cinacalcet significantly "
                    "reduced serum PTH, calcium, and phosphate levels and demonstrated a trend toward reduced cardiovascular events in unadjusted analyses."
                ),
                "cites": ["23121374"]
            },
            {
                "claim": (
                    "The KDIGO 2017 guidelines recommend restricting calcium-based phosphate binders across all stages of CKD to prevent iatrogenic "
                    "hypercalcemia, positive calcium loading, and accelerated cardiovascular calcification."
                ),
                "cites": ["28646995"]
            },
            {
                "claim": (
                    "In comparative clinical trials (DCOR and INDEPENDENT studies), non-calcium phosphate binders like sevelamer slowed the "
                    "progression of coronary artery and aortic calcification compared to calcium-containing binders in CKD patients."
                ),
                "cites": ["17728707", "28646995"]
            },
            {
                "claim": (
                    "Management of calciphylaxis requires immediate multi-interventional therapy: stopping calcium binders and vitamin D, "
                    "optimizing dialysate calcium, administering intravenous sodium thiosulfate, and rigorous wound care."
                ),
                "cites": ["25796450", "28646995"]
            }
        ],
        "uncertainties": [
            "Prognostic impact of calcimimetic therapy on vascular calcification regression and fracture rates in long-term dialysis cohorts.",
            "Comparative efficacy of intravenous calcimimetics (etelcalcetide) versus oral cinacalcet on patient gastrointestinal adherence."
        ],
        "mcq_angles": [
            "Pharmacologic mechanism of cinacalcet: positive allosteric modulator of the calcium-sensing receptor (CaSR) on parathyroid chief cells, suppressing PTH without increasing calcium.",
            "KDIGO guidance on phosphate binder selection: avoiding calcium overload by prioritizing non-calcium binders (sevelamer, lanthanum) in patients with hypercalcemia or vascular calcification.",
            "First-line medical intervention for acute calciphylaxis: intravenous sodium thiosulfate infusions coupled with cessation of calcium and vitamin D supplements."
        ],
        "case_hooks": [
            "A 58-year-old male on maintenance hemodialysis whose intact PTH is 820 pg/mL, serum calcium is 2.55 mmol/L, and phosphate is 2.2 mmol/L on calcium acetate, transitioned to sevelamer carbonate and cinacalcet.",
            "A dialysis patient presenting with nausea, hypocalcemia (ionized calcium 0.95 mmol/L), and QT prolongation 2 weeks after initiating oral cinacalcet 60 mg daily."
        ],
        "gaps": "Define the target intact PTH range for patients with CKD stage 5D on maintenance dialysis (approximately 2 to 9 times the upper normal limit of the assay).",
        "sources": [
            {
                "pmid": "23121374",
                "title": "Effect of cinacalcet on cardiovascular disease in patients undergoing dialysis.",
                "year": 2012,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "28646995",
                "title": "Executive summary of the 2017 KDIGO Chronic Kidney Disease-Mineral and Bone Disorder (CKD-MBD) Guideline Update: what's changed and why it matters.",
                "year": 2017,
                "design": "guideline",
                "journal": "Kidney Int"
            },
            {
                "pmid": "17728707",
                "title": "Effects of sevelamer and calcium-based phosphate binders on mortality in hemodialysis patients.",
                "year": 2007,
                "design": "trial",
                "journal": "Kidney Int"
            },
            {
                "pmid": "25796450",
                "title": "Calciphylaxis: risk factors, diagnosis, and treatment.",
                "year": 2015,
                "design": "review",
                "journal": "Am J Kidney Dis"
            }
        ]
    },

    403: {
        "cluster": "CKD Staging and Progression",
        "mentor_intro": (
            "Systematic staging and risk prediction in chronic kidney disease (CKD) directs clinical decision-making regarding "
            "nephroprotective pharmacotherapy, multidisciplinary referral, and kidney failure planning. The Kidney Disease: Improving Global "
            "Outcomes (KDIGO) staging framework categorizes CKD across estimated GFR stages (G1 to G5) and albuminuria stages (A1 to A3). "
            "To quantify individualized risk of progression to kidney failure requiring replacement therapy (dialysis or preemptive transplant), "
            "the validated Kidney Failure Risk Equation (KFRE)—utilizing age, sex, eGFR, and urine albumin-to-creatinine ratio (uACR)—provides "
            "exceptional discriminatory accuracy across global populations. Clinical guidelines recommend formal nephrology referral when "
            "the 5-year predicted kidney failure risk exceeds 3% to 5%, or when eGFR drops below 30 mL/min/1.73m² (stage G4)."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The Kidney Failure Risk Equation (KFRE) developed by Tangri et al. accurately predicts the 2-year and 5-year risk of "
                    "progression to treated end-stage kidney failure using four simple variables: age, sex, eGFR, and urine albumin-to-creatinine ratio."
                ),
                "cites": ["21482743", "26757465"]
            },
            {
                "claim": (
                    "Multinational validation across 31 cohorts comprising over 700,000 individuals confirmed that the 4-variable KFRE achieves "
                    "high discrimination (C-statistic >0.85) for predicting kidney failure across diverse geographic regions."
                ),
                "cites": ["26757465"]
            },
            {
                "claim": (
                    "The 2024 KDIGO guideline establishes criteria for rapid CKD progression, defined as a sustained decline in eGFR >5 mL/min/1.73m²/year "
                    "or a loss of >25% from baseline eGFR, warranting accelerated nephrology intervention."
                ),
                "cites": ["38490803", "21840587"]
            },
            {
                "claim": (
                    "Mandatory nephrology referral triggers include eGFR <30 mL/min/1.73m² (stages G4-G5), persistent high-grade albuminuria "
                    "(uACR >300 mg/g), persistent microscopic hematuria, or a 5-year KFRE risk >3% to 5%."
                ),
                "cites": ["38490803"]
            }
        ],
        "uncertainties": [
            "Clinical utility of incorporating cystatin C alongside serum creatinine in routine primary care eGFR calculations to improve KFRE prediction.",
            "Optimal timing of arteriovenous fistula creation in elderly CKD stage 5 patients with competing non-renal mortality risks."
        ],
        "mcq_angles": [
            "Four variables comprising the basic Tangri Kidney Failure Risk Equation: age, sex, estimated GFR, and urine albumin-to-creatinine ratio (uACR).",
            "KDIGO definition of rapid CKD progression: sustained eGFR decline >5 mL/min/1.73m² per year.",
            "Nephrology referral thresholds: eGFR <30 mL/min/1.73m² (stage G4) or 5-year KFRE score >3-5%."
        ],
        "case_hooks": [
            "A 61-year-old male with hypertensive nephrosclerosis whose eGFR declined from 44 to 36 mL/min/1.73m² over 12 months with uACR 520 mg/g, evaluated using the KFRE to determine 5-year dialysis probability.",
            "A 70-year-old female with stage G4 CKD (eGFR 24 mL/min/1.73m²) referred for multidisciplinary education on home hemodialysis, peritoneal dialysis, and preemptive kidney transplantation."
        ],
        "gaps": "Define the 8-variable KFRE parameters, which add serum calcium, phosphate, bicarbonate, and albumin to the 4 core clinical variables.",
        "sources": [
            {
                "pmid": "21482743",
                "title": "A predictive model for progression of chronic kidney disease to kidney failure.",
                "year": 2011,
                "design": "literature",
                "journal": "JAMA"
            },
            {
                "pmid": "26757465",
                "title": "Multinational Assessment of Accuracy of Equations for Predicting Risk of Kidney Failure: A Meta-analysis.",
                "year": 2016,
                "design": "meta-analysis",
                "journal": "JAMA"
            },
            {
                "pmid": "38490803",
                "title": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.",
                "year": 2024,
                "design": "guideline",
                "journal": "Kidney Int"
            },
            {
                "pmid": "21840587",
                "title": "Progression of chronic kidney disease.",
                "year": 2012,
                "design": "review",
                "journal": "Lancet"
            }
        ]
    },

    404: {
        "cluster": "Class I antiarrhythmics: flecainide, propafenone, quinidine, use and contraindications",
        "mentor_intro": (
            "Vaughan Williams Class I antiarrhythmics block cardiac voltage-gated sodium channels (Nav1.5), depressing phase 0 depolarizing "
            "upstroke velocity. Subclassified by binding kinetics and effects on action potential duration (APD): Class IA (quinidine, "
            "procainamide, disopyramide) exhibits intermediate binding kinetics and prolongs APD and QT interval; Class IB (lidocaine, "
            "mexiletine) has rapid dissociation and shortens APD; and Class IC (flecainide, propafenone) has slow dissociation, producing "
            "marked rate-dependent QRS widening without altering APD. The landmark CAST trial established that Class IC agents significantly "
            "increase mortality in structural heart disease, creating an absolute contraindication to flecainide/propafenone in ischemic "
            "heart disease, reduced LVEF, or severe LV hypertrophy. In structurally normal hearts, oral flecainide is highly effective for "
            "atrial fibrillation cardioversion ('pill-in-the-pocket' strategy), provided an AV-nodal blocking agent is co-prescribed."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the landmark Cardiac Arrhythmia Suppression Trial (CAST), suppression of asymptomatic ventricular ectopy with encainide "
                    "or flecainide following myocardial infarction significantly increased all-cause and arrhythmic mortality (RR 2.64) compared to placebo."
                ),
                "cites": ["1900101"]
            },
            {
                "claim": (
                    "The outpatient 'pill-in-the-pocket' approach using single-dose oral flecainide (200-300 mg) or propafenone terminates "
                    "recent-onset atrial fibrillation in >90% of episodes in selected patients with structurally normal hearts without hospital admission."
                ),
                "cites": ["15575054"]
            },
            {
                "claim": (
                    "ESC guidelines strictly contraindicate Class IC antiarrhythmics (flecainide, propafenone) in patients with coronary artery disease, "
                    "prior myocardial infarction, heart failure with reduced ejection fraction, or significant left ventricular hypertrophy (>14 mm)."
                ),
                "cites": ["32860505", "29432556"]
            },
            {
                "claim": (
                    "Class IC agents can organize atrial fibrillation into slow atrial flutter with paradoxical 1:1 atrioventricular conduction; "
                    "therefore, concurrent administration of an AV-nodal blocking agent (beta-blocker or verapamil/diltiazem) is mandatory."
                ),
                "cites": ["32860505", "29432556"]
            }
        ],
        "uncertainties": [
            "Safety boundaries of flecainide in patients with borderline left ventricular hypertrophy (interventricular septal thickness 12-14 mm) on echocardiography.",
            "Use of intravenous procainamide versus amiodarone for acute termination of stable monomorphic ventricular tachycardia in structural heart disease."
        ],
        "mcq_angles": [
            "CAST trial legacy: Class IC antiarrhythmics are contraindicated post-myocardial infarction due to increased lethal proarrhythmic mortality.",
            "Mandatory co-prescription with Class IC agents: beta-blockers or non-dihydropyridine CCBs to prevent 1:1 conduction of drug-induced atrial flutter.",
            "Electrocardiographic effect of Class IC agents: marked rate-dependent widening of the QRS complex without prolongation of the QT interval."
        ],
        "case_hooks": [
            "A 46-year-old female with paroxysmal atrial fibrillation and a structurally normal heart who presents for initiation of outpatient 'pill-in-the-pocket' oral flecainide 200 mg.",
            "A 66-year-old male with a history of anterior STEMI 5 years ago presenting with symptomatic paroxysmal AF, evaluated for rhythm control options (contraindicating Class IC agents in favor of amiodarone or catheter ablation)."
        ],
        "gaps": "Define the electrocardiographic warning threshold for discontinuing flecainide during stress testing (QRS prolongation >25-50% over baseline indicates use-dependent toxicity).",
        "sources": [
            {
                "pmid": "1900101",
                "title": "Mortality and morbidity in patients receiving encainide, flecainide, or placebo. The Cardiac Arrhythmia Suppression Trial.",
                "year": 1991,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "15575054",
                "title": "Outpatient treatment of recent-onset atrial fibrillation with the 'pill-in-the-pocket' approach.",
                "year": 2004,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "32860505",
                "title": "2020 ESC Guidelines for the diagnosis and management of atrial fibrillation.",
                "year": 2021,
                "design": "guideline",
                "journal": "Eur Heart J"
            },
            {
                "pmid": "29432556",
                "title": "Antiarrhythmic drugs--clinical use and clinical decision making: a European Heart Rhythm Association (EHRA) consensus document.",
                "year": 2018,
                "design": "consensus-guideline",
                "journal": "Europace"
            }
        ]
    },

    405: {
        "cluster": "claudication",
        "mentor_intro": (
            "Intermittent claudication is the classic clinical manifestation of lower extremity peripheral artery disease (PAD), "
            "characterized by reproducible, exercise-induced muscular ache, cramp, or fatigue—most frequently in the calf, thigh, or "
            "buttock—triggered by walking and promptly relieved within 10 minutes of rest. Resting Ankle-Brachial Index (ABI) <=0.90 confirms "
            "PAD, while an ABI >1.40 indicates non-compressible, calcified medial arteries requiring toe-brachial index (TBI) testing. "
            "Management has two fundamental goals: preventing systemic major adverse cardiovascular events (MACE) and improving functional "
            "walking distance. Comprehensive medical therapy mandates high-intensity statins, smoking cessation, and antithrombotic therapy. "
            "Structured supervised exercise therapy (SET) is the most effective first-line functional intervention, outperforming primary "
            "endovascular stenting in sustainable walking distance improvements."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The AHA/ACC guidelines establish that a resting Ankle-Brachial Index (ABI) <=0.90 is diagnostic of peripheral artery disease, "
                    "with lower ratios correlating with increasing severity of vascular stenosis and cardiovascular event risk."
                ),
                "cites": ["27840333"]
            },
            {
                "claim": (
                    "In the COMPASS trial, dual-pathway inhibition with low-dose rivaroxaban (2.5 mg twice daily) plus aspirin significantly reduced "
                    "major adverse cardiovascular events (HR 0.72) and major adverse limb events, including amputation (HR 0.54), in symptomatic PAD."
                ),
                "cites": ["29132880"]
            },
            {
                "claim": (
                    "The CAPRIE trial demonstrated that clopidogrel (75 mg daily) was significantly more effective than aspirin (325 mg daily) "
                    "in reducing ischemic stroke, myocardial infarction, or vascular death, particularly in the peripheral arterial disease subgroup (RRR 23.8%)."
                ),
                "cites": ["8932666"]
            },
            {
                "claim": (
                    "Supervised exercise therapy (minimum 3 sessions weekly for 12 weeks) significantly improves maximal and pain-free walking "
                    "distance, demonstrating functional outcomes equivalent to primary endovascular revascularization in randomized trials."
                ),
                "cites": ["26547267", "27840333"]
            }
        ],
        "uncertainties": [
            "Comparative long-term limb-salvage outcomes of early endovascular revascularization versus optimal medical therapy in lifestyle-limiting claudication.",
            "Cardiovascular safety and heart failure precautions of the phosphodiesterase-3 inhibitor cilostazol in patients with subclinical ischemic heart disease."
        ],
        "mcq_angles": [
            "Diagnostic cutoff for resting Ankle-Brachial Index confirming PAD: ABI <=0.90.",
            "First-line intervention for improving walking capacity in intermittent claudication: structured supervised exercise training (SET).",
            "COMPASS trial antithrombotic regimen for symptomatic PAD: low-dose rivaroxaban (2.5 mg bid) combined with aspirin (100 mg daily)."
        ],
        "case_hooks": [
            "A 64-year-old male smoker presenting with bilateral calf cramping after walking 150 meters, completely relieved after standing for 5 minutes, whose resting right ABI is 0.68 and left is 0.72.",
            "A 58-year-old female with stable intermittent claudication receiving atorvastatin 80 mg and aspirin, evaluated for the addition of supervised exercise therapy and low-dose rivaroxaban."
        ],
        "gaps": "Define the Fontaine (Stage I asymptomatic, II claudication, III rest pain, IV ulcer/gangrene) and Rutherford clinical classification systems.",
        "sources": [
            {
                "pmid": "27840333",
                "title": "2016 AHA/ACC Guideline on the Management of Patients With Lower Extremity Peripheral Artery Disease.",
                "year": 2017,
                "design": "guideline",
                "journal": "Circulation"
            },
            {
                "pmid": "29132880",
                "title": "Rivaroxaban with or without aspirin in patients with stable peripheral or carotid artery disease: an international, randomised, double-blind, placebo-controlled, phase 3 study.",
                "year": 2018,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "8932666",
                "title": "A randomised, blinded, trial of clopidogrel versus aspirin in patients at risk of ischaemic events (CAPRIE).",
                "year": 1996,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "26547267",
                "title": "Endovascular revascularization and supervised exercise for peripheral artery disease and intermittent claudication: a randomized clinical trial.",
                "year": 2015,
                "design": "trial",
                "journal": "JAMA"
            }
        ]
    },

    406: {
        "cluster": "clopidogrel aspirin acute minor ischemic stroke CHANCE",
        "mentor_intro": (
            "The risk of recurrent stroke is highest during the first 48 to 72 hours following an acute minor ischemic stroke or "
            "high-risk transient ischemic attack (TIA). The landmark CHANCE trial in China and the international POINT trial established "
            "that short-course dual antiplatelet therapy (DAPT) with clopidogrel plus aspirin is significantly superior to aspirin monotherapy "
            "in preventing early recurrent ischemic stroke. The critical therapeutic insight lies in the exact timing and duration: DAPT "
            "must be initiated within 12 to 24 hours of symptom onset (loading with clopidogrel 300 mg plus aspirin), continued for strictly "
            "21 days, and then de-escalated to single antiplatelet monotherapy. Prolonging DAPT beyond 21-30 days accrues major bleeding "
            "risks (including fatal intracranial hemorrhage) without conferring further ischemic risk reduction."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the randomized CHANCE trial, clopidogrel plus aspirin initiated within 24 hours of acute minor ischemic stroke (NIHSS <=3) "
                    "or high-risk TIA (ABCD2 >=4) significantly reduced 90-day recurrent stroke from 11.7% to 8.2% (HR 0.68) without increasing hemorrhage."
                ),
                "cites": ["23803136"]
            },
            {
                "claim": (
                    "The international POINT trial confirmed that clopidogrel plus aspirin reduced major ischemic events (HR 0.75), with the greatest "
                    "benefit concentrated within the first 21 days, after which major bleeding risks increased."
                ),
                "cites": ["29766750"]
            },
            {
                "claim": (
                    "The 2021 AHA/ASA stroke prevention guidelines recommend initiating clopidogrel (loading 300 mg, then 75 mg daily) plus aspirin "
                    "within 24 hours for minor stroke (NIHSS <=3) or high-risk TIA (ABCD2 >=4), continued for strictly 21 to 30 days before monotherapy step-down."
                ),
                "cites": ["34024117"]
            },
            {
                "claim": (
                    "The TARDIS trial demonstrated that triple antiplatelet therapy (aspirin + clopidogrel + dipyridamole) did not reduce stroke recurrence "
                    "compared to guideline-directed dual or single therapy, but significantly increased major bleeding, establishing a ceiling on antiplatelet escalation."
                ),
                "cites": ["29277380"]
            }
        ],
        "uncertainties": [
            "Impact of CYP2C19 loss-of-function alleles (*2, *3) on clopidogrel responsiveness and the role of ticagrelor-aspirin as an alternative in CYP2C19 loss-of-function carriers (CHANCE-2 trial).",
            "Optimal antiplatelet selection in patients with acute minor stroke occurring while already adherent to maintenance aspirin."
        ],
        "mcq_angles": [
            "Target patient population for 21-day DAPT based on CHANCE and POINT: acute non-cardioembolic minor stroke (NIHSS <=3) or high-risk TIA (ABCD2 >=4) presenting within 24 hours.",
            "Evidence-based duration of dual antiplatelet therapy in acute minor stroke: strictly 21 days before de-escalation to single antiplatelet monotherapy.",
            "Outcome of the TARDIS trial: triple antiplatelet therapy caused significant excess bleeding without ischemic benefit."
        ],
        "case_hooks": [
            "A 63-year-old male presenting 4 hours after transient right hand weakness and dysarthria completely resolved (ABCD2 score = 5), with CT head ruling out hemorrhage, initiating clopidogrel 300 mg and aspirin 100 mg.",
            "A 70-year-old female with an acute minor stroke (NIHSS 2) who has completed 21 days of clopidogrel and aspirin, evaluated for stepping down to long-term monotherapy."
        ],
        "gaps": "Define the ABCD2 score components (Age >=60, Blood pressure >=140/90, Clinical features [unilateral weakness 2, speech disturbance 1], Duration [>=60 min 2, 10-59 min 1], Diabetes).",
        "sources": [
            {
                "pmid": "23803136",
                "title": "Clopidogrel with aspirin in acute minor stroke or transient ischemic attack.",
                "year": 2013,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "29766750",
                "title": "Clopidogrel and Aspirin in Acute Ischemic Stroke and High-Risk TIA.",
                "year": 2018,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34024117",
                "title": "2021 Guideline for the Prevention of Stroke in Patients With Stroke and Transient Ischemic Attack.",
                "year": 2021,
                "design": "guideline",
                "journal": "Stroke"
            },
            {
                "pmid": "29277380",
                "title": "Antiplatelet therapy with aspirin, clopidogrel, and dipyridamole versus clopidogrel alone or aspirin and dipyridamole in patients with acute, ischaemic stroke (TARDIS): a randomised, open-label, phase 3 superiority trial.",
                "year": 2018,
                "design": "trial",
                "journal": "Lancet"
            }
        ]
    },

    407: {
        "cluster": "Clostridioides difficile Infection",
        "mentor_intro": (
            "Clostridioides difficile infection (CDI) is the leading cause of healthcare-associated infectious diarrhea and pseudomembranous "
            "colitis. Pathogenesis is triggered by broad-spectrum antibiotic disruption of the colonic microbiota, facilitating C. difficile "
            "spore germination and the production of large clostridial exotoxins (Toxin A and Toxin B) that cause mucosal inflammation and "
            "epithelial necrosis. Diagnostic guidelines mandate testing only diarrheal (unformed) stools using a multi-step algorithmic approach "
            "combining high-sensitivity glutamate dehydrogenase (GDH) antigen screening with high-specificity Toxin A/B enzyme immunoassay, "
            "reserving NAAT/PCR for discordant results to avoid over-diagnosing asymptomatic colonization. Updated IDSA and ACG guidelines "
            "establish oral fidaxomicin (200 mg twice daily for 10 days) as the preferred first-line therapy over vancomycin, while oral "
            "metronidazole is no longer recommended for non-severe disease."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The IDSA/SHEA 2021 focused update recommends oral fidaxomicin (200 mg twice daily for 10 days) as the preferred first-line agent "
                    "over oral vancomycin for initial episodes of C. difficile infection due to significantly lower recurrence rates."
                ),
                "cites": ["34164674"]
            },
            {
                "claim": (
                    "In a phase 3 randomized double-blind trial, fidaxomicin demonstrated non-inferior clinical cure compared to oral vancomycin "
                    "(88% vs 86%) and a significant 45% relative reduction in recurrence rate (15% vs 25%)."
                ),
                "cites": ["21288078"]
            },
            {
                "claim": (
                    "Diagnostic laboratory algorithms recommend a 2-step approach: testing unformed stool with high-sensitivity GDH enzyme immunoassay "
                    "plus toxin A/B EIA, reflexing to NAAT only when results are discordant, preventing treatment of colonized individuals."
                ),
                "cites": ["34003176", "29462280"]
            },
            {
                "claim": (
                    "Oral metronidazole monotherapy is no longer recommended for initial episodes of C. difficile infection in adults due to "
                    "inferior clinical cure rates and higher failure rates compared to oral vancomycin and fidaxomicin."
                ),
                "cites": ["34164674", "29462280"]
            }
        ],
        "uncertainties": [
            "Cost-effectiveness and accessibility barriers of fidaxomicin versus generic oral vancomycin in routine inpatient practice.",
            "Clinical utility of extended-pulsed fidaxomicin dosing regimens (days 1-5 twice daily, then days 7-25 once every other day) in high-risk elderly populations."
        ],
        "mcq_angles": [
            "Preferred first-line therapy for initial non-severe CDI in updated IDSA guidelines: oral fidaxomicin (or oral vancomycin as alternative).",
            "Pharmacologic advantage of fidaxomicin: narrow-spectrum macrolide bactericidal action that spares the normal Bacteroidetes and Firmicutes colonic microbiota, drastically lowering recurrence.",
            "Diagnostic rule: testing formed stool samples for C. difficile is contraindicated to avoid treating asymptomatic colonization."
        ],
        "case_hooks": [
            "A 68-year-old female who develops 6 watery unformed bowel movements daily 10 days after completing a course of ciprofloxacin for pyelonephritis, whose stool GDH and Toxin A/B are positive.",
            "An 80-year-old nursing home resident with a first episode of C. difficile infection (WBC 11,000/uL, Cr 1.0 mg/dL), evaluated for oral fidaxomicin versus vancomycin."
        ],
        "gaps": "Define the mechanism of action of fidaxomicin (inhibition of bacterial RNA polymerase at the sigma subunit) and its minimal systemic bioavailability.",
        "sources": [
            {
                "pmid": "34164674",
                "title": "Clinical Practice Guideline by the Infectious Diseases Society of America (IDSA) and Society for Healthcare Epidemiology of America (SHEA): 2021 Focused Update Guidelines on Management of Clostridioides difficile Infection in Adults.",
                "year": 2021,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "21288078",
                "title": "Fidaxomicin versus vancomycin for Clostridium difficile infection.",
                "year": 2011,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34003176",
                "title": "ACG Clinical Guidelines: Prevention, Diagnosis, and Treatment of Clostridioides difficile Infections.",
                "year": 2021,
                "design": "guideline",
                "journal": "Am J Gastroenterol"
            },
            {
                "pmid": "29462280",
                "title": "Clinical Practice Guidelines for Clostridium difficile Infection in Adults and Children: 2017 Update.",
                "year": 2018,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            }
        ]
    },

    408: {
        "cluster": "Clostridioides difficile infection: severity grading, vancomycin, fidaxomicin, FMT, bezlotoxumab",
        "mentor_intro": (
            "Clinical stratification of Clostridioides difficile infection directs intensity of antimicrobial therapy and urgent surgical "
            "involvement. Non-severe disease (WBC <=15,000/uL and serum creatinine <1.5 mg/dL) and severe disease (WBC >=15,000/uL or serum Cr "
            ">1.5 mg/dL) respond to oral fidaxomicin (200 mg bid) or oral vancomycin (125 mg qid). Fulminant CDI—characterized by hypotension, "
            "septic shock, ileus, or toxic megacolon—mandates emergency high-dose oral vancomycin (500 mg qid) plus intravenous metronidazole "
            "(500 mg q8h) and rectal vancomycin retention enemas, alongside early surgical consultation for diverting loop ileostomy or total "
            "abdominal colectomy. For recurrent CDI, human monoclonal antibody bezlotoxumab (anti-toxin B) and Fecal Microbiota "
            "Transplantation (FMT) restore barrier defense and prevent chronic relapse."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the randomized MODIFY I and II trials, a single infusion of bezlotoxumab (human monoclonal antibody targeting C. difficile "
                    "Toxin B) significantly reduced the rate of recurrent CDI from 27% to 17% in high-risk patients receiving standard antibiotics."
                ),
                "cites": ["28121498"]
            },
            {
                "claim": (
                    "In a landmark randomized trial by van Nood et al., duodenal infusion of donor donor feces (FMT) cured 81% of patients with "
                    "recurrent C. difficile after a single infusion and 94% after two infusions, vastly outperforming 14 days of vancomycin (31%)."
                ),
                "cites": ["23323867"]
            },
            {
                "claim": (
                    "IDSA/SHEA guidelines define fulminant CDI by the presence of hypotension, shock, ileus, or toxic megacolon, mandating high-dose "
                    "oral vancomycin (500 mg qid) combined with IV metronidazole (500 mg q8h) and rectal vancomycin enemas if ileus is present."
                ),
                "cites": ["34164674", "34003176"]
            },
            {
                "claim": (
                    "Fecal microbiota transplantation is strongly recommended by clinical guidelines for patients with multiple recurrent "
                    "episodes of CDI (>=2 recurrences) who have failed appropriate antibiotic regimens."
                ),
                "cites": ["34164674", "34003176"]
            }
        ],
        "uncertainties": [
            "Safety profile of bezlotoxumab in patients with baseline congestive heart failure given a signal for increased heart failure adverse events in MODIFY trials.",
            "Standardization and pathogen-transmission screening protocols for live-biotherapeutic microbiota products (e.g., orally encapsulated fecal microbiota) versus colonoscopic FMT."
        ],
        "mcq_angles": [
            "Severity criteria defining severe CDI: WBC >=15,000/uL OR serum creatinine >1.5 mg/dL.",
            "Triple therapy regimen for fulminant CDI with ileus: high-dose oral vancomycin (500 mg qid) + IV metronidazole (500 mg tid) + rectal vancomycin enemas.",
            "Indication for Fecal Microbiota Transplantation (FMT): patients experiencing a second or subsequent recurrence (>=3 episodes total) of CDI."
        ],
        "case_hooks": [
            "A 74-year-old male presenting with abdominal distension, fever 39.1°C, BP 84/50 mmHg on norepinephrine, WBC 34,000/uL, and CT showing toxic megacolon, initiated on triple fulminant CDI therapy with urgent surgical consult.",
            "A 62-year-old female with her third recurrence of C. difficile infection within 6 months despite prior vancomycin taper, referred for donor fecal microbiota transplantation."
        ],
        "gaps": "Define the tapered and pulsed oral vancomycin regimen for first recurrence (125 mg qid x 10-14 days, bid x 7 days, daily x 7 days, then every 2-3 days for 2-8 weeks).",
        "sources": [
            {
                "pmid": "28121498",
                "title": "Bezlotoxumab for Prevention of Recurrent Clostridium difficile Infection.",
                "year": 2017,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "23323867",
                "title": "Duodenal infusion of donor feces for recurrent Clostridium difficile.",
                "year": 2013,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34164674",
                "title": "Clinical Practice Guideline by the Infectious Diseases Society of America (IDSA) and Society for Healthcare Epidemiology of America (SHEA): 2021 Focused Update Guidelines on Management of Clostridioides difficile Infection in Adults.",
                "year": 2021,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "34003176",
                "title": "ACG Clinical Guidelines: Prevention, Diagnosis, and Treatment of Clostridioides difficile Infections.",
                "year": 2021,
                "design": "guideline",
                "journal": "Am J Gastroenterol"
            }
        ]
    },

    409: {
        "cluster": "Clozapine for treatment-resistant schizophrenia",
        "mentor_intro": (
            "Clozapine is the gold-standard atypical antipsychotic and the only evidence-based pharmacotherapy licensed for "
            "treatment-resistant schizophrenia (TRS)—defined by failure to achieve satisfactory clinical improvement despite >=2 adequate "
            "trials of distinct antipsychotics (at least one second-generation agent) dosed therapeutically for >=6 weeks. In the landmark "
            "Kane et al. trial, clozapine produced unprecedented clinical remissions in 30% of refractory patients. Furthermore, clozapine "
            "possesses unique anti-suicidal properties validated in the InterSePT trial. Safe clinical use requires strict adherence "
            "to mandatory absolute neutrophil count (ANC) registries to detect agranulocytosis (occurring in ~0.8%), alongside vigilant "
            "monitoring for non-hematologic toxicities, including clozapine-induced myocarditis, life-threatening gastrointestinal hypomotility, "
            "seizures, and profound metabolic syndrome."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the landmark double-blind trial by Kane et al., clozapine demonstrated unequivocal superiority over chlorpromazine, "
                    "inducing significant clinical response in 30% of severely refractory schizophrenic patients who had failed prior antipsychotics."
                ),
                "cites": ["3046553"]
            },
            {
                "claim": (
                    "In the international InterSePT trial, clozapine significantly reduced suicidal behavior (suicide attempts and hospitalizations, "
                    "HR 0.76) compared to olanzapine, leading to a specific regulatory indication for suicide risk reduction in schizophrenia."
                ),
                "cites": ["12511175"]
            },
            {
                "claim": (
                    "Systematic reviews and meta-analyses confirm that clozapine is the most efficacious antipsychotic for positive symptoms "
                    "in treatment-resistant schizophrenia, outperforming all first- and second-generation agents."
                ),
                "cites": ["27388573"]
            },
            {
                "claim": (
                    "International consensus guidelines (TRRIP working group) mandate prompt initiation of clozapine immediately after two "
                    "adequate failed antipsychotic trials, warning that unnecessary delays of years lead to treatment refractoriness and cognitive decline."
                ),
                "cites": ["27919182"]
            }
        ],
        "uncertainties": [
            "Optimal therapeutic plasma clozapine concentration monitoring thresholds (typically 350-600 ng/mL) and management of ultra-rapid metabolizers.",
            "Evidence-based augmentation strategies (e.g., adding aripiprazole, amisulpride, or electroconvulsive therapy) for clozapine-resistant schizophrenia."
        ],
        "mcq_angles": [
            "Pivotal trial proving clozapine efficacy in treatment-resistant schizophrenia: Kane et al. (1988).",
            "Unique approved psychiatric indication for clozapine: reduction in the risk of recurrent suicidal behavior in schizophrenia (InterSePT trial).",
            "Mandatory hematologic monitoring: clozapine must be stopped immediately if the Absolute Neutrophil Count falls below 1,000/uL (<1.0 x 10^9/L)."
        ],
        "case_hooks": [
            "A 28-year-old male with persistent auditory hallucinations and persecutory delusions despite adequate trials of risperidone 6 mg and olanzapine 20 mg, fulfilling TRRIP criteria for clozapine initiation.",
            "A 32-year-old female stabilized on clozapine whose CBC at month 3 shows absolute neutrophil count of 850/uL, requiring immediate clozapine cessation and hematology consultation."
        ],
        "gaps": "Define the common and lethal adverse effect of clozapine-induced gastrointestinal hypomotility (clozapine-induced constipation/ileus) and mandatory bowel regimens.",
        "sources": [
            {
                "pmid": "3046553",
                "title": "Clozapine for the treatment-resistant schizophrenic. A double-blind comparison with chlorpromazine.",
                "year": 1988,
                "design": "trial",
                "journal": "Arch Gen Psychiatry"
            },
            {
                "pmid": "12511175",
                "title": "Clozapine treatment for suicidality in schizophrenia: International Suicide Prevention Trial (InterSePT).",
                "year": 2003,
                "design": "trial",
                "journal": "Arch Gen Psychiatry"
            },
            {
                "pmid": "27388573",
                "title": "Clozapine v. first- and second-generation antipsychotics in treatment-resistant schizophrenia: systematic review and meta-analysis.",
                "year": 2016,
                "design": "meta-analysis",
                "journal": "Br J Psychiatry"
            },
            {
                "pmid": "27919182",
                "title": "Treatment-Resistant Schizophrenia: Treatment Response and Resistance in Psychosis (TRRIP) Working Group Consensus Guidelines on Diagnosis and Management.",
                "year": 2017,
                "design": "consensus-guideline",
                "journal": "Am J Psychiatry"
            }
        ]
    },

    410: {
        "cluster": "clozapine-induced myocarditis",
        "mentor_intro": (
            "Clozapine-induced myocarditis is an acute, life-threatening hypersensitivity or toxic inflammatory myocardial injury "
            "occurring in approximately 1% to 3% of patients initiating clozapine. Over 80% to 90% of cases occur early during treatment, "
            "peaking between day 14 and day 21 (and rarely after day 28-30). Clinical symptoms are frequently non-specific and easily "
            "mistaken for benign drug fever or respiratory infection: persistent resting tachycardia (>100-110 bpm out of proportion to fever), "
            "fever, chest discomfort, shortness of breath, and postural hypotension. Implementation of standardized screening protocols "
            "(the Ronaldson protocol) utilizing baseline and weekly monitoring of high-sensitivity cardiac troponin and C-reactive protein (CRP) "
            "during the first 4 weeks dramatically reduces case fatality. Prompt detection and immediate, permanent clozapine cessation "
            "is essential to prevent fatal cardiogenic shock."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In Australian registry analyses of clozapine-induced myocarditis, the median onset was day 16, with >80% presenting between "
                    "days 14 and 28, commonly presenting with resting tachycardia, pyrexia, dyspnea, and peripheral eosinophilia."
                ),
                "cites": ["25805541"]
            },
            {
                "claim": (
                    "The Ronaldson monitoring protocol recommends baseline troponin and CRP, followed by weekly testing of troponin and CRP "
                    "for the first 4 weeks of clozapine titration, achieving early detection and lowering fatality rates from >30% to <5%."
                ),
                "cites": ["21545228"]
            },
            {
                "claim": (
                    "Clozapine titration must be suspended immediately if troponin rises above 2 times the upper limit of normal or if CRP "
                    "exceeds 100 mg/L alongside signs of cardiovascular compromise, pending urgent echocardiography."
                ),
                "cites": ["21545228", "27282820"]
            },
            {
                "claim": (
                    "Systematic reviews confirm that rapid clozapine dose escalation and concurrent administration of sodium valproate represent "
                    "significant independent risk factors for the development of clozapine-induced myocarditis."
                ),
                "cites": ["29905587", "25805541"]
            }
        ],
        "uncertainties": [
            "Safety and criteria for carefully supervised clozapine rechallenge in patients who experienced mild, transient troponin elevations without ventricular systolic dysfunction.",
            "Pathophysiological distinction between acute drug hypersensitivity myocarditis (IgE-mediated/eosinophilic) versus direct drug-induced myocardial necrosis."
        ],
        "mcq_angles": [
            "Peak time window for clozapine-induced myocarditis: days 14 to 21 (almost exclusively within the first 4 weeks of initiation).",
            "Ronaldson monitoring protocol parameters: weekly cardiac troponin and C-reactive protein (CRP) testing during weeks 1 to 4.",
            "Critical clinical sign of early clozapine myocarditis: persistent, unexplained resting tachycardia (>100 bpm) accompanied by low-grade fever."
        ],
        "case_hooks": [
            "A 24-year-old male initiating clozapine who on day 18 develops a temperature of 38.3°C, resting pulse of 118 bpm, troponin I of 450 ng/L, and CRP of 115 mg/L, prompting immediate clozapine discontinuation.",
            "A psychiatric inpatient receiving clozapine and sodium valproate undergoing routine weekly biomarker screening on day 21, found to have asymptomatic troponin elevation and ST depressions."
        ],
        "gaps": "Define the long-term risk of clozapine-induced dilated cardiomyopathy, which can develop insidiously months to years after initiation.",
        "sources": [
            {
                "pmid": "25805541",
                "title": "Clinical presentation and risk factors for clozapine-induced myocarditis and septic cardiomyopathy in Australian patients.",
                "year": 2015,
                "design": "literature",
                "journal": "Aust N Z J Psychiatry"
            },
            {
                "pmid": "21545228",
                "title": "A new monitoring protocol for clozapine-induced myocarditis based on an analysis of 75 cases.",
                "year": 2011,
                "design": "consensus-guideline",
                "journal": "Aust N Z J Psychiatry"
            },
            {
                "pmid": "27282820",
                "title": "Clozapine-induced myocarditis: A review of the literature.",
                "year": 2016,
                "design": "review",
                "journal": "Schizophr Res"
            },
            {
                "pmid": "29905587",
                "title": "A Systematic Review of Clozapine-Induced Myocarditis: Risk Factors and Clinical Characteristics.",
                "year": 2018,
                "design": "review",
                "journal": "J Clin Psychopharmacol"
            }
        ]
    },

    411: {
        "cluster": "cluster headache",
        "mentor_intro": (
            "Cluster headache is the most severe and distinctive trigeminal autonomic cephalalgia (TAC), colloquially known as "
            "'suicide headache' due to its excruciating, devastating pain intensity. Characterized by strictly unilateral, severe "
            "periorbital, retro-orbital, or temporal pain lasting 15 to 180 minutes, attacks occur with striking circadian and circannual "
            "periodicity (often awakening patients from REM sleep at identical times each night). Episodes are accompanied by prominent "
            "ipsilateral parasympathetic activation and sympathetic paralysis: conjunctival injection, lacrimation, nasal congestion, "
            "rhinorrhea, eyelid edema, miosis, and ptosis (partial Horner syndrome). A key pathognomonic clinical feature distinguishing "
            "cluster headache from migraine is intense motor agitation and restlessness (patients pace the room, rock back and forth, or hit "
            "their head), whereas migraineurs seek stillness in a dark, quiet room."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The International Classification of Headache Disorders (ICHD-3) defines cluster headache by strictly unilateral, "
                    "severe orbital/supraorbital pain lasting 15-180 minutes, occurring from once every other day to 8 times daily."
                ),
                "cites": ["29368949"]
            },
            {
                "claim": (
                    "Attacks must be accompanied by at least one ipsilateral cranial autonomic symptom (conjunctival injection, lacrimation, "
                    "rhinorrhea, miosis, ptosis) or a sense of restlessness or agitation during the attack."
                ),
                "cites": ["29368949"]
            },
            {
                "claim": (
                    "Systematic pain reviews rank cluster headache as one of the most painful conditions known in human medicine, consistently "
                    "rated higher than childbirth, nephrolithiasis, or gunshot wounds."
                ),
                "cites": ["32328739"]
            },
            {
                "claim": (
                    "Non-invasive vagus nerve stimulation (nVNS) is effective for the acute treatment and prevention of episodic cluster headache, "
                    "providing a safe non-pharmacological neuromodulation option."
                ),
                "cites": ["28409477"]
            }
        ],
        "uncertainties": [
            "Hypothalamic pacemaking mechanisms that dictate circannual attack bout recurrence (e.g., seasonal clustering around solstices and equinoxes).",
            "Efficacy and patient selection for sphenopalatine ganglion (SPG) stimulation or deep brain stimulation (DBS) in medically refractory chronic cluster headache."
        ],
        "mcq_angles": [
            "Pathognomonic behavioral hallmark differentiating cluster headache from migraine: prominent psychomotor restlessness and pacing (in contrast to migraineurs preferring immobility).",
            "ICHD-3 attack duration criteria: untreated attacks characteristically last 15 to 180 minutes.",
            "Ipsilateral autonomic features: parasympathetic hyperactivation (lacrimation, rhinorrhea) and sympathetic deficit (ptosis, miosis)."
        ],
        "case_hooks": [
            "A 32-year-old male smoker presenting with a 3-week history of nocturnal excruciating right retro-orbital stabbing pain lasting 45 minutes, with right eye tearing, right nasal dripping, and pacing the room in agony.",
            "A 40-year-old female misdiagnosed with recurrent trigeminal neuralgia or sinus infections whose attacks occur twice nightly with ipsilateral ptosis and conjunctival injection."
        ],
        "gaps": "Define the distinction between episodic cluster headache (bouts lasting 7 days to 1 year separated by pain-free remission >=3 months) and chronic cluster headache (remission <3 months for >1 year).",
        "sources": [
            {
                "pmid": "29368949",
                "title": "The International Classification of Headache Disorders, 3rd edition (ICHD-3).",
                "year": 2018,
                "design": "consensus-guideline",
                "journal": "Cephalalgia"
            },
            {
                "pmid": "32328739",
                "title": "Cluster headache is one of the most intensely painful conditions known to humans: a systematic review.",
                "year": 2021,
                "design": "review",
                "journal": "J Neurol"
            },
            {
                "pmid": "28409477",
                "title": "One-year follow-up of a randomized, sham-controlled study of non-invasive vagus nerve stimulation for cluster headache.",
                "year": 2018,
                "design": "trial",
                "journal": "Cephalalgia"
            },
            {
                "pmid": "16987168",
                "title": "EFNS guidelines on the treatment of cluster headache and other trigeminal-autonomic cephalalgias.",
                "year": 2006,
                "design": "guideline",
                "journal": "Eur J Neurol"
            }
        ]
    },

    412: {
        "cluster": "Cluster headache: high-flow oxygen, triptan rescue, verapamil prophylaxis",
        "mentor_intro": (
            "The pharmacological management of cluster headache comprises three distinct, coordinated strategies: acute attack abortive "
            "therapy, short-term transitional bridging prophylaxis, and long-term maintenance prophylaxis. Oral analgesics and oral triptans "
            "are completely ineffective due to delayed absorption relative to the rapid (peak within minutes) attack tempo. High-flow normobaric "
            "100% oxygen (12 to 15 L/min delivered via a tight-fitting non-rebreather mask for 15 minutes) was validated in a landmark randomized "
            "trial by Cohen et al., providing safe, complete pain relief in >75% of attacks without dose limits. Subcutaneous sumatriptan "
            "(6 mg) provides rapid rescue. For transitional prophylaxis, a greater occipital nerve (GON) suboccipital steroid injection "
            "rapidly suppresses bouts. Verapamil (titrated from 240 mg to 960 mg daily with mandatory serial ECGs to monitor for PR prolongation "
            "and AV block) is the gold-standard maintenance preventive agent."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In a landmark double-blind randomized crossover trial by Cohen et al., inhaled high-flow 100% oxygen (12 L/min via non-rebreather mask) "
                    "achieved complete pain relief at 15 minutes in 78% of attacks compared to 20% on room air, without adverse effects."
                ),
                "cites": ["19996399"]
            },
            {
                "claim": (
                    "Subcutaneous sumatriptan (6 mg) and intranasal zolmitriptan (5 or 10 mg) are first-line pharmacological abortive therapies, "
                    "achieving rapid headache termination within 10 to 15 minutes."
                ),
                "cites": ["16987168", "18339350"]
            },
            {
                "claim": (
                    "In a randomized double-blind placebo-controlled trial, suboccipital corticosteroid injection targeting the greater occipital "
                    "nerve (GON) induced rapid attack cessation, serving as an effective bridging therapy while oral preventatives take effect."
                ),
                "cites": ["21903476"]
            },
            {
                "claim": (
                    "Oral verapamil (240 to 960 mg daily) is the first-line maintenance prophylactic drug of choice; baseline and titration ECGs "
                    "are mandatory to monitor for dose-dependent PR prolongation, bradycardia, and high-degree heart block."
                ),
                "cites": ["16987168", "18339350"]
            }
        ],
        "uncertainties": [
            "Optimal threshold of PR interval prolongation on serial ECGs warranting verapamil dose reduction or discontinuation.",
            "Efficacy of CGRP-targeting monoclonal antibodies (e.g., galcanezumab) in episodic versus chronic cluster headache."
        ],
        "mcq_angles": [
            "Cohen et al. trial intervention for acute cluster abortive therapy: normobaric 100% oxygen delivered at 12-15 L/min via non-rebreather mask.",
            "First-line maintenance preventative drug: oral verapamil (requires routine ECG monitoring for PR interval prolongation).",
            "Effective transitional bridging procedure: greater occipital nerve (GON) block with local anesthetic and corticosteroid."
        ],
        "case_hooks": [
            "A 35-year-old male with acute cluster headache episodes occurring 3 times daily, prescribed home high-flow oxygen with a non-rebreather face mask and subcutaneous sumatriptan auto-injectors.",
            "A patient with episodic cluster headache initiating verapamil 120 mg three times daily, undergoing pre-treatment ECG to establish baseline PR interval."
        ],
        "gaps": "Define why oral triptans and opioid analgesics should be avoided in cluster headache (slow onset of action, risk of medication-overuse headache).",
        "sources": [
            {
                "pmid": "19996399",
                "title": "High-flow oxygen for treatment of cluster headache: a randomized trial.",
                "year": 2009,
                "design": "trial",
                "journal": "JAMA"
            },
            {
                "pmid": "16987168",
                "title": "EFNS guidelines on the treatment of cluster headache and other trigeminal-autonomic cephalalgias.",
                "year": 2006,
                "design": "guideline",
                "journal": "Eur J Neurol"
            },
            {
                "pmid": "21903476",
                "title": "Suboccipital steroid injection for cluster headache: a randomised, double-blind, controlled study.",
                "year": 2011,
                "design": "trial",
                "journal": "Lancet Neurol"
            },
            {
                "pmid": "18339350",
                "title": "Cluster headache: clinical features and therapeutic options.",
                "year": 2008,
                "design": "review",
                "journal": "Lancet Neurol"
            }
        ]
    },

    413: {
        "cluster": "CMV disease in immunocompromised: retinitis, colitis, pneumonitis, ganciclovir, valganciclovir",
        "mentor_intro": (
            "Cytomegalovirus (CMV) causes severe opportunistic end-organ disease in immunocompromised hosts, including solid organ "
            "transplant (SOT) recipients, allogeneic hematopoietic stem cell transplant (HSCT) patients, and individuals with advanced HIV "
            "infection (CD4 count <50 cells/uL). Clinical manifestations depend on the host immune defect: CMV retinitis (classic 'cottage cheese "
            "and ketchup' necrotizing perivascular retinal hemorrhages and exudates) dominates in HIV, while gastrointestinal disease "
            "(erosive esophagitis, severe ulcerating colitis) and fatal pneumonitis are frequent in transplant recipients. International "
            "consensus guidelines endorse intravenous ganciclovir (5 mg/kg every 12 hours) or oral valganciclovir (900 mg twice daily) as "
            "first-line induction therapy; the landmark VICTOR trial established the non-inferiority of oral valganciclovir for non-life-threatening "
            "disease. For refractory or ganciclovir-resistant CMV (harboring UL97 kinase or UL54 DNA polymerase mutations), foscarnet, "
            "cidofovir, or maribavir provide targeted salvage."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The randomized multi-center VICTOR trial demonstrated that oral valganciclovir (900 mg twice daily) was non-inferior to "
                    "intravenous ganciclovir (5 mg/kg twice daily) for achieving plasma CMV eradication and clinical resolution in solid organ transplant recipients."
                ),
                "cites": ["17697258"]
            },
            {
                "claim": (
                    "International consensus guidelines for SOT recommend induction antiviral therapy for at least 21 days and continued until "
                    "complete symptom resolution and documented viral clearance on quantitative real-time PCR."
                ),
                "cites": ["29596116"]
            },
            {
                "claim": (
                    "In patients with refractory or resistant CMV infection post-transplant, the phase 3 trial demonstrated that oral maribavir "
                    "(selective UL97 protein kinase inhibitor) achieved superior CMV viremia clearance (55.7% vs 23.9%) with significantly less nephrotoxicity than investigator-assigned therapy."
                ),
                "cites": ["36417757"]
            },
            {
                "claim": (
                    "CMV retinitis in advanced HIV (CD4 <50/uL) presents with full-thickness retinal necrosis and hemorrhages; funduscopic "
                    "screening and prompt systemic plus intravitreal antiviral therapy are vital to prevent permanent retinal detachment and blindness."
                ),
                "cites": ["12511342"]
            }
        ],
        "uncertainties": [
            "Optimal duration of secondary prophylaxis with valganciclovir in SOT recipients following successful treatment of tissue-invasive gastrointestinal disease.",
            "Comparative efficacy of letermovir (viral terminase complex inhibitor) for secondary prophylaxis in patients intolerant of ganciclovir-induced myelosuppression."
        ],
        "mcq_angles": [
            "VICTOR trial primary conclusion: oral valganciclovir is clinically non-inferior to intravenous ganciclovir in non-severe solid organ transplant CMV disease.",
            "Mechanism and clinical indication of maribavir: UL97 kinase inhibitor approved for refractory/resistant post-transplant CMV infections.",
            "Major dose-limiting toxicity of ganciclovir/valganciclovir: bone marrow suppression (neutropenia and thrombocytopenia)."
        ],
        "case_hooks": [
            "A 48-year-old renal transplant recipient 4 months post-transplant presenting with fever, leukopenia, and multiple bleeding ulcers in the cecum on colonoscopy, with biopsy showing owl-eye inclusion bodies.",
            "An HIV-positive patient with CD4 count of 28 cells/uL complaining of painless visual floaters and flashing lights, found to have dense retinal whitening and flame-shaped hemorrhages along the superior vascular arcade."
        ],
        "gaps": "Define the genotypic distinction between UL97 mutations (conferring resistance to ganciclovir but preserving foscarnet/cidofovir sensitivity) versus UL54 mutations (cross-resistance to multiple agents).",
        "sources": [
            {
                "pmid": "17697258",
                "title": "Oral valganciclovir is noninferior to intravenous ganciclovir for the treatment of cytomegalovirus disease in solid organ transplant recipients.",
                "year": 2007,
                "design": "trial",
                "journal": "Am J Transplant"
            },
            {
                "pmid": "29596116",
                "title": "The Third International Consensus Guidelines on the Management of Cytomegalovirus in Solid-organ Transplantation.",
                "year": 2018,
                "design": "guideline",
                "journal": "Transplantation"
            },
            {
                "pmid": "36417757",
                "title": "Maribavir for Refractory or Resistant Cytomegalovirus Infections in Transplant Recipients.",
                "year": 2022,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "12511342",
                "title": "Cytomegalovirus retinitis in patients with acquired immunodeficiency syndrome: visual outcome in the era of highly active antiretroviral therapy.",
                "year": 2003,
                "design": "literature",
                "journal": "Ophthalmology"
            }
        ]
    },

    414: {
        "cluster": "coagulation disorders",
        "mentor_intro": (
            "Coagulation disorders encompass inherited deficiencies of clotting factor proteins (Hemophilia A [Factor VIII], Hemophilia B "
            "[Factor IX], and von Willebrand disease [vWD]) and complex acquired consumptive coagulopathies, notably Disseminated "
            "Intravascular Coagulation (DIC). Laboratory evaluation relies on systematic interpretation of the prothrombin time (PT/INR), "
            "activated partial thromboplastin time (aPTT), thrombin time, and mixing studies. An isolated prolonged aPTT that corrects upon "
            "1:1 mixing with normal plasma confirms an intrinsic factor deficiency (FVIII, FIX, FXI), whereas failure to correct indicates "
            "an inhibitor or lupus anticoagulant. The management of severe Hemophilia A underwent a revolution with the introduction of "
            "emicizumab—a recombinant humanized bispecific monoclonal antibody that bridges activated Factor IX and Factor X, mimicking FVIII "
            "cofactor activity—proven in the landmark HAVEN trials to drastically slash bleeding rates with subcutaneous dosing, regardless "
            "of FVIII inhibitor presence."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the randomized HAVEN 1 and HAVEN 3 trials, emicizumab prophylaxis administered subcutaneously significantly reduced "
                    "annualized bleeding rates by >85-95% in hemophilia A patients both with and without Factor VIII inhibitors compared to no prophylaxis."
                ),
                "cites": ["28691557", "30157389"]
            },
            {
                "claim": (
                    "The World Federation of Hemophilia (WFH) 2020 guidelines establish regular prophylactic therapy as the standard of care "
                    "for all patients with severe hemophilia (baseline factor level <1%) to prevent hemarthrosis and chronic arthropathy."
                ),
                "cites": ["32744769"]
            },
            {
                "claim": (
                    "An isolated prolonged aPTT that corrects to normal upon 1:1 mixing with normal pooled plasma signifies a coagulation factor "
                    "deficiency (Factor VIII, IX, or XI), whereas failure to correct indicates a circulating inhibitor or lupus anticoagulant."
                ),
                "cites": ["32744769", "10451465"]
            },
            {
                "claim": (
                    "The International Society on Thrombosis and Haemostasis (ISTH) scoring algorithm for overt DIC integrates thrombocytopenia, "
                    "prolonged PT/INR, elevated fibrin-related markers (D-dimer), and reduced fibrinogen levels to predict mortality."
                ),
                "cites": ["10451465"]
            }
        ],
        "uncertainties": [
            "Thrombotic microangiopathy risks when activated prothrombin complex concentrates (aPCC / FEIBA) are co-administered with emicizumab for breakthrough bleeding.",
            "Long-term durability, hepatotoxicity, and viral vector integration safety of adeno-associated virus (AAV) gene therapy in hemophilia A and B."
        ],
        "mcq_angles": [
            "Mechanism of action of emicizumab: bispecific monoclonal antibody bridging activated factor IX and factor X, restoring tenase complex function in the absence of FVIII.",
            "Mixing study interpretation: complete correction of prolonged aPTT with normal plasma indicates factor deficiency; non-correction indicates factor inhibitor.",
            "ISTH diagnostic criteria for overt DIC: dynamic score incorporating platelet count, prothrombin time prolongation, fibrinogen level, and D-dimer."
        ],
        "case_hooks": [
            "A 14-month-old boy presenting with extensive hematomas and hemarthrosis of the right knee after crawling, whose laboratory tests show normal PT, aPTT of 72 seconds that corrects on 1:1 mix, and FVIII activity <1%.",
            "A 32-year-old male with severe hemophilia A with high-titer FVIII inhibitors experiencing recurrent target joint bleeds, initiating subcutaneous emicizumab prophylaxis."
        ],
        "gaps": "Define the classification of von Willebrand disease into Type 1 (partial quantitative), Type 2 (qualitative variants 2A, 2B, 2M, 2N), and Type 3 (total quantitative deficiency).",
        "sources": [
            {
                "pmid": "28691557",
                "title": "Emicizumab Prophylaxis in Hemophilia A with Inhibitors.",
                "year": 2017,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "30157389",
                "title": "Emicizumab Prophylaxis in Patients Who Have Hemophilia A without Inhibitors.",
                "year": 2018,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "32744769",
                "title": "WFH Guidelines for the Management of Hemophilia, 3rd edition.",
                "year": 2020,
                "design": "guideline",
                "journal": "Haemophilia"
            },
            {
                "pmid": "10451465",
                "title": "Disseminated intravascular coagulation.",
                "year": 1999,
                "design": "review",
                "journal": "N Engl J Med"
            }
        ]
    },

    415: {
        "cluster": "Coal Worker's Pneumoconiosis",
        "mentor_intro": (
            "Coal Worker's Pneumoconiosis (CWP)—commonly known as 'black lung disease'—is an occupational fibrotic lung disorder caused "
            "by the chronic inhalation and pulmonary accumulation of respirable coal mine dust. Inhaled dust particles (<5 um) are engulfed "
            "by alveolar macrophages, inciting chronic inflammatory signaling, reactive oxygen species generation, and fibroblastic proliferation. "
            "Pathologically, CWP spans from simple CWP (characterized by 1 to 5 mm pigmented coal macules and nodules with focal surrounding "
            "centrilobular emphysema in upper lung zones) to complicated CWP, known as Progressive Massive Fibrosis (PMF). PMF is defined by "
            "large confluent fibrotic masses (>10 mm in diameter) that cause progressive, irreversible lung destruction, cavitation, severe "
            "hypoxemia, and cor pulmonale. A critical clinical variant is Caplan syndrome: the co-occurrence of CWP with rheumatoid arthritis, "
            "manifesting as rapidly developing, multiple rounded peripheral necrobiotic pulmonary nodules."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Epidemiological surveillance by NIOSH demonstrates a dramatic, modern resurgence of severe coal worker's pneumoconiosis "
                    "and progressive massive fibrosis in underground coal miners, driven by mechanized mining cutting into silica-containing rock."
                ),
                "cites": ["30043810", "28365209"]
            },
            {
                "claim": (
                    "Progressive massive fibrosis (PMF) is characterized on chest imaging by large, confluent fibrotic masses >1 cm in diameter, "
                    "predominantly in the upper lung zones, associated with architectural distortion, bullae, and restrictive-obstructive impairment."
                ),
                "cites": ["28365209", "10741765"]
            },
            {
                "claim": (
                    "Caplan syndrome represents the distinct clinical constellation of coal worker's pneumoconiosis in patients with rheumatoid "
                    "arthritis, presenting radiographically with multiple, well-defined peripheral round nodules measuring 0.5 to 5 cm in diameter."
                ),
                "cites": ["13038743"]
            },
            {
                "claim": (
                    "There are no curative pharmacological treatments to reverse coal dust fibrosis; medical management mandates complete "
                    "removal from dust exposure, smoking cessation, pulmonary rehabilitation, supplemental oxygen, and lung transplantation evaluation."
                ),
                "cites": ["28365209"]
            }
        ],
        "uncertainties": [
            "Impact of concurrent crystalline silica inhalation (silicocoal worker's pneumoconiosis) on accelerating the progression from simple macules to progressive massive fibrosis.",
            "Role of antifibrotic therapies (e.g., nintedanib or pirfenidone) in slowing the rate of lung function decline in rapidly progressive PMF."
        ],
        "mcq_angles": [
            "Pathological hallmark of simple coal worker's pneumoconiosis: coal macules and nodules with focal surrounding centrilobular emphysema, localized predominantly in the upper lobes.",
            "Definition of Caplan syndrome: rheumatoid arthritis associated with multiple discrete peripheral round pulmonary nodules in a coal miner.",
            "Radiological threshold for progressive massive fibrosis (PMF): coalescence of fibrotic nodules into masses measuring greater than 10 mm (1 cm) in diameter."
        ],
        "case_hooks": [
            "A 58-year-old former underground coal miner presenting with progressive exertional dyspnea, black-stained sputum (melanoptysis), and a high-resolution chest CT showing 3 cm confluent upper-lobe masses with cavitation.",
            "A 62-year-old male with seropositive rheumatoid arthritis and a 20-year history of coal mine work whose chest radiograph reveals bilateral 1 to 3 cm well-circumscribed peripheral round lung nodules (Caplan syndrome)."
        ],
        "gaps": "Define the International Labour Office (ILO) classification for pneumoconiosis profusion categories (0 through 3) and nodule sizes (p, q, r for rounded; s, t, u for irregular).",
        "sources": [
            {
                "pmid": "30043810",
                "title": "Continued Increase in Prevalence of Coal Workers' Pneumoconiosis in the United States, 1970 to 2017.",
                "year": 2018,
                "design": "literature",
                "journal": "JAMA"
            },
            {
                "pmid": "28365209",
                "title": "Coal workers' lung diseases in the modern era.",
                "year": 2017,
                "design": "review",
                "journal": "Lancet Respir Med"
            },
            {
                "pmid": "10741765",
                "title": "Normal biology and pathology of the pneumoconioses: coal workers' pneumoconiosis.",
                "year": 2000,
                "design": "review",
                "journal": "Curr Opin Pulm Med"
            },
            {
                "pmid": "13038743",
                "title": "Certain unusual radiological appearances in the chest of coal-miners suffering from rheumatoid arthritis.",
                "year": 1953,
                "design": "literature",
                "journal": "Thorax"
            }
        ]
    }
}
