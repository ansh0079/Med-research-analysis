// ==========================================
// Evidence Bouquet 2.0
// Multi-factor ranking with archetype-aware selection
// ==========================================

const CURRENT_YEAR = new Date().getFullYear();

const GRADE_ORDER = { A: 4, B: 3, C: 2, D: 1 };

const LANDMARK_CITATION_THRESHOLD = 300;
const RECENT_YEARS = 3;

// Terms that indicate preclinical / basic science work
const PRECLINICAL_PATTERNS = /\b(in vitro|in vivo|mouse model|murine|rat model|cell line|knockout|knock-out|transgenic|zebrafish|drosophila|animal model|cell culture|cell culture|xenograft|organoid|ex vivo|recombinant protein|western blot|pcr|rna-seq|gene expression|mrna|sirna|crispr|plasmid|transfection|cytokine storm)\b/i;

// Terms that indicate clinical work (patient-facing)
const CLINICAL_PATTERNS = /\b(patients?|clinical trial|randomized|randomised|cohort|outcomes?|treatment|therapy|diagnosis|prognosis|survival|mortality|morbidity|hospitali[sz]ation|emergency|ward|clinic|physician|nurse|hospital|disease management|quality of life|symptom|comorbid)\b/i;

// Terms that suggest the user wants mechanistic / basic science info
const MECHANISM_QUERY_PATTERNS = /\b(mechanism|pathophysiology|pathogenesis|molecular|gene|protein|receptor|signaling|signalling|pathway|mutation|variant|expression|biomarker discovery)\b/i;

// Terms that indicate a basic science paper has clear clinical translation / implications,
// or has been cited in guidelines / clinical recommendations
const CLINICAL_TRANSLATION_PATTERNS = /\b(clinical(ly)?( relevant| significance| implication| application| translation)?|therapeutic target|translational|treatment implication|may inform|clinical relevance|clinical significance|clinical practice|implications? for (treatment|therapy|clinical|management)|drug target|therapeutic potential|clinical application|clinical utility|clinical impact|in (patients?|humans?)|human (subjects?|disease|trials?)|has implications|future (clinical|therapeutic)|pathway to clinic|novel therapeutic|phase [i1]+ (trial|study)|first-in-human|cited in (guidelines?|recommendations?)|incorporated into (guidelines?|practice|recommendations?)|basis for (guidelines?|recommendations?|current (treatment|therapy|practice))|underpins|underpin(ned|s) (current|clinical|guideline))\b/i;

// =============================================================================
// Journal quality signals
// =============================================================================

// Tier 1 — flagship general medical journals (+18 pts)
const TIER1_JOURNALS = new Set([
    'new england journal of medicine', 'nejm', 'n engl j med',
    'the lancet', 'lancet',
    'jama', 'journal of the american medical association',
    'bmj', 'british medical journal',
    'annals of internal medicine',
    'nature medicine',
    'nature',
    'science',
    'plos medicine',
    'the bmj',
]);

// Tier 2 — high-impact specialty journals (+12 pts)
const TIER2_JOURNALS = new Set([
    'circulation', 'journal of the american college of cardiology', 'jacc',
    'european heart journal', 'heart',
    'journal of clinical oncology', 'cancer', 'lancet oncology',
    'gut', 'gastroenterology', 'hepatology',
    'american journal of respiratory and critical care medicine',
    'chest', 'thorax', 'lancet respiratory medicine',
    'diabetes care', 'diabetologia', 'lancet diabetes endocrinology',
    'lancet diabetes & endocrinology',
    'blood', 'haematologica', 'journal of hematology oncology',
    'neurology', 'brain', 'lancet neurology', 'jama neurology',
    'kidney international', 'journal of the american society of nephrology',
    'clinical infectious diseases', 'journal of infectious diseases',
    'lancet infectious diseases',
    'annals of surgery', 'annals of oncology',
    'jama internal medicine', 'jama cardiology', 'jama oncology',
    'jama pediatrics', 'jama psychiatry', 'jama dermatology',
    'lancet psychiatry', 'american journal of psychiatry',
    'american journal of medicine',
    'archives of internal medicine',
    'journal of allergy and clinical immunology',
    'arthritis & rheumatology', 'annals of the rheumatic diseases',
    'endocrine reviews', 'journal of clinical endocrinology & metabolism',
]);

