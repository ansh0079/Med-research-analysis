import json
import sqlite3

REMAINING_8_IDS = [
    ('canakinumab anti-inflammatory therapy atherosclerotic disease', 'fd9534de-c0ed-4429-9a9a-8e3f77bfa2d1'),
    ('leukaemia', 'f3e353b1-6a19-4c24-8742-3e6ba349496a'),
    ('management of PRESS', 'c9967030-6871-438d-8574-77a82a46d392'),
    ('meningitis', 'de1f2036-3ba7-4738-a215-fabebe22a6e5'),
    ('rosuvastatin primary prevention elevated C-reactive protein', '83838221-834d-4280-b19a-9534170a9775'),
    ('H. pylori infection', '0c95d938-2614-4be9-9e27-9e9ec6737cba'),
    ('hyperuricaemia', 'b1d8151e-e8f4-4251-9ab5-081908782930'),
    ('should I start an SGLT2 inhibitor for my patient with HFrEF?', 'c7f58952-2d4d-4a4f-b187-7b770d19ec48')
]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

for name, tid in REMAINING_8_IDS:
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (tid,))
    row = c.fetchone()
    if row:
        p = json.loads(row[1])
        print(f"\n=== {name} ({tid}) ===")
        print("TPs count:", len(p.get('teaching_points', [])))
        for i, tp in enumerate(p.get('teaching_points', []), 1):
            print(f"  {i}. {tp.get('claim')} (cites: {tp.get('cites')})")
        print("Sources count:", len(p.get('sources', [])))
        for s in p.get('sources', []):
            print(f"  - [{s.get('pmid')}] {s.get('title')} ({s.get('year')}) [{s.get('design')}]")
