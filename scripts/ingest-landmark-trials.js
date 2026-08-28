#!/usr/bin/env node
/**
 * Ingest landmark trials per condition, the same way guidelines are ingested.
 *
 * Why this exists:
 *   `topic_knowledge.knowledge.seminalPapers` is the field every learning surface
 *   already reads — MCQ generation (routes/learning/quiz.js), the prompt helpers
 *   that feed synopsis and case generation, and /api/topic-intelligence. But it was
 *   populated by asking a model to name seminal papers from its own recall plus
 *   whatever search returned. Spot-checking prod, that produced:
 *
 *     sepsis            -> "Inhibition of MyD88 in Tubular Epithelial Cells..."  (mouse study)
 *     atrial fibrillation -> "CYP2C19 Polymorphism and Platelet Aggregation..."  (pharmacogenomics)
 *     heart failure     -> "[Heart failure with preserved ejection fraction..."  (translated review)
 *
 *   None are landmark trials. A student asking about sepsis should get ProCESS,
 *   ARISE, ProMISe and the Surviving Sepsis bundles — not a murine mechanism paper.
 *
 * What this does instead:
 *   Retrieves candidates from Europe PMC restricted to interventional trial
 *   publication types, scores them on the properties that actually make a trial
 *   landmark (citation weight, journal tier, sample size, explicit trial acronym),
 *   and only keeps those clearing a threshold. A condition with no qualifying trial
 *   gets nothing rather than a padded list — the failure mode being fixed is
 *   precisely that of filling the field with whatever was available.
 *
 * Storage:
 *   Canonical rows go to topic_guidelines with evidence_tier='trial' (migration 087),
 *   so the evidence cascade can serve them as the trial tier and they are queryable
 *   alongside guidelines. They are then projected into topic_knowledge.seminalPapers
 *   in the exact shape prompts/knowledge.js documents, so every existing consumer
 *   picks them up with no further wiring. Specialty is never consulted: topics are
 *   keyed on normalized_topic, exactly as guidelines are.
 *
 * Env:
 *   TRIALS_DRY_RUN=1              log only, no writes
 *   TRIALS_TOPIC_LIST_FILE=path   newline-separated conditions (default: active curriculum topics)
 *   TRIALS_PER_TOPIC=5            max trials kept per condition (default 5)
 *   TRIALS_MIN_SCORE=4            score a trial must clear to be stored (default 4)
 *   TRIALS_MAX_TOPICS=0           stop after N topics (0 = all)
 */

'use strict';

const https = require('https');
const fs = require('fs');
const db = require('../database');

const DRY_RUN = process.env.TRIALS_DRY_RUN === '1';
const PER_TOPIC = Math.max(1, Number(process.env.TRIALS_PER_TOPIC || 5));
const MIN_SCORE = Number(process.env.TRIALS_MIN_SCORE || 4);
const MAX_TOPICS = Number(process.env.TRIALS_MAX_TOPICS || 0);
// Hard floor on publication year. A student is learning CURRENT practice; the
// 1990s sepsis trials (E5 murine antibody, HA-1A, high-dose steroids, anti-TNF)
// are cited by guidelines as cautionary history and are all heavily cited, so a
// citation-scaled penalty could not displace them. Landmark trials that still
// define practice are overwhelmingly post-2000.
const MIN_YEAR = Number(process.env.TRIALS_MIN_YEAR || 2000);

// Condition shorthand -> spelled-out forms, so a trial titled "acute respiratory
// distress syndrome" still matches a topic keyed as "ARDS".
// Words too generic to confirm a trial is about a condition on their own.
const GENERIC_CONDITION_WORDS = new Set([
    'acute', 'chronic', 'severe', 'disease', 'disorder', 'syndrome', 'failure',
    'injury', 'infection', 'management', 'therapy', 'treatment', 'adult', 'adults',
]);

