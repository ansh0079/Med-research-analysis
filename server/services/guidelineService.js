// ==========================================
// Guideline Alignment Service
// Cross-references synthesized evidence against clinical guidelines
// ==========================================

const fetch = require('node-fetch');
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
    rawText = await aiService.callMistralAI(prompt, 'mistral-small-latest');
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

module.exports = {
  searchGuidelines,
  buildAlignmentPrompt,
  checkGuidelineAlignment,
};