// Tier 3 — solid reputable journals (+6 pts)
const TIER3_JOURNALS = new Set([
    'medicine', 'plos one', 'scientific reports',
    'bmc medicine', 'bmj open', 'journal of general internal medicine',
    'american journal of epidemiology', 'epidemiology',
    'journal of hospital medicine', 'academic emergency medicine',
    'critical care medicine', 'intensive care medicine',
    'european journal of cardiology', 'clinical cardiology',
    'journal of hepatology', 'alimentary pharmacology & therapeutics',
    'journal of neurology', 'european journal of neurology',
    'diabetes', 'journal of diabetes', 'metabolism',
    'cancer medicine', 'oncologist', 'supportive care in cancer',
    'pediatrics', 'archives of disease in childhood',
    'obstetrics & gynecology', 'american journal of obstetrics and gynecology',
    'journal of urology', 'european urology',
    'dermatology', 'journal of the american academy of dermatology',
    'rheumatology', 'clinical rheumatology',
    'journal of pain', 'pain',
    'age and ageing', 'journal of the american geriatrics society',
    'stroke', 'cerebrovascular diseases',
    'world journal of gastroenterology',
]);

// Known predatory publishers / journals — exclude entirely
const PREDATORY_PATTERNS = /\b(omics (international|group|publishing)|hikari|science publishing group|scirp|scientific research publishing|iomcworld|medcrave|crimson publishers|openventio|lupine publishers|austin publishing|jscimedcentral|remedy publications|symbiosis online|longdom|peertechz|annex publishers|gavin publishers|sryahwa|innovationinfo|auctores|herdin|scholar's press|lambert academic|lap lambert|altasciences|global journals inc|international journal of innovative research|ijir|ijser|international journal of scientific.*engineering.*research|world academy of science.*engineering.*technology|waset)\b/i;

function getJournalName(article) {
    const raw = article.journal || article.source || article.journalName || '';
    return String(raw).toLowerCase().trim();
}

function getJournalBonus(article) {
    const name = getJournalName(article);
    if (!name || name === 'semantic scholar' || name === 'pubmed') return 0;
    if (TIER1_JOURNALS.has(name)) return 18;
    // Partial match for tier 1 (e.g. "The New England Journal of Medicine")
    for (const j of TIER1_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 18;
    }
    if (TIER2_JOURNALS.has(name)) return 12;
    for (const j of TIER2_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 12;
    }
    if (TIER3_JOURNALS.has(name)) return 6;
    for (const j of TIER3_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 6;
    }
    return 0;
}

function isPredatoryJournal(article) {
    const name = getJournalName(article);
    if (!name) return false;
    return PREDATORY_PATTERNS.test(name);
}

// Archetype classifiers
const ARCHETYPE_PATTERNS = {
    definition: /\b(definition|classifications?|criteria|diagnostic criteria|consensus|nomenclature|terminology)\b/i,
    management_trial: /\b(management|treatment|therapy|intervention|therapeutic|efficacy|effectiveness|outcomes?)\b/i,
    mechanism: /\b(mechanism|pathophysiology|pathogenesis|molecular|cellular|biomarker|genetics?)\b/i,
};

function isGuideline(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('guideline') || p.includes('consensus') || p.includes('practice guideline'))) return true;
    const title = String(article.title || '').toLowerCase();
    return /\bguidelines?\b|\bconsensus\b|\brecommendations?\b/.test(title);
}

function isReview(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('review') || p.includes('meta-analysis') || p.includes('systematic review'))) return true;
    const ebm = article._ebmScore ?? 0;
    return ebm >= 7; // systematic review / meta-analysis threshold
}

function isRCT(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('randomized') || p.includes('controlled trial') || p.includes('clinical trial'))) return true;
    const ebm = article._ebmScore ?? 0;
    return ebm === 5; // RCT threshold
}

function isCohort(article) {
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());
    if (pubtypes.some((p) => p.includes('cohort') || p.includes('observational'))) return true;
    const ebm = article._ebmScore ?? 0;
    return ebm === 4;
}

function getCitationCount(article) {
    return article.citationCount ?? article.pmcrefcount ?? article._impact?.citations ?? 0;
}

