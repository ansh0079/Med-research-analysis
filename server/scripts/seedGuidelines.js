/**
 * Seed clinical guidelines for all topics from PubMed guideline publications.
 *
 * For each topic:
 *   1. Search PubMed for guideline/practice guideline/consensus publications
 *   2. Fetch abstracts for each guideline article
 *   3. Use AI to extract structured recommendations
 *   4. Store in topic_guidelines table
 *
 * Usage:
 *   node server/scripts/seedGuidelines.js
 *   node server/scripts/seedGuidelines.js --topic "heart failure with reduced ejection fraction"
 *   node server/scripts/seedGuidelines.js --force     # re-extract even if guidelines exist
 *   node server/scripts/seedGuidelines.js --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { TRUSTED_GUIDELINE_SOURCES } = require('../config/trustedGuidelineSources');

const topicsData = require('./topics.json');
const ALL_TOPICS = topicsData.topics;

const args = process.argv.slice(2);
const topicArg = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

const topics = topicArg ? [topicArg] : ALL_TOPICS;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJsonBlock(text) {
    const cleaned = (text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1')); }
    catch { return null; }
}

const TRUSTED_BODIES = TRUSTED_GUIDELINE_SOURCES.map(s => s.name);
const TRUSTED_BODIES_SET = new Set(TRUSTED_BODIES.map(b => b.toLowerCase()));

// Map specialty keywords to likely guideline bodies for targeted search
const SPECIALTY_BODIES = {
    cardiovascular: ['ESC', 'AHA/ACC', 'NICE'],
    respiratory: ['BTS', 'ERS', 'GOLD', 'GINA', 'NICE'],
    endocrine: ['ADA', 'NICE'],
    infectious: ['IDSA', 'NICE', 'WHO'],
    rheumatology: ['EULAR', 'NICE'],
    oncology: ['ESMO', 'NICE'],
    critical_care: ['ESICM', 'NICE'],
    general: ['NICE', 'WHO'],
};

function inferSpecialty(topic) {
    const t = topic.toLowerCase();
    if (/heart|cardiac|coronary|angina|arrhyth|atrial|ventricu|hypertens|aortic|valv|endocard|pericardial|syncope|dvt|pulmonary embolism|vte|anticoag|claudication|peripheral arter/.test(t)) return 'cardiovascular';
    if (/asthma|copd|pneumo|bronch|respiratory|lung|pulmonary fib|interstitial|sleep apn|obesity hypo|pleur/.test(t)) return 'respiratory';
    if (/diabet|thyro|adrenal|parathyroid|hypercalc|dyslipid|obesity|bariatric|hyperglycaem/.test(t)) return 'endocrine';
    if (/sepsis|infect|tubercul|hiv|hepatitis|malaria|dengue|typhoid|antibiotic|cellulitis|pneumonia|uti|pyelon/.test(t)) return 'infectious';
    if (/arthritis|rheumat|gout|lupus|spondy|polymyalgia|temporal|osteopor|fracture/.test(t)) return 'rheumatology';
    if (/cancer|carcinoma|melanoma|lymphoma|leukaem|oncol|tumour|tumor|neoplasm/.test(t)) return 'oncology';
    if (/ards|ventilat|vasopressor|inotrope|shock|resuscit|airway|sedation|perioperative/.test(t)) return 'critical_care';
    return 'general';
}

/**
 * Search PubMed for guideline articles on a topic.
 * Fetches both summaries AND abstracts for AI extraction.
 */
