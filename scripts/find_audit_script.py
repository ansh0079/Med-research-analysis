import os

for f in os.listdir('scripts'):
    path = os.path.join('scripts', f)
    if os.path.isfile(path):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                txt = fp.read()
                if 'poor' in txt.lower() or 'usable summary' in txt.lower() or 'guideline recs' in txt.lower():
                    print(f"Match in scripts: {f}")
        except:
            pass
