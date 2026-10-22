import json

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

tier1 = []
for t in topics:
    issues = t.get('issues', [])
    if any('TP' in iss or 'Sources' in iss or 'DB' in iss for iss in issues):
        tier1.append(t)

print(f"Total Tier 1 topics: {len(tier1)}")

with open('scratch_tier1_topics.json', 'w', encoding='utf-8') as f:
    json.dump(tier1, f, indent=2)

print("Saved scratch_tier1_topics.json")