// True only when the article carries a real citation count from a source that
// provides one (OpenAlex, Semantic Scholar). PubMed results have none, so a
// missing value means "unknown", not "zero" — callers must not treat a 0 from
// getCitationCount as evidence the paper is uncited.
// Only the raw source fields count: _impact.citations is DERIVED (computeImpactScore
// coerces missing counts to 0), so trusting it would re-fabricate a fake "0 citations"
// for PubMed articles after sanitization.
function hasCitationData(article) {
    return [article?.citationCount, article?.pmcrefcount]
        .some((v) => typeof v === 'number' && Number.isFinite(v));
}

function getYear(article) {
    return article.year ?? (article.pubdate ? parseInt(article.pubdate.slice(0, 4), 10) : null) ?? 0;
}

function classifyArchetype(article) {
    const title = String(article.title || '');
    const abstract = String(article.abstract || '');
    const text = `${title} ${abstract}`;
    const citations = getCitationCount(article);
    const year = getYear(article);
    const age = CURRENT_YEAR - year;

    if (isGuideline(article)) return 'guideline';
    if (isReview(article)) {
        if (ARCHETYPE_PATTERNS.definition.test(text)) return 'definition';
        if (age <= RECENT_YEARS) return 'recent_review';
        return 'review';
    }
    if (isRCT(article)) {
        if (citations >= LANDMARK_CITATION_THRESHOLD && age >= 3) return 'landmark_rct';
        if (ARCHETYPE_PATTERNS.management_trial.test(text)) return 'management_trial';
        return 'rct';
    }
    if (ARCHETYPE_PATTERNS.mechanism.test(text)) {
        if (citations >= LANDMARK_CITATION_THRESHOLD && getJournalBonus(article) >= 12) return 'landmark_basic_science';
        return 'mechanism';
    }
    if (isCohort(article)) return 'cohort';
    return 'other';
}

function computeCompositeScore(article) {
    let score = 0;

    // 1. EBM score (0-7) → up to 35 points (increased weight — evidence pyramid is primary signal)
    const ebm = article._ebmScore ?? 0;
    score += (ebm / 7) * 35;

    // 2. Quality grade → up to 20 points
    const grade = GRADE_ORDER[(article._quality?.grade)] ?? 0;
    score += (grade / 4) * 20;

    // 3. Impact / citations → up to 25 points (log-scaled) — ranked above recency
    const citations = getCitationCount(article);
    score += Math.min(25, Math.log10(Math.max(1, citations)) * 5);

    // 4. Recency → up to 10 points, but only if paper has ≥5 citations
    //    (prevents uncited recent papers floating above validated work)
    const year = getYear(article);
    const age = Math.max(0, CURRENT_YEAR - year);
    const recencyScore = citations >= 5
        ? (age <= 1 ? 10 : age <= 3 ? 7 : age <= 5 ? 4 : age <= 10 ? 2 : 0)
        : 0;
    score += recencyScore;

    // 4b. Recency × citations synergy → up to 5 points
    const recencyCitationScore = (recencyScore > 0 && citations > 0)
        ? Math.min(5, (Math.log10(citations + 1) * recencyScore) / 10)
        : 0;
    score += recencyCitationScore;

    // 5. Guideline bonus → up to 10 points
    if (isGuideline(article)) score += 10;

    // 6. Open access → 5 points
    if (article.isFree || article.pmcid) score += 5;

    // 7. Landmark bonus → up to 15 points.
    //    Citation data is frequently missing for PubMed results, so a citation-gated
    //    bonus silently denies real landmark trials (which have huge real citation
    //    counts PubMed just doesn't report) the recognition it gives mediocre recent
    //    papers that happen to carry an OpenAlex citation count. Also treat a top-tier
    //    evidence study (RCT/SR/MA) in a flagship journal as a landmark candidate.
    const flagshipEvidence = (article._ebmScore ?? 0) >= 6 && getJournalBonus(article) >= 12;
    if (citations >= LANDMARK_CITATION_THRESHOLD || flagshipEvidence) score += 15;

    // 8. Journal prestige bonus (tiered whitelist: +6 / +12 / +18)
    score += getJournalBonus(article);

    // 9. Core journal bonus (from OpenAlex — catches journals not in our whitelist)
    if (article._openalexMetrics?.sourceIsCore) score += 5;

    // 10. Top citation percentile bonus
    if (article._openalexMetrics?.isTopCitationPercentile) score += 5;

    // Clinical signal bonus — reward patient-facing research
    const fullText = `${String(article.title || '')} ${String(article.abstract || '')}`;
    if (CLINICAL_PATTERNS.test(fullText)) score += 8;

    // Penalties
    if (article._isPreprint) score -= 15;
    if (article._retraction?.isRetracted) score = 0; // Will be filtered anyway
    // Penalise basic science archetype — deprioritise vs clinical evidence
    // Groundbreaking basic science (landmark-cited, top-tier journal, clinical translation) is exempt
    const archetype = classifyArchetype(article);
    if (archetype === 'mechanism') score -= 10;

    return Math.max(0, score);
}

