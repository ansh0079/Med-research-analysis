import openpyxl
import sqlite3
import json

wb_path = r'C:\Users\ansh0\.gemini\antigravity\brain\4529f218-ed22-4f5a-8aba-e98fbbf193bd\.user_uploaded\media_1792660926700_311f518a.xlsx'
wb = openpyxl.load_workbook(wb_path, read_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
header = rows[0]
user_topics = [r[0] for r in rows[1:] if r[0]]

print(f"Total topics in uploaded sheet: {len(user_topics)}")

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# Load all drafts into memory: {lower_topic: row}
c.execute("SELECT topic, status, review_decision, page_json FROM topic_mentor_drafts")
drafts_map = {}
for r in c.fetchall():
    drafts_map[r[0].strip().lower()] = r

# Load all topic_knowledge into memory
c.execute("SELECT topic, status, confidence, knowledge, source_articles FROM topic_knowledge")
knowledge_map = {}
for r in c.fetchall():
    knowledge_map[r[0].strip().lower()] = r

print(f"Total drafts in DB: {len(drafts_map)}")
print(f"Total knowledge rows in DB: {len(knowledge_map)}")

draft_statuses = {}
draft_review_decisions = {}
knowledge_statuses = {}
matched_drafts = 0
matched_knowledge = 0
unmatched_drafts = []
unmatched_knowledge = []

for t in user_topics:
    key = t.strip().lower()
    if key in drafts_map:
        matched_drafts += 1
        r = drafts_map[key]
        st, rd = r[1], r[2]
        draft_statuses[st] = draft_statuses.get(st, 0) + 1
        draft_review_decisions[rd] = draft_review_decisions.get(rd, 0) + 1
    else:
        unmatched_drafts.append(t)
    
    if key in knowledge_map:
        matched_knowledge += 1
        r = knowledge_map[key]
        st = r[1]
        knowledge_statuses[st] = knowledge_statuses.get(st, 0) + 1
    else:
        unmatched_knowledge.append(t)

print(f"\nMatched in topic_mentor_drafts: {matched_drafts} / {len(user_topics)}")
print("Draft statuses:", draft_statuses)
print("Draft review decisions:", draft_review_decisions)
print(f"Unmatched in drafts: {len(unmatched_drafts)}")

print(f"\nMatched in topic_knowledge: {matched_knowledge} / {len(user_topics)}")
print("Knowledge statuses:", knowledge_statuses)
print(f"Unmatched in knowledge: {len(unmatched_knowledge)}")

# Sample inspection
print("\n--- Inspecting first 5 user topics in DB ---")
for t in user_topics[:5]:
    key = t.strip().lower()
    print(f"\n=== Topic: {t} ===")
    if key in knowledge_map:
        r = knowledge_map[key]
        st, conf, k_raw = r[1], r[2], r[3]
        try:
            k = json.loads(k_raw) if k_raw else {}
            summ = k.get("summary", "")
            tps = k.get("teaching_points", [])
            print(f"  [topic_knowledge] Status: {st}, Confidence: {conf}")
            print(f"  Summary ({len(summ)} chars): {summ[:100]}...")
            print(f"  Teaching points ({len(tps)}): {tps[0] if tps else 'None'}")
        except Exception as e:
            print(f"  Error parsing knowledge: {e}")
    else:
        print("  Not in topic_knowledge")

    if key in drafts_map:
        dr = drafts_map[key]
        dst, drd, p_raw = dr[1], dr[2], dr[3]
        try:
            p = json.loads(p_raw) if p_raw else {}
            summ = p.get("summary", "")
            tps = p.get("teachingPoints", [])
            print(f"  [topic_mentor_drafts] Status: {dst}, Decision: {drd}")
            print(f"  Draft Summary ({len(summ)} chars): {summ[:100]}...")
            print(f"  Draft Teaching points ({len(tps)}): {tps[0] if tps else 'None'}")
        except Exception as e:
            print(f"  Error parsing draft: {e}")
    else:
        print("  Not in topic_mentor_drafts")
