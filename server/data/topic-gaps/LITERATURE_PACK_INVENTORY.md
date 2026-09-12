# Literature pack inventory

Audited against local SQLite (`database/app.db`) after batches 1–19.

## What we have done

| Pack | Source file | Topics |
| --- | --- | ---: |
| clinical-topics-batch-1.json | next_10.docx + xlsx | 15 |
| clinical-topics-batch-2.json | next_10-20.docx | 10 |
| clinical-topics-batch-3.json | next_20-30.docx | 10 |
| clinical-topics-batch-4.json | next_30-50.docx | 20 |
| clinical-topics-batch-5.json | next_50-75.docx | 25 |
| clinical-topics-batch-6.json | next_75-100.docx | 25 |
| clinical-topics-batch-7.json | next_100-125.docx | 25 |
| clinical-topics-batch-8.json | next_175-200.docx | 25 |
| clinical-topics-batch-9.json | next_200-225.docx | 25 |
| clinical-topics-batch-10.json | next_225-250.docx | 25 |
| clinical-topics-batch-11.json | next_250-275.docx | 25 |
| clinical-topics-batch-12.json | next_300-325.docx | 25 |
| clinical-topics-batch-13.json | next_325-350.docx | 25 |
| clinical-topics-batch-14.json | next_350-375.txt | 25 |
| clinical-topics-batch-15.json | next_375-400.docx | 25 |
| clinical-topics-batch-16.json | next_425-450.docx | 25 |
| clinical-topics-batch-17.json | next_450-475.docx | 25 |
| clinical-topics-batch-18.json | 475-500.docx | 25 |
| clinical-topics-batch-19.json | next cases.docx | 18 |
| **Total** | | **423** |

Numbering skipped **126–174** and **276–299**. `400-425.docx` was a duplicate of batch 15 and was not imported again.

## Completeness of imported topics

- **423 / 423** pack topics have at least one paper (`teaching_objects` type `paper`).
- **423 / 423** expected guideline rows exist (`topic_guidelines` for every topic that had a guideline-class finding).
- **419 / 423** have a fetched publisher abstract (≥80 characters).
- **34 / 423** also have open-access full text in `pdf_sections` (paywalled society/journal PDFs are not stored).

The four imported topics without a fetched publisher abstract still have curated recommendation text:

- Hyperphosphataemia in CKD
- Bell's palsy
- STOPP/START
- Silo Filler's Disease

Machine-readable rows: `literature-pack-inventory.json` and `literature-pack-inventory.csv`.

## Empty-gap topics with no literature pack yet

These 49 titles are still on the original empty-topic list and were never in a sent file (skipped **126–174** / **276–299**, plus leftover A–D titles):

- Anaemia
- Analgesia strategies
- Aneurysmal subarachnoid hemorrhage management
- Anti-CD20 Therapy in Rheumatology
- Antibiotic stewardship for common infections
- Anticoagulation reversal and peri-procedural management
- antidepressant sequential treatment steps depressed outpatients outcomes
- antifungals in ICU
- Anxiety disorders and panic disorder: diagnosis and management
- apixaban versus warfarin atrial fibrillation
- ARDS epidemiology and global burden (LUNG SAFE study)
- ARDS guidelines
- ARDS prone positioning
- aspirin cardiovascular events bleeding healthy elderly primary prevention
- Aspirin-exacerbated respiratory disease management
- asthma biologics
- Atopic dermatitis: diagnosis, stepwise treatment and biologics
- Atrial fibrillation and common arrhythmias
- atrial fibrillation diagnosis and management guideline
- Autosomal dominant polycystic kidney disease tolvaptan
- bariatric surgery versus medical therapy type 2 diabetes STAMPEDE
- BK Virus Nephropathy Post-Transplant
- Bone and joint infection oral step-down therapy
- Bone Marrow Fibrosis Grading
- Bone metastases denosumab and zoledronic acid
- Colorectal cancer screening and FIT strategy
- community acquired pneumonia diagnosis empiric antibiotic management guideline adult
- Community- and hospital-acquired pneumonia
- Compartment syndrome: diagnosis and emergency management
- Complete revascularization after STEMI
- Conservative versus liberal fluid strategy in ARDS (FACTT trial)
- Contact dermatitis: irritant vs allergic, patch testing and management
- continuous positive airway pressure obstructive sleep apnea cardiovascular outcomes SAVE
- COPD management
- Coronary CT angiography for stable chest pain
- covid
- CRISPR-Cas9 gene editing sickle cell disease beta-thalassemia
- Croup: assessment, severity scoring and management
- CT head and CT pulmonary angiography: common acute findings
- Cushings disease: pituitary source, inferior petrosal sinus sampling, transsphenoidal surgery
- Cushings syndrome: ACTH-dependent vs independent, screening, dexamethasone suppression
- Cystic fibrosis CFTR modulator therapy
- dabigatran versus warfarin atrial fibrillation stroke prevention
- Delayed Haemolytic Transfusion Reactions
- Delirium and acute confusional states
- Delirium vs dementia differentiation
- Delirium: recognition, risk factors, prevention and management
- Dementia: behavioural and psychological symptoms management
- Depression and anxiety disorders

Send **276–299**, **126–174**, or a file covering the titles above if you want those filled next.
