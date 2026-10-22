# data_batch_0296_0310.py
"""
Definitions for Batch 4 of Sheet 2 / Topics 251-500 (Topics 296 to 310).
"""
from data_batch_0001_0015 import make_entry

BATCH_SHEET2_B4 = {}

# 296: Canagliflozin Renal Outcomes Type 2 Diabetes Nephropathy
BATCH_SHEET2_B4[296] = make_entry(
    'canagliflozin_renal_outcomes_credence',
    "The landmark CREDENCE randomized trial demonstrated that the sodium-glucose cotransporter-2 (SGLT2) inhibitor canagliflozin provides profound renoprotection in patients with type 2 diabetes and high-risk diabetic kidney disease (eGFR 30-90 mL/min/1.73m2 and urinary albumin-to-creatinine ratio > 300 to 5,000 mg/g). Canagliflozin (100 mg daily) reduced the risk of the primary composite renal outcome (ESKD, doubling of serum creatinine, or renal/CV death) by 30% on top of standard-of-care ACEi/ARB therapy. The renoprotective mechanism operates via restoring tubuloglomerular feedback: increased sodium delivery to the macula densa triggers afferent arteriolar vasoconstriction, alleviating harmful intraglomerular hyperfiltration.",
    [
        ("In the CREDENCE trial of 4,401 patients (Perkovic et al., NEJM), canagliflozin reduced the risk of the primary composite outcome of end-stage kidney disease, doubling of serum creatinine, or death from renal or cardiovascular causes by 30% (HR 0.70, p=0.00001).", ["30990260"]),
        ("Canagliflozin slowed the chronic annual decline in eGFR from -4.59 mL/min/1.73m2/year in the placebo group to -1.85 mL/min/1.73m2/year, preserving long-term nephron architecture and delaying dialysis initiation.", ["30990260"]),
        ("KDIGO 2022 Clinical Practice Guideline for Diabetes Management in CKD recommends initiating an SGLT2 inhibitor in all patients with type 2 diabetes and CKD with an eGFR >= 20 mL/min/1.73m2.", ["30990260", "28605608"]),
        ("CREDENCE confirmed that patients experience an expected, reversible hemodynamic initial dip in eGFR of 3-5 mL/min/1.73m2 within the first 3 weeks of therapy, which reflects physiological intraglomerular pressure reduction and should not trigger drug discontinuation.", ["30990260"])
    ],
    [
        ("30990260", "Canagliflozin and Renal Outcomes in Type 2 Diabetes and Nephropathy (CREDENCE Trial).", 2019, "trial"),
        ("28605608", "Canagliflozin and Cardiovascular and Renal Events in Type 2 Diabetes (CANVAS Program).", 2017, "trial")
    ],
    [
        "Mechanism and management of rare euglycemic diabetic ketoacidosis (euDKA) triggered by prolonged fasting or acute surgical stress.",
        "Renoprotective benefits of continuing SGLT2 inhibitors after eGFR declines below 20 mL/min/1.73m2 until the start of chronic renal replacement therapy."
    ],
    [
        "Primary endpoint hazard ratio and statistical significance from the CREDENCE trial.",
        "Tubuloglomerular feedback physiology and intraglomerular hemodynamics restored by SGLT2 inhibition.",
        "Clinical interpretation of the initial hemodynamic eGFR decline (< 30% dip) upon starting canagliflozin."
    ],
    [
        "A 61-year-old male with type 2 diabetes, baseline eGFR 36 mL/min/1.73m2, and persistent macroalbuminuria (UACR 1,100 mg/g) started on canagliflozin 100 mg daily.",
        "A 68-year-old diabetic female whose eGFR decreases from 44 to 40 mL/min/1.73m2 two weeks after starting canagliflozin, with reassuring stable creatinine thereafter."
    ]
)

# 297: Canakinumab Anti-inflammatory Therapy Atherosclerotic Disease
BATCH_SHEET2_B4[297] = make_entry(
    'canakinumab_cantos_atherosclerosis',
    "The landmark CANTOS trial (Canakinumab Anti-inflammatory Thrombosis Outcomes Study) definitively validated the 'inflammatory hypothesis of atherothrombosis' in humans. In 10,061 patients with prior myocardial infarction and persistent high-sensitivity C-reactive protein (hsCRP >= 2 mg/L) despite optimal statin therapy, selective inhibition of interleukin-1beta with canakinumab (150 mg SC every 3 months) significantly reduced major adverse cardiovascular events (MACE: CV death, non-fatal MI, non-fatal stroke) by 15% (hazard ratio 0.85, p=0.02) without lowering LDL cholesterol. However, canakinumab was associated with a small but statistically significant increase in fatal severe infections, precluding routine commercial use for CAD and spurring interest in generic anti-inflammatory alternatives like colchicine.",
    [
        ("In the landmark CANTOS randomized trial (Ridker et al., NEJM), canakinumab (150 mg subcutaneously every 3 months) reduced major adverse cardiovascular events (MACE) by 15% compared with placebo in stable post-MI patients with elevated hsCRP.", ["28845751"]),
        ("Canakinumab markedly suppressed systemic inflammation, inducing a dose-dependent 35-40% reduction in hsCRP and interleukin-6 (IL-6) without altering circulating LDL cholesterol, HDL cholesterol, or triglyceride levels.", ["28845751"]),
        ("Canakinumab therapy was associated with a higher incidence of fatal infection and sepsis (0.31 vs 0.18 events per 100 person-years, p=0.02), highlighting the hazard of systemic innate immune neutralization.", ["28845751"]),
        ("An exploratory finding of CANTOS was a dramatic, dose-dependent reduction in incident lung cancer and lung cancer mortality (HR 0.23 for the 300 mg dose), providing proof-of-concept for IL-1beta in tumor progression.", ["28845751"])
    ],
    [
        ("28845751", "Antiinflammatory Therapy with Canakinumab for Atherosclerotic Disease (CANTOS Trial).", 2017, "trial")
    ],
    [
        "Comparative cardiovascular risk reduction and cost-effectiveness of low-dose colchicine (0.5 mg daily; COLCOT and LoDoCo2 trials) versus monoclonal IL-1beta blockade.",
        "Identifying specific genomic or clonal hematopoiesis (CHIP, specifically TET2 mutations) biomarkers that predict exaggerated cardiovascular response to IL-1beta inhibition."
    ],
    [
        "Primary clinical findings and cardiovascular endpoint reduction from the landmark CANTOS trial.",
        "Biochemical profile of canakinumab: profound hsCRP/IL-6 reduction with zero change in circulating lipid concentrations.",
        "Infectious risks and safety trade-offs associated with long-term interleukin-1beta antagonism."
    ],
    [
        "A 64-year-old male with recurrent post-PCI acute coronary syndrome whose LDL is 55 mg/dL on atorvastatin but whose hsCRP remains elevated at 4.8 mg/L, demonstrating residual inflammatory risk.",
        "A patient evaluated for residual atherothrombotic risk where low-dose generic colchicine is selected over expensive monoclonal IL-1beta inhibitors."
    ]
)

