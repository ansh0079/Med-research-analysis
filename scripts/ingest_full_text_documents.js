'use strict';

/**
 * Add full-text documents to guideline_documents from a JSONL file (one document per line):
 *   { pmid, pmcid, doi, title, year, journal, full_text, full_text_source, word_count, origin }
 *
 *   node scripts/ingest_full_text_documents.js --file docs.jsonl [--apply] [--replace]
 *
 * A document is matched to an existing row by PMID, then PMCID, then DOI, then exact title.
 *  - existing row already holds full text  -> left alone
 *  - existing row holds only an abstract   -> its full text is filled in (id kept, links survive)
 *  - no existing row                       -> inserted
 * Dry run (the default) only reports.
 */

const fs = require('fs');
const { loadEnv } = require('../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const APPLY = args.includes('--apply');
const REPLACE = args.includes('--replace');
const ABSTRACT_SOURCES = new Set(['abstract', 'bibliographic_abstract', 'pubmed_abstract', '']);
const MIN_FULL_TEXT_CHARS = 500;

const cleanPmid = (v) => (String(v || '').match(/^\s*(\d{5,9})\s*$/) || [])[1] || null;
const cleanPmcid = (v) => { const m = String(v || '').match(/PMC\d+/i); return m ? m[0].toUpperCase() : null; };
const cleanDoi = (v) => String(v || '').trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '') || null;

function isFullText(row) {
    return row && !ABSTRACT_SOURCES.has(String(row.full_text_source || '').toLowerCase())
        && String(row.full_text || '').length >= MIN_FULL_TEXT_CHARS;
}

function evidenceTier(title) {
    return /guideline|consensus|recommendation|position statement|practice parameter/i.test(title || '') ? 'guideline' : 'literature';
}

async function findExisting(db, d) {
    const cols = 'id, pmid, pmcid, doi, title, full_text_source, full_text';
    const pmid = cleanPmid(d.pmid);
    if (pmid) { const r = await db.get(`SELECT ${cols} FROM guideline_documents WHERE pmid = ? ORDER BY id LIMIT 1`, [pmid]); if (r) return r; }
    const pmcid = cleanPmcid(d.pmcid);
    if (pmcid) { const r = await db.get(`SELECT ${cols} FROM guideline_documents WHERE UPPER(pmcid) = ? OR pmcid = ? ORDER BY id LIMIT 1`, [pmcid, pmcid.replace(/^PMC/, '')]); if (r) return r; }
    const doi = cleanDoi(d.doi);
    if (doi) { const r = await db.get(`SELECT ${cols} FROM guideline_documents WHERE LOWER(doi) = ? ORDER BY id LIMIT 1`, [doi]); if (r) return r; }
    const title = String(d.title || '').trim();
    if (title.length >= 25) { const r = await db.get(`SELECT ${cols} FROM guideline_documents WHERE LOWER(title) = LOWER(?) ORDER BY id LIMIT 1`, [title]); if (r) return r; }
    return null;
}

async function main() {
    if (!FILE) throw new Error('--file <docs.jsonl> is required');
    const docs = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    const db = require('../database');
    await db.connect();
    const counts = { total: docs.length, alreadyFullText: 0, filledAbstractRow: 0, inserted: 0, skippedShort: 0 };
    const now = new Date().toISOString();
    for (const d of docs) {
        // PostgreSQL text rejects NUL bytes, which PDF extraction sometimes leaves behind.
        const text = String(d.full_text || '').split(String.fromCharCode(0)).join('');
        if (text.length < MIN_FULL_TEXT_CHARS) { counts.skippedShort++; continue; }
        const existing = await findExisting(db, d);
        // --replace overwrites stored full text, for rows whose stored text was found to be a different paper.
        if (existing && isFullText(existing) && !REPLACE) { counts.alreadyFullText++; continue; }
        const words = Number(d.word_count) || text.split(/\s+/).length;
        if (existing) {
            counts[REPLACE ? 'replaced' : 'filledAbstractRow'] = (counts[REPLACE ? 'replaced' : 'filledAbstractRow'] || 0) + 1;
            if (APPLY) {
                const pmcidSql = REPLACE ? 'COALESCE(?, pmcid)' : 'COALESCE(pmcid, ?)';
                const sourceUrl = REPLACE && cleanPmcid(d.pmcid) ? `, source_url = 'https://pmc.ncbi.nlm.nih.gov/articles/${cleanPmcid(d.pmcid)}/'` : '';
                await db.run(
                    `UPDATE guideline_documents SET full_text = ?, full_text_source = ?, word_count = ?,
                        pmcid = ${pmcidSql}, doi = COALESCE(doi, ?), fetched_at = ?, updated_at = ?${sourceUrl} WHERE id = ?`,
                    [text, d.full_text_source || 'pdf', words, cleanPmcid(d.pmcid), cleanDoi(d.doi), now, now, existing.id],
                );
            }
            continue;
        }
        counts.inserted++;
        if (APPLY) {
            const pmcid = cleanPmcid(d.pmcid);
            await db.run(
                `INSERT INTO guideline_documents (pmcid, pmid, doi, title, source_body, source_year, source_url,
                     evidence_tier, full_text, full_text_source, word_count, fetched_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [pmcid, cleanPmid(d.pmid), cleanDoi(d.doi), String(d.title || pmcid || 'Untitled document').slice(0, 500),
                    d.journal || null, Number(d.year) || null, pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : null,
                    evidenceTier(d.title), text, d.full_text_source || 'pdf', words, now, now, now],
            );
        }
    }
    console.log(JSON.stringify({ apply: APPLY, ...counts }, null, 2));
    await db.close?.();
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
