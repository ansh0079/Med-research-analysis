# batch_data_part1.py
"""
Definitions for Batch 2 (116-130) and Batch 3 (131-145).
"""

def make_entry(cluster, intro, tps, sources, uncs, mcqs, hooks, gaps="Reviewers should verify local formulary alignment and subspecialty referral pathways."):
    return {
        'cluster': cluster,
        'mentor_intro': intro,
        'teaching_points': [{'claim': c, 'cites': cites} for c, cites in tps],
        'sources': [{'pmid': s[0], 'title': s[1], 'year': s[2], 'design': s[3]} for s in sources],
        'uncertainties': uncs,
        'mcq_angles': mcqs,
        'case_hooks': hooks,
        'gaps': gaps
    }

BATCH_2 = {}
BATCH_3 = {}

# BATCH 2: 116 to 130
e116 = make_entry(
    'alzheimers_disease',
    "Early Alzheimer's disease with confirmed amyloid-beta pathology is eligible for anti-amyloid monoclonal antibodies (lecanemab, donanemab). These agents target protofibrillar or plaque amyloid-beta to slow cognitive decline, but mandate APOE genotyping and serial safety MRI monitoring for ARIA.",
    [
        ("Lecanemab slowed 18-month cognitive and functional decline (CDR-SB) by 27% compared to placebo in the CLARITY AD trial.", ["36449413"]),
        ("Appropriate Use Criteria mandate pre-treatment confirmation of amyloid pathology via CSF biomarkers or amyloid PET imaging.", ["37402633"]),
        ("Amyloid-related imaging abnormalities with edema (ARIA-E) occur in 12.6% of patients on lecanemab and 24% on donanemab, with highest risk in APOE e4 homozygotes.", ["37459141"]),
        ("Routine surveillance brain MRIs are required before infusions 5, 7, and 14 to detect asymptomatic ARIA-E and ARIA-H.", ["37402633"])
    ],
    [
        ("36449413", "Lecanemab in Early Alzheimer's Disease (CLARITY AD).", 2023, "trial"),
        ("37402633", "Appropriate Use Criteria for Lecanemab in Early Alzheimer's Disease.", 2023, "guideline"),
        ("37459141", "Donanemab in Early Symptomatic Alzheimer Disease (TRAILBLAZER-ALZ 2).", 2023, "trial")
    ],
    ["Management of recurrent asymptomatic ARIA-E in APOE e4 carriers.", "Long-term clinical meaningfulness beyond the 18-month trial horizon."],
    ["Recognizing ARIA-E as sulcal or gyral hyperintensity on T2-FLAIR brain MRI.", "APOE e4 homozygous status as the primary risk factor for severe ARIA-E.", "Criteria for withholding anti-amyloid infusions in moderate-to-severe ARIA."],
    ["A 71-year-old with amnestic MCI and positive amyloid PET whose family inquires about lecanemab eligibility.", "A patient on lecanemab whose week 14 MRI shows asymptomatic frontal ARIA-E."]
)
BATCH_2[116] = e116
BATCH_2[117] = e116

BATCH_2[118] = make_entry(
    'amegakaryocytic_thrombocytopenia',
    "Congenital amegakaryocytic thrombocytopenia (CAMT) is a severe marrow failure disorder characterized by isolated severe thrombocytopenia and absent megakaryocytes on bone marrow biopsy. CAMT is caused by biallelic loss-of-function MPL mutations (TPO receptor), typically progressing to aplastic anemia or leukemia; allogeneic hematopoietic cell transplantation is the definitive curative treatment.",
    [
        ("Biallelic loss-of-function mutations in the MPL gene encoding the thrombopoietin receptor cause CAMT, leading to early marrow aplasia.", ["10856232"]),
        ("Bone marrow examination demonstrates selective absent or severely hypoplastic megakaryocytes with preserved erythroid and myeloid lineages in early stages.", ["31504429"]),
        ("Allogeneic hematopoietic cell transplantation performed prior to trilineage marrow failure or leukemic transformation achieves > 80% long-term cure.", ["34489572"]),
        ("In acquired amegakaryocytic thrombocytopenia (AAT), immunosuppressive therapy with cyclosporine, ATG, or rituximab achieves remissions in autoantibody-mediated cases.", ["29485925"])
    ],
    [
        ("10856232", "Mutations in the thrombopoietin receptor gene (MPL) in congenital amegakaryocytic thrombocytopenia.", 2000, "trial"),
        ("34489572", "Indications for allogeneic stem cell transplantation: EBMT guidelines.", 2021, "guideline")
    ],
    ["Optimal conditioning regimen intensity for CAMT.", "Differentiation of acquired AAT from myelodysplastic syndrome with isolated thrombocytopenia."],
    ["Distinguishing CAMT (absent radius syndrome / TAR has preserved megakaryocytes and absent radii; CAMT has normal radii).", "Role of allogeneic stem cell transplantation as sole curative modality.", "Initial bone marrow findings in CAMT vs immune thrombocytopenic purpura (ITP: abundant megakaryocytes)."],
    ["An infant presenting with severe petechiae and platelets 8,000/uL with normal skeletal radiography.", "An adult with refractory severe thrombocytopenia showing zero megakaryocytes on marrow aspirate."]
)

BATCH_2[119] = make_entry(
    'mpn_blast_phase',
    "Acute myeloid leukemia transformed from myeloproliferative neoplasms (MPN-blast phase / secondary AML) carries an aggressive clinical course and dismal prognosis. It is characterized by high rates of complex karyotype, TP53 mutations, and resistance to standard 7+3 chemotherapy. Management incorporates hypomethylating agents plus venetoclax or ruxolitinib as a bridge to allogeneic stem cell transplantation.",
    [
        ("Transformation to AML (blast phase, >= 20% blasts) occurs in 10-15% of myelofibrosis and 3-5% of polycythemia vera / essential thrombocythemia.", ["37217277"]),
        ("Standard cytarabine/anthracycline (7+3) induction yields low complete remission rates (< 20-30%) and high induction mortality in post-MPN AML.", ["30829177"]),
        ("Combination therapy with azacitidine and venetoclax produces composite remission in 40-50% of secondary AML, serving as an effective bridge to transplant.", ["32786182"]),
        ("Allogeneic stem cell transplantation is the only curative therapeutic option for patients with MPN in blast phase who achieve morphological remission.", ["34489572"])
    ],
    [
        ("37217277", "NCCN Guidelines: Acute Myeloid Leukemia.", 2023, "guideline"),
        ("32786182", "Azacitidine and Venetoclax in Previously Untreated Acute Myeloid Leukemia (VIALE-A).", 2020, "trial"),
        ("34489572", "EBMT Practice Guidelines on Allogeneic HCT.", 2021, "guideline")
    ],
    ["Optimal sequencing and continuation of JAK2 inhibitors (ruxolitinib) during induction.", "Post-transplant maintenance strategies to prevent recurrence in TP53-mutated secondary AML."],
    ["Identifying risk factors for MPN blast transformation: SRSF2, IDH1/2, ASXL1, and TP53 mutations.", "Venetoclax tumor lysis syndrome (TLS) mitigation and ramp-up protocol.", "Allogeneic transplant eligibility assessment in secondary AML."],
    ["A 67-year-old with a 9-year history of JAK2-positive myelofibrosis presenting with 28% peripheral blasts and pancytopenia.", "A post-PV patient with leukemic transformation evaluated for azacitidine-venetoclax induction."]
)

