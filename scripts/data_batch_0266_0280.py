# data_batch_0266_0280.py
"""
Definitions for Batch 2 of Sheet 2 / Topics 251-500 (Topics 266 to 280).
"""
from data_batch_0001_0015 import make_entry

BATCH_SHEET2_B2 = {}

# 266: Bone and Joint Infection Oral Step-Down Therapy
BATCH_SHEET2_B2[266] = make_entry(
    'bone_and_joint_infection_oral_step_down',
    "The traditional dogma mandating prolonged 6-week courses of intravenous antibiotic therapy for complex bone and joint infections (osteomyelitis, native joint septic arthritis, and prosthetic joint infections) was fundamentally overturned by the landmark OVIVA trial. In this multicenter randomized non-inferiority trial (1,054 patients), transitioning to high-bioavailability oral antibiotic therapy within the first 7 days following surgical debridement was clinically non-inferior to continuous 6-week intravenous therapy (definitive treatment failure 13.2% oral vs 14.6% IV). Early oral step-down dramatically reduces central venous catheter-associated bloodstream infections, thrombophlebitis, and length of hospital stay.",
    [
        ("In the landmark OVIVA randomized non-inferiority trial (Li et al., NEJM), oral antibiotic therapy initiated within the first 7 days was non-inferior to intravenous antibiotic therapy for 6 weeks in complex bone and joint infections (treatment failure 13.2% vs 14.6%).", ["30699315"]),
        ("Patients in the intravenous therapy group experienced a significantly higher rate of central venous catheter-related complications (9.4% vs 1.0%), highlighting the severe iatrogenic hazards of prolonged vascular access.", ["30699315"]),
        ("Appropriate oral step-down regimens require agents with excellent oral bioavailability and bone tissue penetration (e.g., fluoroquinolones, co-trimoxazole, clindamycin, linezolid, or high-dose amoxicillin/doxycycline) guided by microbiological susceptibilities.", ["30699315", "23223593"]),
        ("Adequate surgical source control (thorough surgical debridement of devitalized bone, drainage of intra-articular pus, or hardware management) is a mandatory prerequisite before considering oral step-down therapy.", ["23223593", "30699315"])
    ],
    [
        ("30699315", "Oral versus Intravenous Antibiotics for Bone and Joint Infection (OVIVA Trial).", 2019, "trial"),
        ("23223593", "Diagnosis and management of prosthetic joint infection: clinical practice guidelines by the Infectious Diseases Society of America (IDSA).", 2013, "guideline")
    ],
    [
        "Optimal oral dosing regimens and long-term tolerability of linezolid beyond 28 days for multidrug-resistant Gram-positive bone infections.",
        "Role of serum inflammatory markers (ESR, CRP) versus serial imaging in determining the exact duration of oral maintenance therapy."
    ],
    [
        "Primary non-inferiority outcomes and complication rates comparing oral versus intravenous regimens from the OVIVA trial.",
        "Pharmacokinetic properties (bioavailability and bone penetration) essential for selecting oral step-down agents.",
        "Catheter-associated morbidity differentials between prolonged outpatient IV therapy and oral therapy."
    ],
    [
        "A 54-year-old male with chronic post-traumatic osteomyelitis of the tibia who undergoes operative debridement and is successfully stepped down to oral ciprofloxacin and clindamycin on post-op day 5.",
        "A 68-year-old female with native knee septic arthritis who develops PICC-line Staphylococcus epidermidis bacteremia on week 3 of IV ceftriaxone, transitioned safely to oral amoxicillin-clavulanate."
    ]
)

# 267: Bone Marrow Biopsy Indications and Interpretation
BATCH_SHEET2_B2[267] = make_entry(
    'bone_marrow_biopsy_indications_and_interpretation',
    "Bone marrow aspiration and trephine core biopsy are invasive diagnostic procedures indicated for the comprehensive evaluation of unexplained cytopenias, leukocytosis, abnormal circulating blasts, staging of hematologic and solid malignancies, and workup of unexplained fevers of unknown origin (FUO) or storage disorders. International Council for Standardization in Haematology (ICSH) guidelines dictate that an adequate trephine biopsy must measure at least 1.5 to 2.0 cm in length containing >= 5-6 intertrabecular spaces to avoid sampling error. Combining morphological cytochemistry, multiparameter flow cytometry, cytogenetics (karyotyping/FISH), and next-generation sequencing (NGS) is essential to establish precise WHO/ICC diagnostic classifications.",
    [
        ("ICSH standardized guidelines recommend that an optimal adult bone marrow core trephine biopsy must be at least 1.5 to 2.0 cm in length after fixation and contain at least 5-6 well-preserved intertrabecular spaces to allow accurate architectural and cellular assessment.", ["27072464"]),
        ("Normal adult bone marrow cellularity is age-dependent and approximately calculated by the formula (100 minus patient age) +/- 10%; hypocellularity (< 20-30%) raises suspicion for severe aplastic anemia, hypoplastic MDS, or medication toxicity.", ["27072464"]),
        ("A 'dry tap' (inability to aspirate marrow fluid despite adequate needle placement) is a critical diagnostic sign caused by extensive marrow fibrosis (primary myelofibrosis), dense blast packing (acute leukemia), or hairy cell leukemia.", ["27072464"]),
        ("Systematic bone marrow assessment requires correlative integration of morphologic architecture on core biopsy, cellular differential on aspirate smears, immunophenotyping via flow cytometry, and cytogenetic/molecular mutational profiling.", ["27072464", "15995804"])
    ],
    [
        ("27072464", "ICSH guidelines for the inspection and interpretation of the bone marrow biopsy.", 2016, "guideline"),
        ("15995804", "European consensus on the grading of bone marrow fibrosis and assessment of cellularity in myeloproliferative neoplasms.", 2005, "consensus-guideline")
    ],
    [
        "Diagnostic utility of deep molecular sequencing in patients with idiopathic cytopenia of undetermined significance (ICUS) versus clonal cytopenia (CCUS).",
        "Role of MRI-directed targeted bone marrow biopsy in detecting patchy or focal neoplastic marrow infiltrations."
    ],
    [
        "Specimen adequacy parameters for bone marrow core trephine biopsies under ICSH standards.",
        "Differential diagnosis and underlying pathology signaled by a 'dry tap' on marrow aspiration.",
        "Calculation of physiological marrow cellularity based on patient age."
    ],
    [
        "A 71-year-old male presenting with macrocytic anemia and thrombocytopenia whose marrow aspirate yield is dry, but trephine biopsy reveals diffuse reticulin fibrosis and atypical megakaryocytes.",
        "A 32-year-old female presenting with pancytopenia whose trephine core shows cellularity of 8% with empty fat spaces and no dysplastic blasts, confirming severe aplastic anemia."
    ]
)

