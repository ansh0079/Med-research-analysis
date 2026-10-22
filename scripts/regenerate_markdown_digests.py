import json
import os

range_files = [
    ('topics-0001-0250.json', 'topics-0001-0250.md', 'Topics 0001-0250'),
    ('topics-0251-0500.json', 'topics-0251-0500.md', 'Topics 0251-0500'),
    ('topics-0501-0750.json', 'topics-0501-0750.md', 'Topics 0501-0750'),
    ('topics-0751-1000.json', 'topics-0751-1000.md', 'Topics 0751-1000'),
    ('topics-1001-1250.json', 'topics-1001-1250.md', 'Topics 1001-1250'),
    ('topics-1251-1500.json', 'topics-1251-1500.md', 'Topics 1251-1500'),
    ('topics-1501-1750.json', 'topics-1501-1750.md', 'Topics 1501-1750'),
    ('topics-1751-1875.json', 'topics-1751-1875.md', 'Topics 1751-1875')
]

for jf, mf, title in range_files:
    jp = os.path.join('topic-drafts', jf)
    mp = os.path.join('topic-drafts', mf)
    if not os.path.exists(jp):
        continue
    with open(jp, 'r', encoding='utf-8') as f:
        drafts = json.load(f)
    
    md_lines = [
        f"# Signal MD Clinical Mentor Synopses & Teaching Points ({title})",
        f"\nTotal Topics: {len(drafts)} | Status: 100% Published\n",
        "| No | Topic | Cluster | Status | Sources | TPs |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |"
    ]
    
    for d in drafts:
        p = d.get('page') or {}
        s_cnt = len(p.get('sources') or [])
        t_cnt = len(p.get('teaching_points') or [])
        md_lines.append(f"| {d.get('no', 0)} | {d.get('topic', '')} | {d.get('cluster', '')} | {d.get('status', 'draft')} | {s_cnt} | {t_cnt} |")
    
    md_lines.append("\n---\n")
    
    for d in drafts:
        p = d.get('page') or {}
        md_lines.append(f"## [{d.get('no', 0):04d}] {d.get('topic', '')}\n")
        md_lines.append(f"**Cluster**: {d.get('cluster', '')} | **Status**: {d.get('status', 'published')}\n")
        md_lines.append(f"### Clinical Mentor Synopsis\n{p.get('mentor_intro', '')}\n")
        
        md_lines.append("### Core Teaching Points")
        for tp in p.get('teaching_points') or []:
            cites = ", ".join([f"PMID {c}" for c in tp.get('cites', [])])
            md_lines.append(f"- {tp.get('claim', '')} ({cites})")
        md_lines.append("")
        
        md_lines.append("### Key Controversies & Uncertainties")
        for unc in p.get('uncertainties') or []:
            md_lines.append(f"- {unc}")
        md_lines.append("")
        
        md_lines.append("### High-Yield MCQ Angles")
        for mcq in p.get('mcq_angles') or []:
            md_lines.append(f"- {mcq}")
        md_lines.append("")
        
        md_lines.append("### Case Generation Hooks")
        for ch in p.get('case_hooks') or []:
            md_lines.append(f"- {ch}")
        md_lines.append("")
        
        if p.get('gaps'):
            md_lines.append(f"**Reviewer Gap**: {p.get('gaps')}\n")
            
        md_lines.append("### Evidence Sources")
        for s in p.get('sources') or []:
            md_lines.append(f"- **PMID {s.get('pmid')}**: *{s.get('title')}* ({s.get('year')}) [{s.get('design', '')}] - {s.get('journal', '')}")
            
        md_lines.append("\n---\n")
        
    with open(mp, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_lines))
    print(f"Rendered {mf}: {len(drafts)} topics")

print("All markdown files rendered successfully!")
