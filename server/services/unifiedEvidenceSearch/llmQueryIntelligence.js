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
        const parsed = await ai.callStructured(prompt, provider, model, { temperature: 0.0, maxOutputTokens: 300, timeoutMs: 4000 });
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
    reformulationCacheKey,
    reformulateQueryForPubMed,
    picoCacheKey,
    decomposePico,
};
