# Audit & Remapping Plan — `Poor_fit_needs_better_evidence_76_topics_2026-11-25.xlsx`

Prepared 2026-11-25 from `C:\Users\ansh0\Downloads\Poor_fit_needs_better_evidence_76_topics_2026-11-25.xlsx` cross-checked against `database\app.db` (`guideline_documents`, `topic_evidence_registry`) and Batch 1 (`B1_001_*`–`B1_155_*`).

---

## 1. Executive Summary

- **Total topics in workbook:** `76` (`27` `Common`, `34` `Academic`, `15` `unclassified`)
- **Overlap with 629-topic unanchored workbook:** `76 / 76` (`100%`)
- **Cross-check against local `database\app.db`:**
  - Every one of the `76` topics exists in local `topic_evidence_registry`.
  - **Group A — Usable Alternate Full-Text Document Already in `app.db`:** A substantial subset of the 76 topics **already have a usable full-text guideline or review in `guideline_documents`** that was omitted from the 76-topic Excel's `Stored documents` column (including **7 topics already verified `full` in Batch 1** and several clear remappings in Batches 2–3).
  - **Group B — Genuine External Evidence Gaps:** The remaining topics (especially `11` `Common` gaps + `fit_error`s from Batch 1) genuinely have only narrow trials, single case reports, or keyword-collision off-topic documents in `app.db` and require open-access society guidelines or systematic reviews to be fetched and ingested.

---

## 2. Group A — Topics That Already Have Better Local Documents in `app.db`

### A1. Verified `full` in Batch 1 (`7` topics — already built & 100% anchor-verified)
| # | Topic | Priority | Local `doc_id` | Local Document Title | Batch 1 Record |
|---:|---|---|---:|---|---|
| 1 | Acute red eye: differential diagnosis and emergency management | Common | `4232` | Differentiating Urgent and Emergent Causes of Acute Red Eye for the Emergency Physician | `B1_021_4232.md` |
| 12 | portal hypertension | Common | `3672` | Austrian consensus on the diagnosis and management of portal hypertension in advanced chronic liver disease (Billroth IV) | `B1_145_3672.md` |
| 17 | Sleep apnoea and cardiovascular disease: CPAP, AF risk, hypertension, arrhythmia | Common | `3098` | Sleep Apnea: Types, Mechanisms, and Clinical Cardiovascular Consequences | `B1_071_3098.md` |
| 26 | Viral hepatitis A and E: faeco-oral transmission, self-limiting, vaccination, fulminant hepatitis | Common | `3302` | Therapeutic, preventive, and pathogenetic advances in viral hepatitis | `B1_104_3302.md` |
| 32 | Arterial blood gas interpretation in the ICU: systematic approach | unclassified | `4982` | Interpretation of arterial blood gas | `B1_026_4982.md` |
| 38 | Carpal tunnel syndrome: median nerve compression, Phalen, EMG, conservative vs surgical | unclassified | `1270` | American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline | `B1_041_1270.md` |
| 56 | IL-6 inhibition: tocilizumab, sarilumab in RA and cytokine storm, COVID-19 trials | Academic | `1386` | A systematic literature review informing the consensus | `B1_136_1386.md` |

### A2. Strong Local Remapping Candidates in `app.db` (Batches 2 & 3 / `partly` topics)
| # | Topic | Priority | Current Excel / Weak Doc | Better Local `doc_id` in `app.db` | Local Title |
|---:|---|---|---|---:|---|
| 6 | Fever of unknown origin FUO | Common | — | `2158` | Recommendations for Updating Fever and Inflammation of Unknown Origin From a Modified Delphi Consensus Panel |
| 8 | Large bowel obstruction, volvulus, and pseudo-obstruction management | Common | — | `2245`, `2232` | WSES consensus guidelines on sigmoid volvulus (`2245`); Optimal management of malignant left-sided LBO (`2232`) |
| 9 | lower urinary tract symptoms | Common | `3323` (trial) | `4292` | Surgical Management of LUTS Attributed to BPH: AUA Guideline |
| 13 | Pyelonephritis: inpatient vs outpatient, Gram-negative coverage, imaging | Common | `4483` (CT resolution) | `2392` | `nice_pyelonephritis` (NICE NG111) |
| 14 | Radial versus femoral access for PCI | Common | `1754` (distal radial) | `1400` | 2023 ESC Guidelines for the management of acute coronary syndromes |
| 15 | sciatica | Common | — | `2038`, `2382` | Saudi CPG Low Back Pain & Sciatica (`2038`); `nice_low_back_pain` (`2382`) |
| 29 | Amyotrophic Lateral Sclerosis (ALS) | Academic | `4864` | `3467` | European Academy of Neurology (EAN) guideline on ALS |
| 40 | CLABSI: prevention and management | unclassified | `4240` | `4428` | Practice guideline on the prevention and treatment of CLABSI |
| 44 | Delayed puberty | Academic | — | `1544` | Consensus guideline for diagnosis and management of delayed puberty |
| 55 | IgG4-Related Disease | Academic | `1632` | `2217` | European Guideline on IgG4-related digestive disease |
| 58 | Lyme Arthritis | Academic | `4179` | `4208` | Evidence assessments and guideline recommendations in Lyme disease |
| 75 | temporal arteritis | unclassified | `4663` (juvenile case review) | `1675` | Treat-to-target recommendations in giant cell arteritis (plus `1512` early referral) |

