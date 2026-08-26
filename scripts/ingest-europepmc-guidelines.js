#!/usr/bin/env node
/**
 * Ingest clinical guidelines for uncovered curriculum topics via Europe PMC.
 *
 * Why this exists alongside ingest-international-guidelines.js:
 *   That script downloads PDFs from a hand-curated catalog and runs them through
 *   GROBID. As of 2026-08 every ncbi.nlm.nih.gov PDF URL in that catalog returns a
 *   reCAPTCHA challenge page (~21KB of HTML) instead of a PDF, so 43/55 entries fail.
 *   Europe PMC exposes a documented REST API for programmatic access that returns
 *   JATS full-text XML directly — no PDF, no GROBID, no bot challenge.
 *
 * Why topic attribution is correct here:
 *   The NICE scraper searches per topic and then stores EVERY recommendation on the
 *   matched pages under that topic, which is how the corpus ended up ~24% on-topic.
 *   This script searches Europe PMC *for a specific curriculum topic* and stores the
 *   extracted recommendations under that exact display_name, so normalized_topic
 *   always matches what getGuidelinesByTopic looks up.
 *
 * For each uncovered topic:
 *   1. Search Europe PMC for open-access guideline articles about that topic
 *   2. Fetch JATS full-text XML for the best hits
 *   3. Strip XML to body prose (dropping references/tables/figures)
 *   4. AI-extract graded recommendations
 *   5. Insert under the topic's exact curriculum display_name
 *
 * Run inside the worker container:
 *   node scripts/ingest-europepmc-guidelines.js
 *
 * Env:
 *   INGEST_DRY_RUN         1 = log, no DB writes
 *   INGEST_TOPIC_FILTER    comma-separated display_names to restrict the run
 *   INGEST_MAX_TOPICS      stop after N topics (default: all uncovered)
 *   INGEST_ARTICLES_PER_TOPIC  full texts to mine per topic (default 2)
 *   INGEST_MIN_RECS        skip a topic that already has >= N servable recs (default 1)
 */

'use strict';

const https = require('https');

const db = require('../database');
const { createAiService } = require('../server/services/ai/aiService');
const { getProviderCandidates } = require('../server/utils/aiProvider');
const { serverConfig } = require('../config');

const DRY_RUN = process.env.INGEST_DRY_RUN === '1';
const TOPIC_FILTER = process.env.INGEST_TOPIC_FILTER
    ? new Set(process.env.INGEST_TOPIC_FILTER.split(',').map(s => s.trim().toLowerCase()))
    : null;
const MAX_TOPICS = Number(process.env.INGEST_MAX_TOPICS || 0);
const ARTICLES_PER_TOPIC = Math.max(1, Number(process.env.INGEST_ARTICLES_PER_TOPIC || 2));
const MIN_RECS = Number(process.env.INGEST_MIN_RECS || 1);

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'MedResearch/1.0 (academic-use; +https://signalmd.co)';