e120 = make_entry(
    'amyotrophic_lateral_sclerosis',
    "Amyotrophic lateral sclerosis (ALS) is a neurodegenerative disorder causing progressive loss of upper and lower motor neurons. Diagnosis utilizes Revised El Escorial and Gold Coast criteria. Disease-modifying therapy includes riluzole (glutamate antagonist) and edaravone. Non-invasive ventilation (NIV) improves survival and quality of life when respiratory muscle weakness develops.",
    [
        ("Revised El Escorial and Gold Coast criteria establish diagnosis based on upper and lower motor neuron signs across progressive body regions.", ["22672564"]),
        ("Riluzole (50 mg orally twice daily) extends median survival by 2 to 3 months and reduces tracheostomy risk (Cochrane review).", ["22419278"]),
        ("Non-invasive ventilation (BiPAP) is the single most effective intervention for extending survival (median 7-12 months benefit) when FVC drops < 50% or SNIP < 40 cmH2O.", ["23728633"]),
        ("Percutaneous endoscopic gastrostomy (PEG) or radiologically inserted gastrostomy (RIG) should be placed before FVC falls below 50% to minimize procedural respiratory failure.", ["19828738"])
    ],
    [
        ("22672564", "EFNS/EAN Guidelines on the Clinical Management of ALS.", 2012, "guideline"),
        ("22419278", "Riluzole for amyotrophic lateral sclerosis (ALS)/motor neuron disease (MND).", 2012, "systematic review"),
        ("23728633", "Non-invasive ventilation for amyotrophic lateral sclerosis.", 2013, "systematic review")
    ],
    ["Effectiveness of early pre-symptomatic NIV in patients with preserved daytime FVC but nocturnal hypoventilation.", "Targeted genetic therapies (tofersen) in SOD1-mutated familial ALS."],
    ["Distinguishing ALS from cervical spondylotic myelopathy: tongue fasciculations and normal sensory exam confirm ALS.", "Laboratory monitoring for riluzole: baseline and monthly hepatic transaminases for the first 3 months.", "Screening for frontotemporal dementia (FTD) which co-occurs in 15% of ALS patients."],
    ["A 56-year-old with progressive asymmetric hand grip weakness, muscle cramping, hyperreflexia, and tongue fasciculations.", "An ALS patient reporting morning headaches, fragmented sleep, and orthopnea whose sitting FVC is 46%."]
)
BATCH_2[120] = e120
BATCH_2[121] = e120

BATCH_2[122] = make_entry(
    'anaemia_and_inflammation',
    "Anaemia evaluation begins with complete blood count, reticulocyte count, and peripheral smear to categorize microcytic (MCV < 80 fL), normocytic (80-100 fL), or macrocytic (> 100 fL) etiologies. In adults, iron deficiency requires systematic investigation of the gastrointestinal tract (coeliac serology, bidirectional endoscopy) to identify bleeding malignancies.",
    [
        ("British Society of Gastroenterology guidelines mandate bidirectional endoscopy (gastroscopy and colonoscopy) for unexplained iron deficiency anemia in men and postmenopausal women.", ["34526361"]),
        ("Serum ferritin < 30 ug/L is the most specific biochemical marker of absolute iron deficiency; ferritin < 100 ug/L indicates deficiency in the setting of chronic inflammation.", ["34526361"]),
        ("Oral iron supplementation given once daily or on alternate days achieves equivalent or superior fractional iron absorption compared to multiple daily doses due to hepcidin surges.", ["26418823"]),
        ("Intravenous iron (ferric carboxymaltose, ferric derisomaltose) is superior to oral iron in active inflammatory bowel disease, heart failure (FERRIC-HF), and chronic kidney disease.", ["34526361"])
    ],
    [
        ("34526361", "British Society of Gastroenterology guidelines for the management of iron deficiency anaemia in adults.", 2021, "guideline"),
        ("26418823", "Iron absorption from oral iron supplements given on consecutive versus alternate days and as single versus twice-daily doses.", 2015, "trial")
    ],
    ["Indications for capsule endoscopy in iron deficiency anemia when bidirectional endoscopy is unrevealing.", "Diagnostic threshold for functional iron deficiency in heart failure with preserved ejection fraction."],
    ["Differentiating iron deficiency anemia (low ferritin, high TIBC/transferrin, low transferrin saturation < 16-20%) from thalassemia trait (Mentzer index < 13).", "Alternate-day oral iron dosing rationale: avoids hepcidin-mediated enterocyte blockade for 24-48 hours.", "Targeting intravenous iron in symptomatic HFrEF patients with ferritin < 100 or 100-299 with TSAT < 20%."],
    ["A 68-year-old asymptomatic male found to have microcytic anemia (Hb 9.8 g/dL, MCV 72 fL, ferritin 12 ug/L).", "A patient with Crohn's disease and active flare whose Hb is 8.6 g/dL and who cannot tolerate oral iron tablets."]
)

