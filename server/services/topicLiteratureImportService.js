'use strict';

/**
 * Import curated literature packs (CSV / JSON) into topic_guidelines,
 * article_cache, paper teaching objects, and topic_knowledge.source_articles.
 *
 * This is the offline path for empty topics: a human-selected paper/guideline
 * list is stored so search and learning can serve them without waiting for
 * live PubMed + LLM discovery.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { persistSearchedArticles } = require('./articlePersistenceService');
const { mergeSourceArticles } = require('./flagshipTopicOps');
const { resolveTrustedSource } = require('./guidelineQualityService');
const { rankGuidelinesForTopic, scoreGuidelineForTopic } = require('../utils/guidelineRelevance');

const GUIDELINE_KIND_RE = /\b(clinical guidelines?|practice guideline|practice parameter|guideline update|who guideline|scientific statement|international consensus|expert consensus|clinical consensus|clinical review.{0,4}consensus|emerging guideline|consensus(?: guidelines?)?|evidence-based guideline|appropriate use recommendations?|aur|systematic review.{0,4}guideline|meta-analysis.{0,4}guideline|landmark trial.{0,4}guideline|rct.{0,4}guideline)\b/i;
const PAPER_KIND_RE = /\b(meta-analysis|systematic review|network meta-analysis|randomi[sz]ed|rct|trial|cohort)\b/i;
const DOI_RE = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/ig;
const PMID_RE = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i;
const PMC_RE = /pmc\/articles\/(PMC\d+)/i;

function normalizeTopic(topic) {
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitLines(value) {
    return String(value || '')
        .split(/\r?\n|•|▪|·/)
        .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter(Boolean);
}

function splitLinkField(value) {
    const raw = String(value || '');
    const urls = raw.split(/(?=https?:\/\/)/i).map((part) => part.trim()).filter((part) => /^https?:\/\//i.test(part));
    if (urls.length) return urls;
    return extractDois(raw).map((doi) => `https://doi.org/${doi}`);
}

function splitReferenceField(value) {
    const raw = String(value || '')
        .replace(/(\d)\.([A-Z][A-Za-zÀ-ÿ'’-]+,\s+[A-Z])/g, '$1.\n$2');
    return splitLines(raw);
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    const input = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];
        const next = input[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cell += ch;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(cell);
            cell = '';
        } else if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (ch !== '\r') {
            cell += ch;
        }
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows.filter((r) => r.some((c) => String(c || '').trim()));
}

function csvObjects(text) {
    const rows = parseCsv(text);
    if (!rows.length) return [];
    const headers = rows[0].map((h) => String(h || '').trim());
    return rows.slice(1).map((cols) => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = cols[i] == null ? '' : String(cols[i]);
        });
        return obj;
    });
}

function pickField(row, names) {
    const keys = Object.keys(row || {});
    for (const name of names) {
        const hit = keys.find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (hit && row[hit]) return String(row[hit]);
    }
    return '';
}

function extractDois(text) {
    const found = String(text || '').match(DOI_RE) || [];
    return [...new Set(found.map((doi) => doi.replace(/[.,);]+$/, '')))];
}

function extractPmid(text) {
    const match = String(text || '').match(PMID_RE);
    return match ? match[1] : '';
}

function extractPmcid(text) {
    const match = String(text || '').match(PMC_RE);
    return match ? match[1] : '';
}

function yearFromText(text) {
    const match = String(text || '').match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
}

function classifyFinding(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const isGuideline = GUIDELINE_KIND_RE.test(raw);
    const isPaper = PAPER_KIND_RE.test(raw);
    if (isGuideline) return { kind: 'guideline', text: raw };
    if (isPaper) return { kind: 'paper', text: raw };
    return { kind: 'paper', text: raw };
}

function titleFromReference(reference) {
    const raw = String(reference || '').replace(/\s+/g, ' ').trim();
    const afterYear = raw.match(/\(\d{4}\)[.\s]+(.+?)(?:\.\s+[A-Z][A-Za-z].*|$)/);
    if (afterYear) return afterYear[1].replace(/\.$/, '').trim().slice(0, 500);
    return raw.slice(0, 500);
}

function journalFromReference(reference) {
    const raw = String(reference || '');
    const match = raw.match(/\.\s+([A-Z][A-Za-z &.-]{2,80}),\s+\d+/);
    return match ? match[1].trim() : '';
}

function articleUid({ pmid, pmcid, doi, title }) {
    if (pmid) return String(pmid);
    if (pmcid) return pmcid.toLowerCase();
    if (doi) return `doi:${doi.toLowerCase()}`;
    const slug = normalizeTopic(title).replace(/\s+/g, '-').slice(0, 80);
    const hash = crypto.createHash('sha1').update(String(title || '')).digest('hex').slice(0, 10);
    return `curated:${slug || hash}`;
}

function normalizePackRow(row) {
    const topic = pickField(row, ['topic', 'Topic', 'displayName']);
    if (!topic) return null;
    return {
        topic: topic.trim(),
        findings: pickField(row, ['findings', 'Relevant Literature & Findings', 'Relevant Literature and Findings', 'literature']),
        links: pickField(row, ['links', 'Links', 'dois', 'url']),
        references: pickField(row, ['references', 'Full References', 'Full Reference', 'citation']),
    };
}

function parseLiteratureJson(text) {
    const parsed = JSON.parse(String(text || '').replace(/^\uFEFF/, ''));
    const rows = Array.isArray(parsed)
        ? parsed
        : (parsed.topics || parsed.data || parsed.rows || []);
    return rows.map(normalizePackRow).filter(Boolean);
}

function parseLiteratureCsv(text) {
    return csvObjects(text).map(normalizePackRow).filter(Boolean);
}

function parseGapCsv(text) {
    return csvObjects(text)
        .map((row) => ({
            topic: pickField(row, ['topic', 'Topic', 'displayName']).trim(),
            normalizedTopic: pickField(row, ['normalized_topic', 'normalizedTopic']).trim(),
        }))
        .filter((row) => row.topic);
}

function parseLiteratureFile(filePath) {
    const resolved = path.resolve(filePath);
    const ext = path.extname(resolved).toLowerCase();
    const text = fs.readFileSync(resolved, 'utf8');
    if (ext === '.json') return parseLiteratureJson(text);
    if (ext === '.csv') return parseLiteratureCsv(text);
    throw new Error(`Unsupported literature pack format: ${ext || 'unknown'} (use .json or .csv)`);
}

function expandPackRow(row) {
    const findings = splitLines(row.findings).map(classifyFinding).filter(Boolean);
    const links = splitLinkField(row.links);
    const references = splitReferenceField(row.references);
    const dois = extractDois([row.links, row.references, row.findings].join('\n'));
    const items = [];

    const usedFindings = new Set();
    references.forEach((reference, index) => {
        const finding = findings[index] || null;
        if (finding) usedFindings.add(index);
        const link = links[index] || '';
        const doi = extractDois(link)[0] || extractDois(reference)[0] || dois[index] || '';
        const pmid = extractPmid(link) || extractPmid(reference);
        const pmcid = extractPmcid(link) || extractPmcid(reference);
        const title = titleFromReference(reference);
        const kind = finding?.kind
            || (GUIDELINE_KIND_RE.test(reference) ? 'guideline' : 'paper');
        items.push({
            kind,
            topic: row.topic,
            text: finding?.text || title,
            reference,
            title,
            url: link || (doi ? `https://doi.org/${doi}` : ''),
            doi,
            pmid,
            pmcid,
            year: yearFromText(reference) || yearFromText(finding?.text || ''),
            journal: journalFromReference(reference),
        });
    });

    findings.forEach((finding, index) => {
        if (usedFindings.has(index)) return;
        const link = links[index] || '';
        const doi = extractDois(link)[0] || extractDois(finding.text)[0] || dois[index] || '';
        items.push({
            kind: finding.kind,
            topic: row.topic,
            text: finding.text,
            reference: references[index] || '',
            title: titleFromReference(references[index] || finding.text),
            url: link || (doi ? `https://doi.org/${doi}` : ''),
            doi,
            pmid: extractPmid(link),
            pmcid: extractPmcid(link),
            year: yearFromText(finding.text) || yearFromText(references[index] || ''),
            journal: journalFromReference(references[index] || ''),
        });
    });

    return items;
}

function inferSourceBody(item) {
    const blob = [item.text, item.reference, item.title, item.journal].filter(Boolean).join(' ');
    const resolved = resolveTrustedSource(blob);
    if (resolved) return resolved;
    const named = blob.match(/\b([A-Z]{2,}(?:\/[A-Z]{2,}){0,3})\b/);
    return {
        id: null,
        name: named ? named[1] : 'Curated source',
        region: null,
        specialty: null,
        domain: null,
    };
}

function guidelineFingerprint(guideline) {
    const url = String(guideline.sourceUrl || '').toLowerCase().replace(/\/+$/, '');
    const body = normalizeTopic(guideline.sourceBody);
    const text = normalizeTopic(guideline.recommendationText).slice(0, 180);
    return url || `${body}|${text}`;
}

function groundGuidelineForTopic(topic, guideline) {
    const scored = scoreGuidelineForTopic(topic, guideline);
    if (scored.hits >= 1 && scored.score >= 0.22 && scored.reason !== 'missing_distinctive') {
        return guideline;
    }
    return {
        ...guideline,
        population: [guideline.population, topic].filter(Boolean).join(' — ').slice(0, 240),
        intervention: guideline.intervention || topic,
    };
}

function isServableGuideline(topic, guideline) {
    const ranked = rankGuidelinesForTopic(topic, [guideline], { limit: 1, minScore: 0.22 });
    return ranked.length > 0;
}

function toArticle(item) {
    const uid = articleUid(item);
    return {
        uid,
        pmid: item.pmid || null,
        pmcid: item.pmcid || null,
        doi: item.doi || null,
        title: item.title || item.text.slice(0, 240),
        abstract: item.text,
        authors: [],
        source: item.journal || 'curated',
        journal: item.journal || '',
        pubdate: item.year ? String(item.year) : '',
        year: item.year,
        url: item.url,
        _source: 'curated_literature_pack',
        pubtype: item.kind === 'guideline' ? 'Practice Guideline' : 'Journal Article',
    };
}

function existingFingerprintSet(guidelines) {
    return new Set((guidelines || []).map((g) => guidelineFingerprint({
        sourceUrl: g.sourceUrl || g.source_url,
        sourceBody: g.sourceBody || g.source_body,
        recommendationText: g.recommendationText || g.recommendation_text,
    })));
}

async function importTopicLiterature(db, packRow, { force = false, dryRun = false } = {}) {
    const topic = String(packRow?.topic || '').trim();
    if (!topic) return { topic: '', skipped: true, reason: 'missing_topic' };

    const items = expandPackRow(packRow);
    if (!items.length) return { topic, skipped: true, reason: 'empty_pack_row' };

    const existing = typeof db.getGuidelinesByTopic === 'function'
        ? await db.getGuidelinesByTopic(topic, { limit: 100, skipRank: true }).catch(() => [])
        : [];
    const seen = existingFingerprintSet(existing);

    const createdGuidelines = [];
    const skippedGuidelines = [];
    const articles = items.map(toArticle);

    for (const item of items.filter((row) => row.kind === 'guideline')) {
        const resolved = inferSourceBody(item);
        const draft = groundGuidelineForTopic(topic, {
            topic,
            sourceBody: resolved.name,
            sourceRegion: resolved.region || null,
            sourceYear: item.year,
            sourceUrl: item.url || (item.doi ? `https://doi.org/${item.doi}` : null),
            sourceSpecialty: resolved.specialty || null,
            sourceDomain: resolved.domain || null,
            recommendationText: item.text.replace(/^[•\-\s]+/, '').slice(0, 1800),
            recommendationStrength: /strongly recommend|class i\b|first-line/i.test(item.text) ? 'Strong' : null,
            recommendationCertainty: null,
            population: topic,
            intervention: item.title || null,
            cautions: null,
            status: 'ai_extracted',
        });
        const fingerprint = guidelineFingerprint(draft);
        if (!force && seen.has(fingerprint)) {
            skippedGuidelines.push({ reason: 'duplicate', sourceBody: draft.sourceBody });
            continue;
        }
        seen.add(fingerprint);
        if (dryRun) {
            createdGuidelines.push({
                ...draft,
                dryRun: true,
                servable: isServableGuideline(topic, draft),
                trusted: Boolean(resolveTrustedSource(draft.sourceBody)),
            });
            continue;
        }
        const created = await db.createGuideline(draft);
        createdGuidelines.push({
            id: created?.id,
            sourceBody: draft.sourceBody,
            servable: isServableGuideline(topic, created || draft),
            trusted: Boolean(resolveTrustedSource(draft.sourceBody)),
        });
    }

    if (!dryRun && articles.length) {
        await persistSearchedArticles(db, articles, topic);
        if (typeof db.getTopicKnowledge === 'function' && typeof db.upsertTopicKnowledge === 'function') {
            const existingKnowledge = await db.getTopicKnowledge(topic).catch(() => null);
            const incoming = articles.map((article, index) => ({
                sourceIndex: index + 1,
                uid: article.uid,
                pmid: article.pmid,
                doi: article.doi,
                title: article.title,
                source: article._source,
                pubdate: article.year,
                curated: true,
            }));
            const merged = mergeSourceArticles(existingKnowledge?.sourceArticles || [], incoming);
            const knowledge = {
                ...(existingKnowledge?.knowledge || {}),
                mentorMessage: existingKnowledge?.knowledge?.mentorMessage
                    || `${topic}: populated from curated literature pack.`,
                seminalPapers: merged.slice(0, 8).map((article) => ({
                    pmid: article.pmid,
                    doi: article.doi,
                    title: article.title,
                    uid: article.uid,
                })),
                keywords: [...new Set([
                    ...(existingKnowledge?.knowledge?.keywords || []),
                    topic,
                ])].slice(0, 20),
                seededFrom: existingKnowledge?.knowledge?.seededFrom || 'topicLiteratureImport',
                lastLiteratureImportAt: new Date().toISOString(),
            };
            const protectedStatus = ['human_reviewed', 'locked', 'verified'].includes(
                String(existingKnowledge?.status || '').toLowerCase()
            );
            if (!protectedStatus) {
                await db.upsertTopicKnowledge(
                    topic,
                    knowledge,
                    merged,
                    existingKnowledge ? 'ai_refreshed' : 'ai_generated',
                    Math.max(Number(existingKnowledge?.confidence || 0), 0.7)
                );
            }
        }
    }

    return {
        topic,
        normalizedTopic: normalizeTopic(topic),
        articleCount: articles.length,
        guidelineCount: createdGuidelines.length,
        skippedGuidelineCount: skippedGuidelines.length,
        servableGuidelineCount: createdGuidelines.filter((g) => g.servable).length,
        trustedGuidelineCount: createdGuidelines.filter((g) => g.trusted).length,
        dryRun,
        createdGuidelines,
    };
}

async function importLiteraturePack(db, rows, options = {}) {
    const results = [];
    for (const row of rows) {
        results.push(await importTopicLiterature(db, row, options));
    }
    return {
        topicCount: results.length,
        articleCount: results.reduce((sum, row) => sum + (row.articleCount || 0), 0),
        guidelineCount: results.reduce((sum, row) => sum + (row.guidelineCount || 0), 0),
        servableGuidelineCount: results.reduce((sum, row) => sum + (row.servableGuidelineCount || 0), 0),
        results,
    };
}

async function topicPopulationStatus(db, topic) {
    const guidelines = typeof db.getGuidelinesByTopic === 'function'
        ? await db.getGuidelinesByTopic(topic, { limit: 10 }).catch(() => [])
        : [];
    const knowledge = typeof db.getTopicKnowledge === 'function'
        ? await db.getTopicKnowledge(topic).catch(() => null)
        : null;
    const objects = typeof db.listTeachingObjectsForTopic === 'function'
        ? await db.listTeachingObjectsForTopic(topic, { limit: 20, objectType: 'paper' }).catch(() => [])
        : [];
    const paperCount = Math.max(
        Array.isArray(knowledge?.sourceArticles) ? knowledge.sourceArticles.length : 0,
        Array.isArray(objects) ? objects.length : 0
    );
    const trustedServable = guidelines.filter((g) => g.qualityAssessment?.checks?.trustedSource);
    return {
        topic,
        normalizedTopic: normalizeTopic(topic),
        guidelineCount: guidelines.length,
        trustedServableGuidelineCount: trustedServable.length,
        paperCount,
        populated: guidelines.length > 0 || paperCount > 0,
        needsGuidelines: guidelines.length === 0,
        needsPapers: paperCount === 0,
    };
}

module.exports = {
    normalizeTopic,
    parseCsv,
    parseLiteratureJson,
    parseLiteratureCsv,
    parseGapCsv,
    parseLiteratureFile,
    classifyFinding,
    splitLinkField,
    splitReferenceField,
    expandPackRow,
    groundGuidelineForTopic,
    isServableGuideline,
    importTopicLiterature,
    importLiteraturePack,
    topicPopulationStatus,
};
