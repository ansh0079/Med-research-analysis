import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

b17 = [t for t in topics if 1241 <= t['no'] <= 1250]
for t in b17:
    print(f"{t['no']}: {t['topic']}")
