import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT id, topic FROM topic_knowledge WHERE topic LIKE '%Latent%' OR normalized_topic LIKE '%latent%'")
print('topic_knowledge matches:', c.fetchall())

c.execute("SELECT id, topic FROM curriculum_topics WHERE topic LIKE '%Latent%'")
print('curriculum_topics matches:', c.fetchall()[:5])

c.execute("SELECT topic_id, guideline_id, title FROM topic_guidelines WHERE topic_id = '9dd63b66-4f69-43fd-acd5-0e7cc3aa1dbb'")
print('topic_guidelines for 1001:', c.fetchall())

c.execute("SELECT topic_id, count(*) FROM topic_guidelines GROUP BY topic_id LIMIT 5")
print('topic_guidelines sample:', c.fetchall())

c.execute("SELECT * FROM guideline_documents LIMIT 2")
print('guideline_documents sample:', c.fetchall())
