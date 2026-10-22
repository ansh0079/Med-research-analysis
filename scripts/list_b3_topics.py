import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 3: Topics 1031-1045 ===')
for t in topics[30:45]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
