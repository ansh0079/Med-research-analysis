import sqlite3
conn = sqlite3.connect('database/app.db')
cur = conn.cursor()
rows = cur.execute("SELECT id, topic, normalized_topic, status FROM topic_knowledge WHERE topic LIKE '%biologic therapy pre%'").fetchall()
for r in rows:
    print(r)