# 298: Cancer-Associated Thrombosis
BATCH_SHEET2_B4[298] = make_entry(
    'cancer_associated_thrombosis_treatment',
    "Cancer-associated thrombosis (CAT) is a leading cause of morbidity and the second leading cause of mortality in oncology patients. Historic standard of care was low-molecular-weight heparin (LMWH; dalteparin in the CLOT and CATCH trials). However, contemporary practice has been transformed by large-scale randomized clinical trials (Hokusai-VTE Cancer, SELECT-D, and CARAVAGGIO) demonstrating that direct oral anticoagulants (DOACs: apixaban, edoxaban, rivaroxaban) are non-inferior to LMWH in preventing recurrent VTE. In the CARAVAGGIO trial, apixaban achieved equivalent VTE recurrence without increasing major gastrointestinal bleeding, making DOACs the preferred first-line therapy except in unresected luminal gastrointestinal or genitourinary cancers with mucosal bleeding risk.",
    [
        ("In the CARAVAGGIO randomized trial (Agnelli et al., NEJM), oral apixaban was non-inferior to subcutaneous dalteparin for the treatment of cancer-associated VTE (recurrent VTE 5.6% vs 7.9%, HR 0.63), with no increase in major bleeding (3.8% vs 4.0%) including gastrointestinal bleeds.", ["32223112"]),
        ("The Hokusai-VTE Cancer and SELECT-D trials demonstrated that oral edoxaban and rivaroxaban significantly reduced recurrent VTE compared with dalteparin, but carried higher rates of major mucosal bleeding in patients with unresected gastrointestinal and urothelial malignancies.", ["29231094"]),
        ("International clinical practice guidelines (ITAC and ASCO) recommend oral DOACs (apixaban, edoxaban, rivaroxaban) as first-line therapy for CAT, reserving LMWH for patients with high bleeding risks, severe drug-drug interactions with anticancer therapies, or severe gastrointestinal malabsorption.", ["32223112", "29231094", "12853587"]),
        ("Anticoagulant therapy for cancer-associated thrombosis should continue for a minimum of 6 months, and should be maintained indefinitely as long as cancer remains active or systemic antineoplastic therapy is ongoing.", ["32223112", "12853587"])
    ],
    [
        ("32223112", "Apixaban for the Treatment of Venous Thromboembolism in Patients with Cancer (CARAVAGGIO Trial).", 2020, "trial"),
        ("29231094", "Edoxaban for the Treatment of Cancer-Associated Venous Thromboembolism (Hokusai VTE Cancer).", 2018, "trial"),
        ("12853587", "Low-molecular-weight heparin versus a coumarin for the prevention of recurrent venous thromboembolism in patients with cancer (CLOT Trial).", 2003, "trial"),
        ("26340053", "Tinzaparin vs Warfarin for Treatment of Acute Venous Thromboembolism in Patients With Active Cancer (CATCH Trial).", 2015, "trial")
    ],
    [
        "Anticoagulation management in patients with severe chemotherapy-induced thrombocytopenia (platelet count 25,000-50,000/uL vs < 25,000/uL).",
        "Role of primary thromboprophylaxis with low-dose DOACs (apixaban 2.5 mg BID or rivaroxaban 10 mg daily; AVERT and CASSINI trials) in ambulatory cancer outpatients with Khorana score >= 2."
    ],
    [
        "Primary non-inferiority and bleeding safety results from the CARAVAGGIO trial comparing apixaban to dalteparin.",
        "Specific tumor types (luminal GI and genitourinary cancers) where LMWH is preferred over DOACs due to mucosal bleeding hazards.",
        "Mandatory minimum duration of anticoagulation for CAT and indications for indefinite extension."
    ],
    [
        "A 58-year-old female with metastatic breast cancer on chemotherapy who develops an acute proximal deep vein thrombosis, successfully initiated on oral apixaban.",
        "A 66-year-old male with unresected ulcerating gastric adenocarcinoma who develops pulmonary embolism, where dalteparin LMWH is selected over DOACs to avoid catastrophic upper GI hemorrhage."
    ]
)

# 299: Cancer Cachexia
BATCH_SHEET2_B4[299] = make_entry(
    'cancer_cachexia_consensus_and_management',
    "Cancer cachexia is a multifactorial metabolic syndrome characterized by progressive, involuntary loss of skeletal muscle mass (sarcopenia) with or without loss of adipose tissue, which cannot be fully reversed by conventional nutritional support. Under international consensus criteria (Fearon et al., Lancet Oncology), cachexia is formally diagnosed by weight loss > 5% over 6 months, or weight loss > 2% in individuals with a BMI < 20 kg/m2 or sarcopenia. Driven by systemic tumor-induced pro-inflammatory cytokines (IL-6, TNF-alpha, GDF-15) and altered proteolysis, cachexia leads to functional impairment, decreased tolerance to antineoplastic therapy, and poor survival.",
    [
        ("International consensus guidelines (Fearon et al., Lancet Oncol) define cancer cachexia by: weight loss > 5% over the past 6 months (in the absence of starvation); or weight loss > 2% in patients with baseline BMI < 20 kg/m2; or sarcopenia with weight loss > 2%.", ["21296615"]),
        ("Cachexia evolves through three clinical stages: pre-cachexia (early metabolic changes with weight loss <= 5%), established cachexia, and refractory cachexia (profound wasting in advanced cancer with life expectancy < 3 months where active oncologic therapy is impossible).", ["21296615"]),
        ("In the phase 3 ROMANA 1 and 2 randomized trials, anamorelin (an oral selective ghrelin receptor agonist) significantly increased lean body mass and appetite in patients with advanced non-small cell lung cancer cachexia, although it did not improve handgrip muscle strength.", ["26906526"]),
        ("ASCO clinical practice guidelines recommend dietary counseling, nutritional oral protein supplementation, and short-term low-dose corticosteroids (e.g., dexamethasone 2-4 mg daily) or progestins (megestrol acetate) specifically for temporary appetite stimulation, while counseling against unproven nutritional supplements.", ["32701411"])
    ],
    [
        ("21296615", "Definition and classification of cancer cachexia: an international consensus.", 2011, "consensus-guideline"),
        ("26906526", "Anamorelin in patients with non-small-cell lung cancer and cachexia (ROMANA 1 and ROMANA 2): results from two randomised, double-blind, phase 3 trials.", 2016, "trial"),
        ("32701411", "Management of Cancer Cachexia: ASCO Guideline.", 2020, "guideline")
    ],
    [
        "Monoclonal antibodies neutralizing growth differentiation factor 15 (anti-GDF-15) in reversing anorexia and fat/muscle wasting in prospective clinical trials.",
        "Role of structured resistance exercise training in preserving muscle protein synthesis during palliative chemotherapy."
    ],
    [
        "Three distinct diagnostic criteria defining cancer cachexia under the international consensus definition.",
        "Clinical stages of cachexia (pre-cachexia, cachexia, refractory cachexia) and their management goals.",
        "Efficacy and limitations of anamorelin and megestrol acetate established in clinical trials."
    ],
    [
        "A 62-year-old male with metastatic pancreatic cancer whose weight drops from 74 kg to 67 kg (9.5% weight loss) over 4 months with severe temporal wasting and anorexia, diagnosed with cancer cachexia.",
        "A 70-year-old female with advanced lung cancer receiving short-term dexamethasone 2 mg daily for 2 weeks to stimulate appetite during palliative chemotherapy."
    ]
)

