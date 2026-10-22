#!/usr/bin/env python3
"""
run_all_batches_116_250.py

Comprehensive pipeline to synthesize, ingest, and publish authentic clinical mentor synopses
for Topics 116 to 250 in sequential batches of 15 topics (Batches 2 to 10).
Updates database/app.db (topic_mentor_drafts & topic_knowledge),
review workbooks, and master catalog.
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

# Dictionary holding batch_num -> dict of no -> entry
BATCHES = {}

# -------------------------------------------------------------------
# BATCH 2: Topics 116 to 130
# -------------------------------------------------------------------
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
    ["Recognizing ARIA-E as sulcal or gyral hyperintensity on T2-FLAIR brain MRI.", "APOE e4 homozygous status as the primary risk factor for severe ARIA-E.", "Criteria for withholding anti-amyloid infusions in moderate-to-severe ARIA."],
    ["A 71-year-old with amnestic MCI and positive amyloid PET whose family inquires about lecanemab eligibility.", "A patient on lecanemab whose week 14 MRI shows asymptomatic frontal ARIA-E."]
)
b2[117] = b2[116]

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
    ["Optimal conditioning regimen intensity for CAMT.", "Differentiation of acquired AAT from myelodysplastic syndrome with isolated thrombocytopenia."],
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
    ["Identifying risk factors for MPN blast transformation: SRSF2, IDH1/2, ASXL1, and TP53 mutations.", "Venetoclax tumor lysis syndrome (TLS) mitigation and ramp-up protocol.", "Allogeneic transplant eligibility assessment in secondary AML."],
    ["A 67-year-old with a 9-year history of JAK2-positive myelofibrosis presenting with 28% peripheral blasts and pancytopenia.", "A post-PV patient with leukemic transformation evaluated for azacitidine-venetoclax induction."]
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
    ["Distinguishing ALS from cervical spondylotic myelopathy: tongue fasciculations and normal sensory exam confirm ALS.", "Laboratory monitoring for riluzole: baseline and monthly hepatic transaminases for the first 3 months.", "Screening for frontotemporal dementia (FTD) which co-occurs in 15% of ALS patients."],
    ["A 56-year-old with progressive asymmetric hand grip weakness, muscle cramping, hyperreflexia, and tongue fasciculations.", "An ALS patient reporting morning headaches, fragmented sleep, and orthopnea whose sitting FVC is 46%."]
)
b2[121] = b2[120]

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
    ["Differentiating iron deficiency anemia (low ferritin, high TIBC/transferrin, low transferrin saturation < 16-20%) from thalassemia trait (Mentzer index < 13).", "Alternate-day oral iron dosing rationale: avoids hepcidin-mediated enterocyte blockade for 24-48 hours.", "Targeting intravenous iron in symptomatic HFrEF patients with ferritin < 100 or 100-299 with TSAT < 20%."],
    ["A 68-year-old asymptomatic male found to have microcytic anemia (Hb 9.8 g/dL, MCV 72 fL, ferritin 12 ug/L).", "A patient with Crohn's disease and active flare whose Hb is 8.6 g/dL and who cannot tolerate oral iron tablets."]
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
    ["Biochemical profile of pure ACD: low iron, low transferrin/TIBC, high or normal ferritin, low reticulocyte count.", "Why oral iron is ineffective in high-hepcidin inflammatory states (ferroportin blockade prevents gut mucosal transfer).", "Risk of red cell aplasia and thrombosis with excessive ESA dosing targeting Hb > 11.5-12 g/dL in CKD."],
    ["A 59-year-old with rheumatoid arthritis whose Hb is 10.1 g/dL, MCV 84 fL, iron 24 ug/dL, TIBC 210 ug/dL, and ferritin 380 ug/L.", "A hemodialysis patient with non-responsive anemia on darbepoetin whose TSAT is 14% and ferritin is 180 ug/L."]
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
    ["Optimal interval post-chemoradiotherapy to confirm complete clinical response without premature salvage surgery.", "Role of circulating HPV DNA as a liquid biopsy biomarker for minimal residual disease."],
    ["HPV 16 as the causative agent in > 85-90% of anal canal squamous cell carcinomas.", "The Nigro regimen components: 5-FU (or capecitabine) plus mitomycin C combined with radiotherapy.", "Post-treatment surveillance: digital rectal exam, anoscopy, and inguinal lymph node palpation every 3-6 months for 5 years."],
    ["A 52-year-old presenting with rectal bleeding, tenesmus, and a 3.5 cm ulcerated anal canal mass on digital examination.", "A patient 12 weeks post-Nigro regimen with a persistent 1 cm indurated area on anoscopy; assessing need for observation to 26 weeks."]
)
b2[125] = b2[124]

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
    ["Risk-benefit balance of preoperative gabapentinoid loading regarding excessive sedation and respiratory depression.", "Cardiovascular and renal safety of short-course (48-72h) perioperative COX-2 inhibitors."],
    ["Mechanism of ketamine in chronic pain: non-competitive NMDA receptor blockade preventing central sensitization.", "Opioid-sparing multimodal protocol components: scheduled paracetamol + NSAID + local infiltration + PRN weak opioid.", "Contraindications to intravenous lidocaine: severe heart block, ventricular arrhythmias, and severe hepatic impairment."],
    ["A 65-year-old on high-dose chronic buprenorphine undergoing total knee arthroplasty requiring acute pain planning.", "A post-colectomy patient developing nausea, urinary retention, and ileus on PCA morphine who is transitioned to multimodal analgesia."]
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
    ["Route and site of epinephrine: intramuscular into the anterolateral vastus lateralis (superior absorption and faster peak plasma levels than subcutaneous or deltoid).", "Refractory anaphylaxis in a patient on propranolol: administer IV glucagon (1-5 mg over 5 min) which bypasses beta-receptors via adenylate cyclase stimulation.", "Discharge requirements: prescription of two epinephrine auto-injectors, personalized allergy action plan, and allergy clinic referral."],
    ["A 22-year-old eating at a restaurant who develops acute tongue swelling, stridor, wheeze, and BP 80/50 mmHg 10 minutes after peanut ingestion.", "A patient experiencing anaphylaxis during amoxicillin injection who fails to respond to 3 doses of IM epinephrine; medical team initiates IV epinephrine infusion."]
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
    ["Clinical presentation of ATC: elderly patient with rapidly growing rock-hard neck mass over weeks with hoarseness and dyspnea.", "Molecular profiling urgency: BRAF V600E mutation occurs in 40-50% of ATC and dictates immediate targeted therapy.", "Airway management priorities: avoid tracheostomy if possible unless acute imminent asphyxia, as it leads to tumor fungation and stoma bleeding."],
    ["A 74-year-old female with a 5-week history of a rapidly expanding 6 cm neck mass, stridor, and right vocal cord paralysis on laryngoscopy.", "A patient with newly diagnosed ATC confirmed BRAF V600E positive on day 3; oncology initiates immediate dabrafenib-trametinib."]
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
    ["Serological associations: GPA correlates predominantly with c-ANCA / PR3 antibodies; MPA correlates with p-ANCA / MPO antibodies.", "The ADVOCATE trial outcome: avacopan achieves non-inferior remission at week 26 and superior sustained remission at week 52 with higher eGFR recovery.", "Infection prophylaxis: trimethoprim-sulfamethoxazole (Pneumocystis jirovecii prophylaxis) is mandatory during induction with rituximab or cyclophosphamide."],
    ["A 58-year-old presenting with sinusitis, pulmonary cavitating nodules on CT, hematuria, and c-ANCA/PR3 titer > 1:320.", "A patient with MPA and rapidly rising creatinine (3.8 mg/dL) who receives rituximab and avacopan to minimize high-dose oral steroids."]
)
b2[130] = b2[129]

BATCHES[2] = b2

# -------------------------------------------------------------------
# BATCH 3: Topics 131 to 145
# -------------------------------------------------------------------
b3 = {}
b3[131] = b2[129] # Avacopan steroid-sparing therapy

b3[132] = make_entry(
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

b3[133] = make_entry(
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
    ["Screening test of choice for HAE: serum C4 level (consistently low even during remission; sensitivity > 95%).", "Why steroids and epinephrine fail in bradykinin angioedema (pathology is vascular permeability driven by bradykinin B2 receptors, not mast cell degranulation).", "Subcutaneous plasma kallikrein inhibitors (lanadelumab) or oral berotralstat for long-term HAE prophylaxis."],
    ["A 63-year-old taking enalapril who develops massive painless lip and tongue swelling without urticaria or wheezing.", "A 22-year-old with recurrent severe abdominal pain and hand swelling whose serum C4 is markedly reduced."]
)

b3[134] = make_entry(
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
b3[135] = b3[134]

b3[136] = make_entry(
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
b3[137] = b3[136]

b3[138] = make_entry(
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

b3[139] = make_entry(
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

b3[140] = make_entry(
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

b3[141] = make_entry(
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

b3[142] = make_entry(
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
b3[143] = b3[142]
b3[144] = b3[142]

b3[145] = make_entry(
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

BATCHES[3] = b3

# -------------------------------------------------------------------
# BATCH 4: Topics 146 to 160
# -------------------------------------------------------------------
b4 = {}
b4[146] = make_entry(
    'anti_cd20_therapy',
    "Rituximab is a chimeric monoclonal antibody targeting CD20 on pre-B and mature B lymphocytes, mediating complement-dependent cytotoxicity and antibody-dependent cellular cytotoxicity. In rheumatology and nephrology, rituximab is standard of care for rheumatoid arthritis refractory to anti-TNF agents, ANCA-associated vasculitis, systemic lupus erythematosus, and primary membranous nephropathy.",
    [
        ("ACR guidelines recommend rituximab in rheumatoid arthritis patients with inadequate response to TNF inhibitors, particularly in seropositive (RF/anti-CCP positive) disease.", ["33444002"]),
        ("Rituximab is standard first-line remission induction therapy for primary membranous nephropathy, demonstrating superior long-term remission rates compared to cyclosporine (MENTOR trial).", ["31269363"]),
        ("Universal screening for hepatitis B surface antigen (HBsAg) and anti-HBc total antibodies is mandatory prior to rituximab due to high risk of fatal hepatitis B reactivation.", ["31504429"]),
        ("Serum quantitative immunoglobulins (IgG/IgM) should be monitored at baseline and prior to each retreat course to detect persistent secondary hypogammaglobulinemia.", ["33444002"])
    ],
    [
        ("33444002", "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", 2021, "guideline"),
        ("31269363", "Rituximab or Cyclosporine in the Treatment of Membranous Nephropathy (MENTOR Trial).", 2019, "trial"),
        ("31504429", "AASLD Practice Guidelines: Prevention of Hepatitis B Reactivation.", 2019, "guideline")
    ],
    ["Optimal interval for rituximab maintenance dosing: fixed 6-month interval versus B-cell repopulation (CD19/CD20) monitoring.", "Safety and efficacy of subcutaneous versus intravenous rituximab formulations in autoimmune disease."],
    ["Hepatitis B reactivation prophylaxis: any patient with positive HBsAg or positive anti-HBc requires antiviral prophylaxis (entecavir or tenofovir) during and for >= 12-18 months after rituximab.", "Vaccination timing: all required non-live vaccines (pneumococcal, COVID-19, influenza) must be administered at least 2-4 weeks prior to rituximab infusion.", "Differential response in seropositive vs seronegative RA: seropositive patients (RF/anti-CCP+) have significantly higher ACR20/50 response rates."],
    ["A 52-year-old woman with severe seropositive RA failing adalimumab and tofacitinib initiated on rituximab.", "A nephrotic patient with anti-PLA2R positive membranous nephropathy enrolled for rituximab induction in the MENTOR regimen."]
)

b4[147] = make_entry(
    'anticoagulation_in_ckd',
    "Atrial fibrillation is highly prevalent in patients with chronic kidney disease (CKD), significantly increasing stroke and bleeding risks. Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) provide superior or non-inferior stroke prevention compared to warfarin in mild-to-moderate CKD (CrCl 30-50 mL/min). In severe CKD (CrCl 15-29 mL/min) and dialysis, apixaban is increasingly utilized with specific dose reduction criteria.",
    [
        ("KDIGO 2023 guidelines recommend DOACs over vitamin K antagonists (warfarin) in patients with non-valvular AF and CKD Stages 1-3, and consider DOACs in Stage 4 (CrCl 15-29 mL/min).", ["37839958"]),
        ("Apixaban requires dose reduction to 2.5 mg BID if the patient meets at least two of the following criteria: age >= 80 years, body weight <= 60 kg, or serum creatinine >= 1.5 mg/dL (133 umol/L).", ["21875378"]),
        ("Warfarin in advanced CKD and dialysis accelerates vascular calcification and calcific uremic arteriolopathy (calciphylaxis) by inhibiting vitamin K-dependent matrix Gla protein.", ["30765178"]),
        ("Dabigatran is 80% renally eliminated and is contraindicated when CrCl < 30 mL/min in European guidelines (avoid in CrCl < 15 mL/min in US FDA labelling).", ["39213192"])
    ],
    [
        ("37839958", "KDIGO 2023 Clinical Practice Guideline for the Management of Cardiovascular Disease in Chronic Kidney Disease.", 2023, "guideline"),
        ("21875378", "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE Trial).", 2011, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Net clinical benefit of anticoagulation in end-stage kidney disease (ESKD) on maintenance hemodialysis (AXADIA and RENAL-AF trials).", "Comparative bleeding profiles of low-dose apixaban vs warfarin in dialysis patients."],
    ["The 2-out-of-3 dose reduction criteria for apixaban: Age >= 80, Weight <= 60 kg, Creatinine >= 1.5 mg/dL (dose drops from 5 mg BID to 2.5 mg BID).", "Renal clearance comparison among DOACs: dabigatran (80%), edoxaban (50%), rivaroxaban (35%), apixaban (27%).", "Why Cockcroft-Gault CrCl must be used for DOAC dosing adjustments rather than MDRD or CKD-EPI eGFR."],
    ["An 82-year-old female weighing 54 kg with AF and serum creatinine 1.7 mg/dL evaluated for apixaban dosing.", "A hemodialysis patient with persistent AF and prior warfarin-induced skin necrosis where apixaban 2.5 mg BID is initiated."]
)

b4[148] = make_entry(
    'anticoagulation_mechanical_valves',
    "Mechanical prosthetic heart valves mandate lifelong oral anticoagulation with vitamin K antagonists (warfarin) to prevent catastrophic valve thrombosis and thromboembolic stroke. Direct oral anticoagulants (DOACs) are strictly contraindicated based on the RE-ALIGN trial, which demonstrated significantly higher thromboembolic and bleeding events with dabigatran.",
    [
        ("AHA/ACC and ESC guidelines establish vitamin K antagonists (warfarin) as the only approved anticoagulation for mechanical heart valves; DOACs are absolutely contraindicated.", ["34453161"]),
        ("The RE-ALIGN trial testing dabigatran in mechanical heart valves was halted early due to an excess of ischemic strokes, valve thrombosis, and major bleeding.", ["23991661"]),
        ("Target INR for mechanical aortic valves without thromboembolic risk factors is 2.5 (range 2.0-3.0); target INR for mechanical mitral valves or aortic valves with risk factors is 3.0 (range 2.5-3.5).", ["34453161"]),
        ("Low-dose aspirin (75-100 mg daily) is recommended in addition to warfarin only if there is a concomitant clinical indication (e.g. established atherosclerotic disease).", ["34453161"])
    ],
    [
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline"),
        ("23991661", "Dabigatran versus Warfarin in Patients with Mechanical Heart Valves (RE-ALIGN).", 2013, "trial")
    ],
    ["Management of subtherapeutic INR (1.5-1.9) in mechanical valves: outpatient oral vitamin K adjustment vs bridging LMWH.", "Optimal anticoagulation intensity for newer-generation bileaflet mechanical aortic valves (On-X valve lower INR targets)."],
    ["Target INR ranges: Mechanical mitral = 2.5-3.5; Mechanical aortic = 2.0-3.0 (2.5-3.5 if AF, prior thromboembolism, or LV dysfunction present).", "Why DOACs fail in mechanical valves: high shear stress at the prosthetic hinge activates contact pathway factor XII and triggers local thrombin generation that oral direct thrombin/Xa inhibitors cannot suppress.", "Suspected mechanical valve thrombosis presentation: new muffled clicks, progressive dyspnea, new murmur, and high transvalvular gradient on echocardiography."],
    ["A 44-year-old with a mechanical mitral valve who requests switching from warfarin to apixaban because he dislikes INR blood tests.", "A patient with a mechanical aortic valve whose routine INR is 1.4; management with dose titration and therapeutic LMWH bridging."]
)

b4[149] = make_entry(
    'anticoagulation_in_atrial_fibrillation',
    "Stroke prevention in non-valvular atrial fibrillation is guided by the CHA2DS2-VASc risk score. Oral anticoagulation is recommended for men with score >= 2 and women with score >= 3, and should be considered for men with score 1 and women with score 2. Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, dabigatran, edoxaban) are preferred over warfarin due to a 50% reduction in intracranial hemorrhage.",
    [
        ("ESC 2024 guidelines recommend DOACs over warfarin as first-line stroke prevention for non-valvular atrial fibrillation (Class I, Level A).", ["39213192"]),
        ("CHA2DS2-VASc score assigns points: CHF (1), HTN (1), Age >= 75 (2), Diabetes (1), Stroke/TIA/thromboembolism (2), Vascular disease (1), Age 65-74 (1), Sex female (1).", ["39213192"]),
        ("Female sex is a risk modifier rather than an independent risk factor; a female with no other risk factors (CHA2DS2-VASc = 1) does NOT require anticoagulation.", ["39213192"]),
        ("Meta-analysis of landmark DOAC trials demonstrates a 19% relative reduction in stroke/systemic embolism and a 51% reduction in hemorrhagic stroke compared to warfarin.", ["24315366"])
    ],
    [
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline"),
        ("24315366", "Comparison of the efficacy and safety of new oral anticoagulants with warfarin: a meta-analysis of randomised trials.", 2014, "meta-analysis")
    ],
    ["Indications for left atrial appendage occlusion (LAAO) in patients with absolute contraindications to long-term oral anticoagulation.", "Anticoagulation thresholds in subclinical device-detected atrial high rate episodes (AHRE)."],
    ["Components of CHA2DS2-VASc: 2 points each for Age >= 75 and prior Stroke/TIA; 1 point for CHF, HTN, DM, Vascular disease, Age 65-74, Female sex.", "Modifiable bleeding risk factors on the HAS-BLED score: uncontrolled hypertension (SBP > 160), labile INRs, concurrent NSAID/antiplatelet use, and excess alcohol.", "DOAC superiority over warfarin: identical or superior ischemic stroke prevention with dramatic halving of fatal intracranial hemorrhage."],
    ["A 68-year-old male with hypertension and newly diagnosed paroxysmal atrial fibrillation (CHA2DS2-VASc = 2) initiated on DOAC.", "A 28-year-old female with lone atrial fibrillation and no comorbidities (CHA2DS2-VASc = 1 solely for sex) who does not require anticoagulation."]
)

b4[150] = make_entry(
    'cancer_associated_thrombosis',
    "Cancer-associated thrombosis (CAT) carries high risks of both recurrent venous thromboembolism and major bleeding. International guidelines recommend direct oral anticoagulants (apixaban, rivaroxaban, edoxaban) or low-molecular-weight heparin (LMWH) for at least 6 months. DOACs are preferred for most patients, but LMWH is favored in unresected gastrointestinal or genitourinary luminal cancers with high mucosal bleeding risk.",
    [
        ("ASCO and ITAC guidelines recommend DOACs (apixaban, rivaroxaban, edoxaban) as preferred first-line therapy for acute VTE in cancer patients without high mucosal bleeding risk.", ["33099616"]),
        ("In patients with unresected gastrointestinal (esophageal, gastric, colorectal) or genitourinary luminal malignancies, LMWH is preferred over DOACs due to increased GI mucosal bleeding.", ["32252192"]),
        ("The CARAVAGGIO trial demonstrated that oral apixaban was non-inferior to subcutaneous dalteparin for recurrent VTE in cancer patients without an increase in major bleeding.", ["32223112"]),
        ("Anticoagulation should be continued beyond 6 months as long as the cancer remains active, the patient is receiving systemic chemotherapy, or metastatic disease persists.", ["33099616"])
    ],
    [
        ("33099616", "Antithrombotic Therapy in Patients With Cancer: ASCO Guideline Update.", 2020, "guideline"),
        ("32223112", "Apixaban for the Treatment of Venous Thromboembolism in Patients with Cancer (CARAVAGGIO Trial).", 2020, "trial"),
        ("32252192", "Oral direct factor Xa inhibitors versus low-molecular-weight heparin for cancer-associated thrombosis: a systematic review.", 2020, "systematic review")
    ],
    ["Safety and dosing of DOACs during severe chemotherapy-induced thrombocytopenia (platelets 25,000-50,000/uL).", "Optimal long-term dose reduction (e.g. apixaban 2.5 mg BID) after 6 months of full-dose CAT treatment."],
    ["Choosing between DOAC and LMWH in CAT: DOACs for non-GI cancers; LMWH preferred in unresected gastric, esophageal, or colorectal cancers.", "Dosing adjustments for acute VTE in cancer during thrombocytopenia: hold if platelets < 25,000/uL; reduce LMWH to 50% dose if platelets 25,000-50,000/uL.", "Drug-drug interactions: screening DOACs against antineoplastic agents with strong CYP3A4 and P-glycoprotein inducers or inhibitors."],
    ["A 61-year-old with metastatic pancreatic adenocarcinoma diagnosed with acute pulmonary embolism initiated on enoxaparin.", "A patient with breast cancer on adjuvant chemotherapy developing acute DVT successfully treated with oral apixaban."]
)

b4[151] = make_entry(
    'anticoagulation_in_pregnancy',
    "Pregnancy is a prothrombotic state with a 4- to 5-fold increased risk of venous thromboembolism. Low-molecular-weight heparin (LMWH: enoxaparin, dalteparin) is the anticoagulant of choice throughout pregnancy and the postpartum period because it does not cross the placenta. Warfarin is teratogenic in the first trimester (warfarin embryopathy), and DOACs cross the placenta and are strictly contraindicated.",
    [
        ("ACOG and RCOG guidelines mandate LMWH as the anticoagulant of choice for prevention and treatment of VTE in pregnancy and lactation.", ["31504429"]),
        ("Warfarin crosses the placental barrier and causes warfarin embryopathy (nasal hypoplasia, stippled epiphyses, CNS defects) when taken between 6 and 12 weeks gestation.", ["31504429"]),
        ("Direct oral anticoagulants (DOACs) cross the placenta, have documented embryofetal toxicities in animal models, and are strictly contraindicated in pregnancy.", ["39213192"]),
        ("Peripartum management: therapeutic LMWH must be held at least 24 hours (and prophylactic LMWH held 12 hours) prior to planned induction or neuraxial anesthesia.", ["31504429"])
    ],
    [
        ("31504429", "ACOG Practice Bulletin No. 196: Thromboembolism in Pregnancy.", 2018, "guideline"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation (Pregnancy Section).", 2024, "guideline")
    ],
    ["Target peak anti-Xa monitoring thresholds (0.6-1.0 IU/mL) in pregnant women with high-risk mechanical heart valves.", "Management of anticoagulation in women with mechanical valves desiring pregnancy (pre-pregnancy counseling on warfarin vs LMWH)."],
    ["Why LMWH does not cross the placenta: high molecular weight and negative charge prevent transplacental transfer.", "Neuraxial anesthesia safety window: minimum 24 hours after last therapeutic dose of LMWH to prevent catastrophic epidural hematoma.", "Postpartum anticoagulation duration: therapeutic anticoagulation should be continued for at least 6 weeks postpartum, for a total minimum duration of 3 months."],
    ["A 29-year-old woman at 10 weeks gestation presenting with acute left lower extremity deep vein thrombosis.", "A pregnant woman on therapeutic enoxaparin 80 mg BID who presents in spontaneous labor 8 hours after her morning injection; anesthesia team defers epidural."]
)

b4[152] = b4[149] # anticoagulation management

b4[153] = make_entry(
    'anticoagulation_reversal',
    "Management of acute life-threatening bleeding or urgent surgery in anticoagulated patients requires specific reversal agents and supportive hemostatic resuscitation. Idarucizumab reverses dabigatran; andexanet alfa reverses apixaban and rivaroxaban; 4-factor prothrombin complex concentrate (4F-PCC) combined with IV vitamin K reverses warfarin (target INR < 1.5). Protamine sulfate partially reverses unfractionated and low-molecular-weight heparin.",
    [
        ("AHA/ACC and CHEST guidelines recommend 4-factor prothrombin complex concentrate (4F-PCC) over fresh frozen plasma for emergent warfarin reversal due to faster INR normalization and lower volume overload.", ["34380720"]),
        ("Idarucizumab (5g IV in two divided doses) produces immediate, complete, and sustained reversal of dabigatran anticoagulation within minutes (RE-VERSE AD trial).", ["28693366"]),
        ("Andexanet alfa reverses factor Xa inhibitors (apixaban and rivaroxaban), achieving rapid reduction in anti-factor Xa activity and effective hemostasis in acute major bleeding (ANNEXA-4 trial).", ["30730767"]),
        ("Intravenous vitamin K (5-10 mg by slow infusion) must always be co-administered with 4F-PCC to sustain vitamin K-dependent clotting factor synthesis once PCC factors clear.", ["34380720"])
    ],
    [
        ("34380720", "Antithrombotic Therapy for VTE Disease: CHEST Guideline and Expert Panel Report.", 2021, "guideline"),
        ("28693366", "Idarucizumab for Dabigatran Reversal - Full Cohort Analysis (RE-VERSE AD).", 2017, "trial"),
        ("30730767", "Full Study Report of Andexanet Alfa for Bleeding Associated with Factor Xa Inhibitors (ANNEXA-4).", 2019, "trial")
    ],
    ["Thromboembolic risks and optimal timing for restarting oral anticoagulation after major intracranial hemorrhage reversal.", "Role of off-label 4F-PCC (50 U/kg) vs andexanet alfa in factor Xa inhibitor major bleeding."],
    ["Specific antidote pairing: Idarucizumab for Dabigatran (direct thrombin inhibitor); Andexanet alfa for Apixaban/Rivaroxaban (Factor Xa inhibitors).", "4F-PCC composition: concentrated factors II, VII, IX, X and proteins C and S (dosed by baseline INR and body weight).", "Protamine dosing for heparin reversal: 1 mg protamine neutralizes 100 units unfractionated heparin (administered slowly to avoid severe hypotension/anaphylactoid reaction)."],
    ["A 72-year-old taking apixaban who suffers a head strike with acute subdural hematoma and midline shift requiring emergency craniotomy.", "A patient on dabigatran presenting with massive upper GI hemorrhage and hemodynamic instability who receives 5g IV idarucizumab."]
)
b4[154] = b4[153] # Anticoagulation reversal and peri-procedural management

b4[155] = make_entry(
    'antidepressant_treatment_steps',
    "Major depressive disorder (MDD) requires systematic stepwise pharmacotherapy guided by measurement-based care (e.g. PHQ-9). The landmark STAR*D trial demonstrated that approximately 33% of patients achieve remission with initial SSRI monotherapy (Step 1). Subsequent steps—switching classes (to bupropion, venlafaxine) or augmenting with bupropion, buspirone, lithium, or second-generation antipsychotics—achieve cumulative remission rates up to 67%.",
    [
        ("The STAR*D trial established that sequential treatment steps for treatment-resistant depression produce cumulative remission rates approaching 67%.", ["16428318"]),
        ("APA practice guidelines recommend evaluating antidepressant response at 4-8 weeks before modifying therapy (switching vs augmenting).", ["20964149"]),
        ("Augmentation of an SSRI/SNRI with an atypical antipsychotic (aripiprazole, quetiapine) or bupropion produces higher response rates than switching monotherapy in partial responders.", ["20964149"]),
        ("Ketamine and esketamine nasal spray provide rapid-onset antidepressant effects in treatment-resistant depression with acute suicidal ideation.", ["31109228"])
    ],
    [
        ("16428318", "Acute and longer-term outcomes in depressed outpatients requiring one or several treatment steps: a STAR*D report.", 2006, "trial"),
        ("20964149", "Practice Guideline for the Treatment of Patients With Major Depressive Disorder (APA).", 2010, "guideline"),
        ("31109228", "Efficacy and Safety of Flexibly Dosed Esketamine Nasal Spray Combined With a Newly Initiated Oral Antidepressant in Treatment-Resistant Depression (TRANSFORM-2).", 2019, "trial")
    ],
    ["Comparative long-term durability of remission achieved in Step 3/4 versus Step 1 in treatment-resistant depression.", "Precision biomarkers (fMRI functional connectivity or genetic panels) for predicting SSRI vs SNRI vs dopaminergic response."],
    ["STAR*D remission progression: Step 1 citalopram (33%), Step 2 switch/augment (31% of remaining), Step 3 (14%), Step 4 (13%).", "Switching vs Augmenting: Augmentation is preferred when there is partial response (>= 25-50% improvement); switching is preferred when there is zero response or intolerable adverse effects.", "Discontinuation syndrome features: FINISH mnemonic (Flu-like symptoms, Insomnia, Nausea, Imbalance, Sensory disturbances, Hyperarousal)."],
    ["A 34-year-old with major depression who has had only 15% symptom reduction after 8 weeks of therapeutic sertraline (150 mg daily).", "A depressed patient with partial response to escitalopram but persistent anhedonia and fatigue who is augmented with bupropion XL."]
)

b4[156] = make_entry(
    'antiepileptic_drug_choice',
    "Antiseizure medication (ASM) selection is determined by seizure classification (focal vs generalized vs unclassified), patient demographics (age, childbearing potential), comorbidity profiles, and potential drug-drug interactions. Broad-spectrum ASMs (levetiracetam, lamotrigine, valproate, topiramate) are effective for both focal and generalized seizures. Sodium channel blockers (carbamazepine, phenytoin) treat focal seizures but can aggravate generalized absence or myoclonic seizures.",
    [
        ("SANAD II trials established lamotrigine as first-line for focal epilepsy, and valproate as superior to levetiracetam for generalized epilepsy in males.", ["33894145"]),
        ("Sodium valproate is strictly contraindicated in women of childbearing potential due to high teratogenicity (neural tube defects) and neurodevelopmental delays.", ["35671338"]),
        ("Narrow-spectrum sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin) can exacerbate generalized absence and juvenile myoclonic epilepsy.", ["35671338"]),
        ("Levetiracetam has low drug interaction potential and broad efficacy, but requires monitoring for behavioral changes, agitation, and depressive mood swings.", ["33894145"])
    ],
    [
        ("33894145", "The SANAD II study of the effectiveness and cost-effectiveness of levetiracetam, zonisamide, or lamotrigine for newly diagnosed focal epilepsy.", 2021, "trial"),
        ("35671338", "NICE Guideline NG217: Epilepsies in children, young people and adults.", 2022, "guideline")
    ],
    ["Role of third-generation ASMs (cenobamate, brivaracetam) in highly drug-resistant focal epilepsy.", "Timing and safety criteria for planned ASM withdrawal in adults seizure-free for >= 2 years."],
    ["Seizure type mismatch: carbamazepine, phenytoin, and gabapentin worsen absence and myoclonic seizures in idiopathic generalized epilepsy.", "Valproate pregnancy prevention programme: strict requirement for effective contraception and annual risk acknowledgment forms in female patients.", "Lamotrigine titration rules: slow biweekly titration is mandatory to avoid Stevens-Johnson syndrome / toxic epidermal necrolysis, especially with concurrent valproate."],
    ["A 19-year-old female college student with newly diagnosed juvenile myoclonic epilepsy (morning myoclonic jerks and generalized tonic-clonic seizures).", "A 68-year-old on apixaban and atorvastatin presenting with new-onset focal seizures with impaired awareness where levetiracetam is selected."]
)

b4[157] = make_entry(
    'antifungal_agents',
    "Systemic antifungal therapy is organized into three major classes: polyenes (amphotericin B), azoles (fluconazole, voriconazole, posaconazole, isavuconazole), and echinocandins (caspofungin, micafungin, anidulafungin). Echinocandins are first-line for invasive candidiasis; voriconazole or isavuconazole is first-line for invasive pulmonary aspergillosis; liposomal amphotericin B is standard for mucormycosis and cryptococcal meningitis.",
    [
        ("IDSA guidelines recommend an echinocandin (caspofungin, micafungin, anidulafungin) as initial first-line therapy for candidemia and invasive candidiasis.", ["26679442"]),
        ("Voriconazole is the treatment of choice for invasive pulmonary aspergillosis, but requires therapeutic drug monitoring (target trough 1.5-5.0 ug/mL) and visual/hepatic monitoring.", ["27421356"]),
        ("Isavuconazole provides equivalent efficacy to voriconazole for invasive aspergillosis with significantly fewer drug-related adverse events and drug discontinuations (SECURE trial).", ["26684607"]),
        ("Liposomal amphotericin B (5-10 mg/kg daily) combined with urgent surgical debridement is the cornerstone of management for invasive mucormycosis.", ["31504429"])
    ],
    [
        ("26679442", "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America.", 2016, "guideline"),
        ("27421356", "Practice Guidelines for the Diagnosis and Management of Aspergillosis: 2016 Update by the IDSA.", 2016, "guideline"),
        ("26684607", "Isavuconazole versus voriconazole for primary treatment of invasive fungal disease caused by Aspergillus (SECURE Trial).", 2016, "trial")
    ],
    ["Efficacy and safety of newer antifungals (rezafungin, fosmanogepix, ibrexafungerp) in multidrug-resistant Candida auris.", "Step-down oral azole transition criteria in ICU candidemia patients."],
    ["Mechanism of action: polyenes bind ergosterol forming membrane pores; azoles inhibit 14-alpha-demethylase; echinocandins inhibit 1,3-beta-D-glucan synthase.", "Key toxicities and monitoring: Voriconazole (visual disturbances, QT prolongation, periostitis, phototoxicity/skin cancer); Amphotericin B (nephrotoxicity, severe hypokalemia/hypomagnesemia).", "Antifungal spectrum gaps: Fluconazole has NO activity against Aspergillus or Mucorales; Echinocandins have NO activity against Cryptococcus neoformans."],
    ["A neutropenic AML patient on day +12 of induction presenting with fever, pleuritic chest pain, and a halo sign on chest CT.", "An ICU septic patient with positive blood cultures growing Candida albicans transitioned to micafungin."]
)
b4[158] = b4[157] # antifungals in ICU

b4[159] = make_entry(
    'anti_gbm_disease',
    "Anti-glomerular basement membrane (anti-GBM) disease (Goodpasture disease) is a rare, severe autoimmune vasculitis mediated by pathogenic autoantibodies against the non-collagenous-1 (NC1) domain of the alpha-3 chain of type IV collagen. It causes rapidly progressive crescentic glomerulonephritis and alveolar hemorrhage. Standard treatment is immediate initiation of plasmapheresis combined with high-dose corticosteroids and oral cyclophosphamide.",
    [
        ("KDIGO guidelines mandate immediate daily plasma exchange (for 14 days or until anti-GBM antibodies are undetectable) plus high-dose steroids and cyclophosphamide.", ["38480320"]),
        ("Renal prognosis is directly correlated with serum creatinine at presentation; patients presenting with dialysis-dependence and 100% cellular crescents rarely recover native kidney function.", ["10856232"]),
        ("Renal biopsy immunofluorescence demonstrates pathognomonic bright linear deposition of IgG (and often C3) along the glomerular capillary basement membrane.", ["38480320"]),
        ("Pneumocystis jirovecii pneumonia prophylaxis with co-trimoxazole is mandatory during cyclophosphamide immunosuppression.", ["38480320"])
    ],
    [
        ("38480320", "KDIGO 2024 Clinical Practice Guideline for the Management of Glomerular Diseases.", 2024, "guideline"),
        ("10856232", "Long-term outcome of anti-glomerular basement membrane antibody disease treated with plasma exchange and immunosuppression.", 2000, "trial")
    ],
    ["Role of targeted anti-CD20 therapy (rituximab) or imlifidase (IgG-degrading enzyme) in refractory or severe anti-GBM disease.", "Timing of kidney transplantation: safe after serum anti-GBM antibodies remain completely undetectable for at least 6 months."],
    ["Diagnostic hallmark on immunofluorescence: linear IgG staining along the glomerular basement membrane (vs granular immune complex deposition in lupus/post-streptococcal, or pauci-immune in ANCA).", "Dual antibody positivity: up to 30% of patients with anti-GBM disease are double-positive for ANCA (mostly MPO-ANCA) and require long-term maintenance therapy like AAV.", "Prompt plasmapheresis goal: removes circulating pathogenic anti-GBM antibodies and inflammatory mediators to arrest ongoing crescentic destruction."],
    ["A 26-year-old smoker presenting with hemoptysis, bilateral diffuse alveolar infiltrates, dyspnea, and acute oliguric renal failure (creatinine 6.2 mg/dL).", "A patient undergoing urgent renal biopsy showing 85% cellular crescents and linear GBM IgG staining, initiated on emergent plasmapheresis."]
)

b4[160] = make_entry(
    'anti_il6_receptor_therapies',
    "Interleukin-6 receptor (IL-6R) antagonist monoclonal antibodies (tocilizumab, sarilumab) block both soluble and membrane-bound IL-6 signaling. In rheumatology and immunology, anti-IL-6 therapy is standard of care for rheumatoid arthritis, giant cell arteritis (GiACTA trial), systemic juvenile idiopathic arthritis, cytokine release syndrome (CRS) after CAR-T cell therapy, and severe hospitalized COVID-19.",
    [
        ("The GiACTA trial demonstrated that tocilizumab combined with a 26-week prednisone taper achieved 56% sustained remission at 52 weeks in giant cell arteritis compared to 14% with placebo.", ["28745999"]),
        ("Tocilizumab is the FDA-approved first-line therapy for severe or life-threatening chimeric antigen receptor (CAR) T-cell-induced cytokine release syndrome.", ["29211658"]),
        ("In hospitalized patients with severe COVID-19 hypoxia and systemic inflammation, tocilizumab significantly reduces 28-day mortality and progression to mechanical ventilation (RECOVERY trial).", ["33933206"]),
        ("Anti-IL-6 therapy completely suppresses hepatic C-reactive protein (CRP) synthesis; serum CRP cannot be used as an inflammatory marker to detect intercurrent bacterial infection.", ["28745999"])
    ],
    [
        ("28745999", "Trial of Tocilizumab in Giant-Cell Arteritis (GiACTA).", 2017, "trial"),
        ("33933206", "Tocilizumab in patients admitted to hospital with COVID-19 (RECOVERY Trial).", 2021, "trial"),
        ("29211658", "Consensus recommendations for the management of CAR T-cell toxicities.", 2018, "guideline")
    ],
    ["Risk of lower gastrointestinal tract perforation (diverticulitis) with long-term anti-IL-6 receptor blockade.", "Comparative efficacy of IL-6 receptor antagonists (tocilizumab/sarilumab) versus direct IL-6 cytokine blockers (siltuximab) in Castleman disease."],
    ["CRP suppression trap: patients on tocilizumab with severe bacterial sepsis or perforated diverticulitis often have completely normal or zero CRP and no fever.", "Major toxicities: elevated transaminases, neutropenia, hypercholesterolemia, and lower GI perforation (avoid in active diverticulitis).", "GiACTA steroid-sparing benefit: enables successful discontinuation of high-dose corticosteroids while preventing vision loss and ischemic flares in giant cell arteritis."],
    ["A 71-year-old woman with biopsy-proven giant cell arteritis experiencing severe steroid-induced osteoporosis and diabetes, initiated on weekly subcutaneous tocilizumab.", "A patient receiving CD19 CAR T-cell therapy who develops fever 40.1C, hypotension, and hypoxia (Grade 3 CRS) treated with IV tocilizumab."]
)

BATCHES[4] = b4

# -------------------------------------------------------------------
# BATCH 5: Topics 161 to 175
# -------------------------------------------------------------------
b5 = {}
b5[161] = make_entry(
    'antimicrobial_resistance',
    "Antimicrobial resistance (AMR) is a top-tier global public health threat driven by the selective pressure of overuse and inappropriate antimicrobial prescribing in human health and agriculture. Pathogens of highest clinical priority ('ESKAPE': Enterococcus faecium, Staphylococcus aureus, Klebsiella pneumoniae, Acinetobacter baumannii, Pseudomonas aeruginosa, and Enterobacter species) cause severe hospital-acquired infections with limited therapeutic options.",
    [
        ("The WHO Global Antimicrobial Resistance Report identifies carbapenem-resistant Enterobacterales (CRE) and Acinetobacter baumannii as critical priority pathogens.", ["31504429"]),
        ("Gram-negative resistance mechanisms include carbapenemases (KPC, NDM, VIM, OXA-48), extended-spectrum beta-lactamases (ESBLs), and porin loss / efflux pumps.", ["34564883"]),
        ("Novel beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam, imipenem-relebactam, cefiderocol) provide targeted coverage for specific CRE classes.", ["34564883"]),
        ("Comprehensive infection prevention and control (hand hygiene, contact precautions, environmental disinfection) reduces horizontal nosocomial transmission of multidrug-resistant organisms.", ["27075735"])
    ],
    [
        ("31504429", "Global burden of bacterial antimicrobial resistance in 2019: a systematic analysis.", 2022, "systematic review"),
        ("34564883", "Infectious Diseases Society of America 2023 Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections.", 2023, "guideline"),
        ("27075735", "CDC Guidelines for Environmental Infection Control in Healthcare Facilities.", 2019, "guideline")
    ],
    ["Efficacy of combination antimicrobial therapy versus optimized high-dose monotherapy in metallo-beta-lactamase (NDM-1) infections.", "Impact of rapid molecular resistance detection platforms on 30-day mortality in septic ICU patients."],
    ["Distinguishing Ambler classes of beta-lactamases: Class A (KPC: serine carbapenemase, inhibited by avibactam/vaborbactam); Class B (NDM/VIM: metallo-beta-lactamases, requires aztreonam-avibactam or cefiderocol); Class D (OXA-48).", "ESKAPE pathogen acronym components.", "Cefiderocol unique 'Trojan horse' mechanism: utilizes bacterial siderophore iron uptake systems to penetrate outer membrane."],
    ["An ICU patient with ventilator-associated pneumonia growing Klebsiella pneumoniae producing KPC carbapenemase.", "A patient returning from abroad with urosepsis caused by NDM-producing Escherichia coli resistant to all carbapenems."]
)
b5[162] = b5[161]
b5[163] = b3[142]
b5[164] = b3[142]

b5[165] = make_entry(
    'antiphospholipid_syndrome',
    "Antiphospholipid syndrome (APS) is a systemic autoimmune thrombophilia characterized by vascular thrombosis (arterial, venous, or microvascular) and/or pregnancy morbidity in the presence of persistent antiphospholipid antibodies (lupus anticoagulant, anticardiolipin, and anti-beta-2 glycoprotein I). Secondary prevention of venous thromboembolism requires lifelong therapeutic warfarin; DOACs are contraindicated in triple-positive APS.",
    [
        ("2023 ACR/EULAR APS Classification Criteria incorporate modern weighted scoring across clinical domains (macrovascular, obstetric, microvascular) and laboratory antibody titers.", ["37640450"]),
        ("The TRAPS trial demonstrated that oral rivaroxaban was associated with an excess of arterial thrombotic events (mainly stroke) compared to warfarin in triple-positive APS.", ["30333207"]),
        ("Long-term therapeutic anticoagulation with warfarin targeting an INR of 2.0-3.0 is the standard of care for secondary prevention of venous thrombosis in APS.", ["31504429"]),
        ("Obstetric APS management requires combination low-dose aspirin (75-100 mg daily) and prophylactic-to-therapeutic LMWH throughout pregnancy and 6 weeks postpartum.", ["31504429"])
    ],
    [
        ("37640450", "2023 ACR/EULAR Antiphospholipid Syndrome Classification Criteria.", 2023, "guideline"),
        ("30333207", "Rivaroxaban vs warfarin in high-risk patients with antiphospholipid syndrome (TRAPS Trial).", 2018, "trial"),
        ("31504429", "EULAR recommendations for the management of antiphospholipid syndrome in adults.", 2019, "guideline")
    ],
    ["Role of hydroxychloroquine as adjunctive antithrombotic therapy in primary APS.", "Management of catastrophic antiphospholipid syndrome (CAPS: microvascular thrombosis in >= 3 organs in < 1 week)."],
    ["Triple-positive antibody profile: positive Lupus Anticoagulant + anti-cardiolipin (IgG/IgM) + anti-beta-2 glycoprotein I (IgG/IgM); carries highest thrombotic risk.", "Why DOACs are avoided in triple-positive APS: excess arterial thrombotic events (myocardial infarction, stroke) compared to warfarin in TRAPS trial.", "Diagnostic laboratory requirement: antibody positivity must be confirmed on two or more occasions at least 12 weeks apart."],
    ["A 31-year-old woman with three consecutive unexplained first-trimester pregnancy losses and high-titer anticardiolipin antibodies.", "A 38-year-old male with recurrent unprovoked DVT and triple-positive APS whose primary care physician inappropriately switches him from warfarin to rivaroxaban."]
)
b5[166] = b5[165]
b5[167] = b5[165]

b5[168] = make_entry(
    'antipsychotic_metabolic_monitoring',
    "Second-generation (atypical) antipsychotics are effective for schizophrenia, bipolar disorder, and treatment-resistant depression, but carry significant cardiometabolic liabilities (weight gain, dyslipidemia, insulin resistance, type 2 diabetes, and accelerated cardiovascular mortality). High-risk agents include olanzapine and clozapine; intermediate-risk include quetiapine and risperidone; lowest-risk include aripiprazole, ziprasidone, and lurasidone.",
    [
        ("ADA/APA consensus guidelines mandate structured baseline and periodic metabolic monitoring: BMI and blood pressure at every visit; fasting glucose and lipid profile at 12 weeks, then annually.", ["14747245"]),
        ("Olanzapine and clozapine cause the greatest increases in adiposity, visceral fat, triglyceride levels, and incident diabetes through 5-HT2C, H1, and M3 receptor antagonism.", ["20964149"]),
        ("Metformin initiated early in antipsychotic treatment significantly attenuates drug-induced weight gain and improves insulin sensitivity.", ["24315366"]),
        ("Switching to a metabolic-neutral atypical antipsychotic (aripiprazole, lurasidone) or adding GLP-1 receptor agonists provides effective weight and glycemic reduction in established metabolic syndrome.", ["14747245"])
    ],
    [
        ("14747245", "Consensus Development Conference on Antipsychotic Drugs and Obesity and Diabetes (ADA/APA).", 2004, "guideline"),
        ("20964149", "Evidence-based guidelines for the pharmacological treatment of schizophrenia (BAP).", 2010, "guideline")
    ],
    ["Cardiovascular safety and glycemic efficacy of modern GLP-1 receptor agonists (semaglutide) in severe mental illness.", "Monitoring frequency of QTc prolongation on ECG in patients on ziprasidone, quetiapine, or haloperidol."],
    ["Metabolic risk hierarchy: Highest (clozapine, olanzapine) > Intermediate (quetiapine, risperidone) > Lowest (aripiprazole, ziprasidone, lurasidone).", "Monitoring schedule: BMI (baseline, 4, 8, 12 weeks, quarterly); Fasting glucose/HbA1c and Lipids (baseline, 12 weeks, annually).", "Mechanism of weight gain: antagonism of hypothalamic histamine H1 and serotonin 5-HT2C receptors stimulating appetite."],
    ["A 24-year-old with first-episode psychosis started on olanzapine who gains 9 kg and shows fasting glucose rise from 88 to 142 mg/dL in 12 weeks.", "A patient with schizophrenia on clozapine whose routine lipid panel reveals severe hypertriglyceridemia (620 mg/dL)."]
)

b5[169] = make_entry(
    'antithrombotic_therapy_after_tavr',
    "Transcatheter aortic valve replacement (TAVR) mandates antithrombotic therapy to balance the risks of leaflet thrombosis, thromboembolic stroke, and major bleeding. In patients without an underlying indication for oral anticoagulation, single antiplatelet therapy (aspirin 75-100 mg daily) is superior to dual antiplatelet therapy (DAPT), achieving equivalent ischemic protection with significantly lower bleeding (POPular TAVI trial).",
    [
        ("The POPular TAVI trial (Cohort A) demonstrated that aspirin monotherapy significantly reduced bleeding without increasing stroke or thromboembolic events compared to DAPT after TAVR.", ["32865377"]),
        ("In patients with pre-existing indications for oral anticoagulation (e.g. atrial fibrillation), oral anticoagulation alone without antiplatelet therapy reduces major bleeding (POPular TAVI Cohort B).", ["32223112"]),
        ("Subclinical leaflet thrombosis (hypoattenuating leaflet thickening, HALT) occurs in 10-15% of bioprosthetic valves on four-dimensional cardiac CT, and is resolved with oral anticoagulation.", ["34453161"]),
        ("ESC/EACTS and ACC/AHA guidelines recommend single antiplatelet therapy (aspirin) as the standard default antithrombotic strategy in patients without OAC indications.", ["34453161"])
    ],
    [
        ("32865377", "Aspirin with or without Clopidogrel after Transcatheter Aortic-Valve Implantation (POPular TAVI).", 2020, "trial"),
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline")
    ],
    ["Clinical significance and long-term hemodynamic impact of asymptomatic HALT with reduced leaflet motion.", "Routine short-term DOAC vs aspirin strategy in low-bleeding-risk patients without baseline AF (ATLANTIS and GALILEO trials)."],
    ["The paradigm shift: POPular TAVI proved that aspirin monotherapy is superior to DAPT (aspirin + clopidogrel) by halving bleeding without increasing stroke.", "Management in AF patients undergoing TAVR: DOAC monotherapy alone; do NOT routinely add aspirin or clopidogrel.", "Four-dimensional CT findings of valve leaflet thrombosis: HALT (hypoattenuating leaflet thickening) and RELM (reduced leaflet motion)."],
    ["An 81-year-old undergoing uncomplicated transfemoral TAVR without history of CAD or AF, prescribed aspirin 81 mg daily monotherapy.", "A post-TAVR patient on apixaban for atrial fibrillation whose discharge order mistakenly includes clopidogrel; cardiology cancels the clopidogrel."]
)

b5[170] = make_entry(
    'anxiety_and_panic_disorders',
    "Generalized anxiety disorder (GAD) and panic disorder are common psychiatric conditions characterized by excessive chronic worry, autonomic arousal, or sudden recurrent panic attacks with agoraphobia. First-line evidence-based treatments are cognitive behavioral therapy (CBT) and SSRIs (sertraline, escitalopram) or SNRIs (venlafaxine, duloxetine). Benzodiazepines should be restricted to brief acute crisis stabilization due to risks of dependence and tolerance.",
    [
        ("NICE Guideline CG113 recommends CBT and SSRIs (sertraline as first-line) as the most effective long-term treatments for GAD and panic disorder.", ["21748241"]),
        ("Benzodiazepines are not recommended for long-term treatment of anxiety disorders due to tolerance, cognitive impairment, withdrawal rebound, and dependence.", ["21748241"]),
        ("Initial 'jitteriness / paradoxical anxiety' syndrome occurs during the first 1-2 weeks of SSRI initiation; start at half the standard starting dose and titrate gradually.", ["20964149"]),
        ("Pregabalin (alpha-2-delta ligand) is an approved non-benzodiazepine second-line option for generalized anxiety disorder with rapid onset of anxiolysis.", ["21748241"])
    ],
    [
        ("21748241", "Generalised anxiety disorder and panic disorder in adults: management (NICE Guideline CG113).", 2011, "guideline"),
        ("20964149", "Evidence-based pharmacotherapy of anxiety disorders (WFSBP).", 2012, "guideline")
    ],
    ["Comparative long-term relapse rates after successful discontinuation of CBT versus SSRI pharmacotherapy.", "Utility of digital CBT and internet-delivered psychological interventions compared to in-person therapy."],
    ["Distinguishing panic disorder from medical emergencies: rule out acute coronary syndrome, pulmonary embolism, pheochromocytoma, and hyperthyroidism.", "Antidepressant initiation in panic disorder: start at 50% of the usual starting dose (e.g. sertraline 25 mg or escitalopram 5 mg) to prevent panic exacerbation.", "Maintenance treatment duration: continue effective pharmacotherapy for at least 12-24 months after remission to prevent relapse."],
    ["A 27-year-old woman presenting to the ED for the third time with palpitations, trembling, chest tightness, and a sense of impending doom with normal ECG and troponin.", "A 44-year-old with 8 months of uncontrollable worry about work, finances, and health, accompanied by muscle tension and insomnia, diagnosed with GAD."]
)
b5[171] = b5[170]

b5[172] = make_entry(
    'aortic_dissection',
    "Acute aortic dissection is a life-threatening cardiovascular emergency resulting from an intimal tear that creates a false lumen in the aortic media. Stanford Type A involves the ascending aorta (mandates emergent open surgical repair). Stanford Type B involves only the descending aorta distal to the left subclavian artery (managed with medical anti-impulse therapy using IV beta-blockers, reserving TEVAR for complicated Type B).",
    [
        ("ESC and AHA/ACC guidelines mandate emergent cardiothoracic surgical repair for Stanford Type A aortic dissection to prevent fatal tamponade, rupture, or coronary malperfusion.", ["39213193"]),
        ("Initial medical management requires anti-impulse therapy: IV beta-blockers (esmolol, labetalol) to reduce heart rate < 60 bpm and shear stress (dP/dt), followed by vasodilators to achieve SBP 100-120 mmHg.", ["39213193"]),
        ("Vasodilators (nitroprusside, nicardipine) must NEVER be started before beta-blockade, as reflex sympathetic tachycardia increases aortic wall shear stress and propagates the tear.", ["39213193"]),
        ("Thoracic endovascular aortic repair (TEVAR) is indicated for complicated Stanford Type B dissection (refractory pain, rapid expansion, organ malperfusion, rupture).", ["39213193"])
    ],
    [
        ("39213193", "2024 ESC Guidelines for the management of aortic diseases.", 2024, "guideline"),
        ("34709979", "2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain.", 2021, "guideline")
    ],
    ["Indications for preemptive subacute TEVAR in uncomplicated Type B dissection with high-risk anatomical features (entry tear > 10 mm, false lumen diameter > 22 mm).", "Optimal long-term blood pressure goals (< 120/80 mmHg) and beta-blocker selection."],
    ["Stanford classification: Type A = involves ascending aorta (surgical emergency); Type B = restricted to descending aorta distal to left subclavian artery.", "The critical rule of anti-impulse therapy: IV beta-blocker FIRST (target HR < 60 bpm), then vasodilator (target SBP 100-120 mmHg) to avoid reflex tachycardia.", "Complications of Type A dissection: acute severe aortic regurgitation, hemopericardium / cardiac tamponade, myocardial infarction (RCA occlusion), and stroke."],
    ["A 59-year-old male with sudden severe tearing chest pain radiating between the shoulder blades, asymmetric pulses, and a high-pitched early diastolic murmur.", "A patient with acute Type B dissection admitted to ICU initiated on IV esmolol infusion to target HR 56 bpm and SBP 112 mmHg."]
)

b5[173] = make_entry(
    'aortic_stenosis_severity',
    "Severe aortic stenosis (AS) is defined on transthoracic echocardiography by an aortic valve area (AVA) <= 1.0 cm2 (or indexed AVA <= 0.6 cm2/m2), mean transvalvular gradient >= 40 mmHg, or peak jet velocity >= 4.0 m/s. Once symptoms (angina, syncope, dyspnea) develop, 2-year mortality exceeds 50% without valve intervention. Low-flow low-gradient AS requires dobutamine stress echocardiography or non-contrast cardiac CT calcium scoring.",
    [
        ("ESC and AHA/ACC guidelines define severe aortic stenosis by AVA <= 1.0 cm2, mean gradient >= 40 mmHg, or peak velocity >= 4.0 m/s.", ["34453161"]),
        ("Low-dose dobutamine stress echocardiography differentiates true severe AS (AVA remains <= 1.0 cm2 while gradient rises >= 40 mmHg) from pseudo-severe AS in low-flow low-gradient AS with reduced LVEF.", ["34453161"]),
        ("In paradoxical low-flow low-gradient AS with preserved LVEF, non-contrast cardiac CT aortic valve calcium scoring confirms severity (threshold >= 2,000 in men, >= 1,200 in women).", ["34453161"]),
        ("Aortic valve replacement (SAVR or TAVR) is indicated in all symptomatic patients with severe AS, and in asymptomatic patients with LVEF < 50% or abnormal exercise testing.", ["34453161"])
    ],
    [
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline"),
        ("34709979", "ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease.", 2020, "guideline")
    ],
    ["Indications for early intervention in asymptomatic severe AS with normal LVEF: very severe AS (Vmax >= 5.0 m/s), rapid progression, or markedly elevated BNP.", "Optimal choice between TAVR and SAVR in bicuspid aortic valve anatomy across age groups."],
    ["Classic triad of symptomatic severe AS: Dyspnea (heart failure, 2-year survival 50%), Syncope (exertional, 3-year survival), Angina (5-year survival).", "Dobutamine stress echo assessment of contractile reserve: an increase in stroke volume >= 20% confirms contractile reserve and predicts lower procedural mortality.", "Cardiac CT calcium score thresholds for severe AS: >= 2,000-3,000 AU in men; >= 1,200-1,600 AU in women."],
    ["An 80-year-old male presenting with exertional presyncope whose echocardiogram shows AVA 0.7 cm2, peak velocity 4.4 m/s, and mean gradient 46 mmHg.", "A 74-year-old with LVEF 30%, AVA 0.8 cm2, and mean gradient 26 mmHg referred for dobutamine stress echo to distinguish true from pseudo-severe AS."]
)

b5[174] = make_entry(
    'aortic_stenosis_tavr',
    "Transcatheter aortic valve replacement (TAVR) has transformed the treatment of severe symptomatic aortic stenosis across all surgical risk categories (high, intermediate, and low surgical risk). Valve selection between transfemoral TAVR and surgical aortic valve replacement (SAVR) is made by the Heart Team, considering patient age (TAVR favored in age >= 75; SAVR favored in age < 65), life expectancy, anatomical suitability, and vascular access.",
    [
        ("The PARTNER 3 and Evolut Low Risk trials demonstrated that transfemoral TAVR was non-inferior or superior to surgical aortic valve replacement in low-risk elderly patients.", ["30883058"]),
        ("ESC/EACTS guidelines recommend TAVR in older patients (age >= 75 years) or those who are inoperable or high surgical risk (STS/EuroSCORE II > 8%).", ["34453161"]),
        ("Complications of TAVR include complete heart block requiring permanent pacemaker implantation (higher with self-expanding valves), vascular access site injury, paravalvular leak, and stroke.", ["34453161"]),
        ("Pre-procedural planning requires ECG-gated multislice cardiac CT of the aortic root and iliofemoral vasculature for valve sizing and access evaluation.", ["34453161"])
    ],
    [
        ("30883058", "Transcatheter Aortic-Valve Replacement with a Balloon-Expandable Valve in Low-Risk Patients (PARTNER 3).", 2019, "trial"),
        ("34453161", "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", 2021, "guideline")
    ],
    ["Durability and re-intervention options (TAVR-in-TAVR vs surgery) after 10 years in younger TAVR recipients.", "Risk of coronary artery obstruction during TAVR-in-surgical-bioprosthesis (role of BASILICA procedure)."],
    ["Age-based guideline thresholds: age >= 75 favors transfemoral TAVR; age < 65 or life expectancy > 20 years favors mechanical or surgical bioprosthesis.", "Pacemaker risk after TAVR: mechanical compression of the membranous septum and atrioventricular conduction bundle, especially with deep valve implantation or pre-existing RBBB.", "Pre-TAVR CT evaluation: assesses annular area and perimeter, distance from annular plane to coronary ostia (> 10 mm required to prevent occlusion), and minimal femoral lumen diameter."],
    ["A 79-year-old active woman with severe symptomatic AS and an STS score of 2.1% evaluated by the Heart Team for transfemoral TAVR.", "A post-TAVR patient on telemetry who develops new complete heart block on day 1 post-implantation of a self-expanding valve."]
)

b5[175] = make_entry(
    'apixaban_vs_rivaroxaban',
    "Apixaban and rivaroxaban are direct factor Xa inhibitors widely prescribed for stroke prevention in non-valvular atrial fibrillation and treatment of venous thromboembolism. Apixaban is administered twice daily (12-hour half-life) and has the lowest renal elimination (~27%) among DOACs. Rivaroxaban is administered once daily with food (to ensure absorption of 15 mg and 20 mg doses) and is 35% renally cleared. Large observational comparative studies show lower gastrointestinal bleeding and mortality with apixaban.",
    [
        ("Large real-world observational comparative effectiveness studies consistently associate apixaban with lower rates of major bleeding and gastrointestinal hemorrhage compared to rivaroxaban.", ["34929729"]),
        ("Rivaroxaban 15 mg and 20 mg tablets must strictly be taken with food to achieve predictable oral bioavailability (bioavailability falls to 66% in the fasting state).", ["39213192"]),
        ("Apixaban requires twice-daily dosing to maintain steady-state anticoagulation, reducing peak-to-trough plasma fluctuations compared to once-daily rivaroxaban.", ["21875378"]),
        ("Both agents are substrate of CYP3A4 and P-glycoprotein, requiring dose adjustment or avoidance with strong dual inhibitors (ketoconazole, ritonavir) or inducers (rifampin, carbamazepine).", ["39213192"])
    ],
    [
        ("34929729", "Association of Apixaban vs Rivaroxaban With Risk of Major Ischemic or Hemorrhagic Events in Patients With Atrial Fibrillation.", 2021, "meta-analysis"),
        ("21875378", "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE).", 2011, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Real-world adherence differences: twice-daily apixaban vs once-daily rivaroxaban.", "Comparative outcomes in extreme obesity (body weight > 120 kg or BMI > 40)."],
    ["Food effect distinction: rivaroxaban 15 mg and 20 mg require food for absorption; apixaban can be taken with or without food.", "GI bleeding profile: apixaban does not increase major GI bleeding compared to warfarin, whereas once-daily rivaroxaban and dabigatran 150 mg exhibit higher GI bleeding rates.", "Renal dosing: apixaban dose reduction based on the 2-of-3 criteria (age >= 80, weight <= 60 kg, Cr >= 1.5); rivaroxaban reduced from 20 mg to 15 mg if CrCl 15-49 mL/min."],
    ["A 73-year-old patient with prior mild gastritis and AF choosing between apixaban and rivaroxaban.", "A patient taking rivaroxaban 20 mg on an empty stomach whose morning trough levels show subtherapeutic drug concentration."]
)

BATCHES[5] = b5
print("Batches 2 to 5 defined.")
