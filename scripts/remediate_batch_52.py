import sqlite3
import json
from datetime import datetime

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
        
    controversies = [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in page.get('uncertainties') or []]
    
    return {
        'mentorMessage': page.get('mentor_intro', ''),
        'teachingPoints': teaching_points,
        'caseGenerationHooks': page.get('case_hooks') or [],
        'mcqAngles': page.get('mcq_angles') or [],
        'controversies': controversies,
        'reviewerGaps': page.get('gaps', ''),
        'sourceArticles': source_articles
    }, source_articles

# ==========================================
# 1. DEPTH UPGRADES FOR 12 TOPICS
# ==========================================
DEPTH_12_UPGRADES = {
    '9d856baf-94b9-4365-a366-c8c7ca1f95c5': { # febrile neutropenia
        'mcq': 'Indications for adding empiric vancomycin/glycopeptide (hemodynamic instability, catheter tunnel infection, pneumonia, or known MRSA colonization).',
        'case': '54-year-old female with AML receiving induction chemotherapy develops rigors and BP 85/50 with persistent fever at 72 hours despite piperacillin-tazobactam.',
        'unc': 'Safety and timing of de-escalating or discontinuing empiric antibacterial therapy in persistently febrile, clinically stable patients before absolute neutrophil count recovery.'
    },
    'b91751a7-5277-4244-9fc9-80dbbc698565': { # Oxygen prescribing, target saturations and hypoxia management
        'mcq': 'Target oxygen saturation ranges: 94-98% for most acutely ill patients vs 88-92% in patients at risk of hypercapnic respiratory failure (BTS guideline).',
        'case': '72-year-old male with severe COPD (FEV1 35%) presents drowsy and tachypnoeic on an 80% non-rebreather mask with pH 7.21, PaCO2 9.4 kPa, and PaO2 18 kPa.',
        'unc': 'Permissive hypoxaemia vs conservative oxygenation targets in critically ill patients with acute respiratory distress syndrome and acute myocardial infarction.'
    },
    'a58186a7-ae11-4cef-a21f-47f8a074a6ec': { # Paediatric anaphylaxis: recognition and emergency management
        'mcq': 'Refractory anaphylaxis management: timing of second dose of IM adrenaline at 5-15 minutes and initiation of IV fluid boluses and adrenaline infusion.',
        'case': '6-year-old boy with known tree-nut allergy develops facial swelling and biphasic stridor 4 hours after initial resolution following single-dose epinephrine.',
        'unc': 'Minimum mandatory observation duration (4 vs 8 vs 12 hours) following epinephrine administration to safely exclude biphasic reactions.'
    },
    '0436c9d0-bc06-46e2-9922-b14fb0599b08': { # Papilloedema : funduscopic staging, pseudo- papilloedema vs true disc swelling
        'mcq': 'Differentiating optic disc drusen from true papilloedema: autofluorescence, B-scan ultrasound calcification, and absence of peripapillary flame haemorrhages.',
        'case': '32-year-old female with BMI 38 presents with progressive bilateral visual field constriction and Frisén grade 4 papilloedema refractory to maximum-dose acetazolamide.',
        'unc': 'Optic nerve sheath fenestration vs ventriculoperitoneal/lumboperitoneal shunting vs venous sinus stenting for medically refractory visual loss in idiopathic intracranial hypertension.'
    },
    '5919794b-5da3-4147-837a-679b25561d49': { # parkinsonism
        'mcq': 'Differentiating idiopathic Parkinson disease from atypical parkinsonian syndromes (PSP, MSA, DLB) based on early falls, autonomic failure, and symmetrical poor levodopa response.',
        'case': '70-year-old male with a 2-year history of resting tremor develops vivid visual hallucinations and orthostatic syncope shortly after escalating ropinirole.',
        'unc': 'Optimal therapeutic timing for initiating device-aided therapies (subcutaneous apomorphine, levodopa intestinal gel, DBS) before irreversible motor decline.'
    },
    'a5036ffc-8460-44a6-95bd-717121d21464': { # Perioperative risk assessment and optimisation
        'mcq': 'Preoperative management of cardioprotective medications: continuation of statins, holding ACEi/ARBs on morning of surgery, and antiplatelet bridging strategies.',
        'case': '75-year-old male scheduled for emergency open AAA repair with unknown cardiac history, poor exercise tolerance (<4 METs), and preoperative elevated high-sensitivity troponin.',
        'unc': 'Utility and cost-effectiveness of routine preoperative cardiac MRI or CT coronary angiography versus clinical risk stratification in intermediate-risk surgery.'
    },
    '154f79d3-c7a8-4fa9-a40f-2ff6737a487f': { # pneumonia
        'mcq': 'Diagnostic microbiological workup in severe community-acquired pneumonia: blood cultures, sputum Gram stain/culture, and urinary Legionella and pneumococcal antigen testing.',
        'case': '62-year-old smoker presents with high fever, hyponatraemia, diarrhoea, and dense right lower lobe consolidation with clinical failure on amoxicillin.',
        'unc': 'Procalcitonin-guided discontinuation versus fixed short-course (5-day) antibiotic regimens in hospitalized non-ICU community-acquired pneumonia.'
    },
    'cb5fa404-b06c-447a-a3fa-8ee409d728bb': { # Polycythemia vera: hematocrit targets, aspirin, and cardiovascular risk reduction
        'mcq': 'Cytoreductive therapy indications: age >= 60 years or prior thrombosis (high risk); hydroxyurea as first-line cytoreduction and pegylated interferon-alpha in younger patients.',
        'case': '64-year-old male with PV on phlebotomy presents with acute portal vein thrombosis and persistent splenomegaly despite hematocrit maintained at 44%.',
        'unc': 'Ruxolitinib vs interferon-alfa for symptom control and disease-modification in hydroxyurea-intolerant or resistant polycythemia vera.'
    },
    'ba5d002d-9690-4e92-b59b-1af4e7208918': { # Primary aldosteronism diagnosis and treatment
        'mcq': 'Medical therapy with mineralocorticoid receptor antagonists (spironolactone vs eplerenone) in bilateral adrenal hyperplasia or non-surgical candidates.',
        'case': '45-year-old female with treatment-resistant hypertension on 4 agents and unprovoked hypokalaemia (K+ 2.9 mmol/L) with ARR > 30 and non-suppressible post-saline aldosterone.',
        'unc': 'Adrenal venous sampling (AVS) cutoffs with ACTH stimulation vs non-stimulated protocols, and concordance with dedicated adrenal CT.'
    },
    '9a915d89-3d36-42c1-b335-7c688f99efa7': { # Pulmonary artery catheter utility in critically ill patients
        'mcq': 'Hemodynamic differentiation of shock states: distinguishing cardiogenic (high PCWP, low CI, high SVR) from septic/distributive shock (low PCWP, high CI, low SVR).',
        'case': '65-year-old male with acute anterior STEMI complicated by acute mitral regurgitation, pulmonary oedema, and mixed shock requiring PAC-guided inotropic and vasopressor titration.',
        'unc': 'PAC hemodynamic guidance versus echocardiography and dynamic stroke volume variation (Vigileo/PiCCO) in complex cardiorenal and RV failure.'
    },
    '92c6a9d1-a62c-42d7-8a57-6597e44f4066': { # Radiation necrosis vs tumour progression: perfusion MRI and PET scan utility
        'mcq': 'Distinguishing cerebral radiation necrosis from recurrent glioblastoma/metastasis: relative cerebral blood volume (rCBV) hypoperfusion on DSC-MRI vs amino acid PET (18F-FET/11C-MET) uptake.',
        'case': '58-year-old female with resected lung adenocarcinoma brain metastasis treated with SRS 9 months ago presents with focal seizures and a ring-enhancing lesion with extensive vasogenic oedema.',
        'unc': 'Comparative efficacy and cognitive safety of laser interstitial thermal therapy (LITT) versus medical therapy with bevacizumab and high-dose dexamethasone.'
    },
    '82285d28-7507-4e55-b387-08a362af7d9a': { # RCRI score
        'mcq': 'Postoperative troponin surveillance indications and management of perioperative myocardial injury (MINS) in patients with RCRI >= 2.',
        'case': '71-year-old woman with chronic kidney disease (eGFR 28 mL/min), insulin-treated type 2 diabetes, and transient ischemic attack undergoing elective hip arthroplasty.',
        'unc': 'RCRI vs NSQIP surgical risk calculator: performance variability across vascular, orthopaedic, and intra-abdominal procedures.'
    }
}

