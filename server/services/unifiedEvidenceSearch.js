/**
 * Shared multi-source article fetch used by GET /api/search and case-analysis evidence gathering.
 * @param {import('../utils/fetch').safeFetch} fetch
 */

const { buildProxyService } = require('./externalApiProxy');
const crypto = require('crypto');
const { getPromptVersion } = require('../prompts/promptVersions');
const { queryAliasMatchScore } = require('./evidenceBouquetService');

// EBM evidence hierarchy — higher score = stronger study design
const EBM_SCORES = {
    'systematic review': 7,
    'meta-analysis': 7,
    'meta analysis': 7,
    'randomized controlled trial': 6,
    'randomised controlled trial': 6,
    'rct': 6,
    'controlled clinical trial': 5,
    'clinical trial': 5,
    'cohort study': 4,
    'cohort': 4,
    'case-control': 3,
    'case control': 3,
    'cross-sectional': 2,
    'cross sectional': 2,
    'case report': 1,
    'case series': 1,
    'editorial': 0,
    'letter': 0,
    'comment': 0,
};

function getEbmScore(article) {
    const types = [
        ...(Array.isArray(article.pubtype) ? article.pubtype : []),
        article.studyDesign || '',
    ].map((t) => (t || '').toLowerCase());
    let best = -1;
    for (const [keyword, score] of Object.entries(EBM_SCORES)) {
        if (types.some((t) => t.includes(keyword))) best = Math.max(best, score);
    }
    return best >= 0 ? best : 2; // default to cross-sectional tier
}

function isPreprint(article) {
    const sources = ['biorxiv', 'medrxiv', 'preprint', 'ssrn', 'researchsquare'];
    const text = ((article.source || '') + (article.journal || '')).toLowerCase();
    return sources.some((s) => text.includes(s));
}

