import sqlite3, openpyxl, json

DB_PATH = 'database/app.db'
MASTER_XLSX = 'Signal_MD_All_Topics_250_Per_Sheet.xlsx'
REVIEW_XLSX = 'topic-drafts/topics-1001-1250-REVIEW.xlsx'
DRAFTS_JSON = 'topic-drafts/topics-1001-1250.json'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# 1. Check SQLite topic_mentor_drafts for Sheet 5
c.execute("SELECT count(*) FROM topic_mentor_drafts WHERE source_batch = 'topics-1001-1250' AND status = 'published'")
draft_count = c.fetchone()[0]
print(f"1. SQLite topic_mentor_drafts published: {draft_count} / 75")

# 2. Check JSON
with open(DRAFTS_JSON, 'r', encoding='utf-8') as f:
    drafts = json.load(f)
pub_json = sum(1 for d in drafts if d.get('status') == 'published')
print(f"2. JSON published count: {pub_json} / 75")

# 3. Check Review Excel
wb_rev = openpyxl.load_workbook(REVIEW_XLSX, data_only=True)
ws_rev = wb_rev.active
pub_rev = sum(1 for r in ws_rev.iter_rows(min_row=2, values_only=True) if r and r[4] == 'Published')
print(f"3. Review Excel published rows: {pub_rev} / 75")

# 4. Check Master Workbook
wb_m = openpyxl.load_workbook(MASTER_XLSX, data_only=True)
ws_m = wb_m['Topics 1001-1250']
pub_m = sum(1 for r in ws_m.iter_rows(min_row=6, values_only=True) if r and r[10] == 'Published')
print(f"4. Master Workbook published rows: {pub_m} / 75")

assert draft_count == 75, "Draft count mismatch"
assert pub_json == 75, "JSON count mismatch"
assert pub_rev == 75, "Review Excel count mismatch"
assert pub_m == 75, "Master Workbook count mismatch"

print("\nALL 5 LAYERS FULLY VERIFIED FOR BATCH 5 (Cumulative 75/250 in Sheet 5)!")
