'use strict';

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
function collectCandidates({ guidelines = [], articles = [] } = {}) {
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
    return out.sort((x, y) => y.score - x.score);
}

function buildTopSourcesBlock({ topic, guidelines, articles, count = 5 } = {}) {
    const chosen = collectCandidates({ guidelines, articles }).slice(0, count);
    if (!chosen.length) {
        return `## Top-sources request\nThe learner asked for the top ${count} guidelines, reviews or meta-analyses on "${topic}". `
            + 'No guideline, review or meta-analysis is stored for this topic. Say so plainly and suggest a search; do not invent sources.';
    }
    const body = chosen.map((c, i) => {
        const head = `### S${i + 1}. [${c.kind}] ${c.label}${c.url ? `\nURL: ${c.url}` : ''}`;
        if (c.kind === 'guideline') {
            const pts = c.points.slice(0, MAX_POINTS_PER_SOURCE).map((p, n) => `${n + 1}. ${p.slice(0, MAX_POINT_CHARS)}`);
            const more = c.points.length > MAX_POINTS_PER_SOURCE ? `\n(+${c.points.length - MAX_POINTS_PER_SOURCE} further stored recommendations not shown)` : '';
            return `${head}\nStored recommendations (${c.points.length}):\n${pts.join('\n')}${more}`;
        }
        return `${head}\nAbstract: ${c.abstract || '(no abstract stored)'}`;
    }).join('\n\n');
    return `## Top-sources request\nThe learner asked for a summary of the top ${count} guidelines, reviews or meta-analyses on "${topic}".\n`
        + `These ${chosen.length} source${chosen.length === 1 ? ' was' : 's were'} selected from the stored evidence. `
        + (chosen.length < count ? `Only ${chosen.length} are stored; say so. ` : '')
        + 'Write a summary document with one section per source, in this order. '
        + 'In each section list EVERY recommendation or key point the source states, as numbered points that stay faithful to the text: '
        + 'do not merge, drop or reword away any point, and do not add anything the text does not say. '
        + 'For a review or meta-analysis, list each recommendation or conclusion its abstract states, plus the pooled effect or main finding it reports. '
        + 'If a source shows no stored recommendation text, say that rather than inferring one. '
        + 'Cite only the sources below. Finish with a short note on where the sources agree, disagree or leave gaps.\n\n'
        + body;
}

module.exports = { isTopSourcesRequest, requestedSourceCount, articleDesign, collectCandidates, buildTopSourcesBlock };