function isPreclinical(article) {
    const title = String(article.title || '');
    const abstract = String(article.abstract || '');
    const text = `${title} ${abstract}`;
    const pubtypes = (article.pubtype || []).map((p) => String(p).toLowerCase());

    // Explicit pub type signals
    if (pubtypes.some((p) => p.includes('in vitro') || p.includes('animal') || p.includes('laboratory'))) return true;

    // Strong preclinical signal in title alone (most reliable)
    if (PRECLINICAL_PATTERNS.test(title)) return true;

    // Preclinical in abstract AND no clinical signal anywhere
    if (PRECLINICAL_PATTERNS.test(abstract) && !CLINICAL_PATTERNS.test(text)) return true;

    return false;
}

// A preclinical paper qualifies as "groundbreaking basic science" — and is allowed through
// the clinical filter — only if it is landmark-cited (≥300), published in a Tier 1 or Tier 2
// journal, and its abstract explicitly signals clinical translation or therapeutic relevance.
// This is a tight proxy for "cited by clinical trials / guidelines on the topic."
function isGroundbreakingBasicScience(article) {
    if (!isPreclinical(article)) return false;
    if (getCitationCount(article) < LANDMARK_CITATION_THRESHOLD) return false;
    if (getJournalBonus(article) < 12) return false; // Tier 1 or Tier 2 only
    const abstract = String(article.abstract || '');
    const title = String(article.title || '');
    return CLINICAL_TRANSLATION_PATTERNS.test(abstract) || CLINICAL_TRANSLATION_PATTERNS.test(title);
}

function matchesPopulationFilter(article, query) {
    const q = String(query || '').toLowerCase();
    const text = `${String(article.title || '')} ${String(article.abstract || '')}`.toLowerCase();

    // If query explicitly mentions pediatric/children
    if (/\b(pediatric|children?|infant|neonate|adolescent)\b/.test(q)) {
        // Penalize if article is clearly adult-only
        if (/\b(adults?|elderly|geriatric|aged)\b/.test(text) && !/\b(pediatric|children?|infant|adolescent)\b/.test(text)) {
            return false;
        }
    }
    // If query explicitly mentions adult
    if (/\b(adults?|elderly|geriatric)\b/.test(q)) {
        // Penalize if article is clearly pediatric-only
        if (/\b(pediatric|children?|infant|neonate|adolescent)\b/.test(text) && !/\b(adults?|elderly|geriatric|aged)\b/.test(text)) {
            return false;
        }
    }
    return true;
}

// Strip common suffixes to get a root form for fuzzy matching
function stemTerm(t) {
    return t
        .replace(/ations?$/, '')
        .replace(/tions?$/, '')
        .replace(/ings?$/, '')
        .replace(/ments?$/, '')
        .replace(/ities$/, 'ity')
        .replace(/ies$/, 'y')
        .replace(/es$/, '')
        .replace(/s$/, '');
}

const STOPWORDS = new Set([
    'with', 'from', 'this', 'that', 'they', 'were', 'been', 'have', 'will',
    'which', 'their', 'more', 'than', 'also', 'after', 'other', 'some', 'when',
    'what', 'each', 'most', 'such', 'into', 'over', 'both', 'very', 'using',
    'used', 'among', 'based', 'associated', 'study', 'trial', 'patients',
    'analysis', 'results', 'effect', 'effects', 'review',
]);