async function fetchGuidelineArticles(topic) {
    const specialty = inferSpecialty(topic);
    const bodies = SPECIALTY_BODIES[specialty] || SPECIALTY_BODIES.general;

    const apiKey = serverConfig.keys?.ncbi || '';
    const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';

    // Search for guidelines on this topic
    const guidelineTypes = '(Guideline[pt] OR "Practice Guideline"[pt] OR "Consensus Development Conference"[pt] OR "Systematic Review"[pt])';
    const query = `(${topic}) AND ${guidelineTypes}`;

    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=8&retmode=json&sort=date${apiKeyParam}`;

    const searchRes = await safeFetch(searchUrl, { timeout: 15000 });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Fetch full details with abstracts
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml${apiKeyParam}`;
    const fetchRes = await safeFetch(fetchUrl, { timeout: 20000 });
    if (!fetchRes.ok) {
        // Fallback to summary (no abstracts)
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${apiKeyParam}`;
        const summaryRes = await safeFetch(summaryUrl, { timeout: 15000 });
        if (!summaryRes.ok) return [];
        const summaryData = await summaryRes.json();
        return ids.map(uid => {
            const doc = summaryData?.result?.[uid] || {};
            return { uid, title: doc.title || '', source: doc.source || '', pubdate: doc.pubdate || '', abstract: '', authors: (doc.authors || []).map(a => a.name).join(', ') };
        }).filter(a => a.title);
    }

    // Parse XML for abstracts
    const xml = await fetchRes.text();
    const articles = [];
    const articleBlocks = xml.split(/<PubmedArticle>/g).slice(1);

    for (const block of articleBlocks) {
        const pmid = (block.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title = (block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const abstractParts = block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g) || [];
        const abstract = abstractParts.map(p => p.replace(/<[^>]*>/g, '').trim()).join(' ').slice(0, 2000);
        const journal = (block.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1]?.trim() || '';
        const year = (block.match(/<Year>(\d{4})<\/Year>/) || [])[1] || '';
        const month = (block.match(/<Month>(\w+)<\/Month>/) || [])[1] || '';

        if (title) {
            articles.push({
                uid: pmid,
                title,
                source: journal,
                pubdate: `${year} ${month}`.trim(),
                abstract,
            });
        }
    }

    return articles;
}

/**
 * Build prompt to extract structured guideline recommendations from articles.
 */
function buildGuidelineExtractionPrompt(topic, articles) {
    const specialty = inferSpecialty(topic);
    const relevantBodies = SPECIALTY_BODIES[specialty] || SPECIALTY_BODIES.general;

    const context = articles.map((a, i) => {
        return `[GUIDELINE ARTICLE ${i + 1}]
Title: ${a.title}
Journal: ${a.source} (${a.pubdate})
PMID: ${a.uid}
Abstract: ${(a.abstract || 'No abstract available').slice(0, 1500)}`;
    }).join('\n\n');

    return `You are a clinical guideline extraction specialist. Extract specific, actionable clinical recommendations for "${topic}" from the following guideline publications.

RELEVANT GUIDELINE BODIES for this specialty: ${relevantBodies.join(', ')}
ALL TRUSTED BODIES: ${TRUSTED_BODIES.join(', ')}

GUIDELINE ARTICLES:
${context}

Extract 3-8 specific recommendations. Return ONLY valid JSON array:
[
  {
    "sourceBody": "NICE or ESC or AHA/ACC etc — match to trusted bodies above when possible",
    "sourceRegion": "UK|Europe|USA|Global|International",
    "sourceYear": 2023,
    "sourceUrl": "construct from DOI or PMID if available, otherwise null",
    "sourceSpecialty": "Cardiology|Respiratory|etc",
    "sourceDomain": "nice.org.uk|escardio.org|etc or journal domain",
    "recommendationText": "Specific actionable recommendation — not a vague summary. Include thresholds, drugs, doses if mentioned.",
    "recommendationStrength": "strong|conditional|weak|do not use|research only",
    "recommendationCertainty": "high|moderate|low|very low|guideline",
    "population": "Specific target population",
    "intervention": "The clinical intervention or action",
    "cautions": "Important caveats, contraindications, or monitoring requirements"
  }
]

Rules:
- Extract ONLY from the provided articles — do not invent recommendations not in the abstracts
- Prefer specific over vague: "Start SGLT2 inhibitor in HFrEF with EF ≤40%" beats "Consider heart failure therapy"
- If the abstract mentions a GRADE recommendation level, map it to recommendationStrength
- sourceBody should match one of the TRUSTED BODIES when the publishing society is identifiable
- If a single article contains multiple recommendations, extract each separately
- Include drug names, thresholds, and doses when specified in the abstract
- If no clear guideline recommendations can be extracted, return an empty array []`;
}

async function seedTopicGuidelines(topic, ai) {
    console.log(`\n── ${topic} ──`);

    // Check existing guidelines
    if (!force) {
        const existing = await db.listGuidelines({ query: topic, limit: 100 });
        const topicGuidelines = (existing.guidelines || []).filter(g =>
            g.topic.toLowerCase() === topic.toLowerCase() ||
            g.normalizedTopic === db.normalizeTopic(topic)
        );
        if (topicGuidelines.length >= 2) {
            console.log(`  ✓ Already has ${topicGuidelines.length} guidelines. Skipping.`);
            return { status: 'skipped', count: topicGuidelines.length };
        }
    }

    // Fetch guideline articles from PubMed
    console.log(`  Searching PubMed for guidelines…`);
    let articles;
    try {
        articles = await fetchGuidelineArticles(topic);
    } catch (err) {
        console.warn(`  ⚠ PubMed search failed: ${err.message}`);
        return { status: 'fetch_failed' };
    }

    if (articles.length === 0) {
        console.log(`  ⚠ No guideline articles found on PubMed. Skipping.`);
        return { status: 'no_guidelines' };
    }

    const withAbstract = articles.filter(a => a.abstract && a.abstract.length > 50);
    console.log(`  Found ${articles.length} articles (${withAbstract.length} with abstracts).`);

    if (withAbstract.length === 0) {
        console.log(`  ⚠ No articles with usable abstracts. Skipping.`);
        return { status: 'no_abstracts' };
    }

    const prompt = buildGuidelineExtractionPrompt(topic, withAbstract.slice(0, 6));

    if (dryRun) {
        console.log(`  [DRY RUN] Would extract guidelines (${prompt.length} chars)`);
        return { status: 'dry_run' };
    }

    let rawText;
    try {
        if (serverConfig.keys.gemini) {
            rawText = await ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature: 0.1 });
        } else if (serverConfig.keys.mistral) {
            rawText = await ai.callMistralAI(prompt, PINNED_MODELS.mistral, { temperature: 0.1 });
        } else {
            console.warn(`  ⚠ No AI provider configured.`);
            return { status: 'no_provider' };
        }
    } catch (err) {
        console.warn(`  ⚠ AI extraction failed: ${err.message}`);
        return { status: 'ai_failed' };
    }

    const recommendations = parseJsonBlock(rawText);
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        console.warn(`  ⚠ No valid recommendations extracted.`);
        return { status: 'parse_failed' };
    }

    // Store each recommendation, deduplicating
    let created = 0;
    for (const rec of recommendations) {
        if (!rec.recommendationText || rec.recommendationText.length < 10) continue;

        // Check for duplicates
        const existing = await db.listGuidelines({ query: topic, sourceBody: rec.sourceBody || '', limit: 100 });
        const isDuplicate = (existing.guidelines || []).some(g =>
            g.sourceBody === rec.sourceBody &&
            g.recommendationText === rec.recommendationText
        );
        if (isDuplicate) continue;

        try {
            await db.createGuideline({
                topic,
                sourceBody: rec.sourceBody || 'Unknown',
                sourceRegion: rec.sourceRegion || null,
                sourceYear: rec.sourceYear || null,
                sourceUrl: rec.sourceUrl || null,
                sourceSpecialty: rec.sourceSpecialty || null,
                sourceDomain: rec.sourceDomain || null,
                recommendationText: rec.recommendationText,
                recommendationStrength: rec.recommendationStrength || null,
                recommendationCertainty: rec.recommendationCertainty || null,
                population: rec.population || null,
                intervention: rec.intervention || null,
                cautions: rec.cautions || null,
                status: 'ai_extracted',
            });
            created++;
        } catch (err) {
            console.warn(`  ⚠ Failed to store: ${err.message}`);
        }
    }

    console.log(`  ✅ ${created} guideline recommendation(s) stored from ${withAbstract.length} articles.`);
    return { status: 'success', created, articles: withAbstract.length };
}

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  Guideline Seeding Pipeline               ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`Topics: ${topics.length}${force ? ' (force)' : ''}${dryRun ? ' (DRY RUN)' : ''}`);

    await db.connect();
    await db.runMigrations();

    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

    const stats = { success: 0, skipped: 0, noGuidelines: 0, failed: 0, totalRecs: 0 };

    for (const topic of topics) {
        const result = await seedTopicGuidelines(topic, ai);
        if (result.status === 'success') { stats.success++; stats.totalRecs += result.created; }
        else if (result.status === 'skipped') stats.skipped++;
        else if (result.status === 'no_guidelines' || result.status === 'no_abstracts') stats.noGuidelines++;
        else stats.failed++;

        await sleep(1200); // PubMed rate limit (3 req/sec without key, 10 with)
    }

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Guideline Seeding Complete               ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`  Topics with guidelines: ${stats.success}`);
    console.log(`  Total recommendations: ${stats.totalRecs}`);
    console.log(`  Skipped (already seeded): ${stats.skipped}`);
    console.log(`  No guidelines found: ${stats.noGuidelines}`);
    console.log(`  Failed: ${stats.failed}`);

    await db.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Guideline seeding failed:', err);
    process.exit(1);
});
