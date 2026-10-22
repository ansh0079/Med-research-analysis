import sqlite3
import json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("SELECT id, topic, page_json, updated_at FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(\"De Quervain's Tenosynovitis\")")
row = c.fetchone()
if row:
    print("ID:", row[0])
    print("Topic:", row[1])
    print("Updated at:", row[3])
    p = json.loads(row[2])
    print("MCQs:", p.get('mcq_angles'))
    print("Cases:", p.get('case_hooks'))
    print("Uncertainties:", p.get('uncertainties'))