// `pmids` pins the known landmark-trial PMID directly via esummary (bypassing esearch
// relevance ranking). This matters because many older trials (pre-2000s) never cite their
// own acronym in the title/abstract — the acronym became common self-citation only after
// the CONSORT/registry era — so acronym-based Title/Abstract search finds papers that cite
// the trial, not the trial itself, and buries the source under decades of later citations.
const CLINICAL_QUERY_ALIAS_RULES = [
    { all: [/\bsglt2\b|\bsodium[- ]glucose\b/i, /\bheart failure\b|\bhfref\b|\breduced ejection fraction\b/i], aliases: ['DAPA-HF', 'EMPEROR-Reduced', 'dapagliflozin', 'empagliflozin'], pmids: ['31535829', '32865377'] },
    { all: [/\bsacubitril\b|\bvalsartan\b|\bneprilysin\b/i, /\bheart failure\b|\bhfref\b|\bmortality\b/i], aliases: ['PARADIGM-HF', 'LCZ696'], pmids: ['25176015'] },
    { all: [/\bspironolactone\b|\bmineralocorticoid\b|\baldosterone\b/i, /\bheart failure\b|\bsurvival\b/i], aliases: ['RALES'], pmids: ['10471456'] },
    { all: [/\benalapril\b|\bace inhibitor\b/i, /\bleft ventricular\b|\bejection fraction\b|\bsurvival\b/i], aliases: ['SOLVD', 'Studies of Left Ventricular Dysfunction'], pmids: ['2057034'] },
    { all: [/\bintensive\b/i, /\bblood pressure\b|\bsystolic\b/i], aliases: ['SPRINT'] },
    { all: [/\bhypertension\b/i, /\b80\b|\bvery elderly\b|\belderly\b/i], aliases: ['HYVET'] },
    { all: [/\bempagliflozin\b/i, /\bcardiovascular outcomes?\b|\btype 2 diabetes\b/i], aliases: ['EMPA-REG OUTCOME'], pmids: ['26378978'] },
    { all: [/\bliraglutide\b|\bglp-?1\b/i, /\bcardiovascular outcomes?\b|\btype 2 diabetes\b/i], aliases: ['LEADER'] },
    { all: [/\bukpds\b|\bsulphonylureas?\b|\bsulfonylureas?\b/i, /\btype 2 diabetes\b|\bblood glucose\b/i], aliases: ['UKPDS 33'], pmids: ['9742976'] },
    { all: [/\baccord\b|\bintensive glucose\b|\bglucose lowering\b/i, /\btype 2 diabetes\b|\bmortality\b/i], aliases: ['ACCORD'], pmids: ['18539917'] },
    { all: [/\bcanagliflozin\b/i, /\brenal\b|\bnephropathy\b|\bkidney\b/i], aliases: ['CREDENCE'] },
    { all: [/\bempagliflozin\b/i, /\bchronic kidney disease\b|\bckd\b|\bkidney disease\b/i], aliases: ['EMPA-KIDNEY'], pmids: ['36331190'] },
    { all: [/\brosuvastatin\b|\bc-reactive protein\b|\bprimary prevention\b/i], aliases: ['JUPITER'] },
    { all: [/\bevolocumab\b|\bpcsk9\b/i, /\bcardiovascular outcomes?\b/i], aliases: ['FOURIER'] },
    { all: [/\bezetimibe\b/i, /\bacute coronary syndrome\b|\bstatin\b/i], aliases: ['IMPROVE-IT'] },
    { all: [/\bcanakinumab\b|\banti-inflammatory\b/i, /\batheroscler/i], aliases: ['CANTOS'] },
    { all: [/\bdabigatran\b/i, /\bwarfarin\b|\batrial fibrillation\b/i], aliases: ['RE-LY'] },
    { all: [/\bapixaban\b/i, /\bwarfarin\b|\batrial fibrillation\b/i], aliases: ['ARISTOTLE'] },
    { all: [/\bcha2?ds2\b|\bvasc\b|\brisk stratification\b/i, /\batrial fibrillation\b|\bstroke\b/i], aliases: ['CHA2DS2-VASc', 'CHA2DS2VASc'] },
    { all: [/\bticagrelor\b/i, /\bclopidogrel\b|\bacute coronary syndromes?\b/i], aliases: ['PLATO'] },
    { all: [/\binvasive\b/i, /\bconservative\b/i, /\bstable coronary\b|\bischemic heart\b/i], aliases: ['ISCHEMIA'] },
    { all: [/\bprimary angioplasty\b|\bprimary pci\b|\bthrombolytic\b|\bthrombolysis\b/i, /\bmyocardial infarction\b|\bami\b|\bstemi\b/i], aliases: ['primary PCI', 'Keeley'], pmids: ['12517460'] },
    { all: [/\btranscatheter\b|\btavr\b|\btavi\b/i, /\blow-risk\b|\blow risk\b|\bballoon-expandable\b/i], aliases: ['PARTNER 3'] },
    { all: [/\blow tidal volume\b|\blung protective\b/i, /\bards\b|\bacute respiratory distress\b/i], aliases: ['ARDSNet', 'ARMA', 'Ventilation with lower tidal volumes', 'acute lung injury'], pmids: ['10793162'] },
    { all: [/\bprone\b|\bproning\b/i, /\bards\b|\bacute respiratory distress\b/i], aliases: ['PROSEVA'], pmids: ['23688302'] },
    { all: [/\btriple inhaled\b|\btriple therapy\b/i, /\bcopd\b|\bexacerbation\b/i], aliases: ['IMPACT', 'ETHOS'] },
    { all: [/\baspirin\b/i, /\belderly\b|\bhealthy elderly\b|\bprimary prevention\b/i], aliases: ['ASPREE'] },
    { all: [/\bdexamethasone\b/i, /\bcovid/i], aliases: ['RECOVERY'] },
    { all: [/\btocilizumab\b/i, /\bcovid/i], aliases: ['RECOVERY', 'REMAP-CAP'] },
    { all: [/\bpembrolizumab\b/i, /\bnon-small cell\b|\bnsclc\b|\blung cancer\b/i], aliases: ['KEYNOTE-189'], pmids: ['29658856'] },
    { all: [/\bnivolumab\b/i, /\bipilimumab\b/i, /\bmelanoma\b/i], aliases: ['CheckMate 067'], pmids: ['31562797'] },
    { all: [/\bcar-?t\b|\baxicabtagene\b/i, /\blymphoma\b|\blarge b-cell\b/i], aliases: ['ZUMA-1'], pmids: ['29226797'] },
    { all: [/\bcrispr\b|\bcas9\b|\bctx001\b/i, /\bsickle cell\b|\bbeta-thalassemia\b|\bthalassaemia\b/i], aliases: ['CTX001', 'exagamglogene autotemcel', 'CLIMB THAL-111'], pmids: ['33283989'] },
    { all: [/\btissue plasminogen\b|\balteplase\b|\btpa\b/i, /\bstroke\b|\bischemic\b|\bischaemic\b/i], aliases: ['NINDS', 'rt-PA', 'National Institute of Neurological Disorders', 'National Institute of Neurological Disorders and Stroke'], pmids: ['7477192'] },
    { all: [/\bendovascular thrombectomy\b|\bthrombectomy\b/i, /\bstroke\b|\btime to treatment\b/i], aliases: ['HERMES'] },
    { all: [/\bantidepressant\b|\bdepressed outpatients\b/i, /\bsequential\b|\btreatment steps\b/i], aliases: ['STAR*D', 'Sequenced Treatment Alternatives to Relieve Depression'], pmids: ['17074942'] },
    { all: [/\bsurviving sepsis\b|\bsepsis campaign\b/i, /\bsepsis\b|\bseptic shock\b/i], aliases: ['Surviving Sepsis Campaign'], pmids: ['34599691'] },
];

