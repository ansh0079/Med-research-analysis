'use strict';

const { assessGuidelineCandidate } = require('./guidelineQuality');

const normalize = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();

function extractPubmedId(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.hostname !== 'pubmed.ncbi.nlm.nih.gov') return null;
        return url.pathname.match(/^\/(?:PMID\/)?(\d+)\/?$/)?.[1] || null;
    } catch { return null; }
}

// Attribution must be supported by the cited article, never its publication venue.
function validateExtractedGuideline(rec, articles = []) {
    if (!rec || typeof rec.sourceBody !== 'string' || typeof rec.recommendationText !== 'string') return null;
    const pmid = String(rec.pmid || '').trim() || extractPubmedId(rec.sourceUrl);
    const article = articles.find((a) => String(a.pmid) === pmid);
    if (!article) return null;
    const body = normalize(rec.sourceBody);
    const source = normalize([article.title, article.abstract, article.fullText].filter(Boolean).join(' '));
    const quotedBody = body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!body || body.toLowerCase() === normalize(article.journal).toLowerCase()) return null;
    if (!new RegExp(`(?:^|[^\\p{L}\\p{N}])${quotedBody}(?=$|[^\\p{L}\\p{N}])`, 'u').test(source)) return null;
    const recommendationText = normalize(rec.recommendationText);
    if (!recommendationText || !assessGuidelineCandidate({ sourceBody: body, recommendationText }).ok) return null;
    return { ...rec, sourceBody: body, recommendationText,
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, sourceYear: Number(article.year) || null };
}

module.exports = { validateExtractedGuideline, extractPubmedId };
