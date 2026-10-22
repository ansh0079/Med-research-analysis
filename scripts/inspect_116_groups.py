import json

with open('scratch_all_content_upgrades.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print(f"Total topics: {len(topics)}")
print("\n--- Group 1 (1 to 40) ---")
for i, t in enumerate(topics[:40]):
    print(f"{i+1:2d}. {t['topic']} (TPs: {t['tps_count']}, Srcs: {t['srcs_count']})")

print("\n--- Group 2 (41 to 80) ---")
for i, t in enumerate(topics[40:80]):
    print(f"{i+41:2d}. {t['topic']} (TPs: {t['tps_count']}, Srcs: {t['srcs_count']})")

print("\n--- Group 3 (81 to 116) ---")
for i, t in enumerate(topics[80:]):
    print(f"{i+81:2d}. {t['topic']} (TPs: {t['tps_count']}, Srcs: {t['srcs_count']})")