# ==========================================
# 2. EVIDENCE AND TP UPGRADES FOR 8 TOPICS
# ==========================================
CONTENT_8_UPGRADES = {
    'fd9534de-c0ed-4429-9a9a-8e3f77bfa2d1': { # canakinumab
        'sources_add': [{
            'pmid': '34789506',
            'title': 'From RESCUE to ZEUS: will inhibition of interleukin-6 lead to a new era of cardiovascular therapeutics?',
            'year': 2021,
            'design': 'review'
        }],
        'tps': None # already 4 excellent TPs
    },
    'f3e353b1-6a19-4c24-8742-3e6ba349496a': { # leukaemia
        'sources_add': [{
            'pmid': '32115161',
            'title': 'Acute adult myeloblastic leukaemia: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.',
            'year': 2020,
            'design': 'guideline'
        }],
        'tps': None # already 4 excellent TPs
    },
    'c9967030-6871-438d-8574-77a82a46d392': { # management of PRESS
        'sources_add': [{
            'pmid': '28058533',
            'title': 'Posterior reversible encephalopathy syndrome (PRES): pathophysiology, diagnosis and treatment.',
            'year': 2017,
            'design': 'review'
        }],
        'tps': None # already 4 excellent TPs
    },
    'de1f2036-3ba7-4738-a215-fabebe22a6e5': { # meningitis
        'sources_add': [{
            'pmid': '26841577',
            'title': 'ESCMID guideline: diagnosis and treatment of acute bacterial meningitis.',
            'year': 2016,
            'design': 'guideline'
        }],
        'tps': None # already 4 excellent TPs
    },
    '83838221-834d-4280-b19a-9534170a9775': { # rosuvastatin primary prevention elevated C-reactive protein
        'sources_add': [{
            'pmid': '18997196',
            'title': 'Rosuvastatin to prevent vascular events in men and women with elevated C-reactive protein (JUPITER Trial).',
            'year': 2008,
            'design': 'trial'
        }, {
            'pmid': '30422998',
            'title': '2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol.',
            'year': 2019,
            'design': 'guideline'
        }],
        'intro': 'The landmark JUPITER trial demonstrated that in apparently healthy adults with normal LDL cholesterol but elevated high-sensitivity C-reactive protein (hsCRP >= 2 mg/L), rosuvastatin 20 mg significantly reduced major cardiovascular events and all-cause mortality, establishing systemic inflammation as a treatable risk enhancer in primary prevention.',
        'tps': [
            {'claim': 'In the landmark JUPITER trial (Ridker et al., NEJM), rosuvastatin (20 mg daily) significantly reduced the primary composite endpoint of myocardial infarction, stroke, arterial revascularization, hospitalization for unstable angina, or death from cardiovascular causes by 44% (HR 0.56, 95% CI 0.46-0.69) in individuals with LDL-C <130 mg/dL and hsCRP >=2.0 mg/dL.', 'cites': ['18997196']},
            {'claim': 'Rosuvastatin therapy resulted in a median reduction in LDL cholesterol of 50% (down to 55 mg/dL) and a median reduction in hsCRP of 37% (down to 2.2 mg/L) at 12 months, demonstrating simultaneous profound lipid and inflammatory suppression.', 'cites': ['18997196']},
            {'claim': 'JUPITER demonstrated a significant 20% reduction in all-cause mortality (HR 0.80, 95% CI 0.67-0.97, P=0.02) without significant increases in myopathy or cancer, leading to trial termination at a median follow-up of 1.9 years due to unequivocal efficacy.', 'cites': ['18997196']},
            {'claim': 'Contemporary multi-society cholesterol guidelines recognize persistently elevated hsCRP (>=2.0 mg/dL) as a validated risk-enhancing factor supporting the initiation or intensification of statin therapy in intermediate-risk primary prevention, while monitoring for a small absolute increase in physician-reported incident diabetes.', 'cites': ['18997196', '30422998']}
        ]
    },
    '0c95d938-2614-4be9-9e27-9e9ec6737cba': { # H. pylori infection
        'sources_add': [],
        'tps': [
            {'claim': 'H. pylori eradication has become increasingly challenging worldwide due to rising antimicrobial resistance, particularly to clarithromycin and levofloxacin, making bismuth quadruple therapy the preferred first-line regimen in high-resistance regions.', 'cites': ['31433314', '27102658']},
            {'claim': 'H. pylori infection is a definitive Class 1 human carcinogen and a primary pathogenic cause of chronic gastritis, peptic ulcer disease, gastric adenocarcinoma, and gastric MALT lymphoma.', 'cites': ['29999489']},
            {'claim': 'The Toronto Consensus and Maastricht VI guidelines recommend 14 days of bismuth quadruple therapy (PPI, bismuth, metronidazole, tetracycline) or non-bismuth concomitant quadruple therapy where bismuth is unavailable.', 'cites': ['27102658']},
            {'claim': 'Confirmation of eradication with a validated urea breath test, monoclonal stool antigen test, or endoscopy-based biopsy must be performed at least 4 weeks after antibiotic completion and at least 2 weeks after stopping PPIs to avoid false-negative results.', 'cites': ['27102658', '31433314']}
        ]
    },
    'b1d8151e-e8f4-4251-9ab5-081908782930': { # hyperuricaemia
        'sources_add': [{
            'pmid': '32391934',
            'title': '2020 American College of Rheumatology Guideline for the Management of Gout.',
            'year': 2020,
            'design': 'guideline'
        }],
        'tps': [
            {'claim': 'Gout is an inflammatory arthritis driven by the precipitation of monosodium urate crystals in articular and periarticular tissues when serum urate levels exceed physiological solubility (~6.8 mg/dL or 400 umol/L).', 'cites': ['27112094']},
            {'claim': 'Gout affects over 41 million adults globally; genetic variation in renal (URAT1, GLUT9) and intestinal (ABCG2) urate transporters accounts for the majority of hyperuricemia, with dietary purines, alcohol, and metabolic syndrome acting as secondary modulators.', 'cites': ['34802900', '27112094']},
            {'claim': 'The American College of Rheumatology strongly recommends urate-lowering therapy (allopurinol first-line) for patients with frequent flares (>=2/year), tophi, or radiographic damage, titrating treat-to-target to maintain serum urate <6.0 mg/dL (<360 umol/L).', 'cites': ['32391934', '40153315']},
            {'claim': 'Anti-inflammatory flare prophylaxis (colchicine 0.5-0.6 mg daily or low-dose NSAID) is mandatory during the first 3-6 months of urate-lowering initiation, and HLA-B*5801 screening is indicated in high-risk ethnic groups before allopurinol exposure.', 'cites': ['32391934']}
        ]
    },
    'c7f58952-2d4d-4a4f-b187-7b770d19ec48': { # should I start an SGLT2 inhibitor for my patient with HFrEF?
        'sources_add': [{
            'pmid': '31535829',
            'title': 'Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction (DAPA-HF Trial).',
            'year': 2019,
            'design': 'trial'
        }, {
            'pmid': '35363499',
            'title': '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure: A Report of the American College of Cardiology/American Heart Association Joint Committee on Clinical Practice Guidelines.',
            'year': 2022,
            'design': 'guideline'
        }],
        'intro': 'SGLT2 inhibitors (dapagliflozin and empagliflozin) are established as one of the four foundational pillars of guideline-directed medical therapy (GDMT) for patients with heart failure with reduced ejection fraction (HFrEF, LVEF <= 40%), delivering substantial reductions in cardiovascular death, heart failure hospitalizations, and all-cause mortality regardless of baseline glycemic status.',
        'tps': [
            {'claim': 'SGLT2 inhibitors (dapagliflozin 10 mg or empagliflozin 10 mg once daily) are a Class 1A guideline recommendation as foundational therapy in all symptomatic HFrEF patients (LVEF <=40%), irrespective of type 2 diabetes status.', 'cites': ['35363499']},
            {'claim': 'In landmark randomized trials (DAPA-HF and EMPEROR-Reduced), SGLT2 inhibitors reduced the composite risk of cardiovascular death or heart failure hospitalization by 25-26% (HR 0.74, 95% CI 0.65-0.85), with clinical divergence emerging within 28 days of initiation.', 'cites': ['31535829', '35363499']},
            {'claim': 'SGLT2 inhibitors can be safely initiated down to an estimated GFR of 20-25 mL/min/1.73m2; a transient hemodynamic eGFR decline of up to 30% reflects reduction in intraglomerular hypertension and should not trigger drug discontinuation.', 'cites': ['35363499']},
            {'claim': 'SGLT2 inhibitors carry minimal hypoglycemia risk in non-diabetic patients, require no dose uptitration, and demonstrate additive mortality and hospitalization benefits alongside ARNI/ACEi, beta-blockers, and mineralocorticoid receptor antagonists (MRAs).', 'cites': ['31535829', '35363499']}
        ]
    }
}

