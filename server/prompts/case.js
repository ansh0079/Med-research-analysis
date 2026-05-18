const { formatStoredTopicKnowledgeForPrompt } = require('./_helpers');

function buildCaseSearchQueryPrompt(caseText) {
    return `You help build a single literature search string for medical research databases (PubMed, Semantic Scholar, OpenAlex).
Strip any patient identifiers. Prefer condition + population + intervention keywords.
Return ONLY valid JSON:
{
  "searchQuery": "string, 8-220 chars, search-engine friendly (no quotes inside)",
  "populationHint": "short or empty",
  "interventionHint": "short or empty",
  "outcomeHint": "short or empty"
}

Clinical vignette (research context only):
${caseText}`;
}

function buildCaseEvidencePrompt(caseText, evidenceRows, options = {}, guidelines = [], userContext = null) {
    const topic = String(options.topic || '').trim();
    const learningMode = String(options.learningMode || 'student');
    const modeGuidance = {
        student: 'Teach core illness scripts, first principles, common differentials, and high-yield management choices.',
        resident: 'Emphasize prioritization, initial management, escalation decisions, and evidence trade-offs.',
        specialist: 'Emphasize nuanced phenotype, advanced management controversies, evidence limitations, and subgroup applicability.',
        exam: 'Write in exam-revision style with discriminators, traps, and concise answer explanations.',
    }[learningMode] || 'Teach core clinical reasoning with concise evidence links.';

    let adaptiveInstruction = '';
    if (userContext) {
        const { mastery, profile } = userContext;
        if (mastery) {
            const weakTypes = [
                mastery.recallScore < 60 ? 'recall' : null,
                mastery.clinicalApplicationScore < 60 ? 'clinical_application' : null,
                mastery.trialInterpretationScore < 60 ? 'trial_interpretation' : null,
                mastery.guidelineScore < 60 ? 'guideline' : null,
                mastery.pitfallScore < 60 ? 'pitfall' : null,
            ].filter(Boolean);
            if (weakTypes.length > 0) {
                adaptiveInstruction = `\nLEARNER WEAK AREAS: This learner struggles with ${weakTypes.join(', ')}. Target these areas in the case MCQs and teaching points.`;
            }
        }
        if (profile?.persona) {
            adaptiveInstruction += `\nLEARNER PERSONA: ${profile.persona}.`;
        }
    }
    const evidence = (evidenceRows || [])
        .map((row, idx) => {
            const a = row.article || {};
            return `[EVIDENCE ${idx + 1}] id=${a.uid || a.pmid || a.doi || 'unknown'}
Title: ${a.title || 'Unknown'}
Year: ${a.year || a.pubdate || 'Unknown'}
Journal: ${a.journal || a.source || 'Unknown'}
PICO: ${JSON.stringify(row.pico || {})}
Summary: ${a.abstract || 'No abstract'}
`;
        })
        .join('\n');

    const guidelineContext = guidelines.length > 0
        ? guidelines.map((g, i) => `[GUIDELINE ${i + 1}]
Source: ${g.source_body}${g.source_region ? ` (${g.source_region})` : ''}${g.source_year ? ` — ${g.source_year}` : ''}
Recommendation: ${g.recommendation_text}${g.recommendation_strength ? `\nStrength: ${g.recommendation_strength}` : ''}${g.population ? `\nPopulation: ${g.population}` : ''}${g.cautions ? `\nCautions: ${g.cautions}` : ''}`).join('\n\n')
        : 'No guideline context provided.';

    return `You are a clinical research assistant providing literature summaries for research purposes ONLY.
This output MUST NOT be used as direct medical advice, for diagnosis, or for treatment decisions.
Always recommend consultation with a qualified clinician.

Patient case (for research context only):
${caseText}

Topic focus:
${topic || 'Infer from the case text'}

Learner mode:
${learningMode} - ${modeGuidance}${adaptiveInstruction}

${formatStoredTopicKnowledgeForPrompt(options.topicKnowledge || null) || ''}Evidence:
${evidence}

Clinical Guidelines:
${guidelineContext}

When forming recommendations, clearly distinguish between evidence from the papers above and guidance from clinical guidelines. Label guideline-derived points with "Guideline [Gn]" and paper-derived points with "Evidence [n]".

Return ONLY valid JSON:
{
  "caseSummary": "brief neutral case framing — do NOT include diagnostic conclusions",
  "vignette": "realistic clinical vignette for the topic, de-identified and fictional",
  "patientPresentation": "succinct patient presentation with salient positives and negatives",
  "keyDecisionPoint": "the main clinical decision the learner must make",
  "differentialReasoning": "ranked differential or management reasoning, including supporting and refuting clues",
  "evidenceExplanation": "evidence-backed explanation using the cited papers and explicitly noting limitations",
  "interventions": [
    {
      "name": "intervention/theme",
      "evidenceStrength": "HIGH|MODERATE|LOW|VERY_LOW",
      "rationale": "why this evidence strength",
      "citations": [1,2]
    }
  ],
  "caseMCQs": [
    {
      "type": "multiple_choice",
      "questionType": "clinical_application" | "recall" | "trial_interpretation" | "guideline" | "pitfall",
      "question": "single best answer question stem based on the vignette",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correctAnswer": "B",
      "explanation": "Why the correct answer is right — 2-3 sentences with clinical reasoning",
      "whyOthersWrong": "Why each wrong option is incorrect: A is wrong because... C is wrong because...",
      "difficulty": "easy|medium|hard",
      "sourceReference": "Author et al. Journal Year or null"
    }
  ],
  "paperApplications": [
    {
      "studyIndex": 1,
      "title": "paper title",
      "howItApplies": "how this paper changes understanding of the case, and what it cannot answer"
    }
  ],
  "uncertainties": ["key uncertainty points"],
  "disclaimer": "FOR RESEARCH SUPPORT ONLY. This summary is not a substitute for clinical judgement. Findings must be verified against primary sources and interpreted by a qualified healthcare professional before informing any patient care decision.",
  "safetyNotes": "Specific limitations of this evidence set for this case; always verify retraction status of cited articles"
}

Rules:
- When STORED TOPIC BASELINE is present, use it to frame the vignette, decision points, and MCQ angles; all "citations" and studyIndex values must still reference [EVIDENCE n] blocks only (baseline ordinals are not evidence indices).
- "citations" uses 1-based indices matching [EVIDENCE n] blocks above only. Do not invent PMIDs.
- Generate exactly 3-5 MCQs. All MCQs must be grounded in the vignette and evidence set.
- "paperApplications" should cover up to the top 5 most relevant evidence blocks.
- Use neutral research language; describe evidence themes rather than prescribing treatment.
}`;
}

module.exports = { buildCaseSearchQueryPrompt, buildCaseEvidencePrompt };
