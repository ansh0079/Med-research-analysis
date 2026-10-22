import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

print('Alzheimer matches:')
for r in c.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic LIKE '%amyloid%'").fetchall():
    print(' ', r)

print('Angiotensin matches:')
for r in c.execute("SELECT id, topic, normalized_topic FROM topic_knowledge WHERE topic LIKE '%angiotensin%'").fetchall():
    print(' ', r)