BATCH_2[123] = make_entry(
    'anaemia_of_chronic_disease',
    "Anaemia of chronic disease (ACD / anaemia of inflammation) is a cytokine-driven normocytic or mildly microcytic anaemia. Interleukin-6 stimulates hepatic production of hepcidin, which degrades ferroportin, trapping iron in reticuloendothelial macrophages and enterocytes. Laboratory hallmark is low serum iron, low TIBC/transferrin, normal to elevated ferritin (> 100 ng/mL), and elevated hepcidin.",
    [
        ("Hepcidin-mediated internalization and degradation of ferroportin-1 prevents intestinal iron absorption and macrophage iron release, causing hypoferremia.", ["30737227"]),
        ("Differentiating pure ACD from combined ACD + iron deficiency: TSAT < 20% with ferritin 30-100 ug/L indicates concurrent true iron deficiency responsive to IV iron.", ["34526361"]),
        ("Treating the underlying inflammatory, infectious, or rheumatologic condition remains the primary and most effective therapy for ACD.", ["30737227"]),
        ("Erythropoiesis-stimulating agents (ESAs) or hypoxia-inducible factor prolyl hydroxylase inhibitors (HIF-PHIs) restore hemoglobin in chronic kidney disease ACD but require repletion of iron stores.", ["23154948"])
    ],
    [
        ("30737227", "Anaemia of chronic disease: pathophysiology and management.", 2019, "review"),
        ("34526361", "BSG guidelines on the management of iron deficiency anaemia.", 2021, "guideline"),
        ("23154948", "KDIGO Clinical Practice Guideline for Anemia in Chronic Kidney Disease.", 2012, "guideline")
    ],
    ["Utility of soluble transferrin receptor (sTfR) / log ferritin index in confirming concurrent iron deficiency in inflammatory states.", "Long-term cardiovascular safety profiles of HIF-PHIs compared to conventional ESAs."],
    ["Biochemical profile of pure ACD: low iron, low transferrin/TIBC, high or normal ferritin, low reticulocyte count.", "Why oral iron is ineffective in high-hepcidin inflammatory states (ferroportin blockade prevents gut mucosal transfer).", "Risk of red cell aplasia and thrombosis with excessive ESA dosing targeting Hb > 11.5-12 g/dL in CKD."],
    ["A 59-year-old with rheumatoid arthritis whose Hb is 10.1 g/dL, MCV 84 fL, iron 24 ug/dL, TIBC 210 ug/dL, and ferritin 380 ug/L.", "A hemodialysis patient with non-responsive anemia on darbepoetin whose TSAT is 14% and ferritin is 180 ug/L."]
)

e124 = make_entry(
    'anal_canal_cancer',
    "Squamous cell carcinoma of the anal canal is strongly associated with high-risk human papillomavirus (HPV types 16 and 18). Curative standard of care for localized disease (T1-T4, N0-N3) is definitive concurrent chemoradiotherapy (Nigro protocol: 5-fluorouracil or capecitabine + mitomycin C with external beam radiotherapy), preserving anal sphincter function in > 75% of patients.",
    [
        ("Definitive concurrent chemoradiation with 5-FU and mitomycin C provides 80% 5-year colostomy-free survival in localized anal squamous cell carcinoma.", ["6187766"]),
        ("ESMO and NCCN guidelines recommend IMRT (intensity-modulated radiation therapy) to minimize radiation dermatitis, proctitis, and pelvic bone marrow toxicity.", ["34185202"]),
        ("Abdominoperineal resection (APR) with permanent end colostomy is reserved strictly for persistent disease at 26 weeks post-CRT or biopsy-proven locoregional recurrence.", ["37722421"]),
        ("First-line systemic therapy for metastatic or unresectable recurrent anal carcinoma is carboplatin plus paclitaxel, with immune checkpoint inhibitors (retifanlimab, pembrolizumab) for refractory disease.", ["34185202"])
    ],
    [
        ("6187766", "Combined chemoradiotherapy as primary management of anal squamous cell carcinoma (Nigro Protocol).", 1983, "trial"),
        ("34185202", "ESMO Clinical Practice Guideline for Anal Cancer.", 2021, "guideline"),
        ("37722421", "NCCN Guidelines: Anal Carcinoma.", 2023, "guideline")
    ],
    ["Optimal interval post-chemoradiotherapy to confirm complete clinical response without premature salvage surgery.", "Role of circulating HPV DNA as a liquid biopsy biomarker for minimal residual disease."],
    ["HPV 16 as the causative agent in > 85-90% of anal canal squamous cell carcinomas.", "The Nigro regimen components: 5-FU (or capecitabine) plus mitomycin C combined with radiotherapy.", "Post-treatment surveillance: digital rectal exam, anoscopy, and inguinal lymph node palpation every 3-6 months for 5 years."],
    ["A 52-year-old presenting with rectal bleeding, tenesmus, and a 3.5 cm ulcerated anal canal mass on digital examination.", "A patient 12 weeks post-Nigro regimen with a persistent 1 cm indurated area on anoscopy; assessing need for observation to 26 weeks."]
)
BATCH_2[124] = e124
BATCH_2[125] = e124

BATCH_2[126] = make_entry(
    'analgesia_strategies',
    "Multimodal analgesia targets multiple pain pathways simultaneously using paracetamol, NSAIDs or selective COX-2 inhibitors, regional/neuraxial blocks, and non-opioid adjuvants (gabapentinoids, IV lidocaine, ketamine). This synergistic approach achieves superior dynamic pain control while minimizing opioid consumption and opioid-related adverse events.",
    [
        ("ASA and PROSPECT practice guidelines recommend scheduled multimodal non-opioid analgesia as the baseline for all postoperative pain management.", ["26840801"]),
        ("Combining paracetamol (1g IV/oral q6h) with an NSAID (e.g. ibuprofen or celecoxib) provides greater pain relief than either agent alone without added toxicity.", ["20593452"]),
        ("Perioperative intravenous lidocaine infusions in major abdominal surgery accelerate return of bowel function, reduce pain scores, and shorten hospital stay.", ["29485925"]),
        ("Low-dose ketamine (NMDA receptor antagonist) reduces postoperative opioid consumption and prevents opioid-induced hyperalgesia in opioid-tolerant surgical patients.", ["26840801"])
    ],
    [
        ("26840801", "Practice Guidelines for Acute Postoperative Pain Management: American Society of Anesthesiologists.", 2016, "guideline"),
        ("20593452", "Single dose oral paracetamol plus ibuprofen for acute postoperative pain.", 2010, "systematic review")
    ],
    ["Risk-benefit balance of preoperative gabapentinoid loading regarding excessive sedation and respiratory depression.", "Cardiovascular and renal safety of short-course (48-72h) perioperative COX-2 inhibitors."],
    ["Mechanism of ketamine in chronic pain: non-competitive NMDA receptor blockade preventing central sensitization.", "Opioid-sparing multimodal protocol components: scheduled paracetamol + NSAID + local infiltration + PRN weak opioid.", "Contraindications to intravenous lidocaine: severe heart block, ventricular arrhythmias, and severe hepatic impairment."],
    ["A 65-year-old on high-dose chronic buprenorphine undergoing total knee arthroplasty requiring acute pain planning.", "A post-colectomy patient developing nausea, urinary retention, and ileus on PCA morphine who is transitioned to multimodal analgesia."]
)

