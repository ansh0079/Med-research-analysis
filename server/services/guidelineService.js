// ==========================================
// Guideline Alignment Service
// Cross-references synthesized evidence against clinical guidelines
// ==========================================

const { fetchWithTimeout: fetch } = require('../utils/fetch');
const { PINNED_MODELS } = require('./aiService');

/**
 * Search PubMed for relevant clinical guidelines on a topic.
 * Returns up to 5 guideline articles with titles and abstracts.
 */
async function searchGuidelines(topic, ncbiKey, ncbiEmail) {
  const apiKeyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';
  const emailParam = ncbiEmail ? `&email=${ncbiEmail}` : '';

  // Build query: topic + guideline publication types
  const guidelineTypes = '(Guideline[pt] OR "Practice Guideline"[pt] OR "Consensus Development Conference"[pt])';
  const query = `(${topic}) AND ${guidelineTypes}`;

  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json&sort=date${apiKeyParam}${emailParam}`;
    const searchRes = await fetch(searchUrl, { timeout: 15000 });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${apiKeyParam}${emailParam}`;
    const summaryRes = await fetch(summaryUrl, { timeout: 15000 });
    if (!summaryRes.ok) return [];

    const summaryData = await summaryRes.json();
    const results = [];
    for (const uid of ids) {
      const doc = summaryData?.result?.[uid];
      if (doc) {
        results.push({
          uid,
          title: doc.title || '',
          source: doc.source || '',
          pubdate: doc.pubdate || '',
          authors: (doc.authors || []).map(a => a.name).join(', '),
          doi: doc.elocationid || '',
        });
      }
    }
    return results;
  } catch (err) {
    console.warn('[Guideline] Search failed:', err.message);
    return [];
  }
}

/**
 * Build an AI prompt to compare synthesized evidence against guideline recommendations.
 */
function buildAlignmentPrompt(topic, synthesisConsensus, guidelines, articles) {
  const guidelineText = guidelines.map((g, i) =>
    `${i + 1}. ${g.title} (${g.source}, ${g.pubdate})`
  ).join('\n');

  const articleSummary = articles.slice(0, 10).map((a, i) =>
    `${i + 1}. ${a.title} — ${a._quality?.grade ? `Quality ${a._quality.grade}` : 'Quality unknown'}`
  ).join('\n');

  return `You are a clinical evidence reviewer. Compare the following SYNTHESIZED EVIDENCE against current CLINICAL GUIDELINES on the same topic.

TOPIC: ${topic}

SYNTHESIZED EVIDENCE:
${synthesisConsensus}

RELEVANT CLINICAL GUIDELINES:
${guidelineText || 'No specific guidelines found in search.'}

STUDIES INCLUDED IN SYNTHESIS:
${articleSummary}

Analyze and return STRICT JSON only:
{
  "aligned": boolean,
  "alignmentScore": number (0-100),
  "guidelinesFound": number,
  "contradictions": [
    {
      "guideline": "guideline title",
      "recommendation": "what the guideline says",
      "synthesisFinding": "what the new evidence says",
      "severity": "major" | "minor" | "nuanced",
      "explanation": "brief explanation"
    }
  ],
  "supportsGuidelines": [
    {
      "guideline": "guideline title",
      "finding": "how the new evidence supports it"
    }
  ],
  "gaps": [
    "areas where guidelines exist but new evidence is insufficient"
  ],
  "summary": "one-paragraph clinical interpretation"
}

Be conservative: only flag as "contradiction" if the evidence genuinely conflicts with a specific guideline recommendation. "Nuanced" means the evidence adds new context but doesn't overturn guidance.`;
}

/**
 * Check alignment between synthesized evidence and clinical guidelines.
 * @param {string} topic
 * @param {string} synthesisConsensus
 * @param {Array} articles
 * @param {object} keys { ncbiKey, ncbiEmail }
 * @param {object} aiService { callGemini, callMistralAI }
 * @returns {Promise<object>}
 */
