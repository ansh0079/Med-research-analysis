'use strict';

const PAGE_TYPES = new Set([
    'research_article',
    'guideline',
    'news',
    'patient_forum',
    'commercial',
    'login_or_payment',
    'educational',
    'unknown',
]);

const EVIDENCE_LEVELS = new Set(['high', 'moderate', 'low', 'unclear']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'unknown']);
const ACTIONS = new Set(['search_evidence', 'generate_mcqs', 'create_case', 'safety_review', 'save_for_later']);

function cleanText(value, max = 2000) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanArray(value, maxItems = 8, maxChars = 280) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    for (const item of value) {
        const clean = cleanText(item, maxChars);
        const key = clean.toLowerCase();
        if (!clean || seen.has(key)) continue;
        seen.add(key);
        out.push(clean);
        if (out.length >= maxItems) break;
    }
    return out;
}

function cleanEnum(value, allowed, fallback) {
    const clean = cleanText(value, 80);
    return allowed.has(clean) ? clean : fallback;
}

function clampConfidence(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0.4;
    return Math.max(0, Math.min(1, n));
}

function normalizePagePayload(page = {}) {
    return {
        url: cleanText(page.url, 1000),
        title: cleanText(page.title || 'Captured webpage', 300),
        canonicalUrl: page.canonicalUrl ? cleanText(page.canonicalUrl, 1000) : null,
        description: page.description ? cleanText(page.description, 500) : null,
        siteName: page.siteName ? cleanText(page.siteName, 160) : null,
        capturedAt: cleanText(page.capturedAt, 80) || new Date().toISOString(),
        text: cleanText(page.text, 18000),
        selectionText: page.selectionText ? cleanText(page.selectionText, 6000) : null,
        headings: cleanArray(page.headings, 12, 180),
        keywords: cleanArray(page.keywords, 16, 80),
        medicalSignals: cleanArray(page.medicalSignals, 10, 80),
        wordCount: Math.max(0, Math.min(200000, Number(page.wordCount) || 0)),
        readingTimeMinutes: Math.max(0, Math.min(240, Number(page.readingTimeMinutes) || 0)),
        safetySignals: {
            hasPasswordField: Boolean(page.safetySignals?.hasPasswordField),
            hasPaymentField: Boolean(page.safetySignals?.hasPaymentField),
            hasForms: Boolean(page.safetySignals?.hasForms),
            externalLinkCount: Math.max(0, Math.min(5000, Number(page.safetySignals?.externalLinkCount) || 0)),
        },
    };
}

