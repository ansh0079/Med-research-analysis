import csv
import sqlite3
import json

topics_file = 'scratch/user_batch_new.csv'
with open(topics_file, 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

c.execute("SELECT topic_id, topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    clean_k = r[1].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[clean_k] = r

c.execute("SELECT topic, status, confidence, knowledge FROM topic_knowledge")
knowledges = {}
for r in c.fetchall():
    clean_k = r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    knowledges[clean_k] = r

stats = {
    'total': len(rows),
    'in_drafts': 0,
    'in_knowledge': 0,
    'tp_gte_4': 0,
    'sources_gte_2': 0,
    'sources_gte_3': 0,
    'mcq_gte_3': 0,
    'case_hooks_gte_2': 0,
    'uncertainties_gte_2': 0,
    'intro_gte_150_chars': 0,
    'fully_complete': 0,
    'deficiencies': []
}

for r in rows:
    t = r['Topic']
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    in_d = key in drafts
    in_k = key in knowledges
    
    if in_d:
        stats['in_drafts'] += 1
    if in_k:
        stats['in_knowledge'] += 1
        
    issues = []
    if not in_d:
        issues.append("Missing from topic_mentor_drafts")
    else:
        d_row = drafts[key]
        try:
            p = json.loads(d_row[4]) if d_row[4] else {}
            intro = p.get('mentor_intro') or p.get('summary') or ''
            tps = p.get('teaching_points') or p.get('teachingPoints') or []
            srcs = p.get('sources') or []
            mcqs = p.get('mcq_angles') or p.get('mcqAngles') or []
            cases = p.get('case_hooks') or p.get('caseGenerationHooks') or []
            uncs = p.get('uncertainties') or p.get('controversies') or []
            
            if len(intro) >= 150:
                stats['intro_gte_150_chars'] += 1
            else:
                issues.append(f"Short intro ({len(intro)} chars)")
                
            if len(tps) >= 4:
                stats['tp_gte_4'] += 1
            else:
                issues.append(f"TP count < 4 ({len(tps)})")
                
            if len(srcs) >= 2:
                stats['sources_gte_2'] += 1
            else:
                issues.append(f"Sources < 2 ({len(srcs)})")
                
            if len(srcs) >= 3:
                stats['sources_gte_3'] += 1
                
            if len(mcqs) >= 3:
                stats['mcq_gte_3'] += 1
            else:
                issues.append(f"MCQs < 3 ({len(mcqs)})")
                
            if len(cases) >= 2:
                stats['case_hooks_gte_2'] += 1
            else:
                issues.append(f"Case hooks < 2 ({len(cases)})")
                
            if len(uncs) >= 2:
                stats['uncertainties_gte_2'] += 1
            else:
                issues.append(f"Uncertainties < 2 ({len(uncs)})")
                
        except Exception as e:
            issues.append(f"JSON parse error: {e}")
            
    if not issues:
        stats['fully_complete'] += 1
    else:
        stats['deficiencies'].append((t, issues))

print("\n=== FINAL AUDIT OF 450-TOPIC BATCH ===")
print(f"Total topics evaluated: {stats['total']}")
print(f"Present in topic_mentor_drafts: {stats['in_drafts']} / {stats['total']} ({stats['in_drafts']/stats['total']*100:.1f}%)")
print(f"Present in topic_knowledge: {stats['in_knowledge']} / {stats['total']} ({stats['in_knowledge']/stats['total']*100:.1f}%)")
print(f"Substantive Intro >= 150 chars: {stats['intro_gte_150_chars']} / {stats['total']} ({stats['intro_gte_150_chars']/stats['total']*100:.1f}%)")
print(f"Teaching Points >= 4 (with PMIDs): {stats['tp_gte_4']} / {stats['total']} ({stats['tp_gte_4']/stats['total']*100:.1f}%)")
print(f"Sources / Guideline Citations >= 2: {stats['sources_gte_2']} / {stats['total']} ({stats['sources_gte_2']/stats['total']*100:.1f}%)")
print(f"Sources / Guideline Citations >= 3: {stats['sources_gte_3']} / {stats['total']} ({stats['sources_gte_3']/stats['total']*100:.1f}%)")
print(f"MCQ Angles >= 3: {stats['mcq_gte_3']} / {stats['total']} ({stats['mcq_gte_3']/stats['total']*100:.1f}%)")
print(f"Case Hooks >= 2: {stats['case_hooks_gte_2']} / {stats['total']} ({stats['case_hooks_gte_2']/stats['total']*100:.1f}%)")
print(f"Uncertainties >= 2: {stats['uncertainties_gte_2']} / {stats['total']} ({stats['uncertainties_gte_2']/stats['total']*100:.1f}%)")
print(f"100% Fully Complete Mentor Pages: {stats['fully_complete']} / {stats['total']} ({stats['fully_complete']/stats['total']*100:.1f}%)")
print(f"Remaining Deficient Topics: {len(stats['deficiencies'])}")

if stats['deficiencies']:
    print("\nDeficient topics:")
    for d in stats['deficiencies']:
        print(f"• {d[0]}: {', '.join(d[1])}")