async function checkGuidelineAlignment(topic, synthesisConsensus, articles, keys, aiService) {
  const guidelines = await searchGuidelines(topic, keys.ncbiKey, keys.ncbiEmail);

  const prompt = buildAlignmentPrompt(topic, synthesisConsensus, guidelines, articles);

  let rawText;
  if (keys.gemini) {
    rawText = await aiService.callGemini(prompt, PINNED_MODELS.geminiQuality);
  } else if (keys.mistral) {
    rawText = await aiService.callMistralAI(prompt, PINNED_MODELS.mistral);
  } else {
    throw new Error('No AI provider configured for guideline alignment');
  }

  // Parse JSON
  let alignment;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    alignment = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    alignment = {
      aligned: null,
      alignmentScore: 0,
      guidelinesFound: guidelines.length,
      contradictions: [],
      supportsGuidelines: [],
      gaps: ['Could not parse AI alignment response.'],
      summary: rawText.slice(0, 500),
    };
  }

  return {
    ...alignment,
    guidelinesFound: guidelines.length,
    guidelineList: guidelines,
    checkedAt: new Date().toISOString(),
  };
}

const logger = require('../config/logger');

const _discoveryInFlight = new Map();
const _discoveryEmpty = new Map();
const EMPTY_CACHE_TTL = 30 * 60 * 1000;