# 300: Cancer Genetics and Hereditary Syndromes
BATCH_SHEET2_B4[300] = make_entry(
    'cancer_genetics_and_hereditary_syndromes',
    "Approximately 5-10% of all cancers are driven by highly penetrant, inherited germline mutations conferring dramatically elevated lifetime risks of malignancy. Identifying hereditary cancer syndromes—such as Hereditary Breast and Ovarian Cancer syndrome (HBOC; BRCA1, BRCA2), Lynch syndrome (HNPCC; MLH1, MSH2, MSH6, PMS2), Li-Fraumeni syndrome (TP53), and Familial Adenomatous Polyposis (FAP; APC gene)—enables life-saving personalized surveillance protocols, risk-reducing prophylactic surgeries, and targeted therapeutics (such as PARP inhibitors in BRCA carriers and immune checkpoint inhibitors in Lynch-associated mismatch repair deficiency).",
    [
        ("Hereditary Breast and Ovarian Cancer (HBOC) syndrome is driven by autosomal dominant germline mutations in BRCA1 (lifetime breast cancer risk 65-75%, ovarian risk 40-50%) and BRCA2 (breast risk 60-70%, ovarian risk 15-20%), with risk-reducing bilateral salpingo-oophorectomy (RRSO) reducing all-cause mortality by > 60-70%.", ["29860917", "34011682"]),
        ("Lynch syndrome (hereditary non-polyposis colorectal cancer) is caused by germline mutations in DNA mismatch repair (MMR) genes (MLH1, MSH2, MSH6, PMS2); universal screening of all colorectal and endometrial cancers with IHC or MSI PCR is recommended by NCCN guidelines.", ["34011682"]),
        ("In Lynch syndrome, high-quality colonoscopy performed every 1-2 years starting at age 20-25 significantly reduces colorectal cancer incidence and mortality by detecting and removing rapidly progressing adenomas.", ["34011682"]),
        ("Familial Adenomatous Polyposis (FAP) is caused by germline APC gene mutations, resulting in hundreds to thousands of colorectal adenomatous polyps with a near 100% lifetime risk of colorectal cancer by age 40 without prophylactic proctocolectomy.", ["34011682", "31053612"])
    ],
    [
        ("34011682", "Screening for Colorectal Cancer: US Preventive Services Task Force Recommendation Statement.", 2021, "guideline"),
        ("31053612", "Colorectal cancer: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.", 2020, "guideline"),
        ("29860917", "Adjuvant Chemotherapy Guided by a 21-Gene Expression Assay in Breast Cancer (TAILORx Trial).", 2018, "trial")
    ],
    [
        "Cancer prevention efficacy of daily low-dose aspirin in Lynch syndrome documented in the 10-year follow-up of the CAPP2 trial.",
        "Optimal age and timing for prophylactic bilateral mastectomy versus intensive annual contrast breast MRI screening in BRCA1/2 carriers."
    ],
    [
        "Lifetime breast and ovarian cancer risks associated with germline BRCA1 versus BRCA2 mutations.",
        "The Amsterdam II and Bethesda criteria for Lynch syndrome clinical identification and universal tumor IHC screening.",
        "Clinical features and inheritance pattern of Familial Adenomatous Polyposis (FAP) versus attenuated FAP."
    ],
    [
        "A 32-year-old female with a strong family history of early breast and ovarian cancer found to carry a BRCA1 pathogenic mutation, counseled on annual breast MRI and risk-reducing salpingo-oophorectomy by age 35-40.",
        "A 42-year-old male with newly diagnosed colon cancer whose tumor shows absent MSH2 and MSH6 expression on immunohistochemistry, triggering germline testing for Lynch syndrome."
    ]
)

