#!/usr/bin/env python3
"""Adopt Topics 76-100 as the next curated/flagship working set."""
from __future__ import annotations

import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

import openpyxl

REPO = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis")
XLSX_SRC = Path(r"C:\Users\ansh0\Downloads\Topics_76_to_100_Curated_Literature.xlsx")
OUT_DIR = REPO / "outputs" / "topics-76-100-curated-literature"
CORPUS_PATH = REPO / "data" / "curated-literature-corpus.json"
FLAGSHIP_PATH = REPO / "server" / "config" / "flagshipTopics.json"
UA = "SignalMD/2.0 (topics 76-100 curated literature)"

TITLE_PMIDS = {
    "nice guideline [cg103]": ("30725639", 2019),
    "non-pharmacological interventions for preventing delirium": ("32267035", 2020),
    "hospital elder life program": ("10053175", 1999),
    "inouye et al. help": ("10053175", 1999),
    "delirium in elderly people": ("23992774", 2014),
    "american geriatrics society (ags) clinical practice guideline for postoperative delirium": ("25834944", 2015),
    "efficacy of haloperidol and atypical antipsychotics in delirium": ("30346242", 2018),
    "aid-icu": ("36516078", 2022),
    "prevention and management of delirium in older adults": ("31852673", 2019),
    "apa guideline on the use of antipsychotics": ("26717525", 2016),
    "antipsychotics for bpsd": ("17015824", 2006),
    "catie-ad": ("17015824", 2006),
    "management of behavioral and psychological symptoms of dementia": ("28716301", 2017),
    "nice guidelines for depression in adults": ("31857432", 2020),
    "cbt vs pharmacotherapy": ("23219570", 2013),
    "cobalt trial": ("23219570", 2013),
    "treatment of depression and anxiety in primary care": ("26813228", 2016),
    "apa clinical practice guideline for the treatment of depression": ("31857432", 2019),
    "comparative efficacy and acceptability of 21 antidepressant": ("29477251", 2018),
    "star*d": ("16877653", 2006),
    "major depressive disorder (nejm)": ("33211928", 2020),
    "asa practice guidelines for management of the difficult airway": ("34762729", 2022),
    "videolaryngoscopy vs direct laryngoscopy": ("34751747", 2022),
    "nap4": ("21757576", 2011),
    "management of the difficult airway in adults": ("34762729", 2022),
    "nccn guidelines: b-cell lymphomas": ("34921021", 2021),
    "car t-cell therapy in rr-dlbcl": ("29226797", 2017),
    "zuma-1": ("29226797", 2017),
    "juliet": ("30501490", 2019),
    "transform": ("36580657", 2022),
    "car t cells for diffuse large b-cell lymphoma": ("34891224", 2022),
    "decisions relating to cardiopulmonary resuscitation": ("27534952", 2016),
    "impact of advance care planning": ("27017045", 2016),
    "support trial": ("7474243", 1995),
    "advance care planning in serious illness": ("27017045", 2016),
    "british association of dermatologists (bad) guidelines for the management of sjs": ("27539863", 2016),
    "corticosteroids vs ivig vs cyclosporine": ("28832948", 2017),
    "euroscar": ("17943129", 2008),
    "severe cutaneous adverse reactions to drugs": ("22784068", 2012),
    "aad guidelines for atopic dermatitis": ("34904722", 2022),
    "efficacy of dupilumab in type 2": ("27690741", 2016),
    "solo-1": ("27690741", 2016),
    "solo-2": ("27622930", 2016),
    "liberty asthma quest": ("29782217", 2018),
    "targeting il-4 and il-13": ("29782217", 2018),
    "ishlt guidelines for the care of patients with lvads": ("31983666", 2020),
    "survival and adverse events with continuous-flow lvads": ("30883052", 2019),
    "momentum 3": ("30883052", 2019),
    "rematch": ("11794191", 2001),
    "left ventricular assist devices for advanced heart failure": ("30883052", 2019),
    "aha/acc/multisociety blood cholesterol": ("30423393", 2019),
    "cholesterol treatment trialists": ("22607822", 2012),
    "4s trial": ("7968073", 1994),
    "prove-it": ("15007110", 2004),
    "fourier": ("27959767", 2017),
    "lipid-lowering therapies": ("30423393", 2019),
    "marsipan": ("23772060", 2013),
    "risk factors and incidence of refeeding syndrome": ("26912408", 2016),
    "caloric advancement in severe anorexia": ("27367843", 2016),
    "refeeding syndrome: pathophysiology": ("23393181", 2013),
    "who therapeutics for ebola": ("31774950", 2019),
    "efficacy of monoclonal antibodies in evd": ("31774950", 2019),
    "palm trial": ("31774950", 2019),
    "ebola virus disease: advances in treatment": ("31774950", 2019),
    "acog practice bulletin on tubal ectopic": ("31812915", 2018),
    "single vs multiple dose methotrexate": ("25569010", 2015),
    "expectant, medical, and surgical management of ectopic": ("31812915", 2018),
    "diagnosis and management of ectopic pregnancy": ("31812915", 2018),
    "fsrh clinical guideline: emergency contraception": ("33077526", 2020),
    "levonorgestrel vs ulipristal": ("20116841", 2010),
    "glasier et al": ("20116841", 2010),
    "emergency contraception (nejm)": ("20116841", 2010),
    "ada standards of medical care in diabetes": ("36507646", 2023),
    "sglt2 inhibitors for cardiovascular outcomes": ("26378978", 2015),
    "empa-reg outcome": ("26378978", 2015),
    "cardiovascular benefits of sglt2": ("26378978", 2015),
    "kdigo clinical practice guideline for diabetes management in ckd": ("36272729", 2022),
    "renal outcomes of sglt2": ("36331190", 2023),
    "empa-kidney": ("36331190", 2023),
    "sglt2 inhibitors in chronic kidney disease": ("36331190", 2023),
    "aha scientific statement on infective endocarditis": ("32573316", 2020),
    "oral step-down therapy vs continuous iv": ("30699315", 2019),
    "poet trial": ("30699315", 2019),
    "infective endocarditis update": ("32573316", 2020),
    "aha/asa guidelines for the early management": ("31662037", 2019),
    "hermes collaboration": ("26898852", 2016),
    "mr clean": ("25671797", 2015),
    "dawn": ("29129157", 2018),
    "defuse 3": ("29364767", 2018),
    "endovascular therapy for acute ischemic stroke": ("26898852", 2016),
    "british committee for standards in haematology (bcsh) guidelines for eosinophilia": ("28112388", 2017),
    "diagnostic yield of investigations in unexplained eosinophilia": ("25398933", 2015),
    "who classification criteria for eosinophilic disorders": ("28778865", 2017),
    "approach to the patient with unexplained eosinophilia": ("25398933", 2015),
    "acg clinical guideline for eosinophilic esophagitis": ("33648790", 2021),
    "topical corticosteroids vs elimination diets": ("32721437", 2020),
    "swallowed fluticasone": ("32721437", 2020),
    "dupilumab (nejm 2022)": ("35613023", 2022),
    "dellon et al": ("35613023", 2022),
    "eosinophilic esophagitis: diagnosis and treatment": ("33648790", 2021),
    "ilae and aan/aes guidelines": ("34931602", 2021),
    "network meta-analysis of newer antiepileptic": ("33740486", 2021),
    "sanad i": ("17412507", 2007),
    "sanad ii": ("34931602", 2021),
    "medical management of epilepsy in adults": ("34931602", 2021),
    "aao-hnsf clinical practice guideline on epistaxis": ("31913762", 2020),
    "topical tranexamic acid vs anterior packing": ("29103794", 2018),
    "zahed et al": ("23911337", 2013),
    "management of epistaxis": ("31913762", 2020),
    "nccn guidelines: esophageal": ("34921021", 2021),
    "neoadjuvant chemoradiation vs surgery alone": ("22646630", 2012),
    "cross trial": ("22646630", 2012),
    "multimodality treatment for esophageal cancer": ("22646630", 2012),
}

