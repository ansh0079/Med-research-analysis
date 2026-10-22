# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 9 (Topics 201-225) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_09_TOPICS = {
    "Triple-Negative Breast Cancer": {
        "mentor_intro": (
            "Triple-negative breast cancer (TNBC) is defined immunohistochemically by the lack of oestrogen receptor (ER <1%), progesterone receptor (PR <1%), and human epidermal growth factor receptor 2 (HER2) overexpression or gene amplification. "
            "Characterized by high histological grade, aggressive clinical trajectory, TP53 mutations, and propensity for visceral and central nervous system metastases, TNBC carries the poorest prognosis among breast cancer subtypes. "
            "Treatment paradigms integrate anthracycline/taxane-based chemotherapy, platinum salts, immune checkpoint inhibitors (pembrolizumab), PARP inhibitors for germline BRCA carriers, and antibody-drug conjugates (sacituzumab govitecan) for advanced disease."
        ),
        "teaching_points": [
            "Triple-negative breast cancer lacks ER, PR, and HER2 expression; all patients diagnosed with TNBC aged <=65 years (and all metastatic cases) must be referred for germline BRCA1/2 genetic testing.",
            "Neoadjuvant chemotherapy combined with pembrolizumab significantly increases pathological complete response (pCR) rates and event-free survival in stage II-III early TNBC, with pembrolizumab continued postoperatively as adjuvant therapy (KEYNOTE-522 trial).",
            "Pathological complete response (pCR, ypT0/is ypN0) after neoadjuvant therapy is a powerful surrogate for long-term overall survival; patients with residual invasive disease at surgical resection benefit from adjuvant capecitabine (CREATE-X trial) or olaparib if germline BRCA-mutated (OlympiA trial).",
            "Sacituzumab govitecan—an antibody-drug conjugate targeting Trop-2 delivering the topoisomerase I inhibitor SN-38—delivers significant overall survival benefit in pretreated unresectable locally advanced or metastatic TNBC (ASCENT trial)."
        ],
        "mcq_angles": [
            "KEYNOTE-522 protocol: indications and duration of neoadjuvant and adjuvant pembrolizumab in early high-risk TNBC.",
            "Post-neoadjuvant adjuvant therapy in patients with residual invasive disease (capecitabine per CREATE-X vs olaparib for germline BRCA carriers per OlympiA).",
            "Mechanism of action and indications for sacituzumab govitecan (Trop-2 ADC) in metastatic TNBC."
        ],
        "case_hooks": [
            "A 38-year-old woman presents with a rapidly growing 3.5 cm palpable breast mass and mobile axillary node; core biopsy reveals grade 3 invasive ductal carcinoma, ER 0%, PR 0%, HER2 0, Ki-67 85%.",
            "A 44-year-old female undergoes lumpectomy following neoadjuvant anthracycline/taxane/carboplatin therapy; surgical pathology reveals 1.2 cm residual invasive carcinoma (non-pCR) with negative margins."
        ],
        "uncertainties": [
            "Necessity and duration of adjuvant pembrolizumab in patients who achieve complete pathological remission (pCR) after neoadjuvant chemo-immunotherapy.",
            "Optimal sequencing between PARP inhibitors and antibody-drug conjugates (sacituzumab govitecan, datopotamab deruxtecan) in metastatic BRCA-mutated TNBC."
        ]
    },

    "Triple-negative breast cancer immunotherapy": {
        "mentor_intro": (
            "Immunotherapy targeting the programmed cell death protein 1 / programmed death-ligand 1 (PD-1/PD-L1) axis has revolutionized the management of both early and advanced triple-negative breast cancer. "
            "Because TNBC possesses higher tumour mutational burden, greater stromal tumour-infiltrating lymphocytes (TILs), and higher PD-L1 expression compared to hormone receptor-positive subtypes, it is particularly susceptible to immune checkpoint blockade. "
            "In early TNBC, pembrolizumab is administered regardless of PD-L1 status (KEYNOTE-522), whereas in advanced/metastatic disease, pembrolizumab is restricted to tumours expressing PD-L1 with a Combined Positive Score (CPS) >=10 (KEYNOTE-355)."
        ),
        "teaching_points": [
            "In early-stage high-risk TNBC (T1c N1-2 or T2-4 N0-2), adding pembrolizumab to platinum/taxane/anthracycline neoadjuvant chemotherapy and continuing it adjuvantly for 9 cycles significantly increases pCR and reduces risk of distant recurrence or death (KEYNOTE-522).",
            "In advanced or metastatic TNBC, pembrolizumab combined with first-line chemotherapy improves progression-free and overall survival ONLY in patients whose tumours express PD-L1 with a Combined Positive Score (CPS) >=10 (KEYNOTE-355 trial).",
            "Immune-related adverse events (irAEs)—most commonly endocrinopathies (hypophysitis, primary hypothyroidism, adrenal insufficiency), dermatologic toxicities, and immune-mediated colitis/pneumonitis—require vigilant surveillance and prompt corticosteroid intervention.",
            "Biomarkers of immune responsiveness in TNBC include stromal tumour-infiltrating lymphocytes (sTILs), high PD-L1 CPS, and high tumour mutational burden (TMB-H >=10 mut/Mb)."
        ],
        "mcq_angles": [
            "Contrasting PD-L1 biomarker requirements: neoadjuvant pembrolizumab in early TNBC is approved REGARDLESS of PD-L1, whereas metastatic first-line pembrolizumab REQUIRES CPS >=10.",
            "Recognizing and managing adrenal insufficiency and hypophysitis in patients receiving checkpoint inhibitors presenting with vague fatigue, hyponatraemia, and hypotension.",
            "Prognostic significance of stromal tumour-infiltrating lymphocytes (sTILs) in predicting spontaneous immune response and pCR."
        ],
        "case_hooks": [
            "A 49-year-old female with metastatic TNBC undergoes biopsy of a liver metastasis; immunohistochemistry reveals PD-L1 22C3 with a Combined Positive Score (CPS) of 18.",
            "A patient receiving neoadjuvant pembrolizumab and paclitaxel presents with acute nausea, dizziness, BP 85/50 mmHg, and serum sodium 128 mmol/L; morning serum cortisol is 42 nmol/L."
        ],
        "uncertainties": [
            "Predictive value of liquid biopsy circulating tumour DNA (ctDNA) dynamics during neoadjuvant immunotherapy in identifying patients who can safely de-escalate adjuvant therapy.",
            "Re-challenge safety and efficacy of checkpoint inhibitors in patients who previously discontinued immunotherapy due to Grade 2-3 irAEs."
        ]
    },

    "Trochanteric Bursitis": {
        "mentor_intro": (
            "Greater trochanteric pain syndrome (GTPS)—historically referred to as trochanteric bursitis—is a common regional pain syndrome characterized by tenderness over the greater trochanter of the femur and lateral hip. "
            "Modern imaging and surgical pathology demonstrate that true isolated bursitis is uncommon; rather, the primary pathology is gluteal tendinopathy or partial tearing of the gluteus medius and gluteus minimus tendons (analogous to rotator cuff tears of the shoulder). "
            "Management emphasizes load management, progressive isometric-to-isotonic gluteal tendon strengthening, and avoiding passive stretching into adduction (which compresses the tendons against the trochanter)."
        ),
        "teaching_points": [
            "Greater trochanteric pain syndrome (GTPS) is primarily a gluteus medius and minimus tendinopathy or insertional tear, rather than pure inflammation of the trochanteric bursa; histopathology shows non-inflammatory tendon degeneration.",
            "Clinical diagnosis is established by localized point tenderness over the greater trochanter, reproducible lateral hip pain during single-leg stance for 30 seconds, resisted hip abduction, and the FADIR or FABER tests.",
            "First-line management centers on mechanotherapy and load management: progressive isometric and isotonic hip abductor strengthening, pelvic control, and avoidance of sustained hip adduction (e.g., crossing legs, standing 'hanging on one hip', or sleeping on the affected side without a pillow between knees).",
            "Local corticosteroid injections provide short-term symptomatic relief (up to 4-12 weeks) but do not confer long-term benefit over structured exercise therapy and carry small risks of tendon atrophy or rupture with repeated injections."
        ],
        "mcq_angles": [
            "Differentiating GTPS from hip osteoarthritis: GTPS exhibits preserved passive hip internal/external rotation with localized lateral trochanteric palpation tenderness, whereas osteoarthritis causes groin pain and restricted internal rotation.",
            "Mechanics of conservative exercise: avoiding tendon compression by eliminating passive adduction stretches (such as IT band stretches across midline).",
            "Indications for MRI of the hip in recalcitrant GTPS (evaluating high-grade partial or full-thickness gluteus medius tears requiring surgical repair)."
        ],
        "case_hooks": [
            "A 56-year-old woman presents with 6 months of aching lateral right hip pain that prevents her from sleeping on her right side; she has point tenderness over the greater trochanter and a positive 30-second single-leg stance test.",
            "A patient with recalcitrant lateral hip pain refractory to two cortisone injections undergoes pelvic MRI, demonstrating a 1.5 cm full-thickness tear of the anterior gluteus medius tendon insertion."
        ],
        "uncertainties": [
            "Comparative long-term clinical efficacy of leukocyte-rich platelet-rich plasma (PRP) injections versus corticosteroid injections in chronic gluteal tendinopathy.",
            "Surgical repair outcomes for high-grade gluteal tendon tears using open versus arthroscopic techniques."
        ]
    },

    "Tuberculosis treatment regimens": {
        "mentor_intro": (
            "Tuberculosis (TB) caused by Mycobacterium tuberculosis remains one of the world's leading infectious causes of death. "
            "Standard treatment of drug-susceptible pulmonary tuberculosis consists of a 6-month regimen divided into a 2-month intensive phase with four first-line bactericidal drugs—rifampicin, isoniazid, pyrazinamide, and ethambutol (RHZE)—followed by a 4-month continuation phase with rifampicin and isoniazid (RH). "
            "Recent clinical breakthroughs have established shorter regimens: a 4-month rifapentine-moxifloxacin regimen for drug-susceptible TB (Study 31), and 6-month all-oral regimens (BPaLM: bedaquiline, pretomanid, linezolid, moxifloxacin) for multidrug-resistant/rifampicin-resistant TB (MDR/RR-TB)."
        ),
        "teaching_points": [
            "Standard first-line therapy for drug-susceptible pulmonary TB entails 2 months of daily RHZE (rifampicin, isoniazid, pyrazinamide, ethambutol) followed by 4 months of daily RH (rifampicin, isoniazid); pyridoxine (vitamin B6, 25-50 mg daily) is co-administered to prevent isoniazid-induced peripheral neuropathy.",
            "The 4-month rifapentine-moxifloxacin regimen (rifapentine, isoniazid, pyrazinamide, and moxifloxacin for 2 months, followed by rifapentine, isoniazid, and moxifloxacin for 2 months) demonstrated non-inferiority to standard 6-month therapy in Study 31/A5349.",
            "Multidrug-resistant TB (MDR-TB, resistant to both isoniazid and rifampicin) is now treated with the 6-month all-oral BPaLM regimen (bedaquiline, pretomanid, linezolid 600 mg, and moxifloxacin), which replaces historic 18-24 month toxic injectable-based regimens.",
            "Baseline and on-treatment monitoring requires liver function testing (evaluating transaminitis from isoniazid, rifampicin, and pyrazinamide; pyrazinamide is the most hepatotoxic), visual acuity and color discrimination (ethambutol optic neuritis), and complete blood count (linezolid myelosuppression)."
        ],
        "mcq_angles": [
            "Specific adverse effect profiles of first-line TB agents: ethambutol causing retrobulbar optic neuritis (red-green color blindness); pyrazinamide causing hyperuricaemia and hepatotoxicity; isoniazid causing neuropathy (prevented by vitamin B6).",
            "Study 31 landmark 4-month regimen components (rifapentine + moxifloxacin + isoniazid + pyrazinamide).",
            "All-oral 6-month BPaLM regimen for rifampicin-resistant/MDR-TB and monitoring linezolid haematologic toxicity."
        ],
        "case_hooks": [
            "A 32-year-old immigrant from India presents with productive cough, hemoptysis, night sweats, and cavitary apical infiltrates; sputum GeneXpert detects M. tuberculosis with no rifampicin resistance.",
            "A patient on day 18 of RHZE therapy presents with nausea, scleral icterus, and AST 380 U/L, ALT 410 U/L (baseline <30 U/L); the physician enacts protocol-driven drug interruption."
        ],
        "uncertainties": [
            "Optimal linezolid dosing strategy (600 mg daily for 26 weeks vs 600 mg for 9-16 weeks followed by 300 mg) to minimize peripheral neuropathy and myelosuppression.",
            "Role of therapeutic drug monitoring (TDM) for rifampicin and isoniazid in patients with diabetes mellitus, obesity, or HIV coinfection."
        ]
    },

    "Tuberous Sclerosis and Renal Angiomyolipoma": {
        "mentor_intro": (
            "Tuberous Sclerosis Complex (TSC) is an autosomal dominant neurocutaneous multi-system disorder caused by inactivating mutations in TSC1 (hamartin) or TSC2 (tuberin), leading to constitutive hyperactivation of the mechanistic target of rapamycin (mTOR) signaling cascade. "
            "Renal angiomyolipomas (AMLs)—benign triphasic mesenchymal tumours composed of dysplastic blood vessels, smooth muscle-like spindle cells, and mature adipose tissue—occur in up to 70-80% of TSC patients, typically presenting as bilateral, multifocal, and rapidly enlarging lesions. "
            "Unregulated aneurysmal vascular dilation confers high risk of life-threatening retroperitoneal haemorrhage (Wunderlich syndrome), requiring proactive surveillance and frontline mTOR inhibitor therapy (everolimus) or selective transcatheter arterial embolization."
        ),
        "teaching_points": [
            "Renal angiomyolipomas in TSC carry a high risk of spontaneous retroperitoneal haemorrhage (Wunderlich syndrome), with risk correlating directly with tumour diameter >=4 cm or intralesional aneurysms >=5 mm.",
            "Oral mTOR inhibitors (everolimus 10 mg daily) are the first-line pharmacologic treatment for growing or asymptomatic TSC-associated renal AMLs >=4 cm (EXIST-2 trial), achieving sustained tumour volume reduction of >=50% and preserving renal parenchyma.",
            "For acute retroperitoneal haemorrhage or lesions refractory to/ineligible for mTOR inhibitors, selective transcatheter arterial embolization (TAE) is the intervention of choice, minimizing normal nephron loss compared to surgical resection.",
            "Total or radical nephrectomy is strictly contraindicated for TSC-associated angiomyolipomas except in cases of life-threatening uncontrollable haemorrhage or confirmed renal cell carcinoma, as multiple surgeries drive premature end-stage renal disease."
        ],
        "mcq_angles": [
            "Indications for initiating everolimus in TSC renal AML: asymptomatic growing AML >=4 cm to prevent retroperitoneal haemorrhage while preserving nephrons.",
            "Management of acute rupture (Wunderlich syndrome): emergency selective transcatheter arterial embolization over nephrectomy.",
            "Screening protocol: abdominal MRI every 1-3 years to monitor AML growth and intralesional microaneurysms."
        ],
        "case_hooks": [
            "A 26-year-old female with known tuberous sclerosis complex presents with sudden severe right flank pain and hypotension; emergency CT reveals a ruptured 6.5 cm right renal fat-containing mass with extensive retroperitoneal hematoma.",
            "An asymptomatic 19-year-old male with TSC has bilateral renal masses on screening MRI; the largest lesion in the left kidney measures 4.8 cm with normal renal function (eGFR 110 mL/min)."
        ],
        "uncertainties": [
            "Rebound tumour regrowth rates following discontinuation of maintenance mTOR inhibitor therapy and long-term lowest effective maintenance dosing.",
            "Distinguishing fat-poor renal angiomyolipoma from clear cell or chromophobe renal cell carcinoma on dual-energy CT and chemical shift MRI."
        ]
    },

    "Tumour Lysis Syndrome Prophylaxis": {
        "mentor_intro": (
            "Tumour lysis syndrome (TLS) is an oncologic emergency precipitated by massive, rapid lysis of malignant cells following initiation of cytotoxic therapy (or occasionally spontaneously in highly proliferative hematologic malignancies). "
            "Cellular breakdown releases immense quantities of potassium, phosphate, and nucleic acids (catabolized into uric acid), overwhelming renal clearance and buffering mechanisms. "
            "The Cairo-Bishop definition distinguishes laboratory TLS (>=2 abnormalities: hyperuricaemia, hyperkalaemia, hyperphosphataemia, hypocalcaemia) from clinical TLS (laboratory TLS plus acute kidney injury, seizures, cardiac arrhythmias, or death); risk-stratified prophylaxis with aggressive hydration and hypouricaemic agents (allopurinol or rasburicase) is mandatory."
        ),
        "teaching_points": [
            "Cairo-Bishop laboratory TLS requires >=2 of the following within 3-7 days of chemotherapy: uric acid >=476 umol/L (8 mg/dL), potassium >=6.0 mmol/L, phosphorus >=1.45 mmol/L (4.5 mg/dL), or corrected calcium <=1.75 mmol/L (7.0 mg/dL), or a 25% change from baseline.",
            "Intravenous hydration (2-3 L/m2/day or 200 mL/m2/h targeting urine output >=100 mL/m2/h) is the cornerstone of TLS prophylaxis, maximizing glomerular filtration and flushing uric acid and calcium-phosphate crystals from renal tubules.",
            "Allopurinol (xanthine oxidase inhibitor) prevents NEW uric acid formation and is indicated for intermediate-risk TLS; it does NOT degrade pre-existing uric acid and requires 24-48 hours to demonstrate full clinical effect.",
            "Rasburicase (recombinant urate oxidase) catalyzes the enzymatic conversion of uric acid into allantoin (5-10 times more soluble in urine), rapidly clearing pre-existing uric acid within 4 hours; it is indicated for high-risk TLS (Burkitt lymphoma, ALL with WBC >100,000, high-grade AML) or established hyperuricaemia.",
            "Rasburicase is strictly contraindicated in patients with glucose-6-phosphate dehydrogenase (G6PD) deficiency due to severe risk of hydrogen peroxide-mediated acute haemolytic anaemia and methemoglobinaemia."
        ],
        "mcq_angles": [
            "Differentiating allopurinol (blocks synthesis, for intermediate risk) from rasburicase (enzymatically degrades uric acid to allantoin, for high risk / existing hyperuricaemia).",
            "Absolute contraindication to rasburicase: G6PD deficiency causing fatal acute hemolysis and methemoglobinaemia.",
            "Laboratory sample handling for rasburicase: blood tubes must be kept on wet ice and analyzed immediately to avoid artifactual ex vivo uric acid degradation."
        ],
        "case_hooks": [
            "A 16-year-old male with newly diagnosed Burkitt lymphoma has a LDH of 4,200 U/L and uric acid 11.2 mg/dL prior to chemotherapy; he is categorized as high risk for TLS.",
            "A 52-year-old male receives rasburicase for TLS; 6 hours later he becomes cyanotic with oxygen saturation 84% on 100% FiO2; arterial blood appears chocolate brown, and peripheral blood smear shows bite cells and Heinz bodies."
        ],
        "uncertainties": [
            "Cost-effectiveness and clinical non-inferiority of single fixed-dose rasburicase (e.g., 3 mg or 6 mg) versus weight-based daily dosing (0.2 mg/kg for 5 days).",
            "Utility of urine alkalinization (routine bicarbonate infusion is no longer recommended as it promotes calcium phosphate precipitation in renal tubules)."
        ]
    },

    "Tumour Mutational Burden and MSI-H": {
        "mentor_intro": (
            "Tumour Mutational Burden (TMB) and Microsatellite Instability-High (MSI-H) / Mismatch Repair Deficiency (dMMR) represent two pivotal, tissue-agnostic genomic biomarkers that predict exceptional clinical responsiveness to immune checkpoint inhibitors. "
            "Defects in DNA mismatch repair genes (MLH1, MSH2, MSH6, PMS2) lead to hypermutation, microsatellite length alterations, and generation of abundant immunogenic neoantigens that attract cytotoxic T-cell infiltration. "
            "Pembrolizumab achieved the first-ever histology-agnostic FDA approvals for MSI-H/dMMR solid tumours and high tumour mutational burden (TMB-H, defined as >=10 mutations per megabase [mut/Mb]), establishing comprehensive genomic profiling as an essential oncology tool."
        ),
        "teaching_points": [
            "MSI-H / dMMR solid tumours generate high densities of frame-shift neoantigens, triggering intense tumour-infiltrating lymphocyte responses that are unleashed by anti-PD-1/PD-L1 checkpoint inhibitors, yielding durable response rates >40-50% across diverse cancer types.",
            "Pembrolizumab carries landmark tissue-agnostic approvals for unresectable or metastatic MSI-H/dMMR solid tumours (KEYNOTE-158 trial) and for tumours with high tumour mutational burden (TMB-H >=10 mut/Mb, KEYNOTE-158).",
            "In early-stage dMMR/MSI-H locally advanced rectal cancer, neoadjuvant dostarlimab (anti-PD-1 monotherapy for 6 months) achieved a remarkable 100% clinical complete response rate, eliminating the need for chemotherapy, radiation, or radical surgery in clinical trials.",
            "Tumour mutational burden (TMB) is quantified via next-generation sequencing (NGS) comprehensive genomic profiling panels (e.g., FoundationOne CDx) measuring non-synonymous somatic mutations across coding regions.",
            "All patients diagnosed with colorectal or endometrial cancer must undergo universal screening for dMMR via immunohistochemistry (loss of MLH1, MSH2, MSH6, PMS2) or MSI PCR/NGS to screen for Lynch syndrome and guide immunotherapy."
        ],
        "mcq_angles": [
            "Tissue-agnostic threshold for TMB-H eligible for pembrolizumab: >=10 mutations/megabase (mut/Mb).",
            "Universal screening indication for mismatch repair deficiency: all colorectal and endometrial carcinomas.",
            "Paradigm-shifting neoadjuvant immunotherapy in dMMR rectal cancer: organ preservation with single-agent anti-PD-1 therapy."
        ],
        "case_hooks": [
            "A 61-year-old woman with metastatic pancreatic adenocarcinoma that progressed on FOLFIRINOX undergoes NGS testing revealing TMB of 14 mut/Mb and MSS; the oncologist plans therapy.",
            "A 42-year-old male with locally advanced rectal adenocarcinoma is found to have complete loss of MSH2 and MSH6 on immunohistochemistry; genetic counselling evaluates for germline Lynch syndrome."
        ],
        "uncertainties": [
            "Discrepancies in TMB cutoffs across different cancer histologies (whether 10 mut/Mb is equally predictive in non-melanoma/lung cancers compared to breast or prostate cancer).",
            "Mechanism of primary resistance to PD-1 blockade occurring in ~20-30% of confirmed dMMR/MSI-H solid tumours."
        ]
    },

    "Type 1 and type 2 diabetes": {
        "mentor_intro": (
            "Diabetes mellitus is a metabolic disorder characterized by chronic hyperglycaemia resulting from defects in insulin secretion, insulin action, or both. "
            "Type 1 diabetes (T1D) is an autoimmune disease characterized by immune-mediated destruction of pancreatic beta-cells (islet autoantibodies: GAD65, IA-2, ZnT8, anti-insulin), leading to absolute insulin deficiency and dependence on lifelong exogenous insulin replacement. "
            "Type 2 diabetes (T2D) arises from progressive insulin secretory defect superimposed on systemic insulin resistance, strongly associated with adiposity, metabolic syndrome, and polygenic risk; modern management focuses on cardiovascular and renal risk mitigation alongside glycaemic control."
        ),
        "teaching_points": [
            "Type 1 diabetes requires mandatory lifelong insulin therapy (multiple daily injections [MDI] or automated insulin delivery [AID] hybrid closed-loop pump systems); continuous glucose monitoring (CGM) is the standard of care to optimize time-in-range (TIR 70-180 mg/dL >70%) and prevent severe hypoglycaemia.",
            "Screening for autoimmune T1D involves testing for circulating islet autoantibodies: glutamic acid decarboxylase (GAD65), insulinoma-associated protein 2 (IA-2), zinc transporter 8 (ZnT8), and islet cell antibodies (ICA).",
            "In Type 2 diabetes with established atherosclerotic cardiovascular disease (ASCVD), heart failure (HF), or chronic kidney disease (CKD), SGLT-2 inhibitors (empagliflozin, dapagliflozin) and/or GLP-1 receptor agonists (semaglutide, dulaglutide) are recommended independent of baseline HbA1c or metformin use.",
            "Diabetic ketoacidosis (DKA) can occur in Type 2 diabetes as 'ketosis-prone diabetes' (Flatbush diabetes) and as 'euglycaemic DKA' (blood glucose <250 mg/dL) in patients taking SGLT-2 inhibitors, requiring urine or serum beta-hydroxybutyrate measurement."
        ],
        "mcq_angles": [
            "Differentiating late-onset autoimmune diabetes in adults (LADA) from Type 2 diabetes: presence of GAD65 autoantibodies and rapid requirement for insulin within months to years.",
            "Continuous glucose monitoring metrics: defining target Time in Range (TIR, 3.9-10.0 mmol/L [70-180 mg/dL]) >70% with Time Below Range (<3.9 mmol/L) <4%.",
            "Recognizing euglycaemic DKA triggered by SGLT-2 inhibitors during acute illness, surgery, or low carbohydrate intake."
        ],
        "case_hooks": [
            "A 31-year-old lean woman is diagnosed with diabetes (HbA1c 9.2%); she is initially prescribed metformin but develops weight loss, nausea, and ketones 6 months later; anti-GAD65 is strongly positive.",
            "A 58-year-old male with T2D, prior MI, and eGFR 45 mL/min attends clinic on metformin alone with HbA1c 7.4%; the clinician adds an SGLT-2 inhibitor for organ protection."
        ],
        "uncertainties": [
            "Efficacy of disease-modifying anti-CD3 monoclonal antibodies (teplizumab) in delaying onset of clinical Stage 3 Type 1 diabetes in at-risk relatives.",
            "Comparative long-term cognitive and microvascular benefits of dual GLP-1/GIP receptor agonists (tirzepatide) in early Type 2 diabetes."
        ]
    },

    "Type 2 diabetes cardiovascular outcomes": {
        "mentor_intro": (
            "Cardiovascular disease is the principal cause of morbidity and premature mortality in patients with type 2 diabetes mellitus (T2D). "
            "A paradigm shift in diabetology has transformed management from glucose-centric glucocentric targets to organ-protective cardiorenal medicine. "
            "Cardiovascular outcomes trials (CVOTs) have definitively demonstrated that sodium-glucose cotransporter-2 (SGLT-2) inhibitors and glucagon-like peptide-1 receptor agonists (GLP-1 RAs) confer dramatic, independent reductions in major adverse cardiovascular events (MACE), heart failure hospitalizations, and progressive diabetic kidney disease."
        ),
        "teaching_points": [
            "SGLT-2 inhibitors (empagliflozin, dapagliflozin, canagliflozin) reduce hospitalization for heart failure by 30-35% and attenuate renal disease progression across the entire ejection fraction spectrum in patients with and without diabetes (EMPA-REG OUTCOME, DAPA-HF, DELIVER).",
            "GLP-1 receptor agonists with proven cardiovascular benefit (subcutaneous semaglutide, liraglutide, dulaglutide) significantly reduce 3-point MACE (cardiovascular death, non-fatal MI, non-fatal stroke) by 12-14% in T2D patients with established ASCVD or high cardiovascular risk (LEADER, SUSTAIN-6, REWIND).",
            "The FLOW trial demonstrated that semaglutide 1.0 mg weekly reduces the risk of major kidney disease events and cardiovascular death by 24% in patients with T2D and chronic kidney disease.",
            "Current international guidelines mandate co-prescribing SGLT-2 inhibitors and GLP-1 RAs for T2D patients with established cardiovascular disease, heart failure, or CKD, irrespective of whether the baseline HbA1c is already at target."
        ],
        "mcq_angles": [
            "Matching drug class to primary cardiovascular phenotype: SGLT-2 inhibitors are the preferred class for heart failure and CKD progression; GLP-1 RAs are preferred for ASCVD/stroke reduction and weight reduction.",
            "EMPA-REG OUTCOME and DAPA-HF landmark findings: early divergence of heart failure and mortality curves with SGLT-2 inhibition.",
            "Indications for GLP-1 RA in chronic kidney disease based on the landmark FLOW trial."
        ],
        "case_hooks": [
            "A 62-year-old male with T2D and an anterior STEMI 2 years ago has HbA1c 6.8% on metformin; the cardiologist discusses adding empagliflozin and semaglutide despite excellent glycaemic control.",
            "A 67-year-old woman with T2D and diabetic nephropathy (eGFR 38 mL/min, UACR 450 mg/g) is evaluated for renal-protective pharmacotherapy."
        ],
        "uncertainties": [
            "Additive cardiovascular benefit and tolerability of combining SGLT-2 inhibitors with dual GLP-1/GIP agonists (tirzepatide) in high-risk ASCVD cohorts.",
            "Cardiovascular safety and long-term MACE reduction of non-steroidal mineralocorticoid receptor antagonists (finerenone) when added on top of combined SGLT-2 inhibitor and GLP-1 RA therapy."
        ]
    },

    "UTI prophylaxis": {
        "mentor_intro": (
            "Urinary tract infection (UTI) prophylaxis aims to break the recurrent cycle of uncomplicated or complicated infections while minimizing the emergence of multidrug-resistant uropathogens and collateral microbiome damage. "
            "In adults with recurrent uncomplicated UTIs (>=2 in 6 months or >=3 in 12 months), non-antimicrobial interventions form the initial foundation. "
            "When non-antimicrobial measures fail, low-dose continuous antibiotic prophylaxis (nitrofurantoin, trimethoprim) or post-coital prophylaxis is highly effective, accompanied by scheduled reassessment and antimicrobial stewardship."
        ),
        "teaching_points": [
            "Vaginal oestrogen therapy in postmenopausal women with recurrent UTIs restores normal premenopausal acidophilic lactobacilli, lowers vaginal pH, and reduces recurrence rates by over 50% without systemic hormonal adverse effects.",
            "Methenamine hippurate (1 g twice daily) provides an effective non-antibiotic preventative alternative that converts to bacteriostatic formaldehyde in acidic urine, matching low-dose daily antibiotic prophylaxis without driving microbial resistance (ALTAR trial).",
            "Post-coital antimicrobial prophylaxis (single low dose of nitrofurantoin 50-100 mg, trimethoprim 100 mg, or cephalexin 250 mg taken within 2 hours of intercourse) is as effective as continuous daily prophylaxis in women whose UTIs are triggered by sexual activity, with fewer adverse effects.",
            "Continuous daily low-dose antibiotic prophylaxis (e.g., nitrofurantoin 50-100 mg daily at bedtime) is reserved for patients failing non-antimicrobial measures; treatment should be limited to 3-6 months with mandatory surveillance for nitrofurantoin pulmonary fibrosis and hepatotoxicity in long-term use."
        ],
        "mcq_angles": [
            "First-line non-antimicrobial prevention in postmenopausal women: topical vaginal oestrogen cream or pessaries.",
            "ALTAR trial conclusions: non-inferiority of methenamine hippurate compared to daily antibiotic prophylaxis in preventing recurrent UTIs.",
            "Long-term adverse effects of continuous nitrofurantoin: chronic pulmonary interstitial fibrosis and drug-induced autoimmune hepatitis in older women."
        ],
        "case_hooks": [
            "A 63-year-old postmenopausal woman with 4 symptomatic E. coli UTIs in the past year presents requesting daily antibiotics; pelvic exam reveals pale, dry, atrophic vaginal mucosa.",
            "A 27-year-old female experiences recurrent dysuria exclusively within 24-48 hours after sexual intercourse; she is offered post-coital single-dose prophylaxis."
        ],
        "uncertainties": [
            "Long-term efficacy and mucosal immunological durability of sublingual bacterial whole-cell polyvalent vaccines (MV140 / Uromune).",
            "Optimal role and clinical indications for intravesical glycosaminoglycan (GAG) layer replenishment instillations (hyaluronic acid / chondroitin sulfate)."
        ]
    },

    "Upper Airway Resistance Syndrome": {
        "mentor_intro": (
            "Upper Airway Resistance Syndrome (UARS) is a sleep-disordered breathing condition positioned along the spectrum between simple snoring and obstructive sleep apnoea (OSA). "
            "UARS is characterized by repetitive increases in upper airway resistance during sleep that do not meet classic criteria for apnoeas or hypopneas, but produce increased respiratory effort leading to micro-arousals (Respiratory Effort-Related Arousals [RERAs]) and sleep fragmentation. "
            "Patients typically present with excessive daytime sleepiness, chronic fatigue, morning headaches, and insomnia, frequently without prominent obesity or severe oxygen desaturation, and are commonly misdiagnosed with fibromyalgia, chronic fatigue syndrome, or depression."
        ),
        "teaching_points": [
            "UARS is characterized by repetitive Respiratory Effort-Related Arousals (RERAs) without significant hypoxemia; polysomnography demonstrates an Apnoea-Hypopnea Index (AHI) <5 events/hour, but an elevated Respiratory Disturbance Index (RDI >=5-15 events/hour, where RDI = AHI + RERA index).",
            "Pathophysiology involves dynamic inspiratory flow limitation (flattening of the inspiratory nasal cannula pressure transducer wave) caused by subtle structural narrowing of the pharynx, nasal cavity, or retroglottic space.",
            "Unlike typical OSA patients who are frequently obese males, UARS patients are commonly young, lean females with anatomical craniofacial variations (narrow retrognathic mandible, high-arched hard palate, nasal septal deviation, inferior turbinate hypertrophy).",
            "First-line treatment is continuous positive airway pressure (CPAP), which eliminates inspiratory flow limitation and normalizes sleep architecture; alternative therapies include customized mandibular advancement devices (MAD) and targeted otorhinolaryngologic surgery (septoplasty, turbinoplasty)."
        ],
        "mcq_angles": [
            "Diagnostic definition of UARS on polysomnography: AHI <5 events/hour with elevated RDI (RERAs causing cortical arousals) in the absence of severe oxygen desaturation.",
            "Recognizing the clinical phenotype: lean individuals, daytime fatigue, insomnia, functional somatic symptoms, and subtle craniofacial crowding.",
            "Waveform hallmark on polysomnography: flattened inspiratory contour on nasal pressure cannula tracing reflecting flow limitation."
        ],
        "case_hooks": [
            "A 28-year-old thin female (BMI 21 kg/m2) presents with profound unrefreshing sleep, daytime exhaustion, and tension headaches; home sleep apnoea testing was reported as 'normal' (AHI 2.1/h), but in-lab PSG reveals an RDI of 18/h with 42 RERAs.",
            "A 34-year-old male with chronic nasal congestion and morning dry mouth undergoes sleep study showing multiple arousals preceded by progressive negative intrathoracic pressure swings without desaturation."
        ],
        "uncertainties": [
            "Diagnostic reliability and standardization of automated scoring algorithms for RERAs across different sleep laboratory software systems.",
            "Long-term cardiovascular sequelae and hypertension risk in untreated UARS compared to obstructive sleep apnoea."
        ]
    },

    "Upper and lower GI bleeding": {
        "mentor_intro": (
            "Acute gastrointestinal bleeding is a critical clinical presentation bifurcated by the ligament of Treitz into upper gastrointestinal bleeding (UGIB) and lower gastrointestinal bleeding (LGIB). "
            "UGIB commonly arises from peptic ulcer disease, gastroduodenal erosions, Mallory-Weiss tears, and oesophageal/gastric varices, manifesting as haematemesis or melaena with an elevated blood urea nitrogen-to-creatinine ratio (>20-30:1). "
            "LGIB originates distal to the ligament of Treitz (diverticular bleeding, angiodysplasia, ischemic colitis, haemorrhoids, neoplasms), typically presenting as haematochezia; initial management across both mandates rapid hemodynamic stabilization, risk stratification (Glasgow-Blatchford and Oakland scores), and timely endoscopy."
        ),
        "teaching_points": [
            "Initial management for both UGIB and LGIB prioritizes airway, breathing, and circulation: establishing two large-bore peripheral IV lines (16G or 18G), fluid resuscitation with balanced crystalloids, and restrictive transfusion targeting haemoglobin 70-80 g/L (7-8 g/dL) in stable patients without acute coronary syndrome.",
            "The Glasgow-Blatchford Score (GBS) is the superior validated risk tool for acute UGIB; a score of 0-1 identifies very low-risk patients who can safely be discharged without inpatient admission, while scores >=6 predict high risk of rebleeding and intervention.",
            "For acute non-variceal UGIB, intravenous proton pump inhibitor (PPI) therapy (e.g., omeprazole 80 mg IV bolus followed by 8 mg/h infusion, or 40 mg IV twice daily) stabilizes gastric pH >6 to promote platelet aggregation and clot formation prior to endoscopy.",
            "In patients presenting with massive haematochezia and hemodynamic shock, an upper GI bleed must always be excluded (brisk duodenal bleeding with rapid transit), warranting immediate upper endoscopy prior to colonoscopy.",
            "For acute LGIB, the Oakland score predicts safe outpatient discharge (score <=8); colonoscopy is performed after complete oral purgative bowel preparation in hospitalized patients."
        ],
        "mcq_angles": [
            "Distinguishing massive UGIB from LGIB: recognizing that rapid upper GI bleeding can present with bright red haematochezia and a markedly elevated BUN/creatinine ratio (>20-30).",
            "Applying the Glasgow-Blatchford Score (GBS): identifying low-risk scores (0-1) eligible for outpatient management.",
            "Restrictive red blood cell transfusion threshold (70-80 g/L) versus liberal transfusion (100 g/L) in acute GI bleeding, reducing rebleeding and mortality."
        ],
        "case_hooks": [
            "A 68-year-old man taking naproxen presents with melaena, BP 92/58 mmHg, HR 118 bpm, Hb 74 g/L, and BUN 18.2 mmol/L with creatinine 85 umol/L; GBS is 12, prompting emergency resuscitation and endoscopy.",
            "A 74-year-old woman presents with painless bright red blood per rectum and stable vital signs; the clinical team calculates an Oakland score of 7 and plans outpatient colonoscopic workup."
        ],
        "uncertainties": [
            "Optimal timing of colonoscopy in acute lower GI bleeding (urgent <24 hours versus elective after elective bowel prep during admission).",
            "Optimal timing for restarting therapeutic anticoagulation and antiplatelet agents following endoscopically verified haemostasis."
        ]
    },

    "Upper gastrointestinal bleeding management": {
        "mentor_intro": (
            "Management of acute upper gastrointestinal bleeding (UGIB) coordinates emergency hemodynamic resuscitation, risk stratification, empiric medical therapies, and therapeutic upper endoscopy within 24 hours. "
            "Endoscopic evaluation establishes etiology—most frequently peptic ulcer disease (PUD, ~50%), followed by oesophagogastric varices, erosive gastritis, and Mallory-Weiss tears. "
            "For peptic ulcers, the Forrest classification determines endoscopic haemostasis (high-risk stigmata: Forrest Ia spurting, Ib oozing, IIa non-bleeding visible vessel, and IIb adherent clot), utilizing dual multimodal endoscopic techniques (epinephrine injection combined with thermal coagulation, mechanical hemoclips, or hemostatic powders)."
        ),
        "teaching_points": [
            "Early risk stratification using the Glasgow-Blatchford Score (GBS) should be performed upon presentation; endoscopy should be performed within 24 hours of presentation after initial hemodynamic resuscitation (ultra-early endoscopy <6 hours does not improve clinical outcomes in non-variceal bleeding).",
            "High-risk peptic ulcer lesions (Forrest Ia, Ib, and IIa) mandate dual-modality endoscopic haemostasis (e.g., hemoclip or bipolar electrocoagulation PLUS dilute epinephrine injection), followed by high-dose intravenous PPI therapy for 72 hours.",
            "Pre-endoscopic administration of a single intravenous dose of erythromycin (250 mg IV 30-60 minutes prior) promotes gastric emptying of blood and clots, significantly improving endoscopic visualization and reducing the need for repeat procedures.",
            "Testing for Helicobacter pylori is mandatory in all patients with bleeding peptic ulcers; initial biopsy during acute bleeding carries high false-negative rates, requiring confirmation with stool antigen or urea breath test 4-6 weeks post-bleed off PPIs.",
            "Transfusion strategy should be restrictive (transfusion trigger Hb <70 g/L, target 70-90 g/L), except in patients with active acute coronary syndromes (target Hb >=80-100 g/L) (Villanueva trial)."
        ],
        "mcq_angles": [
            "Forrest classification and endoscopic intervention thresholds: identifying which lesions require active treatment (Ia, Ib, IIa, and selected IIb) versus clean-based ulcers (III) which do not.",
            "Role of pre-procedure IV erythromycin in clearing the gastric fundus and improving mucosal visualization.",
            "Managing recurrent ulcer bleeding following initial successful endoscopy: repeat endoscopic intervention is preferred first-line over immediate emergency surgery or transcatheter arterial embolization (TAE)."
        ],
        "case_hooks": [
            "A 55-year-old male presents with haematemesis; endoscopy reveals a 1.5 cm duodenal bulb ulcer with a pigmented non-bleeding visible vessel (Forrest IIa); dual-modality haemostasis with hemoclips and thermal probe is performed.",
            "A 70-year-old female with a bleeding gastric ulcer tests negative for H. pylori on rapid urease biopsy performed during active haemorrhage; the physician arranges confirmatory testing after discharge."
        ],
        "uncertainties": [
            "Efficacy of topically applied hemostatic powders (e.g., Hemospray, TC-325) as primary standalone therapy versus rescue therapy for refractory non-variceal bleeding.",
            "Safety and timing of early oral feeding in patients following successful endoscopic treatment of high-risk ulcers."
        ]
    },

    "Uraemic Complications": {
        "mentor_intro": (
            "Uraemia is the toxic syndrome resulting from the accumulation of organic waste products and nitrogenous metabolites (uraemic retention solutes) normally cleared by healthy kidneys, developing in advanced acute kidney injury or stage 5 chronic kidney disease (CKD). "
            "Uraemic toxicity affects virtually every organ system, manifesting as uraemic encephalopathy (asterixis, cognitive blunting, seizures), uraemic pericarditis (friction rub, tamponade risk), uraemic coagulopathy (platelet dysfunction), and uraemic cardiomyopathy. "
            "Certain uraemic complications represent absolute, life-threatening indications for emergent renal replacement therapy (haemodialysis), overriding conservative medical stabilization."
        ),
        "teaching_points": [
            "Absolute emergent indications for renal replacement therapy (haemodialysis) in acute or chronic kidney failure are remembered by the AEIOU mnemonic: Acidosis (refractory metabolic pH <7.1-7.2), Electrolytes (severe refractory hyperkalaemia >6.5 mmol/L), Ingestion/toxins, Overload (refractory pulmonary oedema), and Uraemic complications (pericarditis, encephalopathy, bleeding).",
            "Uraemic pericarditis presents with retrosternal chest pain and a pericardial friction rub; unlike typical viral pericarditis, ECG often shows NO ST-segment elevation due to lack of epicardial myocardial involvement; it is an absolute indication for urgent haemodialysis (anticoagulation/heparin must be avoided during dialysis to prevent haemorrhagic tamponade).",
            "Uraemic coagulopathy is characterized by abnormal platelet aggregation and adhesion due to impaired von Willebrand factor interaction with dysfunctional platelet GPIIb/IIIa receptors, presenting as bleeding with normal platelet count but prolonged bleeding time.",
            "Desmopressin (DDAVP, 0.3 ug/kg IV or subcutaneous) is the fastest-acting agent to reverse uraemic bleeding prior to urgent invasive procedures (e.g., kidney biopsy), releasing endothelial stores of vWF and factor VIII within 30-60 minutes."
        ],
        "mcq_angles": [
            "Absolute indications for emergent dialysis: identifying uraemic pericarditis or encephalopathy as mandates for urgent dialysis regardless of exact serum creatinine level.",
            "Acute management of uraemic bleeding diathesis prior to invasive surgery: administration of DDAVP (desmopressin), cryoprecipitate, or conjugated estrogens.",
            "Why systemic anticoagulation is held or minimized during haemodialysis in patients with uraemic pericarditis (preventing conversion into haemorrhagic pericardial tamponade)."
        ],
        "case_hooks": [
            "A 48-year-old male with untreated ESRD presents with confusion, lethargy, asterixis, and a loud triphasic friction rub over the left sternal border; ECG is non-diagnostic; urgent nephrology consult for dialysis is requested.",
            "A patient with stage 5 CKD is scheduled for an urgent percutaneous kidney biopsy; the nephrologist prescribes pre-procedure DDAVP (0.3 ug/kg) to correct uraemic platelet dysfunction."
        ],
        "uncertainties": [
            "Mechanisms of uraemic cardiomyopathy and reversal of myocardial fibrosis following renal transplantation versus intensive haemodialysis.",
            "Role of Middle Molecules (e.g., beta-2 microglobulin, FGF-23, indoxyl sulfate) clearance with expanded hemodialysis (HDx) and online hemodiafiltration."
        ]
    },

    "Urinary tract infections and pyelonephritis": {
        "mentor_intro": (
            "Urinary tract infections (UTIs) represent an ascending spectrum of microbial colonization extending from cystitis (bladder mucosal inflammation) to acute pyelonephritis (infection of the renal pelvis and kidney parenchyma). "
            "Uropathogenic Escherichia coli (UPEC) causes >75-80% of infections, with Klebsiella pneumoniae, Proteus mirabilis, and Enterococcus faecalis accounting for remaining cases. "
            "Clinical evaluation hinges on differentiating cystitis (dysuria, urgency, frequency, suprapubic pain without systemic signs) from pyelonephritis (fever, chills, flank/costovertebral angle tenderness, nausea), which mandates systemic antimicrobials and exclusion of obstructive uropathy."
        ),
        "teaching_points": [
            "Acute uncomplicated pyelonephritis presents with systemic manifestations: fever (>38 C), rigors, costovertebral angle tenderness, and flank pain; urine culture with antimicrobial susceptibility testing is mandatory in all suspected pyelonephritis cases.",
            "First-line outpatient empirical oral therapy for uncomplicated pyelonephritis in regions with local fluoroquinolone resistance <10% is ciprofloxacin (500 mg bid for 7 days) or levofloxacin (750 mg daily for 5 days); if resistance is >=10%, an initial dose of IV ceftriaxone 1 g is required.",
            "Renal imaging (contrast-enhanced CT or renal ultrasound) is NOT routinely required in uncomplicated pyelonephritis that improves within 48-72 hours, but is urgently indicated for persistent fever beyond 72 hours, septic shock, palpable flank mass, or suspected stone obstruction.",
            "Obstructive pyelonephritis (infected hydronephrosis secondary to an obstructing ureteral calculus) is a urologic emergency requiring immediate urinary tract decompression (percutaneous nephrostomy or JJ ureteral stenting) and broad-spectrum intravenous antibiotics."
        ],
        "mcq_angles": [
            "Outpatient antibiotic duration for acute uncomplicated pyelonephritis: 7 days for oral ciprofloxacin vs 14 days for oral beta-lactams (e.g., augmentin or cephalosporins).",
            "Indications for urgent imaging (contrast CT of abdomen/pelvis) in pyelonephritis: failure to defervesce after 72 hours of appropriate antibiotic therapy (evaluating renal or perinephric abscess).",
            "Management of pyelonephritis in pregnancy: mandatory hospital admission for parenteral antibiotics (e.g., IV ceftriaxone) due to high risk of sepsis and preterm labour."
        ],
        "case_hooks": [
            "A 24-year-old healthy woman presents with temperature 39.1 C, right costovertebral angle tenderness, vomiting, and pyuria; she is initiated on outpatient oral ciprofloxacin after an initial IV ceftriaxone dose.",
            "A 58-year-old diabetic male treated for pyelonephritis with IV ceftriaxone remains febrile with persistent left flank pain on day 4; renal CT reveals a 4 cm intrarenal fluid collection consistent with a renal abscess."
        ],
        "uncertainties": [
            "Oral step-down treatment duration for multi-drug resistant ESBL pyelonephritis using oral fosfomycin or oral carbapenems (tebipenem).",
            "Predictive value of serum procalcitonin versus CRP in guiding early antibiotic cessation in hospitalized pyelonephritis."
        ]
    },

    "Urinary tract infections: uncomplicated vs complicated, catheter-associated, treatment duration": {
        "mentor_intro": (
            "Accurate classification of urinary tract infections dictates diagnostic workup, choice of empirical antibiotics, and treatment duration. "
            "Uncomplicated cystitis occurs in non-pregnant, immunocompetent premenopausal adult women without anatomical or functional urinary abnormalities. "
            "Complicated UTIs (cUTIs) occur in the presence of factors that compromise host defenses or increase infection severity: male sex, pregnancy, catheterization, urologic instrumentation, neurogenic bladder, urinary tract stones, or immunosuppression, carrying higher rates of multidrug-resistant pathogens."
        ),
        "teaching_points": [
            "Uncomplicated cystitis first-line therapies include: nitrofurantoin monohydrate/macrocrystals (100 mg bid for 5 days), trimethoprim-sulfamethoxazole (160/800 mg bid for 3 days, if local resistance <20%), or fosfomycin trometamol (3 g single oral dose); fluoroquinolones are explicitly not recommended for uncomplicated cystitis.",
            "Catheter-associated urinary tract infection (CAUTI) is defined by presence of symptoms referable to the urinary tract (fever, suprapubic pain, altered mental status) with urine culture >=10^3 CFU/mL in a patient with a current or recently removed (<48 h) indwelling catheter; asymptomatic bacteriuria (ASB) in catheterized patients must NOT be treated.",
            "When treating CAUTI, the indwelling urinary catheter must be removed or replaced prior to initiating antibiotic therapy if it has been in place for >7-14 days, as intraluminal biofilms harbor persistent bacterial colonies that prevent cure.",
            "Treatment duration guidelines recommend short-course therapy: 3 to 5 days for uncomplicated cystitis, 7 days for uncomplicated pyelonephritis (fluoroquinolones), 7 days for prompt-responding cUTI/CAUTI, and 14 days for men with suspected acute bacterial prostatitis."
        ],
        "mcq_angles": [
            "Appropriate antibiotic treatment durations: 5 days for nitrofurantoin, 3 days for TMP-SMX, 1 single dose for fosfomycin in uncomplicated cystitis.",
            "Management of asymptomatic bacteriuria in catheterized patients: withholding antibiotics except in pregnancy or prior to urologic instrumentation with anticipated mucosal bleeding.",
            "Management of CAUTI: mandatory replacement or removal of the catheter before starting targeted antimicrobial therapy."
        ],
        "case_hooks": [
            "A 29-year-old non-pregnant woman presents with 2 days of burning dysuria and frequency; urine dipstick is leukocyte esterase and nitrite positive; the clinician selects nitrofurantoin 100 mg bid for 5 days.",
            "A 72-year-old nursing home resident with a long-term Foley catheter has cloudy, foul-smelling urine and a urine culture growing 10^5 CFU/mL Klebsiella; he has no fever, flank pain, or systemic symptoms."
        ],
        "uncertainties": [
            "Efficacy of short 7-day courses versus traditional 14-day courses for complicated UTI in male patients with controlled lower urinary tract symptoms.",
            "Role of novel siderophore cephalosporins (cefiderocol) and beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam) in complicated UTIs due to carbapenem-resistant Enterobacteriaceae."
        ]
    },

    "Urticaria and angioedema: classification and management": {
        "mentor_intro": (
            "Urticaria and angioedema are common mast cell- or bradykinin-mediated vascular reactions characterized by transient erythematous wheals (urticaria), deeper subcutaneous/submucosal swelling (angioedema), or both. "
            "Urticaria is classified by duration into acute (<6 weeks) and chronic (>=6 weeks), and by triggers into chronic spontaneous urticaria (CSU) and chronic inducible urticaria (CIndU: cold, heat, pressure, solar, cholinergic). "
            "The critical clinical step is distinguishing histamine/mast cell-mediated angioedema (accompanied by wheals, pruritus, responding to antihistamines/epinephrine) from bradykinin-mediated angioedema (hereditary angioedema [HAE] or ACE inhibitor-induced, which lack urticaria or pruritus and fail to respond to steroids, antihistamines, or epinephrine)."
        ),
        "teaching_points": [
            "Chronic spontaneous urticaria (CSU) is treated using a stepwise algorithm: Step 1 is standard-dose second-generation H1-antihistamines (cetirizine, fexofenadine, bilastine); Step 2 is up-dosing the second-generation H1-antihistamine up to 4-fold the licensed dose before switching classes.",
            "For chronic urticaria refractory to 4-fold antihistamines (Step 3), omalizumab (monoclonal anti-IgE antibody, 300 mg subcutaneously every 4 weeks) is the preferred, highly effective targeted therapy; Step 4 is oral cyclosporine for omalizumab-refractory disease.",
            "Bradykinin-mediated angioedema (hereditary angioedema [HAE], ACE inhibitor-induced angioedema) presents with non-pitting, non-pruritic, painful swelling WITHOUT urticarial wheals; it does NOT respond to antihistamines, corticosteroids, or epinephrine.",
            "Hereditary angioedema (HAE) is diagnosed by screening serum C4 levels (consistently low in HAE Type I and II) followed by C1-esterase inhibitor (C1-INH) antigenic level and functional activity; acute attacks are treated with C1-INH concentrate, icatibant (bradykinin B2 receptor antagonist), or ecallantide."
        ],
        "mcq_angles": [
            "Up-dosing protocol in CSU: increasing second-generation H1-antihistamines up to 4 times standard dose before adding omalizumab.",
            "Differentiating mast cell-mediated angioedema (itching, hives present, responsive to epinephrine/antihistamines) from bradykinin-mediated angioedema (no hives, painful, unresponsive to epinephrine).",
            "Screening and emergency treatment of HAE: low C4, confirmation with C1-INH function, and acute termination with icatibant or C1-INH replacement."
        ],
        "case_hooks": [
            "A 34-year-old woman with daily itchy wheals and lip swelling lasting >8 weeks continues to experience severe symptoms on cetirizine 10 mg daily; the allergist advises up-dosing cetirizine to 40 mg daily.",
            "A 64-year-old man taking lisinopril presents to the ED with severe tongue and laryngeal swelling without hives or itching; he fails to improve after IV diphenhydramine, methylprednisolone, and IM epinephrine."
        ],
        "uncertainties": [
            "Efficacy and clinical position of novel targeted biologics and oral agents (e.g., dupilumab, remibrutinib [BTK inhibitor]) in omalizumab-resistant CSU.",
            "Optimal long-term prophylaxis for hereditary angioedema: comparing oral plasma kallikrein inhibitors (berotralstat) with monoclonal antibodies (lanadelumab)."
        ]
    },

    "VEXAS Syndrome": {
        "mentor_intro": (
            "VEXAS syndrome (Vacuoles, E1 enzyme, X-linked, Autoinflammatory, Somatic) is a severe, life-threatening adult-onset autoinflammatory and haematologic disorder described in 2020. "
            "It is caused by acquired somatic missense mutations in the UBA1 gene on the X chromosome (most commonly affecting codon 41: p.Met41Thr, p.Met41Val, p.Met41Leu) within haematopoietic stem and progenitor cells, predominantly affecting men aged >50 years. "
            "VEXAS manifests as a devastating overlap of systemic inflammation (relapsing polychondritis, chondritis of ears/nose, neutrophilic dermatoses, pulmonary infiltrates, fever, venous thromboembolism) and haematologic abnormalities (macrocytic anaemia, myelodysplastic syndrome [MDS], and characteristic bone marrow proerythroblast cytoplasmic vacuoles)."
        ),
        "teaching_points": [
            "VEXAS syndrome is caused by somatic mutations in the UBA1 gene (encoding the ubiquitin-activating enzyme E1), affecting haematopoietic stem cells and causing defective ubiquitination and systemic autoinflammation.",
            "Clinical presentation classically mimics multiple rheumatologic diseases: relapsing polychondritis (ear/nose chondritis sparing earlobes), Sweet syndrome, polyarteritis nodosa, pulmonary infiltrates, recurrent unprovoked venous thromboembolism, and fever, refractory to standard DMARDs.",
            "Haematologic hallmarks include progressive macrocytic anaemia (elevated MCV), thrombocytopenia, myelodysplastic syndrome, and pathognomonic cytoplasmic vacuoles in erythroid and myeloid precursor cells on bone marrow aspirate.",
            "Definitive diagnosis requires targeted genetic sequencing (Sanger sequencing or NGS) demonstrating somatic UBA1 variants in peripheral blood or bone marrow; high-dose corticosteroids achieve initial symptom control, while hypomethylating agents (azacitidine), JAK inhibitors (ruxolitinib), and allogeneic haematopoietic stem cell transplantation (HSCT) offer targeted therapy."
        ],
        "mcq_angles": [
            "Genetic basis and inheritance: VEXAS is an acquired somatic mutation in UBA1 on the X chromosome, NOT an inherited germline defect.",
            "Pathognomonic bone marrow biopsy finding: cytoplasmic vacuolization of myeloid and erythroid precursor cells.",
            "Therapeutic escalation in steroid-refractory VEXAS: utilizing azacitidine (hypomethylating agent) or JAK inhibitors (ruxolitinib), and curative potential of allogeneic stem cell transplantation."
        ],
        "case_hooks": [
            "A 68-year-old male presents with recurrent fevers, bilateral ear chondritis, pulmonary infiltrates, recurrent DVTs, and macrocytic anaemia (Hb 82 g/L, MCV 108 fL); he is steroid-dependent, flaring whenever prednisone is tapered below 25 mg daily.",
            "A bone marrow biopsy in an elderly male with suspected myelodysplasia reveals abundant prominent intracytoplasmic vacuoles in pronormoblasts and early myeloid cells; peripheral blood NGS confirms a UBA1 p.Met41Thr mutation."
        ],
        "uncertainties": [
            "Optimal patient selection, conditioning regimens, and transplant-related mortality of allogeneic haematopoietic cell transplantation in elderly VEXAS patients.",
            "Comparative long-term clinical response between azacitidine and JAK inhibitors (ruxolitinib, tofacitinib) in delaying progression to bone marrow failure."
        ]
    },

    "VTE prophylaxis in nephrotic syndrome": {
        "mentor_intro": (
            "Nephrotic syndrome—defined by heavy proteinuria (>3.5 g/24h), hypoalbuminaemia (<30 g/L), peripheral oedema, and hypercholesterolaemia—is a potent prothrombotic state. "
            "The hypercoagulable state is driven by urinary loss of natural anticoagulant proteins (antithrombin III, protein S), enhanced hepatic synthesis of procoagulant factors (fibrinogen, factor V, factor VIII), thrombocytosis, platelet hyper-reactivity, and hemoconcentration. "
            "Venous thromboembolism (VTE) occurs in up to 10-40% of adult nephrotic patients—most prominently renal vein thrombosis (RVT), deep vein thrombosis, and pulmonary embolism; membranous nephropathy carries the highest thrombotic risk, warranting individualized prophylactic anticoagulation."
        ),
        "teaching_points": [
            "The risk of venous thromboembolism in nephrotic syndrome is inversely proportional to serum albumin; thrombosis risk rises steeply when serum albumin falls below 20-25 g/L (2.0-2.5 g/dL), particularly in membranous nephropathy.",
            "Membranous nephropathy (MN) carries the highest incidence of VTE and renal vein thrombosis among all causes of nephrotic syndrome; KDIGO guidelines recommend prophylactic anticoagulation in MN patients with serum albumin <20-25 g/L and additional thrombotic risk factors.",
            "Renal vein thrombosis (RVT) presents either insidiously or acutely with severe flank pain, gross haematuria, rapid decline in renal function, and sudden worsening of proteinuria; Doppler ultrasound or contrast CT venography provides definitive diagnosis.",
            "Warfarin or direct oral anticoagulants (DOACs: apixaban, rivaroxaban) are effective for VTE prophylaxis; however, low-molecular-weight heparin (LMWH) and unfractionated heparin rely on antithrombin III, which is significantly depleted in severe nephrotic proteinuria, potentially requiring higher doses or direct factor Xa inhibitors."
        ],
        "mcq_angles": [
            "Identifying serum albumin thresholds (<20-25 g/L) and histological subtype (membranous nephropathy) that trigger consideration of prophylactic anticoagulation.",
            "Clinical presentation of acute renal vein thrombosis: sudden flank pain, macroscopic haematuria, and acute renal decline.",
            "Pharmacologic considerations: why heparin efficacy may be blunted by urinary antithrombin III loss, favoring DOACs or adjusted LMWH."
        ],
        "case_hooks": [
            "A 46-year-old male with newly diagnosed PLA2R-positive membranous nephropathy has 24-hour urine protein of 9.2 g and serum albumin of 18 g/L; the nephrologist calculates bleeding and thrombotic risk to decide on prophylactic anticoagulation.",
            "A 38-year-old female with nephrotic syndrome develops sudden left loin pain and gross haematuria; contrast CT reveals a non-occlusive filling defect in the left renal vein extending into the inferior vena cava."
        ],
        "uncertainties": [
            "Safety and efficacy of direct oral anticoagulants (DOACs: apixaban, rivaroxaban) compared to warfarin for primary VTE prophylaxis in nephrotic patients with severe hypoalbuminaemia.",
            "Exact bleeding versus thrombotic risk score cutoffs to guide prophylactic anticoagulation duration during immunosuppressive induction."
        ]
    },

    "Vaccine responses in immunocompromised adults": {
        "mentor_intro": (
            "Immunocompromised adults—including solid organ transplant recipients, haematologic malignancy patients, individuals on biologic or targeted immunosuppression (anti-CD20 rituximab, anti-TNF, JAK inhibitors), and people living with advanced HIV—face heightened vulnerability to vaccine-preventable infections. "
            "Immunosuppressive therapies significantly impair both humoral (antibody seroconversion) and cellular (T-cell) vaccine responses. "
            "Core management principles include administering vaccines prior to planned immunosuppression whenever feasible, utilizing high-dose or adjuvanted vaccine formulations, adhering to specific revaccination schedules, and strictly avoiding live attenuated vaccines during active immunosuppression."
        ),
        "teaching_points": [
            "Live attenuated vaccines (e.g., MMR, varicella, yellow fever, oral typhoid, BCG) are strictly contraindicated in severely immunocompromised individuals due to the risk of uncontrolled viral replication and fatal disseminated vaccine-strain infection; recombinant or inactivated vaccines are safe.",
            "B-cell depleting therapies (rituximab, obinutuzumab) virtually abolish humoral antibody response to vaccines for at least 6 months post-infusion; non-live vaccines should be administered at least 2 to 4 weeks prior to initiating anti-CD20 therapy or delayed until B-cell recovery.",
            "Recombinant zoster vaccine (Shingrix, a non-live adjuvanted glycoprotein E vaccine) is safe and strongly recommended for immunocompromised adults aged >=19 years to prevent herpes zoster and post-herpetic neuralgia, completely replacing contraindicated live zoster vaccines.",
            "High-dose or adjuvanted inactivated influenza vaccines and pneumococcal conjugate vaccines (PCV20 alone or PCV15 followed by PPSV23) achieve superior immunogenicity and protective antibody titers in solid organ transplant and oncology populations compared to standard formulations."
        ],
        "mcq_angles": [
            "Absolute contraindication of live attenuated vaccines in severely immunosuppressed patients.",
            "Timing of vaccine administration relative to B-cell depleting therapy (rituximab): optimizing vaccine delivery before infusion or waiting >=6 months.",
            "Selection of the recombinant zoster vaccine (Shingrix) over live zoster vaccine in immunocompromised populations."
        ],
        "case_hooks": [
            "A 54-year-old woman with rheumatoid arthritis scheduled to initiate rituximab therapy is brought up to date on pneumococcal, recombinant zoster, and COVID-19 vaccinations 3 weeks prior to her first infusion.",
            "A 42-year-old male 9 months post-allogeneic stem cell transplantation attends clinic inquiring about whether he can receive the live varicella vaccine."
        ],
        "uncertainties": [
            "Clinical utility of measuring post-vaccination antibody titers or T-cell ELISpot assays to determine the necessity of booster doses in immunocompromised hosts.",
            "Optimal timing of temporary immunosuppressive hold (e.g., holding methotrexate for 1-2 weeks post-vaccination) to augment vaccine immunogenicity without triggering autoimmune flares."
        ]
    },

    "Variceal Haemorrhage": {
        "mentor_intro": (
            "Acute variceal haemorrhage (AVH) is a catastrophic medical emergency in patients with cirrhosis and portal hypertension, carrying a 6-week mortality of 15-20%. "
            "Rupture occurs when the hepatic venous pressure gradient (HVPG) exceeds the critical threshold of 12 mmHg, leading to progressive dilatation and wall tension rupture of thin-walled submucosal oesophageal or gastric varices. "
            "Management follows a time-sensitive multimodality protocol: restrictive blood transfusion, early vasoactive pharmacotherapy (terlipressin, octreotide), prophylactic IV antibiotics (ceftriaxone), and emergency endoscopic variceal ligation (EVL) within 12 hours of presentation."
        ),
        "teaching_points": [
            "Vasoactive drug therapy (terlipressin continuous infusion or bolus, or somatostatin/octreotide) must be initiated IMMEDIATELY upon suspicion of variceal bleeding, prior to endoscopy, to reduce splanchnic blood flow and portal pressure.",
            "Prophylactic antibiotic therapy (intravenous ceftriaxone 1 g daily for up to 7 days) is mandatory in all cirrhotic patients presenting with GI bleeding, significantly reducing bacterial infections, early rebleeding, and all-cause hospital mortality.",
            "Endoscopic variceal ligation (EVL) is the endoscopic treatment of choice for acute oesophageal variceal bleeding, performed within 12 hours of admission once the patient is hemodynamically stabilized; tissue adhesives (cyanoacrylate glue) are required for fundic gastric varices (GOV2/IGV1).",
            "Preemptive or 'early' Transjugular Intrahepatic Portosystemic Shunt (TIPS) placed within 24 to 72 hours of admission significantly reduces treatment failure and mortality in high-risk patients (Child-Pugh Class C <=13 points, or Child-Pugh Class B with active bleeding on endoscopy per Baveno VII criteria)."
        ],
        "mcq_angles": [
            "Mandatory early empiric medical therapies: starting vasoactive agents (terlipressin/octreotide) AND IV antibiotics (ceftriaxone) immediately upon presentation.",
            "Baveno VII criteria for preemptive (early) TIPS: Child-Pugh C (score 10-13) or Child-Pugh B with active bleeding at endoscopy.",
            "Restrictive transfusion protocol in variceal bleeding: maintaining target Hb 70-80 g/L to avoid rebound portal pressure elevation and rebleeding."
        ],
        "case_hooks": [
            "A 52-year-old male with alcoholic cirrhosis presents with massive haematemesis and BP 85/50 mmHg; the emergency physician begins balanced crystalloids, initiates IV octreotide and ceftriaxone, and requests emergency endoscopy.",
            "A cirrhotic patient with Child-Pugh C cirrhosis (score 11) achieves successful initial hemostasis with band ligation for spurting oesophageal varices; the hepatology team refers the patient for early preemptive TIPS within 48 hours."
        ],
        "uncertainties": [
            "Comparative efficacy of continuous versus bolus terlipressin administration in acute variceal bleeding mortality and ischemic complication rates.",
            "Safety and optimal timing of early non-selective beta-blocker (carvedilol) resumption following acute variceal haemostasis."
        ]
    },

    "Vascular Access for Haemodialysis": {
        "mentor_intro": (
            "Vascular access is the vital lifeline for patients with end-stage renal disease (ESRD) undergoing maintenance haemodialysis. "
            "Access modalities comprise native arteriovenous fistulas (AVF), arteriovenous grafts (AVG), and tunneled central venous catheters (CVC). "
            "The KDOQI Clinical Practice Guideline emphasizes creating an individualized 'End-Stage Kidney Disease Life-Plan', with native AVFs remaining the preferred first-line modality due to superior long-term patency, lower thrombosis rates, and substantially reduced bacteremia and mortality compared to central venous catheters."
        ),
        "teaching_points": [
            "Native arteriovenous fistulas (AVF, e.g., radiocephalic or brachiocephalic) provide superior long-term primary and secondary patency, lower re-intervention rates, and the lowest risk of infection and all-cause mortality compared to AV grafts and central venous catheters.",
            "The 'Rule of 6s' determines clinical readiness for cannulation of a mature AVF at 6 to 8 weeks post-operatively: blood flow >600 mL/min on duplex ultrasound, diameter >=6 mm, depth <=6 mm from the skin surface, and a straight cannulation segment of >=6 cm.",
            "Central venous catheters (CVCs) carry the highest rates of catheter-related bloodstream infections (CRBSI), metastatic septic emboli, central venous stenosis, and all-cause mortality; catheter access must be minimized and transitioned to permanent AV access whenever feasible.",
            "Neointimal hyperplasia at the venous anastomosis is the primary cause of AVF and AVG stenosis and thrombosis; endovascular balloon angioplasty (including paclitaxel drug-coated balloons) is the standard treatment to preserve vascular access circuits."
        ],
        "mcq_angles": [
            "Evaluating AVF maturation: applying the clinical and ultrasound 'Rule of 6s'.",
            "Complications of long-term subclavian catheterization: development of central vein stenosis that permanently destroys ipsilateral arm AV access options.",
            "Differentiating arteriovenous steal syndrome (ischemic monomelic neuropathy: cold painful hand during dialysis) requiring surgical revision (DRIL procedure) from typical access flow."
        ],
        "case_hooks": [
            "A 58-year-old diabetic male with progressive CKD stage 5 undergoes pre-dialysis vascular mapping; ultrasound reveals a 2.8 mm cephalic vein and 3.0 mm radial artery in the non-dominant wrist suitable for radiocephalic AVF.",
            "A haemodialysis patient with a brachiocephalic AVF complains of severe left hand numbness, pallor, and pain that worsens significantly during dialysis runs; distal radial pulses disappear during dialysis."
        ],
        "uncertainties": [
            "Long-term clinical durability and cost-effectiveness of percutaneous endovascular AVF (endoAVF) creation compared to open surgical AVF construction.",
            "Efficacy of drug-coated balloons (DCB) versus plain balloon angioplasty in preventing restenosis in dysfunctional native arteriovenous fistulas."
        ]
    },

    "Vascular dementia: Hachinski ischaemic score, subcortical ischaemic vascular dementia": {
        "mentor_intro": (
            "Vascular dementia (VaD) is the second most common cause of dementia in older adults after Alzheimer disease, resulting from ischemic or hemorrhagic brain injury. "
            "Subcortical ischemic vascular dementia (SIVD)—caused by cerebral small vessel disease (arteriolosclerosis, lacunar infarcts, and extensive white matter hyperintensities [leukoaraiosis])—is the most prevalent subtype, typically causing dysexecutive syndrome, psychomotor slowing, and gait apraxia rather than isolated memory loss. "
            "The Hachinski Ischaemic Score (HIS) is a validated clinical instrument that distinguishes vascular dementia (score >=7) from Alzheimer disease (score <=4) based on step-wise progression, focal neurological deficits, hypertension, and emotional lability."
        ),
        "teaching_points": [
            "The Hachinski Ischaemic Score (HIS) differentiates vascular dementia (score >=7) from degenerative Alzheimer disease (score <=4): key features include abrupt onset, stepwise cognitive deterioration, fluctuating course, emotional lability, history of stroke, and focal neurological signs.",
            "Subcortical ischemic vascular dementia (SIVD / Binswanger disease) is characterized clinically by prominent executive dysfunction, impaired cognitive processing speed, apathy, and pseudobulbar affect, with relative preservation of episodic memory storage compared to Alzheimer disease.",
            "Brain MRI is the gold standard imaging modality, demonstrating multiple lacunar infarcts, extensive confluent periventricular and deep white matter hyperintensities (Fazekas Grade 2-3), microbleeds on gradient-echo/SWI, and enlarged perivascular spaces.",
            "Secondary vascular prevention—intensive blood pressure control (targeting SBP <120-130 mmHg per SPRINT-MIND), statin therapy, antiplatelet agents for overt ischemic stroke, and management of diabetes—is the primary disease-modifying strategy to slow cognitive decline."
        ],
        "mcq_angles": [
            "Applying the Hachinski Ischaemic Score cutoff values: score >=7 indicates vascular dementia; score <=4 indicates Alzheimer disease; 5-6 indicates mixed dementia.",
            "Neurocognitive profile: early executive dysfunction and mental slowing in subcortical small vessel disease versus prominent amnestic memory storage deficit in Alzheimer disease.",
            "Evidence from SPRINT-MIND trial: intensive systolic blood pressure lowering (<120 mmHg) significantly reduces the risk of mild cognitive impairment and dementia progression."
        ],
        "case_hooks": [
            "A 74-year-old male with long-standing hypertension presents with psychomotor slowing, difficulty balancing his checkbook, and a slow, shuffling, wide-based gait; brain MRI demonstrates severe confluent periventricular white matter hyperintensities and multiple lacunar infarcts in the basal ganglia.",
            "A physician calculates a Hachinski Ischaemic Score of 9 in a 68-year-old woman presenting with sudden-onset expressive language impairment and stepwise functional deterioration following a minor stroke."
        ],
        "uncertainties": [
            "Efficacy and cognitive safety of cholinesterase inhibitors (donepezil, galantamine) and memantine in pure subcortical vascular dementia versus mixed Alzheimer-vascular dementia.",
            "Potential neuroprotective benefits of glucagon-like peptide-1 (GLP-1) receptor agonists and SGLT-2 inhibitors on cerebral microvascular integrity and cognitive decline."
        ]
    },

    "Vasopressor selection in septic and distributive shock": {
        "mentor_intro": (
            "Distributive shock—most commonly encountered as septic shock—is characterized by profound peripheral vasodilation, systemic vascular resistance (SVR) collapse, and microvascular hypoperfusion despite preserved or elevated cardiac output. "
            "When fluid resuscitation fails to restore an adequate mean arterial pressure (MAP >=65 mmHg), vasopressor therapy must be instituted immediately. "
            "Norepinephrine is the undisputed first-line vasopressor of choice, providing potent alpha-1 vasoconstriction with modest beta-1 inotropic support; second-line vasopressin is added to restore relative vasopressin deficiency and reduce catecholamine requirements."
        ),
        "teaching_points": [
            "Norepinephrine is the first-line vasopressor of choice in septic shock, superior to dopamine in achieving target MAP with significantly lower rates of tachyarrhythmias and lower all-cause mortality (Surviving Sepsis Campaign guidelines).",
            "Vasopressin (titrated at a fixed dose of 0.03 units/min without titration) is the recommended second-line vasopressor to be added when norepinephrine doses reach 0.25 to 0.5 ug/kg/min, restoring endogenous vasopressin deficiency and reducing adrenergic toxicity (VASST trial).",
            "Epinephrine is the recommended third-line add-on agent when MAP remains inadequate despite norepinephrine and vasopressin, or as an alternative inotrope/vasopressor combination.",
            "Dopamine is explicitly not recommended as a first-line vasopressor and should only be used in highly selected patients with low risk of tachyarrhythmias and absolute or relative bradycardia.",
            "Phenylephrine (pure alpha-1 agonist) should not be used in septic shock except when norepinephrine produces severe refractory ventricular tachyarrhythmias, or when cardiac output is known to be elevated with persistent hypotension."
        ],
        "mcq_angles": [
            "First-line vasopressor selection in septic shock: norepinephrine over dopamine (lower arrhythmia incidence and lower mortality).",
            "Role and fixed dosing of vasopressin (0.03 units/min) as a catecholamine-sparing agent in distributive shock.",
            "Inappropriate use of phenylephrine: understanding that pure alpha-1 vasoconstriction without beta-inotropy decreases stroke volume and cardiac index."
        ],
        "case_hooks": [
            "A 66-year-old male with septic shock remains hypotensive (MAP 54 mmHg) on norepinephrine 0.35 ug/kg/min; the intensivist adds vasopressin at a fixed non-titrated dose of 0.03 units/min.",
            "A junior resident suggests initiating dopamine infusion for a septic patient with a heart rate of 125 bpm; the attending explains why dopamine is contraindicated due to arrhythmogenic mortality."
        ],
        "uncertainties": [
            "Benefit and mortality impact of very early vasopressin initiation (prior to high-dose norepinephrine) in early septic shock resuscitation.",
            "Role of non-adrenergic vasoconstrictors such as synthetic human angiotensin II (ATHOS-3 trial) in refractory vasodilatory septic shock."
        ]
    },

    "Vasopressors and inotropes in shock": {
        "mentor_intro": (
            "Vasoactive agents—comprising vasopressors (inducing peripheral vasoconstriction to elevate vascular resistance) and inotropes (augmenting myocardial contractility and stroke volume)—are essential components of critical care resuscitation. "
            "The pharmacological selection of vasoactive support is guided by the underlying hemodynamic shock state: distributive (low SVR, high/normal CO), cardiogenic (low CO, elevated filling pressures, variable SVR), hypovolemic, or obstructive shock. "
            "Vigilant invasive hemodynamic monitoring (arterial line, cardiac output monitoring) is required to titrate vasoactive infusions to physiological targets while mitigating risks of excessive afterload, tachyarrhythmias, and peripheral digital necrosis."
        ),
        "teaching_points": [
            "Vasoactive agents possess distinct receptor affinities: alpha-1 (vasoconstriction), beta-1 (increased inotropy and chronotropy), beta-2 (vasodilation and bronchodilation), V1a (vascular smooth muscle contraction), and dopaminergic (DA1) receptors.",
            "In cardiogenic shock with persistent hypoperfusion despite adequate volume and blood pressure, dobutamine (beta-1 selective inotrope with mild beta-2 vasodilation) or milrinone (phosphodiesterase-3 inhibitor augmenting inotropy and reducing afterload) is the first-line inotrope of choice.",
            "Milrinone is an inodilator with a long half-life that relies on renal clearance; it causes significant systemic hypotension in underfilled patients and accumulates in acute kidney injury, making dobutamine preferred when acute renal dysfunction or borderline hypotension exists.",
            "In cardiogenic shock with severe hypotension, norepinephrine is the preferred first-line vasopressor to restore perfusion pressure before or alongside inotrope infusion, exhibiting superior safety over epinephrine, which causes excess myocardial oxygen consumption, lactic acidosis, and refractory arrhythmias."
        ],
        "mcq_angles": [
            "Selecting dobutamine vs milrinone in cardiogenic shock: dobutamine preferred in renal impairment and borderline blood pressure due to shorter half-life and less vasodilation.",
            "Receptor profiles: comparing norepinephrine (alpha-1 > beta-1) vs epinephrine (beta-1 = beta-2 at low dose, alpha-1 at high dose) vs phenylephrine (pure alpha-1).",
            "Harmful effects of epinephrine in cardiogenic shock (tachyarrhythmias, lactic acidosis, increased mortality in randomized comparisons with norepinephrine)."
        ],
        "case_hooks": [
            "A 64-year-old male with acute anterior STEMI undergoes emergent PCI; in the CCU he has cold extremities, BP 82/52 mmHg, cardiac index 1.6 L/min/m2, and pulmonary artery wedge pressure 24 mmHg; norepinephrine is initiated to achieve MAP 65, followed by dobutamine infusion.",
            "A patient with end-stage biventricular heart failure on milrinone infusion develops anuria and rising serum creatinine; milrinone accumulates, leading to refractory hypotension requiring drug cessation."
        ],
        "uncertainties": [
            "Optimal timing of mechanical circulatory support (Impella, VA-ECMO) versus escalating dual inotrope/vasopressor infusions in refractory cardiogenic shock (DanGer Shock trial).",
            "Peripheral versus central line administration safety for early short-term vasopressor infusions in emergency resuscitation."
        ]
    }
}
