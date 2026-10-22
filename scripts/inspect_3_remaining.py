import sqlite3
import json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

targets = [
    "Cardiac tamponade: Beck's triad, pericardiocentesis, surgical drainage",
    "Lipodystrophy syndromes: partial vs generalised, metabolic complications, leptin replacement",
    "Lyme disease: Borrelia, tick bite, erythema migrans, disseminated disease, doxycycline"
]

for t in targets:
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (t,))
    row = c.fetchone()
    if row:
        p = json.loads(row[2])
        print(f"Topic: {row[1]}")
        print("Existing sources:", p.get('sources'))