# 268: Bone Marrow Fibrosis Grading
BATCH_SHEET2_B2[268] = make_entry(
    'bone_marrow_fibrosis_grading',
    "Bone marrow fibrosis represents pathological deposition of extracellular matrix reticulin and collagen fibers within the hematopoietic compartment, driven by aberrant megakaryocytic release of fibrogenic cytokines (TGF-beta, PDGF, and basic FGF). The European Consensus Grading System (adopted by the WHO and ICC) standardizes fibrosis into four reproducible tiers (MF-0 to MF-3) based on silver impregnation (Gomori or Gordon-Sweet reticulin) and Masson trichrome staining. Distinguishing primary myelofibrosis from secondary reactive fibrosis (metastatic carcinoma, lymphoma, systemic lupus, hyperparathyroidism) and tracking fibrosis regression under JAK inhibitor or stem cell transplant therapy depends on rigorous biopsy grading.",
    [
        ("Under the European Consensus Grading System, myelofibrosis is stratified into four distinct stages: MF-0 (linear reticulin without intersections), MF-1 (loose network of reticulin with intersections), MF-2 (diffuse, dense reticulin network with extensive intersections), and MF-3 (diffuse, dense reticulin with coarse collagen bundles or osteosclerosis).", ["15995804"]),
        ("Confirmation of true collagen fibrosis (MF-3) requires Masson trichrome or blue trichrome staining, distinguishing dense reticulin from irreversible advanced collagenous replacement.", ["15995804"]),
        ("In primary myelofibrosis (PMF), marrow fibrosis is accompanied by characteristic megakaryocytic atypia: clustered, enlarged megakaryocytes with hyperchromatic, bulbous 'cloud-like' or abberant polylobated nuclei and abnormal maturation.", ["15995804"]),
        ("Reversal or stabilization of bone marrow fibrosis grade is an objective histopathological endpoint observed after allogeneic hematopoietic cell transplantation and during treatment with next-generation JAK2/activin receptor ligand traps.", ["15995804", "27072464"])
    ],
    [
        ("15995804", "European consensus on the grading of bone marrow fibrosis and assessment of cellularity in myeloproliferative neoplasms.", 2005, "consensus-guideline"),
        ("27072464", "ICSH guidelines for the inspection and interpretation of the bone marrow biopsy.", 2016, "guideline")
    ],
    [
        "Inter-observer reproducibility of intermediate fibrosis grades (MF-1 vs MF-2) across non-specialized pathology laboratories.",
        "Prognostic significance of bone marrow fibrosis in essential thrombocythemia and polycythemia vera prior to overt myelofibrotic transformation."
    ],
    [
        "Histopathological definitions and reticulin/collagen patterns distinguishing MF-0, MF-1, MF-2, and MF-3.",
        "Special histochemical stains utilized to evaluate reticulin (silver stain) versus mature collagen (Masson trichrome).",
        "Distinguishing neoplastic megakaryocytic morphology in PMF from reactive megakaryocytosis."
    ],
    [
        "A 64-year-old male with massive splenomegaly, JAK2 V617F mutation, and leucoerythroblastic blood smear whose bone marrow biopsy exhibits dense intersection networks and coarse collagen bundles (MF-3 PMF).",
        "A 58-year-old female with breast cancer whose marrow biopsy reveals focal MF-2 fibrosis directly surrounding metastatic cytokeratin-positive epithelial cells (secondary myelofibrosis)."
    ]
)

# 269: Bone Metastases and Palliative Radiotherapy
BATCH_SHEET2_B2[269] = make_entry(
    'bone_metastases_palliative_radiotherapy',
    "Palliative radiotherapy is the mainstay for relieving pain and preventing pathological fractures and neurological catastrophe in patients with painful bone metastases. Comprehensive meta-analyses of over 25 randomized trials (Chow et al., Lancet Oncology) and ASTRO clinical practice guidelines have firmly established that a single fraction of 8 Gy provides equivalent overall pain relief (approximately 60-70% overall response rate) and duration of pain control compared to multifraction regimens (such as 20 Gy in 5 fractions or 30 Gy in 10 fractions). The single 8 Gy fraction minimizes patient treatment burden and transportation difficulties, although it carries a higher retreatment rate (20% vs 8%) that can be delivered safely if pain recurs.",
    [
        ("A comprehensive Cochrane and international meta-analysis of 25 RCTs (Chow et al., Lancet Oncol) showed that single-fraction radiotherapy (8 Gy in 1 fraction) achieved equivalent overall pain response rates (60-61%) and complete response rates (23-24%) compared to multifraction schedules (20 Gy in 5 fractions or 30 Gy in 10 fractions).", ["22445388"]),
        ("American Society for Radiation Oncology (ASTRO) guidelines recommend single-fraction 8 Gy as the standard of care for uncomplicated bone metastases, reserving fractionated regimens for spinal cord compression or high risk of pathological fracture.", ["28219565"]),
        ("Retreatment of recurrent bone pain at the same site is safe and effective: the Dutch bone metastasis re-irradiation trial showed that repeating an 8 Gy single fraction achieved meaningful pain relief in > 60% of patients without excess toxicity.", ["22445388", "28219565"]),
        ("Stereotactic body radiotherapy (SBRT / SABR) delivering high ablative doses in 1-3 fractions is indicated for oligometastatic disease (1-3 lesions) or radioresistant histologies (renal cell carcinoma, melanoma) to achieve durable local tumor control.", ["28219565"])
    ],
    [
        ("22445388", "Palliative radiotherapy trials for bone metastases: a systematic review and meta-analysis (Chow Meta-Analysis).", 2012, "meta-analysis"),
        ("28219565", "Palliative Radiation Therapy for Bone Metastases: An ASTRO Evidence-Based Clinical Practice Guideline.", 2017, "guideline")
    ],
    [
        "Stereotactic body radiation therapy (SBRT) versus conventional external beam radiotherapy (cEBRT) in pain response speed and durability for non-spine bone metastases.",
        "Optimal integration of radiopharmaceuticals (radium-223) with targeted radiation in castrate-resistant prostate cancer with diffuse osteoblastic metastases."
    ],
    [
        "Equivalence in pain response between single-fraction 8 Gy versus multifraction schedules from Chow et al.",
        "Clinical indications where single-fraction 8 Gy is the preferred regimen according to ASTRO guidelines.",
        "Retreatment rates and feasibility of repeating radiotherapy for persistent or recurrent bone pain."
    ],
    [
        "A 68-year-old male with metastatic prostate cancer and painful lumbar spine metastasis with no canal compromise, treated with a single 8 Gy fraction yielding marked pain reduction at 2 weeks.",
        "A 52-year-old female with metastatic breast cancer experiencing pain recurrence 8 months after an initial 8 Gy treatment, successfully re-irradiated with a second 8 Gy single fraction."
    ]
)

