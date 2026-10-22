import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("PRAGMA table_info(topic_mentor_drafts)")
for col in c.fetchall():
    print(col)

c.execute("SELECT id, topic_id, topic FROM topic_mentor_drafts LIMIT 5")
print(c.fetchall())
