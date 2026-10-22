import sqlite3
import json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

sample = 'Dementia with Lewy Bodies (DLB): core features, neuroleptic sensitivity management'
c.execute("SELECT COUNT(*) FROM topic_guidelines WHERE LOWER(topic) = LOWER(?)", (sample,))
print("Guidelines count for DLB:", c.fetchone()[0])

c.execute("SELECT COUNT(*) FROM guideline_topic_index WHERE LOWER(topic) = LOWER(?)", (sample,))
print("Guideline index count for DLB:", c.fetchone()[0])

c.execute("SELECT COUNT(*) FROM topic_evidence_memory WHERE LOWER(topic) = LOWER(?)", (sample,))
print("Evidence memory count for DLB:", c.fetchone()[0])
