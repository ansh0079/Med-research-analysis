import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 2: Topics 1016-1030 ===')
for t in topics[15:30]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
