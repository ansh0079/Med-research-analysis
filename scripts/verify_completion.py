import sqlite3
import json

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

draft_published = cur.execute("SELECT count(*) FROM topic_mentor_drafts WHERE status = 'published'").fetchone()[0]
know_reviewed = cur.execute("SELECT count(*) FROM topic_knowledge WHERE status = 'human_reviewed'").fetchone()[0]
draft_total = cur.execute("SELECT count(*) FROM topic_mentor_drafts").fetchone()[0]

print(f"topic_mentor_drafts total: {draft_total}, published: {draft_published}")
print(f"topic_knowledge human_reviewed: {know_reviewed}")

with open('topic-drafts/topics-0001-0250.json', 'r', encoding='utf-8') as f:
    d1 = json.load(f)

print(f"Sheet 1 drafts count in JSON: {len(d1)}")
print(f"Sheet 1 published count in JSON: {len([d for d in d1 if d.get('status') == 'published'])}")
