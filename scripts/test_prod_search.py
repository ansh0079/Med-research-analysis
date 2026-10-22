import urllib.request
import json

req = urllib.request.Request('https://signalmd.co/api/search?q=asthma', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print("Knowledge Topic:", data.get('agentGuidance', {}).get('topic'))
    print("Confidence:", data.get('agentGuidance', {}).get('confidence'))
    print("Teaching points count:", len(data.get('agentGuidance', {}).get('teachingPoints', [])))
    for tp in data.get('agentGuidance', {}).get('teachingPoints', [])[:3]:
        print("  *", tp)
    print("\nArticles returned:", len(data.get('articles', [])))
    for a in data.get('articles', [])[:3]:
        print(f"  - {a.get('title')} ({a.get('year')})")
