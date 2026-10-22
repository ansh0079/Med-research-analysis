import csv
import sqlite3
import json

topics_file = 'scratch/user_batch_65.csv'
with open(topics_file, 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    clean_k = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[clean_k] = r

detailed_65 = []
for r in rows:
    t = r['Topic']
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    d_row = drafts[key]
    p = json.loads(d_row[4]) if d_row[4] else {}
    tps = p.get('teaching_points', [])
    srcs = p.get('sources', [])
    mcqs = p.get('mcq_angles', [])
    cases = p.get('case_hooks', [])
    uncs = p.get('uncertainties', [])
    
    gaps = []
    if len(tps) < 4:
        gaps.append(f"TPs < 4 ({len(tps)})")
    if len(srcs) < 3:
        gaps.append(f"Sources < 3 ({len(srcs)})")
    if len(mcqs) < 3:
        gaps.append(f"MCQs < 3 ({len(mcqs)})")
    if len(cases) < 2:
        gaps.append(f"Cases < 2 ({len(cases)})")
    if len(uncs) < 2:
        gaps.append(f"Uncertainties < 2 ({len(uncs)})")
        
    detailed_65.append({
        'topic_id': d_row[0],
        'topic': d_row[1],
        'tps_count': len(tps),
        'srcs_count': len(srcs),
        'existing_pmids': [s.get('pmid') for s in srcs],
        'gaps': gaps,
        'page': p
    })

print(f"Total evaluated: {len(detailed_65)}")
needs_upgrade = [d for d in detailed_65 if d['gaps']]
print(f"Topics with gaps to upgrade: {len(needs_upgrade)}")
for d in needs_upgrade:
    print(f"• {d['topic']}: {', '.join(d['gaps'])} | Existing PMIDs: {d['existing_pmids']}")

with open('scratch_detailed_65.json', 'w', encoding='utf-8') as f:
    json.dump([{k: v for k, v in d.items() if k != 'page'} for d in detailed_65], f, indent=2)
