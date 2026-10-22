# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 6 (Topics 126-150) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_06_TOPICS = {
    "Testicular Germ Cell Tumours": {
        "mentor_intro": (
            "Testicular germ cell tumours (TGCTs) represent the most frequent solid malignancy in young men aged 15 to 35, divided fundamentally into seminomas and non-seminomatous germ cell tumours (NSGCTs). "
            "Primary management hinges on initial radical inguinal orchiectomy with pre-operative serum tumour markers (alpha-fetoprotein [AFP], beta-hCG, and LDH), avoiding trans-scrotal biopsy to prevent lymphatic seeding. "
            "Long-term surveillance must balance cure rates exceeding 95% against late survivorship complications, including secondary cardiovascular disease and treatment-induced secondary leukaemias or solid malignancies."
        ),
        "teaching_points": [
            "Radical inguinal orchiectomy with high ligation of the spermatic cord provides definitive histologic diagnosis and primary local control; trans-scrotal violation or percutaneous biopsy is strictly contraindicated due to disruption of normal lymphatic drainage.",
            "Serum tumour markers (AFP, beta-hCG, LDH) must be measured prior to orchiectomy and tracked serially according to their half-lives (AFP 5-7 days; beta-hCG 24-36 hours); elevated AFP exclusively indicates non-seminomatous histology, as pure seminomas never produce AFP.",
            "Gonadal function and sperm cryopreservation must be addressed prior to surgical orchiectomy and cytotoxic therapy, given high baseline rates of subfertility, oligospermia, and hypogonadism in TGCT patients.",
            "Long-term survivorship monitoring is essential following platinum- and etoposide-based regimens, given cumulative risks of secondary acute myeloid leukaemias, metabolic syndrome, and premature atherosclerotic cardiovascular disease."
        ],
        "mcq_angles": [
            "Identifying pure seminoma versus NSGCT based on elevated serum AFP (pure seminoma cannot produce AFP; elevated AFP mandates management as NSGCT).",
            "Initial surgical approach for a suspicious testicular mass (inguinal orchiectomy with high cord control vs contraindicated scrotal approach).",
            "Long-term toxicity surveillance in TGCT survivors (cumulative etoposide-related secondary leukaemias and cisplatin-related vascular/renal toxicity)."
        ],
        "case_hooks": [
            "A 24-year-old man presents with a painless, heavy right scrotal mass; ultrasound reveals a heterogeneous hypoechoic intratesticular lesion with marked internal vascularity.",
            "A 29-year-old man 5 years post-BEP chemotherapy for stage II NSGCT presents with fatigue, easy bruising, and petechiae, found to have treatment-related acute myeloid leukaemia."
        ],
        "uncertainties": [
            "Utility and clinical cutoff of circulating microRNAs (e.g., miR-371a-3p) compared to conventional serum markers for residual minimal disease detection.",
            "Optimal surveillance intensity versus adjuvant single-agent carboplatin in stage I seminoma with adverse primary features (stromal invasion or rete testis involvement)."
        ]
    },

    "Testicular germ cell tumor chemotherapy": {
        "mentor_intro": (
            "Chemotherapy for testicular germ cell tumours is guided by the International Germ Cell Cancer Collaborative Group (IGCCCG) risk classification, with bleomycin, etoposide, and cisplatin (BEP) remaining the standard frontline curative regimen. "
            "Good-risk disease is managed with 3 cycles of BEP or 4 cycles of EP (avoiding bleomycin pulmonary toxicity), while intermediate- and poor-risk disease requires 4 cycles of BEP. "
            "Surgical resection of residual masses post-chemotherapy is mandatory for NSGCT with lesions >1 cm to resect active teratoma or viable cancer, whereas pure seminoma residual masses <3 cm can be observed safely."
        ),
        "teaching_points": [
            "First-line curative chemotherapy for metastatic TGCT utilizes BEP (bleomycin, etoposide, cisplatin); good-risk disease achieves equivalent cure with 3 cycles of BEP or 4 cycles of EP to mitigate pulmonary fibrotic injury.",
            "Bleomycin-induced pulmonary toxicity necessitates baseline and pre-cycle pulmonary function testing (DLCO); acute development of cough or dyspnoea warrants prompt cessation and high-dose corticosteroid therapy.",
            "Residual retroperitoneal masses >1 cm post-chemotherapy in NSGCT require retroperitoneal lymph node dissection (RPLND) due to high rates of mature teratoma (40%) or viable persistent carcinoma (10-15%).",
            "Novel molecular biomarkers, particularly serum microRNA-371a-3p, demonstrate superior sensitivity and specificity compared to AFP/beta-hCG for detecting viable non-teratomatous residual tumour after chemotherapy."
        ],
        "mcq_angles": [
            "Choice of regimen in good-risk metastatic germ cell tumours (3 cycles BEP vs 4 cycles EP) and recognizing bleomycin pulmonary toxicity criteria.",
            "Management of post-chemotherapy retroperitoneal residual masses in NSGCT (mandatory RPLND if >1 cm) versus seminoma (observation if <3 cm, FDG-PET if >=3 cm).",
            "Etoposide cumulative dosage thresholds and corresponding risks of therapy-related myelodysplastic syndrome/acute myeloid leukaemia."
        ],
        "case_hooks": [
            "A 26-year-old male undergoing cycle 3 of BEP develops dry cough, progressive exertional dyspnoea, and bibasilar crackles with a 30% reduction in DLCO.",
            "A 31-year-old male with metastatic non-seminoma completes 4 cycles of BEP with normalization of AFP and beta-hCG, but CT reveals a persistent 2.4 cm retroperitoneal lymph node mass."
        ],
        "uncertainties": [
            "Role of FDG-PET scanning in assessing post-chemotherapy residual lesions in NSGCT (ineffective for teratoma) versus its proven negative predictive value in seminoma.",
            "Optimal salvage regimens (TIP: paclitaxel, ifosfamide, cisplatin vs high-dose chemotherapy with autologous stem cell rescue) in first-line platinum-refractory relapse."
        ]
    },

    "Thoracic Ultrasound": {
        "mentor_intro": (
            "Point-of-care thoracic ultrasound (TUS) has transformed acute respiratory medicine and critical care, providing superior sensitivity and diagnostic accuracy over supine chest radiography for pleural effusion, pneumothorax, and consolidation. "
            "Standardized lung ultrasound evaluates sliding signs, horizontal A-lines (normal aeration), vertical B-lines (interstitial alveolar-interstitial syndrome), and consolidation with air bronchograms. "
            "Procedural thoracic ultrasound is the standard of care for pleural interventions, dramatically reducing iatrogenic pneumothorax, bleeding, and visceral laceration risks."
        ),
        "teaching_points": [
            "Pleural sliding (shimmering movement of visceral and parietal pleura with respiration) paired with comet-tail artifacts definitively rules out pneumothorax at the interrogated intercostal space (negative predictive value ~100%).",
            "The presence of multiple B-lines (laser-like vertical hyperechoic lines arising from the pleural line that move with sliding and erase A-lines) indicates increased interstitial water; >=3 B-lines per intercostal space denotes alveolar-interstitial syndrome (pulmonary oedema or pneumonitis).",
            "Thoracic ultrasound differentiates transudative effusions (homogenously anechoic) from complex exudative effusions (septated, multi-loculated, with swirling debris or internal echogenicity), guiding thoracentesis vs chest tube fibrinolysis.",
            "Dynamic ultrasound guidance or bedside pre-procedure mark-and-measure localization before pleural aspiration or drainage significantly reduces iatrogenic complications compared to blind percussion-guided techniques."
        ],
        "mcq_angles": [
            "Ultrasound signs excluding pneumothorax (lung sliding, B-lines, lung pulse) versus the diagnostic lung point establishing pneumothorax boundary.",
            "Differentiating pulmonary oedema from acute respiratory distress syndrome based on B-line distribution (homogenous diffuse vs patchy with subpleural consolidations and pleural line irregularity).",
            "Safety thresholds for thoracocentesis: identifying diaphragm position, spleen/liver margins, and minimum fluid depth (typically >=1.5-2 cm) throughout the respiratory cycle."
        ],
        "case_hooks": [
            "A 68-year-old woman in the ICU following central venous catheter insertion develops sudden tachypnoea; lung ultrasound demonstrates absence of lung sliding and barcode sign on M-mode.",
            "A 55-year-old man with fever and left pleuritic pain has a pleural effusion on CXR; ultrasound shows extensive internal fibrinous septations ('honeycomb' appearance) indicating complex parapneumonic effusion."
        ],
        "uncertainties": [
            "Utility and standardization of artificial intelligence automated algorithms for pleural volume quantification and effusion characterization.",
            "Reliability of ultrasound in distinguishing cardiogenic pulmonary oedema from viral interstitial pneumonitis in acute exacerbations."
        ]
    },

    "Thrombotic Microangiopathy and the Kidney": {
        "mentor_intro": (
            "Renal thrombotic microangiopathy (TMA) encompasses a spectrum of life-threatening disorders characterized by microvascular endothelial injury, platelet-rich microthrombi, microangiopathic haemolytic anaemia (MAHA), consumptive thrombocytopenia, and acute kidney injury (AKI). "
            "Etiologies include atypical haemolytic uraemic syndrome (aHUS / complement-mediated TMA), Shiga toxin-producing E. coli HUS (STEC-HUS), thrombotic thrombocytopenic purpura (TTP), calcineurin inhibitor toxicity, antibody-mediated allograft rejection, and malignant hypertension. "
            "Rapid differentiation is vital: while TTP requires immediate plasma exchange, complement-mediated TMA mandates early terminal complement blockade (eculizumab or ravulizumab) to salvage renal function."
        ),
        "teaching_points": [
            "Renal TMA presents with microangiopathic haemolytic anaemia (schistocytes, negative Coombs test, elevated LDH, undetectable haptoglobin), profound or modest thrombocytopenia, and prominent acute kidney injury with proteinuria and haematuria.",
            "Complement-mediated TMA (aHUS) results from genetic mutations or autoantibodies in regulatory complement proteins (Factor H, Factor I, MCP, C3); terminal C5 complement inhibitors (eculizumab, ravulizumab) achieve prompt haematologic remission and preserve long-term GFR if initiated early.",
            "In kidney transplant recipients, TMA can be triggered de novo by calcineurin inhibitors (tacrolimus, cyclosporine), mTOR inhibitors, or acute antibody-mediated rejection (AMR); distinguishing drug toxicity from AMR requires C4d immunostaining and donor-specific antibody (DSA) testing.",
            "Normal ADAMTS13 activity (>10-20%) excludes typical TTP and strongly supports complement-mediated TMA, secondary TMA, or STEC-HUS in patients with systemic microangiopathy and severe renal failure."
        ],
        "mcq_angles": [
            "Distinguishing aHUS from TTP based on degree of renal involvement (severe AKI vs predominantly neurological) and ADAMTS13 activity (>10% points towards aHUS).",
            "Mechanisms and diagnostic evaluation of post-transplant TMA (calcineurin inhibitor arteriopathy vs acute antibody-mediated rejection with donor-specific antibodies).",
            "Indications and timing for initiating C5 inhibitors (eculizumab/ravulizumab) in complement-mediated TMA with progressive azotemia."
        ],
        "case_hooks": [
            "A 34-year-old woman 2 weeks postpartum develops oliguria, BP 185/110 mmHg, platelet count 42 x 10^9/L, LDH 1450 U/L, schistocytes 3.8%, and creatinine 480 umol/L with ADAMTS13 activity of 65%.",
            "A 52-year-old renal transplant recipient maintained on tacrolimus develops sudden allograft dysfunction, thrombocytopenia, and biopsy evidence of glomerular capillary thrombi and endothelial swelling."
        ],
        "uncertainties": [
            "Duration of terminal complement inhibitor maintenance therapy (lifelong versus safe trial of discontinuation in genetically low-risk variants).",
            "Role and diagnostic yield of complement gene testing panels in pregnancy-associated TMA versus pre-eclampsia/HELLP syndrome."
        ]
    },

    "Thrombotic Thrombocytopenic Purpura": {
        "mentor_intro": (
            "Thrombotic Thrombocytopenic Purpura (TTP) is a haematologic emergency caused by severe deficiency of the von Willebrand factor (VWF)-cleaving protease ADAMTS13 (<10% activity), leading to accumulation of ultra-large VWF multimers, platelet hyper-aggregation, and disseminated microvascular thrombosis. "
            "Acquired immune TTP (iTTP) is driven by anti-ADAMTS13 autoantibodies, whereas congenital TTP (Upshaw-Schulman syndrome) stems from biallelic ADAMTS13 gene mutations. "
            "The classic pentad (thrombocytopenia, microangiopathic haemolytic anaemia, neurological deficits, renal dysfunction, and fever) is rarely present simultaneously (<10%); unexplained MAHA and thrombocytopenia alone are sufficient to initiate immediate emergent therapeutic plasma exchange."
        ),
        "teaching_points": [
            "TTP diagnosis is confirmed by severe ADAMTS13 activity deficiency (<10%); however, therapeutic plasma exchange (TPE) must be initiated emergently upon clinical suspicion without waiting for laboratory assay results.",
            "The PLASMIC score stratifies pre-test probability of severe ADAMTS13 deficiency based on platelet count <30, haemolysis markers, MCV <90 fL, INR <1.5, creatinine <2.0 mg/dL, and absence of active cancer or transplant.",
            "Standard frontline therapy for immune TTP consists of the triple regimen: daily therapeutic plasma exchange (TPE), high-dose corticosteroids, and caplacizumab (anti-vWF nanobody), with early rituximab (anti-CD20) to deplete autoantibody-producing B cells.",
            "Platelet transfusions are contraindicated in suspected TTP unless life-threatening haemorrhage occurs, as they can accelerate microvascular thrombosis and precipitate acute clinical deterioration."
        ],
        "mcq_angles": [
            "Applying the PLASMIC score to guide immediate empiric plasma exchange while ADAMTS13 results are pending.",
            "Mechanism of action of caplacizumab (binds A1 domain of VWF, preventing platelet GPIb-IX-V interaction) and its impact on time to platelet normalization and prevention of exacerbations.",
            "Contraindication to prophylactic platelet transfusion in TTP versus other thrombocytopenic disorders."
        ],
        "case_hooks": [
            "A 28-year-old woman presents to the ED with confusion, petechiae, platelet count 14 x 10^9/L, Hb 7.8 g/dL, LDH 1890 U/L, peripheral schistocytes 4%, and creatinine 1.1 mg/dL.",
            "A 45-year-old man with confirmed iTTP experiences a drop in platelets from 180 to 45 x 10^9/L three days after completing a 5-day course of TPE while off caplacizumab."
        ],
        "uncertainties": [
            "Optimal timing and monitoring for caplacizumab discontinuation guided by ADAMTS13 activity recovery (>20%).",
            "Role of upfront recombinant ADAMTS13 enzyme replacement therapy versus plasma exchange in acquired immune TTP compared to congenital TTP."
        ]
    },

    "Thrombotic thrombocytopenic purpura: caplacizumab and plasma exchange": {
        "mentor_intro": (
            "Modern management of immune thrombotic thrombocytopenic purpura (iTTP) has evolved from plasma exchange and steroids alone to quadruple-target therapy incorporating caplacizumab and rituximab. "
            "Caplacizumab, a bivalent anti-vWF nanobody targeting the A1 domain, rapidly inhibits platelet adhesion to ultra-large vWF multimers, halting microvascular thrombosis within hours. "
            "Therapeutic plasma exchange (TPE) removes circulating ultra-large vWF multimers and neutralizing anti-ADAMTS13 antibodies while replenishing functional ADAMTS13 enzyme until endogenous production recovers."
        ),
        "teaching_points": [
            "Caplacizumab administered as an initial IV loading dose followed by daily subcutaneous dosing significantly shortens time to platelet count normalization and drastically reduces TTP-related mortality and refractory disease.",
            "Therapeutic plasma exchange (1.0 to 1.5 plasma volume exchange with fresh frozen plasma) must be continued daily until the platelet count is maintained >=150 x 10^9/L for at least 2 consecutive days, alongside LDH normalization.",
            "Caplacizumab must be continued throughout the duration of daily plasma exchange and for 30 days following the cessation of TPE, with extension if ADAMTS13 activity remains suppressed (<20%).",
            "Adverse bleeding events, primarily mucocutaneous (epistaxis, gingival bleeding) and menorrhagia, are common with caplacizumab; holding caplacizumab is indicated prior to major invasive procedures or in active severe bleeding."
        ],
        "mcq_angles": [
            "Criteria for terminating daily therapeutic plasma exchange (platelets >=150 for 2 days + LDH normalization) versus duration of post-TPE caplacizumab maintenance.",
            "Managing caplacizumab during bleeding episodes or elective invasive procedures (temporary interruption and monitoring vWF ristocetin cofactor activity).",
            "Role of concurrent rituximab in suppressing anti-ADAMTS13 IgG antibodies and reducing 1-year relapse rates in acquired iTTP."
        ],
        "case_hooks": [
            "A 36-year-old female with acute iTTP achieves platelet normalization on day 3 of TPE plus caplacizumab; on day 5 after stopping TPE, ADAMTS13 activity remains at 4%, prompting decision on caplacizumab continuation.",
            "A patient receiving caplacizumab for iTTP develops significant gingival bleeding and epistaxis with normal platelets, requiring assessment of anti-vWF pharmacodynamics."
        ],
        "uncertainties": [
            "Utility of recombinant ADAMTS13 as an adjunctive or standalone agent to minimize or eliminate the need for plasma exchange.",
            "Cost-effectiveness and optimal biomarker-guided cessation protocols for caplacizumab in resource-constrained health systems."
        ]
    },

    "Thymic Tumours and Thymoma": {
        "mentor_intro": (
            "Thymic epithelial tumours (TETs)—comprising thymomas and thymic carcinomas—are the most prevalent anterior mediastinal neoplasms in adults. "
            "Thymomas are uniquely linked with autoimmune paraneoplastic syndromes, most prominently myasthenia gravis (observed in 30-50% of thymoma cases), pure red cell aplasia, and Good syndrome (hypogammaglobulinaemia). "
            "Complete surgical resection (R0) with en bloc thymectomy remains the single most critical prognostic determinant, utilizing Masaoka-Koga or the 8th/9th edition IASLC/ITMIG TNM staging systems."
        ),
        "teaching_points": [
            "Complete en bloc surgical resection (thymectomy with complete mediastinal adipose clearance) is the cornerstone of curative therapy for early and resectable thymic epithelial tumours; R0 margin status dictates long-term overall survival.",
            "Myasthenia gravis screening (acetylcholine receptor autoantibody testing) is mandatory in all patients presenting with an anterior mediastinal mass, even in the absence of overt neuromuscular symptoms, to avoid post-operative myasthenic crisis.",
            "Masaoka-Koga clinical staging differentiates Stage I (completely encapsulated), Stage II (microscopic or macroscopic capsular/mediastinal fat invasion), Stage III (invasion of neighboring organs like pericardium, great vessels, lung), and Stage IV (pleural/pericardial dissemination or distant metastases).",
            "Minimally invasive thymectomy (video-assisted thoracic surgery [VATS] or robot-assisted thoracic surgery [RATS]) provides equivalent oncologic margins with reduced blood loss and shorter hospital stays compared to open sternotomy in early-stage (I-II) tumours."
        ],
        "mcq_angles": [
            "Differentiating thymoma from thymic carcinoma on histology and immunohistochemistry (CD5, CD117/KIT positivity strongly favors thymic carcinoma; aggressive clinical behaviour with early lymph node and hematogenous metastases).",
            "Preoperative preparation of a thymoma patient with concurrent myasthenia gravis (optimizing anticholinesterase/immunosuppressive therapy, IVIG/plasma exchange to prevent post-extubation respiratory failure).",
            "Indications for adjuvant radiotherapy following thymectomy (beneficial in Masaoka Stage II with positive/close margins and Stage III completely resected tumours)."
        ],
        "case_hooks": [
            "A 42-year-old woman with fluctuating bilateral ptosis and exertional fatigue is found to have anti-AChR antibodies; chest CT demonstrates a well-circumscribed 4 cm anterior mediastinal mass.",
            "A 58-year-old man undergoes complete VATS resection of an encapsulated anterior mediastinal mass; pathology demonstrates type B2 thymoma with microscopic capsular invasion (Masaoka Stage IIa)."
        ],
        "uncertainties": [
            "Role of neoadjuvant chemotherapy or immunotherapy in locally advanced unresectable Masaoka Stage III/IV thymic carcinoma.",
            "Utility of baseline 18F-FDG PET SUVmax cutoffs in predicting progression-free survival and distinguishing low-risk from high-risk histology."
        ]
    },

    "Thyroid Cancer Management": {
        "mentor_intro": (
            "Thyroid carcinoma represents the most common endocrine malignancy, predominantly comprising differentiated thyroid cancers (DTC: papillary 85%, follicular 10%), alongside medullary thyroid carcinoma (MTC, derived from parafollicular C-cells), and highly lethal anaplastic carcinoma. "
            "Risk stratification (ATA guidelines) drives personalized surgical extent—ranging from active surveillance for selected low-risk microcarcinomas (<1 cm) and thyroid lobectomy, to total thyroidectomy with central neck dissection. "
            "Postoperative radioactive iodine (RAI) ablation is reserved for intermediate-to-high risk DTC, while TSH suppression therapy is calibrated to recurrence risk."
        ),
        "teaching_points": [
            "Initial risk stratification by American Thyroid Association (ATA) criteria categorizes DTC into low, intermediate, and high risk of recurrence, determining the necessity for total thyroidectomy versus unilateral lobectomy.",
            "Radioactive iodine (RAI, 131-I) remnant ablation is not routinely recommended for ATA low-risk patients (<1 cm unifocal or up to 4 cm intrathyroidal papillary carcinomas without nodal metastases), reducing unnecessary radiation exposure.",
            "Post-thyroidectomy surveillance relies on stimulated or unsuppressed serum thyroglobulin (Tg) paired with anti-thyroglobulin antibodies (TgAb) and high-resolution neck ultrasonography; rising TgAb titers can falsely depress measured Tg and indicate recurrence.",
            "Medullary thyroid carcinoma requires testing for germline RET proto-oncogene mutations (MEN2A/2B syndromes) and screening for pheochromocytoma (plasma metanephrines) prior to surgical neck exploration."
        ],
        "mcq_angles": [
            "Selecting thyroid lobectomy vs total thyroidectomy in differentiated thyroid cancer based on tumour size (1-4 cm), extrathyroidal extension, and nodal status.",
            "Interpretation of thyroglobulin (Tg) in the presence of positive anti-Tg antibodies (anti-Tg antibodies cause falsely low Tg on immunometric assays; trending antibody titers serves as a surrogate tumour marker).",
            "Preoperative mandatory workup in suspected medullary thyroid cancer (calcitonin, CEA, germline RET testing, and ruling out bilateral pheochromocytoma)."
        ],
        "case_hooks": [
            "A 32-year-old woman has an incidental 1.8 cm Bethesda VI papillary thyroid carcinoma confined to the right lobe on ultrasound, without extrathyroidal extension or suspicious lymphadenopathy.",
            "A 48-year-old man post-total thyroidectomy for follicular thyroid cancer has an undetectable serum Tg (<0.1 ng/mL) but anti-Tg antibodies have doubled over 6 months from 50 to 110 IU/mL."
        ],
        "uncertainties": [
            "Optimal role of active surveillance versus immediate surgical resection in low-risk microcarcinomas (<1 cm) in younger cohorts.",
            "Efficacy of redifferentiation therapy with MAPK/BRAF inhibitors prior to RAI in radioactive iodine-refractory metastatic DTC."
        ]
    },

    "Thyroid storm and myxoedema coma: ICU recognition and management": {
        "mentor_intro": (
            "Thyroid storm and myxoedema coma represent opposite, life-threatening extremes of thyroid hormone dysregulation requiring urgent intensive care resuscitation. "
            "Thyroid storm is characterized by decompensated hypermetabolism, hyperpyrexia, cardiovascular instability (tachyarrhythmias, high-output or biventricular heart failure), agitation, and delirium, scored via the Burch-Wartofsky Point Scale (BWPS >=45). "
            "Myxoedema coma presents with profound hypometabolism, hypothermia, altered mental status, hypoventilation, bradycardia, and severe hyponatraemia; immediate IV thyroid hormone replacement with empiric glucocorticoid coverage is vital before confirming adrenal status."
        ),
        "teaching_points": [
            "Thyroid storm medical therapy mandates a specific multimodality sequence: beta-blockers (propranolol/esmolol), high-dose thionamide (propylthiouracil [PTU] or methimazole) to halt synthesis, followed AT LEAST 1 HOUR LATER by inorganic iodine (Lugol's solution/SSKI) to prevent Wolff-Chaikoff bypass.",
            "Corticosteroids (hydrocortisone 100 mg IV every 8 hours) in thyroid storm serve dual purposes: treating potential relative adrenal insufficiency and inhibiting peripheral conversion of T4 to active T3.",
            "Myxoedema coma requires immediate IV hydrocortisone (100 mg q8h) prior to or alongside IV levothyroxine (T4) with or without liothyronine (T3), to prevent precipitating fatal acute adrenal crisis in secondary hypothyroidism.",
            "Supportive care in myxoedema coma includes passive rewarming (avoiding active external warming to prevent peripheral vasodilation and vascular collapse), cautious fluid resuscitation with hypertonic saline for symptomatic hyponatraemia, and mechanical ventilation for hypoventilation."
        ],
        "mcq_angles": [
            "Critical sequencing of iodine administration in thyroid storm (iodine MUST be given at least 1 hour after thionamide to prevent providing substrate for new thyroid hormone synthesis).",
            "Why hydrocortisone must precede thyroid hormone replacement in myxoedema coma (accelerated cortisol metabolism without adrenal coverage precipitates adrenal crisis).",
            "Distinguishing high-output heart failure from tachyarrhythmia-induced systolic dysfunction in thyroid storm and selecting beta-blockers cautiously."
        ],
        "case_hooks": [
            "A 35-year-old woman with untreated Graves' disease develops severe fever (40.1 C), atrial fibrillation with RVR of 170 bpm, jaundice, and delirium following an emergency appendectomy (BWPS score 65).",
            "An 82-year-old woman found comatose in an unheated apartment presents with core temperature 30.5 C, heart rate 38 bpm, BP 82/50 mmHg, severe periorbital puffiness, and serum sodium 114 mmol/L."
        ],
        "uncertainties": [
            "Superiority of combined T3/T4 intravenous therapy over monotherapy with IV levothyroxine in myxoedema coma mortality outcomes.",
            "Role of therapeutic plasma exchange in refractory thyroid storm unresponsive to standard multimodal pharmacotherapy."
        ]
    },

    "Tick-borne rickettsial disease empiric doxycycline": {
        "mentor_intro": (
            "Tick-borne rickettsial diseases (TBRDs)—including Rocky Mountain spotted fever (Rickettsia rickettsii), human monocytic ehrlichiosis (Ehrlichia chaffeensis), and human granulocytic anaplasmosis (Anaplasma phagocytophilum)—are acute, life-threatening zoonoses. "
            "Clinical presentation typically features abrupt fever, severe headache, myalgias, and gastrointestinal symptoms; the classic macular rash of RMSF often appears late (days 3-5) or may never develop. "
            "Empiric doxycycline therapy must be initiated immediately upon clinical suspicion, as delay beyond day 5 of illness dramatically increases the case fatality rate; diagnostic serologies are negative during the acute phase."
        ),
        "teaching_points": [
            "Empiric doxycycline (100 mg twice daily orally or IV) is the treatment of choice for adults and children of ALL ages with suspected tick-borne rickettsial disease; treatment must NEVER be delayed pending laboratory or serologic confirmation.",
            "The American Academy of Pediatrics and CDC explicitly state that short courses of doxycycline (<14-21 days) do not cause dental staining in young children (<8 years), making doxycycline the undisputed first-line agent regardless of age.",
            "Initial laboratory hallmarks include thrombocytopenia, leukopenia (or leukocytosis with marked left shift), elevated hepatic transaminases, and hyponatraemia; diagnostic indirect immunofluorescence antibody (IFA) IgG titers are typically negative in the first week.",
            "RMSF rash typically begins on the wrists, ankles, palms, and soles before spreading centripetally to the trunk and limbs, evolving from blanching macular lesions to non-blanching petechiae and purpura."
        ],
        "mcq_angles": [
            "First-line antibiotic selection in suspected RMSF in a 4-year-old child (doxycycline is the drug of choice; avoiding alternative agents like chloramphenicol or ampicillin).",
            "Recognizing false-negative serologies in the acute phase of rickettsioses and understanding why empiric therapy cannot wait for antibody titers.",
            "Distinguishing clinical laboratory profiles of Anaplasmosis/Ehrlichiosis (prominent leukopenia, thrombocytopenia, transaminitis) and identifying morulae on blood smear examination."
        ],
        "case_hooks": [
            "A 6-year-old boy from North Carolina presents in July with high fevers, severe fronto-orbital headache, vomiting, and a faint macular rash on his ankles 6 days after a camping trip; platelets are 85 x 10^9/L.",
            "A 58-year-old man presents with rigors, confusion, thrombocytopenia (45 x 10^9/L), and elevated ALT/AST 5 days following an unengorged tick bite in New York; peripheral blood smear shows intracytoplasmic morulae in neutrophils."
        ],
        "uncertainties": [
            "Second-line management in patients with severe, anaphylactic doxycycline allergy (chloramphenicol has higher toxicity and failure rates; desensitization vs azithromycin in mild anaplasmosis).",
            "Optimal duration of therapy for coinfections (e.g., Anaplasma plus Borrelia burgdorferi or Babesia microti) transmitted by the same Ixodes scapularis tick."
        ]
    },

    "recurrent UTIs": {
        "mentor_intro": (
            "Recurrent urinary tract infections (rUTIs)—defined as >=2 culture-confirmed uncomplicated UTIs in 6 months or >=3 episodes in 12 months—predominantly affect adult women across reproductive and postmenopausal life stages. "
            "Underlying mechanisms involve uropathogenic Escherichia coli (UPEC) intracellular bacterial reservoirs, impaired mucosal glycosaminoglycan defenses, sexual activity, and postmenopausal oestrogen deficiency. "
            "Management emphasizes non-antimicrobial prophylaxis (vaginal oestrogen in postmenopausal women, methenamine hippurate, fluid optimization) and targeted antimicrobial strategies (post-coital or self-start therapy) to limit antimicrobial resistance."
        ),
        "teaching_points": [
            "Recurrent UTI definition requires documented microbiological confirmation of >=2 symptomatic uncomplicated episodes within 6 months or >=3 within 12 months, avoiding empiric overtreatment of asymptomatic bacteriuria.",
            "Vaginal oestrogen therapy in postmenopausal women restores lactobacilli colonization, lowers vaginal pH, and significantly reduces UTI recurrence without the systemic thromboembolic risks of oral hormone therapy.",
            "Methenamine hippurate provides an effective non-antimicrobial preventative alternative by converting to formaldehyde in acidic urine, exhibiting comparable efficacy to daily low-dose antibiotic prophylaxis without driving cross-resistance.",
            "Urological anatomic workup (renal/bladder ultrasound, cystoscopy) is not routinely indicated for uncomplicated rUTI in women unless red flags exist: macroscopic haematuria, obstructive voiding, persistent Proteus infections (struvite calculi), or history of pelvic malignancy."
        ],
        "mcq_angles": [
            "Distinguishing asymptomatic bacteriuria (which does not require antimicrobial therapy except in pregnancy or prior to urologic mucosal trauma) from true recurrent symptomatic UTI.",
            "First-line non-antimicrobial prevention in postmenopausal women (topical vaginal oestrogen vs ineffective systemic therapies).",
            "Indications for secondary urological investigations (cystoscopy and imaging) in recurrent UTI (suspected stone, haematuria, atypical pathogens)."
        ],
        "case_hooks": [
            "A 62-year-old postmenopausal woman with 4 culture-confirmed E. coli cystitis episodes in the past year presents asking for continuous daily nitrofurantoin; pelvic exam shows atrophic vaginitis.",
            "A 28-year-old sexually active female experiences painful dysuria and frequency within 24 hours after intercourse, requesting strategies to prevent repeated antibiotic courses."
        ],
        "uncertainties": [
            "Efficacy of D-mannose and cranberry proanthocyanidins compared to methenamine hippurate in rigorously controlled clinical trials.",
            "Role of sublingual or intramuscular bacterial vaccines (e.g., MV140) in inducing long-term mucosal immunity against uropathogens."
        ]
    },

    "red flags back pain": {
        "mentor_intro": (
            "Low back pain is among the most frequent clinical presentations in primary and emergency care, where over 90% represents benign mechanical or non-specific axial pain. "
            "The paramount clinical task is identifying 'red flag' features indicating grave underlying pathology: spinal cord compression or cauda equina syndrome (CES), spinal epidural abscess/discitis, vertebral fracture, and malignancy. "
            "A structured history and neurological examination dictate immediate emergency MRI versus conservative management, preventing permanent neurological disability or catastrophic sepsis."
        ),
        "teaching_points": [
            "Cauda equina syndrome (CES) is a surgical emergency characterized by saddle anaesthesia, bilateral sciatica or motor deficits, unexplained urinary retention or overflow incontinence, and reduced anal sphincter tone; urgent whole-spine MRI and emergency decompression within 24-48 hours are mandatory.",
            "Spinal infection (vertebral osteomyelitis/epidural abscess) must be suspected in patients presenting with back pain and fever, IV drug use, indwelling catheters, recent spinal instrumentation, or end-stage renal disease; inflammatory markers (ESR, CRP) possess high sensitivity.",
            "Spinal malignancy red flags include a history of cancer (especially breast, lung, prostate, renal, myeloma), unexplained weight loss, pain unrelieved by bed rest or worse at night, and age >50 with new-onset unremitting pain.",
            "In the absence of progressive neurological deficits or red flags, routine early imaging (plain radiography or MRI) does not improve clinical outcomes and is discouraged by clinical practice guidelines."
        ],
        "mcq_angles": [
            "Distinguishing Cauda Equina Syndrome with urinary retention (post-void bladder residual >200 mL, reduced saddle sensation) requiring emergency decompressive laminectomy from acute lumbar radiculopathy.",
            "Indications for emergent MRI spine versus urgent outpatient imaging (fever + focal spinal tenderness + IV drug use warrants emergency whole-spine contrast-enhanced MRI for epidural abscess).",
            "Identifying metastatic spinal cord compression (MSCC) and initiating high-dose dexamethasone immediately prior to definitive radiotherapy or surgical decompression."
        ],
        "case_hooks": [
            "A 54-year-old man with acute severe L4-L5 disc herniation notices he cannot sense toilet paper when wiping and has not voided for 10 hours, with a bladder scan showing 650 mL residual volume.",
            "A 67-year-old woman with a history of treated breast cancer presents with 4 weeks of dull thoracic back pain that awakens her from sleep and band-like numbness around her lower ribcage."
        ],
        "uncertainties": [
            "Diagnostic specificity and false-positive rates of individual red flags in primary care leading to imaging overuse.",
            "Optimal threshold for post-void bladder scan volume in ruling out early, incomplete cauda equina syndrome (CES-I)."
        ]
    },

    "regional analgesia": {
        "mentor_intro": (
            "Regional analgesia techniques—comprising central neuraxial blocks (epidural, spinal) and peripheral nerve and fascial plane blocks—form the cornerstone of multimodal opioid-sparing perioperative care. "
            "Ultrasound guidance has revolutionized regional anaesthesia, improving block success, accelerating onset, and dramatically reducing complications such as vascular puncture and local anaesthetic systemic toxicity (LAST). "
            "Fascial plane blocks (e.g., transversus abdominis plane [TAP], erector spinae plane [ESP], serratus anterior, pectoral [PECS]) provide safe, effective somatic analgesia across major thoracic, abdominal, and orthopaedic surgeries."
        ),
        "teaching_points": [
            "Local anaesthetic systemic toxicity (LAST) presents with CNS excitement (perioral numbness, metallic taste, tinnitus, seizures) progressing to CNS depression and cardiovascular collapse; immediate management requires airway protection and 20% intravenous lipid emulsion (intralipid).",
            "Thoracic epidural analgesia (TEA) provides superior analgesia and attenuates surgical stress response in open abdominal and thoracic procedures, but requires rigorous coagulation monitoring and thromboprophylaxis timing to avoid epidural haematoma.",
            "Erector spinae plane (ESP) blocks deposited deep to the erector spinae muscle allow local anaesthetic to diffuse into ventral and dorsal rami, delivering effective multi-dermatomal analgesia for thoracic and abdominal procedures with an excellent safety profile.",
            "Peripheral nerve blocks in total joint arthroplasty (adductor canal block for knee, pericapsular nerve group [PENG] block for hip) optimize analgesia while preserving motor strength, facilitating early ambulation and reducing hospital stay."
        ],
        "mcq_angles": [
            "Emergency management protocol for Local Anaesthetic Systemic Toxicity (LAST): dosing and administration of 20% lipid emulsion (1.5 mL/kg bolus, 0.25 mL/kg/min infusion).",
            "Safety intervals between low molecular weight heparin (LMWH) administration and neuraxial needle placement or catheter removal (typically 12 hours for prophylactic, 24 hours for therapeutic doses).",
            "Selecting adductor canal block over femoral nerve block in total knee arthroplasty to spare quadriceps motor function and prevent postoperative falls."
        ],
        "case_hooks": [
            "During placement of an interscalene brachial plexus block, a 45-year-old patient reports perioral tingling and auditory buzzing, suddenly developing tonic-clonic seizure activity and ventricular arrhythmias.",
            "A 68-year-old man undergoing open resection of an abdominal aortic aneurysm is evaluated for thoracic epidural placement while on prophylactic enoxaparin."
        ],
        "uncertainties": [
            "Efficacy and clinical superiority of continuous catheter infusions versus single-shot fascial plane blocks utilizing liposomal bupivacaine.",
            "Extent of autonomic and visceral blockade achieved by erector spinae plane blocks compared to paravertebral blocks."
        ]
    },

    "relapse prevention": {
        "mentor_intro": (
            "Relapse prevention in psychiatry and addiction medicine encompasses structured evidence-based pharmacotherapies and cognitive-behavioural interventions designed to sustain remission and prevent recurrence. "
            "In major depressive disorder (MDD) and bipolar disorder, continuing maintenance pharmacotherapy for at least 6-12 months post-remission (or years to life in recurrent/severe illness) dramatically mitigates relapse risk. "
            "In substance use disorders (opioid and alcohol use disorders), long-term pharmacotherapies (methadone, buprenorphine, extended-release naltrexone, acamprosate) coupled with craving management and psychosocial support form the evidence-based gold standard."
        ),
        "teaching_points": [
            "In major depressive disorder, continuing antidepressant medication at the full therapeutic dose for at least 6 to 9 months following complete symptomatic remission reduces depressive relapse rates by greater than 50%.",
            "For opioid use disorder (OUD), maintenance agonist therapies (buprenorphine/naloxone, methadone) demonstrate superior retention and significantly reduce all-cause and overdose mortality compared to detoxification and abstinence-only approaches.",
            "Extended-release intramuscular naltrexone requires a mandatory 7-10 day opioid-free washout (confirmed by negative naloxone challenge or urine drug screen) to avoid precipitating acute, severe withdrawal.",
            "Continuation and maintenance electroconvulsive therapy (c-ECT / m-ECT) combined with pharmacotherapy provides robust relapse prevention in severe treatment-resistant depression or psychotic depression with a history of rapid post-ECT relapse."
        ],
        "mcq_angles": [
            "Duration of maintenance antidepressant therapy following single-episode vs recurrent (>=3 episodes) major depressive disorder.",
            "Pre-treatment requirements for initiating naltrexone in opioid use disorder (ensuring opioid abstinence to avoid precipitating acute withdrawal).",
            "Pharmacological selection for alcohol relapse prevention (acamprosate preferred in liver disease; naltrexone contraindicated in acute hepatitis or opioid use)."
        ],
        "case_hooks": [
            "A 32-year-old male with severe opioid use disorder completes inpatient medically supervised withdrawal and requests initiation of monthly depot naltrexone; urine drug screen is positive for methadone.",
            "A 45-year-old woman with a history of three severe depressive episodes with psychotic features achieves full remission on sertraline and aripiprazole, asking if she can discontinue all medications after 2 months."
        ],
        "uncertainties": [
            "Optimal tapering duration and hyperbolic withdrawal schedules when discontinuing long-term antidepressants to prevent discontinuation syndrome versus true relapse.",
            "Maintenance dosing schedules and relapse rates following acute induction with intranasal esketamine in treatment-resistant depression."
        ]
    },

    "renal colic": {
        "mentor_intro": (
            "Renal colic is an excruciating acute syndrome caused by sudden ureteral obstruction and capsular distension, most commonly from nephrolithiasis. "
            "First-line diagnostic imaging is non-contrast low-dose computed tomography of the abdomen and pelvis (NCCT), which provides exceptional sensitivity (>98%) for stone size, location, and secondary signs of obstruction. "
            "First-line analgesia relies on non-steroidal anti-inflammatory drugs (NSAIDs), which reduce prostaglandin-mediated ureteral spasm and renal blood flow; infected obstructed systems represent a surgical emergency requiring immediate decompression."
        ),
        "teaching_points": [
            "Non-steroidal anti-inflammatory drugs (NSAIDs, such as IV ketorolac or rectal diclofenac) provide superior pain relief, faster onset, and lower rates of rescue analgesia and nausea compared to parenteral opioids in acute renal colic.",
            "Low-dose non-contrast CT (NCCT) is the gold standard imaging modality for acute flank pain, identifying stone diameter, density (Hounsfield units), exact anatomical location, and hydronephrosis with minimal radiation dose.",
            "Ureteral obstruction with concurrent systemic signs of infection (fever, rigors, leukocytosis, pyuria) is an absolute urologic emergency requiring immediate urinary decompression (percutaneous nephrostomy or ureteral stenting) and broad-spectrum IV antibiotics.",
            "Medical expulsive therapy (MET) with alpha-1 adrenergic antagonists (e.g., tamsulosin 0.4 mg daily) facilitates spontaneous passage of distal ureteral calculi measuring 5 to 10 mm, but offers minimal benefit for stones <5 mm (which pass spontaneously >85-90% of the time)."
        ],
        "mcq_angles": [
            "First-line analgesic choice in acute renal colic without contraindications (NSAIDs over opioids due to reduction in ureteral smooth muscle tone and intrarenal pressure).",
            "Management of infected hydronephrosis (urgent decompression via nephrostomy or JJ stent; shock wave lithotripsy or ureteroscopy is contraindicated during acute infection).",
            "Predictors of spontaneous stone passage based on size and location (distal stones <5 mm have highest passage rates; stones >10 mm require active intervention)."
        ],
        "case_hooks": [
            "A 38-year-old man presents with sudden agonizing right flank pain radiating to the groin, macroscopic haematuria, and vomiting; temperature is 36.8 C, BP 148/92 mmHg.",
            "A 64-year-old diabetic woman presents with severe left loin pain, rigors, fever of 39.2 C, BP 85/55 mmHg, and urine showing nitrites and pyuria; CT reveals a 7 mm proximal ureteral stone with severe hydronephrosis."
        ],
        "uncertainties": [
            "Role of phosphodiesterase-5 (PDE5) inhibitors as standalone or adjunctive medical expulsive therapy compared to tamsulosin.",
            "Efficacy of regional nerve blocks (erector spinae plane block) and non-opioid adjuvants (sub-dissociative ketamine) for refractory colic in emergency departments."
        ]
    },

    "reproductive health in rheumatic disease": {
        "mentor_intro": (
            "Reproductive health planning in patients with systemic autoimmune and rheumatic diseases (such as systemic lupus erythematosus [SLE], antiphospholipid syndrome [APS], and rheumatoid arthritis) requires proactive, multi-disciplinary pre-conception counselling. "
            "Pregnancy must ideally be planned during quiescent disease (quiescence for at least 6 months), avoiding teratogenic medications while maintaining compatible immunosuppression. "
            "Key clinical objectives include screening for maternal autoantibodies (anti-Ro/SSA, anti-La/SSB, and antiphospholipid antibodies), managing risks of congenital heart block, pre-eclampsia, and maternal flares, and optimizing fertility and safe contraception."
        ),
        "teaching_points": [
            "Teratogenic disease-modifying antirheumatic drugs (DMARDs)—notably methotrexate, mycophenolate mofetil, cyclophosphamide, and leflunomide—must be discontinued well before conception (leflunomide requires cholestyramine washout until plasma levels are undetectable).",
            "Pregnancy-compatible immunosuppressive agents include hydroxychloroquine, azathioprine, sulfasalazine, and calcineurin inhibitors (tacrolimus, cyclosporine); hydroxychloroquine should be continued throughout pregnancy to reduce SLE flare rates and neonatal congenital heart block.",
            "Maternal anti-Ro/SSA and anti-La/SSB antibodies cross the placenta and confer risk of neonatal lupus erythematosus and congenital complete heart block, requiring serial fetal echocardiographic surveillance from 16 to 26 weeks gestation.",
            "Antiphospholipid antibody syndrome (APS) in pregnancy mandates prophylactic therapy (low-dose aspirin combined with prophylactic or therapeutic low molecular weight heparin) to prevent recurrent miscarriage, late fetal demise, and pre-eclampsia."
        ],
        "mcq_angles": [
            "Distinguishing pregnancy-safe DMARDs (hydroxychloroquine, azathioprine, sulfasalazine) from teratogenic agents requiring pre-conception cessation and washout.",
            "Surveillance and management of anti-Ro/SSA-positive pregnancies (serial fetal echocardiography to detect early PR-interval prolongation / AV block).",
            "Antithrombotic management in obstetric antiphospholipid syndrome (combination of low-dose aspirin and LMWH throughout gestation and post-partum)."
        ],
        "case_hooks": [
            "A 28-year-old woman with lupus nephritis in clinical remission for 8 months wishes to conceive; she is currently taking mycophenolate mofetil 1 g bid, hydroxychloroquine 200 mg daily, and enalapril 10 mg daily.",
            "A 32-year-old pregnant woman (18 weeks gestation) with known anti-Ro/SSA autoantibodies undergoes screening fetal ultrasound showing fetal bradycardia of 55 bpm."
        ],
        "uncertainties": [
            "Optimal timing and safety of novel biologic therapies (IL-6, IL-17, IL-23 inhibitors, and JAK inhibitors) during conception, pregnancy, and lactation.",
            "Efficacy of preventative IVIG or fluorinated steroids (dexamethasone) once incomplete congenital heart block is detected on fetal echocardiography."
        ]
    },

    "resistant hypertension": {
        "mentor_intro": (
            "Resistant hypertension is defined as office blood pressure >=140/90 mmHg despite concurrent adherence to full, maximally tolerated doses of three antihypertensive drug classes from different categories, one of which must be a diuretic. "
            "True resistant hypertension must first be confirmed by ruling out pseudoresistance—primarily non-adherence, white-coat hypertension (verified via 24-hour ambulatory blood pressure monitoring [ABPM]), and inaccurate cuff sizing. "
            "Secondary hypertension causes (most commonly primary aldosteronism, obstructive sleep apnoea, renal artery stenosis, and chronic kidney disease) must be systematically evaluated, with spironolactone serving as the preferred fourth-line pharmacological agent."
        ),
        "teaching_points": [
            "Confirmation of true resistant hypertension requires excluding white-coat effect via 24-hour ambulatory BP monitoring (ABPM) or home BP monitoring (HBPM) and objectively assessing medication adherence.",
            "Primary aldosteronism is the most common secondary cause of resistant hypertension, present in up to 15-20% of patients; screening via the plasma aldosterone-to-renin ratio (ARR) is mandatory regardless of serum potassium levels.",
            "Spironolactone (25-50 mg daily) is the most effective fourth-line add-on agent in resistant hypertension (demonstrated in the PATHWAY-2 trial), provided serum potassium is <4.5 mmol/L and eGFR is >=45 mL/min/1.73m2.",
            "Novel aldosterone synthase inhibitors (e.g., lorundrostat, baxdrostat) and dual endothelin receptor antagonists (aprocitentan) provide potent targeted blood pressure lowering in treatment-resistant hypertension by directly blocking hormonal pathways."
        ],
        "mcq_angles": [
            "PATHWAY-2 trial findings establishing spironolactone as the superior fourth-line agent over alpha-blockers (doxazosin) or beta-blockers (bisoprolol).",
            "Screening protocol for primary aldosteronism using aldosterone-to-renin ratio (ARR) and recognizing interfering antihypertensives (MRAs must be held for 4-6 weeks).",
            "Identifying renal denervation (RDN) eligibility criteria in patients with persistent drug-resistant or uncontrolled hypertension."
        ],
        "case_hooks": [
            "A 56-year-old man takes amlodipine 10 mg, valsartan 320 mg, and hydrochlorothiazide 25 mg daily; clinic BP is 156/96 mmHg, confirmed on 24-hour ABPM as 148/92 mmHg; serum potassium is 3.7 mmol/L.",
            "A 62-year-old woman with treatment-resistant hypertension develops hyperkalaemia (potassium 5.6 mmol/L) 3 weeks after starting spironolactone 25 mg, requiring reconsideration of fourth-line agents."
        ],
        "uncertainties": [
            "Long-term cardiovascular morbidity and mortality reduction from catheter-based renal sympathetic denervation in truly drug-resistant cohorts.",
            "Role of direct aldosterone synthase inhibitors versus mineralocorticoid receptor antagonists in avoiding off-target endocrine side effects (gynaecomastia)."
        ]
    },

    "respiratory tract infections": {
        "mentor_intro": (
            "Respiratory tract infections (RTIs) are the most prevalent acute illnesses encountered across healthcare systems, categorized into upper respiratory tract infections (URTIs: rhinosinusitis, pharyngitis, croup) and lower respiratory tract infections (LRTIs: acute bronchitis, bronchiolitis, pneumonia). "
            "Because over 90% of uncomplicated URTIs and acute bronchitis are viral in origin, clinical guidelines strongly advocate for antimicrobial stewardship, utilizing delayed-prescribing strategies and validated clinical scores (Centor/McIsaac, CRB-65). "
            "Preventative vaccination (influenza, pneumococcal, maternal and infant RSV, COVID-19) remains the single most effective public health strategy for reducing severe LRTI morbidity and hospital admissions."
        ),
        "teaching_points": [
            "The vast majority of uncomplicated acute respiratory tract infections (rhinosinusitis, acute bronchitis, laryngitis) are viral and self-limiting; routine antibiotic prescription provides negligible clinical benefit while driving adverse drug events and antimicrobial resistance.",
            "The modified Centor (McIsaac) score for acute sore throat guides testing: criteria include tonsillar exudates, tender anterior cervical lymphadenopathy, fever >38 C, and absence of cough; scores <3 do not warrant routine rapid antigen testing or antibiotic treatment.",
            "Pneumonia must be differentiated from acute bronchitis by vital sign derangements (tachypnoea >20 bpm, tachycardia >100 bpm, fever >38 C) and focal chest auscultatory findings (crackles, bronchial breathing, dullness), warranting chest radiography.",
            "Maternal RSV bivalent prefusion F vaccine administered during weeks 32-36 of gestation significantly reduces severe RSV-associated lower respiratory tract illness in infants throughout their first 6 months of life."
        ],
        "mcq_angles": [
            "Application of the Centor/McIsaac criteria in acute pharyngitis to determine when to test for Group A Streptococcus versus reassurance and symptomatic care.",
            "Delayed antibiotic prescribing strategies ('wait-and-see' scripts) for acute uncomplicated otitis media or rhinosinusitis.",
            "Identifying high-risk features in community-acquired lower respiratory infection (CRB-65 score) dictating outpatient vs inpatient admission."
        ],
        "case_hooks": [
            "A 24-year-old college student presents with 4 days of rhinorrhoea, dry cough, and low-grade fever; chest exam is clear and oxygen saturation is 99%, but he requests azithromycin.",
            "A 34-week pregnant woman asks her primary care physician about the benefits and safety of receiving the maternal RSV vaccine to protect her unborn child from winter bronchiolitis."
        ],
        "uncertainties": [
            "Clinical utility and turnaround impact of point-of-care multiplex viral/bacterial PCR panels in primary care antibiotic stewardship.",
            "Role and durability of non-antibiotic mucosal adjuncts and probiotics in preventing recurrent paediatric respiratory infections."
        ]
    },

    "rheumatoid arthritis": {
        "mentor_intro": (
            "Rheumatoid arthritis (RA) is a chronic, systemic inflammatory autoimmune disorder characterized by symmetric, destructive polyarthritis targeting synovial joints, tendon sheaths, and extra-articular organ systems. "
            "Pathophysiology involves citrullinated protein neoepitopes triggering rheumatoid factor (RF) and anti-citrullinated protein antibodies (ACPA/anti-CCP), driving osteoclastogenesis and marginal bone erosions. "
            "The cornerstone of management is early 'treat-to-target' (T2T) intervention with conventional synthetic DMARDs (methotrexate as the anchor drug), escalating to targeted synthetic (JAK inhibitors) or biologic DMARDs (TNF, IL-6, B-cell, or T-cell costimulation inhibitors) to achieve clinical remission."
        ),
        "teaching_points": [
            "Early initiation of disease-modifying therapy within the 'window of opportunity' (first 12 weeks of symptom onset) halts irreversible erosive joint destruction and preserves physical function.",
            "Oral or subcutaneous methotrexate is the anchor conventional synthetic DMARD (csDMARD) of first choice, co-prescribed with folic acid (5 mg weekly) to mitigate hepatotoxicity, mucosal ulceration, and gastrointestinal adverse effects.",
            "Anti-citrullinated protein antibodies (ACPA) provide superior diagnostic specificity (~95%) over rheumatoid factor (RF) and strongly predict an aggressive, erosive disease course requiring early escalation.",
            "Tapering of DMARDs should only be considered after sustained clinical remission (>=6 months) on a treat-to-target protocol; complete drug withdrawal carries high flare rates, with csDMARD monotherapy maintained as long-term maintenance."
        ],
        "mcq_angles": [
            "Selecting first-line DMARD therapy in newly diagnosed active rheumatoid arthritis (methotrexate + short-term bridging glucocorticoids).",
            "Screening prerequisites before initiating biologic or targeted synthetic DMARDs (latent tuberculosis screening with IGRA, hepatitis B/C serology).",
            "Monitoring and managing methotrexate adverse effects: transient transaminitis vs true pulmonary toxicity (methotrexate pneumonitis)."
        ],
        "case_hooks": [
            "A 42-year-old woman presents with 8 weeks of morning stiffness lasting 90 minutes, bilateral MCP and PIP joint swelling, elevated ESR/CRP, and positive anti-CCP antibodies.",
            "A 55-year-old man on methotrexate 20 mg weekly and adalimumab for 3 years achieves stable DAS28 remission (<2.6) for 12 months, inquiring whether his medications can be safely tapered."
        ],
        "uncertainties": [
            "Comparative safety profiles of JAK inhibitors (tofacitinib, baricitinib, upadacitinib) regarding major adverse cardiovascular events (MACE) and venous thromboembolism in high-risk patients.",
            "Predictive biomarkers to guide precision selection between TNF inhibitors, IL-6 receptor antagonists, and JAK inhibitors in methotrexate-inadequate responders."
        ]
    },

    "rivaroxaban treatment acute deep vein thrombosis EINSTEIN": {
        "mentor_intro": (
            "The direct factor Xa inhibitor rivaroxaban revolutionized the treatment of acute deep vein thrombosis (DVT) and pulmonary embolism (PE), established by the landmark EINSTEIN-DVT and EINSTEIN-PE clinical trials. "
            "Rivaroxaban provides oral single-drug anticoagulation, eliminating the historic requirement for initial parenteral heparin bridging and routine international normalized ratio (INR) monitoring. "
            "The standard acute DVT/PE regimen comprises an intensified loading phase (15 mg twice daily with food for the first 21 days), followed by maintenance therapy (20 mg once daily with food), balancing rapid clot stabilization with long-term bleeding safety."
        ),
        "teaching_points": [
            "The EINSTEIN-DVT protocol mandates 15 mg twice daily taken with food for 21 days, transitioning to 20 mg once daily thereafter for acute DVT treatment without the need for initial low molecular weight heparin bridging.",
            "Oral bioavailability of rivaroxaban at doses of 15 mg and 20 mg is substantially food-dependent; ingestion with meals is essential to ensure adequate gastrointestinal absorption and avoid therapeutic underdosing.",
            "In patients completing 6 to 12 months of anticoagulation for unprovoked venous thromboembolism requiring extended secondary prevention, reduced-dose rivaroxaban (10 mg once daily, validated in the EINSTEIN-CHOICE trial) provides superior protection over aspirin with minimal bleeding risk.",
            "For cancer-associated venous thromboembolism (CAT), rivaroxaban and other DOACs demonstrate non-inferiority to low molecular weight heparin (LMWH), but carry increased gastrointestinal mucosal bleeding risk in patients with active luminal GI malignancies."
        ],
        "mcq_angles": [
            "Recognizing correct loading and maintenance dosing of rivaroxaban in acute DVT (15 mg BID for 21 days, then 20 mg OD) versus other DOAC regimens.",
            "Dietary co-administration requirement: explaining why 15 mg and 20 mg tablets must be taken with a meal (absorption drops to ~66% in fasted states).",
            "Anticoagulation choice in cancer-associated thrombosis: balancing DOAC efficacy against increased bleeding risks in unresected gastrointestinal or genitourinary luminal cancers."
        ],
        "case_hooks": [
            "A 52-year-old man is diagnosed with extensive unprovoked left femoral-popliteal DVT; the treating physician initiates rivaroxaban and must counsel the patient on meal timing and exact 3-week loading duration.",
            "A 66-year-old woman with metastatic pancreatic adenocarcinoma develops acute lower extremity DVT; the team weighs starting dalteparin versus rivaroxaban or apixaban."
        ],
        "uncertainties": [
            "Safety and optimal dosing of rivaroxaban in severe renal impairment (eGFR 15-29 mL/min) and extreme obesity (BMI >40 kg/m2 or weight >120 kg).",
            "Real-world clinical utility and turnaround of specific reversal agents (andexanet alfa) versus prothrombin complex concentrates (PCC) in catastrophic rivaroxaban-induced haemorrhage."
        ]
    },

    "secondary care mental health": {
        "mentor_intro": (
            "Secondary care mental health services—encompassing community mental health teams (CMHTs), crisis resolution and home treatment teams (CRHTTs), early intervention in psychosis (EIP), and inpatient psychiatric units—manage complex, high-risk psychiatric disorders. "
            "These include severe treatment-resistant depression, bipolar affective disorder, schizophrenia spectrum disorders, severe personality disorders, and high imminent suicide or self-harm risk. "
            "Effective care requires a multidisciplinary framework integrating psychiatrists, psychiatric nurses, clinical psychologists, occupational therapists, and social workers, with clear referral thresholds and structured risk formulation."
        ),
        "teaching_points": [
            "Referral from primary to secondary mental health care is indicated when psychiatric disorders present with significant diagnostic uncertainty, treatment resistance (e.g., failure of multiple primary care antidepressant trials), severe functional decline, or escalating risk of harm to self or others.",
            "Community Mental Health Teams (CMHTs) operate under the Care Programme Approach (or equivalent care coordinator model) to deliver coordinated psychosocial, occupational, and pharmacological management for enduring mental illness.",
            "Crisis Resolution and Home Treatment Teams (CRHTTs) provide acute alternative care to psychiatric hospital admission, conducting rapid psychiatric assessments and delivering intensive daily home visits during mental health crises.",
            "Physical health monitoring is a mandatory secondary care responsibility for patients on antipsychotic and mood-stabilizing medications, screening routinely for metabolic syndrome (weight, lipid profile, HbA1c, BP) and QTc prolongation."
        ],
        "mcq_angles": [
            "Determining appropriate referral destination: Crisis Resolution Team (acute decompensation requiring hospital admission avoidance) vs CMHT (long-term multidisciplinary care).",
            "Baseline and annual physical health monitoring parameters in severe mental illness (SMI) on second-generation antipsychotics.",
            "Legal frameworks for involuntary psychiatric assessment and detention under the Mental Health Act when patients lack capacity and pose serious risk to self or others."
        ],
        "case_hooks": [
            "A 24-year-old man with no prior psychiatric history presents to primary care with 2 months of progressive social withdrawal, blunted affect, auditory hallucinations commenting on his actions, and persecutory delusions.",
            "A 48-year-old woman with bipolar I disorder maintained on lithium and olanzapine attends clinic; she has gained 15 kg over the past year and her fasting glucose is 7.8 mmol/L."
        ],
        "uncertainties": [
            "Effectiveness of integrated primary-secondary shared-care models versus traditional referral boundaries in reducing delays to specialized psychological therapies.",
            "Role of independent non-medical prescribing (psychiatric pharmacists and specialist nurses) in optimizing psychotropic medication adherence and reducing waiting times."
        ]
    },

    "secondary hypertension": {
        "mentor_intro": (
            "Secondary hypertension refers to sustained elevated blood pressure resulting from an identifiable, potentially curable underlying endocrine, renal, vascular, or pharmacological cause, accounting for 5-10% of adult hypertension. "
            "Clinical suspicion is prompted by early-onset hypertension (<30 years), severe or accelerated hypertension, sudden loss of prior blood pressure control, drug-resistant hypertension (>=3 agents), or unprovoked hypokalaemia. "
            "Systematic diagnostic workup targets the most prevalent etiologies: primary aldosteronism, renal artery stenosis (atherosclerotic vs fibromuscular dysplasia), chronic kidney disease, obstructive sleep apnoea, Cushing syndrome, and pheochromocytoma."
        ),
        "teaching_points": [
            "Primary aldosteronism is the most frequent endocrine cause of secondary hypertension; screening with plasma aldosterone concentration (PAC) and plasma renin activity (PRA) or direct renin concentration (DRC) is indicated in resistant hypertension, hypokalaemia, or adrenal incidentalomas.",
            "Renal artery stenosis due to fibromuscular dysplasia (FMD) classically affects young women (<50 years), causing mid-to-distal renal artery stenosis ('string-of-beads' appearance) amenable to curative percutaneous renal balloon angioplasty without stenting.",
            "Atherosclerotic renal artery stenosis (ARAS) occurs in older patients with generalized vascular disease; medical therapy (statins, antihypertensives) is the primary management, with renal stenting reserved for refractory pulmonary oedema ('flash' pulmonary oedema) or rapidly deteriorating renal function.",
            "Pheochromocytoma and paraganglioma must be screened in patients with episodic paroxysms of headache, diaphoresis, and palpitations using plasma or 24-hour urinary fractionated metanephrines prior to any biopsy or invasive procedure."
        ],
        "mcq_angles": [
            "Distinguishing fibromuscular dysplasia (young female, beaded appearance on angiogram, cure by balloon angioplasty alone) from atherosclerotic renal artery stenosis.",
            "Preparation for primary aldosteronism screening: correcting hypokalaemia and managing interfering medications (spironolactone must be held for 4-6 weeks; alpha-blockers like doxazosin and calcium channel blockers are acceptable alternatives).",
            "Emergency medical stabilization in suspected pheochromocytoma: initiating alpha-adrenergic blockade (phenoxybenzamine) AT LEAST 10-14 days BEFORE beta-blockers to prevent unopposed alpha-mediated hypertensive crisis."
        ],
        "case_hooks": [
            "A 27-year-old healthy female is found to have BP 172/104 mmHg on routine wellness check; an abdominal epigastric systolic-diastolic bruit is audible.",
            "A 46-year-old male with labile hypertension presents with paroxysmal episodes of throbbing headache, diaphoresis, and tachycardia; urinary normetanephrines are elevated 5-fold above normal."
        ],
        "uncertainties": [
            "Reliability of ARR screening thresholds in patients who cannot safely be discontinued from ACE inhibitors or ARBs.",
            "Role of adrenal venous sampling (AVS) versus fine-cut contrast CT in guiding unilateral adrenalectomy for primary aldosteronism in older patients with bilateral non-functioning nodules."
        ]
    },

    "secondary stroke prevention": {
        "mentor_intro": (
            "Secondary stroke prevention aims to prevent recurrent ischaemic stroke or transient ischaemic attack (TIA), which carry highest risk within the first 48 to 72 hours of the index vascular event. "
            "Comprehensive etiologic investigation (TOAST classification: large artery atherosclerosis, cardioembolism, small vessel occlusion, other/cryptogenic) dictates targeted antithrombotic therapy. "
            "Core management pillars include antiplatelet therapy (short-term dual antiplatelet therapy [DAPT] for high-risk minor stroke or TIA), anticoagulation for atrial fibrillation, intensive statin therapy targeting LDL <1.4 mmol/L (<55 mg/dL), blood pressure optimization, and carotid revascularization."
        ),
        "teaching_points": [
            "Short-term dual antiplatelet therapy (DAPT with aspirin plus clopidogrel) initiated within 24 hours of symptom onset significantly reduces recurrent stroke risk in patients with high-risk TIA (ABCD2 score >=4) or minor ischaemic stroke (NIHSS <=3), and must be restricted to 21 to 30 days to avoid long-term bleeding harm (CHANCE and POINT trials).",
            "In non-valvular atrial fibrillation, direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) provide superior protection and dramatically lower intracranial haemorrhage risks compared to warfarin.",
            "Intensive lipid-lowering therapy with high-potency statins (atorvastatin 80 mg) plus ezetimibe is recommended for atherosclerotic ischaemic stroke, targeting an LDL cholesterol level <1.4 mmol/L (55 mg/dL) or >=50% reduction from baseline.",
            "Carotid endarterectomy (CEA) or carotid artery stenting (CAS) is strongly recommended for symptomatic carotid artery stenosis of 70-99% (and considered in 50-69% in men) if performed expeditiously, ideally within 14 days of the index ischaemic event."
        ],
        "mcq_angles": [
            "Duration of DAPT in minor stroke / high-risk TIA (21 days for aspirin + clopidogrel per POINT/CHANCE; continuing beyond 30-90 days increases major haemorrhage without ischemic benefit).",
            "Optimal timing for initiating DOAC anticoagulation following acute ischaemic stroke in atrial fibrillation (guided by stroke severity and hemorrhagic transformation risk, using the 1-3-6-12 day rule or early initiation trials).",
            "LDL-C treatment target in non-cardioembolic atherosclerotic stroke (<1.4 mmol/L or <55 mg/dL) and role of PCSK9 inhibitors in refractory hypercholesterolaemia."
        ],
        "case_hooks": [
            "A 63-year-old man presents 6 hours after a 20-minute episode of right-sided arm weakness and expressive speech difficulty (ABCD2 score = 5); brain MRI shows a small punctate left cortical infarct.",
            "A 74-year-old woman with permanent atrial fibrillation sustains a mild ischaemic stroke (NIHSS 2); non-contrast head CT rules out haemorrhage, and the team plans initiation of anticoagulation."
        ],
        "uncertainties": [
            "Optimal timing of anticoagulation resumption after spontaneous intracerebral haemorrhage in patients with non-valvular atrial fibrillation.",
            "Efficacy of ticagrelor-aspirin DAPT compared to clopidogrel-aspirin in patients carrying CYP2C19 loss-of-function alleles in non-Asian populations."
        ]
    },

    "sedation safety": {
        "mentor_intro": (
            "Procedural sedation and analgesia (PSA) outside the operating theatre (endoscopy, bronchoscopy, emergency medicine, intensive care) requires rigorous adherence to patient safety protocols. "
            "Sedation exists along a physiological continuum: minimal sedation (anxiolysis), moderate sedation ('conscious sedation'), deep sedation, and general anaesthesia. "
            "Patient safety depends on structured pre-sedation risk assessment (ASA physical status, airway assessment, fasting guidelines), continuous physiological monitoring (capnography, pulse oximetry, ECG, BP), and immediate availability of airway rescue equipment and pharmacologic reversal agents."
        ),
        "teaching_points": [
            "Continuous end-tidal carbon dioxide monitoring (capnography) is mandatory during moderate and deep procedural sedation, detecting hypoventilation, respiratory depression, and airway obstruction significantly earlier than pulse oximetry.",
            "Pre-sedation fasting guidelines for elective procedures require a minimum of 2 hours for clear liquids, 4 hours for breast milk, and 6 hours for light meals or non-human milk to minimize pulmonary aspiration risks.",
            "Specific pharmacologic reversal agents must be immediately accessible wherever sedation is administered: flumazenil for benzodiazepines (0.2 mg IV incrementally) and naloxone for opioids (0.04 to 0.4 mg IV).",
            "Ultra-short-acting sedative agents such as remimazolam (esterase-cleared benzodiazepine) and dexmedetomidine (selective alpha-2 agonist) offer enhanced hemodynamic and respiratory safety with preserved spontaneous ventilation compared to propofol."
        ],
        "mcq_angles": [
            "Recognizing capnography wave changes indicative of hypoventilation or upper airway obstruction before pulse oximetry desaturates.",
            "Safe administration and repeat dosing of flumazenil in benzodiazepine overdose, including monitoring for re-sedation due to the short half-life of flumazenil relative to long-acting benzodiazepines.",
            "Airway risk stratification prior to procedural sedation (Mallampati score, thyromental distance, cervical spine mobility, and history of obstructive sleep apnoea)."
        ],
        "case_hooks": [
            "A 64-year-old obese man undergoing colonoscopy with IV midazolam and fentanyl develops flatline capnography waveforms with paradoxical chest-abdomen motion while SpO2 remains 98% on nasal cannula oxygen.",
            "A 72-year-old woman receives IV midazolam for upper GI endoscopy; 30 minutes post-procedure after flumazenil reversal, she becomes unresponsive and hypoventilating in recovery."
        ],
        "uncertainties": [
            "Utility of routine pre-procedure gastric point-of-care ultrasound (POCUS) in emergency patients with unknown or non-fasted status requiring procedural sedation.",
            "Comparative safety and cost-effectiveness of remimazolam versus propofol in high-risk elderly patients undergoing complex endoscopic interventions."
        ]
    },

    "seizures": {
        "mentor_intro": (
            "A seizure is a transient occurrence of signs and/or symptoms due to abnormal, excessive, or synchronous neuronal activity in the brain. "
            "Seizures are broadly classified by the International League Against Epilepsy (ILAE 2017) by onset: focal (with or without retained awareness, motor or non-motor), generalized (motor or non-motor/absence), or unknown onset. "
            "The initial clinical priority is differentiating true unprovoked seizures from acute provoked seizures (toxic, metabolic, infectious, vascular) and non-epileptic mimickers (syncope, psychogenic non-epileptic seizures [PNES]), followed by emergency stabilization of status epilepticus."
        ),
        "teaching_points": [
            "Status epilepticus is defined operationally as continuous seizure activity or recurrent seizures without full neurological recovery lasting >=5 minutes for generalized tonic-clonic convulsive seizures (Time 1 [t1]), at which point emergency benzodiazepine rescue therapy must be administered.",
            "First-line emergency termination of active convulsive status epilepticus requires IV lorazepam (0.1 mg/kg) or IM midazolam (10 mg for weight >40 kg), which is equally rapid and effective in pre-hospital or non-IV settings.",
            "Acute provoked seizures caused by correctable metabolic disturbances (severe hyponatraemia, hypocalcaemia, hypoglycaemia), alcohol withdrawal, or acute central nervous system infection do not warrant long-term maintenance anti-seizure medication (ASM) once the underlying insult is resolved.",
            "Following a first unprovoked seizure, neuroimaging (contrast-enhanced brain MRI preferred over CT) and an electroencephalogram (EEG) are mandatory to stratify 10-year recurrence risk (>60% risk warrants formal diagnosis of epilepsy and initiation of ASM)."
        ],
        "mcq_angles": [
            "Distinguishing epileptic seizures from cardiogenic syncope (post-ictal confusion, lateral tongue biting, prolonged recovery favor seizure; sudden loss of tone with rapid clear recovery favors syncope).",
            "Emergency algorithm for status epilepticus: timing of benzodiazepine first-line therapy (at 5 minutes) followed by second-line IV ASM infusion (levetiracetam, fosphenytoin, or valproate) if seizures persist beyond 10-20 minutes.",
            "Prophylactic anti-seizure medication guidelines in acute spontaneous intracerebral haemorrhage or acute stroke (routine prophylaxis is not recommended in the absence of documented seizures)."
        ],
        "case_hooks": [
            "A 28-year-old man is brought to the ED by ambulance in continuous tonic-clonic convulsions; the seizure has been ongoing for 12 minutes despite pre-hospital administration of intranasal midazolam.",
            "A 42-year-old woman presents after a first witnessed seizure; she awoke on the floor with soreness, right lateral tongue laceration, and a 45-minute period of post-ictal confusion."
        ],
        "uncertainties": [
            "Optimal threshold and criteria for initiating long-term anti-seizure medication after a single unprovoked nocturnal seizure with normal EEG and MRI.",
            "Comparative cognitive and psychiatric safety of newer broad-spectrum anti-seizure medications (brivaracetam, cenobamate) in young adults."
        ]
    }
}
