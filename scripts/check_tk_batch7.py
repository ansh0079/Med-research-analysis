import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "Cauda equina syndrome: surgical emergency signs, post-void residual volumes",
    "Celiac disease diagnosis and monitoring",
    "cellulitis",
    "Cellulitis and skin and soft tissue infections: Eron classification, MRSA risk, treatment duration",
    "Cellulitis, erysipelas, and mimics",
    "Central line-associated bloodstream infection (CLABSI): prevention and management",
    "Central line-associated bloodstream infection CLABSI: prevention bundles, diagnosis, treatment",
    "Central line-associated bloodstream infection prevention in ICU",
    "Central Nervous System Vasculitis (PACNS): digital subtraction angiography, cyclophosphamide regimens",
    "Central Sleep Apnea and Cheyne-Stokes respiration",
    "Cerebral amyloid angiopathy (CAA): microbleeds, lobar haemorrhages, diagnostic criteria",
    "Cerebral venous sinus thrombosis (CVST): risk factors, anticoagulation choices",
    "Cerebral venous thrombosis anticoagulation",
    "Cervical Cancer",
    "Cervical spondylotic myelopathy: clinical signs, surgical decompression indications"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' (norm: '{norm}') -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
