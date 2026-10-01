function buildAnalysisPrompt(text, type) {
    const isFullText = text.length > 5000;
    const fullTextContext = isFullText
        ? "This is the full text of a research paper. Please pay special attention to the 'Methods' for study quality and 'Results' for primary data. Ignore administrative headers/footers."
        : 'This is an article abstract.';

    const prompts = {
        quick: `Provide a brief summary of this medical research in 2-3 sentences and no more than 100 words. ${fullTextContext}\n\nCONTENT:\n${text}`,

        comprehensive: `Analyze this medical research comprehensively. ${fullTextContext}
Use no more than 500 words total. Avoid repeating a finding across sections. Structure your response with these sections:
1) EXECUTIVE SUMMARY (maximum 80 words)
2) DETAILED METHODOLOGY (maximum 120 words; assess randomization, blinding, and sample size)
3) KEY FINDINGS (maximum 120 words; include specific p-values or confidence intervals if available)
4) CLINICAL IMPLICATIONS (maximum 100 words; state whether practice should change)
5) STUDY LIMITATIONS (maximum 80 words)

CONTENT:\n${text}`,

        critical: `Perform a rigorous critical appraisal in no more than 350 words. ${fullTextContext} Evaluate: 1) Study quality, 2) Potential biases (selection, performance, detection), 3) Evidence strength using GRADE criteria if possible. Avoid repetition.\n\nCONTENT:\n${text}`,
        biomedical: `In no more than 350 words, extract the important biomedical entities from this text (drugs, diseases, genes, proteins) and explain only the physiological relationships supported by the findings. ${fullTextContext}\n\nCONTENT:\n${text}`,
        layperson: `Explain this medical research in simple terms that a patient could understand, in no more than 250 words. Avoid jargon, repetition, and unnecessary background. ${fullTextContext}\n\nCONTENT:\n${text}`,
        methodology: `Critically review the study methodology in no more than 350 words. ${fullTextContext} Address design, power, confounding, and whether conclusions follow from the data. Avoid repetition.\n\nCONTENT:\n${text}`,
    };
    return prompts[type] || prompts.comprehensive;
}

function buildPicoExtractionPrompt(article) {
    return `You are extracting structured evidence from a biomedical study abstract.
Return ONLY valid JSON. No markdown.

STUDY:
Title: ${article.title || 'Unknown title'}
Abstract: ${article.abstract || 'No abstract available'}
Journal: ${article.journal || article.source || 'Unknown'}
Year: ${article.year || article.pubdate || 'Unknown'}
Study type: ${(article.pubtype && article.pubtype.join(', ')) || 'Unknown'}

JSON schema:
{
  "population": "who was studied",
  "intervention": "what intervention/exposure was tested",
  "comparison": "comparator/control/placebo/usual care (or empty string if absent)",
  "outcomes": ["primary outcomes measured"],
  "studyDesign": "RCT|meta-analysis|cohort|case-control|cross-sectional|case-series|other|unknown",
  "sampleSize": number,
  "followUp": "duration or empty string",
  "confidence": number,
  "missingFields": ["field names with insufficient evidence in abstract"]
}

Rules:
- confidence is 0.0 to 1.0
- use empty string when unavailable
- outcomes must be an array
- sampleSize must be 0 if unknown`;
}

function buildScreeningAssistPrompt(criteria, article) {
    return `You are assisting title/abstract screening for a systematic review.
Return ONLY valid JSON with this schema:
{
  "decision": "include|exclude|uncertain",
  "rationale": "brief reason",
  "matchedInclusion": ["criteria matched"],
  "triggeredExclusion": ["criteria triggered"]
}

REVIEW CRITERIA:
${JSON.stringify(criteria || {}, null, 2)}

ARTICLE:
Title: ${article.title || ''}
Abstract: ${article.abstract || ''}
Study type: ${(article.pubtype && article.pubtype.join(', ')) || 'Unknown'}`;
}

module.exports = { buildAnalysisPrompt, buildPicoExtractionPrompt, buildScreeningAssistPrompt };
