import sqlite3
import json

topics_39 = [
    "Refractory angina: enhanced external counterpulsation, spinal cord stimulation",
    "Remission maintenance in AAV: azathioprine, rituximab, MAINRITSAN trial",
    "Restless Legs Syndrome (RLS): iron store optimization, dopamine agonist augmentation",
    "Rh Alloimmunisation Management",
    "Rituximab in rheumatic disease: dosing, pre-treatment screening, hypogammaglobulinaemia",
    "sacubitril valsartan heart failure reduced ejection fraction mortality",
    "safeguarding",
    "Schnitzler Syndrome",
    "sciatica",
    "Secondary headaches: red flags (SNOOP4), neuroimaging criteria",
    "Sedation minimization and analgesia-first in ICU",
    "semaglutide once weekly obesity weight loss STEP 1",
    "Serotonin syndrome recognition and management",
    "SGLT2 inhibitors heart failure reduced ejection fraction randomized trial",
    "shortness of breath",
    "Shortness of breath and acute respiratory failure",
    "Silo Filler's Disease",
    "SLE: SLICC 2012 and ACR/EULAR 2019 classification criteria compared",
    "Suspected melanoma, non-melanoma skin cancer and urgent referral",
    "Takayasu arteritis: large vessel vasculitis, imaging, management, biologics",
    "Thin Basement Membrane Nephropathy",
    "Third, fourth, and sixth cranial nerve palsies: pupil-sparing oculomotor palsy",
    "Thyroiditis: Hashimotos, de Quervains, postpartum - phases, TSH trajectory, management",
    "TNF inhibitors in RA: adalimumab, etanercept, infliximab: efficacy, TB screening, contraindications",
    "tonsillitis",
    "Tonsillitis, peritonsillar abscess and deep neck infection",
    "Type 1 vs Type 2 MI: universal definition and clinical differentiation",
    "Typhoid fever: Salmonella typhi, Widal test, blood culture, azithromycin, ceftriaxone",
    "Vaccinations in immunosuppressed rheumatology patients: timing, live vs killed, pneumococcal, shingles",
    "Vancomycin therapeutic drug monitoring: AUC-based dosing, nephrotoxicity, trough targets",
    "Vapor Gas Dust and Fume exposures",
    "Varicella zoster in adults and immunocompromised: severity, aciclovir, VZIG prophylaxis",
    "Vasopressor and inotrope pharmacology: noradrenaline, vasopressin, dobutamine, milrinone",
    "viral wheeze",
    "vitamin K antagonist bridging atrial fibrillation perioperative BRIDGE trial",
    "Wellens syndrome and left main equivalent ECG patterns",
    "wheeze phenotypes",
    "Wolfram syndrome DIDMOAD: diabetes insipidus, DM, optic atrophy, deafness",
    "workup for new heart failure with reduced ejection fraction"
]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

results = []
for t in topics_39:
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (t,))
    row = c.fetchone()
    if row:
        p = json.loads(row[2])
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        results.append({
            'topic_id': row[0],
            'topic': row[1],
            'tps_len': len(tps),
            'srcs_len': len(srcs),
            'tps': tps,
            'srcs': srcs
        })

print(f"Total topics: {len(results)}")
with open('scratch_39_details.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

for r in results[:10]:
    print(f"{r['topic']} -> TPs: {r['tps_len']}, Sources: {r['srcs_len']}")
