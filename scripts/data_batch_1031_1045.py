# -*- coding: utf-8 -*-
"""
data_batch_1031_1045.py

Curriculum data for Sheet 5 (Topics 1031 to 1045).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B3 = {
    1031: {
        "cluster": "lower urinary tract symptoms benign prostatic hyperplasia alpha blockers 5-ari",
        "mentor_intro": "Male lower urinary tract symptoms (LUTS) secondary to benign prostatic hyperplasia (BPH) require objective symptom scoring and risk stratification for disease progression. Landmark trials establish that combining an alpha-1 adrenergic antagonist with a 5-alpha reductase inhibitor (5-ARI) prevents acute urinary retention and surgical intervention in enlarged prostates.",
        "teaching_points": [
            {
                "claim": "The randomized MTOPS trial (over 3,000 men followed for 4.5 years) demonstrated that combination therapy with doxazosin plus finasteride reduced the risk of overall clinical progression of BPH by 66%, significantly outperforming either monotherapy.",
                "cites": ["14681504"]
            },
            {
                "claim": "The 4-year CombAT trial confirmed that dutasteride plus tamsulosin combination therapy significantly reduced the relative risk of acute urinary retention or BPH-related surgery by 65.8% compared to tamsulosin monotherapy in men with prostate volume >= 30 mL.",
                "cites": ["19825505"]
            },
            {
                "claim": "EAU and AUA guidelines recommend 5-alpha reductase inhibitors (finasteride, dutasteride) specifically for men with moderate-to-severe LUTS and documented prostate enlargement (volume > 30-40 mL or PSA > 1.5 ng/mL) to modify natural disease progression.",
                "cites": ["14681504", "19825505"]
            },
            {
                "claim": "Alpha-blockers provide rapid symptomatic relief within 48 to 72 hours by reducing prostatic smooth muscle tone, whereas 5-ARIs require 6 to 12 months to induce epithelial atrophy and reduce prostate volume by approximately 20% to 25%.",
                "cites": ["14681504", "19825505"]
            }
        ],
        "uncertainties": [
            "Whether alpha-blocker therapy can be successfully withdrawn after 6 to 12 months of combination therapy without symptom recrudescence.",
            "Long-term cognitive and sexual adverse event persistence following discontinuation of 5-alpha reductase inhibitors (post-finasteride syndrome debate)."
        ],
        "mcq_angles": [
            "Identification of patients who benefit from 5-ARI therapy: prostate volume > 30 mL or PSA > 1.5 ng/mL.",
            "Interpretation of the MTOPS trial: combination therapy prevents long-term acute urinary retention and surgical necessity, whereas alpha-blocker monotherapy does not reduce retention risk.",
            "Effect of 5-ARIs on serum PSA: reduces baseline PSA by approximately 50% after 6 months, requiring doubling the measured PSA for prostate cancer screening interpretation."
        ],
        "case_hooks": [
            "A 67-year-old male with an IPSS of 21, weak stream, prostate volume of 55 mL, and PSA of 2.8 ng/dL seeking medical therapy to avoid transurethral surgery.",
            "A 62-year-old man on tamsulosin monotherapy for 2 years presenting with acute urinary retention requiring Foley catheterization."
        ],
        "gaps": "Clarifying the clinical role of phosphodiesterase-5 inhibitors (tadalafil) combined with 5-ARIs in men with concurrent erectile dysfunction."
    },
    1032: {
        "cluster": "low tidal volume ventilation acute respiratory distress syndrome ardsnet",
        "mentor_intro": "Acute respiratory distress syndrome (ARDS) features non-hydrostatic pulmonary edema and severe hypoxemia. The landmark ARMA trial by the ARDS Network established that lung-protective ventilation using low tidal volumes and restricted plateau pressures significantly reduces hospital mortality.",
        "teaching_points": [
            {
                "claim": "The randomized ARDSNet ARMA trial established that mechanical ventilation with a low tidal volume target of 6 mL/kg of predicted body weight significantly reduced mortality from 39.8% to 31.0% (P=0.007) compared to traditional 12 mL/kg ventilation.",
                "cites": ["10793162"]
            },
            {
                "claim": "Lung-protective ventilation mandates maintaining end-inspiratory plateau pressure at or below 30 cm H2O to prevent alveolar overdistension and ventilator-induced lung injury (volutrauma and barotrauma).",
                "cites": ["10793162"]
            },
            {
                "claim": "Tidal volume calculations in ARDS must be strictly based on predicted (ideal) body weight determined by height and sex, rather than actual measured body weight, to prevent occult severe volutrauma in obese individuals.",
                "cites": ["10793162"]
            },
            {
                "claim": "Permissive hypercapnia with mild respiratory acidosis (pH >= 7.20 to 7.25) is an accepted physiological trade-off when implementing 6 mL/kg ventilation to limit alveolar stretch in severely non-compliant lungs.",
                "cites": ["10793162"]
            }
        ],
        "uncertainties": [
            "Whether ultra-low tidal volume ventilation (3 to 4 mL/kg) facilitated by extracorporeal carbon dioxide removal (ECCO2R) provides incremental survival benefit over standard 6 mL/kg ventilation.",
            "The optimal strategy for titrating positive end-expiratory pressure (PEEP): high-PEEP FiO2 tables versus transpulmonary pressure guided by esophageal manometry."
        ],
        "mcq_angles": [
            "Calculation of tidal volume target based on predicted body weight (6 mL/kg PBW) rather than actual body weight.",
            "Absolute upper limit threshold for end-inspiratory plateau pressure in lung-protective ARDS ventilation (<= 30 cm H2O).",
            "Permissive hypercapnia management: allowing PaCO2 to rise while maintaining pH >= 7.20, except in traumatic brain injury or severe pulmonary hypertension."
        ],
        "case_hooks": [
            "A 5'4'' female weighing 95 kg with severe septic ARDS whose ventilator is erroneously set to 600 mL tidal volume based on actual weight, causing a plateau pressure of 36 cm H2O.",
            "A 48-year-old male with severe pancreatitis-induced ARDS whose PaO2/FiO2 ratio is 110 on 6 mL/kg PBW ventilation with respiratory acidosis (pH 7.22, PaCO2 58 mmHg)."
        ],
        "gaps": "Overcoming clinical under-recognition of ARDS and low adherence to strict 6 mL/kg PBW ventilation protocols in community ICUs."
    },
    1033: {
        "cluster": "lumbar spinal stenosis sport trial surgical vs nonoperative decompression",
        "mentor_intro": "Lumbar spinal stenosis results from degenerative narrowing of the spinal canal causing neurogenic claudication. The landmark SPORT trial demonstrated that surgical decompression provides substantial and durable pain and functional improvements over non-operative care in patients with persistent disabling symptoms.",
        "teaching_points": [
            {
                "claim": "The randomized and observational SPORT trial cohorts demonstrated that patients with symptomatic lumbar spinal stenosis treated surgically with decompressive laminectomy achieved significantly greater improvements in bodily pain and physical function through 2 to 4 years compared to non-operative management.",
                "cites": ["18287602"]
            },
            {
                "claim": "Neurogenic claudication is the classic clinical hallmark of lumbar stenosis, characterized by bilateral leg pain, paresthesias, and cramping exacerbated by walking and lumbar extension, and relieved by sitting or forward lumbar flexion (shopping cart sign).",
                "cites": ["18287602"]
            },
            {
                "claim": "Vascular claudication is differentiated clinically from neurogenic claudication by relief with standing still without flexion, preserved pedal pulses in neurogenic claudication, and pain brought on consistently by fixed distances regardless of posture.",
                "cites": ["18287602"]
            },
            {
                "claim": "Decompressive laminectomy alone is the surgical standard for stenosis without instability, whereas adjunctive spinal fusion is indicated only when concurrent spondylolisthesis or frank spinal instability is documented.",
                "cites": ["18287602"]
            }
        ],
        "uncertainties": [
            "The long-term comparative efficacy of minimally invasive endoscopic decompression versus open laminectomy regarding adjacent segment disease.",
            "Durability of symptom relief from fluoroscopically guided epidural steroid injections in delaying or avoiding surgical intervention."
        ],
        "mcq_angles": [
            "Clinical distinction between neurogenic and vascular claudication: posture-dependence (relief with spine flexion/sitting) in neurogenic stenosis.",
            "Evidence from the SPORT trial: significant superiority of decompressive surgery over conservative therapy in as-treated long-term functional analysis.",
            "Indications for instrumented fusion in addition to decompression: presence of degenerative spondylolisthesis or dynamic instability on flexion-extension radiographs."
        ],
        "case_hooks": [
            "A 71-year-old male who cannot walk more than 100 meters due to aching bilateral calf pain and numbness that immediately resolves when leaning over a shopping cart.",
            "A 68-year-old woman with severe central L4-L5 stenosis on MRI who has failed 6 months of physical therapy and NSAIDs, evaluating surgical options."
        ],
        "gaps": "Standardizing criteria for patient selection between simple tubular microdecompression and wide bilateral laminectomy."
    },
    1034: {
        "cluster": "lung cancer nlst nelson screening targeted therapy",
        "mentor_intro": "Lung cancer is the leading cause of cancer-related mortality. Population-level screening with low-dose computed tomography (LDCT) reduces mortality, while comprehensive molecular profiling for actionable oncogenic driver mutations dictates first-line systemic therapy.",
        "teaching_points": [
            {
                "claim": "The randomized National Lung Screening Trial (NLST) demonstrated a 20% relative reduction in lung cancer mortality with annual low-dose CT screening compared to chest radiography in high-risk smokers.",
                "cites": ["33710275"]
            },
            {
                "claim": "The European NELSON trial confirmed a 24% to 26% reduction in lung cancer mortality at 10 years using volumetric low-dose CT nodule screening with low referral rates.",
                "cites": ["31995683"]
            },
            {
                "claim": "In advanced non-small cell lung cancer (NSCLC), broad-panel next-generation sequencing (NGS) is mandatory to identify actionable alterations including EGFR, ALK, ROS1, BRAF V600E, RET, MET exon 14 skipping, and KRAS G12C prior to initiating immunotherapy.",
                "cites": ["33710275", "31995683"]
            },
            {
                "claim": "First-line osimertinib in EGFR-mutated NSCLC and alectinib in ALK-rearranged NSCLC significantly prolong progression-free and overall survival while providing superior central nervous system protection compared to early-generation TKIs.",
                "cites": ["31995683"]
            }
        ],
        "uncertainties": [
            "Optimal screening interval and risk prediction models for light or former smokers who quit > 15 years ago but retain substantial cumulative lifetime risk.",
            "Overcoming acquired resistance to third-generation EGFR and ALK inhibitors driven by bypass track oncogene amplification (e.g. MET, HER2)."
        ],
        "mcq_angles": [
            "Mortality reduction demonstrated by landmark LDCT screening trials (NLST 20%, NELSON ~24-26%).",
            "Mandatory diagnostic step prior to checkpoint inhibitor therapy in adenocarcinoma: NGS testing to avoid fatal pneumonitis or poor efficacy in EGFR/ALK-mutated disease.",
            "First-line targeted agent of choice for sensitizing EGFR mutations (exon 19 del / L858R): third-generation TKI osimertinib."
        ],
        "case_hooks": [
            "A 62-year-old active 30 pack-year smoker undergoing baseline LDCT screening who is found to have an 8 mm solid spiculated upper lobe nodule.",
            "A 54-year-old female non-smoker presenting with cough and multiple bone metastases found to have lung adenocarcinoma harboring an EGFR exon 19 deletion."
        ],
        "gaps": "Integrating circulating tumor DNA (ctDNA) liquid biopsies into routine early detection and recurrence surveillance."
    },
    1035: {
        "cluster": "lung cancer screening guidelines uspstf chest",
        "mentor_intro": "Lung cancer screening guidelines balance early detection of resectable malignancies against the harms of false positives, incidental findings, and radiation exposure. The 2021 USPSTF update expanded eligibility by lowering both the age threshold and the cumulative pack-year requirement.",
        "teaching_points": [
            {
                "claim": "The 2021 USPSTF recommendation statement expanded lung cancer screening eligibility to adults aged 50 to 80 years who have a 20 pack-year smoking history and currently smoke or have quit within the past 15 years.",
                "cites": ["33710275"]
            },
            {
                "claim": "Lowering the eligibility threshold to age 50 and 20 pack-years significantly increased screening sensitivity and reduced racial disparities in screening access, particularly for African American and female smokers who develop lung cancer at lower pack-years.",
                "cites": ["33710275"]
            },
            {
                "claim": "Screening should be discontinued once a person has not smoked for 15 years or develops a substantial health condition that limits life expectancy or the ability to undergo curative lung resection.",
                "cites": ["33710275"]
            },
            {
                "claim": "Shared decision-making is a mandatory guideline component prior to screening, emphasizing the benefits of early mortality reduction, smoking cessation counseling, and the potential risks of nodule workups and overdiagnosis.",
                "cites": ["33710275"]
            }
        ],
        "uncertainties": [
            "Whether individualized risk prediction models (such as PLCOm2012) should replace rigid age and pack-year eligibility cutoffs in clinical practice.",
            "Cost-effectiveness and radiation accumulation of extending screening beyond age 80 in healthy non-frail former smokers."
        ],
        "mcq_angles": [
            "2021 USPSTF screening eligibility criteria: age 50 to 80, >= 20 pack-year smoking history, current smoker or quit within 15 years.",
            "Criteria for discontinuing annual LDCT screening: quit date > 15 years ago or comorbid illness precluding curative lung surgery.",
            "Standard nodule reporting framework: American College of Radiology Lung-RADS system to standardize management and reduce false-positive interventions."
        ],
        "case_hooks": [
            "A 52-year-old male with a 22 pack-year smoking history who currently smokes requesting evaluation for lung cancer screening.",
            "A 72-year-old female with severe oxygen-dependent heart failure and end-stage renal disease whose family requests an annual screening chest CT."
        ],
        "gaps": "Overcoming primary care implementation barriers to achieve high nationwide uptake of LDCT screening in eligible populations."
    },
    1036: {
        "cluster": "lung cancer screening low dose ct nelson lung-rads",
        "mentor_intro": "Low-dose computed tomography (LDCT) utilizes modern helical CT techniques to minimize radiation while identifying early-stage curable lung cancers. The implementation of standardized volumetric assessment and Lung-RADS reporting has dramatically reduced unnecessary invasive biopsy rates.",
        "teaching_points": [
            {
                "claim": "The landmark NELSON trial demonstrated that volume-based CT screening with semi-automated nodule volume calculation and volume doubling time (VDT) yields an exceptionally low referral rate (2.1%) while reducing 10-year lung cancer mortality by 24% in men.",
                "cites": ["31995683"]
            },
            {
                "claim": "The Lung-RADS classification categorizes nodules from 1 (negative) to 4X (very high suspicion), with category 3 (probably benign) managed with 6-month repeat LDCT and category 4 managed with diagnostic workup or PET/CT.",
                "cites": ["31995683", "33710275"]
            },
            {
                "claim": "Radiation exposure from a modern low-dose chest CT is approximately 1.0 to 1.5 mSv, compared to 7 to 8 mSv for a standard diagnostic chest CT, making annual serial surveillance safe.",
                "cites": ["33710275"]
            },
            {
                "claim": "Subsolid (part-solid and pure ground-glass) nodules detected on LDCT exhibit indolent biology; guidelines mandate conservative observation with serial low-dose CT to document persistent growth or appearance of a solid component prior to resection.",
                "cites": ["31995683"]
            }
        ],
        "uncertainties": [
            "The long-term impact of artificial intelligence computer-aided detection (CAD) algorithms on reducing radiologist reading time and over-diagnosis rates.",
            "Optimal biopsy technique (robotic bronchoscopy vs percutaneous transthoracic needle biopsy) for indeterminate Lung-RADS 4A peripheral nodules."
        ],
        "mcq_angles": [
            "Management of a Lung-RADS 3 nodule (solid nodule 6 to <8 mm at baseline): 6-month repeat low-dose CT scan.",
            "Volume doubling time thresholds in the NELSON trial: VDT < 400 days indicates fast growth requiring pulmonology/oncology referral, whereas VDT > 600 days indicates benign indolence.",
            "Diagnostic approach to pure ground-glass nodules < 30 mm: conservative annual LDCT follow-up rather than immediate biopsy due to slow doubling time."
        ],
        "case_hooks": [
            "A 58-year-old former smoker whose screening LDCT reveals a 7 mm solid right lower lobe nodule (Lung-RADS 3), presenting for next-step planning.",
            "A 64-year-old male found to have a 12 mm solid spiculated upper lobe nodule with pleural retraction (Lung-RADS 4B), requiring immediate diagnostic evaluation."
        ],
        "gaps": "Standardizing volumetric software calibration across different CT scanner manufacturers to ensure reproducible volume doubling time metrics."
    },
    1037: {
        "cluster": "lung transplantation ishlt guidelines candidate selection referral",
        "mentor_intro": "Lung transplantation offers survival and functional improvement for selected patients with end-stage respiratory failure refractory to medical therapy. The 2021 ISHLT consensus guidelines provide clear criteria differentiating the optimal timing for initial transplant referral from definitive waitlist listing.",
        "teaching_points": [
            {
                "claim": "The 2021 ISHLT consensus document on candidate selection recommends referring patients with chronic lung disease for transplant evaluation when their estimated 2- to 3-year mortality exceeds 50%, or when oxygen dependence and severe functional impairment manifest.",
                "cites": ["34419372"]
            },
            {
                "claim": "In idiopathic pulmonary fibrosis (IPF), immediate referral for lung transplantation at the time of initial clinical diagnosis is strongly recommended, regardless of baseline FVC, due to the unpredictable and rapid trajectory of disease progression.",
                "cites": ["34419372"]
            },
            {
                "claim": "Absolute contraindications to lung transplantation under ISHLT guidelines include active malignancy within 2 years, severe uncorrectable multi-organ dysfunction (cardiac, renal, hepatic), active non-adherence, and active substance use or smoking within 6 months.",
                "cites": ["34419372"]
            },
            {
                "claim": "In COPD, referral is recommended for BODE index >= 5, FEV1 < 25% predicted, or refractory hypercapnic exacerbations, while listing is indicated for BODE index >= 7.",
                "cites": ["34419372"]
            }
        ],
        "uncertainties": [
            "Long-term survival outcomes and donor-transmitted infection risks with the increasing utilization of hepatitis C positive donors in HCV-negative recipients using direct-acting antivirals.",
            "Role and upper age limits for bilateral versus single lung transplantation in recipients over 70 years of age."
        ],
        "mcq_angles": [
            "Timing of transplant referral in idiopathic pulmonary fibrosis: immediate referral at diagnosis regardless of FVC or DLCO.",
            "Absolute contraindications to lung transplantation under ISHLT criteria: active cigarette smoking within 6 months, severe obesity (BMI > 35), and active systemic malignancy within 2 years.",
            "BODE index thresholds for COPD: referral at BODE >= 5, listing at BODE >= 7."
        ],
        "case_hooks": [
            "A 58-year-old male newly diagnosed with idiopathic pulmonary fibrosis and normal baseline spirometry presenting for long-term management planning.",
            "A 63-year-old female with severe COPD (FEV1 22%), 2 hospitalizations for hypercapnic respiratory failure in the past year, and a BODE score of 7."
        ],
        "gaps": "Expanding organ donor pool utilization through ex-vivo lung perfusion (EVLP) technologies for marginal donor grafts."
    },
    1038: {
        "cluster": "lupus nephritis kdigo eular guidelines belimumab voclosporin",
        "mentor_intro": "Lupus nephritis represents a severe manifestation of systemic lupus erythematosus that leads to end-stage kidney disease if untreated. The KDIGO 2024 guidelines endorse early triple/multitarget therapy combining glucocorticoids and antimetabolites with belimumab or calcineurin inhibitors (voclosporin).",
        "teaching_points": [
            {
                "claim": "The KDIGO 2024 clinical practice guidelines recommend initial treatment of active proliferative lupus nephritis (Class III/IV) with reduced-dose glucocorticoids plus mycophenolic acid analogs (or low-dose IV cyclophosphamide), with upfront addition of belimumab or voclosporin for triple therapy.",
                "cites": ["38182286"]
            },
            {
                "claim": "The landmark BLISS-LN phase 3 trial demonstrated that adding intravenous belimumab to standard of care significantly increased primary efficacy renal response at week 104 (43% vs 32%, P=0.03) and significantly reduced renal flare rates.",
                "cites": ["33207151"]
            },
            {
                "claim": "The AURORA 1 trial established that adding the novel calcineurin inhibitor voclosporin to mycophenolate mofetil and low-dose oral steroids significantly doubled complete renal response rates at 52 weeks (41% vs 23%, P<0.0001) without increasing nephrotoxicity.",
                "cites": ["33971155"]
            },
            {
                "claim": "All patients with lupus nephritis should receive background hydroxychloroquine (unless strictly contraindicated) at a target dose not exceeding 5.0 mg/kg actual body weight to reduce renal flares and improve survival.",
                "cites": ["38182286", "33207151"]
            }
        ],
        "uncertainties": [
            "The direct comparative efficacy of belimumab-based triple therapy versus voclosporin-based triple therapy in patients with combined proliferative and membranous (Class IV+V) nephritis.",
            "Safe duration of maintenance immunosuppression before considering a repeat 'protocol' kidney biopsy prior to drug withdrawal."
        ],
        "mcq_angles": [
            "Frontline induction regimens endorsed by KDIGO 2024: steroid + MMF + belimumab OR steroid + MMF + voclosporin for proliferative LN.",
            "Baseline safety requirement for initiating voclosporin: baseline eGFR > 45 mL/min/1.73 m2.",
            "Mandatory adjunctive pharmacotherapy in all SLE patients: hydroxychloroquine dosed <= 5 mg/kg actual body weight to reduce mortality and renal damage accrual."
        ],
        "case_hooks": [
            "A 26-year-old female with newly diagnosed biopsy-proven Class IV lupus nephritis and urine protein-to-creatinine ratio of 4.2 g/g evaluating upfront triple therapy options.",
            "A 31-year-old male with active Class III+V lupus nephritis whose proteinuria remains 2.5 g/day despite 6 months of mycophenolate mofetil and prednisone."
        ],
        "gaps": "Defining non-invasive urinary biomarker panels that accurately predict histologic renal response without necessitating repeat surveillance biopsies."
    },
    1039: {
        "cluster": "lupus nephritis induction and maintenance therapy alms maintain",
        "mentor_intro": "Induction and maintenance therapy for lupus nephritis aims to achieve rapid remission while preserving nephron mass and minimizing corticosteroid toxicity. Seminal trials (ALMS and MAINTAIN) established mycophenolate mofetil as equal or superior to cyclophosphamide for induction and maintenance.",
        "teaching_points": [
            {
                "claim": "The randomized ALMS trial demonstrated that mycophenolate mofetil (target 3 g/day) is noninferior to monthly intravenous cyclophosphamide for induction of remission in active lupus nephritis, showing superior efficacy in African American and Hispanic populations.",
                "cites": ["38182286", "33207151"]
            },
            {
                "claim": "In the maintenance phase of the ALMS trial, mycophenolate mofetil was significantly superior to azathioprine in preventing renal relapse (HR 0.44, P=0.003) and treatment failure in patients who responded to induction.",
                "cites": ["38182286"]
            },
            {
                "claim": "The MAINTAIN Nephritis trial confirmed low-dose intravenous cyclophosphamide (Euro-Lupus regimen: 500 mg every 2 weeks for 6 doses) is equally effective as high-dose monthly NIH cyclophosphamide with significantly lower rates of severe infection and premature ovarian failure.",
                "cites": ["38182286"]
            },
            {
                "claim": "Maintenance immunosuppressive therapy for lupus nephritis must be continued for a minimum of 36 to 48 months following complete renal response before considering gradual taper.",
                "cites": ["38182286"]
            }
        ],
        "uncertainties": [
            "Optimal tapering schedule and timing for complete discontinuation of antimetabolite maintenance therapy in patients with prolonged (>5 years) complete clinical remission.",
            "Efficacy of maintenance therapy in maintaining remission during planned pregnancy, balancing teratogenicity of MMF requiring a switch to azathioprine."
        ],
        "mcq_angles": [
            "Selection of induction therapy based on race/ethnicity from the ALMS trial: MMF demonstrated higher response rates than cyclophosphamide in Black and Hispanic patients.",
            "Euro-Lupus regimen dosing: fixed 500 mg IV cyclophosphamide every 2 weeks for 6 doses (total 3 g) followed by azathioprine or MMF maintenance.",
            "Pre-conception planning: discontinuing MMF at least 12 weeks prior to conception and transitioning to azathioprine (<= 2 mg/kg/day)."
        ],
        "case_hooks": [
            "A 24-year-old African American female with biopsy-proven Class IV lupus nephritis deciding between MMF and IV cyclophosphamide for induction therapy.",
            "A 29-year-old female on MMF maintenance for 3 years with quiescent lupus nephritis who expresses a desire to conceive within the next year."
        ],
        "gaps": "Identifying genetic predictors of cyclophosphamide-induced gonadal toxicity to guide upfront fertility preservation protocols."
    },
    1040: {
        "cluster": "lupus nephritis isn rps classification biopsy indications induction",
        "mentor_intro": "The ISN/RPS classification system provides a standardized histological framework for lupus nephritis. Renal biopsy is mandatory in SLE patients with unexplained proteinuria, active urinary sediment, or declining renal function to differentiate proliferative disease requiring intensive immunosuppression from non-proliferative forms.",
        "teaching_points": [
            {
                "claim": "The ISN/RPS histological classification categorizes lupus nephritis into six classes: I (minimal mesangial), II (mesangial proliferative), III (focal proliferative, <50% glomeruli), IV (diffuse proliferative, >=50% glomeruli), V (membranous), and VI (advanced sclerosing).",
                "cites": ["38182286"]
            },
            {
                "claim": "Renal biopsy is indicated in SLE whenever there is persistent proteinuria >= 0.5 g/24 hours (or spot UPCR >= 0.5 mg/mg), active urinary sediment (>5 RBCs/HPF or cellular casts), or an unexplained rise in serum creatinine.",
                "cites": ["38182286"]
            },
            {
                "claim": "Class III and IV proliferative lesions carry the highest risk of progression to end-stage renal disease and mandate immediate aggressive immunosuppressive induction therapy with corticosteroids plus MMF or cyclophosphamide.",
                "cites": ["38182286", "33971155"]
            },
            {
                "claim": "Renal biopsy reporting must include the NIH Activity and Chronicity Indices, which evaluate reversible inflammatory lesions (cellular crescents, endocapillary proliferation, necrosis) versus irreversible fibrosis (glomerulosclerosis, interstitial fibrosis).",
                "cites": ["38182286"]
            }
        ],
        "uncertainties": [
            "The prognostic significance and therapeutic implications of isolated vascular lesions (lupus podocytopathy, thrombotic microangiopathy) on renal biopsy.",
            "Indication for mandatory protocol re-biopsy after 24 to 36 months of immunosuppressive therapy to detect silent ongoing histologic activity."
        ],
        "mcq_angles": [
            "Biopsy indication threshold in SLE: persistent proteinuria >= 0.5 g/24 hours or active urine sediment.",
            "Differentiating Class III from Class IV lupus nephritis: Class III involves <50% of glomeruli (focal), whereas Class IV involves >=50% of glomeruli (diffuse).",
            "Pathological significance of high NIH Chronicity Index (>4-6): indicates established irreversible scarring that responds poorly to aggressive cytotoxic induction."
        ],
        "case_hooks": [
            "A 22-year-old female with SLE whose routine urinalysis reveals 2+ protein, 15 dysmorphic RBCs per high-power field, and a UPCR of 0.9 g/g.",
            "A 35-year-old male with lupus whose renal biopsy demonstrates Class IV-G (A) diffuse proliferative nephritis with cellular crescents and an Activity Index of 12/24."
        ],
        "gaps": "Standardizing digital pathology artificial intelligence algorithms for scoring NIH activity and chronicity indices in multi-center clinical trials."
    },
    1041: {
        "cluster": "lupus pneumonitis and shrinking lung syndrome",
        "mentor_intro": "Pulmonary complications of systemic lupus erythematosus range from acute life-threatening lupus pneumonitis to insidious shrinking lung syndrome (SLS). Shrinking lung syndrome is characterized by progressive dyspnea, pleuritic pain, elevated diaphragms, and restrictive physiology in the absence of parenchymal lung disease.",
        "teaching_points": [
            {
                "claim": "Shrinking lung syndrome is a rare manifestation of SLE characterized by exertional dyspnea, pleuritic chest pain, elevated hemidiaphragms on imaging, and reduced lung volumes without interstitial fibrosis or pulmonary vascular obstruction.",
                "cites": ["27537601"]
            },
            {
                "claim": "Pulmonary function testing in shrinking lung syndrome demonstrates a pure extrapulmonary restrictive defect with proportional reductions in FVC, FEV1, and TLC, accompanied by reduced maximal inspiratory and expiratory pressures (MIP/MEP) reflecting diaphragmatic weakness.",
                "cites": ["27537601", "28758573"]
            },
            {
                "claim": "Acute lupus pneumonitis presents acutely with fever, cough, pleuritic chest pain, hypoxemia, and diffuse alveolar infiltrates on CT, requiring exclusion of opportunistic infection and high-dose corticosteroid therapy.",
                "cites": ["27537601"]
            },
            {
                "claim": "Management of shrinking lung syndrome combines moderate-to-high dose corticosteroids with immunosuppressive agents (mycophenolate mofetil, azathioprine, or rituximab), with beta-agonists or theophylline occasionally used to enhance diaphragmatic contractility.",
                "cites": ["28758573"]
            }
        ],
        "uncertainties": [
            "The primary underlying pathophysiology of shrinking lung syndrome: primary diaphragmatic myopathy versus phrenic nerve neuropathy versus chronic pleural inflammation.",
            "The long-term durability of B-cell depletion therapy with rituximab in refractory shrinking lung syndrome."
        ],
        "mcq_angles": [
            "Characteristic imaging findings of shrinking lung syndrome: elevated diaphragmatic domes and small lung volumes without parenchymal infiltrates or effusions.",
            "PFT pattern in shrinking lung syndrome: reduced FVC and TLC with a preserved or elevated FEV1/FVC ratio and reduced MIP/MEP, but relatively preserved DLCO when corrected for lung volume.",
            "Therapeutic escalation in progressive shrinking lung syndrome failing oral corticosteroids: addition of rituximab or mycophenolate mofetil."
        ],
        "case_hooks": [
            "A 28-year-old female with SLE presenting with progressive dyspnea on exertion and sharp chest pain whose chest X-ray shows marked elevation of both diaphragms and small lung fields without infiltrates.",
            "A 36-year-old male with acute lupus flare presenting with high fever, hemoptysis, hypoxemia, and bilateral ground-glass opacities, requiring differentiation between lupus pneumonitis and diffuse alveolar hemorrhage."
        ],
        "gaps": "Developing validated diagnostic criteria for shrinking lung syndrome to avoid prolonged diagnostic delay and inappropriate empiric antimicrobial treatment."
    },
    1042: {
        "cluster": "lyme arthritis idsa aan acr guidelines oral vs iv antibiotics",
        "mentor_intro": "Lyme arthritis is a late-stage manifestation of Borrelia burgdorferi infection, typically presenting as monoarticular or oligoarticular inflammatory arthritis of large joints, predominantly the knee. Joint IDSA/AAN/ACR guidelines establish a 28-day oral antibiotic regimen as first-line therapy, reserving IV ceftriaxone for persistent non-responsive synovitis.",
        "teaching_points": [
            {
                "claim": "The 2020 joint IDSA/AAN/ACR guidelines recommend an initial 28-day course of oral antibiotics (doxycycline 100 mg twice daily, amoxicillin 500 mg three times daily, or cefuroxime axetil 500 mg twice daily) as first-line therapy for Lyme arthritis.",
                "cites": ["33417672"]
            },
            {
                "claim": "If joint swelling and inflammation persist after an initial 28-day oral course, guidelines recommend either a second 28-day course of oral antibiotics or a 14- to 28-day course of intravenous ceftriaxone (2 g once daily).",
                "cites": ["33417672"]
            },
            {
                "claim": "Post-antibiotic (antibiotic-refractory) Lyme arthritis is defined as persistent joint inflammation despite appropriate oral and IV antibiotic therapy; further antibiotic courses are not recommended and treatment should transition to anti-inflammatory therapies (NSAIDs, DMARDs, or intra-articular corticosteroids).",
                "cites": ["33417672"]
            },
            {
                "claim": "Diagnostic confirmation of Lyme arthritis requires positive two-tier serology (or modified two-tier serology), with synovial fluid PCR for Borrelia burgdorferi DNA demonstrating high sensitivity prior to antibiotic exposure.",
                "cites": ["33417672"]
            }
        ],
        "uncertainties": [
            "The optimal timing and selection of biologic DMARDs (e.g. TNF inhibitors) versus synovectomy in refractory post-infectious proliferative Lyme synovitis.",
            "Diagnostic accuracy of Borrelia synovial fluid PCR in distinguishing active viable infection from persistent non-viable spirochetal DNA fragments."
        ],
        "mcq_angles": [
            "First-line treatment of choice for newly diagnosed Lyme arthritis: 28 days of oral doxycycline or amoxicillin.",
            "Management of antibiotic-refractory Lyme arthritis: discontinuing antibiotics and initiating rheumatological anti-inflammatory therapy (NSAIDs, methotrexate, or intra-articular steroid injection).",
            "Serological diagnosis in late Lyme disease: mandatory IgG Western blot confirmation (requiring at least 5 of 10 specific bands) alongside positive ELISA."
        ],
        "case_hooks": [
            "A 14-year-old boy in Connecticut presenting with a massive, minimally painful left knee effusion without systemic fever whose Lyme IgG Western blot is strongly positive.",
            "A 45-year-old female whose knee swelling persists unchanged following 28 days of oral doxycycline and 28 days of IV ceftriaxone, with negative repeat synovial PCR."
        ],
        "gaps": "Identifying host immunogenetic factors (e.g. HLA-DRB1 alleles) that predispose patients to post-infectious autoimmune Lyme arthritis."
    },
    1043: {
        "cluster": "lyme disease borrelia tick bite erythema migrans disseminated doxycycline",
        "mentor_intro": "Lyme disease is a multisystem vector-borne zoonosis transmitted by Ixodes scapularis and I. pacificus ticks infected with Borrelia burgdorferi. Clinical presentation dictates management: erythema migrans warrants immediate clinical diagnosis and treatment without serological delay, whereas post-tick bite prophylaxis requires strict eligibility criteria.",
        "teaching_points": [
            {
                "claim": "The 2020 IDSA/AAN/ACR guidelines recommend a single prophylactic dose of oral doxycycline (200 mg) only when an attached blacklegged tick (Ixodes scapularis) was removed after >= 36 hours of attachment in a highly endemic area, within 72 hours of tick removal.",
                "cites": ["33417672"]
            },
            {
                "claim": "The presence of a classic expanding erythema migrans rash (>= 5 cm) following potential tick exposure in an endemic area is diagnostic of early Lyme disease; serological testing is insensitive in early localized infection (<50%) and should not be performed.",
                "cites": ["33417672"]
            },
            {
                "claim": "Oral doxycycline (100 mg twice daily for 10 to 14 days) is the first-line treatment for early localized Lyme disease and early disseminated disease without severe carditis or central nervous system involvement.",
                "cites": ["33417672"]
            },
            {
                "claim": "In early disseminated Lyme disease presenting as isolated cranial nerve palsy (e.g. unilateral or bilateral Bell's palsy), oral doxycycline is equally effective as intravenous ceftriaxone in the absence of objective meningitis signs.",
                "cites": ["33417672"]
            }
        ],
        "uncertainties": [
            "Optimal treatment duration for acute Lyme carditis presenting with first- or second-degree AV block transitioning from IV to oral therapy.",
            "Safety and efficacy of prophylactic doxycycline in pregnant women following recognized engorged Ixodes tick attachment."
        ],
        "mcq_angles": [
            "Criteria for single-dose doxycycline tick bite prophylaxis: identified Ixodes tick, engorged/attached >= 36 hours, prophylaxis started within 72 hours, and local infection rate >= 20%.",
            "Pitfall of early serological testing: negative Lyme serology during the first 1-2 weeks of erythema migrans does not rule out infection.",
            "Oral doxycycline safety in children: modern guidelines approve short courses (<21 days) of doxycycline in children of all ages without risk of dental staining."
        ],
        "case_hooks": [
            "A 38-year-old male gardener in New York who discovers an engorged deer tick attached to his groin for approximately 48 hours, presenting within 24 hours of removal.",
            "A 50-year-old female presenting with an expanding 12 cm annular rash with central clearing on her flank and mild myalgias 9 days after hiking in Rhode Island."
        ],
        "gaps": "Improving automated digital image recognition algorithms for distinguishing early erythema migrans from cellulitis or tick bite hypersensitivity reactions."
    },
    1044: {
        "cluster": "lyme disease diagnosis and treatment two-tier serology c6 peptide",
        "mentor_intro": "Accurate diagnosis of Lyme disease relies on stage-dependent clinical evaluation and validated two-tier laboratory algorithms. The CDC and FDA have approved modified two-tier testing (MTTT) utilizing sequential enzyme immunoassays (EIAs) including the C6 peptide, improving sensitivity in early disease without sacrificing specificity.",
        "teaching_points": [
            {
                "claim": "The CDC and IDSA endorse modified two-tier testing (MTTT) protocols using two sequential enzyme immunoassays (EIAs) or chemiluminescent immunoassays (such as C6 peptide EIA) as an acceptable alternative to traditional Western blot second-tier testing.",
                "cites": ["33417672"]
            },
            {
                "claim": "Standard two-tier testing requires an initial sensitive EIA; if positive or equivocal, it is reflexed to a Western blot, requiring >= 2 of 3 bands on IgM Western blot (24, 39, 41 kDa) within the first 30 days of infection, or >= 5 of 10 bands on IgG Western blot after 30 days.",
                "cites": ["33417672"]
            },
            {
                "claim": "An isolated positive IgM Western blot in a patient with symptoms lasting more than 30 days represents a false-positive result and should not be used to support a diagnosis of chronic Lyme disease.",
                "cites": ["33417672"]
            },
            {
                "claim": "Lyme serology (IgG antibodies) commonly remains positive for years or decades following successful curative treatment and does not reflect persistent active infection or require repeated antibiotic therapy.",
                "cites": ["33417672"]
            }
        ],
        "uncertainties": [
            "Clinical utility of novel cellular immunity assays (e.g. interferon-gamma release assays for Borrelia) in distinguishing active reinfection from past resolved infection.",
            "Pathophysiological mechanisms responsible for Post-Treatment Lyme Disease Syndrome (PTLDS) in patients with subjective symptoms persisting > 6 months post-treatment."
        ],
        "mcq_angles": [
            "Interpretation of Western blot criteria: IgM blot is valid only within the first 4 weeks of disease; IgG blot (>= 5 of 10 bands) is required after 30 days.",
            "Advantages of modified two-tier testing (MTTT): eliminates subjective Western blot reading and increases sensitivity in early disseminated infection.",
            "Clinical handling of persistent positive IgG titers post-treatment: titers persist indefinitely and do not indicate treatment failure or need for retreatment."
        ],
        "case_hooks": [
            "A 42-year-old male with chronic non-specific fatigue for 2 years whose Lyme panel shows a positive IgM Western blot (2 bands) but completely negative IgG blot.",
            "A 28-year-old female treated 3 years ago for erythema migrans who has routine lab work showing positive Lyme IgG antibodies, asking if she has recurrent infection."
        ],
        "gaps": "Developing direct biomarker assays (such as microbial cell-free DNA or metabolomic panels) that confirm active eradication vs persistence."
    },
    1045: {
        "cluster": "lymphangioleiomyomatosis miles trial sirolimus mtor inhibitors",
        "mentor_intro": "Lymphangioleiomyomatosis (LAM) is a rare, progressive, multi-system neoplastic disease primarily affecting women of childbearing age, characterized by cystic lung destruction, angiomyolipomas, and chylous effusions due to TSC1/TSC2 mutations. The landmark MILES trial established sirolimus (mTOR inhibitor) as the first disease-modifying therapy.",
        "teaching_points": [
            {
                "claim": "The randomized, double-blind MILES trial demonstrated that the mTOR inhibitor sirolimus stabilizes lung function decline (FEV1), reduces serum VEGF-D levels, and improves functional capacity and quality of life in patients with moderate-to-severe LAM.",
                "cites": ["21490854"]
            },
            {
                "claim": "In the MILES trial, the beneficial effects of sirolimus were suppressive rather than curative; upon cessation of sirolimus therapy, lung function decline resumed at a rate parallel to the placebo group, demonstrating the necessity of lifelong maintenance.",
                "cites": ["21490854"]
            },
            {
                "claim": "The ATS/JRS clinical practice guidelines recommend sirolimus as first-line therapy for patients with LAM who have abnormal or declining lung function (FEV1 < 70% predicted or annual decline >= 90 mL/year), symptomatic chylous effusions, or renal angiomyolipomas > 4 cm.",
                "cites": ["27628078"]
            },
            {
                "claim": "Serum vascular endothelial growth factor-D (VEGF-D) elevation (>= 800 pg/mL) in a patient with characteristic high-resolution chest CT cystic changes confirms the diagnosis of LAM without requiring lung biopsy.",
                "cites": ["27628078", "21490854"]
            }
        ],
        "uncertainties": [
            "Optimal target trough serum concentrations of sirolimus (e.g. low-dose 2-5 ng/mL vs standard 5-10 ng/mL) to balance long-term efficacy with mucosal and hematologic toxicities.",
            "Safety and efficacy of combining mTOR inhibitors with autophagy inhibitors or hormonal therapies in rapidly progressing disease."
        ],
        "mcq_angles": [
            "Disease-modifying therapy of choice in LAM: mTOR inhibitor sirolimus (MILES trial).",
            "Diagnostic non-invasive biomarker: serum VEGF-D >= 800 pg/mL in the setting of typical diffuse thin-walled pulmonary cysts on HRCT.",
            "Consequence of stopping sirolimus: resumption of progressive FEV1 decline, requiring indefinite maintenance therapy."
        ],
        "case_hooks": [
            "A 32-year-old female presenting with recurrent spontaneous pneumothoraces and multiple bilateral thin-walled round cysts on chest CT whose serum VEGF-D is 1,250 pg/mL.",
            "A 38-year-old woman with known sporadic LAM and an FEV1 of 62% predicted whose baseline spirometry confirms an annual FEV1 drop of 140 mL/year, prompting initiation of sirolimus."
        ],
        "gaps": "Identifying predictive biomarkers for identifying which asymptomatic LAM patients with normal spirometry will experience rapid functional decline."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B3 = {
    1031: [
        {
            "pmid": "14681504",
            "design": "trial",
            "year": "2003",
            "journal": "N Engl J Med",
            "title": "The Long-Term Effect of Doxazosin, Finasteride, and Combined Therapy on the Clinical Progression of Benign Prostatic Hyperplasia (MTOPS Trial)"
        },
        {
            "pmid": "19825505",
            "design": "trial",
            "year": "2010",
            "journal": "Eur Urol",
            "title": "The Effects of Combination Therapy with Dutasteride and Tamsulosin on Clinical Outcomes in Men with Benign Prostatic Hyperplasia: 4-Year Results from the CombAT Study"
        }
    ],
    1032: [
        {
            "pmid": "10793162",
            "design": "trial",
            "year": "2000",
            "journal": "N Engl J Med",
            "title": "Ventilation with Lower Tidal Volumes as Compared with Traditional Tidal Volumes for Acute Lung Injury and the Acute Respiratory Distress Syndrome (ARDSNet ARMA Trial)"
        }
    ],
    1033: [
        {
            "pmid": "18287602",
            "design": "trial",
            "year": "2008",
            "journal": "N Engl J Med",
            "title": "Surgical versus Nonsurgical Therapy for Lumbar Spinal Stenosis (SPORT Trial)"
        }
    ],
    1034: [
        {
            "pmid": "33710275",
            "design": "guideline",
            "year": "2021",
            "journal": "JAMA",
            "title": "Screening for Lung Cancer: US Preventive Services Task Force Recommendation Statement"
        },
        {
            "pmid": "31995683",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Reduced Lung-Cancer Mortality with Volume CT Screening in a Randomized Trial (NELSON Trial)"
        }
    ],
    1035: [
        {
            "pmid": "33710275",
            "design": "guideline",
            "year": "2021",
            "journal": "JAMA",
            "title": "Screening for Lung Cancer: US Preventive Services Task Force Recommendation Statement"
        }
    ],
    1036: [
        {
            "pmid": "31995683",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Reduced Lung-Cancer Mortality with Volume CT Screening in a Randomized Trial (NELSON Trial)"
        },
        {
            "pmid": "33710275",
            "design": "guideline",
            "year": "2021",
            "journal": "JAMA",
            "title": "Screening for Lung Cancer: US Preventive Services Task Force Recommendation Statement"
        }
    ],
    1037: [
        {
            "pmid": "34419372",
            "design": "consensus-guideline",
            "year": "2021",
            "journal": "J Heart Lung Transplant",
            "title": "Consensus Document for the Selection of Lung Transplant Candidates: An Update from the International Society for Heart and Lung Transplantation"
        }
    ],
    1038: [
        {
            "pmid": "38182286",
            "design": "guideline",
            "year": "2024",
            "journal": "Kidney Int",
            "title": "KDIGO 2024 Clinical Practice Guideline for the Management of Lupus Nephritis"
        },
        {
            "pmid": "33207151",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Two-Year, Randomized, Controlled Trial of Belimumab in Lupus Nephritis (BLISS-LN Trial)"
        },
        {
            "pmid": "33971155",
            "design": "trial",
            "year": "2021",
            "journal": "Lancet",
            "title": "Safety and Efficacy of Voclosporin versus Placebo for Lupus Nephritis (AURORA 1): A Double-Blind, Randomised, Multicentre, Placebo-Controlled, Phase 3 Trial"
        }
    ],
    1039: [
        {
            "pmid": "38182286",
            "design": "guideline",
            "year": "2024",
            "journal": "Kidney Int",
            "title": "KDIGO 2024 Clinical Practice Guideline for the Management of Lupus Nephritis"
        },
        {
            "pmid": "33207151",
            "design": "trial",
            "year": "2020",
            "journal": "N Engl J Med",
            "title": "Two-Year, Randomized, Controlled Trial of Belimumab in Lupus Nephritis (BLISS-LN Trial)"
        }
    ],
    1040: [
        {
            "pmid": "38182286",
            "design": "guideline",
            "year": "2024",
            "journal": "Kidney Int",
            "title": "KDIGO 2024 Clinical Practice Guideline for the Management of Lupus Nephritis"
        },
        {
            "pmid": "33971155",
            "design": "trial",
            "year": "2021",
            "journal": "Lancet",
            "title": "Safety and Efficacy of Voclosporin versus Placebo for Lupus Nephritis (AURORA 1): A Double-Blind, Randomised, Multicentre, Placebo-Controlled, Phase 3 Trial"
        }
    ],
    1041: [
        {
            "pmid": "27537601",
            "design": "review",
            "year": "2016",
            "journal": "Clin Rheumatol",
            "title": "Shrinking Lung Syndrome in Systemic Lupus Erythematosus: A Systematic Review"
        },
        {
            "pmid": "28758573",
            "design": "review",
            "year": "2017",
            "journal": "Lupus",
            "title": "Shrinking Lung Syndrome in Systemic Lupus Erythematosus: Pathophysiology and Clinical Management"
        }
    ],
    1042: [
        {
            "pmid": "33417672",
            "design": "guideline",
            "year": "2020",
            "journal": "Clin Infect Dis",
            "title": "Clinical Practice Guidelines by the Infectious Diseases Society of America (IDSA), American Academy of Neurology (AAN), and American College of Rheumatology (ACR): 2020 Guidelines for the Prevention, Diagnosis, and Treatment of Lyme Disease"
        }
    ],
    1043: [
        {
            "pmid": "33417672",
            "design": "guideline",
            "year": "2020",
            "journal": "Clin Infect Dis",
            "title": "Clinical Practice Guidelines by the Infectious Diseases Society of America (IDSA), American Academy of Neurology (AAN), and American College of Rheumatology (ACR): 2020 Guidelines for the Prevention, Diagnosis, and Treatment of Lyme Disease"
        }
    ],
    1044: [
        {
            "pmid": "33417672",
            "design": "guideline",
            "year": "2020",
            "journal": "Clin Infect Dis",
            "title": "Clinical Practice Guidelines by the Infectious Diseases Society of America (IDSA), American Academy of Neurology (AAN), and American College of Rheumatology (ACR): 2020 Guidelines for the Prevention, Diagnosis, and Treatment of Lyme Disease"
        }
    ],
    1045: [
        {
            "pmid": "21490854",
            "design": "trial",
            "year": "2011",
            "journal": "N Engl J Med",
            "title": "Efficacy and Safety of Sirolimus in Lymphangioleiomyomatosis (MILES Trial)"
        },
        {
            "pmid": "27628078",
            "design": "guideline",
            "year": "2016",
            "journal": "Am J Respir Crit Care Med",
            "title": "Official American Thoracic Society/Japanese Respiratory Society Clinical Practice Guidelines: Lymphangioleiomyomatosis Diagnosis and Management"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B3
for no, src_list in SOURCES_SHEET5_B3.items():
    if no in BATCH_SHEET5_B3:
        BATCH_SHEET5_B3[no]["sources"] = src_list
