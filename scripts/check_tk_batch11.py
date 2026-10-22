import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "CKD-MBD: Mineral and Bone Disorder",
    "CKD mineral and bone disorder",
    "CKD Staging and Progression",
    "Class I antiarrhythmics: flecainide, propafenone, quinidine, use and contraindications",
    "claudication",
    "clopidogrel aspirin acute minor ischemic stroke CHANCE",
    "Clostridioides difficile Infection",
    "Clostridioides difficile infection: severity grading, vancomycin, fidaxomicin, FMT, bezlotoxumab",
    "Clozapine for treatment-resistant schizophrenia",
    "clozapine-induced myocarditis",
    "cluster headache",
    "Cluster headache: high-flow oxygen, triptan rescue, verapamil prophylaxis",
    "CMV disease in immunocompromised: retinitis, colitis, pneumonitis, ganciclovir, valganciclovir",
    "coagulation disorders",
    "Coal Worker's Pneumoconiosis"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
