import csv
import json
import sqlite3

with open('scratch/user_batch_52.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

print(f"Total topics in user batch: {len(rows)}")

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, page_json FROM topic_mentor_drafts")
draft_rows = c.fetchall()
draft_by_topic = {}
for r in draft_rows:
    clean_t = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    draft_by_topic[clean_t] = r

c.execute("SELECT topic, normalized_topic, status, confidence, knowledge, source_articles FROM topic_knowledge")
k_rows = c.fetchall()
k_by_topic = {}
k_by_norm = {}
for r in k_rows:
    clean_t = r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    k_by_topic[clean_t] = r
    if r[1]:
        k_by_norm[r[1].strip().lower()] = r

audit_results = []
missing_drafts = []

for r in rows:
    raw_topic = r['Topic']
    clean_t = raw_topic.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    
    draft = draft_by_topic.get(clean_t)
    # try partial match if not exact
    if not draft:
        for k, v in draft_by_topic.items():
            if clean_t in k or k in clean_t:
                draft = v
                break
                
    k_entry = k_by_topic.get(clean_t)
    if not k_entry:
        for k, v in k_by_topic.items():
            if clean_t in k or k in clean_t:
                k_entry = v
                break

    if not draft:
        missing_drafts.append(raw_topic)
        continue

    p = json.loads(draft[3]) if draft[3] else {}
    tps = p.get('teaching_points', [])
    srcs = p.get('sources', [])
    mcqs = p.get('mcq_angles', [])
    cases = p.get('case_hooks', [])
    uncs = p.get('uncertainties', [])
    intro = p.get('mentor_intro', '')

    audit_results.append({
        'user_topic': raw_topic,
        'db_topic': draft[1],
        'topic_id': draft[0],
        'draft_status': draft[2],
        'tps_count': len(tps),
        'sources_count': len(srcs),
        'mcqs_count': len(mcqs),
        'cases_count': len(cases),
        'uncs_count': len(uncs),
        'intro_len': len(intro),
        'has_k': bool(k_entry),
        'k_status': k_entry[2] if k_entry else None,
        'k_conf': k_entry[3] if k_entry else None
    })

print(f"Matched in drafts: {len(audit_results)} / {len(rows)}")
print(f"Missing in drafts: {len(missing_drafts)}")
if missing_drafts:
    print("Missing:", missing_drafts)

# Deficiencies
tp_under_4 = [x for x in audit_results if x['tps_count'] < 4]
src_under_2 = [x for x in audit_results if x['sources_count'] < 2]
src_under_3 = [x for x in audit_results if x['sources_count'] < 3]
depth_gaps = [x for x in audit_results if x['mcqs_count'] < 3 or x['cases_count'] < 2 or x['uncs_count'] < 2]
pristine = [x for x in audit_results if x['tps_count'] >= 4 and x['sources_count'] >= 2 and x['mcqs_count'] >= 3 and x['cases_count'] >= 2 and x['uncs_count'] >= 2]

print(f"\nPristine topics (>=4 TPs, >=2 Sources, >=3 MCQs, >=2 Cases, >=2 Uncs): {len(pristine)} / {len(audit_results)}")
print(f"Needing enhancements: {len(audit_results) - len(pristine)}")
print(f"  - Teaching points < 4: {len(tp_under_4)}")
print(f"  - Sources < 2: {len(src_under_2)}")
print(f"  - Sources == 2 (could add 3rd): {len(src_under_3) - len(src_under_2)}")
print(f"  - Depth gaps only: {len(depth_gaps)}")

with open('scratch/audit_batch_52_results.json', 'w', encoding='utf-8') as out:
    json.dump(audit_results, out, indent=2)
