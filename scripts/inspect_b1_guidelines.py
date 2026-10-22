import sqlite3, re

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

topics = [
    (1001, "Latent autoimmune diabetes in adults LADA: GAD antibodies, insulin progression"),
    (1002, "latent tuberculosis"),
    (1003, "Latent tuberculosis infection treatment"),
    (1004, "Late-onset hypogonadism: diagnostic thresholds, testosterone replacement risks, monitoring"),
    (1005, "Lateral epicondylitis (tennis elbow): assessment and management"),
    (1006, "latest guideline recommendations for atrial fibrillation stroke prevention"),
    (1007, "Latex and perioperative allergy evaluation"),
    (1008, "LDL lowering and ASCVD prevention"),
    (1009, "Leflunomide, Sulfasalazine, and Hydroxychloroquine toxicities"),
    (1010, "Left main coronary disease revascularization"),
    (1011, "Leishmaniasis: visceral vs cutaneous, kala-azar, liposomal amphotericin B, diagnosis"),
    (1012, "Leptomeningeal Disease"),
    (1013, "leukaemia"),
    (1014, "Leukaostasis Syndrome"),
    (1015, "Lewy body dementia diagnosis and symptomatic therapy")
]

for no, title in topics:
    print(f"\n================ Topic {no}: {title} ================")
    # Search topic_guidelines by topic
    words = [w for w in re.split(r'[^a-zA-Z0-9]', title) if len(w) > 3][:3]
    like_pat = "%" + "%".join(words) + "%"
    c.execute("SELECT source_body, source_year, recommendation_text FROM topic_guidelines WHERE topic LIKE ? OR recommendation_text LIKE ? LIMIT 3", (like_pat, like_pat))
    gls = c.fetchall()
    print(f"Guidelines ({len(gls)}):")
    for g in gls:
        print(f"  [{g[0]} {g[1]}] {g[2][:120]}...")
