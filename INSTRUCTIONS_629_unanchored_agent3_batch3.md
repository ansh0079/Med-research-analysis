# Agent 3 Instructions: Build Verbatim-Anchored Synopses for Batch 3 of 3 (629 Unanchored Topics)

Prepared 2026-11-25 from `C:\Users\ansh0\Downloads\Topics_with_unanchored_published_page_629_2026-11-25.xlsx` cross-checked against `database\app.db`.

## 1. Assignment Summary & Why You Are Doing This

All 629 topics in the source workbook currently have a **published learner page (`topic_knowledge`) that is unanchored** (0 per-claim `evidence_anchors`), even though **627/629 already have full-text evidence stored in `database\app.db` (`guideline_documents.full_text`)** and 623/629 already have MCQs.

- **Your Batch (`Batch 3 of 3`):** **209 total topics**
  - **`154` `BUILD` topics** (in Section 5 below): Have valid stored full text in `database\app.db` and **no** replacement draft yet. Total stored text across your `154` documents: `11,933,147` chars (`34` large docs `>=100k` chars). Build in ascending `Stored Chars` order (smallest first).
  - **`55` `SKIP` topics** (in Section 6 below): Either already have a `Better draft ready = yes` replacement on prod or are flagged `needs_external_evidence` (off-topic document). **Do NOT build these unless explicitly instructed.**

## 2. Mandatory Rules (Do Not Relax)

1. **Stored document only.** Your synopsis and every recommendation must rest **100% on the stored `full_text`** of the assigned `Doc ID` in `database\app.db` (`guideline_documents`). No outside medical memory, no abstracts, no cloud LLM calls. If the stored text does not say it, do not include it.
2. **Topic-to-document fit check.** Before building, check the topic name against the stored document title/text:
   - **Full fit:** Covers the topic directly -> build complete synopsis + all recommendations.
   - **Partly fits:** Covers only part of the topic -> note `partly` in hand-back notes, state scope limitations in the synopsis, and build only what the document supports.
   - **Off-topic / Fit error:** Document is unrelated to the topic -> mark `fit_error` in hand-back notes and **do not build**.
3. **Synopsis = all recommendations of the most relevant guideline.**
   - Write a **4 to 6 sentence** cohesive `## Synopsis (gist)` synthesizing the core clinical recommendations from the stored text only.
   - Under `## All recommendations...`, list **every applicable recommendation** from the document (never a cherry-picked subset). For massive multi-topic guidelines (`>150k` chars), apply the **multi-topic section rule**: cover 100% of recommendations in the sections matching the topic name, and list excluded sections in your hand-back notes.
