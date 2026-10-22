import json

with open('topic-drafts/topics-0251-0500.json', 'r', encoding='utf-8') as f:
    drafts = json.load(f)

for idx in [85, 86]:
    d = drafts[idx]
    print(f"Index {idx}, no={d['no']}, topicId={d['topicId']}, topic={d['topic']}")
    print(json.dumps(d['page'], indent=2))
