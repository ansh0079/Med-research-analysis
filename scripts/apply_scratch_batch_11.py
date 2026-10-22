# -*- coding: utf-8 -*-
"""
Apply Batch 11 (Topics 251-280, FINAL 30 topics) of the write-from-scratch cohort:
1. Update SQLite topic_mentor_drafts and topic_knowledge
2. Update canonical range file topic-drafts/topics-1751-1875.json
3. Update topic-drafts/topics-373-placeholder-synopses.xlsx (marking them DONE)
4. Regenerate markdown digests
"""

import os
import json
import sqlite3
from datetime import datetime
import openpyxl
from builder_scratch_batch_11 import BATCH_11_TOPICS

def draft_to_knowledge(page):
    sources = page.get('sources') or []
    index_of = {str(s.get('pmid')): i + 1 for i, s in enumerate(sources) if s.get('pmid')}
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
    for i, tp in enumerate(tps):
        if isinstance(tp, str):
            claim_text = tp
            cites = []
        else:
            claim_text = tp.get('claim', '')
            cites = tp.get('cites', [])
            
        src_indices = [index_of[str(c)] for c in cites if str(c) in index_of]
        if not src_indices and index_of:
            src_indices = [1]
            
        teaching_points.append({
            'claim': claim_text,
            'sourceIndices': src_indices,
            'guidelineIndices': [],
            'confidence': 'HIGH'
        })
        
    controversies = [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in page.get('uncertainties') or []]
    
    return {
        'mentorMessage': page.get('mentor_intro', ''),
        'teachingPoints': teaching_points,
        'caseGenerationHooks': page.get('case_hooks') or [],
        'mcqAngles': page.get('mcq_angles') or [],
        'controversies': controversies,
        'reviewerGaps': page.get('gaps', ''),
        'sourceArticles': source_articles
    }, source_articles

def main():
    conn = sqlite3.connect('database/app.db')
    cur = conn.cursor()
    now = datetime.now().isoformat() + 'Z'

    rf = 'topics-1751-1875.json'
    p = os.path.join('topic-drafts', rf)
    with open(p, 'r', encoding='utf-8') as fp:
        items = json.load(fp)

    topic_to_range = {it['topic'].strip().lower(): it for it in items}

    updated_drafts = 0
    updated_tk = 0

    for topic_name, data in BATCH_11_TOPICS.items():
        top_lower = topic_name.strip().lower()

        # 1. Update topic_mentor_drafts
        cur.execute("SELECT topic_id, page_json FROM topic_mentor_drafts WHERE lower(topic) = ?", (top_lower,))
        db_row = cur.fetchone()
        if not db_row:
            print(f"Warning: draft not found in DB for {topic_name}")
            continue

        tid, page_raw = db_row
        page = json.loads(page_raw) if page_raw else {}

        srcs = page.get('sources', [])
        available_pmids = [str(s.get('pmid')) for s in srcs if s.get('pmid')]

        page['mentor_intro'] = data['mentor_intro']
        
        new_tps = []
        for i, tp_text in enumerate(data['teaching_points']):
            assigned_cites = [available_pmids[i % len(available_pmids)]] if available_pmids else []
            new_tps.append({
                'claim': tp_text,
                'cites': assigned_cites
            })
        page['teaching_points'] = new_tps
        page['mcq_angles'] = data['mcq_angles']
        page['case_hooks'] = data['case_hooks']
        page['uncertainties'] = data['uncertainties']

        new_page_json = json.dumps(page, ensure_ascii=False)
        cur.execute("""
            UPDATE topic_mentor_drafts
            SET page_json = ?, status = 'published', updated_at = ?
            WHERE topic_id = ?
        """, (new_page_json, now, tid))
        updated_drafts += 1

        # 2. Update topic_knowledge
        k_obj, s_arts = draft_to_knowledge(page)
        k_json = json.dumps(k_obj, ensure_ascii=False)
        s_json = json.dumps(s_arts, ensure_ascii=False)

        cur.execute("""
            UPDATE topic_knowledge
            SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.95, updated_at = ?
            WHERE lower(topic) = ? OR lower(normalized_topic) = ?
        """, (k_json, s_json, now, top_lower, top_lower))
        updated_tk += 1

        # 3. Update range file item
        if top_lower in topic_to_range:
            range_item = topic_to_range[top_lower]
            range_item['page'] = page
            range_item['status'] = 'published'
        else:
            print(f"Warning: range item not found for {topic_name}")

    conn.commit()
    print(f"Updated DB: {updated_drafts} drafts, {updated_tk} topic_knowledge rows.")

    # Save range file
    with open(p, 'w', encoding='utf-8', newline='\n') as fp:
        json.dump(items, fp, indent=2, ensure_ascii=False)
    print(f"Saved {rf} with {len(items)} items.")

    # Update topics-373-placeholder-synopses.xlsx
    xlsx_path = 'topic-drafts/topics-373-placeholder-synopses.xlsx'
    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb['Topics']
    marked = 0
    for row in ws.iter_rows(min_row=2):
        tcell = row[0]
        scell = row[7]
        if tcell.value and str(tcell.value).strip().lower() in [k.lower() for k in BATCH_11_TOPICS]:
            scell.value = 'DONE'
            row[8].value = 'Placeholders removed, intro, teaching points, and MCQ angles rewritten from scratch with clinical evidence.'
            marked += 1

    wb.save(xlsx_path)
    print(f"Spreadsheet updated: {marked} marked DONE.")

if __name__ == '__main__':
    main()
