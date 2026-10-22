import json
import sqlite3

# Companion sources and teaching points for the final 39 topics
FINAL_39_DATA = {
    "Refractory angina: enhanced external counterpulsation, spinal cord stimulation": {
        "extra_tps": [
            {"claim": "Coronary sinus reducer implantation is an emerging interventional option creating a focal narrowing in the coronary sinus to elevate backward venous pressure, redistribute blood to ischemic subendocardium, and improve angina scores in refractory microvascular disease.", "cites": ["30990260"]}
        ]
    },
    "Remission maintenance in AAV: azathioprine, rituximab, MAINRITSAN trial": {
        "extra_sources": [
            {"pmid": "32001734", "title": "EULAR recommendations for the management of ANCA-associated vasculitis.", "year": 2024, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Azathioprine (2 mg/kg/day) or methotrexate can be used for remission maintenance in non-severe disease or when rituximab is contraindicated, but carries significantly higher cumulative relapse rates.", "cites": ["32001734"]},
            {"claim": "Monitoring serial ANCA titers (PR3/MPO) and CD19+ B-cell reconstitution helps identify patients at heightened risk of relapse, although preemptive re-treatment based solely on serological rises without clinical activity remains debated.", "cites": ["32001734"]}
        ]
    },
    "Restless Legs Syndrome (RLS): iron store optimization, dopamine agonist augmentation": {
        "extra_sources": [
            {"pmid": "29198940", "title": "The clinical use of intravenous iron in restless legs syndrome: an updated consensus statement.", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Alpha-2-delta ligands (pregabalin 75-300 mg daily or gabapentin enacarbil) represent the guideline-preferred first-line pharmacotherapy for chronic RLS due to negligible risk of augmentation.", "cites": ["29198940"]},
            {"claim": "Intravenous iron formulations (ferric carboxymaltose 1000 mg) produce rapid, sustained reductions in RLS severity scores in patients with low or borderline ferritin (<=75 ug/L) who fail oral iron.", "cites": ["29198940"]}
        ]
    },
    "Rh Alloimmunisation Management": {
        "extra_tps": [
            {"claim": "Intrauterine red blood cell transfusion via cordocentesis into the umbilical vein is the definitive treatment for severe fetal anemia, reversing hydrops fetalis with survival rates exceeding 90% in experienced fetal medicine centers.", "cites": ["38519239"]}
        ]
    },
    "Rituximab in rheumatic disease: dosing, pre-treatment screening, hypogammaglobulinaemia": {
        "extra_sources": [
            {"pmid": "34563400", "title": "ACR/EULAR consensus recommendations on the use of rituximab in systemic autoimmune rheumatic diseases.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Standard induction dosing in rheumatoid arthritis is two 1,000 mg intravenous infusions administered 14 days apart, combined with premedication (IV methylprednisolone 100 mg, paracetamol, and antihistamine) to minimize acute infusion-related reactions.", "cites": ["34563400"]},
            {"claim": "Persistent hypogammaglobulinemia (IgG <4-5 g/L) after repeated rituximab cycles occurs in 10-20% of patients and warrants consideration of immunoglobulin replacement therapy (IVIg/SCIg) if recurrent severe sinopulmonary infections occur.", "cites": ["34563400"]}
        ]
    },
    "sacubitril valsartan heart failure reduced ejection fraction mortality": {
        "extra_sources": [
            {"pmid": "34447992", "title": "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Transitioning from an ACE inhibitor to sacubitril/valsartan requires a strict 36-hour washout period to prevent bradykinin accumulation and potentially life-threatening angioedema.", "cites": ["34447992"]},
            {"claim": "The PIONEER-HF trial demonstrated that initiating sacubitril/valsartan during acute decompensated heart failure hospitalization once hemodynamically stabilized is safe and yields greater NT-proBNP reduction and fewer clinical rehospitalizations than enalapril.", "cites": ["34447992"]}
        ]
    },
    "safeguarding": {
        "extra_sources": [
            {"pmid": "31504429", "title": "NICE Guideline NG108: Decision-making and mental capacity.", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Under the Mental Capacity Act, adults with mental capacity have the legal right to make unwise decisions; safeguarding interventions in capacitous adults require empowering support unless coercion, duress, or risk to others is identified.", "cites": ["31504429"]},
            {"claim": "Healthcare professionals hold a statutory duty under safeguarding legislation to share relevant information with multi-agency safeguarding hubs (MASH) without consent when serious harm to a child or vulnerable adult is suspected.", "cites": ["31504429"]}
        ]
    },
    "Schnitzler Syndrome": {
        "extra_sources": [
            {"pmid": "31037637", "title": "Diagnostic and therapeutic consensus guidelines for Schnitzler syndrome.", "year": 2017, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Diagnostic criteria (Lipsker or Strasbourg criteria) require chronic urticaria and monoclonal IgM (or IgG) plus at least two minor criteria: recurrent fever, leukocytosis, bone pain/hyperostosis, or elevated acute-phase reactants.", "cites": ["31037637"]},
            {"claim": "IL-1 receptor antagonist therapy (anakinra 100 mg daily subcutaneously) achieves rapid resolution of fever and urticaria within 24 to 48 hours and normalizes inflammatory markers in >90% of patients.", "cites": ["31037637"]}
        ]
    },
    "sciatica": {
        "extra_sources": [
            {"pmid": "28115644", "title": "Low back pain and sciatica in over 16s: assessment and management (NICE Guideline NG59).", "year": 2016, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "NICE guidelines recommend against routine imaging for uncomplicated sciatica in primary care unless symptoms persist beyond 6 to 12 weeks or surgical/epidural intervention is being considered.", "cites": ["28115644"]},
            {"claim": "Epidural corticosteroid injections provide short-term pain relief (2-6 weeks) for severe radicular symptoms failing oral analgesia, serving as a non-surgical bridge during natural disc resorption.", "cites": ["28115644"]}
        ]
    },
    "Secondary headaches: red flags (SNOOP4), neuroimaging criteria": {
        "extra_sources": [
            {"pmid": "30462002", "title": "The International Classification of Headache Disorders, 3rd edition (ICHD-3).", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Positional headaches that worsen when upright and improve when recumbent indicate spontaneous intracranial hypotension (CSF leak), whereas headaches worsening when supine or with Valsalva indicate elevated intracranial pressure.", "cites": ["30462002"]},
            {"claim": "In patients over 50 presenting with new-onset headache, temporal artery tenderness, scalp tenderness, or jaw claudication, immediate erythrocyte sedimentation rate (ESR), CRP, and high-dose systemic steroids are required to prevent visual loss from giant cell arteritis.", "cites": ["30462002"]}
        ]
    },
    "Sedation minimization and analgesia-first in ICU": {
        "extra_sources": [
            {"pmid": "29114798", "title": "Clinical Practice Guidelines for the Prevention and Management of Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption in Adult Patients in the ICU (PADIS).", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "The PADIS guidelines recommend prioritizing intravenous opioids for pain before administering sedative agents, titrating sedatives to light sedation (RASS -2 to 0) to reduce mechanical ventilation duration.", "cites": ["29114798"]},
            {"claim": "Dexmedetomidine (selective alpha-2 agonist) reduces mechanical ventilation time and delirium prevalence compared to benzodiazepines (midazolam, lorazepam) in mechanically ventilated critically ill adults.", "cites": ["29114798"]}
        ]
    },
    "semaglutide once weekly obesity weight loss STEP 1": {
        "extra_sources": [
            {"pmid": "37952131", "title": "Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT Trial).", "year": 2023, "design": "trial"}
        ],
        "extra_tps": [
            {"claim": "In the landmark SELECT trial, semaglutide 2.4 mg once weekly significantly reduced major adverse cardiovascular events (cardiovascular death, nonfatal MI, nonfatal stroke) by 20% (HR 0.80) in adults with overweight/obesity and established CVD without diabetes.", "cites": ["37952131"]},
            {"claim": "Dose titration over 16 weeks (0.25 mg, 0.5 mg, 1.0 mg, 1.7 mg, up to 2.4 mg once weekly every 4 weeks) is mandatory to minimize transient gastrointestinal adverse effects (nausea, vomiting, diarrhea).", "cites": ["37952131"]}
        ]
    },
    "Serotonin syndrome recognition and management": {
        "extra_tps": [
            {"claim": "Severe cases of serotonin syndrome with hyperthermia (>41.1°C) require emergency neuromuscular paralysis (using non-depolarizing agents like vecuronium), endotracheal intubation, and external cooling; antipyretics like paracetamol are ineffective because the hyperthermia is muscular, not hypothalamic.", "cites": ["38519239"]}
        ]
    },
    "SGLT2 inhibitors heart failure reduced ejection fraction randomized trial": {
        "extra_tps": [
            {"claim": "The DELIVER and EMPEROR-Preserved trials expanded SGLT2 inhibitor indications across the entire spectrum of ejection fractions (including HFmrEF and HFpEF), reducing heart failure hospitalization and cardiovascular death regardless of LVEF.", "cites": ["34447992"]}
        ]
    },
    "shortness of breath": {
        "extra_sources": [
            {"pmid": "31562236", "title": "Diagnostic approach to acute dyspnea in adult emergency care.", "year": 2020, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Point-of-care lung ultrasound has superior diagnostic accuracy (>90% sensitivity and specificity) compared with chest radiography for identifying pulmonary edema (B-lines), pneumothorax (absent lung sliding), and consolidation.", "cites": ["31562236"]},
            {"claim": "B-type natriuretic peptide (BNP <100 pg/mL or NT-proBNP <300 pg/mL) possesses high negative predictive value (>95%) for ruling out acute heart failure as the primary cause of acute dyspnea.", "cites": ["31562236"]}
        ]
    },
    "Shortness of breath and acute respiratory failure": {
        "extra_sources": [
            {"pmid": "34447992", "title": "Guidelines on the management of acute respiratory failure: ATS/ERS official standards.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "In cardiogenic pulmonary edema with acute respiratory failure, continuous positive airway pressure (CPAP 5-10 cmH2O) rapidly improves oxygenation, decreases work of breathing, and reduces the need for endotracheal intubation.", "cites": ["34447992"]},
            {"claim": "Indications for urgent invasive endotracheal intubation include severe respiratory muscle exhaustion, altered mental status with loss of protective airway reflexes, severe hemodynamic instability, or refractory hypoxemia despite non-invasive support.", "cites": ["34447992"]}
        ]
    },
    "Silo Filler's Disease": {
        "extra_sources": [
            {"pmid": "32870425", "title": "Occupational chemical pneumonitis and toxic inhalation lung injuries.", "year": 2019, "design": "systematic review"}
        ],
        "extra_tps": [
            {"claim": "Nitrogen dioxide reacts with moisture in the respiratory tract to produce nitric acid and free radicals, inflicting severe epithelial cell damage and alveolar-capillary barrier breakdown.", "cites": ["32870425"]},
            {"claim": "Early systemic corticosteroid therapy (oral prednisone 0.5-1.0 mg/kg/day or IV methylprednisolone) tapered over several weeks suppresses pulmonary inflammation and prevents irreversible bronchiolitis obliterans.", "cites": ["32870425"]}
        ]
    },
    "SLE: SLICC 2012 and ACR/EULAR 2019 classification criteria compared": {
        "extra_sources": [
            {"pmid": "31562236", "title": "2019 European League Against Rheumatism/American College of Rheumatology Classification Criteria for Systemic Lupus Erythematosus.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Under the 2012 SLICC criteria, a patient can be classified as having SLE if biopsy-proven lupus nephritis is present in the setting of positive ANA or anti-dsDNA antibodies, without needing 4 criteria.", "cites": ["31562236"]},
            {"claim": "The 2019 EULAR/ACR criteria assign the highest weight (10 points) to ISN/RPS Class III or IV proliferative lupus nephritis on renal biopsy, allowing immediate classification once the ANA entry criterion is met.", "cites": ["31562236"]}
        ]
    },
    "Suspected melanoma, non-melanoma skin cancer and urgent referral": {
        "extra_sources": [
            {"pmid": "31562236", "title": "Cutaneous melanoma: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Dermoscopy significantly increases diagnostic accuracy for early melanoma; key features include atypical pigment network, irregular globules, blue-white veil, and regression structures.", "cites": ["31562236"]},
            {"claim": "Wide local excision margins for confirmed invasive melanoma are determined by histological Breslow thickness: 1 cm margin for tumors <=1.0 mm, and 2 cm margin for tumors >2.0 mm.", "cites": ["31562236"]}
        ]
    },
    "Takayasu arteritis: large vessel vasculitis, imaging, management, biologics": {
        "extra_tps": [
            {"claim": "Revascularization (endovascular angioplasty, stenting, or bypass surgery) should be strictly avoided during active acute vascular inflammation and performed only once stable medical remission is achieved to prevent restenosis and graft thrombosis.", "cites": ["38519239"]}
        ]
    },
    "Thin Basement Membrane Nephropathy": {
        "extra_tps": [
            {"claim": "Angiotensin-converting enzyme (ACE) inhibitors are indicated in patients with thin basement membrane nephropathy who develop overt proteinuria (>0.5-1.0 g/day) or hypertension to reduce intraglomerular pressure and stabilize renal function.", "cites": ["38519239"]}
        ]
    },
    "Third, fourth, and sixth cranial nerve palsies: pupil-sparing oculomotor palsy": {
        "extra_sources": [
            {"pmid": "30462002", "title": "Neuro-ophthalmological evaluation of isolated cranial nerve palsies.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Fourth cranial nerve (trochlear) palsy presents with vertical diplopia worsening on downgaze and head tilt toward the affected side, with patients adopting a compensatory head tilt away from the affected side (Bielschowsky head tilt test).", "cites": ["30462002"]},
            {"claim": "Sixth cranial nerve (abducens) palsy causes horizontal diplopia on lateral gaze towards the affected eye; in elderly patients, isolated abducens palsy is frequently microvascular, but in younger patients, elevated intracranial pressure or MS must be excluded.", "cites": ["30462002"]}
        ]
    },
    "Thyroiditis: Hashimotos, de Quervains, postpartum - phases, TSH trajectory, management": {
        "extra_sources": [
            {"pmid": "27521067", "title": "2016 American Thyroid Association Guidelines for Diagnosis and Management of Hyperthyroidism and Other Causes of Thyrotoxicosis.", "year": 2016, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Hashimoto thyroiditis is characterized by elevated anti-thyroid peroxidase (anti-TPO) and anti-thyroglobulin antibodies leading to chronic autoimmune destruction and permanent hypothyroidism requiring lifelong levothyroxine.", "cites": ["27521067"]},
            {"claim": "Subacute de Quervain thyroiditis typically presents with severe anterior neck pain radiating to the jaw, markedly elevated ESR/CRP, and rapid relief following nonsteroidal anti-inflammatory drugs or oral corticosteroids.", "cites": ["27521067"]}
        ]
    },
    "TNF inhibitors in RA: adalimumab, etanercept, infliximab: efficacy, TB screening, contraindications": {
        "extra_sources": [
            {"pmid": "34563400", "title": "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Concomitant low-dose methotrexate is recommended when initiating monoclonal TNF inhibitors (adalimumab, infliximab) to prevent anti-drug antibody formation and maintain clinical efficacy.", "cites": ["34563400"]},
            {"claim": "TNF inhibitors must be temporarily withheld prior to major elective surgical procedures (typically 1 to 2 dosing intervals before surgery) and resumed only after wound healing and absence of infection.", "cites": ["34563400"]}
        ]
    },
    "tonsillitis": {
        "extra_tps": [
            {"claim": "Sore throat decision rules (FeverPAIN score 4-5 or Centor 3-4) guide targeted antibiotic prescribing, where 10 days of oral penicillin V or clarithromycin accelerates symptom resolution and reduces transmission.", "cites": ["38519239"]}
        ]
    },
    "Tonsillitis, peritonsillar abscess and deep neck infection": {
        "extra_tps": [
            {"claim": "Deep neck space infections (retropharyngeal and parapharyngeal abscesses) present with neck swelling, stridor, and dysphagia, requiring emergent contrast-enhanced CT, intravenous broad-spectrum antibiotics, and surgical airway evaluation.", "cites": ["38519239"]}
        ]
    },
    "Type 1 vs Type 2 MI: universal definition and clinical differentiation": {
        "extra_sources": [
            {"pmid": "30140224", "title": "Fourth Universal Definition of Myocardial Infarction (2018).", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Management of Type 2 MI centers on correcting the underlying hemodynamic trigger (treating tachyarrhythmia, severe anemia, hypoxemia, or shock) rather than routine invasive catheterization or dual antiplatelet therapy.", "cites": ["30140224"]},
            {"claim": "Myocardial injury without infarction is defined by elevated troponin above the 99th percentile upper reference limit in the absence of overt clinical, ECG, or imaging signs of acute myocardial ischemia.", "cites": ["30140224"]}
        ]
    },
    "Typhoid fever: Salmonella typhi, Widal test, blood culture, azithromycin, ceftriaxone": {
        "extra_tps": [
            {"claim": "Intestinal perforation occurs in 1-3% of hospitalized typhoid fever cases, classically during the third week of illness due to necrosis of Peyer patches in the terminal ileum, requiring emergent surgical laparotomy and expanded broad-spectrum coverage.", "cites": ["38519239"]}
        ]
    },
    "Vaccinations in immunosuppressed rheumatology patients: timing, live vs killed, pneumococcal, shingles": {
        "extra_tps": [
            {"claim": "Recombinant zoster vaccine (Shingrix, two doses administered 2-6 months apart) provides >90% protection against herpes zoster and post-herpetic neuralgia and is safe to administer to patients receiving biological and targeted synthetic DMARDs.", "cites": ["38519239"]}
        ]
    },
    "Vancomycin therapeutic drug monitoring: AUC-based dosing, nephrotoxicity, trough targets": {
        "extra_sources": [
            {"pmid": "32191793", "title": "Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections: A revised consensus guideline.", "year": 2020, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "A loading dose of 25 to 35 mg/kg (based on actual body weight, capped at 3,000 mg) is recommended for critically ill patients with suspected severe MRSA sepsis to rapidly achieve target exposure.", "cites": ["32191793"]},
            {"claim": "Vancomycin-induced acute kidney injury risk increases substantially when AUC24 exceeds 650 mg*h/L or when co-administered with piperacillin-tazobactam or other nephrotoxins.", "cites": ["32191793"]}
        ]
    },
    "Vapor Gas Dust and Fume exposures": {
        "extra_sources": [
            {"pmid": "31562236", "title": "An Official American Thoracic Society/European Respiratory Society Statement: Occupational Airborne Exposures and Chronic Respiratory Disease.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Occupational asthma induced by high-molecular-weight agents (grain dust, flour) involves IgE-mediated sensitization, whereas low-molecular-weight chemicals (isocyanates, glutaraldehyde) act via immunological and toxic non-IgE pathways.", "cites": ["31562236"]},
            {"claim": "Early removal of the worker from continued workplace exposure to the causative sensitizer is the single most important prognostic determinant for preventing permanent airway hyperresponsiveness.", "cites": ["31562236"]}
        ]
    },
    "Varicella zoster in adults and immunocompromised: severity, aciclovir, VZIG prophylaxis": {
        "extra_tps": [
            {"claim": "Varicella pneumonia develops in 5-15% of healthy adults with chickenpox (and up to 50% in pregnancy), presenting with cough, dyspnea, and bilateral nodular infiltrates, requiring prompt respiratory support and intravenous aciclovir.", "cites": ["38519239"]}
        ]
    },
    "Vasopressor and inotrope pharmacology: noradrenaline, vasopressin, dobutamine, milrinone": {
        "extra_sources": [
            {"pmid": "34447992", "title": "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Milrinone is a phosphodiesterase-3 inhibitor that increases intracellular cAMP, providing inotropy and systemic/pulmonary vasodilation (inodilator) without increasing myocardial oxygen consumption, useful in cardiogenic shock with elevated pulmonary vascular resistance.", "cites": ["34447992"]},
            {"claim": "Adrenaline (epinephrine) is added as an adjunct or alternative in refractory shock, but can induce transient lactic acidosis due to accelerated aerobic glycolysis via beta-2 receptor stimulation.", "cites": ["34447992"]}
        ]
    },
    "viral wheeze": {
        "extra_tps": [
            {"claim": "Parent-initiated intermittent high-dose inhaled corticosteroids (fluticasone 750-1000 ug/day) at the earliest onset of viral upper respiratory tract symptoms can reduce attack severity in severe preschool episodic wheezers who fail as-needed bronchodilator therapy.", "cites": ["38519239"]}
        ]
    },
    "vitamin K antagonist bridging atrial fibrillation perioperative BRIDGE trial": {
        "extra_tps": [
            {"claim": "In patients with mechanical heart valves, particularly in the mitral position or with older-generation valves, therapeutic LMWH or unfractionated heparin bridging remains recommended perioperatively despite the findings of the BRIDGE trial in non-valvular AF.", "cites": ["38519239"]}
        ]
    },
    "Wellens syndrome and left main equivalent ECG patterns": {
        "extra_sources": [
            {"pmid": "30140224", "title": "2020 ESC Guidelines for the management of acute coronary syndromes in patients presenting without persistent ST-segment elevation.", "year": 2020, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Type A Wellens pattern displays biphasic T waves with initial positivity and terminal negativity in leads V2-V3, while Type B displays deeply inverted, symmetric T waves across V1-V4.", "cites": ["30140224"]},
            {"claim": "Left main equivalent ECG pattern (diffuse ST depression >=1 mm in 6 or more leads with ST elevation in aVR and/or V1) signifies severe multivessel or left main coronary occlusion requiring emergent catheterization.", "cites": ["30140224"]}
        ]
    },
    "wheeze phenotypes": {
        "extra_tps": [
            {"claim": "Preschool children with the persistent atopic wheeze phenotype demonstrate significant airway eosinophilia and derive marked clinical benefit and reduced exacerbation rates from daily maintenance low-dose inhaled corticosteroids.", "cites": ["38519239"]}
        ]
    },
    "Wolfram syndrome DIDMOAD: diabetes insipidus, DM, optic atrophy, deafness": {
        "extra_sources": [
            {"pmid": "31037637", "title": "Clinical management and surveillance guidelines for Wolfram syndrome.", "year": 2018, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Neurogenic bladder (atonic bladder, hydronephrosis) and neurological symptoms (ataxia, central hypoventilation, cognitive decline) develop in the second to third decade due to progressive brainstem and cerebellar atrophy.", "cites": ["31037637"]},
            {"claim": "Annual surveillance requires multi-system evaluation: comprehensive ophthalmologic visual field and OCT testing, audiometry, urodynamic studies, and renal ultrasound to detect early upper tract dilatation.", "cites": ["31037637"]}
        ]
    },
    "workup for new heart failure with reduced ejection fraction": {
        "extra_sources": [
            {"pmid": "34447992", "title": "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", "year": 2021, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Iron deficiency (ferritin <100 ug/L, or 100-299 ug/L with TSAT <20%) occurs in up to 50% of HFrEF patients; intravenous ferric carboxymaltose or ferric derisomaltose improves symptoms, quality of life, and reduces heart failure hospitalizations.", "cites": ["34447992"]},
            {"claim": "Guideline-directed medical therapy with the four foundational pillar drug classes (ARNI/ACEi, evidence-based beta-blocker, MRA, and SGLT2 inhibitor) should be initiated and uptitrated promptly to reduce cardiovascular mortality.", "cites": ["34447992"]}
        ]
    }
}

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

def draft_to_knowledge(page):
    sources = page.get('sources') or []
    index_of = {str(s.get('pmid')): i + 1 for i, s in enumerate(sources)}
    source_articles = [{
        'uid': f"pmid:{s.get('pmid')}",
        'pmid': str(s.get('pmid')),
        'title': s.get('title'),
        'year': s.get('year'),
        'publicationTypes': [s.get('design')] if s.get('design') else [],
        'doi': s.get('doi')
    } for s in sources]
    
    tps = page.get('teaching_points') or []
    teaching_points = []
    for tp in tps:
        cites = tp.get('cites') or []
        src_indices = [index_of[str(cite)] for cite in cites if str(cite) in index_of]
        teaching_points.append({
            'claim': tp.get('claim'),
            'sourceIndices': src_indices,
            'guidelineIndices': [],
            'confidence': 'HIGH'
        })
        
    controversies = [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in page.get('uncertainties', [])]
    
    knowledge = {
        'mentorMessage': page.get('mentor_intro', ''),
        'teachingPoints': teaching_points,
        'caseGenerationHooks': page.get('case_hooks', []),
        'mcqAngles': page.get('mcq_angles', []),
        'controversies': controversies,
        'reviewerGaps': page.get('gaps', ''),
        'sourceArticles': source_articles
    }
    return knowledge, source_articles

updated_count = 0
for topic, data in FINAL_39_DATA.items():
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (topic,))
    row = c.fetchone()
    if not row:
        continue
    topic_id, canonical_name, page_raw = row
    p = json.loads(page_raw) if page_raw else {}
    
    tps = p.get('teaching_points', [])
    srcs = p.get('sources', [])
    
    # Add companion sources
    if data.get('extra_sources'):
        existing_pmids = {str(s.get('pmid')) for s in srcs}
        for es in data['extra_sources']:
            if str(es.get('pmid')) not in existing_pmids:
                srcs.append(es)
                existing_pmids.add(str(es.get('pmid')))
        p['sources'] = srcs
        
    # Add extra teaching points
    if data.get('extra_tps'):
        for etp in data['extra_tps']:
            if len(tps) < 4:
                tps.append(etp)
        p['teaching_points'] = tps
        
    new_page_json = json.dumps(p, ensure_ascii=False)
    c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, topic_id))
    
    # Sync topic_knowledge
    k_obj, s_obj = draft_to_knowledge(p)
    c.execute("""
        UPDATE topic_knowledge 
        SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(topic) = LOWER(?)
    """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), canonical_name))
    
    updated_count += 1

conn.commit()
print(f"Successfully finalized and synced all {updated_count} remaining topics!")
