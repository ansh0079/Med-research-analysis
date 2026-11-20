'use strict';

const fs = require('fs');
const zlib = require('zlib');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const ALLOW_OVERWRITE = process.argv.includes('--allow-overwrite');
const file = process.argv.find((value) => value.endsWith('.gz'));
if (!file) throw new Error('Pass the evidence package .json.gz path');

const ABSTRACT_OR_QUARANTINED_SOURCES = new Set(['abstract', 'bibliographic_abstract', 'pubmed_abstract']);
const normalizeQuoteText = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

function productionHasValidFullText(row) {
    if (!row) return false;
    const len = Number(row.full_length || 0);
    const src = String(row.full_text_source || '').trim().toLowerCase();
    return len >= 500 && !ABSTRACT_OR_QUARANTINED_SOURCES.has(src) && !src.startsWith('quarantined');
}

function incomingTextIsSafe(source) {
    const text = String(source.fullText || '').trim();
    const src = String(source.fullTextSource || '').trim().toLowerCase();
    if (text.length < 500) return false;
    if (ABSTRACT_OR_QUARANTINED_SOURCES.has(src) || src.startsWith('quarantined')) return false;
    // Reject obvious templated / error / placeholder pages before they can touch production
    if (/(?:404 not found|access denied|cloudflare|enable javascript|captcha|placeholder|synopsis step failed)/i.test(text.slice(0, 1200))) {
        return false;
    }
    return true;
}

/**
 * Verify that replacing production full_text for `documentId` with `incomingFullText`
 * will NOT break any existing verified quote/anchor stored in generation_evidence_registry.
 */
async function incomingPreservesVerifiedAnchors(client, documentId, incomingFullText) {
    const res = await client.query(
        `SELECT exact_quote FROM generation_evidence_registry
         WHERE guideline_document_id = $1
           AND exact_quote IS NOT NULL
           AND length(trim(exact_quote)) >= 40`,
        [documentId],
    ).catch(() => ({ rows: [] }));
    const quotes = res.rows || [];
    if (!quotes.length) return { ok: true, checked: 0, broken: 0 };
    const normIncoming = normalizeQuoteText(incomingFullText);
    let broken = 0;
    for (const row of quotes) {
        const q = normalizeQuoteText(row.exact_quote);
        if (q.length >= 40 && !normIncoming.includes(q)) {
            broken += 1;
        }
    }
    return { ok: broken === 0, checked: quotes.length, broken };
}

const clean = (value) => value == null || value === '' ? null : String(value).trim();
const scrubText = (value) => typeof value === 'string' ? value.replace(/\0/g, '') : value;
const scrubObject = (value) => {
    if (Array.isArray(value)) return value.map(scrubObject);
    if (value && typeof value === 'object') return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, scrubObject(item)]),
    );
    return scrubText(value);
};
const doi = (value) => clean(value)?.toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/\/$/, '') || null;
const identities = (value) => [value?.pmcid && `pmcid:${String(value.pmcid).toUpperCase()}`,
    value?.pmid && `pmid:${String(value.pmid).match(/\d+/)?.[0]}`,
    value?.doi && `doi:${doi(value.doi)}`, value?.sourceUrl && `url:${String(value.sourceUrl).replace(/\/$/, '')}`].filter(Boolean);
const articleIdentities = (value) => identities({ ...value, sourceUrl: value?.url || value?.sourceUrl });

async function findDocument(client, source) {
    const clauses = [];
    const params = [];
    const add = (column, value) => { if (value) { params.push(value); clauses.push(`${column} = $${params.length}`); } };
    add('pmcid', clean(source.pmcid)); add('pmid', clean(source.pmid)); add('lower(doi)', doi(source.doi));
    add('source_url', clean(source.sourceUrl));
    let rows = [];
    if (clauses.length) rows = (await client.query(`SELECT *, length(trim(coalesce(full_text,''))) AS full_length
        FROM guideline_documents WHERE ${clauses.join(' OR ')}`, params)).rows;
    if (!rows.length && source.title) {
        rows = (await client.query(`SELECT *, length(trim(coalesce(full_text,''))) AS full_length
            FROM guideline_documents WHERE lower(title)=lower($1) AND source_year IS NOT DISTINCT FROM $2 LIMIT 2`,
        [source.title, source.sourceYear || null])).rows;
    }
    return rows;
}

