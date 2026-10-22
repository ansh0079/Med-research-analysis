import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 5: Topics 1061-1075 ===')
for t in topics[60:75]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
