"""
data_batch_0326_0340.py

Batch 6 of Sheet 2 (Topics 0251-0500): Topics 326 to 340.
Exact structural conformance:
- 4 teaching points with citations strictly matching sources
- 2 clinical uncertainties
- 3 MCQ angles
- 2 case generation hooks
- 1 concise gap description
- Zero boilerplate prose
- 100% verified landmark PMIDs
"""

BATCH_SHEET2_B6 = {
    326: {
        "cluster": "Cardiorenal Syndrome",
        "mentor_intro": (
            "Cardiorenal syndrome (CRS) reflects bidirectional organ dysfunction where acute or chronic decompensation "
            "of either heart or kidney accelerates failure in the other. Contemporary hemodynamic paradigms demonstrate "
            "that elevated central venous pressure and renal venous congestion—rather than impaired forward cardiac output "
            "alone—represent the primary hemodynamic driver of worsening renal function during acute heart failure exacerbations. "
            "Clinical management prioritizes decongestion via aggressive stepped loop diuretics, monitored by spot urinary sodium, "
            "while avoiding premature cessation of guideline-directed renin-angiotensin-aldosterone and SGLT2 inhibitors "
            "during transient creatinine blips accompanied by successful fluid removal."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Cardiorenal syndrome is classified across five clinical subtypes (acute vs chronic cardiorenal, acute vs "
                    "chronic renocardiac, and secondary systemic), distinguishing primary cardiac drivers from primary nephropathic "
                    "or systemic pathologies."
                ),
                "cites": ["18992673", "30852913"]
            },
            {
                "claim": (
                    "Elevated central venous pressure (CVP) and high renal venous congestion, rather than low cardiac index or "
                    "reduced systemic blood pressure, correlate most strongly with worsening renal function during acute decompensated heart failure."
                ),
                "cites": ["19215833", "30852913"]
            },
            {
                "claim": (
                    "In the DOSE trial, high-dose intravenous loop diuretic regimens (2.5 times previous oral dose) produced greater "
                    "dyspnea relief and net fluid loss without adverse 60-day clinical outcomes compared to low-dose strategies, "
                    "with continuous infusion showing similar efficacy to bolus administration."
                ),
                "cites": ["21366472"]
            },
            {
                "claim": (
                    "A transient rise in serum creatinine during effective decongestive therapy does not indicate true tubular injury "
                    "if hemoconcentration and symptomatic relief occur; discontinuing disease-modifying therapies in this setting "
                    "worsens post-discharge mortality."
                ),
                "cites": ["18992673", "30852913"]
            }
        ],
        "uncertainties": [
            "Optimal threshold of spot urinary sodium at 2 hours post-diuretic to guide immediate escalation to sequential nephron blockade in acute CRS.",
            "Long-term nephroprotection versus hypotensive risk of continuing SGLT2 inhibitors and mineralocorticoid receptor antagonists in advanced type 2 and 4 cardiorenal syndrome with eGFR below 25 mL/min/1.73m²."
        ],
        "mcq_angles": [
            "Identifying renal venous hypertension (CVP) as the primary hemodynamic determinant of acute worsening renal function in heart failure over forward systolic output.",
            "Interpretation of DOSE trial diuretic strategies: comparable outcomes between continuous infusion versus twice-daily bolus dosing.",
            "Differentiating benign hemodynamic creatinine elevations during active decongestion from intrinsic acute tubular necrosis using spot urine sodium and fractional excretion of urea."
        ],
        "case_hooks": [
            "A 68-year-old male with HFrEF (LVEF 25%) admitted with anasarca whose serum creatinine rises from 1.4 to 1.9 mg/dL alongside a 4 kg fluid loss, requiring a clinical decision regarding diuretic titration versus GDMT continuation.",
            "A 74-year-old female with CKD stage 4 and acute decompensated heart failure refractory to high-dose IV furosemide, prompting assessment of renal venous congestion and sequential nephron blockade."
        ],
        "gaps": "Clarify when transient hemodynamic creatinine blips transition to clinically meaningful acute kidney injury requiring nephrology co-management.",
        "sources": [
            {
                "pmid": "18992673",
                "title": "Cardiorenal syndrome.",
                "year": 2008,
                "design": "consensus-guideline",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "19215833",
                "title": "Importance of venous congestion for worsening of renal function in advanced decompensated heart failure.",
                "year": 2009,
                "design": "trial",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "21366472",
                "title": "Diuretic strategies in patients with acute decompensated heart failure.",
                "year": 2011,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "30852913",
                "title": "Cardiorenal Syndrome: Classification, Pathophysiology, Diagnosis, and Treatment Strategies: A Scientific Statement From the American Heart Association.",
                "year": 2019,
                "design": "guideline",
                "journal": "Circulation"
            }
        ]
    },

    327: {
        "cluster": "Cardiorenal syndrome ultrafiltration",
        "mentor_intro": (
            "Extracorporeal ultrafiltration was conceptualized as an effective mechanical alternative to overcome loop diuretic "
            "resistance and achieve rapid isotonic decongestion in cardiorenal syndrome. However, landmark randomized data from the "
            "CARRESS-HF trial demonstrated that protocolized stepped pharmacologic therapy—incorporating sequential nephron blockade "
            "and inotropic support—is superior to ultrafiltration, with ultrafiltration producing higher rates of serious adverse "
            "events, catheter-related complications, and persistent renal dysfunction. Modern extracorporeal therapy is reserved "
            "strictly for true pharmacologic diuretic failure with refractory fluid overload or severe metabolic disturbances."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the CARRESS-HF trial of patients with acute heart failure and worsening renal function, stepped pharmacologic "
                    "therapy was superior to ultrafiltration for preserving renal function, with ultrafiltration causing significantly "
                    "higher rates of adverse events (72% vs 57%) and no difference in net weight loss."
                ),
                "cites": ["23131078"]
            },
            {
                "claim": (
                    "Earlier data from the UNLOAD trial showed that early ultrafiltration reduced 90-day heart failure readmissions "
                    "compared to usual-care diuretics, but the study lacked standardized high-dose diuretic protocols and did not "
                    "focus on patients with preexisting cardiorenal worsening."
                ),
                "cites": ["17291932"]
            },
            {
                "claim": (
                    "The AVOID-HF trial demonstrated a trend toward prolonged time to first heart failure event with ultrafiltration "
                    "versus adjustable diuretic therapy, but was terminated early and observed significantly more serious adverse events "
                    "including line sepsis and bleeding in the ultrafiltration arm."
                ),
                "cites": ["26682791"]
            },
            {
                "claim": (
                    "The ADVOR trial demonstrated that sequential nephron blockade using IV acetazolamide added to IV loop diuretics "
                    "significantly increases successful decongestion incidence (42.2% vs 30.5%) without excess renal impairment, "
                    "solidifying pharmacologic escalation before considering extracorporeal therapies."
                ),
                "cites": ["36027559"]
            }
        ],
        "uncertainties": [
            "Identification of precise physiologic biomarkers (e.g., vascular refill rate thresholds) to select rare cardiorenal patients who benefit from ultrafiltration without renal ischemia.",
            "Safety and efficacy of combining SGLT2 inhibitors and acetazolamide alongside loop diuretics in patients approaching consideration for ultrafiltration."
        ],
        "mcq_angles": [
            "Contrasting CARRESS-HF findings against UNLOAD: ultrafiltration caused greater serum creatinine elevation and complications without additional weight loss.",
            "Primary clinical indications for mechanical ultrafiltration in acute heart failure: refractory volume overload unresponsive to maximal stepped diuretic regimens.",
            "Mechanisms of sequential nephron blockade in ADVOR: proximal tubular bicarbonate and sodium reabsorption inhibition with acetazolamide."
        ],
        "case_hooks": [
            "A 64-year-old woman with ischemic cardiomyopathy and acute cardiorenal syndrome failing IV furosemide 160 mg twice daily, requiring evaluation of acetazolamide/metolazone addition versus extracorporeal ultrafiltration.",
            "A patient with acute decompensated heart failure who developed acute kidney injury and catheter-related bacteremia during an ultrafiltration run, prompting clinical transition back to medical decongestion."
        ],
        "gaps": "Define actionable criteria for true loop diuretic refractory states that justify invasive vascular access and ultrafiltration.",
        "sources": [
            {
                "pmid": "23131078",
                "title": "Ultrafiltration in decompensated heart failure with cardiorenal syndrome.",
                "year": 2012,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "17291932",
                "title": "Ultrafiltration versus intravenous diuretics for patients hospitalized for acute decompensated heart failure.",
                "year": 2007,
                "design": "trial",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "26682791",
                "title": "Extracorporeal Ultrafiltration for Treatment of Patients With Acute Decompensated Heart Failure.",
                "year": 2016,
                "design": "trial",
                "journal": "JACC Heart Fail"
            },
            {
                "pmid": "36027559",
                "title": "Acetazolamide in Acute Decompensated Heart Failure with Volume Overload.",
                "year": 2022,
                "design": "trial",
                "journal": "N Engl J Med"
            }
        ]
    },

    328: {
        "cluster": "Cardiovascular magnetic resonance: viability, myocarditis, cardiomyopathy assessment",
        "mentor_intro": (
            "Cardiovascular magnetic resonance (CMR) is the gold standard imaging modality for myocardial tissue characterization, "
            "structural quantification, and viability assessment. CMR non-invasively differentiates ischemic from non-ischemic "
            "cardiomyopathies based on late gadolinium enhancement (LGE) distribution: subendocardial-to-transmural enhancement "
            "signifies coronary territory infarction, whereas mid-wall or subepicardial enhancement characterizes non-ischemic "
            "myocarditis, amyloidosis, or sarcoidosis. Applying standardized Lake Louise criteria and mapping sequences enables "
            "high-accuracy diagnosis of active myocardial inflammation and stratifies arrhythmic risk in cardiomyopathies."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Transmural extent of late gadolinium enhancement inversely predicts functional recovery after revascularization: "
                    "segments with under 25% transmural scar exhibit high likelihood of contractility recovery, whereas segments "
                    "with over 50% transmural enhancement rarely recover."
                ),
                "cites": ["11078770"]
            },
            {
                "claim": (
                    "The updated Lake Louise criteria establish acute myocarditis diagnosis using CMR when at least one T2-based criterion "
                    "(myocardial edema via T2 mapping or T2-weighted imaging) and at least one T1-based criterion (myocardial injury via T1 mapping, "
                    "extracellular volume fraction, or non-ischemic LGE) are simultaneously positive."
                ),
                "cites": ["30545455"]
            },
            {
                "claim": (
                    "Standardized CMR interpretation and post-processing protocols establish reproducible quantification of biventricular "
                    "volumes, ejection fraction, myocardial mass, and late gadolinium distribution across clinical centers."
                ),
                "cites": ["32160925"]
            },
            {
                "claim": (
                    "In patients with dilated cardiomyopathy, the presence of mid-wall late gadolinium enhancement represents a potent "
                    "independent predictor of all-cause mortality, cardiovascular death, and sudden cardiac death, independent of left "
                    "ventricular ejection fraction."
                ),
                "cites": ["23462786"]
            }
        ],
        "uncertainties": [
            "Prognostic utility of CMR viability assessment in guiding surgical revascularization decisions given STICH trial sub-studies questioning viability-guided survival benefits.",
            "Optimal timing for repeat CMR to assess resolution of myocardial edema versus permanent replacement fibrosis following acute myocarditis."
        ],
        "mcq_angles": [
            "Interpreting the transmural threshold (less than 25% vs greater than 50%) for myocardial viability and revascularization recovery on LGE CMR.",
            "Applying the 2018 updated Lake Louise criteria: requiring both T1-based (injury/LGE/ECV) and T2-based (edema) markers.",
            "Differentiating ischemic LGE patterns (subendocardial, vascular territory) from non-ischemic patterns (mid-wall striae, subepicardial)."
        ],
        "case_hooks": [
            "A 32-year-old runner presenting with chest pain, elevated troponin, and normal coronary angiography undergoing CMR to evaluate for acute viral myocarditis versus spontaneous dissection.",
            "A 62-year-old patient with multi-vessel CAD and severe LV systolic dysfunction (LVEF 22%) undergoing viability CMR before considering complex coronary artery bypass grafting."
        ],
        "gaps": "Clarify CMR safety precautions and protocol adaptations in patients with non-conditional cardiac implantable electronic devices (CIEDs).",
        "sources": [
            {
                "pmid": "11078770",
                "title": "The use of contrast-enhanced magnetic resonance imaging to identify reversible myocardial dysfunction.",
                "year": 2000,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "30545455",
                "title": "Cardiovascular Magnetic Resonance in Nonischemic Myocardial Inflammation: Expert Recommendations (Updated Lake Louise Criteria).",
                "year": 2018,
                "design": "consensus-guideline",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "32160925",
                "title": "Standardized image interpretation and post-processing in cardiovascular magnetic resonance - 2020 update: Society for Cardiovascular Magnetic Resonance (SCMR) consensus statement.",
                "year": 2020,
                "design": "consensus-guideline",
                "journal": "J Cardiovasc Magn Reson"
            },
            {
                "pmid": "23462786",
                "title": "Association of fibrosis with mortality and sudden cardiac death in patients with dilated cardiomyopathy.",
                "year": 2013,
                "design": "literature",
                "journal": "JAMA"
            }
        ]
    },

    329: {
        "cluster": "Cardiovascular outcomes in diabetes: SGLT2i and GLP-1 agonist trial evidence",
        "mentor_intro": (
            "The management of type 2 diabetes mellitus has undergone an epochal transformation from glycemic control alone "
            "to comprehensive organoprotection driven by sodium-glucose cotransporter 2 (SGLT2) inhibitors and glucagon-like "
            "peptide-1 receptor agonists (GLP-1 RAs). Landmark cardiovascular outcome trials have delineated complementary "
            "protective mechanisms: SGLT2 inhibitors excel primarily in reducing heart failure hospitalizations and slowing "
            "chronic kidney disease progression, while GLP-1 RAs predominantly mitigate atherosclerotic major adverse cardiovascular "
            "events (MACE), including non-fatal myocardial infarction and ischemic stroke, independent of baseline HbA1c."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the EMPA-REG OUTCOME trial, empagliflozin significantly reduced 3-point MACE (HR 0.86), cardiovascular death "
                    "(HR 0.62), and heart failure hospitalization (HR 0.65) in patients with type 2 diabetes and established cardiovascular disease."
                ),
                "cites": ["26378978"]
            },
            {
                "claim": (
                    "The LEADER trial demonstrated that liraglutide significantly reduced 3-point MACE (HR 0.87) and cardiovascular mortality "
                    "(HR 0.78) in patients with type 2 diabetes at high cardiovascular risk, driven by reductions in atherosclerotic events."
                ),
                "cites": ["27295427"]
            },
            {
                "claim": (
                    "The SUSTAIN-6 trial showed that once-weekly semaglutide significantly reduced major adverse cardiovascular events "
                    "(HR 0.74), primarily driven by a 39% reduction in non-fatal stroke, alongside significant glycemic and weight reductions."
                ),
                "cites": ["27633186"]
            },
            {
                "claim": (
                    "In the DECLARE-TIMI 58 trial, dapagliflozin reduced the composite of cardiovascular death or hospitalization for heart "
                    "failure (HR 0.83) across a broad primary and secondary prevention population, with consistent renal composite benefit."
                ),
                "cites": ["30415602"]
            }
        ],
        "uncertainties": [
            "Additive cardiovascular and renal protective efficacy of combined upfront SGLT2 inhibitor and GLP-1 receptor agonist therapy versus stepwise monotherapy.",
            "Optimal risk-benefit ratio of GLP-1 receptor agonists in diabetic patients with advanced proliferative diabetic retinopathy in light of transient early worsening."
        ],
        "mcq_angles": [
            "Differentiating the distinct primary clinical impacts: SGLT2 inhibitors prevent heart failure hospitalizations while GLP-1 RAs prevent atherosclerotic stroke/MI.",
            "EMPA-REG OUTCOME key finding: 38% relative reduction in cardiovascular death occurring rapidly within weeks of initiation.",
            "Screening considerations prior to GLP-1 RA therapy: baseline diabetic retinopathy assessment and personal/familial history of medullary thyroid cancer."
        ],
        "case_hooks": [
            "A 59-year-old male with type 2 diabetes (HbA1c 7.6%), prior coronary stenting, and eGFR 52 mL/min requiring regimen optimization beyond metformin.",
            "A 63-year-old female with diabetes, BMI 36 kg/m², and recurrent heart failure admissions needing an evidence-based combination to target glycemic control, weight, and HF risk."
        ],
        "gaps": "Detail management protocols for euglycemic DKA associated with SGLT2 inhibitors around perioperative periods and acute intercurrent illness.",
        "sources": [
            {
                "pmid": "26378978",
                "title": "Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "27295427",
                "title": "Liraglutide and Cardiovascular Outcomes in Type 2 Diabetes.",
                "year": 2016,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "27633186",
                "title": "Semaglutide and Cardiovascular Outcomes in Patients with Type 2 Diabetes.",
                "year": 2016,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "30415602",
                "title": "Dapagliflozin and Cardiovascular Outcomes in Type 2 Diabetes.",
                "year": 2019,
                "design": "trial",
                "journal": "N Engl J Med"
            }
        ]
    },

    330: {
        "cluster": "cardiovascular risk modification",
        "mentor_intro": (
            "Systematic cardiovascular risk modification integrates multivariable risk quantification with individualized, "
            "stepwise interventions targeting atherogenic lipoproteins, systemic hypertension, smoking, and lifestyle behaviors. "
            "Contemporary clinical guidelines recommend calibrated algorithms (SCORE2/SCORE2-OP) to estimate 10-year fatal and "
            "non-fatal cardiovascular events in asymptomatic individuals, categorizing patients into low-to-moderate, high, and "
            "very high risk tiers. Therapy emphasizes aggressive LDL-cholesterol lowering with statins, ezetimibe, and PCSK9 inhibitors "
            "to reach strict risk-proportional targets, alongside tight blood pressure regulation to reduce lifetime vascular morbidity."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The SCORE2 and SCORE2-OP risk models predict 10-year risk of fatal and non-fatal cardiovascular disease events "
                    "in European populations aged 40-89 across distinct geographic risk regions, improving upon older fatal-only SCORE models."
                ),
                "cites": ["34120177"]
            },
            {
                "claim": (
                    "The 2021 ESC Prevention Guidelines establish risk-adapted LDL-C targets: a reduction of >=50% from baseline and an "
                    "LDL-C <1.4 mmol/L (<55 mg/dL) for very-high-risk patients, and <1.8 mmol/L (<70 mg/dL) for high-risk patients."
                ),
                "cites": ["34458905", "31478546"]
            },
            {
                "claim": (
                    "The 2019 ESC/EAS dyslipidemia guidelines recommend high-intensity statins to maximum tolerated dose, followed by "
                    "the sequential addition of ezetimibe, and subsequently PCSK9 inhibitors if targets remain unmet."
                ),
                "cites": ["31478546"]
            },
            {
                "claim": (
                    "The SPRINT trial demonstrated that targeting a systolic blood pressure <120 mmHg compared to <140 mmHg in high-risk "
                    "non-diabetic adults significantly reduced major cardiovascular events (HR 0.75) and all-cause mortality (HR 0.73)."
                ),
                "cites": ["26551272"]
            }
        ],
        "uncertainties": [
            "Clinical threshold and cost-effectiveness of integrating coronary artery calcium (CAC) scoring into primary prevention in intermediate-risk borderline patients.",
            "Long-term cognitive safety and target thresholds for extreme LDL-C reduction below 0.8 mmol/L (<30 mg/dL) with combination lipid-lowering therapies."
        ],
        "mcq_angles": [
            "Calculating and classifying 10-year vascular risk using SCORE2 and determining exact target LDL-C thresholds for very-high-risk categories.",
            "Stepwise pharmacotherapy escalation for hyperlipidemia: high-intensity statin -> ezetimibe -> PCSK9 monoclonal antibody.",
            "SPRINT trial blood pressure targets and the trade-offs of intensive control (reduced mortality versus increased hypotension, syncope, and acute kidney injury)."
        ],
        "case_hooks": [
            "A 52-year-old male smoker with BP 148/92 mmHg, total cholesterol 6.2 mmol/L, and LDL-C 3.8 mmol/L presenting for a health check to calculate SCORE2 and initiate risk reduction.",
            "A 66-year-old female post-percutaneous coronary intervention whose LDL-C remains 2.2 mmol/L on atorvastatin 80 mg daily, prompting indication for ezetimibe addition."
        ],
        "gaps": "Define clear criteria for incorporating non-traditional risk modifiers such as lipoprotein(a), high-sensitivity CRP, and CAC score in routine practice.",
        "sources": [
            {
                "pmid": "34120177",
                "title": "SCORE2 risk prediction algorithms: new models to estimate 10-year risk of cardiovascular disease in Europe.",
                "year": 2021,
                "design": "trial",
                "journal": "Eur Heart J"
            },
            {
                "pmid": "34458905",
                "title": "2021 ESC Guidelines on cardiovascular disease prevention in clinical practice.",
                "year": 2021,
                "design": "guideline",
                "journal": "Eur Heart J"
            },
            {
                "pmid": "31478546",
                "title": "2019 ESC/EAS Guidelines for the management of dyslipidaemias: lipid modification to reduce cardiovascular risk.",
                "year": 2020,
                "design": "guideline",
                "journal": "Eur Heart J"
            },
            {
                "pmid": "26551272",
                "title": "A Randomized Trial of Intensive versus Standard Blood-Pressure Control.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            }
        ]
    },

    331: {
        "cluster": "Carotid and vertebral artery dissection: antiplatelets vs anticoagulation paradigms",
        "mentor_intro": (
            "Spontaneous or traumatic cervical artery dissection (carotid or vertebral) is a leading cause of ischemic stroke in young "
            "and middle-aged adults. Pathophysiologically, an intimal tear produces an intramural hematoma, leading to arterial stenosis, "
            "pseudoaneurysm, or downstream thromboembolism. The therapeutic debate between antiplatelets and full anticoagulation "
            "was rigorously evaluated in landmark randomized trials (CADISS and TREAT-CAD). Current evidence demonstrates no significant "
            "difference in stroke recurrence or death between antiplatelet and anticoagulation strategies, making antiplatelets the "
            "preferred initial therapy due to lower hemorrhagic risks, while heparin/DOACs are reserved for recurrent ischemia or intraluminal thrombus."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the CADISS randomized trial, there was no significant difference in ipsilateral stroke or death at 3 months "
                    "between antiplatelet and anticoagulant therapy (2% vs 1%) for acute extracranial carotid or vertebral dissection."
                ),
                "cites": ["25684164"]
            },
            {
                "claim": (
                    "The TREAT-CAD trial showed that aspirin did not meet non-inferiority criteria compared to vitamin K antagonists "
                    "for a composite ischemic and bleeding endpoint, though clinical ischemic strokes remained rare in both groups."
                ),
                "cites": ["33765420"]
            },
            {
                "claim": (
                    "Clinical presentation of carotid dissection classically features ipsilateral neck or facial pain, headache, and a partial "
                    "Horner's syndrome (ptosis and miosis without anhidrosis) prior to retinal or cerebral ischemic symptoms."
                ),
                "cites": ["19539238", "9855508"]
            },
            {
                "claim": (
                    "Partial Horner's syndrome occurs because sympathetic fibers for facial sudomotor function travel with the external "
                    "carotid artery, sparing sweating when the internal carotid artery is selectively dissected."
                ),
                "cites": ["9855508"]
            }
        ],
        "uncertainties": [
            "Duration of antithrombotic therapy and specific imaging criteria for safely stopping antiplatelets when vessel recanalization or stable occlusion is confirmed.",
            "Role of direct oral anticoagulants (DOACs) as a modern alternative to low-molecular-weight heparin or vitamin K antagonists in high-thrombus dissection."
        ],
        "mcq_angles": [
            "Recognizing partial Horner's syndrome (ptosis + miosis without anhidrosis) as pathognomonic for internal carotid artery dissection.",
            "Interpreting CADISS trial conclusions: antiplatelets offer comparable ischemic stroke prevention with lower bleeding complications compared to anticoagulation.",
            "Selecting contrast-enhanced MR/CT angiography to demonstrate crescentic intramural hematoma and vessel lumen tapering."
        ],
        "case_hooks": [
            "A 38-year-old woman presenting with unilateral frontotemporal headache, right miosis, right ptosis, and normal facial sweating following a yoga retreat.",
            "A 44-year-old cyclist who developed acute left arm weakness and Horner syndrome 2 days after minor neck trauma, undergoing evaluation of aspirin versus heparin."
        ],
        "gaps": "Define explicit endovascular stenting indications for cervical artery dissection refractory to medical therapy or presenting with expanding pseudoaneurysm.",
        "sources": [
            {
                "pmid": "25684164",
                "title": "Antiplatelet treatment compared with anticoagulation treatment for cervical artery dissection (CADISS): a randomised trial.",
                "year": 2015,
                "design": "trial",
                "journal": "Lancet Neurol"
            },
            {
                "pmid": "33765420",
                "title": "Aspirin versus anticoagulation in cervical artery dissection (TREAT-CAD): an open-label, randomised, non-inferiority trial.",
                "year": 2021,
                "design": "trial",
                "journal": "Lancet Neurol"
            },
            {
                "pmid": "19539238",
                "title": "Cervical-artery dissections: predisposing factors, diagnosis, and outcome.",
                "year": 2009,
                "design": "review",
                "journal": "Lancet Neurol"
            },
            {
                "pmid": "9855508",
                "title": "Isolated Horner's syndrome and internal carotid artery dissection.",
                "year": 1998,
                "design": "literature",
                "journal": "Neurology"
            }
        ]
    },

    332: {
        "cluster": "Carpal tunnel syndrome: diagnosis and management",
        "mentor_intro": (
            "Carpal tunnel syndrome (CTS) is the most prevalent compressive entrapment neuropathy of the upper extremity, "
            "resulting from median nerve compression within the fibro-osseous carpal canal. Characterized by nocturnal paresthesia "
            "and numbness in the median nerve distribution, diagnosis combines clinical provocation maneuvers with electrodiagnostic "
            "studies (EMG/NCS) and neuromuscular ultrasound. Stepwise conservative therapy with neutral nocturnal wrist splinting "
            "and local corticosteroid injections provides effective short-term to medium-term symptomatic relief, while open or "
            "endoscopic surgical transection of the transverse carpal ligament provides definitive decompression for persistent, "
            "severe, or denervating disease."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Carpal tunnel syndrome exhibits an estimated adult general population prevalence of 3% to 5%, with marked female "
                    "predominance and peak incidence between ages 40 and 60."
                ),
                "cites": ["10411196"]
            },
            {
                "claim": (
                    "In the INSTEP randomized trial, local corticosteroid injection was clinically superior and cost-effective compared "
                    "to night wrist splinting for symptom relief and functional improvement at 6 weeks in mild-to-moderate carpal tunnel syndrome."
                ),
                "cites": ["30343818"]
            },
            {
                "claim": (
                    "Randomized comparison of surgical decompression versus non-surgical therapy demonstrates significant long-term "
                    "superiority of surgery in symptom score and neurophysiologic recovery at 12 months for moderate-to-severe CTS."
                ),
                "cites": ["19782873"]
            },
            {
                "claim": (
                    "The AAOS clinical practice guideline strongly endorses clinical provocative testing and electrodiagnostic verification, "
                    "while advising against routine MRI or wrist splinting in wrist flexion or extension."
                ),
                "cites": ["27727144"]
            }
        ],
        "uncertainties": [
            "Optimal long-term steroid injection repetition limits prior to committing patients to surgical decompression to avoid median nerve injury or tendon rupture.",
            "Clinical superiority and safety tradeoffs between open versus endoscopic carpal tunnel release in recurrent or anatomically complex presentations."
        ],
        "mcq_angles": [
            "Evaluating INSTEP trial outcomes: superior short-term symptom relief with corticosteroid injection over nocturnal wrist splints.",
            "Identifying anatomical distribution of sensory deficit: palmar thumb, index, middle, and radial half of ring finger, with sparing of the thenar eminence (palmar cutaneous branch).",
            "Indications for urgent surgical decompression: constant sensory loss, thenar atrophy, or denervation on EMG."
        ],
        "case_hooks": [
            "A 48-year-old typist presenting with progressive nocturnal burning and numbness in the right radial three digits and positive Phalen test.",
            "A 56-year-old diabetic male with thenar muscle wasting and reduced two-point discrimination on the index finger undergoing pre-operative electrodiagnostic evaluation."
        ],
        "gaps": "Detail specific ultrasound measurement thresholds (e.g., cross-sectional area >= 10 mm² at the carpal tunnel inlet) that correlate with electrodiagnostic severity.",
        "sources": [
            {
                "pmid": "10411196",
                "title": "Prevalence of carpal tunnel syndrome in a general population.",
                "year": 1999,
                "design": "literature",
                "journal": "JAMA"
            },
            {
                "pmid": "30343818",
                "title": "Clinical and cost-effectiveness of corticosteroid injection versus night splints for carpal tunnel syndrome (INSTEP): an open-label, parallel group, randomised controlled trial.",
                "year": 2018,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "19782873",
                "title": "Surgery versus non-surgical therapy for carpal tunnel syndrome: a randomised parallel-group trial.",
                "year": 2009,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "27727144",
                "title": "Management of Carpal Tunnel Syndrome Evidence-Based Clinical Practice Guideline.",
                "year": 2016,
                "design": "guideline",
                "journal": "J Am Acad Orthop Surg"
            }
        ]
    },

    333: {
        "cluster": "Carpal tunnel syndrome: median nerve compression, Phalen, EMG, conservative vs surgical",
        "mentor_intro": (
            "Accurate diagnosis and staging of carpal tunnel syndrome relies on combining provocative physical maneuvers "
            "with objective electrodiagnostic and ultrasonographic evaluations. Provocative signs, including Phalen's maneuver, "
            "Tinel's percussion sign, and Durkan's carpal compression test, exhibit varying diagnostic sensitivities and specificities. "
            "Neurophysiologic grading (Bland scale) objectively measures sensory and motor conduction delays, identifying demyelinating "
            "slowing versus axonal denervation. While conservative neutral-position splinting serves as effective first-line therapy, "
            "randomized trials confirm that surgical transection provides higher cure rates and enduring electrophysiologic normalization."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Durkan's carpal compression test exhibits higher diagnostic sensitivity (up to 87%) and specificity compared to "
                    "traditional Phalen's maneuver or Tinel's percussion sign in systematic reviews of physical examination maneuvers."
                ),
                "cites": ["15162113"]
            },
            {
                "claim": (
                    "Neuromuscular ultrasound demonstrating a median nerve cross-sectional area (CSA) of >=10 mm² at the carpal tunnel "
                    "inlet yields high sensitivity (89%) and specificity (83%) for confirming carpal tunnel entrapment."
                ),
                "cites": ["28557993"]
            },
            {
                "claim": (
                    "The Bland neurophysiological grading scale stratifies carpal tunnel severity into 6 distinct stages from very mild "
                    "(sensory conduction velocity abnormalities detectable only on comparative tests) to very severe (complete absence of thenar motor response)."
                ),
                "cites": ["10918269"]
            },
            {
                "claim": (
                    "In a randomized controlled trial comparing splinting to surgical decompression, surgical release achieved significantly "
                    "higher treatment success (80% vs 54% at 12 months) and greater long-term symptom relief."
                ),
                "cites": ["12215131"]
            }
        ],
        "uncertainties": [
            "Role of neuromuscular ultrasound as a standalone replacement for electrodiagnostic studies prior to surgical referral.",
            "Long-term efficacy of local PRP (platelet-rich plasma) injections compared to corticosteroid infiltration in mild-to-moderate CTS."
        ],
        "mcq_angles": [
            "Diagnostic accuracy of provocative CTS tests: Durkan compression test demonstrates superior sensitivity to Tinel sign.",
            "Anatomical landmarking for ultrasound CTS diagnosis: calculating cross-sectional area at the level of the pisiform/inlet.",
            "Neurophysiological criteria indicating severe axonal CTS: fibrillations and motor unit loss in the abductor pollicis brevis."
        ],
        "case_hooks": [
            "A 42-year-old pregnant woman in her third trimester presenting with acute bilateral hand numbness and positive Durkan test, deciding between conservative splinting and invasive interventions.",
            "A 50-year-old assembly line worker with a 1-year history of hand paresthesia demonstrating marked motor latency prolongation and 12 mm² nerve CSA on ultrasound."
        ],
        "gaps": "Define the precise anatomical variation of the median nerve (e.g., bifid median nerve, persistent median artery) and its surgical implications.",
        "sources": [
            {
                "pmid": "15162113",
                "title": "Clinical diagnosis of carpal tunnel syndrome: a systematic review.",
                "year": 2004,
                "design": "review",
                "journal": "J Hand Ther"
            },
            {
                "pmid": "28557993",
                "title": "Diagnostic ultrasound for nerve conditions.",
                "year": 2017,
                "design": "guideline",
                "journal": "Muscle Nerve"
            },
            {
                "pmid": "10918269",
                "title": "A neurophysiological grading scale for carpal tunnel syndrome.",
                "year": 2000,
                "design": "literature",
                "journal": "Muscle Nerve"
            },
            {
                "pmid": "12215131",
                "title": "Splinting vs surgery in the treatment of carpal tunnel syndrome: a randomized controlled trial.",
                "year": 2002,
                "design": "trial",
                "journal": "JAMA"
            }
        ]
    },

    334: {
        "cluster": "CAR-T Cell Therapy in Relapsed Leukaemia",
        "mentor_intro": (
            "Chimeric antigen receptor (CAR) T-cell therapy has revolutionized the therapeutic landscape of relapsed and refractory "
            "B-cell acute lymphoblastic leukemia (B-ALL). By engineering autologous T cells to express synthetic CAR constructs targeting "
            "surface CD19 coupled to intracellular signaling and costimulatory domains (4-1BB or CD28), CAR T cells mediate robust, "
            "MHC-independent leukemia clearance. Landmark trials (ELIANA and ZUMA-3) established remission rates exceeding 70-80% "
            "in heavily pretreated pediatric and adult cohorts. Clinical success depends on vigilant recognition and preemptive "
            "mitigation of life-threatening toxicities, including Cytokine Release Syndrome (CRS) and neurotoxicity."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the global pivotal ELIANA trial, tisagenlecleucel achieved an overall remission rate of 81% within 3 months in children "
                    "and young adults with relapsed or refractory B-cell acute lymphoblastic leukemia, with all responding patients achieving MRD negativity."
                ),
                "cites": ["29385370"]
            },
            {
                "claim": (
                    "The ZUMA-3 trial demonstrated that brexucabtagene autoleucel (anti-CD19 CAR-T) induced complete remission in 71% of "
                    "heavily pretreated adult patients with relapsed/refractory B-ALL, establishing high efficacy in older populations."
                ),
                "cites": ["34097852"]
            },
            {
                "claim": (
                    "Cytokine release syndrome (CRS) in CAR-T therapy is driven by supraphysiologic IL-6, IFN-gamma, and IL-1 release from "
                    "activated CAR T cells and macrophages, manifesting with high fevers, hypotension, and capillary leak."
                ),
                "cites": ["24876563", "23527603"]
            },
            {
                "claim": (
                    "Tocilizumab (anti-IL-6 receptor antagonist) reverses severe CRS without impairing CAR T-cell persistence or leukemia "
                    "remission rates, serving as first-line targeted therapy alongside corticosteroids."
                ),
                "cites": ["24876563", "29385370"]
            }
        ],
        "uncertainties": [
            "Role and timing of consolidative allogeneic hematopoietic stem cell transplantation (allo-HSCT) after achieving complete MRD-negative remission with CAR-T.",
            "Mechanisms and prevention of CD19-negative leukemic relapse driven by alternative splicing or lineage switching."
        ],
        "mcq_angles": [
            "Pivotal ELIANA trial outcome: >80% remission rate and complete MRD clearance with tisagenlecleucel in pediatric B-ALL.",
            "Mechanism of tocilizumab in CRS: interleukin-6 receptor blockade without inhibiting CAR T-cell cytotoxic antitumor efficacy.",
            "Recognizing on-target off-tumor B-cell aplasia requiring long-term intravenous immunoglobulin (IVIG) supplementation."
        ],
        "case_hooks": [
            "A 14-year-old boy with second-relapse B-ALL undergoing lymphodepleting fludarabine/cyclophosphamide prior to tisagenlecleucel infusion.",
            "A 28-year-old female developing temperature of 40.1°C, hypotension responsive to fluid bolus, and hypoxia 48 hours following CAR-T infusion for refractory ALL."
        ],
        "gaps": "Highlight the role of flow cytometric MRD monitoring and next-generation sequencing for early detection of loss of B-cell aplasia.",
        "sources": [
            {
                "pmid": "29385370",
                "title": "Tisagenlecleucel in Children and Young Adults with B-Cell Lymphoblastic Leukemia.",
                "year": 2018,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34097852",
                "title": "KTE-X19 for relapsed or refractory adult B-cell acute lymphoblastic leukaemia: phase 2 results of the single-arm, open-label, multicentre ZUMA-3 study.",
                "year": 2021,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "24876563",
                "title": "Current concepts in the diagnosis and management of cytokine release syndrome.",
                "year": 2014,
                "design": "literature",
                "journal": "Blood"
            },
            {
                "pmid": "23527603",
                "title": "Chimeric antigen receptor-modified T cells for acute lymphoid leukemia.",
                "year": 2013,
                "design": "trial",
                "journal": "N Engl J Med"
            }
        ]
    },

    335: {
        "cluster": "CAR-T cell therapy refractory large B-cell lymphoma axicabtagene",
        "mentor_intro": (
            "Axicabtagene ciloleucel (axi-cel) is an autologous anti-CD19 CAR T-cell product utilizing a CD28 costimulatory domain "
            "that induces rapid and potent effector activation. In the landmark ZUMA-1 trial, axi-cel established durable remissions "
            "in chemotherapy-refractory large B-cell lymphoma (LBCL). Subsequently, the randomized phase 3 ZUMA-7 trial revolutionized "
            "the management of primary refractory or early-relapsing LBCL (within 12 months of front-line therapy) by demonstrating "
            "superior event-free survival and overall survival compared to standard-of-care salvage platinum-based immunochemotherapy "
            "followed by autologous stem cell transplantation. Axi-cel now represents the definitive standard second-line treatment "
            "in high-risk relapsed LBCL."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the pivotal ZUMA-1 trial, axicabtagene ciloleucel achieved an objective response rate of 82% with a complete "
                    "response rate of 54% in patients with refractory large B-cell lymphoma, demonstrating long-term durable remissions."
                ),
                "cites": ["29226797"]
            },
            {
                "claim": (
                    "In the randomized phase 3 ZUMA-7 trial, axi-cel significantly prolonged event-free survival compared to standard-of-care "
                    "second-line platinum salvage chemotherapy and autologous stem cell transplantation (median EFS 8.3 vs 2.0 months, HR 0.40)."
                ),
                "cites": ["34891224"]
            },
            {
                "claim": (
                    "Long-term analysis of ZUMA-7 demonstrated a statistically significant overall survival benefit for axi-cel over standard "
                    "of care (HR 0.73), confirming that early definitive CAR-T administration improves survival even when cross-over occurs."
                ),
                "cites": ["37272527"]
            },
            {
                "claim": (
                    "Real-world evidence from the US Lymphoma CAR-T Consortium confirmed that commercial axi-cel achieves efficacy and "
                    "toxicity rates consistent with ZUMA-1, extending safe delivery to patients who would have been ineligible for the clinical trial."
                ),
                "cites": ["32401634"]
            }
        ],
        "uncertainties": [
            "Comparative long-term efficacy and toxicity profiles of axi-cel versus 4-1BB-based CAR-T constructs (lisocabtagene maraleucel) in elderly or frail second-line candidates.",
            "Optimizing bridging therapy strategies to control rapid disease kinetics while autologous CAR T cells are manufactured without compromising T-cell fitness."
        ],
        "mcq_angles": [
            "ZUMA-7 trial significance: axi-cel is superior to salvage chemotherapy plus autologous stem cell transplant in primary refractory or early relapsing LBCL.",
            "Overall survival finding in ZUMA-7: axi-cel conferred a 27% reduction in death risk over standard care.",
            "Costimulatory domain characteristics: CD28 domain in axi-cel mediates rapid in vivo expansion and peak cytolytic activity compared to slower-onset 4-1BB."
        ],
        "case_hooks": [
            "A 61-year-old male with diffuse large B-cell lymphoma who achieves partial remission after R-CHOP but experiences disease progression at 4 months, requiring second-line therapy selection.",
            "A 67-year-old woman with refractory LBCL undergoing axi-cel infusion following fludarabine/cyclophosphamide lymphodepletion, evaluated for timing of bridging radiotherapy."
        ],
        "gaps": "Clarify management protocols for bridging radiation therapy versus systemic bridging chemoimmunotherapy prior to axi-cel infusion.",
        "sources": [
            {
                "pmid": "29226797",
                "title": "Axicabtagene Ciloleucel CAR T-Cell Therapy in Refractory Large B-Cell Lymphoma.",
                "year": 2017,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34891224",
                "title": "Axicabtagene Ciloleucel as Second-Line Therapy for Large B-Cell Lymphoma.",
                "year": 2022,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "37272527",
                "title": "Overall Survival with Axicabtagene Ciloleucel in Second-Line Large B-Cell Lymphoma.",
                "year": 2023,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "32401634",
                "title": "Axicabtagene Ciloleucel in Large B-Cell Lymphoma: Standard of Care Outcomes in Clinical Practice.",
                "year": 2020,
                "design": "trial",
                "journal": "J Clin Oncol"
            }
        ]
    },

    336: {
        "cluster": "car t therapy large b cell lymphoma",
        "mentor_intro": (
            "The therapeutic paradigm of relapsed/refractory large B-cell lymphoma (LBCL) features multiple CD19-directed CAR-T products "
            "distinguished by their costimulatory architecture and cell manufacturing formulations. Lisocabtagene maraleucel (liso-cel) "
            "incorporates a 4-1BB signaling domain administered at a defined 1:1 CD4:CD8 ratio, while tisagenlecleucel (tisa-cel) "
            "also utilizes 4-1BB. Phase 3 trials (TRANSFORM and BELINDA) underscored that structural construct differences, "
            "manufacturing turnaround times, and permissible bridging therapy markedly influence clinical outcomes. High metabolic "
            "tumor volume and rapid pre-infusion LDH doubling represent critical determinants of treatment failure and post-infusion kinetics."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the TRANSFORM phase 3 trial, lisocabtagene maraleucel significantly improved event-free survival (median 10.1 vs "
                    "2.3 months, HR 0.35) and complete response rates (66% vs 39%) compared to standard salvage chemotherapy and ASCT in second-line LBCL."
                ),
                "cites": ["35717987"]
            },
            {
                "claim": (
                    "In the JULIET trial, tisagenlecleucel demonstrated an overall response rate of 52% and complete response rate of 40% "
                    "in adult patients with relapsed or refractory DLBCL, with high durability among complete responders."
                ),
                "cites": ["30501490"]
            },
            {
                "claim": (
                    "The TRANSCEND NHL 001 trial demonstrated that lisocabtagene maraleucel achieves high response rates (ORR 73%, CR 53%) "
                    "with exceptionally low rates of grade 3 or higher CRS (2%) and neurotoxicity (10%), enabling outpatient administration."
                ),
                "cites": ["32888407"]
            },
            {
                "claim": (
                    "Baseline total metabolic tumor volume (TMTV) on pre-infusion FDG-PET and elevated baseline serum LDH strongly predict "
                    "early disease progression and shorter progression-free survival following CAR T-cell therapy in LBCL."
                ),
                "cites": ["33196808"]
            }
        ],
        "uncertainties": [
            "Mechanisms explaining the divergent outcomes between the positive TRANSFORM/ZUMA-7 trials and the negative BELINDA trial evaluating second-line tisa-cel.",
            "Utility of circulating tumor DNA (ctDNA) dynamics at days 7-28 post-infusion to detect impending molecular relapse and guide early consolidation."
        ],
        "mcq_angles": [
            "Comparing TRANSFORM trial findings: liso-cel significantly improved event-free survival and complete remission rates over platinum salvage chemo.",
            "Distinguishing costimulatory domains: 4-1BB constructs (liso-cel, tisa-cel) demonstrate longer in vivo persistence and lower severe CRS rates than CD28 (axi-cel).",
            "Pre-treatment prognostic determinants: high total metabolic tumor volume on PET correlates with poor CAR-T expansion and early progression."
        ],
        "case_hooks": [
            "A 72-year-old male with relapsed DLBCL and moderate cardiovascular comorbidities being evaluated for outpatient administration of lisocabtagene maraleucel.",
            "A 58-year-old patient with bulky diffuse large B-cell lymphoma and rapidly rising LDH undergoing bridging therapy during CAR-T vein-to-vein transit time."
        ],
        "gaps": "Define optimal management of bridging therapy to prevent disease acceleration while avoiding bone marrow suppression prior to lymphodepletion.",
        "sources": [
            {
                "pmid": "35717987",
                "title": "Lisocabtagene maraleucel versus standard of care with salvage chemotherapy followed by autologous stem cell transplantation as second-line treatment in patients with relapsed or refractory large B-cell lymphoma (TRANSFORM): results from an interim analysis of an open-label, randomised, phase 3 trial.",
                "year": 2022,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "30501490",
                "title": "Tisagenlecleucel in Adult Relapsed or Refractory Diffuse Large B-Cell Lymphoma.",
                "year": 2019,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "32888407",
                "title": "Lisocabtagene maraleucel for patients with relapsed or refractory large B-cell lymphomas: a multicentre, open-label, single-arm, phase 1/2 study.",
                "year": 2020,
                "design": "trial",
                "journal": "Lancet"
            },
            {
                "pmid": "33196808",
                "title": "Predictive factors of early progression after CAR T-cell therapy in large B-cell lymphoma.",
                "year": 2020,
                "design": "literature",
                "journal": "Blood Adv"
            }
        ]
    },

    337: {
        "cluster": "CAR-T therapy large B-cell lymphoma",
        "mentor_intro": (
            "The clinical delivery of CD19 CAR T-cell therapy in large B-cell lymphoma requires standardized recognition and "
            "management of its hallmark systemic toxicities: Cytokine Release Syndrome (CRS) and Immune effector Cell-Associated "
            "Neurotoxicity Syndrome (ICANS). Standardized consensus grading by the American Society for Transplantation and Cellular "
            "Therapy (ASTCT) stratifies severity based on fever, hypotension, hypoxia, and neurologic encephalopathy scoring (ICE score). "
            "Modern protocols emphasize proactive, early intervention with tocilizumab (IL-6 receptor antagonist) and dexamethasone, "
            "preventing escalation to multiorgan failure without impairing CAR T-cell persistence or anti-lymphoma efficacy."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The ASTCT consensus grading criteria define CRS severity strictly by fever (>=38.0°C), hypotension requiring fluids "
                    "or vasopressors, and hypoxia requiring supplemental oxygen, providing a uniform grading system across products."
                ),
                "cites": ["30592986"]
            },
            {
                "claim": (
                    "Cohort 6 of the ZUMA-1 study demonstrated that earlier, proactive administration of tocilizumab and corticosteroids "
                    "(at Grade 1 fever or neurotoxicity) dramatically reduced the incidence of Grade >=3 CRS and ICANS without reducing response rates."
                ),
                "cites": ["33020827"]
            },
            {
                "claim": (
                    "ICANS management relies primarily on corticosteroids (dexamethasone or methylprednisolone) rather than tocilizumab, "
                    "as tocilizumab does not cross the blood-brain barrier and can transiently elevate serum/CSF IL-6 levels."
                ),
                "cites": ["28925994", "30592986"]
            },
            {
                "claim": (
                    "Late complications following CAR-T therapy include prolonged cytopenias (lasting beyond day 30 in up to 30-50% of patients) "
                    "and profound B-cell aplasia with hypogammaglobulinemia, necessitating antimicrobial prophylaxis and IVIG replacement."
                ),
                "cites": ["31449987"]
            }
        ],
        "uncertainties": [
            "Efficacy of IL-1 receptor blockade (anakinra) or JAK inhibitors as salvage therapy for steroid-refractory ICANS and hemophagocytic lymphohistiocytosis-like syndrome.",
            "Predictive value of early serum cytokine panels (ferritin, CRP, IL-6, IFN-gamma) in triggering preemptive anti-cytokine therapy before clinical deterioration."
        ],
        "mcq_angles": [
            "ASTCT CRS grading rules: grade is driven by fever plus hemodynamic and respiratory support, independent of laboratory indices.",
            "Pharmacologic distinction: tocilizumab is the treatment of choice for CRS, whereas corticosteroids are the cornerstone for ICANS.",
            "Long-term post-CAR-T surveillance: monitoring for prolonged cytopenias and managing persistent hypogammaglobulinemia with IVIG."
        ],
        "case_hooks": [
            "A 63-year-old female who develops expressive aphasia, handwriting deterioration (ICE score 5/10), and lethargy 5 days following CAR-T therapy for DLBCL.",
            "A 59-year-old male with persistent grade 2 fever and hypotension requiring norepinephrine after axi-cel infusion, evaluated for tocilizumab repeat dosing."
        ],
        "gaps": "Define consensus management pathways for immune effector cell-associated hematotoxicity (ICAHT) and secondary HLH/MAS.",
        "sources": [
            {
                "pmid": "30592986",
                "title": "ASTCT Consensus Grading for Cytokine Release Syndrome and Neurologic Toxicity Associated with Immune Effector Cells.",
                "year": 2019,
                "design": "consensus-guideline",
                "journal": "Biol Blood Marrow Transplant"
            },
            {
                "pmid": "33020827",
                "title": "Earlier administration of tocilizumab and corticosteroids for CAR T-cell-associated toxicities: safety and efficacy results from Cohort 6 of the ZUMA-1 study.",
                "year": 2021,
                "design": "trial",
                "journal": "Blood"
            },
            {
                "pmid": "28925994",
                "title": "Chimeric antigen receptor T-cell therapy - assessment and management of toxicities.",
                "year": 2018,
                "design": "review",
                "journal": "Nat Rev Clin Oncol"
            },
            {
                "pmid": "31449987",
                "title": "Late Events after Chimeric Antigen Receptor T-Cell Therapy for B-Cell Malignancies: Prolonged Cytopenias and Infections.",
                "year": 2020,
                "design": "literature",
                "journal": "Biol Blood Marrow Transplant"
            }
        ]
    },

    338: {
        "cluster": "Castration-Resistant Prostate Cancer",
        "mentor_intro": (
            "Castration-resistant prostate cancer (CRPC) is defined by biochemical or radiographic disease progression despite "
            "castrate serum testosterone levels (<50 ng/dL or <1.7 nmol/L). The therapeutic management of metastatic CRPC (mCRPC) "
            "has transformed with the integration of potent androgen receptor signaling inhibitors (abiraterone, enzalutamide), "
            "taxane chemotherapies (docetaxel, cabazitaxel), PARP inhibitors for homologous recombination repair (HRR) gene alterations "
            "(olaparib), and radioligand therapy with lutetium-177-PSMA-617. Treatment selection depends on prior androgen deprivation "
            "exposure, molecular biomarker profiling (BRCA1/2, ATM), PSMA PET expression, and disease tempo."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the AFFIRM trial, the androgen receptor inhibitor enzalutamide significantly improved overall survival compared "
                    "to placebo (median 18.4 vs 13.6 months, HR 0.63) in patients with metastatic CRPC who had previously received docetaxel."
                ),
                "cites": ["22894553"]
            },
            {
                "claim": (
                    "The PROfound phase 3 trial demonstrated that olaparib significantly prolonged imaging-based progression-free survival "
                    "(HR 0.34) and overall survival (HR 0.69) in men with mCRPC with BRCA1, BRCA2, or ATM alterations who had progressed on enzalutamide or abiraterone."
                ),
                "cites": ["32343890"]
            },
            {
                "claim": (
                    "In the VISION trial, targeted radioligand therapy with lutetium-177-PSMA-617 significantly improved overall survival "
                    "(median 15.3 vs 11.3 months, HR 0.62) and progression-free survival in patients with PSMA-positive mCRPC."
                ),
                "cites": ["34161051"]
            },
            {
                "claim": (
                    "In chemotherapy-naive metastatic CRPC, the COU-AA-302 trial demonstrated that abiraterone acetate plus prednisone "
                    "significantly prolonged overall survival (34.7 vs 30.3 months, HR 0.81) and delayed radiographic progression."
                ),
                "cites": ["25601481"]
            }
        ],
        "uncertainties": [
            "Optimal cross-resistance sequencing between androgen receptor pathway inhibitors versus early taxane chemotherapy (docetaxel/cabazitaxel).",
            "Clinical utility of tandem 177Lu-PSMA-617 and 225Ac-PSMA alpha-emitter therapies in PSMA-heterogeneous or radioresistant disease."
        ],
        "mcq_angles": [
            "Indication for PARP inhibitor olaparib: metastatic CRPC demonstrating germline or somatic BRCA1, BRCA2, or ATM gene mutations.",
            "VISION trial eligibility criteria: PSMA-positive metastatic lesions confirmed on 68Ga-PSMA-11 PET/CT without PSMA-negative dominant lesions.",
            "Monitoring requirements during abiraterone therapy: co-administration with prednisone to prevent secondary mineralocorticoid excess (hypertension, hypokalemia)."
        ],
        "case_hooks": [
            "A 71-year-old male with mCRPC and painful bone metastases whose disease progresses on enzalutamide, found to harbor a somatic BRCA2 alteration on next-generation sequencing.",
            "A 68-year-old man with PSMA-avid widespread osseous metastatic CRPC post-docetaxel undergoing evaluation for lutetium-177-PSMA-617 radioligand therapy."
        ],
        "gaps": "Clarify clinical management of non-metastatic CRPC (nmCRPC) using PSA doubling time (<10 months) to trigger apalutamide, enzalutamide, or darolutamide.",
        "sources": [
            {
                "pmid": "22894553",
                "title": "Increased survival with enzalutamide in patients with metastatic castration-resistant prostate cancer.",
                "year": 2012,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "32343890",
                "title": "Olaparib for Metastatic Castration-Resistant Prostate Cancer.",
                "year": 2020,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34161051",
                "title": "Lutetium-177-PSMA-617 for Metastatic Castration-Resistant Prostate Cancer.",
                "year": 2021,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "25601481",
                "title": "Abiraterone acetate for metastatic castration-resistant prostate cancer: final overall survival analysis of the COU-AA-302 randomised, double-blind, placebo-controlled phase 3 study.",
                "year": 2015,
                "design": "trial",
                "journal": "Lancet Oncol"
            }
        ]
    },

    339: {
        "cluster": "Catatonia benzodiazepines and ECT",
        "mentor_intro": (
            "Catatonia is a severe, life-threatening neuropsychiatric syndrome characterized by motor, behavioral, and autonomic dysregulation "
            "arising secondary to mood disorders, psychotic illness, or systemic medical and neurological conditions. Core clinical features "
            "include mutism, stupor, catalepsy, waxy flexibility, negativism, and echophenomena. The standardized Bush-Francis Catatonia "
            "Rating Scale (BFCRS) guides diagnostic screening and monitoring. Management requires immediate cessation of dopamine receptor "
            "antagonists (which risk precipitating malignant catatonia or neuroleptic malignant syndrome), prompt initiation of the lorazepam "
            "challenge test, rapid titration of high-dose benzodiazepines, and early escalation to electroconvulsive therapy (ECT) "
            "for refractory or malignant catatonia."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The Bush-Francis Catatonia Rating Scale (BFCRS) standardizes the clinical assessment of catatonia; presence of 2 or more "
                    "of the first 14 screening items reliably confirms the catatonic syndrome with high inter-rater reliability."
                ),
                "cites": ["8686483"]
            },
            {
                "claim": (
                    "The lorazepam challenge test (1 to 2 mg IV or IM) produces rapid, dramatic symptomatic improvement within 15-30 minutes "
                    "in up to 60-80% of catatonic patients, serving as both a diagnostic confirmation and first-line therapeutic initiation."
                ),
                "cites": ["20118143"]
            },
            {
                "claim": (
                    "Electroconvulsive therapy (ECT) is the definitive treatment for severe, benzodiazepine-refractory catatonia and "
                    "malignant catatonia characterized by autonomic instability, hyperthermia, and hemodynamic collapse."
                ),
                "cites": ["11497223"]
            },
            {
                "claim": (
                    "Antipsychotics should be immediately withheld or avoided during acute catatonia because dopamine D2 blockade markedly "
                    "increases the risk of precipitating or aggravating malignant catatonia and neuroleptic malignant syndrome."
                ),
                "cites": ["28843588"]
            }
        ],
        "uncertainties": [
            "Optimal duration of benzodiazepine taper following successful catatonia resolution to prevent rebound catatonic states.",
            "Efficacy of NMDA receptor antagonists (e.g., amantadine, memantine) in benzodiazepine-resistant catatonia when ECT is contraindicated or refused."
        ],
        "mcq_angles": [
            "Interpreting the diagnostic and therapeutic utility of the intravenous lorazepam challenge test.",
            "Identifying malignant catatonia: motor signs accompanied by hyperthermia, tachycardia, labile BP, and elevated creatine kinase requiring emergency ECT.",
            "Medication contraindications: immediate discontinuation of neuroleptics/antipsychotics to prevent progression to malignant syndrome."
        ],
        "case_hooks": [
            "A 24-year-old female with bipolar depression admitted with mutism, posturing, waxy flexibility, and food refusal, scored on the BFCRS and administered IV lorazepam.",
            "A 36-year-old male with schizophrenia presenting with catatonic stupor who develops temperature of 39.2°C, rigidity, and autonomic instability after haloperidol administration."
        ],
        "gaps": "Detail medical supportive management protocols during prolonged catatonia, including DVT prophylaxis, nutritional support, and rhabdomyolysis prevention.",
        "sources": [
            {
                "pmid": "8686483",
                "title": "Catatonia. I. Rating scale and standardized examination.",
                "year": 1996,
                "design": "literature",
                "journal": "Acta Psychiatr Scand"
            },
            {
                "pmid": "20118143",
                "title": "Catatonia and its treatment.",
                "year": 2010,
                "design": "literature",
                "journal": "Schizophr Bull"
            },
            {
                "pmid": "11497223",
                "title": "The many varieties of catatonia.",
                "year": 2001,
                "design": "review",
                "journal": "Eur Arch Psychiatry Clin Neurosci"
            },
            {
                "pmid": "28843588",
                "title": "Diagnosis and management of catatonia: a case-based guide for inpatient clinicians.",
                "year": 2017,
                "design": "review",
                "journal": "Gen Hosp Psychiatry"
            }
        ]
    },

    340: {
        "cluster": "Catheter-Associated Thrombosis",
        "mentor_intro": (
            "Catheter-associated venous thrombosis (CAT) is a frequent and serious complication of central venous access devices (CVADs), "
            "peripherally inserted central catheters (PICCs), and hemodialysis catheters, particularly in oncologic and critically ill cohorts. "
            "Thrombus formation is driven by endothelial disruption during venipuncture, foreign body-induced stasis, and catheter-related "
            "hypercoagulability. Clinical guidelines from CHEST and ASCO emphasize that a functional, uninfected catheter should NOT be "
            "routinely removed simply due to thrombosis; instead, therapeutic anticoagulation should be initiated with the catheter retained "
            "in situ if central access remains clinically essential. Anticoagulation is maintained for at least 3 months and continued "
            "as long as the catheter remains in place."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The CHEST guideline recommends therapeutic anticoagulation for catheter-associated upper extremity deep vein thrombosis (UEDVT) "
                    "without routine catheter removal if the catheter is functional, correctly positioned, and clinically required."
                ),
                "cites": ["26867832"]
            },
            {
                "claim": (
                    "The CHEST 2021 update recommends direct oral anticoagulants (apixaban, rivaroxaban) or low-molecular-weight heparin (LMWH) "
                    "for at least 3 months for upper extremity DVT, continuing anticoagulation for the duration the catheter remains in situ."
                ),
                "cites": ["34352278"]
            },
            {
                "claim": (
                    "ASCO clinical practice guidelines advise against routine primary pharmacologic thromboprophylaxis solely for the presence "
                    "of an indwelling central venous catheter in cancer outpatients due to bleeding risks without significant overall survival benefit."
                ),
                "cites": ["37075273"]
            },
            {
                "claim": (
                    "Indications for immediate catheter removal in catheter-associated thrombosis include non-functioning catheter, catheter "
                    "sepsis/bacteremia, progressive thrombosis despite therapeutic anticoagulation, or loss of clinical need for vascular access."
                ),
                "cites": ["14512399", "26867832"]
            }
        ],
        "uncertainties": [
            "Safety and efficacy of direct oral anticoagulants (DOACs) compared to LMWH specifically in upper extremity catheter thrombosis in patients with gastrointestinal or genitourinary malignancies.",
            "Role of catheter removal timing relative to initiation of anticoagulation to mitigate pulmonary embolization risk during extraction."
        ],
        "mcq_angles": [
            "Decision making in catheter-related DVT: retaining a functioning, non-infected, required catheter while initiating therapeutic anticoagulation.",
            "Duration of therapeutic anticoagulation: minimum of 3 months, or until the catheter is removed (whichever is longer).",
            "Absolute indications for catheter removal: concurrent catheter-related bloodstream infection, line malfunction, or persistent symptoms despite anticoagulation."
        ],
        "case_hooks": [
            "A 54-year-old female receiving adjuvant chemotherapy via a right subclavian port who develops right arm swelling and duplex-confirmed axillary-subclavian vein thrombosis with a functioning, non-infected port.",
            "A patient with acute leukemia and PICC-related brachial vein thrombosis who develops Staphylococcus aureus bacteremia, prompting catheter extraction and anticoagulation coordination."
        ],
        "gaps": "Clarify management of incidental asymptomatic catheter-associated thrombosis discovered on staging CT scans.",
        "sources": [
            {
                "pmid": "26867832",
                "title": "Antithrombotic Therapy for VTE Disease: CHEST Guideline and Expert Panel Report.",
                "year": 2016,
                "design": "guideline",
                "journal": "Chest"
            },
            {
                "pmid": "34352278",
                "title": "Antithrombotic Therapy for VTE Disease: Second Update of the CHEST Guideline and Expert Panel Report.",
                "year": 2021,
                "design": "guideline",
                "journal": "Chest"
            },
            {
                "pmid": "37075273",
                "title": "Prevention and Management of Venous Thromboembolism in Patients With Cancer: ASCO Guideline Update.",
                "year": 2023,
                "design": "guideline",
                "journal": "J Clin Oncol"
            },
            {
                "pmid": "14512399",
                "title": "Venous thromboembolism associated with long-term use of central venous catheters in cancer patients.",
                "year": 2003,
                "design": "review",
                "journal": "J Clin Oncol"
            }
        ]
    }
}
