'use strict';

// Re-extract from cited abstracts; never relabel an existing recommendation by guesswork.
// Default is a dry run. --apply adds validated rows and preserves the original records.
const { loadEnv, serverConfig } = require('../../config');
loadEnv();
const db = require('../../database');
const { getSharedAiService } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { isIssuingBodyValue } = require('../utils/guidelineAttribution');
const { isServableGuideline } = require('../utils/guidelineQuality');
const { validateExtractedGuideline, extractPubmedId } = require('../utils/guidelineExtraction');
const { fetchAbstracts, buildGuidelineExtractionPrompt, callFirstHealthyProvider } = require('../services/guidelineService');

async function main() {
    const idx = process.argv.indexOf('--topic');
    const topic = idx >= 0 ? process.argv[idx + 1] : null;
    if (!topic || topic.startsWith('--')) throw new Error('Usage: node reextractGuidelineNoise.js --topic "Exact topic" [--apply]');
    const apply = process.argv.includes('--apply');
    await db.connect();
    try {
        const rows = await db.all('SELECT * FROM topic_guidelines WHERE normalized_topic = ? AND superseded_by_id IS NULL', [db.normalizeTopic(topic)]);
        const noise = rows.filter((r) => !isIssuingBodyValue(r.source_body));
        const pmids = [...new Set(noise.map((r) => extractPubmedId(r.source_url)).filter(Boolean))];
        const ai = getSharedAiService({ serverConfig, fetchImpl: safeFetch });
        let validated = 0; let added = 0; let rejected = 0;
        const existing = new Set(rows.map((r) => JSON.stringify([r.source_body, r.source_url, r.recommendation_text])));
        for (let i = 0; i < pmids.length; i += 5) {
            const articles = await fetchAbstracts(pmids.slice(i, i + 5), serverConfig.keys.ncbi, serverConfig.keys.ncbiEmail);
            if (!articles.some((a) => a.abstract)) continue;
            const raw = await callFirstHealthyProvider(ai, serverConfig, buildGuidelineExtractionPrompt(topic, articles), 'guideline repair');
            const candidates = JSON.parse(String(raw).match(/\[[\s\S]*\]/)?.[0] || raw);
            if (!Array.isArray(candidates)) throw new Error('Extraction did not return an array');
            for (const candidate of candidates) {
                const rec = validateExtractedGuideline(candidate, articles);
                if (!rec || !isIssuingBodyValue(rec.sourceBody) || !isServableGuideline({source_body: rec.sourceBody, recommendation_text: rec.recommendationText})) { rejected++; continue; }
                const key = JSON.stringify([rec.sourceBody, rec.sourceUrl, rec.recommendationText]);
                if (existing.has(key)) continue;
                existing.add(key); validated++;
                if (apply) { await db.createGuideline({ ...rec, topic, status: 'ai_extracted' }); added++; }
            }
        }
        console.log(JSON.stringify({ topic, mode: apply ? 'apply' : 'dry-run', noisyRows: noise.length, sourceArticles: pmids.length, validated, rejected, added }));
    } finally { await db.close(); }
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
