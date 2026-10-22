import sqlite3, json, openpyxl

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()

# Check topic_mentor_drafts published
cur.execute("SELECT count(*) FROM topic_mentor_drafts WHERE status='published'")
total_pub_drafts = cur.fetchone()[0]

# Check sheet 5 drafts published
with open('topic-drafts/topics-1001-1250.json', 'r', encoding='utf-8') as f:
    drafts = json.load(f)
pub_sheet5 = [d for d in drafts if d.get('status') == 'published']
b10_published = [d for d in pub_sheet5 if 1136 <= d['no'] <= 1150]

# Check Master Workbook
wb = openpyxl.load_workbook('Signal_MD_All_Topics_250_Per_Sheet.xlsx', data_only=True)
ws = wb['Topics 1001-1250']
master_pub = 0
for r in range(6, ws.max_row + 1):
    if ws.cell(row=r, column=11).value == 'Published':
        master_pub += 1

# Check Review Workbook
wb_rev = openpyxl.load_workbook('topic-drafts/topics-1001-1250-REVIEW.xlsx', data_only=True)
ws_rev = wb_rev.active
rev_pub = 0
for r in range(2, ws_rev.max_row + 1):
    if ws_rev.cell(row=r, column=5).value == 'Published':
        rev_pub += 1

print(f"Batch 10 (1136-1150) published in JSON: {len(b10_published)}/15")
print(f"Total Sheet 5 published in JSON: {len(pub_sheet5)}/250")
print(f"Total Sheet 5 published in Review Excel: {rev_pub}/250")
print(f"Total Sheet 5 published in Master Workbook: {master_pub}/250")
print(f"Total all mentor drafts published in DB: {total_pub_drafts}")
conn.close()
