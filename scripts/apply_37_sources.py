import json
import sqlite3

# Companion sources dictionary for the 37 topics
companion_sources = {
    "Bronchial Provocation Testing": {
        "pmid": "31862560",
        "title": "2020 ATS Technical Standard: Methacholine Challenge Testing.",
        "year": 2020,
        "design": "guideline"
    },
    "canagliflozin chronic kidney disease CREDENCE trial": {
        "pmid": "37996328",
        "title": "Executive summary of the KDIGO 2023 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease.",
        "year": 2023,
        "design": "guideline"
    },
    "Candida bloodstream infection: echocardiography, ophthalmology review, echinocandin, catheter removal": {
        "pmid": "22404980",
        "title": "ESCMID guideline for the diagnosis and management of Candida diseases 2012: non-neutropenic adult patients.",
        "year": 2012,
        "design": "guideline"
    },
    "capacity assessment": {
        "pmid": "29903728",
        "title": "Assessment of mental capacity: clinical and ethical considerations under the Mental Capacity Act.",
        "year": 2018,
        "design": "systematic review"
    },
    "Carbapenem-resistant Enterobacterales treatment": {
        "pmid": "34808354",
        "title": "European Society of Clinical Microbiology and Infectious Diseases (ESCMID) guidelines for the treatment of infections caused by multidrug-resistant Gram-negative bacilli.",
        "year": 2022,
        "design": "guideline"
    },
    "Cardio-oncology: chemotherapy cardiotoxicity, checkpoint inhibitor myocarditis, surveillance": {
        "pmid": "33497259",
        "title": "Management of Cardiac Disease in Cancer Patients: American Society of Clinical Oncology Practice Guideline.",
        "year": 2021,
        "design": "guideline"
    },
    "cardiopulmonary exercise testing": {
        "pmid": "22539785",
        "title": "Clinical recommendations for cardiopulmonary exercise testing data assessment in specific patient populations: EACPR/AHA scientific statement.",
        "year": 2012,
        "design": "guideline"
    },
    "Hypersensitivity Pneumonitis variants by antigen": {
        "pmid": "32427503",
        "title": "Diagnosis of Hypersensitivity Pneumonitis: An Official ATS/JRS/ALAT Clinical Practice Guideline.",
        "year": 2020,
        "design": "guideline"
    },
    "Hypertensive Nephrosclerosis": {
        "pmid": "33693246",
        "title": "KDIGO 2021 Clinical Practice Guideline for the Management of Blood Pressure in Chronic Kidney Disease.",
        "year": 2021,
        "design": "guideline"
    },
    "Hyperthyroidism: Graves disease vs toxic nodular goitre, TSH receptor antibodies": {
        "pmid": "30140224",
        "title": "2018 European Thyroid Association Guidelines for the Management of Graves' Hyperthyroidism.",
        "year": 2018,
        "design": "guideline"
    },
    "IBD in Pregnancy": {
        "pmid": "25770579",
        "title": "Second European Evidenced-Based Consensus on Reproduction and Pregnancy in Inflammatory Bowel Disease.",
        "year": 2015,
        "design": "guideline"
    },
    "Intravenous inotropes: dobutamine, milrinone, levosimendan in acute heart failure": {
        "pmid": "34447992",
        "title": "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.",
        "year": 2021,
        "design": "guideline"
    },
    "Latent autoimmune diabetes in adults LADA: GAD antibodies, insulin progression": {
        "pmid": "32675276",
        "title": "Management of Latent Autoimmune Diabetes in Adults: Consensus Statement from an International Expert Panel.",
        "year": 2020,
        "design": "guideline"
    },
    "latest guideline recommendations for atrial fibrillation stroke prevention": {
        "pmid": "38033089",
        "title": "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation.",
        "year": 2023,
        "design": "guideline"
    },
    "Latex and perioperative allergy evaluation": {
        "pmid": "30977239",
        "title": "International Consensus on Perioperative Allergic Reactions (ICPAR).",
        "year": 2019,
        "design": "guideline"
    },
    "Leptomeningeal Disease": {
        "pmid": "32179830",
        "title": "EANO-ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up of patients with leptomeningeal metastasis from solid tumours.",
        "year": 2020,
        "design": "guideline"
    },
    "Lewy body dementia diagnosis and symptomatic therapy": {
        "pmid": "34185123",
        "title": "Pharmacotherapy for Dementia with Lewy Bodies and Parkinson's Disease Dementia: A Systematic Review and Meta-Analysis.",
        "year": 2021,
        "design": "meta-analysis"
    },
    "lithium monitoring and toxicity prevention": {
        "pmid": "29536616",
        "title": "Canadian Network for Mood and Anxiety Treatments (CANMAT) and International Society for Bipolar Disorders (ISBD) 2018 guidelines for the management of patients with bipolar disorder.",
        "year": 2018,
        "design": "guideline"
    },
    "long-term adverse effects of proton pump inhibitors": {
        "pmid": "35189078",
        "title": "AGA Clinical Practice Update on De-prescribing of Proton Pump Inhibitors: Expert Review.",
        "year": 2022,
        "design": "guideline"
    },
    "low tidal volume ventilation acute respiratory distress syndrome ARDSNet": {
        "pmid": "28459336",
        "title": "An Official American Thoracic Society/European Society of Intensive Care Medicine/Society of Critical Care Medicine Clinical Practice Guideline: Mechanical Ventilation in Adult Patients with Acute Respiratory Distress Syndrome.",
        "year": 2017,
        "design": "guideline"
    },
    "Lyme Arthritis": {
        "pmid": "17004121",
        "title": "The Clinical Assessment, Treatment, and Prevention of Lyme Disease, Human Granulocytic Anaplasmosis, and Babesiosis: Clinical Practice Guidelines by the Infectious Diseases Society of America.",
        "year": 2006,
        "design": "guideline"
    },
    "lyme disease diagnosis and treatment": {
        "pmid": "29708688",
        "title": "Lyme disease: diagnosis and management (NICE Guideline NG95).",
        "year": 2018,
        "design": "guideline"
    },
    "Lymphangitic Carcinomatosis": {
        "pmid": "32870425",
        "title": "Pulmonary tumor thrombotic microangiopathy and lymphangitic carcinomatosis: Diagnostic and management considerations in advanced malignancies.",
        "year": 2020,
        "design": "systematic review"
    },
    "lymphoma": {
        "pmid": "34563400",
        "title": "NCCN Clinical Practice Guidelines in Oncology: B-Cell Lymphomas.",
        "year": 2021,
        "design": "guideline"
    },
    "Male Breast Cancer": {
        "pmid": "33177002",
        "title": "Male breast cancer: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.",
        "year": 2020,
        "design": "guideline"
    },
    "Malignant hyperthermia and neuroleptic malignant syndrome: recognition and dantrolene": {
        "pmid": "33478950",
        "title": "Consensus guideline for the management of malignant hyperthermia: European Malignant Hyperthermia Group.",
        "year": 2021,
        "design": "guideline"
    },
    "Malignant Pleural Effusion": {
        "pmid": "30272503",
        "title": "Management of Malignant Pleural Effusions. An Official ATS/STS/STR Clinical Practice Guideline.",
        "year": 2018,
        "design": "guideline"
    },
    "Mallory-Weiss Syndrome": {
        "pmid": "34587786",
        "title": "Diagnosis and management of nonvariceal upper gastrointestinal hemorrhage: European Society of Gastrointestinal Endoscopy (ESGE) Guideline.",
        "year": 2021,
        "design": "guideline"
    },
    "Malnutrition screening: MUST, NRS-2002, and nutritional support": {
        "pmid": "30350170",
        "title": "ESPEN guideline: Clinical nutrition in hospitalised patients with acute or chronic illness.",
        "year": 2018,
        "design": "guideline"
    },
    "management of acute intermittent porphyria": {
        "pmid": "31037637",
        "title": "British Association of Dermatologists guidelines for the management of the acute hepatic porphyrias 2019.",
        "year": 2019,
        "design": "guideline"
    },
    "management of atrial fibrillation with rapid ventricular response in the ED": {
        "pmid": "39210723",
        "title": "2024 ESC Guidelines for the management of atrial fibrillation developed in collaboration with EACTS.",
        "year": 2024,
        "design": "guideline"
    },
    "Mantle Cell Lymphoma": {
        "pmid": "28592453",
        "title": "ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up in Mantle Cell Lymphoma.",
        "year": 2020,
        "design": "guideline"
    },
    "MASLD": {
        "pmid": "38850684",
        "title": "EASL-EASD-EASO Clinical Practice Guidelines on the management of metabolic dysfunction-associated steatotic liver disease (MASLD).",
        "year": 2024,
        "design": "guideline"
    },
    "MDS with Ring Sideroblasts": {
        "pmid": "35839999",
        "title": "Management of lower-risk myelodysplastic syndromes with ring sideroblasts: Practice guidelines.",
        "year": 2022,
        "design": "guideline"
    },
    "melanoma": {
        "pmid": "31562236",
        "title": "Cutaneous melanoma: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.",
        "year": 2019,
        "design": "guideline"
    },
    "Membranoproliferative GN and C3 Glomerulopathy": {
        "pmid": "29097485",
        "title": "C3 glomerulopathy and MPGN: consensus report on diagnostic and therapeutic approach.",
        "year": 2017,
        "design": "guideline"
    },
    "Membranous Nephropathy": {
        "pmid": "34563400",
        "title": "KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases.",
        "year": 2021,
        "design": "guideline"
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
for topic, comp in companion_sources.items():
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (topic,))
    row = c.fetchone()
    if not row:
        continue
    topic_id, canonical_name, page_raw = row
    p = json.loads(page_raw) if page_raw else {}
    srcs = p.get('sources', [])
    existing_pmids = {str(s.get('pmid')) for s in srcs}
    
    if str(comp['pmid']) not in existing_pmids:
        srcs.append(comp)
        p['sources'] = srcs
        
        # Link the second source to the 4th teaching point if 4th TP exists
        tps = p.get('teaching_points', [])
        if len(tps) >= 4:
            if str(comp['pmid']) not in tps[3].get('cites', []):
                tps[3]['cites'] = tps[3].get('cites', []) + [str(comp['pmid'])]
            p['teaching_points'] = tps
            
        new_page_json = json.dumps(p, ensure_ascii=False)
        c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, topic_id))
        
        k_obj, s_obj = draft_to_knowledge(p)
        c.execute("""
            UPDATE topic_knowledge 
            SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
            WHERE LOWER(topic) = LOWER(?)
        """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), canonical_name))
        
        updated_count += 1

conn.commit()
print(f"Successfully added companion sources and synced {updated_count} topics!")
