import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

b16 = [t for t in topics if 1226 <= t['no'] <= 1240]
for t in b16:
    print(f"{t['no']}: {t['topic']}")
