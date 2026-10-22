import json

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

tp_or_source = []
for t in topics:
    issues = t.get('issues', [])
    if any('TP' in iss or 'Sources' in iss or 'DB' in iss for iss in issues):
        tp_or_source.append(t)

print(f"Total topics in priority set (TP/Sources/DB): {len(tp_or_source)}")
for i, item in enumerate(tp_or_source[:20]):
    print(f"{i+1}. {item['topic']} -> {item['issues']}")
