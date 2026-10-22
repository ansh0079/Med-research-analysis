import openpyxl
import sqlite3
import json
from collections import Counter

wb_path = r'C:\Users\ansh0\.gemini\antigravity\brain\4529f218-ed22-4f5a-8aba-e98fbbf193bd\.user_uploaded\media_1792660926700_311f518a.xlsx'
wb = openpyxl.load_workbook(wb_path, read_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
user_topics = [r[0] for r in rows[1:] if r[0]]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {r[0].strip().lower(): r for r in c.fetchall()}

c.execute("SELECT topic, status, confidence, knowledge FROM topic_knowledge")
knowledges = {r[0].strip().lower(): r for r in c.fetchall()}

unmatched = []
deficiency_types = Counter()
deficient_list = []

for t in user_topics:
    key = t.strip().lower()
    if key not in drafts:
        unmatched.append(t)
        deficiency_types['missing_from_db'] += 1
        deficient_list.append({'topic': t, 'issues': ['Not found in DB drafts']})
        continue
    
    d_row = drafts[key]
    try:
        p = json.loads(d_row[3]) if d_row[3] else {}
        intro = p.get('mentor_intro') or p.get('summary') or ''
        tps = p.get('teaching_points') or p.get('teachingPoints') or []
        srcs = p.get('sources') or []
        mcqs = p.get('mcq_angles') or p.get('mcqAngles') or []
        cases = p.get('case_hooks') or p.get('caseGenerationHooks') or []
        uncs = p.get('uncertainties') or p.get('controversies') or []
        
        issues = []
        if len(intro) < 150:
            issues.append(f"Short intro ({len(intro)} chars)")
            deficiency_types['short_intro'] += 1
        if len(tps) < 4:
            issues.append(f"TP count < 4 ({len(tps)})")
            deficiency_types['tp_under_4'] += 1
        if len(srcs) < 2:
            issues.append(f"Sources < 2 ({len(srcs)})")
            deficiency_types['sources_under_2'] += 1
        if len(mcqs) < 3:
            issues.append(f"MCQs < 3 ({len(mcqs)})")
            deficiency_types['mcqs_under_3'] += 1
        if len(cases) < 2:
            issues.append(f"Case hooks < 2 ({len(cases)})")
            deficiency_types['cases_under_2'] += 1
        if len(uncs) < 2:
            issues.append(f"Uncertainties < 2 ({len(uncs)})")
            deficiency_types['uncertainties_under_2'] += 1
            
        if issues:
            deficient_list.append({
                'topic': t,
                'intro_len': len(intro),
                'tp_count': len(tps),
                'src_count': len(srcs),
                'mcq_count': len(mcqs),
                'case_count': len(cases),
                'unc_count': len(uncs),
                'issues': issues
            })
    except Exception as e:
        deficiency_types['json_error'] += 1
        deficient_list.append({'topic': t, 'issues': [f'JSON error: {e}']})

print(f"Total topics audited: {len(user_topics)}")
print(f"Total deficient topics: {len(deficient_list)}")
print(f"Deficiency breakdown:")
for k, v in deficiency_types.items():
    print(f"  {k}: {v}")

print(f"\nMissing from drafts completely ({len(unmatched)}): {unmatched}")

# Save detailed deficient list to json for systematic batch repair
with open('scratch_deficient_topics.json', 'w', encoding='utf-8') as f:
    json.dump(deficient_list, f, indent=2)

print("\nSaved scratch_deficient_topics.json successfully.")
