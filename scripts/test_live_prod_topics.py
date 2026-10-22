import urllib.request
import urllib.parse
import json

topics_to_test = [
    "cardiac tamponade",
    "rhabdomyolysis",
    "refeeding syndrome",
    "Lyme disease"
]

print("=== TESTING LIVE PRODUCTION CURRICULUM SYNOPSES ===")
for t in topics_to_test:
    url = f"https://signalmd.co/api/search?q={urllib.parse.quote(t)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            ag = data.get('agentGuidance') or {}
            print(f"\nQuery: '{t}'")
            print(f"  Topic: {ag.get('topic')}")
            print(f"  Confidence: {ag.get('confidence')}")
            print(f"  Status: {ag.get('status')}")
            tps = ag.get('teachingPoints') or []
            print(f"  Teaching Points ({len(tps)}):")
            for i, tp in enumerate(tps[:3], 1):
                claim = tp.get('claim', '')[:90] + '...' if len(tp.get('claim', '')) > 90 else tp.get('claim', '')
                print(f"    {i}. {claim}")
            sources = ag.get('sourceArticles') or []
            print(f"  Source Articles: {len(sources)}")
            for s in sources[:2]:
                print(f"    - [{s.get('pmid')}] {s.get('title')[:75]}...")
    except Exception as e:
        print(f"Query: '{t}' -> Error: {e}")
