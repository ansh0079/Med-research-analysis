import openpyxl, sqlite3, json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

wb = openpyxl.load_workbook('Signal_MD_All_Topics_250_Per_Sheet.xlsx', data_only=True)
ws5 = wb['Topics 1001-1250']

rows = []
for r in ws5.iter_rows(min_row=6, values_only=True):
    if r and r[0] is not None and isinstance(r[0], int):
        rows.append({
            'num': r[0],
            'topic_id': r[1],
            'topic': r[2],
            'normalized': r[3],
            'canonical': r[4],
            'db_status': r[5],
            'confidence': r[6],
            'linked_papers': r[7],
            'linked_guidelines': r[8],
            'mentor_present': r[9],
            'mentor_state': r[10]
        })

print(f'Total rows in Sheet 5: {len(rows)}')
print('First 3 rows:')
for row in rows[:3]:
    print(row)
print('Last 3 rows:')
for row in rows[-3:]:
    print(row)

# Check how many of these exist in topic_knowledge by normalized or topic title
found_tk = 0
found_drafts = 0
for row in rows:
    c.execute('SELECT id FROM topic_knowledge WHERE topic = ? OR normalized_topic = ?', (row['topic'], row['normalized']))
    if c.fetchone():
        found_tk += 1
    c.execute('SELECT topic_id FROM topic_mentor_drafts WHERE topic_id = ? OR topic = ?', (row['topic_id'], row['topic']))
    if c.fetchone():
        found_drafts += 1

print(f'Sheet 5 matches in topic_knowledge by name: {found_tk}')
print(f'Sheet 5 matches in topic_mentor_drafts by ID/name: {found_drafts}')
