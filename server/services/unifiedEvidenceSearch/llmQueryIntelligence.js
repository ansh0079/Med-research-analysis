const crypto = require('crypto');
const logger = require('../../config/logger');
const { getPromptVersion } = require('../../prompts/promptVersions');

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
    const { getSharedAiService } = require('../aiService');
    const { resolveProvider } = require('../../utils/aiProvider');
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    if (!provider) return null;

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

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const started = Date.now();
    try {
        const raw = await ai.callText(prompt, provider, model, { temperature: 0.1, maxOutputTokens: 200, timeoutMs: 8000 });
        const cleaned = String(raw || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
        if (cleaned.length < 5 || cleaned.length > 400) return null;
        if (cache && typeof cache.set === 'function') {
            await Promise.resolve(cache.set(cacheKey, cleaned, 86400)).catch((err) => {
                logger.debug({ err, cacheKey }, 'query reformulation cache write failed; will re-ask the model');
            });
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

/**
 * How long to wait for PICO decomposition before giving up and using the deterministic parser.
 *
 * This ran at 4000ms against gemini-2.5-flash, whose comparable calls answer in roughly 6 seconds, so
 * 220 of 386 attempts were aborted mid-flight and every one of those searches fell back to the
 * simpler query parser. The deadline was below the model's normal response time.
 *
 * Raising it is close to free here: the call is started in parallel with the multi-source evidence
 * fetch and only awaited once that fetch returns, so it adds wall-clock time only when three
 * external APIs answer faster than the model does. It stays bounded - a hung provider must not hold
 * a search open - and is overridable so the figure can follow the measured latency without a deploy.
 */
function picoTimeoutMs(env = process.env) {
    const raw = Number(env.SEARCH_PICO_TIMEOUT_MS);
    return Number.isFinite(raw) && raw >= 1000 ? raw : 6000;
}

async function decomposePico(query, serverConfig, fetchImpl, cache = null) {
    const { getSharedAiService } = require('../aiService');
    const { resolveProvider } = require('../../utils/aiProvider');
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

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    try {
        // Labelled so it is attributable in the ops report. Unlabelled, this call and the intent
        // classifier both landed in 'unspecified' and their timeouts hid every other failure.
        const parsed = await ai.callStructured(prompt, provider, model, {
            temperature: 0.0, maxOutputTokens: 300, timeoutMs: picoTimeoutMs(), usage: { operation: 'pico_extraction' },
        });
        if (parsed && typeof parsed === 'object' && parsed.confidence != null) {
            if (cache && typeof cache.set === 'function') {
                await Promise.resolve(cache.set(cacheKey, parsed, 86400)).catch((err) => {
                    logger.debug({ err, cacheKey }, 'intent classification cache write failed; will re-ask the model');
                });
            }
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

module.exports = {
    picoTimeoutMs,
    reformulationCacheKey,
    reformulateQueryForPubMed,
    picoCacheKey,
    decomposePico,
};
