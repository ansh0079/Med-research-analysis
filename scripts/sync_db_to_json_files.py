import sqlite3
import json
import os
from datetime import datetime

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, page_json, evidence_json, source_batch, published_at FROM topic_mentor_drafts")
rows = c.fetchall()

db_by_id = {}
db_by_topic = {}
for r in rows:
    t_id, topic, status, page_json, ev_json, batch, pub_at = r
    clean_k = topic.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    page = json.loads(page_json) if page_json else {}
    data = {
        'topic_id': t_id,
        'topic': topic,
        'status': status,
        'page': page,
        'published_at': pub_at or datetime.utcnow().isoformat() + 'Z'
    }
    db_by_id[t_id] = data
    db_by_topic[clean_k] = data

range_files = [
    'topics-0001-0250.json',
    'topics-0251-0500.json',
    'topics-0501-0750.json',
    'topics-0751-1000.json',
    'topics-1001-1250.json',
    'topics-1251-1500.json',
    'topics-1501-1750.json',
    'topics-1751-1875.json'
]

total_updated = 0
total_items = 0

for rf in range_files:
    file_path = os.path.join('topic-drafts', rf)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    file_updated = 0
    for it in items:
        total_items += 1
        tid = it.get('topicId')
        topic_name = it.get('topic', '')
        clean_k = topic_name.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
        
        db_match = db_by_id.get(tid) or db_by_topic.get(clean_k)
        if db_match:
            # Check if updated
            old_tps = len(it.get('page', {}).get('teaching_points', []))
            new_tps = len(db_match['page'].get('teaching_points', []))
            old_srcs = len(it.get('page', {}).get('sources', []))
            new_srcs = len(db_match['page'].get('sources', []))
            old_status = it.get('status')
            
            if old_tps != new_tps or old_srcs != new_srcs or old_status != db_match['status'] or it.get('page') != db_match['page']:
                it['page'] = db_match['page']
                it['status'] = db_match['status']
                if db_match['status'] == 'published' and not it.get('publishedAt'):
                    it['publishedAt'] = db_match['published_at']
                file_updated += 1
                total_updated += 1
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"{rf}: updated {file_updated} / {len(items)} items")

print(f"\nFinished sync! Total items updated across all 8 range files: {total_updated} / {total_items}")