---

## 3. Group B — Priority Genuine External Evidence Gaps (Require Open-Access Guideline Fetch)

### B1. High-Priority `Common` Topics (`11` core gaps)
| # | Topic | Current Local Problem | Target Open-Access Guideline / SR to Fetch |
|---:|---|---|---|
| 2 | Cervical Cancer | Only HPV self-collection (`2072`) | ESMO / FIGO / WHO / ASCO Cervical Cancer Clinical Practice Guideline (OA) |
| 4 | Diabetic retinopathy anti-VEGF therapy | `4141` is Fenofibrate Delphi; `4181` is screening only | EURETINA / AAO / NICE Diabetic Retinopathy & DME anti-VEGF guideline or Cochrane/NMA OA review |
| 10 | new airway devices | `2028` is Pediatric Cardiac Implantable Electronic Devices (keyword collision) | Difficult Airway Society (DAS) / ASA Difficult Airway & Videolaryngoscopy / Supraglottic Airway Guideline (OA) |
| 11 | paediatric dehydration | `5030` is a Kenyan neonatal audit | ESPGHAN / ESPID Acute Gastroenteritis & Dehydration in Children Guideline or NICE CG84 (OA) |
| 18 | Stable coronary disease invasive strategy | Only ISCHEMIA trial (`455`) + meta-analysis (`3099`) | 2024 ESC Chronic Coronary Syndromes or 2023 AHA/ACC Chronic Coronary Disease Guideline |
| 20 | Symptomatic bradycardia: atropine, temporary pacing, transcutaneous pacing | `4241` is permanent DDDR vs AAIR pacemakers (`fit_error`) | 2018 ACC/AHA/HRS Bradycardia & Cardiac Conduction Delay Guideline or 2021 ESC Pacing Guideline |
| 21 | Synovial fluid analysis: WBC thresholds, crystals, viscosity, culture | `4661` is knee OA proteomics | BSR / EULAR Septic Arthritis & Crystal Arthropathy Synovial Fluid Diagnosis Guideline/Review (OA) |
| 22 | Thyroid function in pregnancy: trimester-specific TSH ranges | `4949` is child ADHD meta-analysis | 2017 ATA Guidelines for Diagnosis & Management of Thyroid Disease During Pregnancy & Postpartum |
| 23 | Thyroid nodule evaluation and FNA | `3054` is Raman spectroscopy | 2015 ATA / 2023 ETA Thyroid Nodule Clinical Practice Guideline (OA) |
| 24 | type 1 diabetes management | `1377` is Type 2 diabetes CGM (`fit_error`) | 2021 ADA/EASD Management of Type 1 Diabetes Consensus Report or NICE NG17 |
| 25 | Typhoid fever: Salmonella typhi, Widal, blood culture, azithromycin, ceftriaxone | `4166` is vaccines only; `1983` is general gastroenteritis | WHO / Cochrane / Infectious Disease Society Enteric Fever Diagnosis & Antimicrobial Treatment Guideline/SR (OA) |

*(Secondary `Common` topics with reviews/meta-analyses rather than full society guidelines: `#3 Diabetes insipidus`, `#7 hypertension >=80yo`, `#19 S. aureus bacteremia`, `#27 viral wheeze`.)*

### B2. Priority `Academic` / `unclassified` `fit_error` & Severe-Mismatch Topics
- **#45 Drug-Induced ILD** (`1570` is GI side effects) → Fetch Fleischner Society / ESMO / ATS Drug-Induced ILD consensus/review (OA).
- **#60 Noninvasive ventilation for COPD hypercapnic failure** (`2890` is diaphragmatic ultrasound weaning) → Fetch 2017 ERS/ATS Official Clinical Practice Guidelines on NIV for Acute Respiratory Failure (OA).
- **#67 Protein-Losing Enteropathy** (`4510` is canine veterinary erratum) → Fetch human PLE / Fontan-associated PLE clinical review/guideline (OA).
- **#72 / #73 Scleroderma Renal Crisis** (`4596` is classification core set only) → Fetch 2023/2024 EULAR Systemic Sclerosis update (SRC section) + dedicated SRC ACEi/captopril systematic review (OA).
- **#59 Neonatal lupus: anti-Ro, anti-La, congenital heart block** (`5274` lacks CHB screening/management) → Fetch neonatal lupus / anti-Ro CHB screening & management consensus/review (OA).
- **#33 / #34 Bone Marrow Biopsy & Fibrosis Grading** (`4673` is multimodal AI) → Fetch ICSH / WHO / ELN bone marrow biopsy & reticulin fibrosis grading guideline (OA).
- **#41 Chronic Allograft Dysfunction** (`2139` is Thai general transplant immunosuppression) → Fetch KDIGO / Banff / BTS Chronic Renal Allograft Dysfunction review/guideline (OA).

---

## 4. Recommended Next Execution Step
1. **Remap Group A (`~19` topics)** in `topic_evidence_registry` so Batches 2 & 3 use the better `doc_id`s already stored in `app.db`.
2. **Stage & Ingest Group B (`~18–25` priority OA guidelines)** via PMC Open Access XML / PDF download into `guideline_documents`, update `topic_evidence_registry.primary_document_id`, and then build their verbatim-anchored synopses + MCQs.
