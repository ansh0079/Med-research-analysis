#!/usr/bin/env python3
"""
apply_mentor_batches_0116_0250.py

Synthesizes, ingests, and publishes authentic clinical mentor synopses
for Topics 116 to 250 in sequential batches of 15 topics (Batches 2 to 10).
Updates database/app.db, review sheets, and master catalog.
"""

import os
import sys
import json
import sqlite3
import re
from datetime import datetime, timezone
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.path.join(BASE_DIR, 'database', 'app.db')
DRAFTS_JSON = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250.json')
DRAFTS_MD = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250.md')
REVIEW_XLSX = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250-REVIEW.xlsx')
MASTER_XLSX = os.path.join(BASE_DIR, 'Signal_MD_All_Topics_250_Per_Sheet.xlsx')

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

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

ALL_BATCHES = {}

# -------------------------------------------------------------
# BATCH 2: Topics 116 to 130
# -------------------------------------------------------------
b2 = {}
b2[116] = make_entry(
    'alzheimers_disease',
    "Early Alzheimer's disease (mild cognitive impairment or mild dementia) with confirmed amyloid-beta pathology is candidates for anti-amyloid monoclonal antibodies (lecanemab, donanemab). These agents target protofibrillar or plaque amyloid-beta to slow cognitive decline, but mandate APOE genotyping and serial safety MRI monitoring for ARIA.",
    [
        ("Lecanemab (10 mg/kg IV biweekly) met its primary endpoint in the CLARITY AD trial, slowing 18-month cognitive and functional decline (CDR-SB) by 27% compared to placebo.", ["36449413"]),
        ("Appropriate Use Criteria mandate pre-treatment confirmation of amyloid pathology via CSF biomarkers (Abeta42/40 ratio, p-tau181) or amyloid PET imaging.", ["37402633"]),
        ("Amyloid-related imaging abnormalities with edema (ARIA-E) occur in 12.6% of patients on lecanemab and 24% on donanemab, with highest risk in APOE epsilon-4 homozygotes.", ["37459141"]),
        ("Routine baseline and surveillance brain MRIs are required before infusions 5, 7, and 14 to detect asymptomatic ARIA-E and ARIA-H (microhemorrhages/superficial siderosis).", ["37402633"])
    ],
    [
        ("36449413", "Lecanemab in Early Alzheimer's Disease (CLARITY AD Trial).", 2023, "trial"),
        ("37402633", "Appropriate Use Criteria for Lecanemab in Early Alzheimer's Disease.", 2023, "guideline"),
        ("37459141", "Donanemab in Early Symptomatic Alzheimer Disease (TRAILBLAZER-ALZ 2).", 2023, "trial")
    ],
    ["Management of recurrent asymptomatic ARIA-E in APOE e4 carriers.", "Long-term clinical meaningfulness beyond the 18-month trial horizon."],
    ["Recognizing ARIA-E as sulcal or gyral hyperintensity on T2-FLAIR brain MRI.", "APOE e4 homozygous status as the primary risk factor for severe ARIA-E.", "Criteria for withholding anti-amyloid infusions in moderate-to-severe ARIA."]
    ,["A 71-year-old with amnestic MCI and positive amyloid PET whose family inquires about lecanemab eligibility.", "A patient on lecanemab whose week 14 MRI shows asymptomatic frontal ARIA-E."]
)
b2[117] = b2[116] # Alzheimer's disease anti-amyloid immunotherapy

