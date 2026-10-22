import json
import sqlite3

with open('scratch_all_content_upgrades.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

has_4_tps_needs_srcs = [t for t in topics if t['tps_count'] >= 4]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

detailed_68 = []
for it in has_4_tps_needs_srcs:
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (it['topic_id'],))
    row = c.fetchone()
    if row:
        p = json.loads(row[1])
        detailed_68.append({
            'topic_id': it['topic_id'],
            'topic': row[0],
            'existing_sources': p.get('sources', [])
        })

print(f"Total 68 topics dumped: {len(detailed_68)}")
with open('scratch_68_sources.json', 'w', encoding='utf-8') as out:
    json.dump(detailed_68, out, indent=2)
