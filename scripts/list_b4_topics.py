import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 4: Topics 1046-1060 ===')
for t in topics[45:60]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
