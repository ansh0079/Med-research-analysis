import json
import sqlite3

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

depth_only = [t for t in topics if not any('TP' in iss or 'Sources' in iss or 'DB' in iss for iss in t.get('issues', []))]
print(f"Total depth-only topics: {len(depth_only)}")

# Verify all are present in DB
conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic FROM topic_mentor_drafts")
draft_topics = {r[0].strip().lower(): r[0] for r in c.fetchall()}

missing = [t['topic'] for t in depth_only if t['topic'].strip().lower() not in draft_topics]
print(f"Missing from draft_topics: {len(missing)}")
