import json
import sqlite3

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

depth_only = [t for t in topics if not any('TP' in iss or 'Sources' in iss or 'DB' in iss for iss in t.get('issues', []))]
print(f"Total depth-only topics: {len(depth_only)}")

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic, page_json FROM topic_mentor_drafts")
drafts = {r[0].strip().lower(): (r[0], r[1]) for r in c.fetchall()}

for i, item in enumerate(depth_only[:5]):
    t = item['topic']
    key = t.strip().lower()
    print(f"\n=== {i+1}. {t} ===")
    print(f"Issues: {item['issues']}")
    orig_t, page_raw = drafts[key]
    p = json.loads(page_raw)
    print(f"TPs: {len(p.get('teaching_points', []))}")
    print(f"Sources: {len(p.get('sources', []))}")
    print(f"MCQs ({len(p.get('mcq_angles', []))}): {p.get('mcq_angles', [])}")
    print(f"Cases ({len(p.get('case_hooks', []))}): {p.get('case_hooks', [])}")
    print(f"Uncertainties ({len(p.get('uncertainties', []))}): {p.get('uncertainties', [])}")
