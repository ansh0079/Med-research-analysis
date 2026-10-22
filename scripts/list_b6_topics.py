import json

with open('scratch/sheet5_topics_list.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print('=== Sheet 5 Batch 6: Topics 1076-1090 ===')
for t in topics[75:90]:
    print(str(t['no']) + ': ' + t['topic'] + ' | ID: ' + t['topicId'])