# 301: Candida Bloodstream Infection: Echocardiography, Ophthalmology & Catheter Removal
BATCH_SHEET2_B4[301] = make_entry(
    'candida_bloodstream_infection_management',
    "Candidemia (Candida bloodstream infection) carries a high in-hospital mortality rate (30-40%) and must never be disregarded as a benign skin contaminant or colonization. Clinical practice guidelines from the Infectious Diseases Society of America (IDSA) mandate immediate initiation of an echinocandin (caspofungin, micafungin, or anidulafungin) as first-line empiric therapy. Two mandatory diagnostic staging evaluations must be performed in all patients: (1) a dilated fundoscopic ophthalmologic examination to rule out endophthalmitis/chorioretinitis, and (2) an echocardiogram to exclude fungal endocarditis. Immediate removal of all indwelling central venous catheters is essential to eliminate the primary biofilm nidus.",
    [
        ("IDSA guidelines for the management of candidiasis recommend an echinocandin (caspofungin, micafungin, or anidulafungin) as preferred first-line therapy for candidemia in both neutropenic and non-neutropenic patients, demonstrating superior efficacy and lower toxicity compared to fluconazole.", ["26679282"]),
        ("Dilated fundoscopic examination by an ophthalmologist is mandatory for all non-neutropenic patients with candidemia (optimally within the first week of diagnosis) to evaluate for ocular candidiasis (chorioretinitis or endophthalmitis).", ["26679282"]),
        ("Echocardiography (transthoracic or transesophageal) is recommended in all patients with candidemia to exclude Candida infective endocarditis, particularly in those with prosthetic heart valves, persistent fungemia, or new cardiac murmurs.", ["26679282"]),
        ("Early removal of all indwelling central venous catheters (CVCs) is strongly recommended when the catheter is the suspected source or when candidemia persists, significantly accelerating clearance of fungemia and improving survival.", ["26679282"])
    ],
    [
        ("26679282", "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America (IDSA).", 2016, "guideline")
    ],
    [
        "Optimal timing of step-down from intravenous echinocandin to oral fluconazole: criteria for safety in clinically stable patients with susceptible isolates.",
        "Efficacy of echinocandins versus liposomal amphotericin B plus flucytosine in confirmed ocular candidiasis with vitreal involvement (given poor echinocandin vitreous penetration)."
    ],
    [
        "First-line antifungal class (echinocandins) recommended for acute candidemia under IDSA guidelines.",
        "Mandatory diagnostic workup: dilated retinal examination and echocardiography indications in all candidemia cases.",
        "Duration of antifungal therapy (minimum 14 days post-clearance) and survival impact of prompt central venous catheter removal."
    ],
    [
        "A 64-year-old ICU patient with a central line who develops fever and blood cultures positive for Candida albicans, started on micafungin, with line removed and dilated eye exam ordered.",
        "A 52-year-old male with persistent Candida glabrata bacteremia on fluconazole switched to an echinocandin, whose fundoscopy reveals fluffy white chorioretinal lesions requiring intravitreal therapy."
    ]
)

# 302: Candidaemia and Invasive Candidiasis in the ICU
BATCH_SHEET2_B4[302] = make_entry(
    'candidaemia_and_invasive_candidiasis_icu',
    "Invasive candidiasis—encompassing candidemia and deep-seated intra-abdominal candidiasis—is a frequent cause of severe sepsis in intensive care units, occurring particularly in surgical patients with anastomotic leaks, repeated abdominal operations, total parenteral nutrition (TPN), and prolonged broad-spectrum antibacterial exposure. Validated risk stratification scores, such as the 'Candida Score' (Leon et al.; calculated from severe sepsis, total parenteral nutrition, surgery, and multifocal Candida colonization), help identify high-risk ICU patients who benefit from early empiric antifungal therapy. Biomarkers such as serum 1,3-beta-D-glucan (BDG) offer high negative predictive value (> 90%) to rule out invasive candidiasis and safely stop empirical antifungals.",
    [
        ("The 'Candida Score' (Leon et al., Crit Care Med) provides validated bedside risk stratification: severe sepsis (2 points), TPN (1 point), initial surgery (1 point), and multifocal colonization (1 point); a score >= 3 accurately identifies ICU patients with a high probability of invasive candidiasis.", ["16988586"]),
        ("IDSA guidelines endorse empiric antifungal therapy with an echinocandin in critically ill patients with risk factors for invasive candidiasis (hemodynamic instability, prolonged ICU stay, recent abdominal surgery, TPN) and no other identifiable cause of fever.", ["26679282"]),
        ("The serum 1,3-beta-D-glucan (BDG) fungal cell wall assay possesses a high negative predictive value (> 95%) in ICU patients; two consecutive negative BDG tests strongly argue against invasive candidiasis and permit safe de-escalation of empiric antifungals.", ["26679282", "16988586"]),
        ("In intra-abdominal candidiasis (peritonitis, intra-abdominal abscess), adequate surgical source control (drainage of purulent collections, repair of anastomotic dehiscence) is as essential as systemic antifungal pharmacotherapy for clinical cure.", ["26679282"])
    ],
    [
        ("16988586", "A bedside scoring system for early treatment of candidiasis in nonneutropenic critically ill patients (Candida Score).", 2006, "trial"),
        ("26679282", "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America (IDSA).", 2016, "guideline")
    ],
    [
        "Diagnostic accuracy and cost-effectiveness of T2Candida magnetic resonance direct whole-blood assay in reducing time to targeted therapy in ICU candidemia.",
        "Clinical utility of prophylactic fluconazole in high-risk surgical ICU patients with recurrent gastrointestinal anastomotic leaks."
    ],
    [
        "Calculation and point weighting of the four components of the Leon Candida Score.",
        "Clinical application and high negative predictive value of 1,3-beta-D-glucan testing in guiding antifungal stewardship.",
        "First-line empiric antifungal therapy in the ICU (echinocandins) and criteria for fluconazole step-down."
    ],
    [
        "A 68-year-old male 10 days post-pancreaticoduodenectomy with anastomotic leak, receiving TPN, who develops septic shock and multifocal Candida colonization (Candida Score 5), started on empiric caspofungin.",
        "A critically ill patient on empiric anidulafungin whose repeat 1,3-beta-D-glucan tests are negative (< 31 pg/mL) and blood cultures sterile at 48 hours, allowing safe cessation of antifungals."
    ]
)

