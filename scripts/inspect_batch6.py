import json

with open('topic-drafts/topics-0251-0500.json', 'r', encoding='utf-8') as f:
    drafts = json.load(f)

for idx in range(75, 90):
    d = drafts[idx]
    print(f"[{d['no']}] {d['topicId']}: {d['topic']}")
    print(f"  Cluster: {d.get('cluster')}")
    print(f"  Sources in JSON: {len(d.get('page', {}).get('sources', []))}")
