function buildSeminalKnowledgeExtractionPrompt(topic, synthesisResult, articles = [], existingKnowledge = null, interactionStats = {}) {
    const sources = (articles || [])
        .slice(0, 10)
        .map((a, index) => {
            const stats = interactionStats[a.uid] || {};
            return `[SOURCE ${index + 1}]
Title: ${a.title || 'Unknown'}
Year: ${a.year || a.pubdate || 'Unknown'}
Journal: ${a.journal || a.source || 'Unknown'}
Engagement: ${stats.saves ? `${stats.saves} saves` : ''}${stats.highDwellTime ? ', High Dwell' : ''}${!stats.saves && !stats.highDwellTime ? 'New' : ''}
DOI: ${a.doi || 'Not available'}
PMID: ${a.pmid || 'Not available'}
Abstract: ${String(a.abstract || 'No abstract').slice(0, 1000)}`;
        })
        .join('\n\n');

    const baselineContext = existingKnowledge && existingKnowledge.knowledge
        ? `\nEXISTING KNOWLEDGE BASELINE:\n${JSON.stringify(existingKnowledge.knowledge, null, 2)}\n\nINSTRUCTION: Perform DIFFERENCE ANALYSIS. Compare NEW sources with EXISTING knowledge above. Only update teaching points if new evidence contradicts, nuances, or significantly strengthens current points. For unchanged points, preserve them verbatim. Highlight NEW nuances, landmark updates, or contradictory findings explicitly.`
        : 'This is a new topic. Extract a foundational evidence map.';

    const anchors = existingKnowledge?.knowledge?.verifiedAnchors;
    const anchorBlock = Array.isArray(anchors) && anchors.length > 0
        ? `\nVERIFIED CLINICIAN ANCHORS (immutable):\n${JSON.stringify(anchors, null, 2)}\n\n`
            + 'INSTRUCTION: Include the same "verifiedAnchors" array in your output JSON exactly as given (same ids, text, verifiedAt, verifiedBy, articleUid). '
            + 'Do not remove or rewrite these entries. Do not state claims in coreTeachingPoints or seminalPapers that contradict these anchors. '
            + 'If new sources conflict with an anchor, note the tension under "controversies" without negating the anchor.\n'
        : '';

    return `You are building a recursive, citation-grounded medical topic memory.
${baselineContext}${anchorBlock}
Extract durable, seminal teaching knowledge for "${topic}" from the synthesis and NEW source papers.

SYNTHESIS JSON:
${JSON.stringify(synthesisResult || {}, null, 2)}

SOURCE PAPERS:
${sources}

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "mentorMessage": "2-3 sentence guidance for a learner searching this topic, citing source indices like [1, 2]",
  "seminalPapers": [
    {
      "sourceIndex": 1,
      "title": "paper title",
      "whySeminal": "why this paper is foundational or practice-changing",
      "clinicalPrinciple": "durable teaching principle derived from this paper",
      "evidenceStrength": "HIGH|MODERATE|LOW|VERY_LOW"
    }
  ],
  "coreTeachingPoints": [
    {
      "claim": "single clinical teaching point with inline source citation like [1]",
      "sourceIndices": [1],
      "confidence": "HIGH|MODERATE|LOW|VERY_LOW"
    }
  ],
  "caseGenerationHooks": ["case scenario hook grounded in the evidence"],
  "mcqAngles": ["board-style question angle grounded in the evidence"],
  "controversies": [
    {
      "issue": "clinical uncertainty or controversy",
      "sourceIndices": [1, 2]
    }
  ],
  "keywords": ["topic synonym or subtopic"],
  "verifiedAnchors": []
}

Rules:
- Do not store any clinical claim without sourceIndices.
- Use 1-based SOURCE indices only.
- Prefer durable seminal knowledge over minor details.
- If evidence is weak or conflicting, say so explicitly.
- When EXISTING KNOWLEDGE is provided, preserve unchanged points and only flag additions, contradictions, or nuanced updates.
- verifiedAnchors: If VERIFIED CLINICIAN ANCHORS were provided above, copy that array verbatim into this field (do not invent new anchors here). If none were provided, use an empty array.`;
}

