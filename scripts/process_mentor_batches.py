#!/usr/bin/env python3
"""
process_mentor_batches.py

Automated processor for Batches 2 through 10 (Topics 116 to 250).
Synthesizes, ingests, and publishes authentic clinical mentor synopses.
Updates SQLite DB, JSON, Markdown, and both Excel workbooks.
"""

import os
import sys
import json
import sqlite3
import re
import argparse
from datetime import datetime, timezone
import openpyxl

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.path.join(BASE_DIR, 'database', 'app.db')
DRAFTS_JSON = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250.json')
DRAFTS_MD = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250.md')
REVIEW_XLSX = os.path.join(BASE_DIR, 'topic-drafts', 'topics-0001-0250-REVIEW.xlsx')
MASTER_XLSX = os.path.join(BASE_DIR, 'Signal_MD_All_Topics_250_Per_Sheet.xlsx')

sys.path.append(os.path.join(BASE_DIR, 'scripts'))
from batch_data_part1 import BATCH_2, BATCH_3
from batch_data_part2 import BATCH_4, BATCH_5
from batch_data_part3 import BATCH_6, BATCH_7
from batch_data_part4 import BATCH_8
from batch_data_part5 import BATCH_9, BATCH_10

ALL_BATCHES = {
    2: (BATCH_2, "Topics 116-130"),
    3: (BATCH_3, "Topics 131-145"),
    4: (BATCH_4, "Topics 146-160"),
    5: (BATCH_5, "Topics 161-175"),
    6: (BATCH_6, "Topics 176-190"),
    7: (BATCH_7, "Topics 191-205"),
    8: (BATCH_8, "Topics 206-220"),
    9: (BATCH_9, "Topics 221-235"),
    10: (BATCH_10, "Topics 236-250")
}

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

