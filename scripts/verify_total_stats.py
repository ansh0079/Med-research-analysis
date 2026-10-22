import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM topic_mentor_drafts")
total_drafts = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM topic_mentor_drafts WHERE status = 'published'")
pub_drafts = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM topic_knowledge")
total_k = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM topic_knowledge WHERE status = 'human_reviewed'")
hr_k = c.fetchone()[0]

print(f"Total drafts: {total_drafts} (Published: {pub_drafts})")
print(f"Total knowledge rows: {total_k} (Human Reviewed: {hr_k})")
