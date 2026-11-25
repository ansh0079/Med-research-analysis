# Agent 2 Instructions: Build Verbatim-Anchored Synopses for Batch 2 of 3 (629 Unanchored Topics)

Prepared 2026-11-25 from `C:\Users\ansh0\Downloads\Topics_with_unanchored_published_page_629_2026-11-25.xlsx` cross-checked against `database\app.db`.

## 1. Assignment Summary & Why You Are Doing This

All 629 topics in the source workbook currently have a **published learner page (`topic_knowledge`) that is unanchored** (0 per-claim `evidence_anchors`), even though **627/629 already have full-text evidence stored in `database\app.db` (`guideline_documents.full_text`)** and 623/629 already have MCQs.

- **Your Batch (`Batch 2 of 3`):** **209 total topics**
  - **`154` `BUILD` topics** (in Section 5 below): Have valid stored full text in `database\app.db` and **no** replacement draft yet. Total stored text across your `154` documents: `11,976,339` chars (`35` large docs `>=100k` chars). Build in ascending `Stored Chars` order (smallest first).
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
7. **Do NOT publish or mutate `database\app.db`.** Save records as `.md` files in your assigned output folder (e.g., `C:\Users\ansh0\Downloads\Common257_records_629_agent2\`) and produce a hand-back summary table. Loading happens later via `scripts/load_offline_pack.js` (dry run first, then `--apply` as `needs_review`).

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


## 5. Your Build Worklist — Batch 2 (154 Topics, Sorted Smallest Document First)

| # | Topic | Curriculum ID | Doc ID | PMID | Stored Chars | Doc Type | Primary Stored Document Title |
|---:|---|---:|---:|---|---:|---|---|
| 1 | Portal Hypertension Non-Cirrhotic | 1372 | 3437 | 37719996 | 1,224 | systematic_review | Maternal and fetal outcomes in pregnant patients with non-cirrhotic portal hyperte... |
| 2 | failure to thrive | 666 | 3531 | 9721113 | 3,675 | landmark_trial | Effect of community based management in failure to thrive: randomised controlled t... |
| 3 | Neuromuscular Respiratory Failure | 1185 | 4162 | 29199768 | 4,641 | systematic_review | Invasive versus non-invasive ventilation for acute respiratory failure in neuromus... |
| 4 | viral wheeze | 1855 | 3482 | 26482324 | 6,526 | systematic_review | Leukotriene receptor antagonists as maintenance and intermittent therapy for episo... |
| 5 | Hiatal Hernia | 819 | 2450 |  | 7,481 | guideline | Hiatal hernia |
| 6 | H. pylori infection | 848 | 3213 | 29543326 | 10,637 | meta-analysis | Non-invasive diagnostic tests for Helicobacter pylori infection. |
| 7 | Streptococcal infections: Group A Strep, scarlet fever, rheumatic fever, toxic sho... | 1667 | 5043 | 36695447 | 13,325 | guideline | Increase in invasive group A streptococcal (Streptococcus pyogenes) infections (iG... |
| 8 | ICU admission criteria and triage | 902 | 5003 | 25247021 | 16,769 | guideline | Triage of Patients Consulted for ICU Admission During Times of ICU-Bed Shortage |
| 9 | Mixed connective tissue disease: anti-U1-RNP, overlap features, pulmonary hyperten... | 1130 | 4496 | 30402271 | 16,990 | alternate_open_access | Mixed connective tissue disease: state of the art on clinical practice guidelines. |
| 10 | sacubitril valsartan heart failure reduced ejection fraction mortality | 1554 | 4834 | 33357641 | 17,961 | Recovered MCQ evidence | Efficacy and safety of sacubitril/valsartan compared with enalapril in patients wi... |
| 11 | Rectal Prolapse | 1501 | 2205 |  | 19,163 | guideline | Mesh rectopexy in rectal prolapse toward consensus or continued controversy |
| 12 | paediatric dehydration | 1264 | 5030 | 29329448 | 20,138 | guideline | The Prevalence and Management of Dehydration amongst Neonatal Admissions to Genera... |
| 13 | Lymphangioleiomyomatosis | 1044 | 3251 | 39625935 | 20,821 | systematic review | Unlocking the clinical potential of paired inspiratory and expiratory CT scans in ... |
| 14 | Sudden sensorineural hearing loss: diagnosis and treatment | 1677 | 2841 | 42871297 | 21,612 | meta-analysis | Efficacy of Defibrinogenation Therapy for Sudden Sensorineural Hearing Loss: A Sys... |
| 15 | Obscure GI Bleeding | 1216 | 5129 | 42181469 | 21,974 | tier_1_guideline | CT Angiography for the Diagnosis of Hemorrhagic Jejunal Diverticulosis: A Rare Cau... |
| 16 | Palindromic Rheumatism | 1268 | 3728 |  | 22,139 | review_article | Diagnosis and treatment of palindromic rheumatism— An updated review |
| 17 | Restless legs syndrome treatment | 1538 | 2764 | 42688659 | 22,741 | meta-analysis | Global Prevalence of Restless Legs Syndrome and Its Associated Factors in Pregnant... |
| 18 | Tricuspid regurgitation: functional vs primary, transcatheter repair options | 1775 | 4227 | 34767705 | 23,115 | landmark_trial | Concomitant Tricuspid Repair in Patients with Degenerative Mitral Regurgitation |
| 19 | Insulin pump therapy CSII: closed-loop systems, patient selection, sick day rules | 949 | 4852 | 39106206 | 25,886 | Recovered MCQ evidence | Closed-Loop Insulin Therapy for People With Type 2 Diabetes Treated With an Insuli... |
| 20 | Endemic Mycoses | 618 | 3526 | 38440302 | 26,327 | landmark_trial | MSG-15: Super-Bioavailability Itraconazole Versus Conventional Itraconazole in the... |
| 21 | Seronegative Rheumatoid Arthritis | 1590 | 2790 | 37987247 | 26,616 | review | When Autoantibodies Are Missing: The Challenge of Seronegative Rheumatoid Arthritis. |
| 22 | Healthcare-associated MRSA decolonization and prevention | 771 | 4160 | 38781679 | 26,982 | systematic_review_or_meta... | Decolonization and Pathogen Reduction Approaches to Prevent Antimicrobial Resistan... |
| 23 | Neonatal jaundice: assessment, phototherapy and exchange transfusion | 1175 | 4697 | 42106782 | 27,350 | guideline | Clinical outcomes of the 2022 AAP hyperbilirubinemia guideline in term and late-pr... |
| 24 | Multiple endocrine neoplasia type 2 MEN2A and MEN2B: RET mutations, prophylactic t... | 1149 | 5059 | 22584709 | 28,122 | guideline | Genotype-phenotype correlation in multiple endocrine neoplasia type 2 |
| 25 | fecal microbiota transplant recurrent Clostridioides difficile infection | 675 | 3255 | 40978956 | 28,589 | meta-analysis | Efficacy of Fecal Microbiota Transplantation (FMT) Versus Standard Antibiotic Ther... |
| 26 | Lyme disease: Borrelia, tick bite, erythema migrans, disseminated disease, doxycyc... | 1042 | 4209 | 38606630 | 28,852 | systematic_review_or_meta... | Treatment of post-treatment Lyme disease symptoms-a systematic review |
| 27 | Diabetes insipidus: central vs nephrogenic, water deprivation test, desmopressin | 520 | 4818 | 39845881 | 28,947 | Recovered MCQ evidence | Central and nephrogenic diabetes insipidus: updates on diagnosis and management. |
| 28 | Status epilepticus management in the ICU: refractory and super-refractory | 1659 | 2836 | 42552664 | 28,957 | systematic review | Claustrum Involvement in New Onset Refractory Status Epilepticus: A Systematic Rev... |
| 29 | Arterial Blood Gas interpretation | 182 | 2184 |  | 29,661 | guideline | Mastering blood gas interpretation A practical guide for primary care providers |
| 30 | MDS with Ring Sideroblasts | 1072 | 4456 | 38668037 | 29,856 | guideline | Myelodysplastic Neoplasms (MDS) with Ring Sideroblasts or SF3B1 Mutations: The Imp... |
| 31 | Small fibre neuropathy: skin biopsy quantification, autonomic function testing | 1630 | 5042 | 31665231 | 30,687 | guideline | Diagnostic criteria for small fibre neuropathy in clinical practice and research |
| 32 | Lupus nephritis induction and maintenance therapy | 1038 | 5014 | 35054037 | 31,231 | guideline | Induction and Maintenance Treatment of Lupus Nephritis: A Comprehensive Review of ... |
| 33 | hypertension treatment patients 80 years or older very elderly | 874 | 3752 | 20574244 | 31,470 | systematic_review_or_meta... | Treatment of hypertension in patients 80 years and older: the lower the better? A ... |
| 34 | Chronic Neutrophilic Leukaemia | 391 | 2565 | 23656643 | 31,855 | literature | Oncogenic CSF3R mutations in chronic neutrophilic leukemia and atypical CML. |
| 35 | VEXAS Syndrome | 1846 | 2878 | 40570089 | 32,280 | systematic review | Clinical features in VEXAS syndrome: a systematic review. |
| 36 | Sedation outside theatres and procedural sedation safety | 1577 | 4659 | 39021840 | 32,441 | guideline | Intravenous esketamine as an adjuvant for sedation/analgesia outside the operating... |
| 37 | metoprolol succinate chronic heart failure mortality MERIT-HF | 1112 | 4988 | 23900696 | 33,030 | guideline | An individual patient meta-analysis of five randomized trials assessing the effect... |
| 38 | temporal arteritis | 1710 | 4663 | 39180526 | 33,233 | guideline | Bilateral juvenile temporal arteritis: a case-based review |
| 39 | Oesophageal Strictures | 1227 | 4226 | 40393138 | 33,612 | guideline_or_consensus | Management of oesophageal strictures in inherited epidermolysis bullosa: a clinica... |
| 40 | Mallory-Weiss Syndrome | 1058 | 3324 |  | 33,945 | systematic_review_or_meta... | The prevalence and risk factors for Mallory-Weiss syndrome: a systematic review an... |
| 41 | Malignant hyperthermia and neuroleptic malignant syndrome: recognition and dantrolene | 1055 | 4210 | 42732346 | 34,762 | systematic_review_or_meta... | Early Recognition of Neuroleptic Malignant Syndrome Without Hyperthermia: A Narrat... |
| 42 | Six-Minute Walk Test | 1621 | 2811 | 38869839 | 35,356 | systematic review | Six-minute walk test as clinical end point in cardiomyopathy clinical trials, incl... |
| 43 | tenecteplase alteplase acute ischemic stroke EXTEND-IA TNK | 1713 | 2972 | 42812199 | 35,458 | meta-analysis | Tenecteplase in acute ischemic stroke: an updated meta-analysis. |
| 44 | Chemotherapy Extravasation | 358 | 3495 | 39057599 | 35,840 | systematic_review | The Role of Nursing in the Management of Chemotherapy Extravasation: A Systematic ... |
| 45 | Vocal Cord Dysfunction | 1861 | 2911 | 37221142 | 36,134 | review | Vocal cord dysfunction/inducible laryngeal obstruction-2022 Melbourne Roundtable R... |
| 46 | Synovial fluid analysis: WBC thresholds, crystals, viscosity, culture interpretation | 1692 | 4661 | 42129958 | 36,308 | guideline | Synovial Fluid Proteomic Biomarkers in Knee Osteoarthritis: A Systematic Review an... |
| 47 | Opioid Rotation and Equianalgesic Dosing | 1231 | 5064 | 30464578 | 37,135 | guideline | Practical management of opioid rotation and equianalgesia |
| 48 | Intra-aortic balloon pump and Impella: principles and ICU management | 965 | 3223 | 32793674 | 38,036 | review | Short-term mechanical circulatory support (intra-aortic balloon pump, Impella, ext... |
| 49 | Acute Cholecystitis | 29 | 2246 |  | 38,694 | guideline | International Delphi consensus on the management of percutaneous choleystostomy in... |
| 50 | Aortic stenosis TAVR | 174 | 3027 | 42622107 | 39,390 | meta-analysis | Redo-Transcatheter Aortic Valve Implantation Versus Surgical Explantation in Patie... |
| 51 | Myelodysplastic Syndromes | 1165 | 4611 | 19230772 | 40,229 | guideline | Efficacy of azacitidine compared with that of conventional care regimens in the tr... |
| 52 | Ventilator-associated pneumonia: bundle prevention, diagnosis, empiric treatment | 1840 | 4627 | 38276198 | 41,431 | guideline | Hospital-Acquired Pneumonia and Ventilator-Associated Pneumonia: A Literature Review |
| 53 | Thyroid nodule evaluation and FNA | 1734 | 3054 | 37894812 | 41,517 | systematic review | Raman Spectroscopy as a Potential Adjunct of Thyroid Nodule Evaluation: A Systemat... |
| 54 | Cardiac amyloidosis: TTR vs AL, tafamidis, diagnosis with bone scintigraphy | 307 | 3090 | 42437182 | 42,777 | meta-analysis | Impact of SGLT2 inhibitors in cardiac amyloidosis: A systematic review and meta-an... |
| 55 | Vestibular Schwannoma: surveillance vs radiation vs surgery, neurofibromatosis 2 | 1845 | 2896 | 42430393 | 43,068 | meta-analysis | Transcriptomic meta-analysis identifies dysregulated pathways and potential therap... |
| 56 | Degenerative cervical myelopathy management | 498 | 1961 |  | 43,239 | guideline | AO Spine Clinical Practice Recommendations for Diagnosis and Management of Degener... |
| 57 | Calcium Hydroxyapatite Deposition Disease | 292 | 3486 | 37627938 | 43,424 | systematic_review | Hydroxyapatite Deposition Disease: A Comprehensive Review of Pathogenesis, Radiolo... |
| 58 | Multiple endocrine neoplasia type 1 MEN1: parathyroid, pituitary, pancreatic tumours | 1148 | 1540 | 40979652 | 43,812 | guidance | (68)Ga-DOTA-TATE PET/CT improves accuracy and guides management in multiple endocr... |
| 59 | Adult-onset Still disease IL-1 and IL-6 blockade | 87 | 2182 |  | 44,207 | guideline | Management of adult-onset Still's disease evidence- and consensus-based recommenda... |
| 60 | Burkitt Lymphoma | 288 | 5383 | 24224624 | 44,479 | guideline | Low-intensity therapy in adults with Burkitt's lymphoma. |
| 61 | Staphylococcus aureus bacteremia diagnostic workup and duration | 1654 | 3546 | 40791886 | 45,335 | systematic_review | Shorter versus longer-duration antibiotic treatments for immunocompetent patients ... |
| 62 | Chronic inflammatory demyelinating polyneuropathy treatment | 380 | 4165 | 32583051 | 45,790 | systematic_review_or_meta... | Systematic literature review of burden of illness in chronic inflammatory demyelin... |
| 63 | Mild cognitive impairment (MCI): amnestic vs non-amnestic progression tracking | 1120 | 3124 | 21514249 | 46,360 | guideline | The diagnosis of mild cognitive impairment due to Alzheimer's disease: recommendat... |
| 64 | Basic calcium phosphate deposition: hydroxyapatite, Milwaukee shoulder, calcific t... | 234 | 2183 |  | 47,511 | guideline | Systematic literature review on Calcium Pyrophosphate Deposition (CPPD) nomenclatu... |
| 65 | Lung Cancer screening guidelines | 1034 | 777 | 31995683 | 47,763 | randomized_controlled_trial | Reduced Lung-Cancer Mortality with Volume CT Screening in a Randomized Trial. |
| 66 | Anal Cancer | 125 | 1427 | 37504978 | 48,142 | guideline | Nordic anal cancer (NOAC) group consensus guidelines for risk-adapted delineation ... |
| 67 | Tumour Lysis Syndrome Prophylaxis | 1786 | 3134 | 40308330 | 49,215 | review | The challenges and opportunities of applying tumour mutational burden analysis to ... |
| 68 | Cerebral venous sinus thrombosis (CVST): risk factors, anticoagulation choices | 352 | 2887 | 42798614 | 49,348 | meta-analysis | Cerebral venous sinus thrombosis in pregnancy and the postpartum period: epidemiol... |
| 69 | TB screening | 1707 | 2040 |  | 49,825 | guideline | Tuberculosis screening for patients on biologic Medications A Single-Center experi... |
| 70 | rosuvastatin primary prevention elevated C-reactive protein | 1553 | 4944 | 29146124 | 50,560 | Recovered MCQ evidence | Relationship of C-reactive protein reduction to cardiovascular event reduction fol... |
| 71 | Takayasu arteritis biologic therapy | 1701 | 3025 | 41209134 | 51,851 | review | Insight Into the Role of NLRP3 Inflammasomes in Takayasu's Arteritis: Mechanisms a... |
| 72 | Icosapent ethyl residual cardiovascular risk | 900 | 4138 | 38363478 | 52,358 | guideline_or_consensus | A Practical Approach to the Management of Residual Cardiovascular Risk: United Ara... |
| 73 | Minimal Change Disease | 1123 | 5174 | 42505184 | 52,544 | tier_1_guideline | Paraneoplastic Minimal Change Disease Signaling Post-Transplant AML Relapse: Two C... |
| 74 | Pneumocystis jirovecii Pneumonia | 1351 | 3662 | 33846857 | 53,184 | guideline | Primary prophylaxis of bacterial infections and Pneumocystis jirovecii pneumonia i... |
| 75 | Tonsillitis, peritonsillar abscess and deep neck infection | 1752 | 4204 | 26755048 | 54,720 | guideline_or_consensus | Clinical practice guideline: tonsillitis I. Diagnostics and nonsurgical management |
| 76 | Fever of unknown origin FUO: classical definition, systematic investigation, commo... | 682 | 2158 |  | 55,293 | guideline | Recommendations for Updating Fever and Inflammation of Unknown Origin From a Modif... |
| 77 | MINOCA: ischaemia with non-obstructive coronary arteries workup and management | 1125 | 5149 | 42901730 | 56,556 | tier_1_guideline | Heterogeneity in the diagnostic management of MINOCA: a UK clinician survey |
| 78 | Metabolic Alkalosis | 1098 | 5019 | 35525634 | 56,987 | guideline | Metabolic Alkalosis Pathogenesis, Diagnosis, and Treatment: Core Curriculum 2022 |
| 79 | Chronic Tophaceous Gout | 396 | 3602 | 23024028 | 57,982 | guideline | 2012 American College of Rheumatology guidelines for management of gout. Part 1: s... |
| 80 | Cervical Cancer | 354 | 2072 |  | 58,101 | guideline | Self-Collected Vaginal Specimens for HPV Testing Recommendations From the Enduring... |
| 81 | Bone Marrow Fibrosis Grading | 268 | 4673 |  | 58,318 | guideline | Toward integrated multimodal artificial intelligence in bone marrow examination: c... |
| 82 | systemic analgesia | 1695 | 2948 | 42375195 | 59,014 | meta-analysis | Comparative effectiveness of regional analgesia techniques after gastrectomy for g... |
| 83 | Large bowel obstruction, volvulus, and pseudo-obstruction management | 998 | 2245 |  | 59,993 | guideline | WSES consensus guidelines on sigmoid volvulus management |
| 84 | Sedation and analgesia in mechanically ventilated patients: ABCDEF bundle | 1575 | 5114 | 42430391 | 60,496 | tier_1_guideline | Association of nurse-led targeted sedation-analgesia management with ventilation d... |
| 85 | Radial versus femoral access for PCI | 1486 | 1754 |  | 60,830 | guideline | Distal radial access in interventional cardiology technique, pitfalls and recommen... |
| 86 | cardiac resynchronization therapy heart failure COMPANION trial | 316 | 1881 |  | 61,755 | guideline | Cardiac resynchronization therapy for enabling guideline-directed medical therapy ... |
| 87 | Biliary Strictures | 249 | 2199 |  | 63,182 | guideline | Clinical practice guideline on the use of single-operator cholangioscopy in the di... |
| 88 | Benign Pleural Diseases | 242 | 5162 | 40365090 | 64,315 | tier_1_guideline | Asbestos and benign pleural diseases: a narrative review |
| 89 | Bone Metastases and Palliative Radiotherapy | 269 | 1446 | 39862925 | 65,033 | meta-analysis | Stereotactic body radiotherapy for non-spine bone metastases: A meta-analysis and ... |
| 90 | Hypertensive Nephrosclerosis | 878 | 4108 | 41141162 | 65,818 | systematic_review_or_meta... | Hypertensive Nephrosclerosis: Pathological Changes and Overlap with Diabetic Nephr... |
| 91 | latent tuberculosis | 1001 | 1755 |  | 66,867 | guideline | Guidelines for the Treatment of Latent Tuberculosis Infection Recommendations from... |
| 92 | Sjogren syndrome systemic and topical therapy | 1623 | 1489 | 38161245 | 68,625 | guideline | S3 guideline Atopic dermatitis: Part 2 - Systemic treatment |
| 93 | Cryptococcal meningitis induction therapy | 485 | 2275 | 38346436 | 69,135 | guideline | Global guideline for the diagnosis and management of cryptococcosis: an initiative... |
| 94 | Psychogenic non-epileptic seizures (PNES): video-EEG differentiation, management | 1452 | 1555 | 39619491 | 69,331 | systematic review | Psychiatric Comorbidities in Functional Neurological Disorders and Psychogenic Non... |
| 95 | Bronchial Provocation Testing | 280 | 1779 |  | 69,956 | guideline | Chinese Expert Consensus on the Testing Process, Quality Control and Clinical Appl... |
| 96 | Acute Disseminated Encephalomyelitis (ADEM): paediatric predominance, MRI characte... | 39 | 5248 | 33830467 | 70,476 | tier_1_guideline | Assessment and Management of Acute Disseminated Encephalomyelitis (ADEM) in the Pe... |
| 97 | Viral haemorrhagic fevers and high-consequence infectious diseases in the ICU | 1849 | 1595 | 42175870 | 71,080 | guideline | Autopsy practices for high-consequence infectious diseases: global guidelines, alt... |
| 98 | ICU delirium: CAM-ICU assessment, prevention, and management | 903 | 4449 | 39982143 | 72,348 | guideline_or_consensus | A Focused Update to the Clinical Practice Guidelines for the Prevention and Manage... |
| 99 | seizures | 1579 | 1980 | 37655702 | 73,204 | guideline | Treatment of seizures in the neonate: Guidelines and consensus-based recommendatio... |
| 100 | Contrast-associated acute kidney injury prevention | 453 | 4185 | 30424723 | 73,880 | systematic_review_or_meta... | Effectiveness of contrast-associated acute kidney injury prevention methods; a sys... |
| 101 | SGLT2 inhibitor therapy for type 2 diabetes | 1606 | 4323 | 41721639 | 74,778 | systematic_review_or_meta... | Renal Protection at a Metabolic Cost: A Systematic Review and Meta‐Analysis of Per... |
| 102 | Giant cell arteritis: ESR/CRP, temporal artery ultrasound, high-dose steroids | 725 | 1675 |  | 75,065 | guideline | Treat-to-target recommendations in giant cell arteritis and polymyalgia rheumatica |
| 103 | morbilliform rash | 1138 | 4306 | 39888589 | 75,221 | literature_article | Morbilliform Eruptions: Differentiating Low-Risk Drug Eruptions, Severe Cutaneous ... |
| 104 | Bempedoic acid cardiovascular outcomes | 240 | 5868 | 42986564 | 75,962 | review/article | Bempedoic Acid in Statin-Intolerant Patients: Real-World Implementation Strategies... |
| 105 | Biologic therapies in severe eosinophilic asthma | 255 | 953 | 41904357 | 76,276 | review_article | Current and Emerging Biologic Therapies for Severe Asthma. |
| 106 | Amyotrophic Lateral Sclerosis (ALS): El Escorial criteria, riluzole, non-invasive ... | 120 | 3467 | 38470068 | 77,507 | guideline | European Academy of Neurology (EAN) guideline on the management of amyotrophic lat... |
| 107 | spironolactone mineralocorticoid antagonist severe heart failure survival | 1640 | 4695 | 42790283 | 80,064 | guideline | Practical Implementation of Steroidal and Nonsteroidal Mineralocorticoid Receptor ... |
| 108 | Tetanus: immunisation status, wound assessment, tetanus immunoglobulin, metronidazole | 1718 | 4144 | 42637638 | 81,262 | guideline | Chinese expert consensus on tetanus prophylaxis in major trauma (2026 Edition) |
| 109 | Acute Transplant Rejection | 76 | 5096 | 42189216 | 84,619 | tier_1_guideline | Multiparametric cardiac MRI in the diagnosis of transplant rejection in patients a... |
| 110 | Noninfectious uveitis biologic therapy | 1201 | 5180 | 41817543 | 85,493 | tier_1_guideline | Noninfectious uveitis: Management with biologic agents |
| 111 | haematological malignancy | 759 | 1953 |  | 87,652 | guideline | Preventing pneumococcal infections in patients with hematological malignancies a r... |
| 112 | Antimicrobial resistance mechanisms: beta-lactamases, efflux pumps, porins, target... | 162 | 5960 | 26261001 | 91,951 | review/article | Mechanisms of antimicrobial resistance in Gram-negative bacilli. |
| 113 | Cancer Cachexia | 299 | 5277 | 34144781 | 93,102 | guideline | Cancer cachexia in adult patients: ESMO Clinical Practice Guidelines&lt;sup&gt;☆&l... |
| 114 | Monocytosis and Lymphocytosis Diagnostic Algorithms | 1136 | 3125 | 35732831 | 93,594 | guideline | The 5th edition of the World Health Organization Classification of Haematolymphoid... |
| 115 | Airway Obstruction in Malignancy | 97 | 1422 |  | 94,634 | guideline | World Association for Bronchology and Interventional Pulmonology (WABIP) guideline... |
| 116 | Gynaecomastia: causes, drug-induced, physiological, investigation, management | 758 | 3553 | 42258023 | 95,797 | guideline | Management of gynecomastia in adolescence and adults: the clinical practice guidel... |
| 117 | Asthma biologic therapy anti-IgE and anti-IL5 | 195 | 5084 | 34047953 | 98,020 | tier_1_guideline | Association Between Baseline Anti-cyclic Citrullinated Peptide Antibodies and 6-Mo... |
| 118 | Coronary angiography timing after cardiac arrest | 457 | 1453 | 40040619 | 98,772 | guideline | International Consensus on Evidence Gaps and Research Opportunities in Extracorpor... |
| 119 | Autoimmune Gastritis and Pernicious Anaemia | 213 | 5111 | 36698620 | 99,116 | tier_1_guideline | Examining the Diagnosis and Treatment Experiences of People Living With Autoimmune... |
| 120 | new airway devices | 1192 | 2028 |  | 100,161 | guideline | New Guidelines of Pediatric Cardiac Implantable Electronic Devices What Is Changin... |
| 121 | Chronic Pancreatitis | 392 | 1467 | 38169174 | 103,957 | guideline | ESPEN practical guideline on clinical nutrition in acute and chronic pancreatitis |
| 122 | Infection in solid organ transplant: timeline, CMV prophylaxis, PCP, opportunistic... | 927 | 1488 | 38527780 | 106,441 | guideline | Prevention of Cytomegalovirus Infection in Solid Organ Transplant Recipients: Guid... |
| 123 | Candidemia and invasive fungal infections in the ICU | 303 | 951 | 24445340 | 108,257 | review_article | Invasive fungal infections in the ICU: how to approach, how to treat. |
| 124 | Amyotrophic Lateral Sclerosis pulmonary care | 121 | 4864 | 41018945 | 111,401 | Recovered MCQ evidence | Pan-Asian consortium for treatment and research in ALS (PACTALS) guidelines for ma... |
| 125 | Belimumab in Lupus Therapy | 238 | 1865 | 37827694 | 112,708 | guideline | EULAR recommendations for the management of systemic lupus erythematosus: 2023 upd... |
| 126 | MRSA bacteremia treatment | 1143 | 2123 |  | 114,139 | guideline | Treatment of Methicillin-Resistant Staphylococcus aureus (MRSA) Bacteremia-Guideli... |
| 127 | STEMI primary PCI reperfusion | 1662 | 2188 |  | 114,732 | guideline | SCAI Expert Consensus Statement on the Management of Patients With STEMI Referred ... |
| 128 | IBD in Pregnancy | 897 | 1485 | 42117726 | 118,526 | guideline | Asian Pacific Association of Gastroenterology (APAGE) Clinical Practice Guidelines... |
| 129 | Squamous Cell Carcinoma of Head and Neck | 1650 | 3641 | 41773753 | 120,201 | guideline | Guidelines for nutrition in adults with head and neck cancer: The American Society... |
| 130 | Targeted Therapy Principles | 1706 | 2066 |  | 122,073 | guideline | Chinese guidelines for HER2-targeted therapy in gastric and gastroesophageal junct... |
| 131 | Benzodiazepine deprescribing in anxiety and insomnia | 244 | 5184 | 38516102 | 125,251 | tier_1_guideline | Prescribing and deprescribing guidance for benzodiazepine and benzodiazepine recep... |
| 132 | Organ donation after brain death and DCD: ICU donor management | 1237 | 5107 | 42453307 | 126,627 | tier_1_guideline | The Bucharest international European Society for Organ Transplantation consensus o... |
| 133 | Vulvar and Vaginal Cancers | 1867 | 5285 | 37369376 | 132,917 | guideline | European Society of Gynaecological Oncology Guidelines for the Management of Patie... |
| 134 | Silicosis | 1618 | 2803 | 42412737 | 135,556 | guideline | AWMF S2k Guideline: Diagnosis and Assessment of Lung Disease Caused by Occupationa... |
| 135 | metformin diabetes | 1106 | 5077 | 40725640 | 137,962 | tier_1_guideline | Metformin's Overall Effectiveness and Combined Action with Lifestyle Interventions... |
| 136 | Anaemia of Chronic Disease | 123 | 1426 |  | 141,712 | guideline | British Society of Gastroenterology guidelines for the management of iron deficien... |
| 137 | Congenital adrenal hyperplasia: 21-hydroxylase deficiency, glucocorticoid replacement | 439 | 5095 | 42108595 | 149,016 | tier_1_guideline | Obesity in Classic Congenital Adrenal Hyperplasia: Mechanisms, Complications and M... |
| 138 | Typhoid fever: Salmonella typhi, Widal test, blood culture, azithromycin, ceftriaxone | 1798 | 4166 | 29851031 | 153,090 | systematic_review_or_meta... | Vaccines for preventing typhoid fever |
| 139 | Contrast-Induced AKI | 454 | 1402 | 42859779 | 158,677 | guideline | Clinical practice guideline for renal replacement therapy in critically ill patien... |
| 140 | IgG4-Related Disease | 913 | 2217 | 32552502 | 164,639 | guideline | European Guideline on IgG4-related digestive disease - UEG and SGF evidence-based ... |
| 141 | low back pain | 1027 | 2038 |  | 168,033 | guideline | Saudi Clinical Practice Guideline for the Assessment and Management of Low Back Pa... |
| 142 | sciatica | 1562 | 2038 |  | 168,033 | guideline | Saudi Clinical Practice Guideline for the Assessment and Management of Low Back Pa... |
| 143 | squamous cell carcinoma | 1649 | 1486 | 37717283 | 171,483 | guideline | European consensus-based interdisciplinary guideline for invasive cutaneous squamo... |
| 144 | Metabolic acidosis in chronic kidney disease | 1097 | 5104 | 40870903 | 177,727 | tier_1_guideline | Metabolic Acidosis in Patients with Chronic Kidney Disease: Diagnosis, Pathogenesi... |
| 145 | Mechanical thrombectomy: extended time windows, ASPECT scores, CT perfusion | 1076 | 1571 | 30808653 | 184,986 | guideline | European Stroke Organisation (ESO) - European Society for Minimally Invasive Neuro... |
| 146 | Anti-CD20 Therapy in Rheumatology | 146 | 5274 | 36318966 | 232,695 | guideline | British Society for Rheumatology guideline on prescribing drugs in pregnancy and b... |
| 147 | Neonatal lupus: anti-Ro, anti-La, congenital heart block, counselling | 1177 | 5274 | 36318966 | 232,695 | guideline | British Society for Rheumatology guideline on prescribing drugs in pregnancy and b... |
| 148 | Adrenal incidentaloma: imaging characteristics, biochemical workup, surveillance p... | 82 | 1416 |  | 241,852 | guideline | European Society of Endocrinology clinical practice guidelines on the management o... |
| 149 | Contact dermatitis: irritant vs allergic, patch testing and management | 446 | 1798 |  | 255,256 | guideline | European Society of Contact Dermatitis Guideline for Diagnostic Patch Testing-Reco... |
| 150 | Chronic pancreatitis pain and exocrine insufficiency | 393 | 1466 | 39639485 | 270,197 | guideline | European guidelines for the diagnosis and treatment of pancreatic exocrine insuffi... |
| 151 | Vascular Access for Haemodialysis | 1823 | 2215 |  | 303,207 | guideline | UK Kidney Association Clinical Practice Guideline on vascular access for haemodial... |
| 152 | Autoimmune hepatitis immunosuppression | 216 | 1739 |  | 322,042 | guideline | British Society of Gastroenterology guidelines for diagnosis and management of aut... |
| 153 | Turner syndrome 45X: HRT timing, cardiac surveillance, growth hormone therapy | 1788 | 5217 | 28705803 | 392,632 | tier_1_guideline | Clinical practice guidelines for the care of girls and women with Turner syndrome:... |
| 154 | Molecular testing in NSCLC adenocarcinoma | 1134 | 4433 | 23552377 | 479,335 | guideline | Molecular Testing Guideline for Selection of Lung Cancer Patients for EGFR and ALK... |

## 6. Skip List — Do Not Build (55 Topics)

These topics from the 629 workbook either already have a replacement draft staged on prod (`Better draft ready = yes`) or are flagged `needs_external_evidence` (wrong document attached).

| # | Topic | Status | Replacement Draft ID / Batch | Doc ID |
|---:|---|---|---|---:|
| 1 | ACLS algorithms | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2248 (offline-records-2026-11-24) | 5171 |
| 2 | Acute confusion, agitation, and capacity | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2319 (common257-records-2026-11-24) | 4301 |
| 3 | Acute gout attack in hospital: colchicine contraindications, IV corticosteroids, I... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2321 (common257-records-2026-11-24) | 3363 |
| 4 | Acute pulmonary oedema: NIV, morphine controversy, nitrates, ultrafiltration | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2323 (common257-records-2026-11-24) | 4782 |
| 5 | agitation | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2390 (common257-records-2026-11-24) | 2035 |
| 6 | Alcohol use disorder naltrexone and acamprosate | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2326 (common257-records-2026-11-24) | 4671 |
| 7 | Alcohol withdrawal syndrome and delirium tremens management in ICU | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2250 (offline-records-2026-11-24) | 4978 |
| 8 | Analgesia strategies | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2443 (common257-batch3-2026-11-25) | 2948 |
| 9 | antibiotic stewardship | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2393 (common257-records-2026-11-24) | 1114 |
| 10 | Anticoagulation in Malignancy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2454 (common257-batch3-2026-11-25) | 3487 |
| 11 | Anticoagulation reversal and peri-procedural management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2425 (common257-batch3-2026-11-25) | 3655 |
| 12 | Antipsychotic metabolic monitoring | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2333 (common257-records-2026-11-24) | 3306 |
| 13 | arterial leg ulcer | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2424 (common257-batch3-2026-11-25) | 2128 |
| 14 | Autoantibody panel interpretation: ANA, ENA, dsDNA, ANCA, RF, anti-CCP clinical ut... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2459 (common257-batch3-2026-11-25) | 1813 |
| 15 | Bladder Cancer | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2337 (common257-records-2026-11-24) | 1975 |
| 16 | bowel obstruction | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2420 (common257-batch3-2026-11-25) | 1746 |
| 17 | CABG versus PCI multivessel coronary disease | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2255 (offline-records-2026-11-24) | 5172 |
| 18 | cardiac arrhythmias | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2400 (common257-records-2026-11-24) | 3352 |
| 19 | Cellulitis, erysipelas, and mimics | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2343 (common257-records-2026-11-24) | 4675 |
| 20 | Cirrhosis and portal hypertension | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2345 (common257-records-2026-11-24) | 2013 |
| 21 | Conservative Management of CKD | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2260 (offline-records-2026-11-24) | 2107 |
| 22 | Croup: assessment, severity scoring and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2478 (common257-batch3-2026-11-25) | 4157 |
| 23 | eGFR: Estimation and Limitations | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2268 (offline-records-2026-11-24) | 2465 |
| 24 | Heparin-induced thrombocytopenia: diagnosis and management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2464 (common257-batch3-2026-11-25) | 3157 |
| 25 | Infection in pregnancy: GBS screening, listeria, toxoplasmosis, antiviral safety | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2479 (common257-batch3-2026-11-25) | 5927 |
| 26 | Lithium monitoring and toxicity prevention | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2356 (common257-records-2026-11-24) | 5173 |
| 27 | Malnutrition screening: MUST, NRS-2002, and nutritional support | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2357 (common257-records-2026-11-24) | 4691 |
| 28 | Metabolic resuscitation in sepsis: vitamin C and corticosteroid bundle | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2302 (offline-records-2026-11-24) | 4302 |
| 29 | migraine | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2404 (common257-records-2026-11-24) | 2845 |
| 30 | Nitrate therapy: GTN, isosorbide mononitrate, tolerance, combination use | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2274 (offline-records-2026-11-24) | 5133 |
| 31 | obstructive uropathy | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2405 (common257-records-2026-11-24) | 4220 |
| 32 | oseltamivir treatment influenza healthy adults | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2470 (common257-batch3-2026-11-25) | 3142 |
| 33 | Perioperative steroid management: hydrocortisone cover for adrenal insufficiency i... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2482 (common257-batch3-2026-11-25) | 1678 |
| 34 | renal colic | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2406 (common257-records-2026-11-24) | 2952 |
| 35 | Retinal detachment: presentation and emergency management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2492 (common257-batch3-2026-11-25) | 5369 |
| 36 | Scabies: diagnosis, treatment and outbreak management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2496 (common257-batch3-2026-11-25) | 2773 |
| 37 | secondary stroke prevention | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2409 (common257-records-2026-11-24) | 816 |
| 38 | SGLT2 inhibitors heart failure | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2367 (common257-records-2026-11-24) | 3208 |
| 39 | shoulder pathology | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2493 (common257-batch3-2026-11-25) | 2959 |
| 40 | Spontaneous bacterial peritonitis vs secondary surgical peritonitis | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2461 (common257-batch3-2026-11-25) | 2826 |
| 41 | Status epilepticus emergency treatment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2449 (common257-batch3-2026-11-25) | 3174 |
| 42 | stroke | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2412 (common257-records-2026-11-24) | 1459 |
| 43 | suicide risk assessment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2413 (common257-records-2026-11-24) | 2974 |
| 44 | Surgical site infection prevention | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2378 (common257-records-2026-11-24) | 2837 |
| 45 | suspected pulmonary embolism diagnosis YEARS algorithm D-dimer CT pulmonary angiog... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2414 (common257-records-2026-11-24) | 2968 |
| 46 | thrombocytopenia | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2465 (common257-batch3-2026-11-25) | 3001 |
| 47 | Thyroiditis: Hashimotos, de Quervains, postpartum - phases, TSH trajectory, manage... | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2457 (common257-batch3-2026-11-25) | 3149 |
| 48 | Transient ischemic attack rapid assessment | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2384 (common257-records-2026-11-24) | 4598 |
| 49 | Traumatic brain injury intracranial pressure management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2289 (offline-records-2026-11-24) | 5380 |
| 50 | typhoid | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2495 (common257-batch3-2026-11-25) | 4218 |
| 51 | Vascular dementia: Hachinski ischaemic score, subcortical ischaemic vascular dementia | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2314 (offline-records-2026-11-24) | 2880 |
| 52 | venous leg ulcer | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2423 (common257-batch3-2026-11-25) | 2128 |
| 53 | Venous thromboembolism and anticoagulation management | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2426 (common257-batch3-2026-11-25) | 1662 |
| 54 | viral hepatitis C | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2473 (common257-batch3-2026-11-25) | 3108 |
| 55 | withdrawal syndrome | SKIP_HAS_BETTER_DRAFT_ON_PROD | 2416 (common257-records-2026-11-24) | 4978 |

## 7. Hand-Back Checklist & Summary Table

Save your built `.md` records and a `BATCH_2_HAND_BACK.md` summary table with columns:

| # | Topic | Doc ID | Built? | Recs Count | Anchors Verified (pass/total) | Fit (full / partly / fit_error) | Sections Excluded / Notes |

Confirm **0 anchor failures** (`40–130` chars exact substring in `norm(full_text)`) before handing back.
