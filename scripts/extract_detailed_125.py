import json
import sqlite3

wb_path = r'C:\Users\ansh0\.gemini\antigravity\brain\4529f218-ed22-4f5a-8aba-e98fbbf193bd\.user_uploaded\media_1792660926700_311f518a.xlsx'

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    drafts[r[1].strip().lower()] = r

# Load the 125 topics
with open('scratch_tier1_topics.json', 'r', encoding='utf-8') as f:
    tier1 = json.load(f)

# Handle the 3 alias mappings
name_fixes = {
    'hiv pre exposure prophylaxis': 'HIV pre-exposure prophylaxis',
    'idiopathic facial nerve palsy (bell’s palsy): corticosteroid timing, eye care': "Idiopathic facial nerve palsy (Bell's palsy): corticosteroid timing, eye care",
    'idiopathic facial nerve palsy (bells palsy): corticosteroid timing, eye care': "Idiopathic facial nerve palsy (Bell's palsy): corticosteroid timing, eye care",
    'ischaemic optic neuropathy: arteritic (gca) vs non- arteritic (naion) differentiation': "Ischaemic optic neuropathy: arteritic (GCA) vs non-arteritic (NAION) differentiation"
}

detailed_125 = []
for item in tier1:
    orig_name = item['topic']
    lookup = orig_name.strip().lower()
    if lookup in name_fixes:
        lookup = name_fixes[lookup].strip().lower()
        
    if lookup in drafts:
        row = drafts[lookup]
        topic_id, canonical_name, page_raw = row
        p = json.loads(page_raw) if page_raw else {}
        tps = p.get('teaching_points', [])
        srcs = p.get('sources', [])
        detailed_125.append({
            'topic_id': topic_id,
            'topic': canonical_name,
            'tp_count': len(tps),
            'src_count': len(srcs),
            'tps': tps,
            'sources': srcs,
            'intro': p.get('mentor_intro', ''),
            'mcqs': p.get('mcq_angles', []),
            'cases': p.get('case_hooks', []),
            'uncs': p.get('uncertainties', []),
            'gaps': p.get('gaps', '')
        })
    else:
        print(f"Still unmatched: {orig_name}")

print(f"Total resolved in detailed_125: {len(detailed_125)}")
with open('scratch_detailed_125.json', 'w', encoding='utf-8') as f:
    json.dump(detailed_125, f, indent=2)

print("Saved scratch_detailed_125.json successfully.")