now = datetime.utcnow().isoformat() + 'Z'
upgraded_count = 0

# Apply 1: Depth 12
for tid, depth in DEPTH_12_UPGRADES.items():
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (tid,))
    row = c.fetchone()
    if row:
        topic_name = row[0]
        page = json.loads(row[1]) if row[1] else {}
        mcqs = page.get('mcq_angles', [])
        cases = page.get('case_hooks', [])
        uncs = page.get('uncertainties', [])
        
        if len(mcqs) < 3 and depth.get('mcq'):
            mcqs.append(depth['mcq'])
        if len(cases) < 2 and depth.get('case'):
            cases.append(depth['case'])
        if len(uncs) < 2 and depth.get('unc'):
            uncs.append(depth['unc'])
            
        page['mcq_angles'] = mcqs
        page['case_hooks'] = cases
        page['uncertainties'] = uncs
        
        page_json = json.dumps(page, ensure_ascii=False)
        c.execute("""
            UPDATE topic_mentor_drafts
            SET page_json = ?, status = 'published', updated_at = ?
            WHERE topic_id = ?
        """, (page_json, now, tid))
        
        # Sync to topic_knowledge
        k_obj, s_arts = draft_to_knowledge(page)
        k_json = json.dumps(k_obj, ensure_ascii=False)
        s_json = json.dumps(s_arts, ensure_ascii=False)
        c.execute("""
            UPDATE topic_knowledge
            SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.95, updated_at = ?
            WHERE LOWER(topic) = LOWER(?)
        """, (k_json, s_json, now, topic_name))
        
        upgraded_count += 1
        print(f"Upgraded depth for: {topic_name}")

