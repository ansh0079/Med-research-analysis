#!/usr/bin/env python3
"""Adopt Topics 251-282 as the next curated/flagship working set."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import openpyxl

REPO = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis")
XLSX_SRC = Path(r"C:\Users\ansh0\Downloads\Topics_251_to_282_Curated_Literature.xlsx")
OUT_DIR = REPO / "outputs" / "topics-251-282-curated-literature"
CORPUS_PATH = REPO / "data" / "curated-literature-corpus.json"
FLAGSHIP_PATH = REPO / "server" / "config" / "flagshipTopics.json"

# Europe PMC TITLE/AUTH-verified PMIDs only. Unmatched titles stay without pmid.
TITLE_PMIDS = {
    "esc guidelines for the diagnosis and management of syncope": ("29562304", 2018),
    "post (prevention of syncope trial)": ("16505178", 2006),
    "eular recommendations for the management of large vessel vasculitis": ("31270110", 2020),
    "nakaoka et al": ("29191819", 2018),
    "aha/asa guidelines for the early management of patients with acute ischemic stroke": (
        "31662117",
        2019,
    ),
    "extend-ia tnk": ("29694815", 2018),
    "nor-test": ("28780236", 2017),
    "plato trial": ("19717846", 2009),
    "cdc guidelines for tickborne": ("27172113", 2016),
    "idsa and cdc recommendations on tick-borne": ("27172113", 2016),
    "recovery trial (tocilizumab": ("33933206", 2021),
    "remap-cap": ("34407334", 2021),
    "lindenbaum et al": ("3374544", 1988),
    "partner 3": ("30883058", 2019),
    "express study": ("17928046", 2007),
    "sos-tia": ("17928270", 2007),
    "brain trauma foundation guidelines for the management of severe traumatic": ("27654000", 2017),
    "decra trial": ("21601156", 2011),
    "rescueicp": ("27602507", 2016),
    "s31/a5349": ("33951360", 2021),
    "tbtc study 31": ("33951360", 2021),
    "dcct / edic": ("8366922", 1993),
    "ukpds (type 2)": ("9742976", 1998),
    "villanueva et al": ("23281973", 2013),
    "lau et al": ("32706539", 2020),
    "idsa/escmid clinical practice guidelines for acute uncomplicated cystitis": ("21292654", 2011),
    "surviving sepsis campaign": ("34605781", 2021),
    "vasst trial": ("18305265", 2008),
    "vanish trial": ("27483065", 2016),
    "soap ii": ("20200382", 2010),
    "evra trial": ("29688123", 2018),
    "chest guideline and expert panel report on antithrombotic therapy for vte": ("26867832", 2016),
    "amplify-ext": ("23216615", 2013),
    "palm trial": ("31774950", 2019),
    "bridge trial": ("26095867", 2015),
    "ducharme et al": ("19164187", 2009),
}

NEW_FLAGSHIP = [
    {
        "topic": "Syncope and postural hypotension",
        "block": "Cardiology",
        "priority": "medium",
        "aliases": ["POST trial", "ESC syncope", "vasovagal syncope"],
        "landmarkPmids": ["29562304", "16505178"],
        "guidelineQueries": ["ESC diagnosis management syncope guideline tilt table"],
        "searchQueries": [
            "POST prevention of syncope trial metoprolol vasovagal",
            "ESC 2018 guidelines diagnosis management syncope",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "tenecteplase alteplase acute ischemic stroke EXTEND-IA TNK",
        "block": "Neurology",
        "priority": "high",
        "aliases": ["EXTEND-IA TNK", "NOR-TEST", "tenecteplase stroke"],
        "landmarkPmids": ["29694815", "28780236"],
        "guidelineQueries": ["AHA ASA early management acute ischemic stroke tenecteplase"],
        "searchQueries": [
            "EXTEND-IA TNK tenecteplase versus alteplase thrombectomy NEJM",
            "NOR-TEST tenecteplase versus alteplase acute ischaemic stroke Lancet",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Testicular germ cell tumor chemotherapy",
        "block": "Oncology",
        "priority": "medium",
        "aliases": ["BEP germ cell", "testicular cancer chemotherapy", "NCCN testicular"],
        "landmarkPmids": [],
        "guidelineQueries": ["NCCN ESMO testicular germ cell tumor BEP chemotherapy"],
        "searchQueries": [
            "BEP bleomycin etoposide cisplatin metastatic germ cell tumor",
            "SWOG EORTC prognostic chemotherapy testicular cancer",
        ],
        "requiredStudyTypes": ["guideline", "randomized controlled trial"],
    },
    {
        "topic": "ticagrelor versus clopidogrel acute coronary syndromes",
        "block": "Cardiology",
        "priority": "high",
        "aliases": ["PLATO", "ticagrelor ACS", "P2Y12 ACS"],
        "landmarkPmids": ["19717846"],
        "guidelineQueries": ["AHA ACC ESC acute coronary syndromes ticagrelor clopidogrel"],
        "searchQueries": [
            "PLATO ticagrelor versus clopidogrel acute coronary syndromes NEJM",
            "ticagrelor clopidogrel ACS network meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "tick borne rickettsial disease empiric doxycycline",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": ["RMSF doxycycline", "CDC tickborne rickettsial", "Rocky Mountain spotted fever"],
        "landmarkPmids": ["27172113"],
        "guidelineQueries": ["CDC IDSA tickborne rickettsial diseases doxycycline RMSF"],
        "searchQueries": [
            "CDC diagnosis management tickborne rickettsial diseases 2016",
            "empiric doxycycline Rocky Mountain spotted fever mortality",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Tick-borne rickettsial disease empiric doxycycline",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": ["Chapman RMSF", "early doxycycline rickettsial"],
        "landmarkPmids": ["27172113"],
        "guidelineQueries": ["IDSA CDC tick-borne infections empiric doxycycline"],
        "searchQueries": [
            "delay doxycycline administration mortality Rocky Mountain spotted fever",
            "clinical diagnosis early treatment RMSF",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "tocilizumab COVID-19 hospitalized patients",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": ["RECOVERY tocilizumab", "REMAP-CAP IL-6", "COVID IL-6 antagonist"],
        "landmarkPmids": ["33933206", "34407334"],
        "guidelineQueries": ["NIH WHO COVID-19 treatment tocilizumab hospitalized"],
        "searchQueries": [
            "RECOVERY tocilizumab patients admitted hospital COVID-19 Lancet",
            "REMAP-CAP interleukin-6 receptor antagonists critically ill Covid-19",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Tonsillitis, peritonsillar abscess and deep neck infection",
        "block": "Infectious Diseases",
        "priority": "medium",
        "aliases": ["peritonsillar abscess", "deep neck space infection", "AAO-HNSF tonsillectomy"],
        "landmarkPmids": [],
        "guidelineQueries": ["AAO-HNSF tonsillectomy IDSA head neck infection peritonsillar"],
        "searchQueries": [
            "needle aspiration versus incision drainage peritonsillar abscess",
            "Windfuhr deep neck space infections",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Toxic and nutritional neuropathies: B12, B6 deficiency, chemotherapy-induced",
        "block": "Neurology",
        "priority": "medium",
        "aliases": ["cobalamin neuropathy", "CIPN", "Lindenbaum B12"],
        "landmarkPmids": ["3374544"],
        "guidelineQueries": ["AAN distal symmetrical polyneuropathy B12 chemotherapy neuropathy"],
        "searchQueries": [
            "Lindenbaum neuropsychiatric disorders cobalamin deficiency NEJM",
            "chemotherapy induced peripheral neuropathy prevention",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "transcatheter aortic valve replacement balloon-expandable low-risk patients",
        "block": "Cardiology",
        "priority": "high",
        "aliases": ["PARTNER 3", "balloon-expandable TAVR low risk"],
        "landmarkPmids": ["30883058"],
        "guidelineQueries": ["AHA ACC valvular heart disease TAVR low surgical risk"],
        "searchQueries": [
            "PARTNER 3 transcatheter aortic valve balloon-expandable low-risk NEJM",
            "TAVR versus SAVR low-risk patients meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Type 1 and type 2 diabetes",
        "block": "Endocrinology",
        "priority": "high",
        "aliases": ["DCCT", "UKPDS", "ADA EASD diabetes"],
        "landmarkPmids": ["8366922", "9742976"],
        "guidelineQueries": ["ADA standards of care diabetes EASD type 1 type 2"],
        "searchQueries": [
            "DCCT intensive treatment insulin-dependent diabetes complications",
            "UKPDS intensive blood-glucose control type 2 diabetes complications",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Upper and lower GI bleeding",
        "block": "Gastroenterology",
        "priority": "high",
        "aliases": ["Villanueva transfusion UGIB", "restrictive transfusion GI bleed"],
        "landmarkPmids": ["23281973"],
        "guidelineQueries": ["ACG ulcerative upper gastrointestinal bleeding ESGE"],
        "searchQueries": [
            "Villanueva restrictive versus liberal transfusion upper gastrointestinal bleeding NEJM",
            "restrictive liberal red cell transfusion acute GI bleeding",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "upper gi bleed",
        "block": "Gastroenterology",
        "priority": "high",
        "aliases": ["Lau early endoscopy", "BSG UGIB"],
        "landmarkPmids": ["32706539"],
        "guidelineQueries": ["BSG ESGE acute upper gastrointestinal bleeding endoscopy timing"],
        "searchQueries": [
            "Lau timing of endoscopy acute upper gastrointestinal bleeding NEJM",
            "early endoscopy acute upper GI bleeding",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "upper GI bleeding",
        "block": "Gastroenterology",
        "priority": "medium",
        "aliases": ["pre-endoscopy PPI", "Sung PPI UGIB"],
        "landmarkPmids": [],
        "guidelineQueries": ["ACG ESGE proton pump inhibitor infusion upper GI bleed"],
        "searchQueries": [
            "Sung pre-endoscopy PPI upper gastrointestinal bleeding randomized",
            "proton pump inhibitor infusion prior endoscopy UGIB",
        ],
        "requiredStudyTypes": ["guideline", "randomized controlled trial"],
    },
    {
        "topic": "Urinary tract infections and pyelonephritis",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": ["IDSA cystitis pyelonephritis", "uncomplicated UTI", "Gupta cystitis"],
        "landmarkPmids": ["21292654"],
        "guidelineQueries": ["IDSA ESCMID acute uncomplicated cystitis pyelonephritis women"],
        "searchQueries": [
            "IDSA 2010 cystitis pyelonephritis international clinical practice guidelines",
            "short-course antibiotics uncomplicated urinary tract infection",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Urticaria and angioedema: classification and management",
        "block": "Dermatology",
        "priority": "medium",
        "aliases": ["EAACI urticaria", "chronic spontaneous urticaria angioedema"],
        "landmarkPmids": [],
        "guidelineQueries": ["EAACI GA2LEN EDF WAO urticaria angioedema guideline"],
        "searchQueries": [
            "omalizumab chronic spontaneous urticaria updosing antihistamine",
            "Zuberbier global consensus urticaria management",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Vapor Gas Dust and Fume exposures",
        "block": "Respiratory",
        "priority": "medium",
        "aliases": ["occupational inhalation injury", "World Trade Center lung", "toxic inhalation"],
        "landmarkPmids": [],
        "guidelineQueries": ["ATS ERS occupational respiratory disorders inhalation"],
        "searchQueries": [
            "World Trade Center registry respiratory morbidity inhalation",
            "occupational cohort toxic gases particulates lung disease",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "vasopressor use septic shock",
        "block": "Critical Care",
        "priority": "high",
        "aliases": ["VASST", "VANISH", "norepinephrine vasopressin septic shock"],
        "landmarkPmids": ["18305265", "27483065", "34605781"],
        "guidelineQueries": ["Surviving Sepsis Campaign vasopressor septic shock norepinephrine"],
        "searchQueries": [
            "VASST vasopressin versus norepinephrine septic shock NEJM",
            "VANISH early vasopressin versus norepinephrine kidney failure septic shock",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Vasopressors and inotropes in shock",
        "block": "Critical Care",
        "priority": "high",
        "aliases": ["SOAP II", "dopamine versus norepinephrine shock"],
        "landmarkPmids": ["20200382"],
        "guidelineQueries": ["ESICM SCCM hemodynamic support shock vasopressor inotrope"],
        "searchQueries": [
            "SOAP II dopamine versus norepinephrine treatment of shock NEJM",
            "comparative efficacy dopamine norepinephrine septic cardiogenic shock",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Venous leg ulcers, lymphoedema and lower leg management",
        "block": "Dermatology",
        "priority": "medium",
        "aliases": ["EVRA", "venous ulcer compression", "early venous reflux ablation"],
        "landmarkPmids": ["29688123"],
        "guidelineQueries": ["NICE CG168 venous leg ulcer SIGN compression"],
        "searchQueries": [
            "EVRA early endovenous ablation venous ulceration NEJM",
            "compression therapy venous leg ulcers Cochrane",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Venous thromboembolism and anticoagulation management",
        "block": "Haematology",
        "priority": "high",
        "aliases": ["CHEST VTE", "AMPLIFY-EXT", "extended anticoagulation unprovoked VTE"],
        "landmarkPmids": ["26867832", "23216615"],
        "guidelineQueries": ["CHEST antithrombotic therapy VTE disease duration anticoagulation"],
        "searchQueries": [
            "AMPLIFY-EXT apixaban extended treatment venous thromboembolism",
            "extended versus standard duration anticoagulation unprovoked VTE",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Viral haemorrhagic fevers and high-consequence infectious diseases in the ICU",
        "block": "Critical Care",
        "priority": "high",
        "aliases": ["PALM Ebola", "VHF ICU", "high-consequence infectious disease"],
        "landmarkPmids": ["31774950"],
        "guidelineQueries": ["WHO CDC viral hemorrhagic fever critical care Ebola Marburg"],
        "searchQueries": [
            "PALM monoclonal antibody therapy Ebola virus disease NEJM",
            "supportive care investigational therapeutics Ebolavirus ICU",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "viral wheeze",
        "block": "Respiratory",
        "priority": "medium",
        "aliases": ["episodic viral wheeze", "Ducharme fluticasone preschool", "intermittent ICS wheeze"],
        "landmarkPmids": ["19164187"],
        "guidelineQueries": ["AAP BTS preschool viral wheeze inhaled corticosteroid"],
        "searchQueries": [
            "Ducharme preemptive high-dose fluticasone virus-induced wheezing children",
            "inhaled corticosteroids episodic viral wheeze preschool",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "vitamin K antagonist bridging atrial fibrillation perioperative BRIDGE trial",
        "block": "Cardiology",
        "priority": "high",
        "aliases": ["BRIDGE Douketis", "perioperative VKA bridging AF"],
        "landmarkPmids": ["26095867"],
        "guidelineQueries": ["CHEST perioperative antithrombotic therapy bridging atrial fibrillation"],
        "searchQueries": [
            "BRIDGE perioperative bridging anticoagulation atrial fibrillation NEJM Douketis",
            "no-bridging versus bridging anticoagulation AF surgery",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Wolfram syndrome DIDMOAD: diabetes insipidus, DM, optic atrophy, deafness",
        "block": "Endocrinology",
        "priority": "medium",
        "aliases": ["DIDMOAD", "WFS1", "Wolfram syndrome"],
        "landmarkPmids": [],
        "guidelineQueries": ["Wolfram syndrome clinical management WFS1 rare disease"],
        "searchQueries": [
            "Barrett Wolfram syndrome natural history WFS1",
            "Urano Wolfram syndrome targeted therapeutics",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Zollinger-Ellison Syndrome",
        "block": "Gastroenterology",
        "priority": "medium",
        "aliases": ["gastrinoma", "ZES MEN1", "NANETS gastrinoma"],
        "landmarkPmids": [],
        "guidelineQueries": ["ACG peptic ulcer NANETS Zollinger-Ellison gastrinoma"],
        "searchQueries": [
            "Jensen NIH Zollinger-Ellison syndrome MEN1 cohort",
            "PPI versus H2 antagonist gastrinoma acid suppression",
        ],
        "requiredStudyTypes": ["guideline", "review"],
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
    lines = [f"{i}. {t}" for i, t in enumerate(topics, 251)]
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

    syncope = by_name.get("syncope evaluation and pacing indications")
    if syncope:
        add_alias(syncope, "Syncope and postural hypotension")
        add_pmid(syncope, "16505178")
        add_pmid(syncope, "29562304")

    oh = by_name.get("orthostatic hypotension: diagnosis and management in older adults")
    if oh:
        add_alias(oh, "Syncope and postural hypotension")

    tak = by_name.get("takayasu arteritis biologic therapy")
    if tak:
        add_pmid(tak, "29191819")
        add_pmid(tak, "31270110")

    stroke = by_name.get("acute ischemic stroke reperfusion")
    if stroke:
        add_alias(stroke, "tenecteplase alteplase acute ischemic stroke EXTEND-IA TNK")
        add_pmid(stroke, "29694815")
        add_pmid(stroke, "28780236")
        add_pmid(stroke, "31662117")

    acs = by_name.get("ischaemic heart disease and acute coronary syndromes")
    if acs:
        add_alias(acs, "ticagrelor versus clopidogrel acute coronary syndromes")
        add_pmid(acs, "19717846")

    covid = by_name.get("covid-19 severe disease immunomodulation")
    if covid:
        add_alias(covid, "tocilizumab COVID-19 hospitalized patients")
        add_pmid(covid, "33933206")
        add_pmid(covid, "34407334")

    covid_icu = by_name.get("covid-19 critical care: dexamethasone and immunomodulation")
    if covid_icu:
        add_alias(covid_icu, "tocilizumab COVID-19 hospitalized patients")
        add_pmid(covid_icu, "33933206")

    tavr = by_name.get("aortic stenosis tavr")
    if tavr:
        add_alias(tavr, "transcatheter aortic valve replacement balloon-expandable low-risk patients")
        add_pmid(tavr, "30883058")

    tia = by_name.get("transient ischemic attack rapid assessment")
    if tia:
        add_pmid(tia, "17928046")
        add_pmid(tia, "17928270")

    tbi = by_name.get("traumatic brain injury intracranial pressure management")
    if tbi:
        add_pmid(tbi, "27654000")
        add_pmid(tbi, "21601156")
        add_pmid(tbi, "27602507")

    tb = by_name.get("tuberculosis treatment regimens")
    if tb:
        add_pmid(tb, "33951360")

    t1d = by_name.get("type 1 diabetes intensive glycemic control")
    if t1d:
        add_alias(t1d, "Type 1 and type 2 diabetes")
        add_pmid(t1d, "8366922")

    t2dm = by_name.get("type 2 diabetes cardiovascular outcomes")
    if t2dm:
        add_alias(t2dm, "Type 1 and type 2 diabetes")
        add_pmid(t2dm, "9742976")

    t2int = by_name.get("intensive glycemic targets in type 2 diabetes")
    if t2int:
        add_pmid(t2int, "9742976")

    ugib = by_name.get("upper gastrointestinal bleeding management")
    if ugib:
        add_alias(ugib, "Upper and lower GI bleeding")
        add_alias(ugib, "upper gi bleed")
        add_alias(ugib, "upper GI bleeding")
        add_pmid(ugib, "23281973")
        add_pmid(ugib, "32706539")

    vaso = by_name.get("vasopressor selection in septic and distributive shock")
    if vaso:
        add_alias(vaso, "vasopressor use septic shock")
        add_alias(vaso, "Vasopressors and inotropes in shock")
        add_pmid(vaso, "18305265")
        add_pmid(vaso, "27483065")
        add_pmid(vaso, "20200382")
        add_pmid(vaso, "34605781")

    vte = by_name.get("venous thromboembolism anticoagulation")
    if vte:
        add_alias(vte, "Venous thromboembolism and anticoagulation management")
        add_pmid(vte, "26867832")
        add_pmid(vte, "23216615")

    vte_doac = by_name.get("venous thromboembolism direct oral anticoagulant therapy")
    if vte_doac:
        add_alias(vte_doac, "Venous thromboembolism and anticoagulation management")
        add_pmid(vte_doac, "23216615")

    periop = by_name.get("perioperative antiplatelet and anticoagulant management")
    if periop:
        add_alias(periop, "vitamin K antagonist bridging atrial fibrillation perioperative BRIDGE trial")
        add_pmid(periop, "26095867")

    ebola = by_name.get("ebola virus disease therapeutics and supportive care")
    if ebola:
        add_alias(ebola, "Viral haemorrhagic fevers and high-consequence infectious diseases in the ICU")
        add_pmid(ebola, "31774950")

    asthma = by_name.get("childhood asthma and wheeze phenotypes")
    if asthma:
        add_alias(asthma, "viral wheeze")
        add_pmid(asthma, "19164187")

    csu = by_name.get("chronic spontaneous urticaria omalizumab")
    if csu:
        add_alias(csu, "Urticaria and angioedema: classification and management")

    cuti = by_name.get("complicated urinary tract infection antimicrobial strategy")
    if cuti:
        add_alias(cuti, "Urinary tract infections and pyelonephritis")
        add_pmid(cuti, "21292654")

    existing = {t["topic"].lower() for t in config["topics"]}
    added = 0
    for row in NEW_FLAGSHIP:
        if row["topic"].lower() in existing:
            continue
        config["topics"].append(row)
        existing.add(row["topic"].lower())
        added += 1

    config["version"] = 19
    config["targets"]["flagshipCount"] = len(config["topics"])
    config["description"] = (
        f"Flagship-topic program - {len(config['topics'])} topics spanning evidence + learning surfaces, "
        "including curated literature cohorts Topics 51-75, Topics 76-100, Topics 126-150, "
        "Topics 151-175, Topics 176-200, Topics 201-225, and Topics 251-282."
    )
    FLAGSHIP_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Flagship topics now {len(config['topics'])} (added {added})")


def main() -> None:
    if not XLSX_SRC.exists():
        raise SystemExit(f"Missing {XLSX_SRC}")
    topics = load_excel_topics()
    if len(topics) != 32:
        raise SystemExit(f"Expected 32 topics, found {len(topics)}")
    write_outputs(topics)
    enrich_corpus(topics)
    update_flagship()


if __name__ == "__main__":
    main()