# 270: Bone Metastases: Denosumab and Zoledronic Acid
BATCH_SHEET2_B2[270] = make_entry(
    'bone_metastases_denosumab_and_zoledronic_acid',
    "Bone-modifying agents (BMAs) are indicated in solid tumors with bone metastases and multiple myeloma to prevent skeletal-related events (SREs: pathological fracture, spinal cord compression, radiation to bone, or surgery to bone). In large-scale head-to-head randomized trials across metastatic breast, prostate, and other solid tumors, denosumab (fully human monoclonal antibody neutralizing RANK ligand, 120 mg SC every 4 weeks) significantly delayed time to first SRE and reduced subsequent SRE risk compared to intravenous zoledronic acid (4 mg IV every 4 weeks). Denosumab does not require dose adjustments for renal impairment, but carries higher hypocalcemia risk; both agents mandate baseline dental screening to mitigate osteonecrosis of the jaw (ONJ).",
    [
        ("In the head-to-head randomized phase 3 trial in metastatic castration-resistant prostate cancer (Fizazi et al., Lancet), denosumab significantly delayed the median time to first on-study SRE by 3.6 months compared to zoledronic acid (20.7 vs 17.1 months; 18% risk reduction).", ["21178106"]),
        ("In patients with advanced breast cancer with bone metastases (Stopeck et al., J Clin Oncol), denosumab delayed time to first SRE by 18% and reduced skeletal morbidity rate compared with zoledronic acid.", ["21149668"]),
        ("Unlike zoledronic acid, which requires dose reduction or is contraindicated in severe renal impairment (creatinine clearance < 30 mL/min), denosumab does not undergo renal clearance and can be safely administered regardless of eGFR.", ["21178106", "21343556"]),
        ("Denosumab causes significantly higher rates of hypocalcemia (13% vs 6%) compared to zoledronic acid; daily calcium (500-1,000 mg) and vitamin D supplementation is mandatory, alongside pre-treatment dental clearance to prevent medication-related osteonecrosis of the jaw (MRONJ).", ["21178106", "21149668"])
    ],
    [
        ("21178106", "Denosumab versus zoledronic acid for treatment of bone metastases in men with castration-resistant prostate cancer: a randomised, double-blind study.", 2011, "trial"),
        ("21149668", "Denosumab compared with zoledronic acid for the treatment of bone metastases in patients with advanced breast cancer: a randomized, double-blind study.", 2010, "trial"),
        ("21343556", "Randomized, double-blind study of denosumab versus zoledronic acid in the treatment of bone metastases in patients with other solid tumors or multiple myeloma.", 2011, "trial")
    ],
    [
        "Safety and efficacy of de-escalating denosumab or zoledronic acid dosing from every 4 weeks to every 12 weeks after 1-2 years of initial therapy.",
        "Severe rebound hypercalcemia and rapid bone mineral density loss following abrupt discontinuation of denosumab in cancer patients."
    ],
    [
        "Time to first SRE superiority of denosumab over zoledronic acid established in prostate and breast cancer trials.",
        "Renal clearance differences and dosing rules for zoledronic acid versus denosumab in chronic kidney disease.",
        "Relative incidence of hypocalcemia and preventative calcium/vitamin D co-prescription requirements."
    ],
    [
        "A 72-year-old male with metastatic prostate cancer and baseline eGFR 24 mL/min safely prescribed denosumab 120 mg SC with calcium/vitamin D, avoiding nephrotoxic bisphosphonates.",
        "A 61-year-old female with metastatic breast cancer undergoing dental evaluation and completing preventive extractions prior to commencing denosumab."
    ]
)

# 271: Borderline Personality Disorder: Dialectical Behavior Therapy
BATCH_SHEET2_B2[271] = make_entry(
    'borderline_personality_disorder_dbt',
    "Borderline Personality Disorder (BPD) is characterized by pervasive emotional dysregulation, unstable interpersonal relationships, identity disturbance, severe impulsivity, and chronic non-suicidal self-injury (NSSI) and recurrent suicidal behaviors. Dialectical Behavior Therapy (DBT)—developed by Marsha Linehan—is the gold-standard, first-line evidence-based psychosocial intervention. In landmark randomized trials and Cochrane systematic reviews, DBT significantly reduces suicide attempts, self-harm episodes, emergency department presentations, and psychiatric hospitalizations compared to treatment-as-usual. DBT integrates four modular skill training domains: mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness.",
    [
        ("In the landmark randomized controlled trial by Linehan et al. (Arch Gen Psychiatry), DBT halved the rate of suicide attempts (23% vs 46%) and resulted in significantly fewer psychiatric hospitalizations compared to non-behavioral therapy by expert community therapists.", ["16818865"]),
        ("A Cochrane systematic review of psychological therapies for BPD (Cristea et al.) confirmed that DBT is the most extensively validated psychotherapy, demonstrating statistically significant reductions in self-harm, suicidal gestures, and depression.", ["28447324"]),
        ("Comprehensive DBT consists of four mandatory interrelated treatment components: individual weekly psychotherapy, weekly group skills training (mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness), between-session phone coaching, and therapist consultation team meetings.", ["16818865"]),
        ("Clinical practice guidelines (NICE and APA) strongly advise against routine pharmacotherapy for the core symptoms of BPD; psychotropic medications (mood stabilizers, low-dose atypical antipsychotics) should be restricted to brief crisis management or treating comorbid major depression and anxiety.", ["28447324", "16818865"])
    ],
    [
        ("16818865", "Two-year randomized controlled trial and follow-up of dialectical behavior therapy vs therapy by experts for suicidal behaviors and borderline personality disorder.", 2006, "trial"),
        ("28447324", "Psychological therapies for people with borderline personality disorder (Cochrane Systematic Review).", 2017, "meta-analysis")
    ],
    [
        "Comparative efficacy of mentalization-based treatment (MBT) versus DBT in patients with co-occurring severe attachment trauma.",
        "Effectiveness of abbreviated 6-month DBT skills-only group interventions in resource-constrained outpatient public psychiatric services."
    ],
    [
        "Primary endpoints (suicide attempts and psychiatric admissions) significantly reduced by DBT in the Linehan trial.",
        "Four core operational components comprising full comprehensive DBT.",
        "Guideline consensus regarding the limited role and risks of polypharmacy in borderline personality disorder."
    ],
    [
        "A 23-year-old female with BPD and 6 hospitalizations for non-suicidal self-injury in the past year, enrolled in a 1-year comprehensive DBT program.",
        "A 29-year-old patient with BPD presenting during acute emotional crisis utilizing DBT distress tolerance skills (TIPP protocol) and phone coaching to avert self-harm."
    ]
)