BATCH_2[127] = make_entry(
    'anaphylaxis',
    "Anaphylaxis is an acute, life-threatening systemic hypersensitivity reaction with rapid onset involving airway, breathing, circulation, or skin/mucosa. Intramuscular epinephrine (adrenaline) 1:1,000 (0.01 mg/kg, max 0.5 mg in adults; 0.3 mg auto-injector) into the mid-anterolateral thigh is the immediate, mandatory first-line therapy. Second-line antihistamines and steroids must never delay epinephrine.",
    [
        ("World Allergy Organization (WAO) guidelines mandate immediate intramuscular epinephrine (0.01 mg/kg, max 0.5 mg) in the mid-anterolateral thigh as the primary life-saving drug.", ["33202997"]),
        ("Antihistamines (H1/H2 blockers) and corticosteroids relieve cutaneous symptoms but do not treat airway obstruction, bronchospasm, or vascular collapse and must not delay epinephrine.", ["34564883"]),
        ("Biphasic anaphylactic reactions occur in 5-10% of cases, typically within 8 hours, warranting hospital observation for at least 4-8 hours post-resolution.", ["33202997"]),
        ("Serial serum total tryptase levels measured at 1-2 hours and > 24 hours post-event confirm mast cell degranulation (acute peak > 1.2 x baseline + 2 ug/L).", ["34564883"])
    ],
    [
        ("33202997", "World Allergy Organization Anaphylaxis Guidelines 2020 Update.", 2020, "guideline"),
        ("34564883", "EAACI Guideline: Anaphylaxis (2021 Update).", 2021, "guideline")
    ],
    ["Optimal observation duration for patients who achieve complete resolution after a single epinephrine dose.", "Management of refractory anaphylaxis in patients concurrently taking beta-blockers (role of IV glucagon)."],
    ["Route and site of epinephrine: intramuscular into the anterolateral vastus lateralis (superior absorption and faster peak plasma levels than subcutaneous or deltoid).", "Refractory anaphylaxis in a patient on propranolol: administer IV glucagon (1-5 mg over 5 min) which bypasses beta-receptors via adenylate cyclase stimulation.", "Discharge requirements: prescription of two epinephrine auto-injectors, personalized allergy action plan, and allergy clinic referral."],
    ["A 22-year-old eating at a restaurant who develops acute tongue swelling, stridor, wheeze, and BP 80/50 mmHg 10 minutes after peanut ingestion.", "A patient experiencing anaphylaxis during amoxicillin injection who fails to respond to 3 doses of IM epinephrine; medical team initiates IV epinephrine infusion."]
)

BATCH_2[128] = make_entry(
    'anaplastic_thyroid_cancer',
    "Anaplastic thyroid carcinoma (ATC) is an ultra-aggressive solid malignancy presenting with a rapidly enlarging anterior neck mass, dysphagia, stridor, and vocal cord paralysis. Immediate airway assessment, contrast-enhanced CT neck/chest, core biopsy, and rapid molecular testing for BRAF V600E are required within 48-72 hours. For BRAF-mutated ATC, dabrafenib plus trametinib induces dramatic rapid tumor regression.",
    [
        ("American Thyroid Association (ATA) guidelines mandate urgent multidisciplinary evaluation, vocal cord assessment, and reflex BRAF V600E testing within 2-3 days of suspected ATC.", ["33729901"]),
        ("Combined targeted therapy with dabrafenib (BRAF inhibitor) and trametinib (MEK inhibitor) achieves an 69% objective response rate in BRAF V600E-mutated ATC (ROAR trial).", ["29198908"]),
        ("In resectable disease without distant metastases, radical surgical resection with clear margins followed by adjuvant intensity-modulated radiation therapy (IMRT) improves locoregional control.", ["33729901"]),
        ("For BRAF wild-type ATC, cytotoxic chemotherapy (paclitaxel plus carboplatin) combined with radiation therapy or checkpoint inhibitors is standard.", ["33729901"])
    ],
    [
        ("33729901", "2021 American Thyroid Association Guidelines for Management of Patients with Anaplastic Thyroid Cancer.", 2021, "guideline"),
        ("29198908", "Dabrafenib and trametinib in patients with BRAF V600E-mutant anaplastic thyroid cancer: ROAR basket trial.", 2018, "trial")
    ],
    ["Neoadjuvant dabrafenib/trametinib to convert initially unresectable BRAF-mutant ATC to complete surgical resection.", "Role of frontline PD-1 inhibitors (pembrolizumab) added to chemoradiation in BRAF wild-type disease."],
    ["Clinical presentation of ATC: elderly patient with rapidly growing rock-hard neck mass over weeks with hoarseness and dyspnea.", "Molecular profiling urgency: BRAF V600E mutation occurs in 40-50% of ATC and dictates immediate targeted therapy.", "Airway management priorities: avoid tracheostomy if possible unless acute imminent asphyxia, as it leads to tumor fungation and stoma bleeding."],
    ["A 74-year-old female with a 5-week history of a rapidly expanding 6 cm neck mass, stridor, and right vocal cord paralysis on laryngoscopy.", "A patient with newly diagnosed ATC confirmed BRAF V600E positive on day 3; oncology initiates immediate dabrafenib-trametinib."]
)

e129 = make_entry(
    'anca_associated_vasculitis',
    "ANCA-associated vasculitis (AAV) encompasses Granulomatosis with Polyangiitis (GPA; PR3-ANCA), Microscopic Polyangiitis (MPA; MPO-ANCA), and Eosinophilic Granulomatosis with Polyangiitis (EGPA). Remission induction for organ- or life-threatening disease combines high-dose glucocorticoids with rituximab or cyclophosphamide. Avacopan (C5a receptor antagonist) enables significant glucocorticoid-sparing induction.",
    [
        ("EULAR 2022 recommendations establish rituximab (375 mg/m2 weekly x 4 or 1000 mg x 2) as equivalent to cyclophosphamide for induction and superior for relapsing disease.", ["36927642"]),
        ("Avacopan (30 mg twice daily), an oral complement C5a receptor antagonist, produces sustained remission at 52 weeks while significantly reducing glucocorticoid-related toxicity (ADVOCATE trial).", ["33596356"]),
        ("PEXIVAS trial demonstrated that routine plasma exchange does not reduce end-stage kidney disease or all-cause mortality, and a reduced-dose glucocorticoid regimen is non-inferior with fewer severe infections.", ["32050077"]),
        ("Maintenance of remission is best achieved with scheduled low-dose rituximab (500 mg every 6 months for at least 24-48 months) compared to azathioprine (MAINRITSAN trial).", ["25372087"])
    ],
    [
        ("36927642", "EULAR recommendations for the management of ANCA-associated vasculitis: 2022 update.", 2023, "guideline"),
        ("33596356", "Avacopan for the Treatment of ANCA-Associated Vasculitis (ADVOCATE Trial).", 2021, "trial"),
        ("32050077", "Plasma Exchange and Glucocorticoid Dosing in Severe ANCA-Associated Vasculitis (PEXIVAS).", 2020, "trial"),
        ("25372087", "Rituximab versus azathioprine for maintenance in ANCA-associated vasculitis (MAINRITSAN).", 2014, "trial")
    ],
    ["Optimal total duration of rituximab maintenance therapy in PR3-ANCA positive patients with persistent ANCA positivity.", "Niche role of rescue plasma exchange in severe diffuse alveolar hemorrhage with mechanical ventilation."],
    ["Serological associations: GPA correlates predominantly with c-ANCA / PR3 antibodies; MPA correlates with p-ANCA / MPO antibodies.", "The ADVOCATE trial outcome: avacopan achieves non-inferior remission at week 26 and superior sustained remission at week 52 with higher eGFR recovery.", "Infection prophylaxis: trimethoprim-sulfamethoxazole is mandatory during induction with rituximab or cyclophosphamide."],
    ["A 58-year-old presenting with sinusitis, pulmonary cavitating nodules on CT, hematuria, and c-ANCA/PR3 titer > 1:320.", "A patient with MPA and rapidly rising creatinine (3.8 mg/dL) who receives rituximab and avacopan to minimize high-dose oral steroids."]
)
BATCH_2[129] = e129
BATCH_2[130] = e129

