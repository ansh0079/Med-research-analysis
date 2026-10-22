import sqlite3
conn = sqlite3.connect('database/app.db')
c = conn.cursor()
c.execute("UPDATE topic_knowledge SET topic = 'Alzheimer\'s disease anti-amyloid immunotherapy' WHERE id = 16")
c.execute("UPDATE topic_knowledge SET topic = 'Angiotensin II for catecholamine-refractory vasodilatory shock' WHERE id = 22")
conn.commit()
print('Updated 16 and 22')