# 272: Botulism: Foodborne, Wound, Infantile & Antitoxin
BATCH_SHEET2_B2[272] = make_entry(
    'botulism_management',
    "Botulism is a rare, neuroparalytic emergency caused by botulinum neurotoxins (types A-G) produced by Clostridium botulinum, which irreversibly cleave SNARE proteins at presynaptic cholinergic neuromuscular junctions, blocking acetylcholine exocytosis. It manifests in three primary clinical forms: foodborne (ingestion of preformed toxin in improperly canned foods), wound (spore contamination in black tar heroin injection), and infantile (ingestion of honey/soil spores with intestinal colonization). Patients present with the classic triad: afebrile, alert, and symmetric descending flaccid paralysis starting with cranial nerves ('the 4 Ds': Diplopia, Dysarthria, Dysphagia, Dysphonia) progressing to diaphragmatic arrest. Immediate heptavalent antitoxin administration and ICU respiratory surveillance are life-saving.",
    [
        ("Botulism classically presents with symmetric, descending flaccid paralysis without sensory loss, beginning with bulbar cranial nerve palsies (diplopia, fixed dilated pupils, dysarthria, dysphagia) and progressing downward to upper extremities, trunk, and respiratory muscles.", ["16187159"]),
        ("Equine-derived heptavalent botulinum antitoxin (HBAT, covering toxin types A through G) should be administered immediately upon clinical suspicion without waiting for confirmatory laboratory results (mouse bioassay or PCR), as antitoxin only neutralizes free, unbound circulating toxin.", ["33956795"]),
        ("In infant botulism (< 1 year old), Human Botulism Immune Globulin Intravenous (BabyBIG) is the treatment of choice, significantly reducing hospital stay and ICU length of stay; equine antitoxin is avoided in infants due to anaphylaxis and serum sickness risks.", ["33956795", "16187159"]),
        ("In wound botulism, extensive surgical debridement of the anaerobic focus and high-dose intravenous penicillin G are required after antitoxin infusion; aminoglycosides and neuromuscular blocking agents are strictly contraindicated as they exacerbate presynaptic neuromuscular blockade.", ["16187159", "33956795"])
    ],
    [
        ("16187159", "Botulism: Clinical review (Sobel).", 2005, "review"),
        ("33956795", "Clinical Guidelines for Diagnosis and Treatment of Botulism (CDC Guidelines).", 2021, "guideline")
    ],
    [
        "Role of serial bedside vital capacity and negative inspiratory force (NIF) monitoring in determining the exact threshold for preemptive intubation.",
        "Long-term neuromuscular and autonomic recovery timelines following prolonged ventilator dependence in Type A versus Type B botulism."
    ],
    [
        "Cardinal clinical triad and descending cranial nerve features distinguishing botulism from Guillain-Barré and Myasthenia Gravis.",
        "Specific antitoxin formulations: heptavalent equine antitoxin (HBAT) for adults versus BabyBIG for infant botulism.",
        "Medications strictly contraindicated in botulism (aminoglycosides, fluoroquinolones) that potentiate neuromuscular block."
    ],
    [
        "A 38-year-old male presenting with acute diplopia, ptosis, and dysphagia 24 hours after consuming home-canned asparagus, immediately treated with heptavalent antitoxin.",
        "A 28-year-old injection drug user presenting with a suppurative subcutaneous abscess, dysarthria, and descending limb weakness, undergoing debridement and antitoxin."
    ]
)

# 273: Bowel Cancer: Screening, Staging & Resection
BATCH_SHEET2_B2[273] = make_entry(
    'bowel_cancer_screening_and_staging',
    "Colorectal (bowel) cancer develops primarily through the adenoma-carcinoma sequence over 10-15 years, offering a critical window for early detection and prevention through population-based screening. Screening utilizing biennial fecal immunochemical testing (FIT) or colonoscopy starting at age 45-50 significantly reduces colorectal cancer incidence and mortality. Staging requires complete colonoscopy with biopsy, cross-sectional imaging (contrast CT of the chest, abdomen, and pelvis), and high-resolution pelvic MRI for rectal cancers to assess circumferential resection margin (CRM). For resectable colon cancer, oncologic en bloc surgical resection with high vascular ligation and harvesting of >= 12 lymph nodes provides definitive local therapy and accurate prognostic staging.",
    [
        ("Population screening with annual or biennial fecal immunochemical testing (FIT) or screening colonoscopy reduces colorectal cancer-specific mortality by 25-40% through early detection and polypectomy of precancerous adenomas.", ["34011682"]),
        ("Accurate pathological staging of resected colon cancer requires harvesting a minimum of 12 lymph nodes; examining fewer than 12 nodes is classified as a high-risk feature in Stage II disease mandating consideration of adjuvant chemotherapy.", ["34011682", "31053612"]),
        ("Universal screening of all newly diagnosed colorectal cancers for mismatch repair deficiency (dMMR via IHC) or microsatellite instability (MSI via PCR) is recommended to identify Lynch syndrome and guide anti-PD-1 immunotherapy selection.", ["34011682"]),
        ("Rectal cancer requires specialized pelvic MRI staging to evaluate distance to the mesorectal fascia (CRM); threatened margins (< 1 mm) mandate neoadjuvant total neoadjuvant therapy (TNT: chemoradiation and consolidation chemotherapy) prior to total mesorectal excision (TME).", ["34011682", "31053612"])
    ],
    [
        ("34011682", "Screening for Colorectal Cancer: US Preventive Services Task Force Recommendation Statement.", 2021, "guideline"),
        ("31053612", "Colorectal cancer: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.", 2020, "guideline")
    ],
    [
        "Circulating tumor DNA (ctDNA) liquid biopsy in determining which Stage II colon cancer patients benefit from adjuvant fluoropyrimidine chemotherapy.",
        "Organ-preservation ('watch and wait' non-operative strategy) in rectal cancer achieving a clinical complete response after total neoadjuvant therapy."
    ],
    [
        "Minimum number of harvested lymph nodes (>= 12) required for adequate oncologic colon cancer staging.",
        "Clinical utility of universal MMR/MSI testing in all colorectal cancer specimens.",
        "Circumferential resection margin (CRM) assessment on pelvic MRI and its role in directing neoadjuvant rectal cancer therapy."
    ],
    [
        "A 52-year-old male with positive screening FIT who undergoes colonoscopy revealing a 3-cm adenocarcinoma in the ascending colon, treated with laparoscopic right hemicolectomy.",
        "A 60-year-old female with rectal adenocarcinoma 6 cm from the anal verge whose MRI shows mesorectal fascia involvement (threatened CRM), referred for total neoadjuvant therapy."
    ]
)

