import sqlite3
import json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%dementia with lewy bodies%'")
row = c.fetchone()
if row:
    print("Topic:", row[0])
    data = json.loads(row[1])
    print(json.dumps(data, indent=2))