function meshRelevanceRatio(searchText, queryMeshTerms = []) {
    const terms = (Array.isArray(queryMeshTerms) ? queryMeshTerms : [])
        .map((t) => String(t || '').toLowerCase().trim())
        .filter((t) => t.length > 2);
    if (terms.length === 0) return 0;
    const matchCount = terms.filter((term) => {
        if (searchText.includes(term)) return true;
        const stem = stemTerm(term);
        return stem.length > 2 && searchText.includes(stem);
    }).length;
    return matchCount / terms.length;
}

function queryMatchScore(article, query) {
    const q = String(query || '').toLowerCase();
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const searchText = `${title} ${abstract}`;
    const queryTerms = q.split(/\s+/).filter((t) => t.length > 3 && !STOPWORDS.has(t));
    if (queryTerms.length === 0) return 0;
    const weighted = queryTerms.reduce((sum, term) => {
        const stem = stemTerm(term);
        const inTitle = title.includes(term) || (stem.length > 3 && title.includes(stem));
        const inText = searchText.includes(term) || (stem.length > 3 && searchText.includes(stem));
        if (inTitle) return sum + 1.5;
        if (inText) return sum + 1;
        return sum;
    }, 0);
    return Math.min(1, weighted / queryTerms.length);
}

function normalizeAliasText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isHighSignalAlias(alias) {
    const raw = String(alias || '').trim();
    if (!raw) return false;
    return /[0-9*]/.test(raw) || /-/.test(raw) || /^[A-Z]{3,}$/.test(raw.replace(/[^A-Z]/g, ''));
}

function queryAliasMatchScore(article, aliases = []) {
    const highSignalAliases = (Array.isArray(aliases) ? aliases : []).filter(isHighSignalAlias);
    if (highSignalAliases.length === 0) return 0;
    const authors = Array.isArray(article?.authors)
        ? article.authors.map((a) => typeof a === 'string' ? a : a?.name).filter(Boolean).join(' ')
        : '';
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const authorText = authors.toLowerCase();
    const normalizedTitle = normalizeAliasText(article?.title);
    const normalizedText = normalizeAliasText(`${article?.title || ''} ${article?.abstract || ''} ${authors}`);
    let best = 0;
    for (const alias of highSignalAliases) {
        const raw = String(alias || '').toLowerCase();
        const norm = normalizeAliasText(alias);
        if (!norm) continue;
        if (title.includes(raw) || normalizedTitle.includes(norm)) best = Math.max(best, 1);
        else if (abstract.includes(raw) || authorText.includes(raw) || normalizedText.includes(norm)) best = Math.max(best, 0.8);
    }
    return best;
}

function isOffTopic(article, query, options = {}) {
    const q = String(query || '').toLowerCase();
    const queryMeshTerms = Array.isArray(options.queryMeshTerms) ? options.queryMeshTerms : [];

    // Check title AND abstract — many relevant papers bury key terms in the abstract
    const title = String(article.title || '').toLowerCase();
    const abstract = String(article.abstract || '').toLowerCase();
    const searchText = `${title} ${abstract}`;

    const queryTerms = q.split(/\s+/).filter((t) => t.length > 3 && !STOPWORDS.has(t));
    if (queryTerms.length === 0) return false;

    const matchCount = queryTerms.filter((t) => {
        if (searchText.includes(t)) return true;
        const stem = stemTerm(t);
        return stem.length > 3 && searchText.includes(stem);
    }).length;

    const matchRatio = matchCount / queryTerms.length;
    const meshRatio = meshRelevanceRatio(searchText, queryMeshTerms);

    // Scale threshold by number of key terms:
    //   1–2 concepts → need 75 % (both must appear — rounding means 2/2 required for a 2-term query)
    //   3–5 concepts → need 50 % (at least half)
    //   6+  concepts → need 35 % (long free-text queries allow more synonym drift)
    let threshold;
    if (queryTerms.length <= 2) threshold = 0.75;
    else if (queryTerms.length <= 5) threshold = 0.5;
    else threshold = 0.35;

    if (queryMeshTerms.length > 0) {
        const blended = (matchRatio * 0.6) + (meshRatio * 0.4);
        if (meshRatio >= 0.34 && matchRatio >= 0.2) return false;
        return blended < threshold;
    }

    return matchRatio < threshold;
}

