import openpyxl, sqlite3, json, csv

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# Get published mentor drafts
c.execute('SELECT topic_id, topic, status FROM topic_mentor_drafts WHERE status = "published"')
published_drafts = {r[1].lower().strip(): r[0] for r in c.fetchall()}
print(f'Published mentor drafts: {len(published_drafts)}')

# Load Master Workbook topics
wb = openpyxl.load_workbook('Signal_MD_All_Topics_250_Per_Sheet.xlsx', data_only=True)
master_topics = {} # topic_lower -> (sheet, row_idx, topic_no, canonical_name, mentor_status)
for name in wb.sheetnames:
    if name == 'Contents': continue
    ws = wb[name]
    for r in ws.iter_rows(min_row=6, values_only=True):
        if r and len(r) > 10 and r[0] is not None:
            t_no = r[0]
            t_id = r[1]
            t_name = str(r[2]).strip()
            mentor_status = str(r[10]).strip()
            master_topics[t_name.lower()] = (name, t_no, t_name, mentor_status)

print(f'Total topics in master workbook: {len(master_topics)}')

with open('scratch/user_requested_topics.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    req_topics = [row[0].strip() for row in reader if row]

print(f'Total requested topics in CSV: {len(req_topics)}')

# Categorize requested topics
already_pub_master = []
in_sheet5_unpublished = []
not_in_master = []
other_unpublished = []

for t in req_topics:
    tl = t.lower()
    if tl in master_topics:
        sheet, t_no, canon, m_status = master_topics[tl]
        if m_status.lower() == 'published':
            already_pub_master.append((sheet, t_no, canon))
        else:
            if '1001-1250' in sheet:
                in_sheet5_unpublished.append((sheet, t_no, canon))
            else:
                other_unpublished.append((sheet, t_no, canon, m_status))
    else:
        # Check partial or published drafts
        if tl in published_drafts:
            already_pub_master.append(('DB_Drafts_Only', None, t))
        else:
            not_in_master.append(t)

print(f'Results of audit:')
print(f'  1. Already Published in Master/Drafts: {len(already_pub_master)}')
print(f'  2. In Sheet 5 (Topics 1001-1250) Unpublished: {len(in_sheet5_unpublished)}')
print(f'  3. In Other Sheets Unpublished: {len(other_unpublished)}')
print(f'  4. Not in Master Workbook: {len(not_in_master)}')

if in_sheet5_unpublished:
    print('Sample Sheet 5 topics:', in_sheet5_unpublished[:5])
if other_unpublished:
    print('Other unpublished:', other_unpublished[:5])
if not_in_master:
    print('Sample not in master:', not_in_master[:5])
