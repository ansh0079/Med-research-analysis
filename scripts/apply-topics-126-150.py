#!/usr/bin/env python3
"""Adopt Topics 126-150 as the next curated/flagship working set."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import openpyxl

REPO = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis")
XLSX_SRC = Path(r"C:\Users\ansh0\Downloads\Topics_126_to_150_Curated_Literature.xlsx")
OUT_DIR = REPO / "outputs" / "topics-126-150-curated-literature"
CORPUS_PATH = REPO / "data" / "curated-literature-corpus.json"
FLAGSHIP_PATH = REPO / "server" / "config" / "flagshipTopics.json"

# Europe PMC TITLE/AUTH-verified PMIDs only. Unmatched titles stay without pmid.
TITLE_PMIDS = {
    "ats/idsa guidelines for the management of adults with hap": ("27418577", 2016),
    "short-course vs long-course antibiotics for vap": ("26301604", 2015),
    "chastre et al": ("14625336", 2003),
    "8 vs 15 days of antibiotics for vap": ("14625336", 2003),
    "future ii": ("17494925", 2007),
    "quadrivalent hpv vaccine": ("17494925", 2007),
    "efficacy of hpv vaccination in preventing cervical": ("17494925", 2007),
    "asco/acs guidelines for hpv vaccination": ("32639044", 2020),
    "medtronic 670g": ("27629148", 2016),
    "garg et al. (medtronic": ("27629148", 2016),
    "control-iq": ("31618560", 2019),
    "brown et al. (control-iq": ("31618560", 2019),
    "ats/jrs/alat clinical practice guideline on hypersensitivity": ("32706311", 2020),
    "acog practice bulletin no. 222": ("32443077", 2020),
    "aspre trial": ("28657417", 2017),
    "pre-eclampsia (lancet)": ("34051884", 2021),
    "akiki trial": ("27181456", 2016),
    "ideal-icu": ("30304656", 2018),
    "starrt-aki": ("32668114", 2020),
    "early vs late initiation of rrt": ("32668114", 2020),
    "acr/eular classification criteria for igg4": ("31793250", 2019),
    "carruthers et al. (rituximab for igg4": ("25667206", 2015),
    "efficacy of rituximab in igg4": ("25667206", 2015),
    "ease trial": ("22738096", 2012),
    "early surgery vs conventional treatment in infective": ("22738096", 2012),
    "poet trial": ("30152252", 2019),
    "oral step-down vs continued iv": ("30152252", 2019),
    "sprint trial": ("26551272", 2015),
    "acc/aha guideline for the prevention, detection, evaluation, and management of high blood pressure": ("30354654", 2018),
    "accord, advance, and vadt": ("18539917", 2008),
    "intensive vs standard glycemic control": ("18539917", 2008),
    "ada standards of medical care in diabetes": ("36507646", 2023),
    "aha/acc multisociety guideline on the management of blood cholesterol": ("30423393", 2019),
    "cholesterol treatment trialists": ("22607822", 2012),
    "prove it-timi 22": ("15007110", 2004),
    "treating to new targets": ("15755765", 2005),
    "interact2": ("23713578", 2013),
    "atach-2": ("27276234", 2016),
    "aha/asa guideline for the management of spontaneous intracerebral": ("35579034", 2022),
    "idsa practice guidelines for the diagnosis and management of aspergillosis": ("27365388", 2016),
    "herbrecht et al": ("12167683", 2002),
    "voriconazole vs amphotericin b": ("12167683", 2002),
    "secure trial": ("26684607", 2016),
    "voriconazole vs isavuconazole": ("26684607", 2016),
    "trap trial": ("9417523", 1997),
    "leukoreduction in preventing alloimmunization": ("9417523", 1997),
    "cure (clopidogrel)": ("11519503", 2001),
    "plato (ticagrelor)": ("19717846", 2009),
    "ischemia trial": ("32227755", 2020),
    "lovell et al": ("10717011", 2000),
    "etanercept in polyarticular jia": ("10717011", 2000),
    "antibody-mediated rejection of solid-organ": ("30586534", 2018),
    "kdigo clinical practice guideline for the care of kidney transplant": ("19845597", 2009),
    "crest trial": ("35986684", 2022),
    "colorectal stenting trial": ("35986684", 2022),
    "wses guidelines on the management of large bowel obstruction": ("30123315", 2018),
    "bisset et al": ("17012266", 2006),
    "corticosteroid injections vs physiotherapy for lateral": ("17012266", 2006),
    "nap6": ("29935567", 2018),
    "marmor et al": ("26992838", 2016),
    "hcq retinopathy": ("26992838", 2016),
    "balance trial": ("20092882", 2010),
    "renal and endocrine adverse effects of long-term lithium": ("26003379", 2015),
    "2017 wses": ("30123315", 2018),
}
NEW_FLAGSHIP = [
    {
        "topic": "hospital acquired and ventilator associated pneumonia",
        "block": "Critical Care",
        "priority": "high",
        "aliases": [
            "HAP VAP",
            "Chastre 8 vs 15 days",
            "ATS IDSA HAP VAP",
            "ventilator-associated pneumonia antibiotic duration",
        ],
        "landmarkPmids": ["14625336", "27418577", "26301604"],
        "guidelineQueries": [
            "ATS IDSA hospital-acquired ventilator-associated pneumonia antibiotic duration guideline",
        ],
        "searchQueries": [
            "Chastre eight versus fifteen days antibiotics ventilator-associated pneumonia JAMA",
            "short-course versus long-course antibiotics VAP Cochrane review",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "HPV vaccination cervical intraepithelial neoplasia FUTURE II",
        "block": "Oncology",
        "priority": "high",
        "aliases": [
            "FUTURE II",
            "quadrivalent HPV vaccine",
            "cervical intraepithelial neoplasia prevention",
            "Gardasil CIN",
        ],
        "landmarkPmids": ["17494925", "32639044"],
        "guidelineQueries": [
            "ACS ASCO HPV vaccination cervical cancer prevention guideline",
        ],
        "searchQueries": [
            "FUTURE II quadrivalent HPV vaccine cervical intraepithelial neoplasia NEJM",
            "prophylactic human papillomavirus vaccine cervical lesions efficacy",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "hybrid closed loop insulin delivery in type 1 diabetes",
        "block": "Endocrinology",
        "priority": "high",
        "aliases": [
            "Control-IQ",
            "Medtronic 670G",
            "artificial pancreas hybrid closed-loop",
            "automated insulin delivery T1D",
        ],
        "landmarkPmids": ["31618560", "27629148"],
        "guidelineQueries": [
            "ADA diabetes technology hybrid closed-loop automated insulin delivery guideline",
        ],
        "searchQueries": [
            "Control-IQ hybrid closed-loop insulin delivery type 1 diabetes Brown NEJM",
            "Medtronic 670G hybrid closed-loop outpatient safety Garg",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "hypersensitivity pneumonitis diagnosis and antigen avoidance",
        "block": "Respiratory",
        "priority": "high",
        "aliases": [
            "extrinsic allergic alveolitis",
            "fibrotic hypersensitivity pneumonitis",
            "ATS JRS ALAT HP guideline",
            "antigen avoidance HP",
        ],
        "landmarkPmids": ["32706311"],
        "guidelineQueries": [
            "ATS JRS ALAT hypersensitivity pneumonitis diagnosis antigen avoidance guideline",
        ],
        "searchQueries": [
            "ATS hypersensitivity pneumonitis clinical practice guideline HRCT BAL",
            "fibrotic versus non-fibrotic hypersensitivity pneumonitis antigen avoidance",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Hypertensive disorders of pregnancy and pre-eclampsia",
        "block": "Obstetrics",
        "priority": "high",
        "aliases": [
            "ASPRE",
            "gestational hypertension",
            "ACOG preeclampsia",
            "aspirin pre-eclampsia prevention",
        ],
        "landmarkPmids": ["28657417", "32443077", "34051884"],
        "guidelineQueries": [
            "ACOG gestational hypertension preeclampsia aspirin prevention practice bulletin",
        ],
        "searchQueries": [
            "ASPRE aspirin versus placebo preterm preeclampsia high-risk pregnancy NEJM",
            "USPSTF low-dose aspirin prevention preeclampsia",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Hypogranular APL Morphology Pitfalls",
        "block": "Haematology",
        "priority": "medium",
        "aliases": [
            "microgranular APL",
            "hypogranular acute promyelocytic leukemia",
            "APL variant morphology",
            "PML-RARA hypogranular",
        ],
        "landmarkPmids": ["11049992", "25304777"],
        "guidelineQueries": [
            "ELN NCCN acute promyelocytic leukemia microgranular variant diagnosis guideline",
        ],
        "searchQueries": [
            "Sainty microgranular variant acute promyelocytic leukemia morphology",
            "hypogranular APL diagnostic pitfalls flow cytometry PML-RARA",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "ICU renal replacement therapy initiation timing",
        "block": "Nephrology",
        "priority": "high",
        "aliases": [
            "AKIKI",
            "IDEAL-ICU",
            "STARRT-AKI",
            "early versus delayed RRT",
        ],
        "landmarkPmids": ["27181456", "30304656", "32668114"],
        "guidelineQueries": [
            "KDIGO AKI renal replacement therapy initiation timing critically ill guideline",
        ],
        "searchQueries": [
            "STARRT-AKI accelerated versus standard RRT initiation NEJM",
            "AKIKI IDEAL-ICU early versus delayed dialysis ICU AKI",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "igg4 related disease diagnosis and b cell depletion",
        "block": "Rheumatology",
        "priority": "high",
        "aliases": [
            "IgG4-RD rituximab",
            "ACR EULAR IgG4 classification",
            "Carruthers rituximab IgG4",
            "B-cell depletion IgG4",
        ],
        "landmarkPmids": ["25667206", "31793250"],
        "guidelineQueries": [
            "ACR EULAR IgG4-related disease classification criteria rituximab guideline",
        ],
        "searchQueries": [
            "Carruthers rituximab IgG4-related disease open-label trial",
            "ACR EULAR classification criteria IgG4-related disease 2019",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Infective endocarditis antibiotic duration and surgery",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "EASE trial",
            "early surgery infective endocarditis",
            "ESC AHA endocarditis surgery",
        ],
        "landmarkPmids": ["22738096", "32573316"],
        "guidelineQueries": [
            "AHA ESC infective endocarditis early surgery antibiotic duration guideline",
        ],
        "searchQueries": [
            "EASE early surgery versus conventional treatment infective endocarditis NEJM",
            "ESC AHA infective endocarditis surgery indication guideline",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Infective endocarditis antimicrobial and oral step-down strategy",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "POET trial",
            "partial oral endocarditis treatment",
            "oral step-down left-sided endocarditis",
        ],
        "landmarkPmids": ["30152252", "30699315"],
        "guidelineQueries": [
            "AHA ESC infective endocarditis oral step-down antibiotic duration guideline",
        ],
        "searchQueries": [
            "POET partial oral versus intravenous antibiotics left-sided endocarditis NEJM",
            "oral step-down therapy infective endocarditis randomized",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "intensive blood pressure control cardiovascular outcomes systolic",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "SPRINT",
            "systolic blood pressure intervention trial",
            "intensive SBP target",
            "BPLTTC",
        ],
        "landmarkPmids": ["26551272", "30354654"],
        "guidelineQueries": [
            "ACC AHA high blood pressure intensive systolic target SPRINT guideline",
        ],
        "searchQueries": [
            "SPRINT intensive versus standard systolic blood pressure cardiovascular outcomes NEJM",
            "blood pressure lowering treatment trialists collaboration intensive control",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "intensive glycemic targets in type 2 diabetes",
        "block": "Endocrinology",
        "priority": "high",
        "aliases": [
            "ACCORD",
            "ADVANCE",
            "VADT",
            "intensive HbA1c macrovascular",
        ],
        "landmarkPmids": ["18539917", "18539916", "19092145"],
        "guidelineQueries": [
            "ADA intensive versus standard glycemic targets type 2 diabetes ACCORD guideline",
        ],
        "searchQueries": [
            "ACCORD intensive glucose lowering type 2 diabetes mortality NEJM",
            "ADVANCE VADT intensive glycemic control macrovascular outcomes",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "intensive LDL cholesterol lowering statin meta-analysis",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "CTT collaboration",
            "PROVE IT-TIMI 22",
            "TNT treating to new targets",
            "intensive statin therapy",
        ],
        "landmarkPmids": ["22607822", "15007110", "15755765"],
        "guidelineQueries": [
            "AHA ACC blood cholesterol intensive LDL lowering statin guideline",
        ],
        "searchQueries": [
            "Cholesterol Treatment Trialists intensive LDL lowering statin meta-analysis",
            "PROVE IT-TIMI 22 TNT intensive versus moderate statin therapy",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "meta-analysis", "guideline"],
    },
    {
        "topic": "Intracerebral hemorrhage acute management",
        "block": "Neurology",
        "priority": "high",
        "aliases": [
            "INTERACT2",
            "ATACH-2",
            "spontaneous ICH blood pressure",
            "AHA ASA ICH",
        ],
        "landmarkPmids": ["23713578", "27276234", "35579034"],
        "guidelineQueries": [
            "AHA ASA spontaneous intracerebral hemorrhage blood pressure lowering guideline",
        ],
        "searchQueries": [
            "INTERACT2 rapid blood pressure lowering acute intracerebral hemorrhage",
            "ATACH-2 intensive blood pressure lowering ICH NEJM",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "invasive aspergillosis antifungal therapy",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": [
            "Herbrecht voriconazole",
            "SECURE isavuconazole",
            "IDSA aspergillosis",
            "mold-active antifungal",
        ],
        "landmarkPmids": ["12167683", "26684607", "27365388"],
        "guidelineQueries": [
            "IDSA invasive aspergillosis voriconazole isavuconazole guideline",
        ],
        "searchQueries": [
            "Herbrecht voriconazole versus amphotericin B invasive aspergillosis NEJM",
            "SECURE isavuconazole versus voriconazole invasive mould disease",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Irradiated, Leukoreduced and Washed Blood Products",
        "block": "Haematology",
        "priority": "medium",
        "aliases": [
            "TRAP trial",
            "leukoreduction CMV alloimmunization",
            "irradiated blood products TA-GVHD",
            "washed red cells",
        ],
        "landmarkPmids": ["9417523"],
        "guidelineQueries": [
            "AABB irradiated leukoreduced washed blood components transfusion guideline",
        ],
        "searchQueries": [
            "TRAP trial leukoreduction prevent platelet alloimmunization NEJM",
            "irradiated blood products transfusion-associated graft versus host disease",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Ischaemic heart disease and acute coronary syndromes",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "CURE clopidogrel",
            "PLATO ticagrelor",
            "ISCHEMIA trial",
            "NSTEMI early invasive",
        ],
        "landmarkPmids": ["11519503", "19717846", "32227755"],
        "guidelineQueries": [
            "ESC ACC AHA acute coronary syndrome antiplatelet invasive strategy guideline",
        ],
        "searchQueries": [
            "CURE clopidogrel unstable angina NSTEMI randomized",
            "PLATO ticagrelor ISCHEMIA stable coronary disease invasive strategy",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Juvenile idiopathic arthritis biologic strategy",
        "block": "Rheumatology",
        "priority": "high",
        "aliases": [
            "Lovell etanercept JIA",
            "tocilizumab JIA",
            "polyarticular JIA TNF inhibitor",
            "ACR JIA treatment",
        ],
        "landmarkPmids": ["10717011", "35233986"],
        "guidelineQueries": [
            "ACR juvenile idiopathic arthritis biologic DMARD treatment guideline",
        ],
        "searchQueries": [
            "Lovell etanercept polyarticular juvenile rheumatoid arthritis NEJM",
            "ACR JIA guideline TNF inhibitor IL-6 inhibitor",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "kidney transplant antibody mediated rejection",
        "block": "Nephrology",
        "priority": "high",
        "aliases": [
            "ABMR",
            "donor-specific antibody rejection",
            "plasmapheresis IVIG kidney transplant",
            "eculizumab bortezomib ABMR",
        ],
        "landmarkPmids": ["30586534", "19845597"],
        "guidelineQueries": [
            "KDIGO kidney transplant recipient antibody-mediated rejection plasmapheresis IVIG guideline",
        ],
        "searchQueries": [
            "antibody-mediated rejection solid-organ allografts plasmapheresis IVIG",
            "bortezomib eculizumab active antibody-mediated rejection kidney transplant",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Large bowel obstruction, volvulus, and pseudo-obstruction management",
        "block": "Gastroenterology",
        "priority": "medium",
        "aliases": [
            "CReST trial",
            "Ogilvie syndrome",
            "malignant large bowel obstruction stent",
            "sigmoid volvulus",
        ],
        "landmarkPmids": ["35986684", "30123315"],
        "guidelineQueries": [
            "WSES large bowel obstruction colorectal stenting volvulus Ogilvie guideline",
        ],
        "searchQueries": [
            "CReST colorectal endoscopic stenting versus emergency surgery obstruction",
            "acute colonic pseudo-obstruction Ogilvie neostigmine decompression",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Lateral epicondylitis (tennis elbow): assessment and management",
        "block": "Rheumatology",
        "priority": "medium",
        "aliases": [
            "tennis elbow",
            "Bisset mobilisation with movement",
            "corticosteroid injection epicondylitis",
            "AAOS tennis elbow",
        ],
        "landmarkPmids": ["17012266"],
        "guidelineQueries": [
            "AAOS lateral epicondylitis tennis elbow corticosteroid physiotherapy guideline",
        ],
        "searchQueries": [
            "Bisset mobilisation with movement versus corticosteroid injection tennis elbow BMJ",
            "corticosteroid injection versus physiotherapy lateral epicondylitis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Latex and perioperative allergy evaluation",
        "block": "Emergency Medicine",
        "priority": "medium",
        "aliases": [
            "NAP6",
            "perioperative anaphylaxis",
            "latex allergy healthcare workers",
            "WAO EAACI perioperative hypersensitivity",
        ],
        "landmarkPmids": ["29935567"],
        "guidelineQueries": [
            "WAO EAACI perioperative anaphylaxis latex allergy NAP6 guideline",
        ],
        "searchQueries": [
            "NAP6 Royal College Anaesthetists perioperative anaphylaxis audit",
            "latex allergy spina bifida healthcare workers perioperative hypersensitivity",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Leflunomide, Sulfasalazine, and Hydroxychloroquine toxicities",
        "block": "Rheumatology",
        "priority": "medium",
        "aliases": [
            "csDMARD toxicity",
            "HCQ retinopathy Marmor",
            "leflunomide hepatotoxicity",
            "sulfasalazine monitoring",
        ],
        "landmarkPmids": ["26992838", "30273183"],
        "guidelineQueries": [
            "ACR EULAR rheumatoid arthritis hydroxychloroquine retinopathy leflunomide monitoring guideline",
        ],
        "searchQueries": [
            "Marmor AAO hydroxychloroquine chloroquine retinopathy screening recommendations",
            "comparative safety conventional synthetic DMARDs rheumatoid arthritis",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Leukaostasis Syndrome",
        "block": "Haematology",
        "priority": "high",
        "aliases": [
            "hyperleukocytosis",
            "leukapheresis AML",
            "symptomatic leukostasis",
            "hydroxyurea cytoreduction",
        ],
        "landmarkPmids": ["22851508"],
        "guidelineQueries": [
            "NCCN AML hyperleukocytosis leukostasis leukapheresis hydroxyurea guideline",
        ],
        "searchQueries": [
            "leukapheresis versus cytoreductive therapy hyperleukocytosis acute leukemia",
            "hyperleukocytosis leukostasis acute myeloid leukemia management",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "lithium monitoring and toxicity prevention",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "BALANCE trial",
            "lithium toxicity",
            "NICE bipolar lithium monitoring",
            "lithium nephropathy thyroid",
        ],
        "landmarkPmids": ["20092882", "26003379"],
        "guidelineQueries": [
            "NICE bipolar disorder lithium monitoring renal thyroid toxicity guideline",
        ],
        "searchQueries": [
            "BALANCE lithium plus valproate bipolar disorder randomized Lancet",
            "long-term lithium renal endocrine adverse effects monitoring",
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
    lines = [f"{i}. {t}" for i, t in enumerate(topics, 126)]
    index.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_DIR}")


def enrich_corpus(topics: list[str]) -> None:
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    wanted = {t.lower() for t in topics}
    enriched = 0
    missing_topics = wanted - {t["topic"].lower() for t in corpus["topics"]}
    if missing_topics:
        raise SystemExit(f"Corpus missing topics: {sorted(missing_topics)}")
    for topic in corpus["topics"]:
        if topic["topic"].lower() not in wanted:
            continue
        for doc in topic["documents"]:
            if doc.get("pmid"):
                continue
            found = lookup_pmid(doc.get("title") or "")
            if not found:
                print(f"  NO PMID <- {doc.get('title', '')[:90]}")
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

    hap = by_name.get("hospital-acquired and ventilator-associated pneumonia")
    if hap:
        add_alias(hap, "hospital acquired and ventilator associated pneumonia")
        add_alias(hap, "Chastre 8 vs 15 days VAP")
        add_pmid(hap, "15051885")
        add_pmid(hap, "27518360")

    hcl = by_name.get("hybrid closed-loop insulin delivery in type 1 diabetes")
    if hcl:
        add_alias(hcl, "hybrid closed loop insulin delivery in type 1 diabetes")
        add_alias(hcl, "Medtronic 670G")
        add_pmid(hcl, "31618560")
        add_pmid(hcl, "27654684")

    igg4 = by_name.get("igg4-related disease diagnosis and b-cell depletion")
    if igg4:
        add_alias(igg4, "igg4 related disease diagnosis and b cell depletion")
        add_pmid(igg4, "25667206")

    ie = by_name.get("infective endocarditis antibiotic duration and surgery")
    if ie:
        add_alias(ie, "Infective endocarditis antimicrobial and oral step-down strategy")
        add_alias(ie, "EASE trial")
        add_pmid(ie, "22738096")
        add_pmid(ie, "30152252")

    icu_rrt = by_name.get("icu renal replacement therapy initiation timing")
    if icu_rrt:
        add_alias(icu_rrt, "IDEAL-ICU")
        add_pmid(icu_rrt, "30304656")
        add_pmid(icu_rrt, "27181456")

    htn = by_name.get("hypertension treatment intensity")
    if htn:
        add_alias(htn, "intensive blood pressure control cardiovascular outcomes systolic")
        add_pmid(htn, "26551272")

    ldl = by_name.get("ldl lowering and ascvd prevention")
    if ldl:
        add_alias(ldl, "intensive LDL cholesterol lowering statin meta-analysis")
        add_pmid(ldl, "15007110")
        add_pmid(ldl, "16214546")
        add_pmid(ldl, "22607822")

    pree = by_name.get("preeclampsia prevention aspirin")
    if pree:
        add_alias(pree, "Hypertensive disorders of pregnancy and pre-eclampsia")
        add_pmid(pree, "28657417")
        add_pmid(pree, "32443077")

    acs = by_name.get("acute coronary syndrome antiplatelet strategy")
    if acs:
        add_alias(acs, "Ischaemic heart disease and acute coronary syndromes")
        add_alias(acs, "CURE")
        add_pmid(acs, "11617243")
        add_pmid(acs, "19717846")

    ischemia = by_name.get("stable coronary disease invasive strategy")
    if ischemia:
        add_alias(ischemia, "Ischaemic heart disease and acute coronary syndromes")
        add_pmid(ischemia, "32227755")

    glycemic = by_name.get("intensive glycemic targets in type 2 diabetes")
    if glycemic:
        add_pmid(glycemic, "19321055")
        add_pmid(glycemic, "18539916")

    ich = by_name.get("intracerebral hemorrhage acute management")
    if ich:
        add_pmid(ich, "23713578")
        add_pmid(ich, "34775721")

    aspergillus = by_name.get("invasive aspergillosis antifungal therapy")
    if aspergillus:
        add_pmid(aspergillus, "12192037")
        add_pmid(aspergillus, "26679684")

    jia = by_name.get("juvenile idiopathic arthritis biologic strategy")
    if jia:
        add_alias(jia, "Lovell etanercept")
        add_pmid(jia, "10738050")

    ra = by_name.get("rheumatoid arthritis initial dmard strategy")
    if ra:
        add_alias(ra, "Leflunomide, Sulfasalazine, and Hydroxychloroquine toxicities")
        add_alias(ra, "HCQ retinopathy")
        add_pmid(ra, "26992838")

    existing = {t["topic"].lower() for t in config["topics"]}
    added = 0
    for row in NEW_FLAGSHIP:
        if row["topic"].lower() in existing:
            continue
        config["topics"].append(row)
        existing.add(row["topic"].lower())
        added += 1

    config["version"] = 15
    config["targets"]["flagshipCount"] = len(config["topics"])
    config["description"] = (
        f"Flagship-topic program - {len(config['topics'])} topics spanning evidence + learning surfaces, "
        "including curated literature cohorts Topics 51-75, Topics 76-100, and Topics 126-150."
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
