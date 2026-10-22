import sqlite3

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

topics = [
    "Cardiorenal Syndrome",
    "Cardiorenal syndrome ultrafiltration",
    "Cardiovascular magnetic resonance: viability, myocarditis, cardiomyopathy assessment",
    "Cardiovascular outcomes in diabetes: SGLT2i and GLP-1 agonist trial evidence",
    "cardiovascular risk modification",
    "Carotid and vertebral artery dissection: antiplatelets vs anticoagulation paradigms",
    "Carpal tunnel syndrome: diagnosis and management",
    "Carpal tunnel syndrome: median nerve compression, Phalen, EMG, conservative vs surgical",
    "CAR-T Cell Therapy in Relapsed Leukaemia",
    "CAR-T cell therapy refractory large B-cell lymphoma axicabtagene",
    "car t therapy large b cell lymphoma",
    "CAR-T therapy large B-cell lymphoma",
    "Castration-Resistant Prostate Cancer",
    "Catatonia benzodiazepines and ECT",
    "Catheter-Associated Thrombosis"
]

for t in topics:
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, t.lower())).fetchall()
    print(f"Topic: {t} -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