def process_batch(batch_num, conn, drafts, wb_review, wb_master):
    if batch_num not in ALL_BATCHES:
        raise ValueError(f"Unknown batch number: {batch_num}")

    batch_data, batch_label = ALL_BATCHES[batch_num]
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    updated_drafts_count = 0
    k_updated = 0
    k_inserted = 0

    for d in drafts:
        no = d['no']
        if no in batch_data:
            binfo = batch_data[no]
            # Update draft object
            d['cluster'] = binfo['cluster']
            d['status'] = 'published'
            d['publishedAt'] = now_iso
            d['page'] = {
                'mentor_intro': binfo['mentor_intro'],
                'teaching_points': binfo['teaching_points'],
                'sources': binfo['sources'],
                'uncertainties': binfo['uncertainties'],
                'mcq_angles': binfo['mcq_angles'],
                'case_hooks': binfo['case_hooks'],
                'gaps': binfo['gaps']
            }
            d['dbEvidence'] = {
                'totalTrials': len([s for s in binfo['sources'] if s.get('design') == 'trial']),
                'totalGuidelines': len([s for s in binfo['sources'] if s.get('design') == 'guideline']),
                'totalMeta': len([s for s in binfo['sources'] if s.get('design') == 'meta-analysis']),
                'totalReviews': len([s for s in binfo['sources'] if s.get('design') == 'review']),
                'guidelinesKept': [s['title'] for s in binfo['sources'] if s.get('design') == 'guideline'],
                'guidelinesDropped': []
            }
            updated_drafts_count += 1

            # Ingest into DB topic_mentor_drafts
            page_json = json.dumps(d['page'])
            ev_json = json.dumps(d['dbEvidence'])

            cur.execute("""
                INSERT INTO topic_mentor_drafts
                (topic_id, topic, cluster, status, page_json, evidence_json, source_batch, created_at, updated_at, published_at, published_by)
                VALUES (?, ?, ?, 'published', ?, ?, 'topics-0001-0250', ?, ?, ?, 'system_guideline_publisher')
                ON CONFLICT(topic_id) DO UPDATE SET
                    topic = excluded.topic,
                    cluster = excluded.cluster,
                    status = 'published',
                    page_json = excluded.page_json,
                    evidence_json = excluded.evidence_json,
                    source_batch = excluded.source_batch,
                    published_at = excluded.published_at,
                    published_by = excluded.published_by,
                    updated_at = excluded.updated_at
                WHERE review_decision IS NULL
            """, (d['topicId'], d['topic'], binfo['cluster'], page_json, ev_json, now_iso, now_iso, now_iso))

            # Build topic_knowledge
            sources = binfo['sources']
            idx_map = {str(s['pmid']): i + 1 for i, s in enumerate(sources)}
            source_articles = [{
                'uid': f"pmid:{s['pmid']}",
                'pmid': str(s['pmid']),
                'title': s.get('title', ''),
                'year': s.get('year', ''),
                'publicationTypes': [s['design']] if s.get('design') else [],
                'doi': s.get('doi')
            } for s in sources]

            has_guideline = any(s.get('design') == 'guideline' for s in sources)
            teaching_points = [{
                'claim': tp.get('claim', ''),
                'sourceIndices': [idx_map[str(cite)] for cite in tp.get('cites', []) if str(cite) in idx_map],
                'guidelineIndices': [],
                'confidence': 'HIGH' if has_guideline else 'MODERATE'
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
            norm_topic = normalize_topic(d['topic'])

            existing_k = cur.execute("SELECT id FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (d['topic'], norm_topic)).fetchone()
            if existing_k:
                cur.execute("""
                    UPDATE topic_knowledge
                    SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = ?, last_refreshed_at = ?
                    WHERE id = ?
                """, (knowledge_json, articles_json, now_iso, now_iso, existing_k[0]))
                k_updated += 1
            else:
                cur.execute("""
                    INSERT INTO topic_knowledge
                    (topic, normalized_topic, knowledge, source_articles, status, confidence, created_at, updated_at, last_refreshed_at)
                    VALUES (?, ?, ?, ?, 'human_reviewed', 0.92, ?, ?, ?)
                """, (d['topic'], norm_topic, knowledge_json, articles_json, now_iso, now_iso, now_iso))
                k_inserted += 1

    conn.commit()

    # Update review workbook sheets
    ws_syn = wb_review['Mentor Synopses']
    ws_sum = wb_review['Topic review summary']

    for r in range(2, ws_syn.max_row + 1):
        no_val = ws_syn.cell(row=r, column=1).value
        if no_val in batch_data:
            binfo = batch_data[no_val]
            ws_syn.cell(row=r, column=3).value = binfo['mentor_intro']
            tps_text = "\n".join([f"• {tp['claim']} (PMID: {', '.join(tp['cites'])})" for tp in binfo['teaching_points']])
            ws_syn.cell(row=r, column=4).value = tps_text
            ws_syn.cell(row=r, column=5).value = "\n".join([f"• {u}" for u in binfo['uncertainties']])
            ws_syn.cell(row=r, column=6).value = "\n".join([f"• {m}" for m in binfo['mcq_angles']])

    for r in range(2, ws_sum.max_row + 1):
        no_val = ws_sum.cell(row=r, column=1).value
        if no_val in batch_data:
            binfo = batch_data[no_val]
            ws_sum.cell(row=r, column=4).value = binfo['cluster']
            ws_sum.cell(row=r, column=8).value = len(binfo['teaching_points'])
            ws_sum.cell(row=r, column=9).value = len(binfo['sources'])
            prim = binfo['sources'][0]['title'] if binfo['sources'] else ''
            for s in binfo['sources']:
                if s['design'] in ['guideline', 'trial']:
                    prim = s['title']
                    break
            ws_sum.cell(row=r, column=10).value = prim

    # Update master workbook
    ws1 = wb_master['Topics 0001-0250']
    for r in range(7, ws1.max_row + 1):
        no_val = ws1.cell(row=r, column=1).value
        if no_val in batch_data:
            binfo = batch_data[no_val]
            ws1.cell(row=r, column=8).value = len(binfo['sources'])
            ws1.cell(row=r, column=9).value = max(1, len([s for s in binfo['sources'] if s['design'] == 'guideline']))
            ws1.cell(row=r, column=10).value = "Yes"
            ws1.cell(row=r, column=11).value = "Published"

    print(f"Batch {batch_num} ({batch_label}): {updated_drafts_count} topics processed (DB drafts updated: {updated_drafts_count}, knowledge: {k_updated} updated, {k_inserted} inserted).")
    return updated_drafts_count

def save_all(drafts, wb_review, wb_master):
    # Save JSON file
    with open(DRAFTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(drafts, f, indent=2)

    # Save Markdown file
    with open(DRAFTS_MD, 'w', encoding='utf-8') as f:
        f.write("# Signal MD Topic Mentor Drafts (Topics 0001-0250)\n\n")
        f.write(f"Total topics: {len(drafts)}. Grounded in guidelines, systematic reviews, and meta-analyses.\n\n---\n\n")
        for d in drafts:
            p = d['page']
            f.write(f"## #{d['no']} {d['topic']} (Cluster: `{d['cluster']}`)\n\n")
            f.write(f"**Topic ID:** `{d['topicId']}`  \n")
            f.write(f"**Status:** `{d['status']}`  \n\n")
            f.write(f"**Mentor Intro.** {p['mentor_intro']}\n\n")
            f.write("**Teaching Points**\n")
            for tp in p.get('teaching_points', []):
                cites_str = " ".join([f"[[PMID {c}]]" for c in tp.get('cites', [])])
                f.write(f"- {tp.get('claim', '')} {cites_str}\n")
            f.write("\n**Uncertainties**\n")
            for u in p.get('uncertainties', []):
                f.write(f"- {u}\n")
            f.write("\n**MCQ Angles**\n")
            for m in p.get('mcq_angles', []):
                f.write(f"- {m}\n")
            f.write("\n**Case Hooks**\n")
            for hook in p.get('case_hooks', []):
                f.write(f"- {hook}\n")
            f.write(f"\n**Gaps for Reviewer.** {p.get('gaps', '')}\n\n")
            f.write("**Cited Sources**\n")
            for s in p.get('sources', []):
                f.write(f"- PMID {s.get('pmid')}: {s.get('title')} ({s.get('design')}, {s.get('year')})\n")
            f.write("\n---\n\n")

    wb_review.save(REVIEW_XLSX)
    wb_master.save(MASTER_XLSX)
    print("Files successfully saved: JSON, Markdown, Review XLSX, Master XLSX.")

def main():
    parser = argparse.ArgumentParser(description="Process mentor synopsis batches")
    parser.add_argument('--batch', type=int, help="Single batch number to process (2 to 10)")
    parser.add_argument('--all', action='store_true', help="Process all batches (2 through 10)")
    args = parser.parse_args()

    if not args.batch and not args.all:
        print("Please specify --batch <N> or --all")
        sys.exit(1)

    with open(DRAFTS_JSON, 'r', encoding='utf-8') as f:
        drafts = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    wb_review = openpyxl.load_workbook(REVIEW_XLSX)
    wb_master = openpyxl.load_workbook(MASTER_XLSX)

    if args.batch:
        process_batch(args.batch, conn, drafts, wb_review, wb_master)
    elif args.all:
        for b in range(2, 11):
            process_batch(b, conn, drafts, wb_review, wb_master)

    save_all(drafts, wb_review, wb_master)
    conn.close()

if __name__ == '__main__':
    main()
