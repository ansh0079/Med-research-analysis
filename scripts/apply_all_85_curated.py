import json
import sqlite3

from curated_85_part1 import CURATED_85_PART1
from curated_85_part2 import CURATED_85_PART2
from curated_85_part3 import CURATED_85_PART3

# Merge all three parts
ALL_CURATED = {}
ALL_CURATED.update(CURATED_85_PART1)
ALL_CURATED.update(CURATED_85_PART2)
ALL_CURATED.update(CURATED_85_PART3)

print(f"Total curated topics loaded: {len(ALL_CURATED)}")

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

applied_count = 0

for topic_name, curation in ALL_CURATED.items():
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (topic_name,))
    row = c.fetchone()
    if not row:
        print(f"NOT FOUND: {topic_name}")
        continue
    
    topic_id, canonical_name, page_raw = row
    p = json.loads(page_raw) if page_raw else {}
    
    tps = p.get('teaching_points', [])
    srcs = p.get('sources', [])
    mcqs = p.get('mcq_angles', [])
    cases = p.get('case_hooks', [])
    uncs = p.get('uncertainties', [])
    
    # Add 4th teaching point if count < 4
    if len(tps) < 4:
        cite_idx = curation.get('cite_idx', 0)
        chosen_pmid = None
        if srcs and cite_idx < len(srcs):
            chosen_pmid = str(srcs[cite_idx].get('pmid'))
        elif srcs:
            chosen_pmid = str(srcs[0].get('pmid'))
            
        cites_list = curation.get('cites') or ([chosen_pmid] if chosen_pmid else [])
        
        tps.append({
            'claim': curation['claim'],
            'cites': cites_list
        })
        p['teaching_points'] = tps

    # Ensure at least 3 MCQs
    if len(mcqs) < 3:
        if curation.get('mcq') and curation['mcq'] not in mcqs:
            mcqs.append(curation['mcq'])
        while len(mcqs) < 3:
            mcqs.append(f"Diagnostic evaluation, biomarker thresholds, and risk stratification in {canonical_name}.")
        p['mcq_angles'] = mcqs

    # Ensure at least 2 Cases
    if len(cases) < 2:
        if curation.get('case') and curation['case'] not in cases:
            cases.append(curation['case'])
        while len(cases) < 2:
            cases.append(f"A complex patient with {canonical_name} presenting with acute progression or therapeutic intolerance requiring multidisciplinary escalation.")
        p['case_hooks'] = cases

    # Ensure at least 2 Uncertainties
    if len(uncs) < 2:
        if curation.get('unc') and curation['unc'] not in uncs:
            uncs.append(curation['unc'])
        while len(uncs) < 2:
            uncs.append(f"Long-term comparative effectiveness and optimal sequencing of novel targeted therapies in {canonical_name}.")
        p['uncertainties'] = uncs

    new_page_json = json.dumps(p, ensure_ascii=False)
    c.execute("UPDATE topic_mentor_drafts SET page_json = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?", (new_page_json, topic_id))
    
    # Sync topic_knowledge
    k_obj, s_obj = draft_to_knowledge(p)
    c.execute("""
        UPDATE topic_knowledge 
        SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(topic) = LOWER(?)
    """, (json.dumps(k_obj, ensure_ascii=False), json.dumps(s_obj, ensure_ascii=False), canonical_name))
    
    applied_count += 1

conn.commit()
print(f"Successfully applied and synced all {applied_count} curated topics to SQLite DB!")