function clinicalQueryAliases(query) {
    const text = String(query || '');
    const out = new Set();
    for (const rule of CLINICAL_QUERY_ALIAS_RULES) {
        if (rule.all.every((pattern) => pattern.test(text))) {
            rule.aliases.forEach((alias) => out.add(alias));
        }
    }
    return [...out].slice(0, 8);
}

function clinicalQueryPinnedPmids(query) {
    const text = String(query || '');
    const out = new Set();
    for (const rule of CLINICAL_QUERY_ALIAS_RULES) {
        if (Array.isArray(rule.pmids) && rule.all.every((pattern) => pattern.test(text))) {
            rule.pmids.forEach((pmid) => out.add(pmid));
        }
    }
    return [...out].slice(0, 6);
}

function pubmedTextAlias(alias) {
    const clean = String(alias || '').replace(/"/g, '').trim();
    if (!clean) return null;
    return /\s/.test(clean) ? `"${clean}"` : `"${clean}"[Title/Abstract]`;
}

function buildPubMedSearchQuery(baseQuery, meshExpansions = [], aliases = []) {
    const terms = [String(baseQuery || '').trim()].filter(Boolean);
    terms.push(...meshExpansions.map((term) => `"${String(term).replace(/"/g, '').trim()}"[MeSH Terms]`).filter(Boolean));
    terms.push(...aliases.map(pubmedTextAlias).filter(Boolean));
    if (terms.length <= 1) return terms[0] || '';
    return `(${terms.join(' OR ')})`;
}

/** Strip DOI URL prefixes and lowercase for stable cross-source matching */
function normalizeDoi(doi) {
    if (!doi) return null;
    let d = String(doi).trim().toLowerCase();
    d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    return d || null;
}

function normalizePmid(pmid) {
    if (!pmid) return null;
    const match = String(pmid).match(/\d{4,12}/);
    return match ? match[0] : null;
}

const TITLE_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'from',
    'effects', 'effect', 'study', 'studies', 'clinical', 'patients', 'patient', 'using', 'use',
    'randomized', 'randomised', 'controlled', 'trial', 'trials', 'versus', 'vs',
]);

function titleWordSet(title) {
    if (!title || typeof title !== 'string') return new Set();
    const words = title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w));
    return new Set(words);
}

