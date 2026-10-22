import sqlite3
import json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("SELECT topic, knowledge FROM topic_knowledge WHERE LOWER(topic) = 'alcohol use disorder naltrexone and acamprosate'")
row = c.fetchone()
print("Topic:", row[0])
print("Raw knowledge JSON:", row[1][:500] if row[1] else "None")
if row[1]:
    data = json.loads(row[1])
    print("Keys in knowledge:", list(data.keys()))
    for k, v in data.items():
        if isinstance(v, (str, list, dict)):
            print(f"  {k} -> type {type(v).__name__}, len: {len(v)}")
            if isinstance(v, list) and v:
                print(f"    sample item: {v[0]}")
            elif isinstance(v, str):
                print(f"    value: {v[:100]}")

c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = 'alcohol use disorder naltrexone and acamprosate'")
drow = c.fetchone()
print("\nDraft page_json:")
if drow and drow[1]:
    ddata = json.loads(drow[1])
    print("Keys in draft page_json:", list(ddata.keys()))
    for k, v in ddata.items():
        if isinstance(v, (str, list, dict)):
            print(f"  {k} -> type {type(v).__name__}, len: {len(v)}")
            if isinstance(v, list) and v:
                print(f"    sample item: {v[0]}")
            elif isinstance(v, str):
                print(f"    value: {v[:100]}")
