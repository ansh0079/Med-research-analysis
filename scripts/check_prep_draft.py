import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%pre%exposure%'")
print(c.fetchall())
