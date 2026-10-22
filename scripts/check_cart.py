import sqlite3

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()
rows = cur.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE normalized_topic LIKE '%car%'").fetchall()
for r in rows:
    print(r)
