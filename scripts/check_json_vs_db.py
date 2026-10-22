import sqlite3
import json
import glob
import os

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# Get all topic_mentor_drafts from SQLite DB
c.execute("SELECT topic_id, topic, status, page_json, evidence_json, source_batch FROM topic_mentor_drafts")
rows = c.fetchall()
print(f"Total rows in DB topic_mentor_drafts: {len(rows)}")

db_map = {r[0]: r for r in rows}

# Check main 8 range JSON files
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

diff_count = 0
for rf in range_files:
    p = os.path.join('topic-drafts', rf)
    if not os.path.exists(p):
        print(f"Missing {p}")
        continue
    with open(p, 'r', encoding='utf-8') as f:
        items = json.load(f)
    for it in items:
        tid = it['topicId']
        if tid in db_map:
            db_row = db_map[tid]
            db_page = json.loads(db_row[3]) if db_row[3] else {}
            json_page = it.get('page') or {}
            db_tps = len(db_page.get('teaching_points') or [])
            json_tps = len(json_page.get('teaching_points') or [])
            db_srcs = len(db_page.get('sources') or [])
            json_srcs = len(json_page.get('sources') or [])
            if db_tps != json_tps or db_srcs != json_srcs or it.get('status') != db_row[2]:
                diff_count += 1

print(f"Total topics differing between DB and range JSON files: {diff_count}")