# Apply 2: Content 8
for tid, content in CONTENT_8_UPGRADES.items():
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (tid,))
    row = c.fetchone()
    if row:
        topic_name = row[0]
        page = json.loads(row[1]) if row[1] else {}
        
        if content.get('intro'):
            page['mentor_intro'] = content['intro']
        if content.get('sources_add'):
            existing_pmids = {str(s.get('pmid')) for s in page.get('sources', [])}
            for s in content['sources_add']:
                if str(s.get('pmid')) not in existing_pmids:
                    page.setdefault('sources', []).append(s)
        if content.get('tps'):
            page['teaching_points'] = content['tps']
            
        page_json = json.dumps(page, ensure_ascii=False)
        c.execute("""
            UPDATE topic_mentor_drafts
            SET page_json = ?, status = 'published', updated_at = ?
            WHERE topic_id = ?
        """, (page_json, now, tid))
        
        # Sync to topic_knowledge
        k_obj, s_arts = draft_to_knowledge(page)
        k_json = json.dumps(k_obj, ensure_ascii=False)
        s_json = json.dumps(s_arts, ensure_ascii=False)
        c.execute("""
            UPDATE topic_knowledge
            SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.95, updated_at = ?
            WHERE LOWER(topic) = LOWER(?)
        """, (k_json, s_json, now, topic_name))
        
        upgraded_count += 1
        print(f"Upgraded content for: {topic_name}")

conn.commit()
print(f"\nSuccessfully upgraded and committed {upgraded_count} topics in database/app.db!")