function mapStudyTypesToArchetypes(studyTypes = []) {
    const out = new Set();
    for (const st of studyTypes) {
        const s = String(st).toLowerCase();
        if (s.includes('randomized controlled trial')) {
            out.add('landmark_rct');
            out.add('management_trial');
            out.add('rct');
        }
        if (s.includes('systematic review') || s.includes('meta-analysis')) {
            out.add('recent_review');
            out.add('review');
        }
        if (s.includes('clinical trial')) {
            out.add('management_trial');
            out.add('rct');
        }
        if (s.includes('practice guideline') || s.includes('guideline')) {
            out.add('guideline');
        }
        if (s.includes('cohort')) {
            out.add('cohort');
        }
        if (s.includes('case report')) {
            out.add('other');
        }
        if (s.includes('cross-sectional')) {
            out.add('other');
        }
    }
    return [...out];
}

function scorePicoRelevance(article, pico) {
    if (!pico || pico.confidence < 0.3) return 0;
    const text = `${String(article.title || '')} ${String(article.abstract || '')}`.toLowerCase();
    const pop = String(pico.population || '').toLowerCase().trim();
    const int = String(pico.intervention || '').toLowerCase().trim();
    const comp = String(pico.comparison || pico.comparator || '').toLowerCase().trim();
    const out = String(pico.outcome || '').toLowerCase().trim();
    let matches = 0;
    if (pop && text.includes(pop)) matches += 1;
    if (int && text.includes(int)) matches += 1;
    if (comp && text.includes(comp)) matches += 1;
    if (out && text.includes(out)) matches += 1;
    // Boost if both population and intervention match (the core P+I of PICO)
    if (pop && int && text.includes(pop) && text.includes(int)) return 3;
    return matches >= 2 ? 2 : matches * 0.5;
}

