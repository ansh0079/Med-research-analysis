import json

with open('scratch_audit_batch_new.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

depth_only = []
for it in items:
    # already has >= 4 TPs and >= 2 sources
    if it['tps_count'] >= 4 and it['srcs_count'] >= 2:
        if it['mcqs_count'] < 3 or it['cases_count'] < 2 or it['uncs_count'] < 2:
            depth_only.append(it)

print(f"Total depth-only topics to enhance: {len(depth_only)}")
with open('scratch_batch_new_depth_only.json', 'w', encoding='utf-8') as out:
    json.dump(depth_only, out, indent=2)

for d in depth_only[:10]:
    print(f"• {d['topic']}: MCQs={d['mcqs_count']}, Cases={d['cases_count']}, Uncs={d['uncs_count']}")