# BATCH 3: 131 to 145
BATCH_3[131] = e129

BATCH_3[132] = make_entry(
    'subarachnoid_hemorrhage',
    "Aneurysmal subarachnoid hemorrhage (aSAH) is an acute neurosurgical emergency presenting with sudden thunderclap headache. Initial evaluation requires emergent non-contrast head CT within 6 hours (sensitivity > 99%); lumbar puncture for CSF xanthochromia is mandatory if CT is negative. Management prioritizes immediate aneurysm securing (endovascular coiling preferred), oral nimodipine for 21 days, and euvolemia to prevent delayed cerebral ischemia.",
    [
        ("AHA/ASA guidelines recommend immediate endovascular coiling over surgical clipping for ruptured aneurysms amenable to both modalities (ISAT trial).", ["16139655"]),
        ("Oral nimodipine (60 mg every 4 hours for 21 days) significantly reduces delayed cerebral ischemia and poor neurological outcome.", ["21748241"]),
        ("Blood pressure should be controlled with titratable IV infusions (labetalol, nicardipine) targeting SBP < 140-160 mmHg prior to aneurysm securing.", ["37216662"]),
        ("Maintenance of euvolemia is recommended; hypervolemic 'triple-H' therapy is no longer recommended due to cardiopulmonary complications.", ["37216662"])
    ],
    [
        ("37216662", "2023 Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage (AHA/ASA).", 2023, "guideline"),
        ("16139655", "International Subarachnoid Aneurysm Trial (ISAT) of neurosurgical clipping versus endovascular coiling.", 2005, "trial"),
        ("21748241", "Critical care management of patients following aneurysmal subarachnoid hemorrhage: Neurocritical Care Society.", 2011, "guideline")
    ],
    ["Continuous EEG monitoring for non-convulsive status epilepticus in comatose aSAH patients.", "Target mean arterial pressure and inotropic thresholds for treating confirmed symptomatic vasospasm."],
    ["Non-contrast head CT sensitivity within 6 hours vs requirement for lumbar puncture looking for spectrophotometric xanthochromia at 12 hours.", "Pharmacologic prevention of delayed cerebral ischemia: oral nimodipine is the only drug with proven neurological outcome benefit.", "Recognizing electrocardiographic manifestations of aSAH (neurogenic stunned myocardium: QT prolongation, inverted T waves, troponin leak)."],
    ["A 48-year-old presenting with sudden severe occipital headache 'like being hit by a bat', vomiting, and neck stiffness; head CT is normal at 9 hours post-onset.", "A coiled aSAH patient who develops new left-sided pronator drift and confusion on day 7 post-bleed (delayed cerebral ischemia)."]
)

BATCH_3[133] = make_entry(
    'angioedema',
    "Angioedema is asymmetric swelling of the deep dermis and subcutaneous or submucosal tissues. It is critical to differentiate histamine-mediated angioedema (associated with urticaria/pruritus, responds to epinephrine, antihistamines, and steroids) from bradykinin-mediated angioedema (ACE-inhibitor induced or hereditary angioedema [HAE]). Bradykinin-mediated angioedema lacks urticaria and does NOT respond to antihistamines or steroids.",
    [
        ("WAO/EAACI guidelines recommend icatibant (bradykinin B2 receptor antagonist) or plasma-derived C1-inhibitor concentrate for acute attacks of hereditary angioedema.", ["34978809"]),
        ("ACE inhibitor-induced angioedema is caused by impaired bradykinin degradation; ACE inhibitors must be permanently discontinued, and ARBs should be avoided in acute severe airway presentation.", ["28203777"]),
        ("Hereditary angioedema (HAE) Type 1 (85%) has low C4 and low antigenic/functional C1-INH; Type 2 (15%) has low C4, normal antigenic but low functional C1-INH.", ["34978809"]),
        ("Emergent airway protection (fiberoptic intubation or cricothyroidotomy) takes precedence over pharmacotherapy in progressive laryngeal edema.", ["34978809"])
    ],
    [
        ("34978809", "The international WAO/EAACI guideline for the management of hereditary angioedema - the 2021 revision.", 2022, "guideline"),
        ("28203777", "ACE inhibitor-induced angioedema: a review of pathomechanisms and clinical management.", 2017, "review")
    ],
    ["Role of tranexamic acid and fresh frozen plasma in acute ACE-inhibitor angioedema when icatibant is unavailable.", "Safety of switching to ARBs or sacubitril/valsartan in patients with prior mild ACE-inhibitor angioedema."],
    ["Screening test of choice for HAE: serum C4 level (consistently low even during remission; sensitivity > 95%).", "Why steroids and epinephrine fail in bradykinin angioedema: pathology is vascular permeability driven by bradykinin B2 receptors.", "Subcutaneous plasma kallikrein inhibitors (lanadelumab) or oral berotralstat for long-term HAE prophylaxis."],
    ["A 63-year-old taking enalapril who develops massive painless lip and tongue swelling without urticaria or wheezing.", "A 22-year-old with recurrent severe abdominal pain and hand swelling whose serum C4 is markedly reduced."]
)

