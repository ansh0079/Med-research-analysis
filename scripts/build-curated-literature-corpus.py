#!/usr/bin/env python3
"""Convert curated literature Excel workbooks into data/curated-literature-corpus.json.

Reads Topics_1_to_25 through Topics_76_to_100, Topics_126_to_225, and Topics_251_to_282 workbooks by default.
Preserves richer existing corpus entries (URLs/PMCIDs) and merges new Excel topics.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

DOWNLOADS = Path(r"c:\Users\ansh0\Downloads")
XLSX_FILES = [
    DOWNLOADS / "Topics_1_to_25_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_26_to_50_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_51_to_75_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_76_to_100_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_126_to_150_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_151_to_175_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_176_to_200_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_201_to_225_Curated_Literature.xlsx",
    DOWNLOADS / "Topics_251_to_282_Curated_Literature.xlsx",
]
OUT = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis\data\curated-literature-corpus.json")
REPO = Path(r"c:\Users\ansh0\OneDrive\Documents\medical research analysis")

PMID_RE = re.compile(r"PMID[:\s]*([0-9]{5,9})", re.I)
YEAR_RE = re.compile(r"\b((?:19|20)\d{2})\b")

COL_TYPE = {
    "Guidelines": "clinical_practice_guideline",
    "Meta-Analyses": "systematic_review_meta_analysis",
    "Landmark Studies": "landmark_study",
    "Review Articles": "review_article",
}


def split_entries(cell: str | None) -> list[str]:
    if not cell:
        return []
    text = str(cell).strip()
    if not text:
        return []
    # Split on semicolons/newlines, or comma before a new Title Case phrase / trial name.
    parts = re.split(r"\s*[;\n]+\s*|(?<=\))\s*,\s*(?=[A-Z])|\s*,\s+(?=[A-Z][A-Za-z0-9\- ]{0,40}Trial\b)", text)
    out = [p.strip(" ,;") for p in parts if p and p.strip(" ,;")]
    return out or [text]


def infer_type(raw: str, default: str) -> str:
    t = raw.lower()
    if default == "landmark_study" and ("trial" in t or "randomized" in t or "randomised" in t or "nejm" in t):
        return "randomized_controlled_trial"
    if default == "Meta-Analyses" or "meta-analysis" in t or "systematic review" in t:
        return "systematic_review_meta_analysis"
    return default


def parse_doc(raw: str, doc_type: str) -> dict:
    pmids = PMID_RE.findall(raw)
    year_m = YEAR_RE.search(raw)
    year = int(year_m.group(1)) if year_m else None
    title = PMID_RE.sub("", raw)
    title = re.sub(r"\(\s*\)", "", title)
    title = re.sub(r"\s{2,}", " ", title).strip(" ,;-")
    # Drop trailing empty parenthetical left by PMID removal, e.g. "Name ()"
    title = re.sub(r"\s*\(\s*\)\s*", " ", title).strip()
    doc_type = infer_type(raw, doc_type)
    doc: dict = {"title": title, "type": doc_type}
    if pmids:
        doc["pmid"] = pmids[0]
        doc["url"] = f"https://pubmed.ncbi.nlm.nih.gov/{pmids[0]}/"
    if year:
        doc["year"] = year
    if len(pmids) > 1:
        doc["extraPmids"] = pmids[1:]
    return doc


def doc_key(d: dict) -> str:
    return str(d.get("pmid") or d.get("doi") or d.get("pmcid") or d.get("url") or d.get("title") or "").strip().lower()


def merge_docs(preferred: list[dict], incoming: list[dict]) -> list[dict]:
    """Keep preferred (richer) docs first; append incoming only when identity is new."""
    out = list(preferred)
    have = {doc_key(d) for d in out if doc_key(d)}
    have_pmids = {str(d.get("pmid")).lower() for d in out if d.get("pmid")}
    have_titles = {str(d.get("title") or "").strip().lower() for d in out if d.get("title")}
    for d in incoming:
        k = doc_key(d)
        pmid = str(d.get("pmid") or "").lower()
        title = str(d.get("title") or "").strip().lower()
        if pmid and pmid in have_pmids:
            continue
        if k and k in have:
            continue
        if title and title in have_titles:
            continue
        out.append(d)
        if k:
            have.add(k)
        if pmid:
            have_pmids.add(pmid)
        if title:
            have_titles.add(title)
    return out


def load_git_existing() -> dict[str, dict]:
    """Best-effort: prefer on-disk previous if still present pattern, else empty.

    Caller passes prior corpus from git via OUT backup if needed.
    """
    return {}


def load_prior() -> dict:
    """Prefer the on-disk corpus (keeps PMID enrichments), else git HEAD."""
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    import subprocess

    prior_raw = subprocess.check_output(
        ["git", "show", "HEAD:data/curated-literature-corpus.json"],
        cwd=str(REPO),
    )
    return json.loads(prior_raw.decode("utf-8"))


def main() -> None:
    prior = load_prior()

    by_topic: dict[str, dict] = {}

    # Seed with prior rich topics
    for t in prior.get("topics", []):
        by_topic[t["topic"].lower().strip()] = {
            "topic": t["topic"],
            "documents": list(t.get("documents") or []),
        }

    used_sources: list[str] = []
    for xlsx in XLSX_FILES:
        if not xlsx.exists():
            print(f"SKIP missing workbook: {xlsx}")
            continue
        used_sources.append(str(xlsx))
        wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
        ws = wb[wb.sheetnames[0]]
        rows = list(ws.iter_rows(values_only=True))
        headers = [str(h) for h in rows[0]]
        for r in rows[1:]:
            if not r or not r[0]:
                continue
            row = {headers[i]: (r[i] if i < len(r) else None) for i in range(len(headers))}
            topic = str(row["Topic"]).strip()
            excel_docs = []
            for col, doc_type in COL_TYPE.items():
                for entry in split_entries(row.get(col)):
                    excel_docs.append(parse_doc(entry, doc_type))

            key = topic.lower().strip()
            if key in by_topic:
                # Canonicalize to existing display name when present
                by_topic[key]["documents"] = merge_docs(by_topic[key]["documents"], excel_docs)
            else:
                by_topic[key] = {"topic": topic, "documents": excel_docs}
        wb.close()
        print(f"Merged {xlsx.name}")

    if not used_sources:
        raise SystemExit("No curated literature workbooks found.")

    topics = sorted(by_topic.values(), key=lambda t: t["topic"].lower())
    corpus = {
        "version": 10,
        "source": used_sources[0] if len(used_sources) == 1 else used_sources,
        "priorSource": prior.get("source"),
        "topics": topics,
    }
    OUT.write_text(json.dumps(corpus, indent=2) + "\n", encoding="utf-8")

    with_pmid = sum(1 for t in topics for d in t["documents"] if d.get("pmid"))
    with_url = sum(1 for t in topics for d in t["documents"] if d.get("url") or d.get("doi") or d.get("pmcid"))
    total_docs = sum(len(t["documents"]) for t in topics)
    print(f"Wrote {OUT}")
    print(f"topics={len(topics)} documents={total_docs} withPmid={with_pmid} withLink={with_url}")
    for t in topics:
        n_pmid = sum(1 for d in t["documents"] if d.get("pmid"))
        n_rich = sum(1 for d in t["documents"] if d.get("pmcid") or d.get("doi"))
        print(f" - {t['topic']}: {len(t['documents'])} docs (pmid={n_pmid}, rich={n_rich})")


if __name__ == "__main__":
    main()
