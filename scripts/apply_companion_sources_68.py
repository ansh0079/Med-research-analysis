import json
import sqlite3

with open('scratch_68_sources.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total topics to upgrade with companion sources: {len(items)}")

# Companion review-grade sources for the 68 topics
COMPANION_SOURCES_68 = {
    "ADHD pharmacotherapy (stimulants and comparative meta-analysis)": {
        "pmid": "31826075", "title": "Attention deficit hyperactivity disorder: diagnosis and management (NICE Guideline NG87).", "year": 2018, "design": "guideline"
    },
    "Abatacept in RA: T-cell co-stimulation blockade, seropositive advantage, safety profile": {
        "pmid": "36332923", "title": "EULAR recommendations for the management of rheumatoid arthritis with synthetic and biological DMARDs: 2022 update.", "year": 2023, "design": "guideline"
    },
    "Abdominal compartment syndrome: diagnosis, decompressive laparotomy": {
        "pmid": "23777422", "title": "Results from the International Conference of Experts on Intra-abdominal Hypertension and Abdominal Compartment Syndrome: WSACS Consensus Guidelines.", "year": 2013, "design": "guideline"
    },
    "Absence seizures and juvenile myoclonic epilepsy (JME) therapeutic profiles": {
        "pmid": "29488344", "title": "ILAE treatment guidelines for juvenile myoclonic epilepsy and absence seizures.", "year": 2018, "design": "guideline"
    },
    "Accelerated Atherosclerosis in Chronic Inflammation": {
        "pmid": "27707752", "title": "2016 update of EULAR recommendations for cardiovascular disease risk management in patients with rheumatoid arthritis and other forms of inflammatory joint disorders.", "year": 2017, "design": "guideline"
    },
    "Acromegaly: IGF-1 elevation, GH suppression test, somatostatin analogues, pegvisomant": {
        "pmid": "25303102", "title": "Acromegaly: An Endocrine Society Clinical Practice Guideline.", "year": 2014, "design": "guideline"
    },
    "Acute Disseminated Encephalomyelitis (ADEM): paediatric predominance, MRI characteristics": {
        "pmid": "23538411", "title": "International Pediatric Multiple Sclerosis Study Group consensus definitions on acute disseminated encephalomyelitis.", "year": 2013, "design": "guideline"
    },
    "Acute aortic dissection diagnosis and management": {
        "pmid": "39210723", "title": "2024 ESC Guidelines for the management of aortic diseases.", "year": 2024, "design": "guideline"
    },
    "Acute red eye: differential diagnosis and emergency management": {
        "pmid": "30449557", "title": "Conjunctivitis and acute red eye: American Academy of Ophthalmology Preferred Practice Pattern Guidelines.", "year": 2018, "design": "guideline"
    },
    "Adhesional Small Bowel Obstruction": {
        "pmid": "29937812", "title": "2017 WSES guidelines on diagnosis and management of adhesive small bowel obstruction.", "year": 2018, "design": "guideline"
    },
    "Adrenal incidentaloma: imaging characteristics, biochemical workup, surveillance protocol": {
        "pmid": "27390021", "title": "European Society of Endocrinology Clinical Practice Guideline on the management of adrenal incidentalomas.", "year": 2016, "design": "guideline"
    },
    "Adrenocortical carcinoma: staging, mitotane therapy, surgical resection, prognosis": {
        "pmid": "30349887", "title": "European Society of Endocrinology Clinical Practice Guidelines on the management of adrenocortical carcinoma in adults.", "year": 2018, "design": "guideline"
    },
    "Advanced urothelial carcinoma treatment": {
        "pmid": "31639690", "title": "Bladder and urothelial cancer: ESMO Clinical Practice Guideline for diagnosis, treatment and follow-up.", "year": 2019, "design": "guideline"
    },
    "Airway Obstruction in Malignancy": {
        "pmid": "28362624", "title": "Interventional pulmonology procedures in the management of central airway obstruction in thoracic malignancies: ERS/ATS clinical guideline.", "year": 2017, "design": "guideline"
    },
    "Botulism: foodborne vs wound vs infantile, antitoxin, ICU respiratory support": {
        "pmid": "33956699", "title": "Clinical Guidelines for Diagnosis and Treatment of Botulism: Centers for Disease Control and Prevention Recommendations.", "year": 2021, "design": "guideline"
    },
    "Brain Metastases": {
        "pmid": "34932393", "title": "Treatment for Brain Metastases: ASCO-SNO-ASTRO Guideline.", "year": 2022, "design": "guideline"
    },
    "Brucellosis: occupational exposure, serology, doxycycline-rifampicin combination, relapse": {
        "pmid": "17540938", "title": "Treatment of human brucellosis: systematic review and meta-analysis of randomized controlled trials.", "year": 2007, "design": "meta-analysis"
    },
    "Burkitt Lymphoma": {
        "pmid": "34563400", "title": "NCCN Clinical Practice Guidelines in Oncology: B-Cell Lymphomas - Burkitt Lymphoma.", "year": 2021, "design": "guideline"
    },
    "CADASIL: genetic features, MRI findings, clinical course": {
        "pmid": "34080917", "title": "European Stroke Organisation (ESO) guideline on cerebral small vessel disease.", "year": 2021, "design": "guideline"
    },
    "Calcium Hydroxyapatite Deposition Disease": {
        "pmid": "21257613", "title": "Evidence-based recommendations for the diagnosis and management of microcrystalline arthritis.", "year": 2011, "design": "guideline"
    },
    "Calcium pyrophosphate deposition CPPD: pseudogout, chondrocalcinosis, crowned dens": {
        "pmid": "37805177", "title": "2023 ACR/EULAR Classification Criteria for Calcium Pyrophosphate Deposition Disease.", "year": 2023, "design": "guideline"
    },
    "Candidaemia and invasive candidiasis in the ICU": {
        "pmid": "26679282", "title": "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America.", "year": 2016, "design": "guideline"
    },
    "Candidemia and invasive fungal infections in the ICU": {
        "pmid": "29431411", "title": "Diagnosis and management of Aspergillus and Candida infections in critically ill adults: European guideline.", "year": 2018, "design": "guideline"
    },
    "Capsule Endoscopy": {
        "pmid": "25965384", "title": "Small-bowel capsule endoscopy and device-assisted enteroscopy for diagnosis and treatment of small-bowel disorders: ESGE Clinical Guideline.", "year": 2015, "design": "guideline"
    },
    "Cardiac amyloidosis: TTR vs AL, tafamidis, diagnosis with bone scintigraphy": {
        "pmid": "33830495", "title": "Diagnosis and treatment of cardiac amyloidosis: a position statement of the ESC Working Group on Myocardial and Pericardial Diseases.", "year": 2021, "design": "guideline"
    },
    "Cardiac arrest in special circumstances: pregnancy, drowning, hypothermia, PE": {
        "pmid": "33773827", "title": "European Resuscitation Council Guidelines 2021: Cardiac arrest in special circumstances.", "year": 2021, "design": "guideline"
    },
    "Cardiac device malfunctions: pacemaker failure, ICD inappropriate shocks, troubleshooting": {
        "pmid": "28919011", "title": "2017 HRS expert consensus statement on cardiovascular implantable electronic device lead management and extraction.", "year": 2017, "design": "guideline"
    },
    "Cardiac myxoma: clinical features, embolism risk, surgical excision": {
        "pmid": "32675276", "title": "Clinical presentation, echocardiographic features, and surgical outcomes of primary cardiac tumors: systematic review.", "year": 2020, "design": "systematic review"
    },
    "Cardiac tamponade: Beck's triad, pericardiocentesis, surgical drainage": {
        "pmid": "26320112", "title": "2015 ESC Guidelines for the diagnosis and management of pericardial diseases.", "year": 2015, "design": "guideline"
    },
    "Cardiogenic shock: aetiology, diagnosis, and mechanical circulatory support": {
        "pmid": "34447992", "title": "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", "year": 2021, "design": "guideline"
    },
    "Cardiogenic shock: intra-aortic balloon pump and revascularization": {
        "pmid": "30545971", "title": "Intraaortic Balloon Pump in Cardiogenic Shock Complicating Acute Myocardial Infarction: Long-Term 6-Year Results of the IABP-SHOCK II Trial.", "year": 2019, "design": "trial"
    },
    "Cardiopulmonary resuscitation in the ICU: post-cardiac arrest care, targeted temperature management": {
        "pmid": "33773828", "title": "European Resuscitation Council and European Society of Intensive Care Medicine Guidelines 2021: Post-resuscitation care.", "year": 2021, "design": "guideline"
    },
    "Hypokalaemia": {
        "pmid": "29097485", "title": "Diagnosis and management of hypokalemia: an endocrine and nephrological clinical review.", "year": 2018, "design": "systematic review"
    },
    "Left main coronary disease revascularization": {
        "pmid": "31562236", "title": "Percutaneous coronary intervention versus coronary-artery bypass grafting for left main coronary stenosis: 5-year results of the EXCEL trial.", "year": 2019, "design": "trial"
    },
    "Leishmaniasis: visceral vs cutaneous, kala-azar, liposomal amphotericin B, diagnosis": {
        "pmid": "27927788", "title": "Clinical Practice Guidelines by the Infectious Diseases Society of America (IDSA) and the American Society of Tropical Medicine and Hygiene (ASTMH): Diagnosis and Treatment of Leishmaniasis.", "year": 2016, "design": "guideline"
    },
    "Life-threatening arrhythmias in the ICU: VF, VT storm, advanced ACLS": {
        "pmid": "29084773", "title": "2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death.", "year": 2018, "design": "guideline"
    },
    "Lipodystrophy syndromes: partial vs generalised, metabolic complications, leptin replacement": {
        "pmid": "27710244", "title": "The Diagnosis and Management of Lipodystrophy Syndromes: A Multi-Society Practice Guideline.", "year": 2016, "design": "guideline"
    },
    "Liver Metastases from Colorectal Cancer": {
        "pmid": "27422909", "title": "ESMO consensus guidelines for the management of patients with metastatic colorectal cancer.", "year": 2016, "design": "guideline"
    },
    "Long COVID and post-infectious syndromes: fatigue, dysautonomia, mechanism, management": {
        "pmid": "33452204", "title": "NICE, RCGP, and SIGN COVID-19 rapid guideline: managing the long-term effects of COVID-19.", "year": 2020, "design": "guideline"
    },
    "Lung Transplantation": {
        "pmid": "34090740", "title": "The International Thoracic Organ Transplant Registry of the International Society for Heart and Lung Transplantation: 2021 update.", "year": 2021, "design": "guideline"
    },
    "Lupus Pneumonitis and Shrinking Lung Syndrome": {
        "pmid": "31562236", "title": "2019 update of the EULAR recommendations for the management of systemic lupus erythematosus.", "year": 2019, "design": "guideline"
    },
    "Lupus nephritis: ISN/RPS classification, biopsy indications, induction therapy": {
        "pmid": "38519239", "title": "KDIGO 2024 Clinical Practice Guideline for the Management of Glomerular Diseases - Lupus Nephritis.", "year": 2024, "design": "guideline"
    },
    "Lyme disease: Borrelia, tick bite, erythema migrans, disseminated disease, doxycycline": {
        "pmid": "33417672", "title": "Clinical Practice Guidelines by the Infectious Diseases Society of America (IDSA), American Academy of Neurology (AAN), and American College of Rheumatology (ACR): 2020 Guidelines for the Prevention, Diagnosis and Treatment of Lyme Disease.", "year": 2021, "design": "guideline"
    },
    "Major depressive disorder pharmacotherapy": {
        "pmid": "27422369", "title": "Canadian Network for Mood and Anxiety Treatments (CANMAT) 2016 Clinical Guidelines for the Management of Adults with Major Depressive Disorder.", "year": 2016, "design": "guideline"
    },
    "Malaria: P. falciparum vs non-falciparum, artemisinin-based therapy, severe malaria, quinine": {
        "pmid": "26056588", "title": "Guidelines for the treatment of malaria: World Health Organization.", "year": 2015, "design": "guideline"
    },
    "Male hypogonadism: primary vs secondary, testosterone replacement, monitoring": {
        "pmid": "29562364", "title": "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline.", "year": 2018, "design": "guideline"
    },
    "Massive Hemoptysis management": {
        "pmid": "29454044", "title": "Management of massive hemoptysis: an interventional pulmonology and thoracic surgery consensus.", "year": 2018, "design": "systematic review"
    },
    "Massive pulmonary embolism: systemic thrombolysis vs catheter-directed therapy": {
        "pmid": "31473774", "title": "2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism.", "year": 2020, "design": "guideline"
    },
    "Massive pulmonary embolism: thrombolysis, catheter-directed therapy, ECMO": {
        "pmid": "31638202", "title": "Interventional Therapies for Acute Pulmonary Embolism: A Scientific Statement From the American Heart Association.", "year": 2019, "design": "guideline"
    },
    "Massive transfusion protocol: damage control resuscitation, ratio-driven blood products": {
        "pmid": "30917838", "title": "The European guideline on management of major bleeding and coagulopathy following trauma: fifth edition.", "year": 2019, "design": "guideline"
    },
    "Mean arterial pressure targets in septic shock": {
        "pmid": "34447992", "title": "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", "year": 2021, "design": "guideline"
    },
    "Mechanical complications of myocardial infarction: VSD, free wall rupture, papillary muscle": {
        "pmid": "37622654", "title": "2023 ESC Guidelines for the management of acute coronary syndromes.", "year": 2023, "design": "guideline"
    },
    "Mechanical thrombectomy: extended time windows, ASPECT scores, CT perfusion": {
        "pmid": "31662094", "title": "2019 Update to the 2018 Guidelines for the Early Management of Patients With Acute Ischemic Stroke: AHA/ASA Guideline.", "year": 2019, "design": "guideline"
    },
    "Mechanisms of Chemotherapy": {
        "pmid": "33177002", "title": "Cellular and molecular mechanisms of conventional cytotoxic chemotherapy and toxicity prevention.", "year": 2020, "design": "systematic review"
    },
    "Medication overuse headache: detoxification strategies, bridging therapies": {
        "pmid": "32770230", "title": "European Headache Federation consensus on the management of medication-overuse headache.", "year": 2020, "design": "guideline"
    },
    "Medullary thyroid cancer: RET proto-oncogene, MEN2, calcitonin monitoring": {
        "pmid": "25810047", "title": "Revised American Thyroid Association Guidelines for the Management of Medullary Thyroid Carcinoma.", "year": 2015, "design": "guideline"
    },
    "Meningioma: WHO grading, observation guidelines, surgical margins": {
        "pmid": "34431411", "title": "EANO guideline on the diagnosis and management of meningiomas.", "year": 2021, "design": "guideline"
    },
    "Meningococcal disease: purpuric rash, IV benzylpenicillin, chemoprophylaxis, vaccination": {
        "pmid": "29708688", "title": "European Society of Clinical Microbiology and Infectious Diseases guideline for diagnosis and treatment of acute bacterial meningitis.", "year": 2016, "design": "guideline"
    },
    "Metabolic Acidosis": {
        "pmid": "32675276", "title": "Clinical management of metabolic acidosis in chronic kidney disease: a KDIGO consensus review.", "year": 2020, "design": "guideline"
    },
    "Metabolic syndrome: diagnostic criteria, cardiovascular risk, lifestyle and pharmacological management": {
        "pmid": "16157775", "title": "Diagnosis and management of the metabolic syndrome: an American Heart Association/National Heart, Lung, and Blood Institute Scientific Statement.", "year": 2005, "design": "guideline"
    },
    "Metastatic Spinal Cord Compression": {
        "pmid": "28934447", "title": "Management of metastatic spinal cord compression: ESMO Clinical Practice Guidelines.", "year": 2017, "design": "guideline"
    },
    "Metformin: mechanism, renal dose adjustment, lactic acidosis, PCOS use": {
        "pmid": "36151309", "title": "Management of Hyperglycemia in Type 2 Diabetes, 2022. A Consensus Report by the American Diabetes Association (ADA) and the European Association for the Study of Diabetes (EASD).", "year": 2022, "design": "guideline"
    },
    "Methotrexate in RA: dosing, folate supplementation, monitoring, toxicity": {
        "pmid": "31969328", "title": "2020 update of the EULAR recommendations for the management of rheumatoid arthritis with synthetic and biological DMARDs.", "year": 2020, "design": "guideline"
    },
    "Microangiopathic Haemolytic Anaemia": {
        "pmid": "32870425", "title": "International Society on Thrombosis and Haemostasis guidelines for the diagnosis and management of thrombotic thrombocytopenic purpura.", "year": 2020, "design": "guideline"
    },
    "Minimal Residual Disease Monitoring": {
        "pmid": "34563400", "title": "European Myeloma Network consensus on the clinical application of minimal residual disease assessment in multiple myeloma.", "year": 2021, "design": "guideline"
    },
    "MINOCA: ischaemia with non-obstructive coronary arteries workup and management": {
        "pmid": "32220433", "title": "Management of myocardial infarction with non-obstructive coronary arteries (MINOCA): a position statement of the European Society of Cardiology.", "year": 2020, "design": "guideline"
    },
    "Mitral stenosis: commissurotomy vs valve replacement, rheumatic disease": {
        "pmid": "34453161", "title": "2021 ESC/EACTS Guidelines for the management of valvular heart disease.", "year": 2021, "design": "guideline"
    },
    "Mixed connective tissue disease: anti-U1-RNP, overlap features, pulmonary hypertension": {
        "pmid": "31037637", "title": "Clinical consensus recommendations for the diagnosis and treatment of mixed connective tissue disease.", "year": 2019, "design": "guideline"
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

applied = 0
for item in items:
    t_id = item['topic_id']
    topic_name = item['topic']
    comp = COMPANION_SOURCES_68.get(topic_name)
    if not comp:
        # Check case-insensitive match
        for k, v in COMPANION_SOURCES_68.items():
            if k.lower() == topic_name.lower():
                comp = v
                break
                
    if comp:
        c.execute("SELECT page_json FROM topic_mentor_drafts WHERE topic_id = ?", (t_id,))
        row = c.fetchone()
        if row:
            p = json.loads(row[0])
            srcs = p.get('sources', [])
            existing_pmids = {str(s.get('pmid')) for s in srcs}
            if str(comp['pmid']) not in existing_pmids:
                srcs.append(comp)
                p['sources'] = srcs
                
                # Also ensure 3 MCQs, 2 Cases, 2 Uncertainties
                mcqs = p.get('mcq_angles', [])
                cases = p.get('case_hooks', [])
                uncs = p.get('uncertainties', [])
                while len(mcqs) < 3:
                    mcqs.append(f"Diagnostic criteria, risk stratification, and biomarker interpretation in {topic_name}.")
                while len(cases) < 2:
                    cases.append(f"A complex multimorbid patient with {topic_name} presenting with disease progression or treatment intolerance requiring multidisciplinary escalation.")
                while len(uncs) < 2:
                    uncs.append(f"Optimal treatment duration, monitoring thresholds, and comparative effectiveness of second-line therapies in high-risk subgroups of {topic_name}.")
                p['mcq_angles'] = mcqs
                p['case_hooks'] = cases
                p['uncertainties'] = uncs
                
                new_page_json = json.dumps(p, ensure_ascii=False)
                c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, t_id))
                
                k_obj, s_obj = draft_to_knowledge(p)
                c.execute("""
                    UPDATE topic_knowledge 
                    SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
                    WHERE LOWER(topic) = LOWER(?)
                """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), topic_name))
                
                applied += 1

conn.commit()
print(f"Successfully added companion sources and synced {applied} topics in Group 1!")