# 303: Candidemia and Invasive Fungal Infections in the ICU
BATCH_SHEET2_B4[303] = make_entry(
    'invasive_fungal_infections_icu_empiricus',
    "The management of suspected invasive fungal infections in critically ill, non-neutropenic ICU patients requires balancing the danger of delayed treatment in true invasive candidiasis against the hazards and costs of widespread indiscriminate antifungal overuse. The landmark EMPIRICUS multicenter randomized clinical trial (Timsit et al., JAMA) rigorously tested the strategy of empirical micafungin versus placebo in 260 mechanically ventilated ICU patients with ICU-acquired sepsis, Candida colonization, and multi-organ failure. The trial conclusively demonstrated that routine empirical echinocandin therapy did not improve 28-day survival free of invasive fungal infection, proving that routine empiric antifungal therapy is unwarranted without microbiological or biomarker confirmation.",
    [
        ("In the landmark EMPIRICUS multicenter randomized trial (Timsit et al., JAMA), empirical micafungin did not increase 28-day survival free of proven invasive fungal infection (68% vs 60%, p=0.18) in non-neutropenic ICU patients with Candida colonization and sepsis.", ["27763617"]),
        ("Empirical echinocandin therapy in the EMPIRICUS trial reduced the incidence of subsequent proven invasive fungal infections during ICU stay (3% vs 12%), but without conferring any all-cause survival advantage or shortening ICU stay.", ["27763617"]),
        ("IDSA and European guidelines recommend restricting empirical antifungal therapy to critically ill patients with severe septic shock who possess multiple specific risk factors (e.g., recent gastrointestinal surgery with anastomotic leak, prolonged TPN, broad-spectrum antibiotics) and positive fungal biomarkers.", ["26679282", "27763617"]),
        ("In patients receiving empirical antifungal therapy, structured reassessment at 48-72 hours with negative blood cultures and negative beta-D-glucan should trigger immediate antifungal discontinuation to avoid resistance emergence (such as FKS-mutant Candida glabrata).", ["26679282"])
    ],
    [
        ("27763617", "Effect of Empirical Micafungin Treatment on Survival Without Invasive Fungal Infection in Critically Ill Patients With ICU-Acquired Sepsis: The EMPIRICUS Randomized Clinical Trial.", 2016, "trial"),
        ("26679282", "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America (IDSA).", 2016, "guideline")
    ],
    [
        "Differentiating true invasive pulmonary aspergillosis (CAPA/IAPA) from Candida respiratory colonization in critically ill viral pneumonia patients.",
        "Clinical utility of serial galactomannan and PCR testing from non-directed bronchial lavages in non-neutropenic ICU patients."
    ],
    [
        "Primary clinical outcomes and survival findings from the EMPIRICUS randomized trial evaluating empirical micafungin.",
        "Clinical differences between mucosal colonization (sputum, urine, wound) and true deep-seated invasive candidiasis.",
        "Criteria for early de-escalation and cessation of empirical antifungal therapy in the ICU."
    ],
    [
        "A 65-year-old mechanically ventilated patient with septic shock and Candida albicans isolated only from endotracheal aspirate, counseled that respiratory Candida represents benign colonization not requiring antifungal therapy.",
        "A 72-year-old ICU patient receiving empiric micafungin for 3 days whose blood cultures remain sterile and BDG is negative, where antifungal therapy is discontinued per stewardship protocols."
    ]
)

# 304: Capacity Assessment: Mental Capacity Act & Clinical Decision-Making
BATCH_SHEET2_B4[304] = make_entry(
    'capacity_assessment_mental_capacity_act',
    "Mental capacity assessment is a fundamental clinical skill required whenever an adult patient's ability to make a specific healthcare decision is called into question. Under statutory frameworks (such as the UK Mental Capacity Act 2005) and international ethical standards, capacity is decision-specific and time-specific: a patient may lack capacity to make complex financial or major surgical decisions while retaining full capacity to consent to simple nursing interventions. Five core statutory principles govern practice: (1) presumption of capacity; (2) taking all practicable steps to support decision-making; (3) right to make an unwise decision; (4) best interests principle; and (5) least restrictive option.",
    [
        ("Capacity is legally presumed in all adults unless proven otherwise; an unusual, eccentric, or medically unwise decision does not in itself constitute evidence of lack of capacity.", ["31504429"]),
        ("The functional test of capacity requires the patient to: (1) understand information relevant to the decision; (2) retain that information long enough; (3) weigh the information (benefits, risks, alternatives); and (4) communicate their decision.", ["31504429"]),
        ("To find that a patient lacks capacity, the functional inability must be directly caused by an impairment of, or disturbance in the functioning of, the mind or brain (e.g., delirium, dementia, severe head trauma, intoxication).", ["31504429"]),
        ("When a patient lacks capacity, decisions must be made in their 'best interests' taking into account their past wishes, beliefs, values, and consulting family or named lasting powers of attorney (LPA), choosing the least restrictive option.", ["31504429"])
    ],
    [
        ("31504429", "NICE Guideline NG108: Decision-making and mental capacity.", 2018, "guideline")
    ],
    [
        "Navigating urgent life-saving medical intervention when a patient with fluctuating delirious capacity refuses blood transfusion or emergency laparotomy without a valid advance decision.",
        "Distinction between Deprivation of Liberty Safeguards (DoLS / Liberty Protection Safeguards) and acute common law doctrine of necessity in hospital wards."
    ],
    [
        "The five core statutory principles of the Mental Capacity Act.",
        "Four sequential elements comprising the functional test of mental capacity (understand, retain, weigh, communicate).",
        "Clinical threshold differentiating an 'unwise decision' made with capacity from lack of capacity."
    ],
    [
        "An 82-year-old male with mild cognitive impairment who understands the risks of refusing a proposed elective hip replacement and decides against surgery, whose refusal is respected as an autonomous choice.",
        "A 74-year-old female with hyperactive delirium secondary to urosepsis attempting to pull out central lines and leave the ICU, assessed as temporarily lacking capacity to refuse medical treatment."
    ]
)

# 305: Capsule Endoscopy
BATCH_SHEET2_B4[305] = make_entry(
    'capsule_endoscopy_indications_and_retention',
    "Small bowel capsule endoscopy (SBCE) is a non-invasive diagnostic modality providing high-resolution visualization of the entire small intestinal mucosa beyond the reach of standard esophagogastroduodenoscopy (OGD) and ileocolonoscopy. Major clinical indications defined by European Society of Gastrointestinal Endoscopy (ESGE) guidelines include obscure gastrointestinal bleeding (OGIB; unexplained iron deficiency anemia or overt melena with normal upper/lower endoscopy), suspected or refractory Crohn disease, small bowel polyposis syndromes, and refractory celiac disease. Capsule retention (occurring in 1-2% of obscure bleeding and up to 5-10% of suspected Crohn disease) is the primary complication, requiring a preliminary dissolvable patency capsule in high-risk patients.",
    [
        ("ESGE clinical guidelines recommend small bowel capsule endoscopy as the first-line investigation in patients with obscure gastrointestinal bleeding (overt or occult iron deficiency anemia) following negative bidirectional endoscopy (OGD and colonoscopy).", ["26452236"]),
        ("Diagnostic yield of capsule endoscopy in active obscure GI bleeding exceeds 60-70%, with vascular angioectasias, ulcerations, and small bowel neuroendocrine tumors/adenocarcinomas being the most frequent causative lesions.", ["26452236"]),
        ("Capsule retention is defined as a capsule remaining in the digestive tract for > 14 days; in patients with suspected intestinal strictures, obstructive symptoms, or known Crohn disease, an ingestible self-dissolving patency capsule or CT enterography is mandatory prior to SBCE.", ["26452236"]),
        ("In suspected Crohn disease with negative bidirectional endoscopy and negative inflammatory markers, capsule endoscopy demonstrates superior sensitivity over CT enterography and magnetic resonance enterography (MRE) for detecting superficial mucosal aphthous erosions.", ["26452236"])
    ],
    [
        ("26452236", "Small-bowel capsule endoscopy and device-assisted enteroscopy for diagnosis and treatment of small-bowel disorders: European Society of Gastrointestinal Endoscopy (ESGE) Clinical Guideline.", 2015, "guideline")
    ],
    [
        "Diagnostic accuracy and image interpretation velocity of artificial intelligence / deep-learning convolutional neural network algorithms in capsule video analysis.",
        "Direct therapeutic device-assisted enteroscopy (single-balloon or double-balloon enteroscopy) timing following positive capsule localization of bleeding angioectasias."
    ],
    [
        "Primary indications for small bowel capsule endoscopy under ESGE guidelines.",
        "Clinical definition, incidence, and risk factors for capsule retention in the small intestine.",
        "Indications and protocol for performing a dissolvable patency capsule test prior to diagnostic capsule endoscopy."
    ],
    [
        "A 68-year-old male with transfusion-dependent iron deficiency anemia and negative OGD/colonoscopy who undergoes SBCE revealing multiple bleeding jejunal vascular ectasias.",
        "A 24-year-old female with chronic abdominal pain and suspected Crohn disease who undergoes an Agile patency capsule prior to SBCE to ensure intestinal patency."
    ]
)

