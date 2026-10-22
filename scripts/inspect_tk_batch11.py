import sqlite3, json

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

topics = [
    "Multiple myeloma: daratumumab-based frontline therapy",
    "Multiple myeloma: VRd versus Rd for newly diagnosed disease",
    "Myasthenia gravis targeted immunotherapy"
]

for t in topics:
    cur.execute("SELECT knowledge, source_articles FROM topic_knowledge WHERE topic = ?", (t,))
    row = cur.fetchone()
    if row:
        print(f"=== {t} ===")
        print("KNOWLEDGE:", row[0][:300])
        print("SOURCES:", row[1][:300])
        print()

conn.close()
