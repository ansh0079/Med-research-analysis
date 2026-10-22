import csv
import sqlite3
import json

topics_file = 'scratch/user_batch_new.csv'
with open(topics_file, 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

print(f"Total topics in user batch: {len(rows)}")

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    clean_k = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[clean_k] = r

matched_drafts = 0
unmatched = []
audit_list = []

for r in rows:
    t = r['Topic']
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    if key in drafts:
        matched_drafts += 1
        d_row = drafts[key]
        p = json.loads(d_row[4]) if d_row[4] else {}
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        mcqs = p.get('mcq_angles', [])
        cases = p.get('case_hooks', [])
        uncs = p.get('uncertainties', [])
        audit_list.append({
            'topic': d_row[1],
            'topic_id': d_row[0],
            'tps_count': len(tps),
            'srcs_count': len(srcs),
            'mcqs_count': len(mcqs),
            'cases_count': len(cases),
            'uncs_count': len(uncs),
            'srcs': srcs,
            'tps': tps
        })
    else:
        unmatched.append(t)

print(f"Matched in drafts: {matched_drafts} / {len(rows)}")
print(f"Unmatched: {len(unmatched)}")
if unmatched:
    print("Sample unmatched:", unmatched[:10])

# Inspect metrics
tp_under_4 = [a for a in audit_list if a['tps_count'] < 4]
src_under_2 = [a for a in audit_list if a['srcs_count'] < 2]
src_under_3 = [a for a in audit_list if a['srcs_count'] < 3]
mcq_under_3 = [a for a in audit_list if a['mcqs_count'] < 3]
cases_under_2 = [a for a in audit_list if a['cases_count'] < 2]
unc_under_2 = [a for a in audit_list if a['uncs_count'] < 2]

print(f"\nAudit Summary:")
print(f"Total topics: {len(rows)}")
print(f"TP count < 4: {len(tp_under_4)}")
print(f"Sources < 2: {len(src_under_2)}")
print(f"Sources < 3: {len(src_under_3)}")
print(f"MCQs < 3: {len(mcq_under_3)}")
print(f"Cases < 2: {len(cases_under_2)}")
print(f"Uncertainties < 2: {len(unc_under_2)}")

with open('scratch_audit_batch_new.json', 'w', encoding='utf-8') as out:
    json.dump(audit_list, out, indent=2)
