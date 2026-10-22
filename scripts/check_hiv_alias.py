import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

for name in ['hiv pre exposure prophylaxis', 'hiv pre-exposure prophylaxis']:
    c.execute("SELECT id, topic, normalized_topic, status FROM topic_knowledge WHERE normalized_topic = LOWER(?)", (name,))
    print(name, c.fetchall())
