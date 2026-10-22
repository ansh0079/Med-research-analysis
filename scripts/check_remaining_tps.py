import csv
import sqlite3
import json

topics_file = 'scratch/user_batch_new.csv'
with open(topics_file, 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    clean_k = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[clean_k] = r

still_needs_tps = []
still_needs_srcs = []

for r in rows:
    t = r['Topic']
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    if key in drafts:
        d_row = drafts[key]
        p = json.loads(d_row[2]) if d_row[2] else {}
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        if len(tps) < 4:
            still_needs_tps.append((d_row[1], len(tps), [s.get('pmid') for s in srcs]))
        if len(srcs) < 2:
            still_needs_srcs.append((d_row[1], len(srcs)))

print(f"Still needing TPs (< 4): {len(still_needs_tps)}")
for x in still_needs_tps:
    print(f"  • {x[0]}: TPs={x[1]}, Sources PMIDs={x[2]}")

print(f"\nStill needing Sources (< 2): {len(still_needs_srcs)}")
for x in still_needs_srcs:
    print(f"  • {x[0]}: Sources={x[1]}")
