import openpyxl
import sqlite3

wb_path = r'C:\Users\ansh0\.gemini\antigravity\brain\4529f218-ed22-4f5a-8aba-e98fbbf193bd\.user_uploaded\media_1792660926700_311f518a.xlsx'
wb = openpyxl.load_workbook(wb_path, read_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
user_topics = [r[0] for r in rows[1:] if r[0]]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic FROM topic_knowledge")
k_topics = {r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-') for r in c.fetchall()}

missing_in_k = []
for t in user_topics:
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    if key not in k_topics:
        missing_in_k.append(t)

print(f"Missing in topic_knowledge ({len(missing_in_k)}): {missing_in_k}")