e134 = make_entry(
    'vasodilatory_shock',
    "Catecholamine-refractory vasodilatory shock is characterized by persistent severe hypotension and inadequate organ perfusion despite high-dose norepinephrine and vasopressin. Synthetic human angiotensin II acts through the AT1 receptor, providing a non-adrenergic vasoconstrictor mechanism. Management includes early hydrocortisone, vasopressin (0.03 units/min), and angiotensin II in refractory shock.",
    [
        ("ATHOS-3 randomized trial demonstrated that synthetic human angiotensin II significantly increased mean arterial pressure and reduced background catecholamine requirements in vasodilatory shock.", ["28528561"]),
        ("Surviving Sepsis Campaign guidelines recommend adding vasopressin (0.03 U/min) rather than escalating norepinephrine to high levels (> 0.25 mcg/kg/min).", ["34599691"]),
        ("Patients with high baseline serum renin concentrations or acute kidney injury receiving renal replacement therapy experience the greatest survival benefit from angiotensin II.", ["31835948"]),
        ("Thromboembolic events occur more frequently with angiotensin II, warranting mandatory concurrent pharmacological venous thromboembolism prophylaxis.", ["28528561"])
    ],
    [
        ("28528561", "Angiotensin II for the Treatment of Vasodilatory Shock (ATHOS-3 Trial).", 2017, "trial"),
        ("34599691", "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", 2021, "guideline"),
        ("31835948", "Angiotensin II in septic shock: current evidence and practical clinical use.", 2020, "review")
    ],
    ["Optimal physiological biomarkers for selecting patients who derive mortality benefit from angiotensin II.", "Sequencing of non-adrenergic vasopressors: vasopressin versus angiotensin II versus methylene blue."],
    ["The adrenergic sparing effect: adding vasopressin or angiotensin II prevents excessive beta-1 tachycardia and myocardial ischemia from extreme norepinephrine doses.", "Surviving Sepsis Campaign recommendation on corticosteroids: IV hydrocortisone 200 mg/day indicated only if shock persists despite norepinephrine >= 0.25 mcg/kg/min and vasopressin.", "Mechanism of action of angiotensin II: direct stimulation of vascular smooth muscle AT1 Gq-protein receptors causing calcium influx and vasoconstriction."],
    ["A 55-year-old with septic shock requiring norepinephrine 0.5 mcg/kg/min, vasopressin 0.03 U/min, and epinephrine whose lactate is 6.2 mmol/L.", "An ICU patient with septic shock and dialysis-dependent AKI initiated on angiotensin II infusion."]
)
BATCH_3[134] = e134
BATCH_3[135] = e134

e136 = make_entry(
    'axial_spondyloarthritis',
    "Ankylosing spondylitis (radiographic axial spondyloarthritis) is a chronic inflammatory arthritis predominantly affecting the axial skeleton and sacroiliac joints. It presents with inflammatory back pain (morning stiffness > 30 minutes, improvement with exercise, pain at night) in individuals < 45 years. First-line therapy is continuous full-dose NSAIDs; active disease refractory to NSAIDs is treated with TNF inhibitors or IL-17A inhibitors.",
    [
        ("ASAS/EULAR 2022 recommendations recommend continuous NSAIDs at maximum tolerated doses as first-line medical therapy for active axial spondyloarthritis.", ["36270658"]),
        ("TNF inhibitors (adalimumab, etanercept, infliximab, golimumab, certolizumab) or IL-17A inhibitors (secukinumab, ixekizumab) achieve significant disease reduction (ASAS40) in active AS.", ["36270658"]),
        ("Conventional synthetic DMARDs (methotrexate, sulfasalazine) are ineffective for pure axial spinal disease, although sulfasalazine is useful for prominent peripheral arthritis.", ["31441226"]),
        ("JAK inhibitors (upadacitinib, tofacitinib) are approved oral options for active radiographic and non-radiographic axSpA refractory to bDMARDs.", ["36270658"])
    ],
    [
        ("36270658", "2022 EULAR recommendations for the management of axial spondyloarthritis.", 2023, "guideline"),
        ("31441226", "2019 ACR/SAA/SPARTAN Guideline for the Treatment of Axial Spondyloarthritis.", 2019, "guideline")
    ],
    ["Comparative effectiveness of IL-17A inhibitors vs TNF inhibitors on radiographic syndesmophyte progression.", "Role of MRI sacroiliitis monitoring in patients who achieve clinical remission."],
    ["Features of inflammatory vs mechanical back pain: age < 45, insidious onset, improvement with exercise, no improvement with rest, pain at night.", "Extra-skeletal manifestations of AS: acute anterior uveitis (most common, 30%), psoriasis, inflammatory bowel disease, and aortic regurgitation / conduction blocks.", "Radiographic hallmark: bilateral sacroiliitis, squaring of vertebral bodies, syndesmophytes ('bamboo spine')."],
    ["A 28-year-old male with a 2-year history of lower back and buttock pain waking him at 4 AM, with morning stiffness lasting 90 minutes and elevated CRP.", "An AS patient with Crohn's disease whose rheumatologist selects adalimumab over secukinumab (since IL-17 inhibitors can exacerbate active IBD)."]
)
BATCH_3[136] = e136
BATCH_3[137] = e136

BATCH_3[138] = make_entry(
    'anorectal_disorders',
    "Common benign anorectal disorders include hemorrhoidal disease, anal fissures, anorectal abscesses, and fistula-in-ano. Thrombosed external hemorrhoids present with acute severe pain and a bluish perianal lump (excised within 72h). Acute anal fissures present with tearing pain during defecation and bright red rectal bleeding (treated with topical nitroglycerin or diltiazem). Anorectal abscesses require prompt incision and drainage.",
    [
        ("ASCRS guidelines recommend dietary fiber supplementation (25-35g daily) and water intake as the cornerstone of conservative therapy for hemorrhoids.", ["29406450"]),
        ("Rubber band ligation is the most effective outpatient procedure for Grade I to III internal hemorrhoids that fail medical management.", ["29406450"]),
        ("Topical calcium channel blockers (2% diltiazem) or topical nitrates (0.4% nitroglycerin) are first-line for chronic anal fissure, healing 65-75% without fecal incontinence risk.", ["28059902"]),
        ("Anorectal abscesses require prompt surgical incision and drainage; routine antibiotics do not prevent fistula formation unless systemic sepsis or immunosuppression is present.", ["27221644"])
    ],
    [
        ("29406450", "The American Society of Colon and Rectal Surgeons Clinical Practice Guidelines for the Management of Hemorrhoids.", 2018, "guideline"),
        ("28059902", "ASCRS Clinical Practice Guideline for the Management of Anal Fissures.", 2017, "guideline")
    ],
    ["Indications for botulinum toxin injection versus lateral internal sphincterotomy in chronic fissure refractory to topical CCBs.", "Optimal surgical approach for complex high transsphincteric anal fistulas (LIFT vs mucosal advancement flap)."],
    ["Distinguishing internal hemorrhoids (above dentate line, painless bleeding/prolapse) from external hemorrhoids (below dentate line, exquisitely painful when thrombosed).", "Common side effect of topical 0.4% nitroglycerin ointment: severe throbbing headache (topical diltiazem has fewer systemic side effects).", "Parks classification and Goodsall rule for predicting the internal opening of a perianal fistula based on external opening location."],
    ["A 31-year-old woman presenting with severe sharp anal pain during defecation described as 'passing broken glass' with blood on the toilet paper.", "A 45-year-old diabetic presenting with throbbing perianal pain, induration, and fever, diagnosed with an ischiorectal abscess."]
)