# 274: Bowel Obstruction: Mechanical vs Ogilvie Syndrome
BATCH_SHEET2_B2[274] = make_entry(
    'bowel_obstruction_mechanical_and_ogilvie',
    "Bowel obstruction is broadly classified into mechanical obstruction (physical luminal blockage from adhesions, hernias, or neoplasms) and functional obstruction (paralytic ileus or acute colonic pseudo-obstruction [Ogilvie syndrome]). Mechanical obstruction presents with colicky abdominal pain, hyperactive high-pitched 'tinkling' bowel sounds, and discrete air-fluid levels with a transitional zone on CT. In contrast, Ogilvie syndrome presents with massive, painless abdominal distension with cecal dilation > 10-12 cm in elderly, immobilized, or post-operative medical patients. In Ogilvie syndrome, intravenous neostigmine (2 mg over 3-5 minutes with atropine at bedside) achieves prompt colonic decompression in > 85-90% of cases (Ponec trial).",
    [
        ("Contrast-enhanced CT of the abdomen/pelvis is the diagnostic imaging modality of choice, distinguishing true mechanical obstruction (abrupt transition zone) from non-mechanical paralytic ileus or colonic pseudo-obstruction.", ["29780063", "10405230"]),
        ("In acute colonic pseudo-obstruction (Ogilvie syndrome), cecal diameter > 10-12 cm on abdominal radiography or CT carries a high risk of spontaneous perforation and ischemia, requiring prompt decompression.", ["10405230"]),
        ("In the landmark randomized, double-blind, placebo-controlled trial by Ponec et al. (NEJM), intravenous neostigmine (2.0 mg over 3-5 minutes) achieved rapid, complete colonic decompression in 91% of patients with Ogilvie syndrome compared with 0% for placebo.", ["10405230"]),
        ("Intravenous neostigmine requires continuous electrocardiographic monitoring and atropine available at the bedside due to the risk of severe cholinergic bradycardia and bronchospasm.", ["10405230", "29780063"])
    ],
    [
        ("10405230", "Neostigmine for the treatment of acute colonic pseudo-obstruction (Ponec Trial).", 1999, "trial"),
        ("29780063", "Bologna guidelines for diagnosis and management of adhesive small bowel obstruction (ASBO): 2017 update of the WSES guidelines.", 2018, "guideline")
    ],
    [
        "Endoscopic colonic decompression with flatus tube placement versus repeat neostigmine dosing for recurrent colonic pseudo-obstruction.",
        "Diagnostic accuracy of bedside point-of-care ultrasound (POCUS) in differentiating high-grade small bowel obstruction from adynamic ileus."
    ],
    [
        "Efficacy, dose, and administration protocol of intravenous neostigmine from the landmark Ponec NEJM trial.",
        "Cecal diameter threshold (> 10-12 cm) signaling impending perforation risk in Ogilvie syndrome.",
        "Clinical and CT hallmarks separating mechanical bowel obstruction from adynamic paralytic ileus."
    ],
    [
        "A 76-year-old male 4 days post-hip arthroplasty with massive painless abdominal distension, absent bowel movements, and cecal diameter of 11.5 cm on CT, rapidly resolving after 2 mg IV neostigmine.",
        "A 62-year-old female presenting with vomiting, colicky pain, and CT showing small bowel loop dilation terminating abruptly at a groin femoral hernia transition zone."
    ]
)

# 275: Brain Metastases: Epidemiology & DS-GPA Staging
BATCH_SHEET2_B2[275] = make_entry(
    'brain_metastases_epidemiology_and_staging',
    "Brain metastases are the most common intracranial neoplasms in adults, occurring in 20-40% of patients with advanced systemic cancer, most frequently originating from lung cancer (50%), breast cancer (15-20%), and melanoma (10%). Modern clinical staging and prognosis rely on the Diagnosis-Specific Graded Prognostic Assessment (DS-GPA), which replaced older recursive partitioning models by incorporating histology-specific factors: age, Karnofsky Performance Status (KPS), number of CNS lesions, extracranial metastases status, and key molecular markers (EGFR/ALK in lung cancer, HER2/ER/PR in breast cancer, and BRAF in melanoma). Modern management utilizes high-resolution thin-slice contrast MRI to guide targeted local therapies.",
    [
        ("The Diagnosis-Specific Graded Prognostic Assessment (DS-GPA; Sperduto et al., J Clin Oncol) provides validated prognostic scoring tailored to specific tumor histologies, demonstrating that molecular biomarkers significantly dictate intracranial survival.", ["22253460"]),
        ("In non-small cell lung cancer (NSCLC) with actionable driver alterations (EGFR mutations, ALK rearrangements), CNS-penetrant third-generation tyrosine kinase inhibitors (osimertinib, alectinib) achieve intracranial objective response rates > 70-80%, often deferring upfront radiation.", ["22253460", "34932393"]),
        ("High-dose dexamethasone (4-8 mg daily or 16 mg/day in severe mass effect) rapidly reduces vasogenic peritumoral edema and improves neurological symptoms, but should be tapered rapidly to avoid steroid-induced myopathy and immunosuppression.", ["34932393"]),
        ("Universal thin-slice (<= 1 mm) gadolinium-enhanced 3D volumetric brain MRI is the mandatory diagnostic standard to identify subcentimeter brain metastases prior to selecting local radiation or surgical approaches.", ["34932393", "22253460"])
    ],
    [
        ("22253460", "Summary report on the graded prognostic assessment: an accurate and facile diagnosis-specific tool to estimate survival for patients with brain metastases (DS-GPA).", 2012, "trial"),
        ("34932393", "Treatment of Brain Metastases: ASCO-SNO-ASTRO Guideline.", 2022, "guideline")
    ],
    [
        "Upfront stereotactic radiosurgery versus deferring radiation in asymptomatic brain metastases treated with CNS-active dual checkpoint immunotherapy in BRAF-mutant melanoma.",
        "Role of hippocampal-avoidant prophylactic cranial irradiation in extensive-stage small cell lung cancer in the modern MRI surveillance era."
    ],
    [
        "Prognostic factors integrated into the Diagnosis-Specific Graded Prognostic Assessment (DS-GPA).",
        "Role of CNS-penetrant targeted tyrosine kinase inhibitors in deferring upfront radiotherapy in oncogene-addicted lung cancer.",
        "Symptomatic management of tumor-associated vasogenic brain edema with corticosteroids."
    ],
    [
        "A 56-year-old female with newly diagnosed EGFR exon 19 deleted adenocarcinoma of the lung presenting with three asymptomatic subcentimeter brain metastases, initiated on upfront osimertinib.",
        "A 64-year-old male with metastatic melanoma presenting with a 3.5-cm frontal brain metastasis causing left hemiparesis and midline shift, managed with IV dexamethasone and urgent neurosurgical resection."
    ]
)

