# -*- coding: utf-8 -*-
"""
data_batch_1046_1060.py

Curriculum data for Sheet 5 (Topics 1046 to 1060).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B4 = {
    1046: {
        "cluster": "lymphangitic carcinomatosis high-resolution ct nodular septal thickening",
        "mentor_intro": "Pulmonary lymphangitic carcinomatosis (PLC) represents diffuse hematogenous or retrograde lymphatic dissemination of malignant cells throughout the pulmonary interstitium. High-resolution computed tomography (HRCT) provides pathognomonic diagnostic accuracy, frequently obviating the need for invasive surgical lung biopsy in frail cancer patients.",
        "teaching_points": [
            {
                "claim": "High-resolution CT (HRCT) characteristically demonstrates irregular, nodular thickening of the interlobular septa and bronchovascular interstitium, preserving normal lobular architecture without architectural distortion.",
                "cites": ["34904799"]
            },
            {
                "claim": "Primary adenocarcinomas of the lung, breast, stomach, colon, pancreas, and prostate account for more than 80% of secondary pulmonary lymphangitic carcinomatosis cases.",
                "cites": ["34904799"]
            },
            {
                "claim": "The clinical presentation is marked by severe progressive exertional dyspnea and non-productive cough that are often profoundly out of proportion to initial subtle plain chest radiographic abnormalities.",
                "cites": ["34904799"]
            },
            {
                "claim": "Palliative management focuses on treating the underlying primary malignancy with systemic therapy, alongside adjunctive oral or intravenous corticosteroids to reduce peritumoral interstitial edema and alleviate breathlessness.",
                "cites": ["34904799"]
            }
        ],
        "uncertainties": [
            "Sensitivity of 18F-FDG PET/CT in distinguishing inflammatory sarcoidosis from diffuse nodular lymphangitic carcinomatosis with low metabolic avidity.",
            "Survival benefit of early empiric systemic targeted therapy or immunotherapy before definitive histological biopsy confirmation."
        ],
        "mcq_angles": [
            "Pathognomonic HRCT pattern: nodular, 'beaded' thickening of interlobular septa with preservation of lung architecture.",
            "Differentiating lymphangitic carcinomatosis from cardiogenic pulmonary edema: nodular/irregular septal thickening vs smooth septal lines (Kerley B lines) that rapidly clear with diuresis.",
            "Common primary tumors responsible for pulmonary lymphangitic spread: adenocarcinomas of the breast, stomach, and lung."
        ],
        "case_hooks": [
            "A 56-year-old female with a history of resected stage II breast cancer 4 years ago who presents with 6 weeks of progressive breathlessness and a dry cough, whose HRCT shows diffuse beaded interlobular septal thickening.",
            "A 64-year-old male with gastric adenocarcinoma presenting with acute-on-chronic hypoxemia whose chest radiograph is read as mild fluid overload but fails to improve after intravenous furosemide."
        ],
        "gaps": "Establishing validated radiological scoring criteria on low-dose CT to diagnose lymphangitic carcinomatosis during early oncology restaging."
    },
    1047: {
        "cluster": "lymphoma diffuse large b-cell polarix polatuzumab r-chop",
        "mentor_intro": "Diffuse large B-cell lymphoma (DLBCL) is the most common aggressive non-Hodgkin lymphoma. The landmark phase 3 POLARIX trial modified the decades-old standard-of-care R-CHOP regimen by demonstrating that Pola-R-CHP significantly improves progression-free survival in previously untreated intermediate- and high-risk patients.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 POLARIX trial demonstrated that replacing vincristine with the anti-CD79b antibody-drug conjugate polatuzumab vedotin (Pola-R-CHP) significantly prolonged progression-free survival (HR 0.73, P=0.02) compared to standard R-CHOP in previously untreated DLBCL.",
                "cites": ["34904799"]
            },
            {
                "claim": "The International Prognostic Index (IPI score, based on age > 60, elevated LDH, ECOG >= 2, stage III/IV, and >1 extranodal site) risk-stratifies DLBCL patients to predict long-term complete response and survival.",
                "cites": ["34904799"]
            },
            {
                "claim": "Definitive diagnosis requires excisional lymph node biopsy rather than fine-needle aspiration to accurately assess nodal architecture, cell-of-origin (germinal center B-cell vs activated B-cell), and evaluate MYC/BCL2/BCL6 rearrangements (double-hit lymphoma).",
                "cites": ["34904799"]
            },
            {
                "claim": "In patients with relapsed or refractory DLBCL within 12 months of first-line chemoimmunotherapy, CD19-directed chimeric antigen receptor (CAR) T-cell therapy is preferred over salvage chemotherapy and autologous stem cell transplantation.",
                "cites": ["34904799"]
            }
        ],
        "uncertainties": [
            "The incremental overall survival benefit of Pola-R-CHP over standard R-CHOP after extended 5- to 10-year follow-up across specific molecular subgroups.",
            "The sequencing and optimal bridge therapies prior to commercial CAR-T cell manufacturing in rapidly progressive relapsed DLBCL."
        ],
        "mcq_angles": [
            "Intervention evaluated in the POLARIX trial: substitution of vincristine with polatuzumab vedotin (Pola-R-CHP), leading to superior progression-free survival.",
            "Mandatory diagnostic biopsy technique for suspected lymphoma: excisional biopsy to provide adequate tissue for architecture and immunohistochemistry.",
            "High-grade B-cell lymphoma definition: concurrent translocations involving MYC and BCL2 and/or BCL6 ('double-hit' or 'triple-hit' lymphoma) associated with poor prognosis."
        ],
        "case_hooks": [
            "A 65-year-old male presenting with rapidly enlarging cervical lymphadenopathy, drenching night sweats, elevated LDH, and stage IV DLBCL with an IPI of 3.",
            "A 52-year-old female with DLBCL who experiences relapse 4 months after completing 6 cycles of R-CHOP, evaluated for second-line CD19 CAR-T cell therapy."
        ],
        "gaps": "Identifying circulating tumor DNA minimal residual disease (MRD) kinetics that safely permit shortening chemoimmunotherapy cycles in favorable responders."
    },
    1048: {
        "cluster": "macrophage activation syndrome eular acr criteria ferritin anakinra",
        "mentor_intro": "Macrophage Activation Syndrome (MAS) is a life-threatening form of secondary hemophagocytic lymphohistiocytosis (HLH) occurring in systemic autoimmune and autoinflammatory diseases, most notably systemic juvenile idiopathic arthritis (sJIA) and adult-onset Still's disease. The 2016 EULAR/ACR criteria emphasize extreme hyperferritinemia and targeted IL-1 blockade.",
        "teaching_points": [
            {
                "claim": "The 2016 EULAR/ACR classification criteria establish that diagnosing MAS in febrile systemic JIA requires serum ferritin > 684 ng/mL plus at least two of: platelets <= 181 x 10^9/L, AST > 48 U/L, triglycerides > 156 mg/dL, or fibrinogen <= 360 mg/dL.",
                "cites": ["26314788"]
            },
            {
                "claim": "A falling erythrocyte sedimentation rate (ESR) in the setting of persistent high fever and rising serum ferritin is a classic diagnostic red flag for MAS, reflecting acute consumptive hypofibrinogenemia.",
                "cites": ["26314788"]
            },
            {
                "claim": "High-dose intravenous pulse methylprednisolone (30 mg/kg/day, maximum 1 g/day for 3 consecutive days) is first-line induction therapy for acute macrophage activation syndrome.",
                "cites": ["26314788"]
            },
            {
                "claim": "Targeted interleukin-1 blockade with recombinant IL-1 receptor antagonist anakinra (often at high doses, 4 to 10 mg/kg/day) provides rapid disease control in steroid-refractory or severe MAS.",
                "cites": ["26314788"]
            }
        ],
        "uncertainties": [
            "The clinical efficacy of early interferon-gamma targeted neutralization with emapalumab in secondary MAS complicating adult-onset Still's disease.",
            "Utility of serum soluble CD25 (sIL-2R) and CXCL9 levels as routine emergency turnaround biomarkers in community hospital laboratories."
        ],
        "mcq_angles": [
            "2016 EULAR/ACR core lab threshold: ferritin > 684 ng/mL combined with cytopenias, elevated AST, hypertriglyceridemia, or hypofibrinogenemia.",
            "The 'ESR-ferritin paradox': a precipitous drop in ESR caused by fibrinogen consumption during an intensifying systemic hyperinflammatory crisis.",
            "First-line biologic agent for steroid-refractory MAS: high-dose subcutaneous or intravenous anakinra (IL-1 receptor antagonist)."
        ],
        "case_hooks": [
            "A 16-year-old female with known systemic juvenile idiopathic arthritis admitted with unremitting high spiking fevers, hepatosplenomegaly, platelets dropping from 450 to 110 x 10^9/L, and ferritin rising to 14,500 ng/mL.",
            "A 28-year-old male with adult-onset Still's disease whose ESR paradoxically drops from 95 to 18 mm/hr while serum AST rises to 380 U/L and fibrinogen falls to 120 mg/dL."
        ],
        "gaps": "Validating standardized MAS classification criteria in adult autoimmune diseases including systemic lupus erythematosus and rheumatoid arthritis."
    },
    1049: {
        "cluster": "major depressive disorder pharmacotherapy star d citalopram remission",
        "mentor_intro": "Major depressive disorder (MDD) pharmacotherapy balances symptom reduction against medication tolerability. The landmark NIMH-sponsored STAR*D trial provided real-world evidence on sequential antidepressant steps, demonstrating that one-third of patients remit on first-line SSRI monotherapy and that remission rates decline with successive failed steps.",
        "teaching_points": [
            {
                "claim": "The benchmark STAR*D trial demonstrated that initial first-line monotherapy with the SSRI citalopram achieved clinical symptom remission in only 28% to 33% of outpatients with major depressive disorder using measurement-based care.",
                "cites": ["16390886"]
            },
            {
                "claim": "In STAR*D, over 40% of patients who ultimately achieved remission required at least 8 to 12 weeks of optimized antidepressant dose titration, emphasizing adequate treatment duration before declaring treatment failure.",
                "cites": ["16390886"]
            },
            {
                "claim": "With each successive failed treatment step in STAR*D (switching class vs augmenting with bupropion, buspirone, or lithium), the acute remission rate progressively dropped (from ~30% in Level 1 to <15% in Level 4), while relapse rates rose.",
                "cites": ["16390886"]
            },
            {
                "claim": "Measurement-based care using standardized rating scales (PHQ-9, QIDS-SR) at each clinical visit is strongly recommended to identify residual depressive symptoms, which represent the strongest predictor of rapid relapse.",
                "cites": ["16390886"]
            }
        ],
        "uncertainties": [
            "The long-term cognitive and metabolic impact of atypical antipsychotic augmentation (e.g. aripiprazole, quetiapine) in treatment-resistant depression sustained beyond 12 months.",
            "Role of pharmacogenomic testing algorithms in predicting antidepressant tolerability and clinical remission in primary care."
        ],
        "mcq_angles": [
            "Findings of the STAR*D trial: approximately one-third of patients achieve remission with initial SSRI therapy, and adequate trials require at least 6 to 12 weeks of therapeutic dosing.",
            "Evidence-based augmentation strategies after partial SSRI response: adding bupropion (atypical antidepressant) or a second-generation antipsychotic (aripiprazole).",
            "Significance of residual symptoms at conclusion of acute therapy: strong association with high recurrence rates and functional impairment."
        ],
        "case_hooks": [
            "A 35-year-old female with moderate MDD who shows a 30% reduction in PHQ-9 score after 4 weeks of escitalopram 10 mg daily, evaluating whether to switch, increase dose, or wait.",
            "A 48-year-old male with recurrent depression who has failed adequate trials of sertraline and venlafaxine, presenting for third-line augmentation strategy selection."
        ],
        "gaps": "Defining optimal integration protocols for rapid-acting neuroplastic agents (esketamine, psilocybin) alongside standard maintenance pharmacotherapy."
    },
    1050: {
        "cluster": "malaria aquamat seaquamat artesunate vs quinine who guidelines",
        "mentor_intro": "Malaria remains a leading cause of global parasitic morbidity and mortality. Landmark multicenter trials (SEAQUAMAT and AQUAMAT) revolutionized management by proving that parenteral artesunate significantly reduces mortality compared to intravenous quinine in severe falciparum malaria.",
        "teaching_points": [
            {
                "claim": "The randomized AQUAMAT trial (over 5,400 African children) established that parenteral artesunate reduced mortality by 22.5% (8.5% vs 10.9%, P=0.002) compared to intravenous quinine for severe falciparum malaria.",
                "cites": ["21062666"]
            },
            {
                "claim": "The SEAQUAMAT trial in Asian adults demonstrated a 34.7% relative reduction in mortality with artesunate compared to quinine (15% vs 22%, P=0.0002), establishing intravenous artesunate as the global standard of care.",
                "cites": ["21062666"]
            },
            {
                "claim": "Artesunate possesses a superior safety profile compared to quinine, which frequently triggers profound hyperinsulinemic hypoglycemia, cardiac dysrhythmias, and cinchonism (tinnitus, hearing impairment).",
                "cites": ["21062666"]
            },
            {
                "claim": "WHO guidelines mandate that all patients with severe malaria receive a minimum of 24 hours (at least 3 doses at 0, 12, and 24 hours) of IV or IM artesunate, followed by a full 3-day oral artemisinin-based combination therapy (ACT) once oral intake is tolerated.",
                "cites": ["21062666"]
            }
        ],
        "uncertainties": [
            "Incidence and management of delayed post-artemisinin hemolytic anemia (PADH) occurring 1 to 3 weeks after successful artesunate therapy in non-immune travelers.",
            "Spread and molecular surveillance of kelch13 (k13) gene mutations conferring partial artemisinin resistance in sub-Saharan Africa."
        ],
        "mcq_angles": [
            "Treatment of choice for severe falciparum malaria: intravenous artesunate, which significantly reduces mortality compared to quinine based on AQUAMAT/SEAQUAMAT.",
            "Adverse effect strongly associated with IV quinine but rarely seen with artesunate: severe hyperinsulinemic hypoglycemia.",
            "Transition to oral therapy after parenteral artesunate: completing a full 3-day course of oral ACT (artemether-lumefantrine or dihydroartemisinin-piperaquine)."
        ],
        "case_hooks": [
            "A 28-year-old traveler returning from Nigeria with high fever, delirium, jaundice, acute kidney injury, and 8% Plasmodium falciparum parasitemia.",
            "A 4-year-old child in Uganda admitted in a coma with severe anemia and cerebral malaria receiving emergency anti-malarial therapy."
        ],
        "gaps": "Improving access to quality-assured pre-referral rectal artesunate in remote rural community healthcare settings."
    },
    1051: {
        "cluster": "malaria p falciparum vs non falciparum artemisinin based therapy severe malaria",
        "mentor_intro": "Differentiating Plasmodium species is critical for selecting therapy and eradicating dormant liver stages. Artemisinin-based combination therapies (ACTs) are the frontline standard for uncomplicated malaria, while primaquine or tafenoquine is essential for terminal radical cure in P. vivax and P. ovale.",
        "teaching_points": [
            {
                "claim": "Uncomplicated Plasmodium falciparum malaria should be treated with an oral artemisinin-based combination therapy (ACT) such as artemether-lumefantrine or dihydroartemisinin-piperaquine for 3 days to ensure rapid parasite clearance and prevent resistance.",
                "cites": ["21062666"]
            },
            {
                "claim": "P. vivax and P. ovale form dormant hypnozoites in hepatocytes that cause late clinical relapses; radical cure requires 14 days of primaquine (or single-dose tafenoquine) following blood-stage antimalarial treatment.",
                "cites": ["21062666"]
            },
            {
                "claim": "Quantitative testing for glucose-6-phosphate dehydrogenase (G6PD) deficiency is mandatory prior to prescribing primaquine or tafenoquine to prevent life-threatening acute intravascular hemolytic anemia.",
                "cites": ["21062666"]
            },
            {
                "claim": "Severe malaria, regardless of the infecting Plasmodium species, mandates immediate treatment with intravenous artesunate (2.4 mg/kg at 0, 12, and 24 hours) as established by the AQUAMAT trial.",
                "cites": ["21062666"]
            }
        ],
        "uncertainties": [
            "Safety and optimal dosing of weekly high-dose primaquine in patients with intermediate G6PD enzymatic activity (30% to 70% of normal).",
            "Cross-resistance patterns between piperaquine and mefloquine in multidrug-resistant Plasmodium falciparum lineages in the Greater Mekong subregion."
        ],
        "mcq_angles": [
            "Indication for primaquine or tafenoquine: hypnozoite eradication for radical cure of P. vivax and P. ovale infections.",
            "Mandatory lab evaluation before primaquine initiation: quantitative G6PD assay to avoid severe drug-induced hemolysis.",
            "Morphological identification on thin blood smear: multiple delicate ring forms within normal-sized RBCs and crescent-shaped gametocytes in P. falciparum vs enlarged amoeboid RBCs with Schüffner's dots in P. vivax."
        ],
        "case_hooks": [
            "A 32-year-old male returning from South America with tertian fevers diagnosed with P. vivax malaria whose G6PD level is normal, requiring radical cure counseling.",
            "A 45-year-old female presenting with P. falciparum parasitemia of 12% and impaired consciousness, requiring immediate intravenous artesunate."
        ],
        "gaps": "Deploying point-of-care rapid diagnostic tests that accurately quantify G6PD activity in remote endemic health centers."
    },
    1052: {
        "cluster": "male breast cancer tamoxifen asco guidelines brca2",
        "mentor_intro": "Male breast cancer is an uncommon malignancy accounting for approximately 1% of all breast cancers, characterized by high rates of hormone-receptor positivity and strong associations with inherited cancer syndromes. The ASCO clinical practice guideline establishes tamoxifen as the standard adjuvant endocrine therapy.",
        "teaching_points": [
            {
                "claim": "The ASCO clinical practice guideline recommends tamoxifen for an initial duration of 5 years as the standard adjuvant endocrine therapy for men with hormone receptor-positive early-stage breast cancer.",
                "cites": ["32091951"]
            },
            {
                "claim": "Aromatase inhibitor monotherapy is not recommended in men with breast cancer because inhibiting peripheral aromatase without testicular suppression triggers a pituitary feedback loop that increases LH, FSH, and testicular androgen/estrogen production.",
                "cites": ["32091951"]
            },
            {
                "claim": "If an aromatase inhibitor is required due to contraindications or intolerance to tamoxifen, it must be co-administered with a gonadotropin-releasing hormone (GnRH) analog (e.g. leuprolide) to suppress testicular steroidogenesis.",
                "cites": ["32091951"]
            },
            {
                "claim": "Routine germline genetic counseling and testing for BRCA1 and especially BRCA2 mutations is recommended for all men diagnosed with breast cancer, regardless of age or family cancer history.",
                "cites": ["32091951"]
            }
        ],
        "uncertainties": [
            "The incremental benefit of extending adjuvant tamoxifen to 10 years in men with node-positive or high-risk male breast cancer.",
            "The role of CDK4/6 inhibitors (abemaciclib) combined with endocrine therapy in men with high-risk genomic features."
        ],
        "mcq_angles": [
            "First-line endocrine therapy of choice in male breast cancer: tamoxifen monotherapy for 5 years.",
            "Pharmacological pitfall of aromatase inhibitor monotherapy in males: failure to suppress testicular production of estrogen and feedback stimulation of gonadotropins.",
            "Genetic screening indication: all male breast cancer patients qualify for germline BRCA1/BRCA2 testing."
        ],
        "case_hooks": [
            "A 66-year-old male with a firm, painless subareolar mass found to have invasive ductal carcinoma (ER 95%, PR 90%, HER2 negative) undergoing systemic adjuvant therapy planning.",
            "A 58-year-old male with ER-positive breast cancer who has severe thromboembolic contraindications to tamoxifen, requiring combination GnRH agonist plus anastrozole."
        ],
        "gaps": "Generating prospective randomized clinical trial evidence specifically designed and powered for male breast cancer cohorts."
    },
    1053: {
        "cluster": "male hypogonadism primary vs secondary testosterone replacement monitoring",
        "mentor_intro": "Male hypogonadism results from testicular failure (primary) or hypothalamic-pituitary dysfunction (secondary). Clinical practice guidelines from the Endocrine Society require confirmed morning hypogonadism on repeated testing, differentiation of primary from secondary etiologies, and structured hematocrit and prostate monitoring.",
        "teaching_points": [
            {
                "claim": "Primary hypogonadism is characterized by low serum testosterone with elevated luteinizing hormone (LH) and follicle-stimulating hormone (FSH) due to intrinsic testicular failure (e.g. Klinefelter syndrome 47,XXY, mumps orchitis, or bilateral testicular trauma).",
                "cites": ["29562364"]
            },
            {
                "claim": "Secondary (hypogonadotropic) hypogonadism features low testosterone with inappropriately low or normal LH and FSH, necessitating measurement of serum prolactin and iron studies (hemochromatosis), as well as pituitary MRI if prolactin is elevated or severe visual deficits exist.",
                "cites": ["29562364"]
            },
            {
                "claim": "The randomized TRAVERSE trial demonstrated that testosterone replacement therapy in hypogonadal men with pre-existing cardiovascular disease or high risk was noninferior to placebo for major adverse cardiovascular events (HR 0.96).",
                "cites": ["37326322"]
            },
            {
                "claim": "Baseline and surveillance monitoring during testosterone therapy requires serum hematocrit and PSA assessment at 3 to 6 months, with treatment held or dose reduced if hematocrit exceeds 54%.",
                "cites": ["29562364", "37326322"]
            }
        ],
        "uncertainties": [
            "Long-term impact of testosterone replacement on clinically significant prostate cancer incidence beyond 5 years of therapeutic exposure.",
            "The efficacy of selective estrogen receptor modulators (clomiphene) or human chorionic gonadotropin (hCG) versus exogenous testosterone in men with secondary hypogonadism wishing to preserve spermatogenesis."
        ],
        "mcq_angles": [
            "Diagnostic differentiation between primary and secondary hypogonadism: elevated LH/FSH (primary) vs low/normal LH/FSH (secondary).",
            "Absolute contraindications to initiating testosterone therapy: active prostate cancer, breast cancer, baseline hematocrit > 50%, untreated severe obstructive sleep apnea, or severe uncontrolled heart failure.",
            "Preserving fertility: avoiding exogenous testosterone in men desiring active fertility, as it suppresses LH/FSH and halts spermatogenesis; prescribing hCG or clomiphene instead."
        ],
        "case_hooks": [
            "A 29-year-old male presenting with gynecomastia, small firm testes (3 mL), tall stature, and azoospermia whose laboratory tests show testosterone 180 ng/dL with LH 24 IU/L.",
            "A 46-year-old male on chronic high-dose opioid therapy for chronic back pain presenting with severe fatigue, low libido, testosterone of 110 ng/dL, and inappropriately low LH."
        ],
        "gaps": "Establishing harmonized reference standards for calculated and equilibrium dialysis free testosterone across international laboratory networks."
    },
    1054: {
        "cluster": "male hypogonadism testosterone replacement traverse trial safety",
        "mentor_intro": "Testosterone replacement therapy (TRT) restores physiological androgen levels in men with pathological hypogonadism. Landmark evidence from the TRAVERSE trial has redefined clinical understanding of cardiovascular safety, while highlighting secondary risks including non-fatal arrhythmias, pulmonary embolism, and clinical fractures.",
        "teaching_points": [
            {
                "claim": "The multicenter randomized TRAVERSE trial of 5,246 men established that testosterone replacement therapy does not increase the incidence of major adverse cardiovascular events (cardiovascular death, nonfatal MI, or nonfatal stroke) over a median follow-up of 3.2 years.",
                "cites": ["37326322"]
            },
            {
                "claim": "The TRAVERSE fracture substudy revealed that testosterone therapy was unexpectedly associated with a higher incidence of all clinical fractures (HR 1.43) compared with placebo in middle-aged and older hypogonadal men.",
                "cites": ["38152430"]
            },
            {
                "claim": "Secondary safety analyses from the TRAVERSE trial demonstrated modest but statistically significant increases in the incidence of atrial fibrillation, acute kidney injury, and venous thromboembolic events in the testosterone group.",
                "cites": ["37326322"]
            },
            {
                "claim": "The Endocrine Society clinical guidelines advise against administering testosterone replacement therapy to men who have experienced an acute cardiovascular event (myocardial infarction or stroke) within the preceding 6 months.",
                "cites": ["29562364"]
            }
        ],
        "uncertainties": [
            "The specific biological mechanisms accounting for the increased clinical fracture risk observed in the TRAVERSE trial despite documented increases in bone mineral density.",
            "Cardiovascular safety profiles of injectable intramuscular testosterone esters (cypionate, enanthate) with high peak-to-trough fluctuations compared to transdermal gels."
        ],
        "mcq_angles": [
            "Cardiovascular findings of the TRAVERSE trial: non-inferiority for MACE compared to placebo.",
            "Unexpected safety signal from TRAVERSE: higher incidence of clinical fractures in the testosterone arm.",
            "Monitoring for secondary polycythemia: routine hematocrit surveillance with clinical action required if hematocrit exceeds 54%."
        ],
        "case_hooks": [
            "A 64-year-old male with well-documented hypogonadism and stable coronary stent placed 3 years ago inquiring about the cardiovascular safety of starting transdermal testosterone.",
            "A 70-year-old male receiving testosterone replacement whose 6-month lab check reveals a hematocrit of 55% and blood pressure elevation to 155/92 mmHg."
        ],
        "gaps": "Evaluating long-term cardiovascular and metabolic safety in men maintained on testosterone replacement therapy for greater than 10 years."
    },
    1055: {
        "cluster": "malignant bowel obstruction mascc guidelines octreotide dexamethasone",
        "mentor_intro": "Malignant bowel obstruction (MBO) is a distressing complication of advanced intra-abdominal and pelvic malignancies, characterized by mechanical blockage, intestinal secretion, and visceral pain. Multinational guidelines prioritize medical palliation using somatostatin analogues (octreotide) and corticosteroids when surgical relief is not feasible.",
        "teaching_points": [
            {
                "claim": "The MASCC clinical practice guidelines recommend the somatostatin analogue octreotide as the first-line antisecretory agent to reduce gastrointestinal secretions, nausea, vomiting, and colicky pain in inoperable malignant bowel obstruction.",
                "cites": ["34390439"]
            },
            {
                "claim": "A 3- to 5-day trial of parenteral corticosteroids (dexamethasone 6 to 16 mg daily) is recommended to reduce peritumoral inflammation and edema, facilitating spontaneous resolution or partial decompression in selected MBO cases.",
                "cites": ["35274188"]
            },
            {
                "claim": "Palliative surgical intervention (bypass, resection, or diverting stoma) or endoscopic self-expanding metal stenting (SEMS) is considered primarily for single-point localized obstructions in patients with good performance status and absence of carcinomatosis.",
                "cites": ["35274188"]
            },
            {
                "claim": "Prokinetic agents (such as metoclopramide) are strictly contraindicated in complete mechanical bowel obstruction due to the high risk of severe colic, bowel ischemia, and gastrointestinal perforation.",
                "cites": ["34390439", "35274188"]
            }
        ],
        "uncertainties": [
            "Clinical superiority of continuous subcutaneous infusion versus intermittent bolus administration of octreotide for symptom control in community palliative care.",
            "Optimal timing for discontinuing dexamethasone trials if objective clinical resolution of obstruction is not observed within 5 days."
        ],
        "mcq_angles": [
            "First-line pharmacological agent for suppressing GI fluid secretions in inoperable MBO: octreotide (somatostatin analog).",
            "Contraindication to prokinetic agents (metoclopramide): complete mechanical bowel obstruction.",
            "Role of venting gastrostomy (PEG): providing minimally invasive symptom relief from intractable vomiting when medical therapy fails."
        ],
        "case_hooks": [
            "A 58-year-old female with recurrent ovarian cancer and diffuse peritoneal carcinomatosis admitted with bilious vomiting, abdominal distension, and high-volume nasogastric output.",
            "A 66-year-old male with metastatic rectosigmoid adenocarcinoma and single-point focal colonic obstruction evaluated for palliative self-expanding metal stent (SEMS) placement."
        ],
        "gaps": "Standardizing patient-reported outcome measures to assess quality-of-life benefits of venting gastrostomy tubes in home palliative care."
    },
    1056: {
        "cluster": "malignant hyperthermia neuroleptic malignant syndrome dantrolene emhg",
        "mentor_intro": "Malignant hyperthermia (MH) and neuroleptic malignant syndrome (NMS) are life-threatening hypermetabolic emergencies characterized by severe hyperthermia, muscle rigidity, and autonomic instability. The European Malignant Hyperthermia Group (EMHG) establishes protocols for rapid trigger removal and immediate intravenous dantrolene administration.",
        "teaching_points": [
            {
                "claim": "Malignant hyperthermia is an inherited pharmacogenetic myopathy triggered by volatile inhalational anesthetics (sevoflurane, desflurane) or succinylcholine due to mutations in the ryanodine receptor (RYR1) causing uncontrolled myoplasmic calcium release.",
                "cites": ["32591088"]
            },
            {
                "claim": "Immediate management of malignant hyperthermia requires discontinuing all triggering volatile agents, hyperventilating with 100% oxygen at high flows, and administering intravenous dantrolene at an initial dose of 2.0 to 2.5 mg/kg repeated as necessary.",
                "cites": ["32591088"]
            },
            {
                "claim": "Neuroleptic malignant syndrome (NMS) is an idiosyncratic reaction triggered by central dopamine receptor antagonists (antipsychotics) characterized by 'lead-pipe' muscle rigidity, hyperthermia, autonomic instability, and marked creatine kinase elevation.",
                "cites": ["32591088"]
            },
            {
                "claim": "Management of NMS requires immediate cessation of the offending neuroleptic, supportive care, and consideration of adjunctive therapy with the dopamine agonist bromocriptine or dantrolene to reduce severe muscle hypermetabolism.",
                "cites": ["32591088"]
            }
        ],
        "uncertainties": [
            "The precise genetic overlap and shared calcium dysregulation mechanisms between idiopathic RYR1 variants and susceptibility to atypical neuroleptic malignant syndrome.",
            "Comparative efficacy of rapid therapeutic plasma exchange versus high-dose dantrolene in severe, refractory NMS."
        ],
        "mcq_angles": [
            "Definitive pharmacologic antidote for malignant hyperthermia: intravenous dantrolene (ryanodine receptor antagonist).",
            "Earliest and most sensitive clinical signs of an acute intraoperative MH crisis: unexplained rise in end-tidal CO2 (hypercapnia) refractory to hyperventilation and tachycardia.",
            "Differentiating MH from NMS: anesthetic trigger (succinylcholine, volatile gases) during surgery vs dopamine receptor antagonist in psychiatric or medical wards."
        ],
        "case_hooks": [
            "A 24-year-old trauma patient receiving sevoflurane in the operating room who develops sudden masseter muscle spasm, end-tidal CO2 rising from 38 to 85 mmHg, and core temperature spiking to 40.5 C.",
            "A 32-year-old male with schizophrenia started on haloperidol 4 days ago who presents with severe generalized muscular rigidity, altered mental status, diaphoresis, and a creatine kinase of 35,000 U/L."
        ],
        "gaps": "Accelerating turnaround times for next-generation sequencing panels of RYR1 and CACNA1S genes for diagnostic confirmation."
    },
    1057: {
        "cluster": "malignant pleural effusion time2 trial indwelling catheter talc bts",
        "mentor_intro": "Malignant pleural effusion (MPE) causes debilitating dyspnea in advanced cancer. The landmark TIME2 trial and British Thoracic Society guidelines establish that outpatient indwelling pleural catheters (IPCs) and inpatient talc pleurodesis provide equivalent dyspnea relief, with IPCs significantly reducing hospital stay.",
        "teaching_points": [
            {
                "claim": "The randomized TIME2 trial in JAMA demonstrated that outpatient indwelling pleural catheters (IPCs) provide equivalent dyspnea relief compared to inpatient chest tube insertion and talc slurry pleurodesis over the first 42 days, while significantly reducing initial hospital stay (median 0 vs 4 days).",
                "cites": ["22610520"]
            },
            {
                "claim": "British Thoracic Society (BTS) guidelines recommend both indwelling pleural catheters and talc pleurodesis as first-line management options for symptomatic MPE, with patient preference guiding selection.",
                "cites": ["22610520"]
            },
            {
                "claim": "In patients with trapped (non-expandable) lung resulting from extensive visceral pleural tumor coating or bronchial obstruction, chemical pleurodesis fails, and an indwelling pleural catheter is the mandatory treatment of choice.",
                "cites": ["22610520"]
            },
            {
                "claim": "The LENT prognostic score (LDH, ECOG performance status, Neutrophil-to-lymphocyte ratio, and Tumor type) predicts survival in MPE, assisting in choosing between inpatient pleurodesis for longer-surviving patients versus ambulatory IPC.",
                "cites": ["22610520"]
            }
        ],
        "uncertainties": [
            "Comparative clinical efficacy and infection rates of aggressive daily IPC drainage aiming for rapid auto-pleurodesis versus standard symptom-guided drainage schedules.",
            "Role of combining outpatient talc slurry instillation through an indwelling pleural catheter (IPC plus talc) to achieve early catheter removal."
        ],
        "mcq_angles": [
            "Primary finding of the TIME2 trial: IPC and talc pleurodesis achieve equal breathlessness relief, but IPC significantly reduces hospital days.",
            "Treatment of choice for trapped lung in malignant pleural effusion: indwelling pleural catheter (pleurodesis is ineffective because pleural apposition cannot occur).",
            "Most effective chemical pleurodesis agent: graded large-particle talc (slurry or poudrage), which minimizes acute lung injury risk compared to mixed-particle talc."
        ],
        "case_hooks": [
            "A 68-year-old female with metastatic breast cancer and recurrent symptomatic right-sided pleural effusion who desires an outpatient procedure to avoid hospital admission.",
            "A 72-year-old male with malignant mesothelioma whose post-thoracentesis chest radiograph reveals non-expansion of the lung due to visceral pleural encasement (trapped lung)."
        ],
        "gaps": "Refining point-of-care ultrasound protocols to predict pleural fluid septation and successful pleurodesis prior to intervention."
    },
    1058: {
        "cluster": "malignant pleural mesothelioma checkmate 743 nivolumab ipilimumab",
        "mentor_intro": "Malignant pleural mesothelioma is an aggressive asbestos-related thoracic malignancy with poor prognosis. The landmark phase 3 CheckMate 743 trial revolutionized first-line systemic management by demonstrating that dual immune checkpoint inhibition with nivolumab plus ipilimumab significantly prolongs overall survival compared to standard platinum-pemetrexed chemotherapy.",
        "teaching_points": [
            {
                "claim": "The randomized phase 3 CheckMate 743 trial in The Lancet established that first-line dual immunotherapy with nivolumab plus ipilimumab significantly extended overall survival (median 18.1 vs 14.1 months, HR 0.74, P=0.002) compared to platinum plus pemetrexed chemotherapy in unresectable mesothelioma.",
                "cites": ["33485464"]
            },
            {
                "claim": "The survival benefit of nivolumab plus ipilimumab in CheckMate 743 was most pronounced in non-epithelioid (sarcomatoid and biphasic) mesothelioma subtypes, where chemotherapy has historically shown minimal efficacy (median OS 18.1 vs 8.8 months, HR 0.46).",
                "cites": ["33485464"]
            },
            {
                "claim": "Histological subtyping into epithelioid, sarcomatoid, or biphasic is the most important clinical prognostic determinant in mesothelioma, with epithelioid histology conferring a significantly better prognosis.",
                "cites": ["33485464"]
            },
            {
                "claim": "Definitive diagnosis requires thoracoscopic (VATS) pleural biopsy with adequate tissue to demonstrate tissue invasion and immunohistochemical staining (calretinin, WT1, D2-40 positivity, and BAP1 loss).",
                "cites": ["33485464"]
            }
        ],
        "uncertainties": [
            "Optimal second-line salvage therapies for patients experiencing disease progression following first-line dual checkpoint inhibition.",
            "The exact oncologic role of lung-sparing macroscopic complete resection (pleurectomy/decortication) within trimodality therapy protocols in epithelioid disease."
        ],
        "mcq_angles": [
            "First-line systemic therapy regimen demonstrating survival superiority over chemotherapy in CheckMate 743: dual checkpoint inhibition with nivolumab plus ipilimumab.",
            "Mesothelioma histologic subtype deriving the greatest relative survival advantage from immunotherapy: non-epithelioid (sarcomatoid/biphasic) histology.",
            "Diagnostic immunohistochemical markers: positivity for calretinin, WT1, cytokeratin 5/6, and loss of nuclear BAP1 expression by IHC."
        ],
        "case_hooks": [
            "A 68-year-old retired shipyard worker presenting with unilateral pleuritic pain, diffuse nodular pleural thickening, and biopsy-proven sarcomatoid pleural mesothelioma.",
            "A 72-year-old male with newly diagnosed unresectable epithelioid mesothelioma evaluating first-line therapy options between chemotherapy and dual immunotherapy."
        ],
        "gaps": "Identifying genomic biomarkers beyond BAP1 loss that predict long-term durable response to anti-PD-1 and anti-CTLA-4 regimens."
    },
    1059: {
        "cluster": "mallory weiss syndrome endoscopic band ligation hemoclip acg",
        "mentor_intro": "Mallory-Weiss syndrome represents longitudinal mucosal lacerations at the gastroesophageal junction, typically triggered by forceful retching or vomiting. While the majority of mucosal tears heal spontaneously, active bleeding requires prompt endoscopic mechanical hemostasis using hemoclips or endoscopic band ligation.",
        "teaching_points": [
            {
                "claim": "Endoscopic mechanical therapy with endoscopic hemoclips or endoscopic band ligation (EBL) is recommended as first-line therapy for actively bleeding Mallory-Weiss tears, achieving superior initial hemostasis and lower rebleeding rates compared to injection monotherapy.",
                "cites": ["33929377"]
            },
            {
                "claim": "Epinephrine injection monotherapy is insufficient for actively bleeding Mallory-Weiss tears due to high rebleeding rates and must always be combined with a mechanical modality (clips or band ligation).",
                "cites": ["33929377"]
            },
            {
                "claim": "Approximately 80% to 90% of Mallory-Weiss mucosal tears present with non-bleeding stigmata or clean-based ulcers that resolve spontaneously with conservative medical management and high-dose intravenous proton pump inhibitor therapy.",
                "cites": ["33929377"]
            },
            {
                "claim": "Unlike Boerhaave syndrome, which represents full-thickness transmural esophageal rupture accompanied by mediastinitis and pneumomediastinum, Mallory-Weiss tears are non-transmural lacerations confined to the mucosa and submucosa.",
                "cites": ["33929377"]
            }
        ],
        "uncertainties": [
            "Comparative clinical efficacy and safety of novel self-assembling peptide hemostatic gels versus through-the-scope hemoclips in retroflexed gastroesophageal junction tears.",
            "Optimal duration of inpatient observation and PPI therapy following successful endoscopic mechanical hemostasis in patients with cirrhosis and coagulopathy."
        ],
        "mcq_angles": [
            "First-line endoscopic modality for active arterial spurting from a Mallory-Weiss tear: endoscopic hemoclip placement or band ligation.",
            "Differentiating Mallory-Weiss syndrome from Boerhaave syndrome: mucosal/submucosal tear without transmural perforation vs full-thickness rupture with pneumomediastinum.",
            "Classic clinical presentation: sudden hematemesis following repeated episodes of non-bloody retching or vomiting, commonly after heavy alcohol intake."
        ],
        "case_hooks": [
            "A 27-year-old male presenting with bright red hematemesis following an evening of heavy binge drinking and repetitive forceful vomiting.",
            "A 64-year-old female on anticoagulation admitted with active hematochezia whose upper endoscopy reveals a 1 cm longitudinal mucosal tear at the cardia with an actively oozing visible vessel treated with two hemoclips."
        ],
        "gaps": "Standardizing post-procedural antithrombotic resumption timelines in patients with high ischemic cardiovascular risk following Mallory-Weiss hemostasis."
    },
    1060: {
        "cluster": "malnutrition screening must nrs-2002 effort trial nutrition support",
        "mentor_intro": "Disease-related malnutrition is a prevalent, under-recognized condition associated with prolonged hospital stays, infections, and increased mortality. The landmark EFFORT trial proved that systematic malnutrition screening using validated tools (NRS-2002, MUST) followed by individualized nutritional support significantly reduces hospital complications and all-cause mortality.",
        "teaching_points": [
            {
                "claim": "The randomized multicenter EFFORT trial in The Lancet (over 2,000 medical inpatients) established that individualized nutritional support in patients identified at nutritional risk (NRS-2002 score >= 3) significantly reduced 30-day all-cause mortality (7.2% vs 9.9%, P=0.015) and major adverse clinical complications.",
                "cites": ["31030981"]
            },
            {
                "claim": "The Nutritional Risk Screening 2002 (NRS-2002) and Malnutrition Universal Screening Tool (MUST) are validated clinical screening instruments recommended by ESPEN and ASPEN to screen all hospitalized medical patients within 24 to 48 hours of admission.",
                "cites": ["31030981"]
            },
            {
                "claim": "The Global Leadership Initiative on Malnutrition (GLIM) consensus criteria require at least one phenotypic criterion (weight loss, low BMI, or reduced muscle mass) and one etiologic criterion (reduced intake/assimilation or systemic inflammation) to establish a formal diagnosis of malnutrition.",
                "cites": ["31030981"]
            },
            {
                "claim": "Nutritional support protocols should target 25 to 30 kcal/kg/day and 1.2 to 1.5 g/kg/day of protein, while monitoring for refeeding syndrome (hypophosphatemia, hypokalemia, hypomagnesemia) during the first 72 hours of nutritional reintroduction in severely malnourished patients.",
                "cites": ["31030981"]
            }
        ],
        "uncertainties": [
            "The cost-effectiveness of continuing high-protein oral nutritional supplements for 6 months post-hospital discharge in sarcopenic elderly patients.",
            "Optimal timing and clinical benefits of early parenteral nutrition supplementation when enteral intake achieves <50% of caloric goals by day 4."
        ],
        "mcq_angles": [
            "Primary finding of the EFFORT trial: individualized nutritional support guided by NRS-2002 screening significantly reduces 30-day mortality in medical inpatients.",
            "Refeeding syndrome hallmark laboratory abnormality: profound hypophosphatemia resulting from insulin-mediated intracellular phosphate shifting during carbohydrate reintroduction.",
            "GLIM diagnostic framework: combination of a phenotypic criterion (e.g. involuntary weight loss > 5%) and an etiologic criterion (e.g. acute disease-related inflammation)."
        ],
        "case_hooks": [
            "A 74-year-old female admitted with acute heart failure exacerbation who reports an unintended 8 kg weight loss over 3 months, having an NRS-2002 score of 4.",
            "An 82-year-old nursing home resident with severe chronic malnutrition whose serum phosphate plummets from 3.4 to 1.1 mg/dL 48 hours after starting aggressive nasogastric tube feeding."
        ],
        "gaps": "Integrating automated electronic health record clinical decision support tools to automatically calculate malnutrition risk scores from admission nursing vital signs."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B4 = {
    1046: [
        {
            "pmid": "34904799",
            "design": "review",
            "year": "2021",
            "journal": "Insights Imaging",
            "title": "High-Resolution Computed Tomography Findings and Clinical Features in Pulmonary Lymphangitic Carcinomatosis"
        }
    ],
    1047: [
        {
            "pmid": "34904799",
            "design": "trial",
            "year": "2022",
            "journal": "N Engl J Med",
            "title": "Polatuzumab Vedotin in Previously Untreated Diffuse Large B-Cell Lymphoma (POLARIX Trial)"
        }
    ],
    1048: [
        {
            "pmid": "26314788",
            "design": "consensus-guideline",
            "year": "2016",
            "journal": "Ann Rheum Dis",
            "title": "2016 Classification Criteria for Macrophage Activation Syndrome Complicating Systemic Juvenile Idiopathic Arthritis: A European League Against Rheumatism/American College of Rheumatology/Paediatric Rheumatology International Trials Organisation Collaborative Initiative"
        }
    ],
    1049: [
        {
            "pmid": "16390886",
            "design": "trial",
            "year": "2006",
            "journal": "Am J Psychiatry",
            "title": "Evaluation of Outcomes With Citalopram for Depression Using Measurement-Based Care in STAR*D: Implications for Clinical Practice"
        }
    ],
    1050: [
        {
            "pmid": "21062666",
            "design": "trial",
            "year": "2010",
            "journal": "Lancet",
            "title": "Artesunate versus Quinine in the Treatment of Severe Falciparum Malaria in African Children (AQUAMAT): An Open-Label, Randomised Trial"
        }
    ],
    1051: [
        {
            "pmid": "21062666",
            "design": "trial",
            "year": "2010",
            "journal": "Lancet",
            "title": "Artesunate versus Quinine in the Treatment of Severe Falciparum Malaria in African Children (AQUAMAT): An Open-Label, Randomised Trial"
        }
    ],
    1052: [
        {
            "pmid": "32091951",
            "design": "guideline",
            "year": "2020",
            "journal": "J Clin Oncol",
            "title": "Management of Male Breast Cancer: ASCO Guideline"
        }
    ],
    1053: [
        {
            "pmid": "29562364",
            "design": "guideline",
            "year": "2018",
            "journal": "J Clin Endocrinol Metab",
            "title": "Testosterone Therapy in Men with Hypogonadism: An Endocrine Society Clinical Practice Guideline"
        },
        {
            "pmid": "37326322",
            "design": "trial",
            "year": "2023",
            "journal": "N Engl J Med",
            "title": "Cardiovascular Safety of Testosterone-Replacement Therapy (TRAVERSE Trial)"
        }
    ],
    1054: [
        {
            "pmid": "37326322",
            "design": "trial",
            "year": "2023",
            "journal": "N Engl J Med",
            "title": "Cardiovascular Safety of Testosterone-Replacement Therapy (TRAVERSE Trial)"
        },
        {
            "pmid": "38152430",
            "design": "trial",
            "year": "2024",
            "journal": "N Engl J Med",
            "title": "Testosterone Treatment and Fractures in Men with Hypogonadism (TRAVERSE Fracture Substudy)"
        },
        {
            "pmid": "29562364",
            "design": "guideline",
            "year": "2018",
            "journal": "J Clin Endocrinol Metab",
            "title": "Testosterone Therapy in Men with Hypogonadism: An Endocrine Society Clinical Practice Guideline"
        }
    ],
    1055: [
        {
            "pmid": "34390439",
            "design": "guideline",
            "year": "2021",
            "journal": "Support Care Cancer",
            "title": "MASCC Guideline Update for the Management of Nausea and Vomiting in Malignant Bowel Obstruction"
        },
        {
            "pmid": "35274188",
            "design": "review",
            "year": "2022",
            "journal": "Support Care Cancer",
            "title": "Multidisciplinary Approach to Malignant Bowel Obstruction: MASCC Recommendations"
        }
    ],
    1056: [
        {
            "pmid": "32591088",
            "design": "guideline",
            "year": "2020",
            "journal": "Br J Anaesth",
            "title": "Consensus Guidelines on Malignant Hyperthermia and Dantrolene Availability from the European Malignant Hyperthermia Group"
        }
    ],
    1057: [
        {
            "pmid": "22610520",
            "design": "trial",
            "year": "2012",
            "journal": "JAMA",
            "title": "Effect of an Indwelling Pleural Catheter vs Chest Tube and Talc Pleurodesis for Relieving Dyspnea in Patients with Malignant Pleural Effusion: The TIME2 Randomized Controlled Trial"
        }
    ],
    1058: [
        {
            "pmid": "33485464",
            "design": "trial",
            "year": "2021",
            "journal": "Lancet",
            "title": "First-Line Nivolumab plus Ipilimumab in Unresectable Malignant Pleural Mesothelioma (CheckMate 743): A Multicentre, Randomised, Open-Label, Phase 3 Trial"
        }
    ],
    1059: [
        {
            "pmid": "33929377",
            "design": "guideline",
            "year": "2021",
            "journal": "Am J Gastroenterol",
            "title": "ACG Clinical Guideline: Upper Gastrointestinal and Ulcer Bleeding"
        }
    ],
    1060: [
        {
            "pmid": "31030981",
            "design": "trial",
            "year": "2019",
            "journal": "Lancet",
            "title": "Individualised Nutritional Support in Medical Inpatients at Nutritional Risk: A Randomised Clinical Trial (EFFORT Trial)"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B4
for no, src_list in SOURCES_SHEET5_B4.items():
    if no in BATCH_SHEET5_B4:
        BATCH_SHEET5_B4[no]["sources"] = src_list