function parseJsonObject(text) {
    const raw = String(text || '').replace(/```json/gi, '```').replace(/```/g, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) {
        throw new Error('LLM response did not include a JSON object');
    }
    return JSON.parse(raw.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
}

function normalizeInference(raw = {}, page = {}) {
    const pageType = cleanEnum(raw.pageType, PAGE_TYPES, 'unknown');
    const evidenceLevel = cleanEnum(raw.evidenceLevel, EVIDENCE_LEVELS, 'unclear');
    const riskLevel = cleanEnum(raw.safetyAssessment?.riskLevel || raw.riskLevel, RISK_LEVELS, 'unknown');
    const suggestedActions = cleanArray(raw.suggestedActions, 5, 80).filter((item) => ACTIONS.has(item));
    const topic = cleanText(raw.clinicalTopic, 200);
    const searchQuery = cleanText(raw.searchQuery, 400)
        || cleanArray([topic, ...(page.keywords || [])], 8, 80).join(' ');

    return {
        pageType,
        clinicalTopic: topic || null,
        confidence: clampConfidence(raw.confidence),
        plainLanguageSummary: cleanText(raw.plainLanguageSummary, 900),
        evidenceLevel,
        pico: {
            population: cleanText(raw.pico?.population, 300) || null,
            intervention: cleanText(raw.pico?.intervention, 300) || null,
            comparison: cleanText(raw.pico?.comparison, 300) || null,
            outcomes: cleanArray(raw.pico?.outcomes, 8, 160),
        },
        keyClaims: cleanArray(raw.keyClaims, 8, 300),
        redFlags: cleanArray(raw.redFlags, 8, 220),
        safetyAssessment: {
            riskLevel,
            concerns: cleanArray(raw.safetyAssessment?.concerns || raw.concerns, 8, 220),
            privacyWarning: cleanText(raw.safetyAssessment?.privacyWarning, 260) || null,
        },
        searchQuery,
        mcqFocus: cleanArray(raw.mcqFocus, 8, 180),
        caseScenarioSeed: cleanText(raw.caseScenarioSeed, 1000) || null,
        suggestedActions: suggestedActions.length ? suggestedActions : ['search_evidence'],
    };
}

function buildWebpageInferencePrompt(page) {
    const textForModel = page.selectionText || page.text;
    return `You are Signal MD's safe-browsing medical webpage analyst.

Analyze the captured webpage for what it appears to contain. Be conservative: do not invent results, effect sizes, diagnoses, recommendations, authors, or publication details that are not visible in the provided text.

Classify safety separately from evidence quality. If the page includes login, payment, portal, account, or forms, call that out as a privacy concern. If the content is commercial, patient forum, non-peer-reviewed news, or unsupported medical claims, flag it clearly.

Return ONLY valid JSON:
{
  "pageType": "research_article | guideline | news | patient_forum | commercial | login_or_payment | educational | unknown",
  "clinicalTopic": "short topic or null",
  "confidence": 0.0,
  "plainLanguageSummary": "2-4 concise sentences",
  "evidenceLevel": "high | moderate | low | unclear",
  "pico": {
    "population": "string or null",
    "intervention": "string or null",
    "comparison": "string or null",
    "outcomes": ["outcome"]
  },
  "keyClaims": ["claim visible in the text"],
  "redFlags": ["safety or credibility concern"],
  "safetyAssessment": {
    "riskLevel": "low | medium | high | unknown",
    "concerns": ["concern"],
    "privacyWarning": "string or null"
  },
  "searchQuery": "best medical evidence search query",
  "mcqFocus": ["teachable concept"],
  "caseScenarioSeed": "case/scenario seed grounded in the page or null",
  "suggestedActions": ["search_evidence", "generate_mcqs", "create_case", "safety_review", "save_for_later"]
}

WEBPAGE METADATA:
Title: ${page.title}
URL: ${page.url || 'not provided'}
Canonical: ${page.canonicalUrl || 'not provided'}
Site: ${page.siteName || 'not provided'}
Description: ${page.description || 'not provided'}
Headings: ${page.headings.join(' | ') || 'none'}
Extractor signals: ${page.medicalSignals.join(', ') || 'none'}
Extractor keywords: ${page.keywords.join(', ') || 'none'}
Safety markers: password=${page.safetySignals.hasPasswordField}, payment=${page.safetySignals.hasPaymentField}, forms=${page.safetySignals.hasForms}, externalLinks=${page.safetySignals.externalLinkCount}

VISIBLE WEBPAGE TEXT:
${textForModel.slice(0, 12000)}`;
}

async function inferWebpageContent({ ai, provider, model, page }) {
    if (!ai?.callStructured && !ai?.callText) {
        throw new Error('AI service is not available');
    }
    const normalizedPage = normalizePagePayload(page);
    if (!normalizedPage.text || normalizedPage.text.length < 40) {
        const err = new Error('At least 40 characters of extracted webpage text are required');
        err.status = 400;
        throw err;
    }
    const prompt = buildWebpageInferencePrompt(normalizedPage);
    const raw = ai.callStructured
        ? await ai.callStructured(prompt, provider, model, { temperature: 0.1, jsonMode: true, maxOutputTokens: 1400 })
        : parseJsonObject(await ai.callText(prompt, provider, model, { temperature: 0.1, maxOutputTokens: 1400 }));
    return {
        inference: normalizeInference(raw, normalizedPage),
        page: {
            url: normalizedPage.url,
            title: normalizedPage.title,
            wordCount: normalizedPage.wordCount,
            capturedAt: normalizedPage.capturedAt,
        },
        raw: process.env.NODE_ENV === 'development' ? raw : undefined,
    };
}

module.exports = {
    buildWebpageInferencePrompt,
    inferWebpageContent,
    normalizeInference,
    normalizePagePayload,
};
