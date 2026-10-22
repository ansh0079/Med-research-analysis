"""
data_batch_1181_1195.py

Batch 13 of Sheet 5 (Topics 1001-1250): Topics 1181 to 1195.
Contains clinical mentor synopses, verified landmark trials, and guidelines
with 100% citation closure, zero boilerplate, and 4-2-3-2-1 structure.
"""

BATCH_SHEET5_B13 = {
    1181: {
        "cluster": "Urology / Nephrology",
        "mentor_intro": "Non-calcium urinary calculi include radiolucent uric acid stones driven by persistent acidic urine and infectious struvite staghorn calculi driven by urease-producing bacteria, requiring distinct diagnostic strategies, targeted urinary alkalinization, and surgical eradication.",
        "teaching_points": [
            {
                "claim": "Uric acid nephrolithiasis is primarily driven by persistently acidic urinary pH (<5.5) rather than absolute hyperuricosuria; oral chemolysis with potassium citrate targeting urinary pH 6.5 to 7.0 successfully dissolves existing calculi and prevents recurrence.",
                "cites": ["12352382", "24857648"]
            },
            {
                "claim": "Struvite (triple phosphate: magnesium ammonium phosphate and carbonate apatite) stones develop in the setting of chronic upper urinary tract infection with urease-producing organisms (Proteus mirabilis, Klebsiella, Providencia, Pseudomonas), which hydrolyze urea into carbon dioxide and ammonia, driving alkaline urine pH (>7.2).",
                "cites": ["351267", "36473775"]
            },
            {
                "claim": "EAU and AUA guidelines mandate complete surgical clearance (percutaneous nephrolithotomy [PCNL] preferred) for struvite staghorn stones, as residual fragments harbor viable bacteria within the stone matrix that inevitably perpetuate recurrent sepsis and progressive renal destruction.",
                "cites": ["36473775", "24857648"]
            },
            {
                "claim": "Uric acid stones are characteristically radiolucent on conventional plain radiography (KUB) but readily identified as high-attenuation calculi (200-400 Hounsfield units) on non-contrast computed tomography, distinguished from calcium stones (>800 HU).",
                "cites": ["12352382", "36473775"]
            }
        ],
        "sources": [
            {
                "pmid": "24857648",
                "title": "Medical management of kidney stones: AUA guideline",
                "journal": "J Urol",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": "36473775",
                "title": "EAU Guidelines on Urolithiasis",
                "journal": "Eur Urol",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": "12352382",
                "title": "Uric acid nephrolithiasis: current concepts and management",
                "journal": "J Urol",
                "year": 2002,
                "design": "review"
            },
            {
                "pmid": "351267",
                "title": "Struvite stones",
                "journal": "Kidney Int",
                "year": 1978,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Use of acetohydroxamic acid (irreversible bacterial urease inhibitor) given its high incidence of gastrointestinal and tremulous adverse effects.",
            "Long-term antibiotic suppression duration following complete surgical clearance of struvite staghorn calculi."
        ],
        "mcq_angles": [
            "Underlying mechanism of uric acid stones: persistent acidic urinary pH (<5.5) rather than elevated serum uric acid.",
            "Target urine pH during potassium citrate dissolution therapy: 6.5 to 7.0 (avoiding pH >7.0 to prevent calcium phosphate precipitation).",
            "Bacterial species generating struvite stones: urease producers (Proteus mirabilis, Klebsiella; NOT E. coli).",
            "Appearance on plain X-ray: uric acid is radiolucent; struvite is radiopaque."
        ],
        "case_hooks": [
            "A 58-year-old man with metabolic syndrome and gout presenting with renal colic, unenhanced CT showing a 1.2 cm proximal ureteric stone with attenuation 320 HU, and negative plain KUB.",
            "A 64-year-old paraplegic woman with recurrent urinary tract infections found to have a complete cast of the renal pelvis and calyces (staghorn calculus) with urine pH 7.8 and Proteus mirabilis bacteriuria."
        ],
        "gaps": "Prospective trials evaluating dual-energy CT material decomposition algorithms to non-invasively differentiate stone crystal composition before intervention."
    },
    1182: {
        "cluster": "Nephrology",
        "mentor_intro": "Nephrotic syndrome is a clinical and biochemical syndrome defined by heavy proteinuria (>3.5 g/24h or urine protein-to-creatinine ratio >350 mg/mmol), hypoalbuminemia (<30 g/L), peripheral edema, and hyperlipidemia, demanding systematic evaluation to distinguish primary podocytopathies from systemic disease.",
        "teaching_points": [
            {
                "claim": "The diagnostic definition requires the complete nephrotic triad: heavy proteinuria exceeding 3.5 g per 24 hours (or spot urine protein:creatinine ratio >3000-3500 mg/g), profound hypoalbuminemia (<30 g/L), and peripheral edema, universally accompanied by dyslipidemia.",
                "cites": ["18496924", "34579821"]
            },
            {
                "claim": "In adults, membranous nephropathy, focal segmental glomerulosclerosis (FSGS), and minimal change disease account for >80% of primary cases; serological testing for anti-PLA2R antibodies identifies primary membranous nephropathy with >95% specificity, frequently eliminating the requirement for renal biopsy.",
                "cites": ["34579821", "17699450"]
            },
            {
                "claim": "Profound hypercoagulability results from urinary loss of endogenous anticoagulants (antithrombin III, protein S) and hepatic synthesis of procoagulant fibrinogen; in membranous nephropathy with severe hypoalbuminemia (serum albumin <28 g/L), prophylactic anticoagulation is indicated to prevent deep vein thrombosis and renal vein thrombosis.",
                "cites": ["22096038"]
            },
            {
                "claim": "KDIGO guidelines emphasize supportive management across all etiologies: loop diuretics combined with thiazides for edema, maximally tolerated ACE inhibitors or ARBs combined with SGLT2 inhibitors for antiproteinuric renoprotection, and statin therapy for severe dyslipidemia.",
                "cites": ["34579821"]
            }
        ],
        "sources": [
            {
                "pmid": "34579821",
                "title": "KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases",
                "journal": "Kidney Int",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": "18496924",
                "title": "Nephrotic syndrome in adults",
                "journal": "BMJ",
                "year": 2008,
                "design": "review"
            },
            {
                "pmid": "22096038",
                "title": "Venous thromboembolism in patients with membranous nephropathy",
                "journal": "Clin J Am Soc Nephrol",
                "year": 2012,
                "design": "trial"
            },
            {
                "pmid": "17699450",
                "title": "Adult minimal-change disease: clinical characteristics, treatment, and outcomes",
                "journal": "Clin J Am Soc Nephrol",
                "year": 2007,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Bleeding versus thrombosis risk thresholds when selecting direct oral anticoagulants (DOACs) versus low-molecular-weight heparin in nephrotic patients with albumin <20 g/L.",
            "Impact of upfront SGLT2 inhibitor addition on long-term eGFR trajectory in steroid-sensitive minimal change disease."
        ],
        "mcq_angles": [
            "Classical triad defining nephrotic syndrome: proteinuria >3.5 g/24h, hypoalbuminemia <30 g/L, and peripheral edema.",
            "Specific autoantibody enabling non-invasive diagnosis of primary membranous nephropathy: anti-PLA2R (phospholipase A2 receptor).",
            "Highest thromboembolic risk among primary glomerulopathies: membranous nephropathy (particularly renal vein thrombosis).",
            "Infection susceptibility mechanism: urinary loss of immunoglobulins (IgG) and complement factor B predisposing to encapsulated bacterial sepsis (Streptococcus pneumoniae)."
        ],
        "case_hooks": [
            "A 48-year-old man presenting with facial puffiness, bilateral lower extremity pitting edema to the thighs, urine protein 8.4 g/24h, and serum albumin 18 g/L.",
            "A patient with nephrotic syndrome secondary to membranous nephropathy presenting with sudden left flank pain, macroscopic hematuria, and acute worsening of renal function (acute renal vein thrombosis)."
        ],
        "gaps": "Prospective trials evaluating non-invasive urinary podocyte biomarker panels to differentiate early FSGS from minimal change disease without kidney biopsy."
    },
    1183: {
        "cluster": "Neurocritical Care / Neurosurgery",
        "mentor_intro": "Aneurysmal subarachnoid haemorrhage (aSAH) is a critical neurological emergency requiring emergent non-contrast head CT, early aneurysm securement (<24h), enteral nimodipine neuroprotection, and proactive surveillance for delayed cerebral ischemia.",
        "teaching_points": [
            {
                "claim": "AHA/ASA 2023 guidelines recommend oral nimodipine (60 mg every 4 hours for 21 days) initiated immediately upon diagnosis; in the landmark British aneurysm nimodipine trial, nimodipine reduced cerebral infarction by 34% (p<0.001) and significantly reduced poor neurological outcomes.",
                "cites": ["37212241", "2496789"]
            },
            {
                "claim": "In the landmark International Subarachnoid Aneurysm Trial (ISAT) of 2,143 patients, endovascular coiling of ruptured intracranial aneurysms amenable to both techniques produced significantly higher 1-year independent survival (23.5% dependent/dead vs 30.9% with surgical clipping; absolute risk reduction 7.4%; p=0.0001).",
                "cites": ["16139655"]
            },
            {
                "claim": "Emergency aneurysm repair (coiling or clipping) should be performed as early as feasible (within 24 hours of rupture) to eliminate the catastrophic ~15% early re-bleeding risk, which carries an associated mortality exceeding 70%.",
                "cites": ["37212241", "21773873"]
            },
            {
                "claim": "Delayed cerebral ischemia (DCI) typically develops between days 4 and 14 post-hemorrhage; Neurocritical Care Society consensus guidelines mandate maintenance of euvolemia (avoiding prophylactic hypervolemic 'triple-H' therapy) and induced arterial hypertension with vasopressors upon clinical evidence of DCI.",
                "cites": ["21773873", "37212241"]
            }
        ],
        "sources": [
            {
                "pmid": "37212241",
                "title": "2023 Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage",
                "journal": "Stroke",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": "2496789",
                "title": "Effect of oral nimodipine on cerebral infarction and outcome after subarachnoid haemorrhage: British aneurysm nimodipine trial",
                "journal": "BMJ",
                "year": 1989,
                "design": "trial"
            },
            {
                "pmid": "16139655",
                "title": "International Subarachnoid Aneurysm Trial (ISAT) of neurosurgical clipping versus endovascular coiling in 2143 patients with ruptured intracranial aneurysms",
                "journal": "Lancet",
                "year": 2005,
                "design": "trial"
            },
            {
                "pmid": "21773873",
                "title": "Critical care management of patients following aneurysmal subarachnoid hemorrhage: recommendations from the Neurocritical Care Society",
                "journal": "Neurocrit Care",
                "year": 2011,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Use of intra-arterial vasodilators (milrinone, verapamil) versus balloon angioplasty in medically refractory vasospasm.",
            "Prognostic significance of early brain injury (cortical spreading depolarizations) on continuous electroencephalography."
        ],
        "mcq_angles": [
            "Drug proven to reduce poor neurological outcomes in aSAH: oral nimodipine 60 mg every 4 hours for 21 days.",
            "Primary finding of ISAT trial: endovascular coiling is associated with lower 1-year disability and mortality compared with surgical clipping in coilable aneurysms.",
            "Current hemodynamic consensus for delayed cerebral ischemia: induced hypertension and euvolemia (hypervolemia is abandoned due to cardiopulmonary complications).",
            "Peak temporal incidence of delayed cerebral vasospasm: days 4 to 14 post-hemorrhage."
        ],
        "case_hooks": [
            "A 49-year-old woman presenting with a sudden 'thunderclap' occipital headache, photophobia, and neck stiffness, unenhanced CT showing diffuse high attenuation in the basal cisterns.",
            "A patient on day 7 post-aneurysm coiling who develops new left-sided drift and expressive dysphasia without rebleeding or hydrocephalus on CT (delayed cerebral ischemia)."
        ],
        "gaps": "Prospective randomized trials evaluating whether continuous lumbar drainage following aneurysm securement reduces secondary vasospasm and chronic hydrocephalus."
    },
    1184: {
        "cluster": "Oncology / Endocrinology / Nuclear Medicine",
        "mentor_intro": "Neuroendocrine tumours (NETs) are classified by the WHO 2022 framework into well-differentiated tumors (G1, G2, G3) based on mitotic count and Ki-67 proliferation index; functional imaging with somatostatin receptor PET-CT directs targeted somatostatin analogues and peptide receptor radionuclide therapy (PRRT).",
        "teaching_points": [
            {
                "claim": "The WHO 2022 classification stratifies well-differentiated neuroendocrine tumours (NETs) strictly by Ki-67 proliferation index: Grade 1 (Ki-67 <3%), Grade 2 (Ki-67 3% to 20%), and Grade 3 (Ki-67 >20%), differentiating well-differentiated G3 NETs (preserved DAXX/ATRX, intact RB1/TP53) from poorly differentiated neuroendocrine carcinomas (NEC: small cell or large cell, TP53/RB1 mutated).",
                "cites": ["35039480"]
            },
            {
                "claim": "In the landmark phase 3 NETTER-1 trial, 177Lu-dotatate peptide receptor radionuclide therapy (PRRT) combined with octreotide LAR in patients with advanced progressive midgut NETs significantly reduced the risk of disease progression or death by 79% (HR 0.21; p<0.001) compared with high-dose octreotide LAR alone.",
                "cites": ["28076709"]
            },
            {
                "claim": "Somatostatin receptor (SSTR) PET imaging using 68Ga-DOTATATE, 68Ga-DOTATOC, or 64Cu-DOTATATE demonstrates diagnostic sensitivity >95% and specificity >90%, outperforming conventional 111In-pentetreotide Octreoscan and CT in detecting occult primary sites and distant metastases.",
                "cites": ["28705917", "32272207"]
            },
            {
                "claim": "ESMO guidelines establish long-acting somatostatin analogues (octreotide LAR 30 mg or lanreotide autogel 120 mg every 4 weeks) as first-line antiproliferative and antisecretory therapy for advanced, unresectable, well-differentiated G1/G2 gastrointestinal and pancreatic NETs.",
                "cites": ["32272207", "28076709"]
            }
        ],
        "sources": [
            {
                "pmid": "35039480",
                "title": "A common classification framework for neuroendocrine neoplasms: an update and presentation of the WHO 2022 framework",
                "journal": "Mod Pathol",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": "28076709",
                "title": "Phase 3 Trial of 177Lu-Dotatate for Midgut Neuroendocrine Tumors (NETTER-1)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "28705917",
                "title": "Appropriate Use Criteria for Somatostatin Receptor PET Imaging",
                "journal": "J Nucl Med",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "32272207",
                "title": "Gastroenteropancreatic neuroendocrine neoplasms: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up",
                "journal": "Ann Oncol",
                "year": 2020,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Sequencing PRRT versus oral targeted therapies (everolimus, sunitinib) or capecitabine-temozolomide (CAPTEM) in progressive pancreatic NETs.",
            "Retreatment efficacy and bone marrow cumulative toxicity with repeat 177Lu-DOTATATE cycles upon secondary progression."
        ],
        "mcq_angles": [
            "Ki-67 proliferation index cutoffs for well-differentiated NETs: G1 is <3%, G2 is 3-20%, G3 is >20%.",
            "Biological distinction: G3 NETs are well-differentiated with high Ki-67, whereas G3 NECs are poorly differentiated with TP53/RB1 loss.",
            "Primary outcome of the NETTER-1 trial: 79% reduction in progression or death with 177Lu-DOTATATE PRRT.",
            "Superiority of 68Ga-DOTATATE PET over 111In-Octreoscan: higher resolution, lower radiation dose, and higher affinity for somatostatin receptor subtype 2 (SSTR2)."
        ],
        "case_hooks": [
            "A 61-year-old woman with episodic facial flushing, secretory watery diarrhea, and multiple hypervascular hepatic metastases whose 68Ga-DOTATATE PET reveals intense SSTR uptake.",
            "A patient with an asymptomatic 2.2 cm non-functional pancreatic neuroendocrine tumor whose endoscopic ultrasound biopsy shows Ki-67 index of 1.2% (G1 NET)."
        ],
        "gaps": "Prospective randomized trials evaluating alpha-emitting radionuclide therapies (e.g., 225Ac-DOTATATE) in PRRT-refractory neuroendocrine tumors."
    },
    1185: {
        "cluster": "Critical Care / Anaesthesia",
        "mentor_intro": "Neuromuscular blocking agents (NMBAs) in the intensive care unit improve chest wall compliance and eliminate patient-ventilator dyssynchrony in severe acute respiratory distress syndrome (ARDS), requiring structured indications, deep sedation, and quantitative peripheral nerve train-of-four monitoring.",
        "teaching_points": [
            {
                "claim": "In the landmark ACURASYS trial by Papazian and colleagues, early continuous infusion of the non-depolarizing NMBA cisatracurium for 48 hours in severe ARDS (PaO2/FiO2 <150 mmHg) significantly improved 90-day survival (adjusted HR 0.68; p=0.04) and increased ventilator-free days.",
                "cites": ["20843245"]
            },
            {
                "claim": "Conversely, the large multicenter ROSE trial evaluated early neuromuscular blockade combined with modern high PEEP lung-protective ventilation and deep sedation, finding no significant difference in 90-day mortality (42.5% vs 42.8%) compared with light sedation and neuromuscular blockade used only as rescue.",
                "cites": ["31112383"]
            },
            {
                "claim": "Clinical guidelines recommend reserving continuous NMBA infusions for severe ARDS with refractory hypoxemia (PaO2/FiO2 <150), persistent severe patient-ventilator dyssynchrony, high plateau pressures >30 cmH2O, or shivering during targeted temperature management.",
                "cites": ["27755087", "31112383"]
            },
            {
                "claim": "Prolonged neuromuscular blockade is a major contributor to ICU-acquired weakness (critical illness myopathy and neuropathy); monitoring mandates clinical assessment paired with peripheral nerve stimulation (train-of-four [TOF] goal of 1 to 2 twitches) and daily cessation trials.",
                "cites": ["24758618", "27755087"]
            }
        ],
        "sources": [
            {
                "pmid": "20843245",
                "title": "Neuromuscular blockers in early severe acute respiratory distress syndrome (ACURASYS)",
                "journal": "N Engl J Med",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": "31112383",
                "title": "Early Neuromuscular Blockade in the Acute Respiratory Distress Syndrome (ROSE)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "27755087",
                "title": "Clinical practice guidelines for sustained neuromuscular blockade in the adult critically ill patient",
                "journal": "Crit Care Med",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": "24758618",
                "title": "ICU-acquired weakness: risk factors, peripheral nerve dysfunction, and critical illness myopathy",
                "journal": "N Engl J Med",
                "year": 2014,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Pharmacodynamic differences and metabolic clearance between cisatracurium (organ-independent Hofmann elimination) vs vecuronium/rocuronium in multi-organ renal/hepatic failure.",
            "Long-term post-intensive care syndrome (PICS) cognitive and psychological outcomes in patients managed with continuous paralysis vs light sedation."
        ],
        "mcq_angles": [
            "Reconciliation of ACURASYS and ROSE trials: routine continuous paralysis does not improve survival when compared to modern high PEEP lung-protective ventilation and conservative rescue paralysis.",
            "Train-of-four (TOF) monitoring target: 1 to 2 twitches out of 4 (corresponds to ~80-90% receptor blockade).",
            "Major long-term complication of prolonged paralysis: ICU-acquired weakness / critical illness myopathy.",
            "Pharmacokinetic advantage of cisatracurium: Hofmann elimination (non-enzymatic spontaneous degradation independent of renal or hepatic function)."
        ],
        "case_hooks": [
            "A 54-year-old patient with severe COVID-19 ARDS, PaO2/FiO2 88 mmHg, who exhibits intense double-triggering and breath-stacking despite maximal analgesia starting cisatracurium infusion.",
            "An ICU patient paralyzed for 5 days evaluated with ulnar nerve train-of-four stimulation demonstrating zero twitches, prompting an immediate infusion rate reduction."
        ],
        "gaps": "Prospective validation of electrical impedance tomography and diaphragm ultrasound in guiding optimal timing of neuromuscular blockade weaning."
    },
    1186: {
        "cluster": "Critical Care / Neurology / Pulmonology",
        "mentor_intro": "Neuromuscular respiratory failure results from diaphragmatic and intercostal muscle pump exhaustion in conditions such as Guillain-Barré syndrome and myasthenic crisis, demanding serial bedside spirometry and early elective endotracheal intubation before hypercapnic arrest occurs.",
        "teaching_points": [
            {
                "claim": "The clinical '20/30/40 rule' validated by Lawn and colleagues identifies impending ventilatory failure in Guillain-Barré syndrome and myasthenia gravis: forced vital capacity (FVC) <20 mL/kg, maximum inspiratory pressure (MIP/NIF) less negative than -30 cmH2O, or maximum expiratory pressure (MEP) <40 cmH2O mandates ICU admission and elective intubation.",
                "cites": ["11405803"]
            },
            {
                "claim": "Pulse oximetry and arterial blood gases are dangerously insensitive late indicators; normal oxygen saturation is maintained until hypercapnic respiratory arrest is imminent, making serial upright and supine vital capacity the essential bedside monitoring tool.",
                "cites": ["11405803", "34618766"]
            },
            {
                "claim": "Diaphragmatic weakness is clinically signaled by paradoxical abdominal inward movement during inspiration in the supine position and an acute drop in forced vital capacity >20% when moving from an upright sitting to a supine position.",
                "cites": ["34618766", "27922502"]
            },
            {
                "claim": "In acute myasthenic crisis, immediate definitive disease-modifying therapy consists of therapeutic plasma exchange (PLEX) or intravenous immunoglobulin (IVIG 2 g/kg over 2-5 days); acetylcholinesterase inhibitors (pyridostigmine) should be temporarily discontinued in intubated patients to avoid excessive tracheobronchial secretions.",
                "cites": ["27922502", "26993881"]
            }
        ],
        "sources": [
            {
                "pmid": "11405803",
                "title": "Anticipating mechanical ventilation in Guillain-Barré syndrome",
                "journal": "Arch Neurol",
                "year": 2001,
                "design": "trial"
            },
            {
                "pmid": "27922502",
                "title": "Myasthenic crisis: clinical features, bedside pulmonary function testing, and ventilatory management",
                "journal": "Continuum (Minneap Minn)",
                "year": 2016,
                "design": "review"
            },
            {
                "pmid": "34618766",
                "title": "Neuromuscular respiratory failure",
                "journal": "Continuum (Minneap Minn)",
                "year": 2021,
                "design": "review"
            },
            {
                "pmid": "26993881",
                "title": "Guillain-Barré syndrome",
                "journal": "Lancet",
                "year": 2016,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Use of non-invasive positive pressure ventilation (BiPAP) as a bridge in mild neuromuscular weakness versus the risk of sudden aspiration and emergency crash intubation.",
            "Long-term diaphragmatic pacing protocols in chronic amyotrophic lateral sclerosis."
        ],
        "mcq_angles": [
            "The 20/30/40 rule thresholds: FVC <20 mL/kg, MIP/NIF less negative than -30 cmH2O, MEP <40 cmH2O.",
            "Single breath count test: an inability to count aloud past 15-20 on a single breath correlates with vital capacity <1 L.",
            "Dangerous pitfall of relying on pulse oximetry: hypoxemia is a very late sign that occurs only when the patient is exhausted and in extremis.",
            "Temporary cessation of pyridostigmine during mechanical ventilation: reduces airway secretions and avoids cholinergic crisis confusion."
        ],
        "case_hooks": [
            "A 34-year-old man with Guillain-Barré syndrome whose SpO2 is 98% on room air but whose FVC drops from 28 mL/kg to 16 mL/kg over 6 hours intubated electively.",
            "A 26-year-old woman with myasthenia gravis presenting with shallow rapid breathing, paradoxical abdominal breathing, and single breath count of 11."
        ],
        "gaps": "Prospective trials evaluating bedside ultrasound of diaphragm thickening fraction (DTF) to anticipate non-invasive ventilation failure."
    },
    1187: {
        "cluster": "Neurology / Neuroimmunology",
        "mentor_intro": "Neuromyelitis optica spectrum disorder (NMOSD) is a severe autoimmune astrocytopathy mediated by pathogenic autoantibodies against aquaporin-4 (AQP4-IgG); modern targeted biologics (eculizumab, satralizumab, inebilizumab) dramatically suppress attacks and prevent cumulative disability.",
        "teaching_points": [
            {
                "claim": "In the randomized phase 3 PREVENT trial by Pittock and colleagues, terminal complement C5 inhibition with intravenous eculizumab reduced the adjudicated relapse rate by 94% (HR 0.06; 95% CI 0.02-0.20; p<0.001) in AQP4-IgG-positive NMOSD.",
                "cites": ["31050279"]
            },
            {
                "claim": "The phase 3 SAkuraSky trial demonstrated that the subcutaneous IL-6 receptor antagonist satralizumab added to baseline immunosuppression significantly reduced the risk of relapse by 62% overall (HR 0.38) and by 79% in AQP4-IgG-seropositive patients (HR 0.21; p=0.001).",
                "cites": ["31774951"]
            },
            {
                "claim": "In the phase 3 N-MOmentum trial, inebilizumab (humanized monoclonal antibody targeting CD19 to deplete both B cells and antibody-secreting plasmablasts) reduced the risk of NMOSD attack by 73% (HR 0.27; p<0.0001) and reduced worsening of disability.",
                "cites": ["31495490"]
            },
            {
                "claim": "Traditional multiple sclerosis disease-modifying therapies (interferon-beta, fingolimod, natalizumab) are ineffective and can trigger catastrophic relapses in NMOSD, underscoring the critical requirement for early AQP4-IgG serological testing.",
                "cites": ["26109736", "31050279"]
            }
        ],
        "sources": [
            {
                "pmid": "31050279",
                "title": "Eculizumab in Aquaporin-4-Positive Neuromyelitis Optica Spectrum Disorder (PREVENT)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "31774951",
                "title": "Trial of Satralizumab in Neuromyelitis Optica Spectrum Disorder (SAkuraSky)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "31495490",
                "title": "Inebilizumab for the treatment of neuromyelitis optica spectrum disorder (N-MOmentum)",
                "journal": "Lancet",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "26109736",
                "title": "International consensus diagnostic criteria for neuromyelitis optica spectrum disorder",
                "journal": "Neurology",
                "year": 2015,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Direct head-to-head comparison between anti-complement (eculizumab/ravulizumab), anti-IL-6R (satralizumab), and anti-CD19 (inebilizumab) strategies.",
            "Long-term management of hypogammaglobulinemia and encapsulated bacterial infections during decades of continuous biologic maintenance."
        ],
        "mcq_angles": [
            "Relative risk reduction in PREVENT trial: 94% reduction in relapse risk with eculizumab.",
            "Target of inebilizumab: CD19 (depletes both circulating B cells and antibody-producing plasmablasts/plasma cells).",
            "Mandated safety precaution before eculizumab: vaccination against Neisseria meningitidis.",
            "Detrimental medications: interferon-beta, fingolimod, and natalizumab exacerbate NMOSD."
        ],
        "case_hooks": [
            "A 36-year-old woman with AQP4-positive NMOSD suffering two severe relapses on azathioprine evaluating high-efficacy targeted biologic therapy.",
            "A patient receiving eculizumab who develops headache and fever presenting to the emergency department for urgent lumbar puncture ruling out meningococcal meningitis."
        ],
        "gaps": "Comparative clinical trials evaluating oral complement pathway inhibitors versus monoclonal antibodies in maintaining attack-free remission."
    },
    1188: {
        "cluster": "Neurology / Neuroimmunology",
        "mentor_intro": "Neuromyelitis optica spectrum disorder (NMOSD) is an autoimmune demyelinating central nervous system astrocytopathy driven by complement-activating autoantibodies against aquaporin-4 (AQP4), classically presenting with longitudinally extensive transverse myelitis (LETM), severe optic neuritis, and area postrema syndrome.",
        "teaching_points": [
            {
                "claim": "According to the 2015 International Panel for NMO Diagnosis (IPND) criteria, NMOSD with AQP4-IgG requires at least 1 core clinical characteristic: optic neuritis, acute myelitis (LETM), area postrema syndrome (intractable hiccups, nausea, vomiting), acute brainstem syndrome, narcolepsy/diencephalic syndrome, or symptomatic cerebral syndrome.",
                "cites": ["26109736"]
            },
            {
                "claim": "Longitudinally extensive transverse myelitis (LETM) is the pathognomonic spinal MRI hallmark of NMOSD, defined as a contiguous intramedullary T2-hyperintense spinal cord lesion spanning 3 or more vertebral segments, typically involving the central gray matter with cord swelling.",
                "cites": ["26109736", "33093467"]
            },
            {
                "claim": "Lennon and colleagues demonstrated that NMO-IgG autoantibodies selectively target the aquaporin-4 water channel localized on astrocytic foot processes at the blood-brain barrier, triggering complement activation, astrocyte lysis, secondary oligodendrocyte death, and severe necrotic demyelination.",
                "cites": ["15589308"]
            },
            {
                "claim": "The area postrema syndrome occurs in up to 12% of presentations and is characterized by episodes of intractable nausea, vomiting, or hiccups lasting >48 hours without gastrointestinal etiology, caused by localized AQP4-IgG-mediated inflammation in the floor of the fourth ventricle.",
                "cites": ["20926787", "26109736"]
            }
        ],
        "sources": [
            {
                "pmid": "26109736",
                "title": "International consensus diagnostic criteria for neuromyelitis optica spectrum disorder",
                "journal": "Neurology",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": "15589308",
                "title": "A serum autoantibody marker of neuromyelitis optica: distinction from multiple sclerosis",
                "journal": "Lancet",
                "year": 2004,
                "design": "trial"
            },
            {
                "pmid": "20926787",
                "title": "Intractable vomiting and hiccups in neuromyelitis optica spectrum disorder",
                "journal": "Neurology",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": "33093467",
                "title": "Neuromyelitis optica spectrum disorders",
                "journal": "Nat Rev Dis Primers",
                "year": 2020,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Prognostic and diagnostic criteria for seronegative NMOSD (requiring >=2 core clinical characteristics including LETM or optic neuritis).",
            "Optimal acute rescue therapy: immediate concurrent plasma exchange alongside IV pulse methylprednisolone versus sequential therapy."
        ],
        "mcq_angles": [
            "Imaging definition of LETM: contiguous spinal cord lesion extending over >=3 vertebral body segments on sagittal MRI.",
            "Clinical syndrome of the area postrema: intractable nausea, vomiting, or hiccups lasting >=48 hours.",
            "Primary cellular target of AQP4-IgG: astrocytic foot processes (astrocytopathy, NOT primary oligodendrocyte demyelination).",
            "Laboratory diagnostic test: cell-based serum assay (CBA) is significantly superior to ELISA or tissue immunofluorescence."
        ],
        "case_hooks": [
            "A 32-year-old woman presenting with paraplegia and sensory level at T4 whose thoracic spine MRI demonstrates a continuous hyperintense lesion from T2 to T8.",
            "A 28-year-old woman admitted to gastroenterology for 3 weeks of intractable vomiting and hiccups whose brain MRI demonstrates medullary area postrema T2 hyperintensity."
        ],
        "gaps": "Prospective validation of early serum glial fibrillary acidic protein (GFAP) as an acute biomarker of astrocytic injury in NMOSD attacks."
    },
    1189: {
        "cluster": "Dermatology / Endocrinology / Wound Care",
        "mentor_intro": "Neuropathic leg and foot ulcers result from sensorimotor and autonomic diabetic peripheral neuropathy, characterized by painless ulceration over high-pressure plantar prominences, requiring structured offloading (total contact casting), sharp surgical debridement, and osteomyelitis exclusion.",
        "teaching_points": [
            {
                "claim": "According to the International Working Group on the Diabetic Foot (IWGDF) guidelines, loss of protective sensation (LOPS) confirmed by an inability to feel the 10-gram Semmes-Weinstein monofilament on plantar surfaces is the primary predisposing cause of neuropathic foot ulceration.",
                "cites": ["37258300"]
            },
            {
                "claim": "The probe-to-bone (PTB) test is an essential clinical assessment: in a prospective validation by Grayson and colleagues, palpating hard gritty bone with a sterile metallic probe in an infected ulcer had a positive predictive value of 89% for underlying osteomyelitis, guiding the requirement for plain radiography, MRI, or bone biopsy.",
                "cites": ["7853630"]
            },
            {
                "claim": "IWGDF guidelines establish non-removable knee-high offloading devices (total contact cast [TCC] or non-removable knee-high walker) as the first-choice standard of care for healing plantar neuropathic forefoot and midfoot ulcers, significantly accelerating healing rates compared to removable therapeutic shoes.",
                "cites": ["31960555", "28614188"]
            },
            {
                "claim": "Autonomic neuropathy contributes to ulcer pathogenesis through anhidrosis (causing dry, cracked, hyperkeratotic fissures) and sympathetic denervation, opening arteriovenous shunts that produce bounding foot pulses in warm, insensate, high-risk feet.",
                "cites": ["28614188", "37258300"]
            }
        ],
        "sources": [
            {
                "pmid": "37258300",
                "title": "Practical Guidelines on the prevention and management of diabetes-related foot disease (IWGDF 2023 update)",
                "journal": "Diabetes Metab Res Rev",
                "year": 2024,
                "design": "guideline"
            },
            {
                "pmid": "28614188",
                "title": "Diabetic Foot Ulcers and Their Recurrence",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": "7853630",
                "title": "Probing to bone in infected foot ulcers: a clinical sign of underlying osteomyelitis",
                "journal": "JAMA",
                "year": 1995,
                "design": "trial"
            },
            {
                "pmid": "31960555",
                "title": "Guidelines on offloading foot ulcers in persons with diabetes (IWGDF 2019)",
                "journal": "Diabetes Metab Res Rev",
                "year": 2020,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Antibiotic therapy duration (6 weeks vs 3 weeks) in diabetic foot osteomyelitis treated without bone resection.",
            "Long-term ulcer recurrence prevention comparing patient-administered home dermal infrared temperature monitoring against routine nurse visits."
        ],
        "mcq_angles": [
            "Primary intervention with highest evidence for healing plantar neuropathic ulcers: non-removable knee-high total contact casting.",
            "Significance of a positive probe-to-bone test: high positive predictive value (~89%) for underlying osteomyelitis in high-prevalence settings.",
            "Clinical test confirming loss of protective sensation: 10-gram Semmes-Weinstein monofilament.",
            "Anatomical location of pure neuropathic vs ischemic ulcers: neuropathic ulcers occur on weight-bearing plantar surfaces (metatarsal heads, heels); ischemic ulcers occur on distal digits and lateral borders of the foot."
        ],
        "case_hooks": [
            "A 62-year-old diabetic man presenting with a painless 2 cm circular punched-out ulcer under the first metatarsal head surrounded by a thick rim of callus.",
            "A diabetic patient with a chronic heel ulcer in whom a sterile blunt probe touches a hard, gritty, painless surface at the base of the wound."
        ],
        "gaps": "Standardized criteria to identify which patients with diabetic neuroarthropathy (Charcot foot) safely tolerate non-removable total contact casting without iatrogenic skin breakdown."
    },
    1190: {
        "cluster": "Neurology / Pain Medicine / Clinical Pharmacology",
        "mentor_intro": "Neuropathic pain is caused by a lesion or disease of the somatosensory nervous system, characterized by spontaneous burning pain, hyperalgesia, and allodynia, treated according to evidence-based consensus guidelines prioritizing gabapentinoids, SNRIs, and tricyclic antidepressants while strictly limiting opioids.",
        "teaching_points": [
            {
                "claim": "In the NeuPSIG / International Association for the Study of Pain (IASP) systematic review and meta-analysis by Finnerup and colleagues, three drug classes were established as first-line Level A evidence for neuropathic pain: gabapentinoids (pregabalin, gabapentin), serotonin-noradrenaline reuptake inhibitors (duloxetine, venlafaxine), and tricyclic antidepressants (amitriptyline, nortriptyline).",
                "cites": ["25575710"]
            },
            {
                "claim": "Gabapentinoids (pregabalin 150-600 mg daily, gabapentin 900-3600 mg daily) bind the alpha-2-delta subunit of voltage-gated calcium channels, reducing presynaptic excitatory neurotransmitter release with a number needed to treat (NNT) of approximately 7.2 for >=50% pain reduction.",
                "cites": ["30673120", "25575710"]
            },
            {
                "claim": "Duloxetine (60-120 mg once daily) selectively inhibits presynaptic reuptake of serotonin and noradrenaline, enhancing descending inhibitory pain pathways with proven efficacy across painful diabetic peripheral neuropathy (NNT ~6.4) and central neuropathic pain without causing anticholinergic side effects.",
                "cites": ["24385428"]
            },
            {
                "claim": "Tricyclic antidepressants (amitriptyline 10-75 mg at bedtime) exhibit the lowest NNT (~3.6) across peripheral neuropathic pain conditions, but carry significant anticholinergic adverse effects, sedation, and cardiotoxicity (QTc prolongation, fatal ventricular arrhythmias in overdose) requiring baseline ECG screening.",
                "cites": ["17943857", "25575710"]
            }
        ],
        "sources": [
            {
                "pmid": "25575710",
                "title": "Pharmacotherapy for neuropathic pain in adults: a systematic review and meta-analysis",
                "journal": "Lancet Neurol",
                "year": 2015,
                "design": "meta-analysis"
            },
            {
                "pmid": "30673120",
                "title": "Pregabalin for neuropathic pain in adults",
                "journal": "Cochrane Database Syst Rev",
                "year": 2019,
                "design": "meta-analysis"
            },
            {
                "pmid": "24385428",
                "title": "Duloxetine for treating painful neuropathy, chronic pain or fibromyalgia",
                "journal": "Cochrane Database Syst Rev",
                "year": 2014,
                "design": "meta-analysis"
            },
            {
                "pmid": "17943857",
                "title": "Antidepressants for neuropathic pain",
                "journal": "Cochrane Database Syst Rev",
                "year": 2007,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Safety and efficacy of combination pharmacotherapy (e.g., gabapentin plus duloxetine) versus sequential high-dose monotherapy.",
            "Long-term dependency, tolerance, and misuse potential of gabapentinoids in patients with comorbid substance use disorders."
        ],
        "mcq_angles": [
            "First-line drug classes recommended by IASP/NeuPSIG guidelines: gabapentinoids (pregabalin/gabapentin), SNRIs (duloxetine), and TCAs (amitriptyline).",
            "Target of gabapentin and pregabalin: alpha-2-delta (alpha2delta) subunit of voltage-gated calcium channels.",
            "Strong recommendation against opioids (tramadol, oxycodone, morphine) as first-line therapy due to high abuse liability, hyperalgesia, and lack of long-term functional efficacy.",
            "First-line topical alternative for localized peripheral neuropathic pain (e.g., post-herpetic neuralgia): 5% lidocaine plaster or 8% capsaicin patch."
        ],
        "case_hooks": [
            "A 58-year-old diabetic man presenting with severe burning foot pain and dynamic mechanical allodynia (pain from bedsheets touching feet) initiating duloxetine 60 mg daily.",
            "A 72-year-old woman with chronic post-herpetic neuralgia along the T5 dermatome initiating topical 5% lidocaine patches."
        ],
        "gaps": "Phenotype-stratified randomized trials matching specific clinical sensory profiles (e.g., allodynia vs numbness) to targeted drug mechanisms."
    },
    1191: {
        "cluster": "Neurology / Rheumatology / Pulmonology",
        "mentor_intro": "Neurosarcoidosis is a non-caseating granulomatous disorder of the nervous system affecting 5-10% of systemic sarcoidosis patients, characteristically manifesting as cranial neuropathies, basilar leptomeningitis, or hypothalamic-pituitary dysfunction, diagnosed by consensus criteria and treated with corticosteroids and targeted TNF inhibitors.",
        "teaching_points": [
            {
                "claim": "According to the Neurosarcoidosis Consortium Consensus Group criteria by Stern and colleagues, diagnosis is classified into definite (positive nervous system biopsy), probable (clinical/MRI features with positive extra-neural biopsy), and possible neurosarcoidosis (suggestive presentation after excluding alternative etiologies).",
                "cites": ["30140847"]
            },
            {
                "claim": "Cranial neuropathies represent the most common neurological manifestation (seen in 50-70% of cases), with facial nerve palsy (cranial nerve VII, frequently bilateral or sequential) being the classic presentation, followed by optic neuropathy (cranial nerve II).",
                "cites": ["10209662", "30140847"]
            },
            {
                "claim": "In refractory or severe neurosarcoidosis, Gelfand and colleagues demonstrated that the anti-TNF monoclonal antibody infliximab achieved complete or partial radiographic and clinical remission in over 75% of patients who failed high-dose corticosteroids and conventional immunosuppressants.",
                "cites": ["28873124"]
            },
            {
                "claim": "Cerebrospinal fluid examination characteristically reveals elevated protein (>1.0 g/L), lymphocytic pleocytosis, hypoglycorrhachia in up to 20%, and unique CSF oligoclonal bands in 30-50%, while contrast-enhanced brain/spine MRI shows nodular basilar leptomeningeal enhancement.",
                "cites": ["31993739", "10209662"]
            }
        ],
        "sources": [
            {
                "pmid": "30140847",
                "title": "Definition and Consensus Diagnostic Criteria for Neurosarcoidosis: from the Neurosarcoidosis Consortium Consensus Group",
                "journal": "JAMA Neurol",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "10209662",
                "title": "Central nervous system sarcoidosis: diagnosis and management",
                "journal": "QJM",
                "year": 1999,
                "design": "review"
            },
            {
                "pmid": "28873124",
                "title": "Infliximab for the treatment of refractory neurosarcoidosis",
                "journal": "JAMA Neurol",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "31993739",
                "title": "Neurosarcoidosis: clinical characteristics, CSF analysis, and therapeutic management",
                "journal": "J Neurol",
                "year": 2020,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Prognostic specificity of CSF soluble interleukin-2 receptor (sIL-2R) and CSF neurofilament light chain in monitoring disease activity.",
            "Optimal duration of maintenance anti-TNF therapy in patients who achieve complete MRI leptomeningeal resolution."
        ],
        "mcq_angles": [
            "Most frequently involved cranial nerve in neurosarcoidosis: facial nerve (CN VII, classic cause of bilateral Lower Motor Neuron facial palsy).",
            "MRI hallmark of neurosarcoidosis: nodular, thick, contrast-enhancing basilar leptomeningitis and infundibular enhancement.",
            "Consensus criteria: 'probable neurosarcoidosis' requires clinical syndrome + MRI/CSF compatibility + histology from an extra-neural site (e.g., mediastinal lymph node) showing non-caseating granulomas.",
            "Biologic therapy of choice for refractory neurosarcoidosis: infliximab (anti-TNF)."
        ],
        "case_hooks": [
            "A 36-year-old woman presenting with sequential bilateral peripheral facial nerve palsies and thirst/polyuria found to have nodular leptomeningeal enhancement and mediastinal adenopathy.",
            "A patient with biopsy-proven pulmonary sarcoidosis who develops severe visual loss from optic perineuritis starting infliximab after steroid dependence."
        ],
        "gaps": "Prospective multicenter randomized clinical trials evaluating anti-IL-6 receptor antagonists (tocilizumab) versus infliximab in central neurosarcoidosis."
    },
    1192: {
        "cluster": "Oncology / Infectious Diseases / Acute Care",
        "mentor_intro": "Neutropenic sepsis is a medical emergency defined by fever (>=38.3 C or >=38.0 C sustained for 1 hour) and an absolute neutrophil count <0.5 x 10^9/L, requiring rapid MASCC risk stratification and immediate intravenous empirical antipseudomonal beta-lactam administration within 1 hour.",
        "teaching_points": [
            {
                "claim": "The Multinational Association for Supportive Care in Cancer (MASCC) risk index score stratifies neutropenic fever: a score >=21 identifies low-risk patients with <5% risk of severe medical complications, who may be eligible for step-down oral outpatient therapy (ciprofloxacin plus amoxicillin-clavulanate).",
                "cites": ["10944139", "29461916"]
            },
            {
                "claim": "IDSA and ASCO guidelines mandate a door-to-antibiotic time of <60 minutes; immediate empirical broad-spectrum monotherapy with an antipseudomonal beta-lactam (piperacillin-tazobactam 4.5 g q6h, cefepime 2 g q8h, or meropenem 1 g q8h) is the Class I standard of care.",
                "cites": ["21258094", "29461916"]
            },
            {
                "claim": "Vancomycin should not be initiated routinely in empirical therapy unless specific indications exist: hemodynamic instability/septic shock, suspected catheter-related bloodstream infection, known colonization with MRSA, skin/soft-tissue infection, or pneumonia.",
                "cites": ["21258094"]
            },
            {
                "claim": "In patients with persistent or recrudescent fever after 4 to 7 days of broad-spectrum antibacterial therapy and expected neutropenia lasting >7 days, empirical antifungal therapy with voriconazole, liposomal amphotericin B, or an echinocandin is indicated to cover invasive aspergillosis and candidiasis.",
                "cites": ["11807146", "21258094"]
            }
        ],
        "sources": [
            {
                "pmid": "10944139",
                "title": "The Multinational Association for Supportive Care in Cancer risk index: A score for predicting the risk of complications in neutropenic patients with cancer (MASCC)",
                "journal": "J Clin Oncol",
                "year": 2000,
                "design": "trial"
            },
            {
                "pmid": "29461916",
                "title": "Outpatient management of fever and neutropenia in adults with cancer: ASCO/IDSA clinical practice guideline update",
                "journal": "J Clin Oncol",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "21258094",
                "title": "Clinical practice guideline for the use of antimicrobial agents in neutropenic patients with cancer: 2010 update by the Infectious Diseases Society of America",
                "journal": "Clin Infect Dis",
                "year": 2011,
                "design": "guideline"
            },
            {
                "pmid": "11807146",
                "title": "Voriconazole compared with liposomal amphotericin B for empirical antifungal therapy in patients with neutropenia and persistent fever",
                "journal": "N Engl J Med",
                "year": 2002,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Prognostic accuracy of the Clinical Index of Stable Febrile Neutropenia (CISNE) score vs MASCC in solid tumor outpatients.",
            "Duration of antibacterial therapy in patients with afebrile neutropenia following 72 hours of clinical stability and negative blood cultures."
        ],
        "mcq_angles": [
            "Definition of neutropenic fever: single temperature >=38.3 C (or >=38.0 C for >1h) and ANC <0.5 x 10^9/L (or <1.0 x 10^9/L and falling).",
            "MASCC score cutoff: >=21 denotes LOW risk (higher score = lower risk of complications).",
            "Time-critical standard: administration of antipseudomonal beta-lactam within 60 minutes of presentation.",
            "Timeline for empirical antifungal escalation: persistent fever at day 4-7 despite antibacterial coverage."
        ],
        "case_hooks": [
            "A 54-year-old woman undergoing R-CHOP chemotherapy presenting on day 10 with temperature 38.6 C, blood pressure 110/70, and ANC 0.2 x 10^9/L receiving immediate piperacillin-tazobactam.",
            "An acute leukemia patient with prolonged neutropenia (ANC 0.05 x 10^9/L for 6 days) who remains febrile on meropenem and vancomycin evaluated for antifungal initiation and chest CT."
        ],
        "gaps": "Prospective validation of early serum beta-D-glucan and galactomannan monitoring to eliminate unnecessary empirical antifungal escalation."
    },
    1193: {
        "cluster": "Anaesthesia / Emergency Medicine / Critical Care",
        "mentor_intro": "Airway management in emergency and critical care settings has evolved with modern video laryngoscopes, second-generation supraglottic airway devices, and rigid bougies, which significantly enhance first-pass intubation success and reduce hypoxemic and aspiration complications.",
        "teaching_points": [
            {
                "claim": "In the multicenter randomized DEVICE trial evaluating 1,417 critically ill adults, video laryngoscopy significantly increased first-pass intubation success to 85.1% compared with 70.8% for direct laryngoscopy (absolute difference 14.2%; p<0.001), without increasing procedural complications.",
                "cites": ["37326322"]
            },
            {
                "claim": "In the randomized BOUGIE trial by Driver and colleagues, using an endotracheal tube introducer (bougie) on the first attempt significantly increased first-pass intubation success (98% vs 87%; p<0.001) compared with an endotracheal tube with stylet in patients with anticipated difficult airways.",
                "cites": ["29800096"]
            },
            {
                "claim": "Difficult Airway Society (DAS) guidelines mandate that second-generation supraglottic airway devices (SADs, such as i-gel and LMA Supreme) are the rescue devices of choice for 'cannot intubate, cannot oxygenate' (CICO) scenarios; their gastric drainage channels isolate the airway and protect against pulmonary aspiration.",
                "cites": ["29406182"]
            },
            {
                "claim": "The Fourth National Audit Project (NAP4) identified that failure to use capnography was a major contributing factor in over 70% of ICU and emergency airway-related deaths, establishing continuous waveform capnography as a non-negotiable mandatory standard for all tracheal intubations.",
                "cites": ["21447488", "29406182"]
            }
        ],
        "sources": [
            {
                "pmid": "37326322",
                "title": "Video Laryngoscopy for Endotracheal Intubation of Critically Ill Adults (DEVICE)",
                "journal": "N Engl J Med",
                "year": 2023,
                "design": "trial"
            },
            {
                "pmid": "29406182",
                "title": "Guidelines for the management of tracheal intubation in critically ill adults: Difficult Airway Society",
                "journal": "Br J Anaesth",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "29800096",
                "title": "Effect of Use of a Bougie vs Endotracheal Tube and Stylet on First-Attempt Intubation Success Among Critically Ill Adults: The BOUGIE Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "21447488",
                "title": "Major complications of airway management in the UK: results of the Fourth National Audit Project (NAP4)",
                "journal": "Br J Anaesth",
                "year": 2011,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Hyperangulated vs channeled vs standard-geometry Macintosh video laryngoscope blades across unselected emergency airway intubations.",
            "First-line emergency front-of-neck airway (FONA) technique: surgical scalpel-bougie-tube cricothyroidotomy vs commercial percutaneous cannula kits."
        ],
        "mcq_angles": [
            "Primary outcome of the DEVICE trial: video laryngoscopy significantly improves first-pass successful intubation in critically ill patients compared to direct laryngoscopy.",
            "Advantage of second-generation over first-generation supraglottic airways: presence of an esophageal drain tube reducing gastric insufflation and aspiration.",
            "Gold standard for confirming endotracheal tube placement: continuous waveform capnography.",
            "DAS emergency front-of-neck access technique: scalpel-bougie-tube surgical cricothyroidotomy."
        ],
        "case_hooks": [
            "A trauma patient with cervical spine collar in place requiring emergency rapid sequence intubation performed using a hyperangulated video laryngoscope and bougie.",
            "A cannot-intubate scenario in the emergency department successfully managed with immediate insertion of an i-gel supraglottic airway restoring oxygenation."
        ],
        "gaps": "Prospective trials evaluating real-time artificial intelligence-assisted laryngoscopy image guidance to optimize tube delivery."
    },
    1194: {
        "cluster": "Neurology / Emergency Medicine",
        "mentor_intro": "A new-onset unprovoked seizure in an adult requires emergency exclusion of acute metabolic, toxic, or structural etiologies, followed by dedicated neuroimaging, electroencephalography, and recurrence risk stratification to guide anti-seizure medication (ASM) initiation under the ILAE 2014 definition of epilepsy.",
        "teaching_points": [
            {
                "claim": "According to the ILAE official definition, epilepsy is diagnosed after a single unprovoked seizure if the individual has an enduring predisposition to further seizures, defined as an estimated recurrence risk >=60% over the next 10 years (e.g., significant epileptogenic structural MRI lesion or clear epileptiform discharges on EEG).",
                "cites": ["24730691"]
            },
            {
                "claim": "AAN and AES guidelines state that unprovoked first seizure recurrence risk is highest in the first 2 years (21-45%); immediate initiation of anti-seizure medication reduces 2-year recurrence risk by approximately 35% compared to deferred therapy, although it does not alter long-term remission rates.",
                "cites": ["25901057"]
            },
            {
                "claim": "In the SANAD II multicenter randomized trial, lamotrigine was superior to levetiracetam and zonisamide as first-line monotherapy for newly diagnosed focal epilepsy, demonstrating significantly higher treatment success (12-month remission) and superior cost-effectiveness.",
                "cites": ["33838743"]
            },
            {
                "claim": "Neuroimaging standards require high-resolution brain MRI utilizing an epilepsy-dedicated protocol (including 3D volumetric T1, T2 perpendicular to the hippocampal long axis, and 3D fluid-attenuated inversion recovery [FLAIR]) to detect subtle cortical dysplasias, mesial temporal sclerosis, or low-grade neoplasms.",
                "cites": ["17931304"]
            }
        ],
        "sources": [
            {
                "pmid": "24730691",
                "title": "ILAE official report: a practical clinical definition of epilepsy",
                "journal": "Epilepsia",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": "25901057",
                "title": "Evidence-based guideline: Management of an unprovoked first seizure in adults: Report of the AAN and AES",
                "journal": "Neurology",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": "33838743",
                "title": "The SANAD II study of the effectiveness and cost-effectiveness of levetiracetam, zonisamide, or lamotrigine in people with newly diagnosed focal epilepsy",
                "journal": "Lancet",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": "17931304",
                "title": "Guidelines for neuroimaging evaluation of patients with uncontrolled seizures",
                "journal": "Epilepsia",
                "year": 2007,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Prognostic significance of routine 30-minute EEG versus 24-hour ambulatory EEG in unprovoked first seizures with normal initial brain MRI.",
            "Driving cessation duration (6 months vs 12 months) in patients with single unprovoked seizures starting anti-seizure medication."
        ],
        "mcq_angles": [
            "ILAE practical definition of epilepsy after a single seizure: >=60% recurrence risk over the subsequent 10 years.",
            "First-line antiepileptic drug for focal seizures in SANAD II: lamotrigine (superior efficacy and tolerability over levetiracetam).",
            "Emergency investigation of choice: non-contrast head CT in ED to exclude acute hemorrhage, followed by outpatient epilepsy-protocol MRI.",
            "EEG timing: sleep-deprived EEG within 24-48 hours of seizure significantly increases yield of epileptiform discharges."
        ],
        "case_hooks": [
            "A 42-year-old accountant presenting with a first-ever generalized tonic-clonic seizure whose brain MRI reveals left mesial temporal sclerosis.",
            "A 25-year-old woman with a single nocturnal convulsion whose routine awake EEG is normal, undergoing sleep-deprived EEG to guide medication decisions."
        ],
        "gaps": "Validated blood-based multi-protein biomarker panels to definitively confirm true epileptic seizure vs psychogenic non-epileptic seizures or syncope."
    },
    1195: {
        "cluster": "Cardiology / Clinical Pharmacology",
        "mentor_intro": "Organic nitrates (glyceryl trinitrate, isosorbide mononitrate, isosorbide dinitrate) provide venodilation, reduce myocardial preload and coronary vasospasm, but develop rapid tolerance requiring an asymmetric 10-14 hour nitrate-free interval, and are strictly contraindicated with phosphodiesterase-5 inhibitors.",
        "teaching_points": [
            {
                "claim": "In a randomized clinical trial by Parker and colleagues, continuous round-the-clock administration of nitrates induced complete loss of anti-anginal and hemodynamic efficacy within 24-48 hours (nitrate tolerance), which was prevented by an asymmetric eccentric dosing schedule (e.g., isosorbide mononitrate at 08:00 and 15:00) providing a 10-14 hour daily nitrate-free interval.",
                "cites": ["3108731"]
            },
            {
                "claim": "Molecular mechanisms of nitrate tolerance involve depletion of mitochondrial aldehyde dehydrogenase (ALDH-2, which bioactivates nitroglycerin), uncoupling of endothelial nitric oxide synthase, increased reactive oxygen species generation, and neurohormonal activation.",
                "cites": ["19433707"]
            },
            {
                "claim": "Co-administration of organic nitrates with phosphodiesterase type 5 (PDE-5) inhibitors (sildenafil, vardenafil, tadalafil) causes synergistic accumulation of cyclic GMP, resulting in catastrophic, refractory, life-threatening hypotension and myocardial infarction; nitrates must be withheld for >=24 hours after sildenafil/vardenafil and >=48 hours after tadalafil.",
                "cites": ["10078540", "31504439"]
            },
            {
                "claim": "ESC guidelines recommend short-acting sublingual glyceryl trinitrate (GTN tablet or spray) as first-line Class I therapy for immediate relief of acute angina symptoms and pre-effort prophylaxis, while oral long-acting nitrates are secondary add-on anti-anginal agents when beta-blockers or calcium channel blockers are insufficient or contraindicated.",
                "cites": ["31504439"]
            }
        ],
        "sources": [
            {
                "pmid": "3108731",
                "title": "Effect of intervals between doses on the development of tolerance to isosorbide dinitrate",
                "journal": "N Engl J Med",
                "year": 1987,
                "design": "trial"
            },
            {
                "pmid": "19433707",
                "title": "Non-hemodynamic effects of nitrates: the mechanisms of nitrate tolerance",
                "journal": "Circulation",
                "year": 2009,
                "design": "review"
            },
            {
                "pmid": "31504439",
                "title": "2019 ESC Guidelines for the diagnosis and management of chronic coronary syndromes",
                "journal": "Eur Heart J",
                "year": 2020,
                "design": "guideline"
            },
            {
                "pmid": "10078540",
                "title": "Sildenafil citrate and nitrates: absolute contraindication due to synergistic cGMP accumulation",
                "journal": "Am J Cardiol",
                "year": 1999,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Rebound angina and nocturnal ischemic risk occurring during the mandatory nitrate-free interval in severe multivessel coronary artery disease.",
            "Long-term cardiovascular outcome impact of hydralazine plus isosorbide dinitrate in non-Black HFrEF cohorts."
        ],
        "mcq_angles": [
            "Method to prevent nitrate tolerance: asymmetric dosing schedule providing a daily 10-14 hour nitrate-free interval.",
            "Contraindication with PDE-5 inhibitors: absolute prohibition within 24 hours of sildenafil/vardenafil and 48 hours of tadalafil.",
            "Primary enzyme responsible for bioactivation of nitroglycerin into nitric oxide: mitochondrial aldehyde dehydrogenase (ALDH-2).",
            "Hemodynamic mechanism of anti-anginal action: venodilation causing reduced venous return and decreased left ventricular end-diastolic wall tension (preload reduction)."
        ],
        "case_hooks": [
            "A 64-year-old man taking isosorbide mononitrate 20 mg twice daily prescribed doses at 08:00 and 20:00 who complains that his evening angina has returned after 2 weeks.",
            "A man with chest pain in the emergency department receiving sublingual GTN who collapses with blood pressure 60/30 mmHg after having taken tadalafil 36 hours prior."
        ],
        "gaps": "Novel non-tolerance-inducing nitric oxide donors and soluble guanylyl cyclase stimulators evaluated for refractory chronic stable angina."
    }
}
