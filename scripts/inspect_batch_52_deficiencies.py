import json

with open('scratch/audit_batch_52_results.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

deficient = [x for x in items if x['tps_count'] < 4 or x['sources_count'] < 2 or x['mcqs_count'] < 3 or x['cases_count'] < 2 or x['uncs_count'] < 2]

print(f"Total Deficient: {len(deficient)}")
for d in deficient:
    print(f"\n• {d['db_topic']} (ID: {d['topic_id']}):")
    print(f"   TPs: {d['tps_count']} | Sources: {d['sources_count']} | MCQs: {d['mcqs_count']} | Cases: {d['cases_count']} | Unc: {d['uncs_count']}")
    print(f"   Draft Status: {d['draft_status']} | K Status: {d['k_status']} (conf: {d['k_conf']})")
