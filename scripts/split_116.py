import json

with open('scratch_all_content_upgrades.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

has_4_tps_needs_srcs = [t for t in topics if t['tps_count'] >= 4]
needs_tps = [t for t in topics if t['tps_count'] < 4]

print(f"Total topics: {len(topics)}")
print(f"Has >= 4 TPs, only needs companion sources: {len(has_4_tps_needs_srcs)}")
print(f"Needs TPs (< 4): {len(needs_tps)}")
