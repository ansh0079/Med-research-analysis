import json

drafts = json.load(open('topic-drafts/topics-0501-0750.json', encoding='utf-8'))
by_no = {d['no']: d for d in drafts}

for no in [610, 612, 689, 712]:
    d = by_no[no]
    p = d['page']
    print(f"=== Topic {no}: {d['topic']} ===")
    print("Sources:", [(s.get('pmid'), s.get('title')) for s in p.get('sources', [])])
    print("Teaching points:")
    for tp in p.get('teaching_points', []):
        print(" -", tp.get('claim'), tp.get('cites'))
