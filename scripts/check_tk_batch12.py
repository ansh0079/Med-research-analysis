import sqlite3
import re

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

topics = [
    "Coeliac Disease",
    "collapse",
    "Collapse, syncope, and cardiac arrest algorithms",
    "Colonic Volvulus",
    "colorectal cancer",
    "Colorectal cancer adjuvant chemotherapy",
    "Colorectal cancer screening and FIT strategy",
    "Colorectal Cancer Treatment",
    "Common variable immunodeficiency diagnosis and infection prevention",
    "community acquired pneumonia",
    "community-acquired pneumonia",
    "community acquired pneumonia antibiotics",
    "Community-acquired pneumonia: CURB-65, PSI, empirical therapy, atypical pathogens",
    "Community acquired pneumonia diagnosis and management",
    "community acquired pneumonia diagnosis empiric antibiotic management guideline adult"
]

for t in topics:
    norm = normalize_topic(t)
    rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (t, norm)).fetchall()
    print(f"Topic: '{t}' (norm: '{norm}') -> DB matches: {len(rows)}")
    for r in rows:
        print(f"   id={r[0]}, topic='{r[1]}', norm='{r[2]}'")