function buildEvidenceBouquet(articles, query, options = {}) {
    const count = Math.min(Math.max(parseInt(String(options.count || 5), 10) || 5, 1), 50);
    const previousQueries = Array.isArray(options.previousQueries) ? options.previousQueries : [];
    const signalBoosts = options.articleSignalBoosts instanceof Map
        ? options.articleSignalBoosts
        : (typeof options.articleSignalBoosts === 'object' && options.articleSignalBoosts !== null
            ? new Map(Object.entries(options.articleSignalBoosts))
            : new Map());

    // 1. Filter
    const queryWantsMechanisms = MECHANISM_QUERY_PATTERNS.test(String(query || ''));
    const filtered = articles.filter((a) => {
        if (a._retraction?.isRetracted) return false;
        if (!matchesPopulationFilter(a, query)) return false;
        const aliasMatched = queryAliasMatchScore(a, options.queryAliases) > 0;
        if (!aliasMatched && isOffTopic(a, query)) return false;
        // Drop old papers only when we KNOW they are uncited. Missing citation data
        // (e.g. PubMed results, which carry no counts) must not be treated as zero —
        // that silently dropped decades-old landmark trials that retrieval ranked highly.
        const age = CURRENT_YEAR - getYear(a);
        if (hasCitationData(a) && getCitationCount(a) === 0 && age > 2) return false;
        // Drop preclinical/experimental papers unless the query is specifically mechanistic,
        // OR the paper is groundbreaking basic science (landmark-cited, top-tier journal, clinical translation)
        if (!queryWantsMechanisms && isPreclinical(a) && !isGroundbreakingBasicScience(a)) return false;
        // Drop predatory journal papers entirely
        if (isPredatoryJournal(a)) return false;
        return true;
    });

    // 2. Score and classify
    // Trajectory boost: articles whose title/abstract match terms from previous queries
    // get a small composite score bump — they bridge the user's reasoning path.
    const trajectoryTerms = previousQueries.length > 0
        ? [...new Set(previousQueries.flatMap((q) => String(q).toLowerCase().split(/\s+/).filter((t) => t.length > 3)))]
        : [];

    const scored = filtered.map((a) => {
        let score = computeCompositeScore(a);
        const matchScore = queryMatchScore(a, query);
        const aliasMatchScore = queryAliasMatchScore(a, options.queryAliases);
        const specificity = String(options.specificity || 'moderate');
        const matchWeight = specificity === 'strict' ? 14 : specificity === 'broad' ? 3 : 8;
        score += matchScore * matchWeight;
        score += aliasMatchScore * 24;
        // Curated exact-PMID pins (see clinicalQueryPinnedPmids) are a stronger signal
        // than a fuzzy alias/keyword match — they're a verified answer to this exact
        // query pattern, not text overlap. Boost enough to clear typical top-10 cutoffs.
        if (a._pinnedLandmark) score += 30;
        if (trajectoryTerms.length > 0) {
            const text = `${String(a.title || '')} ${String(a.abstract || '')}`.toLowerCase();
            const matchCount = trajectoryTerms.filter((t) => text.includes(t)).length;
            const trajectoryBoost = (matchCount / trajectoryTerms.length) * 5; // up to +5 pts
            score += trajectoryBoost;
        }
        // PICO relevance boost for population + intervention matches
        if (options.pico) {
            score += scorePicoRelevance(a, options.pico);
        }

        // Signal boost from user impressions (dwell / save / click feedback)
        const uid = String(a.uid || '').trim().toLowerCase();
        const pmid = String(a.pmid || '').trim().toLowerCase();
        const doi = String(a.doi || '').trim().toLowerCase();
        let signalWeight = signalBoosts.get(uid) || 0;
        if (!signalWeight && pmid) signalWeight = signalBoosts.get(pmid) || 0;
        if (!signalWeight && doi) {
            const doiClean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
            signalWeight = signalBoosts.get(doiClean) || 0;
        }
        if (signalWeight !== 0) {
            // Scale signal weight into composite score: max ±8 pts
            score += Math.max(-8, Math.min(8, signalWeight * 4));
        }
        return {
            article: a,
            compositeScore: score,
            queryMatchScore: matchScore,
            queryAliasMatchScore: aliasMatchScore,
            archetype: classifyArchetype(a),
            year: getYear(a),
            citations: getCitationCount(a),
        };
    });

    // 3. Sort by composite score
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // 4. Archetype-aware selection: try to cover key archetypes
    const BASE_PRIORITY_ARCHETYPES = ['definition', 'landmark_rct', 'management_trial', 'guideline', 'recent_review', 'landmark_basic_science'];
    // Reorder so user-preferred archetypes are considered first
    const preferred = Array.isArray(options.preferredArchetypes) ? options.preferredArchetypes : [];
    const PRIORITY_ARCHETYPES = [
        ...preferred.filter((p) => BASE_PRIORITY_ARCHETYPES.includes(p)),
        ...BASE_PRIORITY_ARCHETYPES.filter((p) => !preferred.includes(p)),
    ];
    const selected = [];
    const selectedIds = new Set();
    const archetypesCovered = new Set();

    // First pass: pick highest-scoring from each priority archetype
    for (const archetype of PRIORITY_ARCHETYPES) {
        const candidate = scored.find((s) => s.archetype === archetype && !selectedIds.has(s.article.uid));
        if (candidate) {
            selected.push(candidate);
            selectedIds.add(candidate.article.uid);
            archetypesCovered.add(archetype);
        }
    }

    // Second pass: fill remaining slots with highest composite score
    for (const candidate of scored) {
        if (selected.length >= count) break;
        if (selectedIds.has(candidate.article.uid)) continue;
        selected.push(candidate);
        selectedIds.add(candidate.article.uid);
        archetypesCovered.add(candidate.archetype);
    }

    // Re-sort selected by composite score for final ordering
    selected.sort((a, b) => b.compositeScore - a.compositeScore);

    return {
        topPapers: selected.map((s) => s.article),
        ranking: selected.map((s) => ({
            uid: s.article.uid,
            compositeScore: Math.round(s.compositeScore * 10) / 10,
            archetype: s.archetype,
            citations: s.citations,
            year: s.year,
            reasons: buildReasons(s),
        })),
        archetypesCovered: Array.from(archetypesCovered),
        totalScored: scored.length,
        filteredCount: filtered.length,
    };
}