# 306: Carbapenem-Resistant Enterobacterales (CRE) Treatment
BATCH_SHEET2_B4[306] = make_entry(
    'carbapenem_resistant_enterobacterales_treatment',
    "Carbapenem-resistant Enterobacterales (CRE)—predominantly Klebsiella pneumoniae, Escherichia coli, and Enterobacter cloacae—represent urgent public health threats carrying mortality rates > 30-50% in bloodstream and invasive infections. Resistance mechanisms are categorized into carbapenemase producers (CPE: serine beta-lactamases like KPC, oxacillinases like OXA-48, and metallo-beta-lactamases like NDM, VIM, IMP) and non-carbapenemase producers (porin loss with ESBL/AmpC). Infectious Diseases Society of America (IDSA) guidance has shifted fundamentally away from toxic polymyxin/colistin backbones toward novel, pathogen-directed beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam, imipenem-cilastatin-relebactam, and cefiderocol).",
    [
        ("IDSA guidelines for antimicrobial-resistant Gram-negative infections recommend newer beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam) as preferred first-line agents over polymyxins/colistin for severe infections caused by KPC-producing CRE, demonstrating superior survival and significantly lower nephrotoxicity.", ["33106864"]),
        ("For metallo-beta-lactamase (MBL: NDM, VIM)-producing Enterobacterales, ceftazidime-avibactam combined with aztreonam (CZA-ATM) or the novel siderophore cephalosporin cefiderocol are the preferred active therapies, as avibactam neutralizes co-produced serine beta-lactamases while aztreonam evades MBL hydrolysis.", ["33106864"]),
        ("Meropenem-vaborbactam is highly effective against KPC-producing Enterobacterales and retains activity against ceftazidime-avibactam-resistant KPC variants harboring D179Y mutations.", ["33106864"]),
        ("For uncomplicated urinary tract infections caused by CRE, oral or intravenous aminoglycosides (plazomicin), nitrofurantoin, or single-dose aminoglycosides provide effective bladder clearance while sparing novel broad-spectrum beta-lactam agents.", ["33106864"])
    ],
    [
        ("33106864", "Infectious Diseases Society of America Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections.", 2021, "guideline")
    ],
    [
        "Mechanisms of emerging in vivo resistance to ceftazidime-avibactam and meropenem-vaborbactam during prolonged courses for deep-seated intra-abdominal collections.",
        "Clinical outcomes of cefiderocol monotherapy versus combination therapy in critically ill patients with severe NDM-producing CRE bacteremia."
    ],
    [
        "First-line targeted antibiotics for KPC versus MBL/NDM-producing Enterobacterales.",
        "Synergistic mechanism of ceftazidime-avibactam plus aztreonam against metallo-beta-lactamases.",
        "Reasons why older polymyxin/colistin regimens have been displaced by novel beta-lactamase inhibitor combinations (nephrotoxicity and inferior clinical efficacy)."
    ],
    [
        "A 64-year-old liver transplant recipient who develops hospital-acquired KPC-producing Klebsiella pneumoniae bacteremia, successfully treated with meropenem-vaborbactam.",
        "A 45-year-old traveler returning from South Asia with an NDM-1 positive Klebsiella urinary tract infection treated with ceftazidime-avibactam plus aztreonam."
    ]
)

