import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("SELECT topic FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%tenosynovitis%'")
print("Tenosynovitis matches:", c.fetchall())
