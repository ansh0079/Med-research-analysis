'use strict';

const { extractRecommendationSentences } = require('./recommendationExtractor');

// "Give me the top 5 guidelines / reviews / meta-analyses on X". The normal mentor turn only sees
// 5 guidelines and the learner's top few search results, so it cannot rank across the stored
// evidence. This builds a wider, ranked candidate pool and tells the model to summarise the best N.

const WORD_NUMBERS = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const SOURCE_WORDS = '(?:guidelines?|reviews?|meta-?analys[ie]s|systematic reviews?|consensus|sources|papers|articles|evidence)';

function isTopSourcesRequest(message) {
    const text = String(message || '').toLowerCase();
    if (!/(guideline|review|meta-?analys|consensus)/.test(text)) return false;
    return new RegExp(`\\b(?:top|best|key|leading|most important|main|latest|current)\\b[^.?!]{0,30}${SOURCE_WORDS}`).test(text)
        || /\bsummar(?:y|ise|ize)\b[^.?!]{0,40}\b(?:guidelines?|reviews?|meta-?analys[ie]s)\b/.test(text);
}

function requestedSourceCount(message, fallback = 5) {
    const text = String(message || '').toLowerCase();
    const m = text.match(/\b(?:top|best|key)\s+(\d{1,2}|three|four|five|six|seven|eight|nine|ten)\b/);
    if (!m) return fallback;
    const n = WORD_NUMBERS[m[1]] || Number(m[1]);
    return Number.isFinite(n) ? Math.min(Math.max(n, 3), 10) : fallback;
}

function articleDesign(article) {
    const types = Array.isArray(article?.publicationTypes) ? article.publicationTypes.join(' ') : '';
    const text = `${types} ${article?.title || ''} ${article?.studyType || article?.study_type || ''}`.toLowerCase();
    if (/meta-?analys/.test(text)) return 'meta-analysis';
    if (/systematic review/.test(text)) return 'systematic review';
    if (/\breview\b/.test(text) && !/case report/.test(text)) return 'review';
    return null;
}

// guideline_documents rows carry no publicationTypes — classify from the title
// (and document_label), same classes the learner can ask for.
function documentDesign(doc) {
    const text = `${doc?.document_label || ''} ${doc?.title || ''}`.toLowerCase();
    if (/meta-?analys/.test(text)) return 'meta-analysis';
    if (/systematic review/.test(text)) return 'systematic review';
    if (/\bguidelines?\b|clinical practice (update|guidelines?)|consensus/.test(text)) return 'guideline';
    if (/\breview\b/.test(text) && !/case report/.test(text)) return 'review';
    return null;
}

const yearOf = (v) => {
    const m = String(v ?? '').match(/(19|20)\d{2}/);
    return m ? Number(m[0]) : 0;
};

// Higher is better. Guidelines first, then pooled evidence, then narrative reviews; newer wins ties.
const DESIGN_WEIGHT = { guideline: 50, 'meta-analysis': 40, 'systematic review': 40, review: 20 };

const MAX_POINTS_PER_SOURCE = 20;
const MAX_POINT_CHARS = 380;

