import sqlite3, json

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    meta = json.load(f)

b9_topics = [t for t in meta if 1121 <= t['no'] <= 1135]

for t in b9_topics:
    no = t['no']
    top = t['topic']
    cur.execute("SELECT status, confidence FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (top, top.lower()))
    row = cur.fetchone()
    print(f"{no}: {top} -> TK: {row}")

conn.close()
