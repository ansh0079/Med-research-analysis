import csv
import sqlite3
import json

topics_file = 'scratch/user_batch_65.csv'
with open(topics_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Total topics in user batch: {len(rows)}")

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    clean_k = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[clean_k] = r

c.execute("SELECT topic, status, confidence, knowledge FROM topic_knowledge")
knowledges = {}
for r in c.fetchall():
    clean_k = r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    knowledges[clean_k] = r

matched_drafts = 0
matched_k = 0
unmatched = []

audit_results = []
for r in rows:
    t = r['Topic']
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    
    in_d = key in drafts
    in_k = key in knowledges
    
    if in_d:
        matched_drafts += 1
        d_row = drafts[key]
        p = json.loads(d_row[4]) if d_row[4] else {}
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        mcqs = p.get('mcq_angles', [])
        cases = p.get('case_hooks', [])
        uncs = p.get('uncertainties', [])
        audit_results.append({
            'topic': d_row[1],
            'topic_id': d_row[0],
            'db_status': d_row[2],
            'tps_count': len(tps),
            'srcs_count': len(srcs),
            'mcqs_count': len(mcqs),
            'cases_count': len(cases),
            'uncs_count': len(uncs),
            'in_knowledge': in_k,
            'k_status': knowledges[key][1] if in_k else None,
            'csv_reason': r['Reason']
        })
    else:
        unmatched.append(t)

print(f"Matched in drafts: {matched_drafts} / {len(rows)}")
print(f"Unmatched: {len(unmatched)}")
if unmatched:
    print("Unmatched:", unmatched)

tp_under_4 = [a for a in audit_results if a['tps_count'] < 4]
src_under_4 = [a for a in audit_results if a['srcs_count'] < 4]
mcq_under_3 = [a for a in audit_results if a['mcqs_count'] < 3]
cases_under_2 = [a for a in audit_results if a['cases_count'] < 2]
unc_under_2 = [a for a in audit_results if a['uncs_count'] < 2]

print("\n--- Audit of 65 Topics in DB ---")
print(f"Teaching points < 4: {len(tp_under_4)}")
for x in tp_under_4:
    print(f"  • {x['topic']}: TPs={x['tps_count']}, Sources={x['srcs_count']}")

print(f"\nSources < 4 (since reason is 'needs 1-2 more review-grade sources'): {len(src_under_4)}")
for x in src_under_4[:10]:
    print(f"  • {x['topic']}: Sources={x['srcs_count']}, TPs={x['tps_count']}")

print(f"\nMCQs < 3: {len(mcq_under_3)}")
print(f"Cases < 2: {len(cases_under_2)}")
print(f"Uncertainties < 2: {len(unc_under_2)}")
