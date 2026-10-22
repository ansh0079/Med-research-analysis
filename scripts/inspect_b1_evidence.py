import sqlite3, json

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

topics = [
    (1001, "Latent autoimmune diabetes in adults LADA: GAD antibodies, insulin progression", "9dd63b66-4f69-43fd-acd5-0e7cc3aa1dbb"),
    (1002, "latent tuberculosis", "e43a07ad-39a7-4062-902e-7c7332788920"),
    (1003, "Latent tuberculosis infection treatment", "f858b266-77f8-4bb8-ad7c-43c7dbc1c82a"),
    (1004, "Late-onset hypogonadism: diagnostic thresholds, testosterone replacement risks, monitoring", "da0d4243-6baa-4371-b8f8-7ba44a85f0a2"),
    (1005, "Lateral epicondylitis (tennis elbow): assessment and management", "4f80f5ec-d663-4642-bb2e-a7b6694b5996"),
    (1006, "latest guideline recommendations for atrial fibrillation stroke prevention", "1ae6b811-9676-4802-b669-d543e9487f72"),
    (1007, "Latex and perioperative allergy evaluation", "ac71dcf0-49e4-4396-87e7-2723b4bea437"),
    (1008, "LDL lowering and ASCVD prevention", "9ed2b94f-7e25-43e0-b7c2-8814e6b39606"),
    (1009, "Leflunomide, Sulfasalazine, and Hydroxychloroquine toxicities", "df8db3aa-3968-41c4-849b-d22751504d6b"),
    (1010, "Left main coronary disease revascularization", "4c8c8683-9bc5-43cf-a2e4-7559b7b27e09"),
    (1011, "Leishmaniasis: visceral vs cutaneous, kala-azar, liposomal amphotericin B, diagnosis", "e1a6828d-bbf1-40f6-ac80-4cc56f95f895"),
    (1012, "Leptomeningeal Disease", "64a173e3-6eb5-45d4-910d-750c2e9bb0c9"),
    (1013, "leukaemia", "f3e353b1-6a19-4c24-8742-3e6ba349496a"),
    (1014, "Leukaostasis Syndrome", "c7675dae-2fa0-445c-891e-df3ee6040b1a"),
    (1015, "Lewy body dementia diagnosis and symptomatic therapy", "1599ecbb-7a90-4009-9068-2c3c8b774619")
]

for no, title, tid in topics:
    print(f"\n--- Checking Topic {no}: {title} (ID: {tid}) ---")
    # Check guidelines
    c.execute("SELECT guideline_id, title FROM topic_guidelines WHERE topic_id = ?", (tid,))
    gls = c.fetchall()
    print(f"Guidelines ({len(gls)}): {[g[1][:60] for g in gls[:3]]}")
    
    # Check article cache or search results
    words = [w for w in title.split() if len(w) > 3][:3]
    like_query = "%" + "%".join(words) + "%"
    c.execute("SELECT pmid, title, journal, year FROM article_cache WHERE title LIKE ? LIMIT 3", (like_query,))
    arts = c.fetchall()
    print(f"Cached articles ({len(arts)}): {[a[1][:60] for a in arts]}")