const RECOMMENDATION_RE = /\b(should|should not|recommend|must|offer|consider|avoid|do not|initiate|start|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated|titrate|discontinue)\b/i;
const MIN_REC_LENGTH = 35;
const MAX_REC_LENGTH = 400;

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function httpGet(url, { timeout = 60000 } = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': UA }, timeout }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(httpGet(res.headers.location, { timeout }));
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Search ───────────────────────────────────────────────────────────────────

// "Myasthenic crisis: intubation thresholds, IVIG vs plasmapheresis" -> "Myasthenic crisis"
function coreTerm(displayName) {
    return String(displayName).split(/[:–—(]/)[0].trim();
}

// Words that carry no disease-identifying signal on their own. A variant that
// reduces to one of these matches essentially any article -- "Incarcerated"
// (from "Incarcerated ... hernias") retrieves prison-health guidelines, and
// "Metabolic" (from "Metabolic and mitochondrial myopathies") retrieves
// bariatric surgery. Both were observed in a dry run.
const UNSAFE_SOLO_TERMS = new Set([
    'incarcerated', 'strangulated', 'metabolic', 'acute', 'chronic', 'toxic', 'viral',
    'delayed', 'febrile', 'pure', 'landmark', 'biologic', 'biologics', 'distributive',
    'therapeutic', 'radiation', 'electrical', 'primary', 'secondary', 'severe', 'mild',
    'refractory', 'atypical', 'complicated', 'uncomplicated', 'paradoxical', 'irradiated',
]);

function isUsableVariant(v) {
    const trimmed = v.trim();
    if (trimmed.length < 6) return false;
    const words = trimmed.split(/\s+/);
    // A single word is only specific enough if it is a real disease noun.
    if (words.length === 1) return !UNSAFE_SOLO_TERMS.has(trimmed.toLowerCase()) && trimmed.length >= 8;
    return true;
}

// UK -> US spelling. Applied both to search terms and, in the relevance gates, to
// the text being matched: curriculum names are UK-spelled but most guideline prose
// indexed in Europe PMC is US-spelled, so "leukaemia" never substring-matches
// "leukemia" and every recommendation gets rejected as off-topic.
function toUsSpelling(s) {
    return String(s || '')
        .replace(/\bhaemat/gi, 'hemat').replace(/\bhaemo/gi, 'hemo')
        .replace(/haemorrhage/gi, 'hemorrhage').replace(/\baemia\b/gi, 'emia')
        .replace(/anaemia/gi, 'anemia').replace(/oedema/gi, 'edema')
        .replace(/leukaemia/gi, 'leukemia').replace(/thalassaemia/gi, 'thalassemia')
        .replace(/tumour/gi, 'tumor').replace(/coeliac/gi, 'celiac')
        .replace(/diarrhoea/gi, 'diarrhea').replace(/natraemia/gi, 'natremia')
        .replace(/kalaemia/gi, 'kalemia').replace(/calaemia/gi, 'calemia')
        .replace(/glycaemia/gi, 'glycemia').replace(/uricaemia/gi, 'uricemia')
        .replace(/ischaemi/gi, 'ischemi').replace(/paediatric/gi, 'pediatric')
        .replace(/oesophag/gi, 'esophag').replace(/orthopaedic/gi, 'orthopedic');
}

// Some curriculum names are UK-spelled or bundle two entities with "and"/"vs".
function searchVariants(displayName) {
    const core = coreTerm(displayName);
    const variants = new Set([core]);

    // US spellings — Europe PMC indexes both, but titles usually pick one.
    const us = toUsSpelling(core);
    if (us !== core) variants.add(us);

    // "Alpha and Beta Thalassaemia" -> "Alpha Thalassaemia" / "Beta Thalassaemia".
    // Distribute the trailing head noun rather than emitting the bare modifier,
    // so a split never yields a standalone adjective.
    for (const v of [...variants]) {
        const m = v.match(/^(.+?)\s+(?:and|vs\.?|versus)\s+(.+)$/i);
        if (!m) continue;
        const [, left, right] = m;
        const rightWords = right.trim().split(/\s+/);
        if (rightWords.length >= 2) {
            const head = rightWords.slice(-1)[0];
            variants.add(`${left.trim()} ${head}`);
        }
        variants.add(right.trim());
    }

    return [...variants].filter(isUsableVariant);
}

// ─── Relevance gates ──────────────────────────────────────────────────────────

const REL_STOP = new Set([
    'and', 'the', 'of', 'in', 'for', 'with', 'to', 'management', 'therapy', 'treatment',
    'disease', 'syndrome', 'acute', 'chronic', 'criteria', 'guidelines', 'guideline',
    'patients', 'patient', 'clinical', 'diagnosis', 'features', 'overview', 'versus',
    'vs', 'from', 'this', 'that', 'their', 'other', 'risk', 'high', 'low',
]);

function relevanceWords(s) {
    const words = toUsSpelling(s).toLowerCase().match(/[a-z]{4,}/g) || [];
    return [...new Set(words.filter(w => !REL_STOP.has(w)))];
}

/**
 * Guideline prose refers to a condition by its abbreviation far more often than by
 * its full name ("CML", "IgAN", "PAF"), so matching on expanded words alone rejects
 * genuine on-topic recommendations. Accept: abbreviations already written in the
 * curriculum name, plus the initialism built from the name's significant words.
 */
function relevanceAbbreviations(displayName) {
    const abbrevs = new Set();

    // Abbreviations spelled out in the topic name itself: "IgA", "INO", "APS-1".
    for (const m of String(displayName).match(/\b[A-Za-z]*[A-Z]{2,}[A-Za-z0-9-]*\b/g) || []) {
        if (m.length >= 2 && m.length <= 12) abbrevs.add(m.toLowerCase());
    }

    // Initialism of the core term: "Chronic Myeloid Leukaemia" -> "cml".
    // Only grammatical joiners are dropped here, NOT REL_STOP -- REL_STOP contains
    // clinically meaningful modifiers like "chronic" and "acute" that are part of
    // the abbreviation, and dropping them turns CML into "ml".
    const JOINERS = new Set(['and', 'or', 'of', 'the', 'in', 'for', 'with', 'to', 'vs', 'versus']);
    const words = coreTerm(displayName)
        .split(/\s+/)
        .filter(w => /^[A-Za-z]{2,}$/.test(w) && !JOINERS.has(w.toLowerCase()));
    if (words.length >= 2 && words.length <= 5) {
        abbrevs.add(words.map(w => w[0].toLowerCase()).join(''));
    }
    // Two-letter initialisms collide with units and common words ("ml", "in", "or").
    return [...abbrevs].filter(a => a.length >= 3);
}

// Whole-token match, so "cml" does not match inside an unrelated longer word.
function hasToken(lower, token) {
    return new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(lower);
}

/**
 * True when the article is about this topic and essentially only this topic, so its
 * recommendations can be trusted wholesale. Requires every topic content word in the
 * title (or the topic's abbreviation plus one), and rejects umbrella documents whose
 * title advertises coverage of a broader class.
 */
const UMBRELLA_TITLE_RE = /(diseases|disorders|conditions|overview|compendium|handbook|spectrum|and related|miscellane)/i;

function isTopicSpecific(title, topicWords, abbrevs = []) {
    if (!topicWords.length) return false;
    const lower = toUsSpelling(title).toLowerCase();
    const allWords = topicWords.every(w => lower.includes(w));
    const abbrevHit = abbrevs.some(a => hasToken(lower, a));
    const matched = topicWords.filter(w => lower.includes(w)).length;
    const specific = allWords || (abbrevHit && matched >= 1);
    return specific && !UMBRELLA_TITLE_RE.test(title || '');
}

// Tier 0 required a guideline-marker word in the title; otherwise fall back to the
// indexed publication types. Anything else is treated as ordinary literature.
const GUIDELINE_PUB_TYPE_RE = /guideline|consensus|practice parameter|position statement/i;

function isGuidelineDocument(article) {
    if (article._tier === 0) return true;
    const types = article.pubTypeList?.pubType;
    const list = Array.isArray(types) ? types : (types ? [types] : []);
    return list.some(t => GUIDELINE_PUB_TYPE_RE.test(String(t)));
}

function overlapCount(text, topicWords, abbrevs = []) {
    const lower = toUsSpelling(text).toLowerCase();
    let n = topicWords.filter(w => lower.includes(w)).length;
    if (!n && abbrevs.some(a => hasToken(lower, a))) n = 1;
    return n;
}

function esc(s) {
    return encodeURIComponent(s.replace(/"/g, ''));
}

const GUIDELINE_TITLE_WORDS =
    '(TITLE:guideline OR TITLE:guidelines OR TITLE:recommendations OR TITLE:consensus OR TITLE:%22position%20statement%22 OR TITLE:%22practice%20parameter%22)';

/**
 * Fallback chain, most precise first. Precision matters more than recall here:
 * a wrong guideline attributed to a topic is worse than no guideline, because
 * these rows are injected into the agent's system prompt as authoritative.
 */
function buildQueries(term) {
    const t = esc(term);
    return [
        // 1. Topic and a guideline-marker word both in the title.
        `TITLE:%22${t}%22%20AND%20${GUIDELINE_TITLE_WORDS}%20AND%20OPEN_ACCESS:Y%20AND%20HAS_FT:Y`,
        // 2. Topic in the title, guideline-marker anywhere.
        `TITLE:%22${t}%22%20AND%20(guideline%20OR%20recommendations%20OR%20consensus)%20AND%20OPEN_ACCESS:Y%20AND%20HAS_FT:Y`,
        // 3. Topic anywhere, but the article must be typed as a guideline.
        `%22${t}%22%20AND%20(PUB_TYPE:%22Guideline%22%20OR%20PUB_TYPE:%22Practice%20Guideline%22%20OR%20PUB_TYPE:%22Consensus%20Development%20Conference%22)%20AND%20OPEN_ACCESS:Y%20AND%20HAS_FT:Y`,
    ];
}

/**
 * The title-relevance gate is applied here rather than by the caller so that a
 * variant whose hits are all off-topic falls through to the next variant. Applying
 * it downstream meant the first variant to return *any* rows ended the search --
 * UK-spelled "Chronic Myeloid Leukaemia" would match unrelated papers and the
 * US-spelled variant that finds the ELN recommendations was never tried.
 */
async function searchGuidelines(displayName, topicWords, abbrevs) {
    const need = topicWords.length >= 3 ? 2 : 1;
    for (const term of searchVariants(displayName)) {
        for (const [tier, query] of buildQueries(term).entries()) {
            let json;
            try {
                const raw = await httpGet(`${EPMC}/search?query=${query}&format=json&pageSize=8&resultType=core`);
                json = JSON.parse(raw);
            } catch {
                continue;
            }
            const hits = (json.resultList?.result || [])
                .filter(r => r.pmcid && r.inEPMC === 'Y')
                .filter(r => topicWords.length && overlapCount(r.title, topicWords, abbrevs) >= need)
                .map(r => ({ ...r, _tier: tier }));
            if (hits.length) return { hits, term };
            await sleep(150);
        }
    }
    return { hits: [], term: null };
}

// ─── Full text ────────────────────────────────────────────────────────────────

/**
 * JATS body text. Drops <ref-list>, tables, figures, and back matter — those are
 * dense with citation fragments that read like recommendations to the extractor.
 */
function jatsToText(xml) {
    let body = xml;
    const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) body = bodyMatch[1];

    return body
        .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, ' ')
        .replace(/<table-wrap[\s\S]*?<\/table-wrap>/gi, ' ')
        .replace(/<fig[\s\S]*?<\/fig>/gi, ' ')
        .replace(/<xref[\s\S]*?<\/xref>/gi, ' ')
        .replace(/<disp-formula[\s\S]*?<\/disp-formula>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x2019;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchFullText(pmcid) {
    const xml = await httpGet(`${EPMC}/${pmcid}/fullTextXML`);
    if (!/<body[^>]*>/i.test(xml)) throw new Error('no body element (abstract-only record)');
    const text = jatsToText(xml);
    if (text.length < 2000) throw new Error(`body too short (${text.length} chars)`);
    return text;
}

// ─── AI extraction ────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a clinical guideline analyst. Extract every specific clinical recommendation from this section of a clinical practice guideline.

For each recommendation output a JSON object on its own line:
{"text": "...", "strength": "...", "certainty": "..."}

- "text": the exact recommendation statement (what clinicians should/must/should not do). Include patient population if mentioned. 35-300 chars.
- "strength": one of "strong", "conditional", "expert opinion", or null if not specified.
- "certainty": one of "high", "moderate", "low", "very low", or null if not specified.

Rules:
- Only include actionable recommendations (sentences with should/must/recommend/offer/consider/avoid/initiate/prescribe/first-line/contraindicated).
- Skip background text, epidemiology, definitions, study citations, and committee commentary.
- Skip recommendations that are only about "refer to section X" or "see guideline Y".
- Output ONLY the JSON objects, one per line. No other text.

GUIDELINE TEXT:
`;

function parseAiResponse(raw) {
    const recs = [];
    for (const line of String(raw || '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
            const obj = JSON.parse(trimmed);
            const text = String(obj.text || obj.recommendation || '').trim();
            if (text.length < MIN_REC_LENGTH || text.length > MAX_REC_LENGTH) continue;
            if (!RECOMMENDATION_RE.test(text)) continue;
            recs.push({
                text,
                strength: obj.strength || null,
                certainty: obj.certainty || null,
            });
        } catch {
            // skip malformed line
        }
    }
    return recs;
}

async function extractRecs(aiService, text, label) {
    const candidates = getProviderCandidates({}, serverConfig);
    const errors = [];
    for (const { provider, model } of candidates) {
        try {
            const raw = await aiService.callText(
                EXTRACTION_PROMPT + text.slice(0, 12000),
                provider,
                model,
                { maxOutputTokens: 4096, timeoutMs: 90000 }
            );
            return parseAiResponse(raw);
        } catch (err) {
            errors.push(`${provider}: ${err.message}`);
        }
    }
    throw new Error(`all providers failed for ${label}: ${errors.join('; ')}`);
}

function chunkText(text, chunkSize = 11000, overlap = 500) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        if (end === text.length) break;
        start = end - overlap;
    }
    return chunks;
}

// ─── Source attribution ───────────────────────────────────────────────────────

/**
 * Prefer a named issuing body from the title ("2025 European LeukemiaNet
 * recommendations..."), else fall back to the journal. Never invent a body.
 */
const KNOWN_BODIES = [
    'European LeukemiaNet', 'KDIGO', 'ERA', 'ESC', 'EULAR', 'ESMO', 'ASCO', 'ASH',
    'IDSA', 'ATS', 'ERS', 'BTS', 'NICE', 'SIGN', 'WHO', 'AHA', 'ACC', 'ACR', 'ACG',
    'AASLD', 'EASL', 'ECCO', 'ISPD', 'KDOQI', 'ENETS', 'NANETS', 'IWG', 'BSH',
    'Endocrine Society', 'Thalassaemia International Federation', 'German Respiratory Society',
    'Korean', 'Canadian Society of Nephrology', 'IPNA', 'WSES', 'ASFA', 'TIF',
];

function attributeSource(article) {
    const title = String(article.title || '');
    for (const body of KNOWN_BODIES) {
        if (new RegExp(`\\b${body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title)) {
            return body;
        }
    }
    const journal = article.journalInfo?.journal?.title || article.journalTitle;
    return String(journal || 'Guideline (Europe PMC)').slice(0, 120);
}

// ─── Per-topic ingestion ──────────────────────────────────────────────────────

async function ingestTopic(displayName, aiService) {
    const result = { topic: displayName, inserted: 0, articles: 0, rejected: 0, error: null };

    const existing = await db.getGuidelinesByTopic(displayName, { limit: MIN_RECS }).catch(() => []);
    if (existing.length >= MIN_RECS) {
        console.log(`  "${displayName.slice(0, 62)}"... already covered, skipping`);
        return result;
    }

    // Gate 1 (title relevance) is applied inside searchGuidelines so an off-topic
    // variant falls through to the next one instead of ending the search.
    const topicWords = relevanceWords(coreTerm(displayName));
    const abbrevs = relevanceAbbreviations(displayName);
    const { hits, term } = await searchGuidelines(displayName, topicWords, abbrevs);
    if (!hits.length) {
        console.log(`  "${displayName.slice(0, 62)}"... no open-access guideline found`);
        return result;
    }

    const seenTexts = new Set();
    for (const article of hits.slice(0, ARTICLES_PER_TOPIC)) {
        let text;
        try {
            text = await fetchFullText(article.pmcid);
        } catch (err) {
            console.log(`     ${article.pmcid}: ${err.message}`);
            continue;
        }
        result.articles++;

        const sourceBody = attributeSource(article);
        // Relaxing gate 2 is only safe for an actual guideline document. A case
        // report can carry the topic words in its title -- "...mimicking trochanteric
        // bursitis" -- and its management text is about the mimic, not the topic.
        const topicSpecificArticle = isGuidelineDocument(article)
            && isTopicSpecific(article.title, topicWords, abbrevs);
        const chunks = chunkText(text).slice(0, 3);
        const recs = [];
        for (const chunk of chunks) {
            try {
                recs.push(...await extractRecs(aiService, chunk, article.pmcid));
            } catch (err) {
                console.log(`     ${article.pmcid}: extraction failed — ${err.message}`);
            }
        }

        for (const rec of recs) {
            const key = rec.text.toLowerCase().replace(/\s+/g, ' ');
            if (seenTexts.has(key)) continue;
            seenTexts.add(key);

            // Gate 2 — for a guideline that covers several conditions, each
            // recommendation must itself mention this topic, so sections about
            // adjacent diseases are not stored under it.
            //
            // Skipped when the article is wholly about this topic (see
            // isTopicSpecific): a disease-specific guideline does not restate the
            // disease in every sentence -- a CML guideline says "BCR-ABL1
            // transcripts" and "TKI therapy" -- and requiring it there rejected
            // every genuine recommendation.
            if (!topicSpecificArticle && overlapCount(rec.text, topicWords, abbrevs) < 1) {
                result.rejected++;
                continue;
            }

            if (DRY_RUN) {
                console.log(`     [DRY ${sourceBody}] ${rec.text.slice(0, 90)}`);
                result.inserted++;
                continue;
            }
            try {
                await db.createGuideline({
                    topic: displayName,
                    sourceBody,
                    sourceYear: article.pubYear ? Number(article.pubYear) : null,
                    sourceUrl: `https://europepmc.org/article/PMC/${article.pmcid}`,
                    recommendationText: rec.text,
                    recommendationStrength: rec.strength,
                    recommendationCertainty: rec.certainty,
                    status: 'ai_extracted',
                });
                result.inserted++;
            } catch (err) {
                if (!/duplicate|unique/i.test(err.message || '')) {
                    console.warn(`     [warn] insert failed: ${err.message}`);
                }
            }
        }
        await sleep(300);
    }

    const rej = result.rejected ? `, ${result.rejected} off-topic rejected` : '';
    console.log(`  "${displayName.slice(0, 62)}"... +${result.inserted} recs from ${result.articles} article(s)${rej} [q="${term}"]`);
    return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    await db.connect();

    const allTopics = await db.all(
        `SELECT display_name FROM curriculum_topics WHERE specialty IS NOT NULL ORDER BY sort_order`,
        []
    );

    let candidates = allTopics.map(t => t.display_name);
    if (TOPIC_FILTER) {
        candidates = candidates.filter(n => TOPIC_FILTER.has(n.toLowerCase()));
    }

    // Only topics with no servable guidelines today.
    const uncovered = [];
    for (const name of candidates) {
        const rows = await db.getGuidelinesByTopic(name, { limit: 1 }).catch(() => []);
        if (!rows.length) uncovered.push(name);
    }

    const targets = MAX_TOPICS > 0 ? uncovered.slice(0, MAX_TOPICS) : uncovered;
    console.log(`[EPMC Ingest] ${targets.length} uncovered topics to process${DRY_RUN ? ' (DRY RUN)' : ''}`);

    const aiService = createAiService({ serverConfig });
    let totalInserted = 0;
    let covered = 0;
    const stillEmpty = [];

    for (const name of targets) {
        try {
            const r = await ingestTopic(name, aiService);
            totalInserted += r.inserted;
            if (r.inserted > 0) covered++;
            else stillEmpty.push(name);
        } catch (err) {
            console.warn(`  "${name.slice(0, 62)}"... ERROR — ${err.message}`);
            stillEmpty.push(name);
        }
    }

    console.log(`\n[EPMC Ingest] Done: ${totalInserted} recs inserted, ${covered}/${targets.length} topics newly covered`);
    if (stillEmpty.length) {
        console.log(`[EPMC Ingest] Still uncovered (${stillEmpty.length}):`);
        stillEmpty.forEach(n => console.log(`  - ${n}`));
    }
    process.exit(0);
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
