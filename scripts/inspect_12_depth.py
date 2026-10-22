import json
import sqlite3

DEPTH_12_IDS = [
    '9d856baf-94b9-4365-a366-c8c7ca1f95c5',
    'b91751a7-5277-4244-9fc9-80dbbc698565',
    'a58186a7-ae11-4cef-a21f-47f8a074a6ec',
    '0436c9d0-bc06-46e2-9922-b14fb0599b08',
    '5919794b-5da3-4147-837a-679b25561d49',
    'a5036ffc-8460-44a6-95bd-717121d21464',
    '154f79d3-c7a8-4fa9-a40f-2ff6737a487f',
    'cb5fa404-b06c-447a-a3fa-8ee409d728bb',
    'ba5d002d-9690-4e92-b59b-1af4e7208918',
    '9a915d89-3d36-42c1-b335-7c688f99efa7',
    '92c6a9d1-a62c-42d7-8a57-6597e44f4066',
    '82285d28-7507-4e55-b387-08a362af7d9a'
]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

for tid in DEPTH_12_IDS:
    c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts WHERE topic_id = ?", (tid,))
    row = c.fetchone()
    if row:
        p = json.loads(row[2])
        print(f"\n=== {row[1]} ({tid}) ===")
        print("MCQs:", p.get('mcq_angles', []))
        print("Cases:", p.get('case_hooks', []))
        print("Uncertainties:", p.get('uncertainties', []))
