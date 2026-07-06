'use strict';

const {
    buildPicoExtractionPrompt,
    buildScreeningAssistPrompt,
} = require('../../prompts');

function registerReviewMethodologyRoutes(app, {
    db,
    reviews,
    requireJson,
    requireAuthJwt,
    requirePaidFeature,
    rateLimit,
    validateBody,
    schemas,
    requireReviewAccess,
    helpers,
}) {
    const { callProvider } = helpers;

    app.post('/api/reviews/pico/extract', requireJson, requireAuthJwt, requirePaidFeature('pico_extraction'), rateLimit(8, 60), validateBody(schemas.reviewPicoExtract), async (req, res) => {
        try {
            const articles = req.body.articles || [];
            const provider = req.body.provider || 'auto';
            const results = [];

            for (const article of articles) {
                const articleId = String(article.uid || '').trim();
                if (!articleId) continue;

                const cached = await reviews.getPico(articleId);
                if (cached) {
                    results.push({ articleId, extraction: cached.extraction, cached: true, confidence: cached.confidence || 0 });
                    continue;
                }

                const prompt = buildPicoExtractionPrompt(article);
                const { text, provider: usedProvider, model } = await callProvider(prompt, provider);
                const parsed = reviews.parseJsonBlock(text);
                const normalized = reviews.normalizePicoExtraction(parsed || {});
                await reviews.upsertPico(articleId, normalized, usedProvider, model, normalized.confidence);
                results.push({ articleId, extraction: normalized, cached: false, confidence: normalized.confidence });
            }

            await db.logEvent('review:pico_extract', req.sessionId, { count: results.length });
            res.json({ results });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/articles/:articleId/rob', requireJson, requireReviewAccess, requirePaidFeature('pico_extraction'), rateLimit(6, 60), async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const article = articles.find((a) => a.article_id === req.params.articleId);
            if (!article) return res.status(404).json({ error: 'Article not found in review' });

            const ad = article.article_data || {};
            const title = ad.title || req.params.articleId;
            const abstract = ad.abstract || ad.snippet || '';
            const studyDesign = ad.pubtype?.[0] || 'unknown';

            const prompt = `You are a systematic review methodologist. Assess the risk of bias for this study using the Cochrane RoB 2 framework.

Study: "${title}"
Study design: ${studyDesign}
Abstract: ${abstract.slice(0, 1200)}

For each domain, provide:
- judgement: "low" | "some_concerns" | "high"
- rationale: 1 sentence

Return ONLY valid JSON:
{
  "randomisation": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "allocation_concealment": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "blinding_participants": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "blinding_outcome": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "incomplete_outcomes": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "selective_reporting": {"judgement": "low|some_concerns|high", "rationale": "..."},
  "overall": {"judgement": "low|some_concerns|high", "rationale": "One overall judgement sentence"}
}`;

            const { text, provider: usedProvider, model } = await callProvider(prompt, req.body.provider || 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed) return res.status(422).json({ error: 'AI returned non-JSON response for RoB assessment' });

            const validJudgements = new Set(['low', 'some_concerns', 'high']);
            const domains = ['randomisation', 'allocation_concealment', 'blinding_participants', 'blinding_outcome', 'incomplete_outcomes', 'selective_reporting', 'overall'];
            const rob = {};
            for (const domain of domains) {
                const d = parsed[domain] || {};
                rob[domain] = {
                    judgement: validJudgements.has(d.judgement) ? d.judgement : 'some_concerns',
                    rationale: String(d.rationale || 'Insufficient information').slice(0, 400),
                };
            }

            await db.logEvent('review:rob_assessment', req.sessionId, { reviewId: req.params.id, articleId: req.params.articleId });
            res.json({ rob, provider: usedProvider, model, articleId: req.params.articleId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/articles/:articleId/consort', requireJson, requireReviewAccess, requirePaidFeature('pico_extraction'), rateLimit(6, 60), async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const article = articles.find((a) => a.article_id === req.params.articleId);
            if (!article) return res.status(404).json({ error: 'Article not found in review' });

            const ad = article.article_data || {};
            const title = ad.title || req.params.articleId;
            const abstract = ad.abstract || ad.snippet || '';
            const studyDesign = (ad.pubtype || []).join(', ') || 'unknown';

            const prompt = `You are a clinical trials methodologist. Assess this study's adherence to the CONSORT 2010 reporting checklist.

Study: "${title}"
Reported study design: ${studyDesign}
Abstract: ${abstract.slice(0, 1500)}

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
  "rctWarning": "null or a message if the design appears non-RCT",
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

            const { text, provider: usedProvider, model } = await callProvider(prompt, req.body.provider || 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed) return res.status(422).json({ error: 'AI returned non-JSON response for CONSORT assessment' });

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

            await db.logEvent('review:consort_assessment', req.sessionId, { reviewId: req.params.id, articleId: req.params.articleId });
            res.json({
                consort: {
                    isRct: Boolean(parsed.isRct),
                    rctWarning: typeof parsed.rctWarning === 'string' && parsed.rctWarning !== 'null' ? parsed.rctWarning : null,
                    overallAdherence,
                    overallSummary: String(parsed.overallSummary || '').slice(0, 600),
                    domains,
                    adequateCount,
                    totalDomains: domainKeys.length,
                },
                provider: usedProvider,
                model,
                articleId: req.params.articleId,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/grade-table', requireJson, requireReviewAccess, requirePaidFeature('pico_extraction'), rateLimit(4, 60), async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const included = articles.filter((a) => a.screening_status === 'included');
            if (included.length === 0) return res.status(400).json({ error: 'No included articles - screen articles first' });

            const review = await reviews.getProject(req.params.id);
            const question = review?.question || 'Clinical question not specified';

            const articleSummaries = included.slice(0, 12).map((a, i) => {
                const ad = a.article_data || {};
                const pico = a.extraction || {};
                return `[${i + 1}] "${ad.title || a.article_id}"
  Design: ${ad.pubtype?.[0] || pico.studyDesign || 'unknown'}, n=${pico.sampleSize || ad.sampleSize || '?'}
  Population: ${pico.population || 'not extracted'}
  Outcome: ${Array.isArray(pico.outcomes) ? pico.outcomes[0] : pico.outcomes || 'not extracted'}`;
            }).join('\n');

            const prompt = `You are a systematic review methodologist. Generate a GRADE Summary of Findings (SoF) table for this systematic review.

Clinical question: ${question}
Included studies (n=${included.length}):
${articleSummaries}

Return ONLY valid JSON:
{
  "question": "PICO-formatted clinical question",
  "outcomes": [
    {
      "name": "outcome name",
      "studyCount": 3,
      "participantCount": 1200,
      "effect": "RR 0.85 (95% CI 0.72-1.01) or narrative if no meta-analysis",
      "certainty": "HIGH|MODERATE|LOW|VERY_LOW",
      "certaintyDowngrade": ["risk of bias", "inconsistency", "imprecision"],
      "certaintyUpgrade": [],
      "comment": "brief clinical interpretation"
    }
  ],
  "overallCertainty": "HIGH|MODERATE|LOW|VERY_LOW",
  "limitations": "Key limitation of the body of evidence in 1-2 sentences"
}`;

            const { text, provider: usedProvider, model } = await callProvider(prompt, req.body.provider || 'auto');
            const parsed = reviews.parseJsonBlock(text);
            if (!parsed) return res.status(422).json({ error: 'AI returned non-JSON response for GRADE table' });

            await db.logEvent('review:grade_table', req.sessionId, { reviewId: req.params.id, includedCount: included.length });
            res.json({ gradeTable: parsed, provider: usedProvider, model, includedCount: included.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/screening/assist', requireJson, requireAuthJwt, requirePaidFeature('screening_assist'), rateLimit(8, 60), validateBody(schemas.reviewScreenAssist), async (req, res) => {
        try {
            const { criteria, article, provider = 'auto' } = req.body;
            const prompt = buildScreeningAssistPrompt(criteria, article);
            const { text } = await callProvider(prompt, provider);
            const parsed = reviews.parseJsonBlock(text) || {};
            const decision = ['include', 'exclude', 'uncertain'].includes(parsed.decision) ? parsed.decision : 'uncertain';
            res.json({
                decision,
                rationale: String(parsed.rationale || 'Insufficient information for high-confidence screening.'),
                matchedInclusion: Array.isArray(parsed.matchedInclusion) ? parsed.matchedInclusion : [],
                triggeredExclusion: Array.isArray(parsed.triggeredExclusion) ? parsed.triggeredExclusion : [],
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerReviewMethodologyRoutes };
