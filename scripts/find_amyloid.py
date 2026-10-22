import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("SELECT topic_id, topic, status FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%anti-amyloid%' OR LOWER(topic) LIKE '%lecanemab%' OR LOWER(topic) LIKE '%donanemab%' OR LOWER(topic) LIKE '%alzheimer%'")
for r in c.fetchall():
    print(r)
