import json

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    deficient = json.load(f)

sources_under_2 = [d for d in deficient if any('Sources < 2' in iss for iss in d.get('issues', []))]
print(f"Total topics with sources < 2: {len(sources_under_2)}")

for d in sources_under_2[:15]:
    print(f"• {d['topic']}: src_count={d.get('src_count')}, issues={d.get('issues')}")
