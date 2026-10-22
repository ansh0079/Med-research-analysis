import json

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    deficient = json.load(f)

tps_under_4 = [d for d in deficient if any('TP count < 4' in iss for iss in d.get('issues', []))]
print(f"Total topics with TP < 4: {len(tps_under_4)}")

for d in tps_under_4[:15]:
    print(f"• {d['topic']}: TP={d.get('tp_count')}, issues={d.get('issues')}")
