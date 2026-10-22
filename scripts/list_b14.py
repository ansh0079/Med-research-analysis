import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

b14 = [t for t in topics if 1196 <= t['no'] <= 1210]
for t in b14:
    print(f"{t['no']}: {t['topic']} (Cluster: {t.get('cluster', 'N/A')})")
