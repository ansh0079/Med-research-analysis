import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

b15 = [t for t in topics if 1211 <= t['no'] <= 1225]
for t in b15:
    print(f"{t['no']}: {t['topic']}")
