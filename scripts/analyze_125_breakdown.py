import json

with open('scratch_detailed_125.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

only_needs_source = [it for it in items if it['tp_count'] >= 4 and it['src_count'] < 2]
needs_tp4 = [it for it in items if it['tp_count'] < 4]
other = [it for it in items if it['tp_count'] >= 4 and it['src_count'] >= 2]

print(f"Total: {len(items)}")
print(f"Only needs 2nd source (already has >= 4 TPs): {len(only_needs_source)}")
print(f"Needs 4th TP (tp_count < 4): {len(needs_tp4)}")
print(f"Other / already meets criteria: {len(other)}")
