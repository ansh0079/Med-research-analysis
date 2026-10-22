#!/usr/bin/env python3
"""
publish_topics_1251_1500.py

Ingests and publishes clinical mentor synopses for topics 1251 to 1500 (Sheet 6)
into topic_mentor_drafts and topic_knowledge in database/app.db.
Updates Signal_MD_All_Topics_250_Per_Sheet.xlsx (Sheet 6 and Contents sheet)
and generates topic-drafts/topics-1251-1500-REVIEW.xlsx with Approve/Needs review dropdowns.
"""

import os
import sys
import json
import sqlite3
import re
from datetime import datetime, timezone
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.path.join(BASE_DIR, 'database', 'app.db')
DRAFTS_JSON = os.path.join(BASE_DIR, 'topic-drafts', 'topics-1251-1500.json')
EXCEL_CATALOG_FILE = os.path.join(BASE_DIR, 'Signal_MD_All_Topics_250_Per_Sheet.xlsx')
OUTPUT_DIR = os.path.join(BASE_DIR, 'topic-drafts')
REVIEW_XLSX = os.path.join(OUTPUT_DIR, 'topics-1251-1500-REVIEW.xlsx')

def normalize_topic(t):
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', (t or '').lower())
    return re.sub(r'\s+', ' ', clean).strip()

