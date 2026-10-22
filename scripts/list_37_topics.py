import json

with open('scratch_detailed_125.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

only_needs_source = [it for it in items if it['tp_count'] >= 4 and it['src_count'] < 2]

print(f"Total topics needing 2nd source: {len(only_needs_source)}")
for i, it in enumerate(only_needs_source):
    s = it['sources'][0] if it['sources'] else {}
    print(f"{i+1}. {it['topic']} -> Existing PMID {s.get('pmid')}: {s.get('title')[:60]}...")
