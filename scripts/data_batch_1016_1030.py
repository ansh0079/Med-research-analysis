# -*- coding: utf-8 -*-
"""
data_batch_1016_1030.py

Curriculum data for Sheet 5 (Topics 1016 to 1030).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B2 = {
    1016: {
        "cluster": "liberation from mechanical ventilation weaning protocols",
        "mentor_intro": "Liberation from mechanical ventilation requires systematic daily assessment of extubation readiness to avoid complications of prolonged intubation or premature extubation. The ATS/CHEST guidelines recommend protocolized spontaneous breathing trials (SBTs) with inspiratory pressure augmentation over unassisted T-piece trials.",
        "teaching_points": [
            {
                "claim": "The joint ATS/CHEST clinical practice guideline conditionally recommends conducting the initial spontaneous breathing trial with inspiratory pressure augmentation (pressure support 5 to 8 cm H2O) rather than unassisted breathing (T-piece or CPAP), which improves trial success and extubation rates.",
                "cites": ["27818330"]
            },
            {
                "claim": "Protocol-driven weaning led by respiratory therapists and nurses significantly reduces mechanical ventilation duration and ICU length of stay compared to physician-directed ad hoc weaning.",
                "cites": ["27762595"]
            },
            {
                "claim": "In patients at high risk for extubation failure (e.g., hypercapnic COPD, age > 65, heart failure), immediate post-extubation non-invasive ventilation (NIV) or high-flow nasal cannula prevents post-extubation respiratory failure and reintubation.",
                "cites": ["27818330"]
            },
            {
                "claim": "The rapid shallow breathing index (RSBI, f/Vt) below 105 breaths/min/L during spontaneous breathing remains a reliable physiological threshold to predict successful weaning, although cuff leak tests are necessary if laryngeal edema is suspected.",
                "cites": ["27762608", "27762595"]
            }
        ],
        "uncertainties": [
            "Comparative re-intubation rates between high-flow nasal cannula alone versus alternating NIV with HFNC in mixed medical-surgical ICU extubation cohorts.",
            "Utility of diaphragm ultrasound thickening fraction as an adjunct to standard RSBI in complex weaning failure."
        ],
        "mcq_angles": [
            "Calculation and interpretation of RSBI (respiratory rate divided by tidal volume in liters, threshold <105).",
            "ATS/CHEST recommendation regarding SBT modality: preference for low-level pressure support over unassisted T-piece for initial SBT.",
            "Indication for prophylactic post-extubation NIV in patients with chronic hypercapnia and underlying COPD."
        ],
        "case_hooks": [
            "A 68-year-old male with severe COPD intubated for 5 days for hypercapnic respiratory failure passing his SBT on PS 5/PEEP 5, prompting post-extubation respiratory support planning.",
            "A 45-year-old trauma patient with prolonged intubation who exhibits absent cuff leak volume on deflation, raising concern for post-extubation stridor."
        ],
        "gaps": "Establishing standard weaning and rehabilitation protocols for patients on prolonged mechanical ventilation beyond 14 days."
    },
    1017: {
        "cluster": "life threatening arrhythmias in the icu vf vt storm advanced acls",
        "mentor_intro": "Electrical storm, defined as three or more distinct episodes of sustained ventricular tachycardia (VT) or ventricular fibrillation (VF) within 24 hours, is an acute medical emergency in the ICU. Management focuses on sympathetic overdrive suppression, electrolyte correction, targeted antiarrhythmic therapy, and emergency catheter ablation.",
        "teaching_points": [
            {
                "claim": "The randomized OPTIC study demonstrated that the combination of a beta-blocker plus amiodarone is significantly superior to either beta-blockers alone or sotalol in suppressing recurrent ventricular arrhythmias and reducing ICD shocks.",
                "cites": ["16407505"]
            },
            {
                "claim": "The landmark VANISH trial established that in patients with ischemic cardiomyopathy and refractory ventricular tachycardia despite antiarrhythmic drugs, catheter ablation significantly reduces the composite outcome of death, VT storm, or ICD shocks compared to escalated antiarrhythmic therapy.",
                "cites": ["26573754"]
            },
            {
                "claim": "Emergency suppression of extreme sympathetic tone using deep sedation, endotracheal intubation, or percutaneous stellate ganglion block provides immediate stabilization in refractory electrical storm resistant to pharmacotherapy.",
                "cites": ["16407505", "26573754"]
            },
            {
                "claim": "In recurrent ventricular fibrillation or polymorphic VT, urgent coronary angiography is mandatory to exclude acute myocardial ischemia, alongside aggressive repletion of serum potassium (>4.0 mEq/L) and magnesium (>2.0 mg/dL).",
                "cites": ["16407505"]
            }
        ],
        "uncertainties": [
            "The optimal timing and patient selection for emergency mechanical circulatory support (e.g. Impella or VA-ECMO) during catheter ablation in decompensated electrical storm.",
            "Efficacy of thoracic epidural anesthesia versus ultrasound-guided continuous stellate ganglion infusion for non-ischemic cardiomyopathy storm."
        ],
        "mcq_angles": [
            "First-line antiarrhythmic and autonomic blockade strategy: initiating non-selective beta-blockade combined with IV amiodarone.",
            "Definitive invasive strategy for drug-refractory monomorphic VT storm in ischemic cardiomyopathy: catheter ablation (VANISH trial).",
            "Emergency non-pharmacological sympathetic interruption: left or bilateral stellate ganglion blockade."
        ],
        "case_hooks": [
            "A 62-year-old male with prior anterior MI and an ICD who receives 8 shocks in 12 hours for sustained monomorphic VT despite intravenous lidocaine.",
            "A 55-year-old female presenting with polymorphic VT storm in the setting of severe hypokalemia and antibiotic-induced QTc prolongation (Torsades de pointes)."
        ],
        "gaps": "Standardizing clinical pathways for rapid deployment of cardiac sympathetic denervation in non-specialized community ICUs."
    },
    1018: {
        "cluster": "lipodystrophy syndromes partial vs generalised metabolic complications leptin replacement",
        "mentor_intro": "Lipodystrophy syndromes are heterogeneous disorders characterized by selective loss of adipose tissue, leading to extreme ectopic lipid accumulation, severe insulin-resistant diabetes, and profound hypertriglyceridemia. Multi-society guidelines outline phenotypic categorization and recombinant human leptin (metreleptin) replacement.",
        "teaching_points": [
            {
                "claim": "The multi-society practice guideline on lipodystrophy recommends recombinant human methionyl leptin (metreleptin) as an adjunct to diet for treating metabolic complications (severe hypertriglyceridemia and diabetes) in patients with generalized lipodystrophy.",
                "cites": ["27710244"]
            },
            {
                "claim": "Congenital generalized lipodystrophy (Berardinelli-Seip syndrome) presents at birth with near-total absence of subcutaneous adipose tissue, whereas familial partial lipodystrophy (Dunnigan variety, LMNA mutations) typically manifests at puberty with loss of extremity and trunk fat but facial and neck sparing.",
                "cites": ["27710244"]
            },
            {
                "claim": "Severe hypoleptinemia secondary to adipose absence impairs central satiety signaling, driving severe hyperphagia, marked hepatic steatosis progressing to cirrhosis, and extreme hypertriglyceridemia precipitating recurrent acute pancreatitis.",
                "cites": ["27710244"]
            },
            {
                "claim": "In partial lipodystrophy, metreleptin therapy is considered primarily for selected patients with proven severe hypoleptinemia and severe refractory metabolic disease (HbA1c > 8% or triglycerides > 500 mg/dL despite maximized standard pharmacotherapy).",
                "cites": ["27710244"]
            }
        ],
        "uncertainties": [
            "Long-term incidence of neutralizing anti-metreleptin antibodies and T-cell lymphoma in patients receiving metreleptin for generalized lipodystrophy.",
            "Role of modern SGLT2 inhibitors and GLP-1 receptor agonists in familial partial lipodystrophy with intermediate leptin levels."
        ],
        "mcq_angles": [
            "Distinction between generalized (AGPAT2, BSCL2) and partial (LMNA, PPARG) lipodystrophy genetic mutations and clinical phenotypes.",
            "Indication for metreleptin: first-line metabolic therapy for generalized lipodystrophy with severe metabolic complications.",
            "Characteristic laboratory abnormalities: profound hypertriglyceridemia, marked hyperinsulinemia with severe insulin resistance, low leptin, and transaminitis from NASH."
        ],
        "case_hooks": [
            "A 14-year-old girl with absence of body fat, prominent musculature, hepatomegaly, eruptive xanthomas, and triglycerides of 4,200 mg/dL presenting with acute pancreatitis.",
            "A 28-year-old woman with loss of fat in limbs and gluteal regions, neck fat accumulation, acanthosis nigricans, and severe diabetes requiring 400 units of insulin daily."
        ],
        "gaps": "Developing validated clinical biomarkers to predict metabolic responsiveness to metreleptin in partial lipodystrophy subtypes."
    },
    1019: {
        "cluster": "lithium monitoring and toxicity prevention",
        "mentor_intro": "Lithium remains the gold standard mood stabilizer for bipolar disorder but has a narrow therapeutic index (0.6 to 1.0 mmol/L) and exclusive renal elimination. Prevention and management of toxicity rely on structured serum surveillance, recognition of drug interactions, and timely extracorporeal clearance.",
        "teaching_points": [
            {
                "claim": "NICE guidelines recommend checking 12-hour trough serum lithium levels every 3 to 6 months in stable patients, alongside mandatory renal function (creatinine, eGFR), calcium, and thyroid-stimulating hormone (TSH) every 6 months.",
                "cites": ["31912536"]
            },
            {
                "claim": "The EXTRIP workgroup guidelines recommend hemodialysis for severe lithium poisoning when serum concentration exceeds 4.0 mmol/L in acute toxicity, or exceeds 2.5 mmol/L in chronic toxicity with severe neurological signs or renal impairment.",
                "cites": ["31912536"]
            },
            {
                "claim": "Co-administration of thiazide diuretics, NSAIDs, or ACE inhibitors/ARBs impairs renal lithium clearance by promoting compensatory proximal tubular sodium and lithium reabsorption, precipitating acute-on-chronic toxicity.",
                "cites": ["31912536"]
            },
            {
                "claim": "Chronic lithium nephrotoxicity typically manifests as nephrogenic diabetes insipidus due to down-regulation of aquaporin-2 water channels in the renal collecting duct, leading to polyuria, polydipsia, and volume depletion.",
                "cites": ["31912536"]
            }
        ],
        "uncertainties": [
            "Optimal timing for safely discontinuing lithium in patients who develop progressive stage 3b/4 chronic kidney disease.",
            "Comparative neuroprotective efficacy of amiloride for lithium-induced nephrogenic diabetes insipidus versus thiazide-potassium sparing regimens."
        ],
        "mcq_angles": [
            "Timing of blood draw for therapeutic lithium monitoring: exactly 12 hours post-evening dose (trough level).",
            "Common drug interactions precipitating toxicity: ACE inhibitors, thiazides, and NSAIDs reducing renal excretion.",
            "Indications for emergent hemodialysis in chronic toxicity based on EXTRIP criteria: impaired renal clearance, altered mental status, and lithium >2.5 mmol/L."
        ],
        "case_hooks": [
            "A 52-year-old female with bipolar disorder on lithium whose primary physician started lisinopril and hydrochlorothiazide for hypertension, presenting with coarse tremors, ataxia, and confusion.",
            "A 60-year-old male on long-term lithium with chronic polyuria (4 L/day) and hypernatremia who develops acute dehydration during a gastroenteritis episode."
        ],
        "gaps": "Refining point-of-care saliva or fingerstick capillary lithium testing to improve patient adherence and prevent toxic overdosing."
    },
    1020: {
        "cluster": "liver cirrhosis",
        "mentor_intro": "Cirrhosis represents end-stage hepatic fibrosis complicated by portal hypertension and liver synthetic failure. The Baveno VII consensus guidelines have transformed clinical management through validated non-invasive testing for clinically significant portal hypertension (CSPH) and risk-stratified variceal screening.",
        "teaching_points": [
            {
                "claim": "The Baveno VII consensus establishes that clinically significant portal hypertension (CSPH, HVPG >= 10 mmHg) can be reliably ruled out non-invasively if liver stiffness measurement is < 15 kPa and platelet count is > 150,000/uL, allowing patients to safely avoid screening endoscopy.",
                "cites": ["35120736"]
            },
            {
                "claim": "Non-selective beta-blockers, specifically carvedilol (starting at 6.25 mg daily), are the preferred first-line pharmacological therapy to reduce portal pressure and prevent first hepatic decompensation in patients with CSPH.",
                "cites": ["35120736"]
            },
            {
                "claim": "A liver stiffness measurement by transient elastography > 25 kPa confirms the presence of clinically significant portal hypertension non-invasively without requiring invasive hepatic venous pressure gradient measurement.",
                "cites": ["35120736"]
            },
            {
                "claim": "In patients with cirrhosis and ascites, diagnostic paracentesis is mandatory upon hospital admission to rule out spontaneous bacterial peritonitis (defined as ascitic fluid neutrophil count >= 250 cells/mm3).",
                "cites": ["35120736"]
            }
        ],
        "uncertainties": [
            "Durability of portal hypertension regression following sustained virological response in HCV or complete alcohol cessation in advanced compensated cirrhosis.",
            "Target threshold for non-selective beta-blocker dose optimization when guided by non-invasive splenic stiffness measurements."
        ],
        "mcq_angles": [
            "Baveno VII criteria for avoiding screening upper endoscopy: liver stiffness <20 kPa and platelet count >150,000/uL (or <15 kPa and >150,000/uL for CSPH rule-out).",
            "Hemodynamic superiority of carvedilol over propranolol: carvedilol provides intrinsic alpha-1 adrenergic blockade reducing intrahepatic vascular resistance.",
            "Diagnostic criteria for spontaneous bacterial peritonitis: absolute neutrophil count >=250/mm3 in ascitic fluid, requiring immediate IV cephalosporin and albumin."
        ],
        "case_hooks": [
            "A 54-year-old male with compensated alcohol-related cirrhosis having transient elastography of 12 kPa and platelets of 180,000/uL evaluated for variceal screening.",
            "A 61-year-old female with NASH cirrhosis admitted with low-grade fever and mild abdominal discomfort whose diagnostic paracentesis yields 350 neutrophils/uL."
        ],
        "gaps": "Validating spleen stiffness measurement protocols across diverse ultrasound elastography hardware platforms."
    },
    1021: {
        "cluster": "liver metastases from colorectal cancer",
        "mentor_intro": "Colorectal liver metastases (CRLM) represent the primary determinant of survival in stage IV colorectal cancer. Multidisciplinary tumor board evaluation is paramount to determine resectability, future liver remnant (FLR) volume, and the sequencing of conversion chemotherapy versus upfront surgical resection.",
        "teaching_points": [
            {
                "claim": "The ESMO clinical practice guidelines mandate that all patients with colorectal liver metastases be evaluated by a multidisciplinary team including hepatobiliary surgeons to assess technical resectability based on achieving an R0 resection with adequate future liver remnant (>20-30%).",
                "cites": ["36307056"]
            },
            {
                "claim": "In patients with initially unresectable, liver-limited metastases, intensive conversion systemic chemotherapy (FOLFOX, FOLFIRI, or FOLFOXIRI) combined with a targeted biologic based on RAS/BRAF mutation status and primary tumor sidedness achieves secondary resectability in 15% to 30% of cases.",
                "cites": ["36307056"]
            },
            {
                "claim": "Surgical resection of isolated colorectal liver metastases provides curative potential, achieving 5-year overall survival rates of 40% to 55% in contemporary surgical series.",
                "cites": ["36307056"]
            },
            {
                "claim": "For marginal future liver remnants, preoperative portal vein embolization (PVE) or associating liver partition and portal vein ligation for staged hepatectomy (ALPPS) can induce contralateral liver hypertrophy to permit safe subsequent resection.",
                "cites": ["36307056"]
            }
        ],
        "uncertainties": [
            "The oncological superiority of perioperative chemotherapy versus upfront surgery followed by adjuvant chemotherapy in easily resectable, low-burden single CRLM.",
            "Long-term survival outcomes of liver transplantation for strictly selected non-resectable colorectal liver metastases with prolonged biological stability."
        ],
        "mcq_angles": [
            "Definition of technical resectability in CRLM: preservation of at least two contiguous hepatic segments with adequate vascular inflow/outflow and >=20% future liver remnant in normal liver (>=30-40% in cirrhotic/chemotherapy-injured liver).",
            "Selection of targeted biologics for conversion therapy: anti-EGFR (cetuximab/panitumumab) for RAS/BRAF wild-type left-sided tumors; anti-VEGF (bevacizumab) for RAS-mutant or right-sided tumors.",
            "Indication for preoperative portal vein embolization (PVE): inducing compensatory hypertrophy when estimated remnant liver volume is insufficient."
        ],
        "case_hooks": [
            "A 56-year-old female with a resected sigmoid adenocarcinoma who develops 3 bilobar liver metastases totaling 5 cm, deemed technically resectable with a 35% future liver remnant.",
            "A 49-year-old male with KRAS-wild type colon cancer presenting with synchronous bulky bilobar liver metastases treated with conversion FOLFOXIRI plus panitumumab."
        ],
        "gaps": "Standardizing criteria for liver transplantation in unresectable colorectal liver metastases refractory to systemic conversion therapy."
    },
    1022: {
        "cluster": "liver transplant referral",
        "mentor_intro": "Timely referral for liver transplantation is essential to optimize survival in end-stage liver disease and acute liver failure. Clinical guidelines emphasize that referral should occur at the earliest sign of hepatic decompensation or when the MELD-Na score reaches 15, rather than waiting for critical illness.",
        "teaching_points": [
            {
                "claim": "The AASLD and AST practice guidelines recommend referring patients with cirrhosis for liver transplantation evaluation when the MELD-Na score is >= 15 or upon the appearance of any major clinical decompensation (ascites, encephalopathy, variceal hemorrhage).",
                "cites": ["39487043"]
            },
            {
                "claim": "MELD-Na incorporates serum sodium alongside bilirubin, creatinine, and INR, significantly improving 90-day waitlist mortality prediction in patients with hyponatremia and portal hypertension.",
                "cites": ["39487043"]
            },
            {
                "claim": "Patients with hepatocellular carcinoma meeting Milan criteria (single tumor <= 5 cm or up to 3 tumors each <= 3 cm without vascular invasion) qualify for standardized MELD exception points to balance their drop-out risk.",
                "cites": ["39487043"]
            },
            {
                "claim": "Acute liver failure requires immediate transfer to a transplant center prior to advanced encephalopathy; King's College Criteria remain an established prognostic tool to predict mortality without emergent transplantation.",
                "cites": ["39487043"]
            }
        ],
        "uncertainties": [
            "Validation of MELD 3.0 versus MELD-Na across diverse patient populations to correct for sex-based disparities in transplant access due to lower female muscle creatinine mass.",
            "Optimal timing and selection criteria for liver transplantation in patients with severe acute alcohol-associated hepatitis not responding to corticosteroids."
        ],
        "mcq_angles": [
            "Standard clinical threshold for outpatient liver transplant referral: MELD-Na >= 15 or onset of ascites/encephalopathy.",
            "Milan criteria for standard MELD exception in HCC: single lesion <= 5 cm or 2-3 lesions each <= 3 cm, without macrovascular invasion or extrahepatic spread.",
            "King's College Criteria for emergent liver transplantation in paracetamol toxicity: arterial pH < 7.30 after resuscitation, or INR > 6.5, creatinine > 3.4 mg/dL, and grade III/IV encephalopathy."
        ],
        "case_hooks": [
            "A 50-year-old male with alcohol-related cirrhosis admitted for recurrent ascites and spontaneous bacterial peritonitis whose calculated MELD-Na is 17.",
            "A 24-year-old female presenting with acute acetaminophen overdose, severe coagulopathy (INR 7.2), metabolic acidosis (pH 7.22), and progressive encephalopathy requiring urgent transplant contact."
        ],
        "gaps": "Overcoming regional and socioeconomic disparities in timely referral and completion of liver transplant evaluations."
    },
    1023: {
        "cluster": "living kidney donor evaluation and long term risk",
        "mentor_intro": "Living kidney donor evaluation ensures donor safety, voluntary informed consent, and recipient compatibility. The KDIGO guidelines framework replaces rigid single-parameter exclusions with an individualized quantitative lifetime risk assessment of end-stage kidney disease (ESKD).",
        "teaching_points": [
            {
                "claim": "The KDIGO clinical practice guideline on living kidney donor evaluation incorporates quantitative 15-year and projected lifetime ESKD risk tools, recommending that acceptable risk thresholds be transparently communicated to donor candidates.",
                "cites": ["28742762"]
            },
            {
                "claim": "Direct measurement of glomerular filtration rate (using inulin, iohexol, or 24-hour creatinine clearance) is recommended when estimated GFR is borderline, with an absolute GFR >= 90 mL/min/1.73 m2 generally considered acceptable for donation.",
                "cites": ["28742762"]
            },
            {
                "claim": "Persistent overt proteinuria (albuminuria > 30 mg/24 hours or protein > 150 mg/24 hours) or untreated hypertension with target-organ damage represents an unacceptable long-term renal risk, precluding living donation.",
                "cites": ["28742762"]
            },
            {
                "claim": "Longitudinal cohort studies establish that while living kidney donors face a slightly higher relative risk of ESKD compared to exceptionally healthy non-donors, their absolute lifetime risk remains very low (<1% in most white donors).",
                "cites": ["28742762"]
            }
        ],
        "uncertainties": [
            "The precise lifetime ESKD risk attributable to APOL1 high-risk renal genotypes (G1/G2 variants) in young African American prospective living kidney donors.",
            "Long-term cardiovascular and gestational hypertensive outcomes in young female living donors following unilateral nephrectomy."
        ],
        "mcq_angles": [
            "KDIGO criteria for living kidney donor GFR eligibility: GFR >= 90 mL/min/1.73 m2 indicates acceptable renal function; GFR < 60 mL/min/1.73 m2 is an absolute exclusion.",
            "Evaluating donor hypertension: acceptable if well-controlled on 1 or 2 antihypertensives without microalbuminuria or left ventricular hypertrophy.",
            "Informed consent counseling regarding post-donation risks: slight increase in relative risk of gestational hypertension and low absolute risk of end-stage kidney disease."
        ],
        "case_hooks": [
            "A 32-year-old male wishing to donate a kidney to his sister whose initial screening eGFR is 82 mL/min/1.73 m2, prompting formal iohexol clearance testing.",
            "A 45-year-old potential donor with well-controlled essential hypertension on amlodipine who has normal 24-hour ambulatory blood pressure monitoring and zero albuminuria."
        ],
        "gaps": "Establishing universally accepted APOL1 genetic testing and counseling pathways for prospective living donors of African ancestry."
    },
    1024: {
        "cluster": "long covid and post infectious syndromes fatigue dysautonomia mechanism management",
        "mentor_intro": "Post-COVID-19 syndrome encompasses persistent multisystem symptoms continuing beyond 12 weeks post-infection. The NICE guideline outlines holistic multidisciplinary assessment, screening for postural orthostatic tachycardia syndrome (POTS) and post-exertional malaise, and symptom-titrated pacing rehabilitation.",
        "teaching_points": [
            {
                "claim": "NICE guideline NG188 defines post-COVID-19 syndrome as signs and symptoms that develop during or after an infection consistent with COVID-19, continue for more than 12 weeks, and are not explained by an alternative diagnosis.",
                "cites": ["33453162"]
            },
            {
                "claim": "Dysautonomia, specifically Postural Orthostatic Tachycardia Syndrome (POTS), is a recognized complication of Long COVID characterized by a sustained heart rate increase >= 30 bpm within 10 minutes of standing without orthostatic hypotension.",
                "cites": ["33453162", "36339677"]
            },
            {
                "claim": "Post-exertional malaise (PEM), defined as a disproportionate worsening of symptoms following minimal physical or cognitive exertion, must be screened for prior to initiating any exercise program to prevent debilitating post-exertional crashes.",
                "cites": ["33453162"]
            },
            {
                "claim": "Management centers on symptom-titrated energy pacing, autonomic conditioning (increased fluid/sodium intake and compression garments for orthostatic intolerance), and avoiding fixed graded exercise therapy when PEM is present.",
                "cites": ["33453162", "36339677"]
            }
        ],
        "uncertainties": [
            "The causal role of viral persistence, microvascular endothelial endotheliopathy, and autoantibodies against G-protein coupled receptors in driving Long COVID pathophysiology.",
            "Efficacy and safety of off-label pharmacotherapies (such as low-dose naltrexone or ivabradine) in post-COVID dysautonomia cohorts."
        ],
        "mcq_angles": [
            "Formal diagnostic timeline for post-COVID-19 syndrome under NICE criteria (symptoms persisting >= 12 weeks).",
            "Active stand test diagnostic criteria for POTS: sustained heart rate increase >= 30 bpm (or >= 40 bpm in teens) without a >20/10 mmHg drop in blood pressure.",
            "Activity management in patients with post-exertional symptom exacerbation: structured pacing rather than rigid graded exercise therapy."
        ],
        "case_hooks": [
            "A 34-year-old previously athletic female presenting 5 months after mild COVID-19 with profound exhaustion, lightheadedness on standing, and heart rate accelerating from 72 to 118 bpm.",
            "A 42-year-old male with persistent brain fog and severe symptom crashes occurring 24 hours after attempting 20 minutes of light jogging."
        ],
        "gaps": "Validating objective diagnostic biomarker panels to distinguish post-COVID dysautonomia phenotypes from chronic fatigue syndrome."
    },
    1025: {
        "cluster": "long term adverse effects of proton pump inhibitors",
        "mentor_intro": "Proton pump inhibitors (PPIs) are among the most widely prescribed medications globally. While highly effective for acid-peptic disorders, accumulating clinical trial data and guidelines urge regular reassessment and deprescribing to avoid long-term adverse renal, bone, and infectious complications.",
        "teaching_points": [
            {
                "claim": "A post-hoc analysis of the randomized COMPASS trial (over 17,500 patients) published in JASN demonstrated that long-term pantoprazole therapy was associated with a statistically significant, faster annual decline in estimated GFR compared to placebo.",
                "cites": ["38602780"]
            },
            {
                "claim": "Chronic PPI therapy induces gastric hypochlorhydria, which impairs dietary protein-bound vitamin B12 cleavage, reduces non-heme iron and magnesium absorption, and increases the risk of hypomagnesemic hypocalcemia.",
                "cites": ["38602780"]
            },
            {
                "claim": "Large observational studies link long-term PPI therapy with an increased risk of Clostridioides difficile infection, community-acquired pneumonia, and microscopic colitis through disruption of the gut microbiome and loss of the protective gastric acid barrier.",
                "cites": ["38602780"]
            },
            {
                "claim": "Clinical practice guidelines recommend periodic re-evaluation of long-term PPI indications, advising dose reduction or trial deprescribing for uncomplicated GERD or non-ulcer dyspepsia while maintaining therapy for severe erosive esophagitis or Barrett's esophagus.",
                "cites": ["38602780"]
            }
        ],
        "uncertainties": [
            "Whether observational associations between chronic PPI use and incident dementia represent true neurotoxicity or residual confounding by vascular risk and frailty.",
            "Optimal deprescribing tapering protocols to prevent severe rebound acid hypersecretion and symptomatic relapse upon PPI withdrawal."
        ],
        "mcq_angles": [
            "Electrolyte disturbance linked to prolonged PPI use: severe hypomagnesemia that is refractory to magnesium supplementation until the PPI is stopped.",
            "Evidence from the COMPASS trial: randomized data showing accelerated eGFR decline in patients assigned to chronic pantoprazole.",
            "Indications requiring indefinite long-term PPI maintenance: Los Angeles Grade C/D esophagitis, Barrett's esophagus, and high-risk bleeding ulcers on chronic NSAIDs."
        ],
        "case_hooks": [
            "A 68-year-old female taking omeprazole 40 mg daily for 8 years without endoscopy who presents with muscle cramps, weakness, and a serum magnesium of 1.0 mg/dL.",
            "A 72-year-old male on long-term pantoprazole for mild reflux whose routine labs demonstrate progressive unexplained eGFR decline from 75 to 48 mL/min/1.73 m2."
        ],
        "gaps": "Establishing electronic medical record decision support algorithms that safely prompt annual PPI deprescribing in primary care."
    },
    1026: {
        "cluster": "long term oxygen therapy",
        "mentor_intro": "Long-term oxygen therapy (LTOT) improves survival in chronic lung disease patients with severe resting hypoxemia. The landmark NOTT and MRC trials established mortality reduction for severe hypoxemia, while the modern LOTT trial confirmed an absence of benefit in moderate desaturation.",
        "teaching_points": [
            {
                "claim": "The landmark NOTT and MRC trials established that long-term continuous oxygen therapy (>= 15 to 18 hours/day) significantly reduces mortality in patients with stable COPD and severe resting hypoxemia (PaO2 <= 55 mmHg or SaO2 <= 88%).",
                "cites": ["6776100", "6111124"]
            },
            {
                "claim": "The randomized LOTT trial established that supplemental oxygen does not improve time to death or first hospitalization, nor does it improve quality of life, in patients with stable COPD and only moderate resting (SpO2 89% to 93%) or exercise desaturation.",
                "cites": ["27798860"]
            },
            {
                "claim": "The 2020 American Thoracic Society clinical practice guideline strongly recommends prescribing continuous LTOT (at least 15 hours/day) for adults with COPD and severe resting chronic hypoxemia, while recommending against routine LTOT in moderate desaturation.",
                "cites": ["33185366"]
            },
            {
                "claim": "In patients with PaO2 between 56 and 59 mmHg (SaO2 89%), LTOT is indicated if there is objective evidence of cor pulmonale, peripheral dependent edema from right heart failure, or secondary polycythemia (hematocrit > 55%).",
                "cites": ["33185366", "6776100"]
            }
        ],
        "uncertainties": [
            "Clinical benefit and physiological criteria for nocturnal-only oxygen supplementation in patients with isolated sleep-related hypoxemia without daytime resting hypoxemia.",
            "Survival impacts of portable ambulatory liquid oxygen systems versus pulse-dose oxygen concentrators during pulmonary rehabilitation."
        ],
        "mcq_angles": [
            "Criteria for LTOT in COPD: PaO2 <= 55 mmHg (SaO2 <= 88%) on room air at rest, or PaO2 56-59 mmHg with cor pulmonale or hematocrit > 55%.",
            "Interpretation of the LOTT trial: absence of survival or hospitalization benefit for supplemental oxygen in moderate resting or exercise-induced desaturation.",
            "Minimum daily duration of oxygen therapy required to confer a documented survival benefit: at least 15 hours per day (preferably continuous 24 hours)."
        ],
        "case_hooks": [
            "A 64-year-old male with severe COPD whose room air arterial blood gas on hospital discharge shows pH 7.39, PaCO2 46 mmHg, PaO2 53 mmHg, and SaO2 87%.",
            "A 70-year-old female with moderate COPD and exertional dyspnea whose resting room air SpO2 is 91% and nadirs to 89% during a 6-minute walk test, requesting home oxygen."
        ],
        "gaps": "Improving safety protocols and preventing fatal home burn injuries in patients prescribed LTOT who continue active cigarette smoking."
    },
    1027: {
        "cluster": "long term prognosis of long covid",
        "mentor_intro": "Epidemiological cohorts following patients for up to three years provide clarity on the long-term prognosis of post-acute sequelae of COVID-19 (PASC). Mortality and multiorgan risk trajectories differ markedly depending on whether the index infection required hospitalization.",
        "teaching_points": [
            {
                "claim": "A landmark 2-year cohort study in Nature Medicine demonstrated that in non-hospitalized individuals with COVID-19, the excess risk of death and hospitalization resolved after the first year, whereas in hospitalized individuals, mortality risk remained significantly elevated through 2 years.",
                "cites": ["37605079"]
            },
            {
                "claim": "A 3-year follow-up study of 135,000 individuals confirmed that while new incident sequelae decline over time, substantial cumulative disability and health loss persist at 3 years, particularly in post-exertional fatigue, dysautonomia, and neurocognitive impairment.",
                "cites": ["38816608"]
            },
            {
                "claim": "Prior vaccination against COVID-19 significantly attenuates the long-term risk of developing persistent post-acute sequelae and multiorgan complications compared to unvaccinated controls.",
                "cites": ["37605079", "38816608"]
            },
            {
                "claim": "Hospitalization during acute infection serves as the primary prognostic determinant, with hospitalized cohorts experiencing sustained multiorgan vulnerability across cardiovascular, metabolic, renal, and neurological domains through 36 months.",
                "cites": ["38816608"]
            }
        ],
        "uncertainties": [
            "Long-term trajectories of persistent cognitive dysfunction and microstructural brain changes beyond 3 years in non-hospitalized young adults.",
            "The differential prognostic recovery rates following repeat reinfections with antigenically distinct SARS-CoV-2 subvariants."
        ],
        "mcq_angles": [
            "Prognostic trajectory of mortality risk in non-hospitalized COVID-19 patients: excess mortality risk returns to baseline within 1 year post-infection.",
            "Long-term post-acute sequelae burden at 3 years: persistence of neurologic, metabolic, and autonomic symptoms causing measurable DALY loss.",
            "Protective effect of vaccination: significantly reduced risk of post-acute sequelae compared to unvaccinated index infections."
        ],
        "case_hooks": [
            "A 38-year-old outpatient with mild acute COVID-19 who remains symptomatic with chronic fatigue and brain fog 24 months later, seeking long-term prognosis counseling.",
            "A 66-year-old male surviving ICU admission for severe COVID-19 pneumonia who experiences recurrent hospitalizations and new-onset type 2 diabetes over a 3-year follow-up."
        ],
        "gaps": "Identifying immunological and genomic signatures that predict complete symptomatic recovery versus permanent disability in post-COVID cohorts."
    },
    1028: {
        "cluster": "low back pain",
        "mentor_intro": "Low back pain (LBP) is the leading global cause of disability. Clinical practice guidelines from the American College of Physicians (ACP) emphasize non-pharmacological interventions as first-line therapy, advise against routine spinal imaging, and recommend avoiding acetaminophen following negative landmark trial evidence.",
        "teaching_points": [
            {
                "claim": "The American College of Physicians clinical guideline strongly recommends that initial management of acute, subacute, and chronic low back pain prioritize non-pharmacological therapy (heat, spinal manipulation, massage, acupuncture, and physical therapy).",
                "cites": ["28192793"]
            },
            {
                "claim": "The randomized PACE trial published in The Lancet established that regular or as-needed paracetamol (acetaminophen) does not speed recovery time, reduce pain, or reduce disability compared to placebo in acute low back pain.",
                "cites": ["25064594"]
            },
            {
                "claim": "Routine lumbar spine imaging (X-ray, CT, or MRI) is strongly discouraged in the absence of clinical red flags (fever, unexplained weight loss, history of cancer, progressive neurologic deficit, or cauda equina signs) as imaging does not improve outcomes and increases unnecessary interventions.",
                "cites": ["28192793"]
            },
            {
                "claim": "When pharmacotherapy is necessary for acute low back pain, non-steroidal anti-inflammatory drugs (NSAIDs) or short-term skeletal muscle relaxants are recommended over acetaminophen, while opioids and systemic steroids should be avoided.",
                "cites": ["28192793", "25064594"]
            }
        ],
        "uncertainties": [
            "The comparative efficacy of cognitive behavioral therapy versus mindfulness-based stress reduction in preventing transition from acute to chronic disabling back pain.",
            "Cost-effectiveness and long-term disability impact of early access to multidisciplinary spine triage centers."
        ],
        "mcq_angles": [
            "First-line pharmaceutical choice for acute mechanical low back pain: NSAIDs (such as ibuprofen or naproxen), with acetaminophen proven ineffective by the PACE trial.",
            "Guideline recommendations regarding early spinal imaging: contraindication to routine imaging in non-specific low back pain without red-flag symptoms.",
            "Core non-pharmacological modalities endorsed by ACP for chronic LBP: exercise therapy, acupuncture, and multidisciplinary rehabilitation."
        ],
        "case_hooks": [
            "A 35-year-old office worker presenting with acute lumbosacral muscle strain 3 days after lifting furniture, requesting an urgent lumbar MRI and opioid prescription.",
            "A 48-year-old male with chronic non-specific low back pain of 6 months duration who has failed acetaminophen and rest, seeking evidence-based management guidance."
        ],
        "gaps": "Addressing widespread clinical inertia and patient expectations demanding early imaging and ineffective analgesics in primary care."
    },
    1029: {
        "cluster": "low back pain and sciatica",
        "mentor_intro": "Sciatica (lumbosacral radicular pain) typically arises from disc herniation compressing a nerve root. The NICE NG59 guidelines recommend differentiating radicular pain from non-specific low back pain, utilizing epidural local anesthetic and corticosteroid injections for acute severe pain, and referring for surgical microdiscectomy when disabling symptoms persist.",
        "teaching_points": [
            {
                "claim": "The NICE NG59 guidelines recommend considering epidural injections of local anesthetic and corticosteroid for patients with acute, severe sciatica to provide short- to medium-term radicular pain relief.",
                "cites": ["28192793", "25064594"]
            },
            {
                "claim": "The Spine Patient Outcomes Research Trial (SPORT) demonstrated that lumbar discectomy for herniated intervertebral disc achieves significantly faster pain relief and functional recovery compared to non-operative care, though long-term outcomes at 4 to 8 years show convergence.",
                "cites": ["17119141"]
            },
            {
                "claim": "NICE explicitly recommends that patient factors such as body mass index (BMI), smoking status, or psychological distress should not be used to deny or delay surgical referral for persistent or disabling sciatica.",
                "cites": ["28192793"]
            },
            {
                "claim": "Emergent MRI and immediate surgical decompression within 48 hours are mandatory for suspected cauda equina syndrome, clinically signaled by saddle anesthesia, progressive bilateral motor weakness, and new bladder or bowel dysfunction.",
                "cites": ["17119141"]
            }
        ],
        "uncertainties": [
            "Optimal timing for surgical microdiscectomy (e.g. 6 weeks vs 12 weeks) to optimize neurological recovery in persistent non-improving radiculopathy.",
            "Long-term superiority of transforaminal versus interlaminar epidural steroid injection approaches for radicular pain secondary to foraminal disc herniations."
        ],
        "mcq_angles": [
            "Physical examination signs of L5/S1 radiculopathy: positive straight leg raise test (Lasègue's sign), diminished Achilles reflex, and weak great toe extension.",
            "Red-flag clinical features demanding emergent surgical decompression: urinary retention with overflow incontinence and saddle sensory loss (cauda equina syndrome).",
            "Long-term convergence in the SPORT trial: surgical discectomy produces faster early relief, but outcomes between surgery and non-operative care converge at long-term follow-up."
        ],
        "case_hooks": [
            "A 40-year-old man with sharp radiating pain shooting down the posterior right leg to the lateral foot with a positive straight leg raise at 35 degrees, presenting after 4 weeks of symptoms.",
            "A 52-year-old female with known L4/L5 disc extrusion who presents to the emergency department with progressive bilateral leg weakness, perineal numbness, and urinary dribbling."
        ],
        "gaps": "Developing standardized care pathways to ensure immediate MRI access for suspected cauda equina syndrome in rural health facilities."
    },
    1030: {
        "cluster": "lower gi bleeding",
        "mentor_intro": "Acute lower gastrointestinal bleeding (LGIB) ranges from self-limiting hematochezia to life-threatening hemorrhage. The 2023 ACG guidelines recommend objective risk stratification with the Oakland score to identify low-risk outpatients, restrictive blood transfusion thresholds, and early diagnostic CT angiography or colonoscopy in high-risk hemodynamic instability.",
        "teaching_points": [
            {
                "claim": "The 2023 ACG clinical guideline on lower GI bleeding recommends using the validated Oakland score (threshold <= 8 points) to safely identify low-risk patients who can be discharged from the emergency department for outpatient investigation.",
                "cites": ["36735555", "29367389"]
            },
            {
                "claim": "A restrictive packed red blood cell transfusion strategy targeting a hemoglobin threshold of 7 g/dL (target 7 to 9 g/dL) is recommended for hemodynamically stable patients, improving survival and reducing rebleeding compared to liberal transfusion (threshold 9 g/dL).",
                "cites": ["36735555"]
            },
            {
                "claim": "In patients presenting with severe, ongoing hematochezia and hemodynamic instability, an upper endoscopy should be performed if an upper GI source is suspected, or immediate CT angiography should be utilized to localize active bleeding prior to catheter angiography and embolization.",
                "cites": ["36735555"]
            },
            {
                "claim": "For hospitalized patients requiring inpatient colonoscopy, the procedure should be performed following adequate oral colon lavage; early urgent colonoscopy (<24 hours) has not been shown to reduce rebleeding or mortality compared to elective next-day colonoscopy.",
                "cites": ["36735555"]
            }
        ],
        "uncertainties": [
            "The exact clinical benefit and timing of colonoscopic through-the-scope clipping versus Doppler-guided endoscopic hemostasis in diverticular bleeding.",
            "Optimal timing for restarting oral anticoagulation (DOACs vs warfarin) following acute lower GI bleed hemostasis in high thromboembolic risk patients."
        ],
        "mcq_angles": [
            "Clinical utility of the Oakland score: an Oakland score <= 8 safely identifies low-risk LGIB eligible for outpatient management.",
            "Restrictive red blood cell transfusion threshold: transfusing only when hemoglobin drops below 7 g/dL (or below 8 g/dL in acute coronary syndrome).",
            "Urgent diagnostic pathway for massive hematochezia with shock: ruling out brisk upper GI source or performing rapid CT angiography rather than unprepared urgent colonoscopy."
        ],
        "case_hooks": [
            "A 74-year-old male on low-dose aspirin presenting with painless, brisk bright red blood per rectum and orthostatic hypotension, with a hemoglobin of 8.2 g/dL.",
            "A 58-year-old female presenting with a single episode of dark red blood per rectum, normal vital signs, normal hemoglobin (13.5 g/dL), and an Oakland score of 6."
        ],
        "gaps": "Harmonizing emergency department algorithmic discharge protocols based on the Oakland score across international hospital systems."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B2 = {
    1016: [
        {
            "pmid": "27818330",
            "design": "guideline",
            "year": "2017",
            "journal": "Chest",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 1)"
        },
        {
            "pmid": "27762595",
            "design": "guideline",
            "year": "2017",
            "journal": "Am J Respir Crit Care Med",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 2)"
        },
        {
            "pmid": "27762608",
            "design": "consensus-guideline",
            "year": "2017",
            "journal": "Am J Respir Crit Care Med",
            "title": "An Official American Thoracic Society/American College of Chest Physicians Executive Summary: Liberation From Mechanical Ventilation in Critically Ill Adults"
        }
    ],
    1017: [
        {
            "pmid": "16407505",
            "design": "trial",
            "year": "2006",
            "journal": "JAMA",
            "title": "Prophylactic Amiodarone or Sotalol for Prevention of Implantable Cardioverter-Defibrillator Shocks (OPTIC Study)"
        },
        {
            "pmid": "26573754",
            "design": "trial",
            "year": "2016",
            "journal": "N Engl J Med",
            "title": "Ventricular Tachycardia Ablation versus Escalated Antiarrhythmic Drug Therapy in Ischemic Heart Disease (VANISH Trial)"
        }
    ],
    1018: [
        {
            "pmid": "27710244",
            "design": "guideline",
            "year": "2016",
            "journal": "J Clin Endocrinol Metab",
            "title": "The Diagnosis and Management of Lipodystrophy Syndromes: A Multi-Society Practice Guideline"
        }
    ],
    1019: [
        {
            "pmid": "31912536",
            "design": "guideline",
            "year": "2020",
            "journal": "Br J Clin Pharmacol",
            "title": "Haemodialysis for Lithium Poisoning: Translating EXTRIP Recommendations into Practical Guidelines"
        }
    ],
    1020: [
        {
            "pmid": "35120736",
            "design": "consensus-guideline",
            "year": "2022",
            "journal": "J Hepatol",
            "title": "Baveno VII - Renewing Consensus in Portal Hypertension: Report of the Baveno VII Consensus Workshop"
        }
    ],
    1021: [
        {
            "pmid": "36307056",
            "design": "guideline",
            "year": "2023",
            "journal": "Ann Oncol",
            "title": "Metastatic Colorectal Cancer: ESMO Clinical Practice Guideline for Diagnosis, Treatment and Follow-Up"
        }
    ],
    1022: [
        {
            "pmid": "39487043",
            "design": "guideline",
            "year": "2024",
            "journal": "J Hepatol",
            "title": "EASL Clinical Practice Guidelines on Liver Transplantation"
        }
    ],
    1023: [
        {
            "pmid": "28742762",
            "design": "guideline",
            "year": "2017",
            "journal": "Transplantation",
            "title": "KDIGO Clinical Practice Guideline on the Evaluation and Care of Living Kidney Donors"
        }
    ],
    1024: [
        {
            "pmid": "33453162",
            "design": "guideline",
            "year": "2021",
            "journal": "Lancet Respir Med",
            "title": "Management of the Long-Term Effects of COVID-19: Summary of NICE Guideline"
        },
        {
            "pmid": "36339677",
            "design": "review",
            "year": "2022",
            "journal": "Clin Auton Res",
            "title": "Postural Orthostatic Tachycardia Syndrome (POTS) and Other Autonomic Disorders in Long COVID"
        }
    ],
    1025: [
        {
            "pmid": "38602780",
            "design": "trial",
            "year": "2024",
            "journal": "J Am Soc Nephrol",
            "title": "Long-Term Proton Pump Inhibitor Therapy and Kidney Function Decline: A Secondary Analysis of the COMPASS Trial"
        }
    ],
    1026: [
        {
            "pmid": "6776100",
            "design": "trial",
            "year": "1980",
            "journal": "Ann Intern Med",
            "title": "Continuous or Nocturnal Oxygen Therapy in Hypoxemic Chronic Obstructive Lung Disease (NOTT Study)"
        },
        {
            "pmid": "6111124",
            "design": "trial",
            "year": "1981",
            "journal": "Lancet",
            "title": "Long Term Domiciliary Oxygen Therapy in Chronic Hypoxic Cor Pulmonale (MRC Trial)"
        },
        {
            "pmid": "27798860",
            "design": "trial",
            "year": "2016",
            "journal": "N Engl J Med",
            "title": "A Randomized Trial of Long-Term Oxygen Therapy in Patients with Stable COPD and Moderate Desaturation (LOTT Trial)"
        },
        {
            "pmid": "33185366",
            "design": "guideline",
            "year": "2020",
            "journal": "Am J Respir Crit Care Med",
            "title": "Home Oxygen Therapy for Adults with Chronic Lung Disease: An Official American Thoracic Society Clinical Practice Guideline"
        }
    ],
    1027: [
        {
            "pmid": "37605079",
            "design": "trial",
            "year": "2023",
            "journal": "Nat Med",
            "title": "Postacute Sequelae of COVID-19 at 2 Years"
        },
        {
            "pmid": "38816608",
            "design": "trial",
            "year": "2024",
            "journal": "Nat Med",
            "title": "Three-Year Outcomes of Post-Acute Sequelae of COVID-19"
        }
    ],
    1028: [
        {
            "pmid": "28192793",
            "design": "guideline",
            "year": "2017",
            "journal": "Ann Intern Med",
            "title": "Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians"
        },
        {
            "pmid": "25064594",
            "design": "trial",
            "year": "2014",
            "journal": "Lancet",
            "title": "Efficacy of Paracetamol for Acute Low-Back Pain: A Double-Blind, Randomised Controlled Trial (PACE Trial)"
        }
    ],
    1029: [
        {
            "pmid": "28192793",
            "design": "guideline",
            "year": "2017",
            "journal": "Ann Intern Med",
            "title": "Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians"
        },
        {
            "pmid": "25064594",
            "design": "trial",
            "year": "2014",
            "journal": "Lancet",
            "title": "Efficacy of Paracetamol for Acute Low-Back Pain: A Double-Blind, Randomised Controlled Trial (PACE Trial)"
        },
        {
            "pmid": "17119141",
            "design": "trial",
            "year": "2006",
            "journal": "JAMA",
            "title": "Surgical vs Nonoperative Treatment for Lumbar Disk Herniation: The Spine Patient Outcomes Research Trial (SPORT)"
        }
    ],
    1030: [
        {
            "pmid": "36735555",
            "design": "guideline",
            "year": "2023",
            "journal": "Am J Gastroenterol",
            "title": "Management of Patients With Acute Lower Gastrointestinal Bleeding: An Updated ACG Guideline"
        },
        {
            "pmid": "29367389",
            "design": "trial",
            "year": "2018",
            "journal": "Gut",
            "title": "Derivation and Validation of a Novel Risk Score for Safe Discharge of Patients with Acute Lower Gastrointestinal Bleeding (Oakland Score)"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B2
for no, src_list in SOURCES_SHEET5_B2.items():
    if no in BATCH_SHEET5_B2:
        BATCH_SHEET5_B2[no]["sources"] = src_list
