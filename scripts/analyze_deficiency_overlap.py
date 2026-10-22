import json

with open('scratch_deficient_topics.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print(f"Total deficient items in scratch_deficient_topics.json: {len(topics)}")

# Let's inspect the overlap between issues
only_curriculum_depth = 0 # only mcq/case/unc under
tp_or_source_issues = 0 # has tp < 4 or src < 2

for t in topics:
    issues = t.get('issues', [])
    has_tp = any('TP' in iss for iss in issues)
    has_src = any('Sources' in iss for iss in issues)
    if has_tp or has_src:
        tp_or_source_issues += 1
    else:
        only_curriculum_depth += 1

print(f"Topics with TP < 4 or Sources < 2: {tp_or_source_issues}")
print(f"Topics with ONLY curriculum depth (MCQ < 3, Case < 2, Unc < 2) issues: {only_curriculum_depth}")