async function main() {
    const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
    if (payload.format !== 'signal-md-evidence-package-v1') throw new Error('Unsupported package format');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const report = { apply: APPLY, allowOverwrite: ALLOW_OVERWRITE, documents: payload.documents.length,
        inserted: 0, updated: 0, unchanged: 0, ambiguous: 0, fullTextAddedOnly: 0,
        fullTextOverwritesBlocked: 0, fullTextOverwritesAllowed: 0, unsafeIncomingSkipped: 0,
        catalogueInserted: 0, catalogueUpdated: 0, topicSourcesMerged: 0, topicSourcesUnresolved: 0, failures: [] };
    report.topicSourcesCreated = 0;
    const localToProduction = new Map();
    try {
        if (APPLY) await client.query('BEGIN');
        for (const rawSource of payload.documents) {
            const source = scrubObject(rawSource);
            const matches = await findDocument(client, source);
            if (matches.length > 1) {
                report.ambiguous += 1;
                report.failures.push({ localId: source.localId, reason: 'multiple_identifier_matches' });
                continue;
            }
            const current = matches[0];
            const incomingLength = String(source.fullText || '').trim().length;
            const incomingSafe = incomingTextIsSafe(source);
            if (!current) {
                if (incomingLength >= 500 && !incomingSafe) {
                    report.unsafeIncomingSkipped += 1;
                    report.failures.push({ localId: source.localId, reason: 'unsafe_or_templated_incoming_text' });
                    continue;
                }
                report.inserted += 1;
                if (APPLY) {
                    const result = await client.query(`INSERT INTO guideline_documents
                        (pmcid,pmid,doi,title,source_body,source_year,source_url,document_label,evidence_tier,
                         full_text,full_text_source,word_count,fetched_at,created_at,updated_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,coalesce($14::timestamptz,now()),now()) RETURNING id`,
                    [clean(source.pmcid), clean(source.pmid), doi(source.doi), source.title, source.sourceBody,
                        source.sourceYear, source.sourceUrl, source.documentLabel, source.evidenceTier,
                        incomingSafe ? source.fullText : null, incomingSafe ? source.fullTextSource : null,
                        incomingSafe ? source.wordCount : 0, source.fetchedAt, source.createdAt]);
                    localToProduction.set(String(source.localId), result.rows[0].id);
                    if (incomingSafe) report.fullTextAddedOnly += 1;
                }
                continue;
            }
            localToProduction.set(String(source.localId), current.id);
            const prodHasValid = productionHasValidFullText(current);
            let shouldWriteText = false;

            if (!prodHasValid && incomingSafe) {
                // Production is missing valid full text (empty, abstract-only, or quarantined) -> safe to fill
                shouldWriteText = true;
                report.fullTextAddedOnly += 1;
            } else if (prodHasValid && incomingSafe && incomingLength > Number(current.full_length || 0)) {
                // Production ALREADY has valid full text: immutable by default so verified quotes can never break
                if (!ALLOW_OVERWRITE) {
                    report.fullTextOverwritesBlocked += 1;
                } else {
                    const anchorCheck = await incomingPreservesVerifiedAnchors(client, current.id, source.fullText);
                    if (!anchorCheck.ok) {
                        report.fullTextOverwritesBlocked += 1;
                        report.failures.push({
                            localId: source.localId,
                            productionId: current.id,
                            reason: `overwrite_blocked_breaks_${anchorCheck.broken}_of_${anchorCheck.checked}_verified_anchors`,
                        });
                    } else {
                        shouldWriteText = true;
                        report.fullTextOverwritesAllowed += 1;
                    }
                }
            }

            const metadataMissing = !current.pmid && source.pmid || !current.doi && source.doi
                || !current.pmcid && source.pmcid || !current.source_url && source.sourceUrl;
            if (!shouldWriteText && !metadataMissing) { report.unchanged += 1; continue; }
            report.updated += 1;
            if (APPLY) await client.query(`UPDATE guideline_documents SET
                pmcid=coalesce(pmcid,$1), pmid=coalesce(pmid,$2), doi=coalesce(doi,$3),
                title=coalesce(title,$4), source_body=coalesce(source_body,$5), source_year=coalesce(source_year,$6),
                source_url=coalesce(source_url,$7), document_label=coalesce(document_label,$8),
                evidence_tier=coalesce(evidence_tier,$9),
                full_text=CASE WHEN $10 THEN $11 ELSE full_text END,
                full_text_source=CASE WHEN $10 THEN $12 ELSE full_text_source END,
                word_count=CASE WHEN $10 THEN $13 ELSE word_count END,
                updated_at=now() WHERE id=$14`,
            [clean(source.pmcid), clean(source.pmid), doi(source.doi), source.title, source.sourceBody,
                source.sourceYear, source.sourceUrl, source.documentLabel, source.evidenceTier,
                shouldWriteText, source.fullText, source.fullTextSource, source.wordCount, current.id]);
        }

        if (APPLY) {
            for (const rawRow of payload.catalogue) {
                const row = scrubObject(rawRow);
                const documentId = row.localDocumentId == null ? null : localToProduction.get(String(row.localDocumentId));
                const existing = documentId != null
                    ? (await client.query('SELECT id FROM topic_evidence_catalogue WHERE normalized_topic=$1 AND guideline_document_id=$2',
                        [row.normalized_topic, documentId])).rows[0]
                    : (await client.query(`SELECT id FROM topic_evidence_catalogue WHERE normalized_topic=$1
                        AND evidence_role=$2 AND coalesce(pmid,'')=coalesce($3,'')
                        AND coalesce(pmcid,'')=coalesce($4,'') AND coalesce(doi,'')=coalesce($5,'')
                        AND title=$6 LIMIT 1`, [row.normalized_topic, row.evidence_role, row.pmid,
                        row.pmcid, row.doi, row.title])).rows[0];
                if (existing) {
                    await client.query(`UPDATE topic_evidence_catalogue SET full_text_status=$1,is_open_access=$2,
                        word_count=$3,abstract=coalesce(abstract,$4),recommendation_snippet=coalesce(recommendation_snippet,$5),updated_at=now() WHERE id=$6`,
                    [row.full_text_status, row.is_open_access || 0, row.word_count || 0, row.abstract,
                        row.recommendation_snippet, existing.id]);
                    report.catalogueUpdated += 1;
                } else {
                    await client.query(`INSERT INTO topic_evidence_catalogue
                        (topic_id,topic,normalized_topic,specialty,evidence_role,evidence_tier,title,source_body,
                         source_year,pmid,pmcid,doi,url,full_text_status,is_open_access,guideline_document_id,
                         word_count,abstract,recommendation_snippet,created_at,updated_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now(),now())
                        ON CONFLICT DO NOTHING`,
                    [row.topic_id, row.topic, row.normalized_topic, row.specialty, row.evidence_role,
                        row.evidence_tier, row.title, row.source_body, row.source_year, row.pmid, row.pmcid,
                        row.doi, row.url, row.full_text_status, row.is_open_access || 0, documentId,
                        row.word_count || 0, row.abstract, row.recommendation_snippet]);
                    report.catalogueInserted += 1;
                }
            }

            for (const topic of payload.topicSources) {
                let result = await client.query(`SELECT id,source_articles FROM topic_knowledge
                    WHERE normalized_topic=$1 OR lower(topic)=lower($2) LIMIT 1`, [topic.normalizedTopic, topic.topic]);
                if (!result.rows[0]) {
                    result = await client.query(`INSERT INTO topic_knowledge
                        (topic,normalized_topic,knowledge,source_articles,aliases_normalized,canonical_normalized,
                         status,confidence,created_at,updated_at,last_refreshed_at)
                        VALUES ($1,$2,'{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'','source_articles_ingested',0,now(),now(),now())
                        ON CONFLICT DO NOTHING
                        RETURNING id,source_articles`, [topic.topic, topic.normalizedTopic]);
                    if (result.rows[0]) report.topicSourcesCreated += 1;
                    else result = await client.query(`SELECT id,source_articles FROM topic_knowledge
                        WHERE normalized_topic=$1 OR lower(topic)=lower($2) LIMIT 1`, [topic.normalizedTopic, topic.topic]);
                }
                if (!result.rows[0]) { report.topicSourcesUnresolved += 1; continue; }
                const articles = Array.isArray(result.rows[0].source_articles) ? result.rows[0].source_articles : [];
                let changed = false;
                for (const incomingRaw of topic.sourceArticles || []) {
                    const cleanIncoming = scrubObject(incomingRaw);
                    const incoming = { ...cleanIncoming, reviewState: cleanIncoming.reviewState === 'human_reviewed'
                        ? 'human_reviewed' : 'needs_review' };
                    if (incoming.documentId != null) incoming.documentId = localToProduction.get(String(incoming.documentId)) || null;
                    const ids = new Set(articleIdentities(incoming));
                    let index = articles.findIndex((article) => articleIdentities(article).some((id) => ids.has(id)));
                    if (index < 0 && incoming.documentId != null) index = articles.findIndex((article) => String(article.documentId || '') === String(incoming.documentId));
                    if (index >= 0) articles[index] = { ...articles[index], ...incoming };
                    else articles.push(incoming);
                    changed = true;
                }
                if (changed) {
                    await client.query('UPDATE topic_knowledge SET source_articles=$1::jsonb,updated_at=now() WHERE id=$2',
                        [JSON.stringify(articles), result.rows[0].id]);
                    report.topicSourcesMerged += 1;
                }
            }
            await client.query('COMMIT');
        }
        console.log(JSON.stringify(report, null, 2));
    } catch (error) {
        if (APPLY) await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally { await client.end(); }
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
