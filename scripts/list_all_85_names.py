import json

with open('scratch_remaining_85.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

for i, t in enumerate(topics):
    print(f"{i+1:2d}. {t['topic']}")