const CONDITION_EXPANSIONS = new Map([
    ['ards', ['acute respiratory distress syndrome']],
    ['aki', ['acute kidney injury']],
    ['ckd', ['chronic kidney disease']],
    ['copd', ['chronic obstructive pulmonary disease']],
    ['hfref', ['heart failure reduced ejection']],
    ['hfpef', ['heart failure preserved ejection']],
    ['stemi', ['myocardial infarction']],
    ['nstemi', ['myocardial infarction']],
    ['vte', ['venous thromboembolism']],
    ['ttp', ['thrombotic thrombocytopenic purpura']],
]);

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'MedResearch/1.0 (academic-use; +https://signalmd.co)';

// Journals where a practice-changing trial is most often published. Presence is
// evidence of impact; absence is not held against a trial (score is additive).
const TIER1_JOURNALS = /\b(N Engl J Med|New England Journal of Medicine|Lancet|JAMA|BMJ|Circulation|Eur Heart J|J Am Coll Cardiol|Blood|J Clin Oncol|Am J Respir Crit Care Med|Intensive Care Med|Kidney Int|Gastroenterology|Ann Intern Med|Nat Med)\b/i;

// A named acronym in the title is the strongest single signal that a trial entered
// clinical vocabulary: PROSEVA, DAPA-HF, PARADIGM-HF, EOLIA, ARISE, RECOVERY.
const TRIAL_ACRONYM = /\b([A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]{1,})?)\b(?=[\s:,.)\]]|$)/;
const ACRONYM_STOPWORDS = new Set([
    'RCT', 'ICU', 'COVID', 'SARS', 'HIV', 'AIDS', 'USA', 'UK', 'WHO', 'NIH',
    'CT', 'MRI', 'PET', 'ECG', 'EEG', 'BMI', 'CI', 'HR', 'OR', 'RR', 'NNT',
    'DNA', 'RNA', 'PCR', 'ELISA', 'FDA', 'EMA', 'NICE', 'ESC', 'AHA', 'ACC',
    'I', 'II', 'III', 'IV', 'A', 'B',
]);

// Papers a guideline legitimately cites that are not trials: reporting standards,
// methodology guidance, epidemiology reports, and the guideline documents themselves.
// Every one of these appeared in a dry run against real guideline reference lists.
// NOTE: no trailing  — several alternatives are PREFIXES (epidemiolog,
// meta-analys). A closing boundary would require the word to end there, so
// "Epidemiology" never matched "epidemiolog" and these papers leaked through.
const NON_TRIAL_TITLE = /\b(PRISMA|GRADE|preferred reporting|reporting items|checklist|statement|methodolog|atlas|prevalence estimate|epidemiolog|incidence of|patterns of care|systematic review|meta-analys|scoping review|narrative review|consensus|position paper|guideline|guidance|recommendation)/i;

// A severity score or prognostic model is not a therapeutic landmark.
const SCORE_PAPER = /\b(APACHE|SOFA score|prognostic system|risk prediction|scoring system|severity of disease classification)/i;

const INTERVENTIONAL_TYPES = /randomized controlled trial|clinical trial, phase iii|clinical trial, phase iv|pragmatic clinical trial|multicenter study/i;

