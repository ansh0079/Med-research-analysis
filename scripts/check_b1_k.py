import sqlite3
import json

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

with open('topic-drafts/topics-0251-0500.json', 'r', encoding='utf-8') as f:
    drafts = json.load(f)

for d in drafts[:15]:
    t = d['topic']
    row = cur.execute("SELECT id, topic, normalized_topic, status FROM topic_knowledge WHERE topic = ?", (t,)).fetchone()
    print(f"#{d['no']} '{t}': {row}")
