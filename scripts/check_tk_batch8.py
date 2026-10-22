import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "Charcot-Marie-Tooth disease: CMT1A duplication, nerve conduction patterns",
    "Checkpoint Inhibitor Myocarditis",
    "Chemotherapy Extravasation",
    "Chemotherapy-Induced Nausea and Vomiting",
    "chemotherapy induced nausea antiemetic prophylaxis",
    "Chemotherapy-induced nausea antiemetic prophylaxis",
    "Chest pain assessment in the ED",
    "chest pain ED",
    "Chikungunya and Zika Arthropathy",
    "childhood asthma",
    "Childhood asthma and wheeze phenotypes",
    "Cholangiocarcinoma",
    "Cholangiocarcinoma systemic therapy",
    "Choledocholithiasis",
    "Choledocholithiasis and acute cholangitis endoscopy"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
