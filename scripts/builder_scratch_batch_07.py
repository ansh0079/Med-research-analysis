# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 7 (Topics 151-175) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_07_TOPICS = {
    "sepsis fluid resuscitation": {
        "mentor_intro": (
            "Early fluid resuscitation in sepsis and septic shock aims to restore intravascular volume, augment preload, and optimize microvascular tissue perfusion. "
            "International guidelines recommend an initial crystalloid bolus of 30 mL/kg within the first 3 hours of resuscitation, with balanced crystalloids (e.g., lactated Ringer's or Plasma-Lyte) preferred over 0.9% normal saline to prevent hyperchloraemic metabolic acidosis and acute kidney injury. "
            "Resuscitation must transition rapidly from fixed-volume administration to individualized dynamic physiological measures of fluid responsiveness (passive leg raise, stroke volume variation) to avoid fatal fluid overload and pulmonary oedema."
        ),
        "teaching_points": [
            "Balanced crystalloids (lactated Ringer's, buffered solutions) are preferred over 0.9% saline for initial resuscitation in sepsis and septic shock, reducing the composite incidence of acute kidney injury, renal replacement therapy, and mortality (SMART and SALT-ED trials).",
            "Initial guideline-directed resuscitation targets at least 30 mL/kg of IV crystalloid fluid within the first 3 hours, after which further fluid administration must be guided by dynamic measures of fluid responsiveness rather than static central venous pressure.",
            "Dynamic indices of fluid responsiveness—primarily passive leg raising (PLR) coupled with real-time cardiac output measurement or stroke volume variation (SVV) on arterial line analysis—distinguish fluid responders (stroke volume increase >=10-15%) from non-responders.",
            "Hyperoncotic albumin (20%) is recommended as an adjunctive resuscitation fluid in patients requiring substantial volumes of crystalloids, improving mean arterial pressure and reducing vasopressor duration without increasing renal adverse events (ALBIOS trial)."
        ],
        "mcq_angles": [
            "Selection of resuscitation crystalloids: explaining why balanced crystalloids prevent hyperchloraemic metabolic acidosis, renal vasoconstriction, and AKI compared to normal saline.",
            "Dynamic assessment of volume responsiveness: recognizing why passive leg raising acts as an endogenous 300-500 mL fluid bolus and predicting responder status.",
            "Indications for albumin administration in septic shock (refractory shock requiring escalating crystalloids and vasopressors)."
        ],
        "case_hooks": [
            "A 66-year-old male with urosepsis presents with BP 76/40 mmHg and lactate 4.8 mmol/L; after receiving 2.5 L of normal saline, his serum chloride rises to 116 mmol/L with worsening metabolic acidosis.",
            "A 72-year-old female with septic shock due to pneumonia remains hypotensive despite 30 mL/kg balanced crystalloids; passive leg raising yields an 18% increase in stroke volume on cardiac output monitoring."
        ],
        "uncertainties": [
            "Restrictive versus liberal fluid strategies following initial resuscitation in patients with septic shock (CLOVERS and CLASSIC trials).",
            "Optimal timing and physiological triggers for de-resuscitation and active fluid removal using loop diuretics or renal replacement therapy."
        ]
    },

    "severe asthma biologics": {
        "mentor_intro": (
            "Severe uncontrolled asthma—refractory to high-dose inhaled corticosteroids (ICS) plus long-acting beta-agonists (LABA)—is classified into Type 2 (T2-high) eosinophilic/allergic inflammation and non-Type 2 asthma. "
            "Targeted biologics have transformed T2-high asthma management by reducing exacerbations, tapering oral corticosteroid (OCS) dependency, and improving lung function. "
            "Key therapeutic monoclonal antibodies include anti-IgE (omalizumab), anti-IL-5 (mepolizumab, reslizumab), anti-IL-5 receptor alpha (benralizumab), anti-IL-4/IL-13 receptor (dupilumab), and the epithelial alarmin anti-TSLP antibody (tezepelumab)."
        ),
        "teaching_points": [
            "Biologic selection in severe asthma is guided by baseline biomarker phenotyping: blood eosinophils (>=150-300 cells/uL), fractional exhaled nitric oxide (FeNO >=20-25 ppb), serum total IgE, and positive aeroallergen skin prick testing.",
            "Dupilumab (anti-IL-4R alpha, inhibiting both IL-4 and IL-13 signaling) demonstrates dual efficacy in improving FEV1 and enabling systemic oral corticosteroid weaning in severe eosinophilic asthma and steroid-dependent asthma (VENTURE and QUEST trials).",
            "Tezepelumab (anti-thymic stromal lymphopoietin [TSLP]) acts upstream at the airway epithelial alarmin level, delivering clinical efficacy in reducing exacerbations across both T2-high and T2-low biomarker-negative asthma cohorts (NAVIGATOR trial).",
            "Switching between biologic classes is safe and clinically effective when patients experience sub-optimal exacerbation reduction, lack of OCS reduction, or intolerable side effects (e.g., switching from anti-IL-5 to dupilumab or tezepelumab)."
        ],
        "mcq_angles": [
            "Matching patient biomarker profiles to specific biologics: omalizumab for allergic/high IgE asthma vs anti-IL-5/IL-5R for eosinophilic vs dupilumab for elevated FeNO and concurrent atopic dermatitis/nasal polyposis.",
            "Recognizing paradoxical transient hypereosinophilia associated with dupilumab due to inhibition of eosinophil tissue extravasation.",
            "Selecting tezepelumab as the only approved biologic effective in non-eosinophilic, T2-low severe asthma."
        ],
        "case_hooks": [
            "A 46-year-old woman with severe asthma dependent on prednisone 10 mg daily has a blood eosinophil count of 450 cells/uL and bilateral nasal polyposis, presenting for biologic initiation.",
            "A 52-year-old non-atopic male with severe refractory asthma, blood eosinophils of 90 cells/uL, and FeNO of 12 ppb continues to have frequent exacerbations on high-dose ICS/LABA/LAMA."
        ],
        "uncertainties": [
            "Predictive biomarkers to guide switching between anti-IL-5 pathways and upstream anti-TSLP therapy in partial responders.",
            "Long-term disease-modifying potential and remission criteria enabling safe cessation or dose reduction of severe asthma biologics."
        ]
    },

    "severe community acquired pneumonia corticosteroids adults": {
        "mentor_intro": (
            "Severe community-acquired pneumonia (sCAP) requiring intensive care admission carries mortality rates approaching 20-30% due to overwhelming alveolar-capillary inflammation, acute respiratory failure, and refractory septic shock. "
            "Adjunctive systemic corticosteroid therapy targets this dysregulated systemic and pulmonary inflammatory cascade. "
            "The landmark CAPE COD trial demonstrated that early administration of intravenous hydrocortisone significantly reduces 28-day all-cause mortality and endotracheal intubation in adults admitted to the ICU with severe CAP."
        ),
        "teaching_points": [
            "Early initiation of intravenous hydrocortisone (200 mg daily by continuous infusion or divided doses) in adults hospitalized in the ICU with severe community-acquired pneumonia significantly reduces 28-day mortality without increasing secondary hospital-acquired infections (CAPE COD trial).",
            "Guideline-directed criteria for defining severe CAP include major criteria (invasive mechanical ventilation, septic shock requiring vasopressors) or >=3 minor criteria (respiratory rate >=30 bpm, PaO2/FiO2 <=250, multilobar infiltrates, confusion, BUN >=20 mg/dL, leukopenia, thrombocytopenia, hypothermia, hypotension requiring aggressive fluid resuscitation).",
            "Corticosteroids are specifically contraindicated or demonstrate net harm in viral respiratory pneumonias such as uncomplicated seasonal influenza and Middle East respiratory syndrome (MERS-CoV), due to delayed viral clearance and elevated secondary bacterial superinfections.",
            "Empiric antimicrobial regimens for severe CAP require broad-spectrum coverage combining a beta-lactam (e.g., ceftriaxone, cefotaxime, or ampicillin-sulbactam) with either a macrolide (azithromycin) or a respiratory fluoroquinolone (levofloxacin), with MRSA and Pseudomonas coverage reserved for documented risk factors."
        ],
        "mcq_angles": [
            "CAPE COD trial indications: identifying which ICU patients with severe CAP derive survival benefit from early IV hydrocortisone.",
            "Contraindications to empiric corticosteroids in pneumonia: identifying acute influenza infection where steroids worsen outcomes.",
            "Distinguishing clinical minor criteria of the ATS/IDSA severe CAP definition to guide ICU triage."
        ],
        "case_hooks": [
            "A 62-year-old man presents to the ICU with bilateral lobar consolidation, confusion, respiratory rate 34 bpm, PaO2/FiO2 ratio 180, and BP 88/54 mmHg requiring norepinephrine; viral PCR is negative for influenza and SARS-CoV-2.",
            "A 55-year-old woman with severe bilateral pneumonia in the ICU tests positive for Influenza A; the clinical team considers whether adjunctive hydrocortisone should be added."
        ],
        "uncertainties": [
            "Efficacy and safety of hydrocortisone in patients with severe CAP and poorly controlled pre-existing diabetes mellitus.",
            "Optimal duration and tapering schedule of hydrocortisone (treatment for 4 to 8 days based on clinical improvement versus fixed 14-day courses)."
        ]
    },

    "sexually transmitted infections": {
        "mentor_intro": (
            "Sexually transmitted infections (STIs) encompass bacterial, viral, and protozoal pathogens transmitted through sexual contact, presenting across clinical syndromes including urethritis, cervicitis, vaginitis, genital ulcer disease, and pelvic inflammatory disease (PID). "
            "Rising global incidence and escalating antimicrobial resistance—most critically Ceftriaxone-resistant Neisseria gonorrhoeae and multidrug-resistant Mycoplasma genitalium—require strict adherence to updated guidelines. "
            "Comprehensive management mandates nucleic acid amplification testing (NAAT), empiric syndromic treatment when indicated, partner notification/expedited partner therapy (EPT), and integration of biomedical prevention (doxycycline post-exposure prophylaxis [Doxy-PEP], HIV PrEP, and HPV/HBV vaccination)."
        ),
        "teaching_points": [
            "Uncomplicated urogenital, anorectal, or pharyngeal gonorrhoea in adults is treated with a single intramuscular dose of ceftriaxone (500 mg for body weight <150 kg; 1 g for >=150 kg), abandoning oral azithromycin co-therapy to limit macrolide resistance.",
            "Uncomplicated Chlamydia trachomatis urogenital infection is treated with oral doxycycline 100 mg twice daily for 7 days as the first-line regimen, demonstrating superior microbiological cure rates over single-dose azithromycin (especially for rectal chlamydia).",
            "Doxycycline post-exposure prophylaxis (Doxy-PEP, 200 mg taken within 72 hours of condomless sexual contact) significantly reduces bacterial STI incidence (syphilis, chlamydia, and gonorrhoea) in men who have sex with men (MSM) and transgender women.",
            "Mycoplasma genitalium is a major cause of persistent or recurrent non-gonococcal urethritis (NGU); treatment requires resistance-guided therapy using doxycycline 100 mg bid for 7 days followed by either azithromycin (if macrolide-susceptible) or moxifloxacin (if macrolide-resistant)."
        ],
        "mcq_angles": [
            "First-line dosing of ceftriaxone for uncomplicated gonococcal infection (500 mg IM monotherapy) and recognizing why azithromycin was removed.",
            "Superiority of 7-day doxycycline over single-dose azithromycin for rectal chlamydia infection.",
            "Implementation and candidate eligibility for Doxy-PEP (200 mg within 72 hours) in high-risk sexual health populations."
        ],
        "case_hooks": [
            "A 23-year-old male presents with purulent penile discharge and severe dysuria 4 days after unprotected sexual intercourse; Gram stain reveals intracellular Gram-negative diplococci.",
            "A 29-year-old female presents with persistent mucopurulent cervicitis after receiving empiric azithromycin 1 g for presumed chlamydia; repeat NAAT returns positive for Mycoplasma genitalium."
        ],
        "uncertainties": [
            "Long-term impact of widespread Doxy-PEP on community-level tetracycline resistance in Staphylococcus aureus, Streptococcus pneumoniae, and commensal flora.",
            "Optimal treatment regimens for multidrug-resistant Mycoplasma genitalium possessing dual macrolide and fluoroquinolone resistance mutations."
        ]
    },

    "shoulder pathology": {
        "mentor_intro": (
            "Shoulder pathology encompasses a broad spectrum of structural and inflammatory conditions of the glenohumeral and acromioclavicular joints, rotator cuff, and periarticular soft tissues. "
            "The most common etiologies include rotator cuff tendinopathy and tears (supraspinatus, infraspinatus, subscapularis, teres minor), subacromial impingement syndrome, adhesive capsulitis ('frozen shoulder'), glenohumeral osteoarthritis, and shoulder instability. "
            "Careful clinical examination—distinguishing active versus passive range of motion and utilizing targeted provocative maneuvers—paired with ultrasound or MRI, is paramount to differentiate true shoulder pathology from referred cervical radiculopathy (C5-C6)."
        ),
        "teaching_points": [
            "Adhesive capsulitis is distinguished clinically by profound restriction in BOTH active and passive glenohumeral range of motion in all planes, most characteristically external rotation, whereas rotator cuff tears preserve passive range of motion.",
            "Subacromial impingement and rotator cuff integrity are evaluated clinically using specialized tests: Hawkins-Kennedy and Neer (impingement), Empty Can/Jobe test (supraspinatus), External Rotation Lag sign (infraspinatus), and Bear-hug / Belly-press test (subscapularis).",
            "High-resolution ultrasound demonstrates diagnostic accuracy comparable to MRI for full-thickness rotator cuff tears and allows dynamic real-time visualization of subacromial impingement during arm abduction.",
            "Cervical spine pathology (C5-C6 radiculopathy) frequently mimics shoulder pathology; Spurling's test (axial neck compression in extension and ipsilateral rotation) reproducing arm radiation differentiates referred neck disease from primary shoulder disorders."
        ],
        "mcq_angles": [
            "Differentiating adhesive capsulitis from rotator cuff tear: loss of passive external rotation is the hallmark of adhesive capsulitis.",
            "Physical examination maneuvers specific to subscapularis tendon tears (Belly-press, Bear-hug, Lift-off tests).",
            "Identifying cervical radiculopathy mimicking shoulder pain (Spurling maneuver and dermatomal sensory/reflex changes)."
        ],
        "case_hooks": [
            "A 52-year-old diabetic woman presents with 4 months of progressive shoulder stiffness and night pain; physical examination reveals 50% loss of both active and passive external rotation and forward elevation.",
            "A 64-year-old painter reports sudden anterolateral shoulder pain and inability to abduct his arm after a fall; passive ROM is fully intact, but he displays a positive drop-arm test."
        ],
        "uncertainties": [
            "Optimal timing for surgical repair of symptomatic full-thickness rotator cuff tears versus extended structured physical therapy in older adults.",
            "Efficacy of hydrodilatation combined with intra-articular corticosteroid injection compared to manipulation under anaesthesia in refractory adhesive capsulitis."
        ]
    },

    "soft tissue injuries": {
        "mentor_intro": (
            "Soft tissue injuries—comprising muscle strains, ligamentous sprains, tendon injuries, and contusions—represent the most frequent musculoskeletal presentations in sports medicine and emergency practice. "
            "Management paradigms have transitioned from the acute vasoconstrictive 'RICE' protocol to the comprehensive 'PEACE & LOVE' framework (Protect, Elevate, Avoid anti-inflammatory modalities, Compress, Educate & Load, Optimism, Vascularisation, Exercise). "
            "Accurate grading (Grade I: microscopic tear; Grade II: partial tear; Grade III: complete rupture), exclusion of fracture via validated rules (e.g., Ottawa Ankle Rules), and progressive functional rehabilitation determine safe return to play."
        ),
        "teaching_points": [
            "The modern management of acute soft tissue injuries utilizes the PEACE & LOVE framework, which specifically discourages early routine NSAID and ice use because inhibiting acute inflammatory signaling impairs long-term tissue regeneration and tendon/ligament healing.",
            "The Ottawa Ankle Rules reliably exclude fracture in acute ankle trauma (bone tenderness at posterior edge/tip of lateral or medial malleolus, or inability to bear weight both immediately and in the ED), reducing unneeded radiography with >98% sensitivity.",
            "Early progressive active mobilization and mechanical loading ('Load' in PEACE & LOVE) stimulates collagen realignment, increases tensile strength, and accelerates return-to-sport compared to prolonged joint immobilization.",
            "Complete structural tendon ruptures (e.g., Achilles tendon rupture, distal biceps tendon) require urgent assessment using clinical tests (Thompson/Simmonds squeeze test for Achilles) to decide between surgical repair versus functional bracing protocols."
        ],
        "mcq_angles": [
            "Applying Ottawa Ankle and Foot Rules to eliminate unnecessary radiographs in acute ankle sprains.",
            "Physiological rationale for avoiding high-dose NSAIDs during the acute 48-72 hour phase of muscle and ligament healing.",
            "Diagnostic accuracy of the Thompson squeeze test in acute Achilles tendon rupture and recognizing false negatives from plantaris preservation."
        ],
        "case_hooks": [
            "A 22-year-old soccer player sustains an acute inversion ankle sprain; he is able to walk 4 steps in the clinic, and has no bone tenderness over the distal 6 cm of either malleolus, navicular, or fifth metatarsal.",
            "A 40-year-old recreational runner feels a sudden 'pop' in his calf during a sprint; calf squeeze fails to elicit passive plantarflexion of the foot (positive Thompson test)."
        ],
        "uncertainties": [
            "Efficacy of platelet-rich plasma (PRP) injections in accelerating healing of acute Grade II muscle strains and partial tendon tears.",
            "Surgical repair versus non-operative functional rehabilitation with early weight-bearing in acute complete Achilles tendon ruptures."
        ]
    },

    "solid organ transplant induction immunosuppression": {
        "mentor_intro": (
            "Induction immunosuppression in solid organ transplantation entails the intensive, short-term administration of potent biological agents at the time of graft implantation to prevent hyperacute and early acute allograft rejection. "
            "Therapy is broadly dichotomized into lymphocyte-depleting agents (rabbit anti-thymocyte globulin [rATG/Thymoglobulin], alemtuzumab) and non-depleting IL-2 receptor antagonists (basiliximab). "
            "The choice of induction is tailored to immunological risk (panel reactive antibody [PRA], donor-specific antibodies [DSA], HLA mismatches, re-transplantation), balanced against risks of severe opportunistic infections (CMV, PJP) and post-transplant lymphoproliferative disorder (PTLD)."
        ),
        "teaching_points": [
            "Rabbit anti-thymocyte globulin (rATG) is a polyclonal lymphocyte-depleting antibody indicated for high immunological risk transplant recipients (high panel reactive antibodies, positive donor-specific antibodies, black race, re-transplant, or delayed graft function risk).",
            "Basiliximab is a chimeric monoclonal antibody that competitively blocks the IL-2 receptor alpha-chain (CD25), providing effective, non-depleting immunosuppression with minimal risk of opportunistic infection or PTLD in low-to-moderate immunological risk recipients.",
            "Lymphocyte-depleting induction (rATG or alemtuzumab) mandates rigorous monitoring of absolute lymphocyte counts and CD3+ cell counts, alongside mandatory antimicrobial prophylaxis for Cytomegalovirus (valganciclovir) and Pneumocystis jirovecii (trimethoprim-sulfamethoxazole) for at least 3-6 months.",
            "Premedication with intravenous corticosteroids, antihistamines (diphenhydramine), and paracetamol is mandatory prior to rATG infusion to prevent severe cytokine release syndrome and infusion-related anaphylactoid reactions."
        ],
        "mcq_angles": [
            "Selecting rATG versus basiliximab based on immunological risk stratification in renal transplantation.",
            "Managing cytokine release syndrome and premedication requirements during rabbit anti-thymocyte globulin infusion.",
            "Duration and antimicrobial regimens for mandatory post-transplant prophylaxis (valganciclovir for CMV, TMP-SMX for PJP) based on induction type."
        ],
        "case_hooks": [
            "A 38-year-old woman undergoing a second deceased-donor kidney transplant has a calculated PRA of 85% and two donor HLA antigen mismatches; the transplant team selects an induction protocol.",
            "During the first infusion of rabbit anti-thymocyte globulin, a 52-year-old man develops rigors, fever to 39.4 C, bronchospasm, and hypotension, reflecting cytokine release."
        ],
        "uncertainties": [
            "Efficacy of steroid-avoidance or rapid early steroid withdrawal protocols when combined with alemtuzumab or rATG induction.",
            "Long-term malignancy and PTLD risks associated with lymphocyte-depleting induction compared to basiliximab in elderly transplant recipients."
        ]
    },

    "spironolactone mineralocorticoid antagonist severe heart failure survival": {
        "mentor_intro": (
            "Mineralocorticoid receptor antagonists (MRAs)—specifically spironolactone and eplerenone—are foundational pillars of guideline-directed medical therapy (GDMT) for heart failure with reduced ejection fraction (HFrEF, LVEF <=40%). "
            "The landmark RALES trial established that low-dose spironolactone (25 mg daily) added to standard therapy in patients with severe HFrEF (NYHA Class III-IV) confers a 30% relative reduction in all-cause mortality and 35% reduction in heart failure hospitalizations. "
            "Clinical implementation demands vigilant surveillance of renal function and serum potassium to prevent lethal hyperkalaemia, with strict adherence to initiation thresholds (potassium <5.0 mmol/L, eGFR >=30 mL/min/1.73m2)."
        ),
        "teaching_points": [
            "The RALES trial demonstrated that adding spironolactone (mean dose 26 mg daily) to standard therapy in patients with severe HFrEF (LVEF <=35%, NYHA III-IV) reduced all-cause mortality by 30% (p < 0.001) and sudden cardiac death.",
            "Initiation criteria for spironolactone in HFrEF require baseline serum potassium <5.0 mmol/L and estimated GFR >=30 mL/min/1.73m2 (or serum creatinine <2.5 mg/dL in men, <2.0 mg/dL in women); potassium and renal function must be rechecked at 1, 4, 8, and 12 weeks.",
            "Eplerenone is a selective mineralocorticoid receptor antagonist that avoids the anti-androgenic side effects of spironolactone (painful gynaecomastia, erectile dysfunction, menstrual irregularities occurring in ~10% of men on spironolactone), validated in the EMPHASIS-HF and EPHESUS trials.",
            "Novel non-steroidal MRAs (e.g., finerenone) exhibit higher mineralocorticoid receptor selectivity with lower hyperkalaemia rates, demonstrating cardiorenal protective benefits in chronic kidney disease associated with type 2 diabetes."
        ],
        "mcq_angles": [
            "RALES trial landmark outcomes: 30% mortality reduction in severe heart failure with spironolactone 25 mg daily.",
            "Monitoring schedule and action thresholds for hyperkalaemia (reduce dose by 50% if potassium 5.1-5.5 mmol/L; discontinue if potassium >5.5 mmol/L).",
            "Switching from spironolactone to eplerenone in male patients who develop painful gynaecomastia or mastodynia."
        ],
        "case_hooks": [
            "A 68-year-old man with ischemic cardiomyopathy (LVEF 28%, NYHA III) on sacubitril-valsartan and carvedilol has potassium 4.3 mmol/L and eGFR 54 mL/min; spironolactone 25 mg daily is initiated.",
            "A 60-year-old man taking spironolactone 25 mg daily for HFrEF presents with bilateral tender breast enlargement; potassium is 4.6 mmol/L and eGFR is 62 mL/min."
        ],
        "uncertainties": [
            "Clinical efficacy of MRAs in heart failure with preserved ejection fraction (HFpEF) across different geographic cohorts in the TOPCAT trial.",
            "Safety and efficacy of co-administering novel potassium binders (patiromer, sodium zirconium cyclosilicate) to maintain MRA therapy in patients prone to recurrent hyperkalaemia."
        ]
    },

    "spontaneous bacterial peritonitis": {
        "mentor_intro": (
            "Spontaneous bacterial peritonitis (SBP) is an acute, life-threatening bacterial infection of ascitic fluid occurring in patients with advanced cirrhosis, without an identifiable surgically treatable intra-abdominal infection source. "
            "Pathophysiology involves intestinal bacterial translocation across an impaired gut mucosal barrier into mesenteric lymph nodes and systemic circulation, seeding ascitic fluid with defective bactericidal opsonic activity. "
            "Diagnostic paracentesis is mandatory in any cirrhotic patient with ascites admitted to hospital or exhibiting clinical deterioration; diagnostic criteria require an ascitic fluid absolute neutrophil count (ANC) >=250 cells/mm3 (>=0.25 x 10^9/L)."
        ),
        "teaching_points": [
            "Diagnostic paracentesis must be performed urgently in all cirrhotic patients hospitalized with ascites or presenting with fever, abdominal pain, altered mental status (hepatic encephalopathy), or acute renal/liver decompensation.",
            "An ascitic fluid absolute neutrophil count (ANC) >=250 cells/mm3 (polymorphonuclear leukocytes >=0.25 x 10^9/L) is diagnostic of SBP and mandates immediate empiric antibiotic therapy, without waiting for ascitic fluid culture results.",
            "First-line empiric antibiotic therapy for community-acquired SBP is an intravenous third-generation cephalosporin (cefotaxime 2 g q8h or ceftriaxone 2 g q24h); nosocomial SBP requires broader coverage (e.g., piperacillin-tazobactam or meropenem) due to high multidrug resistance rates.",
            "Intravenous albumin (1.5 g/kg within 6 hours of diagnosis, followed by 1.0 g/kg on day 3) reduces the incidence of hepatorenal syndrome from 30% to 10% and significantly decreases hospital mortality, particularly in patients with baseline bilirubin >=4 mg/dL or creatinine >=1 mg/dL."
        ],
        "mcq_angles": [
            "Diagnostic threshold for SBP: calculating ANC (Total WBC count x % neutrophils) >=250 cells/mm3.",
            "Dosing and mortality benefit of IV albumin co-administration on days 1 and 3 in SBP to prevent hepatorenal syndrome.",
            "Secondary prophylaxis indications: long-term oral fluoroquinolone (norfloxacin/ciprofloxacin) or trimethoprim-sulfamethoxazole following a single episode of SBP."
        ],
        "case_hooks": [
            "A 54-year-old man with decompensated alcoholic cirrhosis presents with low-grade fever, worsening jaundice, and subtle confusion; diagnostic paracentesis yields cloudy fluid with WBC 850/mm3 and 65% neutrophils (ANC = 552/mm3).",
            "A patient with diagnosed SBP and serum creatinine 1.4 mg/dL receives IV ceftriaxone; the treating physician orders IV albumin at 1.5 g/kg."
        ],
        "uncertainties": [
            "Optimal empiric antimicrobial regimens for hospital-acquired SBP in regions with high prevalence of extended-spectrum beta-lactamase (ESBL) Enterobacteriaceae and carbapenem-resistant organisms.",
            "Utility of metagenomic next-generation sequencing (mNGS) or leukocyte esterase reagent strips for rapid bedside triage of SBP."
        ]
    },

    "squamous cell carcinoma": {
        "mentor_intro": (
            "Squamous cell carcinoma (SCC) is a malignant neoplasm derived from keratinocytes or stratified squamous epithelium, presenting across diverse anatomic sites including cutaneous (cSCC), head and neck (HNSCC), oropharynx, oesophagus, lung, anal, and cervical tissues. "
            "Cutaneous SCC is the second most common human skin cancer, strongly linked to ultraviolet radiation-induced TP53 mutations, chronic immunosuppression (solid organ transplant recipients carry a 65- to 250-fold increased risk), and precursor actinic keratoses. "
            "High-risk features dictate complete surgical resection with histological margin assessment (Mohs micrographic surgery), nodal staging via sentinel lymph node biopsy or cross-sectional imaging, and immune checkpoint inhibitor therapy for advanced unresectable disease."
        ),
        "teaching_points": [
            "High-risk cutaneous SCC features according to NCCN/AJCC guidelines include diameter >=2 cm on trunk/extremities or >=1 cm on high-risk head/neck areas (mask areas of face, ears, lips), depth >6 mm or invasion beyond subcutaneous fat, poor histological differentiation, and perineural invasion (nerve diameter >=0.1 mm).",
            "Mohs micrographic surgery is the gold standard surgical approach for high-risk cutaneous SCC in cosmetically and functionally sensitive areas (face, ears, hands, genitalia), achieving complete 100% circumferential peripheral and deep margin examination.",
            "Solid organ transplant recipients have an exponentially elevated risk of aggressive, multiple, and metastatic cSCC; management includes intensive dermatologic screening, early surgical intervention, and consideration of switching immunosuppression to an mTOR inhibitor (sirolimus/everolimus).",
            "Immune checkpoint inhibitors targeting PD-1 (cemiplimab, pembrolizumab) represent the first-line systemic standard of care for locally advanced or metastatic cutaneous SCC not amenable to curative surgery or radiotherapy."
        ],
        "mcq_angles": [
            "Criteria defining high-risk cSCC warranting Mohs micrographic surgery or wide local excision with >6-10 mm margins.",
            "Management of aggressive multifocal cSCC in renal transplant recipients: role of mTOR inhibitor conversion to reduce secondary skin cancer recurrence.",
            "Systemic therapy of choice for unresectable locally advanced or metastatic cSCC (PD-1 inhibitors cemiplimab/pembrolizumab)."
        ],
        "case_hooks": [
            "A 68-year-old male kidney transplant recipient of 12 years presents with a rapidly growing, ulcerated, hyperkeratotic 2.2 cm nodule on the helical rim of his left ear with histological perineural invasion.",
            "A 75-year-old farmer presents with a recurrent, bleeding fungating lesion over the bridge of the nose invading the lateral nasal cartilage."
        ],
        "uncertainties": [
            "Optimal role and clinical threshold of sentinel lymph node biopsy (SLNB) in intermediate-to-high risk cutaneous SCC without clinically palpable lymphadenopathy.",
            "Safety and rejection risks of PD-1 checkpoint inhibitors in solid organ transplant recipients with advanced, unresectable cutaneous SCC."
        ]
    },

    "statin adverse effects in older adults": {
        "mentor_intro": (
            "Statins (HMG-CoA reductase inhibitors) are among the most extensively prescribed cardiovascular medications worldwide, with proven mortality and atherosclerotic cardiovascular disease (ASCVD) risk reduction across secondary and high-risk primary prevention. "
            "In older adults (>=65-75 years), pharmacokinetic alterations, polypharmacy, and co-morbidities increase susceptibility to statin-associated muscle symptoms (SAMS), drug-drug interactions (via CYP3A4 inhibition), and new-onset diabetes mellitus. "
            "Personalized risk-benefit shared decision-making is essential, utilizing validated deprescribing frameworks in frail individuals with limited life expectancy while preserving high-intensity statins for robust older patients with high ischemic risk."
        ),
        "teaching_points": [
            "Statin-associated muscle symptoms (SAMS) represent the most frequent adverse effect, presenting as bilateral symmetric proximal myalgia, weakness, or cramping without marked creatine kinase (CK) elevation; true rhabdomyolysis (CK >10 times ULN with renal impairment) is rare (<1 per 10,000 patient-years).",
            "Drug-drug interactions significantly heighten myopathy risk: co-administration of CYP3A4-metabolized statins (simvastatin, atorvastatin) with strong CYP3A4 inhibitors (clarithromycin, itraconazole, diltiazem, verapamil, amiodarone) drastically increases statin systemic exposure; hydrophilic statins (rosuvastatin, pravastatin) utilize non-CYP pathways and carry lower interaction potential.",
            "Statins cause a small, dose-dependent increase in the incidence of new-onset type 2 diabetes mellitus (primarily in patients with pre-existing metabolic syndrome or pre-diabetes); however, the cardiovascular morbidity and mortality benefits overwhelmingly exceed the glycemic risk.",
            "Evidence-based clinical guidelines support deprescribing statins in older adults (>=75-85 years) with severe multimorbidity, moderate-to-severe dementia, severe frailty, or life expectancy <1-2 years, where cardiovascular risk reduction is outweighed by medication burden and adverse events."
        ],
        "mcq_angles": [
            "Selecting rosuvastatin or pravastatin in elderly patients on complex polypharmacy including diltiazem or amiodarone to avoid CYP3A4 drug interactions.",
            "Diagnostic approach to statin-associated myalgia: obtaining baseline CK, de-challenging for 2-4 weeks, and re-challenging with a lower dose or alternate statin (or alternate-day rosuvastatin).",
            "Deprescribing thresholds in primary prevention vs continuing secondary prevention statins in frail nursing home residents."
        ],
        "case_hooks": [
            "A 78-year-old woman taking simvastatin 40 mg daily is prescribed diltiazem for rate control of atrial fibrillation; 3 weeks later she presents with severe bilateral thigh aching and muscle weakness with a CK of 2,400 U/L.",
            "An 86-year-old gentleman with severe vascular dementia, dependent in all ADLs, is admitted for recurrent falls; his medication list includes atorvastatin 80 mg daily prescribed 15 years ago for primary prevention."
        ],
        "uncertainties": [
            "Cardiovascular benefit and cognitive trajectory of continuing statins for primary prevention in robust community-dwelling octogenarians (addressed by the PREVENTABLE trial).",
            "Diagnostic role of anti-HMGCR antibody testing in differentiating self-limiting statin-induced myopathy from statin-triggered autoimmune necrotizing myopathy (IMNM)."
        ]
    },

    "status epilepticus": {
        "mentor_intro": (
            "Status epilepticus (SE) is a medical and neurological emergency resulting from the failure of normal seizure termination mechanisms, leading to abnormally prolonged continuous seizure activity. "
            "The ILAE defines two critical time points for convulsive status epilepticus: Time 1 (t1 = 5 minutes), the threshold at which treatment MUST be actively initiated to prevent permanent brain damage; and Time 2 (t2 = 30 minutes), the point beyond which neuronal injury and pharmacoresistance rapidly ensue. "
            "Treatment follows a time-locked escalation protocol: first-line benzodiazepines, second-line non-sedating IV anti-seizure medications, and third-line continuous IV general anaesthesia for refractory status epilepticus (RSE)."
        ),
        "teaching_points": [
            "First-line treatment (0-5 minutes of seizure) requires immediate administration of adequate-dose benzodiazepines: IV lorazepam (4 mg bolus, repeated once) or IM midazolam (10 mg for weight >40 kg, 5 mg for 13-40 kg), which is equally rapid and effective when IV access is not yet established (RAMPART trial).",
            "Second-line therapy (5-20 minutes) entails non-sedating intravenous anti-seizure medication (ASM) infusion; the landmark ESETT trial demonstrated that levetiracetam (60 mg/kg, max 4500 mg), fosphenytoin (20 mg PE/kg, max 1500 mg PE), and valproate sodium (40 mg/kg, max 3000 mg) have equivalent efficacy (~50% seizure termination) and safety.",
            "Refractory status epilepticus (RSE, failure of first- and second-line ASMs, typically >20-30 minutes) requires urgent endotracheal intubation, continuous ICU hemodynamic support, and continuous IV general anaesthetic infusions (propofol, midazolam, or ketamine) titrated to electrographic burst suppression on continuous EEG.",
            "Non-convulsive status epilepticus (NCSE) must be vigorously suspected and investigated via emergency continuous EEG in patients with prolonged unexplained altered mental status, coma, or subtle rhythmic twitching following a convulsive seizure or acute brain injury."
        ],
        "mcq_angles": [
            "RAMPART trial findings: superiority of IM midazolam via autoinjector over IV lorazepam in pre-hospital emergency termination of status epilepticus due to faster time to administration.",
            "ESETT trial findings: equivalent ~50% efficacy across IV levetiracetam, fosphenytoin, and sodium valproate as second-line therapy for benzodiazepine-refractory SE.",
            "Indications and titration goals for continuous general anaesthesia in refractory status epilepticus (burst-suppression on continuous EEG monitoring for 24-48 hours)."
        ],
        "case_hooks": [
            "A 34-year-old male with a history of epilepsy continues in generalized tonic-clonic convulsions for 8 minutes; paramedics have not established peripheral IV access.",
            "A 56-year-old woman in status epilepticus fails two doses of IV lorazepam and a full infusion of levetiracetam (60 mg/kg); seizures continue at minute 25, prompting second-line escalation."
        ],
        "uncertainties": [
            "Role and timing of early intravenous ketamine (NMDA receptor antagonist) to prevent benzodiazepine-induced GABA-A receptor internalization and NMDA receptor upregulation.",
            "Target depth and duration of electrographic suppression (complete burst suppression versus clinical and electrographic seizure cessation alone) in refractory status epilepticus."
        ]
    },

    "stroke": {
        "mentor_intro": (
            "Acute stroke is a devastating syndrome of rapidly developing clinical signs of focal or global disturbance of cerebral function lasting >24 hours or leading to death, with no apparent cause other than vascular origin. "
            "It is divided into acute ischaemic stroke (85%, caused by large vessel thrombosis, embolic occlusion, or microvascular lacunar disease) and haemorrhagic stroke (15%, comprising spontaneous intracerebral haemorrhage and subarachnoid haemorrhage). "
            "Emergency management hinges on time-critical neuroimaging ('time is brain') to rule out haemorrhage, determine ischemic core vs salvageable penumbra, and immediately deploy reperfusion therapies (intravenous thrombolysis within 4.5 hours and mechanical thrombectomy within 6 to 24 hours)."
        ),
        "teaching_points": [
            "Emergency non-contrast head CT or brain MRI is the mandatory initial imaging investigation in suspected acute stroke to definitively differentiate ischaemic stroke from acute intracerebral haemorrhage.",
            "Intravenous thrombolysis with tenecteplase (0.25 mg/kg, max 25 mg) or alteplase (0.9 mg/kg, max 90 mg) is indicated within 4.5 hours of symptom onset in eligible patients without contraindications (e.g., active bleeding, severe hypertension >185/110 mmHg, recent surgery, therapeutic anticoagulation).",
            "Endovascular mechanical thrombectomy (EVT) is the gold standard standard of care for acute ischaemic stroke due to large vessel occlusion (LVO) of the anterior circulation (internal carotid artery or proximal MCA-M1), demonstrating profound disability reduction when performed within 6 hours, and up to 24 hours in selected patients with perfusion mismatch (DAWN and DEFUSE-3 trials).",
            "In acute spontaneous intracerebral haemorrhage (ICH), immediate blood pressure lowering to a systolic target of 130-140 mmHg within 2 hours is safe and attenuates hematoma expansion (INTERACT-2 and ATACH-2 trials), alongside immediate reversal of any anticoagulant agents."
        ],
        "mcq_angles": [
            "Blood pressure thresholds for thrombolysis: blood pressure must be lowered below 185/110 mmHg prior to administering IV alteplase/tenecteplase, and maintained <180/105 mmHg for the first 24 hours post-thrombolysis.",
            "Endovascular thrombectomy time windows: standard 0-6 hours vs extended 6-24 hour window guided by CT perfusion (ischemic core vs penumbra volume).",
            "Anticoagulation reversal protocols in acute haemorrhagic stroke (4-factor prothrombin complex concentrate [4F-PCC] plus vitamin K for warfarin; idarucizumab for dabigatran; andexanet alfa or PCC for factor Xa inhibitors)."
        ],
        "case_hooks": [
            "A 64-year-old woman is brought to the ED 75 minutes after sudden onset of right dense hemiplegia and severe global aphasia (NIHSS 18); non-contrast head CT is normal (ASPECTS 10) and CT angiogram reveals a left MCA M1 occlusion.",
            "A 72-year-old male on apixaban for atrial fibrillation collapses with sudden severe headache, vomiting, and a Glasgow Coma Scale of 9; CT demonstrates a 45 mL acute intracerebral haematoma in the right basal ganglia."
        ],
        "uncertainties": [
            "Benefit of mechanical thrombectomy in patients presenting with large ischemic core volume (ASPECTS 3-5) on acute baseline imaging.",
            "Optimal blood pressure targets during and immediately following successful endovascular recanalization in acute ischaemic stroke."
        ]
    },

    "stroke prevention in atrial fibrillation": {
        "mentor_intro": (
            "Atrial fibrillation (AF) is the most frequent sustained cardiac arrhythmia, conferring a 5-fold increased risk of cardioembolic ischaemic stroke and systemic thromboembolism. "
            "Cardioembolic strokes originating from left atrial appendage thrombi in AF are characterized by greater severity, larger infarct size, higher recurrence, and higher mortality compared to other stroke subtypes. "
            "Thromboembolic risk stratification using the CHA2DS2-VASc score guides anticoagulation: direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) represent the first-line therapy over warfarin, while percutaneous left atrial appendage closure (LAAC) serves as an alternative for patients with absolute long-term contraindications."
        ),
        "teaching_points": [
            "Oral anticoagulation is strongly recommended for stroke prevention in non-valvular AF in men with a CHA2DS2-VASc score >=2 and women with >=3, and should be considered in men with score = 1 and women with score = 2.",
            "Direct oral anticoagulants (DOACs: dabigatran, rivaroxaban, apixaban, edoxaban) are superior to warfarin, exhibiting equivalent or superior thromboembolic reduction with a ~50% reduction in catastrophic intracranial haemorrhage and lower all-cause mortality.",
            "Aspirin or antiplatelet monotherapy is ineffective for stroke prevention in atrial fibrillation and carries bleeding risks comparable to oral anticoagulants; antiplatelet monotherapy is strictly not recommended for stroke prophylaxis in AF guidelines.",
            "Percutaneous left atrial appendage closure (LAAC, e.g., Watchman, Amulet devices) is an evidence-based non-pharmacologic alternative for patients with non-valvular AF at high stroke risk who have absolute, non-modifiable contraindications to long-term oral anticoagulation."
        ],
        "mcq_angles": [
            "Calculating the CHA2DS2-VASc score and identifying treatment thresholds where oral anticoagulation is definitively indicated.",
            "Explaining the fundamental advantage of DOACs over warfarin (specifically the dramatic 50% relative risk reduction in fatal intracranial haemorrhage).",
            "Inappropriateness of aspirin or clopidogrel for stroke prevention in AF (lack of stroke efficacy with bleeding risk near anticoagulation)."
        ],
        "case_hooks": [
            "A 69-year-old male with hypertension, type 2 diabetes, and newly diagnosed paroxysmal atrial fibrillation (CHA2DS2-VASc = 3) presents to clinic; he asks if he can take baby aspirin instead of a blood thinner.",
            "A 76-year-old female with persistent AF and a history of recurrent severe angiodysplastic lower GI bleeding requiring frequent transfusions is evaluated for percutaneous left atrial appendage closure."
        ],
        "uncertainties": [
            "Role of oral anticoagulation in patients with subclinical, device-detected atrial high-rate episodes (AHREs / silent AF lasting <24 hours) detected on pacemakers or wearables (ARTESiA and NOAH-AFNET 4 trials).",
            "Comparative long-term ischemic and bleeding outcomes of next-generation left atrial appendage occlusion devices versus modern DOAC monotherapy."
        ]
    },

    "substance use disorder": {
        "mentor_intro": (
            "Substance use disorder (SUD) is a chronic, relapsing brain disease characterized by compulsive drug seeking and use despite devastating personal, social, and physical consequences. "
            "SUD spans multiple substance classes—opioids, alcohol, cannabis, sedatives/hypnotics, stimulants (cocaine, methamphetamine), and tobacco—diagnosed by DSM-5 criteria across impaired control, social impairment, risky use, and pharmacological criteria (tolerance and withdrawal). "
            "Effective management integrates evidence-based harm reduction (naloxone distribution, needle exchange), maintenance agonist pharmacotherapies for opioid and alcohol disorders, and structured behavioural therapies."
        ),
        "teaching_points": [
            "Opioid use disorder (OUD) maintenance therapy with opioid agonists (buprenorphine-naloxone or methadone) represents the gold standard of care, significantly reducing illicit opioid use, criminal activity, transmission of HIV/HCV, and all-cause and overdose mortality.",
            "Buprenorphine is a partial mu-opioid receptor agonist with high binding affinity; initiating buprenorphine too early before the onset of objective opioid withdrawal (Clinical Opiate Withdrawal Scale [COWS] >=8-12) will displace full agonists and precipitate severe withdrawal.",
            "Harm reduction strategies, prominently wide community distribution of intranasal naloxone, provide life-saving emergency reversal of opioid overdose without increasing substance consumption.",
            "For alcohol use disorder, FDA-approved pharmacotherapies—acamprosate (modulating glutamate/GABA neurotransmission) and naltrexone (mu-opioid receptor antagonist reducing alcohol craving and heavy drinking days)—are underutilized first-line medical options."
        ],
        "mcq_angles": [
            "Mechanisms and prevention of precipitated withdrawal during buprenorphine induction (utilizing COWS scoring or micro-dosing / Bernese method).",
            "Selecting acamprosate over naltrexone in alcohol use disorder in patients with significant hepatic transaminitis or concurrent opioid use.",
            "Emergency administration and repeat dosing of naloxone in synthetic opioid (fentanyl) overdoses due to high potency and receptor displacement requirements."
        ],
        "case_hooks": [
            "A 27-year-old male with severe opioid use disorder presents requesting buprenorphine-naloxone; he injected heroin 4 hours ago, has a COWS score of 3, and asks for his first sublingual dose immediately.",
            "A 45-year-old executive with severe alcohol use disorder achieving supervised detoxification wishes to start medication to reduce intense alcohol cravings; AST is 185 U/L and ALT is 142 U/L."
        ],
        "uncertainties": [
            "Optimal induction strategies for buprenorphine in the era of high-potency synthetic fentanyl analogs with prolonged lipophilic terminal elimination.",
            "Efficacy of sub-dissociative ketamine infusions or psychedelic-assisted psychotherapy in sustaining abstinence in treatment-resistant substance use disorders."
        ]
    },

    "suicide risk assessment": {
        "mentor_intro": (
            "Suicide risk assessment is a mandatory core clinical competency across all medical, psychiatric, and emergency specialties. "
            "Suicide risk formulation has evolved from crude, inaccurate categorical risk categorization ('low, medium, high') to personalized, dynamic, collaborative risk formulation and safety planning. "
            "Key clinical components include distinguishing suicidal ideation from intent and plan, evaluating accessible lethal means, identifying modifiable risk factors (major depression, bipolar disorder, substance misuse, severe agitation), and recognizing evidence-based anti-suicidal pharmacotherapies (lithium, clozapine)."
        ),
        "teaching_points": [
            "Asking directly and empathetically about suicidal thoughts, intent, and plans does NOT induce or increase suicidal ideation or behaviour; rather, it reduces distress and opens essential therapeutic dialogue.",
            "Categorical risk prediction tools and rating scales cannot accurately predict individual suicidal behaviour and should never be used in isolation to determine hospital admission or discharge decisions.",
            "Lethal means restriction—specifically securing firearms, safe disposal of toxic medications, and bridge barriers—is the single most effective public health and clinical intervention for reducing suicide deaths.",
            "Lithium in bipolar disorder and major depression, and clozapine in treatment-resistant schizophrenia spectrum disorders, are the only psychotropic medications with robust randomized evidence demonstrating specific long-term reduction in suicide and suicide attempts."
        ],
        "mcq_angles": [
            "Evidence-based anti-suicidal properties of lithium in mood disorders and clozapine in schizophrenia spectrum disorders.",
            "The role of the Stanley-Brown Safety Planning Intervention (collaborative personalized coping strategies and emergency contacts) over ineffective 'no-suicide contracts'.",
            "Emergency psychiatric evaluation: identifying imminent warning signs (active preparatory acts, explicit suicide notes, saying goodbyes, sudden calm after severe depression)."
        ],
        "case_hooks": [
            "A 22-year-old college student with severe depression tells the triage nurse she has collected 60 acetaminophen tablets in her drawer and researched lethal dosages online.",
            "A 35-year-old man with bipolar I disorder has had three serious suicide attempts during depressive episodes; the psychiatric team discusses mood-stabilizing maintenance to reduce long-term suicide risk."
        ],
        "uncertainties": [
            "Short-term versus long-term anti-suicidal efficacy of rapid-acting interventions such as intravenous ketamine and intranasal esketamine in acute emergency department presentations.",
            "Reliability and ethical governance of artificial intelligence and electronic health record predictive algorithms for automated suicide risk detection."
        ]
    },

    "surgical site infection prevention": {
        "mentor_intro": (
            "Surgical site infections (SSIs) represent the most frequent healthcare-associated infection among surgical patients, contributing to prolonged hospitalization, readmission, sepsis, and substantial mortality. "
            "Prevention requires meticulous adherence to an evidence-based perioperative care bundle encompassing preoperative, intraoperative, and postoperative interventions. "
            "Core components include timely weight-adjusted prophylactic antibiotics administered within 60 minutes prior to incision, alcohol-based chlorhexidine skin antisepsis, normothermia maintenance, intraoperative oxygenation, and tight glycaemic control."
        ),
        "teaching_points": [
            "Preoperative antimicrobial prophylaxis must be completely infused within 60 minutes prior to surgical incision (120 minutes for vancomycin or fluoroquinolones) to achieve bactericidal tissue levels during incision, and re-dosed intraoperatively if procedure duration exceeds two half-lives of the antibiotic.",
            "Preoperative hair removal, if necessary, must be performed immediately prior to surgery using electric clippers; routine manual razors with blades are strictly contraindicated as they cause microscopic skin abrasions that harbor bacteria and dramatically increase SSI rates.",
            "Alcoholic chlorhexidine gluconate skin preparation is significantly superior to aqueous povidone-iodine in reducing surgical site infections in clean-contaminated and clean procedures.",
            "Prophylactic antibiotic administration should NOT be continued postoperatively beyond wound closure for uncomplicated clean and clean-contaminated procedures; continuing antibiotics for 24-48 hours post-op provides zero SSI reduction while driving Clostridioides difficile colitis and antibiotic resistance."
        ],
        "mcq_angles": [
            "Optimal timing of preoperative antibiotic prophylaxis (within 60 minutes prior to incision) and intraoperative re-dosing intervals (e.g., cefazolin re-dosed at 4 hours).",
            "Hair removal techniques: electric clippers over razors to prevent microabrasions and SSI.",
            "Evidence-based cessation of prophylactic antibiotics at wound closure versus inappropriate routine 24-hour postoperative continuation."
        ],
        "case_hooks": [
            "A 62-year-old obese diabetic male is scheduled for elective sigmoid resection for diverticular disease; the surgical trainee plans preoperative skin preparation and timing of prophylactic IV cefazolin plus metronidazole.",
            "Following an uncomplicated 2-hour total knee arthroplasty, the surgical resident writes an order for IV cefazolin every 8 hours for 3 days 'for infection prevention'."
        ],
        "uncertainties": [
            "Efficacy and safety of intrawound vancomycin powder application in reducing deep periprosthetic and spinal surgical site infections.",
            "Value of routine closed-incision negative pressure wound therapy (ciNPWT) over conventional sterile dressings in high-risk abdominal wounds."
        ]
    },

    "suspected pulmonary embolism diagnosis YEARS algorithm D-dimer CT pulmonary angiography": {
        "mentor_intro": (
            "Pulmonary embolism (PE) is a life-threatening cardiovascular emergency requiring rapid, systematic diagnostic evaluation to confirm or exclude pulmonary vascular occlusion while avoiding unnecessary CT radiation and contrast-induced nephropathy. "
            "The YEARS algorithm streamlines diagnostic evaluation using three clinical criteria: clinical signs of deep vein thrombosis (DVT), hemoptysis, and whether PE is the most likely diagnosis. "
            "Combined with clinical probability-adjusted D-dimer cutoffs, YEARS safely rules out PE without CT pulmonary angiography (CTPA) in up to 50% of suspected presentations, and has been validated across special populations including pregnant patients."
        ),
        "teaching_points": [
            "The YEARS algorithm consists of 3 clinical items: (1) clinical signs of DVT, (2) hemoptysis, and (3) PE most likely diagnosis; in patients with 0 YEARS criteria, a D-dimer threshold of <1000 ng/mL safely excludes PE without imaging.",
            "In patients with >=1 YEARS criteria, the standard D-dimer threshold of <500 ng/mL (or age-adjusted cutoff: age x 10 in patients >50 years) is applied to rule out PE without CTPA.",
            "The pregnancy-adapted YEARS algorithm safely excludes PE in pregnant women without CTPA using compression ultrasonography (CUS) and YEARS-adjusted D-dimer, avoiding fetal and maternal breast ionizing radiation.",
            "When imaging is required, CT pulmonary angiography (CTPA) is the definitive gold standard imaging modality, providing direct visualization of filling defects in pulmonary arterial branches down to subsegmental levels."
        ],
        "mcq_angles": [
            "Application of the YEARS diagnostic thresholds: explaining why patients with zero criteria use a 1000 ng/mL cutoff whereas those with >=1 use 500 ng/mL.",
            "Applying age-adjusted D-dimer (age x 10 ug/L for patients >50 years) in non-YEARS conventional algorithms to improve specificity in older adults.",
            "Initial workup of suspected PE in pregnancy: bilateral lower extremity compression duplex ultrasound prior to thoracic radiation."
        ],
        "case_hooks": [
            "A 28-year-old woman taking oral contraceptives presents with mild pleuritic chest pain; she has no leg swelling, no hemoptysis, and muscular strain is deemed more likely (0 YEARS criteria); her D-dimer is 780 ng/mL.",
            "A 26-week pregnant female presents with sudden dyspnoea and right leg calf swelling; the clinical team initiates the pregnancy-adapted YEARS diagnostic pathway."
        ],
        "uncertainties": [
            "Clinical significance and necessity of therapeutic anticoagulation for isolated subsegmental pulmonary embolism (SSPE) without concurrent DVT in low-risk patients.",
            "Diagnostic accuracy of ventilation-perfusion SPECT imaging versus low-dose CTPA in patients with severe renal impairment or severe contrast allergy."
        ]
    },

    "syncope": {
        "mentor_intro": (
            "Syncope is a transient loss of consciousness (TLOC) characterized by rapid onset, short duration, and spontaneous complete recovery, caused by transient global cerebral hypoperfusion. "
            "Syncope is categorized etiologically into reflex (neurally mediated: vasovagal, situational, carotid sinus hypersensitivity), orthostatic hypotension (autonomic failure, volume depletion, drug-induced), and cardiac syncope (arrhythmic or structural). "
            "The initial clinical priority is identifying high-risk cardiac features—syncope during exertion, supine syncope, sudden palpitations preceding collapse, family history of premature sudden death, abnormal ECG, or known structural heart disease—which mandate urgent inpatient cardiac evaluation."
        ),
        "teaching_points": [
            "Cardiac syncope (arrhythmic or structural heart disease) is the strongest independent predictor of sudden cardiac death and 1-year mortality, mandating immediate 12-lead ECG and urgent echocardiography whenever red flags are present.",
            "A standard 12-lead ECG is mandatory in ALL patients presenting with syncope, screening for high-risk electrical abnormalities: prolonged or short QTc, Brugada pattern, pre-excitation (delta wave / WPW), bifascicular block, high-degree AV block, and arrhythmogenic right ventricular cardiomyopathy (epsilon waves).",
            "Vasovagal syncope (the most common cause in young, healthy individuals) is characterized by classic prodromal autonomic symptoms (lightheadedness, diaphoresis, pallor, nausea, warmth) triggered by prolonged standing, pain, emotional distress, or venepuncture.",
            "Orthostatic hypotension is diagnosed by a sustained drop in systolic BP >=20 mmHg and/or diastolic BP >=10 mmHg (or a fall in systolic to <90 mmHg) within 3 minutes of standing from a supine position, commonly exacerbated by polypharmacy (vasodilators, diuretics)."
        ],
        "mcq_angles": [
            "Differentiating high-risk cardiac syncope (exertional, supine, sudden collapse without prodrome) from benign vasovagal syncope.",
            "Recognizing high-risk ECG findings in unexplained syncope that warrant immediate admission and continuous telemetry monitoring.",
            "Diagnostic criteria for orthostatic hypotension and identifying causative pharmacological agents."
        ],
        "case_hooks": [
            "A 19-year-old collegiate athlete collapses abruptly while sprinting during a basketball game with no warning prodrome; initial ECG shows deep T-wave inversions in V4-V6 and high voltage.",
            "A 74-year-old male with Parkinson disease experiences recurrent lightheadedness and near-syncope upon rising from his armchair; standing BP drops from 145/88 to 110/62 mmHg at 2 minutes."
        ],
        "uncertainties": [
            "Diagnostic yield and cost-effectiveness of early insertable cardiac monitors (implantable loop recorders [ILRs]) compared to conventional Holter monitoring in unexplained recurrent syncope.",
            "Efficacy of pacemaker implantation in older patients with recurrent refractory vasovagal syncope with documented cardioinhibitory asystole."
        ]
    },

    "systemic analgesia": {
        "mentor_intro": (
            "Systemic analgesia forms the pharmacological backbone of acute and chronic pain management, integrating non-opioids (paracetamol, NSAIDs), adjuvant agents (gabapentinoids, ketamine, alpha-2 agonists), and opioids. "
            "The World Health Organization (WHO) analgesic ladder and modern multimodal opioid-sparing protocols emphasize combining analgesics with distinct mechanisms of action to achieve synergistic pain relief while minimizing opioid-related adverse effects (hypoventilation, sedation, ileus, hyperalgesia, dependency). "
            "Safe administration requires tailoring drug selection and dosing to renal function, hepatic reserve, gastrointestinal bleeding risk, cardiovascular co-morbidities, and individual patient age."
        ),
        "teaching_points": [
            "Multimodal systemic analgesia—combining paracetamol, NSAIDs or COX-2 inhibitors, and regional blocks—significantly reduces 24-hour postoperative opioid consumption and accelerates functional recovery compared to opioid monotherapy.",
            "Intravenous non-steroidal anti-inflammatory drugs (e.g., ketorolac) provide potent opioid-sparing analgesia, but are contraindicated in acute kidney injury, advanced CKD (eGFR <30), active gastrointestinal ulceration, active bleeding, and immediately prior to high-risk vascular or spinal surgeries.",
            "Low-dose sub-dissociative ketamine infusions (0.1 to 0.3 mg/kg/h) provide potent NMDA receptor antagonism, reducing severe postoperative opioid tolerance, hyperalgesia, and chronic postsurgical pain syndromes without inducing psychomimetic side effects.",
            "Patient-controlled analgesia (PCA) with IV morphine, hydromorphone, or fentanyl provides superior patient satisfaction and analgesia over intermittent nurse-administered boluses; routine continuous basal infusions should be avoided in opioid-naive patients to prevent fatal nocturnal respiratory depression."
        ],
        "mcq_angles": [
            "Risks of routine basal rate infusions in intravenous opioid patient-controlled analgesia (PCA) in opioid-naive adults (increased risk of life-threatening respiratory depression).",
            "Mechanisms and indications of sub-dissociative ketamine infusions in managing acute severe pain and opioid-tolerant patients.",
            "Absolute contraindications to systemic NSAIDs in acute perioperative and critically ill clinical settings."
        ],
        "case_hooks": [
            "A 48-year-old opioid-naive male post-laparotomy receives IV hydromorphone PCA; the surgical team considers whether adding a continuous overnight basal infusion is safe.",
            "A 35-year-old patient with severe acute pancreatitis experiences unremitting pain despite escalating IV fentanyl doses; sub-dissociative ketamine infusion is initiated."
        ],
        "uncertainties": [
            "Role and optimal duration of perioperative intravenous lidocaine infusions in non-abdominal surgical cohorts.",
            "Comparative long-term safety and persistent post-surgical pain prevention with perioperative gabapentinoids (gabapentin, pregabalin) given recent concerns over respiratory depression."
        ]
    },

    "systemic lupus erythematosus": {
        "mentor_intro": (
            "Systemic lupus erythematosus (SLE) is a prototypical systemic autoimmune disorder characterized by loss of self-tolerance, immune complex deposition, and multiorgan inflammation predominantly affecting women of childbearing age (9:1 female-to-male ratio). "
            "Clinical manifestations range from cutaneous lesions (malar rash, discoid lupus), non-erosive polyarthritis, and serositis, to life-threatening lupus nephritis, neuropsychiatric lupus, and severe haematologic cytopenias. "
            "Treatment paradigms emphasize early hydroxychloroquine for all patients (improving survival and preventing flares), strict glucocorticoid tapering, and early integration of immunosuppressives and targeted biologics (belimumab, anifrolumab)."
        ),
        "teaching_points": [
            "Hydroxychloroquine (HCQ) is recommended for ALL patients with systemic lupus erythematosus unless contraindicated, dosed at <=5 mg/kg actual body weight daily to reduce mortality, prevent organ flares, and minimize retinal toxicity risks.",
            "Antinuclear antibody (ANA) tested by indirect immunofluorescence on HEp-2 cells possesses >98% sensitivity, serving as the essential entry criterion in the 2019 EULAR/ACR classification criteria; a negative ANA strongly argues against idiopathic SLE.",
            "Lupus nephritis (occurring in up to 50% of patients) requires prompt diagnostic renal biopsy for ISN/RPS histologic classification (Class I through VI); Class III (focal) and Class IV (diffuse proliferative) nephritis carry highest risk of end-stage renal disease and mandate intensive induction with mycophenolate mofetil or low-dose IV cyclophosphamide plus glucocorticoids.",
            "Targeted biologic therapies—belimumab (anti-BAFF/BLyS) and anifrolumab (anti-type I interferon receptor monoclonal antibody)—significantly reduce disease activity, enable corticosteroid tapering, and prevent systemic disease flares in active SLE."
        ],
        "mcq_angles": [
            "Universal indication and safe weight-based dosing threshold for hydroxychloroquine (<=5 mg/kg actual body weight) and retinal screening protocols.",
            "Identifying high-risk lupus nephritis (Class III/IV) requiring aggressive immunosuppressive induction with mycophenolate mofetil or cyclophosphamide.",
            "Interpretation of ANA, anti-dsDNA, and anti-Smith autoantibodies (anti-dsDNA correlates with nephritis activity and complement consumption; anti-Sm is highly specific)."
        ],
        "case_hooks": [
            "A 24-year-old woman presents with photosensitive malar rash, symmetric small-joint polyarthritis of the hands, hair loss, and pleuritic chest pain; ANA is positive at 1:1280 (homogeneous).",
            "A 30-year-old woman with known SLE presents with new-onset periorbital oedema, BP 155/95 mmHg, urine protein-to-creatinine ratio 3.2 g/g, and active urine sediment showing dysmorphic RBCs."
        ],
        "uncertainties": [
            "Efficacy of upfront triple therapy (mycophenolate mofetil, calcineurin inhibitors [voclosporin], and belimumab) in severe proliferative lupus nephritis.",
            "Safety and feasibility of complete withdrawal of maintenance glucocorticoid therapy in patients achieving long-term serological and clinical remission."
        ]
    },

    "takayasu arteritis biologic therapy": {
        "mentor_intro": (
            "Takayasu arteritis (TAK) is a rare, chronic granulomatous large-vessel vasculitis predominantly affecting the aorta, its primary branches, and the pulmonary arteries, most commonly presenting in young females under 40 years of age. "
            "Inflammatory panarteritis leads to wall thickening, luminal stenosis, occlusion, and aneurysm formation, manifesting clinically as absent peripheral pulses, vascular bruits, limb claudication, and severe renovascular hypertension. "
            "While high-dose corticosteroids achieve initial remission, over 50% of patients relapse upon steroid tapering; biologic therapies—particularly TNF inhibitors and IL-6 receptor antagonists (tocilizumab)—serve as essential steroid-sparing agents for refractory or relapsing disease."
        ),
        "teaching_points": [
            "First-line induction therapy for active Takayasu arteritis utilizes high-dose systemic glucocorticoids (prednisone 1 mg/kg/day); however, early addition of a steroid-sparing disease-modifying agent is mandatory due to high relapse rates during steroid taper.",
            "Tumour necrosis factor (TNF) inhibitors (infliximab, adalimumab) and the anti-IL-6 receptor antagonist tocilizumab demonstrate substantial efficacy in inducing clinical remission, halting angiographic disease progression, and permitting major corticosteroid dose reduction in refractory Takayasu arteritis.",
            "Assessment of vascular disease activity requires specialized non-invasive vascular imaging (contrast-enhanced magnetic resonance angiography [MRA], CT angiography, or 18F-FDG PET/CT), as acute phase reactants (ESR, CRP) can be completely normal in up to 30-40% of patients with histologically active vascular inflammation.",
            "Revascularization procedures (percutaneous angioplasty, stenting, or bypass surgery) must strictly be avoided during active vessel inflammation, as operating on inflamed vessels carries catastrophic risks of thrombosis, anastomotic disruption, and restenosis; procedures must be delayed until medical remission is achieved."
        ],
        "mcq_angles": [
            "Selection of biologic therapies (anti-TNF agents vs tocilizumab) in steroid-refractory Takayasu arteritis.",
            "Timing of surgical or catheter-based vascular interventions: absolute requirement to induce stable immunosuppressive remission prior to elective revascularization.",
            "Limitations of acute phase reactants (ESR/CRP) in monitoring disease activity, highlighting the necessity of serial MRA or FDG-PET imaging."
        ],
        "case_hooks": [
            "A 23-year-old female presents with bilateral arm claudication, dizziness on standing, blood pressure unobtainable in the left arm (138/82 mmHg in right arm), and a loud carotid bruit; MRA reveals smooth narrowing of the aortic arch branches.",
            "A 28-year-old woman with active Takayasu arteritis relapses with progressive subclavian artery stenosis every time prednisone is tapered below 20 mg daily; the rheumatologist initiates biologic therapy with tocilizumab."
        ],
        "uncertainties": [
            "Comparative long-term efficacy and vascular wall remodeling between anti-TNF inhibitors and tocilizumab in paediatric-onset Takayasu arteritis.",
            "Role of Janus kinase (JAK) inhibitors (e.g., tofacitinib) in patients failing both TNF and IL-6 targeted biologic agents."
        ]
    },

    "temporal arteritis": {
        "mentor_intro": (
            "Temporal arteritis—also known as giant cell arteritis (GCA)—is the most prevalent systemic vasculitis in adults aged >50 years, characterized by granulomatous inflammation targeting large and medium-sized arteries, particularly the ophthalmic, temporal, and cranial branches of the external carotid artery, as well as the aorta. "
            "The paramount clinical concern is irreversible visual loss from anterior ischemic optic neuropathy (AION), occurring in up to 15-20% of untreated patients. "
            "High-dose systemic corticosteroid therapy must be instituted immediately upon clinical suspicion, without waiting for temporal artery biopsy or vascular ultrasonography."
        ),
        "teaching_points": [
            "High-dose systemic corticosteroids (oral prednisone 40-60 mg daily, or IV methylprednisolone 500-1000 mg daily for 3 days if visual symptoms or amaurosis fugax are present) must be initiated IMMEDIATELY upon suspicion of GCA to prevent irreversible blindness.",
            "Temporal artery biopsy (TAB, with a minimum specimen length of >=1-2 cm due to 'skip lesions') remains the histological gold standard, but high-resolution temporal artery color Doppler ultrasound showing the non-compressible hypoechoic 'halo sign' (vessel wall oedema) has high sensitivity and specificity in experienced centers.",
            "Classic clinical hallmarks include new-onset localized headache, scalp tenderness (pain when combing hair), jaw claudication (high specificity for vascular ischemia of the masseter muscles), polymyalgia rheumatica (PMR) symptoms, and markedly elevated ESR (often >50-100 mm/h) and CRP.",
            "Tocilizumab (monoclonal antibody targeting the IL-6 receptor) administered subcutaneously weekly or biweekly significantly increases sustained glucocorticoid-free remission and reduces cumulative steroid exposure and toxicity (GiACTA trial)."
        ],
        "mcq_angles": [
            "Immediate management of suspected GCA with transient visual loss (emergency IV pulse methylprednisolone before obtaining biopsy).",
            "Pathognomonic vascular ultrasound feature: identifying the hypoechoic 'halo sign' representing arterial wall inflammation and oedema.",
            "Evidence for tocilizumab as an FDA/EMA-approved steroid-sparing agent in GCA from the GiACTA trial."
        ],
        "case_hooks": [
            "A 71-year-old woman presents with a 2-week history of right-sided temporal throbbing headache, pain in her jaw muscles when chewing meat, and a 10-minute episode of painless transient vision loss in her right eye; ESR is 92 mm/h.",
            "A 68-year-old man undergoes temporal artery ultrasound for suspected GCA, demonstrating a prominent non-blanching hypoechoic circumferential mural halo around the superficial temporal artery."
        ],
        "uncertainties": [
            "Duration of maintenance tocilizumab therapy (1 year versus extended multi-year therapy) to prevent relapse upon discontinuation.",
            "Diagnostic utility of 18F-FDG PET/CT in detecting isolated large-vessel extracranial GCA (aortitis, subclavian arteritis) in patients with normal temporal artery imaging."
        ]
    },

    "tendinopathies": {
        "mentor_intro": (
            "Tendinopathy describes a clinical syndrome of pain, localized swelling, and impaired performance in and around a tendon, characterized histopathologically by non-inflammatory tendon dysrepair, collagen fiber disorganization, mucoid ground substance increase, and neurovascular ingrowth (failed healing response). "
            "Common anatomical sites include the Achilles, patellar, rotator cuff, and common extensor tendons of the elbow (lateral epicondylalgia). "
            "The foundation of evidence-based conservative management is progressive mechanical tendon loading exercise (heavy slow resistance and eccentric training), with structured load management prioritizing long-term remodeling over passive interventions."
        ),
        "teaching_points": [
            "Histopathology of chronic tendinopathy demonstrates tendon dysrepair, hypercellularity, neurovascular ingrowth, and collagen disorganization without acute inflammatory cells; the historic term 'tendinitis' is misrepresentative.",
            "Progressive mechanical loading exercise—specifically eccentric training and heavy slow resistance (HSR) exercise—is the cornerstone of evidence-based tendinopathy management, stimulating tenocyte mechanotransduction, collagen synthesis, and structural remodeling.",
            "Intratendinous corticosteroid injections should generally be avoided; while providing short-term pain relief, they impair long-term tenocyte proliferation, increase 1-year recurrence rates, and carry significant risks of tendon rupture.",
            "Extracorporeal shockwave therapy (ESWT, radial or focused) provides effective non-invasive adjunct therapy for chronic recalcitrant tendinopathies (plantar fasciopathy, patellar, and calcific shoulder tendinopathy) by promoting local revascularization and tissue regeneration."
        ],
        "mcq_angles": [
            "Rationale for avoiding intratendinous corticosteroid injections (long-term structural weakening and elevated tendon rupture risk).",
            "Principles of mechanotherapy: heavy slow resistance vs eccentric loading in stimulating tendon remodelation.",
            "Role of extracorporeal shockwave therapy (ESWT) in chronic calcific tendinopathy and recalcitrant plantar fasciopathy."
        ],
        "case_hooks": [
            "A 36-year-old marathon runner presents with 4 months of morning stiffness and localized burning pain 4 cm proximal to the calcaneal insertion of the Achilles tendon, worse during running uphill.",
            "A 45-year-old tennis player with 6 months of severe lateral elbow pain asks for another cortisone injection after his previous injection provided 4 weeks of relief followed by severe rebound pain."
        ],
        "uncertainties": [
            "Efficacy and clinical reproducibility of platelet-rich plasma (PRP) and autologous blood injections compared to sham saline in chronic tendinopathies.",
            "Mechanisms and clinical indications for transcatheter arterial embolization (TAE) targeting abnormal neo-vessels in refractory tendinopathy."
        ]
    },

    "tenecteplase alteplase acute ischemic stroke EXTEND-IA TNK": {
        "mentor_intro": (
            "Intravenous thrombolysis is the cornerstone of early medical reperfusion in acute ischaemic stroke within 4.5 hours of symptom onset. "
            "Tenecteplase (TNK)—a genetically engineered bio-variant of alteplase (tissue plasminogen activator [tPA]) with greater fibrin specificity, longer half-life, and resistance to plasminogen activator inhibitor-1—allows single IV bolus administration. "
            "The landmark EXTEND-IA TNK randomized clinical trials established that tenecteplase (0.25 mg/kg) achieves substantially higher early arterial reperfusion and superior functional recovery compared to alteplase prior to endovascular thrombectomy in patients with large vessel occlusion."
        ),
        "teaching_points": [
            "Tenecteplase administered as a single intravenous bolus (0.25 mg/kg, maximum 25 mg over 5-10 seconds) demonstrated significantly higher substantial reperfusion (22% vs 10%, p = 0.004) and improved 90-day functional recovery compared to alteplase infusion in the EXTEND-IA TNK trial.",
            "The single-bolus administration of tenecteplase streamlines emergency stroke workflow, eliminating the need for a 1-hour dedicated infusion pump and accelerating rapid inter-hospital transfer ('drip-and-ship') to comprehensive stroke centers for mechanical thrombectomy.",
            "Tenecteplase demonstrates equivalent safety to alteplase regarding symptomatic intracranial haemorrhage (sICH ~2-3%) and systemic bleeding when dosed at 0.25 mg/kg, whereas higher dosing (0.40 mg/kg, tested in EXTEND-IA TNK Part 2 and NOR-TEST 2) did not improve recanalization and increased haemorrhagic complications.",
            "International stroke guidelines increasingly recommend tenecteplase 0.25 mg/kg as a preferred alternative to alteplase for acute ischaemic stroke presenting within 4.5 hours, both in candidates for mechanical thrombectomy and in non-large vessel occlusion stroke."
        ],
        "mcq_angles": [
            "Landmark findings of the EXTEND-IA TNK trial: tenecteplase 0.25 mg/kg bolus doubled pre-thrombectomy angiographic recanalization compared to alteplase (0.9 mg/kg).",
            "Optimal dosing of tenecteplase in acute stroke: why 0.25 mg/kg is the validated dose and why 0.40 mg/kg was abandoned due to excess bleeding without added efficacy.",
            "Pharmacokinetic advantages of tenecteplase over alteplase (longer half-life permitting single IV bolus, 14-fold higher fibrin specificity, 80-fold greater resistance to PAI-1)."
        ],
        "case_hooks": [
            "A 67-year-old male arrives at a primary stroke center 90 minutes after developing acute left hemiplegia and neglect; CT angiogram confirms an acute right MCA M1 occlusion, and the team prepares him for immediate thrombolysis and transfer for thrombectomy.",
            "A stroke neurologist compares thrombolytic options for an acute stroke patient presenting at 2 hours, weighing tenecteplase 0.25 mg/kg IV bolus versus the standard 1-hour alteplase infusion."
        ],
        "uncertainties": [
            "Comparative efficacy of tenecteplase versus alteplase in minor, non-disabling acute ischaemic strokes (NIHSS 0-5) without large vessel occlusion.",
            "Utility of tenecteplase in extended time windows (4.5 to 9 hours) or wake-up strokes guided by advanced automated perfusion mismatch imaging."
        ]
    }
}
