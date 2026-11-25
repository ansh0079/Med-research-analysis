# Agent 1 Instructions: Build Verbatim-Anchored Synopses for Batch 1 of 3 (629 Unanchored Topics)

Prepared 2026-11-25 from `C:\Users\ansh0\Downloads\Topics_with_unanchored_published_page_629_2026-11-25.xlsx` cross-checked against `database\app.db`.

## 1. Assignment Summary & Why You Are Doing This

All 629 topics in the source workbook currently have a **published learner page (`topic_knowledge`) that is unanchored** (0 per-claim `evidence_anchors`), even though **627/629 already have full-text evidence stored in `database\app.db` (`guideline_documents.full_text`)** and 623/629 already have MCQs.

- **Your Batch (`Batch 1 of 3`):** **211 total topics**
  - **`155` `BUILD` topics** (in Section 5 below): Have valid stored full text in `database\app.db` and **no** replacement draft yet. Total stored text across your `155` documents: `12,663,955` chars (`36` large docs `>=100k` chars). Build in ascending `Stored Chars` order (smallest first).
  - **`56` `SKIP` topics** (in Section 6 below): Either already have a `Better draft ready = yes` replacement on prod or are flagged `needs_external_evidence` (off-topic document). **Do NOT build these unless explicitly instructed.**

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
7. **Do NOT publish or mutate `database\app.db`.** Save records as `.md` files in your assigned output folder (e.g., `C:\Users\ansh0\Downloads\Common257_records_629_agent1\`) and produce a hand-back summary table. Loading happens later via `scripts/load_offline_pack.js` (dry run first, then `--apply` as `needs_review`).

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


## 5. Your Build Worklist — Batch 1 (155 Topics, Sorted Smallest Document First)

| # | Topic | Curriculum ID | Doc ID | PMID | Stored Chars | Doc Type | Primary Stored Document Title |
|---:|---|---:|---:|---|---:|---|---|
| 1 | Protein-Losing Enteropathy | 1439 | 4510 | 41196098 | 1,174 | alternate_open_access | Correction to "Characteristics, Nutritional Recommendations, and Medical Intervent... |
| 2 | Splenectomy and asplenia: encapsulated organism risk, vaccination schedule, emerge... | 1641 | 5346 | 20930072 | 3,681 | guideline | Infections of people with complement deficiencies and patients who have undergone ... |
| 3 | Cushings syndrome: ACTH-dependent vs independent, screening, dexamethasone suppres... | 488 | 5304 | 18334580 | 4,090 | guideline | The diagnosis of Cushing's syndrome: an Endocrine Society Clinical Practice Guidel... |
| 4 | metylene blue in vasoplegic shock | 1113 | 5175 | 34387969 | 7,012 | tier_1_guideline | Why Methylene Blue Is the Only Option for Blocking the cGMP/NO Pathway in The Trea... |
| 5 | biological therapy for asthma | 252 | 5147 | 42572779 | 7,109 | tier_1_guideline | Comments on "Established and Emerging Biological Therapies for the Treatment of Co... |
| 6 | Hepatitis C virus direct-acting antiviral therapy | 798 | 3566 | 25843190 | 11,130 | guideline_or_consensus | SASLT position statement on the direct-acting antiviral agents for the treatment o... |
| 7 | Trochanteric Bursitis | 1781 | 5355 | 28963433 | 12,220 | guideline | Greater trochanteric pain syndrome: a review of diagnosis and management in genera... |
| 8 | Insulinoma: fasting hypoglycaemia, 72-hour fast, C-peptide, surgical resection | 947 | 5087 | 42953898 | 16,849 | tier_1_guideline | Giant 12 cm Pancreatic Insulinoma: Tumor Evolution, Management, and Pathologic Con... |
| 9 | Mixed Connective Tissue Disease | 1129 | 4496 | 30402271 | 16,990 | alternate_open_access | Mixed connective tissue disease: state of the art on clinical practice guidelines. |
| 10 | Intestinal Pseudo-obstruction | 962 | 4123 | 22061077 | 18,715 | randomized_controlled_trial | Randomised clinical trial: the efficacy of prucalopride in patients with chronic i... |
| 11 | Musculoskeletal ultrasound in rheumatology: synovitis, power Doppler, guided injec... | 1159 | 5024 | 21910870 | 18,790 | guideline | Musculoskeletal ultrasound in pediatric rheumatology |
| 12 | Intermittent Haemodialysis: Principles and Adequacy | 957 | 3071 | 31695978 | 20,392 | review | Single-best Choice Between Intermittent Versus Continuous Renal Replacement Therap... |
| 13 | Renal Replacement Therapy Modality Choice | 1526 | 3071 | 31695978 | 20,392 | review | Single-best Choice Between Intermittent Versus Continuous Renal Replacement Therap... |
| 14 | Toxic and nutritional neuropathies: B12, B6 deficiency, chemotherapy-induced | 1754 | 2857 | 42306345 | 21,687 | meta-analysis | The Toxic Legacy of Recreational Nitrous Oxide Use: A Systematic Review and Meta-A... |
| 15 | opioid-sparing analgesia | 1232 | 3394 | 36849928 | 21,810 | guideline_or_consensus | Developing expert international consensus statements for opioid-sparing analgesia ... |
| 16 | Massive Hemoptysis management | 1067 | 5121 | 42438799 | 22,624 | tier_1_guideline | Pulmonary embolism after treatment for massive hemoptysis: a therapeutic dilemma |
| 17 | Restless Legs Syndrome (RLS): iron store optimization, dopamine agonist augmentation | 1537 | 2764 | 42688659 | 22,741 | meta-analysis | Global Prevalence of Restless Legs Syndrome and Its Associated Factors in Pregnant... |
| 18 | Septic arthritis: Staphylococcus, Gonococcal, joint washout, antibiotic selection | 1588 | 2788 | 41356548 | 23,778 | meta-analysis | Total Hip or Knee Arthroplasty in Patients with a History of Native Joint Septic A... |
| 19 | Pyelonephritis: inpatient vs outpatient management, Gram-negative coverage, imagin... | 1480 | 4483 | 42830973 | 23,824 | alternate_open_access | Understanding CT Resolution Timeline in Acute Pyelonephritis: A Framework for Clin... |
| 20 | CRISPR-Cas9 gene editing sickle cell disease beta-thalassemia | 476 | 3313 |  | 26,397 | review_article | Progress on CRISPR -Cas9 Gene Editing Technology in Sickle cell disease: A Review |
| 21 | Acute red eye: differential diagnosis and emergency management | 72 | 4232 | 28435504 | 26,463 | systematic_review_or_meta... | Differentiating Urgent and Emergent Causes of Acute Red Eye for the Emergency Phys... |
| 22 | Chikungunya and Zika Arthropathy | 364 | 2559 | 23556021 | 27,156 | literature | Chikungunya virus-associated long-term arthralgia: a 36-month prospective longitud... |
| 23 | Brain Metastases | 275 | 4986 | 21575163 | 27,231 | guideline | Stereotactic radiosurgery for brain metastases: analysis of outcome and risk of br... |
| 24 | Tracheobronchomalacia | 1756 | 5044 | 31921725 | 28,326 | guideline | Tracheomalacia and Tracheobronchomalacia in Pediatrics: An Overview of Evaluation,... |
| 25 | Precision Oncology and Molecular Profiling | 1391 | 3448 | 31405192 | 28,375 | systematic_review | Liquid Biopsy as Surrogate for Tissue for Molecular Profiling in Pancreatic Cancer... |
| 26 | Arterial blood gas interpretation in the ICU: systematic approach | 183 | 4982 | 20859488 | 28,879 | guideline | Interpretation of arterial blood gas |
| 27 | canagliflozin renal outcomes type 2 diabetes nephropathy | 296 | 3349 | 34349651 | 28,947 | systematic_review | Canagliflozin for Prevention of Cardiovascular and Renal Outcomes in type2 Diabete... |
| 28 | variceal GI bleeding | 1820 | 3032 | 41846485 | 29,030 | meta-analysis | Optimal Timing of Endoscopic Intervention for Acute Variceal Bleeding in Cirrhotic... |
| 29 | ACE inhibitors and ARBs in cardiovascular disease: renal monitoring, hyperkalaemia | 9 | 3712 |  | 29,562 | systematic_review_or_meta... | ACE Inhibitors vs ARBs in Hypertensive Diabetics: A systematic review of cardiovas... |
| 30 | Juvenile Idiopathic Arthritis subtypes | 991 | 1009 | 42256795 | 30,132 | review_article | Holistic management of juvenile idiopathic arthritis across all ages: British Soci... |
| 31 | Upper Airway Resistance Syndrome | 1801 | 2874 | 42690361 | 30,638 | review | Upper airway resistance syndrome in polycystic ovary syndrome: a narrative literat... |
| 32 | Pandemic preparedness: lessons from COVID-19, surveillance, stockpiling, One Healt... | 1279 | 2179 |  | 31,300 | guideline | COVID-19 pandemic response in South American countries lessons learned and recomme... |
| 33 | Central Sleep Apnea and Cheyne-Stokes respiration | 350 | 2554 | 26323938 | 31,350 | trial | Adaptive Servo-Ventilation for Central Sleep Apnea in Systolic Heart Failure. |
| 34 | Rheumatic valvular disease anticoagulation | 1543 | 5183 |  | 31,940 | tier_1_guideline | Managing Rheumatic Mitral Stenosis Complicated by Shock and Cardiac Cirrhosis Beyo... |
| 35 | Pleurodesis techniques | 1350 | 3336 | 35698824 | 32,029 | randomized_controlled_trial | Comparison of efficacy of autologous blood patch pleurodesis versus doxycycline pl... |
| 36 | asthma biologics | 194 | 4718 | 41934326 | 32,872 | Recovered MCQ evidence | Patterns and Clinical Efficacy of Biologics Switching in Patients With Severe Asth... |
| 37 | Biologic switching in RA: mechanism switching vs same class after failure | 254 | 4718 | 41934326 | 32,872 | Recovered MCQ evidence | Patterns and Clinical Efficacy of Biologics Switching in Patients With Severe Asth... |
| 38 | Achalasia endoscopic and surgical therapy | 10 | 2 | 31800987 | 33,260 | randomized_controlled_trial | Endoscopic or Surgical Myotomy in Patients with Idiopathic Achalasia. |
| 39 | IgA Nephropathy | 909 | 3539 | 39333921 | 33,340 | systematic_review | Safety and efficacy of sparsentan versus irbesartan in focal segmental glomerulosc... |
| 40 | Benign Paroxysmal Positional Vertigo (BPPV): Dix-Hallpike, Epley manoeuvre | 241 | 4985 | 20607044 | 34,405 | guideline | Benign Paroxysmal Positional Vertigo |
| 41 | Carpal tunnel syndrome: median nerve compression, Phalen, EMG, conservative vs sur... | 333 | 1270 | 39637428 | 34,700 | American Academy of Ortho... | American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline Summary ... |
| 42 | Reproductive health in rheumatic disease | 1532 | 2955 | 42415627 | 35,360 | guideline | Diagnosis to dialogue: Reproductive health conversations and guideline adherence i... |
| 43 | lower urinary tract symptoms | 1030 | 4292 | 29775639 | 35,418 | guideline_or_consensus | Surgical Management of Lower Urinary Tract Symptoms Attributed to Benign Prostatic... |
| 44 | Creutzfeldt-Jakob Disease (CJD): 14-3-3 protein, RT-QuIC, cortical ribboning | 475 | 5278 | 33609480 | 35,844 | guideline | Biomarkers and diagnostic guidelines for sporadic Creutzfeldt-Jakob disease. |
| 45 | CADASIL: genetic features, MRI findings, clinical course | 291 | 5047 | 28231783 | 35,848 | guideline | Cerebral Autosomal Dominant Arteriopathy with Subcortical Infarcts and Leukoenceph... |
| 46 | Diabetic retinopathy anti-VEGF therapy | 536 | 4141 | 41677041 | 36,716 | guideline_or_consensus | Delphi Consensus on the Use of Fenofibrate as Systemic Therapy for the Prevention ... |
| 47 | Secondary mitral regurgitation: transcatheter MitraClip vs medical therapy, COAPT ... | 1572 | 2782 | 42147574 | 36,924 | review | Transcatheter Therapy in Secondary Mitral Regurgitation: Recent Clinical Evidence ... |
| 48 | Cerebral venous thrombosis anticoagulation | 353 | 2888 | 42718926 | 38,525 | meta-analysis | Efficacy and safety of anticoagulation for pediatric cerebral sinovenous thrombosi... |
| 49 | MRI in inflammatory arthritis: bone marrow oedema, erosions, tenosynovitis scoring | 1142 | 4193 | 35689340 | 38,589 | systematic_review_or_meta... | Computer-Assisted Image Analysis in Assessment of Peripheral Joint MRI in Inflamma... |
| 50 | Diabetic retinopathy: screening intervals, laser photocoagulation, anti-VEGF therapy | 537 | 4181 | 33269742 | 40,024 | guideline_or_consensus | Diabetic retinopathy screening guidelines in India: All India Ophthalmological Soc... |
| 51 | Haemoglobin Electrophoresis Interpretation | 762 | 3315 |  | 40,046 | systematic_review_or_meta... | Evaluation of Analytical Agreement Between High-Performance Liquid Chromatography ... |
| 52 | Scleroderma Renal Crisis | 1564 | 4596 | 30614663 | 41,462 | guideline_or_consensus | Generation of a Core Set of Items to Develop Classification Criteria for Scleroder... |
| 53 | Scleroderma renal crisis: ACE inhibitors, hypertensive emergency, captopril | 1565 | 4596 | 30614663 | 41,462 | guideline_or_consensus | Generation of a Core Set of Items to Develop Classification Criteria for Scleroder... |
| 54 | Soft Tissue Sarcomas | 1634 | 2824 | 42562371 | 42,880 | review | Diagnosis and Management of Soft-Tissue Sarcomas: Current Insights. |
| 55 | Vitamin K Deficiency and Liver Disease Coagulopathy | 1860 | 2909 | 39940057 | 43,008 | systematic review | Vitamin deficiency, a neglected risk factor for post-anesthesia complications: a s... |
| 56 | Microangiopathic Haemolytic Anaemia | 1114 | 1592 | 35589098 | 43,284 | guideline | Microangiopathic Hemolytic Anemia Is a Late and Fatal Complication of Gastric Sign... |
| 57 | C3 glomerulopathy and complement inhibition | 289 | 4900 | 24172683 | 43,358 | Recovered MCQ evidence | C3 glomerulopathy: consensus report. |
| 58 | Testicular Germ Cell Tumours | 1717 | 2853 | 42739861 | 43,893 | review | Before Orchiectomy: Gonadal Function in Testicular Germ Cell Tumors-A Narrative Re... |
| 59 | Community- and hospital-acquired pneumonia | 432 | 1474 | 38966853 | 43,903 | meta-analysis | Guideline-Concordant Therapy for Community-Acquired Pneumonia in the Hospitalized ... |
| 60 | Neuromuscular blocking agents in the ICU: indications and monitoring | 1184 | 5364 | 27493788 | 44,911 | guideline | Paradoxical reactions under TNF-α blocking agents and other biological agents give... |
| 61 | Rheumatoid arthritis: ACR/EULAR 2010 classification criteria, RF and anti-CCP sero... | 1545 | 2775 | 41672721 | 45,108 | meta-analysis | Autoantibodies as predictors of progression to rheumatoid arthritis: a systematic ... |
| 62 | Hereditary Spherocytosis and Elliptocytosis | 815 | 3573 | 38858770 | 45,792 | systematic_review | Hemolysis during open heart surgery in patients with hereditary spherocytosis - sy... |
| 63 | Celiac disease diagnosis and monitoring | 342 | 1458 | 40230804 | 46,279 | systematic review | A systematic review of guidelines on screening for celiac disease in children with... |
| 64 | Calcium pyrophosphate deposition CPPD: pseudogout, chondrocalcinosis, crowned dens | 293 | 2183 |  | 47,511 | guideline | Systematic literature review on Calcium Pyrophosphate Deposition (CPPD) nomenclatu... |
| 65 | Inflammatory bowel disease biologic therapy | 938 | 2350 | 39467592 | 47,594 | guideline | Proactive therapeutic drug monitoring of biologic drugs in adult patients with inf... |
| 66 | type 1 diabetes management | 1791 | 1377 | 42207272 | 48,346 | Evidence-based recommenda... | Evidence-based recommendations for the use of continuous glucose monitoring in typ... |
| 67 | Biologics and malignancy risk: lymphoma, solid tumours, non-melanoma skin cancer | 253 | 4896 | 34122062 | 48,793 | Recovered MCQ evidence | Biologics During Pregnancy and Breastfeeding Among Women With Rheumatic Diseases: ... |
| 68 | Pulmonary arterial hypertension targeted therapy | 1459 | 2519 |  | 49,586 | guideline | European Society of Cardiology quality indicators for the care and outcomes of adu... |
| 69 | Biologic therapy pre-treatment infection screening | 257 | 2040 |  | 49,825 | guideline | Tuberculosis screening for patients on biologic Medications A Single-Center experi... |
| 70 | Multiple sclerosis disease-modifying therapy | 1157 | 5122 | 42283727 | 50,788 | tier_1_guideline | The impact of age on efficacy and safety of disease modifying treatment-insights f... |
| 71 | Sleep apnoea and cardiovascular disease: CPAP, AF risk, hypertension, arrhythmia | 1625 | 3098 | 28209226 | 51,530 | review | Sleep Apnea: Types, Mechanisms, and Clinical Cardiovascular Consequences |
| 72 | Obstructive Sleep Apnea | 1219 | 5270 | 30736887 | 52,431 | guideline | Treatment of Adult Obstructive Sleep Apnea with Positive Airway Pressure: An Ameri... |
| 73 | obstructive sleep apnoea | 1221 | 5270 | 30736887 | 52,431 | guideline | Treatment of Adult Obstructive Sleep Apnea with Positive Airway Pressure: An Ameri... |
| 74 | Right ventricular failure in the ICU: management principles | 1550 | 1925 |  | 53,288 | guideline | Diagnosis and treatment of right ventricular failure secondary to acutely increase... |
| 75 | Transfusion-Associated Circulatory Overload | 1763 | 5139 | 40342068 | 54,327 | tier_1_guideline | Estimating the incidence of transfusion-associated circulatory overload using acti... |
| 76 | Hemophagocytic lymphohistiocytosis diagnosis and therapy | 788 | 3612 | 37487610 | 55,298 | systematic_review | The 2022 EULAR/ACR points to consider at the early stages of diagnosis and managem... |
| 77 | Coal Worker's Pneumoconiosis | 415 | 5250 | 42340222 | 55,820 | tier_1_guideline | Clinical Characteristics and Interstitial Findings on High-Resolution Computed Tom... |
| 78 | Vitamin D deficiency: 25-OHD thresholds, supplementation doses, osteomalacia | 1858 | 2813 | 42700010 | 57,326 | meta-analysis | Association between vitamin D deficiency and chronic kidney disease progression: A... |
| 79 | Methotrexate in RA: dosing, folate supplementation, monitoring, toxicity | 1109 | 1673 |  | 57,809 | guideline | Multinational evidence-based recommendations for the use of methotrexate in rheuma... |
| 80 | Thrombotic thrombocytopenic purpura: caplacizumab and plasma exchange | 1726 | 2110 |  | 58,154 | guideline | Korean expert consensus on the management of thrombotic thrombocytopenic purpura |
| 81 | Bone Marrow Biopsy Indications and Interpretation | 267 | 4673 |  | 58,318 | guideline | Toward integrated multimodal artificial intelligence in bone marrow examination: c... |
| 82 | acute asthma exacerbation | 23 | 1994 | 42625150 | 59,072 | guideline | Saudi expert consensus on the management of acute asthma and COPD exacerbations wi... |
| 83 | relapse prevention | 1516 | 3292 | 41530963 | 59,308 | systematic review | Systematic review on relapse-prevention strategies following successful electrocon... |
| 84 | VTE prophylaxis in mechanically ventilated ICU patients | 1865 | 5114 | 42430391 | 60,496 | tier_1_guideline | Association of nurse-led targeted sedation-analgesia management with ventilation d... |
| 85 | Transoesophageal echocardiography: indications, LA thrombus, valve assessment | 1765 | 2862 | 39099755 | 60,771 | review | Perioperative 3D transoesophageal echocardiography. Part 2: clinical applications. |
| 86 | Cushing syndrome medical therapy | 489 | 1764 |  | 62,433 | guideline | Clinical management of patients with Cushing syndrome treated with mifepristone co... |
| 87 | Cardiac device malfunctions: pacemaker failure, ICD inappropriate shocks, troubles... | 311 | 5120 | 38179411 | 63,139 | tier_1_guideline | A Systematic Review and Meta-analysis of the Prevalence and Risk Factors in Cardia... |
| 88 | Coronary artery calcium score risk stratification | 458 | 5937 | 42739646 | 64,574 | review/article | Lipoprotein(a) in Personalized Cardiovascular Prevention: Risk Stratification, Cor... |
| 89 | Hypoparathyroidism: post-surgical causes, calcium replacement, PTH replacement the... | 891 | 4457 | 41229353 | 65,003 | guideline | Standardizing the reporting of postoperative hypoparathyroidism following thyroide... |
| 90 | Huntington disease chorea management | 850 | 5873 | 42912861 | 66,194 | review/article | Antidopaminergic Medications and Clinical Outcomes in Huntington Disease: Evidence... |
| 91 | Sedation minimization and analgesia-first in ICU | 1576 | 4246 | 33170331 | 66,680 | literature_article | Analgesia and sedation in patients with ARDS |
| 92 | tendinopathies | 1712 | 2970 | 42733276 | 68,627 | meta-analysis | The Effect of Extracorporeal Shockwave Therapy in Tendinopathy: A Systematic Revie... |
| 93 | Recurrent nephrolithiasis medical prevention | 1505 | 4451 | 27456839 | 68,795 | guideline | Metabolic diagnosis and medical prevention of calcium nephrolithiasis and its syst... |
| 94 | Asbestosis | 185 | 5094 | 36567379 | 69,491 | tier_1_guideline | Artificial intelligence-based diagnosis of asbestosis: analysis of a database with... |
| 95 | Chronic Allograft Dysfunction | 374 | 2139 | 42813300 | 69,691 | guideline | Thai Transplant Care Practice Guideline on Immunosuppressive Therapy for Adult Kid... |
| 96 | Bronchiolitis and viral wheeze | 284 | 2081 |  | 70,733 | guideline | Australasian Bronchiolitis Guideline 2025 Update |
| 97 | Cardio-oncology: chemotherapy cardiotoxicity, checkpoint inhibitor myocarditis, su... | 323 | 2091 |  | 71,009 | guideline | Cardio-Oncology Recommendations for Pediatric Oncology Patients An Australian and ... |
| 98 | Continuous EEG monitoring in the ICU: non-convulsive status epilepticus | 447 | 5373 | 25626778 | 72,569 | guideline | Consensus statement on continuous EEG in critically ill adults and children, part ... |
| 99 | Uraemic Complications | 1806 | 1606 | 37249051 | 72,609 | guideline | Cardiovascular complications in chronic kidney disease: a review from the European... |
| 100 | Statin-induced necrotising autoimmune myopathy: HMGCR antibody management | 1656 | 3001 | 37959386 | 74,010 | review | Autoimmune Heparin-Induced Thrombocytopenia. |
| 101 | Catheter-Associated Thrombosis | 340 | 1805 |  | 74,742 | guideline | Treatment Algorithm in Cancer-Associated Thrombosis Updated Canadian Expert Consensus |
| 102 | Giant cell arteritis: jaw claudication, vision loss, ESR, CRP, temporal artery biopsy | 727 | 1675 |  | 75,065 | guideline | Treat-to-target recommendations in giant cell arteritis and polymyalgia rheumatica |
| 103 | Tocilizumab in giant cell arteritis: GiACTA trial, steroid sparing, remission | 1750 | 1675 |  | 75,065 | guideline | Treat-to-target recommendations in giant cell arteritis and polymyalgia rheumatica |
| 104 | Viral hepatitis A and E: faeco-oral transmission, self-limiting, vaccination, fulm... | 1850 | 3302 | 42828159 | 76,028 | review | Therapeutic, preventive, and pathogenetic advances in viral hepatitis. |
| 105 | Viral-Induced Arthritides | 1853 | 3302 | 42828159 | 76,028 | review | Therapeutic, preventive, and pathogenetic advances in viral hepatitis. |
| 106 | Mycobacterial and Fungal Arthritis | 1161 | 5132 | 40730733 | 79,334 | tier_1_guideline | Nontuberculous Mycobacterial Lung Disease Management in Belgium: A Longitudinal Ph... |
| 107 | Corticosteroids in ARDS | 464 | 1105 | 38032683 | 79,777 | clinical_practice_guideline | An Update on Management of Adult Patients with Acute Respiratory Distress Syndrome... |
| 108 | Uveitis in JIA: silent inflammation, slit-lamp screening, methotrexate, adalimumab | 1815 | 5144 | 41314670 | 84,118 | tier_1_guideline | Long-term outcomes of JIA-associated uveitis: a systematic review and meta-analysis |
| 109 | Neurocritical care: management of aneurysmal subarachnoid haemorrhage | 1182 | 2143 | 32227294 | 84,227 | guideline | Guidelines for the Acute Treatment of Cerebral Edema in Neurocritical Care Patients. |
| 110 | trastuzumab adjuvant HER2 positive breast cancer BCIRG 006 | 1767 | 5379 | 21991949 | 86,743 | guideline | Adjuvant trastuzumab in HER2-positive breast cancer. |
| 111 | Von Hippel-Lindau syndrome: phaeochromocytoma, renal cell carcinoma, pancreatic NETs | 1862 | 4954 | 35709961 | 87,055 | Recovered MCQ evidence | von Hippel-Lindau disease: Updated guideline for diagnosis and surveillance. |
| 112 | Renal Osteodystrophy | 1525 | 1565 | 40446949 | 92,965 | guideline | Bone histomorphometry for the diagnosis of renal osteodystrophy - a European conse... |
| 113 | BK Virus Nephropathy Post-Transplant | 263 | 5092 | 41645606 | 93,027 | tier_1_guideline | Role of BK Virus CTLs in the Treatment of BK Virus-Associated Nephropathy in Kidne... |
| 114 | Thrombotic Microangiopathy and the Kidney | 1724 | 2073 |  | 94,372 | guideline | Chronic kidney disease, female infertility, and medically assisted reproduction a ... |
| 115 | non-alcoholic fatty liver disease | 1196 | 4577 | 27062661 | 94,567 | guideline_or_consensus | EASL-EASD-EASO Clinical Practice Guidelines for the management of non-alcoholic fa... |
| 116 | Intravenous fluid prescribing and fluid balance management | 969 | 1624 |  | 96,129 | guideline | Extracorporeal membrane oxygenation, acute kidney injury, fluid balance, and conti... |
| 117 | Veno-venous ECMO for respiratory failure: cannulation and monitoring | 1839 | 1624 |  | 96,129 | guideline | Extracorporeal membrane oxygenation, acute kidney injury, fluid balance, and conti... |
| 118 | Acromegaly: IGF-1 elevation, GH suppression test, somatostatin analogues, pegvisomant | 12 | 2169 |  | 98,935 | guideline | Consensus on criteria for acromegaly diagnosis and remission |
| 119 | Continuous renal replacement therapy: CVVH, CVVHD, CVVHDF modes and prescription | 452 | 2126 |  | 99,092 | guideline | Management of regional citrate anticoagulation for continuous renal replacement th... |
| 120 | Anticoagulation for mechanical heart valves | 148 | 5293 | 34126755 | 100,374 | guideline | Mechanical Complications of Acute Myocardial Infarction: A Scientific Statement Fr... |
| 121 | Acute Promyelocytic Leukaemia | 69 | 997 | 38890097 | 101,689 | review_article | Diagnosis and management of acute promyelocytic leukemia: Brazilian consensus guid... |
| 122 | Solid organ transplant induction immunosuppression | 1635 | 1488 | 38527780 | 106,441 | guideline | Prevention of Cytomegalovirus Infection in Solid Organ Transplant Recipients: Guid... |
| 123 | Advanced urothelial carcinoma treatment | 92 | 5155 | 42452641 | 108,074 | tier_1_guideline | Urinary Biomarkers and Their Role in the Management of Urothelial Carcinoma: A Nar... |
| 124 | CMV disease in immunocompromised: retinitis, colitis, pneumonitis, ganciclovir, va... | 413 | 1471 | 41038280 | 111,896 | guideline | International consensuses and guidelines on diagnosing and managing cytomegaloviru... |
| 125 | Belimumab and anifrolumab in SLE: mechanism, indications, trial data | 237 | 1865 | 37827694 | 112,708 | guideline | EULAR recommendations for the management of systemic lupus erythematosus: 2023 upd... |
| 126 | MRSA: decolonisation, mupirocin, chlorhexidine, glycopeptides, daptomycin, linezolid | 1144 | 2123 |  | 114,139 | guideline | Treatment of Methicillin-Resistant Staphylococcus aureus (MRSA) Bacteremia-Guideli... |
| 127 | Thyroid cancer surveillance: recurrence monitoring, thyroglobulin, neck ultrasound... | 1729 | 1834 |  | 114,259 | guideline | The Initial Risk Stratification System for Differentiated Thyroid Cancer Key Updat... |
| 128 | Syringomyelia: Chiari malformation associations, shunt indications | 1694 | 5177 | 42652622 | 118,784 | tier_1_guideline | Idiopathic Syringomyelia: A Systematic Scoping Review |
| 129 | Shared decision making and patient reported outcomes in rheumatology: HAQ, PROMIS,... | 1607 | 5131 | 42778243 | 119,940 | tier_1_guideline | Shared decision-making in patients with stroke: a scoping review |
| 130 | Cryopyrin-Associated Periodic Syndromes | 483 | 3711 | 35623638 | 122,652 | clinical_practice_guideline | The 2021 EULAR/American College of Rheumatology points to consider for diagnosis, ... |
| 131 | TNF Receptor-Associated Periodic Syndrome | 1748 | 3711 | 35623638 | 122,652 | clinical_practice_guideline | The 2021 EULAR/American College of Rheumatology points to consider for diagnosis, ... |
| 132 | Cluster headache: high-flow oxygen, triptan rescue, verapamil prophylaxis | 412 | 3812 | 37515405 | 130,286 | clinical_practice_guideline | European Academy of Neurology guidelines on the treatment of cluster headache |
| 133 | Autoimmune encephalitis: Anti-NMDA receptor, LGI1, Caspr2 antibody profiles | 212 | 1441 | 38312020 | 132,802 | guideline | Canadian Consensus Guidelines for the Diagnosis and Treatment of Autoimmune Enceph... |
| 134 | Vapor Gas Dust and Fume exposures | 1819 | 2803 | 42412737 | 135,556 | guideline | AWMF S2k Guideline: Diagnosis and Assessment of Lung Disease Caused by Occupationa... |
| 135 | Acute myocarditis: Dallas criteria, cardiac MRI, immunosuppression indications | 60 | 1407 | 33176455 | 135,585 | guideline | Management of Acute Myocarditis and Chronic Inflammatory Cardiomyopathy: An Expert... |
| 136 | IL-6 inhibition: tocilizumab, sarilumab in RA and cytokine storm, COVID-19 trials | 915 | 1386 | 36260501 | 143,841 | A systematic literature r... | A systematic literature review informing the consensus statement on efficacy and s... |
| 137 | Triple-Negative Breast Cancer | 1779 | 2867 | 42851301 | 146,863 | systematic review | The translational chasm in machine learning for triple-negative breast cancer: a q... |
| 138 | Adrenal insufficiency in critical illness: relative adrenal insufficiency, hydroco... | 84 | 1414 | 38714321 | 155,677 | guideline | European Society of Endocrinology and Endocrine Society Joint Clinical Guideline: ... |
| 139 | Rhabdomyolysis: causes, AKI prevention, fluid targets | 1541 | 5073 | 42336348 | 156,917 | tier_1_guideline | Rhabdomyolysis: a narrative review |
| 140 | Eosinophilic Oesophagitis | 639 | 2017 |  | 165,778 | guideline | Eosinophilic esophagitis in children and adolescents a clinical practice guideline |
| 141 | Endoscopic Ultrasound | 628 | 1497 | 40015316 | 166,981 | guideline | Endoscopic ultrasound-guided tissue sampling: European Society of Gastrointestinal... |
| 142 | Third, fourth, and sixth cranial nerve palsies: pupil-sparing oculomotor palsy | 1720 | 1234 | 33956777 | 171,104 | guideline_or_consensus | Clinical Guidelines for Diagnosis and Treatment of Botulism, 2021. |
| 143 | Cutaneous Squamous Cell Carcinoma | 490 | 1486 | 37717283 | 171,483 | guideline | European consensus-based interdisciplinary guideline for invasive cutaneous squamo... |
| 144 | Faecal Microbiota Transplant | 665 | 4588 | 38609760 | 179,353 | guideline_or_consensus | The use of faecal microbiota transplant as treatment for recurrent or refractory C... |
| 145 | portal hypertension | 1370 | 3672 | 37358642 | 182,716 | guideline | Austrian consensus on the diagnosis and management of portal hypertension in advan... |
| 146 | Leflunomide, Sulfasalazine, and Hydroxychloroquine toxicities | 1008 | 5274 | 36318966 | 232,695 | guideline | British Society for Rheumatology guideline on prescribing drugs in pregnancy and b... |
| 147 | Neonatal Lupus and Congenital Heart Block | 1176 | 5274 | 36318966 | 232,695 | guideline | British Society for Rheumatology guideline on prescribing drugs in pregnancy and b... |
| 148 | Acute pancreatitis in the ICU: Ranson, APACHE, organ support | 66 | 2224 |  | 241,943 | guideline | AEG-AESPANC-OPGE-SIED-SPG Ibero-Latin American Guidelines on Acute Pancreatitis (i... |
| 149 | Severe acute pancreatitis ICU management | 1592 | 2224 |  | 241,943 | guideline | AEG-AESPANC-OPGE-SIED-SPG Ibero-Latin American Guidelines on Acute Pancreatitis (i... |
| 150 | Occupational Asthma | 1224 | 4703 |  | 284,552 | guideline | Occupational, environmental and iatrogenic lung disease |
| 151 | Kawasaki Disease | 992 | 4183 | 36695415 | 284,952 | systematic_review_or_meta... | Intravenous immunoglobulin for the treatment of Kawasaki disease |
| 152 | Stress echocardiography: protocols, ischaemia detection, viability assessment | 1668 | 1681 |  | 376,424 | guideline | Guideline on Stress Echocardiography - 2026 |
| 153 | CT head and CT pulmonary angiography: common acute findings | 486 | 1516 | 26320113 | 377,002 | guideline | 2015 ESC/ERS Guidelines for the diagnosis and treatment of pulmonary hypertension:... |
| 154 | Type 1 vs Type 2 MI: universal definition and clinical differentiation | 1793 | 1915 | 32860058 | 518,373 | guideline | 2020 ESC Guidelines for the management of acute coronary syndromes in patients pre... |
| 155 | Symptomatic bradycardia: atropine, temporary pacing, transcutaneous pacing | 1687 | 4241 | 26293406 | 624,203 | systematic_review_or_meta... | Dual-chamber pacemakers for treating symptomatic bradycardia due to sick sinus syn... |

## 6. Skip List — Do Not Build (56 Topics)

These topics from the 629 workbook either already have a replacement draft staged on prod (`Better draft ready = yes`) or are flagged `needs_external_evidence` (wrong document attached).

| # | Topic | Status | Replacement Draft ID / Batch | Doc ID |
|---:|---|---|---|---:|
| 1 | Abdominal aortic aneurysm: surveillance thresholds, EVAR vs open repair | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2317 (common257-records-2026-11-24) | 1397 |
| 2 | acute behavioural disturbance | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2388 (common257-records-2026-11-24) | 5115 |
| 3 | Acute coronary syndrome antiplatelet strategy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2320 (common257-records-2026-11-24) | 2973 |
| 4 | Acute psychosis: assessment, management and antipsychotic therapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2322 (common257-records-2026-11-24) | 1957 |
| 5 | Adhesional Small Bowel Obstruction | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2417 (common257-batch3-2026-11-25) | 1413 |
| 6 | Airway management in the ICU: RSI, video-laryngoscopy, difficult airway | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2325 (common257-records-2026-11-24) | 3515 |
| 7 | Alcohol withdrawal benzodiazepine treatment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2249 (offline-records-2026-11-24) | 4977 |
| 8 | Anaemia | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2328 (common257-records-2026-11-24) | 1463 |
| 9 | Aneurysmal subarachnoid hemorrhage management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2329 (common257-records-2026-11-24) | 2145 |
| 10 | Anticoagulation in atrial fibrillation: CHA2DS2-VASc scoring and DOAC selection | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2331 (common257-records-2026-11-24) | 317 |
| 11 | anticoagulation reversal | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2428 (common257-batch3-2026-11-25) | 2013 |
| 12 | Antimicrobial stewardship: IV to oral switch, duration of therapy, procalcitonin-g... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2332 (common257-records-2026-11-24) | 1774 |
| 13 | Anxiety disorders and panic disorder: diagnosis and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2334 (common257-records-2026-11-24) | 4248 |
| 14 | Atrial fibrillation and common arrhythmias | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2336 (common257-records-2026-11-24) | 1439 |
| 15 | Bell's palsy: corticosteroid timing, antiviral therapy, eye care | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2446 (common257-batch3-2026-11-25) | 3216 |
| 16 | bowel cancer | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2398 (common257-records-2026-11-24) | 2059 |
| 17 | Bronchiectasis and recurrent chest infections | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2429 (common257-batch3-2026-11-25) | 4548 |
| 18 | capacity assessment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2399 (common257-records-2026-11-24) | 4301 |
| 19 | Cellulitis and skin and soft tissue infections: Eron classification, MRSA risk, tr... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2342 (common257-records-2026-11-24) | 4675 |
| 20 | chronic abdominal pain | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2477 (common257-batch3-2026-11-25) | 4582 |
| 21 | Collapse, syncope, and cardiac arrest algorithms | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2259 (offline-records-2026-11-24) | 1923 |
| 22 | Corticosteroids in septic shock | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2263 (offline-records-2026-11-24) | 2202 |
| 23 | Diagnostic Upper GI Endoscopy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2491 (common257-batch3-2026-11-25) | 5858 |
| 24 | Graves disease: antithyroid drugs, radioiodine, thyroidectomy - comparative outcomes | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2456 (common257-batch3-2026-11-25) | 2509 |
| 25 | Idiopathic facial nerve palsy (Bell’s palsy): corticosteroid timing, eye care | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2445 (common257-batch3-2026-11-25) | 3216 |
| 26 | Left main coronary disease revascularization | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2300 (offline-records-2026-11-24) | 5099 |
| 27 | Lower GI Bleeding | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2441 (common257-batch3-2026-11-25) | 5012 |
| 28 | Mental capacity, consent and best-interest decisions | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2359 (common257-records-2026-11-24) | 3325 |
| 29 | Microscopic colitis budesonide therapy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2508 (common257-batch6-lead-2026-11-25) | 5020 |
| 30 | Narrow-complex tachycardias: SVT diagnosis, vagal manoeuvres, adenosine, ablation | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2362 (common257-records-2026-11-24) | 317 |
| 31 | Nutritional support in critical illness: enteral vs parenteral, protein targets | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2474 (common257-batch3-2026-11-25) | 4455 |
| 32 | Opioid use disorder: withdrawal, maintenance therapy and harm reduction | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2436 (common257-batch3-2026-11-25) | 3289 |
| 33 | Perinatal depression screening and treatment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2365 (common257-records-2026-11-24) | 3334 |
| 34 | regional analgesia | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2444 (common257-batch3-2026-11-25) | 2948 |
| 35 | respiratory tract infections | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2447 (common257-batch3-2026-11-25) | 2953 |
| 36 | safeguarding | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2407 (common257-records-2026-11-24) | 2395 |
| 37 | secondary care mental health | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2408 (common257-records-2026-11-24) | 4467 |
| 38 | Septic shock: vasopressor selection and targets | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2281 (offline-records-2026-11-24) | 901 |
| 39 | shortness of breath | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2471 (common257-batch3-2026-11-25) | 5166 |
| 40 | soft tissue injuries | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2489 (common257-batch3-2026-11-25) | 2962 |
| 41 | Stable angina medical therapy versus PCI | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2283 (offline-records-2026-11-24) | 2828 |
| 42 | Stress ulcer prophylaxis in critically ill patients | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2494 (common257-batch3-2026-11-25) | 2838 |
| 43 | substance use disorder | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2437 (common257-batch3-2026-11-25) | 1735 |
| 44 | Superficial Thrombophlebitis versus DVT | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2476 (common257-batch3-2026-11-25) | 2127 |
| 45 | Surgical site infections: classification, risk factors, prophylaxis timing, MRSA d... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2380 (common257-records-2026-11-24) | 2839 |
| 46 | Systemic Lupus Erythematosus | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2381 (common257-records-2026-11-24) | 1865 |
| 47 | Thyroid storm and myxoedema coma: ICU recognition and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2458 (common257-batch3-2026-11-25) | 1895 |
| 48 | Tracheostomy: indications, timing, percutaneous vs surgical technique | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2286 (offline-records-2026-11-24) | 5955 |
| 49 | Traumatic brain injury ICU management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2288 (offline-records-2026-11-24) | 1847 |
| 50 | Treatment-resistant depression ketamine and ECT | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2312 (offline-records-2026-11-24) | 4666 |
| 51 | V/Q Mismatch and pulmonary gas exchange | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2292 (offline-records-2026-11-24) | 3721 |
| 52 | Vasopressors and inotropes in shock | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2290 (offline-records-2026-11-24) | 4933 |
| 53 | venous thromboembolism | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2415 (common257-records-2026-11-24) | 1662 |
| 54 | viral hepatitis B | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2472 (common257-batch3-2026-11-25) | 2900 |
| 55 | Wellens syndrome and left main equivalent ECG patterns | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2386 (common257-records-2026-11-24) | 1400 |
| 56 | Silo Filler's Disease | SKIP_NEEDS_EXTERNAL_EVIDENCE | needs_external_evidence (off-topic doc) | 4703 |

## 7. Hand-Back Checklist & Summary Table

Save your built `.md` records and a `BATCH_1_HAND_BACK.md` summary table with columns:

| # | Topic | Doc ID | Built? | Recs Count | Anchors Verified (pass/total) | Fit (full / partly / fit_error) | Sections Excluded / Notes |

Confirm **0 anchor failures** (`40–130` chars exact substring in `norm(full_text)`) before handing back.