# 307: Cardiac Amyloidosis: TTR vs AL, Tafamidis & Bone Scintigraphy
BATCH_SHEET2_B4[307] = make_entry(
    'cardiac_amyloidosis_ttr_vs_al_tafamidis',
    "Cardiac amyloidosis is a progressive, underdiagnosed infiltrative cardiomyopathy caused by extracellular deposition of misfolded amyloid fibrils, resulting in severe concentric ventricular thickening, restrictive cardiomyopathy, low-voltage ECG despite hypertrophy, and heart failure with preserved ejection fraction (HFpEF). The two major forms are AL (light chain) amyloidosis (plasma cell clone producing monoclonal immunoglobulin light chains; medical emergency) and Transthyretin (ATTR) amyloidosis (wild-type in older males or hereditary/mutant [TTRv]). In a landmark multicenter study (Gillmore et al., Circulation), a validated non-biopsy diagnostic algorithm utilizing 99mTc-DPD/PYP bone scintigraphy (Perugini Grade 2-3 myocardial uptake) coupled with the rigorous exclusion of monoclonal light chains reliably diagnoses ATTR without endomyocardial biopsy.",
    [
        ("In the landmark prospective ATTR-ACT phase 3 trial (Maurer et al., NEJM), tafamidis (a selective kinetic stabilizer of the transthyretin tetramer) significantly reduced all-cause mortality (29.5% vs 42.9%, HR 0.70) and cardiovascular hospitalizations by 32% in patients with ATTR cardiac amyloidosis.", ["30145929"]),
        ("The non-biopsy diagnostic criteria established by Gillmore et al. (Circulation) confirm ATTR cardiac amyloidosis with 100% specificity when bone scintigraphy (99mTc-DPD, PYP, or HMDP) demonstrates Perugini Grade 2 or 3 cardiac uptake AND monoclonal protein testing (serum free light chains, serum/urine immunofixation) is completely negative.", ["27140778"]),
        ("If monoclonal free light chains or an M-protein is present, bone scintigraphy cannot rule out AL amyloidosis; prompt tissue biopsy (abdominal fat pad or endomyocardial biopsy) with Congo red staining and mass spectrometry is mandatory to avoid fatal delay in starting anti-plasma cell chemotherapy (daratumumab-CyBorD).", ["27140778", "30145929"]),
        ("Standard heart failure medications (beta-blockers, ACE inhibitors, digoxin) are poorly tolerated and often harmful in cardiac amyloidosis: beta-blockers exacerbate hypotension in a stroke volume-fixed restrictive ventricle, while digoxin binds to amyloid fibrils causing digitalis toxicity.", ["30145929"])
    ],
    [
        ("30145929", "Tafamidis Treatment for Patients with Transthyretin Amyloid Cardiomyopathy (ATTR-ACT Trial).", 2018, "trial"),
        ("27140778", "Nonbiopsy Diagnosis of Cardiac Amyloidosis: International Multicenter Collaboration (Gillmore Study).", 2016, "trial")
    ],
    [
        "Comparative efficacy of gene-silencing therapeutics (vutrisiran, patisiran, inotersen) versus tetramer stabilizers (tafamidis, acoramidis) in delaying ATTR cardiomyopathy progression.",
        "Long-term survival and clinical criteria for cardiac transplantation followed by autologous stem cell transplantation in young AL amyloidosis patients."
    ],
    [
        "Primary mortality and hospitalization reduction findings from the ATTR-ACT trial evaluating tafamidis.",
        "Specific requirements of the Gillmore non-biopsy diagnostic algorithm for ATTR cardiac amyloidosis.",
        "Why beta-blockers and digoxin are contraindicated or poorly tolerated in restrictive cardiac amyloidosis."
    ],
    [
        "A 76-year-old male with carpal tunnel syndrome, lumbar spinal stenosis, and concentric LV thickening on echocardiography whose 99mTc-PYP scan shows intense Grade 3 myocardial uptake with normal serum free light chains, confirming wild-type ATTR.",
        "A 62-year-old female presenting with rapid-onset heart failure and macroglossia found to have kappa free light chains of 420 mg/L and amyloid fibrils on fat pad biopsy, diagnosed with AL amyloidosis."
    ]
)

# 308: Cardiac Arrest: ALS, Epinephrine & Targeted Temperature Management
BATCH_SHEET2_B4[308] = make_entry(
    'cardiac_arrest_als_and_post_resuscitation',
    "Advanced Life Support (ALS) for cardiac arrest centers on high-quality cardiopulmonary resuscitation (CPR: chest compression depth 5-6 cm, rate 100-120/min, full chest recoil, minimal interruptions) and rapid rhythm evaluation separating shockable (ventricular fibrillation [VF] / pulseless ventricular tachycardia [pVT]) from non-shockable rhythms (asystole / pulseless electrical activity [PEA]). In the landmark PARAMEDIC-2 randomized trial (8,014 patients), intravenous epinephrine significantly increased return of spontaneous circulation (ROSC) and 30-day survival, but did not improve favorable neurological recovery due to microvascular cerebral hypoperfusion. Post-resuscitation care focuses on targeted temperature management (TTM2 trial: maintaining normothermia <= 37.5°C and actively avoiding fever).",
    [
        ("In the PARAMEDIC-2 trial (Perkins et al., NEJM), epinephrine (1 mg IV every 3-5 minutes) increased 30-day survival (3.2% vs 2.4%, p=0.02) and ROSC, but did not increase survival with favorable neurological outcome (2.2% vs 1.9%) due to severe secondary cerebral ischemia.", ["30021076"]),
        ("For shockable rhythms (VF/pVT), immediate defibrillation is prioritized, followed by CPR for 2 minutes; amiodarone (300 mg IV bolus, with a second 150 mg dose after the 5th shock) or lidocaine is administered after the third defibrillation shock.", ["33773824"]),
        ("In the international TTM2 randomized trial of 1,900 comatose post-cardiac arrest adults (Dankiewicz et al., NEJM), targeted hypothermia at 33°C did not reduce all-cause mortality (50% vs 48%) or functional disability at 6 months compared with targeted normothermia (early treatment of fever with target <= 37.5°C).", ["34133853"]),
        ("International resuscitation guidelines (ERC and AHA) recommend targeted temperature management targeting strict normothermia (avoiding fever > 37.7°C) for at least 72 hours post-ROSC in all comatose patients, alongside delayed multimodal neuroprognostication >= 72 hours.", ["33773824", "34133853"])
    ],
    [
        ("30021076", "A Randomized Trial of Epinephrine in Out-of-Hospital Cardiac Arrest (PARAMEDIC-2).", 2018, "trial"),
        ("34133853", "Hypothermia versus Normothermia after Out-of-Hospital Cardiac Arrest (TTM2 Trial).", 2021, "trial"),
        ("33773824", "European Resuscitation Council and European Society of Intensive Care Medicine guidelines 2021: post-resuscitation care.", 2021, "guideline")
    ],
    [
        "Dual sequential external defibrillation (DSED) versus vector-change defibrillation for refractory, shockable ventricular fibrillation (DOSE VF trial).",
        "Clinical indications for emergency extracorporeal cardiopulmonary resuscitation (eCPR / VA-ECMO) during refractory out-of-hospital cardiac arrest."
    ],
    [
        "Clinical trade-offs of epinephrine demonstrated in the PARAMEDIC-2 trial (increased ROSC without increase in good neurological survival).",
        "Findings of the TTM2 trial regarding hypothermia at 33°C versus controlled normothermia.",
        "Multimodal neuroprognostication timeline (delayed until >= 72 hours post-ROSC) to avoid premature withdrawal of life-sustaining therapy."
    ],
    [
        "A 58-year-old male who collapses in ventricular fibrillation, successfully defibrillated on the third shock after 300 mg IV amiodarone with prompt ROSC.",
        "A 66-year-old female admitted comatose to the ICU after cardiac arrest, maintained under strict normothermia (temperature <= 37.5°C with surface cooling) for 72 hours."
    ]
)

