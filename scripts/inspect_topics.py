import json

with open('topic-drafts/topics-0251-0500.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for idx in range(165, 180):
    t = data[idx]
    print(f"{idx+251}: {t.get('topic')}")
