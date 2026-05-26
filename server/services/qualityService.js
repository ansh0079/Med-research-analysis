// ==========================================
// Quality Scoring + Retraction Detection
// ==========================================

const logger = require('../config/logger');
const fetch = require('node-fetch');

// Study design patterns and their weights
const STUDY_DESIGNS = [
  { pattern: /\b(randomized controlled trial|rct|randomised controlled trial)\b/i, weight: 30, name: 'Randomized Controlled Trial' },
  { pattern: /\b(meta.analysis|metaanalysis|systematic review and meta.analysis)\b/i, weight: 25, name: 'Meta-analysis' },
  { pattern: /\bsystematic review\b/i, weight: 20, name: 'Systematic Review' },
  { pattern: /\b(prospective cohort|cohort study|retrospective cohort)\b/i, weight: 15, name: 'Cohort Study' },
  { pattern: /\b(case.control|case.control study)\b/i, weight: 10, name: 'Case-Control Study' },
  { pattern: /\b(cross.sectional|cross sectional study|prevalence study)\b/i, weight: 5, name: 'Cross-Sectional Study' },
  { pattern: /\b(case report|case series)\b/i, weight: 1, name: 'Case Report' },
];

const PUBTYPE_MAP = {
  'Randomized Controlled Trial': 30,
  'Meta-Analysis': 25,
  'Systematic Review': 20,
  'Review': 10,
  'Cohort Study': 15,
  'Case-Control Study': 10,
  'Cross-Sectional Study': 5,
  'Case Reports': 1,
  'Clinical Trial': 20,
  'Comparative Study': 10,
  'Multicenter Study': 10,
  'Observational Study': 8,
  'Prospective Study': 12,
  'Retrospective Study': 8,
};

const SAMPLE_SIZE_PATTERNS = [
  { pattern: /\b(\d{1,3}(?:,\d{3})+)\s+(?:patients|participants|subjects|individuals|cases|samples?)/i, threshold: 1000 },
  { pattern: /\b(n\s*=\s*(\d{1,3}(?:,\d{3})+))\b/i, threshold: 1000 },
  { pattern: /\b(\d{1,3}(?:,\d{3})+)\s+(?:patients|participants|subjects|individuals|cases|samples?)/i, threshold: 100 },
  { pattern: /\b(n\s*=\s*(\d{1,3}(?:,\d{3})*))\b/i, threshold: 100 },
  { pattern: /\b(\d+)\s+(?:patients|participants|subjects|individuals|cases|samples?)/i, threshold: 10 },
  { pattern: /\b(n\s*=\s*(\d+))\b/i, threshold: 10 },
];

/**
 * Compute a statistical quality score (0-100) for an article.
 * @param {object} article
 * @returns {{ score: number, grade: 'A'|'B'|'C'|'D', factors: string[], signals: string[] }}
 */
