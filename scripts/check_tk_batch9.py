import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "Cholelithiasis and Biliary Colic",
    "Cholera and Vibrio infections: oral rehydration, doxycycline, epidemic control, vaccination",
    "chronic abdominal pain",
    "Chronic Allograft Dysfunction",
    "Chronic aortic regurgitation: surveillance intervals and surgical timing",
    "chronic asthma",
    "Chronic coronary syndrome: stable angina assessment and revascularisation decisions",
    "chronic cough evaluation and empiric therapy",
    "Chronic hepatitis B antiviral therapy",
    "Chronic inflammatory demyelinating polyneuropathy treatment",
    "Chronic Inflammatory Demyelinating Polyradiculoneuropathy (CIDP): electrodiagnostic criteria, maintenance therapies",
    "chronic kidney disease",
    "Chronic kidney disease SGLT2 inhibitors",
    "Chronic Lymphocytic Leukaemia",
    "Chronic lymphocytic leukaemia: chemoimmunotherapy with FCR"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
