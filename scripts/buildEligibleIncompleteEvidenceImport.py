#!/usr/bin/env python3
"""Fetch metadata/abstracts for evidence IDs already linked to eligible incomplete questions."""

import argparse
import csv
import html
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SignalMD-evidence-repair/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read()


def text(node):
    return "".join(node.itertext()).strip() if node is not None else ""


def fetch_pubmed(pmids):
    found = {}
    for offset in range(0, len(pmids), 100):
        batch = pmids[offset:offset + 100]
        query = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(batch), "retmode": "xml"})
        root = ET.fromstring(request(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?{query}"))
        for article in root.findall(".//PubmedArticle"):
            pmid = text(article.find(".//MedlineCitation/PMID"))
            title = text(article.find(".//Article/ArticleTitle"))
            abstract = " ".join(text(x) for x in article.findall(".//Article/Abstract/AbstractText") if text(x))
            journal = text(article.find(".//Article/Journal/Title"))
            year = text(article.find(".//Article/Journal/JournalIssue/PubDate/Year")) or text(article.find(".//Article/Journal/JournalIssue/PubDate/MedlineDate"))
            doi = ""
            for item in article.findall(".//PubmedData/ArticleIdList/ArticleId"):
                if item.attrib.get("IdType") == "doi":
                    doi = text(item)
            if pmid and (title or abstract):
                found[pmid] = {"title": title, "abstract": abstract, "journal": journal, "publication_date": year, "doi": doi}
        time.sleep(0.35)
    return found


def openalex_abstract(inverted):
    if not isinstance(inverted, dict) or not inverted:
        return ""
    positions = []
    for word, indices in inverted.items():
        for index in indices or []:
            positions.append((int(index), word))
    return " ".join(word for _, word in sorted(positions))


def fetch_openalex(ids):
    found = {}
    for index, uid in enumerate(ids):
        work_id = uid.rsplit("/", 1)[-1]
        try:
            payload = json.loads(request(f"https://api.openalex.org/works/{urllib.parse.quote(work_id)}"))
        except Exception:
            continue
        abstract = openalex_abstract(payload.get("abstract_inverted_index"))
        title = html.unescape(payload.get("display_name") or payload.get("title") or "")
        primary = payload.get("primary_location") or {}
        source = primary.get("source") or {}
        doi = str(payload.get("doi") or "").replace("https://doi.org/", "")
        if title or abstract:
            found[uid] = {
                "title": title,
                "abstract": abstract,
                "journal": source.get("display_name") or "",
                "publication_date": str(payload.get("publication_year") or ""),
                "doi": doi,
            }
        if index % 10 == 9:
            time.sleep(0.25)
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv")
    parser.add_argument("output_json")
    parser.add_argument("--catalog-alignments")
    args = parser.parse_args()
    rows = list(csv.DictReader(open(args.input_csv, encoding="utf-8-sig", newline="")))
    ids = set()
    for row in rows:
        if "EVIDENCE_UNRETRIEVABLE" not in row.get("repair_requirements", ""):
            continue
        try:
            ids.update(json.loads(row.get("evidence_paper_uids") or "[]"))
        except json.JSONDecodeError:
            pass
    pubmed_map = {}
    for uid in ids:
        match = re.fullmatch(r"(?:pubmed-|pmid:)(\d+)", uid)
        if match:
            pubmed_map[uid] = match.group(1)
    pubmed = fetch_pubmed(sorted(set(pubmed_map.values()), key=int))
    openalex_ids = sorted(uid for uid in ids if uid.startswith("https://openalex.org/"))
    openalex = fetch_openalex(openalex_ids)
    articles = []
    for uid in sorted(ids):
        record = pubmed.get(pubmed_map.get(uid)) if uid in pubmed_map else openalex.get(uid)
        if not record or not record.get("abstract"):
            continue
        articles.append({
            "uid": uid,
            "title": record.get("title", ""),
            "abstract": record.get("abstract", ""),
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pubmed_map[uid]}/" if uid in pubmed_map else uid,
            "doi": record.get("doi", ""),
            "source": "pubmed_retrieved" if uid in pubmed_map else "openalex_retrieved",
            "publication_date": record.get("publication_date", ""),
            "journal": record.get("journal", ""),
        })
    output = {
        "version": 1,
        "generated_at": "2026-10-10T00:00:00Z",
        "guideline_documents": [],
        "guideline_links": [],
        "paper_articles": articles,
        "question_papers": [],
        "topic_articles": [],
        "retrieval_summary": {
            "requested_unique_ids": len(ids),
            "pubmed_ids": len(pubmed_map),
            "openalex_ids": len(openalex_ids),
            "retrieved_with_abstract": len(articles),
        },
    }
    Path(args.output_json).write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(output["retrieval_summary"], indent=2))
    if args.catalog_alignments:
        def comparable(value):
            return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()
        alignments = []
        for row in rows:
            if "TOPIC_CATALOGUE" not in row.get("repair_requirements", "") or row.get("object_type") == "curated_topic_mcq":
                continue
            assigned = comparable(row.get("assigned_topic_name"))
            if assigned and assigned in {comparable(row.get("original_topic")), comparable(row.get("stored_topic"))}:
                alignments.append({
                    "questionId": f"{row['object_key']}#{row['question_index']}",
                    "expectedTopicName": row["assigned_topic_name"],
                    "notes": "Exact assigned topic matches the stored/original topic; category alignment only, clinical review state preserved.",
                })
        review = {
            "version": 1, "reviewed_at": "2026-10-10", "withdrawals": [], "corrections": [],
            "topicAssignments": [], "catalogAlignments": alignments,
        }
        Path(args.catalog_alignments).write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"catalog_alignments": len(alignments)}, indent=2))


if __name__ == "__main__":
    main()
