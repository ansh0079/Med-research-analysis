import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "chronic lymphocytic leukaemia ibrutinib and venetoclax based targeted therapy",
    "Chronic Myeloid Leukaemia",
    "chronic myeloid leukaemia imatinib and second generation tki therapy",
    "Chronic myeloid leukemia imatinib",
    "Chronic Myelomonocytic Leukaemia",
    "Chronic Neutrophilic Leukaemia",
    "Chronic Pancreatitis",
    "Chronic pancreatitis pain and exocrine insufficiency",
    "Chronic spontaneous urticaria omalizumab",
    "Chronic Thromboembolic Pulmonary Hypertension",
    "Chronic Tophaceous Gout",
    "Chronic venous insufficiency: compression therapy, ablation, venous ulcer management",
    "Cirrhosis and portal hypertension",
    "Cirrhosis ascites and spontaneous bacterial peritonitis",
    "CKD Cardiovascular Risk Management"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
