import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

print("Searching for hiv pre exposure...")
c.execute("SELECT topic FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%pre%exposure%' OR LOWER(topic) LIKE '%prep%'")
print("HIV prep matches:", c.fetchall())

print("\nSearching for Bell...")
c.execute("SELECT topic FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%bell%' OR LOWER(topic) LIKE '%facial nerve%'")
print("Bell matches:", c.fetchall())

print("\nSearching for Ischaemic optic...")
c.execute("SELECT topic FROM topic_mentor_drafts WHERE LOWER(topic) LIKE '%optic neuropathy%'")
print("Optic neuropathy matches:", c.fetchall())