function jaccardWordSets(a, b) {
    if (a.size === 0 && b.size === 0) return 1;
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

function parseArticleYear(article) {
    const y = article.year ?? article.pubdate;
    if (typeof y === 'number' && y > 1900 && y < 2100) return y;
    if (typeof y === 'string') {
        const m = y.match(/\b(19|20)\d{2}\b/);
        if (m) return parseInt(m[0], 10);
    }
    return null;
}

function publicationYearsCompatible(a, b) {
    const ya = parseArticleYear(a);
    const yb = parseArticleYear(b);
    if (ya === null || ya === undefined || yb === null || yb === undefined) return true;
    return Math.abs(ya - yb) <= 1;
}

/**
 * Drop near-duplicate titles (same paper, different DOI/uid across sources) after RRF.
 * Preserves first occurrence = higher fused rank.
 */
function collapseNearDuplicateTitles(articles, { minJaccard = 0.72 } = {}) {
    const kept = [];
    const seen = [];
    for (const article of articles) {
        const words = titleWordSet(article.title);
        let isNearDup = false;
        for (const prev of seen) {
            if (jaccardWordSets(words, prev.words) >= minJaccard && publicationYearsCompatible(article, prev.article)) {
                isNearDup = true;
                break;
            }
        }
        if (!isNearDup) {
            kept.push(article);
            seen.push({ words, article });
        }
    }
    return kept;
}

/**
 * Canonical deduplication key: DOI (normalized) > uid > title (normalized).
 * Normalizing removes punctuation differences that cause the same paper to
 * appear as two distinct entries across sources.
 */
function dedupeKey(article) {
    const doiNorm = normalizeDoi(article.doi);
    if (doiNorm) {
        return 'doi:' + doiNorm;
    }
    const uid = String(article.uid || '');
    const pmidNorm = normalizePmid(article.pmid || (/^pmid[:\-_]/i.test(uid) ? uid : null));
    if (pmidNorm) {
        return 'pmid:' + pmidNorm;
    }
    if (article.title) {
        const norm = article.title
            .toLowerCase()
            .replace(/\b(a|an|the)\b/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
        const year = parseArticleYear(article);
        if (norm && norm.length >= 20) return `title:${norm}|year:${year || 'unknown'}`;
    }
    if (article.uid) {
        return 'uid:' + String(article.uid).toLowerCase().trim();
    }
    return null;
}

function mergeArticleMetadata(primary, incoming) {
    if (!primary) return incoming;
    if (!incoming) return primary;
    const merged = { ...primary };
    for (const field of ['doi', 'pmid', 'pmcid', 'abstract', 'journal', 'source', 'pubdate', 'year']) {
        if (!merged[field] && incoming[field]) merged[field] = incoming[field];
    }
    const sources = new Set([
        ...(Array.isArray(primary._sources) ? primary._sources : [primary._source || primary.source].filter(Boolean)),
        ...(Array.isArray(incoming._sources) ? incoming._sources : [incoming._source || incoming.source].filter(Boolean)),
    ]);
    if (sources.size > 0) merged._sources = [...sources];
    const primaryAuthors = Array.isArray(primary.authors) ? primary.authors : [];
    const incomingAuthors = Array.isArray(incoming.authors) ? incoming.authors : [];
    if (primaryAuthors.length === 0 && incomingAuthors.length > 0) merged.authors = incomingAuthors;
    if ((incoming.pmcrefcount || 0) > (merged.pmcrefcount || 0)) merged.pmcrefcount = incoming.pmcrefcount;
    return merged;
}

/**
 * Reciprocal Rank Fusion across per-source ranked lists with integrated EBM boost.
 * RRF(d) = Σ 1/(k + rank_i(d)) over all sources i that contain d.
 * k=60 is the standard constant from Cormack et al. 2009.
 *
 * EBM contributes a fractional bonus (max 5% of a first-position score) so it
 * acts as a tiebreaker within RRF tiers without overriding cross-tier ordering.
 */
function applyRRF(perSourceLists, k = 60, listWeights = [], queryAliases = []) {
    const scores = new Map(); // dedupeKey → { rrfScore, article }
    const MAX_FIRST_SCORE = 1 / (k + 1); // ≈ 0.0164
    // Evidence quality is a first-class fusion signal, not just a tiebreaker: RRF's
    // sum-over-sources design otherwise lets a mediocre paper that appears in both
    // PubMed and OpenAlex outrank a landmark RCT/meta that a single source ranked #1.
    // At 2× a first-place score, a top-EBM paper (RCT/SR/MA) can overcome the
    // dual-source rank accumulation of a low-EBM paper.
    const EBM_WEIGHT = MAX_FIRST_SCORE * 2.0;
    // A title/abstract match on a high-signal trial alias (e.g. "ARISTOTLE", "DAPA-HF")
    // is a near-certain identification of THE landmark trial for the query. Without this,
    // RRF buries a PubMed-only rank-1 landmark under mediocre papers that happen to appear
    // in both sources (dual-source rank accumulation). Worth ~3 first-place ranks.
    const ALIAS_WEIGHT = MAX_FIRST_SCORE * 3;

    const TIER1_JOURNALS = ['nejm', 'n engl j med', 'lancet', 'jama', 'bmj', 'nature', 'science', 'annals of internal medicine'];

    for (let i = 0; i < perSourceLists.length; i++) {
        const list = perSourceLists[i];
        const weight = listWeights[i] || 1;
        list.forEach((article, idx) => {
            const key = dedupeKey(article);
            if (!key) return;
            
            let rrfContrib = weight / (k + idx + 1);
            const journal = (article.journal || article.source || '').toLowerCase();
            if (TIER1_JOURNALS.some(t => journal.includes(t))) {
                rrfContrib *= 1.15; // 15% boost to the rank contribution for prestige
            }

            const entry = scores.get(key);
            if (entry) {
                entry.rrfScore += rrfContrib;
                entry.article = mergeArticleMetadata(entry.article, article);
            } else {
                scores.set(key, { rrfScore: rrfContrib, article });
            }
        });
    }

    return [...scores.values()]
        .map((e) => ({ ...e, aliasBonus: queryAliasMatchScore(e.article, queryAliases) * ALIAS_WEIGHT }))
        .sort((a, b) => {
            const ebmA = getEbmScore(a.article);
            const ebmB = getEbmScore(b.article);
            const scoreA = a.rrfScore + (ebmA / 7) * EBM_WEIGHT + a.aliasBonus;
            const scoreB = b.rrfScore + (ebmB / 7) * EBM_WEIGHT + b.aliasBonus;
            return scoreB - scoreA;
        })
        .map((e) => e.article);
}

/**
 * Merge, deduplicate, and rank results from multiple per-source lists.
 * Accepts an optional vectorList for semantic fusion via RRF.
 */
function mergeAndRank(perSourceLists, listWeights, queryAliases = []) {
    const ranked = applyRRF(perSourceLists, 60, listWeights, queryAliases);
    return ranked.map((article) => ({
        ...article,
        _ebmScore: getEbmScore(article),
        _isPreprint: isPreprint(article),
    }));
}

/** Map an OpenAlex work to our Article shape incl. citation-influence signals for ranking. */
function articleFromOpenAlexWork(w) {
    const cn = w.citation_normalized_percentile;
    const src = w.primary_location?.source;
    const fwci = typeof w.fwci === 'number' && Number.isFinite(w.fwci) ? w.fwci : null;
    const pct = cn && typeof cn.value === 'number' && Number.isFinite(cn.value) ? cn.value : null;

    const abstractInverted = w.abstract_inverted_index;
    let abstractPlain = typeof w.abstract === 'string' ? w.abstract : undefined;
    if (!abstractPlain && abstractInverted && typeof abstractInverted === 'object') {
        const pairs = [];
        for (const [token, positions] of Object.entries(abstractInverted)) {
            if (!Array.isArray(positions)) continue;
            for (const pos of positions) {
                if (typeof pos === 'number') pairs.push({ token, pos });
            }
        }
        pairs.sort((a, b) => a.pos - b.pos);
        abstractPlain = pairs.map((x) => x.token).join(' ');
    }

    return {
        uid: w.id,
        title: w.display_name,
        authors: w.authorships?.map((a) => ({ name: a.author?.display_name })).filter(Boolean),
        pubdate: w.publication_year?.toString(),
        source: src?.display_name || 'OpenAlex',
        pmcrefcount: w.cited_by_count,
        abstract: abstractPlain,
        openAccess: w.open_access?.is_oa,
        openAccessUrl: w.open_access?.oa_url,
        _source: 'openalex',
        _openalexMetrics: {
            fwci,
            citationPercentile: pct,
            isTopCitationPercentile: Boolean(cn?.is_in_top_10_percent),
            sourceIsCore: Boolean(src?.is_core),
            issnL: src?.issn_l ?? null,
        },
    };
}

/**
 * LLM-based query reformulation: converts a natural language query into
 * a structured PubMed Boolean query with MeSH terms and pub type filters.
 * Uses the cheapest available model with a tight 8-second timeout.
 */
function reformulationCacheKey(query, specificity) {
    const pv = getPromptVersion('pubmed_reformulation');
    const hash = crypto
        .createHash('sha1')
        .update(JSON.stringify({ query: String(query || '').trim().toLowerCase(), specificity }))
        .digest('hex')
        .slice(0, 24);
    return `llm:pubmed-reformulation:${hash}:pv:${pv}`;
}

async function reformulateQueryForPubMed(query, specificity, serverConfig, fetchImpl, cache = null, telemetry = null) {
    const { createAiService, PINNED_MODELS } = require('./aiService');
    const keys = serverConfig?.keys || {};
    if (!keys.gemini && !keys.mistral) return null;

    const cacheKey = reformulationCacheKey(query, specificity);
    if (cache && typeof cache.get === 'function') {
        const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
        if (cached) {
            if (telemetry && typeof telemetry === 'object') {
                telemetry.reformulation = { cached: true, ms: 0 };
            }
            return cached;
        }
    }

    const specificityGuide = specificity === 'strict'
        ? 'Focus on exact MeSH terms and add publication type filters like "Randomized Controlled Trial"[pt] or "Systematic Review"[pt]. Prefer high-quality evidence.'
        : specificity === 'broad'
            ? 'Use broad MeSH terms with [MeSH Terms] tag and include related synonyms. Do NOT add publication type filters.'
            : 'Use specific MeSH terms. Add publication type filters only if the query clearly asks about treatment efficacy or diagnosis.';

    const prompt = `Convert this medical research question into an optimized PubMed search query using Boolean operators (AND, OR) and MeSH terms where appropriate.

User query: "${query}"

Search specificity: ${specificity}
${specificityGuide}

Rules:
- Use MeSH terms tagged with [MeSH Terms] for key concepts
- Use Boolean AND between different concepts, OR between synonyms
- Keep the query under 300 characters
- Return ONLY the PubMed query string, nothing else — no explanation, no markdown

Example input: "does metformin help with weight loss in PCOS patients"
Example output: ("Metformin"[MeSH Terms]) AND ("Polycystic Ovary Syndrome"[MeSH Terms]) AND ("Weight Loss"[MeSH Terms] OR "Body Weight"[MeSH Terms])`;

    const ai = createAiService({ serverConfig, fetchImpl });
    const started = Date.now();
    try {
        let raw;
        if (keys.gemini) {
            raw = await ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature: 0.1, maxOutputTokens: 200, signal: AbortSignal.timeout(8000) });
        } else {
            raw = await ai.callMistralAI(prompt, PINNED_MODELS.mistral, { temperature: 0.1, maxOutputTokens: 200, signal: AbortSignal.timeout(8000) });
        }
        const cleaned = String(raw || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
        if (cleaned.length < 5 || cleaned.length > 400) return null;
        if (cache && typeof cache.set === 'function') {
            await Promise.resolve(cache.set(cacheKey, cleaned, 86400)).catch(() => undefined);
        }
        if (telemetry && typeof telemetry === 'object') {
            telemetry.reformulation = { cached: false, ms: Date.now() - started };
        }
        return cleaned;
    } catch {
        if (telemetry && typeof telemetry === 'object') {
            telemetry.reformulation = { cached: false, failed: true, ms: Date.now() - started };
        }
        return null;
    }
}

function picoCacheKey(query) {
    const pv = getPromptVersion('pico_decomposition');
    const hash = crypto
        .createHash('sha1')
        .update(JSON.stringify({ query: String(query || '').trim().toLowerCase() }))
        .digest('hex')
        .slice(0, 24);
    return `llm:pico-decomposition:${hash}:pv:${pv}`;
}

async function decomposePico(query, serverConfig, fetchImpl, cache = null) {
    const { createAiService } = require('./aiService');
    const { resolveProvider } = require('../utils/aiProvider');
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    if (!provider) return null;

    const cacheKey = picoCacheKey(query);
    if (cache && typeof cache.get === 'function') {
        const cached = await Promise.resolve(cache.get(cacheKey)).catch(() => null);
        if (cached) return cached;
    }

    const prompt = `Extract the PICO components from this medical query.

Query: "${query}"

Return ONLY valid JSON with this exact shape:
{
  "population": "extracted population terms",
  "intervention": "extracted intervention or exposure",
  "comparison": "extracted comparison or control",
  "outcome": "extracted outcome",
  "confidence": 0.0-1.0
}

If a component is unclear or absent, set it to an empty string. Do not include any explanation outside the JSON.`;

    const ai = createAiService({ serverConfig, fetchImpl });
    try {
        const parsed = await ai.callStructured(prompt, provider, model, { temperature: 0.0, maxOutputTokens: 300, timeoutMs: 4000 });
        if (parsed && typeof parsed === 'object' && parsed.confidence != null) {
            if (cache && typeof cache.set === 'function') {
                await Promise.resolve(cache.set(cacheKey, parsed, 86400)).catch(() => undefined);
            }
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

const SPECIFICITY_PUB_TYPE_FILTERS = {
    strict: ['Randomized Controlled Trial', 'Systematic Review', 'Meta-Analysis', 'Practice Guideline', 'Clinical Trial'],
    moderate: [],
    broad: [],
};

function publicationTypeClause(label) {
    const text = String(label || '').trim();
    if (!text) return null;
    if (text.includes('[')) return text;
    return `"${text}"[Publication Type]`;
}

function appendPubMedPublicationFilters(pubmedQuery, specificity, parsedStudyTypes = [], parsedYearFilters = []) {
    const clauses = [String(pubmedQuery || '').trim()].filter(Boolean);
    const typeFilters = [
        ...(SPECIFICITY_PUB_TYPE_FILTERS[specificity] || []),
        ...(Array.isArray(parsedStudyTypes) ? parsedStudyTypes : []),
    ]
        .map(publicationTypeClause)
        .filter(Boolean);

    if (typeFilters.length > 0) {
        clauses.push(`(${typeFilters.join(' OR ')})`);
    }
    const yearFilters = (Array.isArray(parsedYearFilters) ? parsedYearFilters : [])
        .map((filter) => String(filter || '').trim())
        .filter((filter) => /^\d{4}:\d{4}\[PDAT\]$/i.test(filter));
    clauses.push(...yearFilters);
    if (specificity === 'strict') {
        clauses.push('(english[lang])');
        clauses.push('(humans[MeSH Terms])');
    }
    return clauses.join(' AND ');
}

/**
 * @param {object} opts
 * @param {string} opts.query
 * @param {number} opts.safeLimit
 * @param {string[]} opts.sourceList
 * @param {import('../../config').serverConfig} opts.serverConfig
 * @param {Function} opts.fetch
 * @param {object} [opts.telemetry] — optional; when PubMed returns zero hits, may set `lowRecallLearning`
 * @param {string} [opts.specificity] — 'broad' | 'moderate' | 'strict'
 * @param {string[]} [opts.parsedStudyTypes] — optional PubMed publication-type clauses inferred server-side
 * @param {string[]} [opts.parsedYearFilters] — optional PubMed year filters such as 2020:2024[PDAT]
 * @returns {Promise<object[]>}
 */
async function fetchUnifiedEvidence({ query, safeLimit, sourceList, serverConfig, fetch: f, cache = null, vectorList = [], telemetry = null, specificity = 'moderate', parsedStudyTypes = [], parsedYearFilters = [] }) {
    const proxy = buildProxyService({ serverConfig, fetchImpl: f, cache, telemetry });
    const overallStart = Date.now();

    // Phase 0: LLM query reformulation — converts natural language into a structured
    // PubMed Boolean query with MeSH terms. Runs in parallel with MeSH lookup.
    // Only fires for conversational queries (>4 words, contains question-like patterns).
    // Skip reformulation if query already contains medical terminology to preserve precision.
    const hasMedicalTerms = /\b(syndrome|disease|treatment|therapy|diagnosis|cardiac|pulmonary|renal|diabetes|hypertension|infection|cancer|trial|study|efficacy|management|pathophysiology)\b/i.test(query);
    const isNaturalLanguageQuery = !hasMedicalTerms && 
        process.env.NODE_ENV !== 'test' && (
        query.split(/\s+/).length > 4 ||
        /\b(does|how|what|why|which|can|is|are|should)\b/i.test(query)
    );
    const llmReformulationPromise = (isNaturalLanguageQuery && sourceList.includes('pubmed'))
        ? reformulateQueryForPubMed(query, specificity, serverConfig, f, cache, telemetry).catch(() => null)
        : Promise.resolve(null);

    // Phase 1: MeSH canonical-term lookup (~100–300 ms).
    // Fires before source searches so PubMed can use the augmented query.
    // Only keeps terms that genuinely expand the query (not substring matches).
    let meshExpansions = [];
    if (sourceList.includes('pubmed')) {
        try {
            const meshStarted = Date.now();
            const suggestions = await proxy.meshSuggest(query, { limit: 4 });
            if (telemetry && typeof telemetry === 'object') {
                telemetry.meshLookupMs = Date.now() - meshStarted;
            }
            const qLow = query.toLowerCase();
            meshExpansions = suggestions
                .map((d) => String(d.label || '').trim())
                .filter((label) => {
                    if (!label) return false;
                    const labelLow = label.toLowerCase();
                    return labelLow !== qLow;
                })
                .slice(0, 2);
        } catch (meshErr) {
            console.warn('[unifiedEvidence] MeSH proactive lookup skipped:', meshErr.message);
        }
    }

    // Wait for LLM reformulation (runs in parallel with MeSH)
    const reformulatedQuery = await llmReformulationPromise;

    const clinicalAliases = clinicalQueryAliases(query);
    const pinnedPmids = clinicalQueryPinnedPmids(query);
    const pubmedQueryBase = reformulatedQuery || query;
    let pubmedQuery = buildPubMedSearchQuery(pubmedQueryBase, reformulatedQuery ? [] : meshExpansions, clinicalAliases);

    pubmedQuery = appendPubMedPublicationFilters(pubmedQuery, specificity, parsedStudyTypes, parsedYearFilters);

    if (telemetry && typeof telemetry === 'object') {
        telemetry.meshExpansions = meshExpansions;
        telemetry.clinicalAliases = clinicalAliases;
        telemetry.pubmedQuery = pubmedQuery;
        telemetry.usedReformulatedQuery = Boolean(reformulatedQuery);
    }

    // Phase 2: Build per-source fetch promises and run them all in parallel.
    const sourceFetches = [];

    if (sourceList.includes('pubmed')) {
        // The broadened query (base OR MeSH OR aliases) maximises recall, but on already
        // specific queries the OR-expansion ranks the precise landmark far down — sometimes
        // past the fetch limit. Also run the un-expanded base query so an exact match (e.g.
        // a trial whose abstract lacks its acronym) is always a candidate, and merge it in
        // first so PubMed's precise rank-1 result leads the fused list.
        const preciseQuery = appendPubMedPublicationFilters(pubmedQueryBase, specificity, parsedStudyTypes, parsedYearFilters);
        sourceFetches.push((async () => {
            try {
                const [broad, precise, pinned] = await Promise.all([
                    proxy.pubmedSearch(pubmedQuery, { maxResults: safeLimit }),
                    preciseQuery !== pubmedQuery
                        ? proxy.pubmedSearch(preciseQuery, { maxResults: Math.ceil(safeLimit / 2) }).catch(() => [])
                        : Promise.resolve([]),
                    pinnedPmids.length && typeof proxy.pubmedFetchByIds === 'function'
                        ? proxy.pubmedFetchByIds(pinnedPmids).catch(() => [])
                        : Promise.resolve([]),
                ]);
                const seen = new Set();
                const merged = [];
                // Pinned landmark trials go first — guaranteed inclusion regardless of
                // esearch relevance ranking (see clinicalQueryPinnedPmids).
                for (const a of [...pinned, ...precise, ...broad]) {
                    const dk = dedupeKey(a);
                    if (dk && seen.has(dk)) continue;
                    if (dk) seen.add(dk);
                    merged.push(a);
                }
                if (merged.length === 0 && telemetry && typeof telemetry === 'object') {
                    telemetry.lowRecallLearning = {
                        query,
                        resultCount: 0,
                        aliasCount: meshExpansions.length,
                        expandedAliases: meshExpansions,
                    };
                }
                return merged;
            } catch (err) {
                console.warn('[unifiedEvidence] PubMed failed', err.message);
                return [];
            }
        })());
    }

    if (sourceList.includes('semantic') || sourceList.includes('semantic-scholar')) {
        sourceFetches.push((async () => {
            try {
                return await proxy.semanticScholarSearch(query, { limit: safeLimit });
            } catch (err) {
                console.warn('[unifiedEvidence] Semantic Scholar failed', err.message);
                return [];
            }
        })());
    }

    if (sourceList.includes('openalex')) {
        sourceFetches.push((async () => {
            try {
                const works = await proxy.openAlexSearch(query, { limit: safeLimit });
                return works.map(articleFromOpenAlexWork);
            } catch (err) {
                console.warn('[unifiedEvidence] OpenAlex failed', err.message);
                return [];
            }
        })());
    }

    const sourceResults = await Promise.all(sourceFetches);
    if (telemetry && typeof telemetry === 'object') {
        telemetry.unifiedFetchMs = Date.now() - overallStart;
    }
    const perSourceLists = sourceResults.filter((list) => list.length > 0);

    // Optional vector fusion
    if (vectorList.length > 0) {
        perSourceLists.push(vectorList);
    }

    if (perSourceLists.length === 0) return [];
    // Give vector results a 1.25× weight so semantic signals aren't drowned out by multiple keyword sources
    const listWeights = vectorList.length > 0
        ? Array(perSourceLists.length - 1).fill(1).concat(1.25)
        : undefined;
    const ranked = mergeAndRank(perSourceLists, listWeights, clinicalAliases);
    return collapseNearDuplicateTitles(ranked);
}

module.exports = {
    articleFromOpenAlexWork,
    fetchUnifiedEvidence,
    mergeAndRank,
    getEbmScore,
    isPreprint,
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizePmid,
    normalizeDoi,
    clinicalQueryAliases,
    clinicalQueryPinnedPmids,
    buildPubMedSearchQuery,
    appendPubMedPublicationFilters,
    publicationTypeClause,
    SPECIFICITY_PUB_TYPE_FILTERS,
    decomposePico,
};
