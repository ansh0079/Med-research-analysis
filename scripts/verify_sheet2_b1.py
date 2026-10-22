import json
import sqlite3

with open('topic-drafts/topics-0251-0500.json', 'r', encoding='utf-8') as f:
    drafts = json.load(f)

b1 = [d for d in drafts if 251 <= d['no'] <= 265]
print(f"Loaded {len(b1)} drafts from Sheet 2 Batch 1.")

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

for d in b1:
    no = d['no']
    p = d['page']
    intro = p['mentor_intro']
    tps = p['teaching_points']
    sources = p['sources']
    
    # Assertions
    assert not 'crucial clinical entity' in intro.lower(), f"#{no} boilerplate intro"
    assert len(tps) == 4, f"#{no} TP count {len(tps)}"
    assert len(p['uncertainties']) == 2, f"#{no} unc count"
    assert len(p['mcq_angles']) == 3, f"#{no} mcq count"
    assert len(p['case_hooks']) == 2, f"#{no} hook count"
    
    # DB checks
    row = cur.execute("SELECT status FROM topic_mentor_drafts WHERE topic_id = ?", (d['topicId'],)).fetchone()
    assert row and row[0] == 'published', f"#{no} DB status {row}"
    
    k_row = cur.execute("SELECT status, confidence FROM topic_knowledge WHERE topic = ?", (d['topic'],)).fetchone()
    assert k_row and k_row[0] == 'human_reviewed', f"#{no} Knowledge status {k_row}"

print("All 15 topics in Sheet 2 Batch 1 (251-265) are 100% verified and synchronized!")