function computeQualityScore(article) {
  let score = 0;
  const factors = [];
  const signals = [];

  const title = (article.title || '').toLowerCase();
  const abstract = (article.abstract || '').toLowerCase();
  const fullText = `${title} ${abstract}`;
  const pubtypes = article.pubtype || [];

  // 1. Study design strength
  let designFound = false;
  // Check PubMed pubtypes first
  for (const pt of pubtypes) {
    const mapped = Object.keys(PUBTYPE_MAP).find(k => pt.toLowerCase().includes(k.toLowerCase()));
    if (mapped) {
      score += PUBTYPE_MAP[mapped];
      factors.push(mapped);
      designFound = true;
      break;
    }
  }
  // Fallback to abstract/title regex
  if (!designFound) {
    for (const design of STUDY_DESIGNS) {
      if (design.pattern.test(fullText)) {
        score += design.weight;
        factors.push(design.name);
        designFound = true;
        break;
      }
    }
  }
  if (!designFound) {
    signals.push('Study design not identified in abstract');
  }

  // 2. Sample size signal
  let sampleSizeFound = false;
  for (const ss of SAMPLE_SIZE_PATTERNS) {
    const match = fullText.match(ss.pattern);
    if (match) {
      const num = parseInt((match[2] ?? match[1]).replace(/,/g, ''), 10);
      if (num >= ss.threshold) {
        if (num >= 1000) { score += 15; factors.push(`Large sample (n=${num.toLocaleString()})`); }
        else if (num >= 100) { score += 10; factors.push(`Moderate sample (n=${num.toLocaleString()})`); }
        else { score += 5; factors.push(`Small sample (n=${num.toLocaleString()})`); }
        sampleSizeFound = true;
        break;
      }
    }
  }
  if (!sampleSizeFound) {
    signals.push('Sample size not reported in abstract');
  }

  // 3. Statistical rigor
  const hasCI = /\b95%\s*ci\b|\bconfidence interval\b|\bci\s*[:=]/i.test(abstract);
  const hasEffectSize = /\b(cohen'?s\s*d|odds\s+ratio|rr\s*[=]|hr\s*[=]|relative\s+risk|hazard\s+ratio|effect\s+size|standardized\s+mean\s+difference|smd)\b/i.test(abstract);
  const hasPreregistration = /\b(preregistered|clinicaltrials\.gov|protocol|registered\s*at)\b/i.test(abstract);

  if (hasCI) { score += 5; factors.push('Reports confidence intervals'); }
  if (hasEffectSize) { score += 5; factors.push('Reports effect sizes'); }
  if (hasPreregistration) { score += 5; factors.push('Pre-registered study'); }

  // 4. P-value red flags
  const pValueMentions = (abstract.match(/\bp\s*[<=>]\s*0\.0?5\b/gi) || []).length;
  const hasCorrection = /\b(bonferroni|fdr|false discovery|multiple comparison|adjusted p|corrected)\b/i.test(abstract);
  const hasCIMentioned = hasCI;

  if (pValueMentions > 0 && !hasCIMentioned && !hasEffectSize) {
    score -= 5;
    signals.push('P-values reported without confidence intervals or effect sizes');
  }
  if (pValueMentions > 1 && !hasCorrection) {
    score -= 5;
    signals.push('Multiple outcomes without correction for multiple comparisons');
  }

  // 5. Funding transparency
  const hasFunding = /\b(funding|grant|supported by|financial support|acknowledges?)\b/i.test(abstract);
  if (hasFunding) { score += 3; factors.push('Funding source disclosed'); }
  else { signals.push('Funding source not mentioned'); }

  // 6. Conflict of interest
  const hasCOI = /\b(conflict of interest|competing interest|disclosure|authors?\s*declaration)\b/i.test(abstract);
  if (hasCOI) { score += 3; factors.push('Conflict of interest statement'); }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';

  return { score: Math.round(score), grade, factors, signals };
}

/**
 * Check retraction status via PubMed E-utilities.
 * @param {string|null} doi
 * @param {string|null} pmid
 * @returns {Promise<{ isRetracted: boolean, retractionDate?: string, reason?: string, source: string }>}
 */
async function checkRetractionStatus(doi, pmid) {
  // Try PubMed first if we have a PMID
  if (pmid) {
    try {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&rettype=xml`;
      const res = await fetch(url, { timeout: 8000 });
      if (res.ok) {
        const xml = await res.text();
        const hasRetraction = xml.includes('Retraction of Publication') || xml.includes('Retracted Publication');
        if (hasRetraction) {
          const dateMatch = xml.match(/<PubMedPubDate PubStatus="retracted">\s*<Year>(\d{4})<\/Year>\s*<Month>(\d{1,2}|[A-Za-z]+)<\/Month>/);
          const year = dateMatch ? dateMatch[1] : undefined;
          const month = dateMatch ? dateMatch[2] : undefined;
          const retractionDate = year && month ? `${year}-${month}` : undefined;
          return { isRetracted: true, retractionDate, reason: 'Retracted publication', source: 'PubMed' };
        }
      }
    } catch (err) {
      logger.debug({ err, pmid }, 'PubMed retraction lookup failed');
    }
  }

  // Try CrossRef if we have a DOI
  if (doi) {
    try {
      const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
      const res = await fetch(url, { timeout: 8000 });
      if (res.ok) {
        const data = await res.json();
        const work = data?.message;
        const isRetracted = work?.assertion?.some?.(a => a.name?.toLowerCase()?.includes('retraction')) ||
                            work?.subtype?.toLowerCase() === 'retraction' ||
                            (work?.title?.[0] || '').toLowerCase().includes('retraction');
        if (isRetracted) {
          return { isRetracted: true, reason: 'Retracted publication', source: 'CrossRef' };
        }
      }
    } catch (err) {
      logger.debug({ err, doi }, 'CrossRef retraction lookup failed');
    }
  }

  return { isRetracted: false, source: 'PubMed/CrossRef' };
}

/**
 * Batch check retraction for multiple articles, with simple caching.
 */
async function batchCheckRetractions(articles) {
  const results = {};
  await Promise.all(
    articles.map(async (article) => {
      const key = article.uid || article.doi;
      if (!key) return;
      results[key] = await checkRetractionStatus(article.doi, article.pmid);
    })
  );
  return results;
}

/**
 * Attach cached retraction data to articles in-place.
 *
 * - Looks up all article UIDs in article_cache in one DB query (no API calls).
 * - Articles with a cached hit get _retraction set immediately.
 * - For articles that are in `bouquetUids` but have no cached data, fires API
 *   checks in the background and caches the results — next search gets them free.
 *
 * @param {object[]} articles  Mutable array — _retraction is set in place.
 * @param {{ db: object, fetchImpl: Function, bouquetUids?: Set<string> }} opts
 */
async function attachRetractionData(articles, { db, fetchImpl, bouquetUids } = {}) {
    if (!db || !articles.length) return;

    // Collect all candidate lookup keys (uid, pmid, doi)
    const keyMap = new Map(); // key → article
    for (const a of articles) {
        for (const k of [a.uid, a.pmid, a.doi].filter(Boolean)) {
            keyMap.set(String(k), a);
        }
    }

    // Single DB query for all cached retraction statuses
    const cached = typeof db.getArticleRetractionBatch === 'function'
        ? await db.getArticleRetractionBatch([...keyMap.keys()]).catch((err) => { logger.warn({ err }, 'operation failed'); return {}; })
        : {};

    // Apply cache hits
    for (const [key, data] of Object.entries(cached)) {
        const article = keyMap.get(key);
        if (article && !article._retraction) {
            article._retraction = data;
        }
    }

    // Background: check API for bouquet-priority articles that have no cached status
    // Uses the fetch impl from qualityService so it honours timeouts and auth headers.
    if (fetchImpl && bouquetUids?.size && typeof db.setArticleRetractionData === 'function') {
        const unchecked = articles.filter((a) => {
            if (a._retraction) return false;
            if (!(a.doi || a.pmid)) return false;
            return bouquetUids.has(String(a.uid || '')) ||
                   bouquetUids.has(String(a.pmid || '')) ||
                   bouquetUids.has(String(a.doi || ''));
        });
        if (unchecked.length > 0) {
            // Fire and forget — doesn't block the search response
            Promise.all(unchecked.map(async (a) => {
                try {
                    const result = await checkRetractionStatus(a.doi || null, a.pmid || null);
                    const cacheKey = a.uid || a.pmid || a.doi;
                    await db.setArticleRetractionData(String(cacheKey), result);
                    // Apply to the in-flight article too, in case it's still being processed
                    if (result.isRetracted) a._retraction = result;
                } catch (err) {
                    logger.debug({ err, articleUid: a.uid || a.pmid || a.doi }, 'Retraction check failed');
                }
            })).catch((err) => { logger.warn({ err }, 'batchCheckRetractions map failed'); });
        }
    }
}

module.exports = {
  computeQualityScore,
  checkRetractionStatus,
  batchCheckRetractions,
  attachRetractionData,
};