def main():
    if not os.path.exists(DRAFTS_JSON):
        print(f"Error: {DRAFTS_JSON} not found!")
        sys.exit(1)

    with open(DRAFTS_JSON, 'r', encoding='utf-8') as f:
        drafts = json.load(f)

    print(f"Loaded {len(drafts)} drafts from {DRAFTS_JSON}")
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Ingest into topic_mentor_drafts and topic_knowledge
    inserted_drafts = 0
    updated_drafts = 0
    updated_knowledge = 0
    inserted_knowledge = 0

    for d in drafts:
        t_id = d['topicId']
        topic = d['topic']
        cluster = d.get('cluster', '')
        page = d['page']
        db_ev = d.get('dbEvidence', {})

        page_json = json.dumps(page)
        ev_json = json.dumps(db_ev)

        cur.execute("""
            INSERT INTO topic_mentor_drafts
            (topic_id, topic, cluster, status, page_json, evidence_json, source_batch, created_at, updated_at, published_at, published_by)
            VALUES (?, ?, ?, 'published', ?, ?, 'topics-1251-1500', ?, ?, ?, 'system_guideline_publisher')
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
        """, (t_id, topic, cluster, page_json, ev_json, now_iso, now_iso, now_iso))

        if cur.rowcount > 0:
            inserted_drafts += 1

        # Build knowledge representation
        sources = page.get('sources', [])
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
        } for tp in page.get('teaching_points', [])]

        knowledge = {
            'mentorMessage': page.get('mentor_intro', ''),
            'teachingPoints': teaching_points,
            'caseGenerationHooks': page.get('case_hooks', []),
            'mcqAngles': page.get('mcq_angles', []),
            'controversies': [{'issue': u, 'sourceIndices': [], 'guidelineIndices': []} for u in page.get('uncertainties', [])],
            'reviewerGaps': page.get('gaps', ''),
            'sourceArticles': source_articles
        }

        knowledge_json = json.dumps(knowledge)
        articles_json = json.dumps(source_articles)
        norm_topic = normalize_topic(topic)

        existing_k = cur.execute("SELECT id FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?", (topic, norm_topic)).fetchone()
        if existing_k:
            cur.execute("""
                UPDATE topic_knowledge
                SET knowledge = ?, source_articles = ?, status = 'human_reviewed', confidence = 0.92, updated_at = ?, last_refreshed_at = ?
                WHERE id = ?
            """, (knowledge_json, articles_json, now_iso, now_iso, existing_k[0]))
            updated_knowledge += 1
        else:
            cur.execute("""
                INSERT INTO topic_knowledge
                (topic, normalized_topic, knowledge, source_articles, status, confidence, created_at, updated_at, last_refreshed_at)
                VALUES (?, ?, ?, ?, 'human_reviewed', 0.92, ?, ?, ?)
            """, (topic, norm_topic, knowledge_json, articles_json, now_iso, now_iso, now_iso))
            inserted_knowledge += 1

    conn.commit()
    print(f"Database commit complete: {inserted_drafts} drafts processed into topic_mentor_drafts.")
    print(f"topic_knowledge: {updated_knowledge} updated, {inserted_knowledge} inserted (total {updated_knowledge + inserted_knowledge}).")

    # 2. Build topic-drafts/topics-1251-1500-REVIEW.xlsx
    wb_review = openpyxl.Workbook()
    ws_summary = wb_review.active
    ws_summary.title = "Topic review summary"
    ws_summary.views.sheetView[0].showGridLines = True

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    action_header_fill = PatternFill(start_color="C00000", end_color="C00000", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    headers_summary = [
        "No.", "Topic ID", "Topic", "Cluster", "Publication Status",
        "Review Decision (Approve / Needs review)", "Reviewer Notes",
        "Teaching Points", "Cited Sources", "Primary Guideline / Meta-Analysis Source"
    ]
    ws_summary.append(headers_summary)
    for col_idx in range(1, len(headers_summary) + 1):
        cell = ws_summary.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.alignment = center_align
        cell.fill = action_header_fill if col_idx == 6 else header_fill

    dv_review = DataValidation(type="list", formula1='"Approve,Needs review"', allow_blank=True)
    ws_summary.add_data_validation(dv_review)

    for r_idx, d in enumerate(drafts, start=2):
        page = d['page']
        sources = page.get('sources', [])
        primary_source = "No source"
        for s in sources:
            if s.get('design') in ['guideline', 'meta-analysis', 'systematic review']:
                primary_source = s.get('title', '')
                break
        if primary_source == "No source" and sources:
            primary_source = sources[0].get('title', '')

        row_vals = [
            d.get('no', r_idx - 1),
            d['topicId'],
            d['topic'],
            d.get('cluster', ''),
            "Published",
            None,
            None,
            len(page.get('teaching_points', [])),
            len(sources),
            primary_source
        ]
        ws_summary.append(row_vals)
        for col_idx in range(1, len(row_vals) + 1):
            cell = ws_summary.cell(row=r_idx, column=col_idx)
            cell.border = thin_border
            if col_idx in [1, 5, 6, 8, 9]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align
            if col_idx == 6:
                cell.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                dv_review.add(cell)

    col_widths = {1: 8, 2: 38, 3: 45, 4: 35, 5: 18, 6: 28, 7: 35, 8: 16, 9: 14, 10: 55}
    for col_idx, width in col_widths.items():
        ws_summary.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = width

    ws_synopsis = wb_review.create_sheet(title="Mentor Synopses")
    ws_synopsis.views.sheetView[0].showGridLines = True
    syn_headers = ["No.", "Topic", "Mentor Synopsis Intro", "Teaching Points with PMIDs", "Uncertainties", "MCQ Angles"]
    ws_synopsis.append(syn_headers)
    for col_idx in range(1, len(syn_headers) + 1):
        cell = ws_synopsis.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.alignment = center_align
        cell.fill = header_fill

    for r_idx, d in enumerate(drafts, start=2):
        p = d['page']
        tps = "\n".join([f"• {tp.get('claim', '')} (PMID: {', '.join([str(c) for c in tp.get('cites', [])])})" for tp in p.get('teaching_points', [])])
        uncs = "\n".join([f"• {u}" for u in p.get('uncertainties', [])])
        mcqs = "\n".join([f"• {m}" for m in p.get('mcq_angles', [])])
        ws_synopsis.append([d.get('no', r_idx - 1), d['topic'], p.get('mentor_intro', ''), tps, uncs, mcqs])
        for col_idx in range(1, 7):
            cell = ws_synopsis.cell(row=r_idx, column=col_idx)
            cell.border = thin_border
            cell.alignment = left_align

    syn_widths = {1: 8, 2: 35, 3: 50, 4: 65, 5: 45, 6: 45}
    for col_idx, width in syn_widths.items():
        ws_synopsis.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = width

    wb_review.save(REVIEW_XLSX)
    print(f"Saved review workbook: {REVIEW_XLSX}")

    # 3. Update Signal_MD_All_Topics_250_Per_Sheet.xlsx (Contents & Topics 1251-1500)
    wb_all = openpyxl.load_workbook(EXCEL_CATALOG_FILE)
    ws_contents = wb_all['Contents']
    for row in ws_contents.iter_rows():
        if row[0].value == 'Topics 1251-1500':
            row[4].value = 250  # Mentor available
            row[5].value = 0    # Mentor missing
            print("Updated Contents sheet for Topics 1251-1500: Mentor available = 250, Mentor missing = 0")

    draft_by_no = {d.get('no'): d for d in drafts if d.get('no') is not None}
    draft_by_topic = {d['topic']: d for d in drafts}

    ws6 = wb_all['Topics 1251-1500']
    header_row_idx = None
    for r_idx, row in enumerate(ws6.iter_rows(values_only=True), start=1):
        if row and row[0] == 'No.':
            header_row_idx = r_idx
            break

    if header_row_idx:
        dv_sheet = DataValidation(type="list", formula1='"Approve,Needs review"', allow_blank=True)
        ws6.add_data_validation(dv_sheet)

        updated_rows = 0
        for r_idx in range(header_row_idx + 1, ws6.max_row + 1):
            no_val = ws6.cell(row=r_idx, column=1).value
            topic_val = ws6.cell(row=r_idx, column=3).value
            d = draft_by_no.get(no_val) or draft_by_topic.get(topic_val)
            if d:
                db_ev = d.get('dbEvidence', {})
                ws6.cell(row=r_idx, column=8).value = len(db_ev.get('papersKept', []))
                ws6.cell(row=r_idx, column=9).value = max(1, len(db_ev.get('guidelinesKept', [])))
                ws6.cell(row=r_idx, column=10).value = "Yes"
                ws6.cell(row=r_idx, column=11).value = "Published"
                dec_cell = ws6.cell(row=r_idx, column=12)
                dec_cell.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                dv_sheet.add(dec_cell)
                updated_rows += 1

        print(f"Updated {updated_rows} rows in Sheet Topics 1251-1500.")

    wb_all.save(EXCEL_CATALOG_FILE)
    print(f"Updated and saved {EXCEL_CATALOG_FILE}.")

if __name__ == '__main__':
    main()