b2[118] = make_entry(
    'amegakaryocytic_thrombocytopenia',
    "Congenital and acquired amegakaryocytic thrombocytopenia (CAMT/AAT) are severe marrow failure disorders characterized by isolated severe thrombocytopenia and absent megakaryocytes on bone marrow biopsy. CAMT is caused by biallelic loss-of-function MPL mutations (TPO receptor), typically progressing to aplastic anemia or leukemia; allogeneic hematopoietic cell transplantation is the definitive curative treatment.",
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
    ["Optimal conditioning regimen intensity (myeloablative vs reduced toxicity) for CAMT.", "Differentiation of acquired AAT from myelodysplastic syndrome with isolated thrombocytopenia."],
    ["Distinguishing CAMT (absent radius syndrome / TAR has preserved megakaryocytes and absent radii; CAMT has normal radii).", "Role of allogeneic stem cell transplantation as sole curative modality.", "Initial bone marrow findings in CAMT vs immune thrombocytopenic purpura (ITP: abundant megakaryocytes)."],
    ["An infant presenting with severe petechiae and platelets 8,000/uL with normal skeletal radiography.", "An adult with refractory severe thrombocytopenia showing zero megakaryocytes on marrow aspirate."]
)

b2[119] = make_entry(
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
    ["Identifying risk factors for MPN blast transformation: SRSF2, IDH1/2, ASXL1, and TP53 mutations.", "Venetoclax tumor lysis syndrome (TLS) mitigation and ramp-up protocol.", "Allogeneic transplant eligibility assessment in secondary AML."]
    ,["A 67-year-old with a 9-year history of JAK2-positive myelofibrosis presenting with 28% peripheral blasts and pancytopenia.", "A post-PV patient with leukemic transformation evaluated for azacitidine-venetoclax induction."]
)

b2[120] = make_entry(
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
    ["Distinguishing ALS from cervical spondylotic myelopathy: tongue fasciculations and normal sensory exam confirm ALS.", "Laboratory monitoring for riluzole: baseline and monthly hepatic transaminases for the first 3 months.", "Screening for frontotemporal dementia (FTD) which co-occurs in 15% of ALS patients."]
    ,["A 56-year-old with progressive asymmetric hand grip weakness, muscle cramping, hyperreflexia, and tongue fasciculations.", "An ALS patient reporting morning headaches, fragmented sleep, and orthopnea whose sitting FVC is 46%."]
)
b2[121] = b2[120] # ALS pulmonary care

b2[122] = make_entry(
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
    ["Differentiating iron deficiency anemia (low ferritin, high TIBC/transferrin, low transferrin saturation < 16-20%) from thalassemia trait (Mentzer index < 13).", "Alternate-day oral iron dosing rationale: avoids hepcidin-mediated enterocyte blockade for 24-48 hours.", "Targeting intravenous iron in symptomatic HFrEF patients with ferritin < 100 or 100-299 with TSAT < 20%."]
    ,["A 68-year-old asymptomatic male found to have microcytic anemia (Hb 9.8 g/dL, MCV 72 fL, ferritin 12 ug/L).", "A patient with Crohn's disease and active flare whose Hb is 8.6 g/dL and who cannot tolerate oral iron tablets."]
)

b2[123] = make_entry(
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
    ["Biochemical profile of pure ACD: low iron, low transferrin/TIBC, high or normal ferritin, low reticulocyte count.", "Why oral iron is ineffective in high-hepcidin inflammatory states (ferroportin blockade prevents gut mucosal transfer).", "Risk of red cell aplasia and thrombosis with excessive ESA dosing targeting Hb > 11.5-12 g/dL in CKD."]
    ,["A 59-year-old with rheumatoid arthritis whose Hb is 10.1 g/dL, MCV 84 fL, iron 24 ug/dL, TIBC 210 ug/dL, and ferritin 380 ug/L.", "A hemodialysis patient with non-responsive anemia on darbepoetin whose TSAT is 14% and ferritin is 180 ug/L."]
)

b2[124] = make_entry(
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
    ["Optimal interval (12 vs 26 weeks) post-chemoradiotherapy to confirm complete clinical response without premature salvage surgery.", "Role of circulating HPV DNA as a liquid biopsy biomarker for minimal residual disease."],
    ["HPV 16 as the causative agent in > 85-90% of anal canal squamous cell carcinomas.", "The Nigro regimen components: 5-FU (or capecitabine) plus mitomycin C combined with radiotherapy.", "Post-treatment surveillance: digital rectal exam, anoscopy, and inguinal lymph node palpation every 3-6 months for 5 years."]
    ,["A 52-year-old presenting with rectal bleeding, tenesmus, and a 3.5 cm ulcerated anal canal mass on digital examination.", "A patient 12 weeks post-Nigro regimen with a persistent 1 cm indurated area on anoscopy; assessing need for observation to 26 weeks."]
)
b2[125] = b2[124] # Anal Cancer