# 276: Brain Metastases: Stereotactic Radiosurgery vs WBRT vs Resection
BATCH_SHEET2_B2[276] = make_entry(
    'brain_metastases_srs_vs_wbrt_vs_resection',
    "The neuro-oncologic management of limited brain metastases (1-4 lesions) has transitioned definitively away from routine Whole-Brain Radiation Therapy (WBRT) toward precision local therapies: Stereotactic Radiosurgery (SRS) and surgical resection. Landmark multicenter randomized trials (NCCTG N0577 / Alliance and EORTC 22952-26001) established that adding WBRT after SRS or surgical resection does not improve overall survival, but causes profound, irreversible declines in cognitive function (learning, immediate and delayed memory) and quality of life. For large, symptomatic metastases (> 3 cm) with mass effect, surgical resection followed by cavity SRS provides immediate relief and local control.",
    [
        ("In the landmark NCCTG N0577 / Alliance randomized phase 3 trial (Brown et al., JAMA), SRS alone resulted in significantly less cognitive deterioration at 3 months (63.5% vs 91.7%, p<0.001) and better quality of life compared with SRS plus whole-brain radiation therapy (WBRT), with no difference in overall survival.", ["27459468"]),
        ("The European EORTC 22952-26001 trial confirmed that adjuvant WBRT following surgery or radiosurgery reduced 2-year intracranial relapse but did not improve overall survival or functional duration of independence.", ["21041710"]),
        ("The historic Patchell randomized trial established that surgical resection of a solitary brain metastasis followed by radiation significantly reduced local recurrence (20% vs 52%) and prolonged median overall survival (40 vs 15 weeks) compared with radiation alone.", ["2320140"]),
        ("Post-operative stereotactic radiosurgery to the surgical cavity is now preferred over adjuvant WBRT, preserving neurocognition while achieving local cavity control rates > 80-85%.", ["27459468", "34932393"])
    ],
    [
        ("27459468", "Effect of Radiosurgery Alone vs Radiosurgery With Whole-Brain Radiation Therapy on Cognitive Function in Patients With 1 to 3 Brain Metastases: A Randomized Clinical Trial (Alliance).", 2016, "trial"),
        ("21041710", "Postoperative adjuvant whole-brain radiotherapy versus observation after radiosurgery or surgical resection of one to three cerebral metastases: results of the EORTC 22952-26001 study.", 2011, "trial"),
        ("2320140", "A randomized trial of surgery in the treatment of single metastases to the brain (Patchell Trial).", 1990, "trial"),
        ("34932393", "Treatment of Brain Metastases: ASCO-SNO-ASTRO Guideline.", 2022, "guideline")
    ],
    [
        "Hippocampal-avoidance whole-brain radiotherapy (HA-WBRT) plus memantine versus stereotactic radiosurgery alone in patients with 5 to 20 brain metastases.",
        "Optimal SRS dosing and margin definitions for resected cavity radiosurgery to prevent leptomeningeal disease dissemination."
    ],
    [
        "Cognitive decline and survival equivalence findings from the Alliance N0577 trial comparing SRS alone to SRS plus WBRT.",
        "Clinical indications for surgical resection (solitary lesion > 3 cm, obstructive hydrocephalus, mass effect) established by Patchell.",
        "Role and delivery timing of post-operative cavity SRS as the standard alternative to WBRT."
    ],
    [
        "A 61-year-old female with metastatic breast cancer found to have 2 asymptomatic cerebellar metastases (each 1.2 cm), successfully treated with stereotactic radiosurgery alone, avoiding cognitive deficits.",
        "A 55-year-old male with a solitary 3.8-cm right temporal metastasis from NSCLC causing left hemianopia and uncal herniation, undergoing emergent surgical resection followed by cavity SRS."
    ]
)