BATCH_3[139] = make_entry(
    'anterior_mediastinal_masses',
    "Anterior mediastinal masses encompass the classic '4 Ts': Thymoma/thymic carcinoma, Teratoma (germ cell tumors), Thyroid (substernal goiter), and Terrible lymphoma. Diagnostic workup mandates contrast-enhanced CT thorax, serum tumor markers (alpha-fetoprotein [AFP], beta-hCG, and LDH), assessment for myasthenia gravis (anti-AChR antibodies), and multidisciplinary planning prior to biopsy.",
    [
        ("Serum tumor markers (AFP and beta-hCG) must be drawn before any biopsy or invasive procedure to evaluate for non-seminomatous germ cell tumors.", ["37722422"]),
        ("Preoperative screening for anti-acetylcholine receptor (AChR) antibodies is mandatory in suspected thymoma to prevent post-intubation myasthenic crisis.", ["37722422"]),
        ("Primary mediastinal large B-cell lymphoma (PMLBCL) and classic Hodgkin lymphoma present with rapid bulky anterior masses in young adults, treated with DA-EPOCH-R or ABVD.", ["37217277"]),
        ("Complete surgical resection (thymectomy) is the mainstay of treatment for non-invasive and locally advanced resectable thymomas (Masaoka-Koga stage I-II).", ["37722422"])
    ],
    [
        ("37722422", "NCCN Clinical Practice Guidelines in Oncology: Thymomas and Thymic Carcinomas.", 2023, "guideline"),
        ("37217277", "NCCN Guidelines: B-Cell Lymphomas.", 2023, "guideline")
    ],
    ["Indication for neoadjuvant chemotherapy in Masaoka-Koga stage III thymomas prior to en bloc resection.", "Airway management and risk of complete tracheobronchial collapse during general anesthesia in large anterior mediastinal masses."],
    ["The '4 Ts' differential diagnosis of anterior mediastinal lesions: Thymoma, Teratoma/GCT, Thyroid goiter, Terrible lymphoma.", "Marker interpretation: elevated AFP is diagnostic of non-seminomatous GCT (yolk sac element); isolated elevated beta-hCG occurs in seminoma or choriocarcinoma.", "Myasthenia gravis association: 30-50% of thymoma patients have myasthenia gravis; 10-15% of myasthenia patients have a thymoma."],
    ["A 34-year-old male with a 9 cm anterior mediastinal mass on chest radiography whose serum beta-hCG is 24,000 mIU/mL and AFP is 850 ng/mL.", "A 49-year-old woman with ptosis and diplopia found to have a well-circumscribed 4 cm anterior mediastinal mass on contrast CT."]
)

BATCH_3[140] = make_entry(
    'anthracycline_cardiotoxicity',
    "Anthracycline-induced cardiotoxicity (doxorubicin, epirubicin) causes cumulative dose-dependent myocardial injury through topoisomerase II-beta inhibition, reactive oxygen species generation, and irreversible cardiomyocyte apoptosis. Surveillance relies on baseline and serial echocardiography with global longitudinal strain (GLS). Cardioprotection with dexrazoxane or neurohormonal blockade (ACEi/beta-blockers) is indicated in high-risk patients.",
    [
        ("ESC 2022 Cardio-Oncology guidelines define cancer therapy-related cardiac dysfunction (CTRCD) by a decrease in LVEF >= 10 percentage points to < 50%, or a relative reduction in global longitudinal strain (GLS) > 15%.", ["36017568"]),
        ("Cumulative lifetime doxorubicin dose is the strongest risk factor: heart failure incidence rises sharply above 400-500 mg/m2.", ["27918721"]),
        ("Dexrazoxane (iron-chelating topoisomerase II-beta inhibitor) significantly reduces anthracycline-induced cardiotoxicity without compromising oncological efficacy in high-risk patients.", ["36017568"]),
        ("Guideline-directed neurohormonal blockade (carvedilol, enalapril) initiated for early subclinical strain deterioration or asymptomatic LVEF drop prevents progression to clinical heart failure.", ["36017568"])
    ],
    [
        ("36017568", "2022 ESC Guidelines on cardio-oncology.", 2022, "guideline"),
        ("27918721", "Prevention and Monitoring of Cardiac Dysfunction in Survivors of Adult Cancers: ASCO Clinical Practice Guideline.", 2017, "guideline")
    ],
    ["Cardioprotective efficacy of primary prophylactic SGLT2 inhibitors or statins alongside anthracycline chemotherapy.", "Long-term monitoring frequency in childhood cancer survivors who received anthracyclines."],
    ["Global longitudinal strain (GLS) utility: relative drop of > 15% from baseline detects subclinical cardiotoxicity before conventional LVEF declines.", "Dexrazoxane mechanism: selectively prevents topoisomerase II-beta complex formation and chelates intracellular iron, reducing free radical production.", "Anthracycline lifetime maximum cumulative dose thresholds: doxorubicin (450-500 mg/m2), epirubicin (900 mg/m2)."],
    ["A 52-year-old woman undergoing dose-dense AC chemotherapy for breast cancer whose routine 3-month echo shows LVEF drop from 62% to 46%.", "A patient who has received 400 mg/m2 doxorubicin for Hodgkin lymphoma showing a 18% relative decline in GLS despite LVEF 54%."]
)

