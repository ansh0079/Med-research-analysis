const { formatStoredTopicKnowledgeForPrompt } = require('./_helpers');

/**
 * Build a prompt that generates a synthetic teaching vignette grounded strictly in
 * the supplied seed abstracts. No free-text patient case is needed.
 *
 * Hard constraint: every management step and teaching point must cite a seed index.
 * The LLM synthesises a fictional patient; management/evidence are anchored to seeds only.
 *
 * @param {string} topic
 * @param {Array<{title:string; abstract?:string; pubdate?:string; journal?:string; pubtype?:string[]}>} seedArticles
 * @param {'student'|'resident'|'specialist'|'exam'} learningMode
 */
function buildTeachingVignettePrompt(topic, seedArticles, learningMode = 'resident', guidelines = [], userContext = null, topicKnowledgeRow = null) {
    const modeGuidance = {
        student: 'Teach core illness scripts, first principles, common differentials, and high-yield management. Use accessible language.',
        resident: 'Emphasise prioritisation, initial management, escalation decisions, and evidence trade-offs.',
        specialist: 'Emphasise nuanced phenotype, advanced management controversies, evidence limitations, and subgroup applicability.',
        exam: 'Write in USMLE/MRCP/AMC exam-revision style: discriminators, traps, and concise answer explanations.',
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
                adaptiveInstruction = `\nLEARNER WEAK AREAS: This learner struggles with ${weakTypes.join(', ')}. Design the case MCQs and teaching points to target these specific gaps.`;
            }
        }
        if (profile?.persona) {
            adaptiveInstruction += `\nLEARNER PERSONA: ${profile.persona}.`;
        }
    }

    const seeds = (seedArticles || []).slice(0, 8).map((a, i) => {
        const year = (a.pubdate || '').slice(0, 4) || 'unknown';
        const design = (a.pubtype || []).join(', ') || 'Study';
        return `[SEED ${i + 1}]
Title: ${a.title || 'Unknown'}
Year: ${year}
Journal: ${a.journal || a.source || 'Unknown'}
Design: ${design}
Abstract: ${(a.abstract || 'No abstract').slice(0, 800)}`;
    }).join('\n\n');

    const guidelineContext = guidelines.length > 0
        ? guidelines.map((g, i) => `[GUIDELINE ${i + 1}]
Source: ${g.source_body}${g.source_region ? ` (${g.source_region})` : ''}${g.source_year ? ` — ${g.source_year}` : ''}
Recommendation: ${g.recommendation_text}${g.recommendation_strength ? ` | Strength: ${g.recommendation_strength}` : ''}${g.population ? ` | Population: ${g.population}` : ''}${g.cautions ? ` | Cautions: ${g.cautions}` : ''}`).join('\n\n')
        : 'No guideline context provided.';

    const topicBaseline = formatStoredTopicKnowledgeForPrompt(topicKnowledgeRow);

    return `You are a clinical medical educator generating a fictional teaching vignette for a ${learningMode}-level learner.

Topic: "${topic}"
Learner mode: ${learningMode} — ${modeGuidance}${adaptiveInstruction}

${topicBaseline ? `${topicBaseline}\n` : ''}EVIDENCE SEEDS (primary permitted sources for management and teaching points):
${seeds}

CLINICAL GUIDELINES (standard-of-care context to ground management reasoning):
${guidelineContext}

HARD CONSTRAINT: Every management step, recommendation, and teaching point MUST cite at least one source by its index number in square brackets. Use SEED indices like [1] or [2, 4] for paper-derived claims, and GUIDELINE indices like [G1] or [G2] for guideline-derived claims. If a claim cannot be tied to one of the supplied sources, do NOT include it — instead flag it in uncertaintyFlags. Do not invent drugs, doses, effect sizes, or guidelines not present in the seeds or guideline blocks.

Generate a fictional, de-identified patient whose presentation plausibly relates to the topic. The patient demographics, history, examination, and investigations are SYNTHETIC and need not match any real case. The differential reasoning, management, and teaching points must be grounded entirely in the supplied seeds.

Return ONLY a valid JSON object. No markdown, no prose outside JSON:

{
  "presentingComplaint": "One-sentence chief complaint of the fictional patient",
  "history": "2-4 sentences: HPI, relevant past medical history, medications, allergies",
  "examination": "Key positive and negative physical findings relevant to the case",
  "investigations": "Relevant lab/imaging findings that set up the clinical decision",
  "differential": [
    {
      "diagnosis": "condition name",
      "supporting": "clues that favour this diagnosis",
      "against": "clues that argue against",
      "rank": 1
    }
  ],
  "managementReasoning": "Evidence-grounded management narrative. Every recommendation must cite a seed index [n]. Do not prescribe specific doses unless explicitly stated in a seed.",
  "teachingPoints": [
    {
      "point": "High-yield learning point for this mode",
      "seedIndices": [1]
    }
  ],
  "evidenceLinks": [
    {
      "seedIndex": 1,
      "howItApplies": "How this specific paper informs the vignette management or teaching"
    }
  ],
  "uncertaintyFlags": ["Any claim the model wanted to make but could NOT anchor to a seed — list as uncertainty rather than asserting it"],
  "caseMCQs": [
    {
      "questionType": "clinical_application" | "recall" | "trial_interpretation" | "guideline" | "pitfall",
      "question": "Single best answer question stem based on the vignette",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correctAnswer": "B",
      "explanation": "Why correct — cite seed index if applicable",
      "whyOthersWrong": "A is wrong because... C is wrong because... D is wrong because...",
      "difficulty": "easy" | "medium" | "hard",
      "sourceReference": "Seed n: Author et al. Journal Year"
    }
  ],
  "disclaimer": "FOR RESEARCH AND EDUCATION ONLY. This vignette is fictional. Management steps are derived from provided research abstracts and must not be used for direct patient care. Verify all clinical decisions against current guidelines and specialist review."
}

Rules:
- When STORED TOPIC BASELINE is present, let it guide vignette emphasis and MCQ angles; every management step, teaching point, and MCQ explanation must still cite SEED [n] or GUIDELINE [Gn] as required above — never cite baseline ordinals as seed indices.
- Generate exactly 3-5 MCQs grounded in the vignette and seeds.
- differential must have 2-4 entries ranked from most to least likely.
- seedIndex values are 1-based integers matching [SEED n] blocks above.
- uncertaintyFlags may be an empty array [] if all claims are supported.
- Do not invent PMIDs, trial names, drug doses, or statistics not present in the seeds.`;
}

module.exports = { buildTeachingVignettePrompt };
