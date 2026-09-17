#!/usr/bin/env python3
"""Adopt Topics 176-200 as the next curated/flagship working set."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import openpyxl

REPO = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis")
XLSX_SRC = Path(r"C:\Users\ansh0\Downloads\Topics_176_to_200_Curated_Literature.xlsx")
OUT_DIR = REPO / "outputs" / "topics-176-200-curated-literature"
CORPUS_PATH = REPO / "data" / "curated-literature-corpus.json"
FLAGSHIP_PATH = REPO / "server" / "config" / "flagshipTopics.json"

# Europe PMC TITLE/AUTH-verified PMIDs only. Unmatched titles stay without pmid.
TITLE_PMIDS = {
    "asam national practice guideline": ("32511106", 2020),
    "mattick et al": ("24500948", 2014),
    "x-bot trial": ("29150198", 2018),
    "treanor et al": ("10697061", 2000),
    "oseltamivir for acute influenza": ("10697061", 2000),
    "hoberman et al": ("21226576", 2011),
    "aap clinical practice guideline: the diagnosis and management of acute otitis": ("23439909", 2013),
    "idsa guidelines for the management of outpatient parenteral": ("30423035", 2019),
    "prodige 24": ("30575490", 2018),
    "mfolfirinox vs gemcitabine as adjuvant": ("30575490", 2018),
    "earlystim": ("23406026", 2013),
    "respect trial": ("28902580", 2017),
    "close trial": ("28902593", 2017),
    "reduce trial (nejm 2017)": ("28902590", 2017),
    "fourier trial": ("28304224", 2017),
    "evolocumab and clinical outcomes": ("28304224", 2017),
    "keynote-189": ("29658856", 2018),
    "palace trial": ("37459086", 2023),
    "bridge trial": ("26095867", 2015),
    "nice-sugar": ("19318384", 2009),
    "poise-1": ("18479744", 2008),
    "poise-2": ("24679062", 2014),
    "compass trial": ("28844192", 2017),
    "voyager pad": ("33207107", 2020),
    "cape cod trial": ("37585638", 2023),
    "ats/idsa guidelines on diagnosis and treatment of cap": ("31573350", 2019),
    "legro et al": ("25006718", 2014),
    "letrozole vs clomiphene": ("25006718", 2014),
    "cyto-pv": ("23216616", 2013),
    "idsa guidelines on skin and soft tissue": ("24973422", 2014),
    "aha/acc guideline on the management of patients with lower extremity pad": ("27840333", 2017),
    "zuranolone": ("37491938", 2023),
    "brexanolone": ("31255297", 2019),
    "aaaai/acaai practice parameter for drug allergy": ("20934625", 2010),
    "aaaai/acaai": ("20934625", 2010),
}

NEW_FLAGSHIP = [
    {
        "topic": "opioid use disorder buprenorphine and methadone",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "ASAM OUD",
            "methadone maintenance",
            "buprenorphine OUD",
            "Mattick Cochrane OUD",
        ],
        "landmarkPmids": ["32511106", "24500948"],
        "guidelineQueries": [
            "ASAM national practice guideline opioid use disorder buprenorphine methadone",
        ],
        "searchQueries": [
            "Mattick buprenorphine versus methadone maintenance opioid dependence Cochrane",
            "ASAM national practice guideline treatment opioid use disorder 2020",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Opioid use disorder: withdrawal, maintenance therapy and harm reduction",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "X-BOT",
            "extended-release naltrexone OUD",
            "harm reduction OUD",
            "WHO opioid use disorder",
        ],
        "landmarkPmids": ["29150198"],
        "guidelineQueries": [
            "WHO psychosocially assisted pharmacological treatment opioid use disorder guideline",
        ],
        "searchQueries": [
            "X-BOT extended-release naltrexone versus buprenorphine-naloxone opioid relapse Lancet",
            "harm reduction opioid use disorder HIV HCV transmission",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Orbital and periorbital cellulitis: classification and management",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": [
            "Chandler classification",
            "preseptal cellulitis",
            "subperiosteal abscess orbit",
            "orbital infection",
        ],
        "landmarkPmids": ["24973422"],
        "guidelineQueries": [
            "IDSA skin soft tissue infection orbital periorbital cellulitis guideline",
        ],
        "searchQueries": [
            "Chandler classification orbital cellulitis subperiosteal abscess management",
            "surgical versus medical management subperiosteal orbital abscess",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Orthostatic hypotension: diagnosis and management in older adults",
        "block": "Cardiology",
        "priority": "medium",
        "aliases": [
            "neurogenic orthostatic hypotension",
            "droxidopa",
            "midodrine fludrocortisone",
            "AHA orthostatic hypotension",
        ],
        "landmarkPmids": [],
        "guidelineQueries": [
            "AHA ACC scientific statement orthostatic hypotension older adults midodrine droxidopa",
        ],
        "searchQueries": [
            "droxidopa neurogenic orthostatic hypotension randomized trial",
            "midodrine fludrocortisone neurogenic orthostatic hypotension",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "oseltamivir treatment influenza healthy adults",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": [
            "Treanor oseltamivir",
            "neuraminidase inhibitor influenza",
            "IDSA seasonal influenza",
        ],
        "landmarkPmids": ["10697061"],
        "guidelineQueries": [
            "IDSA seasonal influenza diagnosis treatment chemoprophylaxis oseltamivir guideline",
        ],
        "searchQueries": [
            "Treanor oseltamivir acute influenza randomized JAMA",
            "neuraminidase inhibitors influenza healthy adults Cochrane review",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Otitis media, otitis externa and mastoiditis",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": [
            "Hoberman AOM",
            "acute otitis media",
            "AAP otitis media",
            "mastoiditis",
        ],
        "landmarkPmids": ["21226576", "23439909"],
        "guidelineQueries": [
            "AAP diagnosis management acute otitis media children antibiotic guideline",
        ],
        "searchQueries": [
            "Hoberman treatment acute otitis media children under 2 years NEJM",
            "AAP clinical practice guideline acute otitis media Lieberthal",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "outpatient parenteral antimicrobial therapy program safety",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": [
            "OPAT",
            "IDSA OPAT guideline",
            "outpatient IV antibiotics",
        ],
        "landmarkPmids": ["30423035"],
        "guidelineQueries": [
            "IDSA outpatient parenteral antimicrobial therapy OPAT safety guideline",
        ],
        "searchQueries": [
            "IDSA 2018 clinical practice guideline outpatient parenteral antimicrobial therapy",
            "OPAT outcomes safety infectious diseases Seaton",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Pancytopenia Diagnostic Workup",
        "block": "Haematology",
        "priority": "medium",
        "aliases": [
            "unexplained pancytopenia",
            "bone marrow biopsy pancytopenia",
            "aplastic anemia MDS workup",
        ],
        "landmarkPmids": [],
        "guidelineQueries": [
            "BSH pancytopenia bone marrow biopsy aplastic anemia MDS diagnostic guideline",
        ],
        "searchQueries": [
            "diagnostic yield bone marrow biopsy unexplained pancytopenia adults",
            "approach adult patient pancytopenia aplastic anemia MDS",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "PCSK9 inhibitor evolocumab cardiovascular outcomes",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "FOURIER",
            "evolocumab ASCVD",
            "PCSK9 monoclonal antibody",
        ],
        "landmarkPmids": ["28304224"],
        "guidelineQueries": [
            "AHA ACC blood cholesterol PCSK9 inhibitor evolocumab FOURIER guideline",
        ],
        "searchQueries": [
            "FOURIER evolocumab clinical outcomes cardiovascular disease NEJM Sabatine",
            "PCSK9 inhibitors cardiovascular events meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Pelvic inflammatory disease: diagnosis and treatment",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": [
            "PEACH trial",
            "CDC PID",
            "outpatient PID",
        ],
        "landmarkPmids": [],
        "guidelineQueries": [
            "CDC sexually transmitted infections pelvic inflammatory disease treatment guideline",
        ],
        "searchQueries": [
            "PEACH pelvic inflammatory disease evaluation clinical health outpatient treatment",
            "CDC STI treatment guidelines pelvic inflammatory disease",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "pembrolizumab plus chemotherapy metastatic non-small cell lung cancer",
        "block": "Oncology",
        "priority": "high",
        "aliases": [
            "KEYNOTE-189",
            "pembrolizumab pemetrexed platinum",
            "chemoimmunotherapy NSCLC",
        ],
        "landmarkPmids": ["29658856"],
        "guidelineQueries": [
            "NCCN ASCO metastatic NSCLC pembrolizumab chemotherapy first-line guideline",
        ],
        "searchQueries": [
            "KEYNOTE-189 pembrolizumab pemetrexed platinum metastatic nonsquamous NSCLC NEJM",
            "chemoimmunotherapy versus chemotherapy first-line NSCLC",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Penicillin allergy delabeling and testing",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": [
            "PALACE trial",
            "direct oral penicillin challenge",
            "penicillin skin testing",
        ],
        "landmarkPmids": ["37459086", "20934625"],
        "guidelineQueries": [
            "AAAAI ACAAI drug allergy penicillin testing delabeling practice parameter",
        ],
        "searchQueries": [
            "PALACE direct oral penicillin challenge versus skin testing low-risk allergy JAMA",
            "safety direct oral challenge low-risk penicillin allergy",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Penicillin allergy evaluation and delabeling",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": [
            "PEN-FAST",
            "penicillin allergy stewardship",
            "antimicrobial stewardship delabeling",
        ],
        "landmarkPmids": ["37459086"],
        "guidelineQueries": [
            "IDSA antimicrobial stewardship penicillin allergy delabeling guideline",
        ],
        "searchQueries": [
            "PEN-FAST score penicillin allergy delabeling validation",
            "penicillin allergy delabeling antimicrobial stewardship clinical outcomes",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Perinatal depression screening and treatment",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "zuranolone",
            "brexanolone",
            "postpartum depression",
            "ACOG perinatal mental health",
        ],
        "landmarkPmids": ["37491938"],
        "guidelineQueries": [
            "ACOG screening diagnosis mental health pregnancy postpartum depression guideline",
        ],
        "searchQueries": [
            "zuranolone postpartum depression randomized trial JAMA 2023",
            "CBT interpersonal psychotherapy perinatal depression",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Perioperative antiplatelet and anticoagulant management",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "BRIDGE trial",
            "PERIOP-2",
            "perioperative bridging AF",
            "CHEST antithrombotic perioperative",
        ],
        "landmarkPmids": ["26095867"],
        "guidelineQueries": [
            "ACCP CHEST perioperative management antithrombotic therapy bridging guideline",
        ],
        "searchQueries": [
            "BRIDGE perioperative bridging anticoagulation atrial fibrillation NEJM Douketis",
            "bridging versus no bridging atrial fibrillation VTE elective surgery",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Perioperative diabetes management",
        "block": "Endocrinology",
        "priority": "medium",
        "aliases": [
            "NICE-SUGAR",
            "perioperative glycaemic control",
            "Diabetes UK surgical diabetes",
        ],
        "landmarkPmids": ["19318384"],
        "guidelineQueries": [
            "AAGBI Diabetes UK perioperative management surgical patient diabetes guideline",
        ],
        "searchQueries": [
            "NICE-SUGAR intensive versus conventional glucose control critically ill NEJM",
            "tight versus liberal glycemic control perioperative period",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Perioperative management of common comorbidities",
        "block": "Cardiology",
        "priority": "medium",
        "aliases": [
            "POISE-1",
            "POISE-2",
            "perioperative beta-blocker",
            "AHA perioperative cardiovascular evaluation",
        ],
        "landmarkPmids": ["18479744", "24679062"],
        "guidelineQueries": [
            "AHA ACC perioperative cardiovascular evaluation management noncardiac surgery guideline",
        ],
        "searchQueries": [
            "POISE extended-release metoprolol noncardiac surgery Lancet",
            "POISE-2 aspirin patients undergoing noncardiac surgery NEJM",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Perioperative risk assessment and optimisation",
        "block": "Emergency Medicine",
        "priority": "medium",
        "aliases": [
            "VISION study",
            "ESAIC preoperative evaluation",
            "frailty surgical outcomes",
        ],
        "landmarkPmids": [],
        "guidelineQueries": [
            "ESAIC preoperative evaluation frailty surgical risk optimisation guideline",
        ],
        "searchQueries": [
            "VISION vascular events noncardiac surgery patients cohort evaluation",
            "frailty predictor surgical outcomes preoperative assessment",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Peripheral arterial disease and claudication",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "COMPASS PAD",
            "VOYAGER PAD",
            "intermittent claudication",
            "lower extremity PAD",
        ],
        "landmarkPmids": ["28844192", "33207107", "27840333"],
        "guidelineQueries": [
            "AHA ACC lower extremity peripheral artery disease claudication guideline",
        ],
        "searchQueries": [
            "COMPASS rivaroxaban aspirin stable PAD CAD cardiovascular outcomes NEJM",
            "VOYAGER PAD rivaroxaban after lower extremity revascularization",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "pneumonia",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": [
            "CAPE COD",
            "REMAP-CAP",
            "procalcitonin pneumonia",
            "ATS IDSA CAP HAP VAP",
        ],
        "landmarkPmids": ["37585638", "31573350"],
        "guidelineQueries": [
            "ATS IDSA community-acquired hospital-acquired ventilator-associated pneumonia guideline",
        ],
        "searchQueries": [
            "CAPE COD hydrocortisone severe community-acquired pneumonia NEJM",
            "procalcitonin guided antibiotic duration pneumonia",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
]


def lookup_pmid(title: str) -> tuple[str, int] | None:
    key = title.lower()
    for needle, value in TITLE_PMIDS.items():
        if needle in key:
            return value
    return None


def load_excel_topics() -> list[str]:
    wb = openpyxl.load_workbook(XLSX_SRC, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    topics = [str(r[0]).strip() for r in rows[1:] if r and r[0]]
    wb.close()
    return topics


def write_outputs(topics: list[str]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(XLSX_SRC, OUT_DIR / XLSX_SRC.name)
    index = OUT_DIR / "topics-index.txt"
    lines = [f"{i}. {t}" for i, t in enumerate(topics, 176)]
    index.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_DIR}")


def enrich_corpus(topics: list[str]) -> None:
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    wanted = {t.lower() for t in topics}
    missing_topics = wanted - {t["topic"].lower() for t in corpus["topics"]}
    if missing_topics:
        raise SystemExit(f"Corpus missing topics: {sorted(missing_topics)}")
    enriched = 0
    for topic in corpus["topics"]:
        if topic["topic"].lower() not in wanted:
            continue
        for doc in topic["documents"]:
            if doc.get("pmid"):
                continue
            found = lookup_pmid(doc.get("title") or "")
            if not found:
                print(f"  NO PMID <- {(doc.get('title') or '')[:90]}")
                continue
            pmid, year = found
            doc["pmid"] = pmid
            doc["url"] = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            if year and not doc.get("year"):
                doc["year"] = year
            enriched += 1
            print(f"  PMID {pmid} <- {doc['title'][:90]}")
    CORPUS_PATH.write_text(json.dumps(corpus, indent=2) + "\n", encoding="utf-8")
    print(f"Corpus PMID enrichments: {enriched}")


def add_alias(topic_row: dict, alias: str) -> None:
    aliases = topic_row.setdefault("aliases", [])
    if alias.lower() not in {a.lower() for a in aliases}:
        aliases.append(alias)


def add_pmid(topic_row: dict, pmid: str) -> None:
    pmids = topic_row.setdefault("landmarkPmids", [])
    if pmid not in pmids:
        pmids.append(pmid)


def update_flagship() -> None:
    config = json.loads(FLAGSHIP_PATH.read_text(encoding="utf-8"))
    by_name = {t["topic"].lower(): t for t in config["topics"]}

    flu = by_name.get("influenza antiviral treatment")
    if flu:
        add_alias(flu, "oseltamivir treatment influenza healthy adults")
        add_pmid(flu, "10697061")

    ldl = by_name.get("ldl lowering and ascvd prevention")
    if ldl:
        add_alias(ldl, "PCSK9 inhibitor evolocumab cardiovascular outcomes")
        add_pmid(ldl, "28304224")

    nsclc = by_name.get("non-small cell lung cancer immunotherapy")
    if nsclc:
        add_alias(nsclc, "pembrolizumab plus chemotherapy metastatic non-small cell lung cancer")
        add_pmid(nsclc, "29658856")

    cap = by_name.get("community-acquired pneumonia")
    if cap:
        add_alias(cap, "pneumonia")
        add_pmid(cap, "37585638")

    pad = by_name.get("peripheral artery disease antithrombotic therapy")
    if pad:
        add_alias(pad, "Peripheral arterial disease and claudication")
        add_pmid(pad, "33207107")
        add_pmid(pad, "28844192")

    pfo = by_name.get("patent foramen ovale closure after cryptogenic stroke")
    if pfo:
        add_pmid(pfo, "28902593")
        add_pmid(pfo, "28902580")

    panc = by_name.get("pancreatic cancer systemic and adjuvant therapy")
    if panc:
        add_pmid(panc, "30575490")

    park = by_name.get("parkinson disease motor complications")
    if park:
        add_alias(park, "EARLYSTIM")
        add_pmid(park, "23406026")

    pcos = by_name.get("polycystic ovary syndrome metabolic management")
    if pcos:
        add_alias(pcos, "Legro letrozole")
        add_pmid(pcos, "25006718")

    pv = by_name.get(
        "polycythemia vera: hematocrit targets, aspirin, and cardiovascular risk reduction"
    )
    if pv:
        add_pmid(pv, "23216616")

    existing = {t["topic"].lower() for t in config["topics"]}
    added = 0
    for row in NEW_FLAGSHIP:
        if row["topic"].lower() in existing:
            continue
        config["topics"].append(row)
        existing.add(row["topic"].lower())
        added += 1

    config["version"] = 17
    config["targets"]["flagshipCount"] = len(config["topics"])
    config["description"] = (
        f"Flagship-topic program - {len(config['topics'])} topics spanning evidence + learning surfaces, "
        "including curated literature cohorts Topics 51-75, Topics 76-100, Topics 126-150, "
        "Topics 151-175, and Topics 176-200."
    )
    FLAGSHIP_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Flagship topics now {len(config['topics'])} (added {added})")


def main() -> None:
    if not XLSX_SRC.exists():
        raise SystemExit(f"Missing {XLSX_SRC}")
    topics = load_excel_topics()
    if len(topics) != 25:
        raise SystemExit(f"Expected 25 topics, found {len(topics)}")
    write_outputs(topics)
    enrich_corpus(topics)
    update_flagship()


if __name__ == "__main__":
    main()
