import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 1: Topics 1001-1015 ===')
for t in topics[:15]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
