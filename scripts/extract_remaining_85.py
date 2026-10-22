import json
import sqlite3

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    deficient = json.load(f)

# Load the current state of topics that still have TP < 4
conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts")
drafts = {r[1].strip().lower(): r for r in c.fetchall()}

remaining_85 = []
for item in deficient:
    name = item['topic']
    lookup = name.strip().lower()
    if lookup in drafts:
        row = drafts[lookup]
        topic_id, canonical_name, page_raw = row
        p = json.loads(page_raw) if page_raw else {}
        tps = p.get('teaching_points', [])
        if len(tps) < 4:
            remaining_85.append({
                'topic_id': topic_id,
                'topic': canonical_name,
                'tp_count': len(tps),
                'tps': tps,
                'sources': p.get('sources', []),
                'intro': p.get('mentor_intro', ''),
                'mcqs': p.get('mcq_angles', []),
                'cases': p.get('case_hooks', []),
                'uncs': p.get('uncertainties', []),
                'gaps': p.get('gaps', '')
            })

print(f"Total remaining topics needing 4th TP: {len(remaining_85)}")
with open('scratch_remaining_85.json', 'w', encoding='utf-8') as f:
    json.dump(remaining_85, f, indent=2)

print("Saved scratch_remaining_85.json successfully.")
