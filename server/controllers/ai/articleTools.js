'use strict';

const crypto = require('crypto');
const { TEMPERATURE, MAX_OUTPUT_TOKENS } = require('../../services/aiService');
const { buildPicoExtractionPrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { limitBodySize } = require('../../utils/validation');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { getPromptVersion } = require('../../prompts/promptVersions');

function registerArticleToolRoutes(app, deps) {
    const {
        db, cache, serverConfig, ai,
        requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, rateLimit,
    } = deps;

    app.post('/api/ai/pico', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(20, 60), async (req, res) => {
        const { article, provider = 'auto', model } = req.body;
        if (!article || typeof article !== 'object' || !article.title) {
            return res.status(400).json({ error: 'article with title is required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const articleId = article.uid || article.pmid || article.doi || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
        const picoPromptVersion = getPromptVersion('pico_extraction');
        const cacheKey = `pico:${articleId}:${selectedModel}:pv:${picoPromptVersion}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const prompt = buildPicoExtractionPrompt(article);
            let extraction = await ai.callStructured(prompt, selectedProvider, selectedModel, {
                temperature: TEMPERATURE.synthesis,
                maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
            });
            if (!extraction || typeof extraction !== 'object') {
                return res.status(502).json({ error: 'AI returned malformed PICO data. Please retry.' });
            }

            const validated = validateAiOutput('pico_extraction', extraction, { allowDegrade: true });
            if (!validated.ok && !validated.degraded) {
                return res.status(502).json({ error: 'PICO validation failed', details: validated.errors });
            }
            extraction = validated.data || validated.degraded;

            const result = { extraction, articleId, cached: false };
            await cache.setAsync(cacheKey, result, 7200);
            await db.logEvent('pico_extract', req.sessionId, { articleId, provider: selectedProvider });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'PICO extraction error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/consort', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(15, 60), async (req, res) => {
        const { article, provider = 'auto', model } = req.body;
        if (!article || typeof article !== 'object' || !article.title) {
            return res.status(400).json({ error: 'article with title is required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const articleId = article.uid || article.pmid || article.doi || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
        const cacheKey = `consort:${articleId}:${selectedModel}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const studyDesign = (article.pubtype || []).join(', ') || 'unknown';
            const abstract = (article.abstract || article.snippet || '').slice(0, 1500);

            const prompt = `You are a clinical trials methodologist. Assess this study's adherence to the CONSORT 2010 reporting checklist.

Study: "${article.title}"
Reported study design: ${studyDesign}
Abstract: ${abstract}

First determine if this is an RCT. Then for each of the 10 key CONSORT domains below, assess whether the item is adequately reported in the abstract/title (you can only judge from what is provided).

Domains to assess:
1. title_abstract: Clear identification as RCT in title; structured abstract with key elements
2. eligibility_criteria: Participant eligibility criteria, settings, and locations
3. interventions: Sufficient detail on interventions for replication
4. outcomes: Pre-specified primary and secondary outcomes
5. sample_size: How sample size was determined
6. randomisation: Method of sequence generation and allocation concealment
7. blinding: Who was blinded and how
8. statistical_methods: Primary and secondary analysis methods
9. harms: Important adverse events or side effects
10. trial_registration: Trial registration number and registry name

For each domain: "adequate" (clearly reported), "partial" (mentioned but incomplete), or "not_reported" (absent/cannot assess from abstract).

Return ONLY valid JSON:
{
  "isRct": true | false,
  "rctWarning": null,
  "overallAdherence": "high" | "moderate" | "low",
  "overallSummary": "1-2 sentence assessment of overall CONSORT adherence",
  "domains": {
    "title_abstract":       {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "eligibility_criteria": {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "interventions":        {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "outcomes":             {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "sample_size":          {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "randomisation":        {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "blinding":             {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "statistical_methods":  {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "harms":                {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "trial_registration":   {"adherence": "adequate|partial|not_reported", "rationale": "..."}
  }
}`;

            const rawText = await ai.callText(prompt, selectedProvider, selectedModel);

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed CONSORT data. Please retry.' });
            }

            const validAdherence = new Set(['adequate', 'partial', 'not_reported']);
            const domainKeys = ['title_abstract', 'eligibility_criteria', 'interventions', 'outcomes', 'sample_size', 'randomisation', 'blinding', 'statistical_methods', 'harms', 'trial_registration'];
            const domains = {};
            for (const key of domainKeys) {
                const d = parsed.domains?.[key] || {};
                domains[key] = {
                    adherence: validAdherence.has(d.adherence) ? d.adherence : 'not_reported',
                    rationale: String(d.rationale || 'Insufficient information to assess from abstract').slice(0, 400),
                };
            }
            const adequateCount = Object.values(domains).filter((d) => d.adherence === 'adequate').length;
            const overallAdherence = ['high', 'moderate', 'low'].includes(parsed.overallAdherence)
                ? parsed.overallAdherence
                : adequateCount >= 7 ? 'high' : adequateCount >= 4 ? 'moderate' : 'low';

            const consort = {
                isRct: Boolean(parsed.isRct),
                rctWarning: typeof parsed.rctWarning === 'string' && parsed.rctWarning !== 'null' ? parsed.rctWarning : null,
                overallAdherence,
                overallSummary: String(parsed.overallSummary || '').slice(0, 600),
                domains,
                adequateCount,
                totalDomains: domainKeys.length,
            };

            const result = { consort, articleId, provider: selectedProvider, model: selectedModel };
            await cache.setAsync(cacheKey, result, 7200);
            await db.logEvent('consort_assessment', req.sessionId, { articleId, provider: selectedProvider });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'CONSORT assessment error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/compare', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(10, 60), async (req, res) => {
        const { articleA, articleB, topic, provider = 'auto', model } = req.body;
        if (!articleA?.title || !articleB?.title) {
            return res.status(400).json({ error: 'articleA and articleB with titles are required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const idA = articleA.uid || articleA.pmid || crypto.createHash('md5').update(articleA.title).digest('hex').slice(0, 10);
        const idB = articleB.uid || articleB.pmid || crypto.createHash('md5').update(articleB.title).digest('hex').slice(0, 10);
        const cacheKey = `compare:${[idA, idB].sort().join(':')}:${selectedModel}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const summarise = (a) => {
                const year = a.pubdate?.slice(0, 4) || a.year || 'unknown';
                const pubtypes = (a.pubtype || []).join(', ') || 'not reported';
                return `Title: ${a.title}\nJournal: ${a.journal || a.source || 'unknown'} (${year})\nStudy type: ${pubtypes}\nAbstract: ${(a.abstract || '').slice(0, 1200)}`;
            };

            const prompt = `You are a clinical methodologist comparing two research studies head-to-head.${topic ? ` Clinical context: "${topic}".` : ''}

STUDY A:
${summarise(articleA)}

STUDY B:
${summarise(articleB)}

Compare these two studies across every dimension below. Be precise and clinically useful.

Return ONLY valid JSON:
{
  "overallVerdict": "1-2 sentence summary of which study carries more clinical weight and why",
  "studyDesign": {
    "A": "Study design classification",
    "B": "Study design classification",
    "winner": "A" | "B" | "tie",
    "rationale": "Why one design is stronger for this question"
  },
  "population": {
    "A": "Population description",
    "B": "Population description",
    "comparability": "comparable" | "partially_comparable" | "incomparable",
    "note": "Key differences that limit direct comparison"
  },
  "intervention": {
    "A": "Intervention or exposure",
    "B": "Intervention or exposure",
    "equivalence": "same" | "similar" | "different"
  },
  "primaryOutcome": {
    "A": "Primary outcome and headline result",
    "B": "Primary outcome and headline result",
    "outcomeCompatibility": "same" | "related" | "different",
    "note": "Whether the outcomes are comparable enough to draw conclusions"
  },
  "riskOfBias": {
    "A": "HIGH" | "MODERATE" | "LOW",
    "B": "HIGH" | "MODERATE" | "LOW",
    "A_concerns": ["main bias concern"],
    "B_concerns": ["main bias concern"]
  },
  "sampleSize": {
    "A": "n= or 'not reported'",
    "B": "n= or 'not reported'",
    "powerNote": "Whether either study appears underpowered"
  },
  "keyConflicts": ["Where the two studies disagree on a specific finding or conclusion"],
  "keyAgreements": ["Where both studies point in the same direction"],
  "clinicalBottomLine": "Practical synthesis: what should a clinician take from reading both papers together?",
  "whichToTrust": {
    "recommendation": "A" | "B" | "both_equally" | "neither",
    "rationale": "1-2 sentence justification for which study to weight more heavily in practice"
  }
}`;

            const rawText = await ai.callText(prompt, selectedProvider, selectedModel);

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed comparison data. Please retry.' });
            }

            const result = {
                comparison: parsed,
                articleIdA: idA,
                articleIdB: idB,
                provider: selectedProvider,
                model: selectedModel,
            };
            await cache.setAsync(cacheKey, result, 7200);
            await db.logEvent('article_comparison', req.sessionId, { articleIdA: idA, articleIdB: idB, provider: selectedProvider });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Article comparison error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerArticleToolRoutes };
