import json
import sqlite3

with open('scratch_tier1_topics.json', 'r', encoding='utf-8') as f:
    tier1 = json.load(f)

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic, page_json FROM topic_mentor_drafts")
drafts = {r[0].strip().lower(): (r[0], r[1]) for r in c.fetchall()}

print(f"Total Tier 1 topics: {len(tier1)}\n")
for i, item in enumerate(tier1[:15]):
    t = item['topic']
    key = t.strip().lower()
    print(f"=== {i+1}. {t} ===")
    print(f"  Issues: {item['issues']}")
    if key in drafts:
        orig_title, page_raw = drafts[key]
        p = json.loads(page_raw) if page_raw else {}
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        print(f"  Current TPs: {len(tps)}")
        for j, tp in enumerate(tps):
            print(f"    TP {j+1}: {tp.get('claim')[:80]}... [cites: {tp.get('cites')}]")
        print(f"  Current Sources: {len(srcs)}")
        for s in srcs:
            print(f"    PMID {s.get('pmid')}: {s.get('title')[:70]}...")
    else:
        print("  NOT FOUND IN DRAFTS MAP DIRECTLY")
