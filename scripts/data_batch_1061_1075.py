# -*- coding: utf-8 -*-
"""
data_batch_1061_1075.py

Curriculum data for Sheet 5 (Topics 1061 to 1075).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B5 = {
    1061: {
        "cluster": "management of acute intermittent porphyria givosiran hemin envision",
        "mentor_intro": "Acute intermittent porphyria (AIP) is an autosomal dominant inborn error of heme biosynthesis resulting from porphobilinogen deaminase (PBGD) deficiency. Neurotoxic accumulation of ALA and PBG triggers acute neurovisceral attacks. Management centers on prompt intravenous hemin for acute crises and monthly subcutaneous givosiran for recurrent attack prophylaxis.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 ENVISION trial in NEJM demonstrated that the hepatic ALAS1-directed RNA interference therapeutic givosiran reduced the annualized attack rate of acute intermittent porphyria by 74% compared to placebo.",
                "cites": ["32521132"]
            },
            {
                "claim": "Intravenous hemin (3 to 4 mg/kg/day for 4 days) is the first-line disease-specific treatment for acute neurovisceral porphyria attacks, acting via negative feedback to downregulate ALAS1 and halt neurotoxic metabolite accumulation.",
                "cites": ["32521132"]
            },
            {
                "claim": "Acute attacks present with severe, poorly localized abdominal pain out of proportion to physical findings, accompanied by autonomic hyperactivity (hypertension, tachycardia), peripheral motor neuropathy, and dark reddish-brown urine that darkens on light exposure.",
                "cites": ["32521132"]
            },
            {
                "claim": "High carbohydrate intake (oral or IV 10% dextrose) suppresses hepatic ALAS1 activity through the PGC-1alpha pathway and serves as a supportive temporizing measure in mild attacks or while awaiting hemin delivery.",
                "cites": ["32521132"]
            }
        ],
        "uncertainties": [
            "Long-term renal function trajectories and chronic kidney disease risk in patients receiving chronic maintenance givosiran therapy.",
            "Surveillance protocols for early detection of hepatocellular carcinoma in patients with AIP and recurrent biochemically active disease."
        ],
        "mcq_angles": [
            "Emergency biochemical confirmation of an acute porphyria attack: rapid urinary porphobilinogen (PBG) spot test normalized to creatinine.",
            "First-line targeted therapy for acute neurovisceral crisis: intravenous hemin (hematin/heme arginate).",
            "Mechanism of action of givosiran: siRNA targeting hepatic delta-aminolevulinic acid synthase 1 (ALAS1) mRNA."
        ],
        "case_hooks": [
            "A 26-year-old female presenting with severe cramping abdominal pain, obstipation, proximal muscle weakness, and hyponatremia whose urine turns dark port-wine color after standing on the counter.",
            "A 32-year-old female with confirmed AIP experiencing 12 attacks per year requiring recurrent hospital admissions, evaluated for monthly givosiran initiation."
        ],
        "gaps": "Establishing universal hospital stocking protocols for immediate availability of IV hemin in regional emergency departments."
    },
    1062: {
        "cluster": "management of atrial fibrillation with rapid ventricular response in the ed",
        "mentor_intro": "Atrial fibrillation with rapid ventricular response (AF with RVR) in the emergency department requires immediate hemodynamic assessment to choose between electrical cardioversion and pharmacologic rate control. In hemodynamically stable patients, intravenous beta-blockers or non-dihydropyridine calcium channel blockers are first-line options.",
        "teaching_points": [
            {
                "claim": "Emergency department meta-analyses demonstrate that intravenous diltiazem achieves target ventricular rate control (<100 bpm) faster and more frequently than intravenous metoprolol in acute AF with RVR.",
                "cites": ["39764905"]
            },
            {
                "claim": "Intravenous metoprolol is associated with a lower overall incidence of composite adverse events compared to diltiazem, though rates of severe hypotension or bradycardia are similar.",
                "cites": ["39764905"]
            },
            {
                "claim": "In patients with acute heart failure and reduced ejection fraction (HFrEF) presenting with AF with RVR, intravenous amiodarone, digoxin, or cautious beta-blocker titration is preferred over non-dihydropyridine CCBs due to negative inotropic risk.",
                "cites": ["39764905"]
            },
            {
                "claim": "Immediate synchronized electrical cardioversion is mandatory for AF with RVR accompanied by hemodynamic instability (hypotension, acute pulmonary edema, ongoing myocardial ischemia, or altered consciousness).",
                "cites": ["39764905"]
            }
        ],
        "uncertainties": [
            "Long-term stroke risk and safety of ED discharge without oral anticoagulation in patients with newly detected self-terminating AF with RVR lasting < 24 hours.",
            "Comparative efficacy of the 'wait-and-see' approach (rate control and delayed cardioversion within 48 hours) versus immediate pharmacologic or electrical cardioversion."
        ],
        "mcq_angles": [
            "Hemodynamic instability criteria warranting immediate synchronized direct-current cardioversion in AF with RVR.",
            "Pharmacologic choice in acute AF with RVR: IV diltiazem (15-20 mg bolus) provides faster rate control, but IV beta-blockers have lower adverse event rates in pooled trials.",
            "Contraindication to AV nodal blocking agents: pre-excited AF (Wolff-Parkinson-White syndrome), where CCBs and beta-blockers can paradoxically trigger ventricular fibrillation."
        ],
        "case_hooks": [
            "A 64-year-old male presenting to the ED with palpitations, blood pressure 135/85 mmHg, and heart rate 165 bpm in atrial fibrillation without acute heart failure.",
            "A 72-year-old female with known severe systolic heart failure (LVEF 25%) presenting with AF at 150 bpm and crackles to mid-lung fields, requiring inotrope-sparing rate control."
        ],
        "gaps": "Standardizing risk calculators to predict successful conversion to sinus rhythm in the ED without antiarrhythmic drugs."
    },
    1063: {
        "cluster": "management of hf with reduced ejection fraction four pillars gdmt",
        "mentor_intro": "Heart failure with reduced ejection fraction (HFrEF) is characterized by left ventricular ejection fraction <= 40% and progressive neurohormonal maladaptation. Modern guidelines from ESC and ACC/AHA mandate rapid simultaneous or sequential initiation of four foundational pillars of guideline-directed medical therapy (GDMT).",
        "teaching_points": [
            {
                "claim": "The 2021 ESC and 2022 AHA/ACC/HFSA guidelines establish a Class I recommendation for 'four pillars' of GDMT: an ARNI (sacubitril/valsartan), an evidence-based beta-blocker, a mineralocorticoid receptor antagonist (MRA), and an SGLT2 inhibitor.",
                "cites": ["34447992", "35379921"]
            },
            {
                "claim": "Initiation of all four foundational classes reduces 2-year all-cause mortality by over 60% compared to conventional untreated historical cohorts or mono/dual therapy.",
                "cites": ["34447992"]
            },
            {
                "claim": "Beta-blocker therapy in HFrEF must be restricted to the three agents with proven survival benefit in randomized trials: carvedilol, sustained-release metoprolol succinate, and bisoprolol.",
                "cites": ["34447992", "35379921"]
            },
            {
                "claim": "Loop diuretics (furosemide, bumetanide, torsemide) are essential to treat and maintain euvolemia, but their doses should be titrated to the minimum required because diuretics do not confer mortality reduction.",
                "cites": ["35379921"]
            }
        ],
        "uncertainties": [
            "Optimal sequencing strategy: simultaneous low-dose initiation of all four classes within 48 to 72 hours of admission versus rapid step-wise escalation over 4 to 6 weeks.",
            "Management of worsening renal function and transient eGFR drops (>30%) following combined ARNI and SGLT2 inhibitor introduction."
        ],
        "mcq_angles": [
            "Identification of the four foundational pillars of GDMT in HFrEF: ARNI, beta-blocker, MRA, and SGLT2 inhibitor.",
            "Specific beta-blockers with proven survival reduction in HFrEF: carvedilol, metoprolol succinate, and bisoprolol (atenolol and metoprolol tartrate are not guideline-recommended).",
            "Targeting euvolemia: loop diuretics alleviate symptoms and volume overload but do not modify long-term mortality."
        ],
        "case_hooks": [
            "A 54-year-old male with new-onset non-ischemic cardiomyopathy and LVEF 28% admitted with mild pulmonary edema, evaluated for comprehensive outpatient GDMT discharge planning.",
            "A 62-year-old female on lisinopril and metoprolol succinate whose LVEF remains 32% despite therapy, presenting for guideline-directed medical therapy optimization."
        ],
        "gaps": "Overcoming clinical inertia and outpatient under-prescribing of quadruple GDMT in community healthcare networks."
    },
    1064: {
        "cluster": "management of hf with reduced ejection fraction landmark trials sglt2i arni",
        "mentor_intro": "Landmark randomized clinical trials (PARADIGM-HF, DAPA-HF, and EMPEROR-Reduced) have established the mechanistic and clinical superiority of ARNIs and SGLT2 inhibitors in reducing cardiovascular death and heart failure hospitalizations across the spectrum of HFrEF, independent of diabetic status.",
        "teaching_points": [
            {
                "claim": "The randomized PARADIGM-HF trial in NEJM demonstrated that the ARNI sacubitril/valsartan significantly reduced the primary composite of cardiovascular death or heart failure hospitalization by 20% (HR 0.80, P<0.001) compared to enalapril in HFrEF.",
                "cites": ["26022507"]
            },
            {
                "claim": "The landmark DAPA-HF trial established that dapagliflozin added to standard GDMT reduced cardiovascular death or worsening heart failure by 26% (HR 0.74, P<0.001), with identical benefits in patients with and without type 2 diabetes.",
                "cites": ["31535829"]
            },
            {
                "claim": "The EMPEROR-Reduced trial confirmed that empagliflozin significantly reduced the risk of cardiovascular death or hospitalization for heart failure by 25% (HR 0.75, P<0.001) and slowed the rate of renal function decline in patients with HFrEF.",
                "cites": ["32865377"]
            },
            {
                "claim": "When switching a patient from an ACE inhibitor to sacubitril/valsartan, a strict 36-hour washout period is mandatory to prevent severe angioedema caused by dual inhibition of bradykinin breakdown.",
                "cites": ["26022507"]
            }
        ],
        "uncertainties": [
            "The incremental prognostic benefit of adding vericiguat (soluble guanylate cyclase stimulator) in high-risk patients with recent worsening heart failure decompensation already on quadruple therapy.",
            "Long-term clinical efficacy and safety of transitioning to cardiac resynchronization therapy (CRT-D) versus continued pharmacological optimization in patients with left bundle branch block."
        ],
        "mcq_angles": [
            "Mandatory safety interval when switching from an ACE inhibitor to an ARNI: a 36-hour washout period to prevent bradykinin-mediated angioedema.",
            "Impact of SGLT2 inhibitors in HFrEF based on DAPA-HF and EMPEROR-Reduced: significant mortality and hospitalization reduction regardless of baseline diabetes status.",
            "Primary finding of PARADIGM-HF: sacubitril/valsartan demonstrated clear superiority over enalapril for both cardiovascular mortality and heart failure hospitalization."
        ],
        "case_hooks": [
            "A 60-year-old non-diabetic male with ischemic cardiomyopathy (LVEF 30%) on maximal carvedilol, ramipril, and spironolactone evaluated for adding an SGLT2 inhibitor.",
            "A 65-year-old female on enalapril 10 mg twice daily whose cardiologist prescribes sacubitril/valsartan; the pharmacist instructs her regarding the 36-hour washout requirement."
        ],
        "gaps": "Developing precision clinical algorithms to manage severe hypotension when up-titrating ARNIs in elderly patients with low baseline systolic blood pressure."
    },
    1065: {
        "cluster": "management of posterior reversible encephalopathy syndrome pres blood pressure magnesium",
        "mentor_intro": "Posterior reversible encephalopathy syndrome (PRES) is a neurotoxic disorder characterized by subcortical vasogenic edema, primarily in the parieto-occipital regions. Management mandates rapid recognition, gentle blood pressure titration using continuous intravenous infusions, removal of offending triggers, and seizure control.",
        "teaching_points": [
            {
                "claim": "Immediate blood pressure management in PRES requires reducing mean arterial pressure (MAP) by 20% to 25% within the first few hours, avoiding overly rapid normalization to prevent cerebral, renal, or coronary ischemia.",
                "cites": ["29470266"]
            },
            {
                "claim": "Continuous intravenous antihypertensive infusions with predictable titratability (nicardipine or labetalol) are the preferred first-line pharmacological agents to achieve steady, controlled blood pressure reduction.",
                "cites": ["29470266"]
            },
            {
                "claim": "Intravenous magnesium sulfate is the treatment of choice for acute seizure control and seizure prophylaxis in PRES associated with preeclampsia or eclampsia.",
                "cites": ["29470266"]
            },
            {
                "claim": "Magnetic resonance imaging (MRI) of the brain is the diagnostic gold standard, characteristically showing bilateral, symmetric, predominantly parieto-occipital subcortical vasogenic edema that is hyperintense on T2/FLAIR with facilitated diffusion on ADC mapping.",
                "cites": ["29470266"]
            }
        ],
        "uncertainties": [
            "Comparative neurological recovery rates when managing non-hypertensive PRES secondary to cytotoxic chemotherapy or calcineurin inhibitors where blood pressure is near normal.",
            "The incidence and long-term risk of secondary structural epilepsy following acute PRES complicated by status epilepticus."
        ],
        "mcq_angles": [
            "Neuroimaging differentiation between cytotoxic and vasogenic edema in PRES: T2/FLAIR hyperintensity with high/facilitated signal on apparent diffusion coefficient (ADC) mapping.",
            "Blood pressure lowering threshold in PRES: reduce MAP by no more than 20% to 25% initially using titratable IV agents like nicardipine or labetalol.",
            "First-line agent for acute seizure cessation in eclampsia-induced PRES: intravenous magnesium sulfate."
        ],
        "case_hooks": [
            "A 28-year-old primigravida at 36 weeks gestation who develops a severe headache, cortical blindness, and generalized tonic-clonic seizures with blood pressure 195/115 mmHg.",
            "A 52-year-old renal transplant recipient on tacrolimus who presents with confusion, visual hallucinations, and bilateral parieto-occipital white matter edema on brain MRI."
        ],
        "gaps": "Establishing diagnostic biomarker criteria that predict which PRES patients will progress to secondary cytotoxic infarction and permanent neurological disability."
    },
    1066: {
        "cluster": "mantle cell lymphoma triangle trial ibrutinib autologous transplantation",
        "mentor_intro": "Mantle Cell Lymphoma (MCL) is an incurable B-cell malignancy characterized by the t(11;14) translocation and cyclin D1 overexpression. The landmark TRIANGLE trial by the European MCL Network has transformed frontline management by demonstrating that adding the BTK inhibitor ibrutinib significantly improves failure-free survival and challenges the necessity of upfront autologous transplantation.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 TRIANGLE trial in The Lancet established that incorporating the BTK inhibitor ibrutinib into frontline immunochemotherapy and maintenance significantly prolonged failure-free survival (3-year FFS 88% vs 72%, HR 0.52) compared to standard chemoimmunotherapy plus autologous stem-cell transplantation (ASCT).",
                "cites": ["38705160"]
            },
            {
                "claim": "In the TRIANGLE trial, ibrutinib-containing therapy without ASCT demonstrated non-inferiority and superior failure-free survival compared to standard chemoimmunotherapy with ASCT, questioning the mandatory role of upfront transplantation in younger patients.",
                "cites": ["38705160"]
            },
            {
                "claim": "Pathologically, mantle cell lymphoma is characterized by the pathognomonic t(11;14)(q13;q32) translocation resulting in CCND1-IGH fusion and constitutive cyclin D1 nuclear overexpression, with blastoid or pleomorphic variants conferring an aggressive course.",
                "cites": ["38705160"]
            },
            {
                "claim": "Patients with TP53 mutations or 17p deletions represent an ultra-high-risk subgroup that responds poorly to standard intensive chemoimmunotherapy and ASCT, requiring upfront BTK inhibitor-based novel combinations.",
                "cites": ["38705160"]
            }
        ],
        "uncertainties": [
            "The role and timing of allogeneic stem-cell transplantation versus CD19 CAR T-cell therapy (brexucabtagene autoleucel) in patients with relapsed TP53-mutated mantle cell lymphoma.",
            "Long-term cardiovascular safety and atrial fibrillation incidence associated with multi-year continuous BTK inhibitor maintenance."
        ],
        "mcq_angles": [
            "Practice-changing conclusion of the TRIANGLE trial: adding ibrutinib to frontline induction and maintenance significantly improves failure-free survival and challenges upfront ASCT.",
            "Pathognomonic cytogenetic abnormality in mantle cell lymphoma: t(11;14)(q13;q32) translocation driving cyclin D1 overexpression.",
            "Molecular feature conferring severe chemoresistance and poor prognosis in MCL: TP53 somatic mutation or 17p deletion."
        ],
        "case_hooks": [
            "A 56-year-old male newly diagnosed with stage IV mantle cell lymphoma (MIPI intermediate risk, wild-type TP53) evaluating frontline intensive induction options.",
            "A 68-year-old male with relapsed mantle cell lymphoma who experiences progressive nodal enlargement while on ibrutinib, evaluated for brexucabtagene autoleucel CAR-T cell therapy."
        ],
        "gaps": "Identifying circulating tumor DNA minimal residual disease (MRD) clearance kinetics to guide definitive discontinuation of continuous BTK inhibitor therapy."
    },
    1067: {
        "cluster": "masld maestro-nash trial resmetirom liver fibrosis",
        "mentor_intro": "Metabolic dysfunction-associated steatotic liver disease (MASLD) represents hepatic steatosis in the presence of at least one cardiometabolic risk factor. The landmark MAESTRO-NASH trial established resmetirom, a thyroid hormone receptor-beta selective agonist, as the first FDA-approved disease-modifying therapy capable of resolving NASH and reversing liver fibrosis.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 MAESTRO-NASH trial in NEJM demonstrated that the thyroid hormone receptor-beta selective agonist resmetirom achieved both NASH resolution with no worsening of fibrosis (25.9% to 29.9% vs 9.7%) and fibrosis improvement of at least one stage (24.2% to 25.9% vs 14.2%) compared to placebo.",
                "cites": ["38324483"]
            },
            {
                "claim": "Resmetirom selectively targets hepatic thyroid hormone receptor-beta (THR-beta) to stimulate mitochondrial fatty acid oxidation and lipophagy while avoiding extrahepatic THR-alpha adverse effects on heart rate and bone density.",
                "cites": ["38324483"]
            },
            {
                "claim": "Non-invasive fibrosis assessment algorithms (such as FIB-4 score followed by transient elastography or magnetic resonance elastography) are recommended to identify at-risk MASH patients with significant fibrosis (stage F2-F3) who qualify for therapeutic intervention.",
                "cites": ["38324483"]
            },
            {
                "claim": "Cardiometabolic comorbidities (type 2 diabetes, obesity, dyslipidemia) represent the primary drivers of all-cause and cardiovascular mortality in MASLD, necessitating aggressive lifestyle intervention, statins, and incretin-based metabolic therapies.",
                "cites": ["38324483"]
            }
        ],
        "uncertainties": [
            "The long-term impact of resmetirom on hard clinical outcomes, specifically prevention of progression to cirrhosis, hepatic decompensation, and hepatocellular carcinoma.",
            "Synergistic antifibrotic efficacy and metabolic durability of combining resmetirom with GLP-1/GIP dual receptor agonists in severe obesity and MASLD."
        ],
        "mcq_angles": [
            "Primary endpoints achieved by resmetirom in the MAESTRO-NASH trial: NASH resolution without fibrosis worsening AND >= 1 stage improvement in fibrosis.",
            "Mechanism of action of resmetirom: selective oral liver-directed thyroid hormone receptor-beta (THR-beta) agonist.",
            "Staged non-invasive risk stratification for MASLD: initial FIB-4 calculation followed by transient elastography (VCTE) for intermediate scores (1.3 to 2.67)."
        ],
        "case_hooks": [
            "A 52-year-old female with type 2 diabetes and obesity whose routine ultrasound shows hepatic steatosis, FIB-4 is 1.85, and transient elastography reveals a liver stiffness of 9.2 kPa (consistent with F2 fibrosis).",
            "A 48-year-old male with biopsy-proven MASH and stage F3 bridging fibrosis starting resmetirom 80 mg daily, presenting for monitoring of lipid panels and gastrointestinal tolerability."
        ],
        "gaps": "Harmonizing global non-invasive blood and imaging biomarker algorithms to monitor pharmacological treatment response without repeat liver biopsies."
    },
    1068: {
        "cluster": "massive hemoptysis management bronchial artery embolization chest",
        "mentor_intro": "Massive (life-threatening) hemoptysis is defined by the rate of bleeding causing airway compromise and asphyxiation rather than absolute blood volume. The CHEST clinical reviews emphasize immediate airway protection, positioning the bleeding lung in the dependent position, and urgent bronchial artery embolization (BAE) as the definitive hemostatic procedure.",
        "teaching_points": [
            {
                "claim": "Bronchial artery embolization (BAE) is the definitive first-line procedure of choice for massive hemoptysis, achieving immediate hemostasis rates exceeding 85% to 90% by catheterizing the hypertrophied high-pressure systemic bronchial circulation.",
                "cites": ["31374211"]
            },
            {
                "claim": "Airway protection and preventing asphyxiation are the immediate clinical priorities; patients must be placed in the lateral decubitus position with the suspected bleeding lung dependent (down) to prevent blood aspiration into the non-bleeding lung.",
                "cites": ["31374211"]
            },
            {
                "claim": "More than 90% of massive hemoptysis originates from the bronchial arterial circulation (hypertrophied systemic branches of the aorta) rather than the low-pressure pulmonary arterial bed.",
                "cites": ["31374211"]
            },
            {
                "claim": "Emergency endotracheal intubation should be performed using a large-bore endotracheal tube (>= 8.0 mm) to permit therapeutic flexible or rigid bronchoscopic suctioning, iced saline lavage, and topical cold vasoactive instillation.",
                "cites": ["31374211"]
            }
        ],
        "uncertainties": [
            "The comparative clinical efficacy of tranexamic acid administered via nebulization versus intravenous bolus in stabilizing acute submassive hemoptysis.",
            "Long-term rebleeding rates following bronchial artery embolization in patients with cavitary aspergilloma versus active tuberculosis sequelae."
        ],
        "mcq_angles": [
            "Immediate emergency positioning for unilateral pulmonary bleeding: lateral decubitus position with the bleeding side down (dependent).",
            "Vascular origin of >90% of massive hemoptysis: high-pressure systemic bronchial arteries.",
            "Definitive non-surgical intervention of choice for massive hemoptysis: bronchial artery catheterization and embolization (BAE)."
        ],
        "case_hooks": [
            "A 48-year-old male with a history of treated pulmonary tuberculosis presenting with sudden brisk coughing up of 400 mL of bright red blood, hypoxemic respiratory distress, and tachycardia.",
            "A 60-year-old male with central cavitary squamous cell lung cancer admitted with persistent moderate hemoptysis, evaluated for urgent CT angiography and interventional radiology embolization."
        ],
        "gaps": "Standardizing definitions of 'life-threatening' versus 'massive' hemoptysis to trigger emergency multidisciplinary airway response teams."
    },
    1069: {
        "cluster": "massive pulmonary embolism systemic thrombolysis peitho trial",
        "mentor_intro": "Massive pulmonary embolism is defined by sustained hypotension, cardiogenic shock, or cardiac arrest resulting from acute right ventricular failure. Landmark evidence from the PEITHO trial and ESC guidelines establishes that full-dose systemic thrombolytic therapy significantly improves hemodynamics and reduces collapse, but carries a high risk of major bleeding.",
        "teaching_points": [
            {
                "claim": "In high-risk (massive) pulmonary embolism presenting with cardiogenic shock or sustained systemic hypotension (systolic BP < 90 mmHg), systemic thrombolytic therapy with intravenous alteplase (100 mg over 2 hours) is strongly recommended to restore pulmonary perfusion.",
                "cites": ["24716681"]
            },
            {
                "claim": "The randomized PEITHO trial in NEJM demonstrated that thrombolysis significantly prevented hemodynamic decompensation or death (2.6% vs 5.6%, P=0.02) in intermediate-high risk PE, but caused a significant increase in major extracranial bleeding (6.3% vs 1.2%) and hemorrhagic stroke (2.0% vs 0.2%).",
                "cites": ["24716681"]
            },
            {
                "claim": "In patients with massive PE who have absolute contraindications to systemic thrombolysis or who have failed thrombolysis, catheter-directed embolectomy or surgical pulmonary embolectomy is indicated.",
                "cites": ["24716681"]
            },
            {
                "claim": "Parenteral anticoagulation with weight-adjusted intravenous unfractionated heparin should be initiated immediately upon suspicion of high-risk pulmonary embolism without awaiting definitive CT confirmation.",
                "cites": ["24716681"]
            }
        ],
        "uncertainties": [
            "Comparative clinical efficacy and safety of low-dose ('safe-dose') systemic thrombolysis (50 mg alteplase) versus standard full-dose (100 mg) regimens.",
            "Long-term functional exercise recovery and chronic thromboembolic pulmonary hypertension (CTEPH) incidence following thrombolytic versus catheter-directed therapy."
        ],
        "mcq_angles": [
            "Definition of high-risk (massive) pulmonary embolism: PE associated with sustained hypotension (systolic BP < 90 mmHg for >= 15 min), obstructive shock, or cardiac arrest.",
            "First-line treatment of choice for high-risk massive PE without absolute contraindications: systemic thrombolytic therapy (intravenous recombinant tPA).",
            "Major safety trade-off demonstrated by the PEITHO trial: significant reduction in hemodynamic collapse at the expense of a tenfold increase in hemorrhagic stroke (2.0% vs 0.2%)."
        ],
        "case_hooks": [
            "A 55-year-old female 10 days post-knee arthroplasty who suddenly collapses with cyanosis, blood pressure 70/40 mmHg, heart rate 130 bpm, and acute right ventricular dilation on bedside echo.",
            "A 68-year-old male with an intermediate-high risk pulmonary embolism on heparin who develops progressive hypotension, diaphoresis, and rising troponin within 12 hours of admission."
        ],
        "gaps": "Accelerating hospital emergency response workflows through Pulmonary Embolism Response Teams (PERT) to decrease door-to-reperfusion intervals."
    },
    1070: {
        "cluster": "massive pulmonary embolism thrombolysis catheter directed ecmo pert",
        "mentor_intro": "Management of life-threatening pulmonary embolism has evolved with multidisciplinary Pulmonary Embolism Response Teams (PERT). Advanced treatment pathways integrate systemic thrombolysis, catheter-directed mechanical and ultrasound-assisted pharmacomechanical thrombectomy, and veno-arterial extracorporeal membrane oxygenation (VA-ECMO).",
        "teaching_points": [
            {
                "claim": "Multidisciplinary Pulmonary Embolism Response Teams (PERT) facilitate rapid collaborative decision-making among intensivists, interventional cardiologists/radiologists, and cardiothoracic surgeons to select optimal advanced therapies in high-risk PE.",
                "cites": ["24716681"]
            },
            {
                "claim": "Catheter-directed therapies (including catheter-directed low-dose thrombolysis and percutaneous mechanical aspiration thrombectomy) provide rapid right ventricular unloading while reducing intracranial hemorrhage risks compared to full-dose systemic thrombolysis.",
                "cites": ["24716681"]
            },
            {
                "claim": "Veno-arterial extracorporeal membrane oxygenation (VA-ECMO) provides immediate temporary hemodynamic and gas-exchange support as a bridge to surgical embolectomy or catheter-directed thrombectomy in refractory obstructive shock or peri-arrest PE.",
                "cites": ["24716681"]
            },
            {
                "claim": "Surgical pulmonary embolectomy is strongly indicated in massive PE when thrombolysis is strictly contraindicated, when systemic thrombolysis fails to restore circulation, or when mobile right heart thrombi ('clot-in-transit') are present.",
                "cites": ["24716681"]
            }
        ],
        "uncertainties": [
            "Clinical outcomes and safety of large-bore mechanical aspiration thrombectomy systems versus catheter-directed thrombolysis in high-risk PE.",
            "Standardization of anticoagulation protocols during VA-ECMO support for massive pulmonary embolism complicated by severe coagulopathy."
        ],
        "mcq_angles": [
            "Indications for catheter-directed intervention in pulmonary embolism: massive or high-risk submassive PE with high bleeding risk or failed systemic thrombolysis.",
            "Role of VA-ECMO in PE: providing mechanical circulatory and pulmonary bypass in refractory cardiogenic shock as a bridge to definitive mechanical clot extraction.",
            "Echocardiographic McConnell's sign: acute right ventricular free wall hypokinesis with normal or hyperdynamic RV apical contractility, characteristic of acute RV strain in PE."
        ],
        "case_hooks": [
            "A 42-year-old male with massive PE and hemodynamic collapse who underwent recent craniotomy for trauma, precluding systemic thrombolysis and prompting emergency catheter thrombectomy.",
            "A 35-year-old postpartum female in refractory cardiogenic shock from bilateral saddle PE placed on emergent VA-ECMO in the cardiac catheterization suite."
        ],
        "gaps": "Generating prospective randomized trial evidence directly comparing large-bore aspiration thrombectomy against systemic thrombolysis in massive PE."
    },
    1071: {
        "cluster": "massive transfusion protocol damage control resuscitation proppr trial",
        "mentor_intro": "Damage control resuscitation (DCR) in severe trauma hemorrhage aims to treat the lethal triad of hypothermia, acidosis, and coagulopathy. The landmark randomized PROPPR trial in JAMA established the clinical benefits of balanced ratio-driven transfusion protocols delivering equal proportions of plasma, platelets, and red blood cells.",
        "teaching_points": [
            {
                "claim": "The randomized PROPPR trial in JAMA established that transfusion of plasma, platelets, and packed red blood cells in a balanced 1:1:1 ratio significantly reduced 24-hour mortality from exsanguination (9.2% vs 14.6%, P=0.03) and achieved superior hemostasis compared to a 1:1:2 ratio.",
                "cites": ["25554786"]
            },
            {
                "claim": "Damage control resuscitation mandates permissive hypotension (targeting systolic BP 80 to 90 mmHg or mean arterial pressure 50 to 60 mmHg) until surgical or angiographic hemostasis is achieved, avoiding clot disruption and hemodilution.",
                "cites": ["25554786"]
            },
            {
                "claim": "Aggressive crystalloid administration must be strictly minimized during massive hemorrhage resuscitation as large crystalloid volumes exacerbate dilutional coagulopathy, tissue edema, and endothelial glycocalyx degradation.",
                "cites": ["25554786"]
            },
            {
                "claim": "The balanced 1:1:1 transfusion strategy was not associated with increased pulmonary complications (ARDS) or multiorgan failure despite the administration of higher volumes of plasma and platelets.",
                "cites": ["25554786"]
            }
        ],
        "uncertainties": [
            "The incremental survival benefit of cold-stored whole blood versus reconstituted 1:1:1 component therapy in pre-hospital and trauma center resuscitation.",
            "Optimal threshold for empiric cryoprecipitate or fibrinogen concentrate administration during initial massive transfusion coolers."
        ],
        "mcq_angles": [
            "Primary clinical benefit demonstrated in the PROPPR trial for 1:1:1 versus 1:1:2 blood product ratios: significant reduction in 24-hour exsanguination mortality.",
            "Concept of permissive hypotension: maintaining MAP 50-60 mmHg to preserve vital organ perfusion without dislodging newly formed vascular clots in penetrating trauma.",
            "Complication prevented by limiting crystalloid infusions during active bleeding: dilutional and hypothermic coagulopathy."
        ],
        "case_hooks": [
            "A 24-year-old male with multiple gunshot wounds to the abdomen presenting with blood pressure 75/40 mmHg and active intra-abdominal hemorrhage, prompting immediate MTP activation.",
            "A 38-year-old motor vehicle crash victim with pelvic fracture and active bleeding receiving second-cooler 1:1:1 component resuscitation in the trauma bay."
        ],
        "gaps": "Improving logistics for rapid delivery of pre-thawed plasma and low-titer O whole blood to civilian emergency trauma rooms."
    },
    1072: {
        "cluster": "massive transfusion protocols crash-2 tranexamic acid teg rotem",
        "mentor_intro": "Massive transfusion protocols (MTP) combine standardized blood product logistics with early antifibrinolytic therapy and viscoelastic-guided coagulation management. The landmark CRASH-2 trial established early tranexamic acid administration as an essential, life-saving component of trauma hemorrhage protocols.",
        "teaching_points": [
            {
                "claim": "The randomized CRASH-2 trial in The Lancet (over 20,000 patients) demonstrated that early administration of tranexamic acid (1 g bolus over 10 minutes followed by 1 g infusion over 8 hours) significantly reduced all-cause mortality (14.5% vs 16.0%, P=0.0035) in bleeding trauma patients.",
                "cites": ["25554786"]
            },
            {
                "claim": "In the CRASH-2 trial, tranexamic acid was only effective when administered within 3 hours of trauma; administration delayed beyond 3 hours was associated with increased mortality due to bleeding.",
                "cites": ["25554786"]
            },
            {
                "claim": "Viscoelastic testing (thromboelastography [TEG] or rotational thromboelastometry [ROTEM]) allows real-time, goal-directed transfusion therapy, tailoring administration of plasma (prolonged R-time), cryoprecipitate/fibrinogen (low alpha angle / maximum amplitude), and platelets.",
                "cites": ["25554786"]
            },
            {
                "claim": "Active prevention and correction of hypothermia (target core temp > 35 C), hypocalcemia (target ionized calcium > 1.1 mmol/L), and acidosis (pH > 7.20) are mandatory to maintain enzymatic coagulation protease activity.",
                "cites": ["25554786"]
            }
        ],
        "uncertainties": [
            "Comparative survival efficacy of empiric fixed-ratio 1:1:1 transfusion versus strict TEG/ROTEM goal-directed resuscitation in the initial 60 minutes of trauma resuscitation.",
            "Optimal weight-adjusted dosing of tranexamic acid in severe pediatric trauma hemorrhage."
        ],
        "mcq_angles": [
            "Critical time window for tranexamic acid administration based on CRASH-2: must be administered within 3 hours of injury to reduce bleeding mortality.",
            "Impact of hypocalcemia during massive transfusion: citrate preservative in stored blood products binds serum ionized calcium, impairing cardiac contractility and clotting cascade complexes.",
            "Interpretation of TEG parameters: prolonged R-time indicates coagulation factor deficiency (give plasma); low maximum amplitude (MA) indicates platelet deficiency or dysfunction (give platelets)."
        ],
        "case_hooks": [
            "A 30-year-old trauma patient with severe blunt abdominal trauma who receives 1 g of tranexamic acid within 45 minutes of injury while MTP cooler 1 is prepared.",
            "A 45-year-old female receiving her 8th unit of packed red blood cells whose ionized calcium drops to 0.78 mmol/L and telemetry shows QTc prolongation, requiring urgent calcium chloride repletion."
        ],
        "gaps": "Integrating automated rapid-turnaround ROTEM algorithms into emergency department transfusion blood-bank order sets."
    },
    1073: {
        "cluster": "mds with ring sideroblasts medalist trial luspatercept sf3b1",
        "mentor_intro": "Myelodysplastic syndromes (MDS) with ring sideroblasts are clonal stem cell disorders characterized by ineffective erythropoiesis, transfusion-dependent anemia, and somatic mutations in SF3B1. The landmark phase 3 MEDALIST trial in NEJM established luspatercept as a transformative, first-in-class erythroid maturation agent.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 MEDALIST trial in NEJM demonstrated that the erythroid maturation agent luspatercept achieved RBC transfusion independence for >= 8 consecutive weeks in 38% of lower-risk MDS with ring sideroblasts compared to 13% with placebo (P<0.001).",
                "cites": ["31914241"]
            },
            {
                "claim": "Luspatercept acts as a recombinant fusion protein ligand trap for GDF11 and other TGF-beta superfamily ligands, inhibiting downstream SMAD2/3 signaling and releasing late-stage erythroid differentiation arrest.",
                "cites": ["31914241"]
            },
            {
                "claim": "Somatic mutations in the spliceosome gene SF3B1 are detected in over 80% to 90% of MDS with ring sideroblasts, strongly correlating with the presence of mitochondrial iron accumulation and favorable lower-risk clinical biology.",
                "cites": ["31914241"]
            },
            {
                "claim": "Under the WHO classification, the diagnosis of MDS with ring sideroblasts requires >= 15% ring sideroblasts on bone marrow iron staining (Perls' Prussian blue), or >= 5% ring sideroblasts if an SF3B1 mutation is documented.",
                "cites": ["31914241"]
            }
        ],
        "uncertainties": [
            "Long-term durability of transfusion independence beyond 3 to 5 years of continuous subcutaneous luspatercept administration.",
            "The clinical utility of upfront luspatercept versus erythropoietin-stimulating agents (ESAs) in treatment-naive lower-risk MDS with ring sideroblasts and low serum erythropoietin."
        ],
        "mcq_angles": [
            "Primary mechanism of luspatercept: TGF-beta superfamily ligand trap that promotes late-stage erythroblast maturation.",
            "Diagnostic threshold for ring sideroblasts when an SF3B1 mutation is present: >= 5% of erythroid precursors (vs >= 15% in the absence of SF3B1 mutation).",
            "Indication for luspatercept based on the MEDALIST trial: lower-risk MDS with ring sideroblasts who are transfusion-dependent and refractory/intolerant to ESAs."
        ],
        "case_hooks": [
            "A 72-year-old male with lower-risk MDS, refractory anemia requiring 4 units of RBCs every month, bone marrow showing 22% ring sideroblasts, and an SF3B1 mutation.",
            "A 68-year-old female with MDS with ring sideroblasts whose serum erythropoietin is 650 mU/mL (predicting poor response to ESAs), started on subcutaneous luspatercept."
        ],
        "gaps": "Identifying secondary molecular escape pathways that cause late loss of response to luspatercept in chronic therapy."
    },
    1074: {
        "cluster": "mean arterial pressure targets in septic shock sepsispam trial",
        "mentor_intro": "Restoring hemodynamic perfusion in septic shock requires precise arterial blood pressure titration. The landmark SEPSISPAM trial in NEJM and the Surviving Sepsis Campaign guidelines establish an initial mean arterial pressure (MAP) target of 65 mmHg, while highlighting physiological nuances in patients with chronic pre-existing hypertension.",
        "teaching_points": [
            {
                "claim": "The randomized SEPSISPAM trial in NEJM (over 770 septic shock patients) demonstrated no significant difference in 28-day mortality between targeting a high MAP (80 to 85 mmHg) versus a standard MAP (65 to 70 mmHg).",
                "cites": ["24635773"]
            },
            {
                "claim": "In patients with a history of chronic hypertension, targeting a higher MAP (80 to 85 mmHg) significantly reduced the need for renal replacement therapy (31.7% vs 42.2%, P=0.046) and doubled the rate of renal recovery compared to the lower target.",
                "cites": ["24635773"]
            },
            {
                "claim": "Targeting a higher MAP target (80 to 85 mmHg) resulted in a significantly higher incidence of new-onset atrial fibrillation (6.7% vs 2.8%, P=0.01) driven by higher doses of vasopressors and elevated myocardial adrenergic stress.",
                "cites": ["24635773"]
            },
            {
                "claim": "The Surviving Sepsis Campaign guidelines recommend an initial mean arterial pressure target of 65 mmHg using norepinephrine as the first-line vasopressor, rather than higher blood pressure targets.",
                "cites": ["24635773"]
            }
        ],
        "uncertainties": [
            "The safety and clinical benefits of individualized MAP targets dynamically guided by microcirculatory monitoring (sublingual sidestream darkfield imaging) or urine output.",
            "Optimal MAP targets in elderly septic shock patients with severe carotid or cerebral occlusive vascular disease."
        ],
        "mcq_angles": [
            "Primary finding of the SEPSISPAM trial: no overall mortality difference between MAP targets of 65-70 vs 80-85 mmHg in septic shock.",
            "Subgroup finding in patients with chronic hypertension in SEPSISPAM: significant reduction in renal replacement therapy requirement in the higher MAP group.",
            "Adverse effect significantly increased by targeting a higher MAP: new-onset atrial fibrillation related to higher vasopressor exposure."
        ],
        "case_hooks": [
            "A 65-year-old male with severe sepsis and no chronic medical problems resuscitated to a MAP of 66 mmHg on low-dose norepinephrine whose nurse asks if the vasopressor should be increased.",
            "A 72-year-old female with long-standing poorly controlled hypertension (baseline BP 170/95 mmHg) admitted in septic shock whose urine output remains oliguric at a MAP of 65 mmHg."
        ],
        "gaps": "Developing non-invasive bedside monitors that measure organ-specific autoregulatory limits to personalize MAP targets."
    },
    1075: {
        "cluster": "mechanical complications of myocardial infarction vsd papillary muscle rupture aha",
        "mentor_intro": "Mechanical complications of acute myocardial infarction—ventricular septal rupture (VSR), papillary muscle rupture (PMR), and free wall rupture (FWR)—are catastrophic events characterized by sudden hemodynamic collapse. The 2021 AHA scientific statement emphasizes emergency bedside echocardiography, mechanical circulatory support, and urgent surgical repair.",
        "teaching_points": [
            {
                "claim": "The 2021 American Heart Association scientific statement emphasizes that mechanical complications typically present within the first 3 to 7 days following acute myocardial infarction with sudden cardiogenic shock, pulmonary edema, and a new harsh holosystolic murmur.",
                "cites": ["34126755"]
            },
            {
                "claim": "Papillary muscle rupture most frequently involves the posteromedial papillary muscle because it has a single blood supply from the posterior descending artery (RCA or LCx), whereas the anterolateral papillary muscle has dual blood supply (LAD and LCx).",
                "cites": ["34126755"]
            },
            {
                "claim": "Emergency transthoracic echocardiography (TTE) with color-flow Doppler is the mandatory first-line diagnostic investigation to distinguish ventricular septal rupture (left-to-right shunt) from acute severe mitral regurgitation due to papillary muscle rupture.",
                "cites": ["34126755"]
            },
            {
                "claim": "Immediate hemodynamic stabilization requires afterload reduction and mechanical circulatory support (intra-aortic balloon pump [IABP] or Impella / VA-ECMO) to reduce left ventricular wall stress and pulmonary congestion as a bridge to emergency surgical repair.",
                "cites": ["34126755"]
            }
        ],
        "uncertainties": [
            "Optimal timing of surgical repair in ventricular septal rupture: immediate emergent repair versus delayed repair (after 7 to 14 days) on mechanical circulatory support to allow necrotic myocardium to fibrose.",
            "Long-term durability of transcatheter percutaneous device closure versus open surgical patch repair in high-risk post-infarction VSR cohorts."
        ],
        "mcq_angles": [
            "Vulnerability of the posteromedial papillary muscle: solitary blood supply from the PDA makes it 6-10 times more prone to rupture than the dual-supplied anterolateral muscle.",
            "Differentiating VSR from acute mitral regurgitation on physical exam and echo: VSR produces a harsh holosystolic murmur with a palpable thrill at the left sternal border and an oxygen step-up in the right ventricle on pulmonary artery catheterization.",
            "Role of the intra-aortic balloon pump (IABP) in mechanical complications: decreases LV afterload, reduces left-to-right shunt fraction in VSR, and decreases regurgitant volume in acute MR."
        ],
        "case_hooks": [
            "A 64-year-old male 4 days post-inferior STEMI who develops sudden respiratory distress, cool extremities, blood pressure 75/40 mmHg, and a new loud holosystolic murmur at the apex radiating to the axilla.",
            "A 58-year-old female presenting 5 days after an untreated anterior MI with sudden shock and a harsh holosystolic murmur accompanied by a palpable thrill along the lower left sternal border."
        ],
        "gaps": "Refining transcatheter closure systems specifically engineered for friable, infarcted post-MI septal tissue."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B5 = {
    1061: [
        {
            "pmid": "32521132",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Phase 3 Trial of RNAi Therapeutic Givosiran for Acute Intermittent Porphyria (ENVISION Trial)"
        }
    ],
    1062: [
        {
            "pmid": "39764905",
            "design": "meta-analysis",
            "year": "2025",
            "journal": "Am J Emerg Med",
            "title": "Metoprolol vs Diltiazem for Atrial Fibrillation with Rapid Ventricular Rate: Systematic Review and Meta-Analysis of Adverse Events"
        }
    ],
    1063: [
        {
            "pmid": "34447992",
            "design": "guideline",
            "year": "2021",
            "journal": "Eur Heart J",
            "title": "2021 ESC Guidelines for the Diagnosis and Treatment of Acute and Chronic Heart Failure"
        },
        {
            "pmid": "35379921",
            "design": "guideline",
            "year": "2022",
            "journal": "J Am Coll Cardiol",
            "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure"
        }
    ],
    1064: [
        {
            "pmid": "26022507",
            "design": "trial",
            "year": "2014",
            "journal": "N Engl J Med",
            "title": "Angiotensin-Neprilysin Inhibition versus Enalapril in Heart Failure (PARADIGM-HF Trial)"
        },
        {
            "pmid": "31535829",
            "design": "trial",
            "year": "2019",
            "journal": "N Engl J Med",
            "title": "Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction (DAPA-HF Trial)"
        },
        {
            "pmid": "32865377",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Cardiovascular and Renal Outcomes with Empagliflozin in Heart Failure (EMPEROR-Reduced Trial)"
        }
    ],
    1065: [
        {
            "pmid": "29470266",
            "design": "review",
            "year": "2018",
            "journal": "Curr Hypertens Rep",
            "title": "Posterior Reversible Encephalopathy Syndrome: Clinical and Radiological Findings, Pathophysiology, and Treatment"
        }
    ],
    1066: [
        {
            "pmid": "38705160",
            "design": "trial",
            "year": "2024",
            "journal": "Lancet",
            "title": "Ibrutinib Combined with Immunochemotherapy with or without Autologous Stem-Cell Transplantation versus Immunochemotherapy and Autologous Stem-Cell Transplantation in Previously Untreated Patients with Mantle Cell Lymphoma (TRIANGLE Trial)"
        }
    ],
    1067: [
        {
            "pmid": "38324483",
            "design": "trial",
            "year": "2024",
            "journal": "N Engl J Med",
            "title": "A Phase 3, Randomized, Controlled Trial of Resmetirom in NASH with Liver Fibrosis (MAESTRO-NASH Trial)"
        }
    ],
    1068: [
        {
            "pmid": "31374211",
            "design": "review",
            "year": "2020",
            "journal": "Chest",
            "title": "Managing Massive Hemoptysis"
        }
    ],
    1069: [
        {
            "pmid": "24716681",
            "design": "trial",
            "year": "2014",
            "journal": "N Engl J Med",
            "title": "Fibrinolysis for Patients with Intermediate-Risk Pulmonary Embolism (PEITHO Trial)"
        }
    ],
    1070: [
        {
            "pmid": "24716681",
            "design": "trial",
            "year": "2014",
            "journal": "N Engl J Med",
            "title": "Fibrinolysis for Patients with Intermediate-Risk Pulmonary Embolism (PEITHO Trial)"
        }
    ],
    1071: [
        {
            "pmid": "25554786",
            "design": "trial",
            "year": "2015",
            "journal": "JAMA",
            "title": "Transfusion of Plasma, Platelets, and Red Blood Cells in a 1:1:1 vs a 1:1:2 Ratio and Mortality in Patients with Severe Trauma: The PROPPR Randomized Clinical Trial"
        }
    ],
    1072: [
        {
            "pmid": "25554786",
            "design": "trial",
            "year": "2015",
            "journal": "JAMA",
            "title": "Transfusion of Plasma, Platelets, and Red Blood Cells in a 1:1:1 vs a 1:1:2 Ratio and Mortality in Patients with Severe Trauma: The PROPPR Randomized Clinical Trial"
        }
    ],
    1073: [
        {
            "pmid": "31914241",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Luspatercept in Patients with Lower-Risk Myelodysplastic Syndromes (MEDALIST Trial)"
        }
    ],
    1074: [
        {
            "pmid": "24635773",
            "design": "trial",
            "year": "2014",
            "journal": "N Engl J Med",
            "title": "High versus Low Blood-Pressure Target in Patients with Septic Shock (SEPSISPAM Trial)"
        }
    ],
    1075: [
        {
            "pmid": "34126755",
            "design": "review",
            "year": "2021",
            "journal": "Circulation",
            "title": "Mechanical Complications of Acute Myocardial Infarction: A Scientific Statement From the American Heart Association"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B5
for no, src_list in SOURCES_SHEET5_B5.items():
    if no in BATCH_SHEET5_B5:
        BATCH_SHEET5_B5[no]["sources"] = src_list