4. **Verbatim Anchor Rule (Critical).** Every single recommendation must have an exact verbatim substring `*Anchor:* "..."` of **40 to 130 characters** that matches `re.sub(r'\s+', ' ', full_text).strip()` in the stored document. Preserve PDF artefacts (hyphen breaks like `pros- tate`, symbols, spacing) **exactly as they appear**.
5. **Preserve source grading & recommendation verbs.** Carry through Class of Recommendation (COR), Level of Evidence (LOE), GRADE strength (e.g., `GRADE 1A`, `strong recommendation, moderate quality of evidence`), and exact modal verbs (`recommend`, `suggest`, `may be considered`). Never upgrade or downgrade.
6. **MCQs:** Since 623/629 topics already have evidence-verified MCQs in `app.db`, your **primary deliverable is the Synopsis + Verbatim-Anchored Recommendations**. If you also build MCQs for any topic lacking them, provide 8–10 MCQs with verbatim quotes (`<=300` chars), `<=30%` strictly-longest correct options, and A–D spread (`<=40%` per letter).
7. **Do NOT publish or mutate `database\app.db`.** Save records as `.md` files in your assigned output folder (e.g., `C:\Users\ansh0\Downloads\Common257_records_629_agent3\`) and produce a hand-back summary table. Loading happens later via `scripts/load_offline_pack.js` (dry run first, then `--apply` as `needs_review`).

## 3. How to Extract Stored Full Text & Verify Anchors (Read-Only)

Use this read-only Python snippet to fetch the exact stored full text for any `Doc ID` from `database\app.db` and verify every anchor:

```python
import sqlite3, re

DB = r"file:c:\Users\ansh0\OneDrive\Documents\medical research analysis\database\app.db?mode=ro"
conn = sqlite3.connect(DB, uri=True)
norm = lambda s: re.sub(r'\s+', ' ', s or '').strip()

def get_doc_text(doc_id: int) -> str:
    row = conn.execute('SELECT full_text FROM guideline_documents WHERE id = ?', (doc_id,)).fetchone()
    return norm(row[0]) if row and row[0] else ''

def verify_anchor(anchor: str, doc_text: str) -> bool:
    a = norm(anchor)
    return 40 <= len(a) <= 130 and a in doc_text
```

You can also reuse `C:\Users\ansh0\Downloads\Common257_builder_tools\` (`rec_builder.py`, `run_build.py`, `pack_lead.py`, `clearance_dry.js`) if helpful.

## 4. Model Answers (Follow This Exact Standard)

### Model Answer A — Standard Clinical Practice Guideline (`C257_CAP_ATS_IDSA_2019.md`, `doc_id = 1770`)

```markdown
# Community-acquired pneumonia: evidence record (Common 257 build, not published)

**Lead guideline:** Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America (2019), full text from 1770.txt (document id 1770). Read in full from the stored text.

**Topics this record serves:** Atypical pneumonia pathogens: Mycoplasma, Chlamydophila, Q fever (Coxiella): diagnosis and treatment; Aspiration Pneumonia

## Synopsis (gist)

The 2019 ATS/IDSA clinical guideline provides comprehensive, evidence-based recommendations on diagnostic evaluation, site-of-care triage, and antimicrobial management for community-acquired pneumonia (CAP) in adults. Initial empiric antibiotic therapy should be started immediately in suspected and radiographically confirmed CAP regardless of baseline serum procalcitonin levels, using the Pneumonia Severity Index (PSI) preferentially over CURB-65 to guide inpatient versus outpatient triage. For healthy outpatients without comorbidities or resistance risk, recommended empiric coverage includes amoxicillin 1 g three times daily, doxycycline 100 mg twice daily, or macrolides in regions with low pneumococcal resistance, which reliably cover atypical pneumonia pathogens (Mycoplasma pneumoniae, Chlamydophila pneumoniae, and Legionella). For inpatients with nonsevere CAP without MRSA or Pseudomonas risk, recommended regimens comprise combination therapy with a beta-lactam and a macrolide or monotherapy with a respiratory fluoroquinolone (levofloxacin 750 mg daily or moxifloxacin 400 mg daily). For suspected aspiration pneumonia, routine additional anaerobic coverage is explicitly not recommended unless cavitary lung necrosis, lung abscess, or pleural empyema is present. Routine adjunctive corticosteroids are advised against in nonsevere CAP, the prior categorization of healthcare-associated pneumonia (HCAP) is abandoned, and total antimicrobial duration should be guided by clinical stability for a minimum total of 5 days.

## All recommendations of the lead guideline (13 statements)

1. [Question 1: Sputum Gram Stain and Culture] We recommend not obtaining sputum Gram stain and culture routinely in adults with CAP managed in the outpatient setting (strong recommendation, very low quality of evidence).
   *Anchor:* "We recommend not obtaining sputum Gram stain and culture routinely in adults with CAP managed in the outpatient setting"
2. [Question 5: Procalcitonin and Antibiotic Initiation] We recommend that empiric antibiotic therapy should be initiated in adults with clinically suspected and radiographically confirmed CAP regardless of initial serum procalcitonin level (strong recommendation, moderate quality of evidence).
   *Anchor:* "We recommend that empiric antibiotic therapy should be initiated in adults with clinically suspected"
3. [Question 6: Site-of-Care Prediction Rule] In addition to clinical judgement, we recommend that clinicians use a validated clinical prediction rule for prognosis, preferentially the Pneumonia Severity Index (PSI) over the CURB-65.
   *Anchor:* "clinicians use a validated clinical prediction rule for prognosis, preferentially the Pneumonia Severity Index (PSI)"
4. [Question 10: Anaerobic Coverage in Aspiration Pneumonia] We suggest not routinely adding anaerobic coverage for suspected aspiration pneumonia unless lung abscess or empyema is suspected (conditional recommendation, very low quality of evidence).
   *Anchor:* "We suggest not routinely adding anaerobic coverage for suspected aspiration pneumonia unless lung abscess or empyema is suspected"
5. [Question 12: Corticosteroids in Nonsevere CAP] We recommend not routinely using corticosteroids in adults with nonsevere CAP (strong recommendation, high quality of evidence).
   *Anchor:* "We recommend not routinely using corticosteroids in adults with nonsevere CAP"
```

---

### Model Answer B — Graded Position Paper / Multi-Section Guideline (`C257_B6L_DOAC_2025_ANZ_position_paper.md`, `doc_id = 2374`)

```markdown
# Direct oral anticoagulants: dabigatran, rivaroxaban, apixaban, reversal agents: evidence record (Common 257 batch 6, not published)

**Lead guideline:** Tran HA, Merriman E, Baker R, Curnow J, Young L, Tan CW, McRae S, Chunilal SD. 2025 Guidelines for direct oral anticoagulants: a practical guidance on the prescription, laboratory testing, peri-operative and bleeding management (Intern Med J 2025;55:1174-1183), endorsed by the Thrombosis and Haemostasis Society of Australia and New Zealand (THANZ), stored document id 2374. Read in full from the stored text.

**Topics this record serves:** Direct oral anticoagulants: dabigatran, rivaroxaban, apixaban, reversal agents

## Synopsis (gist)

This 2025 Australian and New Zealand position paper, endorsed by THANZ, gives graded practical guidance on prescribing, laboratory testing, peri-operative interruption and bleeding management for the direct oral anticoagulants apixaban, rivaroxaban and dabigatran. DOACs are indicated for prevention of stroke and systemic embolism in atrial fibrillation, chronic stable atherosclerotic disease, treatment of new deep vein thrombosis and pulmonary embolism, secondary prevention of VTE, and prevention of venous thrombosis in hip and knee arthroplasty (GRADE 1A), and they do not routinely require laboratory monitoring (GRADE 1A). For dabigatran-related uncontrolled bleeding or urgent procedures idarucizumab rapidly and safely reverses the anticoagulant effect (GRADE 1B), and for life-threatening apixaban- or rivaroxaban-related bleeding andexanet effectively reduces anticoagulant effects (GRADE 2B), while four-factor and activated prothrombin complex concentrates can improve haemostasis and tranexamic acid can be used as an adjunct (GRADE 2C). Activated charcoal should be considered in moderate to severe bleeding within 2 hours of the last dose (GRADE 2C), and reversal agents are unlikely to improve outcome when dabigatran levels are below 50 ng/mL or apixaban or rivaroxaban levels below 75 ng/mL (GRADE 2C). Peri-operatively, apixaban and rivaroxaban can be interrupted 1-2 days and dabigatran 2-4 days before procedures depending on renal function, heparin bridging is not indicated, and therapeutic doses can be resumed 48-72 h after a procedure (GRADE 1B); for neuraxial anaesthesia factor Xa inhibitors are interrupted for 72 h and dabigatran for 96 h when creatinine clearance is 30-50 mL/min (GRADE 1B).

## All recommendations of the lead guideline (14 statements selected from the consensus text)

1. DOACs are indicated for the prevention of stroke and systemic embolism in patients with atrial fibrillation (AF), chronic stable atherosclerotic disease, the treatment of new deep vein thrombosis and pulmonary embolism, and secondary prevention of VTE, as well as the prevention of venous thrombosis in hip and knee arthroplasty. (GRADE 1A)
   *Anchor:* "DOACs are indicated for the prevention of stroke and systemic embolism in patients with atrial fibrillation (AF), chronic"
2. Idarucizumab can be administered to patients with uncontrolled bleeding related to dabigatran or prior to an urgent procedure as it rapidly and safely reverses the anticoagulant effect and achieves adequate haemostasis. (GRADE 1B)
   *Anchor:* "Idarucizumab can be administered to patients with uncontrolled bleeding related to dabigatran or prior to an urgent"
3. Four-factor prothrombin complex concentrates (4F-PCC) and activated prothrombin complex concentrates (FEIBA) can improve haemostasis in patients with life-threatening and uncontrolled bleeding related to apixaban and rivaroxaban. (GRADE 2C)
   *Anchor:* "Four-factor prothrombin complex concentrates (4F-PCC) and activated prothrombin complex concentrates (FEIBA) can improve"
4. Perioperative bridging with heparin is not indicated because of the short half-lives and rapid onset of action of the DOACs. (GRADE 1B)
   *Anchor:* "Perioperative bridging with heparin is not indicated because of the short half-lives and rapid onset of action of the DOACs."
```


## 5. Your Build Worklist — Batch 3 (154 Topics, Sorted Smallest Document First)

| # | Topic | Curriculum ID | Doc ID | PMID | Stored Chars | Doc Type | Primary Stored Document Title |
|---:|---|---:|---:|---|---:|---|---|
| 1 | Bone metastases denosumab and zoledronic acid | 270 | 3588 | 17878149 | 1,847 | landmark_trial | Zoledronic acid and clinical fractures and mortality after hip fracture |
| 2 | Capsule Endoscopy | 305 | 1257 | 36423618 | 2,848 | Small-bowel capsule endos... | Small-bowel capsule endoscopy and device-assisted enteroscopy for diagnosis and tr... |
| 3 | ICU renal replacement therapy initiation timing | 904 | 2648 | 30560582 | 5,715 | systematic-review | Timing of renal replacement therapy initiation for acute kidney injury. |
| 4 | Renal replacement therapy timing in acute kidney injury | 1527 | 2648 | 30560582 | 5,715 | systematic-review | Timing of renal replacement therapy initiation for acute kidney injury. |
| 5 | Orbital and periorbital cellulitis: classification and management | 1236 | 4155 | 33908631 | 7,856 | systematic_review | Corticosteroids for periorbital and orbital cellulitis |
| 6 | Bronchoscopic Lung Volume Reduction | 286 | 3347 | 28230230 | 7,860 | systematic_review | Bronchoscopic lung volume reduction procedures for chronic obstructive pulmonary d... |
| 7 | Amegakaryocytic Thrombocytopenia | 118 | 5157 | 39372144 | 15,815 | tier_1_guideline | Management of Acquired Amegakaryocytic Thrombocytopenia and Severe Coronary Artery... |
| 8 | Cardiac myxoma: clinical features, embolism risk, surgical excision | 313 | 4987 | 25900256 | 16,544 | guideline | Risk Factors for Embolism in Cardiac Myxoma: A Retrospective Analysis |
| 9 | Rh Alloimmunisation Management | 1542 | 5035 | 17245442 | 17,036 | guideline | Alloimmunisation to Donor Antigens and Immune Rejection Following Foetal Neural Gr... |
| 10 | Adult-onset Stills disease AOSD: quotidian fever, salmon rash, ferritin, IL-1 inhi... | 89 | 3746 |  | 17,808 | clinical_practice_guideline | THU0569 MANAGEMENT OF ADULT-ONSET STILL'S DISEASE (AOSD) WITH IL-1 INHIBITORS: EVI... |
| 11 | Acute Phosphate Nephropathy | 68 | 5931 | 42553916 | 19,413 | review/article | Acute Phosphate Nephropathy Following Oral Sodium Phosphate Bowel Preparation. |
| 12 | Intra-articular injections in OA: corticosteroids, hyaluronic acid, PRP: evidence ... | 966 | 3159 | 34485586 | 19,765 | systematic-review | A Systematic Review of Current Clinical Practice Guidelines on Intra-articular Hya... |
| 13 | Lateral epicondylitis (tennis elbow): assessment and management | 1004 | 5011 | 22629225 | 21,019 | guideline | Comparison of Effectiveness of Supervised Exercise Program and Cyriax Physiotherap... |
| 14 | hypocalcaemia | 885 | 4125 | 33196630 | 21,604 | systematic_review_or_meta... | Hypocalcemia in trauma patients: A systematic review |
| 15 | Corticobasal degeneration: asymmetric alien limb phenomenon, tau pathology | 463 | 4184 | 24521567 | 21,984 | guideline_or_consensus | Validation of the new consensus criteria for the diagnosis of corticobasal degener... |
| 16 | triple inhaler therapy | 1778 | 2976 | 37489386 | 22,110 | review | Open and Closed Triple Inhaler Therapy in Patients with Uncontrolled Asthma. |
| 17 | Oesophageal Perforation | 1226 | 4233 | 39092389 | 23,104 | systematic_review_or_meta... | The Management of Esophageal Perforation: A Systematic Review |
| 18 | Tricuspid regurgitation TEER | 1776 | 4227 | 34767705 | 23,115 | landmark_trial | Concomitant Tricuspid Repair in Patients with Degenerative Mitral Regurgitation |
| 19 | MS initial presentation | 1146 | 5117 | 42926963 | 25,935 | tier_1_guideline | First Presentation With Impending Cardiac Tamponade Leading to a New Diagnosis of ... |
| 20 | Septic Arthritis | 1586 | 2787 | 42675535 | 26,305 | meta-analysis | Outcomes of total joint arthroplasty in patients with a history of native hip or k... |
| 21 | Septic arthritis: diagnosis, Gram stain, joint aspiration, empirical antibiotics, ... | 1587 | 5974 | 36756304 | 26,833 | SANJO 2023 | Guideline for management of septic arthritis in native joints (SANJO) |
| 22 | ORAL Surveillance trial: cardiovascular safety of tofacitinib vs TNFi in RA | 1235 | 4781 | 24891437 | 26,880 | Recovered MCQ evidence | FIND-CKD: a randomized trial of intravenous ferric carboxymaltose versus oral iron... |
| 23 | liver transplant referral | 1021 | 4164 | 38345405 | 27,467 | systematic_review_or_meta... | Novel indications for referral and care for simultaneous liver kidney transplant r... |
| 24 | Interstitial Nephritis: Acute and Chronic | 960 | 2995 | 35488310 | 27,826 | systematic review | 5-ASA induced interstitial nephritis in patients with inflammatory bowel disease: ... |
| 25 | Renal Transplantation: Workup and Donor Selection | 1528 | 3088 | 42866756 | 28,604 | meta-analysis | Outcomes of renal transplantation in Africa: a systematic review and meta-analysis. |
| 26 | Inclisiran for LDL cholesterol lowering | 923 | 2661 | 39640378 | 28,775 | review | Inclisiran for the treatment of hypercholesterolaemia. |
| 27 | Nephrogenic Diabetes Insipidus | 1178 | 4818 | 39845881 | 28,947 | Recovered MCQ evidence | Central and nephrogenic diabetes insipidus: updates on diagnosis and management. |
| 28 | intensive glucose lowering type 2 diabetes | 953 | 4129 | 21791495 | 28,949 | systematic_review_or_meta... | Effect of intensive glucose lowering treatment on all cause mortality, cardiovascu... |
| 29 | Critical illness polyneuropathy and myopathy: diagnosis and rehabilitation | 477 | 2653 | 41458822 | 29,698 | systematic-review | Immune-Mediated Necrotizing Myopathy: A Systematic Review of Antibody-Specific Mec... |
| 30 | Immune Thrombocytopenia | 920 | 5004 | 34379914 | 29,755 | guideline | Clinical Features of Vaccine-Induced Immune Thrombocytopenia and Thrombosis. |
| 31 | Herpes simplex, impetigo and common skin infections | 817 | 3584 | 36712177 | 30,784 | guideline | Ideal Features of Topical Antibiotic Therapy for the Treatment of Impetigo: An Ita... |
| 32 | Chemotherapy-induced nausea antiemetic prophylaxis | 361 | 3659 | 23549581 | 31,015 | landmark_trial | Effect of duloxetine on pain, function, and quality of life among patients with ch... |
| 33 | Lyme Arthritis | 1041 | 4179 | 36116835 | 31,591 | systematic_review | Lyme Arthritis |
| 34 | Brucellosis: occupational exposure, serology, doxycycline-rifampicin combination, ... | 287 | 1353 | 28954065 | 31,784 | guideline_or_consensus | Guidelines for the management of human brucellosis in the State of Paraná, Brazil. |
| 35 | Acromegaly somatostatin analog therapy | 13 | 4824 | 38828555 | 32,351 | Recovered MCQ evidence | Acromegaly Disease Control Maintained After Switching From Injected Somatostatin R... |
| 36 | antiepileptic drug choice | 156 | 3724 |  | 32,380 | clinical_practice_guideline | Clinical guideline: antiepileptic drugs of choice for epileptic syndromes and epil... |
| 37 | Osteomalacia and Rickets | 1246 | 5029 | 28612338 | 33,112 | guideline | Nutritional Rickets and Osteomalacia in the Twenty-first Century: Revised Concepts... |
| 38 | multiple sclerosis | 1156 | 5080 | 37667181 | 33,202 | tier_1_guideline | Impact of menopause on relapse rate and disability level in patients with multiple... |
| 39 | Sarcoidosis systemic immunosuppression | 1557 | 2724 | 39044038 | 33,626 | meta-analysis | Meta-analysis of [<sup>18</sup>F]FDG-PET/CT in pulmonary sarcoidosis |
| 40 | Resistant hypertension renal denervation | 1535 | 2760 | 42601755 | 33,907 | meta-analysis | Blood pressure and renal outcomes after renal denervation in patients with chronic... |
| 41 | Source control in sepsis: timing and surgical indications | 1637 | 4222 | 39035625 | 34,973 | systematic_review_or_meta... | Importance of timely and adequate source control in sepsis and septic shock |
| 42 | Central Nervous System Vasculitis (PACNS): digital subtraction angiography, cyclop... | 349 | 3491 | 41112399 | 35,094 | systematic_review | Tumefactive primary angiitis of the central nervous system mimicking glioblastoma:... |
| 43 | Hip fracture management and perioperative optimisation | 824 | 3587 | 39909977 | 35,467 | guideline | Defining optimal orthogeriatric hip fracture care: a delphi consensus approach |
| 44 | nivolumab ipilimumab advanced melanoma overall survival | 1195 | 3398 | 28889792 | 35,623 | landmark_trial | Overall Survival with Combined Nivolumab and Ipilimumab in Advanced Melanoma |
| 45 | Systemic sclerosis: limited vs diffuse, antitopoisomerase vs anticentromere antibo... | 1700 | 4470 | 40725689 | 36,152 | alternate_open_access | Rheumatologists' Adherence to EULAR Recommendations for Systemic Sclerosis Treatme... |
| 46 | Osteoarthritis: pathophysiology, risk factors, radiographic grading, pharmacologic... | 1245 | 4661 | 42129958 | 36,308 | guideline | Synovial Fluid Proteomic Biomarkers in Knee Osteoarthritis: A Systematic Review an... |
| 47 | Aplastic anaemia: immunosuppression with ATG and eltrombopag | 179 | 4646 | 37168802 | 37,636 | guideline | The efficacy and the safety of eltrombopag in pediatric patients with severe aplas... |
| 48 | Schistosomiasis and helminth infections: praziquantel, albendazole, tropical splen... | 1559 | 5359 | 24698483 | 38,023 | guideline | Human schistosomiasis. |
| 49 | Acute cholecystitis and ascending cholangitis: Tokyo Guidelines management | 30 | 2246 |  | 38,694 | guideline | International Delphi consensus on the management of percutaneous choleystostomy in... |
| 50 | Stable coronary disease invasive strategy | 1652 | 455 | 32227755 | 39,371 | randomized_controlled_trial | Initial Invasive or Conservative Strategy for Stable Coronary Disease. |
| 51 | Calcium Pyrophosphate Deposition Disease | 294 | 2351 | 40086154 | 41,091 | guideline | Core domain set for chronic and/or recurrent manifestations of calcium pyrophospha... |
| 52 | Acalculous Cholecystitis | 7 | 2493 |  | 41,281 | guideline | Acute Acalculous Cholecystitis review |
| 53 | Anorectal Disorders | 138 | 3469 | 25828100 | 41,815 | guideline | ANMS-ESNM position paper and consensus guidelines on biofeedback therapy for anore... |
| 54 | Air embolism: venous vs arterial, Trendelenburg positioning, hyperbaric oxygen | 94 | 4976 | 22309812 | 42,242 | guideline | Systemic air embolism during percutaneous core needle biopsy of the lung: frequenc... |
| 55 | Spondylolysis and Spondylolisthesis | 1642 | 2820 | 38050599 | 43,112 | review | Management of low back pain accompanying sagittal plane pathologies in children: S... |
| 56 | Central line-associated bloodstream infection (CLABSI): prevention and management | 346 | 4428 | 42028143 | 43,126 | guideline | Practice guideline on the prevention and treatment of central line-associated bloo... |
| 57 | Stevens-Johnson syndrome | 1665 | 2833 | 42719430 | 43,765 | systematic review | The Multiorgan Complications of Stevens-Johnson Syndrome and Toxic Epidermal Necro... |
| 58 | toxic epidermal necrolysis | 1755 | 2833 | 42719430 | 43,765 | systematic review | The Multiorgan Complications of Stevens-Johnson Syndrome and Toxic Epidermal Necro... |
| 59 | Retroperitoneal Sarcoma and Rare Sarcomas | 1540 | 5297 | 33852100 | 44,311 | guideline | Management of Primary Retroperitoneal Sarcoma (RPS) in the Adult: An Updated Conse... |
| 60 | acute otitis media | 63 | 1713 |  | 44,428 | guideline | Clinical practice guidelines for acute otitis media in children a systematic revie... |
| 61 | Nephrolithiasis: Calcium Stones | 1179 | 4097 | 34977512 | 45,470 | randomized_controlled_trial | Fresh lemon juice supplementation for the prevention of recurrent stones in calciu... |
| 62 | Haemodialysis Complications | 760 | 4997 | 26589425 | 45,693 | guideline | Epidemiology of haemodialysis catheter complications: a survey of 865 dialysis pat... |
| 63 | enalapril ACE inhibitor survival reduced left ventricular ejection fraction | 617 | 4321 | 30371293 | 47,152 | randomized_controlled_trial | Comparison of Angiotensin‐Converting Enzyme Inhibitor and Angiotensin Receptor Blo... |
| 64 | Antithrombotic therapy after TAVR | 169 | 4956 | 32175228 | 47,393 | Recovered MCQ evidence | Transcatheter aortic valve replacement in low risk patients: a review of PARTNER 3... |
| 65 | Abatacept in RA: T-cell co-stimulation blockade, seropositive advantage, safety pr... | 2 | 3635 | 42135532 | 47,980 | landmark_trial | Abatacept versus hydroxychloroquine for prevention of rheumatoid arthritis in indi... |
| 66 | Anal Canal Cancer | 124 | 1427 | 37504978 | 48,142 | guideline | Nordic anal cancer (NOAC) group consensus guidelines for risk-adapted delineation ... |
| 67 | Cardiopulmonary Exercise Testing | 324 | 3483 | 22952317 | 49,327 | guideline | EACPR/AHA Scientific Statement. Clinical recommendations for cardiopulmonary exerc... |
| 68 | Acute severe asthma | 74 | 2015 |  | 49,328 | guideline | Guideline on management of the acute asthma attack in children by Italian Society ... |
| 69 | Drug-Induced ILD | 573 | 1570 | 41810839 | 49,841 | guideline | Prevention and management of gastrointestinal side effects in patients with system... |
| 70 | Non-alcoholic fatty liver disease NAFLD: insulin resistance link, FIB-4 score, man... | 1198 | 5028 | 29936596 | 50,030 | guideline | Molecular mechanisms of hepatic lipid accumulation in non-alcoholic fatty liver di... |
| 71 | Takayasu's Arteritis | 1703 | 3025 | 41209134 | 51,851 | review | Insight Into the Role of NLRP3 Inflammasomes in Takayasu's Arteritis: Mechanisms a... |
| 72 | Delayed Haemolytic Transfusion Reactions | 499 | 5357 | 29724898 | 51,902 | guideline | How I safely transfuse patients with sickle-cell disease and manage delayed hemoly... |
| 73 | Systemic Sclerosis | 1698 | 1562 | 38956991 | 52,971 | guideline | Portuguese Recommendations for the management of Raynaud's phenomenon and digital ... |
| 74 | Sickle cell disease: hydroxyurea therapy and crisis prevention | 1617 | 4503 | 40850219 | 53,154 | alternate_open_access | Updating the Brazilian clinical practice guidelines for sickle cell disease: Recom... |
| 75 | Nasopharyngeal Carcinoma | 1173 | 5078 | 42774145 | 54,981 | tier_1_guideline | Impacts of volumetric vs. anatomical accuracies in GTV segmentation for nasopharyn... |
| 76 | Autoinflammatory syndromes: TRAPS, CAPS, HIDS, IL-1 pathway, canakinumab | 219 | 2164 |  | 55,007 | guideline | Consensus protocols for the diagnosis and management of the hereditary autoinflamm... |
| 77 | Alport Syndrome | 113 | 1882 |  | 56,846 | guideline | Consensus statement on standards and guidelines for the molecular diagnostics of A... |
| 78 | Alport syndrome and inherited collagen nephropathies | 114 | 1882 |  | 56,846 | guideline | Consensus statement on standards and guidelines for the molecular diagnostics of A... |
| 79 | osteoarthritis hand | 1242 | 2715 | 31908149 | 58,001 | guideline | 2019 American College of Rheumatology/Arthritis Foundation Guideline for the Manag... |
| 80 | osteoarthritis hip | 1243 | 2715 | 31908149 | 58,001 | guideline | 2019 American College of Rheumatology/Arthritis Foundation Guideline for the Manag... |
| 81 | Resistant hypertension: aldosterone antagonism, renal denervation, workup | 1534 | 2768 | 42234700 | 58,555 | meta-analysis | Aldosterone synthase inhibitors in uncontrolled and resistant hypertension: A phen... |
| 82 | Staphylococcus aureus bacteraemia: MRSA vs MSSA, vancomycin, daptomycin, duration ... | 1653 | 4180 | 29249276 | 58,686 | randomized_controlled_trial | Adjunctive rifampicin for Staphylococcus aureus bacteraemia (ARREST): a multicentr... |
| 83 | T-Cell Lymphomas in Oncology | 1709 | 1718 |  | 60,010 | guideline | Allogeneic hematopoietic cell transplant in cutaneous T-cell lymphomas recommendat... |
| 84 | Intestinal Lymphoma | 961 | 5860 | 42376129 | 60,075 | review/article | Clinical Characteristics and Independent Risk Factors of Primary Gastrointestinal ... |
| 85 | Graft-Versus-Host Disease | 750 | 1742 | 40914633 | 61,384 | guideline | [Acute graft-versus-host disease therapy: Which third line treatment after steroid... |
| 86 | Atrial fibrillation catheter ablation and early rhythm control | 207 | 4796 | 40526576 | 61,593 | Recovered MCQ evidence | Clinical Practice Guideline: Preventive Measures and Treatment Options for Atrial ... |
| 87 | cardiac arrest | 308 | 1451 | 42297408 | 64,007 | guideline | 2025 Korean Guidelines for Cardiopulmonary Resuscitation: Part 5. Cardiac arrest i... |
| 88 | Cardiac arrest in special circumstances: pregnancy, drowning, hypothermia, PE | 309 | 1451 | 42297408 | 64,007 | guideline | 2025 Korean Guidelines for Cardiopulmonary Resuscitation: Part 5. Cardiac arrest i... |
| 89 | Urinary tract infections and pyelonephritis | 1809 | 1478 | 40378860 | 65,623 | guideline | Consensus position statement on advancing the classification of patients and tests... |
| 90 | Urinary tract infections: uncomplicated vs complicated, catheter-associated, treat... | 1810 | 1478 | 40378860 | 65,623 | guideline | Consensus position statement on advancing the classification of patients and tests... |
| 91 | Sinusoidal Obstruction Syndrome | 1620 | 1719 |  | 68,193 | guideline | Defibrotide for prophylaxis of sinusoidal obstruction syndromeveno-occlusive disea... |
| 92 | Thyroid function in pregnancy: trimester-specific TSH ranges, foetal development | 1732 | 4949 | 31426724 | 68,344 | Recovered MCQ evidence | Maternal Thyroid Function in Early Pregnancy and Child Attention-Deficit Hyperacti... |
| 93 | Conservative oxygen therapy in mechanically ventilated patients | 443 | 2890 | 42576250 | 69,310 | meta-analysis | Predictive value of diaphragmatic ultrasound for weaning outcomes in mechanically ... |
| 94 | Noninvasive ventilation for COPD hypercapnic failure | 1203 | 2890 | 42576250 | 69,310 | meta-analysis | Predictive value of diaphragmatic ultrasound for weaning outcomes in mechanically ... |
| 95 | Borderline personality disorder dialectical behavior therapy | 271 | 5152 | 42552234 | 70,078 | tier_1_guideline | Dialectical Behaviour Therapy for Eating Disorders With Comorbid Borderline Person... |
| 96 | abnormal uterine bleeding | 5 | 3717 |  | 70,437 | clinical_practice_guideline | Abnormal Uterine Bleeding: Saudi Guideline |
| 97 | Tick-borne encephalitis and other arboviral infections: West Nile, Zika: clinical ... | 1741 | 5158 | 41305462 | 71,967 | tier_1_guideline | Fast-Track to Protection? A Review of Encepur's Express Dosing Schedule for Tick-B... |
| 98 | Cardiac implantable electronic device infection | 312 | 2029 |  | 72,262 | guideline | Addressing Complications in Cardiac Implantable Electronic Devices A Guideline to ... |
| 99 | Viral encephalitis: HSV encephalitis, aciclovir, CSF PCR, MRI findings, empirical ... | 1848 | 4668 | 42781247 | 73,423 | guideline | Metagenomic next-generation sequencing in the diagnosis of viral encephalitis |
| 100 | MASLD | 1066 | 4522 | 42578551 | 73,760 | society_guideline | Clinical Practice Guidelines for Adult MASLD in Bosnia and Herzegovina: National R... |
| 101 | SGLT2 inhibitors in cardiovascular disease: empagliflozin, dapagliflozin, renal pr... | 1602 | 4323 | 41721639 | 74,778 | systematic_review_or_meta... | Renal Protection at a Metabolic Cost: A Systematic Review and Meta‐Analysis of Per... |
| 102 | Giant cell arteritis glucocorticoid-sparing therapy | 726 | 1675 |  | 75,065 | guideline | Treat-to-target recommendations in giant cell arteritis and polymyalgia rheumatica |
| 103 | Acute necrotising pancreatitis and step-up management approach | 62 | 2483 |  | 75,351 | guideline | Atlanta |
| 104 | Anthracycline Cardiotoxicity | 140 | 2093 |  | 75,862 | guideline | BSE and BCOS Guideline for Transthoracic Echocardiographic Assessment of Adult Can... |
| 105 | Aortic stenosis: grading severity, low-flow low-gradient, intervention timing | 173 | 5172 |  | 76,824 | tier_1_guideline | Clinical Outcomes of Combined TAVR-PCI Versus SAVR-CABG in Patients with Aortic St... |
| 106 | Atopic dermatitis: diagnosis, stepwise treatment and biologics | 202 | 2052 |  | 77,184 | guideline | Cutaneous T-cell lymphomas and dupilumab for atopic dermatitis A systematic review... |
| 107 | Aplastic Anaemia | 178 | 1704 |  | 80,965 | guideline | Modified Delphi panel consensus recommendations for management of severe aplastic ... |
| 108 | Chronic Thromboembolic Pulmonary Hypertension | 395 | 1921 |  | 81,067 | guideline | Balloon pulmonary angioplasty for chronic thromboembolic pulmonary hypertension a ... |
| 109 | Small Cell Lung Cancer | 1629 | 1568 | 42468604 | 85,154 | guideline | ESTRO clinical practice guideline on high-dose thoracic reirradiation for non-smal... |
| 110 | Behcet disease: oral and genital ulcers, uveitis, pathergy, colchicine, immunosupp... | 236 | 5180 | 41817543 | 85,493 | tier_1_guideline | Noninfectious uveitis: Management with biologic agents |
| 111 | Thymic Tumours and Thymoma | 1727 | 2121 |  | 87,951 | guideline | China Anti-Cancer Association Guidelines for the diagnosis, treatment, and follow-... |
| 112 | Acute MS relapse: high-dose methylprednisolone vs plasma exchange | 57 | 3106 | 42661178 | 89,834 | meta-analysis | Risk and protective factors for relapse after residential substance use treatment:... |
| 113 | Osteoporosis: DEXA, FRAX, T-score thresholds, fracture risk assessment | 1249 | 1792 |  | 93,273 | guideline | Clinical practice guideline for management of osteoporosis and fracture prevention... |
| 114 | Oesophageal Cancer | 1225 | 2463 |  | 93,322 | guideline | Gastric and oesophageal cancer |
| 115 | Recurrent Clostridioides difficile infection | 1503 | 1829 |  | 95,730 | guideline | Management of Clostridioides difficile infection in patients with haematological m... |
| 116 | Pancreatogenic diabetes type 3c: exocrine insufficiency, brittle glycaemia, enzyme... | 1277 | 5176 | 42488134 | 95,774 | tier_1_guideline | Chronic pancreatitis and pancreatogenic type 3c diabetes risk: a systematic review... |
| 117 | Leptomeningeal Disease | 1011 | 1849 |  | 98,040 | guideline | Leptomeningeal metastasis from solid tumours EANO-ESMO Clinical Practice Guideline... |
| 118 | neuropathic leg ulcer | 1188 | 2128 |  | 98,261 | guideline | Chinese expert consensus on wound repair of venous leg ulcers (2025 edition) |
| 119 | Avascular Necrosis of Bone | 222 | 5201 | 41180656 | 99,549 | tier_1_guideline | Warfarin-induced skin necrosis: a narrative review of clinical features, risk fact... |
| 120 | Biofilm-associated infections: chronic wounds, prosthetics, catheters, rifampicin ... | 251 | 4250 | 22469292 | 99,964 | literature_article | Towards diagnostic guidelines for biofilm-associated infections |
| 121 | Male Breast Cancer | 1051 | 1493 | 34242744 | 104,196 | guideline | Customizing local and systemic therapies for women with early breast cancer: the S... |
| 122 | Cytomegalovirus prevention in transplant recipients | 494 | 1488 | 38527780 | 106,441 | guideline | Prevention of Cytomegalovirus Infection in Solid Organ Transplant Recipients: Guid... |
| 123 | Craniopharyngioma: suprasellar location, hypothalamic obesity, visual field defects | 474 | 5843 | 42074874 | 108,283 | review/article | The Evolving Role of the Endoscopic Endonasal Transplanum-Transtuberculum Approach... |
| 124 | Spontaneous coronary artery dissection | 1647 | 4153 | 38298759 | 109,190 | systematic_review_or_meta... | Management and outcomes of spontaneous coronary artery dissection: a systematic re... |
| 125 | Drug-Induced Lupus Erythematosus | 574 | 1865 | 37827694 | 112,708 | guideline | EULAR recommendations for the management of systemic lupus erythematosus: 2023 upd... |
| 126 | Systemic lupus erythematosus biologic therapy | 1697 | 1865 | 37827694 | 112,708 | guideline | EULAR recommendations for the management of systemic lupus erythematosus: 2023 upd... |
| 127 | BK polyomavirus nephropathy in kidney transplant | 262 | 5134 | 40705457 | 114,754 | tier_1_guideline | Characterization of BK polyomavirus-associated nephropathy (BKPyVAN) in kidney tra... |
| 128 | Beryllium Disease | 245 | 2437 |  | 115,802 | guideline | Beryllium sensitivity chronic beryllium disease |
| 129 | NSAID therapy in axSpA: continuous vs on-demand, radiographic progression | 1209 | 1433 | 36270658 | 121,375 | guideline | ASAS-EULAR recommendations for the management of axial spondyloarthritis: 2022 upd... |
| 130 | Subarachnoid hemorrhage ICU management | 1674 | 4214 | 42095754 | 121,635 | guideline | European Stroke Organisation (ESO), European Association of Neurosurgical Societie... |
| 131 | Anterior Mediastinal Masses | 139 | 5179 | 42427468 | 125,685 | tier_1_guideline | Small biopsy diagnosis of anterior mediastinal masses: histologic, immunohistochem... |
| 132 | Sjogren syndrome: sicca symptoms, anti-Ro, anti-La, MALT lymphoma risk, systemic f... | 1622 | 5179 | 42427468 | 125,685 | tier_1_guideline | Small biopsy diagnosis of anterior mediastinal masses: histologic, immunohistochem... |
| 133 | Type 1 and type 2 diabetes | 1789 | 1510 | 41421368 | 133,574 | guideline | Application of continuous glucose monitoring and automated insulin delivery techno... |
| 134 | Chronic spontaneous urticaria omalizumab | 394 | 5072 | 42345003 | 134,036 | tier_1_guideline | Treatment Approaches for Omalizumab-Refractory Chronic Spontaneous Urticaria |
| 135 | Autoimmune Haemolytic Anaemia | 214 | 5164 | 41797180 | 138,747 | tier_1_guideline | Warm autoimmune hemolytic anemia in adults in Latin America: A scoping review |
| 136 | Autoimmune haemolytic anaemia: steroids and rituximab | 215 | 5164 | 41797180 | 138,747 | tier_1_guideline | Warm autoimmune hemolytic anemia in adults in Latin America: A scoping review |
| 137 | Candidaemia and invasive candidiasis in the ICU | 302 | 2301 |  | 150,290 | guideline | Invasive candidiasis (IMJ) |
| 138 | Chronic lymphocytic leukaemia: chemoimmunotherapy with FCR | 385 | 4262 | 41303291 | 152,136 | literature_article | The Development of Novel Therapies for Chronic Lymphocytic Leukaemia in the Era of... |
| 139 | Delayed puberty: constitutional delay vs hypogonadotrophic vs hypergonadotrophic c... | 500 | 1544 | 38336898 | 158,992 | guideline | Consensus guideline for the diagnosis and management of pituitary adenomas in chil... |
| 140 | Cholelithiasis and Biliary Colic | 371 | 2440 |  | 162,116 | guideline | Choledocholithiasis endoscopy |
| 141 | Low back pain and sciatica | 1028 | 2038 |  | 168,033 | guideline | Saudi Clinical Practice Guideline for the Assessment and Management of Low Back Pa... |
| 142 | Mechanical low back pain: assessment, red flags and management | 1075 | 2038 |  | 168,033 | guideline | Saudi Clinical Practice Guideline for the Assessment and Management of Low Back Pa... |
| 143 | Variceal Haemorrhage | 1821 | 1962 |  | 172,850 | guideline | U.K. guidelines on the management of variceal haemorrhage in cirrhotic patients |
| 144 | Metabolic Acidosis | 1096 | 5104 | 40870903 | 177,727 | tier_1_guideline | Metabolic Acidosis in Patients with Chronic Kidney Disease: Diagnosis, Pathogenesi... |
| 145 | thrombectomy criteria | 1722 | 1571 | 30808653 | 184,986 | guideline | European Stroke Organisation (ESO) - European Society for Minimally Invasive Neuro... |
| 146 | Barrett esophagus dysplasia endoscopic eradication | 231 | 1496 | 35523224 | 185,894 | guideline | Endoscopic submucosal dissection for superficial gastrointestinal lesions: Europea... |
| 147 | Cancer Genetics and Hereditary Syndromes | 300 | 5289 | 31780574 | 236,970 | guideline | Guidelines for the management of hereditary colorectal cancer from the British Soc... |
| 148 | Normal pressure hydrocephalus (NPH): tap test, ventriculoperitoneal shunt selection | 1207 | 2709 | 33455998 | 240,967 | guideline | Guidelines for Management of Idiopathic Normal Pressure Hydrocephalus (Third Edition) |
| 149 | Irradiated, Leukoreduced and Washed Blood Products | 979 | 1798 |  | 255,256 | guideline | European Society of Contact Dermatitis Guideline for Diagnostic Patch Testing-Reco... |
| 150 | Catatonia benzodiazepines and ECT | 339 | 1734 |  | 268,738 | guideline | Evidence-based consensus guidelines for the management of catatonia Recommendation... |
| 151 | Myoclonus: classification (cortical vs subcortical), pharmacological approaches | 1168 | 2339 |  | 307,823 | guideline | 1115 |
| 152 | HRS diagnosis | 849 | 1970 |  | 311,871 | guideline | 2023 HRSAPHRSLAHRS guideline on cardiac physiologic pacing for the avoidance and m... |
| 153 | Cardiopulmonary resuscitation in the ICU: post-cardiac arrest care, targeted tempe... | 325 | 1762 | 37942682 | 431,195 | guideline | 2023 International Consensus on Cardiopulmonary Resuscitation and Emergency Cardio... |
| 154 | Adult congenital heart disease: Eisenmenger syndrome, residual lesions, transition... | 86 | 1418 |  | 452,539 | guideline | 2020 ESC Guidelines for the management of adult congenital heart disease. |

## 6. Skip List — Do Not Build (55 Topics)

These topics from the 629 workbook either already have a replacement draft staged on prod (`Better draft ready = yes`) or are flagged `needs_external_evidence` (wrong document attached).

| # | Topic | Status | Replacement Draft ID / Batch | Doc ID |
|---:|---|---|---|---:|
| 1 | acute abdomen | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2463 (common257-batch3-2026-11-25) | 2233 |
| 2 | acute coronary syndrome | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2389 (common257-records-2026-11-24) | 1400 |
| 3 | Acute liver failure transplant referral | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2511 (common257-batch6-lead-2026-11-25) | 4164 |
| 4 | ADHD pharmacotherapy (stimulants and comparative meta-analysis) | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2316 (common257-records-2026-11-24) | 5103 |
| 5 | airway management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2391 (common257-records-2026-11-24) | 1420 |
| 6 | Alcohol use disorder, Wernicke encephalopathy and alcohol-related liver disease | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2327 (common257-records-2026-11-24) | 5138 |
| 7 | Allergic rhinitis intranasal steroids and immunotherapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2467 (common257-batch3-2026-11-25) | 2530 |
| 8 | anaphylaxis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2392 (common257-records-2026-11-24) | 1428 |
| 9 | Antibiotic stewardship in critical care: de-escalation and duration | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2330 (common257-records-2026-11-24) | 1600 |
| 10 | anticoagulation management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2427 (common257-batch3-2026-11-25) | 3722 |
| 11 | antidepressant sequential treatment steps depressed outpatients outcomes | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2293 (offline-records-2026-11-24) | 5249 |
| 12 | anxiety disorder | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2395 (common257-records-2026-11-24) | 3348 |
| 13 | asthma stepwise therapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2396 (common257-records-2026-11-24) | 1438 |
| 14 | Barrett's Oesophagus surveillance and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2462 (common257-batch3-2026-11-25) | 2220 |
| 15 | Blood culture technique: timing, volume, number of sets, contamination rates | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2338 (common257-records-2026-11-24) | 5247 |
| 16 | Bronchiectasis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2431 (common257-batch3-2026-11-25) | 4548 |
| 17 | cancer-associated thrombosis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2455 (common257-batch3-2026-11-25) | 1805 |
| 18 | Cardiogenic shock: classification and early mechanical circulatory support | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2452 (common257-batch3-2026-11-25) | 2431 |
| 19 | Childhood asthma and wheeze phenotypes | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2344 (common257-records-2026-11-24) | 3496 |
| 20 | coagulation disorders | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2451 (common257-batch3-2026-11-25) | 2013 |
| 21 | Coronary revascularisation in multivessel disease: SYNTAX score, PCI vs CABG | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2262 (offline-records-2026-11-24) | 5168 |
| 22 | deep vein thrombosis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2401 (common257-records-2026-11-24) | 3488 |
| 23 | electrolyte disturbances | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2402 (common257-records-2026-11-24) | 2078 |
| 24 | HIV: initial diagnosis, CD4 count, viral load, when to start ART | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2469 (common257-batch3-2026-11-25) | 5354 |
| 25 | Intracerebral hemorrhage acute management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2460 (common257-batch3-2026-11-25) | 2474 |
| 26 | liver cirrhosis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2403 (common257-records-2026-11-24) | 2826 |
| 27 | Massive pulmonary embolism: systemic thrombolysis vs catheter-directed therapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2358 (common257-records-2026-11-24) | 5017 |
| 28 | Metastatic Spinal Cord Compression | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2360 (common257-records-2026-11-24) | 4109 |
| 29 | Multiple myeloma: daratumumab-based frontline therapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2543 (common257-batch6-partly-2026-11-25) | 3392 |
| 30 | Noninvasive ventilation for acute respiratory failure | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2363 (common257-records-2026-11-24) | 1522 |
| 31 | Opioid use disorder buprenorphine and methadone | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2438 (common257-batch3-2026-11-25) | 5086 |
| 32 | Oxygen prescribing, target saturations and hypoxia management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2364 (common257-records-2026-11-24) | 3721 |
| 33 | recurrent chest infections | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2430 (common257-batch3-2026-11-25) | 2953 |
| 34 | Renal Hypertension: Secondary Causes | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2307 (offline-records-2026-11-24) | 2761 |
| 35 | Rheumatoid arthritis initial DMARD strategy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2366 (common257-records-2026-11-24) | 3172 |
| 36 | Schizophrenia antipsychotic treatment strategies | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2369 (common257-records-2026-11-24) | 2776 |
| 37 | Self-harm, suicide risk assessment and safe management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2370 (common257-records-2026-11-24) | 3020 |
| 38 | SGLT2 Inhibitors in CKD and Nephrology | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2311 (offline-records-2026-11-24) | 2814 |
| 39 | SIADH: euvolaemic hyponatraemia, diagnostic criteria, fluid restriction, vaptans | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2368 (common257-records-2026-11-24) | 4200 |
| 40 | Spontaneous Pneumothorax | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2282 (offline-records-2026-11-24) | 2821 |
| 41 | Status epilepticus pharmacotherapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2450 (common257-batch3-2026-11-25) | 3145 |
| 42 | Subclinical hypothyroidism treatment thresholds | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2375 (common257-records-2026-11-24) | 3023 |
| 43 | Suicide risk assessment and self-harm | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2377 (common257-records-2026-11-24) | 3020 |
| 44 | Surgical site infection: prevention and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2379 (common257-records-2026-11-24) | 2837 |
| 45 | Syncope evaluation: tilt table testing, loop recorder, reflex vs cardiac causes | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2285 (offline-records-2026-11-24) | 808 |
| 46 | Thyroid nodules: ATA risk stratification, ultrasound features, FNA indications | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2383 (common257-records-2026-11-24) | 5263 |
| 47 | TIA | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2382 (common257-records-2026-11-24) | 1639 |
| 48 | Trauma resuscitation and head injury | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2287 (offline-records-2026-11-24) | 3702 |
| 49 | Treatment of psoriatic arthritis: NSAIDs, csDMARDs, IL-17, IL-23, TNF inhibitors | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2539 (common257-batch6-partly-2026-11-25) | 1864 |
| 50 | Upper and lower GI bleeding | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2442 (common257-batch3-2026-11-25) | 2061 |
| 51 | Vasopressor selection in septic and distributive shock | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2291 (offline-records-2026-11-24) | 2022 |
| 52 | Venous leg ulcers, lymphoedema and lower leg management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2422 (common257-batch3-2026-11-25) | 2128 |
| 53 | Venous thromboembolism prophylaxis in the ICU | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2385 (common257-records-2026-11-24) | 2127 |
| 54 | Vitamin B12 and Folate Deficiency | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2481 (common257-batch3-2026-11-25) | 2903 |
| 55 | Lymphangitic Carcinomatosis | SKIP_NEEDS_EXTERNAL_EVIDENCE | needs_external_evidence (off-topic doc) | 2056 |

## 7. Hand-Back Checklist & Summary Table

Save your built `.md` records and a `BATCH_3_HAND_BACK.md` summary table with columns:

| # | Topic | Doc ID | Built? | Recs Count | Anchors Verified (pass/total) | Fit (full / partly / fit_error) | Sections Excluded / Notes |

Confirm **0 anchor failures** (`40–130` chars exact substring in `norm(full_text)`) before handing back.