function buildReasons(scored) {
    const reasons = [];
    const a = scored.article;

    if (scored.archetype === 'guideline') reasons.push('Clinical guideline');
    if (scored.archetype === 'landmark_rct') reasons.push('Landmark RCT');
    if (scored.archetype === 'management_trial') reasons.push('Management trial');
    if (scored.archetype === 'definition') reasons.push('Definition or classification');
    if (scored.archetype === 'recent_review') reasons.push('Recent high-quality review');
    if (scored.archetype === 'review') reasons.push('Systematic review or meta-analysis');
    if (scored.archetype === 'mechanism') reasons.push('Mechanism or pathophysiology');
    if (scored.archetype === 'landmark_basic_science') reasons.push('Groundbreaking basic science');

    const citations = getCitationCount(a);
    if (citations >= 1000) reasons.push('Highly cited');
    else if (citations >= 100) reasons.push('Well cited');

    const year = getYear(a);
    if (year >= CURRENT_YEAR - 2) reasons.push('Very recent');
    else if (year >= CURRENT_YEAR - 5) reasons.push('Recent');

    if (a._quality?.grade === 'A') reasons.push('Top quality (A)');
    if (a._openalexMetrics?.isTopCitationPercentile) reasons.push('Top citation percentile');
    if (a.isFree || a.pmcid) reasons.push('Open access');
    if (scored.queryAliasMatchScore > 0) reasons.push('Trial alias match');
    if (scored.queryMatchScore >= 0.85) reasons.push('Strong query match');
    else if (scored.queryMatchScore >= 0.55) reasons.push('Good query match');

    const journalBonus = getJournalBonus(a);
    if (journalBonus >= 18) reasons.push('Top-tier journal');
    else if (journalBonus >= 12) reasons.push('High-impact journal');
    else if (journalBonus >= 6) reasons.push('Reputable journal');

    return reasons;
}

// =============================================================================
// Query intent classification
// Determines what kind of answer the user is looking for and maps it to the
// archetype priority order that best serves that intent.
// =============================================================================

const INTENT_PATTERNS = {
    guideline:      /\b(guideline|recommendation|consensus|protocol|standard of care|best practice|current approach|management algorithm)\b/i,
    therapeutic:    /\b(treat(ment|ing|ed)?|therap(y|ies|eutic)|manag(e|ement)|drug|medication|dose|efficacy|intervention|regimen|first.line|second.line)\b/i,
    diagnostic:     /\b(diagnos\w+|diagnosis|testing|sensitivity|specificity|accuracy|screening|detection|criteria|differential|ddx|workup|investigation)\b/i,
    prognostic:     /\b(prognos\w+|survival|mortality|outcome|prediction|risk (factor|score|stratif)|complication|recurrence|relapse|long.term)\b/i,
    epidemiological:/\b(epidemiology|incidence|prevalence|burden|risk|public health|population|global)\b/i,
    mechanistic:    MECHANISM_QUERY_PATTERNS,
};

// Archetype priority lists per intent — the bouquet fills slots in this order
const INTENT_ARCHETYPES = {
    guideline:       ['guideline', 'definition', 'recent_review', 'landmark_rct'],
    therapeutic:     ['landmark_rct', 'management_trial', 'guideline', 'recent_review'],
    diagnostic:      ['definition', 'guideline', 'recent_review', 'review'],
    prognostic:      ['cohort', 'recent_review', 'review', 'landmark_rct'],
    epidemiological: ['cohort', 'review', 'recent_review'],
    mechanistic:     ['landmark_basic_science', 'mechanism', 'recent_review'],
    general:         ['definition', 'landmark_rct', 'management_trial', 'guideline', 'recent_review'],
};

function classifyQueryIntent(query) {
    const q = String(query || '');
    // Evaluate in priority order: guideline > mechanistic > therapeutic > diagnostic > prognostic > epidemiological
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
        if (pattern.test(q)) return intent;
    }
    return 'general';
}

function intentToPreferredArchetypes(intent) {
    return INTENT_ARCHETYPES[intent] || INTENT_ARCHETYPES.general;
}

module.exports = {
    buildEvidenceBouquet,
    computeCompositeScore,
    classifyArchetype,
    getCitationCount,
    hasCitationData,
    getYear,
    isOffTopic,
    meshRelevanceRatio,
    queryMatchScore,
    queryAliasMatchScore,
    isPreclinical,
    isGroundbreakingBasicScience,
    isPredatoryJournal,
    MECHANISM_QUERY_PATTERNS,
    mapStudyTypesToArchetypes,
    classifyQueryIntent,
    intentToPreferredArchetypes,
};
