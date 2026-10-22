import json

with open('scratch_audit_batch_new.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total topics: {len(items)}")

fully_complete = []
deficient = []

for it in items:
    issues = []
    if it['tps_count'] < 4:
        issues.append(f"TPs < 4 ({it['tps_count']})")
    if it['srcs_count'] < 2:
        issues.append(f"Sources < 2 ({it['srcs_count']})")
    elif it['srcs_count'] < 3:
        issues.append(f"Sources < 3 ({it['srcs_count']})")
    if it['mcqs_count'] < 3:
        issues.append(f"MCQs < 3 ({it['mcqs_count']})")
    if it['cases_count'] < 2:
        issues.append(f"Cases < 2 ({it['cases_count']})")
    if it['uncs_count'] < 2:
        issues.append(f"Uncertainties < 2 ({it['uncs_count']})")
        
    if not issues:
        fully_complete.append(it)
    else:
        it['issues'] = issues
        deficient.append(it)

print(f"Fully complete (>=4 TPs, >=3 Sources, >=3 MCQs, >=2 Cases, >=2 Uncs): {len(fully_complete)}")
print(f"Topics needing enhancement: {len(deficient)}")

# Categorize deficient
tp_under_4 = [d for d in deficient if any('TPs < 4' in iss for iss in d['issues'])]
srcs_under_2 = [d for d in deficient if any('Sources < 2' in iss for iss in d['issues'])]
srcs_eq_2 = [d for d in deficient if any('Sources < 3' in iss for iss in d['issues']) and not any('Sources < 2' in iss for iss in d['issues'])]
depth_only = [d for d in deficient if not any('TPs' in iss or 'Sources' in iss for iss in d['issues'])]

print(f"\nBreakdown of deficient topics:")
print(f"  1. Topics needing 4th TP: {len(tp_under_4)}")
print(f"  2. Topics with only 1 source (< 2): {len(srcs_under_2)}")
print(f"  3. Topics with 2 sources (could add 3rd for full review depth): {len(srcs_eq_2)}")
print(f"  4. Depth-only gaps (MCQs < 3, Cases < 2, Unc < 2): {len(depth_only)}")

print("\nSample 10 topics needing 4th TP:")
for d in tp_under_4[:10]:
    print(f"  • {d['topic']}: {', '.join(d['issues'])}")

print("\nSample 10 topics with single source:")
for d in srcs_under_2[:10]:
    print(f"  • {d['topic']}: {', '.join(d['issues'])}")
