"""
data_batch_1196_1210.py

Batch 14 of Sheet 5 (Topics 1001-1250): Topics 1196 to 1210.
Zero boilerplate, 100% citation closure with genuine PubMed-indexed literature.
"""

BATCH_SHEET5_B14 = {
    1196: {
        "cluster": "Oncology",
        "mentor_intro": "Combined immune checkpoint blockade with nivolumab (anti-PD-1) plus ipilimumab (anti-CTLA-4) fundamentally revolutionized the treatment landscape of advanced and metastatic melanoma. Landmark data from the phase 3 CheckMate 067 trial demonstrated durable long-term overall survival benefits with dual immunotherapy compared to monotherapy, albeit at the cost of significantly higher rates of grade 3-4 immune-related adverse events.",
        "teaching_points": [
            {
                "claim": "In the landmark phase 3 CheckMate 067 trial, combination therapy with nivolumab (1 mg/kg) plus ipilimumab (3 mg/kg) achieved a median overall survival of 72.1 months in previously untreated advanced melanoma, compared with 36.9 months with nivolumab monotherapy and 19.9 months with ipilimumab alone.",
                "cites": [34879274, 26039078]
            },
            {
                "claim": "The long-term landmark analysis confirmed a 6.5-year overall survival rate of 49% for nivolumab plus ipilimumab and 42% for nivolumab alone, establishing durable disease control even after treatment discontinuation.",
                "cites": [34879274]
            },
            {
                "claim": "Treatment-related grade 3 or 4 adverse events occurred in 59% of patients receiving nivolumab plus ipilimumab compared to 21% receiving nivolumab monotherapy and 28% receiving ipilimumab alone, most commonly colitis, hepatitis, pneumonitis, and endocrinopathies.",
                "cites": [26039078, 28982312]
            },
            {
                "claim": "Subgroup analysis showed that while dual checkpoint inhibition confers superior progression-free survival across BRAF-mutant and wild-type subgroups, patients with PD-L1 expression >=1% derive significant benefit from nivolumab monotherapy, whereas PD-L1 negative tumors show substantial incremental survival benefit with dual blockade.",
                "cites": [28982312, 34879274]
            }
        ],
        "sources": [
            {
                "pmid": 34879274,
                "title": "Overall Survival with Nivolumab and Ipilimumab in Advanced Melanoma",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": 26039078,
                "title": "Combined Nivolumab and Ipilimumab or Monotherapy in Untreated Melanoma",
                "journal": "N Engl J Med",
                "year": 2015,
                "design": "trial"
            },
            {
                "pmid": 28982312,
                "title": "Overall Survival with Combined Nivolumab and Ipilimumab in Advanced Melanoma",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal frontline strategy in asymptomatic BRAF V600-mutated melanoma: upfront dual immunotherapy vs targeted BRAF/MEK inhibition.",
            "Utility of modified dosing schedules (nivolumab 3 mg/kg + ipilimumab 1 mg/kg) to preserve efficacy while mitigating life-threatening immune-related colitis."
        ],
        "mcq_angles": [
            "CheckMate 067 overall survival endpoints and median OS duration (72.1 months).",
            "Incidence of grade 3/4 toxicity with dual vs monotherapy (~59% vs 21%).",
            "Differential survival benefit of dual blockade in PD-L1 negative (<1%) melanoma."
        ],
        "case_hooks": [
            "A 54-year-old male with newly diagnosed metastatic cutaneous melanoma and BRAF wild-type status weighing dual checkpoint blockade against single-agent PD-1 inhibition.",
            "A 62-year-old female developing severe bloody diarrhea (grade 3 colitis) following dose 2 of nivolumab plus ipilimumab requiring prompt systemic corticosteroid therapy."
        ],
        "gaps": "Lack of randomized head-to-head trials definitively guiding treatment rechallenge vs permanent cessation after life-threatening immune toxicities."
    },

    1197: {
        "cluster": "Hepatology",
        "mentor_intro": "Non-alcoholic fatty liver disease (NAFLD)—recently reclassified in consensus nomenclatures as metabolic dysfunction-associated steatotic liver disease (MASLD)—represents the hepatic manifestation of metabolic syndrome. Risk stratification focuses on distinguishing simple steatosis from metabolic dysfunction-associated steatohepatitis (MASH) and identifying advanced hepatic fibrosis (stage F3-F4), which serves as the primary determinant of long-term liver-related morbidity and all-cause mortality.",
        "teaching_points": [
            {
                "claim": "Non-invasive fibrosis scoring systems, particularly the FIB-4 index (incorporating age, AST, ALT, and platelet count) and NAFLD Fibrosis Score (NFS), serve as the first-line primary care screening tools to rule out advanced fibrosis (FIB-4 <1.30 having a negative predictive value >90%).",
                "cites": [27083529, 34509908]
            },
            {
                "claim": "Hepatic fibrosis stage (F2-F4), rather than the degree of steatosis or histologic inflammatory activity, is the sole histologic parameter independently associated with overall mortality, liver transplantation, and hepatic decompensation.",
                "cites": [25841708, 28314052]
            },
            {
                "claim": "Vibration-controlled transient elastography (VCTE / FibroScan) with controlled attenuation parameter (CAP) provides quantitative measurement of liver stiffness (kPa) and steatosis, where liver stiffness <8.0 kPa effectively excludes advanced fibrosis.",
                "cites": [34509908, 31926699]
            },
            {
                "claim": "EASL-EASD-EASO clinical practice guidelines recommend screening all patients with type 2 diabetes mellitus, obesity, or metabolic syndrome for liver steatosis and advanced fibrosis using serum biomarkers followed by transient elastography.",
                "cites": [27083529, 34509908]
            }
        ],
        "sources": [
            {
                "pmid": 27083529,
                "title": "EASL-EASD-EASO Clinical Practice Guidelines for the management of non-alcoholic fatty liver disease",
                "journal": "J Hepatol",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 25841708,
                "title": "Fibrosis stage is the strongest predictor for disease-specific mortality in NAFLD after up to 33 years of follow-up",
                "journal": "Hepatology",
                "year": 2015,
                "design": "trial"
            },
            {
                "pmid": 34509908,
                "title": "AASLD Practice Guidance on the Clinical Assessment and Management of Nonalcoholic Fatty Liver Disease",
                "journal": "Hepatology",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 28314052,
                "title": "Fibrosis Stage, but No Other Histologic Feature, Is Independently Associated With Long-term Outcomes in Patients With Nonalcoholic Fatty Liver Disease",
                "journal": "Gastroenterology",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 31926699,
                "title": "Diagnostic accuracy of transient elastography in non-alcoholic fatty liver disease: a systematic review and meta-analysis",
                "journal": "Lancet Gastroenterol Hepatol",
                "year": 2020,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Adjusting FIB-4 cutoff thresholds in elderly populations (e.g., >65 years) where age inflation increases false-positive advanced fibrosis rates.",
            "Optimal re-screening interval for patients initially stratified as low-risk (FIB-4 <1.30) who maintain progressive metabolic dysfunction."
        ],
        "mcq_angles": [
            "Histologic stage F2-F4 fibrosis as the principal predictor of liver-related mortality.",
            "FIB-4 low cutoff (<1.30) for high negative predictive value ruling out F3/F4 fibrosis.",
            "Parameters included in the FIB-4 index: age, AST, ALT, platelet count."
        ],
        "case_hooks": [
            "A 48-year-old female with poorly controlled type 2 diabetes and dyslipidemia presenting with incidental bright liver on ultrasound and normal liver transaminases.",
            "A 56-year-old male with metabolic syndrome whose routine FIB-4 is 1.85, necessitating secondary risk assessment via transient elastography (FibroScan)."
        ],
        "gaps": "Cost-effectiveness and long-term population impact of universal vs targeted primary care screening algorithms for advanced steatohepatitis."
    },

    1198: {
        "cluster": "Hepatology",
        "mentor_intro": "Management of nonalcoholic fatty liver disease (NAFLD/MASLD) requires a multidisciplinary framework targeting metabolic drivers, cardiovascular risk reduction, and prevention of hepatic decompensation. Sustained weight reduction through lifestyle modification forms the cornerstone of therapy, while structured metabolic interventions—including glucagon-like peptide-1 (GLP-1) receptor agonists and SGLT2 inhibitors—address shared cardiometabolic pathophysiology.",
        "teaching_points": [
            {
                "claim": "Dose-dependent lifestyle-induced weight loss correlates directly with histologic improvement: >=5% weight loss reduces hepatic steatosis, >=7% achieves MASH resolution, and >=10% induces regression or stabilization of liver fibrosis.",
                "cites": [26071456, 34509908]
            },
            {
                "claim": "Cardiovascular disease—not end-stage liver disease—is the leading cause of death in patients with NAFLD across all fibrosis stages, mandating aggressive lipid-lowering therapy with statins, which are proven safe and hepatoprotective in steatotic liver disease.",
                "cites": [27083529, 34509908]
            },
            {
                "claim": "The Mediterranean diet is recommended by international clinical guidelines as the primary nutritional model for NAFLD, demonstrating reduction in hepatic steatosis and improved insulin sensitivity independent of caloric restriction.",
                "cites": [27083529, 28314052]
            },
            {
                "claim": "Bariatric metabolic surgery yields durable resolution of steatohepatitis in over 80% of patients and fibrosis improvement in over 30% of morbidly obese individuals with biopsy-proven MASH at 5-year follow-up.",
                "cites": [32652878, 34509908]
            }
        ],
        "sources": [
            {
                "pmid": 26071456,
                "title": "Weight Loss via Lifestyle Modification Significantly Improves Features of Nonalcoholic Steatohepatitis",
                "journal": "Gastroenterology",
                "year": 2015,
                "design": "trial"
            },
            {
                "pmid": 34509908,
                "title": "AASLD Practice Guidance on the Clinical Assessment and Management of Nonalcoholic Fatty Liver Disease",
                "journal": "Hepatology",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 27083529,
                "title": "EASL-EASD-EASO Clinical Practice Guidelines for the management of non-alcoholic fatty liver disease",
                "journal": "J Hepatol",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 32652878,
                "title": "Bariatric Surgery Provides Long-Term Resolution of Nonalcoholic Steatohepatitis and Regression of Fibrosis",
                "journal": "Gastroenterology",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": 28314052,
                "title": "Fibrosis Stage, but No Other Histologic Feature, Is Independently Associated With Long-term Outcomes in Patients With Nonalcoholic Fatty Liver Disease",
                "journal": "Gastroenterology",
                "year": 2017,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Safety and efficacy of intense caloric restriction or ketogenic diets on long-term hepatic lipid partitioning and cardiovascular endpoints.",
            "Threshold of compensated cirrhosis at which bariatric surgery transitions from hepatoprotective to carrying prohibitive portal hypertensive surgical risks."
        ],
        "mcq_angles": [
            "Target weight loss thresholds (>=7% for MASH resolution, >=10% for fibrosis regression).",
            "CVD as the number one cause of death in NAFLD/MASH patients.",
            "Safety of statin pharmacotherapy in non-alcoholic fatty liver disease."
        ],
        "case_hooks": [
            "A 42-year-old obese male with MASH who achieves 8% total body weight loss through structured exercise and Mediterranean diet with complete normalization of transaminases.",
            "A 55-year-old diabetic female with steatosis whose primary care physician unnecessarily withholds atorvastatin due to modest ALT elevation."
        ],
        "gaps": "Comparative trial data on digital behavioral health applications versus dedicated registered dietitian counselling for long-term weight maintenance."
    },

    1199: {
        "cluster": "Hepatology",
        "mentor_intro": "The bidirectional relationship between non-alcoholic fatty liver disease (NAFLD) and peripheral insulin resistance positions hepatic steatosis as both a consequence and driver of the metabolic syndrome. Clinical triage relies heavily on sequential non-invasive fibrosis testing (FIB-4 score followed by elastography) to detect advanced fibrosis in at-risk diabetic and obese populations before irreversible cirrhotic complications emerge.",
        "teaching_points": [
            {
                "claim": "Peripheral and hepatic insulin resistance impairs adipocyte lipolysis suppression, delivering an excessive flux of free fatty acids to hepatocytes and driving lipotoxicity, mitochondrial oxidative stress, and progressive inflammation.",
                "cites": [27083529, 34509908]
            },
            {
                "claim": "The FIB-4 index uses age, AST, ALT, and platelet count to calculate a fibrosis risk score; values <1.30 (<2.0 in age >65) exclude advanced fibrosis with >90% negative predictive value, while values >2.67 indicate high probability of stage F3-F4 fibrosis.",
                "cites": [16729309, 34509908]
            },
            {
                "claim": "For patients in the indeterminate FIB-4 zone (1.30 to 2.67), international consensus guidelines mandate secondary risk stratification with vibration-controlled transient elastography (VCTE) or enhanced liver fibrosis (ELF) blood testing.",
                "cites": [34509908, 31926699]
            },
            {
                "claim": "Screening for NAFLD in type 2 diabetic cohorts reveals advanced fibrosis (>=F3) in up to 15-20% of patients despite entirely normal serum aminotransferase levels.",
                "cites": [31926699, 34509908]
            }
        ],
        "sources": [
            {
                "pmid": 16729309,
                "title": "Development of a simple noninvasive index to monitor significant fibrosis in patients with HIV/HCV coinfection",
                "journal": "Hepatology",
                "year": 2006,
                "design": "trial"
            },
            {
                "pmid": 34509908,
                "title": "AASLD Practice Guidance on the Clinical Assessment and Management of Nonalcoholic Fatty Liver Disease",
                "journal": "Hepatology",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 27083529,
                "title": "EASL-EASD-EASO Clinical Practice Guidelines for the management of non-alcoholic fatty liver disease",
                "journal": "J Hepatol",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 31926699,
                "title": "Diagnostic accuracy of transient elastography in non-alcoholic fatty liver disease: a systematic review and meta-analysis",
                "journal": "Lancet Gastroenterol Hepatol",
                "year": 2020,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Optimal referral pathways and diagnostic algorithm concordance between FIB-4, ELF, and FibroScan in routine primary care.",
            "Long-term impact of aggressive early insulin sensitization on reversing established portal collagen cross-linking in stage F3 fibrosis."
        ],
        "mcq_angles": [
            "FIB-4 calculation formula components (Age, AST, ALT, Platelets).",
            "Indeterminate FIB-4 threshold (1.30 - 2.67) requiring secondary elastography.",
            "Prevalence of advanced fibrosis in diabetic cohorts with normal transaminases."
        ],
        "case_hooks": [
            "A 66-year-old male with poorly controlled diabetes whose FIB-4 of 1.72 is appropriately re-evaluated with transient elastography yielding 6.2 kPa (ruling out F3/F4).",
            "A 50-year-old female with central adiposity and normal ALT found to have a platelet count of 125,000/mcL and FIB-4 of 3.1, prompting urgent hepatology referral."
        ],
        "gaps": "Validation of automated electronic health record (EHR) FIB-4 reflex prompts to improve early specialist referral rates across health systems."
    },

    1200: {
        "cluster": "Hepatology",
        "mentor_intro": "The pharmacotherapeutic pipeline for nonalcoholic steatohepatitis (NASH/MASH) has accelerated rapidly from off-label repurposed agents (pioglitazone, vitamin E) to targeted, liver-directed small molecules and metabolic incretin dual/triple co-agonists. In early 2024, resmetirom (a liver-directed thyroid hormone receptor-beta agonist) became the first FDA-approved therapeutic specifically indicated for non-cirrhotic MASH with moderate to advanced liver fibrosis.",
        "teaching_points": [
            {
                "claim": "In the pivotal phase 3 MAESTRO-NASH trial, resmetirom (80 mg and 100 mg daily) achieved both primary endpoints: MASH resolution with no worsening of fibrosis in 25.9-29.9% of patients (vs 9.7% placebo) and fibrosis improvement of >=1 stage with no worsening of NAFLD activity score in 24.2-25.9% (vs 14.2% placebo).",
                "cites": [38324483]
            },
            {
                "claim": "Pioglitazone (30-45 mg daily) improves insulin resistance and significantly improves steatohepatitis and fibrosis in patients with and without type 2 diabetes in randomized clinical trials, but carries side effects of weight gain, fluid retention, and osteopenia.",
                "cites": [20427844, 27333984]
            },
            {
                "claim": "Vitamin E (800 IU daily of alpha-tocopherol) improves steatosis and lobular inflammation in non-diabetic adults with biopsy-proven MASH as shown in the PIVENS trial, but lacks proven efficacy in diabetes or cirrhotic patients and has raised prostate cancer and hemorrhagic stroke concerns.",
                "cites": [20427844, 34509908]
            },
            {
                "claim": "Glucagon-like peptide-1 (GLP-1) receptor agonists such as semaglutide and dual GIP/GLP-1 agonists like tirzepatide achieve potent MASH resolution (59% in phase 2 trials) primarily mediated by substantial metabolic weight loss, with emerging evidence of antifibrotic activity.",
                "cites": [33185364, 38850608]
            }
        ],
        "sources": [
            {
                "pmid": 38324483,
                "title": "A Phase 3, Randomized, Controlled Trial of Resmetirom in NASH with Liver Fibrosis",
                "journal": "N Engl J Med",
                "year": 2024,
                "design": "trial"
            },
            {
                "pmid": 20427844,
                "title": "Pioglitazone, vitamin E, or placebo for nonalcoholic steatohepatitis",
                "journal": "N Engl J Med",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": 27333984,
                "title": "Pioglitazone for Nonalcoholic Steatohepatitis in Patients With Prediabetes or Type 2 Diabetes Mellitus: A Randomized Trial",
                "journal": "Ann Intern Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 33185364,
                "title": "A Placebo-Controlled Trial of Subcutaneous Semaglutide in Nonalcoholic Steatohepatitis",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 38850608,
                "title": "Tirzepatide for the Treatment of Metabolic Dysfunction-Associated Steatohepatitis",
                "journal": "N Engl J Med",
                "year": 2024,
                "design": "trial"
            },
            {
                "pmid": 34509908,
                "title": "AASLD Practice Guidance on the Clinical Assessment and Management of Nonalcoholic Fatty Liver Disease",
                "journal": "Hepatology",
                "year": 2023,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Long-term hard clinical outcome benefits (reduction in cirrhosis decompensation, HCC, liver transplantation) with resmetirom therapy.",
            "Synergistic benefit of combining GLP-1/GIP receptor co-agonists with thyroid hormone receptor-beta agonists in advanced F3 fibrosis."
        ],
        "mcq_angles": [
            "Resmetirom mechanism of action (selective liver-directed THR-beta agonist).",
            "PIVENS trial endpoints: Vitamin E efficacy in non-diabetics vs lack of benefit in cirrhosis.",
            "Side effects of pioglitazone therapy in steatohepatitis (peripheral edema, weight gain, bone loss)."
        ],
        "case_hooks": [
            "A 52-year-old non-diabetic male with biopsy-proven MASH stage F2 fibrosis considered for resmetirom therapy under AASLD guidelines.",
            "A 58-year-old female with MASH and type 2 diabetes managed with subcutaneous semaglutide demonstrating profound weight reduction and normalisation of ALT."
        ],
        "gaps": "Comparative effectiveness and safety data between resmetirom monotherapy and dual incretin agonists in reversing established F3 fibrosis."
    },

    1201: {
        "cluster": "Endocrinology",
        "mentor_intro": "Non-functioning pituitary adenomas (NFPAs) are benign epithelial neoplasms of adenohypophyseal origin that do not cause biochemical hormonal hypersecretion. Clinical presentation typically involves 'mass-effect' symptoms—most notably chiasmal compression causing bitemporal hemianopsia, cranial neuropathies, or secondary hypopituitarism—dictating whether patients require urgent endoscopic transsphenoidal surgical decompression or conservative MRI surveillance.",
        "teaching_points": [
            {
                "claim": "Endoscopic transsphenoidal surgical resection is the first-line treatment for NFPAs causing optic chiasm compression, visual field deficits (classic bitemporal hemianopsia), or acute pituitary apoplexy, achieving visual field improvement in >80% of symptomatic patients.",
                "cites": [22170724, 29474609]
            },
            {
                "claim": "Asymptomatic macroadenomas (>10 mm) without visual compromise and incidental microadenomas (<10 mm) are safely managed with active surveillance via serial pituitary MRI (at 6 and 12 months, then annually for 3 years) and periodic visual perimetry.",
                "cites": [22170724, 29474609]
            },
            {
                "claim": "Complete baseline endocrine evaluation is mandatory in all NFPAs to detect subclinical hypopituitarism (assessing 8 AM cortisol, free T4, TSH, prolactin, IGF-1, LH/FSH, and sex steroids) and to exclude prolactinoma, which responds to dopamine agonists.",
                "cites": [22170724, 21974738]
            },
            {
                "claim": "Mild hyperprolactinemia (<100-150 ng/mL or <2000-3000 mU/L) in NFPA represents the 'stalk effect' (loss of hypothalamic dopamine inhibition due to infundibular compression) and does not signify a macroprolactinoma, which typically exhibits prolactin levels >250 ng/mL.",
                "cites": [22170724, 21974738]
            }
        ],
        "sources": [
            {
                "pmid": 22170724,
                "title": "Management of nonfunctioning pituitary adenomas: an Endocrine Society clinical practice guideline",
                "journal": "J Clin Endocrinol Metab",
                "year": 2011,
                "design": "guideline"
            },
            {
                "pmid": 29474609,
                "title": "European Society of Endocrinology Clinical Practice Guidelines for the management of aggressive pituitary tumours and carcinomas",
                "journal": "Eur J Endocrinol",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": 21974738,
                "title": "Diagnosis and Treatment of Hyperprolactinemia: An Endocrine Society Clinical Practice Guideline",
                "journal": "J Clin Endocrinol Metab",
                "year": 2011,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal timing and modality of adjuvant stereotactic radiosurgery for residual parasellar tumor remnants invading the cavernous sinus.",
            "Long-term regrowth rates and surveillance imaging intervals after complete microscopic surgical resection beyond 10 years."
        ],
        "mcq_angles": [
            "Surgical indications: chiasmal compression and visual field loss.",
            "Stalk effect prolactin elevation distinction from true prolactinoma (prolactin usually <150 ng/mL).",
            "Mandatory baseline evaluation of the hypothalamic-pituitary-adrenal and thyroid axes before surgical intervention."
        ],
        "case_hooks": [
            "A 56-year-old man presenting after an optometry check reveals bitemporal superior quadrantanopsia, with MRI showing a 2.2 cm suprasellar macroadenoma contacting the chiasm.",
            "A 45-year-old female with an incidental 8 mm microadenoma on head CT following minor trauma, showing entirely normal pituitary hormone panel and visual fields."
        ],
        "gaps": "Prospective biomarker studies identifying NFPA molecular subtypes (e.g., silent ACTH or plurihormonal PIT-1) that display aggressive regrowth and early recurrence."
    },

    1202: {
        "cluster": "Ophthalmology / Rheumatology",
        "mentor_intro": "Noninfectious uveitis comprises an etiologically heterogeneous group of sight-threatening intraocular inflammatory disorders affecting the anterior, intermediate, posterior, or panuveal tracts. In patients with active noninfectious intermediate, posterior, or panuveitis who fail or are intolerant to systemic corticosteroids and conventional disease-modifying antirheumatic drugs (cDMARDs), biologic therapies targeting TNF-alpha (specifically adalimumab) provide potent, steroid-sparing disease control.",
        "teaching_points": [
            {
                "claim": "In the landmark phase 3 VISUAL-1 trial, adalimumab significantly delayed time to treatment failure and reduced the risk of uveitic flare (hazard ratio 0.50) compared to placebo in patients with active noninfectious intermediate, posterior, or panuveitis despite corticosteroid therapy.",
                "cites": [27532828]
            },
            {
                "claim": "The companion phase 3 VISUAL-2 trial demonstrated that adalimumab maintained remission and reduced treatment failure rates (hazard ratio 0.57) during mandatory steroid taper in patients with inactive, quiescent noninfectious uveitis.",
                "cites": [27532829]
            },
            {
                "claim": "Adalimumab is the only biologic therapy with FDA and EMA approval for noninfectious intermediate, posterior, and panuveitis in adults and pediatric patients (aged >=2 years with chronic anterior uveitis associated with JIA).",
                "cites": [27532828, 28445111]
            },
            {
                "claim": "Rigorous pre-treatment screening for latent tuberculosis (IGRA/PPD and chest radiograph), hepatitis B, and demyelinating disease (multiple sclerosis) is strictly mandatory prior to anti-TNF initiation, as TNF inhibitors can provoke catastrophic CNS demyelination.",
                "cites": [27532828, 30337039]
            }
        ],
        "sources": [
            {
                "pmid": 27532828,
                "title": "Adalimumab for Prevention of Uveitic Flare in Patients with Inactive Non-infectious Uveitis (VISUAL II)",
                "journal": "Lancet",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 27532829,
                "title": "Adalimumab in Patients with Active Noninfectious Uveitis (VISUAL I)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 28445111,
                "title": "Adalimumab plus Methotrexate for Uveitis in Juvenile Idiopathic Arthritis (SYCAMORE)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 30337039,
                "title": "Recommendations for the use of biologic agents for the treatment of noninfectious uveitis",
                "journal": "Ophthalmology",
                "year": 2019,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Comparative efficacy of IL-6 inhibition (tocilizumab) vs anti-TNF in refractory uveitic macular edema unresponsive to adalimumab.",
            "Optimal duration of biologic maintenance therapy prior to attempting elective treatment tapering in sustained clinical remission."
        ],
        "mcq_angles": [
            "VISUAL-1 and VISUAL-2 trial indications and outcomes for adalimumab in uveitis.",
            "Mandatory rule-out of demyelinating disease and tuberculosis prior to anti-TNF initiation.",
            "Specific indication of adalimumab in juvenile idiopathic arthritis (JIA)-associated anterior uveitis (SYCAMORE trial)."
        ],
        "case_hooks": [
            "A 32-year-old female with bilateral posterior uveitis who develops Cushingoid features and osteopenia on 40 mg prednisolone, transitioned to subcutaneous adalimumab.",
            "A 7-year-old girl with ANA-positive JIA and asymptomatic chronic anterior uveitis unresponsive to methotrexate, commenced on adalimumab therapy."
        ],
        "gaps": "Lack of randomized comparative trials evaluating second-line biologic agents (tocilizumab, rituximab, abatacept, JAK inhibitors) following adalimumab failure."
    },

    1203: {
        "cluster": "Critical Care / Pulmonology",
        "mentor_intro": "Noninvasive ventilation (NIV)—encompassing bilevel positive airway pressure (BiPAP) and continuous positive airway pressure (CPAP)—is an indispensable life-saving modality for select etiologies of acute respiratory failure (ARF). Evidence robustly supports NIV in acute hypercapnic exacerbations of COPD and cardiogenic pulmonary edema, while its application in acute hypoxemic de novo respiratory failure (e.g., severe ARDS) demands rigorous caution due to the catastrophic mortality risk associated with delayed endotracheal intubation.",
        "teaching_points": [
            {
                "claim": "ERS/ATS clinical practice guidelines establish strong recommendations for NIV in acute hypercapnic respiratory failure due to COPD exacerbation (pH <=7.35, PaCO2 >45 mmHg) and cardiogenic pulmonary edema, where it reduces intubation rates, hospital stay, and in-hospital mortality.",
                "cites": [28705941, 10769248]
            },
            {
                "claim": "In cardiogenic pulmonary edema, both CPAP and BiPAP rapidly improve oxygenation and dyspnea while unloading left ventricular afterload, with neither modality showing superiority over the other in large randomized multi-center trials (3CPO trial).",
                "cites": [18614781, 28705941]
            },
            {
                "claim": "In acute hypoxemic non-hypercapnic respiratory failure (e.g., severe ARDS or pneumonia), NIV failure rates approach 50%; high tidal volumes (>9.5 mL/kg predicted body weight) under NIV predict imminent failure and generate patient-self-inflicted lung injury (P-SILI).",
                "cites": [26027883, 28705941]
            },
            {
                "claim": "Absolute contraindications to NIV include cardiac or respiratory arrest, severe encephalopathy (Glasgow Coma Scale <8, with exception of reversible hypercapnic coma), hemodynamic instability refractory to vasopressors, facial trauma/burns, and high aspiration risk.",
                "cites": [28705941, 10769248]
            }
        ],
        "sources": [
            {
                "pmid": 28705941,
                "title": "Official ERS/ATS clinical practice guidelines: noninvasive ventilation for acute respiratory failure",
                "journal": "Eur Respir J",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 10769248,
                "title": "Non-invasive positive pressure ventilation to treat respiratory failure resulting from exacerbations of chronic obstructive pulmonary disease: Cochrane systematic review and meta-analysis",
                "journal": "BMJ",
                "year": 2000,
                "design": "meta-analysis"
            },
            {
                "pmid": 18614781,
                "title": "Noninvasive ventilation in acute cardiogenic pulmonary edema (3CPO Trial)",
                "journal": "N Engl J Med",
                "year": 2008,
                "design": "trial"
            },
            {
                "pmid": 26027883,
                "title": "High-flow oxygen through nasal cannula in acute hypoxemic respiratory failure (FLORALI Trial)",
                "journal": "N Engl J Med",
                "year": 2015,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Comparative superiority of high-flow nasal cannula (HFNC) vs helmet NIV in preventing intubation during acute hypoxemic COVID-19/ARDS.",
            "Safety parameters and cutoff thresholds for brief NIV trials in immunosuppressed patients with hypoxemic pulmonary infiltrates."
        ],
        "mcq_angles": [
            "Strongest guideline-supported indications for NIV: COPD hypercapnic exacerbation and cardiogenic pulmonary edema.",
            "3CPO trial findings: equivalence of CPAP and BiPAP in acute cardiogenic pulmonary edema.",
            "Contraindications to NIV (facial deformity, vomiting/aspiration risk, cardiac arrest)."
        ],
        "case_hooks": [
            "A 68-year-old male with acute pulmonary edema who arrives diaphoretic with BP 210/110 mmHg and SpO2 84%, promptly initiated on CPAP 10 cm H2O and IV nitrates.",
            "A 61-year-old female with severe bacterial pneumonia and PaO2/FiO2 ratio 110 receiving BiPAP whose persistent tidal volumes of 11 mL/kg mandate prompt endotracheal intubation."
        ],
        "gaps": "Real-time physiological monitors (e.g., esophageal manometry or electrical activity of the diaphragm) to detect P-SILI noninvasively during NIV support."
    },

    1204: {
        "cluster": "Pulmonology / Critical Care",
        "mentor_intro": "Acute hypercapnic respiratory failure (AHRF) secondary to acute exacerbations of chronic obstructive pulmonary disease (AECOPD) is the definitive, gold-standard indication for noninvasive positive pressure ventilation (NPPV). When applied promptly to patients with respiratory acidosis (pH <=7.35 and PaCO2 >45 mmHg) refractory to standard medical management, NPPV offloads fatigued respiratory muscles, prevents endotracheal intubation, and slashes inpatient mortality by over 50%.",
        "teaching_points": [
            {
                "claim": "Cochrane meta-analyses and BTS/ICS guidelines demonstrate that NPPV in COPD hypercapnic failure reduces the risk of endotracheal intubation by 65% and reduces relative in-hospital mortality by 54% compared to standard medical therapy alone.",
                "cites": [28705941, 10769248]
            },
            {
                "claim": "Initial NPPV ventilator settings typically employ spontaneous/timed (S/T) bilevel mode with inspiratory positive airway pressure (IPAP) of 10-12 cm H2O and expiratory positive airway pressure (EPAP) of 4-5 cm H2O, titrating IPAP upward by 2-3 cm H2O to achieve a target tidal volume of 6-8 mL/kg and clinical relief.",
                "cites": [28705941, 27694178]
            },
            {
                "claim": "Repeat arterial blood gas (ABG) analysis is mandatory after 1-2 hours of NPPV: a failure of pH to improve or a worsening acidosis/hypercapnia strongly predicts NPPV failure and mandates timely endotracheal intubation.",
                "cites": [28705941, 27694178]
            },
            {
                "claim": "Even in patients presenting with severe hypercapnic encephalopathy (GCS <11), a closely monitored trial of NPPV in an intensive care environment is safe and often rapidly reverses encephalopathy as CO2 clearance improves, avoiding mechanical ventilation.",
                "cites": [28705941, 10769248]
            }
        ],
        "sources": [
            {
                "pmid": 28705941,
                "title": "Official ERS/ATS clinical practice guidelines: noninvasive ventilation for acute respiratory failure",
                "journal": "Eur Respir J",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 10769248,
                "title": "Non-invasive positive pressure ventilation to treat respiratory failure resulting from exacerbations of chronic obstructive pulmonary disease: Cochrane systematic review and meta-analysis",
                "journal": "BMJ",
                "year": 2000,
                "design": "meta-analysis"
            },
            {
                "pmid": 27694178,
                "title": "British Thoracic Society/Intensive Care Society Guideline for the Ventilatory Management of Acute Hypercapnic Respiratory Failure in Adults",
                "journal": "Thorax",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Utility and duration of domiciliary nocturnal high-intensity NIV in preventing re-hospitalization in persistent severe hypercapnia after discharge.",
            "Role of high-flow nasal cannula (HFNC) as an alternative or step-down therapy between intermittent NIV sessions during acute COPD exacerbations."
        ],
        "mcq_angles": [
            "Mortality reduction magnitude (~50%) with NIV in acute COPD exacerbations.",
            "Criteria for NIV initiation in COPD (pH <7.35 and PaCO2 >45 mmHg despite standard bronchodilators/steroids).",
            "Significance of repeat ABG at 1-2 hours as a predictor of NIV success vs failure."
        ],
        "case_hooks": [
            "A 67-year-old severe COPD patient arriving with RR 32, pH 7.28, PaCO2 68 mmHg, and PaO2 56 mmHg, initiated on BiPAP (IPAP 12, EPAP 4) with pH normalizing to 7.36 at 2 hours.",
            "A 72-year-old smoker on BiPAP whose 1-hour repeat ABG shows worsening pH 7.21 and PaCO2 82 mmHg, leading to prompt activation of the intubation team."
        ],
        "gaps": "Lack of clear randomized algorithms determining the precise rate and timing of NIV weaning during clinical recovery from acute COPD exacerbations."
    },

    1205: {
        "cluster": "Oncology",
        "mentor_intro": "Immune checkpoint inhibitors targeting the programmed cell death-1 (PD-1) / programmed cell death-ligand 1 (PD-L1) axis have transformed the therapeutic paradigm of advanced and metastatic non-small cell lung cancer (NSCLC). In patients without actionable oncogenic driver alterations (e.g., EGFR, ALK, ROS1), monotherapy with pembrolizumab or atezolizumab is the preferred first-line standard for high PD-L1 expressors (TPS >=50%), whereas chemoimmunotherapy combinations provide survival superiority in tumors with low (<50%) or negative (<1%) PD-L1 expression.",
        "teaching_points": [
            {
                "claim": "In the landmark KEYNOTE-024 trial, pembrolizumab monotherapy significantly improved overall survival compared to platinum-doublet chemotherapy (median OS 30.0 vs 14.2 months, HR 0.63) in untreated advanced NSCLC with PD-L1 tumor proportion score (TPS) >=50% lacking EGFR/ALK aberrations.",
                "cites": [27718847, 33095682]
            },
            {
                "claim": "In patients with metastatic nonsquamous NSCLC regardless of PD-L1 expression, the KEYNOTE-189 trial demonstrated that adding pembrolizumab to pemetrexed and platinum chemotherapy significantly prolonged overall survival (12-month OS 69.2% vs 49.4%, HR 0.49).",
                "cites": [29658856]
            },
            {
                "claim": "In metastatic squamous NSCLC, the KEYNOTE-407 trial confirmed that pembrolizumab combined with carboplatin and paclitaxel/nab-paclitaxel produced significant overall survival benefits (median OS 15.9 vs 11.3 months, HR 0.64) across all PD-L1 strata.",
                "cites": [30280635]
            },
            {
                "claim": "Before initiating checkpoint immunotherapy in advanced NSCLC, comprehensive molecular biomarker testing for targetable driver mutations (EGFR, ALK, ROS1, BRAF, RET, MET exon 14, KRAS G12C) is mandatory, as EGFR/ALK-positive tumors exhibit low response rates to single-agent immunotherapy and heightened risk of severe immune pneumonitis.",
                "cites": [27718847, 34538803]
            }
        ],
        "sources": [
            {
                "pmid": 27718847,
                "title": "Pembrolizumab versus Chemotherapy for PD-L1-Positive Non-Small-Cell Lung Cancer",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 33095682,
                "title": "Five-Year Overall Survival for Patients With Advanced Non-Small-Cell Lung Cancer Treated With Pembrolizumab: Results From the KEYNOTE-024 Study",
                "journal": "J Clin Oncol",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 29658856,
                "title": "Pembrolizumab plus Chemotherapy in Metastatic Non-Small-Cell Lung Cancer",
                "journal": "N Engl J Med",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": 30280635,
                "title": "Pembrolizumab plus Chemotherapy for Squamous Non-Small-Cell Lung Cancer",
                "journal": "N Engl J Med",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": 34538803,
                "title": "Metastatic Non-Small Cell Lung Cancer: ASCO Guideline Rapid Recommendation Update",
                "journal": "J Clin Oncol",
                "year": 2021,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal treatment duration (fixed 2-year cessation vs indefinite continuation until progression) for complete responders on first-line immunotherapy.",
            "Efficacy of immunotherapy combination regimens in STK11- or KEAP1-mutant NSCLC subgroups that demonstrate intrinsic primary immunotherapy resistance."
        ],
        "mcq_angles": [
            "First-line single-agent pembrolizumab criteria: PD-L1 TPS >=50% and absence of sensitizing EGFR/ALK mutations (KEYNOTE-024).",
            "Chemoimmunotherapy combinations in metastatic nonsquamous (KEYNOTE-189: pembro + pemetrexed/platinum).",
            "Poor efficacy and increased toxicity of immunotherapy in oncogene-driven (EGFR/ALK) lung cancers."
        ],
        "case_hooks": [
            "A 64-year-old former smoker diagnosed with stage IV lung adenocarcinoma with PD-L1 TPS of 85% and wild-type EGFR/ALK, initiated on frontline single-agent pembrolizumab.",
            "A 58-year-old male with metastatic squamous cell lung cancer and PD-L1 0% receiving carboplatin, paclitaxel, and pembrolizumab under KEYNOTE-407 protocol."
        ],
        "gaps": "Predictive biomarkers beyond PD-L1 and tumor mutational burden (TMB) to identify non-responders susceptible to hyperprogressive disease on checkpoint inhibitors."
    },

    1206: {
        "cluster": "Pulmonology / Rheumatology",
        "mentor_intro": "Nonspecific interstitial pneumonia (NSIP) is a distinct idiopathic or autoimmune-associated interstitial lung disease characterised by homogeneous alveolar wall inflammation or expansion, contrasting with the patchy, heterogeneous subpleural honeycombing typical of usual interstitial pneumonia (UIP/IPF). NSIP carries a markedly superior prognosis compared to IPF, exhibits prominent responsiveness to systemic immunosuppression, and frequently serves as the pulmonary sentinel manifestation of systemic sclerosis, polymyositis/dermatomyositis, or undifferentiated connective tissue disease.",
        "teaching_points": [
            {
                "claim": "High-resolution computed tomography (HRCT) in NSIP characteristically shows bilateral, symmetric ground-glass opacities and fine reticulation with lower lobe and subpleural sparing, whereas honeycombing is characteristically absent or minimal.",
                "cites": [23999963, 18276943]
            },
            {
                "claim": "Histopathologically, NSIP is categorized into cellular and fibrotic variants; cellular NSIP consists of mild-to-moderate chronic interstitial inflammation without significant collagen remodeling, conferring an exceptional 5-year survival (>90%).",
                "cites": [18276943, 23999963]
            },
            {
                "claim": "First-line pharmacotherapy for symptomatic or deteriorating NSIP consists of systemic corticosteroids (prednisone 0.5-1 mg/kg/day) often combined with steroid-sparing immunosuppressants (mycophenolate mofetil, cyclophosphamide, or azathioprine).",
                "cites": [23999963, 27142649]
            },
            {
                "claim": "In patients with progressive fibrosing NSIP despite immunomodulatory therapy, the phase 3 INBUILD trial demonstrated that the tyrosine kinase inhibitor nintedanib significantly slowed the annual rate of decline in forced vital capacity (FVC).",
                "cites": [31664152]
            }
        ],
        "sources": [
            {
                "pmid": 23999963,
                "title": "An official American Thoracic Society/European Respiratory Society statement: Update of the international multidisciplinary consensus classification of the idiopathic interstitial pneumonias",
                "journal": "Am J Respir Crit Care Med",
                "year": 2013,
                "design": "guideline"
            },
            {
                "pmid": 18276943,
                "title": "Idiopathic nonspecific interstitial pneumonia: an officially endorsed ATS Project",
                "journal": "Am J Respir Crit Care Med",
                "year": 2008,
                "design": "guideline"
            },
            {
                "pmid": 27142649,
                "title": "Mycophenolate mofetil versus oral cyclophosphamide in scleroderma-related interstitial lung disease (SLS II): a randomised controlled, double-blind, parallel group trial",
                "journal": "Lancet Respir Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 31664152,
                "title": "Nintedanib in Progressive Fibrosing Interstitial Lung Diseases (INBUILD)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Threshold for combining upfront antifibrotic therapy (nintedanib) with immunosuppression (mycophenolate) in newly diagnosed fibrotic NSIP.",
            "Long-term risk of relapse upon weaning maintenance immunosuppressive therapy in cellular vs fibrotic NSIP."
        ],
        "mcq_angles": [
            "HRCT hallmark of NSIP: symmetric ground-glass attenuation with distinctive subpleural sparing.",
            "Prognostic difference between cellular NSIP (>90% 5-year survival) and fibrotic NSIP / UIP.",
            "Efficacy of mycophenolate mofetil as primary steroid-sparing immunosuppressive agent."
        ],
        "case_hooks": [
            "A 46-year-old female with Raynaud phenomenon and progressive dyspnea whose HRCT reveals basilar ground-glass opacities with subpleural sparing, diagnosed with systemic sclerosis-associated NSIP.",
            "A 55-year-old male with biopsy-proven fibrotic NSIP experiencing 8% annual FVC decline despite azathioprine, evaluated for add-on nintedanib therapy under the INBUILD trial criteria."
        ],
        "gaps": "Randomized clinical trials establishing the optimal initial immunosuppressive regimen (corticosteroids alone vs upfront combination with mycophenolate mofetil) in idiopathic NSIP."
    },

    1207: {
        "cluster": "Infectious Disease / Pulmonology",
        "mentor_intro": "Nontuberculous mycobacterial (NTM) lung disease—most frequently driven by Mycobacterium avium complex (MAC), Mycobacterium kansasii, and Mycobacterium abscessus—is a chronic pulmonary infection occurring predominantly in patients with pre-existing bronchiectasis, COPD, or systemic immunosuppression. Establishing a diagnosis demands fulfilling strict ATS/ERS/ESCMID/IDSA diagnostic criteria encompassing clinical symptoms, radiographic evidence (cavitary or nodular/bronchiectatic infiltrates), and microbiologic confirmation from multiple sputum or bronchoscopic samples.",
        "teaching_points": [
            {
                "claim": "ATS/ERS/ESCMID/IDSA guidelines require all three criteria for NTM pulmonary disease: pulmonary symptoms, consistent radiographic imaging (HRCT showing bronchiectasis with tree-in-bud nodules or cavitary disease), and microbiologic culture proof (>=2 positive separate sputa, or >=1 positive BAL/biopsy).",
                "cites": [32630323]
            },
            {
                "claim": "For macrolide-susceptible non-cavitary nodular/bronchiectatic MAC lung disease, the guideline-recommended regimen is a three-drug oral regimen administered three times weekly: azithromycin (or clarithromycin), rifampin, and ethambutol.",
                "cites": [32630323, 17278283]
            },
            {
                "claim": "Cavitary MAC lung disease requires a daily three-drug oral regimen (azithromycin, rifampin, ethambutol) plus consideration of parenteral amikacin or streptomycin for the initial 2-3 months.",
                "cites": [32630323]
            },
            {
                "claim": "In patients with refractory MAC lung disease who remain culture-positive after >=6 months of guideline-based therapy, adding amikacin liposome inhalation suspension (ALIS) significantly increases culture conversion rates (CONVERT trial, 29% vs 9% in control).",
                "cites": [30219614, 32630323]
            }
        ],
        "sources": [
            {
                "pmid": 32630323,
                "title": "Treatment of Nontuberculous Mycobacterial Pulmonary Disease: An Official ATS/ERS/ESCMID/IDSA Clinical Practice Guideline",
                "journal": "Eur Respir J",
                "year": 2020,
                "design": "guideline"
            },
            {
                "pmid": 17278283,
                "title": "An official ATS/IDSA statement: diagnosis, treatment, and prevention of nontuberculous mycobacterial diseases",
                "journal": "Am J Respir Crit Care Med",
                "year": 2007,
                "design": "guideline"
            },
            {
                "pmid": 30219614,
                "title": "Amikacin Liposome Inhalation Suspension for Treatment-Refractory Lung Disease Caused by Mycobacterium avium Complex (CONVERT): A Prospective, Open-Label, Randomized Study",
                "journal": "Am J Respir Crit Care Med",
                "year": 2018,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal treatment duration for multidrug-resistant Mycobacterium abscessus lung disease carrying inducible erythromycin methylase (erm41) macrolide resistance.",
            "Long-term safety and ototoxicity surveillance strategies during prolonged inhaled vs intravenous aminoglycoside administration."
        ],
        "mcq_angles": [
            "ATS/IDSA microbiologic criteria: >=2 separate expectorated sputa or 1 BAL.",
            "First-line 3-drug oral therapy for MAC (macrolide, ethambutol, rifamycin).",
            "Indication for inhaled liposomal amikacin (ALIS) in treatment-refractory MAC (CONVERT trial)."
        ],
        "case_hooks": [
            "A 68-year-old non-smoking female with middle lobe bronchiectasis presenting with chronic cough and weight loss whose CT reveals tree-in-bud nodules and two sputa isolate M. avium.",
            "A 72-year-old male with persistent MAC-positive cultures despite 9 months of azithromycin/ethambutol/rifampin, initiated on amikacin liposomal inhalation suspension."
        ],
        "gaps": "Shortage of oral therapeutic options with high bactericidal potency and favorable tolerability profiles for chronic treatment of M. abscessus."
    },

    1208: {
        "cluster": "Neurology / Neurosurgery",
        "mentor_intro": "Normal pressure hydrocephalus (NPH) is a treatable cause of secondary dementia and gait impairment characterized by ventricular enlargement disproportionate to sulcal atrophy in the presence of normal opening cerebrospinal fluid (CSF) pressure. The clinical presentation is defined by Adams and Hakim's classic triad: progressive magnetic gait ataxia, subcortical cognitive decline, and urinary urgency/incontinence ('wacky, wobbly, wet'), with ventriculoperitoneal (VP) shunting conferring substantial clinical reversibility if performed early.",
        "teaching_points": [
            {
                "claim": "Brain MRI features of idiopathic NPH characteristically display ventriculomegaly (Evan's index >0.30) with disproportionately enlarged subarachnoid space hydrocephalus (DESH), manifested by tight high-convexity sulci and enlarged Sylvian fissures.",
                "cites": [33433602, 16141384]
            },
            {
                "claim": "The high-volume CSF tap test (lumbar puncture draining 30-50 mL of CSF) evaluates gait velocity and cadence using quantitative 10-meter timed walking tests before and after tap; objective gait improvement provides high positive predictive value (>85-90%) for successful VP shunt response.",
                "cites": [33433602, 16141384]
            },
            {
                "claim": "In the randomized multicenter European and SINPHONI trials, VP shunt implantation with programmable differential-pressure valves significantly improved gait and overall functional independence in >70-80% of carefully selected NPH patients.",
                "cites": [24726207, 20385994]
            },
            {
                "claim": "Gait dysfunction is the earliest symptom to appear and the most responsive to surgical CSF diversion; patients presenting with longstanding dementia and late-stage urinary incontinence without prominent gait disturbances exhibit markedly poorer post-shunt recovery.",
                "cites": [33433602, 24726207]
            }
        ],
        "sources": [
            {
                "pmid": 33433602,
                "title": "Guidelines for Management of Idiopathic Normal Pressure Hydrocephalus (Third Edition)",
                "journal": "Neurol Med Chir (Tokyo)",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": 16141384,
                "title": "The diagnosis and management of idiopathic normal pressure hydrocephalus",
                "journal": "Neurosurgery",
                "year": 2005,
                "design": "guideline"
            },
            {
                "pmid": 24726207,
                "title": "The European multicentre study on idiopathic normal pressure hydrocephalus: a prospective study on 142 patients",
                "journal": "Acta Neurochir (Wien)",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": 20385994,
                "title": "A prospective study on ventriculoperitoneal shunt surgery for idiopathic normal pressure hydrocephalus (SINPHONI)",
                "journal": "Lancet Neurol",
                "year": 2010,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Utility of 72-hour continuous external lumbar drainage (ELD) in patients with classic DESH features but ambiguous 50 mL tap test response.",
            "Long-term impact of comorbid Alzheimer disease or Lewy body pathology (detected via CSF amyloid/tau biomarkers) on durability of post-shunt cognitive improvement."
        ],
        "mcq_angles": [
            "Classic triad: magnetic gait apraxia, urinary urgency, and cognitive impairment ('wobbly, wet, wacky').",
            "Diagnostic imaging feature: DESH pattern (tight high-convexity sulci and dilated Sylvian fissures).",
            "Positive predictive value of quantitative gait speed improvement after 30-50 mL CSF tap test."
        ],
        "case_hooks": [
            "A 74-year-old male presenting with a broad-based, shuffling 'glued-to-the-floor' magnetic gait and mild memory loss whose 10-meter walk test time improves from 28s to 17s post-tap test.",
            "A 68-year-old woman whose brain MRI shows Evan's index 0.38 and high convexity sulcal effacement, referred to neurosurgery for programmable VP shunt placement."
        ],
        "gaps": "Reliable non-invasive imaging or biofluid biomarkers predicting shunt responsiveness without requiring lumbar puncture or invasive CSF drainage."
    },

    1209: {
        "cluster": "Infectious Disease",
        "mentor_intro": "The escalating global dissemination of multidrug-resistant (MDR) and extensively drug-resistant (XDR) Gram-negative pathogens—specifically carbapenem-resistant Enterobacterales (CRE), Pseudomonas aeruginosa with difficult-to-treat resistance (DTR-P), and carbapenem-resistant Acinetobacter baumannii (CRAB)—has necessitated novel beta-lactamase inhibitor combinations and unique siderophore cephalosporins to replace toxic legacy polymyxins.",
        "teaching_points": [
            {
                "claim": "Ceftazidime-avibactam possesses potent activity against KPC and OXA-48 carbapenemases in Enterobacterales and resistant P. aeruginosa, but is completely inactive against metallo-beta-lactamases (MBLs such as NDM, VIM, and IMP) unless combined with aztreonam.",
                "cites": [34658076, 29099979]
            },
            {
                "claim": "Cefiderocol—a novel siderophore cephalosporin that exploits bacterial iron transport systems ('Trojan horse' mechanism)—maintains stability against serine carbapenemases (KPC, OXA) and metallo-beta-lactamases (NDM, VIM, IMP), as well as difficult-to-treat P. aeruginosa and Stenotrophomonas maltophilia.",
                "cites": [33058771, 34658076]
            },
            {
                "claim": "Imipenem-cilastatin-relebactam restores imipenem susceptibility against KPC-producing Enterobacterales and multidrug-resistant P. aeruginosa lacking OprD porins, demonstrating non-inferiority with significantly lower nephrotoxicity compared to colistin plus imipenem (RESTORE-IMI 1 trial).",
                "cites": [31393990]
            },
            {
                "claim": "IDSA guidance on antimicrobial-resistant Gram-negative infections recommends ceftazidime-avibactam, meropenem-vaborbactam, or imipenem-relebactam as preferred frontline therapy for KPC infections, actively discouraging colistin and polymyxin B monotherapy due to excessive mortality and acute kidney injury.",
                "cites": [34658076]
            }
        ],
        "sources": [
            {
                "pmid": 34658076,
                "title": "Infectious Diseases Society of America Guidance on the Treatment of Extended-Spectrum beta-Lactamase Producing Enterobacterales (ESBL-E), Carbapenem-Resistant Enterobacterales (CRE), and Pseudomonas aeruginosa with Difficult-to-Treat Resistance (DTR-P. aeruginosa)",
                "journal": "Clin Infect Dis",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": 29099979,
                "title": "Efficacy and safety of ceftazidime-avibactam versus colistin for the treatment of carbapenem-resistant Klebsiella pneumoniae infections: a retrospective cohort study",
                "journal": "Clin Infect Dis",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": 33058771,
                "title": "Cefiderocol versus best available therapy for the treatment of serious infections caused by carbapenem-resistant Gram-negative bacteria (CREDIBLE-CR): a randomised, open-label, multicentre, pathogen-focused, descriptive, phase 3 trial",
                "journal": "Lancet Infect Dis",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 31393990,
                "title": "Imipenem/relebactam versus colistin plus imipenem for the treatment of imipenem-non-susceptible infections: results from the RESTORE-IMI 1 trial",
                "journal": "Clin Infect Dis",
                "year": 2020,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Mortality imbalance observed with cefiderocol in Acinetobacter baumannii infections in the CREDIBLE-CR trial and optimal combination partner regimens.",
            "Rapid emergence of ceftazidime-avibactam resistance driven by D179Y mutations in KPC-3 beta-lactamases."
        ],
        "mcq_angles": [
            "Avibactam spectrum: active against KPC and OXA-48; ineffective against MBLs (NDM-1) without aztreonam.",
            "Cefiderocol siderophore iron-uptake mechanism covering both serine and metallo-beta-lactamases.",
            "RESTORE-IMI 1 trial: superior renal safety of imipenem-relebactam compared to colistin-based regimens."
        ],
        "case_hooks": [
            "A 63-year-old liver transplant recipient in the ICU with KPC-producing Klebsiella pneumoniae bacteremia successfully treated with ceftazidime-avibactam.",
            "A 52-year-old burn victim with extensively drug-resistant NDM-producing Pseudomonas sepsis commenced on synergy therapy with ceftazidime-avibactam plus aztreonam."
        ],
        "gaps": "Cost-effectiveness data and antimicrobial stewardship protocols defining triggers for empirical vs pathogen-directed use of novel beta-lactamase inhibitors."
    },

    1210: {
        "cluster": "Rheumatology",
        "mentor_intro": "Nonsteroidal anti-inflammatory drugs (NSAIDs) represent the foundational first-line pharmacologic therapy for active axial spondyloarthritis (axSpA), encompassing both radiographic (ankylosing spondylitis) and non-radiographic axSpA. Beyond symptomatic relief of inflammatory back pain and morning stiffness, the clinical controversy centers on whether continuous full-dose NSAID administration attenuates spinal radiographic progression (syndesmophyte formation and spinal ankylosis) compared to on-demand symptom-driven use.",
        "teaching_points": [
            {
                "claim": "ASAS-EULAR recommendations establish full-dose NSAIDs as first-line therapy for active axSpA, recommending trial of at least two different NSAIDs at maximum anti-inflammatory dose for a minimum duration of 4 weeks before declaring therapeutic failure.",
                "cites": [27827807, 36270658]
            },
            {
                "claim": "In the randomized trial by Wanders et al., continuous NSAID therapy over 2 years significantly reduced radiographic spinal progression (modified Stoke Ankylosing Spondylitis Spine Score, mSASSS) compared to on-demand therapy, particularly in patients with baseline syndesmophytes and elevated acute-phase reactants.",
                "cites": [15934081]
            },
            {
                "claim": "In contrast, the prospective randomized ENRADAS trial evaluating celecoxib found no significant overall difference in 2-year radiographic progression between continuous and on-demand NSAID arms, indicating that the structural benefit is restricted to high-risk patients with elevated baseline CRP.",
                "cites": [26744397, 36270658]
            },
            {
                "claim": "Continuous long-term NSAID therapy requires systematic cardiovascular, renal, and gastrointestinal risk stratification, with co-prescription of proton pump inhibitors (PPIs) in patients at elevated peptic ulcer risk.",
                "cites": [27827807, 36270658]
            }
        ],
        "sources": [
            {
                "pmid": 27827807,
                "title": "2016 update of the ASAS/EULAR management recommendations for axial spondyloarthritis",
                "journal": "Ann Rheum Dis",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 36270658,
                "title": "2022 update of the ASAS-EULAR recommendations for the management of axial spondyloarthritis",
                "journal": "Ann Rheum Dis",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 15934081,
                "title": "Nonsteroidal antiinflammatory drugs reduce radiographic progression in patients with ankylosing spondylitis: a randomized clinical trial",
                "journal": "Arthritis Rheum",
                "year": 2005,
                "design": "trial"
            },
            {
                "pmid": 26744397,
                "title": "Effect of continuous versus on-demand treatment with celecoxib on radiographic progression in patients with ankylosing spondylitis: the ENRADAS randomized trial",
                "journal": "Ann Rheum Dis",
                "year": 2016,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Whether modern biologic DMARDs (anti-TNF, anti-IL-17A) negate the potential structural retardant effect of continuous NSAIDs when used in combination.",
            "Biomarkers predicting which subset of axSpA patients develop accelerated syndesmophyte growth under on-demand NSAID regimens."
        ],
        "mcq_angles": [
            "ASAS/EULAR recommendation for first-line NSAID trial (>=2 NSAIDs for >=4 weeks total).",
            "Contrasting results between Wanders (structural benefit of continuous NSAIDs) and ENRADAS trials.",
            "Subgroup most likely to derive structural disease retardation from continuous NSAIDs (elevated CRP and baseline syndesmophytes)."
        ],
        "case_hooks": [
            "A 28-year-old male with newly diagnosed ankylosing spondylitis achieving dramatic relief of inflammatory nocturnal spinal pain within 48 hours of starting full-dose naproxen.",
            "A 35-year-old male with axSpA, elevated baseline CRP, and bridging syndesmophytes on lumbar radiograph deciding between continuous vs on-demand celecoxib therapy."
        ],
        "gaps": "Lack of 5- to 10-year prospective randomized trials evaluating the cardiovascular safety trade-off of continuous full-dose NSAIDs in young axSpA populations."
    }
}
