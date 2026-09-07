/**
 * Dedicated external API proxy service.
 *
 * Centralizes all server-to-server calls to third-party APIs (PubMed, Semantic Scholar,
 * OpenAlex, Crossref, MeSH, Anthropic Claude, Mistral, Gemini) so that routes and
 * business-logic services never call fetch directly against external hosts.
 *
 * Benefits:
 * - Single place to attach timeouts, retries, circuit-breakers, and logging.
 * - Easy to mock in unit tests (inject fetchImpl).
 * - No CORS proxy dependency; the Node backend itself is the proxy.
 */

const logger = require('../config/logger');
const crypto = require('crypto');
const { recordExternalApiCall } = require('./observabilityMetrics');
const {
  fetchPubmedAbstractMap,
  attachAbstractsToArticles,
} = require('../utils/pubmedAbstracts');

// Lazily-loaded GoogleAuth instance for Vertex AI OAuth2 token caching.
// Only initialised when GOOGLE_APPLICATION_CREDENTIALS is set.
// Falls back gracefully if google-auth-library is not installed.
let _googleAuth = null;
function getGoogleAuth() {
  if (!_googleAuth) {
    try {
      const { GoogleAuth } = require('google-auth-library');
      _googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } catch (e) {
      throw new Error('google-auth-library not installed — run: npm install google-auth-library');
    }
  }
  return _googleAuth;
}

async function getVertexAccessToken() {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

const DEFAULT_TIMEOUTS = {
  pubmed: 15000,
  semantic: 15000,
  openalex: 15000,
  crossref: 15000,
  mesh: 8000,
  claude: 45000,
  mistral: 30000,
  gemini: 45000,

};

const inFlight = new Map();

function stableHash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 24);
}

async function cachedSingleFlight(cache, key, ttlSeconds, loader) {
  const getter = cache && (typeof cache.getAsync === 'function'
    ? cache.getAsync.bind(cache)
    : typeof cache.get === 'function'
      ? cache.get.bind(cache)
      : null);
  const setter = cache && (typeof cache.setAsync === 'function'
    ? cache.setAsync.bind(cache)
    : typeof cache.set === 'function'
      ? cache.set.bind(cache)
      : null);

  if (getter) {
    const cached = await Promise.resolve(getter(key)).catch((err) => {
      logger.warn({ err, key }, 'External source cache get failed');
      return null;
    });
    if (cached !== undefined && cached !== null) return { value: cached, cached: true, shared: false };
  }

  if (inFlight.has(key)) {
    const value = await inFlight.get(key);
    return { value, cached: false, shared: true };
  }

  const promise = (async () => {
    const value = await loader();
    if (setter) {
      await Promise.resolve(setter(key, value, ttlSeconds)).catch((err) => {
        logger.warn({ err, key }, 'External source cache set failed');
      });
    }
    return value;
  })();

  inFlight.set(key, promise);
  try {
    const value = await promise;
    return { value, cached: false, shared: false };
  } finally {
    inFlight.delete(key);
  }
}

