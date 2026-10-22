import sqlite3

conn = sqlite3.connect('database/app.db')
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('Tables:', tables)
for t in tables:
    cnt = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"{t}: {cnt}")
conn.close()