# 277: Breast Cancer: Subtyping, Staging & Multidisciplinary Care
BATCH_SHEET2_B2[277] = make_entry(
    'breast_cancer_subtyping_and_management',
    "Breast cancer management is governed by biological subtyping based on estrogen receptor (ER), progesterone receptor (PR), human epidermal growth factor receptor 2 (HER2), and proliferation index (Ki-67). These define four surrogate intrinsic subtypes: Luminal A (ER/PR high, HER2-, low Ki-67), Luminal B (ER+, HER2- with high Ki-67, or ER+ HER2+), HER2-enriched (ER-, HER2+), and Triple-Negative (TNBC; ER-, PR-, HER2-). Early-stage management incorporates breast-conserving surgery (lumpectomy) with sentinel lymph node biopsy (SLNB) and adjuvant whole-breast radiotherapy, or mastectomy. Adjuvant systemic therapy is guided by multi-gene expression assays (Oncotype DX) and targeted therapies.",
    [
        ("ASCO/CAP guidelines mandate standardized immunohistochemistry and in situ hybridization (ISH) to classify breast cancers into Luminal A/B, HER2-positive, and Triple-Negative subtypes to direct targeted therapy.", ["29846104", "18165647"]),
        ("In hormone receptor-positive, HER2-negative, lymph node-negative early breast cancer, the 21-gene recurrence score (Oncotype DX; TAILORx trial) identifies women with recurrence scores <= 25 who derive zero benefit from adjuvant chemotherapy and can be treated with endocrine therapy alone.", ["29860917"]),
        ("In HER2-positive breast cancer, neoadjuvant dual HER2-targeted blockade (trastuzumab plus pertuzumab combined with taxane-based chemotherapy; APHINITY and NeoSphere trials) substantially improves pathologic complete response and disease-free survival.", ["28581456"]),
        ("Triple-negative breast cancer (TNBC) is aggressive; the KEYNOTE-522 trial established neoadjuvant pembrolizumab combined with platinum/taxane chemotherapy as the standard of care, significantly improving event-free survival and pathologic complete response.", ["32101663"])
    ],
    [
        ("29846104", "Human Epidermal Growth Factor Receptor 2 Testing in Breast Cancer: ASCO/CAP Clinical Practice Guideline Focused Update.", 2018, "guideline"),
        ("29860917", "Adjuvant Chemotherapy Guided by a 21-Gene Expression Assay in Breast Cancer (TAILORx Trial).", 2018, "trial"),
        ("28581456", "Adjuvant Pertuzumab and Trastuzumab in Early HER2-Positive Breast Cancer (APHINITY Trial).", 2017, "trial"),
        ("32101663", "Pembrolizumab for Early Triple-Negative Breast Cancer (KEYNOTE-522 Trial).", 2020, "trial"),
        ("18165647", "A comparison of letrozole and tamoxifen in postmenopausal women with early breast cancer: update of the BIG 1-98 study.", 2008, "trial")
    ],
    [
        "Omission of adjuvant radiotherapy in low-risk postmenopausal women aged >= 65 years with hormone receptor-positive T1N0 breast cancer (PRIME II trial).",
        "Optimal duration of PARP inhibitor maintenance (olaparib; OlympiA trial) in early-stage BRCA-mutated, high-risk HER2-negative breast cancer."
    ],
    [
        "Clinical utility and score thresholds of the 21-gene Oncotype DX assay from the TAILORx trial.",
        "Survival and pathologic complete response benefits of dual HER2 blockade from APHINITY and NeoSphere.",
        "Immunotherapy integration with neoadjuvant chemotherapy in early triple-negative breast cancer (KEYNOTE-522)."
    ],
    [
        "A 58-year-old postmenopausal female with a 1.6-cm ER+ PR+ HER2- node-negative invasive ductal carcinoma whose Oncotype DX Recurrence Score is 14, safely managed with endocrine therapy alone.",
        "A 44-year-old female with a 3.2-cm triple-negative breast cancer and clinically positive axillary node, initiating neoadjuvant chemotherapy plus pembrolizumab."
    ]
)

# 278: Breast Cancer Adjuvant Endocrine Therapy
BATCH_SHEET2_B2[278] = make_entry(
    'breast_cancer_adjuvant_endocrine_therapy',
    "Adjuvant endocrine therapy is the cornerstone of systemic treatment for hormone receptor-positive (ER+ and/or PR+) early breast cancer. In postmenopausal women, third-generation aromatase inhibitors (anastrozole, letrozole, exemestane) demonstrated clear superiority over tamoxifen in landmark randomized trials (ATAC and BIG 1-98), reducing recurrence by an additional 20-30% and prolonging disease-free survival. In high-risk premenopausal women, ovarian function suppression (OFS; GnRH agonists) combined with exemestane or tamoxifen substantially reduces recurrence (SOFT and TEXT trials). Extending endocrine therapy from 5 to 10 years (ATLAS trial) further prevents late recurrences in high-risk node-positive patients.",
    [
        ("The landmark ATAC and BIG 1-98 randomized trials established that 5 years of an aromatase inhibitor (anastrozole or letrozole) significantly reduced breast cancer recurrence and distant metastases compared to tamoxifen in postmenopausal women.", ["15619728", "18165647"]),
        ("In premenopausal women with high-risk hormone-receptor-positive breast cancer, the combined SOFT and TEXT trials (Francis et al., NEJM) demonstrated that adding ovarian function suppression (OFS) to an aromatase inhibitor (exemestane) significantly improved 8-year disease-free survival compared to tamoxifen alone.", ["25495490"]),
        ("The international ATLAS randomized trial (Davies et al., Lancet) proved that continuing tamoxifen for 10 years rather than stopping at 5 years produced a further significant reduction in recurrence (21.4% vs 25.1%) and breast cancer mortality (12.2% vs 15.0%).", ["23219177"]),
        ("Aromatase inhibitors do not stimulate the endometrium and carry lower thromboembolic risks than tamoxifen, but cause accelerated bone loss, joint arthralgias, and osteoporosis, requiring baseline bone mineral density scanning and fracture prophylaxis.", ["15619728", "18165647"])
    ],
    [
        ("15619728", "Results of the ATAC trial after completion of 5 years' adjuvant treatment for postmenopausal women with early-stage breast cancer.", 2005, "trial"),
        ("18165647", "A comparison of letrozole and tamoxifen in postmenopausal women with early breast cancer: update of the BIG 1-98 study.", 2008, "trial"),
        ("25495490", "Tailoring Adjuvant Endocrine Therapy for Premenopausal Breast Cancer (SOFT and TEXT Trials).", 2015, "trial"),
        ("23219177", "Long-term effects of continuing adjuvant tamoxifen to 10 years versus stopping at 5 years after diagnosis of oestrogen receptor-positive breast cancer: ATLAS, a randomised trial.", 2013, "trial")
    ],
    [
        "Addition of adjuvant CDK4/6 inhibitors (abemaciclib; monarchE trial) to endocrine therapy in high-risk node-positive early breast cancer.",
        "Clinical biomarkers predicting late distant recurrence (5-20 years post-diagnosis) to select patients who benefit from 10 versus 5 years of aromatase inhibitor therapy."
    ],
    [
        "Comparative efficacy and side effect profiles of aromatase inhibitors versus tamoxifen in postmenopausal women (ATAC/BIG 1-98).",
        "Role and indications of ovarian function suppression in premenopausal women based on the SOFT/TEXT trials.",
        "Survival and recurrence reduction from extending tamoxifen duration to 10 years in the ATLAS trial."
    ],
    [
        "A 62-year-old postmenopausal female with Stage IIA ER+ breast cancer initiated on adjuvant letrozole 2.5 mg daily with baseline DXA scan.",
        "A 36-year-old premenopausal female with high-risk node-positive ER+ breast cancer treated with goserelin for ovarian suppression plus exemestane."
    ]
)

