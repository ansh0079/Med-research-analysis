// ==========================================
// Grant / Protocol Writing Service
// Generates structured literature review sections for research proposals
// ==========================================
const { PINNED_MODELS } = require('./aiService');

/**
 * Build an AI prompt for grant-writing mode.
 */
function buildGrantPrompt(researchQuestion, articles, citationStyle = 'APA') {
  const articleContext = articles.slice(0, 20).map((a, i) => {
    const authors = (a.authors || []).map(au => au.name).join(', ');
    return `${i + 1}. ${a.title}
   Authors: ${authors || 'Unknown'}
   Journal: ${a.source || a.journal || 'Unknown'} (${a.year || a.pubdate?.split(' ')[0] || 'n.d.'})
   DOI: ${a.doi || 'N/A'}
   Abstract: ${(a.abstract || '').slice(0, 400)}`;
  }).join('\n\n');

  const styleGuide = {
    APA: 'APA 7th edition (Author, Year)',
    Vancouver: 'Vancouver/ICMJE (numbered citations)',
    Harvard: 'Harvard (Author Year)',
    MLA: 'MLA 9th edition',
    Nature: 'Nature (superscript numbers)',
  }[citationStyle] || citationStyle;

  return `You are an academic grant-writing consultant specialising in medical research proposals.

RESEARCH QUESTION / PROTOCOL TOPIC:
${researchQuestion}

AVAILABLE LITERATURE:
${articleContext}

TASK: Generate a structured literature review section suitable for inclusion in a grant application or research protocol. Use ${styleGuide} citation style.

Return STRICT JSON only:
{
  "structuredReview": {
    "background": "2-3 paragraphs setting clinical/scientific context",
    "rationale": "1-2 paragraphs explaining why this study is needed now",
    "currentEvidence": "2-3 paragraphs summarising what is known",
    "limitationsOfCurrentEvidence": "bullet-point list of major gaps and weaknesses"
  },
  "keyReferences": [
    {
      "citation": "formatted citation string",
      "relevance": "1 sentence on why this reference matters for the proposal",
      "pmid": "pubmed id if available",
      "doi": "doi if available"
    }
  ],
  "evidenceGaps": [
    {
      "gap": "specific gap description",
      "whyItMatters": "clinical or scientific significance",
      "howThisStudyAddressesIt": "how the proposed research would fill it"
    }
  ],
  "proposedStudyDesignRationale": "1 paragraph justifying the most appropriate study design",
  "feasibilityNotes": "brief notes on feasibility based on existing literature",
  "wordCount": number
}

Make the output specific to the research question. Do not write generic boilerplate. Cite the provided literature accurately.`;
}

/**
 * Generate a grant-writing literature review from articles.
 * @param {string} researchQuestion
 * @param {Array} articles
 * @param {string} citationStyle
 * @param {object} aiService { callGemini, callMistralAI }
 * @param {object} keys { gemini, mistral }
 * @returns {Promise<object>}
 */
async function generateGrantSection(researchQuestion, articles, citationStyle, aiService, keys) {
  const prompt = buildGrantPrompt(researchQuestion, articles, citationStyle);

  let rawText;
  if (keys.gemini) {
    rawText = await aiService.callGemini(prompt, PINNED_MODELS.geminiQuality);
  } else if (keys.mistral) {
    rawText = await aiService.callMistralAI(prompt, PINNED_MODELS.mistral);
  } else {
    throw new Error('No AI provider configured for grant writing');
  }

  let result;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    result = {
      structuredReview: {
        background: rawText.slice(0, 1500),
        rationale: '',
        currentEvidence: '',
        limitationsOfCurrentEvidence: [],
      },
      keyReferences: [],
      evidenceGaps: [{ gap: 'Could not parse structured response', whyItMatters: '', howThisStudyAddressesIt: '' }],
      proposedStudyDesignRationale: '',
      feasibilityNotes: '',
      wordCount: 0,
    };
  }

  return {
    ...result,
    researchQuestion,
    citationStyle,
    articleCount: articles.length,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildGrantPrompt,
  generateGrantSection,
};