// A guideline is a document, not a row: topic_guidelines stores one row per recommendation, so
// group rows by document (or body+year) and keep every recommendation as a point.
function collectCandidates({ guidelines = [], articles = [], documents = [] } = {}) {
    const groups = new Map();
    for (const g of guidelines) {
        const body = g.sourceBody || g.source_body || 'Guideline';
        const year = g.sourceYear || g.source_year || null;
        const docId = g.documentId ?? g.document_id ?? null;
        const key = docId != null ? `d:${docId}` : `g:${String(body).toLowerCase()}:${year}`;
        const text = String(g.recommendationText || g.recommendation_text || '').replace(/\s+/g, ' ').trim();
        if (!groups.has(key)) {
            groups.set(key, { kind: 'guideline', body, year: yearOf(year), tier: g.evidenceTier ?? g.evidence_tier, url: g.sourceUrl || g.source_url || null, points: [] });
        }
        const grp = groups.get(key);
        if (text && !grp.points.includes(text)) grp.points.push(text);
    }
    const out = [];
    for (const grp of groups.values()) {
        out.push({
            kind: 'guideline',
            label: `${grp.body}${grp.year ? ` ${grp.year}` : ''}`,
            points: grp.points,
            year: grp.year,
            url: grp.url,
            // More stored recommendations means more to summarise, so break ties toward the richer source.
            score: DESIGN_WEIGHT.guideline + (grp.tier === 'guideline' ? 5 : 0) + Math.max(0, grp.year - 2000) / 5 + Math.min(grp.points.length, 20) / 10,
        });
    }
    const seen = new Set();
    for (const a of articles) {
        const design = articleDesign(a);
        if (!design || !a?.title) continue;
        const key = `a:${String(a.title).toLowerCase().slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const year = yearOf(a.pubdate || a.pubDate || a.year || a.publication_date);
        const cites = Number(a.citationCount ?? a.citation_count ?? a.pmcrefcount ?? 0) || 0;
        const abstract = String(a.abstract || '').replace(/\s+/g, ' ').trim();
        out.push({
            kind: design,
            label: `${a.title}${year ? ` (${year})` : ''}`,
            abstract: abstract.slice(0, 1800),
            points: [],
            year,
            uid: a.uid || null,
            score: DESIGN_WEIGHT[design] + Math.max(0, year - 2000) / 5 + Math.min(cites, 500) / 100,
        });
    }
    // Stored guideline documents (full-text or abstract-only). A document with no
    // stored text still earns its place if the learner asked for named sources —
    // the block then says what little is stored instead of letting the model
    // invent content.
    for (const d of documents) {
        const design = documentDesign(d);
        if (!design || !d?.title) continue;
        const key = `d:${String(d.title).toLowerCase().slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const year = yearOf(d.sourceYear ?? d.source_year);
        const text = String(d.text_excerpt ?? d.full_text ?? '').replace(/\s+/g, ' ').trim();
        out.push({
            kind: design,
            label: `${d.title}${year ? ` (${year})` : ''}`,
            abstract: text.slice(0, 1800),
            points: [],
            year,
            url: d.sourceUrl || d.source_url || null,
            docId: d.id ?? null,
            textSource: d.full_text_source ?? d.fullTextSource ?? null,
            score: DESIGN_WEIGHT[design] + Math.max(0, year - 2000) / 5 + Math.min(Number(d._topicScore) || 0, 2),
        });
    }
    return out.sort((x, y) => y.score - x.score);
}

function buildTopSourcesBlock({ topic, guidelines, articles, documents, count = 5 } = {}) {
    const chosen = collectCandidates({ guidelines, articles, documents }).slice(0, count);
    if (!chosen.length) {
        return `## Top-sources request\nThe learner asked for the top ${count} guidelines, reviews or meta-analyses on "${topic}". `
            + 'No guideline, review or meta-analysis is stored for this topic. Say so plainly and suggest a search; do not invent sources.';
    }
    const body = chosen.map((c, i) => {
        const head = `### S${i + 1}. [${c.kind}] ${c.label}${c.url ? `\nURL: ${c.url}` : ''}`;
        if (c.kind === 'guideline' && c.points.length) {
            const pts = c.points.slice(0, MAX_POINTS_PER_SOURCE).map((p, n) => `${n + 1}. ${p.slice(0, MAX_POINT_CHARS)}`);
            const more = c.points.length > MAX_POINTS_PER_SOURCE ? `\n(+${c.points.length - MAX_POINTS_PER_SOURCE} further stored recommendations not shown)` : '';
            return `${head}\nStored recommendations (${c.points.length}):\n${pts.join('\n')}${more}`;
        }
        if (c.abstract) return `${head}\nText excerpt: ${c.abstract}`;
        return `${head}\n(no full text stored for this source — attribute the title and year only; do not infer its content)`;
    }).join('\n\n');
    return `## Top-sources request\nThe learner asked for a summary of the top ${count} guidelines, reviews or meta-analyses on "${topic}".\n`
        + `These ${chosen.length} source${chosen.length === 1 ? ' was' : 's were'} selected from the stored guideline recommendations, evidence articles and stored guideline documents. `
        + (chosen.length < count ? `Only ${chosen.length} are stored; say so. ` : '')
        + 'Write a summary document with one section per source, in this order. '
        + 'In each section list EVERY recommendation or key point the source states, as numbered points that stay faithful to the text: '
        + 'do not merge, drop or reword away any point, and do not add anything the text does not say. '
        + 'For a review or meta-analysis, list each recommendation or conclusion its text states, plus the pooled effect or main finding it reports. '
        + 'If a source shows no stored text, say what is stored rather than inferring content. '
        + 'Cite only the sources below. Finish with a short note on where the sources agree, disagree or leave gaps.\n\n'
        + body;
}

// The summary itself is rendered here, not by the model: a model asked to "list every point" compresses,
// merges and drops. Stored text goes out verbatim; the model only writes the comparison afterwards.
// Which sources a request would show, so the caller can read their full text before rendering.
function chooseTopSources({ guidelines, articles, documents, count = 5 } = {}) {
    return collectCandidates({ guidelines, articles, documents }).slice(0, count);
}

const FULL_TEXT_MIN_CHARS = 2000;

// fullTexts: { [documentId]: { text, source } } for the chosen documents that have stored full text.
function renderTopSourcesDocument({ topic, guidelines, articles, documents, count = 5, fullTexts = {} } = {}) {
    const chosen = chooseTopSources({ guidelines, articles, documents, count });
    if (!chosen.length) {
        return { chosen, markdown: `No guideline, review or meta-analysis is stored for "${topic}". Run a search for this topic to bring some in.\n` };
    }
    const sections = chosen.map((c, i) => {
        const head = `## ${i + 1}. ${c.label} - ${c.kind}${c.url ? `\n${c.url}` : ''}`;
        if (c.kind === 'guideline' && c.points.length) {
            const list = c.points.map((p, n) => `${n + 1}. ${p}`).join('\n');
            return `${head}\n${c.points.length} stored recommendation${c.points.length === 1 ? '' : 's'}:\n\n${list}`;
        }
        const full = c.docId != null ? fullTexts[c.docId] : null;
        if (full && String(full.text || '').length >= FULL_TEXT_MIN_CHARS) {
            const found = extractRecommendationSentences(full.text);
            c.extracted = found;
            if (found.length) {
                return `${head}\n${found.length} recommendation${found.length === 1 ? '' : 's'} and conclusion${found.length === 1 ? '' : 's'} found in the stored full text, quoted exactly:\n\n${found.map((p, n) => `${n + 1}. ${p}`).join('\n')}`;
            }
            return `${head}\nThe full text is stored, but no recommendation-style statements were found in it.`;
        }
        if (c.abstract) {
            const note = c.docId != null ? 'Only the abstract is stored for this source (the full text is not open access or was not retrieved):' : 'Stored text:';
            return `${head}\n${note}\n\n> ${c.abstract}`;
        }
        return `${head}\nOnly the title and year are stored for this source; no recommendations are available to list.`;
    });
    const intro = `### Top ${chosen.length} stored source${chosen.length === 1 ? '' : 's'} on ${topic}\n`
        + (chosen.length < count ? `Only ${chosen.length} of the ${count} requested are stored. ` : '')
        + 'Every stored recommendation or text for each source is listed word for word.\n';
    return { chosen, markdown: `${intro}\n${sections.join('\n\n')}\n\n---\n### How these sources compare\n` };
}

// Short prompt block for the model after the document has been shown.
function buildComparisonBlock({ topic, chosen } = {}) {
    if (!chosen || chosen.length < 2) return '';
    const digest = chosen.map((c, i) => {
        const pts = c.extracted && c.extracted.length ? c.extracted.slice(0, 15).map((p) => p.slice(0, 200)).join(' | ') : c.kind === 'guideline' && c.points.length
            ? c.points.slice(0, 15).map((p) => p.slice(0, 200)).join(' | ')
            : String(c.abstract || '').slice(0, 600);
        return `S${i + 1} ${c.label} [${c.kind}]: ${pts || '(title only)'}`;
    }).join('\n');
    return `## Top-sources comparison\nThe learner has just been shown the full recommendations of these sources on "${topic}" (do not repeat them).\n`
        + 'Write only a short comparison: where the sources agree, where they differ or conflict, and what they leave unaddressed. '
        + 'Refer to sources by S-number and name. Use only the text below; if the sources do not conflict or the text is too thin, say so.\n\n'
        + digest;
}

module.exports = { isTopSourcesRequest, requestedSourceCount, articleDesign, documentDesign, collectCandidates, buildTopSourcesBlock, chooseTopSources, renderTopSourcesDocument, buildComparisonBlock };
