import sys, os
sys.path.append(os.path.abspath('scripts'))
from data_batch_1151_1165 import BATCH_SHEET5_B11

errors = []
for no, d in BATCH_SHEET5_B11.items():
    source_pmids = {str(s['pmid']) for s in d.get('sources', [])}
    cited_pmids = set()
    for tp in d.get('teaching_points', []):
        cites = tp.get('cites', [])
        cited_pmids.update(str(c) for c in cites)
    missing = cited_pmids - source_pmids
    if missing:
        errors.append(f"Topic {no} missing sources for PMIDs: {missing}")
    if len(d.get('teaching_points', [])) != 4:
        errors.append(f"Topic {no} teaching points != 4 (found {len(d.get('teaching_points', []))})")
    if len(d.get('uncertainties', [])) != 2:
        errors.append(f"Topic {no} uncertainties != 2 (found {len(d.get('uncertainties', []))})")
    if len(d.get('mcq_angles', [])) < 3:
        errors.append(f"Topic {no} mcq_angles < 3 (found {len(d.get('mcq_angles', []))})")
    if len(d.get('case_hooks', [])) != 2:
        errors.append(f"Topic {no} case_hooks != 2 (found {len(d.get('case_hooks', []))})")
    if not d.get('gaps'):
        errors.append(f"Topic {no} missing gaps")
    if 'crucial clinical entity' in d.get('mentor_intro', '').lower():
        errors.append(f"Topic {no} contains boilerplate 'crucial clinical entity'")

if errors:
    print(f"Validation FAILED with {len(errors)} errors:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
else:
    print(f"Batch 11 (Topics 1151-1165) passed ALL strict validation criteria ({len(BATCH_SHEET5_B11)} topics, 100% citation closure, zero boilerplate, 4-2-3-2-1 structure)!")