function buildProxyService({ serverConfig, fetchImpl, cache = null, telemetry = null }) {
  const f = fetchImpl;
  const keys = serverConfig?.keys || {};

  async function withSourceCache(source, cacheParts, ttlSeconds, loader) {
    const key = `external:${source}:${stableHash(JSON.stringify(cacheParts))}`;
    const started = Date.now();
    const { value, cached, shared } = await cachedSingleFlight(cache, key, ttlSeconds, loader);
    if (telemetry && typeof telemetry === 'object') {
      telemetry.sourceCache = telemetry.sourceCache || {};
      const prev = telemetry.sourceCache[source] || {
        hits: 0,
        misses: 0,
        shared: 0,
        lastKey: null,
      };
      telemetry.sourceCache[source] = {
        hits: prev.hits + (cached ? 1 : 0),
        misses: prev.misses + (!cached && !shared ? 1 : 0),
        shared: prev.shared + (shared ? 1 : 0),
        lastKey: process.env.NODE_ENV === 'development' ? key : undefined,
      };
      telemetry.sourceFetches = telemetry.sourceFetches || {};
      telemetry.sourceFetches[source] = {
        ms: Date.now() - started,
        cached,
        shared,
      };
    }
    return value;
  }

  function buildPubMedUrl(path, params) {
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const q = new URLSearchParams(params);
    q.set('retmode', 'json');
    q.set('tool', 'medsearch_v3');
    if (keys.ncbiEmail) q.set('email', keys.ncbiEmail);
    const keyParam = keys.ncbi ? `&api_key=${keys.ncbi}` : '';
    return `${base}${path}?${q.toString()}${keyParam}`;
  }

  // esummary never returns abstracts. NCBI efetch (XML) is the supported
  // way to hydrate AbstractText for PubMed-sourced cards and synopses.
  function buildPubmedEfetchUrl(pmids) {
    const q = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      rettype: 'abstract',
      retmode: 'xml',
      tool: 'medsearch_v3',
    });
    if (keys.ncbiEmail) q.set('email', keys.ncbiEmail);
    const keyParam = keys.ncbi ? `&api_key=${keys.ncbi}` : '';
    return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${q.toString()}${keyParam}`;
  }

  async function pubmedEfetchAbstracts(pmids) {
    return fetchPubmedAbstractMap({
      pmids,
      fetchImpl: f,
      urlForIds: (ids) => buildPubmedEfetchUrl(ids),
      timeout: DEFAULT_TIMEOUTS.pubmed,
    });
  }

  async function pubmedEsearch(query, { retmax = 20, sort = 'relevance' } = {}) {
    const url = buildPubMedUrl('/esearch.fcgi', {
      db: 'pubmed',
      term: query,
      retmax: String(retmax),
      sort,
    });
    const res = await f(url, { timeout: DEFAULT_TIMEOUTS.pubmed });
    if (!res.ok) throw new Error(`PubMed esearch ${res.status}`);
    const data = await res.json();
    if (data.esearchresult?.ERROR) {
      logger.warn({ error: data.esearchresult.ERROR, query }, 'PubMed esearch in-band error');
      return [];
    }
    return data.esearchresult?.idlist || [];
  }

  async function pubmedEsummary(pmids) {
    if (!pmids.length) return {};
    const url = buildPubMedUrl('/esummary.fcgi', {
      db: 'pubmed',
      id: pmids.join(','),
    });
    const res = await f(url, { timeout: DEFAULT_TIMEOUTS.pubmed });
    if (!res.ok) throw new Error(`PubMed esummary ${res.status}`);
    const summaryData = await res.json();
    const result = summaryData.result || {};
    // Filter out article entries that contain an in-band error field
    for (const [key, val] of Object.entries(result)) {
      if (key === 'uids') continue;
      if (val && typeof val === 'object' && val.error) {
        logger.warn({ pmid: key, error: val.error }, 'PubMed esummary in-band article error — skipping');
        delete result[key];
      }
    }
    return result;
  }

  function mapPubmedSummaryToArticle(pmid, article) {
    if (!article) return null;
    const { extractPubmedPmcid } = require('../utils/articleAccess');
    const pmcid = extractPubmedPmcid(article.articleids);
    return {
      uid: `pubmed-${pmid}`,
      title: article.title,
      authors: article.authors?.map((a) => ({ name: a.name })),
      pubdate: article.pubdate,
      source: article.source,
      pmid,
      pmcid,
      isFree: Boolean(pmcid),
      // PubMed's pmcrefcount is a partial PMC-only count that is usually absent;
      // leave it undefined (not 0) when unavailable so downstream filters treat it
      // as "unknown citations" rather than "zero citations" and don't drop old
      // landmark trials that PubMed itself ranks highly.
      pmcrefcount: Number(article.pmcrefcount) > 0 ? Number(article.pmcrefcount) : undefined,
      abstract: article.abstract ?? article.abstracttext,
      pubtype: article.pubtype || [],
      doi:
        article.articleids?.find((id) => id.idtype === 'doi')?.value || null,
      _source: 'pubmed',
    };
  }

  async function pubmedSearch(query, { maxResults = 20, sort = 'relevance' } = {}) {
    return withSourceCache('pubmed', { query, maxResults, sort }, 1800, async () => {
      const pmids = await pubmedEsearch(query, { retmax: maxResults, sort });
      const summary = await pubmedEsummary(pmids);
      const articles = pmids
        .map((pmid) => mapPubmedSummaryToArticle(pmid, summary[pmid]))
        .filter(Boolean);
      const abstracts = await pubmedEfetchAbstracts(pmids);
      return attachAbstractsToArticles(articles, abstracts);
    });
  }

  // Fetches specific PMIDs directly via esummary, bypassing esearch relevance ranking
  // entirely. Used to pin known landmark trials that esearch buries under decades of
  // later citing papers (older trials rarely self-cite their acronym in the abstract).
  async function pubmedFetchByIds(pmids) {
    const ids = [...new Set((pmids || []).filter(Boolean))];
    if (!ids.length) return [];
    return withSourceCache('pubmed-pinned', { ids }, 86400, async () => {
      const summary = await pubmedEsummary(ids);
      const articles = ids
        .map((pmid) => {
          const article = mapPubmedSummaryToArticle(pmid, summary[pmid]);
          // Flag so the bouquet ranker can guarantee placement — these are curated,
          // exact-PMID matches, not fuzzy alias/keyword hits that need to earn their rank.
          if (article) article._pinnedLandmark = true;
          return article;
        })
        .filter(Boolean);
      const abstracts = await pubmedEfetchAbstracts(ids);
      return attachAbstractsToArticles(articles, abstracts);
    });
  }

  async function semanticScholarSearch(query, { limit = 20 } = {}) {
    return withSourceCache('semantic', { query, limit }, 1800, async () => {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,citationCount,abstract,journal,openAccessPdf,publicationTypes,externalIds`;
      const headers = keys.semantic ? { 'x-api-key': keys.semantic } : {};
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1000));
        try {
          const res = await f(url, { headers, timeout: DEFAULT_TIMEOUTS.semantic });
          if (res.status === 429 || res.status === 503) { lastErr = new Error(`Semantic Scholar ${res.status}`); continue; }
          if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
          const data = await res.json();
          return (data.data || []).map((p) => ({
            uid: p.paperId,
            title: p.title,
            authors: p.authors?.map((a) => ({ name: a.name })),
            pubdate: p.year?.toString(),
            source: p.journal?.name || 'Semantic Scholar',
            pmcrefcount: p.citationCount,
            abstract: p.abstract,
            isFree: !!p.openAccessPdf,
            fullTextUrl: p.openAccessPdf?.url || null,
            pubtype: p.publicationTypes || [],
            doi: p.externalIds?.DOI || null,
            _source: 'semantic',
          }));
        } catch (err) {
          lastErr = err;
        }
      }
      logger.warn({ err: lastErr, query }, 'Semantic Scholar request failed after retries');
      return [];
    });
  }

  async function openAlexSearch(query, { limit = 20 } = {}) {
    return withSourceCache('openalex', { query, limit }, 1800, async () => {
      // mailto puts us in OpenAlex's "polite pool", which has far higher and more
      // reliable rate limits than the anonymous common pool. Without it, bursty
      // multi-query load intermittently 503s, which silently drops the source and
      // reshuffles fused ranking run-to-run (a major source of recall variance).
      const email = keys.ncbiEmail && /@[^@]+\.[^@]+$/.test(keys.ncbiEmail) ? keys.ncbiEmail : null;
      const mailtoParam = email ? `&mailto=${encodeURIComponent(email)}` : '';
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}${mailtoParam}`;
      // OpenAlex free API is not authenticated with a Bearer token (that 401s); only
      // send auth if an explicit key is configured for a future authenticated tier.
      const headers = keys.openalex ? { Authorization: `Bearer ${keys.openalex}` } : {};
      // Retry transient rate-limit/unavailability so a single burst hiccup doesn't
      // drop OpenAlex entirely.
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
        try {
          const res = await f(url, { headers, timeout: DEFAULT_TIMEOUTS.openalex });
          if (res.status === 503 || res.status === 429) { lastErr = new Error(`OpenAlex ${res.status}`); continue; }
          if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
          const data = await res.json();
          recordExternalApiCall('openalex', true);
          return data.results || [];
        } catch (err) {
          lastErr = err;
        }
      }
      recordExternalApiCall('openalex', false);
      throw lastErr || new Error('OpenAlex request failed');
    });
  }

  async function crossrefSearch(query, { limit = 20 } = {}) {
    return withSourceCache('crossref', { query, limit }, 1800, async () => {
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`;
      const res = await f(url, { timeout: DEFAULT_TIMEOUTS.crossref });
      if (!res.ok) throw new Error(`Crossref ${res.status}`);
      const data = await res.json();
      return (data.message?.items || []).map((item) => ({
        uid: item.DOI,
        title: item.title?.[0],
        authors: item.author?.map((a) => ({ name: `${a.given} ${a.family}` })),
        pubdate: item.created?.['date-parts']?.[0]?.[0]?.toString(),
        source: item['container-title']?.[0],
        pmcrefcount: item['is-referenced-by-count'],
        _source: 'crossref',
      }));
    });
  }

  async function meshSuggest(query, { limit = 6 } = {}) {
    return withSourceCache('mesh', { query, limit }, 86400, async () => {
      const url = `https://id.nlm.nih.gov/mesh/lookup/term?label=${encodeURIComponent(query.trim())}&match=contains&limit=${limit}`;
      const res = await f(url, {
        timeout: DEFAULT_TIMEOUTS.mesh,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : [])
        .map((item) => ({
          label: item.label || item.name || '',
          resource: item.resource || '',
          note: item.note || '',
        }))
        .filter((s) => s.label);
    });
  }

  async function claudeMessages(prompt, { model = 'claude-haiku-4-5-20251001', temperature = 0.7, maxOutputTokens = 2048, timeoutMs = DEFAULT_TIMEOUTS.claude, jsonMode = false } = {}) {
    if (!keys.anthropic) throw new Error('Anthropic API key not configured');
    const messages = [{ role: 'user', content: prompt }];
    const body = { model, max_tokens: maxOutputTokens, temperature, messages };
    if (jsonMode) {
      body.system = 'You are a JSON-only API. Respond with a single valid JSON object or array. No markdown fences, no prose, no explanation — only raw JSON.';
      messages.push({ role: 'assistant', content: '{' });
    }
    const res = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'x-api-key': keys.anthropic,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic ${res.status} — ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return jsonMode ? '{' + text : (text || 'No response');
  }

  async function mistralChat(prompt, { model = 'mistral-small-2603', temperature = 0.7, maxOutputTokens, jsonMode = false, timeoutMs = DEFAULT_TIMEOUTS.mistral } = {}) {
    if (!keys.mistral) throw new Error('Mistral API key not configured');
    const body = {
        model,
        messages: [
            { role: 'system', content: jsonMode
                ? 'You are a medical research assistant. Respond with valid JSON only — no markdown fences or prose.'
                : 'You are a medical research assistant. Provide accurate, evidence-based analysis.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: maxOutputTokens ?? (prompt.length > 5000 ? 1500 : 512),
        temperature,
    };
    if (jsonMode) {
        body.response_format = { type: 'json_object' };
    }
    const res = await f('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keys.mistral}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      timeout: timeoutMs,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mistral ${res.status} — ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response';
  }

  async function geminiGenerate(prompt, { model = 'gemini-2.5-flash-lite', temperature = 0.7, maxOutputTokens, timeoutMs = DEFAULT_TIMEOUTS.gemini, jsonMode = false, useAiStudio = false } = {}) {
    if (!keys.gemini) throw new Error('Gemini API key not configured');
    const modelName = model.includes('gemini') ? model : 'gemini-2.5-flash-lite';

    // Routing strategy:
    //   Vertex AI  — bulk enrichment/MCQ generation (covered by £755 GenAI App Builder credit)
    //   AI Studio  — schema-sensitive calls (synopsis generation, strict Zod-validated JSON)
    //                pass useAiStudio: true to force AI Studio regardless of Vertex config
    const gcpProject = keys.gcpProject || process.env.GCP_PROJECT_ID;
    const gcpLocation = keys.gcpLocation || process.env.GCP_LOCATION || 'us-central1';
    const useVertexAI = !useAiStudio && !!(process.env.GOOGLE_APPLICATION_CREDENTIALS && gcpProject);

    let url, headers;
    if (useVertexAI) {
      // Vertex AI endpoint — requires OAuth2 bearer token from service account
      url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProject}/locations/${gcpLocation}/publishers/google/models/${modelName}:generateContent`;
      const accessToken = await getVertexAccessToken();
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };
    } else {
      // Google AI Studio endpoint — billed as "Generative Language API" SKU (not covered by credit)
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': keys.gemini,
      };
    }

    const generationConfig = {
      temperature,
      maxOutputTokens: maxOutputTokens ?? (prompt.length > 5000 ? 2500 : 1024),
      topP: 0.95,
      topK: 40,
    };
    if (jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }
    // Disable thinking — Gemini 2.5 thinking tokens appear in parts[0] with
    // thought:true, which breaks JSON mode parsing. They also count against
    // maxOutputTokens, so on a large structured response they consume the budget
    // and the answer comes back cut off mid-JSON. This was previously applied to
    // Vertex only; prod runs against AI Studio, so topic knowledge extraction kept
    // truncating even after its budget was raised to 8192.
    // Pro models require a non-zero thinking budget, so leave those alone.
    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    };
    if (!/pro/i.test(modelName)) {
      requestBody.generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }
    const res = await f(url, {
      method: 'POST',
      timeout: timeoutMs,
      headers,
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Gemini ${res.status} — ${data.error?.message || 'unknown'}`);
    }
    const data = await res.json();
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }
    // Gemini 2.5 models return "thinking" parts (thought: true) before the actual response.
    // Filter them out so we only return the actual answer text.
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.filter(p => !p.thought).map(p => p.text || '').join('');

    // A response cut off at the token ceiling used to be returned as if complete,
    // so callers reported it as "unparseable JSON" and the real cause stayed
    // hidden. Fail loudly instead -- the provider fallback can then try the next
    // candidate rather than retrying the same truncation.
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(
        `Gemini stopped early (finishReason: ${candidate.finishReason}); `
        + `returned ${text.length} chars against maxOutputTokens ${generationConfig.maxOutputTokens}`,
      );
    }
    return text || 'No response';
  }


  return {
    pubmedSearch,
    pubmedFetchByIds,
    pubmedEsearch,
    pubmedEsummary,
    pubmedEfetchAbstracts,
    buildPubmedEfetchUrl,
    semanticScholarSearch,
    openAlexSearch,
    crossrefSearch,
    meshSuggest,
    claudeMessages,
    mistralChat,
    geminiGenerate,
  };
}

module.exports = { buildProxyService, clearInFlightRequests: () => inFlight.clear() };
