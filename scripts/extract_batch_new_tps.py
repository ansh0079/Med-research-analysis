import json
import sqlite3

with open('scratch_audit_batch_new.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

needs_tps = []
for it in items:
    t_id = it['topic_id']
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (t_id,))
    row = c.fetchone()
    if row:
        p = json.loads(row[1])
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        if len(tps) < 4:
            needs_tps.append({
                'topic_id': t_id,
                'topic': row[0],
                'tps_count': len(tps),
                'srcs_count': len(srcs),
                'tps': tps,
                'srcs': srcs,
                'intro': p.get('mentor_intro', ''),
                'gaps': p.get('gaps', '')
            })

print(f"Total topics needing TPs (< 4): {len(needs_tps)}")
with open('scratch_needs_tps_batch_new.json', 'w', encoding='utf-8') as out:
    json.dump(needs_tps, out, indent=2)

for t in needs_tps:
    print(f"• {t['topic']}: TPs={t['tps_count']}, Sources={t['srcs_count']}")
