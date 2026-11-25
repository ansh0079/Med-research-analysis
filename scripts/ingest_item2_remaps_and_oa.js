'use strict';

/**
 * 1. Remap 4 Group A2 topics in topic_evidence_registry to better local guideline_documents.
 * 2. Ingest the 18 downloaded PMC Open-Access full-text documents from
 *    C:\Users\ansh0\Downloads\Common257_poor_fit_76_oa_docs\group_b_oa_manifest.json
 *    into guideline_documents and update topic_evidence_registry.primary_document_id.
 *
 * Usage:
 *   node scripts/ingest_item2_remaps_and_oa.js           (dry-run)
 *   node scripts/ingest_item2_remaps_and_oa.js --apply   (backup + apply)
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config');
loadEnv();

const APPLY = process.argv.includes('--apply');
const OA_DIR = 'C:\\Users\\ansh0\\Downloads\\Common257_poor_fit_76_oa_docs';
const MANIFEST_PATH = path.join(OA_DIR, 'group_b_oa_manifest.json');
const normTopic = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const A2_REMAPS = [
    ['Pyelonephritis: inpatient vs outpatient management, Gram-negative coverage, imaging indications', 2392],
    ['Radial versus femoral access for PCI', 1400],
    ['Lyme Arthritis', 4208],
    ['temporal arteritis', 1675],
];

function inferTier(title = '') {
    const t = title.toLowerCase();
    if (/\b(guideline|guidelines|consensus|scientific statement|recommendations|banff)\b/.test(t)) return 'guideline';
    if (/\b(meta-analysis|systematic review)\b/.test(t)) return 'systematic_review';
    return 'review';
}

async function main() {
    const db = require('../database');
    await db.connect();

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const terRows = await db.all('SELECT topic_key, topic_id, topic_name, primary_document_id, all_document_ids FROM topic_evidence_registry');
    const terByNorm = new Map();
    for (const r of terRows) {
        const nt = normTopic(r.topic_name);
        if (!terByNorm.has(nt)) terByNorm.set(nt, []);
        terByNorm.get(nt).push(r);
    }

    if (APPLY) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dbPath = path.resolve(process.cwd(), db.dbPath || './database/app.db');
        const backupDir = path.join(path.dirname(dbPath), 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `app-before-item2-ingest-${stamp}.db`);
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
            console.log(`Backup created: ${backupPath}`);
        }
    }

    const now = new Date().toISOString();
    let remappedA2 = 0;
    let ingestedDocs = 0;
    let updatedRegistryOa = 0;

    // 1. Group A2 local remaps
    for (const [topicName, targetDocId] of A2_REMAPS) {
        const doc = await db.get('SELECT id, pmid, pmcid, doi, title, source_body, source_year, full_text_source, word_count FROM guideline_documents WHERE id = ?', [targetDocId]);
        if (!doc) continue;
        const rows = terByNorm.get(normTopic(topicName)) || [];
        for (const r of rows) {
            remappedA2++;
            if (APPLY) {
                const allIds = [...new Set([String(targetDocId), ...String(r.all_document_ids || '').split(',').map((s) => s.trim()).filter(Boolean)])].join(',');
                await db.run(
                    `UPDATE topic_evidence_registry
                     SET primary_document_id = ?, all_document_ids = ?, primary_evidence_title = ?,
                         evidence_society_or_journal = ?, evidence_year = ?, pmid = ?, pmcid = ?, doi = ?,
                         full_text_source_type = ?, full_text_word_count = ?, evidence_status = 'verified_exact_full_text'
                     WHERE topic_key = ?`,
                    [doc.id, allIds, doc.title, doc.source_body, doc.source_year ? String(doc.source_year) : null, doc.pmid, doc.pmcid, doc.doi, doc.full_text_source || 'guideline_documents', doc.word_count, r.topic_key]
                );
            }
        }
    }

    // 2. Group B OA ingest + remap
    const ingestedList = [];
    for (const item of manifest) {
        if (item.status !== 'downloaded') continue;
        const fullText = fs.readFileSync(path.join(OA_DIR, item.file), 'utf8').trim();
        const wordCount = fullText.split(/\s+/).filter(Boolean).length;
        const yearMatch = String(item.pubdate || '').match(/\b(19|20)\d{2}\b/);
        const sourceYear = yearMatch ? Number(yearMatch[0]) : null;
        const tier = inferTier(item.title);
        const sourceUrl = `https://pmc.ncbi.nlm.nih.gov/articles/${item.pmcid}/`;

        let existingDoc = await db.get('SELECT id, pmid, pmcid, doi, title, source_body, source_year, word_count FROM guideline_documents WHERE pmcid = ?', [item.pmcid]);
        let docId = existingDoc?.id || null;

        if (!existingDoc) {
            ingestedDocs++;
            if (APPLY) {
                const res = await db.runInsert(
                    `INSERT INTO guideline_documents
                     (pmcid, pmid, doi, title, source_body, source_year, source_url, document_label, evidence_tier, full_text, full_text_source, word_count, fetched_at, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pmc_oa_xml', ?, ?, ?, ?)`,
                    [item.pmcid, item.pmid || null, item.doi || null, item.title, item.journal || null, sourceYear, sourceUrl, tier, tier, fullText, wordCount, now, now, now]
                );
                docId = Number(res?.lastInsertRowid || res?.id || 0);
            }
        }

        const rows = terByNorm.get(normTopic(item.topic)) || [];
        for (const r of rows) {
            updatedRegistryOa++;
            if (APPLY && docId) {
                const allIds = [...new Set([String(docId), ...String(r.all_document_ids || '').split(',').map((s) => s.trim()).filter(Boolean)])].join(',');
                await db.run(
                    `UPDATE topic_evidence_registry
                     SET primary_document_id = ?, all_document_ids = ?, primary_evidence_title = ?,
                         evidence_society_or_journal = ?, evidence_year = ?, pmid = ?, pmcid = ?, doi = ?,
                         full_text_source_type = 'pmc_oa_xml', full_text_word_count = ?, evidence_status = 'verified_exact_full_text'
                     WHERE topic_key = ?`,
                    [docId, allIds, item.title, item.journal || null, sourceYear ? String(sourceYear) : null, item.pmid || null, item.pmcid, item.doi || null, wordCount, r.topic_key]
                );
            }
        }
        ingestedList.push({ idx: item.idx, topic: item.topic, docId, pmcid: item.pmcid, pmid: item.pmid, title: item.title, file: item.file, chars: item.chars });
    }

    if (APPLY) {
        fs.writeFileSync(path.join(OA_DIR, 'ingested_doc_ids.json'), JSON.stringify(ingestedList, null, 2));
    }
    console.log(JSON.stringify({ apply: APPLY, remappedA2, ingestedDocs, updatedRegistryOa }, null, 2));
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