NEW_FLAGSHIP = [
    {
        "topic": "Delirium and acute confusional states",
        "block": "Critical Care",
        "priority": "high",
        "aliases": [
            "NICE CG103 delirium",
            "Hospital Elder Life Program",
            "HELP trial delirium",
            "acute confusional state",
        ],
        "landmarkPmids": ["10053175", "32267035", "23992774"],
        "guidelineQueries": [
            "NICE delirium prevention diagnosis management CG103",
        ],
        "searchQueries": [
            "Hospital Elder Life Program multicomponent intervention prevent delirium Inouye",
            "non-pharmacological interventions preventing delirium Cochrane review",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Delirium: recognition, risk factors, prevention and management",
        "block": "Critical Care",
        "priority": "high",
        "aliases": [
            "postoperative delirium",
            "AID-ICU",
            "AGS postoperative delirium",
            "haloperidol ICU delirium",
        ],
        "landmarkPmids": ["36516078", "25834944", "30346242"],
        "guidelineQueries": [
            "American Geriatrics Society postoperative delirium prevention treatment guideline",
        ],
        "searchQueries": [
            "AID-ICU haloperidol versus placebo ICU delirium randomized NEJM",
            "AGS clinical practice guideline postoperative delirium older adults",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Dementia: behavioural and psychological symptoms management",
        "block": "Neurology",
        "priority": "high",
        "aliases": [
            "BPSD",
            "CATIE-AD",
            "agitation dementia antipsychotics",
            "behavioural symptoms Alzheimer",
        ],
        "landmarkPmids": ["17015824", "26717525"],
        "guidelineQueries": [
            "APA antipsychotics agitation psychosis dementia guideline BPSD",
        ],
        "searchQueries": [
            "CATIE-AD antipsychotics Alzheimer disease behavioural symptoms randomized",
            "APA guideline antipsychotics agitation psychosis dementia",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Depression and anxiety disorders",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "generalised anxiety disorder",
            "CoBalT",
            "CBT depression anxiety",
            "NICE depression adults",
        ],
        "landmarkPmids": ["23219570", "29477251"],
        "guidelineQueries": [
            "NICE depression adults generalised anxiety disorder CBT antidepressant guideline",
        ],
        "searchQueries": [
            "CoBalT cognitive behavioural therapy adjunct antidepressants primary care Lancet",
            "NICE depression anxiety disorder guideline CBT pharmacotherapy",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Depression: diagnosis, pharmacotherapy and monitoring",
        "block": "Psychiatry",
        "priority": "high",
        "aliases": [
            "STAR*D",
            "major depressive disorder pharmacotherapy",
            "Cipriani antidepressant network meta-analysis",
            "APA depression treatment guideline",
        ],
        "landmarkPmids": ["16877653", "29477251", "16554526"],
        "guidelineQueries": [
            "APA clinical practice guideline treatment depression antidepressant monitoring",
        ],
        "searchQueries": [
            "STAR*D sequenced treatment alternatives relieve depression randomized",
            "comparative efficacy 21 antidepressant drugs network meta-analysis Lancet Cipriani",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Difficult airway management",
        "block": "Emergency Medicine",
        "priority": "high",
        "aliases": [
            "ASA difficult airway",
            "NAP4",
            "videolaryngoscopy",
            "failed intubation",
        ],
        "landmarkPmids": ["34762729", "21757576"],
        "guidelineQueries": [
            "ASA practice guidelines management difficult airway videolaryngoscopy",
        ],
        "searchQueries": [
            "ASA difficult airway management guideline 2022 videolaryngoscopy",
            "NAP4 Royal College Anaesthetists major airway complications audit",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "diffuse large b cell lymphoma car t cell therapy in relapsed refractory disease",
        "block": "Haematology",
        "priority": "high",
        "aliases": [
            "ZUMA-1",
            "JULIET",
            "TRANSFORM CAR-T",
            "axicabtagene ciloleucel DLBCL",
            "tisagenlecleucel",
        ],
        "landmarkPmids": ["29226797", "30501490", "36580657", "34891224"],
        "guidelineQueries": [
            "NCCN B-cell lymphoma CAR-T relapsed refractory DLBCL guideline",
        ],
        "searchQueries": [
            "ZUMA-1 axicabtagene ciloleucel refractory large B-cell lymphoma NEJM",
            "TRANSFORM lisocabtagene maraleucel second-line DLBCL randomized",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "DNACPR, treatment escalation planning and advance care planning",
        "block": "Critical Care",
        "priority": "medium",
        "aliases": [
            "DNACPR",
            "do not attempt CPR",
            "treatment escalation plan",
            "SUPPORT trial",
            "advance care planning",
        ],
        "landmarkPmids": ["7474243", "27017045"],
        "guidelineQueries": [
            "Resuscitation Council UK BMA RCN decisions relating to cardiopulmonary resuscitation DNACPR",
        ],
        "searchQueries": [
            "SUPPORT trial prognoses preferences outcomes risks treatments seriously ill",
            "advance care planning end of life outcomes systematic review",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Drug eruptions and severe cutaneous adverse reactions (SCAR)",
        "block": "Dermatology",
        "priority": "high",
        "aliases": [
            "SJS TEN",
            "Stevens-Johnson syndrome",
            "toxic epidermal necrolysis",
            "EuroSCAR",
            "DRESS",
        ],
        "landmarkPmids": ["17943129", "27539863", "22784068"],
        "guidelineQueries": [
            "BAD Stevens-Johnson syndrome toxic epidermal necrolysis management guideline",
        ],
        "searchQueries": [
            "EuroSCAR risk factors severe cutaneous adverse reactions drugs",
            "corticosteroids IVIG cyclosporine SJS TEN systematic review",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "dupilumab il 4 il 13 inhibitor biologic therapy",
        "block": "Dermatology",
        "priority": "high",
        "aliases": [
            "dupilumab",
            "SOLO-1 SOLO-2",
            "LIBERTY ASTHMA QUEST",
            "IL-4 IL-13 inhibitor",
            "Dupixent",
        ],
        "landmarkPmids": ["27690741", "27622930", "29782217"],
        "guidelineQueries": [
            "AAD atopic dermatitis dupilumab GINA asthma biologic guideline",
        ],
        "searchQueries": [
            "dupilumab SOLO-1 SOLO-2 moderate-severe atopic dermatitis randomized NEJM",
            "LIBERTY ASTHMA QUEST dupilumab uncontrolled asthma randomized",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Dyslipidaemia and cardiovascular risk modification",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "4S trial",
            "PROVE-IT",
            "FOURIER",
            "CTT collaboration",
            "AHA ACC cholesterol guideline",
        ],
        "landmarkPmids": ["7968073", "15007110", "27959767", "30423393"],
        "guidelineQueries": [
            "AHA ACC multisociety blood cholesterol guideline LDL ASCVD",
        ],
        "searchQueries": [
            "4S simvastatin Scandinavian survival study coronary disease",
            "FOURIER evolocumab PCSK9 cardiovascular outcomes randomized",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Eating disorders and refeeding syndrome",
        "block": "Endocrinology",
        "priority": "medium",
        "aliases": [
            "MARSIPAN",
            "anorexia nervosa medical management",
            "refeeding syndrome",
            "caloric advancement anorexia",
        ],
        "landmarkPmids": ["23772060", "27367843"],
        "guidelineQueries": [
            "MARSIPAN management really sick patients anorexia nervosa refeeding guideline",
        ],
        "searchQueries": [
            "refeeding syndrome anorexia nervosa caloric advancement randomized",
            "MARSIPAN junior MARSIPAN eating disorder medical management guideline",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "ebola virus disease therapeutics and supportive care",
        "block": "Infectious Diseases",
        "priority": "high",
        "aliases": [
            "PALM trial",
            "REGN-EB3",
            "ansuvimab mAb114",
            "Ebola monoclonal antibody",
        ],
        "landmarkPmids": ["31774950"],
        "guidelineQueries": [
            "WHO therapeutics Ebola virus disease monoclonal antibody guideline",
        ],
        "searchQueries": [
            "PALM trial mAb114 REGN-EB3 ZMapp Ebola randomized NEJM",
            "WHO Ebola virus disease therapeutics supportive care guideline",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Ectopic pregnancy: diagnosis and management",
        "block": "Obstetrics",
        "priority": "high",
        "aliases": [
            "tubal ectopic pregnancy",
            "methotrexate ectopic",
            "ACOG ectopic pregnancy",
            "ruptured ectopic",
        ],
        "landmarkPmids": ["31812915", "25569010"],
        "guidelineQueries": [
            "ACOG practice bulletin tubal ectopic pregnancy methotrexate surgery",
        ],
        "searchQueries": [
            "single versus multiple dose methotrexate ectopic pregnancy randomized",
            "ACOG tubal ectopic pregnancy diagnosis management guideline",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Emergency contraception: mechanisms, timing and clinical guidance",
        "block": "Obstetrics",
        "priority": "medium",
        "aliases": [
            "ulipristal acetate",
            "levonorgestrel emergency contraception",
            "FSRH emergency contraception",
            "ellaOne",
        ],
        "landmarkPmids": ["20116841"],
        "guidelineQueries": [
            "FSRH clinical guideline emergency contraception ulipristal levonorgestrel copper IUD",
        ],
        "searchQueries": [
            "Glasier ulipristal acetate versus levonorgestrel emergency contraception Lancet",
            "FSRH emergency contraception guideline timing copper IUD",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "empagliflozin cardiovascular outcomes type 2 diabetes EMPA-REG",
        "block": "Endocrinology",
        "priority": "high",
        "aliases": [
            "EMPA-REG OUTCOME",
            "empagliflozin T2DM cardiovascular",
            "SGLT2 cardiovascular outcomes",
        ],
        "landmarkPmids": ["26378978"],
        "guidelineQueries": [
            "ADA standards of care type 2 diabetes SGLT2 cardiovascular disease empagliflozin",
        ],
        "searchQueries": [
            "EMPA-REG OUTCOME empagliflozin cardiovascular death type 2 diabetes NEJM",
            "SGLT2 inhibitors cardiovascular outcomes type 2 diabetes meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "empagliflozin chronic kidney disease progression",
        "block": "Nephrology",
        "priority": "high",
        "aliases": [
            "EMPA-KIDNEY",
            "SGLT2 CKD progression",
            "empagliflozin kidney outcomes",
        ],
        "landmarkPmids": ["36331190"],
        "guidelineQueries": [
            "KDIGO diabetes CKD SGLT2 inhibitor empagliflozin guideline",
        ],
        "searchQueries": [
            "EMPA-KIDNEY empagliflozin chronic kidney disease progression randomized NEJM",
            "SGLT2 inhibitors kidney outcomes with and without diabetes meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Endocarditis and prophylaxis",
        "block": "Cardiology",
        "priority": "high",
        "aliases": [
            "POET trial",
            "infective endocarditis prophylaxis",
            "AHA endocarditis",
            "oral step-down endocarditis",
        ],
        "landmarkPmids": ["30699315", "32573316"],
        "guidelineQueries": [
            "AHA ESC infective endocarditis prophylaxis antibiotic duration guideline",
        ],
        "searchQueries": [
            "POET partial oral versus intravenous antibiotic treatment endocarditis NEJM",
            "infective endocarditis antibiotic prophylaxis AHA scientific statement",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "endovascular thrombectomy time to treatment ischemic stroke meta-analysis",
        "block": "Neurology",
        "priority": "high",
        "aliases": [
            "HERMES collaboration",
            "MR CLEAN",
            "DAWN",
            "DEFUSE 3",
            "late-window thrombectomy",
        ],
        "landmarkPmids": ["26898852", "25671797", "29129157", "29364767"],
        "guidelineQueries": [
            "AHA ASA early management acute ischemic stroke endovascular thrombectomy guideline",
        ],
        "searchQueries": [
            "HERMES collaboration endovascular thrombectomy ischaemic stroke meta-analysis",
            "DAWN DEFUSE 3 late window thrombectomy randomized NEJM",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "meta-analysis", "guideline"],
    },
    {
        "topic": "Eosinophilia Differential Diagnosis",
        "block": "Haematology",
        "priority": "medium",
        "aliases": [
            "hypereosinophilic syndrome",
            "unexplained eosinophilia",
            "BCSH eosinophilia",
            "WHO eosinophilic disorders",
        ],
        "landmarkPmids": ["25398933", "28778865"],
        "guidelineQueries": [
            "BCSH BSH eosinophilia investigation hypereosinophilic syndrome guideline",
        ],
        "searchQueries": [
            "approach unexplained eosinophilia differential diagnosis Blood Gotlib",
            "WHO classification eosinophilic disorders hypereosinophilic syndrome",
        ],
        "requiredStudyTypes": ["guideline", "review"],
    },
    {
        "topic": "Eosinophilic esophagitis topical steroid and elimination diet",
        "block": "Gastroenterology",
        "priority": "high",
        "aliases": [
            "EoE swallowed steroid",
            "six-food elimination diet",
            "dupilumab eosinophilic esophagitis",
            "ACG EoE guideline",
        ],
        "landmarkPmids": ["35613023", "33648790", "32721437"],
        "guidelineQueries": [
            "ACG eosinophilic esophagitis topical corticosteroid elimination diet dupilumab guideline",
        ],
        "searchQueries": [
            "dupilumab eosinophilic esophagitis randomized NEJM Dellon",
            "swallowed budesonide fluticasone versus elimination diet eosinophilic esophagitis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "Epistaxis: assessment and management",
        "block": "Emergency Medicine",
        "priority": "medium",
        "aliases": [
            "nosebleed",
            "tranexamic acid epistaxis",
            "AAO-HNSF epistaxis",
            "anterior packing",
        ],
        "landmarkPmids": ["31913762", "23911337", "29103794"],
        "guidelineQueries": [
            "AAO-HNSF clinical practice guideline epistaxis nosebleed tranexamic acid",
        ],
        "searchQueries": [
            "topical tranexamic acid versus anterior packing epistaxis randomized Zahed",
            "AAO-HNSF epistaxis clinical practice guideline",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
    {
        "topic": "esophageal cancer neoadjuvant chemoradiation",
        "block": "Oncology",
        "priority": "high",
        "aliases": [
            "CROSS trial",
            "neoadjuvant chemoradiotherapy oesophageal cancer",
            "NCCN esophageal cancer",
            "oesophageal adenocarcinoma squamous",
        ],
        "landmarkPmids": ["22646630"],
        "guidelineQueries": [
            "NCCN esophageal esophagogastric junction cancer neoadjuvant chemoradiation guideline",
        ],
        "searchQueries": [
            "CROSS trial neoadjuvant chemoradiotherapy oesophageal cancer van Hagen NEJM",
            "neoadjuvant chemoradiation versus surgery alone esophageal cancer meta-analysis",
        ],
        "requiredStudyTypes": ["randomized controlled trial", "guideline"],
    },
]


def epmc_search(query: str) -> dict | None:
    url = (
        "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query="
        + urllib.parse.quote(query)
        + "&format=json&pageSize=1&resultType=lite"
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        hits = data.get("resultList", {}).get("result") or []
        return hits[0] if hits else None
    except Exception as exc:  # noqa: BLE001
        print(f"  EPMC warn: {query[:80]} -> {exc}")
        return None


def lookup_pmid(title: str) -> tuple[str, int] | None:
    key = title.lower()
    for needle, value in TITLE_PMIDS.items():
        if needle in key:
            return value
    hit = epmc_search(f'TITLE:"{title.split("(")[0].strip()}"')
    time.sleep(0.25)
    if hit and hit.get("pmid"):
        year = int(hit["pubYear"]) if str(hit.get("pubYear") or "").isdigit() else None
        return str(hit["pmid"]), year
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
    lines = [f"{i}. {t}" for i, t in enumerate(topics, 76)]
    index.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_DIR}")


def enrich_corpus(topics: list[str]) -> None:
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    wanted = {t.lower() for t in topics}
    enriched = 0
    for topic in corpus["topics"]:
        if topic["topic"].lower() not in wanted:
            continue
        for doc in topic["documents"]:
            if doc.get("pmid"):
                continue
            found = lookup_pmid(doc.get("title") or "")
            if not found:
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

    icu_delirium = by_name.get("icu-acquired delirium: prevention, assessment, and treatment")
    if icu_delirium:
        add_alias(icu_delirium, "AID-ICU")
        add_alias(icu_delirium, "Delirium: recognition, risk factors, prevention and management")
        add_pmid(icu_delirium, "36516078")

    mdd = by_name.get("major depressive disorder pharmacotherapy")
    if mdd:
        add_alias(mdd, "Depression: diagnosis, pharmacotherapy and monitoring")
        add_alias(mdd, "STAR*D")
        add_pmid(mdd, "16877653")

    dlbcl = by_name.get(
        "diffuse large b-cell lymphoma: car-t cell therapy in relapsed/refractory disease"
    )
    if dlbcl:
        add_alias(dlbcl, "diffuse large b cell lymphoma car t cell therapy in relapsed refractory disease")
        add_alias(dlbcl, "ZUMA-1")
        add_alias(dlbcl, "JULIET")
        add_pmid(dlbcl, "29226797")
        add_pmid(dlbcl, "30501490")

    dupilumab = by_name.get("dupilumab (il-4/il-13 inhibitor) biologic therapy")
    if dupilumab:
        add_alias(dupilumab, "dupilumab il 4 il 13 inhibitor biologic therapy")
        add_alias(dupilumab, "SOLO-1")
        add_pmid(dupilumab, "27690741")

    lvad = by_name.get("durable lvad therapy for advanced heart failure")
    if lvad:
        add_alias(lvad, "HeartMate 3")
        add_pmid(lvad, "30883052")

    ldl = by_name.get("ldl lowering and ascvd prevention")
    if ldl:
        add_alias(ldl, "Dyslipidaemia and cardiovascular risk modification")
        add_alias(ldl, "4S")
        add_pmid(ldl, "7968073")
        add_pmid(ldl, "27959767")

    t2dm = by_name.get("type 2 diabetes cardiovascular outcomes")
    if t2dm:
        add_alias(t2dm, "empagliflozin cardiovascular outcomes type 2 diabetes EMPA-REG")
        add_pmid(t2dm, "26378978")

    ckd = by_name.get("chronic kidney disease sglt2 inhibitors")
    if ckd:
        add_alias(ckd, "empagliflozin chronic kidney disease progression")
        add_pmid(ckd, "36331190")

    ie = by_name.get("infective endocarditis antibiotic duration and surgery")
    if ie:
        add_alias(ie, "Endocarditis and prophylaxis")
        add_pmid(ie, "30699315")

    stroke = by_name.get("acute ischemic stroke reperfusion")
    if stroke:
        add_alias(stroke, "endovascular thrombectomy time to treatment ischemic stroke meta-analysis")
        add_alias(stroke, "HERMES")
        add_pmid(stroke, "26898852")
        add_pmid(stroke, "25671797")

    eoe = by_name.get("eosinophilic esophagitis targeted therapy")
    if eoe:
        add_alias(eoe, "Eosinophilic esophagitis topical steroid and elimination diet")
        add_pmid(eoe, "35613023")

    epilepsy = by_name.get("epilepsy antiseizure medication selection")
    if epilepsy:
        add_alias(epilepsy, "SANAD I")
        add_pmid(epilepsy, "17412507")

    existing = {t["topic"].lower() for t in config["topics"]}
    added = 0
    for row in NEW_FLAGSHIP:
        if row["topic"].lower() in existing:
            continue
        config["topics"].append(row)
        existing.add(row["topic"].lower())
        added += 1

    config["version"] = 14
    config["targets"]["flagshipCount"] = len(config["topics"])
    config["description"] = (
        f"Flagship-topic program - {len(config['topics'])} topics spanning evidence + learning surfaces, "
        "including curated literature cohort Topics 51-75 and Topics 76-100."
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