# 279: Breast Cancer Prognosis and Management in Pregnancy
BATCH_SHEET2_B2[279] = make_entry(
    'breast_cancer_in_pregnancy',
    "Pregnancy-associated breast cancer (PABC)—defined as breast cancer diagnosed during gestation or within one year postpartum—presents unique clinical challenges balancing maternal oncologic cure against fetal safety. Comprehensive multicenter cohort studies (Amant et al., Loibl et al.) and international consensus guidelines have demonstrated that when stage-matched and treated according to evidence-based protocols, breast cancer in pregnancy carries a prognosis equivalent to non-pregnant peers. Anthracycline- and taxane-based chemotherapy can be administered safely during the second and third trimesters without increasing fetal malformations or long-term neurocognitive impairment. Radiotherapy, endocrine therapy, and anti-HER2 targeted biologics are strictly contraindicated during pregnancy.",
    [
        ("International consensus guidelines and prospective cohort studies (Amant et al., Lancet Oncol) demonstrate that stage-adjusted overall survival for pregnancy-associated breast cancer is comparable to non-pregnant age-matched controls when standard therapy is not delayed.", ["22883391"]),
        ("Systemic chemotherapy (e.g., anthracyclines and cyclophosphamide followed by weekly paclitaxel) is safe and well-tolerated when administered during the second and third trimesters (after 12-14 weeks' gestation), with fetal malformation rates identical to baseline population rates.", ["22883391", "25888612"]),
        ("Chemotherapy is strictly contraindicated during the first trimester due to high teratogenic risks (malformation rates 10-20%) and must be stopped by week 35-37 of gestation (or 3 weeks prior to planned delivery) to avoid delivery during maternal and fetal neutropenic nadirs.", ["25888612"]),
        ("HER2-targeted agents (trastuzumab, pertuzumab) cause profound oligohydramnios and fetal renal failure, tamoxifen causes congenital craniofacial malformations, and radiotherapy causes fetal microcephaly/leukemia; all are strictly contraindicated until postpartum.", ["25888612", "22883391"])
    ],
    [
        ("22883391", "Long-term cognitive and cardiac outcomes after prenatal exposure to chemotherapy in children (Amant Study).", 2012, "trial"),
        ("25888612", "Breast cancer during pregnancy: international consensus recommendations of the BIG/NCI working group.", 2015, "consensus-guideline")
    ],
    [
        "Safety and pharmacokinetics of dose-dense every-2-week chemotherapy regimens with G-CSF support during the third trimester of pregnancy.",
        "Impact of immediate postpartum lactation versus lactation suppression on disease-free survival in estrogen receptor-positive breast cancer."
    ],
    [
        "Gestational timing parameters governing chemotherapy safety (contraindicated in 1st trimester; safe in 2nd/3rd trimesters).",
        "Medications strictly contraindicated throughout pregnancy (trastuzumab, tamoxifen, radiation) and their specific fetal toxicities.",
        "Timing chemotherapy cessation (3 weeks before planned delivery) to prevent perinatal neutropenic sepsis."
    ],
    [
        "A 31-year-old female at 18 weeks' gestation diagnosed with a 3-cm triple-negative breast cancer, initiated safely on adjuvant doxorubicin and cyclophosphamide.",
        "A 28-year-old female at 8 weeks' gestation with HER2+ breast cancer whose systemic trastuzumab and radiotherapy are deferred until after planned delivery."
    ]
)

# 280: Bronchial Provocation Testing
BATCH_SHEET2_B2[280] = make_entry(
    'bronchial_provocation_testing',
    "Bronchial provocation (challenge) testing is indicated to confirm or exclude airway hyperresponsiveness (AHR) in patients with symptoms suggestive of asthma who have normal baseline spirometry without documented reversible airflow obstruction. Tests are categorized into direct challenges (methacholine, histamine: acting directly on airway smooth muscle muscarinic M3 receptors) and indirect challenges (exercise, mannitol, eucapnic voluntary hyperpnea [EVH]: inducing inflammatory mediator release from mast cells and eosinophils). European Respiratory Society (ERS) and ATS standards define a positive methacholine challenge as a 20% fall in FEV1 (PC20 <= 8 mg/mL or PD20 <= 200 ug), which has an exceptional negative predictive value (> 95%) to rule out active asthma.",
    [
        ("ERS/ATS technical standards define a positive methacholine bronchial challenge by a provocative concentration causing a 20% fall in FEV1 (PC20) of <= 8 mg/mL (or provocative dose PD20 <= 200 ug or 1-2 umol).", ["28455375"]),
        ("Methacholine challenge testing possesses a very high negative predictive value (> 95%); a negative methacholine test (PC20 > 16 mg/mL) in a currently symptomatic patient effectively rules out active asthma.", ["28455375"]),
        ("Indirect bronchial challenge tests (exercise challenge, dry powder mannitol, eucapnic voluntary hyperpnea) exhibit higher specificity for active Type 2 airway inflammation and exercise-induced bronchoconstriction (EIB) in athletes.", ["28455375"]),
        ("Absolute contraindications to bronchial challenge testing include severe baseline airflow limitation (FEV1 < 50% predicted or < 1.0 L), myocardial infarction or stroke within the preceding 3 months, uncontrolled severe hypertension, and known aortic or cerebral aneurysm.", ["28455375"])
    ],
    [
        ("28455375", "ERS technical standard on bronchial challenge testing: general considerations and performance of methacholine challenge tests.", 2017, "guideline")
    ],
    [
        "Diagnostic accuracy of dry powder mannitol challenge versus methacholine in predicting clinical response to inhaled corticosteroid therapy.",
        "Standardization of eucapnic voluntary hyperpnea (EVH) target ventilation rates in cold-weather endurance athletes."
    ],
    [
        "Diagnostic threshold of PC20 (<= 8 mg/mL) and percentage decline in FEV1 (>= 20%) defining bronchial hyperresponsiveness.",
        "Differences in physiological mechanisms between direct (methacholine) versus indirect (mannitol, exercise) provocation challenges.",
        "Absolute clinical contraindications precluding bronchoprovocation testing (recent cardiovascular events, baseline FEV1 < 50%)."
    ],
    [
        "A 26-year-old male with chronic intermittent cough and normal spirometry (FEV1 98% predicted) whose FEV1 drops by 24% at methacholine 2 mg/mL (PC20 2 mg/mL), confirming asthma.",
        "A 60-year-old female with suspected asthma but baseline FEV1 of 0.82 L (42% predicted), where methacholine challenge is strictly contraindicated."
    ]
)
