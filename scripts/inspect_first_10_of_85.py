import json

with open('scratch_remaining_85.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print(f"Total topics: {len(topics)}")
for i, t in enumerate(topics[:10]):
    print(f"\n--- {i+1}. {t['topic']} ---")
    print(f"Sources ({len(t['sources'])}): {[s.get('pmid') for s in t['sources']]}")
    print(f"TP count: {len(t['tps'])}")
    for j, tp in enumerate(t['tps']):
        print(f"  TP {j+1}: {tp.get('claim')[:80]}... [cites: {tp.get('cites')}]")
    if t.get('gaps'):
        print(f"Gaps note: {t.get('gaps')[:120]}...")