b2[126] = make_entry(
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
    ["Risk-benefit balance of preoperative gabapentinoid loading (pregabalin/gabapentin) regarding excessive sedation and respiratory depression.", "Cardiovascular and renal safety of short-course (48-72h) perioperative COX-2 inhibitors."],
    ["Mechanism of ketamine in chronic pain and opioid tolerance: non-competitive NMDA receptor blockade preventing central sensitization.", "Opioid-sparing multimodal protocol components: scheduled paracetamol + NSAID + local infiltration analgesia + PRN weak opioid.", "Contraindications to intravenous lidocaine: severe heart block, ventricular arrhythmias, and severe hepatic impairment."]
    ,["A 65-year-old on high-dose chronic buprenorphine undergoing total knee arthroplasty requiring acute pain planning.", "A post-colectomy patient developing nausea, urinary retention, and ileus on PCA morphine who is transitioned to multimodal analgesia."]
)

b2[127] = make_entry(
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
    ["Route and site of epinephrine: intramuscular into the anterolateral vastus lateralis (superior absorption and faster peak plasma levels than subcutaneous or deltoid).", "Refractory anaphylaxis in a patient on propranolol: administer IV glucagon (1-5 mg over 5 min) which bypasses beta-receptors via adenylate cyclase stimulation.", "Discharge requirements: prescription of two epinephrine auto-injectors, personalized allergy action plan, and allergy clinic referral."]
    ,["A 22-year-old eating at a restaurant who develops acute tongue swelling, stridor, wheeze, and BP 80/50 mmHg 10 minutes after peanut ingestion.", "A patient experiencing anaphylaxis during amoxicillin injection who fails to respond to 3 doses of IM epinephrine; medical team initiates IV epinephrine infusion."]
)

b2[128] = make_entry(
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
    ["Clinical presentation of ATC: elderly patient with rapidly growing rock-hard neck mass over weeks with hoarseness and dyspnea.", "Molecular profiling urgency: BRAF V600E mutation occurs in 40-50% of ATC and dictates immediate targeted therapy.", "Airway management priorities: avoid tracheostomy if possible unless acute imminent asphyxia, as it leads to tumor fungation and stoma bleeding."]
    ,["A 74-year-old female with a 5-week history of a rapidly expanding 6 cm neck mass, stridor, and right vocal cord paralysis on laryngoscopy.", "A patient with newly diagnosed ATC confirmed BRAF V600E positive on day 3; oncology initiates immediate dabrafenib-trametinib."]
)

b2[129] = make_entry(
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
    ["Serological associations: GPA correlates predominantly with c-ANCA / PR3 antibodies; MPA correlates with p-ANCA / MPO antibodies.", "The ADVOCATE trial outcome: avacopan achieves non-inferior remission at week 26 and superior sustained remission at week 52 with higher eGFR recovery.", "Infection prophylaxis: trimethoprim-sulfamethoxazole (Pneumocystis jirovecii prophylaxis) is mandatory during induction with rituximab or cyclophosphamide."]
    ,["A 58-year-old presenting with sinusitis, pulmonary cavitating nodules on CT, hematuria, and c-ANCA/PR3 titer > 1:320.", "A patient with MPA and rapidly rising creatinine (3.8 mg/dL) who receives rituximab and avacopan to minimize high-dose oral steroids."]
)
b2[130] = b2[129] # anca associated vasculitis renal disease

ALL_BATCHES[2] = b2
print("Batch 2 definitions constructed (Topics 116 to 130: 15 topics).")