function httpGet(url, { timeout = 45000 } = {}) {
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
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "Sepsis and septic shock" -> "Sepsis and septic shock"; strips syllabus subtitles. */
function coreTerm(name) {
    return String(name).split(/[:–—(]/)[0].trim();
}

/** Word-boundary matcher. A bare includes('ards') fires on any token merely
 *  containing those letters, which let a community-acquired pneumonia paper pass
 *  as an ARDS trial. Condition phrases are plain text, so escaping is minimal. */
function reWord(phrase) {
    // Condition phrases are plain clinical text, so strip anything that is not
    // a letter, digit, space or hyphen rather than escaping regex metacharacters.
    const safe = String(phrase).replace(/[^a-z0-9 -]/gi, ' ').trim();
    return new RegExp('(^|[^a-z0-9])' + safe + '([^a-z0-9]|$)', 'i');
}

function extractAcronym(title) {
    const m = String(title || '').match(TRIAL_ACRONYM);
    if (!m) return null;
    const a = m[1];
    if (ACRONYM_STOPWORDS.has(a)) return null;
    if (a.length < 3 || a.length > 14) return null;
    return a;
}

/**
 * Score a candidate on what actually makes a trial landmark. Deliberately additive
 * and transparent so a low-scoring corpus is visible rather than silently padded.
 */
function scoreTrial(article) {
    let score = 0;
    const reasons = [];

    const cites = Number(article.citedByCount || 0);
    if (cites >= 2000) { score += 4; reasons.push(`cited ${cites}`); }
    else if (cites >= 500) { score += 3; reasons.push(`cited ${cites}`); }
    else if (cites >= 150) { score += 2; reasons.push(`cited ${cites}`); }
    else if (cites >= 50) { score += 1; reasons.push(`cited ${cites}`); }

    const journal = article.journalTitle || '';
    if (TIER1_JOURNALS.test(journal)) { score += 2; reasons.push(journal); }

    const types = article.pubTypeList?.pubType;
    const typeList = Array.isArray(types) ? types : (types ? [types] : []);
    if (typeList.some((t) => INTERVENTIONAL_TYPES.test(String(t)))) {
        score += 2;
        reasons.push('interventional');
    }

    const acronym = extractAcronym(article.title);
    if (acronym) { score += 2; reasons.push(`acronym ${acronym}`); }

    // Trials that changed practice are almost never single-centre pilots.
    if (/\bmulticent(er|re)\b/i.test(`${article.title} ${article.abstractText || ''}`)) {
        score += 1;
        reasons.push('multicentre');
    }

    // Strongest signal available: a guideline for this very condition cites it.
    // Its authors already did the practice-changing triage for us.
    if (article._citedByGuideline) {
        score += 4;
        reasons.push('cited by guideline');
    }

    // Practice moves on. A 1990s trial that failed (E5 murine antibody, HA-1A for
    // sepsis) is cited by guidelines as history, not current practice, and must not
    // outrank DAPA-HF. Age is forgiven only for the genuinely foundational.
    const year = Number(article.pubYear || 0);
    if (year && year < 2000 && cites < 3000) {
        score -= 3;
        reasons.push(`dated ${year}`);
    } else if (year >= 2015) {
        score += 1;
        reasons.push(`recent ${year}`);
    }

    return { score, reasons, acronym };
}

/**
 * Hard gates applied before scoring. Anything failing these is not a landmark trial
 * for our purposes however well it would otherwise score.
 */
function isTrialCandidate(article, condition) {
    const title = String(article.title || '');
    if (!title) return false;

    const year = Number(article.pubYear || 0);
    if (year && year < MIN_YEAR) return false;
    if (NON_TRIAL_TITLE.test(title)) return false;
    if (SCORE_PAPER.test(title)) return false;

    // Must be interventional, or at least carry a named trial acronym.
    const types = article.pubTypeList?.pubType;
    const typeList = Array.isArray(types) ? types : (types ? [types] : []);
    const interventional = typeList.some((t) => INTERVENTIONAL_TYPES.test(String(t)));
    if (!interventional && !extractAcronym(title)) return false;

    // A guideline's references range well beyond its own condition — an ARDS
    // guideline cites pneumonia diagnostics. Require the trial to actually concern
    // the condition we are about to file it under.
    const core = coreTerm(condition).toLowerCase();
    const words = core.split(/\s+/).filter((w) => w.length >= 4 && !/^(and|the|with|from)$/.test(w));
    if (words.length) {
        // Title/keywords only. Matching the abstract let a community-acquired
        // pneumonia trial pass as an ARDS landmark because its abstract mentioned
        // ARDS in passing; a trial ABOUT a condition names it in the title.
        const hay = `${title} ${(article.keywordList?.keyword || []).join(' ')}`.toLowerCase();

        // Expansions are matched as WHOLE PHRASES. Splitting "acute respiratory
        // distress syndrome" into words let 'acute' and 'respiratory' match every
        // acute-dyspnoea biomarker paper, which is exactly what went wrong.
        const phrases = [];
        for (const w of words) {
            if (!GENERIC_CONDITION_WORDS.has(w)) phrases.push(w);
            for (const long of (CONDITION_EXPANSIONS.get(w) || [])) phrases.push(long);
        }
        if (!phrases.length) phrases.push(core);
        // Word-boundary match, not substring: a bare includes('ards') fires on any
        // token that merely contains those letters, which is how a community-acquired
        // pneumonia paper passed as an ARDS trial.
        const hit = phrases.some((ph) => reWord(ph).test(hay));
        if (!hit) return false;
    }
    return true;
}

/** Pull PMIDs out of the source_url values we stored for a topic's guidelines. */
function pmidFromUrl(url) {
    const m = String(url || '').match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    return m ? m[1] : null;
}

/**
 * The guideline's own reference list is the curated evidence base for the
 * condition — its authors already decided what changed practice. That is a far
 * stronger signal than any citation-count heuristic applied to open search, which
 * is what previously surfaced a murine mechanism paper for sepsis.
 */
async function referencesOfGuidelines(topic) {
    const normalized = db.normalizeTopic(topic);
    const rows = await db.all(
        `SELECT DISTINCT source_url FROM topic_guidelines
         WHERE normalized_topic = ?
           AND evidence_tier = 'guideline'
           AND source_url ~ 'pubmed'
         LIMIT 6`,
        [normalized]
    ).catch(() => []);

    const seen = new Map();
    for (const row of rows) {
        const pmid = pmidFromUrl(row.source_url);
        if (!pmid) continue;
        try {
            const raw = await httpGet(
                `${EPMC}/MED/${pmid}/references?format=json&pageSize=100`);
            const refs = JSON.parse(raw)?.referenceList?.reference || [];
            for (const r of refs) {
                const id = r.id || r.pmid;
                if (!id || seen.has(String(id))) continue;
                seen.set(String(id), {
                    id: String(id),
                    title: r.title || '',
                    journalTitle: r.journalAbbreviation || r.journal || '',
                    pubYear: r.pubYear || null,
                    _citedByGuideline: true,
                });
            }
        } catch { /* a guideline without a retrievable reference list is fine */ }
        await sleep(250);
    }
    return [...seen.values()];
}

/**
 * Enrich reference stubs with the fields scoring needs (pub types, citation count).
 * Batched into OR queries so one request covers many candidates.
 */
async function enrichCandidates(stubs) {
    const out = [];
    for (let i = 0; i < stubs.length; i += 20) {
        const batch = stubs.slice(i, i + 20).filter((s) => /^\d+$/.test(s.id));
        if (!batch.length) continue;
        const q = batch.map((s) => `EXT_ID:${s.id}`).join(' OR ');
        try {
            const raw = await httpGet(
                `${EPMC}/search?query=${encodeURIComponent(q)}&format=json&pageSize=25&resultType=core`);
            const found = JSON.parse(raw)?.resultList?.result || [];
            const byId = new Map(found.map((f) => [String(f.pmid || f.id), f]));
            for (const stub of batch) {
                const full = byId.get(stub.id);
                if (full) out.push({ ...full, _citedByGuideline: stub._citedByGuideline });
            }
        } catch { /* skip an unresolvable batch */ }
        await sleep(250);
    }
    return out;
}

/** Fallback for topics whose guidelines are non-PubMed (e.g. NICE URLs). */
async function searchTrials(condition) {
    const term = coreTerm(condition).replace(/"/g, '');
    const q = `"${term}" AND (PUB_TYPE:"Randomized Controlled Trial" OR PUB_TYPE:"Clinical Trial, Phase III")`;
    const url = `${EPMC}/search?query=${encodeURIComponent(q)}`
        + `&format=json&pageSize=40&sort=CITED%20desc&resultType=core`;
    const raw = await httpGet(url);
    return JSON.parse(raw)?.resultList?.result || [];
}

function buildSeminalEntry(article, scored, index) {
    const year = article.pubYear ? ` (${article.pubYear})` : '';
    const acronym = scored.acronym ? `${scored.acronym}: ` : '';
    return {
        sourceIndex: index + 1,
        title: String(article.title || '').replace(/\.$/, ''),
        whySeminal: `${acronym}${article.journalTitle || 'peer-reviewed'}${year}`
            + `, cited ${article.citedByCount || 0} times. Signals: ${scored.reasons.join(', ')}.`,
        clinicalPrinciple: String(article.abstractText || '')
            .split(/(?<=\.)\s+/)
            .filter((s) => /\b(conclusion|we found|resulted in|reduced|increased|no difference|superior|noninferior|non-inferior)\b/i.test(s))
            .slice(0, 2).join(' ').slice(0, 400)
            || String(article.abstractText || '').slice(0, 300),
        evidenceStrength: scored.score >= 8 ? 'HIGH' : scored.score >= 6 ? 'MODERATE' : 'LOW',
        pmid: article.pmid || null,
        doi: article.doi || null,
        year: article.pubYear ? Number(article.pubYear) : null,
        trialAcronym: scored.acronym || null,
        _ingested: true,
    };
}

async function processTopic(topic) {
    let articles = [];
    let provenance = 'guideline_references';
    try {
        const stubs = await referencesOfGuidelines(topic);
        if (stubs.length) articles = await enrichCandidates(stubs);
        // Only fall back to open search when the topic's guidelines are not
        // PubMed-indexed (NICE pages, for instance) or cite nothing retrievable.
        if (!articles.length) {
            provenance = 'open_search';
            articles = await searchTrials(topic);
        }
    } catch (err) {
        return { topic, error: err.message, kept: 0 };
    }
    if (!articles.length) return { topic, kept: 0, reason: 'no_candidates' };

    const rank = (list) => list
        .filter((a) => isTrialCandidate(a, topic))
        .map((a) => ({ article: a, ...scoreTrial(a) }))
        .filter((s) => s.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_TOPIC);

    let scored = rank(articles);

    // A topic whose only stored guideline is old (sepsis) yields a reference list of
    // superseded trials, all correctly rejected — leaving nothing. Fall back to open
    // search in that case rather than reporting the condition as having no evidence.
    if (!scored.length && provenance === 'guideline_references') {
        try {
            const fallback = await searchTrials(topic);
            const rescored = rank(fallback);
            if (rescored.length) { scored = rescored; provenance = 'open_search_fallback'; }
        } catch { /* keep the empty result */ }
    }

    if (!scored.length) return { topic, kept: 0, reason: 'below_threshold', candidates: articles.length };

    const entries = scored.map((s, i) => buildSeminalEntry(s.article, s, i));

    if (DRY_RUN) {
        return { topic, kept: entries.length, entries, provenance, dryRun: true };
    }

    // 1. Canonical rows in topic_guidelines, tier='trial', so the evidence cascade
    //    can serve them and they sit alongside guidelines for the same condition.
    const normalized = db.normalizeTopic(topic);
    for (const [i, s] of scored.entries()) {
        const a = s.article;
        const url = a.doi ? `https://doi.org/${a.doi}`
            : a.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/` : null;
        const exists = await db.get(
            `SELECT id FROM topic_guidelines WHERE normalized_topic = ? AND source_url = ? LIMIT 1`,
            [normalized, url]
        ).catch(() => null);
        if (exists) continue;

        // Persist abstract in the document store so the trial body is readable
        // without re-fetching from PubMed. Abstracts are short (≤500 words) so
        // storage overhead is negligible; they survive as the primary source text
        // for structured field extraction and agent grounding.
        let documentId = null;
        if (typeof db.upsertGuidelineDocument === 'function') {
            const abstractText = String(a.abstractText || entries[i].clinicalPrinciple || '').trim();
            documentId = await db.upsertGuidelineDocument({
                pmcid: a.pmcid || null,
                pmid: a.pmid || null,
                doi: a.doi || null,
                title: a.title || null,
                sourceBody: String(a.journalTitle || 'Clinical trial').slice(0, 120),
                sourceYear: a.pubYear ? Number(a.pubYear) : null,
                sourceUrl: url,
                evidenceTier: 'trial',
                fullText: abstractText || null,
                fullTextSource: abstractText ? 'abstract' : null,
                fetchedAt: new Date().toISOString(),
            }).catch(() => null);
        }

        await db.run(
            `INSERT INTO topic_guidelines (
                topic, normalized_topic, source_body, source_year, source_url,
                recommendation_text, recommendation_strength, status, evidence_tier,
                document_id, last_checked_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(topic).slice(0, 240),
                normalized,
                String(a.journalTitle || 'Clinical trial').slice(0, 120),
                a.pubYear ? Number(a.pubYear) : null,
                url,
                entries[i].clinicalPrinciple || entries[i].title,
                entries[i].evidenceStrength,
                'ai_extracted',
                'trial',
                documentId,
                new Date().toISOString(), new Date().toISOString(), new Date().toISOString(),
            ]
        ).catch(() => null);
    }

    // 2. Project into topic_knowledge.seminalPapers, the field every learning
    //    surface already reads. Ingested entries replace model-guessed ones for
    //    this topic; anything not marked _ingested is dropped, since that is the
    //    content this script exists to correct.
    const existing = await db.getTopicKnowledge(topic).catch(() => null);
    const knowledge = existing?.knowledge ? { ...existing.knowledge } : {};
    knowledge.seminalPapers = entries;
    if (typeof db.upsertTopicKnowledge === 'function') {
        // Signature: (topic, knowledge, sourceArticles, status, confidence).
        // 'trial_ingested' distinguishes these from the 'ai_generated' rows this
        // script replaces, so a later audit can tell guessed from ingested.
        const sourceArticles = entries
            .filter((e) => e.pmid)
            .map((e) => ({ uid: e.pmid, pmid: e.pmid, title: e.title, year: e.year }));
        await db.upsertTopicKnowledge(topic, knowledge, sourceArticles, 'trial_ingested', 0.9)
            .catch((e) => { throw new Error(`upsertTopicKnowledge: ${e.message}`); });
    }

    return { topic, kept: entries.length, entries, provenance };
}

async function main() {
    await db.connect();

    let topics;
    if (process.env.TRIALS_TOPIC_LIST_FILE) {
        topics = fs.readFileSync(process.env.TRIALS_TOPIC_LIST_FILE, 'utf8')
            .split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
    } else {
        // Specialty is never consulted — topics are keyed on normalized_topic,
        // exactly as guidelines are.
        const rows = await db.all(
            `SELECT display_name FROM curriculum_topics
             WHERE seed_status <> 'archived' ORDER BY sort_order`, []);
        topics = rows.map((r) => r.display_name);
    }
    if (MAX_TOPICS > 0) topics = topics.slice(0, MAX_TOPICS);

    console.log(`[Trials] ${topics.length} topics to process${DRY_RUN ? ' (DRY RUN)' : ''}`);

    let totalKept = 0, covered = 0, empty = 0;
    for (const topic of topics) {
        const r = await processTopic(topic);
        if (r.error) {
            console.log(`  "${topic}"... ERROR ${r.error}`);
        } else if (r.kept) {
            covered += 1; totalKept += r.kept;
            console.log(`  "${topic}"... +${r.kept} trials [${r.provenance}]`);
            for (const e of (r.entries || []).slice(0, DRY_RUN ? 5 : 0)) {
                console.log(`      [${e.trialAcronym || '—'}] ${e.title.slice(0, 90)}`);
            }
        } else {
            empty += 1;
            console.log(`  "${topic}"... none (${r.reason}${r.candidates ? `, ${r.candidates} candidates` : ''})`);
        }
        await sleep(350);
    }

    console.log(`\n[Trials] Done: ${totalKept} trials across ${covered} topics; ${empty} with none.`);
    process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
