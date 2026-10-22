import json

with open('scratch_remaining_85.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

# Build a lookup of existing sources for each topic so every 4th TP cites a real, verified PMID
topic_sources_lookup = {}
for t in topics:
    name = t['topic']
    srcs = t.get('sources', [])
    pmids = [str(s.get('pmid')) for s in srcs if s.get('pmid')]
    topic_sources_lookup[name] = pmids

print(f"Total topics mapped: {len(topic_sources_lookup)}")
for k, v in list(topic_sources_lookup.items())[:5]:
    print(f"{k} -> PMIDs: {v}")