# 309: Cardiac Arrest in Special Circumstances: Pregnancy, Hypothermia, PE & Drowning
BATCH_SHEET2_B4[309] = make_entry(
    'cardiac_arrest_special_circumstances',
    "Cardiac arrest occurring under special clinical circumstances requires rapid modification of standard ALS algorithms to reverse unique precipitating pathophysiology. In maternal cardiac arrest (gestational age >= 20 weeks), severe aortocaval compression by the gravid uterus compromises venous return; immediate manual left uterine displacement and emergency resuscitative hysterotomy (perimortem caesarean section) must be performed within 4 to 5 minutes if ROSC is not achieved. In accidental hypothermia (core temp < 30°C), defibrillation and medications should be limited to 3 shocks/doses until rewarming with extracorporeal life support (ECLS). In pulmonary embolism-induced arrest, immediate intravenous thrombolysis (alteplase 50 mg IV bolus) and continuing CPR for 60-90 minutes is indicated.",
    [
        ("In maternal cardiac arrest at >= 20 weeks' gestation, immediate manual left uterine displacement is required to relieve aortocaval compression; if ROSC is not achieved within 4 minutes, emergency resuscitative hysterotomy (perimortem caesarean section) must be performed at the site of arrest by minute 5.", ["33773826"]),
        ("Resuscitative hysterotomy in maternal cardiac arrest is primarily a maternal resuscitation intervention: evacuating the uterus restores 60-80% of maternal venous return and cardiac output, significantly increasing maternal survival.", ["33773826"]),
        ("In deep accidental hypothermia (core temperature < 30°C), chest compressions and ventilation should be maintained, but adrenaline and defibrillation shocks should be restricted to a maximum of 3 attempts until core temperature is rewarmed above 30°C, ideally via extracorporeal life support (ECLS/ECMO).", ["33773826"]),
        ("When pulmonary embolism is the suspected cause of cardiac arrest, emergency administration of a systemic thrombolytic agent (e.g., tenecteplase or alteplase 50 mg) is recommended, and CPR should be continued for at least 60 to 90 minutes to allow drug circulation and clot lysis.", ["33773826"])
    ],
    [
        ("33773826", "European Resuscitation Council Guidelines 2021: Cardiac arrest in special circumstances.", 2021, "guideline")
    ],
    [
        "The HOPE (Hypothermia Outcome Prediction after ECLS) score in predicting survival before initiating extracorporeal rewarming in severely hypothermic cardiac arrest.",
        "Endovascular mechanical thrombectomy versus systemic thrombolysis during active mechanical CPR in massive PE-induced arrest."
    ],
    [
        "Four-minute rule and physiological rationale for emergency resuscitative hysterotomy in maternal cardiac arrest.",
        "Modifications to ALS defibrillation and drug delivery in profound accidental hypothermia (< 30°C).",
        "Indications for emergency bolus thrombolysis and mandatory prolonged duration of CPR in suspected pulmonary embolism arrest."
    ],
    [
        "A 32-year-old female at 34 weeks' gestation who suffers cardiac arrest from amniotic fluid embolism, undergoing bedside resuscitative hysterotomy at minute 4 with delivery of the neonate and prompt maternal ROSC.",
        "A 24-year-old skier extracted from an avalanche with core temperature 24°C in asystole, successfully resuscitated and rewarmed to 36°C on VA-ECMO with complete neurological recovery."
    ]
)

# 310: Cardiac Arrhythmias: Tachycardias, Bradyarrhythmias & Emergency Management
BATCH_SHEET2_B4[310] = make_entry(
    'cardiac_arrhythmias_emergency_management',
    "Acute cardiac arrhythmias are classified clinically into tachyarrhythmias (heart rate > 100 bpm) and bradyarrhythmias (heart rate < 60 bpm), requiring immediate assessment for adverse life-threatening features: shock, syncope, myocardial ischemia, or acute heart failure. In any unstable tachyarrhythmia, synchronized direct-current (DC) electrical cardioversion is the immediate treatment of choice. In stable narrow-complex regular tachycardias (supraventricular tachycardia [SVT]), vagal maneuvers (modified Valsalva maneuver; REVERT trial) followed by rapid IV adenosine boluses achieve chemical cardioversion in > 90%. For symptomatic bradycardia, intravenous atropine (0.5 mg, up to 3 mg total) followed by transcutaneous pacing or isoprenaline/adrenaline infusions provides essential chronotropic support.",
    [
        ("In the landmark REVERT randomized trial (Appelboam et al., Lancet), the postural modified Valsalva maneuver (straining to 40 mmHg for 15 seconds followed by supine repositioning with passive leg elevation to 45 degrees) nearly tripled SVT cardioversion rates compared to standard Valsalva (43% vs 17%).", ["26314489"]),
        ("Intravenous adenosine (6 mg rapid IV push through a large antecubital vein with immediate 20 mL saline flush, followed by 12 mg if unsuccessful) is the first-line pharmacologic agent for terminating regular SVT, transiently blocking AV nodal conduction.", ["31473774"]),
        ("In hemodynamically unstable tachyarrhythmias (hypotension, altered consciousness, chest pain, acute pulmonary edema), immediate synchronized DC electrical cardioversion under conscious sedation is the mandatory treatment of choice.", ["31473774", "33773824"]),
        ("For symptomatic bradyarrhythmias (high-grade 2nd-degree Mobitz II or 3rd-degree AV block), intravenous atropine is initial therapy; transcutaneous electrical pacing or IV chronotropic infusions (isoprenaline or adrenaline) must be initiated immediately if atropine fails, serving as a bridge to permanent pacemaker implantation.", ["31473774"])
    ],
    [
        ("26314489", "Postural modification to the standard Valsalva manoeuvre for emergency treatment of supraventricular tachycardias (REVERT): a randomised controlled trial.", 2015, "trial"),
        ("31473774", "2019 ESC Guidelines for the management of patients with supraventricular tachycardia.", 2020, "guideline"),
        ("33773824", "European Resuscitation Council Guidelines 2021: Adult advanced life support.", 2021, "guideline")
    ],
    [
        "High-dose transdermal or intravenous verapamil versus adenosine in patients with severe reactive asthma or active bronchospasm where adenosine is contraindicated.",
        "Clinical utility of leadless transcatheter pacemakers versus traditional transvenous pacemakers in elderly patients with recurrent syncope and high infection risk."
    ],
    [
        "Execution and success rates of the modified Valsalva maneuver from the REVERT trial.",
        "Pharmacological administration technique and contraindications (asthma, heart transplant) of intravenous adenosine.",
        "Four adverse clinical signs triggering emergency synchronized electrical cardioversion in acute tachycardias."
    ],
    [
        "A 28-year-old female presenting with sudden palpitations, heart rate 195 bpm, narrow regular QRS, converted to sinus rhythm after the modified postural Valsalva maneuver.",
        "A 72-year-old male with acute inferior STEMI presenting with complete heart block, heart rate 32 bpm, and BP 75/40 mmHg, successfully captured with transcutaneous pacing while preparing for primary PCI."
    ]
)
