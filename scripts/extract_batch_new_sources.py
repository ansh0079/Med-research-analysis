import json

with open('scratch_audit_batch_new.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

# Re-audit current DB state to see what needs sources
import sqlite3
conn = sqlite3.connect('database/app.db')
c = conn.cursor()

needs_sources = []
for it in items:
    t_id = it['topic_id']
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (t_id,))
    row = c.fetchone()
    if row:
        p = json.loads(row[1])
        srcs = p.get('sources', [])
        tps = p.get('teaching_points', [])
        if len(srcs) < 3:
            needs_sources.append({
                'topic_id': t_id,
                'topic': row[0],
                'srcs_count': len(srcs),
                'tps_count': len(tps),
                'srcs': srcs,
                'tps': tps
            })

print(f"Total topics needing additional sources (< 3): {len(needs_sources)}")
with open('scratch_needs_sources_batch_new.json', 'w', encoding='utf-8') as out:
    json.dump(needs_sources, out, indent=2)

for s in needs_sources[:15]:
    print(f"• {s['topic']} (sources: {s['srcs_count']}, TPs: {s['tps_count']})")