async function fetchAbstracts(pmids, ncbiKey, ncbiEmail) {
  if (!pmids.length) return [];
  const apiKeyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';
  const emailParam = ncbiEmail ? `&email=${ncbiEmail}` : '';
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=xml${apiKeyParam}${emailParam}`;
  const res = await fetch(url, { timeout: 20000 });
  if (!res.ok) return [];
  const xml = await res.text();
  const articles = [];
  const articleBlocks = xml.split('<PubmedArticle>').slice(1);
  for (const block of articleBlocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = block.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
    const abstractMatch = block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    const journalMatch = block.match(/<Title>([^<]+)<\/Title>/);
    const yearMatch = block.match(/<PubDate>\s*<Year>(\d{4})<\/Year>/);
    const abstractText = abstractMatch
      ? abstractMatch.map(m => m.replace(/<[^>]+>/g, '').trim()).join(' ')
      : '';
    articles.push({
      pmid: pmidMatch ? pmidMatch[1] : '',
      title: titleMatch ? titleMatch[1] : '',
      abstract: abstractText,
      journal: journalMatch ? journalMatch[1] : '',
      year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    });
  }
  return articles;
}

function buildGuidelineExtractionPrompt(topic, articles) {
  const articlesText = articles
    .filter(a => a.abstract)
    .map((a, i) => `${i + 1}. [PMID ${a.pmid}] "${a.title}" (${a.journal}, ${a.year || 'unknown year'})\nAbstract: ${a.abstract}`)
    .join('\n\n');

  return `You are a clinical guideline extraction specialist. Extract structured guideline recommendations from the following PubMed guideline publications on the topic: "${topic}".

GUIDELINE PUBLICATIONS:
${articlesText}

For each distinct recommendation found, extract it as a JSON object. Return a JSON array of objects with these fields:
- "sourceBody": the issuing organization (e.g., "AHA/ACC", "ESC", "WHO", "NICE", "IDSA"). Infer from the journal, title, or abstract. If unclear, use the journal name.
- "sourceYear": publication year (integer or null)
- "sourceUrl": construct as "https://pubmed.ncbi.nlm.nih.gov/PMID/" using the article PMID
- "recommendationText": the specific clinical recommendation (1-3 sentences, faithful to the source)
- "recommendationStrength": strength/class if stated (e.g., "Class I", "Strong", "Grade A"), or null
- "recommendationCertainty": level of evidence if stated (e.g., "Level A", "Moderate", "High"), or null
- "population": target patient population, or null
- "intervention": the intervention or action recommended, or null
- "cautions": any caveats, contraindications, or warnings, or null

Rules:
- Extract ONLY recommendations explicitly stated or clearly implied in the abstracts — do not invent recommendations
- One article may contain multiple distinct recommendations — extract each separately
- If an abstract contains no extractable recommendations, skip it
- Return an empty array [] if no recommendations can be extracted

Return ONLY the JSON array, no markdown fences or surrounding text.`;
}

async function discoverGuidelinesForTopic(topic, { db, serverConfig, aiService }) {
  const normalized = db.normalizeTopic(topic);
  if (_discoveryInFlight.has(normalized)) return _discoveryInFlight.get(normalized);
  const emptyAt = _discoveryEmpty.get(normalized);
  if (emptyAt && Date.now() - emptyAt < EMPTY_CACHE_TTL) return [];

  const promise = (async () => {
    try {
      const ncbiKey = serverConfig.keys.ncbi;
      const ncbiEmail = serverConfig.keys.ncbiEmail;
      const summaries = await searchGuidelines(topic, ncbiKey, ncbiEmail);
      if (!summaries.length) {
        logger.info({ topic }, '[GuidelineDiscovery] No guideline publications found on PubMed');
        _discoveryEmpty.set(normalized, Date.now());
        return [];
      }
      const pmids = summaries.map(s => s.uid).filter(Boolean);
      const articles = await fetchAbstracts(pmids, ncbiKey, ncbiEmail);
      const withAbstracts = articles.filter(a => a.abstract && a.abstract.length > 50);
      if (!withAbstracts.length) {
        logger.info({ topic }, '[GuidelineDiscovery] No abstracts available for guideline articles');
        _discoveryEmpty.set(normalized, Date.now());
        return [];
      }

      const prompt = buildGuidelineExtractionPrompt(topic, withAbstracts);
      let rawText;
      if (serverConfig.keys.anthropic) {
        rawText = await aiService.callClaude(prompt, PINNED_MODELS.claude);
      } else if (serverConfig.keys.gemini) {
        rawText = await aiService.callGemini(prompt, PINNED_MODELS.gemini);
      } else if (serverConfig.keys.mistral) {
        rawText = await aiService.callMistralAI(prompt, PINNED_MODELS.mistral);
      } else {
        logger.warn('[GuidelineDiscovery] No AI provider configured');
        return [];
      }

      let recommendations;
      try {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch {
        logger.warn({ topic, rawText: rawText.slice(0, 300) }, '[GuidelineDiscovery] Failed to parse AI response');
        return [];
      }
      if (!Array.isArray(recommendations)) return [];

      const inserted = [];
      for (const rec of recommendations) {
        if (!rec.recommendationText || !rec.sourceBody) continue;
        try {
          const guideline = await db.createGuideline({
            topic,
            sourceBody: rec.sourceBody,
            sourceYear: rec.sourceYear,
            sourceUrl: rec.sourceUrl,
            recommendationText: rec.recommendationText,
            recommendationStrength: rec.recommendationStrength,
            recommendationCertainty: rec.recommendationCertainty,
            population: rec.population,
            intervention: rec.intervention,
            cautions: rec.cautions,
            status: 'ai_extracted',
          });
          if (guideline) inserted.push(guideline);
        } catch (err) {
          logger.warn({ err, rec }, '[GuidelineDiscovery] Failed to insert guideline');
        }
      }
      logger.info({ topic, found: summaries.length, extracted: inserted.length }, '[GuidelineDiscovery] Complete');
      if (inserted.length === 0) _discoveryEmpty.set(normalized, Date.now());
      return inserted;
    } catch (err) {
      logger.error({ err, topic }, '[GuidelineDiscovery] Failed');
      return [];
    } finally {
      _discoveryInFlight.delete(normalized);
    }
  })();

  _discoveryInFlight.set(normalized, promise);
  return promise;
}

function isDiscoveryInFlight(topic, db) {
  return _discoveryInFlight.has(db.normalizeTopic(topic));
}

function wasDiscoveryAttempted(topic, db) {
  return _discoveryEmpty.has(db.normalizeTopic(topic));
}

module.exports = {
  searchGuidelines,
  buildAlignmentPrompt,
  checkGuidelineAlignment,
  discoverGuidelinesForTopic,
  isDiscoveryInFlight,
  wasDiscoveryAttempted,
};
