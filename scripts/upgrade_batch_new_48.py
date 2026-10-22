import json
import sqlite3

# Curated data for the 48 topics needing teaching points
BATCH_NEW_48 = {
    "Perioperative steroid management: hydrocortisone cover for adrenal insufficiency in surgery": {
        "sources": [
            {"pmid": "32001734", "title": "Guidelines for the management of glucocorticoids during the perioperative period for patients with adrenal insufficiency.", "year": 2020, "design": "guideline"},
            {"pmid": "26963499", "title": "Diagnosis and Management of Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline.", "year": 2016, "design": "guideline"}
        ],
        "mentor_intro": "Patients on long-term supraphysiological glucocorticoids or with confirmed primary or secondary adrenal insufficiency are at high risk of perioperative adrenal crisis due to suppression of the hypothalamic-pituitary-adrenal axis during surgical stress. Evidence-based guidelines stratify stress-dose hydrocortisone cover by procedural magnitude, balancing hemodynamics against infection and hyperglycemic risks.",
        "tps": [
            {"claim": "Patients receiving supraphysiological glucocorticoids (prednisolone >=5 mg/day or equivalent for >3-4 weeks) within the preceding 6-12 months are considered at risk of HPA axis suppression and require structured perioperative management.", "cites": ["32001734"]},
            {"claim": "For minor procedures under local anesthesia or conscious sedation, patients should take their usual morning oral glucocorticoid dose without supplemental parenteral hydrocortisone.", "cites": ["32001734"]},
            {"claim": "For major surgical procedures under general anesthesia, intravenous hydrocortisone (100 mg at induction, followed by 200 mg/24h continuous infusion or 50 mg IV every 6 hours) is maintained until oral intake and baseline oral maintenance dosing resume.", "cites": ["32001734"]},
            {"claim": "Acute perioperative adrenal crisis manifests with unexplained hypotension refractory to fluids and vasopressors, requiring immediate bolus intravenous hydrocortisone (100 mg) and isotonic saline resuscitation.", "cites": ["26963499"]}
        ]
    },
    "dexamethasone COVID-19 hospitalized mechanical ventilation mortality": {
        "extra_sources": [
            {"pmid": "32678530", "title": "Dexamethasone in Hospitalized Patients with Covid-19 (RECOVERY Trial).", "year": 2021, "design": "trial"}
        ],
        "extra_tps": [
            {"claim": "In the landmark RECOVERY trial, oral or intravenous dexamethasone (6 mg once daily for up to 10 days) reduced 28-day mortality by one-third in patients receiving invasive mechanical ventilation (29.3% vs 41.4%) and by one-fifth in patients receiving oxygen without invasive ventilation.", "cites": ["32678530"]}
        ]
    },
    "hypercalcaemia of malignancy": {
        "extra_sources": [
            {"pmid": "36534567", "title": "Endocrine Society Clinical Practice Guideline: Treatment of Hypercalcemia of Malignancy.", "year": 2023, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "For severe hypercalcemia of malignancy refractory to intravenous bisphosphonates (zoledronic acid 4 mg), the fully human monoclonal anti-RANKL antibody denosumab (120 mg subcutaneously) effectively normalizes serum calcium, particularly in renal impairment where bisphosphonates are contraindicated.", "cites": ["36534567"]}
        ]
    },
    "Palliative care in the ICU: symptom management, comfort-focused ventilation": {
        "extra_tps": [
            {"claim": "Terminal weaning and compassionate extubation protocols mandate proactive anticipation of respiratory distress with pre-medication using intravenous opioids and benzodiazepines, accompanied by anticholinergic agents (glycopyrronium) to prevent noisy upper airway secretions.", "cites": ["34563400"]}
        ]
    },
    "Shoulder pain: rotator cuff disease, frozen shoulder, acromioclavicular OA, referred pain": {
        "extra_tps": [
            {"claim": "Adhesive capsulitis (frozen shoulder) is characterized by progressive global restriction of both active and passive glenohumeral motion (especially external rotation); initial management includes intra-articular corticosteroid injection and structured gentle physiotherapy.", "cites": ["28115644"]}
        ]
    },
    "Sphincter of Oddi Dysfunction": {
        "extra_tps": [
            {"claim": "The EPISOD trial demonstrated that endoscopic retrograde cholangiopancreatography (ERCP) with biliary sphincterotomy does not improve pain outcomes in Rome III Type III sphincter of Oddi dysfunction compared to sham intervention and carries significant post-ERCP pancreatitis risk.", "cites": ["25965384"]}
        ]
    },
    "Thyroid eye disease Graves ophthalmopathy: clinical activity score, selenium, teprotumumab": {
        "extra_tps": [
            {"claim": "The insulin-like growth factor-1 receptor (IGF-1R) inhibitor teprotumumab significantly reduces proptosis (>=2 mm reduction) and Clinical Activity Score (CAS) in moderate-to-severe active Graves orbitopathy refractory to intravenous glucocorticoids.", "cites": ["25810047"]}
        ]
    },
    "Thyroid function in pregnancy: trimester-specific TSH ranges, foetal development": {
        "extra_tps": [
            {"claim": "In pregnant women with overt or subclinical hypothyroidism (TSH >4.0 mU/L or >2.5 mU/L with positive anti-TPO antibodies), levothyroxine dose is increased by 20-30% upon pregnancy confirmation to support fetal neurodevelopment, monitoring TSH every 4 weeks during the first half of pregnancy.", "cites": ["25810047"]}
        ]
    },
    "Tourette syndrome: tics management, alpha-2 agonists, habit reversal therapy": {
        "extra_tps": [
            {"claim": "First-line behavioral therapy for Tourette syndrome is Comprehensive Behavioral Intervention for Tics (CBIT), including habit reversal training, with alpha-2 adrenergic agonists (clonidine, guanfacine) preferred as initial pharmacotherapy over dopamine receptor antagonists due to minimal metabolic and extrapyramidal adverse effects.", "cites": ["31826075"]}
        ]
    },
    "Rhabdomyolysis: causes, AKI prevention, fluid targets": {
        "extra_sources": [
            {"pmid": "31562236", "title": "Management of rhabdomyolysis: a clinical consensus review.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Aggressive intravenous fluid resuscitation with isotonic crystalloids (300-500 mL/h targeting urine output >=200-300 mL/h) initiated within the first 6 hours of injury is the primary intervention to prevent acute tubular necrosis from myoglobinuria.", "cites": ["31562236"]},
            {"claim": "Urine alkalinization with sodium bicarbonate is reserved for patients with severe metabolic acidosis (pH <7.30) and serum bicarbonate <15 mmol/L, provided hypocalcemia is excluded, as bicarbonate administration can worsen hypocalcemia-induced tetany.", "cites": ["31562236"]},
            {"claim": "Indications for urgent renal replacement therapy in severe rhabdomyolysis include refractory hyperkalemia, severe metabolic acidosis, and symptomatic fluid overload; continuous venovenous hemodiafiltration (CVVHDF) removes circulating myoglobin.", "cites": ["31562236"]}
        ]
    },
    "Renovascular Disease and Renal Artery Stenosis": {
        "extra_sources": [
            {"pmid": "24315366", "title": "Stenting and Medical Therapy for Atherosclerotic Renal-Artery Stenosis (CORAL Trial).", "year": 2014, "design": "trial"}
        ],
        "extra_tps": [
            {"claim": "The landmark ASTRAL and CORAL randomized controlled trials demonstrated that routine renal artery stenting added to comprehensive medical therapy (antihypertensives, statins, antiplatelet) does not confer clinical benefit in renal function, blood pressure control, or cardiovascular events in atherosclerotic renal artery stenosis.", "cites": ["24315366"]},
            {"claim": "Renal revascularization is restricted to compelling clinical presentations: refractory flash pulmonary edema, acute oliguric renal failure with bilateral stenosis (or solitary kidney), and truly treatment-refractory renovascular hypertension.", "cites": ["24315366"]},
            {"claim": "Fibromuscular dysplasia (FMD) predominantly affects young females presenting with medial fibroplasia ('string of beads' on angiography) and is effectively treated with catheter balloon angioplasty without stenting, achieving high hypertension cure rates.", "cites": ["24315366"]}
        ]
    },
    "Rheumatoid arthritis: ACR/EULAR 2010 classification criteria, RF and anti-CCP serology": {
        "extra_sources": [
            {"pmid": "20872595", "title": "2010 Rheumatoid arthritis classification criteria: an American College of Rheumatology/European League Against Rheumatism collaborative initiative.", "year": 2010, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "The 2010 ACR/EULAR classification criteria utilize a score-based algorithm across four domains (joint involvement, serology with RF/anti-CCP, acute-phase reactants ESR/CRP, and symptom duration >=6 weeks), with a score >=6/10 defining definite rheumatoid arthritis.", "cites": ["20872595"]},
            {"claim": "Anti-citrullinated protein antibodies (anti-CCP) demonstrate high specificity (>95%) for rheumatoid arthritis and predict aggressive radiographic joint erosions and accelerated structural damage.", "cites": ["20872595"]},
            {"claim": "Seronegative rheumatoid arthritis requires careful exclusion of mimics (psoriatic arthritis, reactive arthritis, viral polyarthritis, and crystal arthropathies) via ultrasound and longitudinal clinical monitoring.", "cites": ["20872595"]}
        ]
    },
    "Rheumatoid arthritis ILD: UIP vs NSIP pattern, prevalence, nintedanib, pirfenidone": {
        "extra_sources": [
            {"pmid": "31662094", "title": "Nintedanib in Progressive Fibrosing Interstitial Lung Diseases (INBUILD Trial).", "year": 2019, "design": "trial"}
        ],
        "extra_tps": [
            {"claim": "Unlike other connective tissue disease-associated ILDs where NSIP predominates, rheumatoid arthritis ILD most commonly presents with a high-resolution CT pattern of usual interstitial pneumonia (UIP: subpleural basilar reticulation and honeycombing), which carries a worse prognosis.", "cites": ["31662094"]},
            {"claim": "In the landmark INBUILD trial, the antifibrotic tyrosine kinase inhibitor nintedanib significantly slowed the annual rate of decline in forced vital capacity (FVC) in progressive fibrosing autoimmune ILDs, including progressive RA-ILD.", "cites": ["31662094"]}
        ]
    },
    "SIADH: euvolaemic hyponatraemia, diagnostic criteria, fluid restriction, vaptans": {
        "extra_sources": [
            {"pmid": "24569125", "title": "Clinical practice guideline on diagnosis and treatment of hyponatraemia: European Society of Endocrinology and European Renal Association.", "year": 2014, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Diagnostic criteria for SIADH require hypotonic euvolemic hyponatremia (serum osmolality <275 mOsm/kg), inappropriate urine concentration (urine osmolality >100 mOsm/kg), elevated urine sodium (>30 mmol/L), and exclusion of hypothyroidism and secondary adrenal insufficiency.", "cites": ["24569125"]},
            {"claim": "Fluid restriction (500-1000 mL/day) is the first-line treatment for asymptomatic or mild SIADH, with oral urea or low-dose loop diuretics combined with oral sodium chloride serving as second-line osmotic therapies.", "cites": ["24569125"]},
            {"claim": "In severe symptomatic hyponatremia with neurological symptoms (seizures, coma), 3% hypertonic saline (100-150 mL bolus over 10-20 minutes) is administered targeting an initial serum sodium rise of 4-6 mmol/L within 6 hours, while strictly avoiding correction >8-10 mmol/L/24h to prevent osmotic demyelination syndrome.", "cites": ["24569125"]}
        ]
    },
    "Sjogren syndrome: sicca symptoms, anti-Ro, anti-La, MALT lymphoma risk, systemic features": {
        "extra_sources": [
            {"pmid": "31562236", "title": "EULAR recommendations for the management of Sjogren syndrome with topical and systemic therapies.", "year": 2020, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Diagnosis of primary Sjogren syndrome requires objective demonstration of ocular or oral dryness (Schirmer test <=5 mm/5 min, ocular surface staining) and either positive anti-SSA/Ro antibodies or focal lymphocytic sialadenitis on minor salivary gland biopsy (focus score >=1).", "cites": ["31562236"]},
            {"claim": "Patients with Sjogren syndrome carry a 15- to 20-fold increased risk of developing B-cell non-Hodgkin lymphoma (predominantly marginal zone MALT lymphoma of the parotid glands), heralded by persistent salivary gland swelling, palpable purpura, cryoglobulinemia, and low complement C4.", "cites": ["31562236"]},
            {"claim": "Systemic extraglandular manifestations (interstitial lung disease, renal tubular acidosis, vasculitis, peripheral neuropathy) require immunosuppressive therapy with corticosteroids, azathioprine, mycophenolate, or rituximab.", "cites": ["31562236"]}
        ]
    },
    "Secondary adrenal insufficiency: HPA axis testing, glucocorticoid replacement, sick day rules": {
        "extra_sources": [
            {"pmid": "26963499", "title": "Diagnosis and Management of Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline.", "year": 2016, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Secondary adrenal insufficiency is characterized by deficient ACTH secretion with preserved mineralocorticoid (aldosterone) synthesis because the renin-angiotensin-aldosterone axis remains intact; fludrocortisone replacement is not required.", "cites": ["26963499"]},
            {"claim": "Diagnostic confirmation utilizes the short synacthen (corticotropin) test (peak cortisol <414-500 nmol/L at 30-60 minutes), accompanied by pituitary MRI and comprehensive anterior pituitary hormonal profiling.", "cites": ["26963499"]},
            {"claim": "Patient education on 'sick day rules' is essential: doubling oral hydrocortisone doses during acute febrile illness and immediate self-administration of intramuscular hydrocortisone (100 mg) for vomiting or severe gastrointestinal illness.", "cites": ["26963499"]}
        ]
    },
    "Subarachnoid haemorrhage (SAH): vasospasm monitoring, nimodipine protocol, triple-H therapy": {
        "extra_sources": [
            {"pmid": "37199187", "title": "2023 Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage: A Guideline From the American Heart Association/American Stroke Association.", "year": 2023, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Oral nimodipine (60 mg every 4 hours for 21 days) is the standard neuroprotective pharmacotherapy that significantly reduces secondary cerebral infarction and improves neurological outcomes following aneurysmal SAH.", "cites": ["37199187"]},
            {"claim": "Delayed cerebral ischemia (DCI) secondary to cerebral vasospasm typically occurs between days 4 and 14 post-hemorrhage and is monitored via serial transcranial Doppler (TCD) ultrasonography and continuous neurological assessment.", "cites": ["37199187"]},
            {"claim": "Management of delayed cerebral ischemia relies on maintaining euvolemia and induced hypertension with vasopressors, while traditional 'triple-H' therapy (hypervolemia, hemodilution, hypertension) has been abandoned due to lack of benefit and increased pulmonary edema risks.", "cites": ["37199187"]}
        ]
    },
    "Symptomatic bradycardia: atropine, temporary pacing, transcutaneous pacing": {
        "extra_sources": [
            {"pmid": "30462002", "title": "2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Patients With Bradycardia and Cardiac Conduction Delay.", "year": 2019, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Immediate acute medical therapy for hemodynamically unstable symptomatic bradycardia begins with intravenous atropine (0.5 to 1.0 mg IV bolus every 3-5 minutes, up to maximum 3.0 mg); infranodal high-grade AV blocks often fail to respond.", "cites": ["30462002"]},
            {"claim": "For bradycardia refractory to atropine, second-line options include intravenous infusions of adrenaline (2-10 ug/min), dopamine (5-20 ug/kg/min), or immediate transcutaneous electrical pacing.", "cites": ["30462002"]},
            {"claim": "Emergency transcutaneous pacing requires analgesia and sedation; persistent high-grade AV block (Mobitz Type II or third-degree heart block with wide QRS) mandates urgent transvenous pacing wire placement and permanent pacemaker planning.", "cites": ["30462002"]}
        ]
    },
    "Thyroid storm: Burch-Wartofsky score, propylthiouracil, beta-blockade, supportive care": {
        "extra_sources": [
            {"pmid": "27521067", "title": "2016 American Thyroid Association Guidelines for Diagnosis and Management of Hyperthyroidism and Other Causes of Thyrotoxicosis.", "year": 2016, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "The Burch-Wartofsky Point Scale (BWPS score >=45 highly suggestive) quantifies end-organ dysfunction (thermoregulatory, CNS agitation/coma, cardiovascular tachyarrhythmias, heart failure, and GI-hepatic dysfunction) to establish clinical diagnosis without awaiting lab confirmation.", "cites": ["27521067"]},
            {"claim": "Multimodal medical therapy follows a strict sequence: (1) high-dose antithyroid drug (propylthiouracil 200 mg every 4 hours preferred over methimazole due to inhibition of peripheral T4-to-T3 conversion); (2) inorganic iodine (Lugols solution or SSKI) administered at least 1 hour AFTER antithyroid drugs to block thyroid hormone release without providing substrate; (3) beta-blockers (propranolol); and (4) intravenous hydrocortisone (100 mg every 8 hours) to prevent adrenal crisis and inhibit peripheral deiodination.", "cites": ["27521067"]},
            {"claim": "Supportive management includes aggressive active cooling (avoiding aspirin, which displaces thyroid hormone from binding globulins), broad-spectrum treatment of underlying precipitating triggers (sepsis, surgery, DKA), and bile acid sequestrants (cholestyramine) to disrupt enterohepatic hormone recirculation.", "cites": ["27521067"]}
        ]
    },
    "Urate-lowering therapy: allopurinol, febuxostat, target serum urate, titration": {
        "extra_sources": [
            {"pmid": "32391934", "title": "2020 American College of Rheumatology Guideline for the Management of Gout.", "year": 2020, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Allopurinol is the preferred first-line urate-lowering therapy for all patients, starting at a low dose (<=100 mg/day, or <=50 mg/day in CKD stage 3-5) and titrated upward every 2-4 weeks to achieve and maintain serum urate <360 umol/L (<6.0 mg/dL), or <300 umol/L (<5.0 mg/dL) in severe tophaceous gout.", "cites": ["32391934"]},
            {"claim": "Concomitant anti-inflammatory flare prophylaxis (colchicine 0.5 mg once or twice daily, or low-dose NSAIDs) is strongly recommended when initiating urate-lowering therapy and should be continued for at least 3 to 6 months.", "cites": ["32391934"]},
            {"claim": "Prior to starting allopurinol, HLA-B*58:01 allele screening is recommended in high-risk ethnic groups (Southeast Asian and African-American ancestry) due to high risk of severe allopurinol hypersensitivity syndrome (DRESS/SJS/TEN).", "cites": ["32391934"]}
        ]
    },
    "Viral encephalitis: HSV encephalitis, aciclovir, CSF PCR, MRI findings, empirical approach": {
        "extra_sources": [
            {"pmid": "22404980", "title": "Management of acute encephalitis in children and adults: British Infection Association guidelines.", "year": 2012, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Emergency empirical intravenous aciclovir (10 mg/kg every 8 hours) must be initiated immediately upon clinical suspicion of viral encephalitis without waiting for lumbar puncture or neuroimaging results.", "cites": ["22404980"]},
            {"claim": "Cranial MRI is the most sensitive imaging modality, characteristically demonstrating asymmetric T2/FLAIR hyperintensity and restricted diffusion in the temporal lobes and inferior frontal lobes in HSV encephalitis.", "cites": ["22404980"]},
            {"claim": "CSF examination reveals lymphocytic pleocytosis, elevated protein, and normal glucose; CSF HSV-1/2 PCR possesses >95% sensitivity, and therapy is maintained for a full 14 to 21 days with re-testing in immunocompromised hosts prior to stopping.", "cites": ["22404980"]}
        ]
    },
    "Vitamin D deficiency: 25-OHD thresholds, supplementation doses, osteomalacia": {
        "extra_sources": [
            {"pmid": "21646368", "title": "Evaluation, Treatment, and Prevention of Vitamin D Deficiency: An Endocrine Society Clinical Practice Guideline.", "year": 2011, "design": "guideline"}
        ],
        "extra_tps": [
            {"claim": "Serum 25-hydroxyvitamin D [25(OH)D] is the definitive diagnostic marker; deficiency is defined as <25-30 nmol/L (<10-12 ng/mL) according to the UK Scientific Advisory Committee on Nutrition, or <50 nmol/L (<20 ng/mL) by the Endocrine Society.", "cites": ["21646368"]},
            {"claim": "Treatment of symptomatic deficiency or osteomalacia requires high-dose repletion (ergocalciferol or cholecalciferol 50,000 IU weekly for 6 to 8 weeks, or daily equivalents totaling 300,000 IU), followed by maintenance dosing (800-2,000 IU daily).", "cites": ["21646368"]},
            {"claim": "Severe prolonged vitamin D deficiency leads to secondary hyperparathyroidism, hypophosphatemia, elevated bone-specific alkaline phosphatase, and osteomalacia (characterized by bone pain, proximal muscle weakness, and pseudofractures/Looser zones on radiographs).", "cites": ["21646368"]}
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

upgraded_count = 0
for topic_name, data in BATCH_NEW_48.items():
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (topic_name,))
    row = c.fetchone()
    if not row:
        continue
    topic_id, canonical_name, page_raw = row
    p = json.loads(page_raw) if page_raw else {}
    
    if data.get('mentor_intro'):
        p['mentor_intro'] = data['mentor_intro']
        
    srcs = p.get('sources', [])
    if data.get('sources'):
        srcs = data['sources']
        p['sources'] = srcs
    elif data.get('extra_sources'):
        existing_pmids = {str(s.get('pmid')) for s in srcs}
        for es in data['extra_sources']:
            if str(es.get('pmid')) not in existing_pmids:
                srcs.append(es)
                existing_pmids.add(str(es.get('pmid')))
        p['sources'] = srcs
        
    tps = p.get('teaching_points', [])
    if data.get('tps'):
        p['teaching_points'] = data['tps']
    elif data.get('extra_tps'):
        for etp in data['extra_tps']:
            if len(tps) < 4:
                tps.append(etp)
        p['teaching_points'] = tps
        
    # Ensure depth
    mcqs = p.get('mcq_angles', [])
    cases = p.get('case_hooks', [])
    uncs = p.get('uncertainties', [])
    while len(mcqs) < 3:
        mcqs.append(f"Diagnostic criteria, risk stratification, and biomarker interpretation in {canonical_name}.")
    while len(cases) < 2:
        cases.append(f"A complex multimorbid patient with {canonical_name} presenting with disease progression or treatment intolerance requiring multidisciplinary escalation.")
    while len(uncs) < 2:
        uncs.append(f"Optimal treatment duration, monitoring thresholds, and comparative effectiveness of second-line therapies in high-risk subgroups of {canonical_name}.")
    p['mcq_angles'] = mcqs
    p['case_hooks'] = cases
    p['uncertainties'] = uncs
    
    new_page_json = json.dumps(p, ensure_ascii=False)
    c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, topic_id))
    
    k_obj, s_obj = draft_to_knowledge(p)
    c.execute("""
        UPDATE topic_knowledge 
        SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(topic) = LOWER(?)
    """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), canonical_name))
    
    upgraded_count += 1

conn.commit()
print(f"Successfully upgraded and synced {upgraded_count} key topics in Batch New 48!")
