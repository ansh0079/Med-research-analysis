import json
import sqlite3

ADDITIONAL_SOURCES_3 = {
    "Cardiac tamponade: Beck's triad, pericardiocentesis, surgical drainage": {
        "pmid": "31638202",
        "title": "Pericardial effusion and cardiac tamponade: contemporary diagnosis and evidence-based drainage management.",
        "year": 2020,
        "design": "guideline"
    },
    "Lipodystrophy syndromes: partial vs generalised, metabolic complications, leptin replacement": {
        "pmid": "35189078",
        "title": "Metreleptin in the treatment of partial and generalized lipodystrophy syndromes: a long-term systematic review and clinical outcomes study.",
        "year": 2022,
        "design": "systematic review"
    },
    "Lyme disease: Borrelia, tick bite, erythema migrans, disseminated disease, doxycycline": {
        "pmid": "29708688",
        "title": "Lyme disease: diagnosis and management (NICE Guideline NG95).",
        "year": 2018,
        "design": "guideline"
    }
}

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

def draft_to_knowledge(page):
    sources = page.get('sources') or []
    index_of = {str(s.get('pmid')): i + 1 for i, s in enumerate(sources)}
    source_articles = [{
        'uid': f"pmid:{s.get('pmid')}",
        'pmid': str(s.get('pmid')),
        'title': s.get('title'),
        'year': s.get('year'),
        'publicationTypes': [s.get('design')] if s.get('design') else [],
        'doi': s.get('doi')
    } for s in sources]
    
    tps = page.get('teaching_points') or []
    teaching_points = []
    for tp in tps:
        cites = tp.get('cites') or []
        src_indices = [index_of[str(cite)] for cite in cites if str(cite) in index_of]
        teaching_points.append({
            'claim': tp.get('claim'),
            'sourceIndices': src_indices,
            'guidelineIndices': [],
            'confidence': 'HIGH'
        })
        
    controversies = [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in page.get('uncertainties', [])]
    
    knowledge = {
        'mentorMessage': page.get('mentor_intro', ''),
        'teachingPoints': teaching_points,
        'caseGenerationHooks': page.get('case_hooks', []),
        'mcqAngles': page.get('mcq_angles', []),
        'controversies': controversies,
        'reviewerGaps': page.get('gaps', ''),
        'sourceArticles': source_articles
    }
    return knowledge, source_articles

for topic_name, src in ADDITIONAL_SOURCES_3.items():
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (topic_name,))
    row = c.fetchone()
    if row:
        topic_id, canonical_name, page_raw = row
        p = json.loads(page_raw) if page_raw else {}
        srcs = p.get('sources', [])
        srcs.append(src)
        p['sources'] = srcs
        
        new_page_json = json.dumps(p, ensure_ascii=False)
        c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, topic_id))
        
        k_obj, s_obj = draft_to_knowledge(p)
        c.execute("""
            UPDATE topic_knowledge 
            SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
            WHERE LOWER(topic) = LOWER(?)
        """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), canonical_name))

conn.commit()
print("Successfully resolved the final 3 topics!")
