import sqlite3
import json
from datetime import datetime, timezone

from data_batch_0251_0265 import BATCH_SHEET2_B1

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()
now_iso = datetime.now(timezone.utc).isoformat()

binfo = BATCH_SHEET2_B1[257]
sources = binfo['sources']
idx_map = {str(s['pmid']): i + 1 for i, s in enumerate(sources)}
source_articles = [{
    'pmid': str(s['pmid']),
    'title': s.get('title', ''),
    'year': s.get('year', ''),
    'design': s.get('design', '')
} for s in sources]

teaching_points = [{
    'claim': tp.get('claim', ''),
    'sourceIndices': [idx_map[str(cite)] for cite in tp.get('cites', []) if str(cite) in idx_map],
    'guidelineIndices': [],
    'confidence': 'HIGH'
} for tp in binfo['teaching_points']]

knowledge = {
    'mentorMessage': binfo['mentor_intro'],
    'teachingPoints': teaching_points,
    'caseGenerationHooks': binfo['case_hooks'],
    'mcqAngles': binfo['mcq_angles'],
    'controversies': [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in binfo['uncertainties']],
    'reviewerGaps': binfo['gaps'],
    'sourceArticles': source_articles
}

knowledge_json = json.dumps(knowledge)
articles_json = json.dumps(source_articles)

cur.execute("""
    INSERT INTO topic_knowledge
    (topic, normalized_topic, knowledge, source_articles, status, confidence, created_at, updated_at, last_refreshed_at)
    VALUES (?, ?, ?, ?, 'human_reviewed', 0.92, ?, ?, ?)
    ON CONFLICT(topic) DO UPDATE SET
        knowledge = excluded.knowledge,
        source_articles = excluded.source_articles,
        status = 'human_reviewed',
        confidence = 0.92,
        updated_at = excluded.updated_at
""", (
    'Biologic therapy pre-treatment infection screening',
    'biologic therapy pre-treatment infection screening',
    knowledge_json,
    articles_json,
    now_iso,
    now_iso,
    now_iso
))

conn.commit()
conn.close()
print("Fixed #257 in topic_knowledge successfully!")
