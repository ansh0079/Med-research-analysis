'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../../config');
const db = require('../../database');
const { normalizeTopic } = require('../utils/topicKey');
loadEnv();

const parse = (v, fallback = []) => { try { return JSON.parse(v || ''); } catch { return fallback; } };
const uniq = (xs) => [...new Set(xs.filter(Boolean).map(String))];

async function upsertGuidelineDocument(doc, now) {
    let row = null;
    if (doc.pmid) row = await db.get('SELECT * FROM guideline_documents WHERE pmid = ?', [doc.pmid]);
    if (!row && doc.doi) row = await db.get('SELECT * FROM guideline_documents WHERE doi = ?', [doc.doi]);
    if (!row && doc.source_url) row = await db.get('SELECT * FROM guideline_documents WHERE source_url = ? LIMIT 1', [doc.source_url]);
    const text = String(doc.text || '');
    if (!row) {
        await db.run(
            `INSERT INTO guideline_documents (pmcid, pmid, doi, title, source_body, source_year, source_url, document_label,
                evidence_tier, full_text, full_text_source, word_count, fetched_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [doc.pmcid || null, doc.pmid || null, doc.doi || null, doc.title || '', doc.source_body || '', doc.source_year || null,
                doc.source_url || null, doc.title || doc.source_body || 'Retrieved source', doc.evidence_tier || 'unknown',
                text, doc.full_text_source || 'retrieved', text.split(/\s+/).filter(Boolean).length, now, now, now],
        );
        row = doc.pmid ? await db.get('SELECT * FROM guideline_documents WHERE pmid = ?', [doc.pmid])
            : doc.doi ? await db.get('SELECT * FROM guideline_documents WHERE doi = ?', [doc.doi])
                : await db.get('SELECT * FROM guideline_documents WHERE source_url = ? ORDER BY id DESC LIMIT 1', [doc.source_url]);
        return { id: row.id, inserted: true };
    }
    if (text.length > String(row.full_text || '').length) {
        await db.run(
            `UPDATE guideline_documents SET pmcid = ?, title = ?, source_body = ?, source_year = ?, source_url = ?, evidence_tier = ?,
                full_text = ?, full_text_source = ?, word_count = ?, fetched_at = ?, updated_at = ? WHERE id = ?`,
            [doc.pmcid || row.pmcid, doc.title || row.title, doc.source_body || row.source_body, doc.source_year || row.source_year,
                doc.source_url || row.source_url, doc.evidence_tier || row.evidence_tier, text,
                doc.full_text_source || row.full_text_source, text.split(/\s+/).filter(Boolean).length, now, now, row.id],
        );
    }
    return { id: row.id, inserted: false };
}

async function main() {
    const file = process.argv[2] || path.join(__dirname, '../../data/question-repair-source-import.json');
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    await db.connect();
    const now = new Date().toISOString();
    const documentIds = new Map(); let documentsInserted = 0; let guidelineLinks = 0;
    for (const doc of payload.guideline_documents || []) {
        const result = await upsertGuidelineDocument(doc, now);
        documentIds.set(doc.key, result.id); if (result.inserted) documentsInserted += 1;
    }
    for (const link of payload.guideline_links || []) {
        const documentId = documentIds.get(link.document_key); if (!documentId) continue;
        await db.run('UPDATE topic_guidelines SET document_id = ?, updated_at = ? WHERE CAST(id AS TEXT) = ?', [documentId, now, String(link.guideline_id)]);
        guidelineLinks += 1;
    }
    let articlesInserted = 0;
    for (const article of payload.paper_articles || []) {
        const existing = await db.get('SELECT id, abstract FROM article_cache WHERE id = ?', [article.uid]);
        const data = JSON.stringify({ uid: article.uid, title: article.title, abstract: article.abstract, url: article.url, doi: article.doi, source: article.source });
        if (!existing) {
            await db.run(
                `INSERT INTO article_cache (id, source, data, title, abstract, fetched_at, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
                [article.uid, article.source || 'retrieved', data, article.title || '', article.abstract || '', now],
            ); articlesInserted += 1;
        } else if (String(article.abstract || '').length > String(existing.abstract || '').length) {
            await db.run('UPDATE article_cache SET source = ?, data = ?, title = ?, abstract = ?, fetched_at = ?, expires_at = NULL WHERE id = ?',
                [article.source || 'retrieved', data, article.title || '', article.abstract || '', now, article.uid]);
        }
    }
    let questionLinks = 0;
    for (const link of payload.question_papers || []) {
        const row = await db.get('SELECT evidence_paper_uids FROM question_topic_index WHERE object_key = ? AND question_index = ?', [link.object_key, link.question_index]);
        if (!row) continue;
        const ids = uniq([...parse(row.evidence_paper_uids), link.article_uid]);
        await db.run('UPDATE question_topic_index SET evidence_paper_uids = ? WHERE object_key = ? AND question_index = ?', [JSON.stringify(ids), link.object_key, link.question_index]);
        questionLinks += 1;
    }
    let topicLinks = 0;
    for (const entry of payload.topic_articles || []) {
        const normalized = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(entry.topic) : normalizeTopic(entry.topic);
        const row = await db.get('SELECT * FROM topic_evidence_memory WHERE normalized_topic = ?', [normalized]);
        const ids = uniq([...(row ? parse(row.article_uids_json) : []), ...(entry.article_uids || [])]);
        if (row) {
            await db.run('UPDATE topic_evidence_memory SET article_uids_json = ?, source = ?, updated_at = ? WHERE normalized_topic = ?', [JSON.stringify(ids), 'question_repair', now, normalized]);
        } else {
            await db.run(
                `INSERT INTO topic_evidence_memory (normalized_topic, topic, guidelines_json, landmark_trials_json, recent_reviews_json,
                    controversies_json, safety_updates_json, article_uids_json, source, updated_at, created_at)
                 VALUES (?, ?, '[]', '[]', '[]', '[]', '[]', ?, 'question_repair', ?, ?)`,
                [normalized, entry.topic, JSON.stringify(ids), now, now],
            );
        }
        topicLinks += 1;
    }
    console.log(JSON.stringify({ requested: {
        guidelineDocuments: (payload.guideline_documents || []).length, guidelineLinks: (payload.guideline_links || []).length,
        paperArticles: (payload.paper_articles || []).length, questionLinks: (payload.question_papers || []).length,
        topicLinks: (payload.topic_articles || []).length,
    }, applied: { documentsInserted, guidelineLinks, articlesInserted, questionLinks, topicLinks } }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.close?.());
