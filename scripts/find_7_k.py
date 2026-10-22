import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

targets = [
    'anti-amyloid',
    'prophylaxis',
    'closed-loop',
    'arteritic',
    'fractional flow',
    'procalcitonin',
    'fleischner'
]

for tgt in targets:
    c.execute(f"SELECT topic FROM topic_knowledge WHERE LOWER(topic) LIKE '%{tgt}%'")
    print(f"Matches for {tgt}:", c.fetchall())