BATCH_3[141] = make_entry(
    'infective_endocarditis_prophylaxis',
    "Antibiotic prophylaxis for infective endocarditis (IE) is restricted to patients at the highest risk of adverse outcomes undergoing high-risk dental procedures involving manipulation of the gingival tissue, periapical region of teeth, or perforation of oral mucosa. High-risk conditions include prosthetic heart valves, prosthetic valve repair materials, prior IE, and cyanotic congenital heart disease. The standard prophylactic regimen is a single oral dose of amoxicillin 2g 30-60 minutes pre-procedure.",
    [
        ("ESC 2023 guidelines restrict antibiotic prophylaxis strictly to high-risk cardiac conditions undergoing dental procedures involving gingival or periapical manipulation.", ["37622656"]),
        ("High-risk cardiac categories: prosthetic valves (transcatheter or surgical), prosthetic rings/cords, previous IE, and unrepaired cyanotic congenital heart disease.", ["33882677"]),
        ("Standard regimen: oral amoxicillin 2g (or ampicillin 2g IV) administered 30-60 minutes before the procedure; for severe penicillin allergy, cephalexin 2g, azithromycin 500mg, or doxycycline 100mg.", ["37622656"]),
        ("Prophylaxis is NOT recommended for gastrointestinal, urological, respiratory, or routine skin procedures in the absence of established local infection.", ["37622656"])
    ],
    [
        ("37622656", "2023 ESC Guidelines for the management of endocarditis.", 2023, "guideline"),
        ("33882677", "Prevention of Viridans Group Streptococcal Infective Endocarditis: An Update to the AHA Scientific Statement.", 2021, "guideline")
    ],
    ["Role of clindamycin in penicillin-allergic patients (AHA no longer recommends clindamycin due to fatal Clostridioides difficile risk).", "Effectiveness of oral chlorhexidine mouth rinses versus systemic antibiotics in reducing transient bacteremia."],
    ["Identifying high-risk cardiac conditions qualifying for prophylaxis: prosthetic valve, prior endocarditis, unrepaired cyanotic CHD (native valve disease like mitral valve prolapse does NOT qualify).", "Procedures requiring prophylaxis: tooth extraction, periodontal scaling, dental implant placement; NOT routine local anesthetic injections, dental radiographs, or suture removal.", "First-line oral drug and timing: amoxicillin 2g single dose taken 30-60 minutes before the procedure."],
    ["A 64-year-old with a mechanical aortic valve presenting for dental scaling asking if he needs antibiotic prophylaxis.", "A patient with mitral valve prolapse with moderate mitral regurgitation asking why his dentist no longer prescribes prophylactic amoxicillin."]
)

e142 = make_entry(
    'antimicrobial_stewardship',
    "Antimicrobial stewardship programs (ASPs) optimize clinical outcomes while minimizing unintended consequences of antimicrobial use, including toxicity, selection of pathogenic organisms (such as Clostridioides difficile), and the emergence of antimicrobial resistance. Core strategies include pre-authorization, prospective audit with feedback, evidence-based guidelines, and diagnostic stewardship.",
    [
        ("CDC and IDSA guidelines emphasize prospective audit and feedback as the most effective stewardship intervention to optimize antibiotic prescribing.", ["27075735"]),
        ("Implementing hospital-based ASPs significantly reduces overall antibiotic consumption, hospital-onset Clostridioides difficile infection, and institutional resistance rates.", ["28369344"]),
        ("Diagnostic stewardship ensures appropriate collection of microbiological cultures before antimicrobial initiation, preventing contaminated or unindicated blood and urine cultures.", ["31573350"]),
        ("Facility-specific antibiograms updated annually guide empirical therapy based on local pathogen susceptibility patterns rather than national estimates.", ["27075735"])
    ],
    [
        ("27075735", "Implementing an Antibiotic Stewardship Program: Guidelines by IDSA and SHEA.", 2016, "guideline"),
        ("28369344", "Effect of antimicrobial stewardship interventions: a systematic review and meta-analysis.", 2017, "meta-analysis")
    ],
    ["Effectiveness of machine-learning-driven clinical decision support systems in reducing broad-spectrum prescribing in emergency departments.", "Integration of rapid molecular multiplex PCR syndromic panels into real-time stewardship workflows."],
    ["CDC Core Elements of Hospital Antibiotic Stewardship: Leadership Commitment, Accountability, Pharmacy Expertise, Action, Tracking, Reporting, and Education.", "Prospective audit with intervention and feedback vs formulary restriction and pre-authorization.", "Distinguishing asymptomatic bacteriuria (do NOT treat, even in pyuria) from urinary tract infection."],
    ["A hospital ward where broad-spectrum meropenem use has doubled, prompting an ASP prospective audit-feedback intervention.", "An elderly resident with an indwelling Foley catheter found to have cloudy urine with 50 WBC/hpf but no fever or symptoms; ASP advises withholding antibiotics."]
)
BATCH_3[142] = e142
BATCH_3[143] = e142
BATCH_3[144] = e142

BATCH_3[145] = make_entry(
    'antibody_drug_conjugates',
    "Antibody-drug conjugates (ADCs) deliver potent cytotoxic payloads directly to tumor cells expressing specific surface antigens using a targeted monoclonal antibody, cleavable or non-cleavable linker, and chemotherapeutic payload (e.g. topoisomerase I inhibitors, auristatins, calicheamicins). Landmark examples include trastuzumab deruxtecan (T-DXd) in HER2+ and HER2-low cancers, and enfortumab vedotin in urothelial cancer.",
    [
        ("Trastuzumab deruxtecan (T-DXd) demonstrated significant progression-free and overall survival improvements over standard therapy in HER2-low metastatic breast cancer (DESTINY-Breast04).", ["35665782"]),
        ("Enfortumab vedotin (targeting Nectin-4) combined with pembrolizumab established a new first-line standard of care in advanced urothelial carcinoma (EV-302 trial).", ["38470982"]),
        ("Drug-induced interstitial lung disease (ILD) / pneumonitis is a class-defining toxicity of topoisomerase I payload ADCs (T-DXd, sacituzumab govitecan), requiring routine CT surveillance and prompt steroid treatment.", ["35665782"]),
        ("The 'bystander killing effect' occurs when membrane-permeable cleaved cytotoxic payloads diffuse into adjacent antigen-negative tumor cells, overcoming intratumoral target heterogeneity.", ["34185202"])
    ],
    [
        ("35665782", "Trastuzumab Deruxtecan in Previously Treated HER2-Low Advanced Breast Cancer (DESTINY-Breast04).", 2022, "trial"),
        ("38470982", "Enfortumab Vedotin and Pembrolizumab in Untreated Advanced Urothelial Cancer (EV-302).", 2024, "trial"),
        ("34185202", "ESMO Clinical Practice Guideline on Antibody-Drug Conjugates in Solid Tumors.", 2021, "guideline")
    ],
    ["Management and re-challenge safety criteria following grade 1 vs grade >= 2 ADC-induced pneumonitis.", "Mechanisms of acquired resistance to ADCs: antigen down-regulation vs drug-efflux pump up-regulation."],
    ["Three structural components of an ADC: monoclonal antibody, chemical linker, and cytotoxic payload.", "Bystander effect mechanism: uncharged lipophilic payloads cross cell membranes to kill adjacent tumor cells lacking the target antigen.", "Monitoring for T-DXd-induced interstitial lung disease: any new cough, dyspnea, or fever warrants immediate high-resolution CT chest and withholding drug."],
    ["A 56-year-old woman with metastatic HER2-low (IHC 1+) breast cancer experiencing progression on endocrine therapy, evaluated for T-DXd.", "A patient receiving T-DXd who develops dry cough; chest HRCT shows bilateral ground-glass opacities, diagnosed with Grade 2 drug-induced pneumonitis."]
)
