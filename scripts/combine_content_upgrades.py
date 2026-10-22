import json

with open('scratch_needs_sources_batch_new.json', 'r', encoding='utf-8') as f:
    needs_srcs = json.load(f)

with open('scratch_needs_tps_batch_new.json', 'r', encoding='utf-8') as f:
    needs_tps = json.load(f)

src_ids = {s['topic_id']: s for s in needs_srcs}
tp_ids = {t['topic_id']: t for t in needs_tps}

all_content_upgrade_ids = set(src_ids.keys()) | set(tp_ids.keys())
print(f"Total unique topics needing content upgrades (TPs or Sources): {len(all_content_upgrade_ids)}")

topics_list = []
for tid in all_content_upgrade_ids:
    name = src_ids[tid]['topic'] if tid in src_ids else tp_ids[tid]['topic']
    t_count = tp_ids[tid]['tps_count'] if tid in tp_ids else src_ids[tid]['tps_count']
    s_count = src_ids[tid]['srcs_count'] if tid in src_ids else tp_ids[tid]['srcs_count']
    topics_list.append({
        'topic_id': tid,
        'topic': name,
        'tps_count': t_count,
        'srcs_count': s_count
    })

topics_list.sort(key=lambda x: x['topic'])
with open('scratch_all_content_upgrades.json', 'w', encoding='utf-8') as out:
    json.dump(topics_list, out, indent=2)

print(f"Saved {len(topics_list)} topics to scratch_all_content_upgrades.json")
