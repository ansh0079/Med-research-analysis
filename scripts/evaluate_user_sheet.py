import openpyxl
import sqlite3
import json

wb_path = r'C:\Users\ansh0\.gemini\antigravity\brain\4529f218-ed22-4f5a-8aba-e98fbbf193bd\.user_uploaded\media_1792660926700_311f518a.xlsx'
wb = openpyxl.load_workbook(wb_path, read_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
header = rows[0]
user_topics = [r[0] for r in rows[1:] if r[0]]

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# Pre-fetch drafts
c.execute("SELECT topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts = {}
for r in c.fetchall():
    t_clean = r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    drafts[t_clean] = r

# Pre-fetch knowledge
c.execute("SELECT topic, status, confidence, knowledge FROM topic_knowledge")
knowledges = {}
for r in c.fetchall():
    t_clean = r[0].strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    knowledges[t_clean] = r

# Normalization mapping for the user's 3 slightly non-standard spellings
alias_map = {
    'hiv pre exposure prophylaxis': 'hiv pre-exposure prophylaxis',
    'idiopathic facial nerve palsy (bell’s palsy): corticosteroid timing, eye care': "idiopathic facial nerve palsy (bell's palsy): corticosteroid timing, eye care",
    'idiopathic facial nerve palsy (bells palsy): corticosteroid timing, eye care': "idiopathic facial nerve palsy (bell's palsy): corticosteroid timing, eye care",
    'ischaemic optic neuropathy: arteritic (gca) vs non- arteritic (naion) differentiation': 'ischaemic optic neuropathy: arteritic (gca) vs non-arteritic (naion) differentiation'
}

stats = {
    'total': len(user_topics),
    'in_drafts': 0,
    'in_knowledge': 0,
    'draft_published': 0,
    'knowledge_human_reviewed': 0,
    'tp_gte_4': 0,
    'sources_gte_2': 0,
    'mcq_gte_3': 0,
    'case_hooks_gte_2': 0,
    'uncertainties_gte_2': 0,
    'intro_gte_150_chars': 0,
    'fully_complete': 0,
    'has_deficiencies': []
}

for t in user_topics:
    key = t.strip().lower().replace('’', "'").replace('–', '-').replace('—', '-')
    if key in alias_map:
        key = alias_map[key]
        
    in_d = key in drafts
    in_k = key in knowledges
    if in_d:
        stats['in_drafts'] += 1
        d_row = drafts[key]
        if d_row[1] == 'published':
            stats['draft_published'] += 1
    if in_k:
        stats['in_knowledge'] += 1
        k_row = knowledges[key]
        if k_row[1] == 'human_reviewed':
            stats['knowledge_human_reviewed'] += 1
            
    issues = []
    if not in_d:
        issues.append("Missing from topic_mentor_drafts")
    else:
        d_row = drafts[key]
        try:
            p = json.loads(d_row[3]) if d_row[3] else {}
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
        stats['has_deficiencies'].append((t, issues))

print("\n=== FINAL AUDIT OF UPLOADED SHEET (1,004 TOPICS) ===")
print(f"Total topics evaluated: {stats['total']}")
print(f"Present in topic_mentor_drafts: {stats['in_drafts']} / {stats['total']} ({stats['in_drafts']/stats['total']*100:.1f}%)")
print(f"Draft status = published: {stats['draft_published']} / {stats['total']} ({stats['draft_published']/stats['total']*100:.1f}%)")
print(f"Present in topic_knowledge: {stats['in_knowledge']} / {stats['total']} ({stats['in_knowledge']/stats['total']*100:.1f}%)")
print(f"Knowledge status = human_reviewed: {stats['knowledge_human_reviewed']} / {stats['total']} ({stats['knowledge_human_reviewed']/stats['total']*100:.1f}%)")
print(f"Intro >= 150 chars: {stats['intro_gte_150_chars']} / {stats['total']} ({stats['intro_gte_150_chars']/stats['total']*100:.1f}%)")
print(f"Teaching Points >= 4: {stats['tp_gte_4']} / {stats['total']} ({stats['tp_gte_4']/stats['total']*100:.1f}%)")
print(f"Sources / PMIDs >= 2: {stats['sources_gte_2']} / {stats['total']} ({stats['sources_gte_2']/stats['total']*100:.1f}%)")
print(f"MCQ Angles >= 3: {stats['mcq_gte_3']} / {stats['total']} ({stats['mcq_gte_3']/stats['total']*100:.1f}%)")
print(f"Case Hooks >= 2: {stats['case_hooks_gte_2']} / {stats['total']} ({stats['case_hooks_gte_2']/stats['total']*100:.1f}%)")
print(f"Uncertainties >= 2: {stats['uncertainties_gte_2']} / {stats['total']} ({stats['uncertainties_gte_2']/stats['total']*100:.1f}%)")
print(f"100% Fully Complete Mentor Pages: {stats['fully_complete']} / {stats['total']} ({stats['fully_complete']/stats['total']*100:.1f}%)")
print(f"Remaining Deficient Topics: {len(stats['has_deficiencies'])}")

if stats['has_deficiencies']:
    print("\n--- Remaining Deficiencies ---")
    for t, iss in stats['has_deficiencies']:
        print(f"• {t}: {', '.join(iss)}")
