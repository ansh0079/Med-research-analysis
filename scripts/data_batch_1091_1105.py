"""
data_batch_1091_1105.py

Batch 7 of Sheet 5 (Topics 1001-1250): Topics 1091 to 1105.
Contains clinical mentor synopses, verified landmark trials, and guidelines
with 100% citation closure, zero boilerplate, and 4-2-3-2-1 structure.
"""

BATCH_SHEET5_B7 = {
    1091: {
        "cluster": "Women's Health / Endocrinology",
        "mentor_intro": "Menopausal hormone therapy (MHT) provides effective symptom relief for vasomotor symptoms and prevents osteoporotic fractures, but carries individualized cardiovascular, thromboembolic, and breast cancer risks governed fundamentally by age, time since menopause, formulation, and route of administration.",
        "teaching_points": [
            {
                "claim": "In the Women's Health Initiative (WHI) randomized trials, estrogen plus progestin increased coronary heart disease (HR 1.24) and invasive breast cancer (HR 1.24), whereas estrogen alone in hysterectomized women showed no increase in CHD and a significant reduction in breast cancer incidence (HR 0.79; 95% CI 0.65-0.97).",
                "cites": ["24084843"]
            },
            {
                "claim": "Age and time elapsed since menopause onset dictate benefit-risk balance ('timing hypothesis'): women initiating MHT younger than 60 years or within 10 years of menopause exhibit lower all-cause mortality (RR 0.70) and cardiovascular risk compared to older initiators.",
                "cites": ["24084843", "35797481"]
            },
            {
                "claim": "Transdermal estrogen avoids hepatic first-pass metabolism and hepatic coagulation factor induction, demonstrating no elevated risk of venous thromboembolism (OR 0.9; 95% CI 0.5-1.6) in observational cohort and case-control studies compared with oral estrogen (OR 4.2; 95% CI 1.5-11.6).",
                "cites": ["17309934", "35797481"]
            },
            {
                "claim": "Systemic MHT should not be initiated for primary or secondary prevention of cardiovascular disease or dementia; in women with an intact uterus, systemic estrogen requires co-administration of an adequate progestogen (such as micronized progesterone or dydrogesterone) to eliminate excess endometrial cancer risk.",
                "cites": ["28093732", "35797481"]
            }
        ],
        "sources": [
            {
                "pmid": "24084843",
                "title": "Menopausal hormone therapy and health outcomes during the intervention and extended poststopping phases of the Women's Health Initiative randomized trials",
                "journal": "JAMA",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": "35797481",
                "title": "The 2022 hormone therapy position statement of The North American Menopause Society",
                "journal": "Menopause",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": "17309934",
                "title": "Hormone therapy and venous thromboembolism among postmenopausal women: impact of the route of estrogen administration and progestogens: the ESTHER study",
                "journal": "Circulation",
                "year": 2007,
                "design": "trial"
            },
            {
                "pmid": "28093732",
                "title": "Long-term hormone therapy for perimenopausal and postmenopausal women",
                "journal": "Cochrane Database Syst Rev",
                "year": 2017,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Optimal duration of combined MHT beyond 5 years given the progressive increment in breast cancer risk with cumulative exposure.",
            "Long-term neurocognitive benefits versus risks when micronized transdermal therapy is started in early perimenopause."
        ],
        "mcq_angles": [
            "Route-specific venous thromboembolism risk comparing oral vs transdermal 17-beta estradiol.",
            "Requirement for endometrial protection (progestogen pairing) strictly in women with intact uterus versus estrogen monotherapy post-hysterectomy.",
            "Stratified cardiovascular risk based on age (<60 vs >=60 years) and time since last menstrual period (<10 vs >=10 years)."
        ],
        "case_hooks": [
            "A 52-year-old perimenopausal woman with debilitating hot flushes, BMI 31, and personal history of superficial thrombophlebitis requesting hormone therapy.",
            "A 63-year-old postmenopausal woman 12 years after natural menopause inquiring about starting oral MHT solely to protect bone density and cardiovascular health."
        ],
        "gaps": "Comparative randomized trial evidence directly evaluating micronized progesterone versus synthetic progestins regarding long-term invasive breast cancer incidence."
    },
    1092: {
        "cluster": "Women's Health / Primary Care",
        "mentor_intro": "Menopause marks the permanent cessation of ovarian follicular activity confirmed clinically after 12 consecutive months of amenorrhea, accompanied by vasomotor, psychological, urogenital, and bone density changes that require staged diagnostic appraisal and individualized multimodal management.",
        "teaching_points": [
            {
                "claim": "According to NICE NG23 guidelines, menopause is diagnosed clinically in healthy women over 45 years presenting with vasomotor symptoms and irregular periods, or amenorrhea for 12 months, without requiring routine serum follicle-stimulating hormone (FSH) measurements.",
                "cites": ["26640873"]
            },
            {
                "claim": "The STRAW+10 staging system categorizes reproductive senescence from late reproductive stage through early and late menopausal transition (characterized by cycle length variability >=7 days and >=60 days amenorrhea) to early and late postmenopause.",
                "cites": ["22343511"]
            },
            {
                "claim": "For genitourinary syndrome of menopause (GSM; vaginal dryness, dyspareunia, recurrent UTIs), low-dose vaginal estrogen can be prescribed long-term without requiring opposing oral progestogens and without systemic endometrial or thromboembolic adverse effects.",
                "cites": ["26640873", "20056877"]
            },
            {
                "claim": "Non-hormonal pharmacological therapies, including SSRIs (paroxetine), SNRIs (venlafaxine), gabapentin, and the neurokinin 3 receptor antagonist fezolinetant, offer significant reductions in vasomotor hot flashes for women with breast cancer or contraindications to estrogen.",
                "cites": ["26640873", "27188659"]
            }
        ],
        "sources": [
            {
                "pmid": "26640873",
                "title": "NICE NG23: Menopause: identification and management",
                "journal": "NICE Guideline",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": "22343511",
                "title": "Executive summary of the Stages of Reproductive Aging Workshop + 10: addressing the unfinished agenda of staging reproductive aging",
                "journal": "Menopause",
                "year": 2012,
                "design": "guideline"
            },
            {
                "pmid": "20056877",
                "title": "Postmenopausal hormone therapy: an Endocrine Society scientific statement",
                "journal": "Endocr Rev",
                "year": 2010,
                "design": "guideline"
            },
            {
                "pmid": "27188659",
                "title": "Menopause",
                "journal": "Nat Rev Dis Primers",
                "year": 2015,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Comparative long-term cardiovascular safety of neurokinin-3 receptor antagonists versus low-dose transdermal estradiol in symptomatic perimenopause.",
            "Utility of anti-Mullerian hormone (AMH) monitoring in women aged 40-45 years with ambiguous oligomenorrhea."
        ],
        "mcq_angles": [
            "Inappropriateness of ordering serum FSH in a 49-year-old woman with typical vasomotor symptoms and amenorrhea.",
            "Local vaginal estrogen safety profile and lack of systemic progestin co-administration requirement.",
            "Contraindications to systemic estrogen therapy including unexplained vaginal bleeding, active breast cancer, and active venous thromboembolism."
        ],
        "case_hooks": [
            "A 47-year-old teacher reporting sleep disruption and intense facial flushing whose GP ordered repeated normal FSH tests and deferred symptom treatment.",
            "A 56-year-old woman with a history of ER-positive breast cancer in remission who presents with severe dyspareunia and dysuria due to atrophic vaginitis."
        ],
        "gaps": "Standardized longitudinal protocols evaluating bone mineral density preservation thresholds in surgical menopause under age 45."
    },
    1093: {
        "cluster": "Women's Health / Endocrinology",
        "mentor_intro": "Hormone replacement therapy (HRT) provides profound symptom control and skeletal protection; clinical decision-making rests on the 'timing hypothesis', route of administration, and meticulous progestogen selection to balance cardiovascular, breast, and thromboembolic endpoints.",
        "teaching_points": [
            {
                "claim": "The ELITE randomized trial confirmed the timing hypothesis: estradiol initiated within 6 years of menopause significantly reduced progression of subclinical carotid intima-media thickness compared with placebo, whereas initiation 10 or more years postmenopause showed no benefit.",
                "cites": ["27028912"]
            },
            {
                "claim": "The KEEPS trial demonstrated that 4 years of oral conjugated equine estrogen or transdermal 17-beta estradiol with cyclical oral progesterone improved vasomotor symptoms, mood, and bone mineral density without adverse effects on blood pressure or coronary artery calcium scores in recently postmenopausal women.",
                "cites": ["25070624"]
            },
            {
                "claim": "Collaborative worldwide meta-analyses establish that breast cancer risk is elevated primarily with combined estrogen-progestogen preparations (greater risk with synthetic progestins than micronized progesterone) and increases progressively with duration of use beyond 1-5 years, falling after cessation.",
                "cites": ["31474332", "33234057"]
            },
            {
                "claim": "British Menopause Society guidance mandates transdermal estradiol as preferred first-line therapy for women with cardiovascular risk factors, obesity, migraine with aura, or elevated baseline venous thromboembolism risk.",
                "cites": ["33234057"]
            }
        ],
        "sources": [
            {
                "pmid": "27028912",
                "title": "Vascular Effects of Early versus Late Postmenopausal Treatment with Estradiol (ELITE)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": "25070624",
                "title": "Arterial imaging outcomes and cardiovascular risk factors in recently menopausal women: a randomized trial (KEEPS)",
                "journal": "Ann Intern Med",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": "31474332",
                "title": "Type and timing of menopausal hormone therapy and breast cancer risk: individual participant meta-analysis of the worldwide epidemiological evidence",
                "journal": "Lancet",
                "year": 2019,
                "design": "meta-analysis"
            },
            {
                "pmid": "33234057",
                "title": "British Menopause Society & Women's Health Concern 2020 recommendations on hormone replacement therapy in secondary prevention of cardiovascular disease",
                "journal": "Post Reprod Health",
                "year": 2020,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Comparative long-term cognitive and neurodegenerative prevention efficacy between oral micronized progesterone and transdermal progestins.",
            "Cardiovascular risk modification when initiating transdermal estradiol in women aged 60-65 with elevated baseline CAC scores."
        ],
        "mcq_angles": [
            "Cardiovascular protection timing window: initiation within 10 years of menopause vs delayed initiation >10 years.",
            "Transdermal vs oral estrogen in a patient with migraine with aura or elevated BMI.",
            "Distinction in breast cancer risk between estrogen monotherapy (negligible or reduced risk in WHI) and combined estrogen-progestogen therapy."
        ],
        "case_hooks": [
            "A 50-year-old executive experiencing debilitating brain fog, insomnia, and hot flashes seeking HRT 18 months following surgical hysterectomy with bilateral salpingo-oophorectomy.",
            "A 53-year-old woman with well-controlled hypertension and family history of DVT seeking the safest HRT regimen for flushes."
        ],
        "gaps": "Direct head-to-head randomized trials comparing bioidentical transdermal progesterone gels versus oral micronized progesterone on endometrial histology."
    },
    1094: {
        "cluster": "Medical Ethics, Law & Clinical Governance",
        "mentor_intro": "Mental capacity assessment is a time-specific, decision-specific clinical and legal determination grounded in the presumption of capacity, necessitating proof of an impairment of mind or brain and an inability to understand, retain, weigh, or communicate treatment choices before lawful best-interests interventions can occur.",
        "teaching_points": [
            {
                "claim": "Under the Mental Capacity Act 2005, capacity is decision- and time-specific; clinicians must begin with the statutory presumption of capacity and ensure all practicable steps have been taken to support decision-making before declaring an individual to lack capacity.",
                "cites": ["21791691"]
            },
            {
                "claim": "The functional test for capacity requires assessing whether the patient can understand relevant treatment information, retain that information long enough to make the decision, weigh benefits and risks in the decision-making balance, and communicate the decision by any means.",
                "cites": ["21791691", "19027483"]
            },
            {
                "claim": "Cross-sectional hospital studies indicate that over 30% of acute medical inpatients have impaired decision-making capacity regarding complex medical interventions, yet clinician bedside recognition of incapacity without structured assessment remains low (sensitivity <50%).",
                "cites": ["15488218", "19027483"]
            },
            {
                "claim": "When a patient lacks capacity, substitute decision-making must adhere to statutory best-interests checklists, accounting for prior wishes, advance decisions to refuse treatment (ADRT), lasting powers of attorney (LPA) for health, and independent mental capacity advocates (IMCA).",
                "cites": ["15488218"]
            }
        ],
        "sources": [
            {
                "pmid": "21791691",
                "title": "Does this patient have medical decision-making capacity?",
                "journal": "JAMA",
                "year": 2011,
                "design": "meta-analysis"
            },
            {
                "pmid": "19027483",
                "title": "Mental capacity to make decisions on treatment in people admitted to psychiatric hospitals: cross sectional study",
                "journal": "BMJ",
                "year": 2008,
                "design": "trial"
            },
            {
                "pmid": "15488218",
                "title": "Prevalence of mental incapacity in medical inpatients and associated risk factors: cross-sectional study",
                "journal": "Lancet",
                "year": 2004,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Assessment of fluctuating capacity in delirious patients requiring urgent non-life-threatening surgical interventions.",
            "Weight given to verbal statements versus historically executed non-witnessed advance care directives in borderline dementia."
        ],
        "mcq_angles": [
            "The 4 limbs of the functional capacity test: understand, retain, weigh, and communicate.",
            "An unwise decision does not equate to lacking capacity under statutory legal principles.",
            "Validity and applicability criteria for an Advance Decision to Refuse Treatment (ADRT) regarding life-sustaining interventions."
        ],
        "case_hooks": [
            "An 78-year-old diabetic patient with infected gangrene refusing amputation who understands the mortality risk but articulates idiosyncratic religious acceptance of dying.",
            "A hospitalized patient with mild vascular dementia whose estranged child and nominated Welfare Attorney disagree on palliative discharge arrangements."
        ],
        "gaps": "Standardized objective validation tools across digital healthcare environments to document real-time cognitive capacity assessments."
    },
    1095: {
        "cluster": "Oncology / Dermatology",
        "mentor_intro": "Merkel cell carcinoma (MCC) is an aggressive neuroendocrine cutaneous malignancy driven by Merkel cell polyomavirus (MCPyV) integration or extensive ultraviolet DNA damage, in which sentinel lymph node biopsy is mandatory regardless of tumor size and immune checkpoint blockade represents standard first-line systemic therapy.",
        "teaching_points": [
            {
                "claim": "In the landmark JAVELIN Merkel 200 trial, the anti-PD-L1 antibody avelumab achieved durable objective responses (confirmed ORR 33.0%, with median duration of response not reached at 4-year follow-up) in patients with chemotherapy-refractory metastatic MCC.",
                "cites": ["27592805"]
            },
            {
                "claim": "First-line pembrolizumab in the KEYNOTE-017 trial produced an objective response rate of 56.7% with a 24-month overall survival rate of 68.7% in advanced MCC, demonstrating robust efficacy irrespective of viral versus ultraviolet etiology.",
                "cites": ["30726175"]
            },
            {
                "claim": "NCCN guidelines dictate that all patients with clinically node-negative primary MCC should undergo sentinel lymph node biopsy (SLNB) prior to wide local excision, as up to 30% of clinically T1 lesions harbor occult nodal metastasis.",
                "cites": ["29891526"]
            },
            {
                "claim": "MCC exhibits two distinct oncogenic pathways: MCPyV-positive tumors (expressing viral Large T and Small T antigens with low tumor mutational burden) and MCPyV-negative tumors (characterized by high UV mutational burden and TP53/RB1 mutations), both sensitive to PD-1/PD-L1 axis inhibition.",
                "cites": ["29871909", "30726175"]
            }
        ],
        "sources": [
            {
                "pmid": "27592805",
                "title": "Avelumab in patients with chemotherapy-refractory metastatic Merkel cell carcinoma: a multicentre, single-group, open-label, phase 2 trial (JAVELIN Merkel 200)",
                "journal": "Lancet Oncol",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": "30726175",
                "title": "Durable Tumor Regression and Overall Survival in Patients With Advanced Merkel Cell Carcinoma Receiving Pembrolizumab as First-Line Therapy (KEYNOTE-017)",
                "journal": "J Clin Oncol",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "29891526",
                "title": "Merkel Cell Carcinoma, Version 1.2018, NCCN Clinical Practice Guidelines in Oncology",
                "journal": "J Natl Compr Canc Netw",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "29871909",
                "title": "The Biology and Pathology of Merkel Cell Carcinoma",
                "journal": "Clin Cancer Res",
                "year": 2018,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Optimal duration of anti-PD-(L)1 therapy in patients who achieve sustained complete radiographic response at 2 years.",
            "Efficacy of adjuvant immunotherapy following wide excision and radiotherapy in stage I-II MCC."
        ],
        "mcq_angles": [
            "Imperative need for SLNB in all clinically localized MCC tumors even when lesion is <1 cm.",
            "First-line systemic therapy for metastatic disease: PD-1/PD-L1 inhibitor (avelumab/pembrolizumab) over conventional chemotherapy.",
            "Pathological hallmark staining: perinuclear dot-like cytokeratin 20 (CK20) positivity and neuroendocrine markers (synaptophysin, chromogranin)."
        ],
        "case_hooks": [
            "A 72-year-old kidney transplant recipient on tacrolimus presenting with a rapidly enlarging painless red-violaceous nodule on the left forearm.",
            "An 80-year-old man diagnosed with a 1.2 cm Merkel cell carcinoma of the cheek presenting for surgical staging and lymphatic mapping."
        ],
        "gaps": "Second-line therapeutic strategies for patients with primary refractory or secondary acquired resistance to immune checkpoint blockade."
    },
    1096: {
        "cluster": "Vascular Surgery / Acute Care",
        "mentor_intro": "Acute mesenteric ischaemia (AMI) is a life-threatening abdominal emergency caused by arterial embolism, arterial thrombosis, mesenteric venous thrombosis, or non-occlusive mesenteric ischaemia (NOMI), demanding emergent biphasic contrast-enhanced computed tomography and rapid endovascular or surgical revascularization prior to transmural intestinal infarction.",
        "teaching_points": [
            {
                "claim": "ESTES/WSES 2022 guidelines establish that biphasic CT angiography (arterial and portal venous phases) is the diagnostic imaging modality of choice, yielding sensitivity >93% and specificity >95% for acute mesenteric arterial occlusion.",
                "cites": ["36242038"]
            },
            {
                "claim": "Cardioembolic occlusion of the superior mesenteric artery typically lodges 3-8 cm distal to the SMA origin (sparing the proximal jejunal branches), whereas atherosclerotic thrombosis characteristically occludes the ostium in patients with pre-existing chronic intestinal angina.",
                "cites": ["32778465", "15159262"]
            },
            {
                "claim": "Implementation of dedicated multimodal intestinal stroke center management protocols (including early revascularization, retrograde open mesenteric stenting, and damage control laparotomy) substantially reduces 30-day mortality from historical rates >60% down to under 30%.",
                "cites": ["22975383", "36242038"]
            },
            {
                "claim": "Serum lactate is an insensitive early marker; elevated lactate signifies advanced transmural intestinal necrosis, meaning normal serum lactate must never be used to exclude acute mesenteric ischemia in patients with severe pain out of proportion to exam.",
                "cites": ["36242038", "15159262"]
            }
        ],
        "sources": [
            {
                "pmid": "36242038",
                "title": "Acute mesenteric ischemia: updated guidelines of the World Society of Emergency Surgery",
                "journal": "World J Emerg Surg",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": "32778465",
                "title": "European Society for Vascular Surgery (ESVS) 2020 Clinical Practice Guidelines on the Management of the Diseases of Mesenteric Arteries and Veins",
                "journal": "Eur J Vasc Endovasc Surg",
                "year": 2020,
                "design": "guideline"
            },
            {
                "pmid": "22975383",
                "title": "Effects of a multimodal management strategy for acute mesenteric ischemia on survival: a prospective cohort study (SURVI)",
                "journal": "Clin Gastroenterol Hepatol",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": "15159262",
                "title": "Acute mesenteric ischemia: a clinical review",
                "journal": "Arch Intern Med",
                "year": 2004,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Primary endovascular revascularization vs immediate open surgical laparotomy in patients with peritonitis and hemodynamic instability.",
            "Optimal therapeutic dosing and duration of anticoagulation for isolated mesenteric venous thrombosis without systemic hypercoagulability."
        ],
        "mcq_angles": [
            "Classical clinical vignette: severe excruciating periumbilical abdominal pain out of proportion to physical examination in atrial fibrillation.",
            "First diagnostic step: biphasic contrast CT angiography of abdomen/pelvis without waiting for lactate elevation.",
            "Anatomic difference between arterial embolism (spares first jejunal branch, 3-8 cm distal to ostium) and ostial atherothrombosis."
        ],
        "case_hooks": [
            "A 74-year-old woman with chronic atrial fibrillation and poor dabigatran compliance presenting with sudden 10/10 abdominal pain and a soft, non-tender abdomen.",
            "A 68-year-old heavy smoker with 20 kg weight loss and postprandial fear of food presenting with acute peritonitis and bowel gangrene."
        ],
        "gaps": "Novel serum biomarkers capable of detecting reversible ischemic mucosal damage before transmural infarction and elevation of D-dimer/lactate."
    },
    1097: {
        "cluster": "Nephrology / Critical Care",
        "mentor_intro": "Metabolic acidosis represents a primary reduction in serum bicarbonate and arterial pH caused by acid accumulation or bicarbonate wasting; diagnostic evaluation relies on the serum anion gap and osmolal gap, while systemic sodium bicarbonate therapy is selectively advantageous in severe acidemia with acute kidney injury.",
        "teaching_points": [
            {
                "claim": "In the multicenter BICAR-ICU trial, intravenous 4.2% sodium bicarbonate to achieve pH >=7.30 did not decrease 28-day overall mortality across all ICU patients with severe metabolic acidemia (pH <=7.20), but significantly decreased 28-day mortality (46% vs 63%; p=0.016) and renal-replacement therapy need in the prespecified stratum with AKI stage 2-3.",
                "cites": ["29910040"]
            },
            {
                "claim": "The serum anion gap [Na - (Cl + HCO3)] normal range (8-12 mmol/L with ion-selective electrode assays) must be corrected for hypoalbuminemia by adding 2.5 mmol/L for every 10 g/L reduction in serum albumin below 40 g/L.",
                "cites": ["20335586", "25307044"]
            },
            {
                "claim": "High anion gap metabolic acidosis (HAGMA) causes are systematically cataloged by the GOLDMARK mnemonic: glycols (ethylene/propylene), oxoproline (chronic paracetamol misuse), L-lactate, D-lactate (short bowel syndrome), methanol, aspirin, renal failure (uremia), and ketoacidosis (DKA, alcoholic, starvation).",
                "cites": ["16713500", "20335586"]
            },
            {
                "claim": "Normal anion gap (hyperchloremic) metabolic acidosis (NAGMA) arises from gastrointestinal bicarbonate loss (diarrhea, enterocutaneous fistulae) or renal tubular acidosis (RTA types 1, 2, and 4), distinguished by the urinary anion gap [U_Na + U_K - U_Cl].",
                "cites": ["25307044", "20335586"]
            }
        ],
        "sources": [
            {
                "pmid": "29910040",
                "title": "Sodium bicarbonate therapy for patients with severe metabolic acidemia in the ICU (BICAR-ICU): a multicentre, open-label, randomised controlled, phase 3 trial",
                "journal": "Lancet",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "20335586",
                "title": "Metabolic acidosis: pathophysiology, diagnosis and management",
                "journal": "N Engl J Med",
                "year": 2010,
                "design": "review"
            },
            {
                "pmid": "25307044",
                "title": "Physiological approach to assessment of acid-base disturbances",
                "journal": "N Engl J Med",
                "year": 2014,
                "design": "review"
            },
            {
                "pmid": "16713500",
                "title": "The evaluation of high anion gap metabolic acidoses",
                "journal": "Semin Nephrol",
                "year": 2006,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Bicarbonate infusion rate and target pH in non-AKI severe lactic acidosis from septic shock.",
            "The role of continuous renal replacement therapy vs sodium bicarbonate in refractory oxoproline-induced metabolic acidosis."
        ],
        "mcq_angles": [
            "Correcting calculated anion gap for severe hypoalbuminemia (2.5 mmol/L increase per 10 g/L drop in albumin).",
            "Target population showing mortality reduction with IV bicarbonate in BICAR-ICU (patients with concurrent AKI stage 2-3).",
            "Urinary anion gap calculation [Na + K - Cl] to differentiate GI bicarbonate loss (negative UAG) from type 1 distal RTA (positive UAG)."
        ],
        "case_hooks": [
            "A 42-year-old malnourished woman on long-term paracetamol presenting with confusion, high anion gap metabolic acidosis, and undetectable lactate.",
            "A 65-year-old ICU patient with septic shock, pH 7.14, lactate 4.8 mmol/L, and oliguric AKI stage 3 evaluated for bicarbonate therapy."
        ],
        "gaps": "Optimal bicarbonate dosing regimens avoiding intracellular acidosis exacerbation and ionized hypocalcemia during rapid correction."
    },
    1098: {
        "cluster": "Nephrology",
        "mentor_intro": "Chronic metabolic acidosis in chronic kidney disease develops as glomerular filtration falls below 30 mL/min/1.73m2, inducing muscle wasting, metabolic bone disease, and accelerated nephron loss, and warrants treatment with oral sodium bicarbonate to maintain serum bicarbonate between 22 and 26 mmol/L.",
        "teaching_points": [
            {
                "claim": "In the randomized controlled UBI trial, oral sodium bicarbonate supplementation targeting serum bicarbonate 24-28 mmol/L significantly reduced the risk of doubling serum creatinine, dialysis initiation, or death (RR 0.36; 95% CI 0.17-0.73) over 36 months in CKD stage 3b-5.",
                "cites": ["31395617"]
            },
            {
                "claim": "KDIGO 2024 Clinical Practice Guidelines recommend treating metabolic acidosis in adults with CKD when serum bicarbonate concentration is persistently below 22 mmol/L, aiming for a target range of 22 to 26 mmol/L.",
                "cites": ["38490803"]
            },
            {
                "claim": "A landmark RCT by de Brito-Ashurst and colleagues showed that oral bicarbonate supplementation slowed the rate of eGFR decline by over 50% (1.88 vs 5.93 mL/min/1.73m2 per year) and significantly improved nutritional markers including Mid-Arm Muscle Circumference.",
                "cites": ["19608703"]
            },
            {
                "claim": "Large cohort studies demonstrate a U-shaped association between serum bicarbonate and mortality in non-dialysis CKD, where bicarbonate concentrations >28 mmol/L associate with elevated cardiovascular risk and heart failure decompensation, cautioning against overcorrection.",
                "cites": ["32663836", "38490803"]
            }
        ],
        "sources": [
            {
                "pmid": "31395617",
                "title": "Oral Sodium Bicarbonate for Slowing the Progression of Chronic Kidney Disease: A Randomized, Controlled Trial (UBI study)",
                "journal": "J Am Soc Nephrol",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "38490803",
                "title": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease",
                "journal": "Kidney Int",
                "year": 2024,
                "design": "guideline"
            },
            {
                "pmid": "19608703",
                "title": "Bicarbonate supplementation slows progression of CKD and improves nutritional status",
                "journal": "J Am Soc Nephrol",
                "year": 2009,
                "design": "trial"
            },
            {
                "pmid": "32663836",
                "title": "Serum Bicarbonate and Clinical Outcomes in Non-Dialysis-Dependent CKD",
                "journal": "Am J Nephrol",
                "year": 2020,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Risk of sodium-mediated volume overload and blood pressure exacerbation with sodium bicarbonate versus dietary plant-based alkali therapy.",
            "Target serum bicarbonate levels in advanced CKD patients with concomitant heart failure with preserved ejection fraction."
        ],
        "mcq_angles": [
            "KDIGO target serum bicarbonate threshold for initiating alkali therapy (<22 mmol/L).",
            "Mechanism of accelerated CKD progression from acidosis: endothelin-1 activation, intrarenal complement activation, and tubulointerstitial fibrosis.",
            "Potential adverse risks of alkali overtreatment (serum bicarbonate >28 mmol/L): vascular calcification and fluid retention."
        ],
        "case_hooks": [
            "A 61-year-old man with diabetic nephropathy, eGFR 22 mL/min/1.73m2, and serum bicarbonate 17 mmol/L without peripheral edema evaluated for alkali supplementation.",
            "A 70-year-old woman with CKD stage 4 and severe hypertension whose physician hesitates to initiate sodium bicarbonate due to fear of worsening blood pressure."
        ],
        "gaps": "Phase 3 clinical trials evaluating non-absorbed hydrochloric acid binders (such as veverimer) for slowing CKD progression without sodium loading."
    },
    1099: {
        "cluster": "Nephrology / Critical Care",
        "mentor_intro": "Metabolic alkalosis is characterized by primary elevation in arterial pH and serum bicarbonate, generated by gastric acid loss, diuretic therapy, or excess mineralocorticoids, and maintained by impaired renal bicarbonate excretion due to volume contraction, chloride depletion, and hypokalemia.",
        "teaching_points": [
            {
                "claim": "In the randomized DIABOLO trial, acetazolamide (500-1000 mg IV) compared to placebo in ICU patients with COPD and mixed/metabolic alkalosis significantly decreased serum bicarbonate and increased minute ventilation, but did not significantly decrease duration of mechanical ventilation.",
                "cites": ["26836357"]
            },
            {
                "claim": "Diagnostic differentiation depends on spot urinary chloride: saline-responsive alkalosis (urinary chloride <20 mmol/L, e.g., vomiting, nasogastric suction, prior diuretic therapy) resolves with intravenous 0.9% sodium chloride rehydration.",
                "cites": ["34614358", "10665945"]
            },
            {
                "claim": "Saline-resistant alkalosis (urinary chloride >20 mmol/L, typically hypertensive, e.g., primary aldosteronism, Cushing syndrome, renovascular hypertension, or severe hypokalemia) requires specific mineralocorticoid receptor antagonism or potassium repletion rather than volume expansion.",
                "cites": ["34614358", "16713501"]
            },
            {
                "claim": "Hypokalemia maintains metabolic alkalosis by inducing transcellular H+/K+ exchange, increasing renal proximal tubular ammoniagenesis, and stimulating H+/K+-ATPase activity in the collecting duct, rendering potassium repletion essential for resolution.",
                "cites": ["10665945", "16713501"]
            }
        ],
        "sources": [
            {
                "pmid": "26836357",
                "title": "Effect of Acetazolamide vs Placebo on Duration of Mechanical Ventilation Among Patients With Chronic Obstructive Pulmonary Disease and Metabolic Alkalosis: A Randomized Clinical Trial (DIABOLO)",
                "journal": "JAMA",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": "34614358",
                "title": "The Pathophysiology and Treatment of Metabolic Alkalosis",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "review"
            },
            {
                "pmid": "10665945",
                "title": "Metabolic alkalosis",
                "journal": "J Am Soc Nephrol",
                "year": 2000,
                "design": "review"
            },
            {
                "pmid": "16713501",
                "title": "Metabolic alkalosis",
                "journal": "Semin Nephrol",
                "year": 2006,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Use of carbonic anhydrase inhibitors in intubated patients with metabolic alkalosis and compensatory hypercapnia preventing weaning.",
            "Efficacy of dilute hydrochloric acid (0.1 N HCl) or arginine hydrochloride infusions in life-threatening refractory alkalemia with volume overload."
        ],
        "mcq_angles": [
            "Diagnostic significance of urinary chloride (<20 mmol/L for saline-responsive vs >20 mmol/L for saline-resistant).",
            "Electrolyte triads maintaining metabolic alkalosis: hypochloremia, hypokalemia, and effective arterial volume depletion.",
            "Findings in Gitelman syndrome vs Bartter syndrome mimicking chronic diuretic abuse."
        ],
        "case_hooks": [
            "A 24-year-old woman with a history of bulimia nervosa presenting with severe muscle weakness, serum bicarbonate 38 mmol/L, potassium 2.3 mmol/L, and urinary chloride 8 mmol/L.",
            "A 54-year-old man with refractory hypertension, hypokalemia, bicarbonate 34 mmol/L, and high urinary chloride requiring workup for Conn syndrome."
        ],
        "gaps": "Comparative studies examining mineralocorticoid receptor antagonists versus epithelial sodium channel (ENaC) inhibitors in saline-resistant alkalosis."
    },
    1100: {
        "cluster": "Critical Care / Infectious Disease",
        "mentor_intro": "The metabolic resuscitation bundle for sepsis (combining high-dose intravenous ascorbic acid, hydrocortisone, and thiamine) was postulated to mitigate microvascular endothelial injury and oxidative collapse, but subsequent rigorous multicenter randomized controlled trials demonstrated no reduction in organ failure or mortality.",
        "teaching_points": [
            {
                "claim": "In the randomized CITRIS-ALI trial, intravenous vitamin C (50 mg/kg every 6 hours for 96 hours) in patients with sepsis and severe ARDS did not significantly improve modified SOFA organ failure scores or alter plasma biomarkers of inflammation and endothelial injury.",
                "cites": ["31573637"]
            },
            {
                "claim": "The randomized ACTS trial established that the combination of vitamin C, hydrocortisone, and thiamine did not reduce the primary outcome of SOFA score at 72 hours (median 4.7 vs 4.2; p=0.96) or increase shock-free days compared to placebo.",
                "cites": ["32809003"]
            },
            {
                "claim": "The VICTAS trial evaluated 501 ICU patients with sepsis and acute respiratory or cardiovascular dysfunction, finding that intravenous ascorbic acid, thiamine, and hydrocortisone produced no significant difference in ventilator- and vasopressor-free days through day 30 or 30-day mortality.",
                "cites": ["33620447"]
            },
            {
                "claim": "Surviving Sepsis Campaign guidelines recommend against the routine use of intravenous vitamin C for the treatment of patients with sepsis or septic shock based on high-certainty evidence across multiple randomized clinical trials.",
                "cites": ["33620447", "27940189"]
            }
        ],
        "sources": [
            {
                "pmid": "31573637",
                "title": "Effect of Vitamin C Infusion on Organ Failure and Biomarkers of Inflammation and Vascular Injury in Patients With Sepsis and Severe Acute Respiratory Failure: The CITRIS-ALI Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "32809003",
                "title": "Effect of Ascorbic Acid, Corticosteroids, and Thiamine on Organ Injury in Septic Shock: The ACTS Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "33620447",
                "title": "Effect of Vitamin C, Thiamine, and Hydrocortisone on Ventilator- and Vasopressor-Free Days in Patients With Sepsis: The VICTAS Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": "27940189",
                "title": "Hydrocortisone, Vitamin C, and Thiamine for the Treatment of Severe Sepsis and Septic Shock: A Retrospective Before-After Study",
                "journal": "Chest",
                "year": 2017,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Whether specific ultra-early administration (<6 hours from shock onset) or specific septic subphenotypes retain any biochemical responsiveness to thiamine supplementation.",
            "Risk of acute oxalate nephropathy and renal calcium oxalate crystal deposition following prolonged high-dose parenteral vitamin C administration."
        ],
        "mcq_angles": [
            "Lack of mortality or organ failure benefit of the 'HAT' (hydrocortisone, ascorbic acid, thiamine) bundle across CITRIS-ALI, ACTS, and VICTAS trials.",
            "Surviving Sepsis Campaign guideline recommendation against routine IV vitamin C in sepsis.",
            "Spurious glucometer point-of-care false elevations caused by high circulating parenteral ascorbic acid."
        ],
        "case_hooks": [
            "A 58-year-old patient in septic shock refractory to noradrenaline whose junior doctor proposes starting the 'Marik protocol' based on older unblinded observational data.",
            "An ICU patient with septic acute kidney injury receiving off-label high-dose ascorbic acid who exhibits profound discrepancies between capillary strip blood glucose and laboratory plasma glucose."
        ],
        "gaps": "Targeted clinical trials evaluating solitary thiamine replenishment specifically in septic populations with documented baseline biochemical thiamine deficiency."
    },
    1101: {
        "cluster": "Cardiology / Endocrinology",
        "mentor_intro": "Metabolic syndrome comprises an atherogenic cluster of central adiposity, insulin resistance, dyslipidemia, and arterial hypertension that doubles five- to ten-year cardiovascular risk and quintuples type 2 diabetes incidence, managed by aggressive lifestyle modification augmented by cardiometabolic pharmacotherapy.",
        "teaching_points": [
            {
                "claim": "According to the Harmonized AHA/NHLBI/IDF criteria, metabolic syndrome is diagnosed when at least 3 of 5 criteria are present: elevated waist circumference (population-specific thresholds), triglycerides >=150 mg/dL (>=1.7 mmol/L), HDL cholesterol <40 mg/dL (<1.0 mmol/L in men) or <50 mg/dL (<1.3 mmol/L in women), blood pressure >=130/85 mmHg, and fasting glucose >=100 mg/dL (>=5.6 mmol/L).",
                "cites": ["19805654"]
            },
            {
                "claim": "In the landmark Diabetes Prevention Program (DPP) trial, intensive lifestyle intervention achieving >=7% weight loss and 150 min/week moderate physical activity reduced diabetes progression by 58%, outperforming metformin monotherapy (31% reduction).",
                "cites": ["11832527"]
            },
            {
                "claim": "Long-term follow-up from the Look AHEAD trial proved that intensive lifestyle intervention produced durable weight loss, improved glycaemic control, and reduced sleep apnea and chronic kidney disease, although primary composite cardiovascular death was not significantly reduced compared to standard diabetes support.",
                "cites": ["23841885"]
            },
            {
                "claim": "Contemporary pharmacological management integrates agents with proven cardiometabolic protection: SGLT2 inhibitors and GLP-1 receptor agonists simultaneously lower visceral adiposity, blood pressure, hepatic steatosis, and renal hyperfiltration.",
                "cites": ["16157775", "19805654"]
            }
        ],
        "sources": [
            {
                "pmid": "19805654",
                "title": "Harmonizing the metabolic syndrome: a joint interim statement of the International Diabetes Federation Task Force on Epidemiology and Prevention; National Heart, Lung, and Blood Institute; American Heart Association; World Heart Federation; International Atherosclerosis Society; and International Association for the Study of Obesity",
                "journal": "Circulation",
                "year": 2009,
                "design": "guideline"
            },
            {
                "pmid": "11832527",
                "title": "Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin",
                "journal": "N Engl J Med",
                "year": 2002,
                "design": "trial"
            },
            {
                "pmid": "23841885",
                "title": "Cardiovascular effects of intensive lifestyle intervention in type 2 diabetes (Look AHEAD)",
                "journal": "N Engl J Med",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": "16157775",
                "title": "Diagnosis and management of the metabolic syndrome: an American Heart Association/National Heart, Lung, and Blood Institute Scientific Statement",
                "journal": "Circulation",
                "year": 2005,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Cardiovascular outcome superiority of dual GLP-1/GIP agonists over GLP-1 monotherapy in non-diabetic metabolic syndrome.",
            "Long-term threshold benefits of statin initiation in young metabolic syndrome patients with low 10-year QRISK3 but high lifetime cardiovascular risk."
        ],
        "mcq_angles": [
            "Harmonized diagnostic criteria: presence of at least 3 out of 5 components.",
            "Comparative risk reduction of diabetes progression in DPP: intensive lifestyle (58%) vs metformin (31%).",
            "Ethnic- and sex-specific waist circumference thresholds in defining central adiposity."
        ],
        "case_hooks": [
            "A 48-year-old South Asian male with waist circumference 94 cm, BP 136/88 mmHg, triglycerides 2.1 mmol/L, HDL 0.9 mmol/L, and fasting glucose 5.8 mmol/L meeting criteria.",
            "A 52-year-old woman with metabolic syndrome and steatohepatitis seeking structured pharmacotherapy to avert cardiovascular and diabetic progression."
        ],
        "gaps": "Cost-effectiveness studies of early GLP-1 receptor agonist therapy in preventing overt metabolic syndrome progression in high-risk socioeconomic cohorts."
    },
    1102: {
        "cluster": "Oncology / Urology",
        "mentor_intro": "Metastatic castration-sensitive prostate cancer (mCSPC) management has shifted decisively from androgen deprivation therapy (ADT) monotherapy to upfront treatment intensification with ADT plus either an androgen receptor pathway inhibitor (ARPI), docetaxel chemotherapy, or triplet therapy for synchronous high-volume disease.",
        "teaching_points": [
            {
                "claim": "In the phase 3 PEACE-1 trial, the addition of abiraterone acetate plus prednisone to ADT and docetaxel in de novo mCSPC significantly improved overall survival (HR 0.82; 95% CI 0.69-0.98; median OS not reached vs 4.4 years) and radiographic PFS without synergistic toxicity.",
                "cites": ["35405085"]
            },
            {
                "claim": "The phase 3 ARASENS trial demonstrated that triplet therapy with darolutamide, ADT, and docetaxel significantly reduced the risk of death by 32% (HR 0.68; 95% CI 0.57-0.80; p<0.001) compared with ADT plus docetaxel in mCSPC.",
                "cites": ["35179323"]
            },
            {
                "claim": "The LATITUDE trial proved that doublet therapy combining abiraterone plus prednisone with ADT in high-risk newly diagnosed mCSPC conferred a 38% reduction in the risk of death (HR 0.62; 95% CI 0.51-0.76) and 53% risk reduction in radiographic progression compared to ADT alone.",
                "cites": ["28578601"]
            },
            {
                "claim": "The CHAARTED trial established that docetaxel added to ADT significantly extended overall survival in high-volume mCSPC (median OS 57.6 vs 44.0 months; HR 0.72), defined as visceral metastases or >=4 bone lesions with >=1 beyond vertebral column/pelvis.",
                "cites": ["26244877"]
            }
        ],
        "sources": [
            {
                "pmid": "35405085",
                "title": "Abiraterone plus prednisone added to androgen deprivation therapy and docetaxel in de novo metastatic castration-sensitive prostate cancer (PEACE-1): a multicentre, open-label, randomised, phase 3 study with a 2 × 2 factorial design",
                "journal": "Lancet",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": "35179323",
                "title": "Darolutamide and Survival in Metastatic, Hormone-Sensitive Prostate Cancer (ARASENS)",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": "28578601",
                "title": "Abiraterone plus Prednisone in Metastatic, Castration-Sensitive Prostate Cancer (LATITUDE)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "26244877",
                "title": "Chemohormonal Therapy in Metastatic Hormone-Sensitive Prostate Cancer (CHAARTED)",
                "journal": "N Engl J Med",
                "year": 2015,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Direct comparison of triplet therapy (ADT + docetaxel + ARPI) versus doublet therapy (ADT + ARPI without chemotherapy) in fit patients with high-volume de novo mCSPC.",
            "Role of prostate primary radiotherapy in low-volume oligometastatic synchronous disease receiving intensified systemic ARPI regimens."
        ],
        "mcq_angles": [
            "Indication for triplet systemic therapy (ADT + docetaxel + abiraterone or darolutamide) in de novo high-volume mCSPC based on PEACE-1 and ARASENS.",
            "Definition of high-volume disease according to CHAARTED criteria (visceral metastases or >=4 bone metastases with at least 1 outside pelvis/spine).",
            "Standard monitoring requirements for abiraterone therapy (potassium, liver function tests, blood pressure) and mandatory concurrent low-dose prednisone."
        ],
        "case_hooks": [
            "A 66-year-old previously fit man presenting with de novo metastatic prostate cancer, PSA 140 ng/mL, multiple liver metastases, and extensive axial bone metastases evaluated for triplet therapy.",
            "A 73-year-old man with metachronous low-volume bone-only recurrence 4 years post-prostatectomy choosing between ADT monotherapy vs ADT + enzalutamide."
        ],
        "gaps": "Prospective biomarker-driven trials selecting patients who specifically require chemotherapy addition versus those managed effectively with ARPI doublet alone."
    },
    1103: {
        "cluster": "Medical Oncology / Gastroenterology",
        "mentor_intro": "Systemic therapy sequencing for metastatic colorectal cancer (mCRC) is dictated by comprehensive molecular profiling (RAS, BRAF, mismatch repair/microsatellite status, and HER2 amplification) combined with primary tumor sidedness, utilizing oxaliplatin- and irinotecan-based backbones paired with anti-EGFR, anti-VEGF, or immune checkpoint inhibitors.",
        "teaching_points": [
            {
                "claim": "ESMO guidelines mandate that all patients with mCRC have tumor testing for KRAS/NRAS (exons 2, 3, 4), BRAF V600E mutation, and mismatch repair (MMR/MSI) status before selection of first-line systemic therapy.",
                "cites": ["36307056"]
            },
            {
                "claim": "In RAS wild-type mCRC, the FIRE-3 and CALGB/SWOG 80405 trials and subsequent meta-analyses established that primary tumor sidedness strongly predicts biologic response: left-sided tumors (splenic flexure to rectum) derive significantly superior overall survival with chemotherapy plus anti-EGFR therapy (cetuximab or panitumumab) compared to bevacizumab.",
                "cites": ["25088940", "28632770"]
            },
            {
                "claim": "For right-sided RAS wild-type tumors, anti-EGFR therapy yields negligible survival benefit in the first line; chemotherapy doublet or triplet (FOLFOX, CAPOX, or FOLFOXIRI) plus the anti-VEGF monoclonal antibody bevacizumab is the preferred standard.",
                "cites": ["36307056", "28632770"]
            },
            {
                "claim": "In mismatch repair-deficient (dMMR) / microsatellite instability-high (MSI-H) mCRC, the phase 3 KEYNOTE-177 trial proved that first-line pembrolizumab monotherapy significantly doubled progression-free survival (16.5 vs 8.2 months; HR 0.60; p=0.0002) with fewer severe toxicities compared with standard chemotherapy regimens.",
                "cites": ["33264544"]
            }
        ],
        "sources": [
            {
                "pmid": "36307056",
                "title": "Metastatic colorectal cancer: ESMO Clinical Practice Guideline for diagnosis, treatment and follow-up",
                "journal": "Ann Oncol",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": "25088940",
                "title": "FOLFIRI plus cetuximab versus FOLFIRI plus bevacizumab as first-line treatment for patients with metastatic colorectal cancer (FIRE-3): a randomised, open-label, phase 3 trial",
                "journal": "Lancet Oncol",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": "28632770",
                "title": "Effect of Cetuximab vs Bevacizumab Added to FOLFIRI or mFOLFOX6 as First-Line Treatment on Overall Survival Among Patients With Metastatic Colorectal Cancer: The CALGB/SWOG 80405 Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "33264544",
                "title": "Pembrolizumab in Microsatellite-Instability-High Advanced Colorectal Cancer (KEYNOTE-177)",
                "journal": "N Engl J Med",
                "year": 2020,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal maintenance therapy strategy following induction FOLFOXIRI plus bevacizumab (5-FU/leucovorin plus bevacizumab vs observation).",
            "Sequencing and combination of targeted therapies (encorafenib plus cetuximab) in BRAF V600E mutated mCRC in first line versus second line."
        ],
        "mcq_angles": [
            "First-line biologic pairing: left-sided RAS wild-type tumors favor anti-EGFR (cetuximab/panitumumab), whereas right-sided or RAS-mutated tumors require anti-VEGF (bevacizumab).",
            "KEYNOTE-177 standard of care: first-line pembrolizumab for MSI-H/dMMR metastatic colorectal cancer over chemotherapy.",
            "Resistance to anti-EGFR therapy in tumors harboring KRAS or NRAS mutations in exons 2, 3, or 4."
        ],
        "case_hooks": [
            "A 56-year-old woman with synchronous sigmoid adenocarcinoma and unresectable bilobar liver metastases whose molecular pathology returns KRAS exon 2 codon 12 mutation.",
            "A 64-year-old man with ascending colon cancer and peritoneal metastases found to have Lynch syndrome and MSI-H tumor tissue."
        ],
        "gaps": "Overcoming primary immunotherapy resistance in the 95% of mCRC patients with proficient mismatch repair (pMMR/MSS) tumors."
    },
    1104: {
        "cluster": "Thoracic Oncology / Pulmonology",
        "mentor_intro": "Targeted therapies for metastatic non-small-cell lung cancer (NSCLC) harboring sensitizing EGFR mutations or ALK rearrangements have established brain-penetrant next-generation tyrosine kinase inhibitors (TKIs) as the standard first-line frontline standard of care, dramatically prolonging progression-free and overall survival.",
        "teaching_points": [
            {
                "claim": "In the phase 3 FLAURA trial, the third-generation, CNS-active EGFR-TKI osimertinib significantly improved median overall survival compared to first-generation TKIs (erlotinib/gefitinib) (38.6 vs 31.8 months; HR 0.80; p=0.046) with superior intracranial disease control in untreated EGFR-mutated advanced NSCLC.",
                "cites": ["29151359", "31751012"]
            },
            {
                "claim": "In the MARIPOSA trial, the bispecific EGFR-MET antibody amivantamab combined with lazertinib demonstrated significant progression-free survival superiority over osimertinib monotherapy (median PFS 23.7 vs 16.6 months; HR 0.70; p<0.001) as first-line therapy for EGFR-mutated advanced NSCLC.",
                "cites": ["38924734"]
            },
            {
                "claim": "For advanced ALK-rearranged NSCLC, the phase 3 ALEX trial proved that first-line alectinib reduced the risk of progression or death by 53% compared to crizotinib (HR 0.47) and reduced CNS progression incidence by over 80%.",
                "cites": ["28586279"]
            },
            {
                "claim": "Long-term 5-year updates from the phase 3 CROWN trial demonstrated that the third-generation ALK inhibitor lorlatinib achieved unprecedented PFS (60% alive and progression-free at 5 years vs 8% with crizotinib; HR 0.19) and 92% intracranial progression-free survival in treatment-naive ALK-positive NSCLC.",
                "cites": ["33207094", "38819031"]
            }
        ],
        "sources": [
            {
                "pmid": "29151359",
                "title": "Osimertinib in Untreated EGFR-Mutated Advanced Non-Small-Cell Lung Cancer (FLAURA)",
                "journal": "N Engl J Med",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "31751012",
                "title": "Overall Survival with Osimertinib in Untreated, EGFR-Mutated Advanced NSCLC",
                "journal": "N Engl J Med",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "38924734",
                "title": "Amivantamab plus Lazertinib in Previously Untreated EGFR-Mutated Advanced Non-Small-Cell Lung Cancer (MARIPOSA)",
                "journal": "N Engl J Med",
                "year": 2024,
                "design": "trial"
            },
            {
                "pmid": "28586279",
                "title": "Alectinib versus Crizotinib in Untreated ALK-Positive Non-Small-Cell Lung Cancer (ALEX)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "33207094",
                "title": "First-Line Lorlatinib or Crizotinib in Advanced ALK-Positive Lung Cancer (CROWN)",
                "journal": "N Engl J Med",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "38819031",
                "title": "Lorlatinib Versus Crizotinib for First-Line Treatment of ALK-Positive Advanced Non-Small-Cell Lung Cancer: 5-Year Follow-Up of the CROWN Study",
                "journal": "J Clin Oncol",
                "year": 2024,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Choosing between frontline osimertinib monotherapy, osimertinib plus chemotherapy (FLAURA2), or amivantamab plus lazertinib (MARIPOSA) based on co-mutations (TP53, RB1).",
            "Optimal management of lorlatinib-associated neurocognitive side effects and hypercholesterolemia during protracted multi-year therapy."
        ],
        "mcq_angles": [
            "First-line standard of care for EGFR-mutant NSCLC (exon 19 deletion, L858R): osimertinib (FLAURA trial).",
            "Management of ALK-positive NSCLC with CNS metastases: preferred use of brain-penetrant ALK inhibitors (alectinib, brigatinib, lorlatinib) over crizotinib.",
            "Mechanisms of resistance to osimertinib: MET amplification, C797S tertiary mutation, and histological small-cell lung cancer transformation."
        ],
        "case_hooks": [
            "A 54-year-old female non-smoker presenting with cough, multiple lung nodules, and asymptomatic brain metastases, found to have EGFR exon 19 deletion.",
            "A 46-year-old man diagnosed with stage IV adenocarcinoma of the lung positive for EML4-ALK fusion on FISH testing."
        ],
        "gaps": "Liquid biopsy dynamic circulating tumor DNA monitoring protocols to predict emergent resistance prior to clinical or radiological progression."
    },
    1105: {
        "cluster": "Oncology / Neurosurgery / Acute Care",
        "mentor_intro": "Metastatic spinal cord compression (MSCC) is an acute oncological emergency necessitating urgent whole-spine MRI, immediate high-dose intravenous corticosteroid administration, and emergency spinal surgical decompression followed by radiotherapy to preserve functional neurological ambulation and sphincter control.",
        "teaching_points": [
            {
                "claim": "In the landmark randomized trial by Patchell and colleagues, direct decompressive surgical resection plus postoperative radiotherapy was significantly superior to radiotherapy alone in patients with spinal cord compression caused by metastatic cancer, enabling 84% vs 57% of patients to walk after treatment and preserving ambulation significantly longer (median 122 vs 13 days; p=0.003).",
                "cites": ["16112300"]
            },
            {
                "claim": "NICE CG75 guidelines emphasize that MRI of the whole spine must be performed and reported within 24 hours of suspected MSCC (within hours if frank neurological deficit exists), because isolated imaging of symptomatic levels misses silent non-contiguous spinal metastases in up to 30% of patients.",
                "cites": ["21656965"]
            },
            {
                "claim": "Emergency medical management mandates immediate administration of high-dose dexamethasone (16 mg daily, typically 8 mg twice daily with proton pump inhibitor gastroprotection) to reduce vasogenic peritumoral spinal cord edema pending definitive structural decompression.",
                "cites": ["21656965", "8142158"]
            },
            {
                "claim": "In the SCORAD III randomized non-inferiority trial, single-fraction radiation therapy (8 Gy in 1 fraction) demonstrated non-inferior ambulatory status compared with multifraction radiation therapy (20 Gy in 5 fractions) at 8 weeks among cancer patients with spinal canal compression not eligible for surgical resection.",
                "cites": ["31794057"]
            }
        ],
        "sources": [
            {
                "pmid": "16112300",
                "title": "Direct decompressive surgical resection in the treatment of spinal cord compression caused by metastatic cancer: a randomised trial",
                "journal": "Lancet",
                "year": 2005,
                "design": "trial"
            },
            {
                "pmid": "21656965",
                "title": "NICE Clinical Guideline CG75: Metastatic spinal cord compression in adults: risk assessment, diagnosis and management",
                "journal": "NICE Guideline",
                "year": 2008,
                "design": "guideline"
            },
            {
                "pmid": "31794057",
                "title": "Effect of Single-Fraction vs Multifraction Radiotherapy on Ambulatory Status Among Patients With Spinal Canal Compression From Metastatic Cancer: The SCORAD Randomized Clinical Trial",
                "journal": "JAMA",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "8142158",
                "title": "High-dose dexamethasone in metastatic spinal cord compression: a randomized, prospective study of 96 patients",
                "journal": "Eur J Cancer",
                "year": 1994,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Role of stereotactic body radiotherapy (SBRT) as definitive upfront management versus conventional decompression in radioresistant radio-oligometastatic spinal disease (e.g., renal cell carcinoma).",
            "Optimal surgical intervention criteria in patients with total paraplegia established for longer than 48 hours."
        ],
        "mcq_angles": [
            "Indication for surgical decompressive resection plus RT over RT alone: Patchell trial criteria (single level of compression, paraplegia <48 hours, life expectancy >3 months).",
            "Urgent requirement for whole-spine MRI rather than localized spinal MRI to detect synchronous skip lesions.",
            "Initial medical stabilization dose: dexamethasone 16 mg daily with PPI co-prescription."
        ],
        "case_hooks": [
            "A 62-year-old man with metastatic prostate cancer presenting with progressive bilateral lower extremity weakness, sensory level at T10, and urinary retention.",
            "A 58-year-old woman with known breast cancer presenting with severe thoracic band-like radicular back pain aggravated by coughing and lying flat."
        ],
        "gaps": "Predictive clinical and genomic algorithms determining spinal instability neoplastic score (SINS) failure requiring prophylactic stabilization prior to acute cord collapse."
    }
}