/**
 * Build a prompt that extracts structured agent knowledge from a set of papers on a topic.
 * Output maps to the AgentGuidance interface stored in topic_knowledge.knowledge.
 *
 * @param {string} topic
 * @param {Array<{title:string; abstract?:string; pubdate?:string; journal?:string; pubtype?:string[]; uid?:string; doi?:string; pmid?:string}>} articles
 * @param {object} [interactionStats]
 * @param {object|null} [existingKnowledgeObj]
 * @param {{ guidelines?: Array<object> }} [options]
 */
function buildTopicKnowledgePrompt(topic, articles, interactionStats = {}, existingKnowledgeObj = null, options = {}) {
    const guidelines = Array.isArray(options?.guidelines) ? options.guidelines : [];
    const anchorBlock = (() => {
        const anchors = existingKnowledgeObj?.verifiedAnchors;
        if (!Array.isArray(anchors) || anchors.length === 0) return '';
        return `

VERIFIED CLINICIAN ANCHORS (immutable — copy the "verifiedAnchors" array into your JSON output exactly as given; do not remove keys or contradict these in teachingPoints):
${JSON.stringify(anchors, null, 2)}
`;
    })();
    const context = (articles || []).slice(0, 20).map((a, i) => {
        const year = (a.pubdate || '').slice(0, 4) || 'unknown';
        const design = (a.pubtype || []).join(', ') || 'Study';
        const cites = a.pmcrefcount ?? a.citationCount ?? 'unknown';
        const stats = interactionStats[a.uid] || {};
        const userSaves = stats.saves || 0;
        const highDwellCount = stats.highDwellCount || (stats.highDwellTime ? 1 : 0);
        const highDwell = highDwellCount > 0 ? 'YES' : 'NO';
        // Clinical Gem: high real-world engagement (≥3 high-dwell sessions) despite modest citations (<50)
        const numericCites = typeof cites === 'number' ? cites : NaN;
        const isGem = highDwellCount >= 3 && !isNaN(numericCites) && numericCites < 50;
        const gemMarker = isGem ? ' ⭐ [CLINICAL GEM CANDIDATE — high dwell engagement, low citations]' : '';

        return `[PAPER ${i + 1}]${gemMarker}
Title: ${a.title || 'Unknown'}
Year: ${year} | Journal: ${a.journal || a.source || 'Unknown'} | Design: ${design} | Citations: ${cites} | User Saves: ${userSaves} | High Engagement: ${highDwell}${highDwellCount > 1 ? ` (${highDwellCount} high-dwell sessions)` : ''}
Abstract: ${(a.abstract || 'No abstract').slice(0, 700)}`;
    }).join('\n\n');

    const guidelineContext = guidelines.slice(0, 12).map((g, i) => {
        const body = g.sourceBody || g.source_body || 'Guideline body';
        const year = g.sourceYear || g.source_year || 'unknown';
        const text = g.recommendationText || g.recommendation_text || '';
        const strength = g.recommendationStrength || g.recommendation_strength || '';
        const url = g.sourceUrl || g.source_url || '';
        return `[GUIDELINE ${i + 1}]
Source: ${body} (${year})
Strength: ${strength || 'unspecified'}
URL: ${url || 'n/a'}
Recommendation: ${String(text).slice(0, 500)}`;
    }).join('\n\n');

    const sourceArticles = (articles || []).slice(0, 20).map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid || null,
        title: a.title || 'Unknown',
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.journal || a.source || null,
        pubdate: a.pubdate || null,
    }));

    const guidelineBlock = guidelineContext
        ? `

CLINICAL GUIDELINES (cite as [G1], [G2], … — these are practice standards, not research papers):
${guidelineContext}
`
        : `

CLINICAL GUIDELINES: none stored for this topic yet. Prefer paper-grounded teaching points and note guideline gaps in controversies if relevant.
`;

    const existingBlock = existingKnowledgeObj
        ? `\nEXISTING TOPIC MEMORY (difference analysis — preserve unchanged durable points; update only where new papers/guidelines strengthen, nuance, or contradict):\n${JSON.stringify(existingKnowledgeObj, null, 2)}\n`
        : '';

    return `You are a senior clinical medical educator building a permanent, citation-grounded knowledge base entry for the topic: "${topic}".

You have been given ${(articles || []).length} research papers and ${guidelines.length} clinical guideline recommendations. Your job is to extract the most important, enduring, and high-yield knowledge about this topic — knowledge that will guide future learners and inform case/MCQ generation. Prefer guideline-backed teaching points when guidelines and papers agree; surface conflicts explicitly.
${anchorBlock}${existingBlock}${guidelineBlock}
PAPERS:
${context}

Return ONLY a valid JSON object — no markdown, no prose outside JSON:

{
  "mentorMessage": "1-2 sentence expert mentor intro: what every clinician must know about ${topic} and why this evidence matters. Cite papers as [1] and guidelines as [G1] where helpful. Authoritative, not generic.",
  "seminalPapers": [
    {
      "sourceIndex": 1,
      "title": "exact paper title",
      "whySeminal": "one sentence — what this specific paper established or changed",
      "clinicalPrinciple": "the core clinical principle it underpins — one sentence",
      "evidenceStrength": "HIGH" | "MODERATE" | "LOW" | "VERY_LOW"
    }
  ],
  "teachingPoints": [
    {
      "claim": "High-yield, specific clinical teaching point — not an obvious fact",
      "sourceIndices": [1, 2],
      "guidelineIndices": [1],
      "confidence": "HIGH" | "MODERATE" | "LOW" | "VERY_LOW"
    }
  ],
  "caseGenerationHooks": [
    "A specific patient scenario that would make a good teaching case — e.g. '72yo male with new-onset ARDS, P/F 140, no steroids'"
  ],
  "mcqAngles": [
    "A specific discriminator, pitfall, or controversy worth testing as an MCQ"
  ],
  "controversies": [
    {
      "issue": "paper vs guideline tension or clinical uncertainty",
      "sourceIndices": [1],
      "guidelineIndices": [1]
    }
  ],
  "verifiedAnchors": [],
  "sourceArticles": ${JSON.stringify(sourceArticles)}
}

Rules:
- seminalPapers: include only papers you can genuinely identify as changing practice or establishing evidence. Max 5. Rank by clinical impact.
- sourceIndex values are 1-based integers matching [PAPER n] blocks above.
- guidelineIndices (optional) are 1-based integers matching [GUIDELINE n] blocks.
- teachingPoints: 3-6 bullet points, specific and grounded. Prefer claims that are both paper- and guideline-supported when possible. sourceIndices must cite at least one paper OR set guidelineIndices when purely guideline-derived.
- caseGenerationHooks: 2-4 concrete scenario seeds. Include patient demographics and clinical context.
- mcqAngles: 3-5 specific angles — common pitfalls, discriminators between diagnoses, trial results that counter intuition, guideline vs trial conflicts.
- mentorMessage: 1-2 sentences only, clinically precise, not generic.
- Do NOT invent effect sizes, drug doses, or trial names not present in the supplied papers/guidelines.
- sourceArticles is pre-filled above — do not modify it, include it verbatim in your output.
- verifiedAnchors: If VERIFIED CLINICIAN ANCHORS were provided above, copy that array verbatim. Otherwise use [].
- Papers marked [CLINICAL GEM CANDIDATE] have high real-world clinician engagement despite modest citation counts. If their content warrants it, elevate them into seminalPapers and explicitly explain why practising clinicians find them clinically important.`;
}

module.exports = { buildSeminalKnowledgeExtractionPrompt, buildTopicKnowledgePrompt };
