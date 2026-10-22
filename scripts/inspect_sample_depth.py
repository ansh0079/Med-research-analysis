import json
import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

sample_topics = [
    "De Quervain's Tenosynovitis",
    "Dengue fever: clinical phases, NS1 antigen, DHF warning signs, fluid management",
    "Dermatomyositis and Antisynthetase Syndrome",
    "Diabetes prevention lifestyle and metformin",
    "Diabetic foot infection and osteomyelitis"
]

for t in sample_topics:
    c.execute("SELECT topic, page_json FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?)", (t,))
    r = c.fetchone()
    if r:
        p = json.loads(r[1])
        print(f"\n==========================================")
        print(f"Topic: {r[0]}")
        print(f"Intro: {p.get('mentor_intro')[:100]}...")
        print(f"TP 1: {p.get('teaching_points', [{}])[0].get('claim')[:100]}...")
        print(f"Existing MCQs: {p.get('mcq_angles')}")
        print(f"Existing Cases: {p.get('case_hooks')}")
        print(f"Existing Uncertainties: {p.get('uncertainties')}")
